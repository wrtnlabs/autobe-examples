**hrmTimeTracking — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Each organization requires a name, currency, timezone, and fiscal start month when created. The description and logo image are optional fields. The currency must be a valid ISO currency code such as USD, EUR, or KRW. The fiscal start month determines when the organization's financial year begins. An organization can only be deleted if all pending timesheets are resolved as either approved or rejected. Additionally, there must be no active employee contracts for deletion to proceed. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account remains intact after organization deletion but loses association with that organization.

### Organization Creation Fields

THE system SHALL require an organization name when creating a new organization.

THE system SHALL require a currency selection when creating a new organization.

THE system SHALL validate that the currency is a valid ISO currency code such as USD, EUR, or KRW.

THE system SHALL require a timezone selection when creating a new organization.

THE system SHALL require a fiscal start month when creating a new organization.

THE system SHALL allow an optional description for the organization.

THE system SHALL allow an optional logo image for the organization.

If a required field is missing during organization creation, THE system SHALL reject the creation request.

If an invalid currency code is provided, THE system SHALL reject the creation request.

### Organization Deletion Prerequisites

THE system SHALL allow organization deletion only when all prerequisites are satisfied.

THE system SHALL require all pending timesheets to be resolved before allowing organization deletion.

A resolved timesheet is defined as a timesheet with a status of either approved or rejected.

THE system SHALL require no active employee contracts to exist before allowing organization deletion.

If any timesheet has a status other than approved or rejected, THE system SHALL reject the deletion request.

If any employee contract has no end date or an end date in the future, THE system SHALL reject the deletion request.

THE system SHALL only allow organization owners to initiate organization deletion.

### Organization Deletion Effects

When an organization is deleted, THE system SHALL permanently delete all employees associated with that organization.

When an organization is deleted, THE system SHALL permanently delete all projects associated with that organization.

When an organization is deleted, THE system SHALL permanently delete all tasks associated with that organization.

When an organization is deleted, THE system SHALL permanently delete all timelogs associated with that organization.

When an organization is deleted, THE system SHALL permanently delete all timesheets associated with that organization.

THE system SHALL preserve the organization owner's user account after organization deletion.

THE system SHALL remove the association between the owner's user account and the deleted organization.

The owner's user account remains available for use with other organizations the user belongs to.

## User Rules

Each user account must have a unique email address and a password. The display name is required while the phone number and avatar image are optional. A user profile is shared globally across all organizations the user belongs to. A user can belong to multiple organizations simultaneously. Users can delete their account only if they are not the sole owner of any organization. If a user is the sole owner of an organization, they must either transfer ownership to another member or delete the organization before deleting their account. When a user deletes their account, their employee records in other organizations are marked as deactivated rather than deleted. This preserves historical data integrity across the platform.

### User Account Registration Rules

THE system SHALL require each user account to have a unique email address.

IF a user attempts to register with an email address that already exists in the system, THEN THE system SHALL reject the registration request.

THE system SHALL require each user account to have a password.

THE system SHALL store passwords in a hashed format.

THE system SHALL require a display name for each user account.

### User Profile Field Rules

THE system SHALL require the following user profile fields: display name.

THE system SHALL allow the following user profile fields to be optional: phone number, avatar image.

THE system SHALL permit users to update their display name, phone number, and avatar image at any time.

THE system SHALL allow a user to omit the phone number and avatar image without preventing account creation or profile updates.

### Global Profile Sharing Rules

THE system SHALL maintain a single global profile for each user.

THE system SHALL share the user's global profile across all organizations the user belongs to.

WHEN a user updates their profile in any organization context, THE system SHALL reflect that update across all organizations the user belongs to.

THE system SHALL NOT maintain separate profile information per organization for the same user.

### Multi-Organization Membership Rules

THE system SHALL allow a user to belong to multiple organizations simultaneously.

WHEN a user belongs to multiple organizations, THE system SHALL require the user to select an organization context after logging in.

THE system SHALL allow users to switch between organizations without logging out.

WHEN a user switches organizations, THE system SHALL scope all subsequent actions to the selected organization.

### Account Deletion Rules

IF a user is the sole owner of an organization, THEN THE system SHALL NOT allow the user to delete their account until ownership is transferred or the organization is deleted.

WHEN a user deletes their account, THE system SHALL mark the user's employee records in all other organizations as deactivated.

THE system SHALL NOT delete the user's historical data (timelogs, timesheets) when an account is deleted.

THE system SHALL preserve historical data integrity when a user account is deleted.

IF a user is not the sole owner of any organization, THEN THE system SHALL allow the user to delete their account.

## Role Rules

Each role must have a name and a set of permissions. The system provides three built-in roles that cannot be deleted: Owner, Manager, and Employee. The Owner role has full access to all features and can manage roles and members. The Manager role can manage employees, projects, approve timesheets, and view reports. The Employee role allows time tracking, timesheet submission, and viewing own data. Organization owners can create custom roles with specific permissions from the available permission set. Each custom role can grant permissions such as organization management, employee management, project management, time management, timesheet approval, and report viewing. Custom roles can be deleted only if no employees are currently assigned to them. Each employee in an organization is assigned exactly one role at any given time.

### Role Name and Permission Requirements

THE system SHALL require each role to have a name.

THE system SHALL require each role to have a set of permissions.

THE system SHALL reject creation of a role if the name is not provided.

THE system SHALL reject creation of a role if no permissions are specified.

IF a role name is provided, THEN THE system SHALL accept the role name as valid.

IF one or more permissions are selected from the available permission set, THEN THE system SHALL accept the permission selection as valid.

### Built-In Role Definitions

THE system SHALL provide three built-in roles: Owner, Manager, and Employee.

THE system SHALL grant the Owner role full access to all features, including the ability to manage roles and members.

THE system SHALL grant the Manager role the ability to manage employees, manage projects, approve timesheets, and view reports.

THE system SHALL grant the Employee role the ability to track time, submit timesheets, and view their own data.

THE system SHALL include these built-in roles in every organization upon creation.

THE system SHALL NOT allow modification of the permission sets for built-in roles.

