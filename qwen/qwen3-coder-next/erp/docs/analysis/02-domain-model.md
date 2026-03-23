**hrmTracker — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## Organization Concept

An Organization represents a distinct business entity that uses the ERP platform. Each organization operates independently with its own employees, projects, and data. Key attributes include the organization’s name (required), description, logo image reference, currency (e.g., USD, EUR, KRW), timezone, and fiscal start month (e.g., January, July). Organizations are created by users during initial sign-up, and once created, all data within the platform is strictly isolated per organization. An organization’s owner has full control over its settings, and deletion is only possible under strict conditions to preserve data integrity.

### Organization Concept

An Organization represents a distinct business entity that uses the ERP platform. Each organization operates independently with its own employees, projects, tasks, departments, and time tracking data. Organizations are created by users during initial sign-up and serve as the primary container for all organizational data and operations.

Every user belongs to one or more organizations through Employee records. All actions and data are scoped to the currently selected organization context.

The organization is the central unit for multi-tenancy — data isolation between organizations is strictly enforced across all operations.

Each organization has exactly one Owner (a user account) who has full administrative control over the organization’s settings, members, and data.

### Organization Attributes

An organization is defined by the following attributes:

- **Name** (required): A unique identifier for the organization, entered during signup.
- **Description** (optional): A textual summary explaining the organization’s purpose or scope.
- **Logo image reference** (optional): A reference to the organization’s branding logo, used for UI presentation.
- **Currency** (required): The primary currency used for payroll and reporting, such as USD, EUR, or KRW.
- **Timezone** (required): The organization’s default timezone, which governs time-based operations like timesheet week boundaries and reporting.
- **Fiscal start month** (required): The first month of the organization’s fiscal year (e.g., January, July), used for reporting and budgeting cycles.

### Data Isolation Across Organizations

Each organization maintains complete data isolation from others. Employees, projects, timelogs, timesheets, and activities belonging to one organization are never visible or accessible to users from another organization.

Data isolation is strictly enforced in all business operations, including:
- Employee list visibility and permissions
- Project and task assignment
- Timelog and timesheet access
- Report generation

This isolation is fundamental to the platform’s multi-tenancy architecture.

### Multi-Tenancy Foundation

The platform’s multi-tenancy model is built on independent organization containers. Each organization:

- Has its own set of employees, roles, and permissions
- Manages its own projects, departments, and contracts
- Maintains independent time tracking and reporting data
- Retains its own fiscal, timezone, and currency settings

Users who belong to multiple organizations select their organization context at login or switch between organizations during a session. All subsequent operations occur within the selected organization’s context.

### Organization Deletion Policy

An organization can only be deleted by its Owner, and only when all of the following conditions are met:

- All pending timesheets are resolved (either approved or rejected)
- There are no active employee contracts in the organization

When deletion is executed:

- All associated employees, projects, tasks, timelogs, and timesheets are permanently deleted
- The organization’s Owner account remains in the system but is no longer associated with any organization
- No data from the deleted organization can be recovered

## User Concept

A User represents an individual account in the system, uniquely identified by email and authenticated via password. Key attributes include email (required and unique), password (encrypted), display name (required), optional avatar image, and phone number. Users can belong to multiple organizations and switch between them without re-authentication. A global profile is shared across all organizations the user belongs to. When a user is deleted, their account persists but is disassociated from organizations, and employee records elsewhere are deactivated rather than removed.

### User Concept

A User represents an individual who can interact with the HRM & Time Tracking platform. Each User is uniquely identified by an email address and authenticated via a password. Users serve as the foundation for employee records across multiple organizations.

### Email Authentication

Users sign up and log in using email and password. Email serves as the primary login credential and must be valid and verified. Passwords are securely encrypted and never stored in plain text.

### Unique Email Identifier

Each User must have a unique email address across the entire platform. No two accounts may share the same email. This ensures unambiguous identification and secure authentication.

### Display Name

Every User must have a display name, which appears in user interfaces when referencing the user (e.g., in timesheet reviews, activity logs, project assignments). The display name is user-facing and shared globally across all organizations the User belongs to.

### Global Profile

Each User has a single global profile that includes their display name, avatar image, and phone number. This profile is consistent across all organizations the User belongs to — no per-organization customization of core profile data is allowed.

### Multi-Organization Membership

A User can belong to multiple organizations simultaneously. When logged in, the User selects which organization context they want to work in — all subsequent actions (e.g., time tracking, project management) are scoped to that organization. Users can switch between organizations without logging out, maintaining seamless access across all their associated organizations.

### Password Encryption

Passwords are encrypted using industry-standard secure hashing before storage. The system never stores passwords in readable or reversible form. Passwords can be changed by users at any time through a secure update process.

### Account Deletion Behavior

When a User deletes their account: if they are the sole owner of an organization, they must first transfer ownership or delete the organization; for other organizations where they have employee records, those employee records are marked as deactivated rather than deleted; the User account itself remains in the system but is disassociated from all organizations, and their global profile data is retained only where legally required.

### User-Avatar Relationship

Each User may upload an avatar image as part of their global profile. The avatar image is optional and stored separately from core account data. It appears in user interfaces wherever the User is referenced (e.g., in comments, project member lists, activity logs).

## Employee Concept

An Employee represents a person’s engagement with an organization. Each employee record links to a specific User account (required), includes the Role assigned within that organization (required), and may include optional department, position/title, employment type (full-time, part-time, contractor, intern), and status (active, deactivated). An employee is scoped entirely to a single organization. Deactivated employees cannot log time or submit timesheets, but their historical data is preserved.

### Employee Concept

An Employee represents a person’s engagement with an organization. Each employee record links to a specific User account and serves as the primary way to associate a user with organizational context—including roles, departments, contracts, and project memberships. An employee cannot exist without being tied to exactly one organization.

### User-Account Reference

Each Employee is linked to exactly one User account (e.g., email-based identity). When a new employee is invited, the system checks if the email already corresponds to an existing user. If so, the user is added to the organization; if not, a pending invitation is created. The reference to the user account enables single sign-on and global profile consistency across all organizations the user belongs to.

### Role Assignment

Each employee must be assigned exactly one role within the organization. Roles determine what actions the employee can perform (e.g., viewing, managing, approving). Role assignments can be changed by users with employee management permissions. The role directly affects visibility, editing rights, and approval authority for the employee within the organization.

