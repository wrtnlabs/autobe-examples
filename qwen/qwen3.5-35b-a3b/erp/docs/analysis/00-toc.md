### Table of Contents

**hrms** is a backend service with the following actors and domain entities.

**Actors**: guest, member
**Entities**: User, Organization, OrganizationMember, Role, Employee, EmployeeContract, Department, Project, ProjectMember, Task, Timelog, Timesheet, ActivityLog, Timer, Report

---

**Scope**

- **User** — hasMany OrganizationMembers, hasMany ActivityLogs (performed)
- **Organization** — belongsTo User (owner), hasMany OrganizationMembers, hasMany Employees, hasMany Departments, hasMany Projects, hasMany Roles, hasMany ActivityLogs, hasMany Reports
- **OrganizationMember** — belongsTo User, belongsTo Organization, belongsTo Role
- **Role** — belongsTo Organization, hasMany OrganizationMembers
- **Employee** — belongsTo OrganizationMember, belongsTo Department, hasMany EmployeeContracts, hasMany Timelogs, hasMany Timesheets
- **EmployeeContract** — belongsTo Employee
- **Department** — belongsTo Organization, hasMany Employees, hasMany Departments (parent)
- **Project** — belongsTo Organization, hasMany ProjectMembers, hasMany Tasks
- **ProjectMember** — belongsTo Employee, belongsTo Project
- **Task** — belongsTo Project, belongsTo Employee (assigned), belongsTo Task (parent)
- **Timelog** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **Timesheet** — belongsTo Employee, hasMany Timelogs
- **ActivityLog** — belongsTo Organization, belongsTo User (performed)
- **Timer** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **Report** — belongsTo Organization

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
  - [6] [User Concept](./02-domain-model.md#user-concept) — Describe what User represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [7] [Organization Concept](./02-domain-model.md#organization-concept) — Describe what Organization represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [8] [OrganizationMember Concept](./02-domain-model.md#organizationmember-concept) — Describe what OrganizationMember represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [9] [Role Concept](./02-domain-model.md#role-concept) — Describe what Role represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [10] [Employee Concept](./02-domain-model.md#employee-concept) — Describe what Employee represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [11] [EmployeeContract Concept](./02-domain-model.md#employeecontract-concept) — Describe what EmployeeContract represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [12] [Department Concept](./02-domain-model.md#department-concept) — Describe what Department represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [13] [Project Concept](./02-domain-model.md#project-concept) — Describe what Project represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [14] [ProjectMember Concept](./02-domain-model.md#projectmember-concept) — Describe what ProjectMember Concept represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [15] [Task Concept](./02-domain-model.md#task-concept) — Describe what Task represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [16] [Timelog Concept](./02-domain-model.md#timelog-concept) — Describe what Timelog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [17] [Timesheet Concept](./02-domain-model.md#timesheet-concept) — Describe what Timesheet represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [18] [ActivityLog Concept](./02-domain-model.md#activitylog-concept) — Describe what ActivityLog represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [19] [Timer Concept](./02-domain-model.md#timer-concept) — Describe what Timer Concept represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
  - [20] [Report Concept](./02-domain-model.md#report-concept) — Describe what Report represents in the business domain and its key attributes. Do NOT describe operations or workflows — those belong in 03-functional-requirements.
- [Domain Relationships](./02-domain-model.md#domain-relationships)
  - [21] [Conceptual Relationships](./02-domain-model.md#conceptual-relationships) — Describe how concepts relate to each other in business terms.
  - [22] [Lifecycle and Retention](./02-domain-model.md#lifecycle-and-retention) — Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.
- [Business Categories and State Flows](./02-domain-model.md#business-categories-and-state-flows)
  - [23] [Business Category Definitions](./02-domain-model.md#business-category-definitions) — Define all business category classifications with their allowed values and descriptions.
  - [24] [State Transitions](./02-domain-model.md#state-transitions) — Define valid state transition paths for stateful concepts.

**[03-functional-requirements.md](./03-functional-requirements.md)**
- [Core Business Operations](./03-functional-requirements.md#core-business-operations)
  - [25] [User Operations](./03-functional-requirements.md#user-operations) — Define business operations for User: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [26] [Organization Operations](./03-functional-requirements.md#organization-operations) — Define business operations for Organization: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [27] [OrganizationMember Operations](./03-functional-requirements.md#organizationmember-operations) — Define business operations for OrganizationMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [28] [Role Operations](./03-functional-requirements.md#role-operations) — Define business operations for Role: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [29] [Employee Operations](./03-functional-requirements.md#employee-operations) — Define business operations for Employee: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [30] [EmployeeContract Operations](./03-functional-requirements.md#employeecontract-operations) — Define business operations for EmployeeContract: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [31] [Department Operations](./03-functional-requirements.md#department-operations) — Define business operations for Department: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [32] [Project Operations](./03-functional-requirements.md#project-operations) — Define business operations for Project: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [33] [ProjectMember Operations](./03-functional-requirements.md#projectmember-operations) — Define business operations for ProjectMember: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [34] [Task Operations](./03-functional-requirements.md#task-operations) — Define business operations for Task: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [35] [Timelog Operations](./03-functional-requirements.md#timelog-operations) — Define business operations for Timelog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [36] [Timesheet Operations](./03-functional-requirements.md#timesheet-operations) — Define business operations for Timesheet: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [37] [ActivityLog Operations](./03-functional-requirements.md#activitylog-operations) — Define business operations for ActivityLog: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [38] [Timer Operations](./03-functional-requirements.md#timer-operations) — Define business operations for Timer: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [39] [Report Operations](./03-functional-requirements.md#report-operations) — Define business operations for Report: what create, read, update, delete, and list operations must accomplish from a business perspective.
  - [40] [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios) — Define business operations for End-to-End User Scenarios: what create, read, update, delete, and list operations must accomplish from a business perspective.
- [Error Scenarios and Edge Cases](./03-functional-requirements.md#error-scenarios-and-edge-cases)
  - [41] [User Error Scenarios](./03-functional-requirements.md#user-error-scenarios) — Define business error conditions, edge cases, and expected system behaviors for all User operations.
  - [42] [Organization Error Scenarios](./03-functional-requirements.md#organization-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Organization operations.
  - [43] [OrganizationMember Error Scenarios](./03-functional-requirements.md#organizationmember-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all OrganizationMember operations.
  - [44] [Role Error Scenarios](./03-functional-requirements.md#role-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Role operations.
  - [45] [Employee Error Scenarios](./03-functional-requirements.md#employee-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Employee operations.
  - [46] [EmployeeContract Error Scenarios](./03-functional-requirements.md#employeecontract-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all EmployeeContract operations.
  - [47] [Department Error Scenarios](./03-functional-requirements.md#department-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Department operations.
  - [48] [Project Error Scenarios](./03-functional-requirements.md#project-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Project operations.
  - [49] [ProjectMember Error Scenarios](./03-functional-requirements.md#projectmember-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all ProjectMember operations.
  - [50] [Task Error Scenarios](./03-functional-requirements.md#task-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Task operations.
  - [51] [Timelog Error Scenarios](./03-functional-requirements.md#timelog-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Timelog operations.
  - [52] [Timesheet Error Scenarios](./03-functional-requirements.md#timesheet-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Timesheet operations.
  - [53] [ActivityLog Error Scenarios](./03-functional-requirements.md#activitylog-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all ActivityLog operations.
  - [54] [Timer Error Scenarios](./03-functional-requirements.md#timer-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Timer operations.
  - [55] [Report Error Scenarios](./03-functional-requirements.md#report-error-scenarios) — Define business error conditions, edge cases, and boundary conditions for all Report operations.
- [End-to-End User Scenarios](./03-functional-requirements.md#end-to-end-user-scenarios-1)
  - [56] [Cross-Domain User Scenarios](./03-functional-requirements.md#cross-domain-user-scenarios) — Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.
- [File Storage](./03-functional-requirements.md#file-storage)
  - [57] [File Upload and Management](./03-functional-requirements.md#file-upload-and-management) — Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

**[04-business-rules.md](./04-business-rules.md)**
- [Domain Business Rules](./04-business-rules.md#domain-business-rules)
  - [58] [User Rules](./04-business-rules.md#user-rules) — Define validation rules and domain constraints for User. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [59] [Organization Rules](./04-business-rules.md#organization-rules) — Define validation rules and domain constraints for Organization. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [60] [OrganizationMember Rules](./04-business-rules.md#organizationmember-rules) — Define validation rules and domain constraints for OrganizationMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [61] [Role Rules](./04-business-rules.md#role-rules) — Define validation rules and domain constraints for Role. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [62] [Employee Rules](./04-business-rules.md#employee-rules) — Define validation rules and domain constraints for Employee. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [63] [EmployeeContract Rules](./04-business-rules.md#employeecontract-rules) — Define validation rules and domain constraints for EmployeeContract. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [64] [Department Rules](./04-business-rules.md#department-rules) — Define validation rules and domain constraints for Department. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [65] [Project Rules](./04-business-rules.md#project-rules) — Define validation rules and domain constraints for Project. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [66] [ProjectMember Rules](./04-business-rules.md#projectmember-rules) — Define validation rules and domain constraints for ProjectMember. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [67] [Task Rules](./04-business-rules.md#task-rules) — Define validation rules and domain constraints for Task. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [68] [Timelog Rules](./04-business-rules.md#timelog-rules) — Define validation rules and domain constraints for Timelog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [69] [Timesheet Rules](./04-business-rules.md#timesheet-rules) — Define validation rules and domain constraints for Timesheet. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [70] [ActivityLog Rules](./04-business-rules.md#activitylog-rules) — Define validation rules and domain constraints for ActivityLog. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [71] [Timer Rules](./04-business-rules.md#timer-rules) — Define validation rules and domain constraints for Timer. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
  - [72] [Report Rules](./04-business-rules.md#report-rules) — Define validation rules and domain constraints for Report. Do NOT repeat data isolation (05), lifecycle states (02), or operation flows (03).
- [Data Browsing Expectations](./04-business-rules.md#data-browsing-expectations)
  - [73] [List Browsing Expectations](./04-business-rules.md#list-browsing-expectations) — Define business expectations for how users find, filter, and browse lists.
- [Error Conditions](./04-business-rules.md#error-conditions)
  - [74] [Error Scenarios](./04-business-rules.md#error-scenarios) — Describe error conditions and expected system responses in natural language.
- [File Validation Rules](./04-business-rules.md#file-validation-rules)
  - [75] [File Validation and Policies](./04-business-rules.md#file-validation-and-policies) — Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

**[05-non-functional.md](./05-non-functional.md)**
- [Data Policies](./05-non-functional.md#data-policies)
  - [76] [Data Ownership and Privacy](./05-non-functional.md#data-ownership-and-privacy) — Define who owns what data, who can access it, and privacy boundaries between users.
  - [77] [Data Retention and Recovery](./05-non-functional.md#data-retention-and-recovery) — Define what happens to deleted data, how long it is retained, and how users can recover it.
- [Storage Capacity](./05-non-functional.md#storage-capacity)
  - [78] [Storage Capacity Requirements](./05-non-functional.md#storage-capacity-requirements) — Define storage requirements and capacity planning for file storage.

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

- **User** — hasMany OrganizationMembers, hasMany ActivityLogs (performed)
- **Organization** — belongsTo User (owner), hasMany OrganizationMembers, hasMany Employees, hasMany Departments, hasMany Projects, hasMany Roles, hasMany ActivityLogs, hasMany Reports
- **OrganizationMember** — belongsTo User, belongsTo Organization, belongsTo Role
- **Role** — belongsTo Organization, hasMany OrganizationMembers
- **Employee** — belongsTo OrganizationMember, belongsTo Department, hasMany EmployeeContracts, hasMany Timelogs, hasMany Timesheets
- **EmployeeContract** — belongsTo Employee
- **Department** — belongsTo Organization, hasMany Employees, hasMany Departments (parent)
- **Project** — belongsTo Organization, hasMany ProjectMembers, hasMany Tasks
- **ProjectMember** — belongsTo Employee, belongsTo Project
- **Task** — belongsTo Project, belongsTo Employee (assigned), belongsTo Task (parent)
- **Timelog** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **Timesheet** — belongsTo Employee, hasMany Timelogs
- **ActivityLog** — belongsTo Organization, belongsTo User (performed)
- **Timer** — belongsTo Employee, belongsTo Project, belongsTo Task (optional)
- **Report** — belongsTo Organization

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

- file-storage