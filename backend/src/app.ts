import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { trace } from "@opentelemetry/api";
import { InMemoryInventoryRepository } from "./repository.js";
import { PostgresInventoryRepository } from "./postgres-repository.js";
import { DEVICE_STATUSES, DEVICE_TYPES, LOAN_STATUSES, MAINTENANCE_STATUSES, type InventoryRepository } from "./types.js";
import { activeRequests, databaseReady, httpDuration, httpRequests, metricsRegistry } from "./observability.js";

declare module "@fastify/jwt" { interface FastifyJWT { payload: { tenantId: string; roles: string[]; sub?: string }; user: { tenantId: string; roles: string[]; sub?: string } } }

const positiveId = z.coerce.number().int().positive();
const deviceType = z.enum(DEVICE_TYPES);
const deviceStatus = z.enum(DEVICE_STATUSES);
const loanStatus = z.enum(LOAN_STATUSES);
const maintenanceStatus = z.enum(MAINTENANCE_STATUSES);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Invalid date");
const dateTime = z.string().datetime({ offset: true });
const pagination = { cursor: positiveId.optional(), limit: z.coerce.number().int().min(1).max(100).default(25) };
const nonempty = (max: number) => z.string().trim().min(1).max(max);
const idParams = (name: string) => z.object({ [name]: positiveId });
const deviceBody = z.object({ assetTag: nonempty(50), serialNumber: nonempty(100), deviceType, manufacturer: nonempty(100), model: nonempty(100), status: deviceStatus, centerId: positiveId, purchaseDate: date.nullable().optional(), purchaseCost: z.coerce.number().min(0).default(0), depreciationRate: z.coerce.number().min(0).max(100).nullable().optional() }).strict();
const centerBody = z.object({ centerName: nonempty(100), address: nonempty(255), phone: nonempty(20), isActive: z.boolean() }).strict();
const loanBody = z.object({ deviceId: positiveId, centerId: positiveId, reasonId: positiveId, participantCode: nonempty(50), checkoutDate: dateTime, dueDate: dateTime }).strict().refine((x) => x.dueDate > x.checkoutDate, { message: "dueDate must be after checkoutDate", path: ["dueDate"] });
const maintenanceBody = z.object({ deviceId: positiveId, issueDescription: nonempty(65535), serviceDate: date }).strict();
const developmentRoles = ["inventory:read", "inventory:write", "loans:read", "loans:write", "centers:read", "centers:write", "maintenance:read", "maintenance:write", "loan-reasons:read", "loan-reasons:write", "reports:read", "users:manage", "settings:manage", "monitoring:read"];

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> { const result = schema.safeParse(value); if (!result.success) throw Object.assign(new Error("Invalid request"), { statusCode: 400, issues: result.error.flatten() }); return result.data; }
function requireRole(request: FastifyRequest, role: string) { if (!request.user.roles.includes(role)) throw Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }); }
const authorize = (role: string) => async (request: FastifyRequest) => requireRole(request, role);
const pageResponse = <T>(result: { items: T[]; nextCursor?: number }, limit: number) => ({ data: result.items, page: { limit, nextCursor: result.nextCursor ?? null } });

