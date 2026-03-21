**erpHrm — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up using a unique email address as their identifier, and each email can only be registered once across the entire platform. Passwords are required for account creation and must be provided during login. Users can change their password at any time after authentication. A user account can belong to multiple organizations simultaneously, but the user must select one organization context after logging in. All subsequent actions are scoped to the currently selected organization context. Users can switch between organizations without logging out. When a user deletes their account, if they are the sole owner of any organization, they must transfer ownership or delete the organization first. Employee records in other organizations are marked as deactivated when a user account is deleted.

### Email Uniqueness and Validation

THE system SHALL require a unique email address for each user account.

THE system SHALL reject a sign-up request IF the provided email address is already registered in the system.

THE system SHALL treat email addresses as case-insensitive when checking for uniqueness.

THE system SHALL store the email address as the primary identifier for the user account.

THE system SHALL require the email address to be provided during the sign-up process.

THE system SHALL require the email address to be provided during the login process.

IF a user attempts to register with an email that already exists, THEN THE system SHALL reject the request and display an error indicating the email is already in use.

WHEN a user signs up with an email that has a pending invitation to an organization, THE system SHALL automatically add the user to that organization.

### Password Requirements

THE system SHALL require a password during user sign-up.

THE system SHALL require the password during login to authenticate the user.

THE system SHALL store passwords in a hashed format, not in plain text.

WHEN an authenticated user requests to change their password, THE system SHALL allow the password change.

WHEN a user changes their password, THE system SHALL require the user to be authenticated first.

THE system SHALL require the user to provide their current password before allowing a password change.

IF an unauthenticated user attempts to change a password, THEN THE system SHALL reject the request.

THE system SHALL accept the new password only if it meets the minimum security requirements defined by the system.

### Multi-Organization Membership

THE system SHALL allow a user account to belong to multiple organizations simultaneously.

WHEN a user logs in, THE system SHALL require the user to select an organization context to work in.

WHEN a user selects an organization context, THE system SHALL scope all subsequent actions to that selected organization.

THE system SHALL allow a user to switch between organizations without logging out.

WHEN a user switches organizations, THE system SHALL update the organization context for all subsequent operations.

THE system SHALL prevent a user from accessing data in organizations they do not belong to.

WHILE a user is working in a selected organization context, THE system SHALL only display data belonging to that organization.

IF a user belongs to only one organization, THE system SHALL automatically select that organization as the context after login.

### Account Deletion Rules

WHEN a user requests to delete their account, THE system SHALL check whether the user is the sole owner of any organization.

IF the user is the sole owner of an organization, THEN THE system SHALL reject the account deletion request.

IF the user is the sole owner of an organization, THEN THE system SHALL require the user to either transfer ownership to another member or delete the organization before proceeding with account deletion.

WHEN a user deletes their account and is not the sole owner of any organization, THE system SHALL proceed with the account deletion.

WHEN a user account is deleted, THE system SHALL mark all employee records associated with that user in other organizations as "deactivated".

THE system SHALL preserve the historical data (timelogs, timesheets) of deactivated employee records.

IF an account deletion is attempted while the user is the sole owner of an organization, THEN THE system SHALL display an error indicating the ownership transfer or organization deletion requirement.

WHEN a user account is deleted, THE system SHALL remove the user's association with all organizations except for the deactivated employee records preserved for historical purposes.

## Organization Rules

Each organization operates as an independent tenant with complete data isolation from other organizations. An organization must have a name and currency, while description and logo image are optional. Timezone and fiscal start month are required settings for each organization. Organization owners can edit all organization settings. An organization can only be deleted when all pending timesheets are resolved (approved or rejected) and there are no active employee contracts. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's user account remains but is no longer associated with the deleted organization.

### Independent Tenant Isolation

THE system SHALL maintain complete data isolation between organizations.

Each organization operates as an independent tenant with its own employees, projects, departments, roles, tasks, timelogs, and timesheets. THE system SHALL ensure that employees in one organization cannot access data from another organization.

WHEN a user belongs to multiple organizations, THE system SHALL restrict all data access to the currently selected organization context.

THE system SHALL enforce organization context on every data operation to prevent cross-organization data leakage.

### Required Organization Attributes

THE system SHALL require the following attributes when creating an organization:

- **Organization name**: THE system SHALL reject organization creation if the name is not provided.
- **Currency**: THE system SHALL require a currency setting (e.g., USD, EUR, KRW) for each organization. THE system SHALL reject organization creation if currency is not specified.
- **Timezone**: THE system SHALL require a timezone configuration for each organization. THE system SHALL reject organization creation if timezone is not specified.
- **Fiscal start month**: THE system SHALL require a fiscal start month setting for each organization. THE system SHALL reject organization creation if fiscal start month is not specified.

The following attributes are optional:
- Description
- Logo image

THE organization owner SHALL be permitted to edit all organization settings after creation.

### Organization Deletion Prerequisites

THE system SHALL enforce the following conditions before allowing organization deletion:

**Timesheet Resolution Requirement**
IF the organization has any pending timesheets, THEN THE system SHALL reject the deletion request.

THE system SHALL only permit organization deletion when all timesheets are resolved (approved or rejected).

**Active Contract Restriction**
IF the organization has any active employee contracts, THEN THE system SHALL reject the deletion request.

THE system SHALL only permit organization deletion when there are no active employee contracts in the organization.

### Permanent Data Deletion on Organization Removal

WHEN an organization is deleted, THE system SHALL permanently delete all associated data including:

- All employee records
- All projects
- All tasks
- All timelogs
- All timesheets
- All departments
- All roles
- All invitations
- All activity logs

THE system SHALL perform irreversible deletion of all organization-scoped data.

THE system SHALL NOT allow recovery of deleted organization data after deletion is completed.

### Owner Account Preservation

WHEN an organization is deleted, THE system SHALL preserve the owner's user account.

THE system SHALL remove the association between the owner's account and the deleted organization.

THE owner's user profile (display name, avatar image, phone number) SHALL remain intact and accessible.

IF the owner belongs to other organizations, THE system SHALL maintain those memberships without change.

IF the owner has no remaining organization memberships, THE system SHALL allow the owner to create a new organization or wait for invitations to other organizations.

## Employee Rules

Each employee record is associated with exactly one user account and belongs to one organization. An employee must be assigned exactly one role within their organization. Department assignment is optional and can be null. Position or title is optional. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status is either active or deactivated. Deactivated employees cannot log time or submit timesheets, but their historical data is preserved. Deactivated employees can be reactivated to restore full access. A user can have multiple employee records across different organizations, but only one employee record per organization.

### Employee Role Assignment

Each employee within an organization SHALL be assigned exactly one role.

THE system SHALL enforce that an employee cannot have multiple roles within the same organization.

WHEN a role is assigned to an employee, THE system SHALL replace any previously assigned role with the new role.

