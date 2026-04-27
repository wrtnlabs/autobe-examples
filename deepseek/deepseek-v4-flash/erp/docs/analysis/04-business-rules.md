**hrmTimeTracking — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

An organization must have a name when it is created. The name cannot be empty. Each organization has a required currency setting such as USD, EUR, or KRW that determines how pay rates and budgets are displayed. The timezone setting must be a valid timezone identifier and affects how dates and times are presented throughout the organization. The fiscal start month defines when the organization's financial reporting period begins and must be a value between 1 and 12. The organization description and logo image are optional fields that may be left empty. Only the organization owner can modify these settings. When attempting to delete an organization, the system checks two conditions: all pending timesheets must be in an approved or rejected state, and there must be no active employee contracts. If either condition is not met, the deletion is rejected. Upon deletion, all dependent data including employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's user account remains active but loses association with the deleted organization.

### Organization Name Validation

WHEN an organization is created, THE system SHALL require a non-empty organization name.
IF the provided name is empty or consists only of whitespace, THEN the system SHALL reject the creation request.

### Currency Setting Validation

WHEN an organization is created or its settings are updated, THE system SHALL require a valid currency code.
The currency code SHALL be one of the supported values such as USD, EUR, or KRW.
IF an unsupported or invalid currency code is provided, THEN the system SHALL reject the request.

### Timezone Validation Rules

WHEN an organization is created or its timezone setting is updated, THE system SHALL require a valid timezone identifier (e.g., America/New_York, Asia/Seoul, Europe/London).
IF the provided timezone identifier is not recognized, THEN the system SHALL reject the request.
The timezone setting affects how dates and times are presented throughout the organization.

### Fiscal Start Month Range

WHEN an organization is created or its fiscal start month is updated, THE system SHALL require a numeric value between 1 (January) and 12 (December).
IF the provided value is outside the range of 1 to 12, THEN the system SHALL reject the request.

### Optional Fields: Description and Logo

WHEN an organization is created, THE system SHALL treat the description and logo image as optional fields.
IF no description is provided, THE system SHALL store a null value for the description.
IF no logo image is provided, THE system SHALL store a null value for the logo image.

### Organization Settings Modification

THE system SHALL allow only the designated organization owner to modify organization settings including name, description, logo, currency, timezone, and fiscal start month.
IF a user who is not the organization owner attempts to modify organization settings, THEN the system SHALL reject the request.

### Organization Deletion Prerequisites

THE system SHALL allow an organization owner to delete the organization only when ALL of the following conditions are met:
- All pending timesheets across the organization are in an approved or rejected state (no timesheets remain in draft or submitted status)
- There are no active employee contracts in the organization
IF either condition is not satisfied, THEN the system SHALL reject the deletion request and inform the owner of the blocking conditions.

### Pending Timesheets Blocking Deletion

WHEN an organization owner requests organization deletion, THE system SHALL check that no timesheets with status draft or submitted exist for any employee.
IF any timesheets are still pending (draft or submitted status), THEN the system SHALL block the deletion and notify the owner that all timesheets must first be resolved.

### Active Contracts Blocking Deletion

WHEN an organization owner requests organization deletion, THE system SHALL check that no active employee contracts exist.
IF any employee has an active contract (a contract with no end date, or a contract whose date range includes the current date), THEN the system SHALL block the deletion and notify the owner that all contracts must first be ended.

### Cascading Data Removal

WHEN an organization is deleted, THE system SHALL permanently remove all associated data including:
- All employees and their contracts
- All projects, project members, tasks, and task history
- All timelogs, timesheets, and timers
- All departments
- All roles (including built-in and custom)
- All invitations
- All activity log entries
- All data belonging to any entity that belongs to the organization
The owner's user account SHALL remain active but SHALL no longer be associated with the deleted organization.

## User Rules

Users sign up with an email address and a password. The email address must be unique across the entire platform since it serves as the login identifier. The password must meet minimum security requirements during registration. A user can belong to multiple organizations, and each membership is represented as an employee record within that organization. When logging in, the user selects which organization to work in, and all subsequent actions are scoped to that organization context. The user can switch to a different organization without logging out. A user can delete their own account, but this is only allowed if they are not the sole owner of any organization. If the user is the only owner of an organization, they must either transfer ownership to another employee within that organization or delete the organization first before their personal account can be removed. When a user account is deleted, their employee records in other organizations are marked as deactivated rather than removed. The user's global profile including display name, avatar, and phone number is shared across all organizations the user belongs to and can be edited by the user at any time.

### Email Uniqueness Constraint

THE system SHALL ensure that each email address is unique across the entire platform.

IF a user attempts to register with an email address that is already associated with an existing user account, THEN THE system SHALL reject the registration and return a clear error indicating that the email is already in use.

IF a user attempts to update their email address to one already associated with another existing account, THEN THE system SHALL reject the change and return a clear error indicating that the email is unavailable.

### Password Requirements at Sign-Up

THE system SHALL enforce minimum security requirements when a user sets or changes their password.

WHEN a user registers with a password that does not meet the minimum security requirements, THEN THE system SHALL reject the registration and inform the user of the requirements that were not satisfied.

WHEN a user changes their password to one that does not meet the minimum security requirements, THEN THE system SHALL reject the change and inform the user of the requirements that were not satisfied.

### Multi-Organization Membership

THE system SHALL allow a user to belong to multiple organizations simultaneously, with each membership represented as a distinct employee record within the respective organization.

IF a user who already has an active employee record in an organization receives another invitation to the same organization, THEN THE system SHALL reject the duplicate invitation.

A user's global account identity SHALL remain singular regardless of how many organizations they belong to.

### Organization Context Selection and Switching

WHEN a user who belongs to multiple organizations logs in, THEN THE system SHALL require the user to select one organization as their active working context before they may proceed to any organization-scoped features.

WHILE a user is logged in and has selected an organization context, THEN all subsequent actions they perform SHALL be scoped to that organization until the user explicitly switches context.

WHEN a user switches their active organization context to a different organization, THEN THE system SHALL immediately apply the new context to all subsequent operations without requiring the user to log out.

IF a user belongs to only one organization, THEN THE system SHALL automatically set that organization as the active context upon login without requiring a selection.

### Account Deletion Restrictions for Sole Owners

WHEN a user requests to delete their own account, THEN THE system SHALL verify whether the user is the sole owner of any organization.

IF the user is the sole owner of at least one organization, THEN THE system SHALL reject the account deletion request and inform the user that they must first either transfer ownership of each organization they solely own to another employee within that organization, or delete each organization they solely own.

Only after the user is no longer the sole owner of any organization may the account deletion proceed.

IF the user is not the sole owner of any organization, THEN THE system SHALL allow the account deletion to proceed.

### Deactivation of Employee Records on Account Deletion

WHEN a user's account is successfully deleted, THEN THE system SHALL automatically mark all employee records associated with that user across all organizations they belonged to as "deactivated".

Deactivated employee records SHALL have their status set to "deactivated".

WHILE an employee record is marked as deactivated due to account deletion, THEN all historical data belonging to that employee record — including timelogs, timesheets, contracts, and task assignments — SHALL be preserved and remain accessible for organizational records.

The deactivation of employee records upon account deletion SHALL be automatic, and SHALL NOT be reversible by the deleted user.

### Global Profile Sharing and Editing

A user's global profile — consisting of display name, avatar image, and phone number — SHALL be shared across all organizations the user belongs to.

WHEN a user updates any field of their global profile, THEN the changes SHALL be immediately reflected in all organization contexts simultaneously.

A user SHALL be able to edit their own global profile at any time.

