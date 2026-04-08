**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Organizations operate as independent tenants with their own employees, projects, and data. Each organization must have a name, description, logo image, currency, timezone, and fiscal start month. Organization owners can edit organization settings at any time. Organization deletion requires all pending timesheets to be resolved and no active employee contracts to exist. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's account remains but loses association with the deleted organization. Organizations support multi-tenancy where each operates completely independently. Users create an organization during their initial sign-up process. Currency values include options like USD, EUR, and KRW. Fiscal start month defines the organization's financial year beginning.

### Multi-Tenancy Organization Support

THE system SHALL support multiple organizations operating as independent tenants. Each organization SHALL maintain complete isolation of its employees, projects, tasks, timelogs, and timesheets. Data from one organization SHALL NOT be visible to employees of another organization. WHEN a user belongs to multiple organizations, THE system SHALL restrict data access to the currently selected organization context. All system operations SHALL be scoped to the selected organization. Users SHALL create an organization during their initial sign-up process. THE organization SHALL be automatically associated with the creating user as the owner.

### Organization Settings Configuration

THE organization SHALL have the following required fields: name, description, logo image, currency, timezone, and fiscal start month. Currency values SHALL include USD, EUR, and KRW. THE fiscal start month SHALL define the beginning month of the organization's financial year. THE timezone SHALL define the organization's operational time zone. Organization owners SHALL be able to edit organization settings at any time. IF the user attempting to edit settings does not have owner permissions, THEN THE system SHALL reject the request. All settings changes SHALL be recorded in the activity log.

### Organization Deletion Validation

Organization owners SHALL be able to delete their organization only when specific conditions are met. All pending timesheets SHALL be resolved, meaning each timesheet SHALL have a status of approved or rejected. There SHALL be no employees assigned to the organization. IF pending timesheets exist, THEN THE system SHALL reject the deletion request with a message indicating unresolved timesheets. IF employees are assigned to the organization, THEN THE system SHALL reject the deletion request with a message indicating all employees must be removed first. WHEN an organization is deleted, THE system SHALL permanently delete all employees, projects, tasks, timelogs, and timesheets with no recovery option. THE owner's user account SHALL remain active but SHALL no longer be associated with any organization. IF the owner belongs to other organizations, THEN THE owner's account SHALL retain access to those organizations.

## User Rules

Users sign up with email and password credentials. Users log in using their email and password. Users can change their password after account creation. A single user can belong to multiple organizations simultaneously. During login, users must select which organization to work in as their context. All subsequent actions are scoped to the selected organization context. Users can switch between organizations without logging out. Account deletion requires transferring ownership or deleting any organization where the user is the sole owner. When a user is deleted, their employee records in other organizations are marked as deactivated. Email addresses must be unique for account creation.

### User Account Credentials

Users shall sign up by providing an email address and password.
The email address shall be unique across all user accounts in the platform.
If the email address already exists, the signup request shall be rejected.
Users shall log in by providing their registered email address and password.
If the email address does not exist, the login request shall be rejected.
If the password does not match the stored credentials, the login request shall be rejected.
Users shall be able to change their password after account creation.

### Organization Context Selection

Upon successful login, users shall select an organization to work in as their context.
If the user belongs to no organizations, organization selection shall be skipped and the user shall be prompted to create an organization.
All user actions shall be scoped to the selected organization context.
If a user attempts to access data from a non-selected organization, the request shall be rejected.
If a user attempts to perform actions without selecting an organization, the request shall be rejected.
Users shall be able to switch between organizations without logging out.
Data from different organizations shall remain isolated from each other.

### Multiple Organization Membership

A user shall be able to belong to multiple organizations simultaneously.
Organization membership is established through invitation (defined in Employee Rules) or during initial organization creation.
If a user is already a member of an organization, duplicate membership shall be rejected.
Organization membership shall persist until the user is removed or the organization is deleted.

### Account Deletion Constraints

Users shall be able to delete their account.
If the user is the sole owner of any organization, the account deletion request shall be rejected.
The user shall transfer ownership or delete the organization before account deletion is permitted.
Upon account deletion, the user's employee records in other organizations shall be marked as deactivated.
Upon successful account deletion, the user account shall be permanently removed.

## UserProfile Rules

Each user has a global profile shared across all organizations they belong to. User profiles contain display name, avatar image, and phone number fields. Users can edit their profile information at any time. Profile changes are reflected across all organizations immediately. Display name is used for identification within the platform. Avatar image provides visual identification in the user interface. Phone number is optional contact information. The profile is not organization-specific but global to the user account.

### Global Profile Sharing and Consistency

THE user profile SHALL be global and shared across all organizations the user belongs to. WHEN a user updates their profile, THE changes SHALL be reflected immediately across all organizations. WHERE a user belongs to multiple organizations, THE profile SHALL remain consistent across all organization contexts. THE system SHALL not allow organization-specific profile variations. THE user profile SHALL contain display name, avatar image, and phone number fields.

### Profile Field Validation and Usage

THE display name field SHALL be used for user identification across the platform. THE display name SHALL appear in employee lists, project memberships, task assignments, timesheets, and activity logs. THE avatar image field SHALL provide visual identification in the user interface. THE avatar image SHALL be displayed alongside the user's display name across all organizations. THE phone number field SHALL store contact information. THE phone number SHALL be visible across all organizations the user belongs to. WHEN a user edits their profile, THE system SHALL validate all fields before applying changes. IF any field fails validation, THEN THE entire profile update SHALL be rejected. IF no fields are changed during a profile edit, THEN THE update request SHALL be rejected.

## Role Rules

