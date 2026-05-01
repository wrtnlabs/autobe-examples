**erpHrm — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Every organization must have a name at minimum; the description, logo image, currency, timezone, and fiscal start month are optional but strongly recommended for proper operation. The currency must be a valid ISO 4217 currency code such as USD, EUR, or KRW. The timezone must be a recognized IANA timezone identifier. The fiscal start month must be an integer from 1 (January) through 12 (December). An organization cannot be deleted if any timesheets within it are still in a pending state — all must be fully resolved as either approved or rejected before deletion can proceed. Additionally, an organization cannot be deleted while any active employee contracts exist; all contracts must be ended first. When an organization is deleted, all associated data — employees, projects, tasks, timelogs, and timesheets — are permanently removed, but the owner's user account itself survives and simply loses its association to the deleted organization. Only users with the Owner role or the org:manage permission may edit organization settings.

### Organization Creation Validation

### Organization Name

THE system SHALL require every organization to have a name at the time of creation. The name must not be empty or consist solely of whitespace characters.

IF the organization name is missing or blank, THEN THE system SHALL reject the creation request and indicate that a name is required.

### Currency Code

THE system SHALL require the organization currency to be a valid ISO 4217 currency code whenever a currency is provided. Allowed codes include USD, EUR, KRW, and any other code recognized by the ISO 4217 standard.

IF a currency code is provided that is not a valid ISO 4217 code, THEN THE system SHALL reject the request and indicate that a valid currency code is required.

### Timezone Identifier

THE system SHALL require the organization timezone to be a recognized IANA timezone identifier (e.g., "America/New_York", "Asia/Seoul", "Europe/London") whenever a timezone is provided.

IF a timezone identifier is provided that is not recognized in the IANA timezone database, THEN THE system SHALL reject the request and indicate that a valid timezone is required.

### Fiscal Start Month

THE system SHALL require the fiscal start month to be an integer between 1 (representing January) and 12 (representing December) inclusive whenever a fiscal start month is provided.

IF a fiscal start month is provided that falls outside the range 1 through 12, THEN THE system SHALL reject the request and indicate that the value must be between 1 and 12.

### Organization Settings Editing

### Editing Permissions

THE system SHALL allow only users who hold the Owner role or possess the `org:manage` permission in the organization to edit organization settings.

IF a user without the Owner role and without the `org:manage` permission attempts to edit organization settings, THEN THE system SHALL reject the request and indicate that the user lacks sufficient permissions.

### Settings Scope

WHEN an authorized user edits organization settings, THE system SHALL allow modification of the following: name, description, logo image, currency, timezone, and fiscal start month. All validations that apply during creation (see Organization Creation Validation) SHALL also apply during editing.

### Department Nesting Depth

THE system SHALL restrict department nesting within an organization to a maximum depth of one_level. A parent department may have one level of child sub-departments directly beneath it, but those child sub-departments SHALL NOT serve as parents to any further nested departments.

IF an attempt is made to create a department with a nesting depth exceeding one_level, THEN THE system SHALL reject the request and indicate that the maximum nesting depth has been reached.

### Employee Employment Type

THE system SHALL restrict the employment type for any employee to exactly one of four allowed values: "full_time", "part_time", "contractor", and "intern". No other employment type value SHALL be accepted.

IF an employment type is provided that does not match one of the four allowed values, THEN THE system SHALL reject the request and indicate that the employment type must be one of: full_time, part_time, contractor, intern.

### Timelog Billable Default

THE system SHALL set the default billable value for new timelogs to "yes".

WHEN a timelog is created without an explicit billable designation, THE system SHALL treat that timelog as billable by default.

### Organization Deletion Preconditions

### Pending Timesheet Restriction

THE system SHALL block the deletion of an organization when any timesheet belonging to that organization has a pending status — that is, any timesheet with a status of "submitted" that has not yet been approved or rejected.

IF a deletion is attempted while pending timesheets exist, THEN THE system SHALL reject the request and indicate that all pending timesheets must be resolved before the organization can be deleted.

### Timesheet Resolution Requirement

THE system SHALL require that every timesheet in the organization be in one of the following resolved states before deletion can proceed: "approved" or "rejected". Timesheets in "draft" status are not considered pending and do not block deletion. Only "submitted" timesheets that have not received a review decision block the deletion.

### Active Contract Restriction

THE system SHALL block the deletion of an organization when any employee in that organization has an active contract. An active contract is one where the end date is null (indicating ongoing employment) or the end date has not yet passed relative to the current date.

IF a deletion is attempted while active contracts exist, THEN THE system SHALL reject the request and indicate that all active employee contracts must be ended before the organization can be deleted.

### Organization Deletion Consequences

### Cascade Deletion

WHEN an organization is deleted after all preconditions are satisfied, THE system SHALL permanently remove all data associated with that organization. This includes all employees, contracts, departments, projects, project memberships, tasks, task history entries, timelogs, timesheets, timers, activity log entries, invitations, and custom roles.

The built-in roles (Owner, Manager, Employee) are organization-specific and SHALL also be removed with the organization.

Deletion is permanent and irreversible. Once removed, the data cannot be recovered through normal system operations.

### User Account Preservation

WHEN an organization is deleted, THE system SHALL preserve the user account of the organization owner and of all employees who belonged to the organization. The user accounts themselves SHALL NOT be deleted.

The owner's user account SHALL simply lose its association with the deleted organization. If the owner belongs to other organizations, those associations SHALL remain intact and unaffected by the deletion.

## User Rules

Users sign up with a valid email address and a password; both fields are required and cannot be empty. The email must be unique across the entire platform — no two user accounts may share the same email address. A user can belong to multiple organizations simultaneously, but each login session requires selecting exactly one organization to work within as the active context. Users may switch their active organization at any time without logging out and re-authenticating. A user's global profile — consisting of display name, avatar image, and phone number — is shared across every organization they belong to. A user may delete their own account, but if they are the sole owner of an organization, they must first either transfer ownership to another user or delete the organization entirely. When an account is deleted, any employee records the user held in other organizations are marked as deactivated rather than removed, preserving historical data.

### Signup Validation Rules

IF the email address is missing or empty, THEN THE system SHALL reject the signup request.

IF the password is missing or empty, THEN THE system SHALL reject the signup request.

IF the email address is already associated with an existing user account on the platform, THEN THE system SHALL reject the signup request.

THE system SHALL require both a non-empty email address and a non-empty password to accept a signup request.

The uniqueness of the email address SHALL be enforced across the entire platform, not per organization. No two user accounts may share the same email address regardless of which organizations they belong to.

### Login and Organization Context Rules

WHEN a user logs in successfully, THE system SHALL present the list of organizations the user belongs to and require selection of exactly one organization as the active context.

THE system SHALL allow the user to switch the active organization at any time during an authenticated session without requiring re-authentication.

WHILE the user switches the active organization, THE system SHALL immediately scope all subsequent data access and operations to the newly selected organization.

THE system SHALL NOT allow any operation to proceed until an active organization context has been selected after login.

### Profile Management Rules

THE system SHALL maintain exactly one global profile per user account, shared across all organizations the user belongs to.

The global profile SHALL consist of the following attributes: display name, avatar image, and phone number.

THE system SHALL make the global profile accessible regardless of which organization is currently selected as the active context.

WHEN the user edits their global profile, THE system SHALL reflect the changes immediately across all organizations the user belongs to.

Profile data SHALL remain available to organizations where the user holds an active employee record.

### Account Deletion Constraints

IF the user is the sole owner of any organization, THEN THE system SHALL block the account deletion request.