IF a user attempts to update their profile with invalid data (such as an empty display name), THEN THE system SHALL reject the update and return a clear error.

Profile data SHALL persist independently of any single organization membership — removing a user from an organization SHALL NOT affect their global profile.

## Employee Rules

Each employee record links a user account to an organization and assigns exactly one role within that organization. The employee status can be either active or deactivated. A deactivated employee cannot log time or submit timesheets, though their historical timelogs and timesheets are preserved and remain visible. Deactivated employees can be reactivated by users with the appropriate permission. The department, position, and employment type fields are optional when creating an employee record. The employment type must be one of the predefined values: full-time, part-time, contractor, or intern. Role assignment can be changed by users who have the employee management permission. An employee cannot have multiple active records in the same organization since each user-organization pair is unique. When the email invitation flow is used, if the invited email already has an existing user account, the user is immediately added to the organization as an employee with the specified role. If the invited email does not yet have an account, a pending invitation is created instead. The employee list supports pagination, filtering by department, employment type, and status, as well as searching by name.

### Employee Role Constraint

THE SYSTEM SHALL assign exactly one role to each employee record within an organization.

WHEN an employee record is created, THE SYSTEM SHALL require a valid role from the organization's role set to be specified.

IF no role is provided at the time of employee creation, THEN THE SYSTEM SHALL reject the creation request.

WHEN a user with the `employee:manage` permission changes an employee's role assignment, THE SYSTEM SHALL update the employee's role to the newly specified role.

IF a role assignment change would result in the employee having no role assigned, THEN THE SYSTEM SHALL reject the change request.

### Employee Status Rules

THE SYSTEM SHALL support exactly two employee status values: "active" and "deactivated".

WHILE an employee has a status of "active", THE SYSTEM SHALL allow the employee to log time entries, start and stop timers, and submit timesheets.

WHILE an employee has a status of "deactivated", THE SYSTEM SHALL prevent the employee from logging new time entries, starting or stopping timers, and submitting timesheets.

WHEN an employee is deactivated, THE SYSTEM SHALL preserve all their historical timelogs, timesheets, contract records, and any other associated data. These historical records SHALL remain visible to users who have the appropriate view permissions.

WHEN a user with the `employee:manage` permission deactivates an employee whose current status is "active", THE SYSTEM SHALL change the employee's status to "deactivated".

WHEN a user with the `employee:manage` permission reactivates an employee whose current status is "deactivated", THE SYSTEM SHALL change the employee's status to "active" and restore their ability to log time and submit timesheets.

### Employment Type Validation

THE SYSTEM SHALL accept only the following predefined values for an employee's employment type: "full-time", "part-time", "contractor", or "intern".

IF an employment type value outside the predefined set is provided, THEN THE SYSTEM SHALL reject the request.

THE SYSTEM SHALL allow the employment type field to be set when creating an employee record.

WHERE the employment type has already been set, THE SYSTEM SHALL allow users with the `employee:manage` permission to change the employment type of an existing employee record.

### Unique Employee-Organization Pairing

THE SYSTEM SHALL maintain at most one employee record per user within each organization.

IF an attempt is made to create a second employee record for the same user in the same organization, THEN THE SYSTEM SHALL reject the creation request.

### Employee Invitation Processing

WHEN a user with the `employee:manage` permission invites an email address that already has an existing user account, THE SYSTEM SHALL immediately create an active employee record for the invited user in the organization with the specified role.

WHEN a user with the `employee:manage` permission invites an email address that does not have an existing user account, THE SYSTEM SHALL create a pending invitation record (defined in [Invitation Rules]) rather than an employee record.

WHEN a person signs up with an email address that has one or more pending invitations, THE SYSTEM SHALL automatically create active employee records for the newly registered user in each of the inviting organizations with the roles specified in the invitations.

### Employee List Browsing Rules

THE SYSTEM SHALL paginate the employee list.

WHEN accessing the employee list, THE SYSTEM SHALL allow users with the `employee:view` permission to filter the list by department.

WHEN accessing the employee list, THE SYSTEM SHALL allow users with the `employee:view` permission to filter the list by employment type.

WHEN accessing the employee list, THE SYSTEM SHALL allow users with the `employee:view` permission to filter the list by employee status ("active" or "deactivated").

WHEN accessing the employee list, THE SYSTEM SHALL allow users with the `employee:view` permission to search the list by the employee's display name.

WHEN multiple filters are applied simultaneously, THE SYSTEM SHALL return only employees that satisfy all active filter criteria.

WHEN a search term is provided, THE SYSTEM SHALL return only employees whose display name partially or fully matches the search term.

IF no filters are applied and no search term is provided, THE SYSTEM SHALL return all employees belonging to the organization, respecting pagination.

## Contract Rules

Each employee can have multiple contracts over time, forming a historical record of their employment terms. Only one contract can be active at any given time. Each contract must have a start date and a pay rate with a numeric value. The end date is optional; a null end date indicates the contract is currently ongoing. The pay period must be one of the predefined options: hourly, daily, weekly, or monthly. The working hours per week field is required and specifies the expected weekly commitment such as 40 hours. When a new contract is created for an employee who already has an active contract, the previous active contract is automatically ended by setting its end date to the day before the new contract's start date. Only the current active contract can be edited. Past contracts are immutable and serve as a locked historical record that cannot be modified. Employees can view their own contracts, and users with employee viewing permission can view any employee's contracts.

### Contract Creation Validation

WHEN a user creates a contract, THE system SHALL require the start date to be provided.

WHEN a user creates a contract, THE system SHALL require the pay rate to be a positive numeric value greater than zero.

WHEN a user creates a contract, THE system SHALL allow the end date to be null, indicating the contract is ongoing with no predetermined end date.

WHEN a user creates a contract, THE system SHALL require the pay period to be one of the following predefined options: hourly, daily, weekly, or monthly.

WHEN a user creates a contract, THE system SHALL require the working hours per week to be provided as a positive numeric value.

IF the provided pay rate is not a valid positive numeric value, THEN THE system SHALL reject the request.

IF the provided pay period is not one of the predefined options (hourly, daily, weekly, or monthly), THEN THE system SHALL reject the request.

IF the provided working hours per week is not a valid positive numeric value, THEN THE system SHALL reject the request.

IF the provided end date is earlier than the start date, THEN THE system SHALL reject the request.

### Active Contract Constraints

THE system SHALL allow an employee to have multiple contracts over time, forming a historical record.

WHILE an employee has one or more contracts, THE system SHALL enforce that at most one contract is active (has no end date or has an end date in the future) at any given time.

WHEN a user creates a new contract for an employee who currently has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date.

IF a user attempts to create a contract whose start date overlaps the period of an existing active contract, THEN THE system SHALL automatically terminate the previous contract by setting its end date to the day before the new contract's start date, without rejecting the request.

### Contract Edit Rules

WHILE a contract is the current active contract (has a null end date or an end date in the future), THE system SHALL allow it to be edited by users with the employee:manage permission.

WHILE a contract is a past contract (has an end date that is in the past), THE system SHALL treat it as an immutable historical record that cannot be modified.

IF a user attempts to edit a past contract, THEN THE system SHALL reject the request.

IF a user without the employee:manage permission attempts to edit any contract, THEN THE system SHALL reject the request.

### Contract Access Rules

THE system SHALL allow employees to view their own contracts.

THE system SHALL allow users with the employee:view permission to view any employee's contracts within their organization.

IF a user who is not the contract owner and does not have the employee:view permission attempts to view a contract, THEN THE system SHALL reject the request.

## Department Rules