Each organization maintains its own set of roles independent from other organizations. Three built-in roles exist and cannot be deleted: Owner, Manager, and Employee. Organization owners can create custom roles with specific names and permission sets. Custom roles can be edited by organization owners. Custom roles can only be deleted if no employees are assigned to them. Each employee in an organization is assigned exactly one role. Available permissions include organization management, employee management, employee viewing, project management, project viewing, time management, time approval, viewing all time data, and report viewing. Role assignment can be changed by users with employee management permission. Built-in roles have predefined permission sets that cannot be modified.

### Built-in Roles and Immutability

THE system SHALL maintain three built-in roles in each organization: Owner, Manager, and Employee. THE built-in roles SHALL exist from organization creation and SHALL NOT be deletable. THE permission sets assigned to built-in roles SHALL be predefined and SHALL NOT be modifiable. Organization owners SHALL NOT edit the names of built-in roles. Organization owners SHALL NOT change the permission sets of built-in roles. THE built-in roles SHALL operate independently per organization, meaning role assignments in one organization SHALL NOT affect another organization.

### Custom Role Management

Organization owners SHALL create custom roles with a unique name within the organization. WHEN creating a custom role, THE organization owner SHALL select a set of permissions from the available permission list. Organization owners SHALL edit custom roles including the role name and permission set. Organization owners SHALL delete custom roles only if no assignees are currently assigned to that role. IF assignees are assigned to a custom role, THEN THE system SHALL reject the deletion request. WHEN a custom role is deleted, THE employees previously assigned to it SHALL have invalid role assignments until reassigned. Custom role names SHALL be unique within the organization but MAY match names in other organizations.

### Role Assignment Rules

Each employee in an organization SHALL be assigned exactly one role. An employee SHALL NOT have multiple roles within the same organization. An employee MAY have different roles in different organizations they belong to. Users with employee management permission SHALL change employee role assignments. WHEN changing an employee's role, THE new role SHALL exist in the same organization. Role assignment changes SHALL take effect immediately and SHALL apply to all future actions by the employee. Historical actions performed by the employee SHALL remain associated with the role they held at the time of the action. Employees SHALL NOT change their own role assignment.

### Permission Definitions

THE organization management permission SHALL allow editing organization settings including name, description, logo, currency, timezone, and fiscal start month. THE employee management permission SHALL allow adding new employees, editing employee records, deactivating employees, reactivating employees, and changing employee role assignments. THE employee viewing permission SHALL allow viewing the employee list and individual employee details including contracts and project assignments. THE project management permission SHALL allow creating projects, editing projects, archiving projects, completing projects, deleting projects without timelogs, creating tasks, editing tasks, and managing project memberships. THE project viewing permission SHALL allow viewing all projects and tasks within the organization. THE time management permission SHALL allow editing or deleting any employee's timelogs regardless of ownership. THE time approval permission SHALL allow viewing all submitted timesheets, approving timesheets, and rejecting timesheets with a reason. THE view all time data permission SHALL allow viewing all employees' timelogs and timesheets without approval capabilities. THE report viewing permission SHALL allow accessing organization reports including time reports, project budget reports, and weekly summary reports.

## Employee Rules

Employees are invited to organizations by email address. If the invited email has an existing account, the user is added to the organization immediately. If the invited email has no account, a pending invitation is created. Pending invitations are fulfilled when the user signs up with that email. Each employee record references a user account and has a role in the organization. Employee records include optional department and position fields. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status is either active or deactivated. Deactivated employees cannot log time or submit timesheets. Deactivated employees' historical timelogs and timesheets are preserved. Deactivated employees can be reactivated to restore access.

### Employee Invitation Rules

WHEN a user with employee management permission invites a new employee by email address, THE system SHALL check if the email address already has a user account in the platform.

IF the email address already has a user account, THEN THE system SHALL immediately add that user to the organization as an employee.

IF the email address has no existing user account, THEN THE system SHALL create a pending invitation.

WHEN a user signs up with an email address that has a pending invitation, THE system SHALL automatically add the user to all organizations with pending invitations for that email address.

WHEN a pending invitation is fulfilled through signup, THE system SHALL mark the pending invitation as fulfilled and assign the user the role specified in each invitation.

IF a user signs up with a different email address than the pending invitation, THEN THE pending invitations remain pending and are not fulfilled.

IF a user without employee management permission attempts to invite employees, THEN THE request is rejected.

Users with employee management permission can cancel pending invitations at any time.

### Employee Role Assignment Rules

THE system SHALL require each employee in an organization to be assigned exactly one role.

WHEN assigning a role to an employee, THE system SHALL validate that the role exists in the organization.

IF the role being assigned is a custom role, THEN THE system SHALL validate that the role has not been deleted.

Custom roles can only be deleted if they have no assignees.

WHEN a user with employee management permission changes an employee's role, THE system SHALL validate that the new role is different from the current role.

WHEN a user with employee management permission changes an employee's role, THE system SHALL validate that the new role exists and is active in the organization.

IF the role being assigned has been deleted or does not exist, THEN THE request is rejected.

The role change takes effect immediately upon successful validation.

### Employee Record Field Validation

THE department field on an employee record is optional.

IF a department is assigned to an employee, THEN THE system SHALL validate that the department exists in the organization.

IF the department assigned to an employee is deleted, THEN THE system SHALL set the employee's department field to null without deleting the employee record.

IF an invalid department is specified when creating or updating an employee record, THEN THE request is rejected.

THE position field on an employee record is optional.

THE position field accepts any text value representing the employee's job title or position within the organization.

THE employment type field is required for each employee record.

THE system SHALL require the employment type to be one of the following values: full-time, part-time, contractor, or intern.

IF an employment type outside these four values is specified, THEN THE request is rejected.

Users with employee management permission can change the employment type at any time.

### Employee Status and Access Rules

THE system SHALL maintain each employee record with a status that is either active or deactivated.

New employees are created with active status by default.

Only users with employee management permission can change an employee's status.