### Department Association

An employee may optionally belong to a department. Departments are organizational units used to classify and group employees. Assigning or changing an employee’s department is managed through the employee record. Deleting a department does not remove the employee—instead, their department field is set to null.

### Employment Type

Each employee has an employment type that reflects their contractual arrangement: full-time, part-time, contractor, or intern. This attribute is optional but when set, it helps categorize the employee for reporting and payroll purposes. It is stored as part of the employee record and supports filtering in lists and reports.

### Employee Status

Employees can have one of two statuses: active or deactivated. An active employee can log time, submit timesheets, and participate in projects. A deactivated employee is no longer able to perform these actions, but all historical data—including timelogs and timesheets—is preserved. Deactivated employees can be reactivated at any time by users with employee management permissions.

### Position/Title

An optional position or title may be associated with an employee to describe their role or function within the organization (e.g., Software Engineer, Project Manager). This is purely descriptive and does not affect permissions or system behavior. It supports internal organization and reporting needs.

### Organization-Scoped Record

Each employee record belongs to exactly one organization and cannot span multiple organizations. A single user can have multiple employee records—one per organization—but each employee is strictly scoped to its parent organization. Data isolation ensures users only see employee records for their currently selected organization, even when they belong to multiple organizations.

### Deactivated Employee Behavior

When an employee is deactivated, they lose access to time tracking, timesheet submission, and project participation. Deactivated employees cannot create or edit timelogs, submit timesheets, or be assigned to new tasks. However, all existing timelogs and timesheets associated with the employee remain intact and visible in reports. Deactivation is reversible—reactivating the employee restores their ability to interact with the system.

## Role Concept

A Role defines a set of permissions granted within an organization. Each organization maintains its own roles, including three built-in roles (Owner, Manager, Employee) that cannot be deleted, and custom roles that can be created and managed. A role has a name (e.g., 'Manager') and a set of permissions (e.g., employee:manage, project:view). Each employee in an organization is assigned exactly one role. Roles are scoped to an organization and do not affect the user’s global identity.

### Role Definition

A Role defines a set of permissions granted within an organization. Each organization maintains its own set of roles, which determine what actions users can perform within that organization. A role has a name (e.g., 'Manager') and a set of permissions (e.g., employee:manage, project:view). Roles do not affect the user’s global identity — they exist only in the context of a specific organization. Each employee in an organization is assigned exactly one role.

### Built-in Roles

There are three built-in roles that every organization has by default and cannot be deleted: Owner, Manager, and Employee. These roles are automatically created when an organization is formed. Built-in roles are protected from deletion to ensure basic organizational access control remains intact at all times.

### Custom Role Creation

Organization owners can create custom roles to define more specific permission sets tailored to their team structure. A custom role must have a unique name within the organization and must be assigned at least one permission. Custom roles supplement the built-in roles and allow fine-grained access control without modifying the core roles.

### Permission Set

A permission set is the collection of access rights assigned to a role. Each permission is represented by a code (e.g., org:manage, employee:manage) that grants specific capabilities. Permissions define what operations a role’s holder can perform, such as managing employees, viewing reports, or approving timesheets. A role’s permission set determines its functional scope within the organization.

### Employee-Role Assignment

Each employee in an organization is assigned exactly one role. Role assignment can be changed by users with employee:manage permission. The assigned role governs what the employee can do within the organization, including access to features, visibility of data, and ability to perform actions. Changing an employee’s role immediately updates their permissions and access scope.

### Organization-Scoped Role

Roles are scoped strictly to a single organization. A user may have different roles in different organizations they belong to. A role in one organization does not affect the user’s access or permissions in any other organization. When a user switches organization context during a session, the system applies the role associated with that organization for all subsequent actions.

### Owner Role

The Owner role has full access to all features and data within the organization. Owners can manage all aspects of the organization, including roles, members, projects, and settings. Owners are the only users who can delete the organization or transfer ownership. Each organization must have exactly one Owner at all times.

### Manager Role

The Manager role can manage employees, projects, and timesheets. Managers can view all reports, approve or reject timesheets, and edit employee records. They cannot delete the organization or change ownership. This role is intended for supervisors and team leads who need broad operational authority but not administrative control.

### Employee Role

The Employee role is designed for standard team members. Employees can track time, submit timesheets, view their own data, and work on assigned projects and tasks. They cannot manage employees, edit organization settings, or approve timesheets. This role provides access to core functionality while protecting organizational data from unintended changes.

### Role Deletion Constraint

Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances. Custom roles can only be deleted if no employees are assigned to them. Attempting to delete a custom role that has assigned employees will fail. This constraint ensures data integrity and prevents accidental loss of role-based access control.

## Permission Concept

A Permission represents a granular access control capability within the platform. Permissions are expressed as codes (e.g., org:manage, employee:manage, time:approve) and have human-readable descriptions. They define specific actions users with those permissions can perform, such as editing organization settings, managing employees, or approving timesheets. Permissions are assigned to roles—not directly to users—and combinations of permissions form the authority structure for each role.

### Permission Definition

A Permission represents a granular authorization capability within the system. Each permission is identified by a unique code (e.g., org:manage, employee:manage, time:approve) and includes a human-readable description explaining what action it enables. Permissions define the smallest unit of access control and cannot be assigned directly to users—only to Roles. Permissions are combined into roles to form structured access rights for employees within an organization.

### Access Control Codes

Each Permission has a short, standardized code used internally and in permission-based logic. Codes follow a naming pattern: category:action (e.g., org:manage, project:view). Codes are immutable and predefined by the system. The full set of available codes is: org:manage (edit organization settings), employee:manage (add, edit, deactivate employees), employee:view (view employee list and details), project:manage (create, edit, delete projects and tasks), project:view (view projects and tasks), time:manage (edit or delete any employee's timelogs), time:approve (approve or reject timesheets), time:view_all (view all employees' timelogs and timesheets), report:view (view organization reports). These codes cannot be modified or extended by users.

### org:manage Permission

The org:manage permission grants the ability to edit organization settings. Users with this permission can update the organization’s name, description, logo image, currency, timezone, and fiscal start month. This permission also enables creation, editing, and deletion of departments. The permission does not include deletion of the organization itself—this is governed by separate business rules. Organization Owners automatically have this permission.