Each department within an organization must have a name. The description is optional. A department can optionally have a parent department, but nesting is limited to one level only, meaning a department cannot have a grandparent. This prevents deeply nested organizational hierarchies. Deleting a department does not delete the employees assigned to it; instead, the department field on those employee records is set to null. This preserves employee data while removing the grouping. Only users with the organization management permission can create, edit, or delete departments. All employees can view the list of departments regardless of their specific role within the organization. Department names must be unique within the same organization to avoid confusion.

### Department Name Validation

Each department SHALL have a name that is required and cannot be empty. A department MUST NOT be created or updated without providing a non-empty name.

WHERE a department name is provided, THE department name SHALL be unique within the same organization. IF another department within the same organization already uses the requested name, THEN the create or update request SHALL be rejected.

### Department Nesting Constraint

A department MAY have an optional parent department, but nesting SHALL be limited to one level. This means a department that already has a parent SHALL NOT itself be set as a parent of another department.

IF a request assigns a parent department to a department that already has a parent, THEN the request SHALL be rejected.

IF a request would create a circular reference (e.g., setting a child department as the parent of its own parent), THEN the request SHALL be rejected.

### Department Description Rules

The description field of a department SHALL be optional. A department MAY be created without a description, or the description MAY be left empty. No minimum length requirement exists for the description field.

### Department Deletion and Employee Preservation

WHEN a department is deleted, THE department field of all employee records currently assigned to that department SHALL be set to null. The employees themselves SHALL NOT be deleted, deactivated, or otherwise modified beyond the removal of the department reference.

All employee data including contracts, role assignments, timelogs, timesheets, and project memberships SHALL be preserved following department deletion.

IF a department has employees assigned to it at the time of deletion, THEN the deletion SHALL proceed without blocking — the system SHALL automatically disassociate those employees from the department rather than requiring manual reassignment first.

### Department Change Authorization

WHEN a user requests to create, edit, or delete a department, THE requesting user MUST hold the organization management permission (`org:manage`).

IF the requesting user does not hold the `org:manage` permission, THEN the request SHALL be rejected.

### Department Visibility

ALL employees within an organization SHALL be able to view the list of departments, regardless of their specific role. No special permission is required for viewing departments.

The department view SHALL include each department's name, description, and parent department (if any).

### Department Error Scenarios

IF a department being edited or deleted does not exist, THEN the request SHALL be rejected.

IF a department name update conflicts with an existing department name in the same organization, THEN the request SHALL be rejected.

IF a user without the `org:manage` permission attempts to create, edit, or delete a department, THEN the request SHALL be rejected.

IF a department is assigned a parent department that would exceed the one-level nesting limit, THEN the request SHALL be rejected.

IF a circular parent reference is attempted (a department referencing one of its descendants as parent), THEN the request SHALL be rejected.

## Role Rules

Each organization has its own set of roles that define permission boundaries. Three built-in roles exist: Owner, Manager, and Employee. These built-in roles cannot be deleted. The Owner role provides full access to all features including role and member management. The Manager role can manage employees and projects, approve timesheets, and view reports. The Employee role can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and a set of permissions drawn from the available permission list. Permissions available include organization management, employee management and viewing, project management and viewing, time management, time approval, time viewing across all employees, and report viewing. Custom roles can be edited by the organization owner. A custom role can only be deleted if no employees are currently assigned to it. Each employee in an organization is assigned exactly one role, and role assignment can be changed by users with employee management permission.

### Role Set Isolation per Organization

Each organization operates with its own independent set of roles.

WHEN an employee performs actions within an organization, THE system SHALL enforce only the roles and permissions defined for that specific organization.

WHEN a user belongs to multiple organizations and switches organization context, THE system SHALL apply the role set of the newly selected organization.

IF an organization is deleted, THEN all custom roles associated with that organization SHALL be permanently removed.

Custom roles created in one organization SHALL NOT be visible or applicable to any other organization.

### Built-in Role Immutability

Three built-in roles — Owner, Manager, and Employee — exist in every organization and cannot be deleted.

THE system SHALL prevent any attempt to delete the Owner, Manager, or Employee role.

The Owner role provides full access to all features (defined in [01-actors-and-auth.md]).

The Manager role provides permissions to manage employees, projects, approve timesheets, and view reports (defined in [01-actors-and-auth.md]).

The Employee role provides permissions to track time, submit timesheets, and view own data (defined in [01-actors-and-auth.md]).

The Owner, Manager, and Employee role names and permission sets are fixed and SHALL NOT be modifiable through custom role editing features.

### Custom Role Creation by Organization Owner

Organization owners may create custom roles to define permission sets beyond the three built-in roles.

WHEN an organization owner creates a custom role, THE system SHALL require a name for the role.

WHEN an organization owner creates a custom role, THE system SHALL require at least one permission to be selected from the available permission list.

Available permissions for custom roles: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, report:view.

IF a custom role is created without a name, THEN THE system SHALL reject the request.

IF a custom role is created without any permissions selected, THEN THE system SHALL reject the request.

### Custom Role Editing by Organization Owner

Organization owners may edit custom roles to change the role name or adjust the assigned permission set.

WHEN an organization owner edits a custom role, THE system SHALL allow modification of the role name.

WHEN an organization owner edits a custom role, THE system SHALL allow modification of the permission set.

IF an attempt is made to clear all permissions from a custom role, THEN THE system SHALL reject the edit and require at least one permission to remain selected.

Built-in roles (Owner, Manager, Employee) SHALL NOT be editable through custom role editing features.

### Custom Role Deletion Prerequisite

A custom role may only be deleted if no employees are currently assigned to it.

IF an organization owner attempts to delete a custom role and one or more employees are assigned to it, THEN THE system SHALL reject the deletion.

WHEN a custom role is deleted with no employees assigned, THE system SHALL permanently remove the role definition and its permission set.

The deletion of a custom role SHALL NOT affect any built-in roles or other custom roles.

Built-in roles (Owner, Manager, Employee) SHALL NOT be deletable under any condition.

### Employee-to-Role Assignment Constraints

Each employee is assigned exactly one role within an organization (defined in [Employee Rules]).

WHEN a new employee is added to an organization, THE system SHALL require assignment of exactly one role.

WHEN an employee's assigned role is changed, the previous role assignment SHALL be replaced — the employee SHALL NOT hold two roles simultaneously.

Users with the employee:manage permission MAY change the role assignment of any employee in the organization.

IF a user without the employee:manage permission attempts to change an employee's role, THEN THE system SHALL reject the request.

WHEN a custom role is deleted, employees assigned to that role MUST be reassigned to another role before the deletion can proceed (see Custom Role Deletion Prerequisite).

## Project Rules

A project must have a name and a color code for UI display purposes. The description, budget hours, start date, and end date are optional fields. The project status must be one of three values: active, archived, or completed. Only active projects can receive new timelogs; archived and completed projects cannot have new time entries added against them, though existing timelogs on those projects are preserved and remain visible. Only users with project management permission can create, edit, archive, or complete projects. A project can be deleted only if it has no timelogs associated with it. If any timelogs exist for the project, deletion is blocked to preserve data integrity. All employees with project viewing permission can see all projects in the organization. The project list supports pagination and filtering by status.

### Project Name Requirement

The project name is a required field. Every project must have a name value when created or saved. If the name is missing, empty, or consists only of whitespace characters, the creation or update request is rejected.

### Color Code Requirement

A color code is a required field for every project. The color code is used for visual UI display to distinguish projects from one another in lists and timelines. If the color code is missing or empty when creating or editing a project, the request is rejected.

### Optional Budget Hours Field

The budget hours field for a project is optional. When provided, it represents the total estimated hours allocated to the project and must be a positive numeric value. If a non-positive value (zero or negative) is provided, the request is rejected. When omitted, the project has no defined budget limit.