WHEN an employee's status is deactivated, THE system SHALL prevent the employee from creating new timelogs.

WHEN an employee's status is deactivated, THE system SHALL prevent the employee from submitting new timesheets.

WHEN an employee's status is deactivated, THE system SHALL prevent the employee from starting or stopping timers.

WHEN an employee's status is deactivated, THE system SHALL prevent the employee from being assigned to new projects or tasks.

IF a deactivated employee attempts to log time or submit a timesheet, THEN THE request is rejected.

WHEN an employee is deactivated, THE system SHALL preserve all historical timelogs created by the employee.

WHEN an employee is deactivated, THE system SHALL preserve all historical timesheets submitted by the employee.

WHEN an employee is deactivated, THE system SHALL preserve all contracts associated with the employee.

WHEN an employee is deactivated, THE system SHALL preserve all project memberships and task assignments.

Deactivation does not delete or modify any historical data associated with the employee.

Users with employee management permission can reactivate a deactivated employee.

WHEN an employee is reactivated, THE system SHALL change the employee status from deactivated to active.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to log time and submit timesheets based on their assigned role.

## Contract Rules

Each employee can have multiple contracts serving as historical records. Only one contract can be active at any given time. Each contract requires a start date, pay rate, pay period, and working hours per week. End date is optional where null means the contract is ongoing. Pay period must be one of: hourly, daily, weekly, or monthly. Notes field is optional for additional contract details. Creating a new contract automatically ends the previous active contract by setting its end date. Past contracts are immutable and cannot be edited. Only the current active contract can be edited by users with employee management permission. Employees can view their own contracts. Users with employee viewing permission can view any employee's contracts.

### Contract Multiplicity and Active Constraint

Each employee can have multiple contracts serving as a historical record of employment terms. Only one contract can be active at any given time for an employee. A contract is considered active if it has a start date and no end date, or if the current date falls within the contract's start and end date range. When a new contract is created for an employee, the system automatically ends any previously active contract by setting its end date to the day before the new contract's start date.

### Contract Required Fields

Every contract must have a start date specified at creation. The start date cannot be in the past relative to the contract creation date. Every contract must have a pay rate specified as a numeric value representing the compensation amount. Every contract must have working hours per week specified as a numeric value indicating the expected weekly working hours. If any required field is missing during contract creation, the request is rejected.

### Contract Optional Fields

A contract may have an end date specified. If no end date is provided, the contract is considered ongoing with no predetermined termination date. A contract may have notes specified for additional details or special terms. If notes are not provided, the contract is created without any notes. The end date and notes fields can be left empty during contract creation.

### Pay Period Classification

Every contract must specify a pay period that defines how the employee is compensated. The pay period must be one of the following classifications: hourly, daily, weekly, or monthly. The pay period determines how the pay rate is interpreted and applied. If an invalid pay period value is provided during contract creation or editing, the request is rejected.

### Contract Lifecycle Rules

When a new contract is created for an employee, the previous active contract is automatically terminated by setting its end date to the day before the new contract's start date. Past contracts are immutable and cannot be edited after they are no longer active. Only the current active contract can be edited by users with employee management permission. If a user attempts to edit a past contract, the request is rejected. If a user without employee management permission attempts to edit an active contract, the request is rejected.

### Contract Viewing Permissions

Employees can view their own contracts including all historical and active contracts. Users with employee viewing permission can view any employee's contracts within the organization. If a user attempts to view contracts for an employee in a different organization, the request is rejected. If a user without appropriate viewing permission attempts to access contract details, the request is rejected.

## Department Rules

Each organization can have multiple departments for employee organization. Departments have a name and description. Departments support one level of nesting through an optional parent department. Users with organization management permission can create, edit, and delete departments. Deleting a department sets all employees' department field to null without deleting the employees. Employees can view the list of all departments in their organization. Department names must be unique within an organization. Parent department must belong to the same organization.

### Department Creation and Management

Users with organization management permission can create new departments within their organization.

When creating a department, the name is required and the description is optional.

Department names must be unique within the same organization. If a duplicate name is provided, the request is rejected.

When creating a department, a parent department may be specified to establish a hierarchical relationship. If a parent department is specified, it must belong to the same organization. If the parent department belongs to a different organization, the request is rejected.

Users with organization management permission can edit existing departments, including changing the name, description, or parent department. The same uniqueness and organization constraints apply during editing.

Users with organization management permission can delete departments.

### Department Hierarchy Structure

Departments support one level of nesting only. A department can have a parent department, but the parent department cannot itself have a parent department.

If a department is assigned a parent department that already has a parent, the request is rejected.

The parent department field is optional. Departments without a parent are considered top-level departments.

### Department Deletion Employee Handling

When a department is deleted, all employees assigned to that department have their department field set to null.

Deleting a department does not delete or deactivate the employees assigned to it. Employee records remain active with all other fields preserved.

Employees without a department assignment continue to function normally within the organization.

### Department List Viewing

All employees in an organization can view the list of departments within their organization.

The department list shows all departments regardless of the employee's role or permission level.

Employees can view department details including name, description, and parent department relationship.

## Project Rules

Projects require a name and color code for UI display. Description, budget hours, start date, and end date are optional fields. Project status must be one of: active, archived, or completed. Users with project management permission can create, edit, archive, or complete projects. Archived and completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Projects can only be deleted if they have no associated timelogs. Budget hours represent the total estimated hours for the project. Users with project viewing permission can view all projects in the organization.

### Project Name Requirement

THE system SHALL require a project name when creating a project.

THE system SHALL require a project name when editing a project.

IF the project name is empty or null, THEN THE system SHALL reject the request.

### Project Color Code Requirement

THE system SHALL require a color code when creating a project.

IF the color code is not provided, THEN THE system SHALL reject the request.

### Project Description Option

WHERE a project description is provided, THE system SHALL accept it during project creation.