### employee:manage Permission

The employee:manage permission allows users to add, edit, and deactivate employees within the organization. Users with this permission can invite new employees by email, assign roles to employees, update employee records (department, position, employment type), and deactivate or reactivate employees. Deactivated employees retain their historical data but lose the ability to log time or submit timesheets. This permission is required to create or edit employee contracts.

### time:approve Permission

The time:approve permission grants the ability to review, approve, or reject employee timesheets. Users with this permission can view all submitted timesheets, approve them (locking included timelogs), or reject them with a required rejection reason. Rejected timesheets return to draft status for the employee to revise and resubmit. This permission does not include editing timelogs directly—those require the time:manage permission.

### Role-Based Assignment

Permissions are never assigned directly to users. Instead, permissions are grouped into Roles (built-in or custom). Each employee in an organization is assigned exactly one role, which determines their set of permissions. Only users with employee:manage permission can assign or change roles for other employees. When a role is updated, all employees assigned to that role automatically inherit the new permission set.

### Granular Authorization

The system uses fine-grained authorization where each business action maps to one or more specific permissions. For example, viewing all timelogs requires time:view_all, while editing any employee’s timelogs requires time:manage. Authorization decisions are made by checking if the active user’s role includes the required permission. There are no implied or inherited permissions beyond explicit role assignments.

### time:view_all Permission

The time:view_all permission grants visibility into all employees' timelogs and timesheets within the organization. Users with this permission can view timelogs and timesheets of any employee, regardless of project membership or assignment. This permission supports auditing and reporting but does not allow modification of data—editing or deleting timelogs requires the separate time:manage permission.

### project:manage Permission

The project:manage permission enables full control over projects and tasks within the organization. Users with this permission can create, edit, archive, complete, and delete projects (subject to deletion constraints). They can also manage tasks—creating, editing, assigning, and changing task status—and assign project members with member or project-lead roles. This permission also includes assigning employees to tasks and overriding task assignments.

## Department Concept

A Department represents a business unit or team within an organization. Each department has a name (required), description, and an optional parent department to support one level of nesting (e.g., Engineering > Backend Team). Departments are organizational groupings used for employee classification and reporting, and employees may belong to only one department at a time. Deleting a department does not delete employees but sets their department association to null.

### Department Concept

A Department represents a business unit or team within an organization. It serves as a classification mechanism for grouping employees by function, location, or other organizational criteria. Each department belongs to exactly one organization and cannot exist across organizations. Departments are shared reference data used for reporting, filtering, and employee assignment.

### Organizational Unit

Each Department functions as a hierarchical organizational unit under its parent organization. It enables separation of responsibilities, reporting structures, and resource allocation across departments within the same organization. Employees assigned to a department inherit visibility and context based on department membership.

### Department Nesting

Departments support one level of nesting via an optional parent department reference. This enables a flat hierarchy where departments can be grouped under a broader category (e.g., Engineering > Backend Team). A department cannot have more than one parent, and departments at any level can be assigned employees.

### Employee Classification

Departments are used to classify employees for reporting, permissions, and organizational structure. Each employee is assigned to exactly one department at a time. Employee records retain historical department assignments through their contract history and activity logs, but current assignments reflect only the active department.

### Parent Department Relationship

A department may optionally reference another department as its parent to create a single-level hierarchy. This relationship is purely organizational and does not affect permissions, access control, or data isolation. Deleting a parent department does not automatically delete or reassign its child departments.

### Department Hierarchy

The department hierarchy supports only one level of nesting: a parent department and its child departments. Grandchild departments are not permitted. The hierarchy is visualized as a two-tier structure, where top-level departments have no parent and child departments reference exactly one parent.

### Department Name

Each department must have a name (required), used as the primary identifier in UI and reports. The name should clearly reflect the department’s purpose or function. Department names are unique within an organization only in the sense that duplicate names are permitted but discouraged for clarity. There are no format restrictions beyond the requirement for a non-empty value.

### Department Description

A department may include a description (optional) to provide context about its role, scope, or responsibilities within the organization. Descriptions support internal documentation and help users understand department purpose without needing external references.

### Null Department Behavior

When a department is deleted, employees previously assigned to that department retain their records but have their department association set to null. This preserves historical data integrity while allowing organizational structure changes. Deactivated employees also retain null department status after deletion. Null department assignment does not prevent other actions such as timelogging or timesheet submission.

## Contract Concept

A Contract represents a formal employment agreement with an employee for a specific period. Each contract includes a start date (required), optional end date (null indicates ongoing), pay rate (required numeric value), pay period (hourly, daily, weekly, monthly), working hours per week (required), and optional notes. Only one contract can be active at a time per employee, and creating a new contract automatically ends the prior active one. Past contracts are immutable historical records.

### Contract Concept

A Contract represents a formal employment agreement between an organization and an employee for a specific period. Each employee can have multiple contracts over time, representing their employment history with the organization. A contract captures the financial and working conditions agreed upon between the parties and serves as a historical record of the employee's compensation and working arrangement.

### Employment Agreement Details

An employment agreement includes the following key components: the start date (required), which marks when the employment terms become effective; an optional end date indicating when the agreement concludes; the pay rate and pay period defining how the employee is compensated; and the working hours per week indicating the expected schedule. Additional notes or special conditions may be recorded but are optional. The agreement must be associated with exactly one employee and belongs to one organization.

### Start Date Requirement

Every contract must have a start date, which is the date when the employment terms become effective. The start date cannot be in the past relative to when the contract is created, and it must be earlier than any end date if one is provided. The start date is a required field and cannot be left blank when creating or editing a contract.

### Pay Rate Configuration

The pay rate represents the compensation amount for the employee and is a required numeric value. It is always accompanied by a pay period type that defines how the rate should be interpreted. The pay rate is stored as a positive number and reflects the agreed-upon compensation for the specified pay period. Changes to the pay rate are only possible when editing the current active contract.

### Pay Period Type

The pay period type indicates how frequently the employee is compensated and is required for each contract. Accepted pay period types include: hourly, daily, weekly, and monthly. The pay period type works in conjunction with the pay rate to define the employee's compensation structure. This value is set when the contract is created and can only be changed by modifying the current active contract.

