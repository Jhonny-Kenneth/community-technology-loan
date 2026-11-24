import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

const baseUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");

export const telemetrySdk = baseUrl
  ? new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? "community-technology-loan-api",
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? `${baseUrl}/v1/traces`,
      }),
      logRecordProcessors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ?? `${baseUrl}/v1/logs`,
          }),
        }),
      ],
      instrumentations: [
        new HttpInstrumentation(),
        new FastifyInstrumentation(),
        new PgInstrumentation({ enhancedDatabaseReporting: false }),
        new PinoInstrumentation({ logHook: (_span, record) => { delete record.password; delete record.authorization; } }),
      ],
    })
  : undefined;

telemetrySdk?.start();

export async function shutdownTelemetry(): Promise<void> {
  await telemetrySdk?.shutdown();
}