THE system SHALL require the user to either transfer ownership to another user in that organization or delete the organization entirely before account deletion can proceed.

WHEN a user account is deleted, THE system SHALL mark all employee records belonging to that user in other organizations as deactivated.

THE system SHALL preserve all historical data — including timelogs, timesheets, and activity log entries — associated with deactivated employee records.

The user account record itself SHALL be permanently removed upon successful deletion.

## Employee Rules

Each employee record belongs to exactly one organization and references a user account. An employee must be assigned exactly one role within the organization — no employee can be role-less. The department and position fields are optional. Employment type must be one of four predefined values: full-time, part-time, contractor, or intern. An employee's status is either active or deactivated. A deactivated employee is prohibited from logging any time entries or submitting timesheets; however, all timelogs and timesheets created before deactivation remain intact and accessible. A deactivated employee can be reactivated at any time, restoring their ability to log time. The same user account cannot appear twice as an active employee in the same organization.

### Employee Organization Membership

THE system SHALL require every employee record to belong to exactly one organization.

THE system SHALL ensure that a given user account cannot appear as an active employee more than once within the same organization. A user may, however, appear as an active employee in multiple different organizations simultaneously.

IF a user already has an active employee record in an organization and an attempt is made to create a second active employee record for the same user in the same organization, THEN the system SHALL reject the request.

A deactivated employee record does not prevent the creation of a new active employee record for the same user in the same organization. Reactivating the deactivated record while another active record exists SHALL be rejected.

WHEN an employee is deactivated in an organization, the user account remains intact, and the user continues to belong to any other organizations where they hold active employee records.

### Employee Role Assignment

THE system SHALL require every employee to be assigned exactly one role within the organization at all times. An employee record cannot exist without a role assignment.

IF an attempt is made to create an employee record without specifying a role, THEN the system SHALL reject the request.

IF an attempt is made to remove the role assignment from an existing employee, THEN the system SHALL reject the request.

WHEN an employee's role is changed, the system SHALL replace the current role with the new role immediately. The employee's previous role association ends at that moment.

Role assignment changes SHALL be permitted only by users with the "employee:manage" permission. (Permissions defined in 01-actors-and-auth.md).

### Employment Type Validation

THE system SHALL restrict the employment type of an employee to one of the values defined in the domain model (02-domain-model.md).

IF a value outside the allowed set is provided when creating or updating an employee record, THEN the system SHALL reject the request and indicate that the employment type is not valid.

WHEN filtering the employee list by employment type (as described in 03-functional-requirements.md), the system SHALL match only employees whose employment type exactly equals the selected filter value.

Employment type has no bearing on which actions an employee can perform — permissions are governed solely by role assignment (see Employee Role Assignment above).

### Optional Department and Position

THE system SHALL treat the department field on an employee record as optional. An employee may exist without being assigned to any department.

THE system SHALL treat the position (title) field on an employee record as optional. An employee may exist without a position being recorded.

IF an employee's assigned department is deleted, the system SHALL set the employee's department to null without affecting the employee record itself.

WHEN filtering the employee list by department, the system SHALL include employees whose department matches the filter value. Employees with no department assigned SHALL be excluded from department-filtered results unless a "no department" filter option is explicitly provided.

Department creation and deletion rules are defined in the Department Rules section of this document.

### Employee Status Constraints

THE system SHALL maintain each employee's status as either active or deactivated. A newly created employee record SHALL start in the active status.

WHEN an employee's status is set to deactivated, the system SHALL enforce the following restrictions on that employee:

- The deactivated employee SHALL NOT be permitted to create new timelogs.
- The deactivated employee SHALL NOT be permitted to edit or delete existing timelogs.
- The deactivated employee SHALL NOT be permitted to submit timesheets for approval.
- The deactivated employee SHALL NOT be permitted to start a live timer.

IF a deactivated employee attempts to perform any of the above actions, THEN the system SHALL reject the request and indicate that the action is not permitted for deactivated employees.

THE system SHALL preserve all historical data belonging to a deactivated employee, including all timelogs and timesheets created before deactivation. This data remains intact, accessible (subject to viewing permissions), and included in reports.

THE system SHALL permit reactivation of a deactivated employee at any time. Upon reactivation:

- The employee's status SHALL be set back to active.
- All previously imposed restrictions on logging time and submitting timesheets SHALL be lifted immediately.
- The employee's historical data SHALL remain unchanged.

WHEN reactivating a deactivated employee, the system SHALL verify that no other active employee record exists for the same user in the same organization, consistent with the no-duplicate rule defined in Employee Organization Membership above. If a duplicate would result, the system SHALL reject the reactivation.

An employee's own timelogs and timesheets remain visible to them regardless of status, but modification is governed by timelog and timesheet rules defined in their respective sections of this document.

## Role Rules

Every organization has three built-in roles — Owner, Manager, and Employee — which cannot be deleted under any circumstances. The Owner role grants unrestricted access to all features including managing roles and members. The Manager role covers employee management, project oversight, timesheet approval, and report viewing. The Employee role is limited to personal time tracking, timesheet submission, and viewing own data. Custom roles created by the organization owner must have a name and a set of permissions drawn from the predefined permission list: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. A custom role can be edited after creation. A custom role can be deleted only when no employees in the organization are currently assigned to it. Each employee is assigned exactly one role — built-in or custom.

### Built-in Role Constraints

Every organization has exactly three built-in roles: Owner, Manager, and Employee.

THE system SHALL prevent deletion of any built-in role. IF a deletion of a built-in role is attempted, THEN THE system SHALL reject the request.

The Owner role SHALL grant unrestricted access to all features within the organization, including managing roles and members.

The Manager role SHALL grant access to employee management, project oversight, timesheet approval, and report viewing. The Manager role SHALL NOT grant access to organization settings management or role management.

The Employee role SHALL grant access only to personal time tracking, timesheet submission, and viewing the employee's own data. The Employee role SHALL NOT grant access to managing other employees, projects, timesheet approval, or organization reports.

Built-in role names and permission sets SHALL NOT be editable.

### Predefined Permissions

The system SHALL support exactly nine predefined permissions:

- `org:manage` — permits editing organization settings.
- `employee:manage` — permits adding, editing, and deactivating employees.
- `employee:view` — permits viewing the employee list and employee details.
- `project:manage` — permits creating, editing, deleting, archiving, and completing projects and tasks.
- `project:view` — permits viewing projects and tasks.
- `time:manage` — permits editing or deleting any employee's timelogs.
- `time:approve` — permits approving or rejecting submitted timesheets.
- `time:view_all` — permits viewing all employees' timelogs and timesheets.
- `report:view` — permits viewing organization reports.

No additional permissions beyond these nine SHALL exist. Each predefined permission SHALL represent one of these nine values only.

### Custom Role Creation and Editing

THE system SHALL require a name for every custom role. IF a custom role is created or edited without a name, THEN THE system SHALL reject the request.

THE system SHALL require at least one permission from the predefined permission list when creating a custom role. IF a custom role is created or edited with an empty permission set, THEN THE system SHALL reject the request.

Custom roles SHALL only contain permissions drawn from the nine predefined permissions. IF a permission not in the predefined list is specified, THEN THE system SHALL reject the request.

Only organization owners SHALL be permitted to create custom roles.

Only organization owners SHALL be permitted to edit custom roles after creation.

Custom role names SHALL be unique within the organization. IF a new custom role name duplicates an existing role name in the same organization, THEN THE system SHALL reject the request.

### Custom Role Deletion