### Working Hours Per Week

The working hours per week represents the expected number of hours the employee should work each week under this contract. This is a required numeric value and must be a positive integer. The value is used for planning, reporting, and budgeting purposes. It is stored as a fixed value per contract and does not change during the contract's lifetime unless the contract is edited while active.

### Active Contract Constraint

Only one contract can be active for an employee at any given time. When a new contract is created for an employee, the system automatically ends the previous active contract by setting its end date to the day before the new contract's start date. This ensures a clear chronological sequence of employment agreements without overlapping active periods.

### Contract End Date

The end date is optional for a contract and indicates when the employment agreement terminates. If the end date is null, the contract is considered ongoing until it is replaced by a new contract or manually ended. When an end date is provided, it must be after the start date and cannot be earlier than the start date. End dates are used to track contract duration and enable historical reporting.

### Historical Immutability

Past contracts (those with an end date that has passed) are immutable historical records and cannot be modified after creation. Only the current active contract can be edited. This ensures data integrity for payroll, reporting, and compliance purposes. Any changes to historical data require creating a new contract instead of modifying existing records.

## Project Concept

A Project represents a defined work initiative with clear boundaries. Each project has a name (required), optional description, color code (required for UI), status (active, archived, completed), optional budget hours, optional start date, and optional end date. Projects can be archived or completed to prevent new timelogs, but existing data is preserved. Deletion is only allowed when no timelogs exist for the project, ensuring historical integrity.

### Project Concept

A Project represents a defined work initiative with clear boundaries, such as a product launch, feature development, or internal initiative. Each project belongs to exactly one organization and serves as a container for tasks, time tracking, and team collaboration. Projects provide a structured way to organize and monitor work within the organization.

### Work Initiative

Each project encapsulates a single work initiative — a specific effort with defined goals and scope. Projects enable organizations to track progress, allocate resources, and measure outcomes for individual initiatives. A project can evolve over time but remains tied to its original initiative purpose.

### Color Code Attribute

Each project has a color code for visual identification in the user interface. This color is used for project headers, labels, and other UI elements to help users quickly distinguish between projects. The color code is purely for visual organization and has no impact on data behavior or reporting.

### Budget Hours

Projects may include a budget hours value, representing the total estimated hours planned for the initiative. This is optional and serves as a planning reference. Budget hours enable tracking of planned versus actual effort and support budget utilization reporting.

### Project Status

Each project has a status that reflects its current state in the initiative lifecycle. Available statuses are active (ongoing work), archived (no new work planned but history preserved), and completed (initiative finished successfully). Status indicates the project’s readiness to accept new work.

### Archived Project Behavior

When a project is archived, it remains accessible for historical reference and reporting but cannot receive new timelogs or task assignments. Existing timelogs, tasks, and project members are preserved in full. Archiving is reversible — an archived project can be reactivated to active status.

### Completed Project Behavior

When a project is marked as completed, it signifies that the initiative has been successfully finished. Like archived projects, completed projects retain all historical data but cannot accept new timelogs or task assignments. Completion is typically permanent and not reversed.

### Deletion Constraint

A project can only be deleted if it has no timelogs associated with it. This ensures that historical time tracking data is preserved for reporting and compliance purposes. Projects with any timelog entries must be archived or completed instead of deleted.

### Timelog Association

Timelogs are recorded against a specific project and optionally against a task within that project. An employee can only log time to projects they are assigned to. Each timelog is permanently linked to its project, preserving the association even if the project is later archived or completed.

## Task Concept

A Task represents a unit of work within a project. Each task has a title (required), optional description, status (open, in-progress, completed, closed), priority (low, medium, high, urgent), optional estimated hours, optional due date, optional assigned employee (must be a project member), and optional parent task (for one-level subtasks). Tasks are scoped to a single project, and their status changes are tracked in a separate history entity to ensure auditability.

### Task Concept

A Task represents a unit of work within a project. Each task has a title (required) and an optional description. Tasks are scoped to a single project and can be assigned to employees who are members of that project.

Every task belongs to exactly one project, and each project can contain multiple tasks. Tasks serve as the foundational work items for time tracking, with timelogs recorded against them when employees contribute effort.

### Project Work Unit

Tasks are the primary work units within projects. They enable employees to track time spent on specific deliverables or activities. Each timelog must reference either a task or its parent project if no task is specified.

The project context ensures all task-related work is correctly attributed and reported under organizational initiatives.

### Task Status

Each task has a status that reflects its current state in the work lifecycle. Allowed statuses are:

- **open**: the task has been created but work has not yet started
- **in-progress**: the task is currently being worked on
- **completed**: the task has been finished
- **closed**: the task has been finalized (e.g., cancelled or superseded)

Status transitions are permanently recorded in the task history to maintain an audit trail of changes.

### Task Priority

Tasks can be assigned a priority level to indicate their relative importance. Allowed priorities are:

- **low**: minimal urgency
- **medium**: standard priority
- **high**: elevated importance
- **urgent**: immediate attention required

Priority helps employees and project leads organize work and allocate time effectively.

### Estimated Hours

Each task can have an estimated hours value, representing the expected effort to complete the task. This is optional and provided as a numeric value.

The estimated hours are used in project budgeting and progress tracking to compare against actual hours logged.

### Due Date

Tasks may include a due date, indicating when work on the task is expected to be completed. This field is optional and helps in planning and deadline management.

Due dates are not enforced automatically but serve as planning references for employees and project leads.

### Assigned Employee

A task can be assigned to exactly one employee who must be a member of the task's parent project. Assignment is optional, meaning tasks can exist without being assigned to a specific person.

Only employees assigned to the project can be selected for assignment, ensuring proper access and accountability.

### Subtask Nesting

Tasks can be organized into subtasks using a one-level nesting structure. Each task can have one parent task, and a parent task can have multiple subtasks.

Subtasks inherit the parent task’s project context and are used to break down complex tasks into manageable pieces without allowing deeper nesting.

### Parent Task Relationship

The parent task relationship enables hierarchical task organization. When a task has a parent, it becomes a subtask of that parent.

The parent task retains its project membership, status, and priority unaffected by its subtasks, though subtasks can be used to track progress toward parent task completion.

