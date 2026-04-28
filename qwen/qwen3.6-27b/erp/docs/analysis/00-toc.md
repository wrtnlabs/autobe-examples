### Table of Contents

**hrmPlatform** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, User, Employee, Department, Role, Contract, Project, ProjectMembership, Task, Timelog, Timesheet, Timer, ActivityLog

---

**Scope**

- **Organization** — has many Users, contains Departments, contains Projects, contains Roles, contains Employees, generates ActivityLogs
- **User** — belongs to one or many Organizations, has zero or many Employee records across organizations
- **Employee** — belongs to exactly one Organization for this record, has zero or many Contracts, has zero or many Timelogs, has zero or many Timesheets, has zero or many ProjectMemberships
- **Department** — belongs to exactly one Organization, has zero or many Employees
- **Role** — belongs to exactly one Organization, assigned to zero or many Employees
- **Contract** — belongs to exactly one Employee, part of an Organization via the Employee
- **Project** — belongs to exactly one Organization, has zero or many ProjectMemberships, has zero or many Tasks, has zero or many Timelogs
- **ProjectMembership** — connects exactly one Employee to exactly one Project, part of an Organization
- **Task** — belongs to exactly one Project, optionally assigned to exactly one Employee, has zero or many Timelogs, optionally has one parent Task for nesting
- **Timelog** — belongs to exactly one Employee, belongs to exactly one Project, optionally belongs to one Task, included in exactly one Timesheet when submitted
- **Timesheet** — belongs to exactly one Employee, includes zero or many Timelogs, part of an Organization via the Employee
- **Timer** — belongs to exactly one Employee, tracks time for exactly one Project, optionally tracks time for one Task, part of an Organization via the Employee
- **ActivityLog** — belongs to exactly one Organization, records events related to Employees, Projects, Timesheets, Roles, and Contracts

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
  - [6] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [7] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Contract Concept](./02-domain-model.md#contract-concept) — Describe what Contract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [ProjectMembership Concept](./02-domain-model.md#projectmembership-concept) — Describe what ProjectMembership represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
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
  - [23] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [24] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [25] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [26] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [27] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [28] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [29] [Contract Error Scenarios](./03-functional-requirements.md#contract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Contract operations.
  - [30] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [31] [ProjectMembership Error Scenarios](./03-functional-requirements.md#projectmembership-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMembership operations.
  - [32] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [33] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [34] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [35] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [36] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [37] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [38] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization.
  - [39] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User.
  - [40] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee.
  - [41] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department.
  - [42] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role.
  - [43] [Contract Rules](./04-business-rules.md#contract-rules) — Define validation rules and domain constraints for Contract.
  - [44] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project.
  - [45] [ProjectMembership Rules](./04-business-rules.md#projectmembership-rules) — Define validation rules and domain constraints for ProjectMembership.
  - [46] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task.
  - [47] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog.
  - [48] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer.
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [49] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [50] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [51] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [52] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **Organization** — has many Users, contains Departments, contains Projects, contains Roles, contains Employees, generates ActivityLogs
- **User** — belongs to one or many Organizations, has zero or many Employee records across organizations
- **Employee** — belongs to exactly one Organization for this record, has zero or many Contracts, has zero or many Timelogs, has zero or many Timesheets, has zero or many ProjectMemberships
- **Department** — belongs to exactly one Organization, has zero or many Employees
- **Role** — belongs to exactly one Organization, assigned to zero or many Employees
- **Contract** — belongs to exactly one Employee, part of an Organization via the Employee
- **Project** — belongs to exactly one Organization, has zero or many ProjectMemberships, has zero or many Tasks, has zero or many Timelogs
- **ProjectMembership** — connects exactly one Employee to exactly one Project, part of an Organization
- **Task** — belongs to exactly one Project, optionally assigned to exactly one Employee, has zero or many Timelogs, optionally has one parent Task for nesting
- **Timelog** — belongs to exactly one Employee, belongs to exactly one Project, optionally belongs to one Task, included in exactly one Timesheet when submitted
- **Timesheet** — belongs to exactly one Employee, includes zero or many Timelogs, part of an Organization via the Employee
- **Timer** — belongs to exactly one Employee, tracks time for exactly one Project, optionally tracks time for one Task, part of an Organization via the Employee
- **ActivityLog** — belongs to exactly one Organization, records events related to Employees, Projects, Timesheets, Roles, and Contracts

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