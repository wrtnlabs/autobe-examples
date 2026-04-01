### Table of Contents

**erpHrmTime** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, UserAccount, OrganizationMembership, Role, Employee, EmployeeContract, Department, Project, ProjectMembership, Task, TaskHistoryEntry, Timelog, Timesheet, Timer, ActivityLogEntry

---

**Scope**

- **Organization** — has many users through organization membership, has many employees, has many projects, has many departments, has many roles, owns organization-scoped data and settings
- **UserAccount** — may belong to multiple organizations, has one shared profile across all organizations, may have pending invitations to organizations, may own organizations
- **OrganizationMembership** — links a user account to an organization, determines access scope within the selected organization
- **Role** — belongs to an organization, is assigned to exactly one employee per organization, may be a built-in role or a custom role
- **Employee** — belongs to a user account, belongs to an organization, has exactly one role in the organization, may have multiple contracts, may be assigned to projects, may have timelogs and timesheets
- **EmployeeContract** — belongs to an employee, forms a historical contract record, only one contract can be active at a time
- **Department** — belongs to an organization, may contain child departments one level deep, may be assigned to employees
- **Project** — belongs to an organization, has assigned employees, has tasks, can accumulate timelogs
- **ProjectMembership** — links an employee to a project, defines whether the employee is a member or project lead
- **Task** — belongs to a project, may be assigned to a project member, may have one level of subtasks, has task history entries
- **TaskHistoryEntry** — records a task status change, belongs to a task
- **Timelog** — belongs to an employee, belongs to a project, may belong to a task, may be included in a timesheet, may be created from a running timer
- **Timesheet** — belongs to an employee, contains timelogs for a specific week, may be submitted, approved, or rejected
- **Timer** — belongs to an employee, tracks a currently running work session, creates a timelog when stopped
- **ActivityLogEntry** — records significant actions within an organization, is associated with the user who performed the action

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
  - [7] [UserAccount Concept](./02-domain-model.md#useraccount-concept) — Describe what UserAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [OrganizationMembership Concept](./02-domain-model.md#organizationmembership-concept) — Describe what OrganizationMembership represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [EmployeeContract Concept](./02-domain-model.md#employeecontract-concept) — Describe what EmployeeContract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [ProjectMembership Concept](./02-domain-model.md#projectmembership-concept) — Describe what ProjectMembership represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [TaskHistoryEntry Concept](./02-domain-model.md#taskhistoryentry-concept) — Describe what TaskHistoryEntry represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [ActivityLogEntry Concept](./02-domain-model.md#activitylogentry-concept) — Describe what ActivityLogEntry represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [21] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [22] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [23] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [24] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [25] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [UserAccount Operations](./03-functional-requirements.md#useraccount-operations) — Define business operations for UserAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [OrganizationMembership Operations](./03-functional-requirements.md#organizationmembership-operations) — Define business operations for OrganizationMembership: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [EmployeeContract Operations](./03-functional-requirements.md#employeecontract-operations) — Define business operations for EmployeeContract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [ProjectMembership Operations](./03-functional-requirements.md#projectmembership-operations) — Define business operations for ProjectMembership: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [TaskHistoryEntry Operations](./03-functional-requirements.md#taskhistoryentry-operations) — Define business operations for TaskHistoryEntry: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [ActivityLogEntry Operations](./03-functional-requirements.md#activitylogentry-operations) — Define business operations for ActivityLogEntry: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [40] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [41] [UserAccount Error Scenarios](./03-functional-requirements.md#useraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserAccount operations.
  - [42] [OrganizationMembership Error Scenarios](./03-functional-requirements.md#organizationmembership-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrganizationMembership operations.
  - [43] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [44] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [45] [EmployeeContract Error Scenarios](./03-functional-requirements.md#employeecontract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all EmployeeContract operations.
  - [46] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [47] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [48] [ProjectMembership Error Scenarios](./03-functional-requirements.md#projectmembership-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMembership operations.
  - [49] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [50] [TaskHistoryEntry Error Scenarios](./03-functional-requirements.md#taskhistoryentry-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistoryEntry operations.
  - [51] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [52] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [53] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [54] [ActivityLogEntry Error Scenarios](./03-functional-requirements.md#activitylogentry-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLogEntry operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [55] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [56] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [57] [UserAccount Rules](./04-business-rules.md#useraccount-rules) — Define validation rules and domain constraints for UserAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [58] [OrganizationMembership Rules](./04-business-rules.md#organizationmembership-rules) — Define validation rules and domain constraints for OrganizationMembership. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [59] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [60] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [61] [EmployeeContract Rules](./04-business-rules.md#employeecontract-rules) — Define validation rules and domain constraints for EmployeeContract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [62] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [63] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [64] [ProjectMembership Rules](./04-business-rules.md#projectmembership-rules) — Define validation rules and domain constraints for ProjectMembership. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [65] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [66] [TaskHistoryEntry Rules](./04-business-rules.md#taskhistoryentry-rules) — Define validation rules and domain constraints for TaskHistoryEntry. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [67] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [68] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [69] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [70] [ActivityLogEntry Rules](./04-business-rules.md#activitylogentry-rules) — Define validation rules and domain constraints for ActivityLogEntry. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [71] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [72] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [73] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [74] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **Organization** — has many users through organization membership, has many employees, has many projects, has many departments, has many roles, owns organization-scoped data and settings
- **UserAccount** — may belong to multiple organizations, has one shared profile across all organizations, may have pending invitations to organizations, may own organizations
- **OrganizationMembership** — links a user account to an organization, determines access scope within the selected organization
- **Role** — belongs to an organization, is assigned to exactly one employee per organization, may be a built-in role or a custom role
- **Employee** — belongs to a user account, belongs to an organization, has exactly one role in the organization, may have multiple contracts, may be assigned to projects, may have timelogs and timesheets
- **EmployeeContract** — belongs to an employee, forms a historical contract record, only one contract can be active at a time
- **Department** — belongs to an organization, may contain child departments one level deep, may be assigned to employees
- **Project** — belongs to an organization, has assigned employees, has tasks, can accumulate timelogs
- **ProjectMembership** — links an employee to a project, defines whether the employee is a member or project lead
- **Task** — belongs to a project, may be assigned to a project member, may have one level of subtasks, has task history entries
- **TaskHistoryEntry** — records a task status change, belongs to a task
- **Timelog** — belongs to an employee, belongs to a project, may belong to a task, may be included in a timesheet, may be created from a running timer
- **Timesheet** — belongs to an employee, contains timelogs for a specific week, may be submitted, approved, or rejected
- **Timer** — belongs to an employee, tracks a currently running work session, creates a timelog when stopped
- **ActivityLogEntry** — records significant actions within an organization, is associated with the user who performed the action

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