## Timelog Concept

A Timelog represents a time entry recorded for work performed. Each timelog includes a date (required), duration in minutes (required), project (required, must be one the employee is assigned to), optional task (must belong to the selected project), optional description, and a billable flag (default true). Employees can only create timelogs for themselves, and timelogs may be locked if included in approved timesheets, preserving historical accuracy.

### Timelog Concept

A timelog represents a time entry recorded for work performed by an employee. Each timelog belongs to one employee and captures the time spent on work-related activities within a specific organization context. Timelogs serve as the foundational record for payroll processing, project billing, and productivity analysis.

### Time Entry Attributes

Each timelog includes a date (required) that indicates when the work occurred, and a duration in minutes (required) that specifies how long the work took. The date must be a calendar date and the duration must be a positive number of minutes. Timelogs are created by employees for themselves and may be associated with a specific project and optionally a task within that project.

### Project Assignment

Every timelog must be linked to a project that the employee is assigned to. This ensures that time tracking remains aligned with authorized work assignments. The system prevents employees from logging time to projects they are not assigned to, enforcing strict data isolation and accountability for billable and non-billable work.

### Task Association

While a project assignment is mandatory, the task association is optional. If a task is included, it must belong to the selected project. This allows employees to record time at either the project or task level depending on the organization's tracking granularity requirements. The task association helps with detailed reporting and budget tracking.

### Billable Flag

Each timelog includes a billable flag (default true) that indicates whether the work should be included in client billing. This flag supports organizations that manage both billable and non-billable work, such as internal projects, training, or administrative tasks. The flag defaults to true but can be adjusted when creating or editing timelogs by authorized users.

### Employee-Scoped Entry

Timelogs are strictly employee-scoped entries — employees can only create, edit, and delete their own timelogs. This ensures accountability and prevents time tracking errors or fraud. Users with appropriate permissions (time:manage) can edit or delete any employee's timelogs for administrative corrections, but standard employees have no access to others' timelogs.

### Locked Timelog Condition

A timelog becomes locked when it is included in an approved timesheet. Once locked, the timelog cannot be edited or deleted by anyone, including the employee who created it. This preserves the integrity of payroll and billing data after timesheet approval. Timelogs in draft or rejected timesheets remain editable by the employee until they are part of an approved timesheet.

## Timesheet Concept

A Timesheet represents a weekly collection of timelogs for a specific employee. Each timesheet spans Monday to Sunday and includes the employee owner, week start and end dates (required), status (draft, submitted, approved, rejected), total hours, submission timestamp, and optional review metadata (timestamp, reviewer, rejection reason). A timesheet is always tied to a single week and cannot overlap with another submitted or approved timesheet for the same week.

### Timesheet Concept

A timesheet represents a weekly collection of timelogs for a specific employee. It serves as a formal record of work performed over a defined period and is used for approval, billing, and reporting purposes. Each timesheet is always associated with one employee (the owner) and one calendar week.

### Weekly Timelog Collection

A timesheet automatically aggregates all timelogs created by the employee during the specified week. Timelogs can be added to or removed from a draft timesheet before submission. Once submitted or approved, the timesheet locks its timelogs — they cannot be edited or deleted.

### Monday-to-Sunday Week

Each timesheet covers a fixed week running from Monday through Sunday. The week start date (Monday) and week end date (Sunday) are required fields and determine which timelogs are included. A timesheet cannot span multiple weeks or include days outside this range.

### Employee Owner

The employee who owns the timesheet is the employee who created the timelogs being recorded. Each timesheet is associated with exactly one employee. Employees can only create timesheets for themselves, and they cannot include timelogs from other employees.

### Timesheet Status

A timesheet has one of four statuses: draft, submitted, approved, or rejected. A new timesheet starts as draft. When submitted, it moves to submitted. An approver can change it to approved or rejected. A rejected timesheet returns to draft status for correction and resubmission.

### Total Hours

The total hours field is automatically calculated as the sum of all timelog durations in the timesheet, converted from minutes to hours. This value is updated whenever timelogs are added or removed while the timesheet is in draft status. Once approved, the total hours become immutable.

### Submission Timestamp

When an employee submits a timesheet, a timestamp records the exact date and time of submission. This timestamp is required and cannot be edited. It marks the transition from draft to submitted status and serves as the starting point for approval workflow timing.

### Approval Metadata

When a timesheet is approved or rejected, additional metadata is recorded: the timestamp of review, the user who performed the review, and — if rejected — a rejection reason. This metadata is stored with the timesheet and cannot be modified after recording.

### Rejection Reason

If a timesheet is rejected, the approver must provide a text reason explaining the rejection. This reason is stored with the timesheet and shown to the employee upon rejection. The employee must address the reason before resubmitting the timesheet.

## ActivityLog Concept

An ActivityLog represents a record of significant business actions taken within an organization. Each entry includes a timestamp (required), the user who performed the action (required), the action type (e.g., timesheet approved, employee deactivated), the target entity (e.g., project, employee), and details about the change. Activity logs cover key operations such as invitations, role assignments, project edits, and timesheet reviews, supporting accountability and auditing.

### ActivityLog Concept

An ActivityLog represents a business action record in the system. Each entry captures a significant event that occurs within an organization, such as an employee being invited, a timesheet being approved, or a project status being updated. Activity logs are generated automatically by the system in response to business actions.

### Timestamped Event

Every activity log entry includes a timestamp indicating when the action occurred. The timestamp captures the exact moment the business action took place, providing chronological order for audit purposes. Timestamps are recorded in the organization’s configured timezone.

### User Action Reference

Each activity log entry records the user who performed the action. This creates accountability by linking every business action to a specific user account. If a system-initiated action occurs (e.g., automatic timesheet approval), the user context remains traceable via the associated action.

### Action Type Classification

Activity log entries are classified by action type to support filtering and analysis. Accepted action types include: employee invited, employee deactivated, employee reactivated, contract created, contract edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, role assigned, and role changed.

### Target Entity Reference

Each activity log entry references the target entity of the action, such as an employee, project, task, timesheet, or role. This enables users to trace the history of a specific business object. The target entity is identified by type and unique identifier.

### Role Assignment Event

