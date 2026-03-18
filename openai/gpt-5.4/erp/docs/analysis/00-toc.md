### Table of Contents

**hrmTimeTracking** is a backend service with the following actors and domain entities.

**Actors**: owner, manager, employee
**Entities**: UserAccount, UserProfile, Organization, OrganizationInvitation, Role, Employee, EmployeeContract, Department, Project, ProjectMembership, Task, TaskHistory, Timelog, Timesheet, Timer, Report, ActivityLog, Dashboard

---

**Scope**

- **UserAccount** — belongs to many Organizations, has one shared UserProfile, may own Organizations, is linked to many Employee records, may receive many OrganizationInvitations, may review Timesheets, may create ActivityLog entries
- **UserProfile** — belongs to one UserAccount, is shared across all Organizations for that user
- **Organization** — has many Employee records, has many Roles, has many Departments, has many Projects, has many Timelogs, has many Timesheets, has many ActivityLog entries, has one or more Owners through Employee role assignment
- **OrganizationInvitation** — belongs to one Organization, may be resolved into one UserAccount membership
- **Role** — belongs to one Organization, is assigned to many Employees
- **Employee** — belongs to one Organization, references one UserAccount, has exactly one Role, may belong to one Department, has many EmployeeContracts, has many ProjectMemberships, has many Timelogs, has many Timesheets, may have one active Timer
- **EmployeeContract** — belongs to one Employee
- **Department** — belongs to one Organization, may have one parent Department, has many Employees
- **Project** — belongs to one Organization, has many ProjectMemberships, has many Tasks, has many Timelogs
- **ProjectMembership** — belongs to one Project, belongs to one Employee
- **Task** — belongs to one Project, may be assigned to one Employee, may have one parent Task, has many child Tasks within one level, has many TaskHistory entries, may have many Timelogs
- **TaskHistory** — belongs to one Task, records the UserAccount who changed the status
- **Timelog** — belongs to one Organization, belongs to one Employee, belongs to one Project, may belong to one Task, may be included in one Timesheet
- **Timesheet** — belongs to one Organization, belongs to one Employee, includes many Timelogs, may be reviewed by one UserAccount
- **Timer** — belongs to one Employee, belongs to one Project, may belong to one Task
- **Report** — belongs to one Organization, uses data from Employees Projects Tasks Timelogs and Timesheets
- **ActivityLog** — belongs to one Organization, records one UserAccount as actor
- **Dashboard** — belongs to one Organization context, aggregates data from Timelogs Timesheets Tasks Projects and Employees