THE system SHALL allow deletion of a custom role only when no employees in the organization are assigned to that role.

IF a deletion of a custom role is attempted and one or more employees are currently assigned to it, THEN THE system SHALL reject the request and indicate that the role has active assignments.

Only organization owners SHALL be permitted to delete custom roles.

### Role Assignment

Each employee in an organization SHALL be assigned exactly one role at any given time.

IF an attempt is made to assign a second role to an employee who already has a role, THEN THE system SHALL replace the existing role assignment with the new one.

THE system SHALL require a role assignment when an employee record is created. IF an employee record is created without a role, THEN THE system SHALL reject the request.

Role assignments SHALL be changed only by users with the `employee:manage` permission.

A deactivated employee's role assignment SHALL be preserved (defined in Employee Rules) and SHALL remain unchanged upon reactivation unless explicitly reassigned.

## Contract Rules

Each contract belongs to a specific employee and requires a start date and a pay rate as mandatory fields. The end date is optional; when omitted, the contract is considered ongoing with no predetermined end. The pay period must be one of four options: hourly, daily, weekly, or monthly. Working hours per week is a required numeric field, typically set to 40 for full-time arrangements. Only one contract per employee may be active at any given time; when a new contract is created for an employee, the previous active contract is automatically ended with its end date set to the day before the new contract's start date. Past contracts — those with an end date in the past — are immutable and cannot be modified by anyone, preserving a reliable historical record. The current active contract can be edited by users with the employee:manage permission. Notes are optional and can contain any additional terms or context.

### Contract Creation Validation

THE system SHALL require a start date when creating a contract.

THE system SHALL require a pay rate when creating a contract. The pay rate SHALL be a numeric value.

THE system SHALL require working hours per week when creating a contract. The working hours per week SHALL be a numeric value.

THE system SHALL allow the end date to be omitted, indicating an ongoing contract with no predetermined end.

THE system SHALL require the pay period to be one of: hourly, daily, weekly, or monthly.

THE system SHALL allow an optional notes field to record additional terms or context.

IF the start date is missing, THEN THE system SHALL reject the request.

IF the pay rate is missing, THEN THE system SHALL reject the request.

IF the pay rate is not a numeric value, THEN THE system SHALL reject the request.

IF the working hours per week is missing, THEN THE system SHALL reject the request.

IF the pay period is not one of hourly, daily, weekly, or monthly, THEN THE system SHALL reject the request.

### Active Contract Rule

An active contract is defined as a contract whose end date is either absent (ongoing) or set to a date in the future relative to the current date.

WHILE an employee has an active contract, THE system SHALL enforce that at most one contract is active for that employee. No two contracts for the same employee shall have overlapping active periods.

WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date. This ensures a seamless transition without gaps or overlaps between contracts.

### Contract Editing Rules

WHILE a contract has an end date that is in the past, THE system SHALL treat the contract as immutable. No modifications of any kind are permitted on past contracts, preserving a reliable historical record.

THE system SHALL allow editing of the current active contract — the single contract per employee with no end date or an end date in the future — by users who hold the employee:manage permission. All fields of the active contract may be modified, including start date, end date, pay rate, pay period, working hours per week, and notes.

IF a user without the employee:manage permission attempts to edit any contract, THEN THE system SHALL reject the request.

IF a user attempts to edit a past contract — one with an end date before the current date — THEN THE system SHALL reject the request regardless of the user's permissions.

## Department Rules

Each department belongs to an organization and must have a name; the description is optional. A department may optionally reference a parent department, enabling a single level of nesting — a department cannot be its own parent and nesting deeper than one level is not supported. When a department is deleted, employees who belonged to that department simply have their department reference set to null; the employees themselves are not removed or affected in any other way. The department name should be unique within the organization to avoid confusion. Only users with the org:manage permission may create, edit, or delete departments.

### Department Name Validation

THE system SHALL require a name for every department.

IF the department name is missing or empty, THEN THE system SHALL reject the request.

THE system SHALL enforce that the department name is unique within the organization. IF a department is created or renamed to a name already used by another department in the same organization, THEN THE system SHALL reject the request.

### Department Description

THE system SHALL accept an optional description for a department.

WHERE a description is provided, it may be any text. WHERE no description is provided, THE system SHALL store the description as empty with no impact on other department behavior.

### Parent Department Constraints

THE system SHALL allow a department to optionally reference one parent department within the same organization.

THE system SHALL enforce a maximum nesting depth of one_level. IF a department has a parent department, THEN that parent department SHALL NOT itself have a parent department.

IF a department references itself as its own parent, THEN THE system SHALL reject the request.

IF a request attempts to assign a parent department that already has its own parent (exceeding the one_level nesting depth), THEN THE system SHALL reject the request.

### Department Deletion Behavior

WHEN a department is deleted, THE system SHALL set the department reference to null for all employees who belonged to that department.

THE system SHALL preserve all employee records when a department is deleted. Employees are not removed, deactivated, or otherwise affected beyond having their department reference cleared.

IF a department being deleted is referenced as a parent by other departments, THEN those child departments retain their parent department reference — the deletion does not cascade to child departments. Users with the appropriate permission must handle child departments separately.

### Department Management Permissions

THE system SHALL require the org:manage permission to create a department.

THE system SHALL require the org:manage permission to edit a department.

THE system SHALL require the org:manage permission to delete a department.

IF a user without the org:manage permission attempts to create, edit, or delete a department, THEN THE system SHALL reject the request.

## Project Rules

A project must have a name and a color code for UI display; the description, budget hours, start date, and end date are optional. The project status must be one of three values: active, archived, or completed. Projects that are archived or completed cannot accept new timelogs — employees are blocked from logging time against them, but all existing timelogs on those projects are preserved and remain visible. A project can be deleted only if it has zero timelogs associated with it; once any time has been logged against a project, deletion is permanently blocked. Budget hours, when set, represent the total estimated hours for the project and are used later in budget reports to compare estimates against actual logged hours. Only users with the project:manage permission may create, edit, archive, complete, or delete projects.

### Project Name Requirement

The project name is a mandatory field for project creation.

- IF the project name is missing or blank, THEN the system SHALL reject the request.
- THE system SHALL require a non-empty name to create or update a project.

When an update request sets the project name to an empty value, the system SHALL reject the update and preserve the existing name.


### Color Code Requirement

A color code is required for UI display purposes on every project.

- IF the color code is missing or blank, THEN the system SHALL reject the request.
- THE system SHALL require a color code when creating a project.
- THE system SHALL require a color code when updating a project.

The color code is used solely for visual identification in the user interface and carries no business logic significance beyond the required presence.


### Project Status Constraints

The project status must be one of exactly three values: "active", "archived", or "completed".

- IF a project creation or update request specifies a status outside these three values, THEN the system SHALL reject the request.
- THE system SHALL validate the status against the allowed set on every create and update operation.

A newly created project defaults to "active" status. Status transitions are governed by user actions with the appropriate permission; the system does not enforce a strict state machine beyond the valid values constraint.


### Timelog Restrictions on Non-Active Projects

Projects in "archived" or "completed" status block all new timelog creation while preserving existing logged time.

- WHILE a project is in "archived" status, THE system SHALL reject any attempt to create a new timelog against that project.
- WHILE a project is in "completed" status, THE system SHALL reject any attempt to create a new timelog against that project.
- IF an employee attempts to start a timer or log time against an archived or completed project, THEN the system SHALL reject the request with an indication that the project is not active.

