**Community Technology Loan Project**

Project Team:

Jhonny Sousa (Team Lead)

Luis Augusto Monserratt

Daniel Sergent

Lorvezline Donassaint

Johnathan McAllister

Bryan Montalvo Ramos

Marvin Philippe

Anastasia Barsamian

# Table of Contents

1\. Project Overview

2\. Development Environment

3\. System Architecture

4\. Frontend Application

5\. Backend API

6\. Database Configuration

7\. Database Structure and Models

8\. User Authentication

9\. Application Deployment

10\. Application Workflow

11\. Testing and Beta Results

12\. Revisions and Improvements

13\. Known Issues and Limitations

14\. Future Improvements

15\. Conclusion

# 1. Project Overview

The Community Technology Loan Project is a web-based inventory and lending management system developed for the City of Orlando. It supports staff at community outreach centers in tracking technology equipment, its availability, lending activity and maintenance. The project addresses the need for centralized operational records and a foundation for evaluating program utilization without collecting unnecessary participant information.

The beta application demonstrates inventory management and frontend–API integration. The target architecture additionally provides persistent storage, authenticated access, tenant isolation and coordinated loan and maintenance workflows. This report distinguishes demonstrated functionality from design requirements and remaining integration work.

## 1.1 November 2026 implementation revision

The current source revision advances the application beyond the original beta described in this report. It adds a PostgreSQL repository selected by `DATABASE_URL`, tenant-scoped JWT authentication, password hashing and lockout, transactional loan and maintenance workflows, and production CORS restrictions. Public registration creates pending staff accounts; administrators approve or reject those accounts inside Admin Settings, and decisions are recorded in an audit event table.

The frontend now signs in through the API rather than browser-only demo accounts. It includes a responsive reports and analytics page, light/dark/system themes, live service-health indicators, account approvals, and inventory acquisition and depreciation fields. Tenant settings store the default annual straight-line depreciation rate. Reports calculate acquisition value, accumulated depreciation, current book value, utilization, overdue loans, inventory status, and center distribution. API request counts, server-error counts, average latency, uptime, readiness, structured request IDs, and database health provide an initial monitoring and observability layer.

Database deployments must apply the revised `db/init/003-community-loan.sql` migration and configure `DATABASE_URL`, a 32-character-or-longer `JWT_SECRET`, and an explicit `CORS_ORIGINS` list. The in-memory repository remains available for automated tests and local API development; database-only registration and approval functions correctly report that persistent storage is required when it is not configured.

# 2. Development Environment

| Component                  | Technology / purpose                                                       |
|----------------------------|----------------------------------------------------------------------------|
| Frontend                   | HTML, CSS, JavaScript; browser-based interface                             |
| Backend                    | Node.js, TypeScript, Fastify; REST/JSON API                                |
| Validation and security    | Zod, Helmet, CORS, rate limiting; JWT and role-based access design         |
| Data layer                 | PostgreSQL target; in-memory beta repository; local MySQL schema prototype |
| Source control and hosting | GitHub and Render                                                          |
| Testing                    | Browser functional testing, Fastify request injection, local SQL testing   |

Development configuration should be supplied through environment variables, with secrets excluded from source control. Local development and deployed environments should use separate credentials and test data.

# 3. System Architecture

<img src="community-loan-assets/media/image1.png" style="width:6.6in;height:3.71534in" />

The Community Outreach Inventory Management System uses a three-tier architecture consisting of a frontend web application, a Fastify REST API backend, and a PostgreSQL database. The frontend provides the user interface for managing devices, outreach centers, loans, loan reasons, and maintenance records. The backend handles authentication, role-based authorization, request validation, business logic, and tenant-specific data access, ensuring that users can only access information permitted by their roles and organization. PostgreSQL provides persistent, centralized data storage, with transactional operations maintaining data consistency across related records. The application is deployed through Render, which manages hosting, builds, database connectivity, and CI/CD, while GitHub provides version control and source code management. This architecture provides a modular, secure, and scalable foundation for managing community equipment lending operations across multiple outreach organizations.

Implementation note: The diagram and description define the target architecture. The beta evidence does not establish completed PostgreSQL persistence or end-to-end account authentication; these gaps are documented in Sections 6, 8 and 13.

# 4. Frontend Application

## 4.1 Frontend Overview

