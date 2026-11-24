import "./telemetry.js";
import { buildApp } from "./app.js";
import { PostgresInventoryRepository } from "./postgres-repository.js";
import { shutdownTelemetry } from "./telemetry.js";

const repository = process.env.DATABASE_URL
  ? new PostgresInventoryRepository(process.env.DATABASE_URL)
  : undefined;

const app = await buildApp(repository);
const port = Number(process.env.PORT ?? 3020);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    await app.close();
    await shutdownTelemetry();
    process.exit(0);
  });
}