### Built-In Role Immutability

THE system SHALL NOT allow deletion of the Owner role.

THE system SHALL NOT allow deletion of the Manager role.

THE system SHALL NOT allow deletion of the Employee role.

IF a user attempts to delete a built-in role, THEN THE system SHALL reject the request.

IF a user attempts to rename a built-in role, THEN THE system SHALL reject the request.

IF a user attempts to modify the permissions of a built-in role, THEN THE system SHALL reject the request.

### Custom Role Creation

THE system SHALL allow organization owners to create custom roles.

WHEN a custom role is created, THE system SHALL require a name for the role.

WHEN a custom role is created, THE system SHALL require selection of one or more permissions from the available permission set.

THE system SHALL allow organization owners to edit custom roles.

WHEN a custom role is edited, THE system SHALL allow modification of the role name and permission set.

THE system SHALL allow organization owners to assign any combination of available permissions to a custom role.

### Available Permissions

THE system SHALL provide the following permissions for role assignment:

- Organization management permission (`org:manage`) that allows editing organization settings
- Employee management permission (`employee:manage`) that allows adding, editing, and deactivating employees
- Employee viewing permission (`employee:view`) that allows viewing the employee list and details
- Project management permission (`project:manage`) that allows creating, editing, and deleting projects and tasks
- Project viewing permission (`project:view`) that allows viewing projects and tasks
- Time management permission (`time:manage`) that allows editing or deleting any employee's timelogs
- Timesheet approval permission (`time:approve`) that allows approving or rejecting timesheets
- Time viewing permission (`time:view_all`) that allows viewing all employees' timelogs and timesheets
- Report viewing permission (`report:view`) that allows viewing organization reports

THE system SHALL NOT allow assignment of permissions outside of this defined set.

### Custom Role Deletion Constraints

THE system SHALL NOT allow deletion of a custom role if any employees are currently assigned to that role.

IF a custom role has one or more employees assigned to it, THEN THE system SHALL reject deletion of that role.

WHEN no employees are assigned to a custom role, THE system SHALL allow organization owners to delete that role.

IF a user attempts to delete a custom role with assigned employees, THEN THE system SHALL reject the request and indicate that employees must be reassigned first.

### Single Role Assignment Per Employee

THE system SHALL assign exactly one role to each employee in an organization.

THE system SHALL NOT allow an employee to have multiple roles simultaneously within the same organization.

WHEN a role is assigned to an employee, THE system SHALL replace any previously assigned role for that employee.

IF a new role is assigned to an employee who already has a role, THEN THE system SHALL update the employee's role to the newly assigned role.

Users with employee management permission SHALL be able to change the role assignment for any employee.

## Employee Rules

Each employee record must reference a user account and have an employment type. The employment type must be one of: full-time, part-time, contractor, or intern. The department and position fields are optional. Each employee must be assigned exactly one role within the organization. An employee status can be either active or deactivated. Deactivated employees cannot log time or submit timesheets. Historical data for deactivated employees, including timelogs and timesheets, is preserved in the system. Deactivated employees can be reactivated to restore their access. The employee list supports filtering by department, employment type, and status. Employees can be searched by name in the list view. The employee list is paginated for efficient browsing.

### Employee Record Requirements

THE SYSTEM SHALL require each employee record to reference a user account.

THE SYSTEM SHALL require an employment type for each employee.

THE SYSTEM SHALL accept only the following employment type values: full-time, part-time, contractor, or intern.

THE SYSTEM SHALL permit the department field to be optional.

THE SYSTEM SHALL permit the position field to be optional.

### Employee Role Rules

THE SYSTEM SHALL require each employee to be assigned exactly one role within the organization.

THE SYSTEM SHALL prohibit an employee from being assigned multiple roles simultaneously.

### Employee Status Rules

THE SYSTEM SHALL allow only the following status values for an employee: active or deactivated.

WHILE an employee is deactivated, THE SYSTEM SHALL prevent them from logging time.

WHILE an employee is deactivated, THE SYSTEM SHALL prevent them from submitting timesheets.

THE SYSTEM SHALL preserve all historical data for deactivated employees, including timelogs and timesheets.

WHEN a deactivated employee is reactivated, THE SYSTEM SHALL restore their ability to log time and submit timesheets.

### Employee List Capabilities

THE SYSTEM SHALL provide filtering of the employee list by the following criteria: department, employment type, and status.

THE SYSTEM SHALL provide search functionality within the employee list by name.

THE SYSTEM SHALL provide pagination for the employee list.

## Contract Rules

Each contract requires a start date, pay rate, and working hours per week. The end date is optional; a null end date indicates an ongoing contract. Only one contract per employee can be active at any time. The pay period must be one of: hourly, daily, weekly, or monthly. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts. Past contracts are immutable and serve as historical records that cannot be edited. Only the current active contract can be modified. Employees can view their own contracts. Users with employee view permission can view any employee's contracts. The pay rate must be a numeric value representing the compensation amount.

### Required Contract Fields

THE system SHALL require each contract to have a start date.

THE system SHALL require each contract to have a pay rate.

THE system SHALL require each contract to have working hours per week.

THE system SHALL require each contract to have a pay period.

IF a contract is created without a start date, THEN THE system SHALL reject the request.

IF a contract is created without a pay rate, THEN THE system SHALL reject the request.

IF a contract is created without working hours per week, THEN THE system SHALL reject the request.

IF a contract is created without a pay period, THEN THE system SHALL reject the request.

### Optional Contract Fields

THE system SHALL allow a contract to have an optional end date.

THE system SHALL allow a contract to have optional notes.

IF an end date is not provided, THEN THE system SHALL store the end date as null.

IF notes are not provided, THEN THE system SHALL store the notes as null or empty.

### Pay Period Options

THE system SHALL accept only the following pay period values: hourly, daily, weekly, or monthly.

IF a pay period value is not one of the allowed options, THEN THE system SHALL reject the request.

### Ongoing Contract Indication

THE system SHALL interpret a null end date as an ongoing contract with no defined end date.

