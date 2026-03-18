### Table of Contents

**erpHrm** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: Organization, User, UserProfile, OrganizationMember, Role, Invitation, Department, EmployeeContract, Project, ProjectMember, Task, TaskHistory, Timelog, Timesheet, Timer, ActivityLog

---

**Scope**

- **Organization** — has many OrganizationMembers, has many Departments, has many Projects, has many Roles, has many ActivityLogs
- **User** — has one UserProfile, has many OrganizationMembers (one per organization), has many Invitations (by email)
- **UserProfile** — belongs to User, shared across all organizations the user belongs to
- **OrganizationMember** — belongs to Organization, belongs to User, assigned to exactly one Role, has many EmployeeContracts, has many ProjectMembers, has many Timelogs, has many Timesheets, has one Timer (active)
- **Role** — belongs to Organization, assigned to many OrganizationMembers
- **Invitation** — belongs to Organization, invited by OrganizationMember, linked to User upon acceptance
- **Department** — belongs to Organization, optionally has one parent Department, has many OrganizationMembers
- **EmployeeContract** — belongs to OrganizationMember, only one contract can be active at a time
- **Project** — belongs to Organization, has many ProjectMembers, has many Tasks, has many Timelogs
- **ProjectMember** — belongs to Project, belongs to OrganizationMember
- **Task** — belongs to Project, optionally assigned to OrganizationMember (must be project member), optionally has one parent Task (subtask, one level only), has many TaskHistories
- **TaskHistory** — belongs to Task, recorded by OrganizationMember
- **Timelog** — belongs to OrganizationMember (owner), belongs to Project, optionally belongs to Task, optionally belongs to Timesheet
- **Timesheet** — belongs to OrganizationMember (owner), reviewed by OrganizationMember, has many Timelogs
- **Timer** — belongs to OrganizationMember (at most one active per employee), belongs to Project, optionally belongs to Task
- **ActivityLog** — belongs to Organization, performed by OrganizationMember

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
  - [8] [UserProfile Concept](./02-domain-model.md#userprofile-concept) — Describe what UserProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [OrganizationMember Concept](./02-domain-model.md#organizationmember-concept) — Describe what OrganizationMember represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Invitation Concept](./02-domain-model.md#invitation-concept) — Describe what Invitation represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [EmployeeContract Concept](./02-domain-model.md#employeecontract-concept) — Describe what EmployeeContract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [ProjectMember Concept](./02-domain-model.md#projectmember-concept) — Describe what ProjectMember represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [TaskHistory Concept](./02-domain-model.md#taskhistory-concept) — Describe what TaskHistory represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [22] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [23] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [24] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [25] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [26] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [UserProfile Operations](./03-functional-requirements.md#userprofile-operations) — Define business operations for UserProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [OrganizationMember Operations](./03-functional-requirements.md#organizationmember-operations) — Define business operations for OrganizationMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Invitation Operations](./03-functional-requirements.md#invitation-operations) — Define business operations for Invitation: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [EmployeeContract Operations](./03-functional-requirements.md#employeecontract-operations) — Define business operations for EmployeeContract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [ProjectMember Operations](./03-functional-requirements.md#projectmember-operations) — Define business operations for ProjectMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [TaskHistory Operations](./03-functional-requirements.md#taskhistory-operations) — Define business operations for TaskHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [42] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [43] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [44] [UserProfile Error Scenarios](./03-functional-requirements.md#userprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserProfile operations.
  - [45] [OrganizationMember Error Scenarios](./03-functional-requirements.md#organizationmember-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrganizationMember operations.
  - [46] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [47] [Invitation Error Scenarios](./03-functional-requirements.md#invitation-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Invitation operations.
  - [48] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [49] [EmployeeContract Error Scenarios](./03-functional-requirements.md#employeecontract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all EmployeeContract operations.
  - [50] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [51] [ProjectMember Error Scenarios](./03-functional-requirements.md#projectmember-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMember operations.
  - [52] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [53] [TaskHistory Error Scenarios](./03-functional-requirements.md#taskhistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistory operations.
  - [54] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [55] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [56] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [57] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [58] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [Real-time Events](./03-functional-requirements.md#real-time-events)
  - [59] [Organization Events](./03-functional-requirements.md#organization-events) — Define real-time events for Organization changes, including event payload and subscription rules.
  - [60] [User Events](./03-functional-requirements.md#user-events) — Define real-time events for User changes, including event payload and subscription rules.
  - [61] [UserProfile Events](./03-functional-requirements.md#userprofile-events) — Define real-time events for UserProfile changes, including event payload and subscription rules.
  - [62] [OrganizationMember Events](./03-functional-requirements.md#organizationmember-events) — Define real-time events for OrganizationMember changes, including event payload and subscription rules.
  - [63] [Role Events](./03-functional-requirements.md#role-events) — Define real-time events for Role changes, including event payload and subscription rules.
  - [64] [Invitation Events](./03-functional-requirements.md#invitation-events) — Define real-time events for Invitation changes, including event payload and subscription rules.
  - [65] [Department Events](./03-functional-requirements.md#department-events) — Define real-time events for Department changes, including event payload and subscription rules.
  - [66] [EmployeeContract Events](./03-functional-requirements.md#employeecontract-events) — Define real-time events for EmployeeContract changes, including event payload and subscription rules.
  - [67] [Project Events](./03-functional-requirements.md#project-events) — Define real-time events for Project changes, including event payload and subscription rules.
  - [68] [ProjectMember Events](./03-functional-requirements.md#projectmember-events) — Define real-time events for ProjectMember changes, including event payload and subscription rules.
  - [69] [Task Events](./03-functional-requirements.md#task-events) — Define real-time events for Task changes, including event payload and subscription rules.
  - [70] [TaskHistory Events](./03-functional-requirements.md#taskhistory-events) — Define real-time events for TaskHistory changes, including event payload and subscription rules.
  - [71] [Timelog Events](./03-functional-requirements.md#timelog-events) — Define real-time events for Timelog changes, including event payload and subscription rules.
  - [72] [Timesheet Events](./03-functional-requirements.md#timesheet-events) — Define real-time events for Timesheet changes, including event payload and subscription rules.
  - [73] [Timer Events](./03-functional-requirements.md#timer-events) — Define real-time events for Timer changes, including event payload and subscription rules.
  - [74] [ActivityLog Events](./03-functional-requirements.md#activitylog-events) — Define real-time events for ActivityLog changes, including event payload and subscription rules.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [75] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [76] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [77] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [78] [UserProfile Rules](./04-business-rules.md#userprofile-rules) — Define validation rules and domain constraints for UserProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [79] [OrganizationMember Rules](./04-business-rules.md#organizationmember-rules) — Define validation rules and domain constraints for OrganizationMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [80] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [81] [Invitation Rules](./04-business-rules.md#invitation-rules) — Define validation rules and domain constraints for Invitation. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [82] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [83] [EmployeeContract Rules](./04-business-rules.md#employeecontract-rules) — Define validation rules and domain constraints for EmployeeContract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [84] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [85] [ProjectMember Rules](./04-business-rules.md#projectmember-rules) — Define validation rules and domain constraints for ProjectMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [86] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [87] [TaskHistory Rules](./04-business-rules.md#taskhistory-rules) — Define validation rules and domain constraints for TaskHistory. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [88] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [89] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [90] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [91] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [92] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [93] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [94] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [95] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [96] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Real-time Communication](./05-non-functional.md#real-time-communication)
  - [97] [WebSocket Security and Performance](./05-non-functional.md#websocket-security-and-performance) — Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [98] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **Organization** — has many OrganizationMembers, has many Departments, has many Projects, has many Roles, has many ActivityLogs
- **User** — has one UserProfile, has many OrganizationMembers (one per organization), has many Invitations (by email)
- **UserProfile** — belongs to User, shared across all organizations the user belongs to
- **OrganizationMember** — belongs to Organization, belongs to User, assigned to exactly one Role, has many EmployeeContracts, has many ProjectMembers, has many Timelogs, has many Timesheets, has one Timer (active)
- **Role** — belongs to Organization, assigned to many OrganizationMembers
- **Invitation** — belongs to Organization, invited by OrganizationMember, linked to User upon acceptance
- **Department** — belongs to Organization, optionally has one parent Department, has many OrganizationMembers
- **EmployeeContract** — belongs to OrganizationMember, only one contract can be active at a time
- **Project** — belongs to Organization, has many ProjectMembers, has many Tasks, has many Timelogs
- **ProjectMember** — belongs to Project, belongs to OrganizationMember
- **Task** — belongs to Project, optionally assigned to OrganizationMember (must be project member), optionally has one parent Task (subtask, one level only), has many TaskHistories
- **TaskHistory** — belongs to Task, recorded by OrganizationMember
- **Timelog** — belongs to OrganizationMember (owner), belongs to Project, optionally belongs to Task, optionally belongs to Timesheet
- **Timesheet** — belongs to OrganizationMember (owner), reviewed by OrganizationMember, has many Timelogs
- **Timer** — belongs to OrganizationMember (at most one active per employee), belongs to Project, optionally belongs to Task
- **ActivityLog** — belongs to Organization, performed by OrganizationMember

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
- file-storage