THE system SHALL allow the project description to be added, modified, or removed at any time.

IF the project description is not provided, THEN THE system SHALL accept the project creation request.

### Budget Hours Option

WHERE budget hours are provided, THE system SHALL accept them during project creation.

IF budget hours are not provided, THEN THE system SHALL accept the project creation request.

THE system SHALL allow budget hours to be added or modified after project creation.

### Project Start Date Option

WHERE a start date is provided, THE system SHALL accept it during project creation.

IF the start date is not provided, THEN THE system SHALL accept the project creation request.

THE system SHALL allow the start date to be added or modified after project creation.

### Project End Date Option

WHERE an end date is provided, THE system SHALL accept it during project creation.

IF the end date is not provided, THEN THE system SHALL accept the project creation request.

THE system SHALL allow the end date to be added or modified after project creation.

### Project Status Classification

THE system SHALL assign exactly one status to each project at any time.

THE system SHALL restrict project status to one of: active, archived, or completed.

### Initial Project Status

WHEN a project is created, THE system SHALL set its initial status to active.

### Status Change Permission

WHEN a user with project management permission requests to change a project status, THE system SHALL allow the change from active to archived.

WHEN a user with project management permission requests to change a project status, THE system SHALL allow the change from active to completed.

### Archived Project Restriction

IF a project status is archived, THEN THE system SHALL NOT allow the status to be changed back to active.

### Completed Project Restriction

IF a project status is completed, THEN THE system SHALL NOT allow the status to be changed back to active.

### Status Visibility

THE system SHALL display the project status to all users with project viewing permission.

### Archived Project Timelog Restriction

IF a project status is archived, THEN THE system SHALL reject any attempt to create a new timelog for that project.

### Completed Project Timelog Restriction

IF a project status is completed, THEN THE system SHALL reject any attempt to create a new timelog for that project.

### Existing Timelog Preservation on Archive

WHEN a project status is changed to archived, THE system SHALL preserve all existing timelogs for that project.

THE system SHALL allow users to view existing timelogs on archived projects.

### Existing Timelog Preservation on Completion

WHEN a project status is changed to completed, THE system SHALL preserve all existing timelogs for that project.

THE system SHALL allow users to view existing timelogs on completed projects.

### Assigned Employee Timelog Access

WHILE an employee is assigned to an archived project, THE system SHALL allow the employee to view their historical timelogs for that project.

WHILE an employee is assigned to a completed project, THE system SHALL allow the employee to view their historical timelogs for that project.

### Time Management Permission Limitation

IF a project status is archived, THEN THE system SHALL reject new timelog creation even from users with time management permission.

IF a project status is completed, THEN THE system SHALL reject new timelog creation even from users with time management permission.

### Timelog Dependency Check

BEFORE deleting a project, THE system SHALL validate that no timelogs are associated with the project.

### Assignee Dependency Check

BEFORE deleting a project, THE system SHALL validate that no assignees are associated with the project.

### Deletion Permission Requirement

IF the project has one or more timelogs, THEN THE system SHALL reject the deletion request.

IF the project has one or more assignees, THEN THE system SHALL reject the deletion request.

IF the project has zero timelogs and zero assignees, THEN THE system SHALL allow deletion by users with project management permission.

### Deletion Scope

WHEN a project is deleted, THE system SHALL permanently remove the project record.

WHEN a project is deleted, THE system SHALL permanently remove all tasks associated with the project.

WHEN a project is deleted, THE system SHALL permanently remove all project member assignments for the project.

### Validation Scope

THE system SHALL validate timelog and assignee existence across all employees and all time periods before allowing project deletion.

### Project Creation Permission

IF a user does not have project management permission, THEN THE system SHALL reject the project creation request.

### Project Edit Permission

IF a user does not have project management permission, THEN THE system SHALL reject requests to edit project name, description, color code, budget hours, start date, or end date.

### Project Status Change Permission

IF a user does not have project management permission, THEN THE system SHALL reject requests to archive or complete a project.

### Project Deletion Permission

IF a user does not have project management permission, THEN THE system SHALL reject the project deletion request.

### Project Viewing Permission

IF a user has project viewing permission, THEN THE system SHALL allow the user to view the project list.

IF a user has project viewing permission, THEN THE system SHALL allow the user to view project details.

### Project List Scope

WHILE a user has project viewing permission, THE system SHALL display all projects in the organization, including active, archived, and completed projects.

IF a user does not have project viewing permission, THEN THE system SHALL NOT display any projects to the user.

### Permission Independence

THE system SHALL treat project management permission and project viewing permission as independent permissions. A user MAY have one without the other.

## ProjectMember Rules

Project members link employees to projects with an assigned role. Each project membership includes an employee, a project, and an assigned role. Assigned roles are either member or project-lead. An employee can be assigned to multiple projects simultaneously. Project leads can manage tasks within their assigned project. Users with project management permission can assign employees to projects. Users with project management permission can remove employees from projects. Employees can view which projects they are assigned to. Project membership requires the employee to be active in the organization.

### Project Membership Assignment and Validation

THE system SHALL only allow project membership creation for employees with active status.

THE system SHALL verify that the employee belongs to the same organization as the project before creating membership.

THE system SHALL prevent duplicate project membership for the same employee and project combination.

IF the employee status is deactivated, THEN THE system SHALL reject the assignment request.

IF the project does not exist in the organization, THEN THE system SHALL reject the assignment request.

IF the user lacks project management permission, THEN THE system SHALL reject the assignment request.

IF the employee is already assigned to the project, THEN THE system SHALL reject the duplicate assignment request.

### Project Role Classification and Capabilities

THE system SHALL require exactly one assigned role for each project membership.

THE system SHALL only accept member or project-lead as valid role values.

WHERE the assigned role is project-lead, THE system SHALL enable task management capabilities within the assigned project.