### Project Status Values

A project must have one of three status values: active, archived, or completed. These are the only valid status values for a project. If an unrecognized or invalid status value is provided in a creation or update request, the request is rejected.

The allowed status transitions are:

- active → archived: permitted
- active → completed: permitted
- archived → active: permitted (reactivation)
- completed → active: permitted (reopen)
- archived → completed: not permitted
- completed → archived: not permitted

Requested transitions that are not in the permitted list above are rejected.

### Timelog Restriction on Non-Active Projects

Only projects with status "active" can receive new timelogs. WHEN a user attempts to log time against a project with status "archived" or "completed", THEN the request is rejected. The system shall reject the timelog and inform the user that the project is not currently accepting time entries. This restriction applies to both manual timelog creation and timer-based timelog creation.

### Existing Timelog Preservation on Status Change

WHEN a project's status changes from "active" to "archived" or "completed", all existing timelogs associated with that project remain preserved and visible. The status change does not delete, modify, or hide any historical timelog data. Users with appropriate view permissions can still see the historical timelogs for archived or completed projects.

### Project Deletion Blocked When Timelogs Exist

A project can be deleted only if it has no timelogs associated with it. IF a deletion request is made for a project that has one or more existing timelogs, THEN the request is rejected. This rule preserves data integrity by ensuring timelogs are not orphaned. To delete such a project, all associated timelogs must be removed first.

### Permission Requirements for Project Changes

Only users with project management permission can create, edit, archive, complete, or delete projects. Users who do not hold project management permission cannot perform these operations. If a user without project management permission attempts any of these actions, the request is rejected.

### Project Visibility for Viewers

All employees with project viewing permission can see all projects in the organization. No employee with project viewing permission is restricted from viewing any project within the organization. Users without project viewing permission cannot access project information.

### Project List Pagination and Filtering

The project list supports pagination to manage large collections of projects. The list is displayed in pages and users can navigate between pages to view all projects.

The project list supports filtering by project status. Users can filter to view only projects with a specific status value (active, archived, or completed). Multiple status filters are allowed so users can view a combination of statuses together (e.g., active and completed projects). When no filter is applied, all projects are shown regardless of status. Filtering by an invalid or unrecognized status value is rejected.

## ProjectMember Rules

Project memberships link employees to projects. An employee can be assigned to multiple projects simultaneously. Each membership has an assigned role of either member or project-lead. Project leads have the authority to manage tasks within their assigned project. Only users with project management permission can assign employees to projects or remove them from projects. An employee must be an active employee in the organization to be assigned to a project. The same employee cannot be assigned to the same project more than once, ensuring a unique employee-project pairing. When an employee is removed from a project, any tasks assigned to that employee within the project may need reassignment. Employees can view the list of projects they are assigned to, regardless of their role within the organization.

### Employee Assignment to Multiple Projects

An employee MAY be assigned to multiple projects simultaneously within the same organization. There is no limit on the number of projects an employee can be assigned to.

WHEN an employee is assigned to multiple projects, each assignment is independent — the employee's role, timelogs, and tasks on one project have no effect on their assignments to other projects.

WHEN an employee is deactivated (employee status becomes "deactivated"), the system SHALL NOT automatically remove the employee from project assignments. The employee remains a project member but cannot log time to any project while deactivated.

### Unique Employee-Project Pairing

THE system SHALL enforce that each employee can be assigned to a specific project at most once. An employee SHALL NOT be assigned to the same project more than once.

IF a user attempts to assign an employee to a project where that employee is already a member, THEN the request SHALL be rejected.

WHEN an employee is removed from a project and later reassigned to the same project, the system SHALL treat this as a new membership — the previous removal does not block reassignment.

### Member and Project-Lead Roles

Each project membership SHALL have exactly one role: either "member" or "project-lead".

A project-lead has additional task management authority within the project as defined in [Project Lead Task Management Authority].

An employee with the "member" role on a project can view the project and log time to it, but cannot create, edit, or delete tasks within that project.

WHEN a user with `project:manage` permission changes an employee's project role from "member" to "project-lead" or from "project-lead" to "member", the system SHALL apply the new role immediately.

### Project Lead Task Management Authority

A project-lead SHALL have the authority to create, edit, and delete tasks within their assigned project (same authority as users with `project:manage` permission, but scoped only to projects where they are a project-lead).

WHEN a project-lead creates a task, the task SHALL be automatically associated with their assigned project.

A project-lead MAY assign tasks to any employee who is a member of the same project, including themselves.

WHEN a project-lead is removed from a project, they SHALL lose task management authority for that project immediately.

### Project Manager Permission for Assignment

Only users with the `employee:manage` permission SHALL be able to assign employees to projects or remove employees from projects.

WHEN a user with `employee:manage` permission assigns an employee to a project, the system SHALL create a new project membership record with the specified role (defaulting to "member" if no role is provided).

WHEN a user with `employee:manage` permission removes an employee from a project, the system SHALL delete the project membership record.

IF a user without `employee:manage` permission attempts to assign or remove an employee from a project, THEN the request SHALL be rejected.

### Active Employee Requirement for Assignment

WHEN assigning an employee to a project, THE system SHALL verify that the employee's status is "active" within the organization.

IF the employee's status is "deactivated", THEN the request to assign them to a project SHALL be rejected.

An employee who is deactivated while already assigned to projects SHALL remain as a project member but is restricted from logging time (as defined in [Employee Rules]). Reactivating the employee restores their ability to log time without requiring reassignment.

### Employee Removal from Projects

WHEN an employee is removed from a project, the system SHALL handle the following:

- Timelogs previously logged by the employee on that project SHALL be preserved (the timelogs remain associated with the project and the employee)
- Tasks assigned to the removed employee within that project SHALL remain in the project with their assigned employee field set to null (tasks are not deleted)
- The employee SHALL no longer be able to view the project or log time to it

Users with `employee:manage` permission MAY remove an employee from a project even if the employee has timelogs or assigned tasks on that project. The removal SHALL NOT be blocked by existing data.

### Self-View of Assigned Projects

Employees SHALL be able to view the list of projects they are assigned to, regardless of their role within the organization.

WHEN an employee views their assigned projects, THE system SHALL display only projects where the employee has an active membership record. The employee does not need any special permission to view their own assigned projects.

IF an employee has no project memberships, THEN the list of assigned projects SHALL be empty.

## Task Rules

Each task belongs to a project and must have a title. The description, estimated hours, and due date are optional. The task status must be one of open, in-progress, completed, or closed. The task priority must be one of low, medium, high, or urgent. A task can optionally have a parent task to create subtasks, but nesting is limited to one level only, meaning a subtask cannot have its own subtask. The assigned employee, if provided, must be a current member of the project that the task belongs to. Project leads can create and edit tasks within their project. Users with project management permission can create and edit any task across all projects. When a task status changes, the system records a task history entry capturing the timestamp, old status, new status, and who made the change. Tasks can be viewed by employees assigned to projects that contain those tasks. The task list supports filtering by status, priority, and assigned employee, and sorting by due date, priority, or creation date.

### Task Title Validation

WHEN a user creates a task, THE system SHALL require a title for the task.

IF the title is missing or empty, THEN THE system SHALL reject the creation request.

### Task Status and Priority Validation

WHEN a user creates or edits a task, THE system SHALL accept only the following status values: open, in-progress, completed, closed.

WHEN a user creates or edits a task, THE system SHALL accept only the following priority values: low, medium, high, urgent.

IF an unsupported status or priority value is provided, THEN THE system SHALL reject the request.

### Subtask Nesting Constraint

A task MAY have an optional parent task to create a subtask relationship.