IF an attempt is made to assign multiple roles to the same employee, THEN THE system SHALL reject the operation with an error indicating that only one role is allowed per employee.

The assigned role determines the employee's permissions within the organization as defined in the role's permission set.

### Optional Employee Attributes

Department assignment for an employee SHALL be optional.

Position or title for an employee SHALL be optional.

IF a department is not assigned to an employee, THEN the employee's department SHALL be null.

IF a position is not specified for an employee, THEN the position field SHALL remain empty.

WHEN creating or editing an employee record, THE system SHALL accept submissions without department or position values.

The absence of department or position SHALL NOT prevent an employee from logging time, submitting timesheets, or being assigned to projects.

### Employment Type Requirement

Each employee SHALL have an employment type specified.

THE system SHALL accept only the following employment types: full-time, part-time, contractor, or intern.

IF an employment type is not provided during employee creation, THEN THE system SHALL reject the operation with an error indicating that employment type is required.

IF an invalid employment type value is provided, THEN THE system SHALL reject the operation with an error indicating the valid employment type options.

THE system SHALL NOT allow an employment type to be null or empty after the employee record is created.

### Employee Status Constraints

Each employee SHALL have a status of either active or deactivated.

THE system SHALL default the status of a new employee to active upon creation.

IF an attempt is made to set an invalid status value, THEN THE system SHALL reject the operation with an error indicating valid status options.

THE system SHALL NOT allow an employee to have a null or undefined status.

Only users with the `employee:manage` permission SHALL be permitted to change an employee's status.

### Deactivation Effects

WHEN an employee is deactivated, THE system SHALL prevent the employee from creating new timelogs.

WHEN an employee is deactivated, THE system SHALL prevent the employee from submitting timesheets.

WHEN an employee is deactivated, THE system SHALL preserve all historical timelogs associated with that employee.

WHEN an employee is deactivated, THE system SHALL preserve all historical timesheets associated with that employee.

WHEN an employee is deactivated, THE system SHALL retain the employee's project memberships and task assignments as historical records.

IF a deactivated employee attempts to log in and access organization data, THEN THE system SHALL deny access to time tracking and timesheet features.

WHEN a deactivated employee is reactivated, THE system SHALL restore full access to time tracking and timesheet features.

THE system SHALL allow multiple deactivation and reactivation cycles for the same employee without data loss.

### Employee Record Per Organization

A user SHALL have at most one employee record per organization.

IF an attempt is made to create a second employee record for the same user within the same organization, THEN THE system SHALL reject the operation with an error indicating that the user already has an employee record in that organization.

A user MAY have employee records in multiple different organizations simultaneously.

WHEN viewing employee records, THE system SHALL display each user's employee record separately for each organization they belong to.

IF a user is removed from an organization, THEN the employee record SHALL be deactivated rather than deleted to preserve historical data integrity.

## Role Rules

Each organization maintains its own set of roles independently. Three built-in roles exist and cannot be deleted: Owner, Manager, and Employee. Custom roles can be created with a name and a set of permissions. Available permissions include org management, employee management and viewing, project management and viewing, time management and approval, time viewing for all employees, and report viewing. A role cannot be deleted if any employee is currently assigned to it. Role assignment can only be changed by users with employee management permission. Each employee must have exactly one role at any time.

### Organization-Scoped Roles

Each organization maintains its own independent set of roles.
Roles created in one organization are not visible or usable in any other organization.
When a user creates an organization, the three built-in roles are automatically created for that organization.
Role definitions, including names and permissions, are isolated per organization.
A role assigned to an employee in one organization has no effect on the employee's role in other organizations.
Users who belong to multiple organizations may have different roles in each organization.
Role management actions (create, edit, delete) affect only the currently selected organization.
Custom roles created in one organization cannot be copied or shared with another organization.

### Built-in Role Immutability

Every organization has exactly three built-in roles: Owner, Manager, and Employee.
Built-in roles are created automatically when an organization is created.
The Owner role has all available permissions and cannot have its permission set modified.
The Manager role has a predefined set of permissions and cannot have its permission set modified.
The Employee role has a predefined set of permissions and cannot have its permission set modified.
Built-in roles cannot be deleted under any circumstances.
The names of built-in roles cannot be changed.
Built-in roles serve as the foundation for role assignment and cannot be removed from the role list.
Users with organization management permission cannot delete built-in roles.

### Custom Role Definition

Organization owners can create custom roles beyond the three built-in roles.
Each custom role must have a name.
The role name must be unique within the organization.
Each custom role must have at least one permission assigned.
The available permissions for custom roles are: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view.
A custom role can have any combination of the available permissions.
Organization owners can edit the name and permission set of existing custom roles.
Editing a custom role's permissions immediately affects all employees assigned to that role.
A custom role can have its permissions increased or decreased.
An empty permission set is not allowed for any role.

### Role Deletion Constraints

A role cannot be deleted if any employee is currently assigned to that role.
Before deleting a role, all employees assigned to that role must be reassigned to a different role.
Built-in roles cannot be deleted regardless of whether employees are assigned to them.
If an attempt is made to delete a role with assigned employees, the deletion is rejected with an error indicating the number of affected employees.
When the last employee is removed from a custom role, the role becomes eligible for deletion.
Role deletion is permanent and cannot be undone.
Deleting a role does not affect historical activity log entries that referenced the role.
Only organization owners can delete custom roles.

### Role Assignment Authority

Role assignment can only be changed by users with the employee:manage permission.
Organization owners have the employee:manage permission through their built-in role.
Managers may have the employee:manage permission depending on their role configuration.
The employee themselves cannot change their own role.
When a new employee is invited to an organization, a role must be assigned during the invitation process.
If no specific role is provided during invitation, the Employee role is assigned by default.
Changing an employee's role takes effect immediately.
The previous role assignment is replaced entirely by the new role assignment.
An employee always has exactly one role at any given time (defined in Employee Rules).
Role changes are recorded in the activity log with the action type 'role_changed'.

## Department Rules

Each department must have a name, while description is optional. Departments support one level of nesting through an optional parent department reference. A department cannot be its own parent. When a department is deleted, all employees assigned to that department have their department reference set to null, but the employees themselves are not deleted. Users with organization management permission can create, edit, and delete departments. The same department name can exist under different parent departments.

### Department Name Validation

THE system SHALL require each department to have a name.

IF a department is created without a name, THEN THE system SHALL reject the request.

IF a department is updated to have an empty name, THEN THE system SHALL reject the request.

THE system SHALL trim leading and trailing whitespace from the department name before validation.

IF the trimmed department name is empty, THEN THE system SHALL reject the request.

### Department Description

THE system SHALL allow each department to have an optional description.

WHEN a department is created without a description, THE system SHALL accept the request.

WHEN a department is updated to remove its description, THE system SHALL accept the request.

THE system SHALL allow the description to contain multi-line text.

