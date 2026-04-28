**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Organizations operate with strict data isolation. Each organization requires a unique name and valid currency code. Timezone must be a valid regional format. Fiscal start month must be between 1 and 12. Organizations cannot be deleted if pending timesheets or active employee contracts exist. Owners can modify organization settings. Deletion permanently removes associated employees, projects, tasks, timelogs, and timesheets. Multi-tenancy ensures data separation. Validation prevents invalid regional configurations. Unique names must be unique within the platform boundary. Owners can edit organization settings. Pending timesheet check prevents deletion. Active contract resolution prevents deletion.

### Organization Name Uniqueness

WHEN an organization is created OR WHEN an organization name is modified, THE <system> SHALL ensure the name is unique across all organizations on the platform.

IF an organization name duplicates an existing organization name, THEN THE <system> SHALL reject the organization creation or name modification request.

### Regional Configuration Validation

WHEN an organization is created OR WHEN organization settings are modified, THE <system> SHALL require a valid currency code (e.g., USD, EUR, KRW).

WHEN an organization is created OR WHEN organization settings are modified, THE <system> SHALL require a valid regional timezone format.

WHEN an organization is created OR WHEN organization settings are modified, THE <system> SHALL require a fiscal start month between 1 (January) and 12 (December).

IF the currency code is not recognized, THEN THE <system> SHALL reject the organization creation or settings modification request.

IF the timezone does not follow a valid regional format, THEN THE <system> SHALL reject the organization creation or settings modification request.

IF the fiscal start month is outside the range of 1 to 12, THEN THE <system> SHALL reject the organization creation or settings modification request.

### Settings Modification Validation

WHEN an organization owner requests settings modification, THE <system> SHALL allow edits to organization name, description, logo image, currency code, timezone, and fiscal start month.

IF a settings modification request contains duplicate organization name, THEN THE <system> SHALL reject the modification.

IF a settings modification request contains invalid regional configuration (invalid currency code, invalid timezone format, or fiscal start month outside 1-12), THEN THE <system> SHALL reject the modification.

### Organization Deletion Prerequisites

WHEN an organization owner requests organization deletion, THE <system> SHALL check deletion prerequisites.

IF the organization has pending timesheets (timesheets not approved or rejected), THEN THE <system> SHALL reject the deletion request.

IF the organization has active employee contracts, THEN THE <system> SHALL reject the deletion request.

### Organization Deletion Cascade

WHEN an organization is deleted, THE <system> SHALL permanently delete all associated employees, projects, tasks, timelogs, and timesheets with that organization. THE <system> SHALL NOT remove the organization owner's user account.

### Multi-Tenancy Data Isolation

THE <system> SHALL enforce strict data isolation between organizations.

WHEN a user belonging to multiple organizations accesses data, THE <system> SHALL limit access to data within the currently selected organization context only.

THE <system> SHALL prevent employees in one organization from accessing data belonging to another organization.

## User Rules

Users register via a globally unique email address and secure password. Account deletion is strictly blocked until ownership transfer or organization deletion. Multi-organization membership allows users to simultaneously join multiple organizations. Users can switch contexts without logging out. Users can switch workspaces without logging out. User profile updates require a valid display name and avatar image. Account deactivation preserves historical activity records. Users can update contact details securely. Users can change their password. Account deletion requires ownership transfer. Multi-organization membership allows switching contexts without logging out. Users can update their profile. Account security management is supported. User profile is shared across organizations. Unique email validation prevents duplicate accounts. Account deactivation preserves historical activity. Users can update contact details securely.

### Email Validation and Uniqueness

Email addresses must follow a valid format with a local part and a domain component separated by an @ symbol. Registration requests with invalid email formats are rejected.

Email addresses must be globally unique across all organizations. Registration is rejected if the email address is already associated with an existing user account.

A single email address can belong to only one user account. Creating a new account with an email that is already registered is not allowed.

When a user registers with an email address that has a pending invitation, the user is automatically added to the corresponding organization upon successful registration.

### Password Requirements

Password must be provided during registration. Registration requests without a password are rejected.

Users can change their password at any time. Password change requests require the user to be authenticated.