WHERE the assigned role is member, THE system SHALL provide project access without task management capabilities.

### Multiple Project Assignment Rules

THE system SHALL allow an employee to hold project memberships across multiple projects simultaneously.

THE system SHALL treat each project membership as independent from other memberships.

THE system SHALL not enforce a maximum limit on the number of projects an employee can join.

### Project Membership Removal and Viewing

THE system SHALL only allow users with project management permission to remove employees from projects.

WHEN an employee is removed from a project, THE system SHALL preserve their historical timelogs on that project.

WHEN an employee is removed from a project, THE system SHALL preserve their task history on that project.

IF the user lacks project management permission, THEN THE system SHALL reject the removal request.

IF the employee is not assigned to the project, THEN THE system SHALL reject the removal request.

THE system SHALL allow employees to view only their own project memberships.

WHERE a user has project view permission, THE system SHALL allow viewing of all project memberships in the organization.

IF an employee attempts to view another employee's memberships without project view permission, THEN THE system SHALL reject the request.

## Task Rules

Tasks require a title and belong to a specific project. Description, estimated hours, due date, and assigned employee are optional. Task status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Assigned employee must be a member of the parent project. Parent task is optional for creating subtasks with one level of nesting only. Project leads can create and edit tasks in their project. Users with project management permission can create and edit any task. Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, or creation date.

### Task Title Requirement

THE system SHALL require a title when creating a task. If the title is missing or empty, the request is rejected.

### Task Description

WHERE a description is provided, THE system SHALL store it as optional content. If no description is provided, the task is created without one.

### Task Estimated Hours

WHERE estimated hours are provided, THE system SHALL store them as optional data. If no estimated hours are provided, the task is created without them.

### Task Due Date

WHERE a due date is provided, THE system SHALL store it as optional data. If no due date is provided, the task is created without one.

### Assigned Employee Constraint

WHEN an employee is assigned to a task, THE system SHALL verify the employee is a member of the parent project. If the assigned employee is not a project member, the request is rejected.

### Subtask Nesting

WHERE a parent task is specified, THE system SHALL create a subtask. A subtask cannot have its own subtasks. If a task is assigned as a child of another subtask, the request is rejected.

### Project Association

THE system SHALL associate every task with a specific project. If the parent project does not exist or is archived, the request is rejected.

### Task Status Values

THE system SHALL support four task status values: open, inprogress, completed, and closed. If an invalid status value is provided, the request is rejected.

### Task Priority Values

THE system SHALL support four priority levels: low, medium, high, and urgent. If an invalid priority value is provided, the request is rejected.

### Task Status History

WHEN a task status changes, THE system SHALL record the entry as defined in the TaskHistory Rules section.

### Task Creation Permission

WHEN a project lead creates or edits a task, THE system SHALL allow the operation within their assigned project. WHEN a user with project management permission creates or edits a task, THE system SHALL allow the operation on any task in the organization.

### Task Filtering

THE system SHALL allow filtering tasks by status, priority, and assigned employee. Multiple filters can be applied simultaneously.

### Task Sorting

THE system SHALL allow sorting tasks by due date, priority, or creation date. The sort order can be ascending or descending.

### Task Visibility

WHILE an employee is assigned to a project, THE system SHALL allow viewing tasks in that project. IF an employee is not assigned to a project and does not have project view permission, THEN the system SHALL reject the view request.

### Task List Pagination

THE system SHALL paginate the task list. The page size and page number can be specified in the request.

## TaskHistory Rules

Task history entries are automatically created when task status changes. Each history entry records the timestamp of the change. Each entry stores the old status and new status values. Each entry records which user made the status change. Task history provides an audit trail of all status transitions. History entries are immutable once created. Task history cannot be manually edited or deleted. All status changes are recorded without exception.

### Automatic Status Change Recording

WHEN a task status changes, THE system SHALL automatically create a history entry without manual intervention.

WHEN a task status changes from any status to any other status, THE system SHALL record the change without exception.

THE system SHALL create history entries for all status transitions including open to in_progress, in_progress to completed, completed to closed, and any other valid status changes.

THE system SHALL not allow users to bypass or skip history entry creation during status changes.

IF a status change occurs, THEN THE system SHALL ensure a corresponding history entry exists before completing the transition.

### History Entry Structure

EACH history entry SHALL record the exact timestamp when the status change occurred.

EACH history entry SHALL store the old status value before the change.

EACH history entry SHALL store the new status value after the change.

EACH history entry SHALL record which user performed the status change.

THE timestamp SHALL reflect the actual moment the status transition was executed.

THE old status and new status values SHALL represent the complete transition path.

THE user attribution SHALL identify the specific user account that initiated the change.

### History Entry Integrity

THE system SHALL maintain task history as a complete audit trail of all status transitions.

ONCE a history entry is created, THE system SHALL prevent any modification to the entry.

THE system SHALL not allow users to manually edit history entries.

THE system SHALL not allow users to manually delete history entries.

THE system SHALL preserve all history entries for the lifetime of the task.

THE system SHALL ensure history entries cannot be altered to maintain data integrity.

IF a user attempts to modify a history entry, THEN THE system SHALL reject the request.

IF a user attempts to delete a history entry, THEN THE system SHALL reject the request.

## Timelog Rules

Timelogs require a date, duration in minutes, and project. Task and description are optional fields. Billable flag defaults to true if not specified. The project must be one the employee is assigned to. The task must belong to the selected project if provided. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if not part of an approved timesheet. Employees can delete their own timelogs only if not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs. Duration is stored in minutes for precision.

### Timelog Field Requirements

THE timelog SHALL include a date indicating when the work was performed. The date is required and cannot be left empty.

THE timelog SHALL include a duration specified in minutes. The duration is required and represents the amount of time spent on the work. Duration is stored with minute-level precision.