When an employee’s role changes within an organization, the system records this as a role assignment event in the activity log. The log entry includes the previous role, the new role, and the user who performed the change. This supports tracking of permission changes and accountability.

### Timesheet Review Event

When a timesheet is submitted, approved, or rejected, the system records this as a timesheet review event in the activity log. For approvals and rejections, the log includes who performed the review, the review timestamp, and (if applicable) the rejection reason.

### Audit Trail

The activity log serves as an audit trail for accountability and compliance. It provides a complete, chronological record of significant business actions, including who performed them, when, what was targeted, and what type of action occurred. Activity logs are immutable once recorded.

## ProjectMember Concept

A ProjectMember represents the association between an employee and a project with a defined role. Each member record includes the employee (required), the project (required), and their role within the project (member or project-lead). Project-lead members gain additional permissions to manage tasks within their project. Employees can belong to multiple projects, and membership is required before they can log time to that project.

### ProjectMember Concept

A ProjectMember represents the formal association between an employee and a project within an organization. Each ProjectMember record ties one employee to one project, enabling the system to track which employees contribute to which projects. The record includes the employee (required), the project (required), and the role the employee has within that project.

### ProjectMember Role Types

Each ProjectMember has one of two role types: member or project-lead. A member is a standard participant in the project. A project-lead has additional authority to manage tasks within the project, such as creating, editing, and assigning tasks. Only one role type is assigned per ProjectMember record.

### Assignment Constraint

An employee must be assigned to a project via a ProjectMember record before they can log time to that project. Timelogs associated with a project require a valid ProjectMember association for that employee-project pair. The system does not allow timelogs for projects where the employee has no membership.

### Timelog Eligibility

Timelogs can only be created for projects where the employee has an active ProjectMember record. If an employee’s membership in a project ends (e.g., due to removal), they can no longer log new timelogs to that project. Existing timelogs are preserved and remain linked to the project through their original ProjectMember association.

### Task Management Authority

Project-lead members gain the authority to manage tasks within their assigned project. This includes creating new tasks, editing existing tasks (including status, priority, and assignment), and assigning tasks to other project members. Standard members do not have these permissions and can only view and update tasks assigned to themselves.

### Multi-Project Membership

An employee can be assigned to multiple projects through multiple ProjectMember records, one per project. Each record is independent and can have a different role (member or project-lead). This allows employees to participate in several projects simultaneously while maintaining clear role definitions per project.

## TaskHistory Concept

A TaskHistory represents the chronological record of status changes for a task. Each entry includes a timestamp (required), the previous status (required), the new status (required), and the user who made the change. Task history ensures transparency in how tasks evolve, capturing every transition from open to completed or closed states, and is updated only on status changes—not on other edits like title or priority.

### TaskHistory Concept

A TaskHistory entry is a timestamped record that captures every status change a task undergoes throughout its lifecycle. Each entry records when the change occurred (timestamp), the task’s previous status (old status value), the new status it transitioned to (new status value), and the user who performed the change (user change reference).

TaskHistory serves as a complete audit trail for tasks, ensuring transparency and traceability of how and when tasks evolve — for example, from 'open' to 'in-progress', or from 'in-progress' to 'completed'. Only status changes trigger a new TaskHistory entry; other edits (e.g., title, priority, estimated hours) do not create history entries.

Every TaskHistory entry belongs to exactly one task and is immutable once recorded. The system automatically creates entries when a status transition occurs, and only users with appropriate permissions can make such transitions. Employees with `project:view` or `task:read` permissions may view the full history for tasks they have access to, but cannot modify or delete history entries.

## Timer Concept

A Timer represents a live, real-time time tracking session for an employee. Each timer includes the employee (required), start timestamp (required), selected project (required), optional task, and optional description. An employee can have at most one active timer at a time, and the timer continues running until explicitly stopped or discarded. Stopping the timer creates a new timelog with the calculated duration.

### Timer Concept

A Timer represents a live, real-time time tracking session for an employee. Each timer captures the ongoing work activity until it is stopped, discarded, or results in a timelog entry.

### Live Time Tracking

Employees can start a live timer to track time in real-time. This allows continuous, accurate recording of work duration without manual entry. The timer runs continuously until the employee explicitly stops or discards it.

### Start Timestamp

Each timer records the exact start time when the employee initiates the session. The start timestamp marks the beginning of the active tracking period and is used to calculate the duration upon stopping.

### Active Session

An active timer represents a currently running time tracking session. The system maintains the active state for as long as the employee does not stop or discard it. No automatic termination or timeout occurs.

### Project Selection

Starting a timer requires selecting a project (required), with the option to also select a specific task within that project (optional). The selected project must be one the employee is assigned to.

### Timer Stop Behavior

When an employee stops their timer, the system creates a new timelog entry with the calculated duration. Duration is rounded to the nearest minute. The timer is then cleared.

### Timelog Creation

Stopping a timer automatically generates a timelog with the duration, selected project, optional task, and any description provided during the session. No additional input is required at creation time.

### Single Active Timer

Each employee can have at most one active timer at a time. Starting a new timer automatically discards any existing active timer for that employee.

### Running Timer Persistence

An active timer continues running indefinitely until the employee explicitly stops or discards it. It persists across page refreshes and system interruptions, retaining the original project, task, and description until modification or termination.

## PendingInvitation Concept

A PendingInvitation represents an invitation to join an organization extended to a person who may or may not yet have an account. Each invitation includes the email (required), the organization (required), and the user who sent the invitation (required). If the invited email corresponds to an existing account, the user is added immediately. Otherwise, the invitation remains pending and is fulfilled upon signup with that email, ensuring seamless onboarding.

### PendingInvitation Concept

A PendingInvitation represents an invitation to join an organization extended to a person who may or may not yet have an account. Each invitation is tied to a specific email address and organization, and includes the user who sent the invitation (the inviter). It remains in pending status until the invited person signs up with the matching email, at which point they are automatically added to the organization.

### Organization Invitation

An invitation is sent from an organization to invite a person to join. Invitations are used to onboard new employees into the organization. The invitation process supports both existing and future accounts — if the invited person already has an account, they are added immediately; otherwise, the invitation waits for account creation.

### Email-Based Invite

Every invitation is identified solely by email address. The system sends an email-based invitation to the target email. The email is used to match the invitation to either an existing account or a future signup. No separate user identifiers are required at the time of invitation.