WHEN a user assigns a parent task to a task, THE system SHALL verify that the parent task itself has no parent task (one-level nesting limit only).

IF the parent task already has a parent, THEN THE system SHALL reject the request.

A subtask CANNOT have its own subtask.

### Assigned Employee Membership Validation

WHEN a user assigns an employee to a task, THE system SHALL verify that the employee is a current member of the project that the task belongs to.

IF the assigned employee is not a project member, THEN THE system SHALL reject the assignment.

WHEN an employee is removed from a project, THE system SHALL set the assigned employee to null for any tasks in that project where that employee was assigned.

### Task Status Change History

WHEN a task status changes from one value to another, THE system SHALL automatically record a task history entry.

Each task history entry SHALL contain: the timestamp of the change, the old status value, the new status value, and the user who made the change.

Task history entries are immutable — once recorded, they CANNOT be edited or deleted.

### Task Visibility for Project Members

Employees SHALL be able to view only tasks belonging to projects they are assigned to.

IF an employee who is not a member of a project attempts to view that project's tasks, THEN THE system SHALL reject the request.

Task visibility is limited to the employee's assigned projects regardless of their role in the organization.

### Task List Filtering Rules

THE system SHALL support filtering the task list by the following criteria: task status, task priority, and assigned employee.

WHEN multiple filters are applied simultaneously, THE system SHALL return tasks that match all active filters (AND logic).

IF no tasks match the applied filters, THEN THE system SHALL return an empty list (no error).

### Task List Sorting Rules

THE system SHALL support sorting the task list by: due date, priority, and creation date.

WHEN sorting by due date, tasks without a due date SHALL appear at the end of the list regardless of sort direction.

THE default sort order SHALL be by creation date in descending order (newest first).

## TaskHistory Rules

Each task history entry is an immutable record of a status change on a task. A history entry is created automatically whenever a task's status transitions between open, in-progress, completed, or closed. Each entry records the timestamp of when the change occurred, the old status value before the change, the new status value after the change, and which user performed the status change. Task history entries are read-only and cannot be edited or deleted by any user. They serve as an audit trail for tracking how task progress evolves over time. The history for a given task is ordered chronologically by timestamp. Users who can view the task can also view its history entries. There is no modification or deletion of history entries under any circumstances to preserve audit integrity.

### Automatic Creation of History Entries

WHEN a task's status transitions from one value to another, THE system SHALL automatically create a task history entry recording:
- The timestamp of the status transition
- The old status value (prior to the change)
- The new status value (after the change)
- The user who performed the status change

A task history entry SHALL be created for every status transition, including:
- open to in-progress
- in-progress to completed
- completed to closed
- closed back to open (or any other valid transition)

The system SHALL NOT create a history entry if the status is set to the same value it already had (no actual transition occurred).

### Immutability and Audit Trail Integrity

THE system SHALL treat all task history entries as immutable records.

No user — regardless of role or permission — SHALL be able to edit a task history entry.

No user — regardless of role or permission — SHALL be able to delete a task history entry.

IF a request to edit or delete a task history entry is received, THEN the request SHALL be rejected.

This immutability guarantees that the audit trail of task progress is preserved in its original form for the lifetime of the organization.

### Chronological Ordering of History

WHEN displaying task history for a given task, THE system SHALL order the history entries chronologically by their recorded timestamp, with the oldest entry first.

The chronological order SHALL be the only ordering supported for task history display.

### Visibility Rules for Task History

WHERE a user can view a task (as determined by project membership and permissions defined in [01-actors-and-auth.md]), THE system SHALL permit that user to view all history entries belonging to that task.

WHERE a user cannot view a task, THE system SHALL deny access to that task's history entries.

Task history entries SHALL NOT have independent visibility controls separate from their parent task.

## Timelog Rules

Each timelog must have a date, a duration in minutes, and a project. The project must be one that the employee is assigned to and the project must have an active status. The task is optional, but if provided, it must belong to the selected project. The description is optional and can detail what was done. The billable flag defaults to true, indicating the time is billable unless explicitly set otherwise. Employees can only create timelogs for themselves. An employee can edit or delete their own timelog only if the timelog is not part of an approved timesheet. If the timelog is in a submitted timesheet that has not yet been approved, the timelog can be edited or deleted only if the timesheet is first returned to draft status. Users with time management permission can edit or delete any employee's timelogs regardless of restrictions. Users with time viewing permission can view all employees' timelogs. Timelogs support pagination and filtering by date range, project, task, and billable status.

### Timelog Creation Validation

THE system SHALL require a date for each timelog. THE system SHALL require a duration in minutes for each timelog. The duration SHALL be a positive integer value. THE system SHALL require a project for each timelog. THE system SHALL validate that the project is one the employee is assigned to. IF the employee is not assigned to the selected project, THEN THE system SHALL reject the timelog creation. THE system SHALL validate that the project status is active. IF the project status is archived or completed, THEN THE system SHALL reject the timelog creation. WHERE a task is provided, THE system SHALL validate that the task belongs to the selected project. IF the task does not belong to the selected project, THEN THE system SHALL reject the timelog creation. THE system SHALL default the billable flag to true when not explicitly provided. THE system SHALL require that the employee creating the timelog is the employee the timelog is created for. Employees SHALL only be able to create timelogs for themselves.

### Timelog Modification Restrictions

IF a timelog is part of an approved timesheet, THEN THE system SHALL block edits to that timelog by the owning employee. IF a timelog is part of a submitted timesheet that has not yet been approved, THEN THE system SHALL block edits to that timelog unless the timesheet is first returned to draft status. THE system SHALL allow employees to edit their own timelogs only when the timelog is not part of an approved timesheet. WHERE a user has time management permission (time:manage), THE system SHALL allow that user to edit any employee's timelog regardless of timesheet status restrictions.

### Timelog Deletion Restrictions

IF a timelog is part of an approved timesheet, THEN THE system SHALL block deletion of that timelog. IF a timelog is part of a submitted timesheet, THEN THE system SHALL block deletion of that timelog by the owning employee. THE system SHALL allow employees to delete their own timelogs only when the timelog is not part of any submitted or approved timesheet. WHERE a user has time management permission (time:manage), THE system SHALL allow that user to delete any employee's timelog regardless of timesheet status restrictions.

### Timelog Browsing and Filtering

THE system SHALL support pagination for timelog listings. THE system SHALL allow filtering of timelogs by date range. WHERE a date range filter is applied, THE system SHALL return only timelogs whose date falls within the specified range. THE system SHALL allow filtering of timelogs by project. THE system SHALL allow filtering of timelogs by task. THE system SHALL allow filtering of timelogs by billable status. Multiple filters SHALL be combinable, returning timelogs that satisfy all active filters simultaneously.

## Timesheet Rules

A timesheet is a weekly grouping of timelogs running from Monday to Sunday. Each timesheet belongs to one employee and has a status of draft, submitted, approved, or rejected. Creating a draft timesheet for a week automatically includes all timelogs belonging to that employee within that week. An employee can add or remove timelogs from a draft timesheet. A draft timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already in submitted or approved status, preventing overlapping weekly submissions. When a timesheet is submitted, the submitted timestamp is recorded. Users with time approval permission can view all submitted timesheets. An approver can approve a submitted timesheet, which locks all included timelogs so they cannot be edited or deleted. An approver can reject a submitted timesheet with a required rejection reason, which returns the timesheet to draft status and allows the employee to modify and resubmit. The reviewed timestamp and reviewer are recorded upon approval or rejection. The total hours field is calculated automatically from the included timelogs. Timesheets support pagination and filtering by status and date range.

### Timesheet Week Boundaries

