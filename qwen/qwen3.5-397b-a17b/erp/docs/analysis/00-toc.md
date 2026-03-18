### Table of Contents

**hrmPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, User, Employee, Role, Department, Contract, Project, ProjectMember, Task, TaskHistory, Timelog, Timesheet, Timer, ActivityLog

---

**Scope**

- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles, owned by User
- **User** — owns Organizations, has many Employee records across organizations, has one global Profile
- **Employee** — belongsTo User, belongsTo Organization, assigned one Role, has many Contracts, assigned to many Projects, has many Timelogs, has many Timesheets
- **Role** — belongsTo Organization, assigned to many Employees
- **Department** — belongsTo Organization, has many Employees, belongsTo parent Department (self-reference)
- **Contract** — belongsTo Employee
- **Project** — belongsTo Organization, has many ProjectMembers, has many Tasks, has many Timelogs
- **ProjectMember** — belongsTo Project, belongsTo Employee
- **Task** — belongsTo Project, assigned to Employee (optional), belongsTo parent Task (self-reference, one level), has many TaskHistories, has many Timelogs
- **TaskHistory** — belongsTo Task, belongsTo User (who made change)
- **Timelog** — belongsTo Employee, belongsTo Project, belongsTo Task (optional), included in Timesheet
- **Timesheet** — belongsTo Employee (owner), belongsTo User (reviewer, optional), has many Timelogs
- **Timer** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **ActivityLog** — belongsTo User (who performed action), belongsTo Organization

- **guest** (guest)
- **member** (member)

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
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [3] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [4] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [5] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [6] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Contract Concept](./02-domain-model.md#contract-concept) — Describe what Contract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [ProjectMember Concept](./02-domain-model.md#projectmember-concept) — Describe what ProjectMember represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [TaskHistory Concept](./02-domain-model.md#taskhistory-concept) — Describe what TaskHistory represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [20] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [21] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [22] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [23] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [24] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [25] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Contract Operations](./03-functional-requirements.md#contract-operations) — Define business operations for Contract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [ProjectMember Operations](./03-functional-requirements.md#projectmember-operations) — Define business operations for ProjectMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [TaskHistory Operations](./03-functional-requirements.md#taskhistory-operations) — Define business operations for TaskHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [38] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [39] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [40] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [41] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [42] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [43] [Contract Error Scenarios](./03-functional-requirements.md#contract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Contract operations.
  - [44] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [45] [ProjectMember Error Scenarios](./03-functional-requirements.md#projectmember-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMember operations.
  - [46] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [47] [TaskHistory Error Scenarios](./03-functional-requirements.md#taskhistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistory operations.
  - [48] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [49] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [50] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [51] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [52] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [53] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [54] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [55] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [56] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [57] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [58] [Contract Rules](./04-business-rules.md#contract-rules) — Define validation rules and domain constraints for Contract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [59] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [60] [ProjectMember Rules](./04-business-rules.md#projectmember-rules) — Define validation rules and domain constraints for ProjectMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [61] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [62] [TaskHistory Rules](./04-business-rules.md#taskhistory-rules) — Define validation rules and domain constraints for TaskHistory. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [63] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [64] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [65] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [66] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [67] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [68] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [69] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [70] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles, owned by User
- **User** — owns Organizations, has many Employee records across organizations, has one global Profile
- **Employee** — belongsTo User, belongsTo Organization, assigned one Role, has many Contracts, assigned to many Projects, has many Timelogs, has many Timesheets
- **Role** — belongsTo Organization, assigned to many Employees
- **Department** — belongsTo Organization, has many Employees, belongsTo parent Department (self-reference)
- **Contract** — belongsTo Employee
- **Project** — belongsTo Organization, has many ProjectMembers, has many Tasks, has many Timelogs
- **ProjectMember** — belongsTo Project, belongsTo Employee
- **Task** — belongsTo Project, assigned to Employee (optional), belongsTo parent Task (self-reference, one level), has many TaskHistories, has many Timelogs
- **TaskHistory** — belongsTo Task, belongsTo User (who made change)
- **Timelog** — belongsTo Employee, belongsTo Project, belongsTo Task (optional), included in Timesheet
- **Timesheet** — belongsTo Employee (owner), belongsTo User (reviewer, optional), has many Timelogs
- **Timer** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **ActivityLog** — belongsTo User (who performed action), belongsTo Organization

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