WHEN a contract has a null end date, THE system SHALL consider the contract as currently active (subject to the single active contract rule).

### Single Active Contract Rule

THE system SHALL allow only one active contract per employee at any time.

IF an attempt is made to create a new active contract for an employee who already has an active contract, THEN THE system SHALL automatically end the existing active contract.

THE system SHALL consider a contract active if its end date is null or if the current date falls between the start date and end date inclusive.

### Automatic Contract Termination

WHEN a new contract is created for an employee who has an existing active contract, THE system SHALL automatically set the existing contract's end date to the day before the new contract's start date.

THE system SHALL perform this automatic termination without requiring additional user action.

### Past Contract Immutability

THE system SHALL prevent editing of past contracts.

A contract SHALL be considered past if its end date is before the current date.

IF an attempt is made to edit a past contract, THEN THE system SHALL reject the request.

Past contracts SHALL serve as immutable historical records.

### Active Contract Editability

THE system SHALL allow editing of the current active contract.

Users with employee management permission SHALL be able to modify the active contract's details.

IF an attempt is made to edit a contract that is not the current active contract, THEN THE system SHALL reject the request.

### Contract Viewing Permissions

THE system SHALL allow employees to view their own contracts.

Users with employee view permission SHALL be able to view any employee's contracts.

IF a user without employee view permission attempts to view another employee's contracts, THEN THE system SHALL reject the request.

### Pay Rate Validation

THE system SHALL require the pay rate to be a numeric value.

THE system SHALL accept the pay rate as a number representing the compensation amount.

IF a pay rate is not a valid numeric value, THEN THE system SHALL reject the request.

### Working Hours Per Week Validation

THE system SHALL require working hours per week to be provided as an integer value.

THE system SHALL accept values representing the expected weekly working hours (e.g., 40 for full-time).

IF working hours per week is not provided, THEN THE system SHALL reject the request.

IF working hours per week is not a valid integer, THEN THE system SHALL reject the request.

## Department Rules

Each department requires a name and optionally a description. Departments can have an optional parent department, allowing one level of nesting. This means a department can be a sub-department of another department, but sub-departments cannot have their own sub-departments. When a department is deleted, employees assigned to that department have their department field set to null. Deleting a department does not delete or deactivate employees. All employees can view the list of departments regardless of their role. The department assignment on an employee record is optional, meaning employees can exist without being assigned to any department.

### Required Department Fields

THE system SHALL require a name for each department.

THE system SHALL associate each department with exactly one organization.

IF a department is created without a name, THEN THE system SHALL reject the request.

### Optional Department Fields

WHERE a description is provided for a department, THE system SHALL store it.

WHERE a parent department is specified, THE system SHALL store the parent reference.

IF no description is provided, THEN THE system SHALL create the department without a description.

### Parent Department and Nesting Constraints

WHERE a parent department is assigned to a department, THE system SHALL limit nesting to exactly one level.

IF a parent department is itself a sub-department, THEN THE system SHALL reject the assignment.

THE system SHALL NOT allow sub-departments to have their own sub-departments.

WHEN a department is assigned a parent, THE system SHALL validate that the parent department is a top-level department within the same organization.

### Department Deletion Effects

WHEN a department is deleted, THE system SHALL set the department field to null for all employees assigned to that department.

THE system SHALL NOT delete or deactivate any employees when their department is deleted.

THE system SHALL preserve all employee records and their associated data when a department is deleted.

THE system SHALL allow departments to be deleted regardless of the number of employees assigned to them.

### Department Assignment on Employees

THE system SHALL allow employees to exist without being assigned to any department.

IF an employee's department is deleted, THEN THE system SHALL update the employee record to have no department assignment.

THE system SHALL NOT require department assignment during employee creation or editing.

### Department List Visibility

THE system SHALL allow all employees within an organization to view the list of departments.

THE system SHALL NOT restrict department list visibility based on role or permissions.

THE system SHALL scope department list visibility to the currently selected organization context.

## Project Rules

Each project requires a name and a color code for display purposes. The description, budget hours, start date, and end date are optional fields. Project status must be one of: active, archived, or completed. Only active projects can receive new timelogs. Archived and completed projects cannot have new timelogs added to them. Existing timelogs on archived or completed projects are preserved and remain accessible. A project can only be deleted if it has no timelogs associated with it. The budget hours field represents the total estimated hours for the project. The project list is paginated and can be filtered by status. Projects without budget hours are excluded from budget utilization reports.

### Project Field Requirements

THE system SHALL require a name for each project.

THE system SHALL require a color code for each project for UI display purposes.

THE system SHALL allow an optional description for projects.

THE system SHALL allow optional budget hours representing the total estimated hours for the project.

THE system SHALL allow an optional start date for projects.

THE system SHALL allow an optional end date for projects.

### Project Status Values

THE system SHALL support three project status values: active, archived, and completed.

THE system SHALL set newly created projects to active status by default.

WHEN a project status is changed from active to archived or completed, THE system SHALL preserve all existing timelogs associated with that project.

WHEN a project status is changed from active to archived or completed, THE system SHALL maintain the project as viewable and its historical timelog data SHALL remain accessible.

### Active Project Timelog Rules

WHILE a project is in active status, THE system SHALL allow new timelogs to be added to the project.

THE system SHALL permit employees assigned to an active project to log time against it.

THE system SHALL allow tasks to be created and modified within active projects by authorized users.

### Archived and Completed Project Restrictions

WHILE a project is in archived status, THE system SHALL NOT allow new timelogs to be created for that project.

WHILE a project is in completed status, THE system SHALL NOT allow new timelogs to be created for that project.

WHILE a project is in archived status, THE system SHALL NOT allow new tasks to be created within that project.

WHILE a project is in completed status, THE system SHALL NOT allow new tasks to be created within that project.

WHILE a project is in archived or completed status, THE system SHALL preserve and allow viewing of all existing timelogs previously logged against that project.

WHILE a project is in archived or completed status, THE system SHALL preserve and allow viewing of all existing tasks within that project.

### Project Deletion Constraints

IF a project has one or more timelogs associated with it, THEN THE system SHALL reject the deletion request.

