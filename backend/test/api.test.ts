import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt-signing";
const allRoles = ["inventory:read", "inventory:write", "loans:read", "loans:write", "centers:read", "centers:write", "maintenance:read", "maintenance:write", "loan-reasons:read", "loan-reasons:write"];
async function session(roles = allRoles, tenantId = "eigen-it") { const app = await buildApp(); const token = app.jwt.sign({ sub: "test-user", tenantId, roles }); return { app, headers: { authorization: `Bearer ${token}` } }; }
const device = { assetTag: "NEW-1", serialNumber: "SERIAL-1", deviceType: "TABLET", manufacturer: "Example", model: "T1", status: "AVAILABLE", centerId: 1 };
const loan = { deviceId: 1, centerId: 1, reasonId: 1, participantCode: "P-1", checkoutDate: "2026-09-01T10:00:00.000Z", dueDate: "2026-10-01T10:00:00.000Z" };

test("authentication, resource authorization, and tenant isolation", async (t) => {
  const app = await buildApp(); t.after(() => app.close());
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory" })).statusCode, 401);
  const wrongRole = app.jwt.sign({ tenantId: "eigen-it", roles: ["loans:read"] });
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory", headers: { authorization: `Bearer ${wrongRole}` } })).statusCode, 403);
  const otherTenant = app.jwt.sign({ tenantId: "other", roles: ["inventory:read"] });
  const isolated = await app.inject({ method: "GET", url: "/v1/inventory", headers: { authorization: `Bearer ${otherTenant}` } });
  assert.deepEqual(isolated.json().data, []);
});

test("device IDs, validation, filtering, pagination, and not found", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  const page = await app.inject({ method: "GET", url: "/v1/inventory?deviceType=LAPTOP&status=AVAILABLE&centerId=1&limit=1", headers });
  assert.equal(page.statusCode, 200); assert.equal(page.json().data[0].deviceId, 1); assert.equal(page.json().page.nextCursor, null);
  const paginated = await app.inject({ method: "GET", url: "/v1/inventory?limit=1", headers });
  assert.equal(paginated.json().page.nextCursor, 1);
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory/ast_1", headers })).statusCode, 400);
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory/999", headers })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/v1/inventory", headers, payload: { ...device, deviceType: "PHONE" } })).statusCode, 400);
});

test("creates devices and rejects duplicate asset tags and serial numbers", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  assert.equal((await app.inject({ method: "POST", url: "/v1/inventory", headers, payload: device })).statusCode, 201);
  assert.equal((await app.inject({ method: "POST", url: "/v1/inventory", headers, payload: { ...device, serialNumber: "OTHER" } })).statusCode, 409);
  assert.equal((await app.inject({ method: "POST", url: "/v1/inventory", headers, payload: { ...device, assetTag: "OTHER" } })).statusCode, 409);
  assert.equal((await app.inject({ method: "PATCH", url: "/v1/inventory/1", headers, payload: { status: "CHECKED_OUT" } })).statusCode, 400);
});

test("center endpoints filter and enforce center roles", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  const list = await app.inject({ method: "GET", url: "/v1/centers?isActive=true&search=central", headers });
  assert.equal(list.statusCode, 200); assert.equal(list.json().data.length, 1);
  const created = await app.inject({ method: "POST", url: "/v1/centers", headers, payload: { centerName: "North", address: "3 North St", phone: "555-3", isActive: true } });
  assert.equal(created.statusCode, 201);
  assert.equal((await app.inject({ method: "GET", url: "/v1/centers/999", headers })).statusCode, 404);
});

test("loan reasons are unique", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  assert.equal((await app.inject({ method: "POST", url: "/v1/loan-reasons", headers, payload: { reasonName: "Employment" } })).statusCode, 201);
  assert.equal((await app.inject({ method: "POST", url: "/v1/loan-reasons", headers, payload: { reasonName: "employment" } })).statusCode, 409);
});

test("checkout and return update device lifecycle and reject repeats", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  const checkout = await app.inject({ method: "POST", url: "/v1/loans", headers, payload: loan });
  assert.equal(checkout.statusCode, 201); const loanId = checkout.json().data.loanId;
  assert.equal((await app.inject({ method: "POST", url: "/v1/loans", headers, payload: { ...loan, participantCode: "P-2" } })).statusCode, 409);
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory/1", headers })).json().data.status, "CHECKED_OUT");
  const returned = await app.inject({ method: "POST", url: `/v1/loans/${loanId}/return`, headers, payload: { returnDate: "2026-09-20T10:00:00.000Z" } });
  assert.equal(returned.statusCode, 200); assert.equal(returned.json().data.loanStatus, "RETURNED");
  assert.equal((await app.inject({ method: "POST", url: `/v1/loans/${loanId}/return`, headers, payload: {} })).statusCode, 409);
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory/1", headers })).json().data.status, "AVAILABLE");
});

test("maintenance rejects checked-out devices and resolves lifecycle", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  await app.inject({ method: "POST", url: "/v1/loans", headers, payload: loan });
  assert.equal((await app.inject({ method: "POST", url: "/v1/maintenance", headers, payload: { deviceId: 1, issueDescription: "Broken", serviceDate: "2026-09-02" } })).statusCode, 409);
  const opened = await app.inject({ method: "POST", url: "/v1/maintenance", headers, payload: { deviceId: 2, issueDescription: "Battery", serviceDate: "2026-09-02" } });
  assert.equal(opened.statusCode, 201); const id = opened.json().data.maintenanceId;
  assert.equal((await app.inject({ method: "PATCH", url: `/v1/maintenance/${id}`, headers, payload: { maintenanceStatus: "IN_PROGRESS" } })).statusCode, 200);
  const resolved = await app.inject({ method: "POST", url: `/v1/maintenance/${id}/resolve`, headers, payload: { resolvedDate: "2026-09-05" } });
  assert.equal(resolved.statusCode, 200); assert.equal(resolved.json().data.maintenanceStatus, "RESOLVED");
  assert.equal((await app.inject({ method: "GET", url: "/v1/inventory/2", headers })).json().data.status, "AVAILABLE");
});

test("device history contains schema-backed loans and maintenance only", async (t) => {
  const { app, headers } = await session(); t.after(() => app.close());
  await app.inject({ method: "POST", url: "/v1/maintenance", headers, payload: { deviceId: 2, issueDescription: "Screen", serviceDate: "2026-09-03" } });
  const history = await app.inject({ method: "GET", url: "/v1/inventory/2/history", headers });
  assert.equal(history.statusCode, 200); assert.equal(history.json().data.maintenanceRecords.length, 1); assert.deepEqual(history.json().data.loans, []);
});

test("development token does not require roles in the request", async (t) => {
  const app = await buildApp(); t.after(() => app.close());
  const response = await app.inject({ method: "POST", url: "/v1/dev/token", payload: { tenantId: "eigen-it" } });
  assert.equal(response.statusCode, 200);
  const payload = app.jwt.verify<{ roles: string[] }>(response.json().token);
  assert.ok(payload.roles.includes("inventory:read"));
  assert.ok(payload.roles.includes("maintenance:write"));
});

test("development token is absent in production", async (t) => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = "production"; const app = await buildApp(); t.after(async () => { await app.close(); if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  assert.equal((await app.inject({ method: "POST", url: "/v1/dev/token", payload: { tenantId: "x" } })).statusCode, 404);
});