### Parent Department Assignment

THE system SHALL allow each department to optionally reference a parent department.

WHEN a department is created without a parent department, THE system SHALL accept the request and create a top-level department.

THE system SHALL restrict department nesting to one level only.

IF a department is assigned as its own parent, THEN THE system SHALL reject the request.

IF a department attempts to create a circular parent reference, THEN THE system SHALL reject the request.

IF a department is assigned a parent department that is already a child department, THEN THE system SHALL reject the request to maintain the one-level nesting constraint.

### Department Name Uniqueness

THE system SHALL enforce department name uniqueness within the same parent scope.

IF a department is created with a name that already exists under the same parent department, THEN THE system SHALL reject the request.

IF a department is created with a name that already exists as a top-level department and the new department is also top-level, THEN THE system SHALL reject the request.

THE system SHALL allow the same department name to exist under different parent departments.

THE system SHALL allow the same department name to exist in different organizations.

### Department Deletion Behavior

WHEN a department is deleted, THE system SHALL set the department reference of all assigned employees to null.

WHEN a department is deleted, THE system SHALL preserve all employees who were assigned to that department.

THE system SHALL NOT delete any employee when their department is deleted.

THE system SHALL preserve all historical data of employees whose department reference is set to null due to department deletion.

### Department Management Permissions

THE system SHALL require organization management permission to create a department.

THE system SHALL require organization management permission to edit a department.

THE system SHALL require organization management permission to delete a department.

IF a user without organization management permission attempts to create a department, THEN THE system SHALL reject the request.

IF a user without organization management permission attempts to edit a department, THEN THE system SHALL reject the request.

IF a user without organization management permission attempts to delete a department, THEN THE system SHALL reject the request.

## Contract Rules

An employee can have multiple contracts as historical records, but only one contract can be active at any time. Each contract requires a start date and a pay rate. End date is optional, and null indicates an ongoing contract with no end date. Pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is a required numeric value. Notes are optional. When a new contract is created, the previous active contract is automatically ended by setting its end date to the day before the new contract starts. Past contracts are immutable and cannot be edited once they are no longer active. Only the current active contract can be modified.

### Active Contract Constraint

THE system SHALL ensure that each employee has at most one active contract at any given time.

WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically set the end date of the existing active contract to the day before the new contract's start date.

IF an attempt is made to create a contract with a start date that is on or before the end date of any existing active contract for the same employee, THEN THE system SHALL reject the request with an error indicating the date conflict.

WHERE an employee has no active contract, THE system SHALL allow creation of a new contract without requiring any end date for previous contracts.

### Contract Field Validation

THE system SHALL require a start date for every contract.

THE system SHALL require a pay rate for every contract.

THE system SHALL require a pay period to be specified for every contract.

THE system SHALL require working hours per week to be specified for every contract.

IF a contract is submitted without a start date, THEN THE system SHALL reject the request.

IF a contract is submitted without a pay rate, THEN THE system SHALL reject the request.

IF a contract is submitted without a pay period, THEN THE system SHALL reject the request.

IF a contract is submitted without working hours per week, THEN THE system SHALL reject the request.

THE system SHALL accept pay period values only from the following set: hourly, daily, weekly, monthly.

IF a pay period value is not one of the allowed values, THEN THE system SHALL reject the request.

### End Date and Ongoing Contracts

THE system SHALL allow the end date of a contract to be optional.

WHEN a contract is created without an end date, THE system SHALL interpret it as an ongoing contract with no predetermined end date.

WHERE a contract has no end date, THE system SHALL consider that contract as active until a new contract is created for the same employee.

IF an end date is provided, THEN THE system SHALL validate that the end date is on or after the start date.

IF the end date is before the start date, THEN THE system SHALL reject the request with an error indicating the date range is invalid.

### Contract Editability Rules

WHILE a contract is active, THE system SHALL allow users with employee:manage permission to edit the contract details.

WHILE a contract is no longer active, THE system SHALL prevent any modifications to the contract.

IF an attempt is made to edit a past contract, THEN THE system SHALL reject the request with an error indicating that past contracts are immutable.

THE system SHALL preserve all past contracts as immutable historical records.

WHEN the current active contract is edited, THE system SHALL allow modifications to the end date, pay rate, pay period, working hours per week, and notes fields.

WHEN the current active contract is edited, THE system SHALL NOT allow modification of the start date if it would create a gap or overlap with previous contracts.

### Contract Deletion Rules

THE system SHALL NOT allow deletion of any contract record.

IF an attempt is made to delete a contract, THEN THE system SHALL reject the request.

The system SHALL preserve all contracts as historical records for audit and compliance purposes.

## Project Rules

Each project must have a name and a color code, while description is optional. Project status must be one of: active, archived, or completed. Budget hours is optional and represents total estimated hours for the project. Start date and end date are both optional. Archived or completed projects cannot receive new timelogs, but existing timelogs are preserved. A project can only be deleted if it has no associated timelogs. Projects are scoped to a single organization and cannot reference data from other organizations.

### Project Creation Validation

THE system SHALL require a name when creating a project.

THE system SHALL require a color code when creating a project.

THE system SHALL accept an optional description when creating a project.

THE system SHALL accept optional budget hours when creating a project.

THE system SHALL accept optional start date and end date when creating a project.

IF the project name is not provided, THEN THE system SHALL reject the project creation request.

IF the color code is not provided, THEN THE system SHALL reject the project creation request.

### Project Status and Timelog Restrictions

WHEN a project status is archived or completed, THE system SHALL prevent creation of new timelogs for that project.

WHILE a project is archived or completed, THE system SHALL preserve all existing timelogs associated with that project.

IF an employee attempts to log time on an archived or completed project, THEN THE system SHALL reject the timelog creation request.

THE system SHALL allow viewing of existing timelogs on archived or completed projects.

### Project Deletion Rules

THE system SHALL allow project deletion only when the project has no associated timelogs.

IF a project has one or more associated timelogs, THEN THE system SHALL reject the deletion request.

WHEN a project deletion is requested and the project has no timelogs, THE system SHALL permanently remove the project and all associated tasks and project member assignments.

### Project Organization Scope

THE system SHALL restrict each project to a single organization.

THE system SHALL prevent a project from referencing employees, tasks, or other entities belonging to a different organization.

WHEN a project is created, THE system SHALL automatically associate it with the current organization context.

IF a user attempts to assign an employee from a different organization to a project, THEN THE system SHALL reject the assignment request.

## ProjectMember Rules

Each project membership links one employee to one project with an assigned role. The member role must be either member or project-lead. An employee can be assigned to multiple projects simultaneously. Project leads can manage tasks within their assigned project, while regular members cannot. A project membership can only be created if the employee exists in the same organization as the project. Users with project management permission can assign or remove employees from projects. Employees can view projects they are assigned to but cannot manage membership themselves.

### Project Member Role Assignment