IF a project has no timelogs associated with it, THEN THE system SHALL allow the project to be deleted.

WHEN a project is deleted, THE system SHALL permanently remove the project and all associated tasks.

WHEN a project is deleted, THE system SHALL remove all project member assignments for that project.

### Budget Hours and Reporting

THE system SHALL allow budget hours to be specified as an optional numeric value representing the total estimated hours for the project.

WHEN generating a project budget report, THE system SHALL include only projects that have budget hours specified.

IF a project does not have budget hours defined, THEN THE system SHALL exclude that project from budget utilization reports.

THE system SHALL calculate the percentage of budget consumed by comparing actual logged hours against the budget hours for reporting purposes.

### Project List Browsing Rules

THE system SHALL provide a paginated list of projects.

THE system SHALL allow filtering the project list by status.

THE system SHALL allow users with project viewing permission to access the project list.

THE system SHALL display projects across all statuses in the list by default, subject to applied filters.

## ProjectMember Rules

Each project membership consists of an employee, a project, and an assigned role. The project member role must be either member or project-lead. An employee can be assigned to multiple projects simultaneously. Project leads have the ability to manage tasks within their assigned project. Users with project management permission can assign and remove employees from projects. Employees can view the list of projects they are assigned to. The project membership determines which projects an employee can log time against. Only employees assigned to a project can create timelogs for that project. When assigning a task to an employee, the employee must be a member of the project.

### Project Membership Components

THE SYSTEM SHALL require each project membership to consist of an employee reference, a project reference, and an assigned role.

THE SYSTEM SHALL ensure that the employee referenced in a project membership exists and is active within the organization.

THE SYSTEM SHALL ensure that the project referenced in a project membership exists and has a status of active.

THE SYSTEM SHALL prevent creation of a project membership if the employee is already assigned to the same project.

THE SYSTEM SHALL require the assigned role to be one of the defined project member role values.

### Project Member Role Options

THE SYSTEM SHALL provide exactly two project member role options: member and project-lead.

THE SYSTEM SHALL assign the member role by default when an employee is added to a project unless a different role is explicitly specified.

THE SYSTEM SHALL allow the assigned role to be changed from member to project-lead or from project-lead to member.

THE SYSTEM SHALL distinguish between member and project-lead roles for task management permission within the project.

THE SYSTEM SHALL preserve the assigned role when the employee's organization-level role changes.

### Multi-Project Assignment

THE SYSTEM SHALL allow an employee to be assigned to multiple projects simultaneously.

THE SYSTEM SHALL not impose a maximum limit on the number of projects an employee can be assigned to.

THE SYSTEM SHALL allow an employee to hold different roles across different projects (member in one, project-lead in another).

THE SYSTEM SHALL track each project membership independently regardless of the employee's other project memberships.

THE SYSTEM SHALL not automatically remove an employee from one project when assigning them to another project.

### Project-Lead Task Management

WHILE an employee has the project-lead role for a project, THE SYSTEM SHALL allow that employee to create tasks within that project.

WHILE an employee has the project-lead role for a project, THE SYSTEM SHALL allow that employee to edit any task within that project.

THE SYSTEM SHALL not allow a member (non project-lead) to create or edit tasks within their assigned project.

THE SYSTEM SHALL revoke task management permissions immediately when an employee's role is changed from project-lead to member.

THE SYSTEM SHALL grant task management permissions immediately when an employee's role is changed from member to project-lead.

### Project Assignment Permissions

IF a user has the project:manage permission, THEN THE SYSTEM SHALL allow that user to assign employees to projects within the organization.

IF a user has the project:manage permission, THEN THE SYSTEM SHALL allow that user to remove employees from projects within the organization.

IF a user has the project:manage permission, THEN THE SYSTEM SHALL allow that user to change the assigned role of any project member.

THE SYSTEM SHALL not allow an employee to assign themselves to a project.

THE SYSTEM SHALL not allow a project-lead to assign or remove members from their project unless they have the project:manage permission.

### Project Visibility for Employees

THE SYSTEM SHALL allow employees to view the list of projects they are assigned to.

THE SYSTEM SHALL display the employee's assigned role for each project in the list.

THE SYSTEM SHALL not display projects to employees who are not members of those projects, unless they have project:view permission.

THE SYSTEM SHALL allow employees to view project details for projects they are assigned to.

### Timelog Project Requirement

IF an employee attempts to create a timelog, THE SYSTEM SHALL verify that the employee is assigned to the selected project.

IF an employee is not a member of the selected project, THEN THE SYSTEM SHALL reject the timelog creation request.

THE SYSTEM SHALL allow employees to log time only to projects where they have an active membership.

THE SYSTEM SHALL not allow timelogs to be created for archived or completed projects, even if the employee was previously a member.

THE SYSTEM SHALL preserve the project reference in historical timelogs even if the employee's project membership is later removed.

### Task Assignment Constraint

IF a task is being assigned to an employee, THE SYSTEM SHALL verify that the employee is a member of the project that contains the task.

IF the employee is not a member of the project containing the task, THEN THE SYSTEM SHALL reject the task assignment.

THE SYSTEM SHALL allow tasks to remain unassigned (no assigned employee) regardless of project membership.

THE SYSTEM SHALL not automatically remove an employee from a task when their project membership is removed, but the assignment reference remains for historical tracking.

## Task Rules

Each task requires a title. The description, estimated hours, due date, and assigned employee are optional fields. Task status must be one of: open, in-progress, completed, or closed. Task priority must be one of: low, medium, high, or urgent. A task can have an optional parent task, allowing one level of nesting for subtasks. Subtasks cannot have their own subtasks. If a task is assigned to an employee, that employee must be a member of the project. Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, or creation date. Employees can only view tasks in projects they are assigned to. Project leads can edit tasks within their assigned project.

### Task Field Requirements

Each task must have a title, which is required. The following fields are optional: description, estimated hours, due date, and assigned employee. The status and priority fields are required and must be set when a task is created.

If a task is assigned to an employee, that employee must be a member of the project that contains the task. Tasks cannot be assigned to employees who are not project members.