### Pending Status

An invitation starts in pending status when sent. It remains pending until the invited email signs up for an account. While pending, the invitation does not grant access but serves as a record of intent to add the person to the organization. Pending invitations do not expire and remain active indefinitely until acted upon.

### Account Fulfillment

Account fulfillment occurs when a new user signs up with the exact email from the pending invitation. At that moment, the invitation is fulfilled, the user is automatically added to the organization, and the invitation is no longer pending. The user’s employee record is created with the default employee role (unless overridden during signup).

### Inviter Reference

Each PendingInvitation records who sent the invitation — the inviter — as a reference to the user account. This preserves accountability and provides an audit trail for who invited whom. The inviter is immutable once the invitation is created.

### Onboarding Automation

Onboarding is fully automated when a pending invitation is fulfilled. Upon signup with the matching email, the user gains immediate access to the organization, sees the invitation fulfilled, and has their employee profile initialized. No manual intervention is needed to finalize the invitation.

### Email-Account Link

The link between email and account is strict and explicit. An invitation only triggers account linking if the signup email exactly matches the invitation email. If the user signs up with a different email, the invitation remains unused and the user is not added to the organization.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### Organization Ownership

Each organization is owned by exactly one user, who has full administrative rights over the organization and its data. A user can own multiple organizations, but at any given time, each organization has a single owner. When an organization is deleted, the owner's account remains but is disassociated from that organization.

### Employee–User Relationship

An employee is a business representation of a user within a specific organization. Each employee record references exactly one user account and belongs to exactly one organization. A user may have multiple employee records across different organizations. Employee status (active/deactivated) and role are defined per organization, not globally.

### Organization–Department Belongs-to

Each department belongs to exactly one organization. Departments form a one-level hierarchical structure: a department may have an optional parent department, but no deeper nesting is allowed. Employees belong to one department (or none), but department membership is scoped to their organization.

### Project–Task Has-Many Association

Each project can contain multiple tasks. Each task belongs to exactly one project. Tasks can be nested as subtasks under a parent task (one level only). Tasks can be assigned to employees who are members of the project. Task history entries record status changes and belong to a specific task.

### Timesheet–Timelog Ownership

A timesheet is owned by one employee and contains one or more timelogs for a specific week (Monday to Sunday). Each timelog belongs to exactly one employee and may optionally belong to one project and task. Timelogs included in an approved timesheet become locked and cannot be edited or deleted.

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### Organization Lifecycle

An organization is created when a user signs up. Once created, the organization is active and operational. An organization can be deleted by its owner only when there are no active employee contracts and all pending timesheets are resolved (approved or rejected). When deleted, all associated data — employees, projects, tasks, timelogs, and timesheets — is permanently removed. The owner's account remains but is disassociated from the organization. Deletion is irreversible.

### User Lifecycle

A user account is created during sign-up with email and password. After creation, the user is active and can belong to multiple organizations. A user can be deleted by the account owner, but if they are the sole owner of an organization, they must first transfer ownership or delete that organization. Upon deletion, all employee records in other organizations are marked as deactivated. The user's global profile and account are removed. Deletion is permanent.

### Employee Lifecycle

An employee record is created when a user is invited to an organization. The employee starts in active status and can be assigned a role and department. An employee can be deactivated by users with employee:manage permission. Deactivated employees cannot log time or submit timesheets. Their historical data (timelogs, timesheets, contracts) is preserved. Deactivated employees can be reactivated, restoring full access. Deactivation is reversible; deletion is not supported — employees are only deactivated or their account disassociated.

### Contract Lifecycle

A contract is created with a start date and becomes active on that date. Only one contract can be active at a time per employee. When a new contract is created, the previous active contract automatically ends (its end date is set to the day before the new contract starts). Active contracts can be edited. Past contracts are immutable. Contracts are retained as historical records indefinitely unless the employee record is deactivated or the organization is deleted.

### Project Lifecycle

A project starts in active status upon creation. Users with project:manage permission can archive or complete projects. Archived/completed projects cannot accept new timelogs. Projects can be deleted only if they have no timelogs associated. Deletion removes the project but preserves all timelogs and tasks linked to it by organization context.

### Task Lifecycle

A task starts in open status upon creation. It transitions through in-progress, completed, and closed states. Each status change is recorded in task history. Task status can only be changed by project leads (for tasks in their project) or users with project:manage permission. Task deletion is not supported; tasks are archived via project archival or deletion.

### Timesheet Lifecycle

A timesheet starts as draft for a specific Monday–Sunday week. It can include or exclude timelogs before submission. When submitted, status becomes submitted. Users with time:approve permission can approve or reject it. Approved timesheets lock all associated timelogs and cannot be changed. Rejected timesheets return to draft status for revision. Once approved or rejected, the timesheet status does not change again. Timesheets are retained indefinitely unless the employee or organization is removed.

### Timer Lifecycle

A timer starts when an employee begins live time tracking. It remains active until the employee stops or discards it. Stopping the timer creates a timelog and ends the session. The timer cannot auto-expire or auto-stop — it runs indefinitely until manually stopped. While active, the timer can be edited (project, task, description). Discarding the timer deletes it without creating a timelog.

### RetentionPolicy

All data is retained for the life of the organization. When an organization is deleted, all associated entities — employees, projects, timelogs, timesheets, tasks, contracts, and activity logs — are permanently removed. Deactivated employees retain their historical records (timelogs, timesheets, contracts) until organization deletion. Activity logs are retained indefinitely for audit purposes unless organization deletion occurs.

### ArchivalBehavior

Projects can be archived or marked as completed. Archived/completed projects cannot receive new timelogs. Tasks within archived/completed projects are preserved but no new timelogs can be added to them. Archiving does not delete data — it only restricts further edits or additions. No other entities support archival; they use deactivation or deletion instead.

### DeletionPolicy

Deletion is only allowed under strict conditions. Organizations can be deleted only when there are no active contracts and no pending timesheets. Projects can be deleted only if they have no timelogs. Employees cannot be deleted — they are only deactivated. Users can be deleted only after transferring or eliminating organization ownership. Deletion is permanent and irreversible. All associated data is removed on organization deletion.

### RecoveryOptions