Existing timelogs on archived or completed projects are fully preserved: they remain visible in reports, contribute to historical timesheet totals, and are included in budget calculations. Archiving or completing a project does not alter, delete, or hide any existing timelog data.


### Project Deletion Precondition

Project deletion is permanently blocked once any timelog has been associated with the project.

- IF the project has one or more timelogs, THEN the system SHALL reject the deletion request.
- THE system SHALL allow deletion only when the project has zero associated timelogs.

This is a one-way gate: once time is logged against a project, the project can never be deleted. The only available state transitions after timelogs exist are archiving or completing the project. This rule applies regardless of the timelog's status within a timesheet — even timelogs that are part of draft, rejected, or unsubmitted timesheets count toward the precondition.


### Budget Hours

Budget hours are an optional field representing the total estimated hours for the project.

- THE system SHALL allow a project to be created without budget hours specified.
- THE system SHALL allow a project to be updated to set, change, or clear budget hours.
- WHERE budget hours are set, THE system SHALL use them in budget reports to compare estimated hours against actual logged hours (as described in the Project Budget Report).

Budget hours carry no validation constraint on their numeric value beyond being a non-negative number. Projects without budget hours are excluded from budget utilization reports. Budget hours do not impose a cap on actual logged hours — employees can log more time than the budgeted estimate.


### Permission Requirement for Project Operations

Only users with the "project:manage" permission may perform management operations on projects.

- IF a user without the "project:manage" permission attempts to create a project, THEN the system SHALL reject the request.
- IF a user without the "project:manage" permission attempts to edit a project, THEN the system SHALL reject the request.
- IF a user without the "project:manage" permission attempts to archive a project, THEN the system SHALL reject the request.
- IF a user without the "project:manage" permission attempts to complete a project, THEN the system SHALL reject the request.
- IF a user without the "project:manage" permission attempts to delete a project, THEN the system SHALL reject the request.

Users with only the "project:view" permission are limited to viewing projects and their details; they cannot perform any modification operations.


## ProjectMember Rules

A project membership links an employee to a project with an assigned role, which must be either member or project-lead. An employee can be assigned to multiple projects simultaneously — there is no limit on the number of projects an employee may join. A project lead has elevated privileges within that specific project: they can manage tasks, including creating, editing, and changing task statuses. An employee cannot be assigned to the same project more than once. Only users with the project:manage permission can assign employees to projects or remove them. When an employee is removed from a project, any tasks assigned to them within that project may need reassignment.

### Assigned Role Constraint

THE system SHALL require the assigned role for any project membership to be either "member" or "project-lead".

IF a role value other than "member" or "project-lead" is provided when assigning an employee to a project, THEN THE system SHALL reject the assignment.


### Multiple Project Membership

THE system SHALL allow an employee to be assigned to multiple projects simultaneously.

WHEN assigning an employee to a project, THE system SHALL NOT consider the employee's existing project memberships as grounds for rejection.


### Duplicate Membership Prevention

THE system SHALL prevent duplicate membership for the same employee-project pair.

IF an attempt is made to assign an employee to a project they are already a member of, THEN THE system SHALL reject the assignment.


### Permission Requirements for Member Assignment and Removal

THE system SHALL require the project:manage permission to assign an employee to a project.

IF a user without the project:manage permission attempts to assign an employee to a project, THEN THE system SHALL reject the request.

THE system SHALL require the project:manage permission to remove an employee from a project.

IF a user without the project:manage permission attempts to remove an employee from a project, THEN THE system SHALL reject the request.


### Project Lead Task Management

THE system SHALL grant a project lead elevated task management privileges within their assigned project.

THE system SHALL allow a project lead to create tasks within their project.

THE system SHALL allow a project lead to edit tasks within their project.

THE system SHALL allow a project lead to change the status of tasks within their project.

IF an employee is assigned the "project-lead" role on a project, THEN THE system SHALL apply these privileges only to that specific project and not to other projects where the employee holds a "member" role.


### Task Reassignment Following Member Removal

WHEN an employee is removed from a project, THE system SHALL identify any tasks within that project that are assigned to the removed employee.

IF tasks are identified as assigned to the removed employee, THEN THE system SHALL NOT automatically reassign them — the project lead or a user with project:manage permission must manually reassign those tasks.

THE system SHALL allow the project lead or a user with project:manage permission to reassign such tasks to another project member.


## Task Rules

Every task requires a title and belongs to a specific project. The description, estimated hours, and due date are optional. Task status must be one of four values: open, in-progress, completed, or closed. Task priority must be one of four levels: low, medium, high, or urgent. If a task is assigned to an employee, that employee must already be a member of the task's parent project — assignment to a non-member is rejected. A task may optionally reference a parent task to form subtasks, but only one level of nesting is permitted; a task cannot be its own parent and a subtask cannot itself have subtasks. Project leads can create and edit tasks within their projects, while users with project:manage permission can edit any task across all projects. Every task status change is automatically recorded as a task history entry, capturing what changed and who made the change.

### Task Title Validation

Every task requires a title that belongs to a specific project.

The title must not be empty or consist only of whitespace characters.

- THE system SHALL reject task creation or update IF the title is missing.
- THE system SHALL reject task creation or update IF the title is empty or contains only whitespace.

If the title is missing or invalid, the request is rejected with an indication that the title is required.


### Task Status Values

Task status is restricted to exactly four recognized values.

The allowable status values are: open, in-progress, completed, and closed.

- THE system SHALL accept only the values "open", "in-progress", "completed", or "closed" when setting a task's status.
- IF a status value outside this set is provided, THEN THE system SHALL reject the request.

Any other status value — including misspellings, alternative capitalizations, or invented statuses — is rejected.


### Task Priority Values

Task priority is restricted to exactly four recognized levels.

The allowable priority levels are: low, medium, high, and urgent.

- THE system SHALL accept only the values "low", "medium", "high", or "urgent" when setting a task's priority.
- IF a priority value outside this set is provided, THEN THE system SHALL reject the request.

Any other priority value — including misspellings, alternative capitalizations, or invented levels — is rejected.


### Task Assignment Rules

A task may optionally be assigned to an employee, but the assignment is subject to a membership constraint.

The assigned employee must already be a member of the task's parent project.

- WHEN a task is assigned to an employee, THE system SHALL verify that the employee is a member of the project to which the task belongs.
- IF the assigned employee is not a member of the task's parent project, THEN THE system SHALL reject the assignment.

This rule applies both when creating a task with an assignee and when updating an existing task's assignee. Removing an assignee (setting the assignment to none) is always permitted regardless of membership.


### Subtask Nesting Rules

Tasks support parent-child relationships to represent subtasks, with strict nesting constraints.

A task may optionally reference a parent task, forming a subtask relationship. The following rules govern this nesting:

- THE system SHALL permit at most one level of parent-child nesting. A task that already serves as a parent to other tasks may not itself have a parent task.
- IF a request attempts to set a parent task on a task that is itself already a parent, THEN THE system SHALL reject the request — no deeper nesting beyond one level is permitted.
- THE system SHALL reject a request that attempts to set a task's parent to itself.
- THE system SHALL reject a request that would create a circular reference (a parent chain that loops back on itself).

A subtask inherits the project from its parent task. When a parent task is assigned to a project, all its subtasks implicitly belong to the same project.


### Task Editing Permissions

Task editing is governed by two permission paths: project lead scope and global project management scope.

A project lead has the assigned role of "project-lead" on the project (as defined in ProjectMember Rules).