### Task Status Values

Task status must be one of the following values:

- **Open**: The task has been created but work has not yet begun
- **In-Progress**: Work on the task is actively underway
- **Completed**: The work defined by the task has been finished
- **Closed**: The task is no longer active and will not be worked on

All status values are mutually exclusive; a task can only have one status at any given time. Status changes are recorded in the task history with the timestamp, old status, new status, and the user who made the change.

### Task Priority Levels

Task priority must be one of the following values:

- **Low**: The task has minimal urgency and can be addressed when convenient
- **Medium**: The task has normal urgency and should be addressed in a timely manner
- **High**: The task is important and should be prioritized over medium and low priority tasks
- **Urgent**: The task requires immediate attention and should be addressed as soon as possible

Priority levels help organize work and inform employees which tasks to focus on first.

### Subtask Nesting Constraint

A task can have an optional parent task, allowing one level of nesting for subtasks. This enables breaking down complex tasks into smaller, manageable pieces.

Subtasks cannot have their own subtasks. The nesting hierarchy is strictly limited to one level: a parent task can have multiple subtasks, but those subtasks cannot be parents to other tasks. This constraint prevents deeply nested task structures and maintains clarity in task organization.

### Task Filtering Options

Tasks can be filtered by the following criteria:

- **Status**: Filter to show only tasks with a specific status (open, in-progress, completed, or closed)
- **Priority**: Filter to show only tasks with a specific priority level (low, medium, high, or urgent)
- **Assigned employee**: Filter to show only tasks assigned to a specific employee

Multiple filter criteria can be combined to narrow down the task list. For example, a user can filter to show only high-priority tasks that are currently in-progress.

### Task Sorting Options

Tasks can be sorted by the following criteria:

- **Due date**: Tasks are ordered by their due date, with tasks having earlier due dates appearing first
- **Priority**: Tasks are ordered by priority level, with urgent tasks appearing first, followed by high, medium, and low
- **Creation date**: Tasks are ordered by when they were created, with most recently created tasks appearing first or last depending on the sort direction

Sorting helps employees organize their task view according to their workflow preferences.

### Task Visibility and Edit Permissions

Employees can only view tasks in projects they are assigned to. Employees who are not members of a project cannot see any tasks within that project.

Project leads can edit tasks within their assigned project. This includes modifying task details such as title, description, status, priority, estimated hours, due date, and assigned employee.

Users with `project:manage` permission can edit any task across all projects in the organization, regardless of whether they are assigned to the project as a member.

## TaskHistory Rules

Each task history entry records a task status change. Every entry must include a timestamp, the old status, the new status, and the user who made the change. Task history entries are created automatically when a task status changes. The history provides an audit trail for tracking task progress. Task history entries are immutable once created and serve as a permanent record. Multiple history entries can exist for a single task as it progresses through different statuses. The old and new status values must be valid task status values from the defined set. Users cannot manually create or delete task history entries.

### Task History Entry Requirements

THE system SHALL record a timestamp, the old status, the new status, and the user who made the change for every task history entry.

THE system SHALL require all four fields (timestamp, old status, new status, user) to be present in each task history entry.

THE system SHALL reject any task history entry that is missing any of the required fields.

### Automatic Status Change Recording

WHEN a task status changes, THE system SHALL automatically create a new task history entry.

THE system SHALL create the history entry at the exact moment the status change occurs.

THE system SHALL capture the old status value before the change and the new status value after the change in the same history entry.

### Timestamp Requirement

THE system SHALL record the exact date and time when each task status change occurs.

THE system SHALL use the timestamp to establish the chronological order of status changes for a task.

THE system SHALL ensure the timestamp reflects when the status change was performed, not when the history entry was stored.

### Old and New Status Tracking

THE system SHALL record both the previous status and the new status for every task history entry.

THE system SHALL preserve the exact status values as they existed at the time of the change.

IF the old status or new status is not a valid task status value, THEN THE system SHALL reject the history entry.

Valid task status values are: open, in-progress, completed, and closed.

### User Identification in History

THE system SHALL record the user who performed each task status change in the history entry.

THE system SHALL link the history entry to the specific user account that initiated the status change.

THE system SHALL preserve the user identification even if the user's role changes or the user leaves the organization.

### Audit Trail Purpose

THE system SHALL maintain task history entries to provide an audit trail for tracking task progress.

THE system SHALL allow users to view the complete history of status changes for any task.

THE system SHALL present history entries in chronological order to show the progression of task status over time.

### History Entry Immutability

THE system SHALL prevent any modification to task history entries after they are created.

THE system SHALL prevent deletion of task history entries.

THE system SHALL preserve all task history entries as permanent records regardless of subsequent task changes.

### Multiple History Entries per Task

THE system SHALL allow multiple task history entries to exist for a single task.

WHEN a task undergoes multiple status changes, THE system SHALL create a separate history entry for each change.

THE system SHALL maintain all history entries for a task as a complete chronological record of its status progression.

### Protected History Entries

THE system SHALL prevent users from manually creating task history entries.

THE system SHALL prevent users from manually deleting task history entries.

THE system SHALL only create task history entries through automatic recording of status changes performed through the task management interface.

THE system SHALL enforce these protections regardless of user role or permission level.

## Timelog Rules

Each timelog requires a date, duration in minutes, and a project. The description and task are optional fields. The billable flag defaults to true and indicates whether the time is chargeable. The project must be one that the employee is assigned to. If a task is specified, it must belong to the selected project. Employees can only create timelogs for themselves. A timelog cannot be edited if it is part of an approved timesheet. A timelog cannot be deleted if it is part of any submitted or approved timesheet. Timelogs are paginated and can be filtered by date range, project, task, and billable status. The duration is measured in minutes as an integer value.

### Timelog Field Requirements

THE system SHALL require the date field when creating a timelog.
THE system SHALL require the duration in minutes field when creating a timelog.
THE system SHALL require the project field when creating a timelog.
THE system SHALL accept an optional description field when creating a timelog.
THE system SHALL accept an optional task field when creating a timelog.
THE system SHALL set the billable flag to true by default when creating a timelog.
THE system SHALL allow the billable flag to be set to false if specified by the employee.