THE timelog SHALL include a project reference. The project is required and identifies which project the work relates to.

WHERE a task is specified, THE timelog SHALL include a task reference. The task is optional and provides more specific detail about the work performed. If a task is specified, it must belong to the selected project.

WHERE a description is provided, THE timelog SHALL include a description. The description is optional and provides context about what work was done.

THE timelog SHALL include a billable flag indicating whether the time is billable to a client. IF the billable flag is not specified, THEN THE system SHALL default the billable flag to true, meaning the time is considered billable.

### Project and Task Validation

WHEN creating a timelog, THE system SHALL validate that the selected project is one that the employee is assigned to. IF the employee is not a member of the project, THEN THE system SHALL reject the timelog creation.

IF a task is specified in the timelog, THEN THE system SHALL validate that the task belongs to the selected project. IF the task belongs to a different project, THEN THE system SHALL reject the timelog creation.

IF the selected project is archived or completed, THEN THE system SHALL reject new timelog creation for that project. Existing timelogs on archived or completed projects are preserved.

### Timelog Creation Restrictions

THE employee SHALL only create timelogs for their own work. IF an attempt is made to create a timelog for another employee, THEN THE system SHALL reject the request.

THE timelog SHALL be automatically associated with the employee who creates it. The employee association cannot be changed after creation.

### Timelog Edit and Delete Restrictions

WHILE the timelog is not part of an approved timesheet, THE employee SHALL be allowed to edit their own timelogs. IF the timelog is included in an approved timesheet, THEN THE system SHALL reject the edit request.

WHILE the timelog is not part of any submitted or approved timesheet, THE employee SHALL be allowed to delete their own timelogs. IF the timelog is included in a submitted or approved timesheet, THEN THE system SHALL reject the deletion request.

IF the timelog is part of a rejected timesheet, THEN THE employee SHALL be allowed to edit or delete the timelog since the timesheet has returned to draft status.

### Time Management Permission Override

WHERE the user has the time management permission, THE user SHALL be allowed to edit any employee's timelogs, regardless of timesheet status. This override allows correction of errors even after timesheet approval.

WHERE the user has the time management permission, THE user SHALL be allowed to delete any employee's timelogs, regardless of timesheet status. This override allows removal of erroneous entries even after timesheet approval.

THE time management permission override SHALL apply to all timelogs in the organization, across all employees and projects.

## Timesheet Rules

Timesheets represent a collection of timelogs for a specific week from Monday to Sunday. Each timesheet has an employee owner, week start date, and week end date. Status must be one of: draft, submitted, approved, or rejected. Total hours are calculated from included timelogs. Submitted at timestamp records when the timesheet was submitted. Reviewed at timestamp records when approved or rejected. Reviewed by identifies the user who approved or rejected. Rejection reason is required when rejecting a timesheet. Creating a draft automatically includes all timelogs for that employee in that week. Timesheets cannot be submitted if they have no timelogs. Timesheets cannot be submitted if another timesheet for the same week is already submitted or approved. Approved timesheets lock all included timelogs from editing or deletion. Rejected timesheets return to draft status for modification and resubmission.

### Weekly Timesheet Period Definition

THE system SHALL enforce that each timesheet represents a weekly period from Monday to Sunday. THE system SHALL identify each timesheet by its week start date (Monday) and week end date (Sunday). THE system SHALL reject requests to create timesheets for partial weeks. THE system SHALL reject requests to create timesheets with custom date ranges that do not align with the Monday to Sunday week definition.

### Timesheet Status Classification

THE system SHALL require that each timesheet has a status of exactly one of: draft, submitted, approved, or rejected. THE system SHALL classify draft status as timesheets being prepared and modifiable. THE system SHALL classify submitted status as timesheets awaiting review and approval. THE system SHALL classify approved status as timesheets that have been reviewed and accepted. THE system SHALL classify rejected status as timesheets that have been reviewed and returned for corrections.

### Timesheet Calculations and Timestamp Recording

THE system SHALL automatically calculate total hours for a timesheet from all included timelogs. THE system SHALL sum the duration of each timelog and convert to hours for the total hours calculation. WHEN an employee submits a timesheet, THE system SHALL automatically record the submitted at timestamp. WHEN a user approves or rejects a timesheet, THE system SHALL automatically record the reviewed at timestamp. WHEN a user approves or rejects a timesheet, THE system SHALL automatically record the reviewed by user who performed the action.

### Timesheet Submission Validation Rules

IF a user rejects a timesheet, THEN THE system SHALL require a rejection reason text to be provided. WHEN an employee creates a draft timesheet, THE system SHALL automatically include all timelogs for that employee in that week period. IF a timesheet has no timelogs, THEN THE system SHALL reject the submission request. IF another timesheet for the same employee and same week is already in submitted or approved status, THEN THE system SHALL reject the submission request for a duplicate week.

### Post-Submission Timesheet Behavior

WHILE a timesheet is in approved status, THE system SHALL lock all included timelogs from editing. WHILE a timesheet is in approved status, THE system SHALL lock all included timelogs from deletion. WHEN a timesheet is rejected, THE system SHALL automatically change the status from rejected to draft. WHEN a timesheet returns to draft status after rejection, THE system SHALL allow the employee to modify the timelogs and resubmit for approval.

## Timer Rules

Each employee can have at most one active timer at any time. Starting a timer requires selecting a project with task being optional. The timer records start timestamp, project, task, and description. Employees can stop their timer which creates a timelog with calculated duration. Duration is rounded to the nearest minute when the timer stops. Employees can discard their timer without creating a timelog. Employees can view their currently running timer. If an employee forgets to stop their timer, it continues running indefinitely with no automatic stop. Employees can edit the description and project or task of a running timer.

### Single Active Timer Constraint