The Community Technology Loan frontend is a web application developed with HTML, CSS, and JavaScript. It provides City of Orlando staff with a centralized interface to manage devices, outreach centers, loans, users, and system settings.

## 4.2 Main Application Features

The frontend provides the following main features:

- Dashboard: Displays an overview of inventory and system information.

- Device Inventory: Allows staff to view, add, edit, search, and filter devices by Asset ID, model, type, and status.

- Outreach Centers: Displays center information and associated devices, with editing capabilities.

- Loan Management: Displays loan records and details; checkout and return workflows are part of the design and require end-to-end verification.

- User Management: Provides a user directory with Add and Edit actions. Full authentication and account management require further backend integration.

- Settings: Provides access to outreach centers, loan reasons, user roles, inventory settings, and system preferences. Some options may be limited by backend functionality.

## 4.3 Frontend and Backend Integration

The frontend communicates with the backend through HTTP API requests.

- Frontend: https://communitytechnologyloanfrontend.onrender.com/

- Backend API: https://inventory-api-1-lj9t.onrender.com

The integration allows the application to retrieve and update data through backend services. Since the API uses Render's free plan, it may sleep after inactivity. The frontend displays a connection screen and retries while the backend wakes up.

For testing, Chrome or Microsoft Edge is recommended because Brave Shields may block API requests.

## 4.4 Frontend Functional Testing

Frontend testing focused on verifying application navigation, user interactions, form validation, data retrieval, and the behavior of important management features.

The following functional tests were performed:

| Test Area              | Testing Performed                                                                             | Result  |
|------------------------|-----------------------------------------------------------------------------------------------|---------|
| Device Form Validation | Submitted the device form with required fields empty.                                         | PASS    |
| Device Creation        | Created a device through the deployed application and verified that it appeared in inventory. | PASS    |
| Device Editing         | Updated device information and verified that changes remained after refreshing.               | PASS    |
| Inventory Search       | Searched by Asset ID and device model.                                                        | PASS    |
| Inventory Filters      | Tested device type and status filters.                                                        | PASS    |
| Outreach Centers       | Opened center details and verified associated devices and navigation.                         | PASS    |
| Loans                  | Opened the Loans page and reviewed loan records.                                              | PASS    |
| Loan Details           | Tested the View action for a loan record.                                                     | PASS    |
| User Directory         | Opened the Users page and tested the available Add/Edit interface actions.                    | PARTIAL |
| Settings               | Opened Settings and tested the available configuration interface.                             | PASS    |

The User Directory result is classified as partial because the interface actions are available, but the current implementation does not create real authentication accounts.

## 4.5 Usability Issues and Revisions

During frontend testing, several usability and integration issues were identified and addressed:

- Device Editing: Updated backend CORS support to allow PATCH and OPTIONS requests and verified device editing.

- Inventory Data: Connected inventory and outreach center pages to retrieve real data from the backend instead of sample data.

- Device Creation: Updated the Add Device form to load actual outreach centers and use valid center IDs.

- Loan Details: Retested and verified the View action.

- User Management: Activated Add User and Edit User actions. Full account creation still requires backend integration.

- Settings: Retested configuration actions and improved error messages when API requests fail.

- Backend Availability: Added a connection screen and automatic retries while the Render API wakes up.

These improvements enhanced frontend functionality, usability, and beta testing reliability.

## 4.6 Frontend Deployment

The frontend is deployed on Render and communicates with the backend API.

Frontend: https://communitytechnologyloanfrontend.onrender.com/

API Health Check: https://inventory-api-1-lj9t.onrender.com/health

Since the API uses Render's free plan, it may take approximately one minute to wake up after inactivity. Before testing, open the API health link and wait for:

{"status":"ok"}

Then open the frontend. Chrome or Microsoft Edge is recommended because Brave Shields may block API requests.

## 4.7 Frontend Contribution

Frontend contributions focused on functionality, usability testing and documenting improvements. Tasks included:

- Testing application pages and navigation.

- Validating forms and required fields.

- Testing device creation, editing, search, and filters.

- Verifying outreach center and loan functionality.

- Reviewing Users and Settings interfaces.

- Documenting issues and tracking revisions.

- Retesting features after updates.

This work helped improve the application and identify remaining issues for future development.

# 5. Backend API

## 5.1 Overview