### Project Assignment Validation

THE system SHALL validate that the selected project is one the employee is assigned to when creating a timelog.
IF the selected project is not assigned to the employee, THEN THE system SHALL reject the timelog creation.
THE system SHALL validate that any specified task belongs to the selected project when creating a timelog.
IF a task is specified that does not belong to the selected project, THEN THE system SHALL reject the timelog creation.

### Self-Only Timelog Creation

THE system SHALL allow employees to create timelogs only for themselves.
IF an employee attempts to create a timelog for another employee, THEN THE system SHALL reject the request.

### Timelog Modification Restrictions

THE system SHALL prevent editing of timelogs that are part of an approved timesheet.
IF an employee attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the request.
THE system SHALL prevent deletion of timelogs that are part of any submitted or approved timesheet.
IF an employee attempts to delete a timelog that is part of a submitted or approved timesheet, THEN THE system SHALL reject the request.

### Duration Specification

THE system SHALL record timelog duration as an integer value measured in minutes.
THE system SHALL require a positive integer for the duration field.

### Timelog Browsing

THE system SHALL provide a paginated list of timelogs.
THE system SHALL allow timelogs to be filtered by date range.
THE system SHALL allow timelogs to be filtered by project.
THE system SHALL allow timelogs to be filtered by task.
THE system SHALL allow timelogs to be filtered by billable status.

## Timesheet Rules

Each timesheet represents a collection of timelogs for a specific week from Monday to Sunday. The week start date must be a Monday and the week end date must be the corresponding Sunday. Timesheet status must be one of: draft, submitted, approved, or rejected. A timesheet cannot be submitted if it contains no timelogs. Only one timesheet per employee per week can be in submitted or approved status. When a timesheet is approved, all included timelogs become locked and cannot be edited or deleted. When a timesheet is rejected, a reason must be provided and the timesheet returns to draft status. Rejected timesheets can be modified and resubmitted by the employee. The total hours field is calculated from the included timelogs. Submitted timesheets record the submission timestamp, and reviewed timesheets record the review timestamp and reviewer.

### Timesheet Week Definition

Each timesheet represents a collection of timelogs for a specific week. The week must start on Monday and end on the corresponding Sunday. The week start date must be a valid Monday date. The week end date must be the Sunday immediately following the week start date (6 days after). Week start date and week end date are both required fields. The week start date and week end date must be exactly 6 days apart. If the week start date is not a Monday, the timesheet is rejected. If the week end date does not correspond to the Sunday of that week, the timesheet is rejected.

### Timesheet Status Values

Each timesheet has a status that indicates its current state in the approval workflow. The status must be one of the following values: draft, submitted, approved, or rejected. A newly created timesheet starts with draft status. The status can only transition according to the approval workflow: draft can transition to submitted; submitted can transition to approved or rejected; rejected can transition back to draft; approved is a final state and cannot be changed. If an invalid status value is provided, the timesheet is rejected. If a status transition is attempted that does not follow the workflow, the operation is rejected.

### Timesheet Submission Rules

A timesheet cannot be submitted if it contains no timelogs. A timesheet must have at least one timelog to be eligible for submission. Only one timesheet per employee per week can have a status of submitted or approved. If an employee attempts to submit a timesheet for a week that already has a submitted or approved timesheet, the submission is rejected. When a timesheet is submitted, the submitted at timestamp is recorded. The submitted at timestamp is required when a timesheet transitions to submitted status. If the submitted at timestamp cannot be recorded, the submission is rejected.

### Timesheet Approval and Timelog Locking

When a timesheet is approved, all timelogs included in that timesheet become locked. Locked timelogs cannot be edited or deleted by the employee. Users with time:manage permission can edit or delete timelogs even if they are part of an approved timesheet. The lock applies only to timelogs included in the approved timesheet. Timelogs that were removed from a timesheet before approval remain unlocked. If a timelog is part of an approved timesheet and an employee attempts to edit or delete it, the operation is rejected with a message indicating the timelog is locked due to approved timesheet.

### Timesheet Rejection Rules

When a timesheet is rejected, a rejection reason must be provided. The rejection reason is a required text field when transitioning a timesheet to rejected status. If a rejection is attempted without providing a reason, the operation is rejected. When a timesheet is rejected, its status returns to draft. Rejected timesheets can be modified by the employee. The employee can add or remove timelogs from a rejected timesheet. The employee can resubmit a rejected timesheet after making modifications. The rejection reason is preserved and visible to the employee. When a timesheet is resubmitted, it goes through the same submission validation as a new submission.

### Timesheet Calculations and Tracking

The total hours field is calculated from the sum of all timelog durations included in the timesheet. Total hours is recalculated whenever timelogs are added to or removed from the timesheet. Total hours is a calculated field and cannot be manually set. The reviewed at timestamp is recorded when a timesheet is approved or rejected. The reviewed at timestamp is required when a timesheet transitions to approved or rejected status. The reviewed by field records the user who performed the approval or rejection. The reviewed by field is required when a timesheet transitions to approved or rejected status. If the reviewed at timestamp or reviewed by field cannot be recorded, the approval or rejection operation is rejected.

## Timer Rules

Each timer records a start timestamp, project, and optionally a task and description. An employee can have at most one active timer at any given time. Starting a timer requires selecting a project that the employee is assigned to. If a task is specified, it must belong to the selected project. Timers continue running indefinitely until manually stopped or discarded; there is no automatic stop mechanism. Stopping a timer creates a timelog with the duration calculated from elapsed time, rounded to the nearest minute. Discarding a timer removes it without creating any timelog. Employees can modify the description and project or task selection of a running timer. Employees can view their currently running timer if one exists.

### Timer Fields

THE timer SHALL record a start timestamp indicating when time tracking began.

THE timer SHALL be associated with a project that the employee is assigned to.

THE timer MAY be associated with a task from the selected project.

THE timer MAY include a description of the work being tracked.

### Single Active Timer Limit

THE system SHALL allow only one active timer per employee at any given time.