When a user changes their password, the change applies globally across all organizations the user belongs to.

### Account Deletion Prerequisites

Account deletion is blocked if the user is the sole owner of any organization. The user must either transfer ownership to another member or delete the organization before proceeding with account deletion.

If the organization has no other members, the user must delete the organization before deleting their account.

Account deletion proceeds normally when the user is not the owner of any organization.

### Multi-Organization Membership and Context Switching

A user can belong to multiple organizations simultaneously. There is no limit on the number of organizations a user can join.

When a user belongs to multiple organizations, the user must select which organization context to work in at login. All actions are scoped to the selected organization.

Users can switch between organizations without logging out. The active context changes to the newly selected organization immediately.

### Profile Update Rules

Display name must not be empty. Profile updates that omit the display name or set it to an empty value are rejected.

Avatar image and phone number are optional fields. Profile updates may include, omit, or clear these fields without rejection.

When a user updates their profile, the changes apply globally across all organizations the user belongs to. Profile data is shared across all organizations.

### Account Deactivation Behavior

When a user account is deleted, employee records in other organizations where the user is a member are marked as deactivated.

Deactivated employees cannot log time or submit timesheets.

Historical data (timelogs and timesheets) for deactivated employees is preserved and remains viewable.

Deactivated employee records can be reactivated by users with the employee:manage permission.

## Employee Rules

Employees register via a globally unique email address and secure password. Account deletion is strictly blocked until dependent data is cleared. Employee records must link valid users to assigned roles and employment types. Multi-organization membership simultaneously enables joining multiple organizations. Users can switch contexts without logging out. Users can switch workspaces without logging out. User profile updates require a valid display name and avatar image. Account deactivation preserves historical activity records. Users can update contact details securely. Account deletion requires ownership transfer. Multi-organization membership allows switching contexts without logging out. User profile is shared across organizations. Unique email validation prevents duplicate accounts. Account deactivation preserves historical activity. Users can update contact details securely.

### Employee Registration

WHEN a user with the `employee:manage` permission invites a new employee by email, THE system SHALL create an employee invitation for that email address within the target organization.

WHEN an invitation is sent to an email address that already has an existing user account, THE system SHALL immediately add that user to the organization.

WHEN an invitation is sent to an email address without an existing user account, THE system SHALL create a pending invitation for that organization.

WHEN a user signs up with an email matching a pending invitation, THE system SHALL automatically add that user to the corresponding organization.

IF a user attempts to send a duplicate invitation to the same email address within the same organization, THEN THE system SHALL reject the invitation.

WHEN an invitation succeeds and an employee record is created, THE system SHALL automatically set the employee status to active.

### Multi-Organization Membership and Context

A user can belong to multiple organizations simultaneously, maintaining separate employee records in each.

WHEN logging in, THE system SHALL present the user with a list of organizations they belong to for context selection.

WHEN a user selects an organization context, THE system SHALL scope all subsequent actions to that organization.

WHEN a user switches organization context, THE system SHALL update the active context without requiring re-authentication.

THE user's global profile (display name, avatar, phone number) SHALL be shared across all organizations the user belongs to.

WHEN a user profile is updated, THE system SHALL reflect the updated information in all organization contexts.

Users can delete their own account only after transferring ownership if they are the sole owner (defined in 01-actors-and-auth).

WHEN a user deletes their account, THE system SHALL mark that user's employee records in all other organizations as deactivated.

### Employee Record Constraints

THE employee record SHALL reference exactly one valid user account.

THE employee record SHALL be associated with exactly one organization.

WHEN the position title field is empty or not provided, THE system SHALL accept the employee record as valid.

WHEN the employment type field is empty or not provided, THE system SHALL accept the employee record as valid.

IF the employment type is specified, THEN THE system SHALL accept only values within the set of full-time, part-time, contractor, and intern — any other value SHALL be rejected.

WHEN the `employee:manage` permission assigns or changes an employee's role, THE system SHALL record the change in the activity log.

THE assigned role SHALL always be a valid role existing within the employee's own organization.

WHEN editing an employee's department, position, or employment type, THE system SHALL require the `employee:manage` permission.