The backend is the central application layer, built with Node.js, TypeScript and Fastify. It exposes REST resources to the frontend and isolates data access through a repository interface. PostgreSQL, authenticated access and tenant-scoped persistence are target capabilities; the beta uses an in-memory repository.

## 5.2 Server and Application Layer

- server.ts: Starts the API server and manages configuration.

- app.ts: Configures Fastify, middleware, authentication, and REST endpoints.

- Handles incoming HTTP requests and returns standardized JSON responses.

## 5.3 Security and Authentication

- Helmet, CORS, and rate limiting protect the API.

- JWT is the selected authentication mechanism; account issuance and login integration remain incomplete.

- Role-based authorization is designed to control resource access; end-to-end enforcement requires verification.

- Tenant IDs are intended to scope resource access to the user’s organization.

Security and permission checks must be enforced by the API rather than relying on frontend controls.

## 5.4 Validation and Error Handling

- Zod validates incoming requests, parameters, and query strings.

- Consistent error responses include descriptive messages and request IDs.

- Standardized response structures simplify frontend integration.

## 5.5 Repository and Database Layer

- InventoryRepository defines the data access interface.

- The current implementation uses in-memory storage.

- A PostgreSQL adapter will replace in-memory persistence.

- Database transactions will protect operations involving multiple related records.

Additional information: The repository pattern allows the database implementation to change without requiring a complete rewrite of the API.

## 5.6 Core Business Domains

The API manages five primary resource groups:

- Inventory: Device registration, assignment, and history.

- Centers: Outreach location management.

- Loans: Equipment checkout, updates, and returns.

- Loan Reasons: Controlled borrowing classifications.

- Maintenance: Repair records and device availability.

## 5.7 Business Rules and Lifecycle Management

The backend controls important device status transitions:

- Available → Checked Out

- Checked Out → Available

- Available → Maintenance

- Maintenance → Available

Dedicated lifecycle operations are intended to prevent generic updates from bypassing status transitions. Verify this behavior through API and database integration tests.

## 5.8 Testing and Deployment

- API routes are tested using Fastify request injection.

- GitHub manages source control and version history.

- Render manages builds, testing, hosting, and CI/CD.

- Environment variables securely provide database credentials and application configuration.

# 6. Database Configuration

## 6.1 Database Overview

PostgreSQL is the designated relational database for the final architecture. The team developed and tested a five-table schema locally using MySQL and MySQL Workbench. This work provides a logical model and preliminary validation, not evidence of a deployed PostgreSQL integration.

## 6.2 Database Environment

The local prototype used community_outreach_db on MySQL port 3306. The target environment is a Render-hosted PostgreSQL database accessed exclusively through the Fastify repository layer. The beta API is documented as using in-memory storage.

## 6.3 Database Setup

To complete the target implementation:

- Provision PostgreSQL and configure the API connection through a protected environment variable such as DATABASE_URL.

- Convert the existing schema to PostgreSQL-compatible migrations, including identity columns, data types, constraints and indexes.

- Create outreach_centers, devices, loan_reasons, loans and maintenance_records in dependency order; add tenant and account structures as required by Section 7.

- Implement the PostgreSQL adapter for InventoryRepository and use transactions for operations that update multiple records.

- Run migrations and seed non-sensitive test data in a test environment. Verify connectivity, constraints, rollback behavior and persistence across API restarts.

## 6.4 Database Verification

Local MySQL INSERT, SELECT, UPDATE and JOIN tests passed, including duplicate asset-tag rejection. These results validate the prototype only; equivalent PostgreSQL tests must be repeated after migration.

## 6.5 Integration Status

The submission does not establish that the PostgreSQL adapter or deployed database connection is complete. Until verified, frontend refresh tests should not be interpreted as proof of durable storage across service restarts.

# 7. Database Structure and Models

## 7.1 Database Structure

The five-table prototype models the core business domains. Primary and foreign keys connect the records. The final PostgreSQL schema should retain these relationships while extending them to support tenant isolation and user accounts.

## 7.2 Database Tables