IF an employee attempts to start a new timer while one is already active, THEN the system SHALL reject the request.

### Timer Project and Task Selection

WHEN an employee starts a timer, THE system SHALL require selection of a project the employee is assigned to.

IF a task is specified for the timer, THEN the task SHALL belong to the selected project.

IF the selected project is not assigned to the employee, THEN the system SHALL reject the timer start request.

### Timer Duration Handling

THE system SHALL NOT automatically stop a timer regardless of how long it has been running.

WHEN an employee stops their timer, THE system SHALL create a timelog with the calculated duration.

THE system SHALL round the calculated duration to the nearest minute when creating a timelog from a stopped timer.

IF an employee discards their timer, THEN the system SHALL remove it without creating a timelog.

### Running Timer Editing

THE system SHALL allow employees to modify the description of their running timer.

THE system SHALL allow employees to change the project of their running timer to another project they are assigned to.

IF the project is changed, THE system SHALL allow the employee to update the task to one belonging to the new project.

IF a new task is specified after changing the project, THEN the task SHALL belong to the newly selected project.

### Timer Visibility

THE system SHALL allow employees to view their currently running timer if one exists.

IF an employee has an active timer, THEN the system SHALL display the start timestamp, project, task (if specified), and description (if provided).

## ActivityLog Rules

Each activity log entry records a significant action performed in the system. Every entry must include a timestamp, the user who performed the action, the action type, and the target entity. The details field is optional and provides additional context in a structured format. Action types include employee invitations, deactivations, reactivations, contract creation and editing, project lifecycle changes, task status changes, timesheet submissions and approvals, and role assignments. Activity log entries are created automatically by the system when significant actions occur. The entries are immutable and serve as a permanent audit trail. Users with organization management permission can view the full activity log. The activity log is paginated and can be filtered by action type, user, and date range.

### Activity Log Required Fields

THE system SHALL record a timestamp for every activity log entry indicating when the action occurred.

THE system SHALL record the user who performed the action for every activity log entry.

THE system SHALL record the action type for every activity log entry.

THE system SHALL record the target entity for every activity log entry, identifying what the action was performed on.

IF any required field is missing, THE system SHALL NOT create the activity log entry.

The required fields ensure complete traceability of all significant actions performed within an organization.

### Activity Log Optional Fields

THE system MAY include a details field in activity log entries to provide additional context about the performed action.

WHERE the details field is present, THE system SHALL store it in a structured format to enable consistent parsing and display.

The details field is optional and used when the basic action type and target entity do not fully describe what occurred.

### Action Types and Categories

THE system SHALL log the following action types related to employee management:
- Employee invited
- Employee deactivated
- Employee reactivated

THE system SHALL log the following action types related to contracts:
- Contract created
- Contract edited

THE system SHALL log the following action types related to projects:
- Project created
- Project archived
- Project completed
- Project deleted

THE system SHALL log the following action types related to tasks:
- Task status changed

THE system SHALL log the following action types related to timesheets:
- Timesheet submitted
- Timesheet approved
- Timesheet rejected

THE system SHALL log the following action types related to role assignments:
- Role assigned
- Role changed

IF an action type is not listed above, THE system SHALL NOT create an activity log entry for that action.

### Automatic Activity Log Creation

WHEN a significant action defined in the action types list occurs, THE system SHALL automatically create an activity log entry.

THE system SHALL create activity log entries without requiring any user action to initiate logging.

THE system SHALL populate all required fields automatically based on the action being performed.

THE system SHALL associate the activity log entry with the organization context in which the action occurred.

### Activity Log Entry Immutability

THE system SHALL NOT allow modification of any activity log entry after creation.

THE system SHALL NOT allow deletion of any activity log entry.

THE system SHALL preserve all activity log entries as a permanent audit trail for the organization.

IF a request is made to modify or delete an activity log entry, THE system SHALL reject the request.

This immutability ensures the integrity of the audit trail and prevents tampering with historical records.

### Activity Log Viewing Permission

THE system SHALL restrict activity log viewing to users with organization management permission.

Users without organization management permission SHALL NOT be able to view the activity log.

The activity log viewing is scoped to the currently selected organization context.

Users viewing the activity log SHALL only see entries from their currently selected organization.

### Activity Log Filtering Options

THE system SHALL allow filtering the activity log by action type.

THE system SHALL allow filtering the activity log by the user who performed the action.

THE system SHALL allow filtering the activity log by date range.

Multiple filters MAY be combined to narrow down results.

IF no filters are applied, THE system SHALL display all activity log entries for the organization.

### Activity Log Pagination

THE system SHALL paginate the activity log list.

THE system SHALL display a limited number of activity log entries per page.

THE system SHALL provide navigation controls to move between pages of activity log entries.

Pagination applies after any active filters are applied to the activity log.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### List Filtering

THE system SHALL provide filtering capabilities for list views to help users find specific records.

**Employee List Filtering**
THE system SHALL allow employees to filter the employee list by department, employment type, and status.
THE system SHALL allow employees to search the employee list by name.

**Project List Filtering**
THE system SHALL allow users to filter projects by status (active, archived, completed).

**Task List Filtering**
THE system SHALL allow users to filter tasks by status, priority, and assigned employee.

**Timelog Filtering**
THE system SHALL allow users to filter timelogs by date range, project, task, and billable status.

**Timesheet Filtering**
THE system SHALL allow users to filter timesheets by status and date range.

**Activity Log Filtering**
THE system SHALL allow users with org:manage permission to filter the activity log by action type, user, and date range.

When multiple filters are applied, THE system SHALL combine them using AND logic (showing only records matching all selected filters).

### List Sorting

THE system SHALL provide sorting capabilities to help users organize list views.

**Task List Sorting**
THE system SHALL allow users to sort tasks by due date, priority, or creation date.
THE system SHALL support both ascending and descending sort order for task lists.

For other lists, THE system SHALL provide a default sort order based on relevance or recency to ensure consistent user experience.

### List Pagination

THE system SHALL provide pagination for list views to manage large datasets efficiently.

