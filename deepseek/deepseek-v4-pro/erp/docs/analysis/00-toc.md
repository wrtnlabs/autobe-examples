### Table of Contents

**erpHrm** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, User, Employee, Role, Contract, Department, Project, ProjectMember, Task, TaskHistory, Timelog, Timesheet, Timer, ActivityLog, Invitation

---

**Scope**

- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles
- **User** — belongs to many Organizations through Employee records
- **Employee** — references one User, belongs to one Organization, assigned to one Role, has many Contracts, assigned to many Projects through ProjectMember, owns many Timelogs, owns many Timesheets
- **Role** — belongs to one Organization, assigned to many Employees
- **Contract** — belongs to one Employee
- **Department** — belongs to one Organization, has optional parent Department, has many Employees
- **Project** — belongs to one Organization, has many Tasks, has many ProjectMembers, has many Timelogs
- **ProjectMember** — references one Employee, references one Project
- **Task** — belongs to one Project, optionally assigned to one Employee, has optional parent Task, has many TaskHistory entries, has many Timelogs
- **TaskHistory** — belongs to one Task, references the User who made the change
- **Timelog** — belongs to one Employee, belongs to one Project, optionally belongs to one Task, optionally belongs to one Timesheet
- **Timesheet** — belongs to one Employee, contains many Timelogs, reviewed by one User
- **Timer** — belongs to one Employee, references one Project, optionally references one Task
- **ActivityLog** — references the User who performed the action, belongs to one Organization
- **Invitation** — belongs to one Organization, resolved to one User upon signup

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
  - [10] [Contract Concept](./02-domain-model.md#contract-concept) — Describe what Contract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [ProjectMember Concept](./02-domain-model.md#projectmember-concept) — Describe what ProjectMember represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [TaskHistory Concept](./02-domain-model.md#taskhistory-concept) — Describe what TaskHistory represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Invitation Concept](./02-domain-model.md#invitation-concept) — Describe what Invitation represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [21] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [22] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [23] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [24] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [25] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Contract Operations](./03-functional-requirements.md#contract-operations) — Define business operations for Contract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [ProjectMember Operations](./03-functional-requirements.md#projectmember-operations) — Define business operations for ProjectMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [TaskHistory Operations](./03-functional-requirements.md#taskhistory-operations) — Define business operations for TaskHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Invitation Operations](./03-functional-requirements.md#invitation-operations) — Define business operations for Invitation: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [40] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [41] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [42] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [43] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [44] [Contract Error Scenarios](./03-functional-requirements.md#contract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Contract operations.
  - [45] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [46] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [47] [ProjectMember Error Scenarios](./03-functional-requirements.md#projectmember-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMember operations.
  - [48] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [49] [TaskHistory Error Scenarios](./03-functional-requirements.md#taskhistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistory operations.
  - [50] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [51] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [52] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [53] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
  - [54] [Invitation Error Scenarios](./03-functional-requirements.md#invitation-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Invitation operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [55] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [Real-time Events](./03-functional-requirements.md#real-time-events)
  - [56] [Organization Events](./03-functional-requirements.md#organization-events) — Define real-time events for Organization changes, including event payload and subscription rules.
  - [57] [User Events](./03-functional-requirements.md#user-events) — Define real-time events for User changes, including event payload and subscription rules.
  - [58] [Employee Events](./03-functional-requirements.md#employee-events) — Define real-time events for Employee changes, including event payload and subscription rules.
  - [59] [Role Events](./03-functional-requirements.md#role-events) — Define real-time events for Role changes, including event payload and subscription rules.
  - [60] [Contract Events](./03-functional-requirements.md#contract-events) — Define real-time events for Contract changes, including event payload and subscription rules.
  - [61] [Department Events](./03-functional-requirements.md#department-events) — Define real-time events for Department changes, including event payload and subscription rules.
  - [62] [Project Events](./03-functional-requirements.md#project-events) — Define real-time events for Project changes, including event payload and subscription rules.
  - [63] [ProjectMember Events](./03-functional-requirements.md#projectmember-events) — Define real-time events for ProjectMember changes, including event payload and subscription rules.
  - [64] [Task Events](./03-functional-requirements.md#task-events) — Define real-time events for Task changes, including event payload and subscription rules.
  - [65] [TaskHistory Events](./03-functional-requirements.md#taskhistory-events) — Define real-time events for TaskHistory changes, including event payload and subscription rules.
  - [66] [Timelog Events](./03-functional-requirements.md#timelog-events) — Define real-time events for Timelog changes, including event payload and subscription rules.
  - [67] [Timesheet Events](./03-functional-requirements.md#timesheet-events) — Define real-time events for Timesheet changes, including event payload and subscription rules.
  - [68] [Timer Events](./03-functional-requirements.md#timer-events) — Define real-time events for Timer changes, including event payload and subscription rules.
  - [69] [ActivityLog Events](./03-functional-requirements.md#activitylog-events) — Define real-time events for ActivityLog changes, including event payload and subscription rules.
  - [70] [Invitation Events](./03-functional-requirements.md#invitation-events) — Define real-time events for Invitation changes, including event payload and subscription rules.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [71] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [72] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [73] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [74] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [75] [Contract Rules](./04-business-rules.md#contract-rules) — Define validation rules and domain constraints for Contract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [76] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [77] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [78] [ProjectMember Rules](./04-business-rules.md#projectmember-rules) — Define validation rules and domain constraints for ProjectMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [79] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [80] [TaskHistory Rules](./04-business-rules.md#taskhistory-rules) — Define validation rules and domain constraints for TaskHistory. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [81] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [82] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [83] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [84] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [85] [Invitation Rules](./04-business-rules.md#invitation-rules) — Define validation rules and domain constraints for Invitation. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [86] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [87] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [88] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [89] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Real-time Communication](./05-non-functional.md#real-time-communication)
  - [90] [WebSocket Security and Performance](./05-non-functional.md#websocket-security-and-performance) — Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.

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

- **Organization** — has many Employees, has many Departments, has many Projects, has many Roles
- **User** — belongs to many Organizations through Employee records
- **Employee** — references one User, belongs to one Organization, assigned to one Role, has many Contracts, assigned to many Projects through ProjectMember, owns many Timelogs, owns many Timesheets
- **Role** — belongs to one Organization, assigned to many Employees
- **Contract** — belongs to one Employee
- **Department** — belongs to one Organization, has optional parent Department, has many Employees
- **Project** — belongs to one Organization, has many Tasks, has many ProjectMembers, has many Timelogs
- **ProjectMember** — references one Employee, references one Project
- **Task** — belongs to one Project, optionally assigned to one Employee, has optional parent Task, has many TaskHistory entries, has many Timelogs
- **TaskHistory** — belongs to one Task, references the User who made the change
- **Timelog** — belongs to one Employee, belongs to one Project, optionally belongs to one Task, optionally belongs to one Timesheet
- **Timesheet** — belongs to one Employee, contains many Timelogs, reviewed by one User
- **Timer** — belongs to one Employee, references one Project, optionally references one Task
- **ActivityLog** — references the User who performed the action, belongs to one Organization
- **Invitation** — belongs to one Organization, resolved to one User upon signup

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

- real-time