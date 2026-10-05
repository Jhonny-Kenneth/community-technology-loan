import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { InMemoryInventoryRepository } from "./repository.js";
import { DEVICE_STATUSES, DEVICE_TYPES, LOAN_STATUSES, MAINTENANCE_STATUSES, type InventoryRepository } from "./types.js";

declare module "@fastify/jwt" { interface FastifyJWT { payload: { tenantId: string; roles: string[] }; user: { tenantId: string; roles: string[] } } }

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
const deviceBody = z.object({ assetTag: nonempty(50), serialNumber: nonempty(100), deviceType, manufacturer: nonempty(100), model: nonempty(100), status: deviceStatus, centerId: positiveId }).strict();
const centerBody = z.object({ centerName: nonempty(100), address: nonempty(255), phone: nonempty(20), isActive: z.boolean() }).strict();
const loanBody = z.object({ deviceId: positiveId, centerId: positiveId, reasonId: positiveId, participantCode: nonempty(50), checkoutDate: dateTime, dueDate: dateTime }).strict().refine((x) => x.dueDate > x.checkoutDate, { message: "dueDate must be after checkoutDate", path: ["dueDate"] });
const maintenanceBody = z.object({ deviceId: positiveId, issueDescription: nonempty(65535), serviceDate: date }).strict();
const developmentRoles = ["inventory:read", "inventory:write", "loans:read", "loans:write", "centers:read", "centers:write", "maintenance:read", "maintenance:write", "loan-reasons:read", "loan-reasons:write"];

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> { const result = schema.safeParse(value); if (!result.success) throw Object.assign(new Error("Invalid request"), { statusCode: 400, issues: result.error.flatten() }); return result.data; }
function requireRole(request: FastifyRequest, role: string) { if (!request.user.roles.includes(role)) throw Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }); }
const authorize = (role: string) => async (request: FastifyRequest) => requireRole(request, role);
const pageResponse = <T>(result: { items: T[]; nextCursor?: number }, limit: number) => ({ data: result.items, page: { limit, nextCursor: result.nextCursor ?? null } });

export async function buildApp(repository: InventoryRepository = new InMemoryInventoryRepository()): Promise<FastifyInstance> {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.body.password", "reply.headers.set-cookie"] } });
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters");
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(jwt, { secret });
  app.setErrorHandler((error, request, reply) => { request.log.warn({ err: error, requestId: request.id }, "Request failed"); const known = error as Error & { statusCode?: number; issues?: unknown }; const statusCode = known.statusCode && known.statusCode >= 400 ? known.statusCode : 500; reply.code(statusCode).send({ error: statusCode === 500 ? "Internal server error" : known.message, requestId: request.id, ...(known.issues ? { details: known.issues } : {}) }); });

  // TODO: Add a separate readiness check that verifies MySQL connectivity.
  app.get("/health", async () => ({ status: "ok" }));
  app.addHook("onRequest", async (request) => { if (!request.url.startsWith("/v1/") || request.url === "/v1/dev/token") return; await request.jwtVerify(); });

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

  if (process.env.NODE_ENV !== "production") app.post("/v1/dev/token", async (request, reply) => { const body = parse(z.object({ tenantId: nonempty(120) }).strict(), request.body); const token = await reply.jwtSign({ tenantId: body.tenantId, roles: developmentRoles }, { expiresIn: "15m" }); return { token, expiresIn: "15m" }; });
  return app;
}