Deactivated employees can be reactivated, restoring their employee record and access to organization context. Rejected timesheets can be revised and resubmitted. Timelogs not part of a submitted or approved timesheet can be edited or deleted by the employee. Once a timesheet is approved, its timelocks become immutable. There is no system recovery mechanism for permanently deleted organizations, users, or timelogs.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Organization Status Classification

An organization can have one of the following statuses:
- **Active**: The organization is currently operational and all features are accessible.
- **Deleted**: The organization has been permanently removed. Deletion only occurs after meeting requirements: all pending timesheets are resolved, no active employee contracts exist. When deleted, all associated data (employees, projects, timelogs, timesheets, activities) is permanently removed from the system, while the owner's account remains but is disassociated from any organization.

### Employee Status Classification

An employee record can have one of the following statuses:
- **Active**: The employee can log time, submit timesheets, and participate in projects.
- **Deactivated**: The employee cannot log time or submit timesheets, but their historical data (timelogs, timesheets) is preserved. Deactivated employees can be reactivated. Only users with employee:manage permission can change employee status.

### Project Status Classification

A project can have one of the following statuses:
- **Active**: The project is ongoing and employees can add timelogs to it.
- **Archived**: The project is preserved for historical reference but cannot receive new timelogs.
- **Completed**: The project is finished and cannot receive new timelogs. Existing timelogs are preserved. Only users with project:manage permission can change project status.

### Task Status Classification

A task can have one of the following statuses:
- **Open**: The task has been created but work has not started.
- **In-progress**: Work on the task has begun.
- **Completed**: The task has been finished.
- **Closed**: The task is no longer relevant or has been superseded. Only project-lead or users with project:manage permission can change task status.

### Timesheet Status Classification

A timesheet can have one of the following statuses:
- **Draft**: The timesheet contains timelogs for the week but has not been submitted yet. Employees can modify draft timesheets freely.
- **Submitted**: The timesheet has been submitted for approval and cannot be modified by the employee.
- **Approved**: The timesheet has been approved by an authorized user. All timelogs in the timesheet are locked and cannot be edited or deleted.
- **Rejected**: The timesheet was rejected with a reason. It returns to draft status and the employee can modify and resubmit it.

### Employment Type Classification

An employee's employment type can be one of the following:
- **Full-time**: Regular employee working full schedule.
- **Part-time**: Employee working reduced schedule.
- **Contractor**: External contractor engaged for specific period.
- **Intern**: Internship employee. Only users with employee:manage permission can set employment type.

### Pay Period Classification

An employee's contract can specify one of the following pay periods:
- **Hourly**: Compensation based on hours worked.
- **Daily**: Compensation based on days worked.
- **Weekly**: Compensation based on weekly schedule.
- **Monthly**: Compensation based on monthly schedule. This classification is fixed per contract and used for reference only.

### Project Member Role Classification

When an employee is assigned to a project, they can have one of the following roles:
- **Member**: Standard project member with no special permissions beyond assigned tasks.
- **Project-lead**: Member who can manage tasks within their assigned project. Project-lead status does not grant permissions to edit tasks outside their project.

### Task Priority Classification

A task can be assigned one of the following priorities:
- **Low**: Minimal urgency.
- **Medium**: Standard urgency.
- **High**: Elevated urgency.
- **Urgent**: Maximum urgency requiring immediate attention. Priority classification helps employees and project-lead prioritize task execution.

### Activity Action Type Classification

Activity log entries record significant business actions with the following classifications:
- **Employee-related**: invited, deactivated, reactivated
- **Contract-related**: contract created, contract edited
- **Project-related**: project created, project archived, project completed, project deleted
- **Task-related**: task status changed
- **Timesheet-related**: timesheet submitted, timesheet approved, timesheet rejected
- **Role-related**: role assigned, role changed
Only users with org:manage permission can view full activity log.

## State Transitions

Define valid state transition paths for stateful concepts.

### Timesheet State Transitions

An employee can create a draft timesheet for a specific week. While in draft status, the employee can add or remove timelogs. When ready, the employee can submit the draft timesheet for approval — the timesheet status changes from draft to submitted. Users with time:approve permission can approve a submitted timesheet — the status changes from submitted to approved, which locks all included timelogs. Users with time:approve permission can reject a submitted timesheet with a reason — the status changes from submitted to draft, allowing the employee to modify and resubmit. A draft timesheet can be discarded without submission. An approved timesheet cannot be changed or resubmitted for the same week. A rejected timesheet must be modified before it can be resubmitted.

### Project State Transitions

A project starts in active status. Users with project:manage permission can change an active project to archived or completed status — both transitions preserve existing timelogs and tasks but prevent new timelogs. Once a project is archived or completed, it cannot return to active status. Users with project:manage permission can delete a project only if it has no timelogs associated with it — deletion is irreversible. Projects in active status can be edited (name, description, color code, budget hours, dates) or have members assigned. Archived/completed projects remain visible but read-only for time tracking purposes.

### Task State Transitions

A task starts in open status. When work begins, the project lead or project:manage users can change the status to in-progress. Once completed, the status can be changed to completed — this preserves historical record and prevents further edits to task details. Completed tasks can be closed by the project lead or project:manage users — closed tasks remain visible but inactive. An in-progress or open task can be edited by project leads (for their project) or project:manage users. A task status change always records a task history entry with timestamp, old status, new status, and who made the change. A closed task cannot be reopened or edited.

### Timer Session Transitions

An employee can start a timer for a project (task is optional) — the timer enters active status and records the start timestamp. While active, the employee can edit the description or assign a different project/task. The employee can stop the timer — a timelog is created with the duration rounded to the nearest minute and the timer session ends. The employee can discard the timer — no timelog is created and the session ends. An employee can have at most one active timer at a time — starting a new timer automatically ends any existing active timer. If an employee forgets to stop the timer, it continues running indefinitely until manually stopped or discarded.

### Employee Status Transitions

An employee starts with active status. Users with employee:manage permission can deactivate an employee — the employee loses the ability to log time or submit timesheets, but historical data (timelogs, timesheets) is preserved. A deactivated employee can be reactivated by users with employee:manage permission — the employee regains full access. An employee's status is always either active or deactivated — no other states are allowed. Deactivation does not remove the employee record or affect contracts and timelogs.