- **owner** (admin)
- **manager** (member)
- **employee** (member)

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
  - [1] [owner Actor](./01-actors-and-auth.md#owner-actor) — Define the owner actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [2] [manager Actor](./01-actors-and-auth.md#manager-actor) — Define the manager actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
  - [3] [employee Actor](./01-actors-and-auth.md#employee-actor) — Define the employee actor's identity, permissions, and access boundaries. Do NOT describe specific operations (03), data isolation policies (05), or domain concepts (02).
- [Authentication Flows](./01-actors-and-auth.md#authentication-flows)
  - [4] [Registration and Login](./01-actors-and-auth.md#registration-and-login) — Define user registration and login flows including validation and error handling.
  - [5] [Session and Logout](./01-actors-and-auth.md#session-and-logout) — Define session behavior and logout from a user perspective.
- [Account Lifecycle](./01-actors-and-auth.md#account-lifecycle)
  - [6] [Account Management](./01-actors-and-auth.md#account-management) — Define how users create accounts, delete accounts, and change passwords.

**[02-domain-model.md](./02-domain-model.md)**
- [Domain Concepts](./02-domain-model.md#domain-concepts)
  - [7] [UserAccount Concept](./02-domain-model.md#useraccount-concept) — Describe what UserAccount represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [UserProfile Concept](./02-domain-model.md#userprofile-concept) — Describe what UserProfile represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [OrganizationInvitation Concept](./02-domain-model.md#organizationinvitation-concept) — Describe what OrganizationInvitation represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [EmployeeContract Concept](./02-domain-model.md#employeecontract-concept) — Describe what EmployeeContract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [ProjectMembership Concept](./02-domain-model.md#projectmembership-concept) — Describe what ProjectMembership represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [TaskHistory Concept](./02-domain-model.md#taskhistory-concept) — Describe what TaskHistory represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [21] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [22] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [23] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [24] [Dashboard Concept](./02-domain-model.md#dashboard-concept) — Describe what Dashboard represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [25] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [26] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [27] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [28] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [29] [UserAccount Operations](./03-functional-requirements.md#useraccount-operations) — Define business operations for UserAccount: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [UserProfile Operations](./03-functional-requirements.md#userprofile-operations) — Define business operations for UserProfile: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [OrganizationInvitation Operations](./03-functional-requirements.md#organizationinvitation-operations) — Define business operations for OrganizationInvitation: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [EmployeeContract Operations](./03-functional-requirements.md#employeecontract-operations) — Define business operations for EmployeeContract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [ProjectMembership Operations](./03-functional-requirements.md#projectmembership-operations) — Define business operations for ProjectMembership: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [TaskHistory Operations](./03-functional-requirements.md#taskhistory-operations) — Define business operations for TaskHistory: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [41] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [42] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [43] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [44] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [45] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [46] [Dashboard Operations](./03-functional-requirements.md#dashboard-operations) — Define business operations for Dashboard: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [47] [UserAccount Error Scenarios](./03-functional-requirements.md#useraccount-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserAccount operations.
  - [48] [UserProfile Error Scenarios](./03-functional-requirements.md#userprofile-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all UserProfile operations.
  - [49] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Organization operations.
  - [50] [OrganizationInvitation Error Scenarios](./03-functional-requirements.md#organizationinvitation-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all OrganizationInvitation operations.
  - [51] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Role operations.
  - [52] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Employee operations.
  - [53] [EmployeeContract Error Scenarios](./03-functional-requirements.md#employeecontract-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all EmployeeContract operations.
  - [54] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Department operations.
  - [55] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Project operations.
  - [56] [ProjectMembership Error Scenarios](./03-functional-requirements.md#projectmembership-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ProjectMembership operations.
  - [57] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Task operations.
  - [58] [TaskHistory Error Scenarios](./03-functional-requirements.md#taskhistory-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all TaskHistory operations.
  - [59] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timelog operations.
  - [60] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timesheet operations.
  - [61] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Timer operations.
  - [62] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Report operations.
  - [63] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all ActivityLog operations.
  - [64] [Dashboard Error Scenarios](./03-functional-requirements.md#dashboard-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all Dashboard operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios)
  - [65] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [Real-time Events](./03-functional-requirements.md#real-time-events)
  - [66] [UserAccount Events](./03-functional-requirements.md#useraccount-events) — Define real-time events for UserAccount changes, including event payload and subscription rules.
  - [67] [UserProfile Events](./03-functional-requirements.md#userprofile-events) — Define real-time events for UserProfile changes, including event payload and subscription rules.
  - [68] [Organization Events](./03-functional-requirements.md#organization-events) — Define real-time events for Organization changes, including event payload and subscription rules.
  - [69] [OrganizationInvitation Events](./03-functional-requirements.md#organizationinvitation-events) — Define real-time events for OrganizationInvitation changes, including event payload and subscription rules.
  - [70] [Role Events](./03-functional-requirements.md#role-events) — Define real-time events for Role changes, including event payload and subscription rules.
  - [71] [Employee Events](./03-functional-requirements.md#employee-events) — Define real-time events for Employee changes, including event payload and subscription rules.
  - [72] [EmployeeContract Events](./03-functional-requirements.md#employeecontract-events) — Define real-time events for EmployeeContract changes, including event payload and subscription rules.
  - [73] [Department Events](./03-functional-requirements.md#department-events) — Define real-time events for Department changes, including event payload and subscription rules.
  - [74] [Project Events](./03-functional-requirements.md#project-events) — Define real-time events for Project changes, including event payload and subscription rules.
  - [75] [ProjectMembership Events](./03-functional-requirements.md#projectmembership-events) — Define real-time events for ProjectMembership changes, including event payload and subscription rules.
  - [76] [Task Events](./03-functional-requirements.md#task-events) — Define real-time events for Task changes, including event payload and subscription rules.
  - [77] [TaskHistory Events](./03-functional-requirements.md#taskhistory-events) — Define real-time events for TaskHistory changes, including event payload and subscription rules.
  - [78] [Timelog Events](./03-functional-requirements.md#timelog-events) — Define real-time events for Timelog changes, including event payload and subscription rules.
  - [79] [Timesheet Events](./03-functional-requirements.md#timesheet-events) — Define real-time events for Timesheet changes, including event payload and subscription rules.
  - [80] [Timer Events](./03-functional-requirements.md#timer-events) — Define real-time events for Timer changes, including event payload and subscription rules.
  - [81] [Report Events](./03-functional-requirements.md#report-events) — Define real-time events for Report changes, including event payload and subscription rules.
  - [82] [ActivityLog Events](./03-functional-requirements.md#activitylog-events) — Define real-time events for ActivityLog changes, including event payload and subscription rules.
  - [83] [Dashboard Events](./03-functional-requirements.md#dashboard-events) — Define real-time events for Dashboard changes, including event payload and subscription rules.
- [External Integrations](./03-functional-requirements.md#external-integrations)
  - [84] [Integration Contracts](./03-functional-requirements.md#integration-contracts) — Define external API dependencies, authentication methods, request/response formats, and error handling for third-party integrations.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [85] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [86] [UserAccount Rules](./04-business-rules.md#useraccount-rules) — Define validation rules and domain constraints for UserAccount. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [87] [UserProfile Rules](./04-business-rules.md#userprofile-rules) — Define validation rules and domain constraints for UserProfile. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [88] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [89] [OrganizationInvitation Rules](./04-business-rules.md#organizationinvitation-rules) — Define validation rules and domain constraints for OrganizationInvitation. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [90] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [91] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [92] [EmployeeContract Rules](./04-business-rules.md#employeecontract-rules) — Define validation rules and domain constraints for EmployeeContract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [93] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [94] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [95] [ProjectMembership Rules](./04-business-rules.md#projectmembership-rules) — Define validation rules and domain constraints for ProjectMembership. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [96] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [97] [TaskHistory Rules](./04-business-rules.md#taskhistory-rules) — Define validation rules and domain constraints for TaskHistory. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [98] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [99] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [100] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [101] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [102] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [103] [Dashboard Rules](./04-business-rules.md#dashboard-rules) — Define validation rules and domain constraints for Dashboard. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [104] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [105] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [Integration Error Handling](./04-business-rules.md#integration-error-handling)
  - [106] [Integration Failure Policies](./04-business-rules.md#integration-failure-policies) — Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [107] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [108] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [109] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Real-time Communication](./05-non-functional.md#real-time-communication)
  - [110] [WebSocket Security and Performance](./05-non-functional.md#websocket-security-and-performance) — Define connection limits, heartbeat intervals, reconnection policies, and security requirements for real-time communication.
- [External Dependency SLOs](./05-non-functional.md#external-dependency-slos)
  - [111] [External Dependency SLOs](./05-non-functional.md#external-dependency-slos-1) — Define availability expectations, timeout thresholds, and degradation policies for external service dependencies.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [112] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **UserAccount** — belongs to many Organizations, has one shared UserProfile, may own Organizations, is linked to many Employee records, may receive many OrganizationInvitations, may review Timesheets, may create ActivityLog entries
- **UserProfile** — belongs to one UserAccount, is shared across all Organizations for that user
- **Organization** — has many Employee records, has many Roles, has many Departments, has many Projects, has many Timelogs, has many Timesheets, has many ActivityLog entries, has one or more Owners through Employee role assignment
- **OrganizationInvitation** — belongs to one Organization, may be resolved into one UserAccount membership
- **Role** — belongs to one Organization, is assigned to many Employees
- **Employee** — belongs to one Organization, references one UserAccount, has exactly one Role, may belong to one Department, has many EmployeeContracts, has many ProjectMemberships, has many Timelogs, has many Timesheets, may have one active Timer
- **EmployeeContract** — belongs to one Employee
- **Department** — belongs to one Organization, may have one parent Department, has many Employees
- **Project** — belongs to one Organization, has many ProjectMemberships, has many Tasks, has many Timelogs
- **ProjectMembership** — belongs to one Project, belongs to one Employee
- **Task** — belongs to one Project, may be assigned to one Employee, may have one parent Task, has many child Tasks within one level, has many TaskHistory entries, may have many Timelogs
- **TaskHistory** — belongs to one Task, records the UserAccount who changed the status
- **Timelog** — belongs to one Organization, belongs to one Employee, belongs to one Project, may belong to one Task, may be included in one Timesheet
- **Timesheet** — belongs to one Organization, belongs to one Employee, includes many Timelogs, may be reviewed by one UserAccount
- **Timer** — belongs to one Employee, belongs to one Project, may belong to one Task
- **Report** — belongs to one Organization, uses data from Employees Projects Tasks Timelogs and Timesheets
- **ActivityLog** — belongs to one Organization, records one UserAccount as actor
- **Dashboard** — belongs to one Organization context, aggregates data from Timelogs Timesheets Tasks Projects and Employees

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
- external-integration
- file-storage