Each timesheet SHALL represent a single calendar week running from Monday 00:00:00 to Sunday 23:59:59 in the organization's configured timezone.

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL determine the week boundaries using the week start date (Monday) provided by the employee.

### Timesheet Status Values

THE system SHALL support exactly four timesheet statuses: "draft", "submitted", "approved", and "rejected".

WHEN a timesheet is first created, THE system SHALL set its status to "draft".
WHEN an employee submits a draft timesheet, THE system SHALL change its status to "submitted".
WHEN an approver approves a submitted timesheet, THE system SHALL change its status to "approved".
WHEN an approver rejects a submitted timesheet, THE system SHALL change its status to "rejected".
WHEN a rejected timesheet is modified and resubmitted, THE system SHALL change its status from "rejected" to "submitted".

### Automatic Timelog Inclusion on Draft Creation

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL automatically include ALL timelogs owned by that employee whose date falls within that week (Monday to Sunday) into the draft timesheet.

IF a timelog's date falls within the week, THEN THE system SHALL associate it with the created draft timesheet.

IF an employee has no timelogs in the given week, THEN THE system SHALL still create an empty draft timesheet.

### Modifying Timelogs in Draft Timesheets

WHILE a timesheet is in "draft" status, THE employee who owns the timesheet SHALL be able to add or remove individual timelogs from the timesheet.

IF an employee removes a timelog from a draft timesheet, THEN THE timelog SHALL become unassociated from the timesheet but SHALL remain in the system as an untimesheeted timelog.

IF an employee attempts to add a timelog belonging to a different week, THEN THE system SHALL reject the request.

### Submission Validation — Empty Timesheet

IF an employee attempts to submit a draft timesheet that contains no timelogs, THEN THE system SHALL reject the submission.

A draft timesheet MUST contain at least one timelog before it can be submitted.

### Submission Validation — No Duplicate Weekly Submissions

IF an employee attempts to submit a timesheet for a week where another timesheet already exists in "submitted" or "approved" status, THEN THE system SHALL reject the submission.

The system SHALL permit only one timesheet in "submitted" or "approved" status per employee per week.

IF a previously submitted timesheet is rejected (returned to "draft"), THEN THE employee SHALL be able to resubmit the same timesheet or create and submit a new draft for the same week.

### Submitted Timestamp Recording

WHEN a timesheet transitions from "draft" to "submitted" status, THE system SHALL record the timestamp of the submission.

The submitted timestamp SHALL reflect the date and time when the employee performed the submission action.

### Approval and Timelog Locking

WHEN an approver approves a submitted timesheet, THE system SHALL lock all timelogs associated with that timesheet.

WHILE a timelog is locked (belongs to an approved timesheet), THE following operations SHALL be rejected:
- Editing the timelog's date, duration, project, task, description, or billable flag
- Deleting the timelog

IF an employee attempts to modify or delete a locked timelog, THEN THE system SHALL reject the request.

Locked timelogs SHALL remain visible and included in reports.

### Rejection Requirements

WHEN an approver rejects a submitted timesheet, THE system SHALL require a rejection reason to be provided.

IF the rejection reason is empty, THEN THE system SHALL reject the rejection action.

WHEN a timesheet is rejected, THE system SHALL:
- Set the timesheet status to "rejected"
- Return the timesheet to "draft" status behavior, allowing the employee to modify timelogs and resubmit
- Unlock all timelogs associated with the timesheet (if they were locked)

### Review Timestamp and Reviewer Recording

WHEN a timesheet is approved or rejected, THE system SHALL record:
- The timestamp of the review (reviewed at)
- The identity of the user who performed the approval or rejection (reviewed by)

The reviewed timestamp and reviewer SHALL be stored separately from the submitted timestamp and submitting employee.

IF a rejected timesheet is later resubmitted and approved again, THEN THE system SHALL update the reviewed timestamp and reviewer to reflect the most recent review.

### Automatic Total Hours Calculation

THE system SHALL automatically calculate the total hours of a timesheet as the sum of the duration (in hours) of all timelogs associated with the timesheet.

WHEN a timelog is added to or removed from a timesheet, THE system SHALL recalculate the total hours.

The total hours field SHALL be read-only and SHALL NOT be manually editable.

### Timesheet Pagination and Filtering

THE system SHALL support pagination when displaying a list of timesheets.

Users SHALL be able to filter the timesheet list by:
- Status ("draft", "submitted", "approved", "rejected")
- Date range (start date and end date for the week start)

IF a date range filter is provided without a start date, THEN THE system SHALL treat it as unbounded from the past.
IF a date range filter is provided without an end date, THEN THE system SHALL treat it as unbounded into the future.

Employees SHALL only see their own timesheets in the paginated list.

Users with "time:approve" permission SHALL see all employees' submitted timesheets in the paginated list.

## Timer Rules

An employee can start a timer to track time in real time. Each employee can have at most one active timer at any given moment. Starting a timer requires selecting a project, and the task is optional. If a task is provided, it must belong to the selected project. The description is optional and can be edited while the timer is running. The timer records the start timestamp, project, task, and description. When the employee stops the timer, a timelog is created with the date set to the start date and the duration calculated as the difference between stop and start times, rounded to the nearest minute. The employee can also discard the timer without creating a timelog. If the employee does not stop the timer, it continues running indefinitely with no automatic stop. The employee can view their currently running timer at any time. While the timer is running, the employee can edit the description and change the project or task assignment.

### Single Active Timer Constraint

THE employee SHALL have at most one active timer at any given moment.

WHEN an employee attempts to start a timer, THE system SHALL verify that no other active timer exists for that employee.

IF the employee already has an active timer, THEN the start request SHALL be rejected.

### Project Requirement for Timer Start

WHEN an employee starts a timer, THE system SHALL require a project selection.

IF no project is selected when starting a timer, THEN the start request SHALL be rejected.

The project SHALL be a project the employee is assigned to (as defined in [ProjectMember Rules]).

### Optional Task Belonging to Project

WHEN an employee starts a timer, THE task selection SHALL be optional.

IF a task is provided when starting a timer, THEN the task SHALL belong to the selected project.

IF the provided task does not belong to the selected project, THEN the start request SHALL be rejected.

### Timer Start Timestamp Recording

WHEN a timer is started, THE system SHALL record the start timestamp including both the date and time of the start moment.

WHILE a timer is running, THE system SHALL store the start timestamp, selected project, optional task, and optional description associated with the timer.

### Timer Stop and Timelog Creation Rules

WHEN an employee stops their active timer, THE system SHALL create a timelog.

The created timelog SHALL have its date set to the timer's start date.

The duration of the timelog SHALL be calculated as the difference between the stop time and the start time.

The duration SHALL be rounded to the nearest minute.

The project and optional task SHALL be carried over from the timer to the created timelog.

The description SHALL be carried over from the timer to the created timelog.

The created timelog SHALL comply with all standard timelog validation rules (as defined in [Timelog Rules]).

### Timer Discard Without Timelog Creation

WHEN an employee discards their active timer, THE system SHALL NOT create any timelog.

WHEN a timer is discarded, THE system SHALL remove the active timer record.

IF a timer is discarded, THEN the employee MAY start a new timer afterwards.

### No Automatic Timer Stop

WHILE a timer is running, THE system SHALL NOT automatically stop the timer under any condition.

IF an employee does not stop their timer, THEN the timer SHALL continue running indefinitely.

The timer SHALL have no maximum duration limit.

The timer SHALL have no timeout mechanism.

### Viewing Current Running Timer

WHEN an employee requests to view their active timer, THE system SHALL return the currently running timer if one exists.