- WHEN a project lead attempts to edit a task, THE system SHALL permit the edit only if the task belongs to a project where the user is assigned as project lead.
- WHEN a user with the "project:manage" permission attempts to edit a task, THE system SHALL permit editing any task across all projects in the organization.
- IF a user has neither the "project:manage" permission nor the project lead role for the task's project, THEN THE system SHALL reject any edit attempt.

This applies to all task edits including title, description, status, priority, estimated hours, due date, assignee, and parent task changes.


### Task Status Change Recording

Every change to a task's status is automatically recorded for audit purposes.

- WHEN a task's status changes from one value to another, THE system SHALL automatically create a task history entry.
- THE system SHALL capture the timestamp of the change, the previous status, the new status, and the identity of the user who made the change.

Details of the task history entry structure are defined in TaskHistory Rules. The recording is automatic and requires no additional user action — the user cannot suppress or bypass this recording.


### Task Browsing Rules

Tasks support filtering and sorting to help users locate relevant work items.

**Filtering**

Tasks can be filtered by one or more of the following criteria:

- Status: filter to tasks matching one or more of open, in-progress, completed, or closed.
- Priority: filter to tasks matching one or more of low, medium, high, or urgent.
- Assigned employee: filter to tasks assigned to a specific employee.

When multiple filters are applied, they are combined (all conditions must be satisfied).

**Sorting**

Tasks can be sorted by any of the following fields, in either ascending or descending order:

- Due date: tasks with a due date are ordered by that date; tasks without a due date appear at the end regardless of sort direction.
- Priority: tasks are ordered by priority level, with a defined ranking of urgent (highest), high, medium, and low (lowest).
- Creation date: tasks are ordered by when they were created.

Filtering and sorting are applied independently — filters narrow the result set, sorting arranges the remaining results.


## TaskHistory Rules

A task history entry is created automatically whenever a task's status changes; manual creation or modification of history entries is not permitted. Each entry captures the exact timestamp of the change, the old status before the change, the new status after the change, and the user who performed the change. The old and new status values must be valid task statuses — open, in-progress, completed, or closed — and the new status must differ from the old status. Task history entries are immutable once created; they serve as a permanent audit trail for how each task progressed through its lifecycle. Users can view the history of a task to understand its workflow over time.

### Automatic Creation on Status Change

WHEN a task's status is changed, THE system SHALL automatically create a task history entry.

Manual creation of task history entries is not permitted. The system alone controls the creation of history entries as a side effect of status changes. A status change that is rejected for any reason (invalid status, unchanged status) does not produce a history entry.

### Captured Information on History Entry

WHEN a task history entry is created, THE system SHALL record all of the following:

- The exact timestamp of when the status change occurred
- The old status of the task before the change
- The new status of the task after the change
- The user who performed the status change

Each of these four pieces of information is required and must be present on every history entry. An entry missing any of these values is invalid and must not be created.

### Valid Status Value Constraint

IF a status change is attempted with a status value that is not one of the recognized task statuses — open, in-progress, completed, or closed — THEN THE system SHALL reject the status change.

This constraint applies to both the old status (when validated as input) and the new status. No history entry is created when a status change is rejected due to an invalid status value.

### Status Difference Requirement

IF the new status is the same as the old status, THEN THE system SHALL reject the status change.

A task history entry is only created when the status actually changes. Attempting to set a task's status to its current value is a no-op and does not produce a history entry.

### Immutability of History Entries

THE system SHALL NOT permit modification of any task history entry.

THE system SHALL NOT permit deletion of any task history entry.

Once created, a task history entry is immutable. No user, regardless of role or permission, can alter the timestamp, old status, new status, or recorded user of an existing history entry. Task history entries serve as a permanent, tamper-proof audit record.

### Task Workflow Visibility

THE system SHALL allow users to view the complete history of status changes for a given task.

The history displays each entry in chronological order, showing for each change: the timestamp, the old status, the new status, and the user who made the change. This enables users to understand how a task progressed through its lifecycle — from when it was opened, when it moved to in-progress, when it was completed, and any other status transitions that occurred.

Access to view task history follows the same visibility rules as viewing the task itself: employees can view the history of tasks belonging to projects they are assigned to, while users with project management permissions can view the history of any task.

## Timelog Rules

A timelog requires a date, a duration in minutes, and a project that the employee is currently assigned to. The task field is optional but, if provided, must belong to the selected project. The description field is optional and free-text. The billable flag defaults to true and indicates whether the logged time is billable to a client or stakeholder. Employees may only create timelogs for themselves — no employee can log time on behalf of another employee. An employee may edit their own timelog only if that timelog has not yet been locked into an approved timesheet. An employee may delete their own timelog only if it has not been included in any submitted or approved timesheet. Users with time:manage permission override these restrictions and can edit or delete any employee's timelogs regardless of timesheet status. The logged project must not be archived or completed — only active projects accept new timelogs.

### Timelog Creation Constraints

### Date and Duration Requirements

A timelog must have a date. A timelog without a date is rejected.

A timelog must have a duration in minutes. The duration must be a positive number. A timelog with a missing, zero, or negative duration is rejected.

### Project and Task Validity

The project on a timelog must be one that the logging employee is currently assigned to as a project member. If the employee is not a member of the selected project, the timelog is rejected.

If a task is provided on the timelog, that task must belong to the selected project. A task from a different project is rejected.

### Active Project Requirement

The project on a timelog must be in active status. Timelogs cannot be created against projects that are archived or completed. Any attempt to log time against an archived or completed project is rejected.

### Employee Self-Logging

An employee may only create timelogs for themselves. No employee — regardless of permission — can log time on behalf of another employee. The timelog is automatically associated with the authenticated employee who creates it.

### Billable Default

The billable flag on a timelog defaults to yes when not explicitly provided. When set to yes, it means the logged time is billable. When set to no, the logged time is non-billable.

### Timelog Edit Restrictions

### Edit Permitted Only on Unlocked Timelogs

An employee may edit their own timelog only if that timelog has not been locked into an approved timesheet. Once a timesheet containing the timelog is approved, all timelogs within that timesheet become locked — no further edits are permitted by the employee.

If an employee attempts to edit a timelog that is part of an approved timesheet, the edit is rejected.

### Override by Time Management Permission

Users with the time management permission (time:manage) override the edit restriction described above. A user with time:manage permission may edit any employee's timelog regardless of whether the timelog belongs to an approved timesheet.

### General Edit Rules

When editing a timelog, all creation constraints (defined in Timelog Creation Constraints) continue to apply. Specifically:

- The date must remain valid.
- The duration must remain a positive number.
- The project must still be one the timelog owner is assigned to.
- If a task is provided, it must still belong to the selected project.
- The project must still be in active status.

### Timelog Deletion Restrictions

### Deletion Blocked by Submitted or Approved Timesheets

An employee may delete their own timelog only if that timelog is not part of any submitted timesheet and is not part of any approved timesheet.

- If the timelog belongs to a submitted timesheet (pending approval), deletion is rejected.
- If the timelog belongs to an approved timesheet, deletion is rejected.
- If the timelog belongs only to a draft timesheet or no timesheet at all, deletion is permitted.

### Override by Time Management Permission

Users with the time management permission (time:manage) override the deletion restrictions described above. A user with time:manage permission may delete any employee's timelog regardless of whether the timelog belongs to a submitted or approved timesheet.

## Timesheet Rules

