# Community Technology Loan Project

Software Development Project for **CEN-4910C**, developed for the **City of Orlando**.

## Project Overview

The Community Technology Loan Project / Community Outreach Centers initiative is focused on creating a software solution for tracking and analytics around a community technology lending program.

The system is intended to support areas such as:

- Device inventory and availability
- Device status tracking
- Checkouts and returns
- Outreach center management
- Loan lifecycle/status tracking
- Search and filtering
- Staff/user roles
- Reports and analytics
- Maintenance and device history
- Inventory tracking

The City of Orlando has also emphasized that analytics should be **privacy-conscious** and that the system should avoid collecting unnecessary personally identifiable information (PII).

## Current Project Status

This repository is in the early development phase.

Current repository structure:

```text
community-technology-loan/
├── frontend/     # Next.js application
├── backend/      # Backend implementation area
├── database/     # Database scripts/schema area
└── docs/         # Project documentation
```

The frontend is authored in TypeScript and compiled to static HTML, CSS, and JavaScript for nginx or another static host.

The `backend/` contains the Fastify API, `db/` contains PostgreSQL initialization, and `frontend/` contains the browser application.

## Technical Direction

> **Note:** The following architecture is the team's current technical direction and should not be treated as a finalized City of Orlando requirement unless confirmed by the team and project documentation.

- **Frontend:** HTML, CSS, TypeScript
- **Backend:** Node.js, TypeScript, Fastify
- **Database:** PostgreSQL
- **Communication:** Next.js → REST API → Spring Boot → MySQL

The current Technical Design Document proposes a MySQL database named `community_outreach_db`. The initial database design currently focuses on `outreach_centers` and `devices`, with additional entities expected to be evaluated as requirements are refined.

## Git Workflow

The team uses the following branch strategy:

- `main` — stable versions
- `develop` — integration and active development
- `feature/*` — individual feature/task branches

Feature branches should be created from `develop` and merged back into `develop` through Pull Requests.

### Typical workflow

```bash
git clone https://github.com/Jhonny-Kenneth/community-technology-loan.git
cd community-technology-loan

git checkout develop
git pull origin develop

git checkout -b feature/your-task-name
```

When the work is ready, push the feature branch and open a Pull Request targeting `develop`.

Please avoid pushing large changes directly to `main`.

## Frontend Setup

```bash
cd frontend
npm install
npm run build
```

Then open:

```text
Open `frontend/index.html` through a local static web server. The API defaults to `http://localhost:3020` on localhost.
```

Useful commands:

```bash
npm run build
npm run check
npm test
```

## Team

| Team Member | Primary Responsibility |
|---|---|
| Jhonny | Team Lead / Project Manager |
| Johnathan | Backend |
| Luis | UI/UX / Frontend |
| Lorvezline (Lorie) | Database |
| Marvin | Platform / Deployment |
| Bryan (Monty) | Security |
| Daniel | Monitoring / Reporting / Analytics |
| Anna / Anastasia | Documentation / Organization |

## Observability

The local Compose stack includes Prometheus, a provisioned Grafana dashboard, and an OpenTelemetry Collector. Start the complete stack with:

```bash
docker compose up --build
```

Endpoints:

- Application health: `http://localhost:3020/health`
- Application readiness: `http://localhost:3020/ready`
- Prometheus exposition: `http://localhost:3020/metrics`
- Prometheus UI: `http://localhost:9090`
- Grafana: `http://localhost:3001` (user `admin`; password from `GRAFANA_ADMIN_PASSWORD`)
- OTLP/HTTP receiver: `http://localhost:4318`

Grafana automatically provisions the Prometheus data source and the **Community Technology Loan API** dashboard. The dashboard covers request rate, p50/p95 latency, 5xx responses, active requests, database readiness, and process memory. Prometheus also loads alert rules for elevated errors, high latency, and database readiness failures.

When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the API auto-instruments Node.js, Fastify, HTTP, PostgreSQL, and Pino. Traces and structured log records are exported through OTLP. Console logs include `trace_id` and `span_id` for correlation. The included collector uses its debug exporter for local inspection; replace or extend that exporter with your production telemetry backend before production deployment.

## Requirements and Design Documentation

The project Technical Design Document currently contains:

- Product Requirements `PR-01` through `PR-09`
- Technical Requirements `TR-01` through `TR-20`
- Initial database design
- UI/UX planning for dashboard, inventory, centers, loans, reports, and related areas

Sections including **Abstract, Objective, Motivation, Implementation, and Testing** are still being developed.

When making implementation decisions, the team should distinguish between:

1. **Official project requirements**
2. **Decisions already agreed on by the team**
3. **Technical proposals or recommendations still requiring agreement**

## Client

**City of Orlando**

This repository supports the team's academic software development project for CEN-4910C.