IF no active timer exists for the employee, THEN the system SHALL indicate that no timer is currently running.

### Editing Running Timer Details

WHILE a timer is running, THE employee MAY edit the description.

WHILE a timer is running, THE employee MAY change the project or task assignment.

IF the employee changes the task assignment of a running timer, THEN the new task SHALL belong to the selected project.

IF the new task does not belong to the selected project, THEN the change SHALL be rejected.

### Timer Error Scenarios

IF an employee attempts to start a timer while already having an active timer, THEN the request SHALL be rejected.

IF an employee attempts to start a timer without selecting a project, THEN the request SHALL be rejected.

IF an employee provides a task that does not belong to the selected project when starting a timer, THEN the request SHALL be rejected.

IF an employee attempts to change the task of a running timer to a task not belonging to the current project, THEN the change SHALL be rejected.

IF a deactivated employee attempts to start a timer, THEN the request SHALL be rejected (deactivated employee restrictions apply as defined in [Employee Rules]).

## Invitation Rules

When a user with employee management permission invites a new employee by email, the system checks whether the email address is already associated with an existing user account. If the invited email already has an account, the user is immediately added to the organization as an employee. If the invited email has no account, a pending invitation is created. The invitation stores the email address and the target organization. When a person signs up using that email address, they are automatically added to all organizations that have pending invitations for that email. Invitations are specific to an organization and cannot be transferred to another organization. An invitation remains pending until the recipient signs up or the invitation is cancelled. Only users with employee management permission can send invitations.

### Email Check Against Existing Accounts

When a user with employee management permission invites a new employee by providing an email address, the system checks whether the email address is already associated with an existing user account. The system performs this check before creating any invitation record. If the email is not associated with any existing user account, the system proceeds with creating a pending invitation.

### Immediate Addition for Existing Users

If the invited email address is already associated with an existing user account, the system immediately adds the user to the organization as an employee. No invitation record is created in this case. The new employee is assigned the default Employee role (or a role specified during invitation). The employee record is created with an active status.

### Pending Invitation Creation for New Users

If the invited email address is not associated with any existing user account, the system creates a pending invitation. A pending invitation has a status of "pending". The invitation remains pending until either the recipient signs up using that email address or the invitation is cancelled by a user with employee management permission.

### Invitation Data

Each invitation stores the following information: the email address of the invitee, the target organization, and the timestamp when the invitation was created. The invitation does not store a role assignment — the role is determined when the invitation is accepted (the default Employee role is assigned upon joining). Invitations are specific to one organization and cannot be transferred to another organization. If a user with employee management permission cancels an invitation, the invitation's status is updated to "cancelled".

### Auto-Add on Signup with Invited Email

When a person signs up for an account using an email address that has one or more pending invitations, the system automatically processes all pending invitations for that email. For each pending invitation, the system creates an employee record for the new user in the corresponding organization with an active status and the default Employee role. After processing, the invitations are marked as accepted. If the email has invitations in multiple organizations, the user is added to all of them simultaneously upon signup.

### Invitation Uniqueness Constraint

An organization cannot have more than one pending invitation for the same email address at the same time. If a user with employee management permission attempts to invite an email that already has a pending invitation for the same organization, the request is rejected. This prevents duplicate invitations from being created.

### Cancellation of Pending Invitations

A user with employee management permission can cancel a pending invitation. When an invitation is cancelled, its status is updated to "cancelled". The invited person cannot accept a cancelled invitation by signing up later — the invitation is no longer valid. Cancellation does not affect other pending invitations for the same email in different organizations.

## ActivityLog Rules

The system automatically records significant actions as activity log entries. Each entry captures a timestamp of when the action occurred, the user who performed the action, the action type describing what happened, the target entity type and its identifier, and additional details about the change. Actions that trigger activity logging include: employee invited, deactivated, or reactivated; contract created or edited; project created, archived, completed, or deleted; task status changed; timesheet submitted, approved, or rejected; and role assigned or changed. Activity log entries are immutable and cannot be edited or deleted by any user. Only users with organization management permission can view the full activity log. The activity log supports pagination and can be filtered by action type, user, and date range. The activity log serves as an audit trail for compliance and tracking purposes.

### Automatic Activity Recording

THE system SHALL automatically create an activity log entry WHEN any of the following actions occur:
- An employee is invited, deactivated, or reactivated
- An employee contract is created or edited
- A project is created, archived, completed, or deleted
- A task's status changes
- A timesheet is submitted, approved, or rejected
- An employee's role is assigned or changed

### Timestamp and Actor Recording

WHEN an activity log entry is created, THE system SHALL record:
- The timestamp of when the action occurred
- The user who performed the action

THE timestamp SHALL reflect the actual time the action was performed, not the time of submission.

### Action Type Classification

WHEN an activity log entry is created, THE system SHALL classify the action using an action type that describes what occurred (e.g., "employee.invited", "project.archived", "timesheet.approved").

WHEN storing an activity log entry, THE action type SHALL be a structured identifier that enables filtering by category of action.

### Target Entity Recording

WHEN an activity log entry is created, THE system SHALL record both the type of entity affected (e.g., "Employee", "Project", "Timesheet") and the unique identifier of that entity, so that each log entry can be linked back to the specific entity that was acted upon.

### Action Details Storage

WHEN an activity log entry is created, THE system SHALL store additional details describing the change, such as the previous and new values of modified fields or the reason for a rejection. WHERE no additional details are applicable, THE details field SHALL remain empty.

### Activity Log Entry Immutability

WHILE an activity log entry exists in the system, THE system SHALL NOT allow any user to edit or delete the entry. Activity log entries SHALL be immutable records that provide a reliable audit trail.

### Employee Action Logging

THE system SHALL create an activity log entry WHEN an employee is invited to the organization (recorded by the inviting user).

THE system SHALL create an activity log entry WHEN an employee is deactivated, recording who performed the deactivation.

THE system SHALL create an activity log entry WHEN an employee is reactivated, recording who performed the reactivation.

### Contract Action Logging

THE system SHALL create an activity log entry WHEN a contract is created for an employee, recording the employee, the start date, pay rate, and pay period.

THE system SHALL create an activity log entry WHEN an active contract is edited, recording which fields were changed along with previous and new values.

### Project Action Logging

THE system SHALL create an activity log entry WHEN a project is created, recording the project name and the user who created it.

THE system SHALL create an activity log entry WHEN a project is archived, recording the user who archived it.

THE system SHALL create an activity log entry WHEN a project is marked as completed, recording the user who completed it.

THE system SHALL create an activity log entry WHEN a project is deleted, recording the project name and the user who deleted it.

### Task Status Change Logging

THE system SHALL create an activity log entry WHEN a task's status changes, recording the task title, the project it belongs to, the previous status, the new status, and the user who made the change. Task status change entries in the activity log are distinct from the task-specific history entries (defined in TaskHistory Rules).

### Timesheet Action Logging

THE system SHALL create an activity log entry WHEN a timesheet is submitted, recording the employee, the week period, and the submission timestamp.

THE system SHALL create an activity log entry WHEN a timesheet is approved, recording who approved it and the timestamp.

THE system SHALL create an activity log entry WHEN a timesheet is rejected, recording who rejected it, the rejection reason, and the timestamp.

### Role Change Logging

THE system SHALL create an activity log entry WHEN an employee's role is assigned or changed, recording the employee, the previous role name, the new role name, and the user who made the change.

### Activity Log Viewing Permission

IF a user has the permission to manage organization settings, THEN THE system SHALL allow that user to view the full activity log for that organization. IF a user does not have organization management permission, THEN THE system SHALL deny access to the activity log.

### Activity Log Pagination