**Paginated Lists**
THE system SHALL provide pagination for the following lists:
- Employee list
- Project list
- Timelog list
- Timesheet list
- Activity log list

When a list exceeds the page size limit, THE system SHALL display navigation controls allowing users to move between pages.
THE system SHALL preserve active filters and sort order when users navigate between pages.
THE system SHALL indicate the total number of records and current page position in paginated views.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Errors

When an organization owner attempts to delete an organization, the system validates deletion prerequisites before proceeding.

If any timesheets exist with status "submitted" (pending approval), the deletion request is rejected. The system displays a message indicating that all timesheets must be resolved (approved or rejected) before the organization can be deleted.

If any employee contracts have no end date (active ongoing contracts), the deletion request is rejected. The system displays a message indicating that all employee contracts must be ended before the organization can be deleted.

Upon successful deletion, all employees, projects, tasks, timelogs, and timesheets associated with the organization are permanently removed. The owner's user account remains but is no longer associated with any organization.

### User Account Deletion Errors

When a user attempts to delete their account, the system checks ownership status across all organizations.

If the user is the sole owner of any organization, the deletion request is rejected. The system requires the user to either transfer ownership to another member or delete the organization before deleting their account.

If the user has employee records in other organizations, those records are marked as "deactivated" status upon account deletion, preserving historical data while removing access.

### Role Deletion Errors

When an organization owner attempts to delete a custom role, the system checks for employee assignments.

If any employee is currently assigned to the role, the deletion request is rejected. The system displays a message indicating that the role cannot be deleted while employees are assigned to it.

The owner must first reassign all affected employees to a different role before the custom role can be deleted.

Built-in roles (Owner, Manager, Employee) cannot be deleted regardless of assignment status.

### Project Deletion Errors

When a user with project management permission attempts to delete a project, the system checks for associated timelogs.

If any timelog references the project, the deletion request is rejected. The system displays a message indicating that projects with recorded time entries cannot be deleted.

The user must first remove all timelogs associated with the project, or alternatively archive or complete the project to prevent new timelogs while preserving historical data.

### Timesheet Submission Errors

When an employee attempts to submit a timesheet, the system validates submission prerequisites.

If the timesheet contains no timelogs, the submission is rejected. The system displays a message indicating that a timesheet must include at least one timelog before submission.

If another timesheet for the same week (same Monday start date) already has status "submitted" or "approved", the submission is rejected. The system displays a message indicating that only one timesheet per week can be submitted for approval.

The employee must resolve the conflict by either withdrawing the existing timesheet or modifying the current one.

### Timelog Modification Errors

When an employee attempts to edit or delete a timelog, the system checks the timesheet status.

If the timelog is included in a timesheet with status "approved", the modification request is rejected. The system displays a message indicating that timelogs in approved timesheets cannot be modified.

If the timelog is included in a timesheet with status "submitted", the deletion request is rejected. The system displays a message indicating that the timesheet must be rejected or withdrawn before the timelog can be deleted.

Users with time management permission can override these restrictions and edit or delete timelogs regardless of timesheet status.

### Timer Operation Errors

When an employee attempts to start a timer, the system checks for existing active timers.

If the employee already has a running timer, the new timer start request is rejected. The system displays a message indicating that only one active timer is allowed per employee at a time.

The employee must stop or discard the existing timer before starting a new one.

### Task Assignment Errors

When a project lead or user with project management permission assigns a task to an employee, the system validates project membership.

If the selected employee is not a member of the project, the assignment is rejected. The system displays a message indicating that tasks can only be assigned to project members.

The user must first add the employee as a project member, or select a different employee who is already a project member.

### Authentication and Access Errors

When a user attempts to perform an action without appropriate permissions, the request is rejected.

If the user lacks the required permission for a specific operation, the system displays a message indicating insufficient access rights. The user is not allowed to proceed with the action.

If a deactivated employee attempts to log time or submit a timesheet, the request is rejected. The system displays a message indicating that deactivated employees cannot perform time tracking operations.

If a user attempts to access data from an organization they do not belong to, the request is rejected. All data access is strictly scoped to the user's current organization context.

### Invitation Processing Errors

When a user with employee management permission invites a new employee by email, the system processes the invitation.

If the invited email already has an account and is already a member of the organization, the invitation is rejected. The system displays a message indicating that the user is already an employee in this organization.

If a pending invitation already exists for the email address, the system may either reject the duplicate or update the existing invitation depending on business preference.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image File Validation

THE system SHALL accept image file uploads for organization logos and user avatars.

Organization logo images and user avatar images are optional fields.

THE system SHALL allow users to upload an image file for their organization's logo.
THE system SHALL allow users to upload an image file for their profile avatar.

If no logo image is provided for an organization, the organization record is created without a logo.
If no avatar image is provided for a user profile, the user profile is created without an avatar.

Users with org:manage permission can upload and update the organization logo image.
Users can upload and update their own avatar image.

If a user uploads a new avatar image, the previous avatar image is replaced.
If an organization uploads a new logo image, the previous logo image is replaced.

### Image Content Type Restrictions

THE system SHALL accept files identified as images for logo and avatar uploads.

The user did not specify exact image format restrictions (such as JPEG, PNG, GIF, or WebP).
The user did not specify file size limits for image uploads.
The user did not specify dimension requirements for images.

If a non-image file is uploaded, THE system SHALL reject the upload.

### Image File Retention

The user did not specify retention periods for organization logo images or user avatar images.

When an organization is deleted, all associated data including the logo image is permanently deleted.
When a user account is deleted, the user's avatar image is removed.

If a user updates their avatar image, the previous image is replaced.
If an organization updates its logo image, the previous image is replaced.

### File Validation Error Handling

If an invalid file is uploaded for an organization logo or user avatar, THE system SHALL reject the request and notify the user.

If a user attempts to upload a file without the required permission (org:manage for organization logo), THE system SHALL reject the request.

If a file upload fails due to system issues, THE system SHALL notify the user and allow them to retry.

The user did not specify whether virus scanning is required for uploaded files. If virus scanning is implemented, infected files SHALL be rejected and the user notified.