A timesheet covers exactly one calendar week from Monday through Sunday, defined by its week start date and week end date. The timesheet status progresses through four states: draft, submitted, approved, and rejected. The total hours value is calculated automatically by summing the durations of all timelogs included in the timesheet. A timesheet cannot be submitted for approval if it contains no timelogs — an empty timesheet must have at least one logged entry. Additionally, only one timesheet per employee per week may be in a submitted or approved state; duplicate submissions for the same week are rejected. When a timesheet is approved, every timelog within it becomes locked — no further edits or deletions are permitted on those entries. When a timesheet is rejected, it returns to draft status and must include a rejection reason explaining why it was not accepted; the employee may then modify and resubmit it.

### Timesheet Week Coverage

A timesheet SHALL cover exactly one calendar week, from Monday through Sunday.

The week start date SHALL always be a Monday. The week end date SHALL always be the Sunday immediately following that Monday. Every timelog included in a timesheet MUST have a date that falls within or on the boundaries of the timesheet's week range.

Example: A timesheet with week start date of May 4, 2026 covers all timelogs dated from May 4 (Monday) through May 10 (Sunday), 2026.

### Timesheet Status Rules

A timesheet SHALL progress through exactly four statuses in the following order: draft, submitted, approved, or rejected.

Draft is the initial status when a timesheet is first created. Submitted means the employee has sent the timesheet for review. Approved means a reviewer has accepted the timesheet, permanently locking its contents. Rejected means a reviewer has declined the timesheet; it returns to draft status for the employee to correct and resubmit.

A timesheet in approved status SHALL NOT transition to any other status. A timesheet in submitted status MAY transition to approved or rejected. A timesheet in draft status MAY transition to submitted. A timesheet in rejected status is treated as draft and MAY be resubmitted.

### Total Hours Calculation

THE system SHALL calculate the total hours of a timesheet automatically by summing the duration (in minutes) of all timelogs included in the timesheet and converting the result to hours.

WHEN a timelog is added to or removed from a draft timesheet, THE system SHALL immediately recalculate the total hours.

WHEN a timesheet is approved, THE system SHALL freeze the total hours value. The total hours SHALL NOT change after approval, as all included timelogs become locked.

### Timesheet Submission Rules

A timesheet SHALL NOT be submitted for approval if it contains no timelogs. At least one timelog MUST be included in the timesheet for submission to be permitted. IF a submission is attempted on an empty timesheet, THEN THE system SHALL reject the request.

Only one timesheet per employee per calendar week SHALL be in a submitted or approved status at any time. IF an employee attempts to submit a second timesheet for a week that already has a submitted or approved timesheet, THEN THE system SHALL reject the submission as a duplicate.

This rule does not prevent an employee from creating a new draft timesheet for a week whose previous timesheet was rejected, since a rejected timesheet returns to draft status and is no longer considered submitted or approved.

### Approved Timesheet Locking

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet.

Locked timelogs SHALL NOT be edited or deleted by any user, including the timelog owner and users with time management permission. The lock is permanent for the lifetime of the approved timesheet.

IF an attempt is made to edit or delete a timelog that belongs to an approved timesheet, THEN THE system SHALL reject the request.

### Timesheet Rejection Rules

WHEN a reviewer rejects a submitted timesheet, THE system SHALL require a rejection reason. The rejection reason is a text field that MUST be provided and MUST NOT be empty. IF a rejection is attempted without providing a reason, THEN THE system SHALL reject the request.

Upon rejection, THE system SHALL return the timesheet to draft status. The employee who owns the timesheet MAY then modify its contents — adding or removing timelogs — and resubmit the timesheet for approval.

A previously rejected timesheet that is resubmitted SHALL go through the same approval process as a first-time submission. There is no limit on the number of times a timesheet may be rejected and resubmitted.

## Timer Rules

Each employee may have at most one active timer running at any given moment; attempting to start a second timer while one is already running is rejected. A timer must be associated with a project when started; specifying a task is optional but, if given, the task must belong to the selected project. The timer records its start timestamp, the selected project, the optional task, and an optional description. An employee may stop their timer at any time, which automatically creates a new timelog with a duration equal to the elapsed time rounded to the nearest minute. An employee may also discard a running timer entirely, which cancels it without creating any timelog — no record of the elapsed time is kept. While a timer is running, the employee may edit the associated description, project, and task. There is no automatic stop mechanism; a timer left running continues indefinitely until the employee manually stops or discards it.

### One Active Timer Per Employee

WHILE an employee has an active running timer, THE system SHALL reject any attempt by that employee to start another timer.

THE system SHALL NOT automatically stop or pause any running timer under any circumstances. A timer remains active indefinitely until the owning employee manually stops it or discards it, regardless of how much time has elapsed or whether the employee is idle.

### Timer Start Validation

WHEN an employee starts a timer, THE system SHALL require a project to be selected. IF no project is provided, THEN THE system SHALL reject the request.

WHEN an employee starts a timer and specifies a task, THE system SHALL verify that the task belongs to the selected project. IF the task does not belong to the selected project, THEN THE system SHALL reject the request.

WHEN a timer is successfully started, THE system SHALL record the start timestamp, the selected project, the optional task (if provided), and the optional description (if provided).

### Stopping the Timer

WHEN an employee stops a running timer, THE system SHALL automatically create a new timelog. The timelog SHALL use the timer's start timestamp as the date, the elapsed time as the duration, and the timer's recorded project, task, and description.

THE system SHALL round the elapsed duration to the nearest whole minute when creating the timelog from a stopped timer. Fractional minutes below thirty seconds SHALL round down; fractional minutes of thirty seconds or above SHALL round up.

THE system SHALL set the timelog's billable field to yes by default when creating a timelog from a stopped timer.

### Discarding the Timer

WHEN an employee discards a running timer, THE system SHALL cancel the timer entirely. No timelog SHALL be created, and no record of the elapsed time SHALL be retained.

### Editing a Running Timer

WHILE a timer is running, THE system SHALL allow the owning employee to edit the timer's description at any time.

WHILE a timer is running, THE system SHALL allow the owning employee to change the associated project. IF the project is changed, THEN THE system SHALL clear any associated task that does not belong to the newly selected project.

WHILE a timer is running, THE system SHALL allow the owning employee to change or remove the associated task. IF a new task is specified, THEN THE system SHALL verify that the task belongs to the timer's currently selected project; otherwise THE system SHALL reject the task change.

## ActivityLog Rules

Every activity log entry records a significant organizational action with a precise timestamp, the user who performed the action, the type of action, the target entity affected, and any relevant details about what changed. The recorded action types include: employee invited to the organization, employee deactivated, employee reactivated, contract created or edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, and role assigned to or changed for an employee. Activity log entries are created automatically by the system in response to these actions and are immutable — they cannot be edited or deleted by any user. The activity log provides a complete chronological audit trail of organizational operations and is accessible in full only to users with the org:manage permission.

### ActivityLog Entry Structure

THE system SHALL record a timestamp on every activity log entry, captured automatically at the moment the action occurs.

THE system SHALL record the user who performed the action on every activity log entry.

THE system SHALL record an action type on every entry, drawn from the recognized set of organizational action types (defined in ActivityLog Action Types below).

THE system SHALL record the target entity on every entry, identifying which business object was affected — for example, which employee, contract, project, task, or timesheet.

THE system SHALL record details on every entry capturing what changed as a result of the action. For status changes, the details SHALL include the old and new values. For creation events, the details SHALL include relevant attributes of the newly created entity. For assignment changes, the details SHALL identify both the subject and the new assignment.

### ActivityLog Action Types

WHEN an employee is invited to the organization, THE system SHALL automatically create an activity log entry with action type "employee invited," the invited email as the target entity, and the performing user in the details.