| Table               | Core fields and purpose                                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| outreach_centers    | center_id (PK), center_name, address, phone, is_active, created_at                                                       |
| devices             | device_id (PK), asset_tag (unique), serial_number (unique), device_type, manufacturer, model, status, center_id (FK)     |
| loan_reasons        | reason_id (PK), reason_name (unique); e.g., Education, Employment, Benefits Access, Telehealth, Other                    |
| loans               | loan_id (PK), device_id, center_id, reason_id (FKs), participant_code, checkout_date, due_date, return_date, loan_status |
| maintenance_records | maintenance_id (PK), device_id (FK), issue_description, service_date, resolved_date, maintenance_status                  |

Device states: AVAILABLE, CHECKED_OUT, MAINTENANCE. Loan states: ACTIVE, RETURNED, OVERDUE. Maintenance states: OPEN, IN_PROGRESS, RESOLVED. Participant codes replace full participant names to minimize personal data.

## 7.3 Database Relationships

- devices.center_id → outreach_centers.center_id

- loans.device_id → devices.device_id

- loans.center_id → outreach_centers.center_id

- loans.reason_id → loan_reasons.reason_id

- maintenance_records.device_id → devices.device_id

Target extensions: add tenant records and tenant-scoped user accounts with role assignments; scope business records and uniqueness rules appropriately. Enforce same-tenant relationships, prevent multiple active loans per device, and validate date ordering. These are proposed extensions, not confirmed deployed tables.

## 7.4 Entity Relationship Diagram

<img src="community-loan-assets/media/image2.png" style="width:5.8in;height:4.35in" />

Original five-table prototype ERD. Tenant, user and audit structures are not represented and remain extensions to the target design.

## 7.5 Database Testing Results

TC-DB-01: Save New Device Record — Passed

TC-DB-02: Update Device Record — Passed

TC-DB-03: Duplicate Asset Tag Validation — Passed

Additional beta testing verified that device records could be retrieved and updated, and that device records could be joined with their assigned outreach centers.

The duplicate asset tag test correctly returned to MySQL Error 1062, confirming that the database prevents duplicate asset tags.

The final local database retest successfully retrieved the test device BETA-LAP-001 with status MAINTENANCE and its associated outreach center.

These results confirm that the tested database operations functioned as expected in the local MySQL environment.

# 8. User Authentication

The target security model uses JWT authentication, administrator and staff roles, and tenant-scoped authorization. The beta user directory supports browser-local Add/Edit actions but does not provision login accounts. Authentication routes and persistent account management are not established by the submission.

To complete the design, the API should validate credentials against securely hashed passwords, issue short-lived tokens, verify tokens on protected requests, and derive role and tenant scope from trusted account information. Administrators should manage accounts within their tenant; staff should access only authorized operational resources. Logout, token expiry, password management and account lockout after three consecutive failed attempts require implementation and testing. Lockout should include a controlled recovery process.

# 9. Application Deployment

The frontend and Fastify API are deployed separately on Render, with GitHub providing source control. The target deployment includes PostgreSQL connectivity and migration execution. The reported beta URLs are:

- Frontend: https://communitytechnologyloanfrontend.onrender.com/

- API: https://inventory-api-1-lj9t.onrender.com

- Health check: https://inventory-api-1-lj9t.onrender.com/health

Open the health endpoint and wait for {"status":"ok"} before opening the frontend. The free API service may require approximately one minute to wake. Chrome or Edge is recommended for testing.

The deployment pipeline should install dependencies, build and test the application, apply compatible migrations and deploy only after successful checks. Configure the frontend API URL, allowed CORS origins, database connection and JWT secrets per environment. A health response confirms API availability, not database persistence or authentication readiness.

# 10. Application Workflow

The following describes the intended operational workflow. Inventory browsing and editing have documented beta results; complete loan, maintenance and authentication workflows require additional verification.

1.  Access: Staff sign in and receive role- and tenant-scoped access (target).

2.  Inventory: Staff register devices, assign outreach centers, and search or filter records.

3.  Checkout: Select an available device, participant code, loan reason and due date. The API validates eligibility and creates a loan while marking the device CHECKED_OUT in one transaction.

4.  Return: Record the return date, close the loan and restore device availability in one transaction.

5.  Maintenance: Open a maintenance record for an eligible device, mark it MAINTENANCE, then resolve the record and restore availability.

6.  Reporting: Use inventory, loan and maintenance records to evaluate availability and utilization; expanded reporting remains future work.

# 11. Testing and Beta Results

Testing covered frontend behavior, API route testing and the local database prototype. Results below summarize the evidence reported by the team; no additional live tests were performed for this revision.

