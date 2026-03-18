### Table of Contents

**hrmTimeTracking** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, UserAccount, UserProfile, Role, Permission, Employee, Invitation, Department, Contract, Project, ProjectMembership, Task, TaskHistory, Timelog, Timesheet, TimerSession, ActivityRecord

---

**Scope**

- **Organization** — has many members and employees, owns departments, projects, tasks, timelogs, timesheets, roles, contracts, and activity records within its own context, has one or more owners among its members, is deleted only when pending timesheets are resolved and no active employee contracts remain, deletion permanently removes organization-scoped operational data while the owner's user account remains
- **UserAccount** — can belong to multiple organizations, selects one organization context at a time for scoped actions, has a shared profile across all organizations, may remain after an organization is deleted, may be deactivated from employee records in other organizations when the account is deleted
- **UserProfile** — belongs to one user account, is shared across every organization the user belongs to, can be edited independently of organization-specific data
- **Role** — belongs to one organization, is assigned to exactly one employee in that organization at a time, may be one of the built-in organization roles or a custom role created by owners, cannot be deleted when built-in or when still assigned to employees
- **Permission** — is bundled into roles, controls access to organization settings, employee management, project management, time tracking, approvals, reporting, and visibility features
- **Employee** — belongs to one organization, is linked to one user account, is assigned exactly one role in that organization, may belong to one department, may be assigned to multiple projects, may have multiple contracts over time, owns personal timelogs and timesheets within the organization, is deactivated or reactivated within the organization context
- **Invitation** — is created for an organization when inviting a person by email, becomes an employee automatically when the invited email later signs up, supports deferred membership when no user account exists yet
- **Department** — belongs to one organization, may have one parent department for one-level nesting, may have employees assigned to it, when deleted, employees referencing it are cleared to no department
- **Contract** — belongs to one employee, only one contract may be active per employee at a time, a new contract ends the previous active contract automatically, historical contracts remain immutable after they are no longer active
- **Project** — belongs to one organization, can have multiple assigned employees, can contain tasks, can collect timelogs, may be archived or completed, cannot be deleted if it has associated timelogs
- **ProjectMembership** — connects one employee to one project, allows an employee to participate in multiple projects, identifies project-lead members who can manage tasks in that project
- **Task** — belongs to one project, may have one parent task for one-level subtasks, may be assigned to one project member, can be managed by project leads or users with project management permission, is referenced by timelogs and task history
- **TaskHistory** — records task status changes, belongs to one task, captures the user who made the change
- **Timelog** — belongs to one employee, belongs to one project, may optionally reference one task in that project, may be included in one timesheet, can be locked by approved timesheets, may be created from a running timer
- **Timesheet** — belongs to one employee, contains multiple timelogs for one week, is submitted for approval, may be approved or rejected by users with approval permission, locks included timelogs when approved, returns to draft when rejected
- **TimerSession** — belongs to one employee, tracks one active timer at a time per employee, creates a timelog when stopped, may be discarded without creating a timelog, can be edited while running
- **ActivityRecord** — belongs to one organization, records significant business actions such as employee changes, contracts, projects, tasks, timesheets, and role assignments, is visible to users with organization management permission

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
  - [8] [UserProfile Concept](./02-domain-model.md#userprofile-concept) — Describe what UserProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Permission Concept](./02-domain-model.md#permission-concept) — Describe what Permission represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Invitation Concept](./02-domain-model.md#invitation-concept) — Describe what Invitation represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Contract Concept](./02-domain-model.md#contract-concept) — Describe what Contract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [ProjectMembership Concept](./02-domain-model.md#projectmembership-concept) — Describe what ProjectMembership represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [TaskHistory Concept](./02-domain-model.md#taskhistory-concept) — Describe what TaskHistory represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [TimerSession Concept](./02-domain-model.md#timersession-concept) — Describe what TimerSession represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [ActivityRecord Concept](./02-domain-model.md#activityrecord-concept) — Describe what ActivityRecord represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [23] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [24] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [25] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [26] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [27] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [UserAccount Operations](./03-functional-requirements.md#useraccount-operations) — Define business operations for UserAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [UserProfile Operations](./03-functional-requirements.md#userprofile-operations) — Define business operations for UserProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Permission Operations](./03-functional-requirements.md#permission-operations) — Define business operations for Permission: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Invitation Operations](./03-functional-requirements.md#invitation-operations) — Define business operations for Invitation: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Contract Operations](./03-functional-requirements.md#contract-operations) — Define business operations for Contract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [ProjectMembership Operations](./03-functional-requirements.md#projectmembership-operations) — Define business operations for ProjectMembership: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [TaskHistory Operations](./03-functional-requirements.md#taskhistory-operations) — Define business operations for TaskHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [TimerSession Operations](./03-functional-requirements.md#timersession-operations) — Define business operations for TimerSession: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [ActivityRecord Operations](./03-functional-requirements.md#activityrecord-operations) — Define business operations for ActivityRecord: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [44] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [45] [UserAccount Error Scenarios](./03-functional-requirements.md#useraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserAccount operations.
  - [46] [UserProfile Error Scenarios](./03-functional-requirements.md#userprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserProfile operations.
  - [47] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [48] [Permission Error Scenarios](./03-functional-requirements.md#permission-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Permission operations.
  - [49] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [50] [Invitation Error Scenarios](./03-functional-requirements.md#invitation-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Invitation operations.
  - [51] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [52] [Contract Error Scenarios](./03-functional-requirements.md#contract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Contract operations.
  - [53] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [54] [ProjectMembership Error Scenarios](./03-functional-requirements.md#projectmembership-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMembership operations.
  - [55] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [56] [TaskHistory Error Scenarios](./03-functional-requirements.md#taskhistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistory operations.
  - [57] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [58] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [59] [TimerSession Error Scenarios](./03-functional-requirements.md#timersession-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TimerSession operations.
  - [60] [ActivityRecord Error Scenarios](./03-functional-requirements.md#activityrecord-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityRecord operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [61] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [62] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [63] [UserAccount Rules](./04-business-rules.md#useraccount-rules) — Define validation rules and domain constraints for UserAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [64] [UserProfile Rules](./04-business-rules.md#userprofile-rules) — Define validation rules and domain constraints for UserProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [65] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [66] [Permission Rules](./04-business-rules.md#permission-rules) — Define validation rules and domain constraints for Permission. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [67] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [68] [Invitation Rules](./04-business-rules.md#invitation-rules) — Define validation rules and domain constraints for Invitation. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [69] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [70] [Contract Rules](./04-business-rules.md#contract-rules) — Define validation rules and domain constraints for Contract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [71] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [72] [ProjectMembership Rules](./04-business-rules.md#projectmembership-rules) — Define validation rules and domain constraints for ProjectMembership. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [73] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [74] [TaskHistory Rules](./04-business-rules.md#taskhistory-rules) — Define validation rules and domain constraints for TaskHistory. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [75] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [76] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [77] [TimerSession Rules](./04-business-rules.md#timersession-rules) — Define validation rules and domain constraints for TimerSession. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [78] [ActivityRecord Rules](./04-business-rules.md#activityrecord-rules) — Define validation rules and domain constraints for ActivityRecord. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [79] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [80] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [81] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [82] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.

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

- **Organization** — has many members and employees, owns departments, projects, tasks, timelogs, timesheets, roles, contracts, and activity records within its own context, has one or more owners among its members, is deleted only when pending timesheets are resolved and no active employee contracts remain, deletion permanently removes organization-scoped operational data while the owner's user account remains
- **UserAccount** — can belong to multiple organizations, selects one organization context at a time for scoped actions, has a shared profile across all organizations, may remain after an organization is deleted, may be deactivated from employee records in other organizations when the account is deleted
- **UserProfile** — belongs to one user account, is shared across every organization the user belongs to, can be edited independently of organization-specific data
- **Role** — belongs to one organization, is assigned to exactly one employee in that organization at a time, may be one of the built-in organization roles or a custom role created by owners, cannot be deleted when built-in or when still assigned to employees
- **Permission** — is bundled into roles, controls access to organization settings, employee management, project management, time tracking, approvals, reporting, and visibility features
- **Employee** — belongs to one organization, is linked to one user account, is assigned exactly one role in that organization, may belong to one department, may be assigned to multiple projects, may have multiple contracts over time, owns personal timelogs and timesheets within the organization, is deactivated or reactivated within the organization context
- **Invitation** — is created for an organization when inviting a person by email, becomes an employee automatically when the invited email later signs up, supports deferred membership when no user account exists yet
- **Department** — belongs to one organization, may have one parent department for one-level nesting, may have employees assigned to it, when deleted, employees referencing it are cleared to no department
- **Contract** — belongs to one employee, only one contract may be active per employee at a time, a new contract ends the previous active contract automatically, historical contracts remain immutable after they are no longer active
- **Project** — belongs to one organization, can have multiple assigned employees, can contain tasks, can collect timelogs, may be archived or completed, cannot be deleted if it has associated timelogs
- **ProjectMembership** — connects one employee to one project, allows an employee to participate in multiple projects, identifies project-lead members who can manage tasks in that project
- **Task** — belongs to one project, may have one parent task for one-level subtasks, may be assigned to one project member, can be managed by project leads or users with project management permission, is referenced by timelogs and task history
- **TaskHistory** — records task status changes, belongs to one task, captures the user who made the change
- **Timelog** — belongs to one employee, belongs to one project, may optionally reference one task in that project, may be included in one timesheet, can be locked by approved timesheets, may be created from a running timer
- **Timesheet** — belongs to one employee, contains multiple timelogs for one week, is submitted for approval, may be approved or rejected by users with approval permission, locks included timelogs when approved, returns to draft when rejected
- **TimerSession** — belongs to one employee, tracks one active timer at a time per employee, creates a timelog when stopped, may be discarded without creating a timelog, can be edited while running
- **ActivityRecord** — belongs to one organization, records significant business actions such as employee changes, contracts, projects, tasks, timesheets, and role assignments, is visible to users with organization management permission

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