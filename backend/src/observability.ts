import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "@prometheus-io/client";

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ service: "community-technology-loan-api" });
collectDefaultMetrics({ register: metricsRegistry, prefix: "ctl_" });

export const httpRequests = new Counter({
  name: "ctl_http_requests_total",
  help: "Total completed HTTP requests.",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [metricsRegistry],
});

export const httpDuration = new Histogram({
  name: "ctl_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const activeRequests = new Gauge({
  name: "ctl_http_active_requests",
  help: "HTTP requests currently being processed.",
  registers: [metricsRegistry],
});

export const databaseReady = new Gauge({
  name: "ctl_database_ready",
  help: "Whether the configured database passed its latest readiness check.",
  registers: [metricsRegistry],
});