WHEN an employee's role is changed by the `employee:manage` permission, THE system SHALL record the change in the activity log.

### Employee Status Transitions

WHEN a user with the `employee:manage` permission deactivates an employee, THE system SHALL change that employee's status to deactivated.

WHILE an employee's status is deactivated, THE system SHALL prevent that employee from creating new timelogs.

WHILE an employee's status is deactivated, THE system SHALL prevent that employee from submitting timesheets for approval.

WHEN an employee is deactivated, THE system SHALL preserve all historical timelogs and timesheets associated with that employee.

WHEN a user with the `employee:manage` permission reactivates a deactivated employee, THE system SHALL change that employee's status back to active.

THE only permitted status transitions for employees SHALL be active to deactivated, and deactivated to active.

IF a user attempts to assign an employee with deactivated status to a project or task, THEN THE system SHALL reject the assignment.

### Department Assignment Rules

WHEN no department is assigned to an employee, THE system SHALL accept the employee record as valid.

WHEN a department is assigned to an employee, THE assigned department SHALL exist within the same organization — cross-organization department assignment SHALL be rejected.

WHEN a department is deleted, THE system SHALL clear the department reference for all employees previously assigned to that department.

WHEN editing an employee's department assignment, THE system SHALL require the `employee:manage` permission.

WHEN an employee is assigned to a parent department, THE employee SHALL be considered part of that parent department only — the employee SHALL NOT be automatically included in any child departments unless explicitly reassigned.

### Contract History

AN employee SHALL have at most one active contract at any given time.

WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date.

WHEN creating or editing a contract, THE system SHALL require the `employee:manage` permission.

A contract's pay period SHALL be restricted to hourly, daily, weekly, or monthly — any other value SHALL be rejected.

A contract SHALL require a working hours per week value — contracts without this value SHALL be rejected.

A contract SHALL require a positive pay rate — contracts with zero or negative pay rates SHALL be rejected.

WHEN a contract is no longer active (ended or superseded by a newer contract), THE system SHALL prevent any modifications to that contract.

## Department Rules

Departments require a unique name. Department rules.

### Department Naming and Uniqueness Validation

WHEN a department is created within an organization, THE system SHALL validate that the department name is not empty.

WHEN a department is created or updated, THE system SHALL validate that the department name is unique within the same organization.

IF a department with the identical name already exists in the organization, THE system SHALL reject the creation or update request.

THE system SHALL enforce case-sensitive uniqueness for department names within an organization.

IF multi-tenancy is enforced, THE system SHALL allow identical department names across different organizations without conflict.

WHEN editing a department name, THE system SHALL validate uniqueness against all other departments in the organization, excluding the department being edited.

### Department Hierarchy and Nesting Constraints

WHEN a parent department is assigned to a department, THE system SHALL validate that the parent department belongs to the same organization.

THE system SHALL allow a maximum of one level of nesting for departments (only parent and child relationship, no grandchildren).

IF a department already has a parent department, THE system SHALL prevent assigning another parent department to its child departments.

IF a circular reference is detected (a department set as its own parent or ancestor), THE system SHALL reject the relationship assignment.

THE system SHALL allow departments to exist without a parent department (top-level departments are valid).

WHEN a parent department is deleted, THE system SHALL automatically reassign child departments to have no parent (child departments become top-level rather than being deleted).

### Department Deletion and Employee Reassignment Rules

WHEN a department is deleted, THE system SHALL set the department reference for all employees who were assigned to that department.

THE system SHALL NOT delete employee records when their assigned department is deleted.

THE system SHALL allow deletion of a department even if employees are currently assigned to it.

WHEN a department is deleted, THE system SHALL prevent employees who lose their department assignment from being treated as inactive or deactivated.

THE system SHALL preserve all historical data associated with employees who are reassigned from a deleted department.

IF employees need to be reassigned to a new department after deletion, THE system SHALL require users with employee management permissions to update each employee record individually.

### Department Description and Formatting Rules

WHEN a department description is provided, THE system SHALL accept text content for internal documentation or display purposes.

THE department description is optional and MAY be left empty or null during creation or updates.

WHEN the department description exceeds the system's maximum character limit, THE system SHALL reject the creation or update request.