WHEN a user views the activity log, THE system SHALL present the entries in a paginated list, ordered by timestamp from most recent to oldest. Each page SHALL display a fixed number of entries (defined in list browsing expectations).

### Activity Log Filtering

WHEN a user views the activity log, THE system SHALL allow filtering by:
- Action type (e.g., only employee-related actions, only timesheet-related actions)
- User (entries performed by a specific user)
- Date range (entries within a specific start and end date)

IF multiple filters are applied simultaneously, THE system SHALL return entries that satisfy all filter criteria (AND logic).

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Pagination

THE system SHALL support pagination on all browseable lists including the employee list, project list, task list, timelog list, timesheet list, and activity log list.

THE system SHALL display a fixed number of items per page across all lists.

THE system SHALL indicate the total number of items available and the total number of pages.

WHEN a user navigates to a specific page number, THE system SHALL display the corresponding page of results.

WHEN a user applies or changes a filter, THE system SHALL reset pagination to the first page.

WHEN a user changes the sort order, THE system SHALL reset pagination to the first page.

WHILE filters are active, THE system SHALL paginate based on the filtered result set rather than the unfiltered set.

### Filtering

THE system SHALL allow users to apply multiple filters simultaneously on any browseable list, narrowing results by all selected criteria.

WHEN a user applies or changes any filter, THE system SHALL reset pagination to the first page.

WHEN a user clears all filters, THE system SHALL return the unfiltered list starting from the first page.

**Employee list filters:**

THE system SHALL allow filtering the employee list by department, employment type (full-time, part-time, contractor, intern), and employee status (active, deactivated).

THE system SHALL allow searching the employee list by employee name using text input.

**Project list filters:**

THE system SHALL allow filtering the project list by project status (active, archived, completed).

**Task list filters:**

THE system SHALL allow filtering the task list by task status (open, in-progress, completed, closed), priority (low, medium, high, urgent), and assigned employee.

**Timelog list filters:**

THE system SHALL allow filtering the timelog list by date range (start date and end date), project, task, and billable status (billable, non-billable).

**Timesheet list filters:**

THE system SHALL allow filtering the timesheet list by timesheet status (draft, submitted, approved, rejected) and date range.

**Activity log filters:**

THE system SHALL allow filtering the activity log by action type, user who performed the action, and date range.

### Sorting

THE system SHALL sort all lists by creation date in descending order by default.

WHEN a user selects a sort attribute, THE system SHALL reorder the list by that attribute.

WHEN a user toggles between ascending and descending order, THE system SHALL reverse the sort direction.

WHEN a user changes the sort order, THE system SHALL reset pagination to the first page.

THE system SHALL allow only one sort attribute to be active at a time.

**Task list sort options:**

THE system SHALL allow sorting the task list by due date, priority, and creation date.

WHERE a user selects a sort attribute for the task list, each sort option SHALL support both ascending and descending order.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Session Errors

WHEN a user attempts to log in with an email that does not exist in the system, THEN the request is rejected with an indication that the credentials are invalid.

WHEN a user attempts to log in with an incorrect password, THEN the request is rejected with an indication that the credentials are invalid. The system does not disclose whether the email exists or the password is wrong — only that the combination is invalid.

WHEN a user attempts to perform an action without being authenticated, THEN the request is rejected.

WHEN a user's session expires and they attempt to perform an action, THEN the request is rejected and the user must log in again.

WHEN a user attempts to switch to an organization they do not belong to, THEN the request is rejected.

### Account Deletion Constraints

WHEN a user attempts to delete their account while being the sole owner of an organization, THEN the request is rejected unless they first transfer ownership to another user or delete the organization.

WHEN an organization owner attempts to delete their organization while there are pending timesheets that have not been approved or rejected, THEN the request is rejected.

WHEN an organization owner attempts to delete their organization while there are active employee contracts, THEN the request is rejected.

WHEN a user attempts to delete their account and they are not the sole owner of any organization, THEN their employee records in all organizations they belonged to are marked as deactivated, and the account is permanently removed.

### Concurrent Operation Conflicts

WHEN an employee attempts to start a timer while they already have an active timer, THEN the request is rejected — an employee can have at most one active timer at a time.

WHEN an employee attempts to submit a timesheet for a week where another timesheet with status submitted or approved already exists, THEN the request is rejected.

WHEN an employee attempts to create a draft timesheet for a week where a timesheet with status submitted or approved already exists, THEN the request is rejected.

WHEN two users with `time:approve` permission attempt to approve or reject the same timesheet simultaneously, THEN only the first action succeeds; the second request is rejected because the timesheet status has already changed.

### Data Isolation Violations

WHEN an employee attempts to access data (employees, projects, timelogs, timesheets, reports, activity logs) belonging to a different organization than their currently selected organization context, THEN the request is rejected.

WHEN a user attempts to assign an employee to a project that belongs to a different organization, THEN the request is rejected.

WHEN a user attempts to create or edit a timelog with a project that does not belong to the user's currently selected organization, THEN the request is rejected.

WHEN a user attempts to view the activity log of an organization where they do not have `org:manage` permission, THEN the request is rejected.

### Operation Sequencing Errors

WHEN an employee attempts to edit or delete a timelog that is part of an approved timesheet, THEN the request is rejected — approved timelogs are locked.

WHEN an employee attempts to delete a timelog that is part of a submitted timesheet, THEN the request is rejected — only timelogs not part of any submitted or approved timesheet can be deleted.

WHEN an employee attempts to submit a timesheet that has no timelogs, THEN the request is rejected.

WHEN a user with `project:manage` permission attempts to delete a project that has existing timelogs, THEN the request is rejected.

WHEN an organization owner attempts to delete a custom role that still has employees assigned to it, THEN the request is rejected.

WHEN a user attempts to edit a past (ended) contract, THEN the request is rejected — past contracts are immutable historical records.

### Resource Not Found and Access Errors

WHEN a user attempts to access an employee record that does not exist in the current organization, THEN the request is rejected.

WHEN a user attempts to access a project that does not exist in the current organization, THEN the request is rejected.

WHEN a user attempts to access a timesheet that does not exist or belongs to a different organization, THEN the request is rejected.

WHEN a user attempts to access a task that does not exist in the specified project, THEN the request is rejected.

WHEN a user attempts to view an employee's contract but does not have `employee:view` permission and is not that employee, THEN the request is rejected.

WHEN an employee attempts to log time against a project they are not assigned to, THEN the request is rejected.

### Invalid State Transition Errors

WHEN a user attempts to log time against an archived or completed project, THEN the request is rejected — only active projects can receive new timelogs.

WHEN a deactivated employee attempts to log time or submit a timesheet, THEN the request is rejected.

WHEN an employee attempts to approve or reject their own timesheet, THEN the request is rejected — timesheets must be reviewed by a user with `time:approve` permission who is not the timesheet owner.

WHEN a user without `employee:manage` permission attempts to change an employee's role assignment, THEN the request is rejected.

WHEN a user without `project:manage` permission attempts to remove an employee from a project, THEN the request is rejected.

### Invitation and Sign-Up Exception Cases

WHEN a user with `employee:manage` permission attempts to invite an email that is already an active employee in the organization, THEN the request is rejected — the user is already a member.

WHEN a user attempts to sign up with an email that already has an existing account, THEN the request is rejected — the email is already registered.

WHEN a user attempts to create an organization with a name that is empty or consists only of whitespace, THEN the request is rejected.

WHEN a user attempts to change their password without providing the correct current password, THEN the request is rejected.

WHEN an organization owner attempts to delete or modify a built-in role (Owner, Manager, Employee), THEN the request is rejected — built-in roles cannot be deleted or changed.