WHILE an employee has an active timer running, IF the employee attempts to start a new timer, THEN THE system SHALL reject the request.

EACH employee SHALL have at most one active timer at any time.

### Timer Start Requirements

WHEN an employee starts a timer, THE system SHALL require the employee to select a project.

WHEN an employee starts a timer, THE system SHALL allow the employee to optionally select a task.

WHEN an employee starts a timer, THE system SHALL record the start timestamp.

WHEN an employee starts a timer, THE system SHALL record the selected project.

WHEN an employee starts a timer, THE system SHALL record the selected task if provided.

WHEN an employee starts a timer, THE system SHALL allow the employee to optionally provide a description.

### Timer Stop Behavior

WHEN an employee stops their timer, THE system SHALL create a timelog.

WHEN an employee stops their timer, THE system SHALL calculate the duration from the start timestamp to the stop timestamp.

WHEN an employee stops their timer, THE system SHALL round the calculated duration to the nearest minute.

### Timer Discard Behavior

WHEN an employee discards their timer, THE system SHALL not create a timelog.

WHEN an employee discards their timer, THE system SHALL remove the timer without recording any time entry.

### Running Timer Viewing

WHILE an employee has a running timer, THE system SHALL allow the employee to view their currently running timer.

### No Automatic Timer Stop

THE system SHALL not automatically stop a running timer.

IF an employee forgets to stop their timer, THEN THE timer SHALL continue running indefinitely.

### Running Timer Editing

WHILE a timer is running, THE system SHALL allow the employee to edit the timer description.

WHILE a timer is running, THE system SHALL allow the employee to edit the timer project.

WHILE a timer is running, THE system SHALL allow the employee to edit the timer task.

## ActivityLog Rules

Activity log entries record significant actions within the organization. Each entry has a timestamp, user who performed the action, action type, target entity, and details. Logged actions include employee invited, deactivated, and reactivated events. Contract creation and editing are logged. Project creation, archiving, completion, and deletion are logged. Task status changes are logged with details. Timesheet submitted, approved, and rejected events are logged. Role assignment or change events are logged. Users with organization management permission can view the full activity log. Activity log entries are immutable and cannot be edited or deleted. The log provides a complete audit trail of organizational changes.

### Activity Log Entry Structure

### Activity Log Entry Structure

The system SHALL record each activity log entry with a timestamp, the user who performed the action, the action type, the target entity, and relevant details.

The timestamp SHALL reflect the exact time when the action occurred.

The user reference SHALL identify which user performed the logged action.

The action type SHALL categorize the nature of the action (e.g., employee invited, project created, timesheet approved).

The target entity SHALL identify which entity was affected by the action (e.g., specific employee, project, task, timesheet).

The details field SHALL contain contextual information relevant to the action (e.g., old and new values for changes, rejection reasons, role names).

If any required field is missing when recording an action, the activity log entry creation SHALL be rejected.

### Logged Action Types

### Logged Action Types

The system SHALL log employee lifecycle events including: employee invited, employee deactivated, and employee reactivated.

The system SHALL log contract changes including: contract created and contract edited.

The system SHALL log project lifecycle events including: project created, project archived, project completed, and project deleted.

The system SHALL log task status changes including: when a task status changes from one state to another, the old status and new status SHALL be recorded.

The system SHALL log timesheet workflow events including: timesheet submitted, timesheet approved, and timesheet rejected.

The system SHALL log role assignment events including: when a role is assigned to an employee and when an employee's role is changed.

If an action type is not in the defined list of logged actions, the system SHALL NOT create an activity log entry for that action.

### Activity Log Access and Immutability

### Activity Log Access and Immutability

Users with organization management permission SHALL be able to view the full activity log.

Users without organization management permission SHALL NOT be able to view the activity log.

Activity log entries SHALL be immutable once created.

The system SHALL NOT allow editing of any activity log entry.

The system SHALL NOT allow deletion of any activity log entry.

The activity log SHALL provide a complete audit trail of organizational changes.

If a user without proper permission attempts to view the activity log, the request SHALL be rejected.

If a user attempts to edit or delete an activity log entry, the request SHALL be rejected.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Employee List Browsing

The employee list is displayed in pages. Users can navigate between pages. Users can filter the employee list by department, employment type, and status. Users can search for employees by name. If no employees match the search criteria, an empty list is shown. If a filter value is invalid, the request is rejected. Users with permission to view employees can access the employee list. Deactivated employees are included in the list and are visually marked as deactivated. If the user does not have permission to view employees, the request is rejected.

### Project List Browsing

The project list is displayed in pages. Users can navigate between pages. Users can filter the project list by status (active, archived, completed). If no projects match the filter criteria, an empty list is shown. If a filter value is invalid, the request is rejected. Users with permission to view projects can access all projects in the organization. Archived and completed projects are included in the list. If the user does not have permission to view projects, the request is rejected.

### Task List Browsing

Tasks can be filtered by status (open, inprogress, completed, closed), priority, and assigned employee. Tasks can be sorted by due date, priority, or creation date. If no tasks match the filter criteria, an empty list is shown. If a filter or sort value is invalid, the request is rejected. Employees can view tasks in projects they are assigned to. Users with permission to manage projects can view all tasks. If the user does not have access to the project, the request is rejected. Subtasks are displayed with their parent task relationship indicated.

### Timelog List Browsing

The timelog list is displayed in pages. Users can navigate between pages. Users can filter timelogs by date range, project, task, and billable status. If no timelogs match the filter criteria, an empty list is shown. If a filter value or date range is invalid, the request is rejected. Employees can view their own timelogs. Users with permission to view all timelogs can view all employees' timelogs. If the user does not have permission to view the timelogs, the request is rejected. Timelogs are displayed with their associated project and task information.

### Timesheet List Browsing