THE system SHALL preserve whitespace, line breaks, and formatting in the department description exactly as entered by the user.

IF special characters are used in the department description, THE system SHALL store and display them without automatic sanitization that alters user intent.

## Role Rules

Roles require a unique name within the organization. Roles must have a valid set of permissions. Roles cannot be deleted if assigned to employees. Roles are scoped to the organization. Users can create custom roles. Roles cannot be deleted until ownership transfer. Custom roles enforce valid permission sets. Validation prevents duplicate names. Role assignment rules. Ownership transfer is valid.

### Role Name Validation

WHEN a user creates a new custom role, THEN THE system SHALL validate that the role name is provided and not empty.

WHEN a user creates or updates a custom role, THEN THE system SHALL validate that the role name is unique within the organization.

WHEN a duplicate role name is detected during creation or update, THEN THE system SHALL reject the request.

### Permission Set Validation

WHEN a user creates or updates a custom role, THEN THE system SHALL validate that the permission set contains only valid permissions from the available permission list.

IF the permission set is empty or includes invalid, non-existent, or unauthorized permissions, THEN THE system SHALL reject the role creation or update request.

### Role Assignment Constraints

WHEN a user with employee management permission changes a role assignment for an employee, THEN THE system SHALL ensure that the employee holds exactly one role within that organization.

IF an employee already has a role assigned, THEN THE system SHALL replace the existing role with the new assignment and remove the previous role automatically.

### Role Creation Rules

WHEN an organization owner attempts to create a custom role, THEN THE system SHALL require both a valid role name and a valid permission set.

WHEN the validation passes for both the role name and permission set, THEN THE system SHALL create the custom role and associate it with the organization.

### Role Deletion Rules

WHEN an organization owner attempts to delete a built-in role, THEN THE system SHALL unconditionally reject the deletion request.

WHEN an organization owner attempts to delete a custom role, THEN THE system SHALL verify that no employees in the organization are currently assigned to that role.

IF the custom role is assigned to any employees, THEN THE system SHALL reject the deletion request.

## Contract Rules

Contracts require a start date. Past contracts are immutable. Valid pay period. Numeric pay rates. Working hours per week. Contracts rules.

### Contract Validation

WHEN creating a contract, THE system SHALL require a start date to be provided. IF a start date is not provided, THEN THE system SHALL reject the contract creation.

WHEN creating a contract, THE system SHALL require a pay rate to be provided as a numeric value. IF the pay rate is missing or is not a valid numeric value, THEN THE system SHALL reject the contract creation.

WHEN creating or editing a contract, THE system SHALL validate that the pay period is one of the allowed values: hourly, daily, weekly, or monthly. IF the pay period is not one of these values, THEN THE system SHALL reject the change.

WHEN creating a contract, THE system SHALL require working hours per week to be provided. IF working hours per week is not provided, THEN THE system SHALL reject the contract creation.

IF a contract end date is provided, THEN THE system SHALL validate that the end date is not earlier than the start date. IF the end date precedes the start date, THEN THE system SHALL reject the contract.

WHEN creating a contract, THE system SHALL treat the end date as optional. IF no end date is provided, THE system SHALL consider the contract as ongoing.

WHEN creating or editing a contract, THE system SHALL allow an optional notes field. IF notes are provided, THE system SHALL store the text. IF notes are not provided, THE system SHALL accept the contract.

### Contract Active State Rules

WHILE an employee has an active contract, THE system SHALL enforce that only one contract is active at any given time.

WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date.

WHILE a contract is active (has a start date and no end date, or an end date in the future), THE system SHALL allow users with the employee:manage permission to edit the contract.

WHILE a contract is in the past (end date has passed or the contract is no longer active), THE system SHALL prevent any edits to the contract. Past contracts are immutable historical records.

WHEN a user attempts to edit a past contract, THE system SHALL reject the request and indicate that past contracts cannot be modified.

### Contract Data Integrity Rules

WHEN creating a contract, THE system SHALL automatically associate the contract with the specified employee.

IF an employee does not belong to an organization, THEN THE system SHALL reject the contract creation.