Each project membership must have exactly one assigned role.

THE system SHALL accept only "member" or "project-lead" as valid role values for a project membership.

IF a project membership is created or updated with a role other than "member" or "project-lead", THEN the system SHALL reject the request.

The role value is required for every project membership.

THE system SHALL NOT allow a project membership to exist without an assigned role.

### Multiple Project Membership

An employee can be assigned to multiple projects within the same organization.

THE system SHALL allow the same employee to appear in multiple project memberships.

THE system SHALL NOT limit the number of projects an employee can be assigned to.

IF an employee is assigned to a project they are already a member of, THEN the system SHALL reject the duplicate assignment.

Each project membership is a unique combination of one employee and one project.

THE system SHALL NOT allow multiple project memberships with the same employee and the same project.

### Project Lead Task Management Rights

Project leads have elevated permissions within their assigned project.

WHERE an employee has the "project-lead" role in a project membership, THE system SHALL allow that employee to create, edit, and manage tasks within that project.

Project leads can manage tasks without requiring the project-wide "project:manage" permission.

WHERE an employee has only the "member" role in a project membership, THE system SHALL NOT allow that employee to create or edit tasks within that project.

Project leads can only manage tasks in projects where they have the "project-lead" role.

THE system SHALL NOT grant project lead task management rights for projects where the employee is not a member or has only the "member" role.

### Organization Boundary Constraint

Project memberships must remain within organizational boundaries.

WHEN a project membership is created, THE system SHALL verify that the employee and the project belong to the same organization.

IF the employee belongs to a different organization than the project, THEN the system SHALL reject the project membership creation.

THE system SHALL NOT allow cross-organization project memberships.

An employee can only be assigned to projects that exist within their organization.

THE system SHALL enforce organization isolation for all project membership operations including creation, modification, and viewing.

### Project Member Assignment and Removal

Project membership management requires appropriate permissions.

WHEN a user attempts to assign an employee to a project, THE system SHALL verify that the user has the "project:manage" permission.

IF the user lacks the "project:manage" permission, THEN the system SHALL reject the assignment request.

WHEN a user attempts to remove an employee from a project, THE system SHALL verify that the user has the "project:manage" permission.

IF the user lacks the "project:manage" permission, THEN the system SHALL reject the removal request.

Project leads cannot add or remove project members even within projects where they have the "project-lead" role.

THE system SHALL require the "project:manage" permission for all project membership modifications regardless of the user's project-lead status.

### Project Membership View Access

Access to view project membership is controlled by permissions and membership status.

WHERE an employee is a member of a project, THE system SHALL allow that employee to view the project membership list for that project.

WHERE an employee has the "project:manage" permission, THE system SHALL allow that employee to view the project membership list for all projects in the organization.

WHERE an employee has the "project:view" permission, THE system SHALL allow that employee to view the project membership list for all projects in the organization.

WHERE an employee is not a member of a project and lacks "project:manage" or "project:view" permission, THE system SHALL NOT allow that employee to view the project membership list.

Employees can view which projects they are personally assigned to without additional permissions.

THE system SHALL allow any employee to view their own project membership list across all organizations they belong to.

## Task Rules

Each task must have a title, while description is optional. Task status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Estimated hours and due date are both optional. The assigned employee must be a member of the parent project. Tasks support one level of nesting through an optional parent task reference, allowing subtasks. A task cannot be its own parent. Project leads can edit tasks within their project, while users with project management permission can edit any task. Tasks inherit organization scope from their parent project.

### Task Title Requirement

Each task must have a title.

If a title is not provided during task creation, the request is rejected.
If the title consists only of whitespace, the request is rejected.
The title identifies the task within its parent project.

### Task Description Optionality

A task description is optional.

If no description is provided, the task is created without a description.
The description can be added or modified during task editing.
The description can be removed by setting it to empty.

### Task Status and Priority Constraints

Each task must have a status.

The status must be one of: open, in-progress, completed, or closed.
If a status is not provided during task creation, the default status is open.
If an invalid status value is provided, the request is rejected.

Each task must have a priority.

The priority must be one of: low, medium, high, or urgent.
If a priority is not provided during task creation, the default priority is medium.
If an invalid priority value is provided, the request is rejected.

### Optional Task Fields

Estimated hours is an optional field.

If no estimated hours is provided, the task is created without an estimate.
The estimated hours, if provided, must be a positive numeric value.
If a negative estimated hours value is provided, the request is rejected.

Due date is an optional field.

If no due date is provided, the task is created without a deadline.
The due date can be set or modified during task editing.
The due date can be removed by setting it to empty.

### Task Assignment Constraints

An assigned employee must be a member of the parent project.

If the assigned employee is not a project member, the request is rejected.
If the assigned employee is deactivated, the request is rejected.
If the assigned employee belongs to a different organization than the project, the request is rejected.

Task assignment is optional.

If no employee is assigned, the task remains unassigned.
An unassigned task can be assigned later during editing.

### Subtask Nesting Rules

Tasks support one level of nesting through an optional parent task reference.

A task cannot be its own parent.
If a task references itself as its parent, the request is rejected.

The parent task must belong to the same project.
If the parent task belongs to a different project, the request is rejected.

Only one level of nesting is allowed.
A subtask cannot have its own subtasks.
If an attempt is made to create a subtask under another subtask, the request is rejected.

When a parent task is deleted, its subtasks become top-level tasks in the same project.

### Task Editing Permissions

Project leads can edit tasks within their assigned projects.

A project lead can modify any task in projects where they hold the project-lead role.
Project leads cannot edit tasks in projects where they are only a member.

Users with the project:manage permission can edit any task in the organization.

Project management permission overrides project membership requirements.

Employees who are not project leads and do not have project:manage permission cannot edit tasks.

Editing permissions are validated before any modification is applied.
If the user lacks editing permission, the request is rejected.

## TaskHistory Rules

Each task history entry records a status change made to a task. The entry must include a timestamp, the old status value, the new status value, and the user who made the change. Both old and new status values must be valid task statuses: open, in-progress, completed, or closed. Task history entries are immutable and cannot be edited or deleted after creation. History entries are automatically created when a task status changes. Each history entry belongs to exactly one task.

### Task History Entry Creation

WHEN a task status changes, THE system SHALL automatically create a task history entry recording the change.

Each task history entry records only status changes. Other task modifications such as title, description, priority, or assignment updates do not create history entries.

Each task history entry belongs to exactly one task. A single task may have multiple history entries representing its complete status change history over time.

If a status change occurs, THE system SHALL create exactly one history entry for that single transition.

Multiple simultaneous status changes to the same task are not possible because a task has only one status at any given time.

THE system SHALL preserve the complete chronological sequence of all status changes for each task through its history entries.

### Required Fields for Task History

THE system SHALL require a timestamp for every task history entry.

The timestamp records when the status change occurred and must not be null or empty.