export async function buildApp(repository: InventoryRepository = new InMemoryInventoryRepository()): Promise<FastifyInstance> {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.body.password", "reply.headers.set-cookie"], mixin() { const span = trace.getActiveSpan()?.spanContext(); return span ? { trace_id: span.traceId, span_id: span.spanId } : {}; } } });
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters");
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(jwt, { secret });
  const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins ?? (process.env.NODE_ENV === "production" ? false : [/^http:\/\/localhost(?::\d+)?$/, /^http:\/\/127\.0\.0\.1(?::\d+)?$/]),
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  });
  app.setErrorHandler((error, request, reply) => { request.log.warn({ err: error, requestId: request.id }, "Request failed"); const known = error as Error & { statusCode?: number; issues?: unknown }; const statusCode = known.statusCode && known.statusCode >= 400 ? known.statusCode : 500; reply.code(statusCode).send({ error: statusCode === 500 ? "Internal server error" : known.message, requestId: request.id, ...(known.issues ? { details: known.issues } : {}) }); });

  app.get("/", async () => ({
    service: "Community Technology Loan API",
    status: "ok",
    endpoints: { health: "/health", readiness: "/ready", api: "/v1" },
  }));
  app.get("/ready", async (_request, reply) => { if (repository instanceof PostgresInventoryRepository) { try { await repository.health(); databaseReady.set(1); return { status: "ready" }; } catch { databaseReady.set(0); return reply.code(503).send({ status: "not_ready" }); } } databaseReady.set(1); return { status: "ready", mode: "memory" }; });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/metrics", async (_request, reply) => reply.type(metricsRegistry.contentType).send(await metricsRegistry.metrics()));
  const metrics = { requests: 0, errors: 0, totalMs: 0, startedAt: Date.now() };
  app.addHook("onRequest", async (request) => { activeRequests.inc(); (request as FastifyRequest & { startedAt?: number }).startedAt = Date.now(); if (!request.url.startsWith("/v1/") || request.url === "/v1/dev/token" || request.url === "/v1/auth/login" || request.url === "/v1/auth/signup") return; await request.jwtVerify(); });
  app.addHook("onResponse", async (request, reply) => { const elapsedMs = Date.now() - ((request as FastifyRequest & { startedAt?: number }).startedAt ?? Date.now()); const labels = { method: request.method, route: request.routeOptions.url ?? "unmatched", status_code: String(reply.statusCode) }; activeRequests.dec(); httpRequests.inc(labels); httpDuration.observe(labels, elapsedMs / 1000); metrics.requests++; metrics.totalMs += elapsedMs; if (reply.statusCode >= 500) metrics.errors++; });

  const deviceQuery = z.object({ deviceType: deviceType.optional(), status: deviceStatus.optional(), centerId: positiveId.optional(), assetTag: nonempty(50).optional(), serialNumber: nonempty(100).optional(), manufacturer: nonempty(100).optional(), model: nonempty(100).optional(), search: nonempty(120).optional(), ...pagination }).strict();
  // UPDATED: Changed endpoint to match the MySQL device schema.
  app.get("/v1/inventory", { preHandler: authorize("inventory:read") }, async (request) => { const q = parse(deviceQuery, request.query); return pageResponse(await repository.listDevices(request.user.tenantId, q), q.limit); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/inventory", { preHandler: authorize("inventory:write") }, async (request, reply) => { const body = parse(deviceBody, request.body); return reply.code(201).send({ data: await repository.createDevice(request.user.tenantId, body) }); });
  // UPDATED: Changed endpoint to match the MySQL device schema.
  app.get("/v1/inventory/:deviceId", { preHandler: authorize("inventory:read") }, async (request, reply) => { const { deviceId } = parse(idParams("deviceId"), request.params) as { deviceId: number }; const data = await repository.getDevice(request.user.tenantId, deviceId); return data ? { data } : reply.code(404).send({ error: "Device not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.patch("/v1/inventory/:deviceId", { preHandler: authorize("inventory:write") }, async (request, reply) => { const { deviceId } = parse(idParams("deviceId"), request.params) as { deviceId: number }; const body = parse(deviceBody.omit({ status: true }).partial().refine((x) => Object.keys(x).length > 0, "At least one field is required"), request.body); /* TODO: Finalize any future manual status-transition workflow; lifecycle status is intentionally not client-editable here. */ const data = await repository.updateDevice(request.user.tenantId, deviceId, body); return data ? { data } : reply.code(404).send({ error: "Device not found", requestId: request.id }); });
  // UPDATED: History is derived only from loans and maintenance records in the supplied schema.
  app.get("/v1/inventory/:deviceId/history", { preHandler: authorize("inventory:read") }, async (request, reply) => { const { deviceId } = parse(idParams("deviceId"), request.params) as { deviceId: number }; if (!await repository.getDevice(request.user.tenantId, deviceId)) return reply.code(404).send({ error: "Device not found", requestId: request.id }); const [loans, maintenance] = await Promise.all([repository.listLoans(request.user.tenantId, { deviceId, limit: 100 }), repository.listMaintenance(request.user.tenantId, { deviceId, limit: 100 })]); /* TODO: A dedicated device event/history table is required to independently track transfers, manual status changes, and edits. */ return { data: { loans: loans.items, maintenanceRecords: maintenance.items } }; });
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/inventory/:deviceId/maintenance", { preHandler: authorize("maintenance:read") }, async (request, reply) => { const { deviceId } = parse(idParams("deviceId"), request.params) as { deviceId: number }; if (!await repository.getDevice(request.user.tenantId, deviceId)) return reply.code(404).send({ error: "Device not found", requestId: request.id }); const q = parse(z.object(pagination).strict(), request.query); return pageResponse(await repository.listMaintenance(request.user.tenantId, { ...q, deviceId }), q.limit); });

  const centerQuery = z.object({ isActive: z.enum(["true", "false"]).transform((x) => x === "true").optional(), search: nonempty(120).optional(), ...pagination }).strict();
  // UPDATED: Replaced generic locations with outreach centers.
  app.get("/v1/centers", { preHandler: authorize("centers:read") }, async (request) => { const q = parse(centerQuery, request.query); return pageResponse(await repository.listCenters(request.user.tenantId, q), q.limit); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/centers", { preHandler: authorize("centers:write") }, async (request, reply) => reply.code(201).send({ data: await repository.createCenter(request.user.tenantId, parse(centerBody, request.body)) }));
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/centers/:centerId", { preHandler: authorize("centers:read") }, async (request, reply) => { const { centerId } = parse(idParams("centerId"), request.params) as { centerId: number }; const data = await repository.getCenter(request.user.tenantId, centerId); return data ? { data } : reply.code(404).send({ error: "Center not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.patch("/v1/centers/:centerId", { preHandler: authorize("centers:write") }, async (request, reply) => { const { centerId } = parse(idParams("centerId"), request.params) as { centerId: number }; const body = parse(centerBody.partial().refine((x) => Object.keys(x).length > 0, "At least one field is required"), request.body); const data = await repository.updateCenter(request.user.tenantId, centerId, body); return data ? { data } : reply.code(404).send({ error: "Center not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/centers/:centerId/inventory", { preHandler: authorize("inventory:read") }, async (request, reply) => { const { centerId } = parse(idParams("centerId"), request.params) as { centerId: number }; if (!await repository.getCenter(request.user.tenantId, centerId)) return reply.code(404).send({ error: "Center not found", requestId: request.id }); const q = parse(z.object(pagination).strict(), request.query); return pageResponse(await repository.listDevices(request.user.tenantId, { ...q, centerId }), q.limit); });
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/centers/:centerId/loans", { preHandler: authorize("loans:read") }, async (request, reply) => { const { centerId } = parse(idParams("centerId"), request.params) as { centerId: number }; if (!await repository.getCenter(request.user.tenantId, centerId)) return reply.code(404).send({ error: "Center not found", requestId: request.id }); const q = parse(z.object(pagination).strict(), request.query); return pageResponse(await repository.listLoans(request.user.tenantId, { ...q, centerId }), q.limit); });

  const loanQuery = z.object({ loanStatus: loanStatus.optional(), centerId: positiveId.optional(), deviceId: positiveId.optional(), participantCode: nonempty(50).optional(), reasonId: positiveId.optional(), checkoutFrom: dateTime.optional(), checkoutTo: dateTime.optional(), dueFrom: dateTime.optional(), dueTo: dateTime.optional(), ...pagination }).strict();
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/loans", { preHandler: authorize("loans:read") }, async (request) => { const q = parse(loanQuery, request.query); return pageResponse(await repository.listLoans(request.user.tenantId, q), q.limit); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/loans", { preHandler: authorize("loans:write") }, async (request, reply) => reply.code(201).send({ data: await repository.createLoan(request.user.tenantId, parse(loanBody, request.body)) }));
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/loans/:loanId", { preHandler: authorize("loans:read") }, async (request, reply) => { const { loanId } = parse(idParams("loanId"), request.params) as { loanId: number }; const loan = await repository.getLoan(request.user.tenantId, loanId); if (!loan) return reply.code(404).send({ error: "Loan not found", requestId: request.id }); const [device, center, reason] = await Promise.all([repository.getDevice(request.user.tenantId, loan.deviceId), repository.getCenter(request.user.tenantId, loan.centerId), repository.getLoanReason(request.user.tenantId, loan.reasonId)]); return { data: { ...loan, device, center, reason } }; });
  // ADDED: New endpoint required by the database schema.
  app.patch("/v1/loans/:loanId", { preHandler: authorize("loans:write") }, async (request, reply) => { const { loanId } = parse(idParams("loanId"), request.params) as { loanId: number }; const body = parse(z.object({ dueDate: dateTime.optional(), reasonId: positiveId.optional() }).strict().refine((x) => Object.keys(x).length > 0, "At least one field is required"), request.body); const data = await repository.updateLoan(request.user.tenantId, loanId, body); return data ? { data } : reply.code(404).send({ error: "Loan not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/loans/:loanId/return", { preHandler: authorize("loans:write") }, async (request, reply) => { const { loanId } = parse(idParams("loanId"), request.params) as { loanId: number }; const { returnDate } = parse(z.object({ returnDate: dateTime.default(() => new Date().toISOString()) }).strict(), request.body ?? {}); const data = await repository.returnLoan(request.user.tenantId, loanId, returnDate); return data ? { data } : reply.code(404).send({ error: "Loan not found", requestId: request.id }); });

  // ADDED: New endpoint required by the database schema.
  app.get("/v1/loan-reasons", { preHandler: authorize("loan-reasons:read") }, async (request) => ({ data: await repository.listLoanReasons(request.user.tenantId) }));
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/loan-reasons", { preHandler: authorize("loan-reasons:write") }, async (request, reply) => reply.code(201).send({ data: await repository.createLoanReason(request.user.tenantId, parse(z.object({ reasonName: nonempty(100) }).strict(), request.body).reasonName) }));
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/loan-reasons/:reasonId", { preHandler: authorize("loan-reasons:read") }, async (request, reply) => { const { reasonId } = parse(idParams("reasonId"), request.params) as { reasonId: number }; const data = await repository.getLoanReason(request.user.tenantId, reasonId); return data ? { data } : reply.code(404).send({ error: "Loan reason not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.patch("/v1/loan-reasons/:reasonId", { preHandler: authorize("loan-reasons:write") }, async (request, reply) => { const { reasonId } = parse(idParams("reasonId"), request.params) as { reasonId: number }; const { reasonName } = parse(z.object({ reasonName: nonempty(100) }).strict(), request.body); const data = await repository.updateLoanReason(request.user.tenantId, reasonId, reasonName); /* TODO: Decide whether loan reasons should gain an is_active field instead of deletion. */ return data ? { data } : reply.code(404).send({ error: "Loan reason not found", requestId: request.id }); });

  const maintenanceQuery = z.object({ deviceId: positiveId.optional(), maintenanceStatus: maintenanceStatus.optional(), serviceFrom: date.optional(), serviceTo: date.optional(), resolvedFrom: date.optional(), resolvedTo: date.optional(), ...pagination }).strict();
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/maintenance", { preHandler: authorize("maintenance:read") }, async (request) => { const q = parse(maintenanceQuery, request.query); return pageResponse(await repository.listMaintenance(request.user.tenantId, q), q.limit); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/maintenance", { preHandler: authorize("maintenance:write") }, async (request, reply) => reply.code(201).send({ data: await repository.createMaintenance(request.user.tenantId, parse(maintenanceBody, request.body)) }));
  // ADDED: New endpoint required by the database schema.
  app.get("/v1/maintenance/:maintenanceId", { preHandler: authorize("maintenance:read") }, async (request, reply) => { const { maintenanceId } = parse(idParams("maintenanceId"), request.params) as { maintenanceId: number }; const data = await repository.getMaintenance(request.user.tenantId, maintenanceId); return data ? { data } : reply.code(404).send({ error: "Maintenance record not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.patch("/v1/maintenance/:maintenanceId", { preHandler: authorize("maintenance:write") }, async (request, reply) => { const { maintenanceId } = parse(idParams("maintenanceId"), request.params) as { maintenanceId: number }; const body = parse(z.object({ issueDescription: nonempty(65535).optional(), maintenanceStatus: z.literal("IN_PROGRESS").optional() }).strict().refine((x) => Object.keys(x).length > 0, "At least one field is required"), request.body); /* TODO: Finalize transition rules if states beyond OPEN -> IN_PROGRESS -> RESOLVED are introduced. */ const data = await repository.updateMaintenance(request.user.tenantId, maintenanceId, body); return data ? { data } : reply.code(404).send({ error: "Maintenance record not found", requestId: request.id }); });
  // ADDED: New endpoint required by the database schema.
  app.post("/v1/maintenance/:maintenanceId/resolve", { preHandler: authorize("maintenance:write") }, async (request, reply) => { const { maintenanceId } = parse(idParams("maintenanceId"), request.params) as { maintenanceId: number }; const { resolvedDate } = parse(z.object({ resolvedDate: date.default(() => new Date().toISOString().slice(0, 10)) }).strict(), request.body ?? {}); const data = await repository.resolveMaintenance(request.user.tenantId, maintenanceId, resolvedDate); return data ? { data } : reply.code(404).send({ error: "Maintenance record not found", requestId: request.id }); });

  app.post("/v1/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const body = parse(z.object({ email: z.string().email(), password: z.string().min(8), tenantId: nonempty(120) }).strict(), request.body);
    if (!(repository instanceof PostgresInventoryRepository)) return reply.code(503).send({ error: "Database authentication is not configured", requestId: request.id });
    const account = await repository.authenticate(body.tenantId, body.email, body.password);
    if (!account) return reply.code(401).send({ error: "Invalid credentials", requestId: request.id });
    const roles = account.role === "ADMIN" ? developmentRoles : developmentRoles.filter((role) => role.endsWith(":read") || role === "loans:write" || role === "maintenance:write");
    const token = await reply.jwtSign({ tenantId: account.tenantId, roles, sub: String(account.userId) }, { expiresIn: "15m" });
    return { token, expiresIn: "15m", user: { userId: account.userId, name: account.name, email: account.email, role: account.role } };
  });

  app.post("/v1/auth/signup", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const body = parse(z.object({ tenantId: nonempty(120), name: nonempty(120), email: z.string().email().max(254), password: z.string().min(12).max(128).regex(/[A-Z]/, "Password needs an uppercase letter").regex(/[a-z]/, "Password needs a lowercase letter").regex(/[0-9]/, "Password needs a number") }).strict(), request.body);
    if (!(repository instanceof PostgresInventoryRepository)) return reply.code(503).send({ error: "Account registration requires the database", requestId: request.id });
    const hash = await bcrypt.hash(body.password, 12);
    try {
      await repository.pool.query("INSERT INTO app.users(tenant_id,name,email,password_hash,role,is_active,approval_status) VALUES($1,$2,lower($3),$4,'STAFF',true,'PENDING')", [body.tenantId, body.name, body.email, hash]);
    } catch (error) {
      if ((error as { code?: string }).code !== "23505" && (error as { code?: string }).code !== "23503") throw error;
    }
    return reply.code(202).send({ message: "If the organization and email are valid, the request is awaiting administrator approval." });
  });

  app.get("/v1/admin/approvals", { preHandler: authorize("users:manage") }, async (request, reply) => {
    if (!(repository instanceof PostgresInventoryRepository)) return { data: [] };
    const result = await repository.pool.query("SELECT user_id,name,email,role,approval_status,created_at FROM app.users WHERE tenant_id=$1 AND approval_status='PENDING' ORDER BY created_at", [request.user.tenantId]);
    return { data: result.rows.map((row) => ({ userId: row.user_id, name: row.name, email: row.email, role: row.role, approvalStatus: row.approval_status, createdAt: row.created_at })) };
  });

  app.post("/v1/admin/approvals/:userId", { preHandler: authorize("users:manage") }, async (request, reply) => {
    const { userId } = parse(idParams("userId"), request.params) as { userId: number };
    const { decision } = parse(z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }).strict(), request.body);
    if (!(repository instanceof PostgresInventoryRepository)) return reply.code(503).send({ error: "Database is required", requestId: request.id });
    const result = await repository.pool.query("UPDATE app.users SET approval_status=$3,approved_by=$4,approved_at=NOW(),is_active=($3='APPROVED') WHERE tenant_id=$1 AND user_id=$2 AND approval_status='PENDING' RETURNING user_id", [request.user.tenantId, userId, decision, request.user.sub ?? null]);
    if (!result.rowCount) return reply.code(404).send({ error: "Pending account not found", requestId: request.id });
    await repository.pool.query("INSERT INTO app.audit_events(tenant_id,actor_user_id,action,target_type,target_id,request_id) VALUES($1,$2,$3,'user',$4,$5)", [request.user.tenantId, request.user.sub ?? null, `ACCOUNT_${decision}`, String(userId), request.id]);
    return { data: { userId, approvalStatus: decision } };
  });

  app.get("/v1/settings", { preHandler: authorize("settings:manage") }, async (request) => {
    if (!(repository instanceof PostgresInventoryRepository)) return { data: { defaultDepreciationRate: 20, theme: "system" } };
    const result = await repository.pool.query("SELECT default_depreciation_rate,theme FROM app.tenant_settings WHERE tenant_id=$1", [request.user.tenantId]);
    const row = result.rows[0]; return { data: { defaultDepreciationRate: Number(row?.default_depreciation_rate ?? 20), theme: row?.theme ?? "system" } };
  });

  app.put("/v1/settings", { preHandler: authorize("settings:manage") }, async (request) => {
    const body = parse(z.object({ defaultDepreciationRate: z.number().min(0).max(100), theme: z.enum(["system", "light", "dark"]) }).strict(), request.body);
    if (repository instanceof PostgresInventoryRepository) await repository.pool.query("INSERT INTO app.tenant_settings(tenant_id,default_depreciation_rate,theme) VALUES($1,$2,$3) ON CONFLICT(tenant_id) DO UPDATE SET default_depreciation_rate=EXCLUDED.default_depreciation_rate,theme=EXCLUDED.theme,updated_at=NOW()", [request.user.tenantId, body.defaultDepreciationRate, body.theme]);
    return { data: body };
  });

  app.get("/v1/reports/summary", { preHandler: authorize("reports:read") }, async (request) => {
    if (!(repository instanceof PostgresInventoryRepository)) {
      const [devices, loans, maintenance] = await Promise.all([repository.listDevices(request.user.tenantId, { limit: 100 }), repository.listLoans(request.user.tenantId, { limit: 100 }), repository.listMaintenance(request.user.tenantId, { limit: 100 })]);
      const total = devices.items.length; const available = devices.items.filter((d) => d.status === "AVAILABLE").length;
      return { data: { inventory: { total, available, checkedOut: devices.items.filter((d) => d.status === "CHECKED_OUT").length, maintenance: devices.items.filter((d) => d.status === "MAINTENANCE").length }, loans: { active: loans.items.filter((l) => l.loanStatus === "ACTIVE").length, overdue: loans.items.filter((l) => l.loanStatus === "OVERDUE").length, utilizationRate: total ? Math.round(((total - available) / total) * 100) : 0 }, maintenance: { open: maintenance.items.filter((m) => m.maintenanceStatus !== "RESOLVED").length }, depreciation: { acquisitionValue: 0, currentBookValue: 0, depreciatedValue: 0, percentDepreciated: 0 }, byCenter: [] } };
    }
    const result = await repository.pool.query(`WITH s AS (SELECT COALESCE(default_depreciation_rate,20) rate FROM app.tenant_settings WHERE tenant_id=$1), d AS (SELECT d.*, COALESCE(d.depreciation_rate,(SELECT rate FROM s),20) rate, GREATEST(0, d.purchase_cost * (1 - LEAST(1, COALESCE((CURRENT_DATE-d.purchase_date)/365.25,0) * COALESCE(d.depreciation_rate,(SELECT rate FROM s),20)/100))) book FROM app.devices d WHERE d.tenant_id=$1) SELECT count(*) total,count(*) FILTER(WHERE status='AVAILABLE') available,count(*) FILTER(WHERE status='CHECKED_OUT') checked_out,count(*) FILTER(WHERE status='MAINTENANCE') maintenance,COALESCE(sum(purchase_cost),0) acquisition,COALESCE(sum(book),0) book FROM d`, [request.user.tenantId]);
    const loan = await repository.pool.query("SELECT count(*) FILTER(WHERE loan_status='ACTIVE') active,count(*) FILTER(WHERE loan_status='OVERDUE' OR (loan_status='ACTIVE' AND due_date<NOW())) overdue FROM app.loans WHERE tenant_id=$1", [request.user.tenantId]);
    const centers = await repository.pool.query("SELECT c.center_name,count(d.device_id) total,count(d.device_id) FILTER(WHERE d.status='AVAILABLE') available FROM app.outreach_centers c LEFT JOIN app.devices d ON d.tenant_id=c.tenant_id AND d.center_id=c.center_id WHERE c.tenant_id=$1 GROUP BY c.center_id ORDER BY c.center_name", [request.user.tenantId]);
    const row=result.rows[0], acquisition=Number(row.acquisition), book=Number(row.book), total=Number(row.total), available=Number(row.available);
    return { data: { inventory: { total, available, checkedOut:Number(row.checked_out), maintenance:Number(row.maintenance) }, loans: { active:Number(loan.rows[0].active), overdue:Number(loan.rows[0].overdue), utilizationRate:total?Math.round(((total-available)/total)*100):0 }, depreciation:{ acquisitionValue:acquisition,currentBookValue:book,depreciatedValue:acquisition-book,percentDepreciated:acquisition?Math.round((acquisition-book)/acquisition*100):0 }, byCenter:centers.rows.map((c)=>({name:c.center_name,total:Number(c.total),available:Number(c.available)})) } };
  });

  app.get("/v1/monitoring", { preHandler: authorize("monitoring:read") }, async () => ({ data: { status: "healthy", uptimeSeconds: Math.round((Date.now()-metrics.startedAt)/1000), requests: metrics.requests, serverErrors: metrics.errors, averageLatencyMs: metrics.requests ? Math.round(metrics.totalMs/metrics.requests) : 0, database: repository instanceof PostgresInventoryRepository ? "connected" : "memory" } }));

  if (process.env.NODE_ENV !== "production") app.post("/v1/dev/token", async (request, reply) => { const body = parse(z.object({ tenantId: nonempty(120) }).strict(), request.body); const token = await reply.jwtSign({ tenantId: body.tenantId, roles: developmentRoles }, { expiresIn: "15m" }); return { token, expiresIn: "15m" }; });
  return app;
}