| Area               | Reported result / remaining validation                                                                                    |
|--------------------|---------------------------------------------------------------------------------------------------------------------------|
| Frontend inventory | Passed: required fields, creation, editing, search and filters.                                                           |
| Centers and loans  | Passed: center navigation, loan listing and retested View action. Checkout/return lifecycle not established.              |
| Users and settings | Partial: directory actions and settings interface tested; account provisioning and some configuration actions incomplete. |
| API                | Fastify request injection used; suite totals and detailed outcomes not supplied.                                          |
| Local database     | Passed: insert, update, duplicate asset-tag rejection and joins.                                                          |
| Target integration | Pending verification: PostgreSQL persistence, transactions, JWT login, roles, tenant isolation and lockout.               |

Before production acceptance, test unauthorized and cross-tenant requests, concurrent checkout attempts, failed transaction rollback, restart persistence, invalid input and deployment recovery.

# 12. Revisions and Improvements

Beta feedback led to changes across the presentation and application layers:

- Device Editing: Updated backend CORS support to allow PATCH and OPTIONS requests and verified device editing.

- Inventory Data: Connected inventory and outreach center pages to retrieve real data from the backend instead of sample data.

- Device Creation: Updated the Add Device form to load actual outreach centers and use valid center IDs.

- Loan Details: Retested and verified the View action.

- User Management: Activated Add User and Edit User actions. Full account creation still requires backend integration.

- Settings: Retested configuration actions and improved error messages when API requests fail.

- Backend Availability: Added a connection screen and automatic retries while the Render API wakes up.

These changes improved usability and integration reliability. They do not establish completion of the remaining security and persistence requirements.

# 13. Known Issues and Limitations

- Persistent storage: The API is documented as using in-memory storage; PostgreSQL migration and integration remain unverified.

- User management: Browser-local directory entries do not create authenticated accounts. Login, password management, role enforcement and tenant isolation require completion or verification.

- Loan and maintenance workflows: Loan View was reported as passing after retesting; complete transactional checkout, return and maintenance behavior remains unverified.

- Settings: Some configuration actions are placeholders or notifications rather than persisted changes.

- Hosting: Render free-tier cold starts and browser request blocking can delay or interrupt access.

- Account lockout: The three-failure requirement is not implemented.

- Testing evidence: Detailed API results and production-readiness checks are not supplied.

# 14. Future Improvements

## 14.1 Authentication and Access Control

Implement secure login, logout, role-based permissions for administrators and staff, account lockout, and password management.

## 14.2 User Management

Connect the user directory to the backend database, allowing administrators to create, edit, deactivate, and manage accounts with persistent data.

## 14.3 Frontend and User Experience

Improve navigation, loan details, search and filtering, form validation, error messages, accessibility, and mobile responsiveness.

## 14.4 Inventory and Reporting

Add reports for device availability, inventory status, active and overdue loans, equipment distribution by outreach center, maintenance history, and report exports.

## 14.5 Monitoring and Reliability

Complete monitoring dashboards and automated alerts, improve API error tracking, introduce automated deployment testing, and strengthen performance and outage handling.

## 14.6 Database Improvements

Implement regular backups, stronger data validation, audit history, and additional testing of database relationships and constraints.

## 14.7 Deployment and Integration

Improve frontend-backend integration, automated deployment pipelines, production testing, and API availability.

Priority should be given to PostgreSQL integration, account authentication, tenant isolation and transactional lifecycle testing before expanded reporting or production rollout.

# 15. Conclusion

The Community Technology Loan Project provides the City of Orlando with a beta web application for managing technology equipment across community outreach centers. The team demonstrated inventory creation, editing, searching, filtering and access to outreach center and loan information. The three-tier architecture provides a foundation for persistent lending records, maintenance tracking, secure access and future reporting while minimizing unnecessary participant data.

The project also identified the work required to move from beta to production, particularly PostgreSQL integration, persistent user management, authorization and transactional workflow validation. Completing these requirements will help ensure the application is reliable and suitable for operational use.

Throughout development, the team gained practical experience coordinating work across repositories, deployment environments and individual responsibilities. Challenges involving platform selection, GitHub integration and shared administrative access reinforced the importance of communication, documentation and consistent development practices. The project demonstrates both a functional beta and a clear path toward the intended system.