THE system SHALL require both the old status and the new status for every task history entry.

The old status represents the task's status before the change.
The new status represents the task's status after the change.

THE system SHALL record which user made the status change for every task history entry.

The user reference must identify the person who performed the action that caused the status transition.

IF any required field is missing during history entry creation, THE system SHALL reject the history entry creation.

Required fields are: timestamp, old status, new status, and the user who made the change.

### Task History Immutability

THE system SHALL treat all task history entries as immutable records.

Task history entries cannot be edited after creation.

Task history entries cannot be deleted after creation.

This immutability ensures the integrity and auditability of the task's status change history.

IF a user attempts to modify a task history entry, THE system SHALL reject the request.

IF a user attempts to delete a task history entry, THE system SHALL reject the request.

Historical records must accurately reflect what happened at the time it happened, without any possibility of retroactive alteration.

### Status Value Validation

THE system SHALL validate that both old status and new status values are valid task statuses.

Valid task status values are: open, in-progress, completed, and closed.

IF the old status is not a valid task status, THE system SHALL reject the history entry.

IF the new status is not a valid task status, THE system SHALL reject the history entry.

The old status and new status in a single history entry must represent an actual transition, meaning they must be different values.

IF the old status and new status are identical, THE system SHALL reject the history entry as no actual change occurred.

The old status must match the task's actual status at the time of the change to ensure historical accuracy.

## Timelog Rules

Each timelog must have a date and duration in minutes. Duration is recorded in whole minutes. The project is required and must be a project the employee is assigned to. Task assignment is optional but must belong to the selected project if specified. Description is optional. The billable flag defaults to true if not specified. Employees can only create timelogs for themselves. Timelogs that are part of an approved timesheet cannot be edited by the employee. Timelogs that are part of any submitted or approved timesheet cannot be deleted by the employee. Users with time management permission can edit or delete any employee's timelogs regardless of timesheet status.

### Required Fields

Each timelog must have a date and a duration value.

THE system SHALL reject any timelog that does not specify a date.

THE system SHALL reject any timelog that does not specify a duration.

Duration must be recorded in whole minutes. Fractional minutes are not supported.

THE system SHALL store duration as an integer representing the number of minutes.

A timelog without a project reference is invalid.

THE system SHALL reject any timelog that does not specify a project.

### Project Assignment Validation

An employee can only log time against projects they are assigned to.

WHEN an employee creates or edits a timelog, THE system SHALL verify that the employee is assigned to the specified project.

IF an employee attempts to create a timelog for a project they are not assigned to, THEN THE system SHALL reject the request.

IF an employee attempts to edit a timelog to change the project to one they are not assigned to, THEN THE system SHALL reject the request.

Project assignment verification applies to all employees regardless of their role within the organization.

### Task Assignment Validation

Task assignment on a timelog is optional.

IF a task is specified on a timelog, THEN THE system SHALL verify that the task belongs to the specified project.

IF a task is specified that does not belong to the selected project, THEN THE system SHALL reject the request.

A timelog can reference a project without specifying a task.

A timelog can reference both a project and a task, as long as the task belongs to that project.

### Billable Default Value

Each timelog has a billable flag indicating whether the time is billable to a client.

WHEN a timelog is created without specifying a billable value, THE system SHALL set the billable flag to true.

The billable flag can be explicitly set to false during creation or editing.

Employees can change the billable status of their timelogs, subject to timesheet approval restrictions.

### Self-Only Timelog Creation

Employees can only create timelogs for themselves.

WHEN an employee creates a timelog, THE system SHALL automatically associate the timelog with the creating employee.

IF an employee attempts to create a timelog for another employee, THEN THE system SHALL reject the request.

This restriction applies to all employees, including those with manager or owner roles, unless they have explicit time management permission.

Users with the time management permission can create timelogs on behalf of other employees.

### Approved Timesheet Edit Restriction

Timelogs that are part of an approved timesheet cannot be edited by the employee who owns them.

IF a timelog is included in an approved timesheet, THEN THE system SHALL prevent the employee from editing that timelog.

This restriction ensures that approved time records remain immutable for audit and payroll purposes.

Employees can only edit timelogs that are either not part of any timesheet, or are part of a draft or rejected timesheet.

Users with the time management permission can edit timelogs regardless of timesheet approval status.

### Submitted Timesheet Delete Restriction

Timelogs that are part of a submitted or approved timesheet cannot be deleted by the employee who owns them.

IF a timelog is included in a submitted timesheet, THEN THE system SHALL prevent the employee from deleting that timelog.

IF a timelog is included in an approved timesheet, THEN THE system SHALL prevent the employee from deleting that timelog.

Employees can only delete timelogs that are not part of any timesheet, or are part of a draft or rejected timesheet.

Before deleting a timelog that is part of a draft timesheet, the employee must first remove it from the timesheet.

Users with the time management permission can delete timelogs regardless of timesheet status.

### Time Management Permission Override

Users with the time management permission can bypass timelog ownership and timesheet status restrictions.

WHEN a user with time management permission edits a timelog, THE system SHALL allow editing regardless of who owns the timelog.

WHEN a user with time management permission edits a timelog, THE system SHALL allow editing regardless of whether the timelog is in an approved timesheet.

WHEN a user with time management permission deletes a timelog, THE system SHALL allow deletion regardless of timesheet submission or approval status.

This override capability is intended for correcting errors and handling exceptional situations that require administrative intervention.

All edits and deletions performed by users with time management permission are recorded in the activity log for audit purposes.

## Timesheet Rules

A timesheet covers exactly one week from Monday to Sunday. Week start date must be a Monday, and week end date must be the corresponding Sunday. Timesheet status must be one of: draft, submitted, approved, or rejected. Total hours is calculated from included timelogs and cannot be manually set. A timesheet cannot be submitted if it contains no timelogs. Only one timesheet per employee per week can be in submitted or approved status. Rejection reason is required when a timesheet is rejected. Approved timesheets lock all included timelogs from further editing or deletion. Rejected timesheets return to draft status for modification and resubmission.

### Week Span Definition

A timesheet covers exactly one calendar week, from Monday through Sunday. The week start date must always be a Monday. The week end date must always be the corresponding Sunday of that same week.

IF a timesheet's week start date is not a Monday, THEN THE system SHALL reject the timesheet.

IF a timesheet's week end date is not a Sunday, THEN THE system SHALL reject the timesheet.

IF a timesheet's week end date does not correspond to the Sunday of the week containing the week start date, THEN THE system SHALL reject the timesheet.

### Timesheet Status Constraints

Every timesheet must have a status value. The status must be one of: draft, submitted, approved, or rejected.

WHEN a timesheet is created, THE system SHALL set its status to draft.

IF a timesheet status is set to any value other than draft, submitted, approved, or rejected, THEN THE system SHALL reject the request.