WHEN a new contract's start date falls within the period covered by an existing active contract, THE system SHALL still allow the creation and automatically end the previous contract as defined in the active state rules.

IF a user without the employee:manage permission attempts to create or edit a contract, THEN THE system SHALL reject the action.

## Project Rules

Projects require a unique name. Budget hours validation. Start date rules.

### Unique Project Name

Project names must be unique within each organization. Two projects in the same organization cannot share the same name.

- IF a project name already exists within the same organization, THEN the system SHALL reject the creation of a new project with that same name.
- IF a project name already exists within the same organization, THEN the system SHALL reject any attempt to rename an existing project to that same name.
- THE project name uniqueness check applies only within the context of the same organization; projects in different organizations may share the same name.
- WHEN a project name is submitted, THE system SHALL validate it against all other active, archived, and completed projects in the same organization.

### Project Date Validation Rules

Project start and end dates are subject to the following validation rules:

- IF both a start date and an end date are set on a project, THEN the system SHALL reject the request WHEN the end date is earlier than the start date.
- IF the end date is left unset, THE system SHALL treat the project as ongoing (no restriction on end date).
- Start date and end date are optional fields; if neither is set, the system SHALL accept the project without date constraints.
- IF only the start date is set, THE system SHALL accept the project without requiring an end date.
- WHEN a user edits a project's dates, THE system SHALL validate the updated dates at the time of submission against the same rules.

### Project Deletion Prerequisites

Projects can only be deleted when they have no timelogs associated with them:

- IF a project has any timelogs recorded against it, THEN the system SHALL reject the deletion request.
- THE system SHALL allow deletion of a project only when the count of associated timelogs is zero, regardless of the project's current status.
- Timelogs on archived or completed projects count toward this restriction; archived or completed projects with timelogs cannot be deleted.
- Tasks, project memberships, and other related entities do not prevent deletion. Only the presence of timelogs blocks project deletion.
- WHEN a user attempts to delete a project with timelogs, THE system SHALL indicate that associated timelogs must be removed or transferred before deletion can proceed.

### Project Lifecycle Status Transitions

Project lifecycles follow a defined state transition model with specific constraints:

- WHEN a project is first created, THE system SHALL set the status to active by default.
- THE system SHALL allow transitioning an active project to either archived or completed status.
- IF a project is in archived status, THEN the system SHALL prevent any status transitions to active, completed, or other archived states.
- IF a project is in completed status, THEN the system SHALL prevent any status transitions to active, archived, or other completed states.
- IF a project is archived or completed, THEN the system SHALL reject any new timelogs associated with that project.
- THE system SHALL preserve all existing timelogs when a project transitions to archived or completed status.
- Archived and completed projects remain visible in project listings and can only be deleted when no timelogs exist on them.

## ProjectMembership Rules

Project memberships require valid roles. Project membership rules.

### Active Employee Requirement

IF an employee's status is deactivated, THEN THE system SHALL reject assigning that employee to any project.

Employees must have an active status to be assigned to projects. Deactivated employees cannot be added to project memberships, as they are unable to perform work or log time.

If a membership already exists and the employee is subsequently deactivated, the existing membership is preserved but the employee cannot perform membership-related actions (such as logging time on the project).

### Duplicate Membership Prevention

IF an employee is already assigned to a specific project, THEN THE system SHALL reject creating another membership for that same employee-project combination.

Each employee can be assigned to a given project only once. While employees can belong to multiple projects, duplicate memberships connecting the same employee to the same project are not permitted.

If a user with project:manage permission attempts to reassign an employee who is already a member, the request is rejected.

### Assignment Role Validation

IF an assignment role is not one of the valid values (member, project-lead), THEN THE system SHALL reject the project membership creation or update.

Every project membership must specify an assignment role. Only two roles are valid:

- **Member**: standard project participant
- **Project-lead**: can manage tasks within the project

A project membership cannot be created or updated without a valid assignment role. If the role field is missing or contains an invalid value, the request is rejected.

## Task Rules

Tasks require a valid status. Task rules.

### Task Title Requirement

WHEN a task is created, THE system SHALL require the title to be provided.

IF a task creation request does not include a title, THEN THE system SHALL reject the request.