The timesheet list is displayed in pages. Users can navigate between pages. Users can filter timesheets by status and date range. If no timesheets match the filter criteria, an empty list is shown. If a filter value or date range is invalid, the request is rejected. Employees can view their own timesheets. Users with permission to approve timesheets can view all submitted timesheets. If the user does not have permission to view the timesheets, the request is rejected. Timesheets display their week period, total hours, and current status.

### Activity Log Browsing

The activity log is displayed in pages. Users can navigate between pages. Users can filter the activity log by action type, user, and date range. If no activity log entries match the filter criteria, an empty list is shown. If a filter value or date range is invalid, the request is rejected. Users with permission to manage the organization can view the full activity log. If the user does not have permission to view the activity log, the request is rejected. Activity log entries display the timestamp, user who performed the action, action type, and target entity.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization and Account Rejection Cases

WHEN a user attempts to delete an organization with pending timesheets that are not approved or rejected, THEN THE system SHALL reject the request.

WHEN a user attempts to delete an organization that has active employee contracts, THEN THE system SHALL reject the request.

WHEN a user attempts to delete their account while being the sole owner of an organization without transferring ownership or deleting the organization first, THEN THE system SHALL reject the request.

WHEN a user attempts to log in with an email and password combination that does not match any registered account, THEN THE system SHALL reject the login attempt without indicating whether the email or password was incorrect.

WHEN a user attempts to change their password without providing the current password correctly, THEN THE system SHALL reject the request.

WHEN a user attempts to access data from an organization they do not belong to, THEN THE system SHALL reject the request.

WHEN a user attempts to switch to an organization they do not belong to, THEN THE system SHALL reject the request.

WHEN a guest user who is not logged in attempts to access any organization data, THEN THE system SHALL reject the request.

### Employee Role and Contract Failure Cases

WHEN a user attempts to delete a custom role that has assignees, THEN THE system SHALL reject the request.

WHEN a user attempts to invite an employee with an invalid email format, THEN THE system SHALL reject the invitation request.

WHEN a user attempts to assign a role to an employee without the employee manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to view the employee list without the employee view permission, THEN THE system SHALL reject the request.

WHEN a user attempts to deactivate an employee without the employee manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to edit a past contract that is no longer active, THEN THE system SHALL reject the request.

WHEN a user attempts to create a contract without a start date, THEN THE system SHALL reject the request.

WHEN a user attempts to create a contract without a pay rate, THEN THE system SHALL reject the request.

WHEN a user attempts to create a contract without specifying working hours per week, THEN THE system SHALL reject the request.

WHEN a user attempts to view employee contracts without the employee view permission and the contracts do not belong to them, THEN THE system SHALL reject the request.

WHEN a user attempts to delete a department without the organization manage permission, THEN THE system SHALL reject the request.

### Project Task and Timelog Exception Cases

WHEN a user attempts to delete a project that has timelogs associated with it, THEN THE system SHALL reject the request.

WHEN a user attempts to create a project without a name, THEN THE system SHALL reject the request.

WHEN a user attempts to create a project without a color code, THEN THE system SHALL reject the request.

WHEN a user attempts to log time to an archived or completed project, THEN THE system SHALL reject the request.

WHEN a user attempts to create a task without a title, THEN THE system SHALL reject the request.

WHEN a user attempts to assign a task to an employee who is not a member of the project, THEN THE system SHALL reject the request.

WHEN a user attempts to create a subtask under a task that already has a parent task, THEN THE system SHALL reject the request.

WHEN a user attempts to edit a task in a project where they are not a project lead and do not have project manage permission, THEN THE system SHALL reject the request.

WHEN an employee attempts to edit their own timelog that is part of an approved timesheet, THEN THE system SHALL reject the request.

WHEN an employee attempts to delete their own timelog that is part of a submitted or approved timesheet, THEN THE system SHALL reject the request.

WHEN an employee attempts to create a timelog for a project they are not assigned to, THEN THE system SHALL reject the request.

WHEN an employee attempts to create a timelog for a task that does not belong to the selected project, THEN THE system SHALL reject the request.

WHEN a user attempts to edit or delete another employee's timelog without the time manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to view all employees' timelogs without the time view all permission, THEN THE system SHALL reject the request.

WHEN a user attempts to create a timelog without a date, THEN THE system SHALL reject the request.

WHEN a user attempts to create a timelog without a duration, THEN THE system SHALL reject the request.

WHEN a user attempts to create a timelog without selecting a project, THEN THE system SHALL reject the request.

### Timesheet Timer and Permission Exception Cases

WHEN an employee attempts to submit a timesheet that has no timelogs, THEN THE system SHALL reject the request.

WHEN an employee attempts to submit a timesheet for a week where another timesheet is already submitted or approved, THEN THE system SHALL reject the request.

WHEN a user with time approve permission attempts to reject a timesheet without providing a rejection reason, THEN THE system SHALL reject the request.

WHEN an employee attempts to submit a timesheet that is not in draft status, THEN THE system SHALL reject the request.

WHEN a user attempts to approve a timesheet that is not in submitted status, THEN THE system SHALL reject the request.

WHEN a user attempts to view all submitted timesheets without the time approve permission, THEN THE system SHALL reject the request.

WHEN an employee attempts to start a new timer while already having an active timer running, THEN THE system SHALL reject the request.

WHEN an employee attempts to start a timer without selecting a project, THEN THE system SHALL reject the request.

WHEN an employee attempts to stop a timer that is not currently running, THEN THE system SHALL reject the request.

WHEN an employee attempts to edit the project or task of a timer that has already been stopped, THEN THE system SHALL reject the request.

WHEN a user attempts to perform an action without the required permission, THEN THE system SHALL reject the request with an access denied error.

WHEN a user attempts to view the activity log without the organization manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to view reports without the report view permission, THEN THE system SHALL reject the request.