Status transitions follow these rules:
- A draft timesheet can transition to submitted
- A submitted timesheet can transition to approved or rejected
- A rejected timesheet transitions to draft
- An approved timesheet cannot transition to any other status

### Total Hours Calculation

The total hours value on a timesheet is automatically calculated from the included timelogs and cannot be manually set.

WHEN timelogs are added to or removed from a timesheet, THE system SHALL recalculate the total hours.

THE system SHALL sum the duration of all included timelogs in minutes and convert to hours for the total hours value.

IF an attempt is made to manually set the total hours value, THEN THE system SHALL reject the request and use the calculated value instead.

### Submission Rules

A timesheet cannot be submitted if it contains no timelogs.

IF a timesheet has no timelogs when submission is attempted, THEN THE system SHALL reject the submission and display an error indicating the timesheet must contain at least one timelog.

Only one timesheet per employee per week can be in submitted or approved status at any time.

IF an employee attempts to submit a timesheet for a week that already has another timesheet in submitted or approved status, THEN THE system SHALL reject the submission.

### Rejection Reason Requirement

When a timesheet is rejected, a rejection reason must be provided.

WHEN a user rejects a submitted timesheet, THE system SHALL require a rejection reason text to be entered.

IF a rejection is attempted without providing a rejection reason, THEN THE system SHALL reject the request and require the rejection reason to be specified.

The rejection reason text is stored with the timesheet record and made visible to the employee who submitted the timesheet.

### Approved Timesheet Locking

When a timesheet is approved, all timelogs included in that timesheet become locked and cannot be edited or deleted.

WHEN a timesheet status changes to approved, THE system SHALL lock all included timelogs.

WHILE a timelog is part of an approved timesheet, THE system SHALL prevent any modifications to that timelog.

WHILE a timelog is part of an approved timesheet, THE system SHALL prevent deletion of that timelog.

IF an attempt is made to edit or delete a timelog that is part of an approved timesheet, THEN THE system SHALL reject the request and display an error indicating the timelog is locked.

### Rejection and Resubmission

When a timesheet is rejected, it returns to draft status and becomes available for modification and resubmission.

WHEN a timesheet is rejected, THE system SHALL change its status to draft.

WHEN a timesheet returns to draft status after rejection, THE system SHALL unlock any timelogs that were locked during the approval process, allowing the employee to modify them.

After a rejected timesheet returns to draft, the employee can modify the included timelogs and resubmit the timesheet for approval.

A resubmitted timesheet follows the same submission rules as a new submission.

### Employee Week Ownership

Each employee can have exactly one timesheet per calendar week.

IF an employee attempts to create a timesheet for a week that already has an existing timesheet, THEN THE system SHALL reject the creation and direct the employee to the existing timesheet.

An employee can have multiple timesheets across different weeks, but never more than one timesheet for any specific week.

Timesheets for different weeks are independent and do not affect each other's status or timelogs.

## Timer Rules

Each employee can have at most one active timer at any time. A timer requires a start timestamp and a project selection. Task and description are optional. When a timer is stopped, a timelog is created with the calculated duration, rounded to the nearest minute. When a timer is discarded, no timelog is created and the timer is simply removed. Timers do not stop automatically and continue running indefinitely if the employee forgets to stop them. An employee can edit the description and project or task assignment of a running timer. Timer duration is only finalized when the timer is stopped.

### Single Active Timer Constraint

Each employee can have at most one active timer at any given time.

IF an employee attempts to start a new timer while an active timer already exists for that employee, THEN THE system SHALL reject the request.

The system SHALL verify that no active timer exists for the employee before allowing a new timer to be started.

### Timer Creation Requirements

A timer requires specific fields to be set when created.

WHEN an employee starts a timer, THE system SHALL require a project selection.

The project selected for a timer SHALL be one of the projects the employee is assigned to.

IF the selected project is not assigned to the employee, THEN THE system SHALL reject the timer creation.

A start timestamp SHALL be automatically recorded when the timer is started.

Task selection is optional. WHERE a task is specified for a timer, THE task SHALL belong to the selected project.

IF a task is specified that does not belong to the selected project, THEN THE system SHALL reject the timer creation.

Description is optional and can be provided when starting a timer or added later.

### Timer Duration Calculation

When a timer is stopped, the duration is calculated and used to create a timelog.

WHEN an employee stops a timer, THE system SHALL calculate the duration as the difference between the stop timestamp and the start timestamp.

WHEN the duration is calculated, THE system SHALL round the duration to the nearest minute.

The resulting timelog SHALL have the duration expressed in whole minutes.

### Timer Stop and Timelog Creation

Stopping a timer results in a timelog being created.

WHEN an employee stops a timer, THE system SHALL create a timelog with the following attributes: the date of the timer start, the calculated duration in minutes, the project the timer was associated with, the task if one was assigned, the description if one was provided, and a billable flag that defaults to true.

The created timelog SHALL be owned by the employee who stopped the timer.

### Timer Discard Behavior

A timer can be discarded without creating a timelog.

WHEN an employee discards a timer, THE system SHALL remove the timer without creating a timelog.

No time record is preserved when a timer is discarded.

### Timer Continuity Rule

Timers do not stop automatically.

WHILE a timer is running, THE timer SHALL continue running until the employee manually stops or discards it.

The system SHALL NOT automatically stop a timer under any circumstances.

IF an employee forgets to stop their timer, THE timer SHALL continue running indefinitely.

### Running Timer Modification

Employees can modify certain attributes of a running timer.

WHILE a timer is running, THE employee SHALL be able to edit the description.

WHILE a timer is running, THE employee SHALL be able to change the project assignment.

WHILE a timer is running, THE employee SHALL be able to change or add a task assignment.

IF the employee changes the project assignment, THE new project SHALL be one the employee is assigned to.

IF the employee changes the task assignment, THE new task SHALL belong to the selected project.

The start timestamp of a running timer SHALL NOT be modifiable.

## Invitation Rules

An invitation must have an email address. Invitation status must be either pending or accepted. If the invited email already has an existing user account, the user is immediately added to the organization and the invitation is marked as accepted. If the invited email has no existing account, a pending invitation is created and remains pending until the recipient signs up. When a user signs up with an email that has pending invitations, they are automatically added to all organizations with pending invitations for that email. An email can have multiple pending invitations from different organizations. Users with employee management permission can send invitations.

### Invitation Email Requirement

An invitation must include an email address. The email address is required and cannot be empty. The email address identifies the recipient who will be invited to join the organization. IF an invitation is submitted without an email address, THEN THE system SHALL reject the invitation.

### Invitation Status Values

Each invitation has a status that must be either "pending" or "accepted". An invitation begins in the pending status when created. The invitation status changes to accepted when the recipient joins the organization. IF an invitation status is set to a value other than pending or accepted, THEN THE system SHALL reject the status change.

### Existing Account Auto-Acceptance