WHEN an employee is deactivated, THE system SHALL automatically create an entry with action type "employee deactivated" and the affected employee as the target entity.

WHEN a deactivated employee is reactivated, THE system SHALL automatically create an entry with action type "employee reactivated" and the affected employee as the target entity.

WHEN a new contract is created for an employee, THE system SHALL automatically create an entry with action type "contract created," the employee as the target entity, and the contract details — including start date, pay rate, pay period, and working hours per week — recorded in the details.

WHEN an active contract is edited, THE system SHALL automatically create an entry with action type "contract edited," the employee as the target entity, and the changed fields recorded in the details.

WHEN a project is created, THE system SHALL automatically create an entry with action type "project created" and the project as the target entity.

WHEN a project is archived, THE system SHALL automatically create an entry with action type "project archived" and the project as the target entity.

WHEN a project is completed, THE system SHALL automatically create an entry with action type "project completed" and the project as the target entity.

WHEN a project is deleted, THE system SHALL automatically create an entry with action type "project deleted" and the project as the target entity.

WHEN the status of a task changes, THE system SHALL automatically create an entry with action type "task status changed" and the task as the target entity. The details SHALL include the old status, the new status, and the task identifier.

WHEN an employee submits a timesheet for approval, THE system SHALL automatically create an entry with action type "timesheet submitted," the timesheet as the target entity, and the submitting employee and week range in the details.

WHEN a submitted timesheet is approved, THE system SHALL automatically create an entry with action type "timesheet approved," the timesheet as the target entity, and the approving user in the details.

WHEN a submitted timesheet is rejected, THE system SHALL automatically create an entry with action type "timesheet rejected," the timesheet as the target entity, and the rejecting user together with the rejection reason in the details.

WHEN a role is assigned to an employee, THE system SHALL automatically create an entry with action type "role assigned" and the affected employee as the target entity. The details SHALL include the new role.

WHEN an existing role assignment is changed to a different role, THE system SHALL automatically create an entry with action type "role changed" and the affected employee as the target entity. The details SHALL include both the old role and the new role.

### ActivityLog Immutability

THE system SHALL treat all activity log entries as immutable once created. No user — including users with the org:manage permission — may modify or delete any entry.

IF a user attempts to edit an activity log entry, THEN THE system SHALL reject the request.

IF a user attempts to delete an activity log entry, THEN THE system SHALL reject the request.

THE activity log SHALL serve as a permanent, unalterable audit trail of all significant organizational operations.

### ActivityLog Access and Filtering

THE system SHALL restrict access to the full activity log to users who hold the org:manage permission for the current organization.

IF a user without the org:manage permission attempts to view the activity log, THEN THE system SHALL reject the request.

THE system SHALL present the activity log as a paginated list, following the general list browsing expectations for pagination (defined in List Browsing Expectations).

THE system SHALL support filtering the activity log by action type. When an action type filter is applied, only entries matching that type SHALL be returned.

THE system SHALL support filtering the activity log by the user who performed the action. When a user filter is applied, only entries logged by that user SHALL be returned.

THE system SHALL support filtering the activity log by date range. When a date range filter is applied, only entries whose timestamp falls within the range SHALL be returned.

WHEN multiple filters are applied simultaneously, THE system SHALL return only entries matching all filter criteria.

IF no entries match the combined filter criteria, THEN THE system SHALL return an empty result set rather than an error.

## Invitation Rules

An invitation is sent to an email address to bring a new employee into an organization. If the invited email address already belongs to an existing user account on the platform, that user is immediately added to the organization as an employee — no pending invitation is created. If the email address does not yet have a platform account, a pending invitation record is created with the invited email, the invitation timestamp, and a pending status. When a new user later signs up with that exact email address, the system automatically matches them to all pending invitations and adds them to the corresponding organizations. An invitation is scoped to a specific organization; the same email address can have pending invitations in multiple organizations simultaneously.

### Invitation Delivery

THE system SHALL deliver invitations by email address only. When an invitation is created, THE system SHALL record the invitation timestamp at the moment the invitation is sent.

The email recipient is identified solely by their email address. No other identifier is used for invitation matching.

### Existing User Handling

WHEN an invitation is sent to an email address that already belongs to an existing user account on the platform, THE system SHALL immediately add that user to the inviting organization as an employee. THE system SHALL NOT create a pending invitation record when the invited email address matches an existing user account.

The newly added employee receives the role assigned during the invitation process. After being added, the user can log in and select the organization to begin working.

### Pending Invitation Creation

WHEN an invitation is sent to an email address that does not belong to any existing user account on the platform, THE system SHALL create a pending invitation record. THE system SHALL set the invitation status to pending at the time of creation.

The pending invitation persists until the invited person signs up with the matching email address. While in pending status, the invitation represents an outstanding offer to join the organization.

### Auto-Matching on Signup

WHEN a new user signs up with an email address, THE system SHALL automatically search for all pending invitations that match that email address. THE system SHALL add the newly created user to every organization that has a pending invitation for that email address.

Upon successful matching, THE system SHALL resolve each matched invitation so it is no longer considered pending. The user gains access to all matched organizations and can select one upon login.

### Invitation Scoping and Multiplicity

THE system SHALL scope each invitation to exactly one organization. An invitation sent by one organization does not affect any other organization.

An email address MAY have pending invitations in multiple organizations simultaneously. Each pending invitation is independent and is resolved separately when the user signs up with the matching email. The system imposes no limit on the number of pending invitations a single email address can have across different organizations.

### Invitation Error Conditions

IF an invitation is sent to an email address that already belongs to an active employee in the same organization, THEN THE system SHALL reject the invitation. The inviter must be notified that the person is already an employee.

IF an invitation is sent to an email address that already has a pending invitation in the same organization, THEN THE system SHALL reject the duplicate invitation. The inviter must be notified that an invitation is already pending for that email address.

IF an invitation is sent to an email address that belongs to a deactivated employee in the same organization, THEN THE system SHALL reject the invitation. The deactivated employee must be reactivated rather than re-invited.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering

THE system SHALL support filtering on lists where the original user requirements specify filterable attributes.

**Employee List**

WHEN a user with employee:view permission browses the employee list, THE system SHALL allow filtering by department.

WHEN a user with employee:view permission browses the employee list, THE system SHALL allow filtering by employment type. Available employment types are: full_time, part_time, contractor, intern (defined in Employee Rules).

WHEN a user with employee:view permission browses the employee list, THE system SHALL allow filtering by status. Available statuses are: active, deactivated.

WHEN a user with employee:view permission browses the employee list, THE system SHALL allow searching by employee name. The search SHALL match names that contain the provided text.

Multiple filters on the employee list SHALL be combinable. For example, a user may filter by department and employment type simultaneously.

**Project List**

WHEN a user with project:view permission browses the project list, THE system SHALL allow filtering by project status. Available statuses are: active, archived, completed.

**Timelog List**

WHEN a user browses their own timelog list or a user with time:view_all permission browses all timelogs, THE system SHALL allow filtering by date range, with both a start date and an end date.

WHEN a user browses timelogs, THE system SHALL allow filtering by project. Only projects the employee is or was assigned to SHALL appear as filter options for the employee's own timelogs.

WHEN a user browses timelogs, THE system SHALL allow filtering by task. The task filter SHALL be scoped to the selected project when a project filter is also applied.

WHEN a user browses timelogs, THE system SHALL allow filtering by billable status. Available options are: billable, non-billable.

**Timesheet List**

