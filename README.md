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

The frontend has been initialized with **Next.js, TypeScript, Tailwind CSS, ESLint, the App Router, and a `src/` directory structure**.

The `backend/`, `database/`, and `docs/` directories are currently placeholders and will be expanded as implementation progresses.

## Technical Direction

> **Note:** The following architecture is the team's current technical direction and should not be treated as a finalized City of Orlando requirement unless confirmed by the team and project documentation.

- **Frontend:** Next.js
- **Backend:** Java + Spring Boot
- **Database:** MySQL
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
npm run dev
```

Then open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run dev
npm run build
npm run lint
npm start
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