WHEN an invitation is sent to an email address that already has a user account, THE system SHALL immediately add the user to the organization and mark the invitation as accepted. The user becomes an employee in the organization with the default role assigned. No pending invitation is created for users who already have an account. The invited user can immediately access the organization upon their next login.

### Pending Invitation for New Users

WHEN an invitation is sent to an email address that does not have an existing user account, THE system SHALL create a pending invitation. The pending invitation remains in pending status until the recipient signs up with that email address. Pending invitations do not expire. IF a pending invitation is created for an email that later signs up, THEN THE system SHALL automatically process the pending invitation.

### Automatic Organization Addition on Signup

WHEN a user signs up with an email address that has pending invitations, THE system SHALL automatically add the user to all organizations with pending invitations for that email. All pending invitations for that email are marked as accepted. The user becomes an employee in each organization with the default role assigned. The user can immediately access all organizations they were invited to upon completing signup.

### Multiple Pending Invitations

An email address can have multiple pending invitations from different organizations. Each pending invitation is independent and scoped to its respective organization. WHEN a user signs up with an email that has multiple pending invitations, THE system SHALL add the user to all organizations simultaneously. There is no limit on the number of pending invitations an email address can receive.

### Permission Requirement for Sending Invitations

Only users with employee management permission can send invitations to join an organization. IF a user without employee management permission attempts to send an invitation, THEN THE system SHALL reject the request. The employee management permission is granted through role assignment. Users with the Owner or Manager built-in roles have employee management permission by default.

### Organization Scope

Each invitation is scoped to exactly one organization. An invitation cannot exist without being associated with an organization. WHEN a user accepts an invitation, THE user SHALL only join the organization specified in the invitation. An invitation from one organization does not grant access to any other organization. The organization association is established when the invitation is created and cannot be changed.

## ActivityLog Rules

Each activity log entry must have a timestamp, the user who performed the action, an action type, and the target entity. Details are optional. Action type must be one of the predefined values: employee invited, employee deactivated, employee reactivated, contract created, contract edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, role assigned, or role changed. Activity log entries are immutable and cannot be edited or deleted after creation. Only users with organization management permission can view the full activity log.

### Activity Log Entry Requirements

Each activity log entry MUST have a timestamp recording when the action occurred.
Each activity log entry MUST reference the user who performed the action.
Each activity log entry MUST have an action type from the predefined list of allowed actions.
Each activity log entry MUST identify the target entity affected by the action.
WHEN an activity log entry is created, THE system SHALL record the organization context in which the action occurred.
Details about the action are OPTIONAL and MAY be included to provide additional context.
If details are provided, THE system SHALL store them as free-form text.

The action type MUST be one of the following predefined values:
- employee_invited
- employee_deactivated
- employee_reactivated
- contract_created
- contract_edited
- project_created
- project_archived
- project_completed
- project_deleted
- task_status_changed
- timesheet_submitted
- timesheet_approved
- timesheet_rejected
- role_assigned
- role_changed

IF an activity log entry is created with an action type not in the predefined list, THE system SHALL reject the entry.
IF the timestamp is missing, THE system SHALL reject the activity log entry creation.
IF the user reference is missing, THE system SHALL reject the activity log entry creation.
IF the target entity is missing, THE system SHALL reject the activity log entry creation.

### Activity Log Immutability

Activity log entries SHALL be immutable once created.
THE system SHALL NOT allow modification of any activity log entry after creation.
THE system SHALL NOT allow deletion of any activity log entry after creation.
This immutability requirement ensures a comprehensive and tamper-proof audit trail for organizational actions.
IF a user attempts to modify an activity log entry, THE system SHALL reject the request.
IF a user attempts to delete an activity log entry, THE system SHALL reject the request.

### Activity Log Access Control

Only users with the organization management permission SHALL be permitted to view the full activity log.
Users without the organization management permission SHALL NOT have access to the activity log.
THE system SHALL enforce organization context when displaying activity log entries.
A user viewing the activity log SHALL only see entries from their currently selected organization.
Activity log entries from one organization SHALL NOT be visible to users in a different organization context.

The activity log SHALL be paginated for viewing.
The activity log MAY be filtered by the following criteria:
- Action type (one or more of the predefined action types)
- User (who performed the action)
- Date range (when the action occurred)

IF multiple filters are applied, THE system SHALL return entries matching ALL filter criteria.
IF no filters are applied, THE system SHALL return all activity log entries for the organization in paginated form.

### System-Recorded Actions

Activity log entries SHALL be created automatically by the system when the corresponding actions occur.
THE system SHALL record an activity log entry WHEN an employee is invited to the organization.
THE system SHALL record an activity log entry WHEN an employee is deactivated.
THE system SHALL record an activity log entry WHEN an employee is reactivated.
THE system SHALL record an activity log entry WHEN a contract is created for an employee.
THE system SHALL record an activity log entry WHEN a contract is edited.
THE system SHALL record an activity log entry WHEN a project is created.
THE system SHALL record an activity log entry WHEN a project is archived.
THE system SHALL record an activity log entry WHEN a project is marked as completed.
THE system SHALL record an activity log entry WHEN a project is deleted.
THE system SHALL record an activity log entry WHEN a task status is changed.
THE system SHALL record an activity log entry WHEN a timesheet is submitted.
THE system SHALL record an activity log entry WHEN a timesheet is approved.
THE system SHALL record an activity log entry WHEN a timesheet is rejected.
THE system SHALL record an activity log entry WHEN a role is assigned to an employee.
THE system SHALL record an activity log entry WHEN an employee's role is changed.

Users SHALL NOT be able to manually create activity log entries.
Users SHALL NOT be able to suppress or skip activity log recording for tracked actions.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### List Filtering Capabilities

The system SHALL provide filtering capabilities for all list views to help users find specific records.

**Employee List Filtering**
Employees can filter the employee list by department, employment type, and status. Employees can also search the list by name to find specific individuals.

**Project List Filtering**
Projects can be filtered by their status (active, archived, or completed) to help users focus on relevant projects.

**Task List Filtering**
Tasks can be filtered by status, priority, and assigned employee. This enables project leads and managers to quickly locate tasks that need attention.

**Timelog Filtering**
Timelogs can be filtered by date range, project, task, and billable status. Employees viewing their own timelogs and users with time viewing permission can apply these filters.

**Timesheet Filtering**
Timesheets can be filtered by status (draft, submitted, approved, rejected) and date range. This helps approvers find pending submissions and employees review their timesheet history.

**Activity Log Filtering**
The activity log can be filtered by action type, the user who performed the action, and date range. This enables organization owners to investigate specific events or actions within a particular timeframe.

When a filter is applied, the system SHALL display only records matching all specified filter criteria. Multiple filters can be combined to narrow down results further. The system SHALL indicate which filters are currently active.

### List Sorting Capabilities

The system SHALL provide sorting capabilities to help users organize list data in meaningful orders.