IF a task edit request removes the title, THEN THE system SHALL reject the request.

### Task Status Values

WHEN a task status is set, THE system SHALL accept only one of the following values: open, in-progress, completed, or closed.

IF a task update specifies a value outside this set, THEN THE system SHALL reject the request.

WHEN a task status is updated, THE system SHALL record a history entry documenting the transition.

IF the status is updated, THEN THE system SHALL record the timestamp, the previous status, the new status, and the user who made the change.

### Task Priority Values

WHEN a task priority is set, THE system SHALL accept only one of the following values: low, medium, high, or urgent.

IF a task priority update specifies a value outside this set, THEN THE system SHALL reject the request.

### Task Assignment Constraints

WHEN an employee is assigned to a task, THE system SHALL verify that the employee is a project member of the project that contains the task.

IF the requested assigned employee is not a project member, THEN THE system SHALL reject the assignment.

### Task Nesting Constraints

WHEN a parent task is assigned, THE system SHALL verify that the parent task belongs to the same project as the child task.

IF the requested parent task belongs to a different project, THEN THE system SHALL reject the request.

WHEN a parent task is specified, THE system SHALL limit nesting to one level only; a subtask cannot have its own subtask.

IF a task is assigned as a parent to another task that already has a parent task, THEN THE system SHALL reject the request.

## Timelog Rules

Timelogs require date range. Timelog rules.

### #### Timelog Date and Duration Validation

WHEN creating a timelog, THE system SHALL require a valid calendar date representing when the work occurred and SHALL reject the request if the date is missing or invalid.

WHEN creating a timelog, THE system SHALL require a positive duration in minutes and SHALL reject the request if the duration is missing, zero, or negative.

IF a timelog is generated automatically when a timer is stopped, THEN THE system SHALL calculate the duration from the timer's start time to the stop time and round the result to the nearest minute.

IF the billable status is not explicitly specified when creating a timelog, THEN THE system SHALL default the timelog as billable.

## Timer Rules

Timers require start timestamp. Timer rules.

### Timer Validation Constraints

IF an employee already has an active timer, THEN THE system SHALL reject the request to start a new timer.
WHEN an employee initiates a timer, THE system SHALL require the selection of a project.
WHEN an employee initiates a timer, THE system SHALL permit the optional selection of a task.
WHEN an employee stops an active timer, THE system SHALL generate a timelog containing the calculated duration.
WHEN an employee stops an active timer, THE system SHALL round the calculated duration to the nearest minute.
WHEN an employee discards an active timer, THE system SHALL NOT generate a timelog.
WHILE a timer is active, THE system SHALL allow the employee to edit the timer's description, project, or task.
IF a running timer is not explicitly stopped or discarded by an employee, THEN THE system SHALL continue the timer indefinitely without automatic termination.
WHEN an employee starts a timer, THE system SHALL record the start timestamp, selected project, task if provided, and description.
WHILE a timer is active, THE system SHALL display the active timer status and tracked information to the employee on their personal dashboard.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Pagination Rules

WHEN users request an employee list, THE system SHALL return results in paginated sets.

WHEN users request a project list, THE system SHALL return results in paginated sets.

WHEN users request a timelog list, THE system SHALL return results in paginated sets.

WHEN users request a timesheet list, THE system SHALL return results in paginated sets.

WHEN users request an activity log list, THE system SHALL return results in paginated sets.

WHERE users browse any paginated list, THE system SHALL allow users to navigate between pages of results.

WHEN a paginated list contains no results matching the current criteria, THE system SHALL indicate that no items exist for the requested criteria.

### Filtering Rules

WHEN users view a timesheet list, THE system SHALL allow filtering by status (draft, submitted, approved, rejected) and date range.

WHEN users with report:view permission view the activity log, THE system SHALL allow filtering by action type, user who performed the action, and date range.

WHEN users view time reports, THE system SHALL allow filtering by date range, employee, project, and billable status.

WHEN users view weekly summary reports, THE system SHALL allow filtering by project.

WHEN users apply multiple filter criteria to any list, THE system SHALL return only items matching all selected criteria simultaneously.

