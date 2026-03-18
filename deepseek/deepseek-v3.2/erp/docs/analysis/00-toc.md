### Table of Contents

**erpTimeTrack** is a backend service with the following actors and domain entities.

**Actors**: guest, member, admin
**Entities**: User, Organization, Employee, Role, Department, Project, Task, Timelog, Timesheet, Contract, Timer, ActivityLog

---

**Scope**

- **User** — can belong to many Organizations via Employees
- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles
- **Employee** — belongs to User, belongs to Organization, has one Role, has many Contracts, assigned to many Projects, has many Timelogs, has many Timesheets
- **Role** — belongs to Organization, assigned to many Employees
- **Department** — belongs to Organization, has many Employees
- **Project** — belongs to Organization, has many Tasks, has many ProjectMemberships, has many Timelogs
- **Task** — belongs to Project, assigned to Employee (optional), has many Timelogs
- **Timelog** — belongs to Employee, belongs to Project, belongs to Task (optional), included in Timesheet (optional)
- **Timesheet** — belongs to Employee, has many Timelogs, reviewed by User (optional)
- **Contract** — belongs to Employee, only one active at a time
- **Timer** — belongs to Employee, belongs to Project, belongs to Task (optional)
- **ActivityLog** — performed by User, belongs to Organization

- **guest** (guest)
- **member** (member)
- **admin** (admin)

---

**Document Map**

| File | Role | Downstream |
|------|------|------------|
| [00-toc.md](./00-toc.md) | Project summary, scope, glossary, and assumptions | project-setup |
| [01-actors-and-auth.md](./01-actors-and-auth.md) | Actor definitions, permission matrix, authentication, session, account lifecycle | auth-middleware |
| [02-domain-model.md](./02-domain-model.md) | Business concepts, relationships, and states from user perspective | database-design |
| [03-functional-requirements.md](./03-functional-requirements.md) | What operations users can perform, use cases, business workflows | interface-design |
| [04-business-rules.md](./04-business-rules.md) | Business rules, validation constraints, data browsing expectations, error scenarios | service-layer |
| [05-non-functional.md](./05-non-functional.md) | Data ownership, privacy, retention, and recovery policies | test-infra |

**Section Navigation**

<!-- Load sections by ID: `process({ request: { type: "getAnalysisSections", sectionIds: [ID, ...] } })` -->

**[01-actors-and-auth.md](./01-actors-and-auth.md)**
- [Actor Definitions](./01-actors-and-auth.md#actor-definitions)
  - [1] [guest Actor](./01-actors-and-auth.md#guest-actor) — Define the guest actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [member Actor](./01-actors-and-auth.md#member-actor) — Define the member actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [admin Actor](./01-actors-and-auth.md#admin-actor) — Define the admin actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Contract Concept](./02-domain-model.md#contract-concept) — Describe what Contract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [19] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [20] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [21] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [22] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [23] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [24] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Contract Operations](./03-functional-requirements.md#contract-operations) — Define business operations for Contract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [35] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [36] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [37] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [38] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [39] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [40] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [41] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [42] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [43] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [44] [Contract Error Scenarios](./03-functional-requirements.md#contract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Contract operations.
  - [45] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [46] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
  - [47] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios-1) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [48] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios-1) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [49] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios-1) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [50] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios-1) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [51] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [52] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [53] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [54] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [55] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [56] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [57] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [58] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [59] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [60] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [61] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [62] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [63] [Contract Rules](./04-business-rules.md#contract-rules) — Define validation rules and domain constraints for Contract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [64] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [65] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [66] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [67] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [68] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [69] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [70] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [71] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [72] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [73] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

---

**Canonical Sources**

Each type of information has one authoritative location. Other files should reference these canonical sources.

| Information Type | Canonical File |
|------------------|---------------|
| Domain concepts | [02-domain-model.md](./02-domain-model.md) |
| Error conditions | [04-business-rules.md](./04-business-rules.md) |
| Permissions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Actor definitions | [01-actors-and-auth.md](./01-actors-and-auth.md) |
| Filtering/pagination rules | [04-business-rules.md](./04-business-rules.md) |
| Data retention/recovery | [05-non-functional.md](./05-non-functional.md) |

---

**Glossary**

- **User** — can belong to many Organizations via Employees
- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles
- **Employee** — belongs to User, belongs to Organization, has one Role, has many Contracts, assigned to many Projects, has many Timelogs, has many Timesheets
- **Role** — belongs to Organization, assigned to many Employees
- **Department** — belongs to Organization, has many Employees
- **Project** — belongs to Organization, has many Tasks, has many ProjectMemberships, has many Timelogs
- **Task** — belongs to Project, assigned to Employee (optional), has many Timelogs
- **Timelog** — belongs to Employee, belongs to Project, belongs to Task (optional), included in Timesheet (optional)
- **Timesheet** — belongs to Employee, has many Timelogs, reviewed by User (optional)
- **Contract** — belongs to Employee, only one active at a time
- **Timer** — belongs to Employee, belongs to Project, belongs to Task (optional)
- **ActivityLog** — performed by User, belongs to Organization

---

**Constraints**

- File scope: Project summary, scope, glossary, and assumptions
- Downstream phase: project-setup
- File scope: Actor definitions, permission matrix, authentication, session, account lifecycle
- Downstream phase: auth-middleware
- File scope: Business concepts, relationships, and states from user perspective
- Downstream phase: database-design
- File scope: What operations users can perform, use cases, business workflows
- Downstream phase: interface-design
- File scope: Business rules, validation constraints, data browsing expectations, error scenarios
- Downstream phase: service-layer
- File scope: Data ownership, privacy, retention, and recovery policies
- Downstream phase: test-infra

**Active Features**

- external-integration
- file-storage