**Task Sorting**
Tasks can be sorted by due date, priority, or creation date. Sorting by due date helps users identify upcoming deadlines. Sorting by priority surfaces urgent work. Sorting by creation date shows the chronological order of task creation.

The system SHALL support both ascending and descending sort orders. When a sort order is applied, the system SHALL maintain that order until the user changes it or navigates away from the list.

For lists where no explicit sorting is specified, the system SHALL apply a default sort order appropriate to the data type, such as most recent entries first or alphabetical order by name.

### List Pagination

The system SHALL provide pagination for all list views to ensure manageable data presentation and system performance.

**Paginated Lists**
The following lists are paginated: employee list, project list, timelogs, timesheets, and activity log.

When a list exceeds a certain number of records, the system SHALL divide the results into pages. Users can navigate between pages to view additional records.

The system SHALL indicate the current page position and total number of pages available. The system SHALL provide navigation controls to move to the next page, previous page, first page, and last page.

When filters are applied to a paginated list, the pagination SHALL update to reflect the filtered result count. If filtered results fit within a single page, the system SHALL display all results without pagination controls.

Pagination settings SHALL persist while the user remains on the same list view. When a user navigates away and returns to a list, default pagination settings SHALL be restored.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

WHEN a user attempts to sign up with an email address that already exists in the system, THE system SHALL reject the request and display a message indicating the email is already registered.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the request and display a message indicating invalid credentials.

WHEN a user attempts to log in with a non-existent email address, THE system SHALL reject the request and display a message indicating invalid credentials.

WHEN a user attempts to change their password and provides an incorrect current password, THE system SHALL reject the request and display a message indicating the current password is incorrect.

### Organization Operation Errors

IF an organization owner attempts to delete the organization while pending timesheets exist, THEN THE system SHALL reject the request and display a message indicating all timesheets must be resolved first.

IF an organization owner attempts to delete the organization while active employee contracts exist, THEN THE system SHALL reject the request and display a message indicating all employee contracts must be ended first.

IF a user attempts to edit organization settings without the org:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to create a department without the org:manage permission, THEN THE system SHALL reject the request.

### User Account Deletion Errors

IF a user attempts to delete their account while being the sole owner of an organization, THEN THE system SHALL reject the request and require the user to either transfer ownership to another member or delete the organization first.

WHEN a user deletes their account, THE system SHALL mark their employee records in other organizations as deactivated rather than deleting them.

IF a user attempts to delete their account but has pending invitations, THEN THE system SHALL cancel the pending invitations before proceeding with account deletion.

### Role Management Errors

IF a user attempts to delete a built-in role (Owner, Manager, or Employee), THEN THE system SHALL reject the request and display a message indicating built-in roles cannot be deleted.

IF a user attempts to delete a custom role that has employees assigned to it, THEN THE system SHALL reject the request and display a message indicating the role is in use.

IF a user attempts to create a custom role without the org:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to assign a role to an employee without the employee:manage permission, THEN THE system SHALL reject the request.

### Employee Management Errors

IF a user attempts to invite an employee without the employee:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to deactivate an already deactivated employee, THEN THE system SHALL reject the request and display a message indicating the employee is already deactivated.

IF a user attempts to reactivate an already active employee, THEN THE system SHALL reject the request and display a message indicating the employee is already active.

IF a user attempts to edit an employee record without the employee:manage permission, THEN THE system SHALL reject the request.

### Contract Errors

IF a user attempts to edit a past (historical) contract, THEN THE system SHALL reject the request and display a message indicating past contracts cannot be modified.

IF a user attempts to create a contract with a start date that is after an existing active contract's end date, THEN THE system SHALL display a warning about the gap in employment.

IF a user attempts to create a contract without the employee:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to view contracts without the employee:view permission (and is not viewing their own contracts), THEN THE system SHALL reject the request.

### Project Errors

IF a user attempts to create a project without the project:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to delete a project that has associated timelogs, THEN THE system SHALL reject the request and display a message indicating the project cannot be deleted because it has time entries.

IF a user attempts to archive or complete a project without the project:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to add timelogs to an archived or completed project, THEN THE system SHALL reject the request and display a message indicating the project is not active.

### Project Member Assignment Errors

IF a user attempts to assign an employee to a project without the project:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to assign an employee from a different organization to a project, THEN THE system SHALL reject the request.

IF a user attempts to remove an employee from a project without the project:manage permission, THEN THE system SHALL reject the request.

### Task Errors

IF a user attempts to create a task in a project without being a project lead or having the project:manage permission, THEN THE system SHALL reject the request.

IF a user attempts to assign a task to an employee who is not a member of the project, THEN THE system SHALL reject the request.

IF a user attempts to create a subtask more than one level deep (subtask of a subtask), THEN THE system SHALL reject the request.

IF a user attempts to edit a task without proper permission (project lead for their project or project:manage permission), THEN THE system SHALL reject the request.

### Timelog Errors

IF an employee attempts to create a timelog for a project they are not assigned to, THEN THE system SHALL reject the request.

IF an employee attempts to create a timelog with a task that does not belong to the selected project, THEN THE system SHALL reject the request.

IF an employee attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the request and display a message indicating the timelog is locked.

IF an employee attempts to delete a timelog that is part of a submitted or approved timesheet, THEN THE system SHALL reject the request.

IF a user attempts to edit or delete another employee's timelog without the time:manage permission, THEN THE system SHALL reject the request.

### Timesheet Errors

IF an employee attempts to submit a timesheet with no timelogs, THEN THE system SHALL reject the request and display a message indicating the timesheet cannot be empty.

IF an employee attempts to submit a timesheet when another timesheet for the same week is already submitted or approved, THEN THE system SHALL reject the request.

IF a user attempts to approve or reject a timesheet without the time:approve permission, THEN THE system SHALL reject the request.

IF a user attempts to approve a timesheet that is not in submitted status, THEN THE system SHALL reject the request.

IF a user attempts to reject a timesheet without providing a rejection reason, THEN THE system SHALL reject the request and require a reason to be provided.

### Timer Errors

IF an employee attempts to start a new timer while they already have an active timer running, THEN THE system SHALL reject the request and display a message indicating only one timer can be active at a time.

IF an employee attempts to stop or edit a timer that does not exist, THEN THE system SHALL reject the request.

IF a user attempts to view or modify another employee's timer, THEN THE system SHALL reject the request.

### Data Access Errors

IF a user attempts to access data from an organization they do not belong to, THEN THE system SHALL reject the request.

IF a user attempts to perform an action without the required permission, THEN THE system SHALL reject the request and display a message indicating insufficient permissions.

IF an employee attempts to view another employee's data without appropriate permissions, THEN THE system SHALL reject the request.

WHEN a user switches organization context, THE system SHALL ensure all subsequent requests are scoped to the selected organization and reject any cross-organization data access.