IF applied filters result in no matching items, THEN THE system SHALL indicate that no items exist and allow users to clear or adjust their filters.

### Sorting Rules

WHEN users view a task list, THE system SHALL allow sorting by due date, priority, or creation date.

WHEN users select a sort criterion on a task list, THE system SHALL display tasks ordered according to the selected criterion.

WHEN users navigate between pages of a sorted task list, THE system SHALL maintain the selected sort order across pages.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organizational and Account Lifecycle Error Scenarios

WHEN an organization owner attempts to delete their organization, THEN THE system SHALL reject the deletion IF any timesheets with draft or submitted status exist in the organization.

WHEN an organization owner attempts to delete their organization, THEN THE system SHALL reject the deletion IF any employee contracts with no end date exist in the organization.

WHEN an organization is successfully deleted, THEN THE system SHALL permanently remove all employees, projects, tasks, timelogs, and timesheets belonging to that organization.

WHEN an organization is successfully deleted, THEN THE system SHALL retain the owner's user account but remove the organizational association.

IF a user who is the sole owner of an organization attempts to delete their account, THEN THE system SHALL reject the deletion and require ownership transfer to another member or organization deletion first.

WHEN a user who belongs to multiple organizations deletes their account, THEN THE system SHALL deactivate that user's employee records in all other organizations rather than removing them.

IF a custom role with assigned employees is targeted for deletion, THEN THE system SHALL reject the deletion until all employee assignments to that role are removed.

### Timesheet Submission and Rejection Scenarios

WHEN a timesheet with no included timelogs is submitted, THEN THE system SHALL reject the submission and require at least one timelog to be added.

WHEN a timesheet for a specific week is submitted and another timesheet for the same week already exists with submitted or approved status, THEN THE system SHALL reject the duplicate submission.

WHEN a user with time approval permission reviews a timesheet, THEN THE system SHALL accept approval and lock all included timelogs from further edits or deletion.

WHEN a user with time approval permission rejects a timesheet, THEN THE system SHALL require a rejection reason before processing.

WHEN a timesheet is rejected, THEN THE system SHALL return its status to draft and allow the employee to modify and resubmit.

WHEN a timesheet reaches approved status, THEN THE system SHALL record the review timestamp and the identity of the reviewer.

### Timelog and Timer Error Scenarios

IF an employee attempts to edit a timelog that is included in an approved timesheet, THEN THE system SHALL reject the edit operation.

IF an employee attempts to delete a timelog that is included in any submitted or approved timesheet, THEN THE system SHALL reject the deletion operation.

WHEN a user with time management permission edits or deletes any employee's timelogs, THEN THE system SHALL allow the operation regardless of timesheet status.

IF a timelog references a project where the employee is not assigned, THEN THE system SHALL reject the timelog creation.

IF a timelog references a task that does not belong to the selected project, THEN THE system SHALL reject the timelog creation.

WHEN a timer is stopped, THEN THE system SHALL create a timelog with the duration rounded to the nearest minute.

IF an employee attempts to start a second timer while one is already active, THEN THE system SHALL reject the start request until the existing timer is stopped or discarded.

WHEN an employee discards an active timer, THEN THE system SHALL remove the timer without creating any timelog.

### Entity Modification and Cascade Error Scenarios

IF a project contains any associated timelogs, THEN THE system SHALL reject deletion of that project.

WHEN a project transitions to archived or completed status, THEN THE system SHALL prevent new timelogs from being created against that project.

WHEN a project transitions to archived or completed status, THEN THE system SHALL preserve all existing timelogs associated with that project.

IF an employee who is not a project member is assigned to a task, THEN THE system SHALL reject the assignment.

IF a task status change occurs, THEN THE system SHALL record the change history including the timestamp, previous status, new status, and the identity of the person who made the change.

IF a new contract is created for an employee who currently has an active contract, THEN THE system SHALL automatically set the end date of the previous active contract to the day before the new contract's start date.

IF a user attempts to edit a contract that is no longer active, THEN THE system SHALL reject the edit operation.

IF a department is deleted, THEN THE system SHALL set the department reference to null for all employees previously assigned to that department without deactivating or removing the employees.