WHEN a user browses their own timesheet list or a user with time:approve permission browses submitted timesheets, THE system SHALL allow filtering by status. Available statuses are: draft, submitted, approved, rejected.

WHEN a user browses timesheets, THE system SHALL allow filtering by date range, with both a start date and an end date.

**Task List**

WHEN a user browses tasks within a project they are assigned to, THE system SHALL allow filtering by status. Available statuses are: open, in-progress, completed, closed.

WHEN a user browses tasks, THE system SHALL allow filtering by priority. Available priorities are: low, medium, high, urgent.

WHEN a user browses tasks, THE system SHALL allow filtering by assigned employee.

**Activity Log**

WHEN a user with org:manage permission browses the activity log, THE system SHALL allow filtering by action type.

WHEN a user with org:manage permission browses the activity log, THE system SHALL allow filtering by the user who performed the action.

WHEN a user with org:manage permission browses the activity log, THE system SHALL allow filtering by date range.

**General Filtering Rules**

WHEN no filters are applied to a list, THE system SHALL return all accessible records for the current organization context.

IF a filter value does not match any records, THEN THE system SHALL return an empty result set rather than an error.

### Sorting

THE system SHALL support sorting on lists where the original user requirements specify sortable attributes.

**Task List**

WHEN a user browses the task list within a project, THE system SHALL allow sorting by due date. Tasks with no due date SHALL appear after tasks that have a due date when sorted in ascending order.

WHEN a user browses the task list within a project, THE system SHALL allow sorting by priority. The priority order SHALL be: urgent (highest), high, medium, low (lowest).

WHEN a user browses the task list within a project, THE system SHALL allow sorting by creation date.

Only one sort criterion SHALL be active at a time for the task list.

**General Sorting Rules**

IF a list supports sorting and no sort order is specified, THEN THE system SHALL apply a default sort order based on the most recently created records appearing first, unless a different default is specified for that list type.

### Pagination

THE system SHALL support pagination for all lists that the original user requirements identify as paginated.

**Paginated Lists**

The following lists SHALL be paginated:
- Employee list
- Project list
- Timelog list
- Timesheet list
- Activity log

**Pagination Behavior**

WHEN a user requests a paginated list, THE system SHALL return a page of records rather than the full result set.

WHEN a user requests a paginated list without specifying a page number, THE system SHALL return the first page.

WHEN a user requests a page beyond the available range, THE system SHALL return an empty page rather than an error.

Each page response SHALL indicate the total number of records matching the current filters, so the user can determine how many pages are available.

**Page Boundaries**

Pages SHALL have a reasonable number of records per page, determined by the system. The page size is a system-level concern and is not configurable by end users.

IF a filter reduces the total result count below the page size, THEN THE system SHALL return all matching records on a single page.

**Organization Scoping**

Pagination SHALL be scoped to the current organization context. Records from other organizations SHALL NOT be counted or included in any page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Restrictions

IF an organization owner attempts to delete an organization that has pending timesheets (status is "submitted"), THEN THE system SHALL reject the deletion and indicate that all pending timesheets must be resolved (approved or rejected) first.

IF an organization owner attempts to delete an organization that has active employee contracts (contracts with no end date or an end date in the future), THEN THE system SHALL reject the deletion and indicate that all active contracts must be ended first.

### Account Deletion Restrictions

IF a user who is the sole owner of an organization attempts to delete their account, THEN THE system SHALL reject the deletion and indicate that organization ownership must be transferred to another user or the organization must be deleted first.

### Role Deletion Restrictions

IF a user attempts to delete a built-in role (Owner, Manager, or Employee), THEN THE system SHALL reject the deletion and indicate that built-in roles cannot be removed.

IF a user attempts to delete a custom role that has one or more employees currently assigned to it, THEN THE system SHALL reject the deletion and indicate that all employees assigned to the role must be reassigned to a different role first.

### Project Deletion Restrictions

IF a user attempts to delete a project that has one or more timelogs associated with it, THEN THE system SHALL reject the deletion and indicate that all timelogs belonging to the project must be removed first.

### Timesheet Submission Restrictions

IF an employee attempts to submit a timesheet that contains no timelogs, THEN THE system SHALL reject the submission and indicate that at least one timelog is required.

IF an employee attempts to submit a timesheet for a week that already has another timesheet in "submitted" or "approved" status for the same employee, THEN THE system SHALL reject the submission and indicate that a timesheet for that week already exists.

### Timer Conflict and Validation

IF an employee attempts to start a timer while another timer is already running, THEN THE system SHALL reject the request and indicate that the active timer must be stopped or discarded first.

IF an employee attempts to start a timer without selecting a project, THEN THE system SHALL reject the request and indicate that a project is required.

IF an employee attempts to start a timer with a task that does not belong to the selected project, THEN THE system SHALL reject the request and indicate that the task must belong to the selected project.

### Timelog Modification Restrictions

IF an employee or a user with time management permission attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the edit and indicate that timelogs in approved timesheets are locked and cannot be modified.

IF an employee attempts to delete a timelog that is part of a submitted timesheet, THEN THE system SHALL reject the deletion and indicate that the timelog is locked by a submitted timesheet.

IF an employee attempts to delete a timelog that is part of an approved timesheet, THEN THE system SHALL reject the deletion and indicate that the timelog is locked by an approved timesheet.

### Project Status and Timelog Restrictions

IF an employee attempts to create a timelog for a project whose status is "archived" or "completed", THEN THE system SHALL reject the request and indicate that the project does not accept new time entries.

### Employee Status and Time Restrictions

IF a deactivated employee attempts to create a timelog, THEN THE system SHALL reject the request and indicate that time tracking is not available for deactivated employees.

IF a deactivated employee attempts to submit a timesheet, THEN THE system SHALL reject the submission and indicate that timesheet submission is not available for deactivated employees.

### Task Assignment Restrictions

IF a user attempts to assign a task to an employee who is not a member of the task's project, THEN THE system SHALL reject the assignment and indicate that the employee must be added as a project member first.

### Self-Reference and Nesting Prevention

IF a user attempts to set a department as its own parent, THEN THE system SHALL reject the request and indicate that a department cannot be its own parent.

IF a user attempts to create a department parent-child relationship that would exceed one level of nesting (i.e., making a department with a parent itself a parent of another department), THEN THE system SHALL reject the request and indicate that only one level of department nesting is allowed.

IF a user attempts to set a task as its own parent, THEN THE system SHALL reject the request and indicate that a task cannot be its own parent.

IF a user attempts to create a task parent-child relationship that would exceed one level of nesting (i.e., making a subtask itself a parent of another task), THEN THE system SHALL reject the request and indicate that only one level of subtask nesting is allowed.

### Duplicate Membership Prevention

IF a user attempts to assign an employee to a project they are already a member of, THEN THE system SHALL reject the request and indicate that the employee is already a member of that project.

### General Validation and Access Failures

IF a required field is missing in any creation or update request, THEN THE system SHALL reject the request and indicate which required field is missing.

IF a value provided for a field does not match the expected format or is not among the allowed values, THEN THE system SHALL reject the request and indicate the expected format or the list of allowed values.

IF a user attempts to access or modify a resource that does not exist (e.g., a deleted project, a non-existent employee record, or a removed task), THEN THE system SHALL reject the request and indicate that the requested resource was not found.

IF a user attempts to perform an action without holding the required permission, THEN THE system SHALL reject the request and indicate that the action is not permitted for the user's current role.

IF a user attempts to access or modify data that belongs to an organization different from their currently selected organization context, THEN THE system SHALL reject the request and indicate that the data is not available in the current organization.