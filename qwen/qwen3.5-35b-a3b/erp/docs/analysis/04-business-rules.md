**hrms — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with a valid email and password combination. Users can change their password at any time from their profile settings. A user account can belong to multiple organizations simultaneously, but only one organization is active at a time when logged in. When switching organizations, all actions are scoped to the selected organization context. Users can delete their own account if they are not the sole owner of any organization. If a user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account. When an account is deleted, the user's employee records in other organizations are marked as deactivated rather than removed. The email address used for login must be unique across the entire platform.

### Email and Password Signup

New users must provide a valid email address and password during registration. The email address must follow standard email format with a local part, @ symbol, and domain. Passwords must be at least 8 characters long. Email addresses are validated for format before account creation. Users cannot proceed with signup if the email format is invalid. Users cannot proceed with signup if the password is shorter than 8 characters.

### Unique Email Validation

Email addresses must be unique across the entire platform. When a user attempts to register with an email address that already exists, the registration request is rejected with an error indicating the email is already in use. The system checks email uniqueness regardless of organization context. Attempting to log in with an email that matches another user's email will always return that user's account.

### Password Change

Users can change their password from their profile settings. Changing password requires entering the current password for verification. Users cannot set their new password to be the same as their current password. The new password must be at least 8 characters long. Users are logged out from all sessions after changing their password. If the current password is incorrect, the password change request is rejected.

### Multiple Organization Membership

A single user account can belong to multiple organizations simultaneously. When a user is invited to an organization, the invitation is processed based on whether the email already has an account. If the email has an existing account, the user is added to the new organization. If the email has no account, a pending invitation is created. A user can be assigned to up to the maximum allowed number of organizations by the system.

### Organization Switching Without Logout

Users can switch between organizations they belong to without logging out. When switching organizations, all subsequent actions are scoped to the newly selected organization. Users can only access data and features available in the currently selected organization. Organization switching is available from the user profile menu. If a user's membership in the current organization is removed or deactivated, they must select a different organization or log out.

### Account Deletion Prerequisites

Users can delete their own account only if they are not the sole owner of any organization. The system checks whether the user owns any organization before allowing account deletion. Users who own organizations must either transfer ownership or delete the organization first. Attempting to delete an account while owning an organization triggers an error requiring ownership transfer. The user's employee records in other organizations are marked as deactivated rather than deleted.

### Sole Owner Transfer Requirement

When a user is the sole owner of an organization, they cannot delete their account without first transferring ownership. The user must assign a new owner from among the organization members before account deletion. The new owner must have the owner role assigned. If no other members exist in the organization, the user must delete the organization instead. Ownership transfer must be completed before the account deletion process can proceed.

### Deactivated Employee Records

When a user account is deleted, all employee records associated with that user in other organizations are marked as deactivated. Deactivated employee records retain all historical data including timelogs and timesheets. Deactivated employees cannot log new time entries or submit timesheets. Deactivated employee records remain in the system for historical and reporting purposes. Reactivation of a deactivated employee is possible if the user account was not deleted. If the user account was deleted, a new employee record must be created.

## Organization Rules

Each organization requires a name, description, logo image, currency, timezone, and fiscal start month during creation. Organization owners are the only users who can edit organization settings. An organization owner cannot delete their organization if there are any pending timesheets awaiting approval or rejection. An organization owner cannot delete their organization if there are any active employee contracts in the system. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed from the system. The organization owner's user account remains active after organization deletion, but is no longer associated with any organization. After deletion, the former owner must create a new organization to continue using the platform.

### Organization Creation

An organization is created with a name, description, logo image, currency, timezone, and fiscal start month.
The organization name is required and must be unique within the platform.
The description is optional and provides additional context about the organization.
The logo image is optional and is used for visual identification.
The currency is required and determines the monetary unit for all financial data within the organization.
The timezone is required and determines how dates and times are displayed to users in the organization.
The fiscal start month is required and defines the beginning month of the organization's fiscal year.
The user who creates the organization becomes the organization owner with full administrative privileges.

### Organization Settings Configuration

The organization settings include the name, description, logo image, currency, timezone, and fiscal start month.
Organization owners are the only users with permission to edit these settings.
When the organization currency is changed, all existing financial records retain their original currency values.
When the organization timezone is changed, historical timestamps are preserved in their original timezone and displayed according to the new timezone only going forward.
When the fiscal start month is changed, future fiscal year calculations use the new start month, while past fiscal years remain unchanged.
Changes to organization settings are immediately applied and visible to all organization members.
No other users except organization owners can modify these configuration values.

### Owner Edit Permissions

Organization owners have exclusive permission to edit organization settings.
No other roles, including managers, can modify the organization name, description, logo, currency, timezone, or fiscal start month.
The permission to edit organization settings cannot be delegated to other users.
Attempts by non-owners to modify organization settings are rejected.
The system validates that only the organization owner can perform setting changes.
This restriction applies to all users regardless of their other permissions within the organization.

### Organization Deletion Prerequisites

An organization owner cannot delete their organization if there are any pending timesheets awaiting approval or rejection.
Pending timesheets must be resolved before the organization can be deleted.
All pending timesheets must either be approved or rejected by users with the approval permission.
An organization owner cannot delete their organization if there are any active employee contracts in the system.
An active contract is one where the end date is null or is in the future relative to the current date.
All active contracts must be ended before the organization can be deleted.
The system validates both conditions before allowing organization deletion.
If either condition is not met, the deletion request is rejected with an explanation of the blocking items.

### Organization Deletion Consequences

When an organization is deleted, all associated employees are permanently removed from the system.
All associated projects, including their tasks and project memberships, are permanently deleted.
All timelogs from all employees are permanently deleted and cannot be recovered.
All timesheets, regardless of status, are permanently deleted.
All department configurations and relationships are permanently deleted.
All role definitions and role assignments are permanently deleted.
The organization owner's user account remains active in the system but is no longer associated with any organization.
The former owner must create a new organization to continue using the platform.
All activity logs related to the organization are permanently deleted.
No data from the deleted organization can be recovered after deletion is completed.

## OrganizationMember Rules

Each member in an organization must be assigned exactly one role, whether built-in or custom. Users can only assign roles to employees if they have the employee:manage permission. Only organization owners can create or delete custom roles in their organization. Role changes can be applied to employees by users with employee:manage permission. When a role is deleted, it must not have any employees currently assigned to that role. Each organization maintains its own independent set of roles separate from other organizations. An employee cannot hold multiple roles simultaneously within the same organization.

### Single Role Assignment

Each organization member must be assigned exactly one role at any given time. An employee cannot hold multiple roles simultaneously within the same organization. The role assignment is established when an employee joins the organization and remains in effect until changed. The system prevents assignment of multiple roles to a single employee record.

### Role Assignment Permissions

Users with the employee:manage permission can assign or change roles for employees within their organization. Users without this permission cannot modify role assignments, regardless of their current role. The permission check occurs before any role assignment operation is processed.

### Custom Role Creation Restrictions

Only organization owners can create custom roles in their organization. Managers and employees cannot create custom roles. Each custom role must have a unique name within the organization. When creating a custom role, the owner must specify the role name and select which permissions to include from the available permission list. Custom roles are organization-specific and cannot be shared across organizations.

### Role Deletion Validation

Organization owners can delete custom roles only if no employees are currently assigned to those roles. The system validates that the role has zero assigned members before allowing deletion. If employees are assigned to the role, the deletion is rejected. When a role is deleted, any employees who were assigned to it are automatically reassigned to a default role.

### Organization Role Independence

Each organization maintains its own independent set of roles separate from other organizations. Custom roles created in one organization do not exist in other organizations. An organization can have the same custom role name as another organization without conflict. Role definitions and permissions are scoped to the organization context only.

### Built-in Role Protection

The three built-in roles (owner, manager, employee) cannot be deleted. Users with organization management permission can only edit custom roles, not built-in roles. Built-in role permissions are fixed and cannot be modified. Organization owners cannot remove or alter the built-in role definitions or their associated permission sets.

## Role Rules

There are three built-in roles that cannot be deleted: Owner, Manager, and Employee. Each built-in role has a predefined set of permissions that cannot be modified. Organization owners can create custom roles with specific names and permission combinations. Each custom role must have a unique name within the organization. Owners can edit custom role names and modify their assigned permissions. A custom role can be deleted only when no employees are currently assigned to it. Custom roles can have any combination of the nine available permission types.

### Built-in Role Protection

Three built-in roles exist by default in every organization: Owner, Manager, and Employee. These built-in roles cannot be deleted under any circumstances. The built-in role structure is permanent and must always be present in the organization. Organization owners cannot modify the built-in role status or remove any of these roles from the system.

### Built-in Role Definitions

The Owner role has full access to all features and can manage roles and members. The Manager role can manage employees, projects, approve timesheets, and view reports. The Employee role can track time, submit timesheets, and view their own data. Each built-in role represents a distinct level of organizational authority and responsibility.

### Predefined Permission Structure

Each built-in role has a predefined set of permissions that cannot be modified or removed. The Owner role includes all available permissions. The Manager role includes employee:manage, employee:view, project:manage, project:view, time:approve, time:view_all, and report:view permissions. The Employee role includes time:view_all and report:view permissions only. These permission assignments are fixed and cannot be changed for built-in roles.

### Custom Role Creation

Organization owners can create custom roles with specific names and permission combinations. Only organization owners have the authority to create custom roles within the organization. When creating a custom role, the owner must provide a name and select which permissions the role should have. Custom roles cannot be created by users without the org:manage permission.

### Custom Role Name Uniqueness

Each custom role must have a unique name within the organization. No two custom roles can share the same name. When creating a custom role, the system validates that the name is not already in use. When editing a custom role, the new name must also be unique across all roles in the organization.

### Custom Role Permission Configuration

Custom roles can have any combination of the nine available permission types: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. The organization owner selects which permissions are included in each custom role. Permissions can be added or removed from a custom role at any time by the organization owner.

### Custom Role Management

Organization owners can edit custom role names and modify their assigned permissions. Only organization owners have the ability to edit custom roles. Any user can view custom roles and their permission sets. Custom roles cannot be created or modified by users with Manager or Employee permissions, even if they have other elevated permissions.

### Custom Role Deletion Conditions

A custom role can be deleted only when no employees are currently assigned to it. The system checks all employee role assignments before allowing deletion of a custom role. If any employee has the custom role assigned, the deletion request is rejected. Employees must be reassigned to other roles before the custom role can be removed from the organization.

## Employee Rules

Each employee record must have an employment type of either full-time, part-time, contractor, or intern. Employee status can be active or deactivated, but deactivated employees cannot log time or submit timesheets. Users with employee:manage permission can edit department, position, and employment type fields. Department and position fields are optional and can be left blank. When an employee is deactivated, all their historical timelogs and timesheets remain preserved. Deactivated employees can be reactivated at any time by users with employee:manage permission. Each employee in an organization must have exactly one associated role. Users with employee:view permission can view employee details but cannot modify them.

### Employment Type Classification

Each employee record must have exactly one employment type from the following options: full-time, part-time, contractor, or intern.

The employment type is a required field when creating an employee record.

All four employment types are valid and cannot be deleted or modified.

Users with employee:manage permission can change an employee's employment type at any time.

The employment type determines certain organizational reporting metrics and benefits eligibility.

Once set, the employment type is visible to all users with employee:view permission.

### Active and Deactivated Status

Each employee has exactly one status: active or deactivated.

New employees are created with active status by default.

Users with employee:manage permission can change an employee's status from active to deactivated.

An employee cannot be deactivated if they have pending timesheets that have not been resolved.

An employee cannot be deactivated if they have unapproved timelogs that violate organizational time policies.

Users with employee:view permission can view employee status but cannot modify it.

The status is reflected in all reports and lists involving the employee.

### Department and Position Fields

The department field is optional and can be left blank when creating an employee record.

The position field is optional and can be left blank when creating an employee record.

Users with employee:manage permission can update the department and position fields.

Both department and position fields can be modified at any time for active employees.

Employees with deactivated status can still have their department and position fields updated.

The department field references an existing department within the organization.

The position field is a text field with no format restrictions.

When a department is deleted, all employees in that department have their department field set to null.

### Deactivated Employee Time Logging Block

Deactivated employees cannot create new timelogs under any circumstances.

Deactivated employees cannot submit timesheets under any circumstances.

If an employee is deactivated while a timesheet is in draft status, the timesheet cannot be submitted.

Deactivated employees cannot start a timer to track time.

Deactivated employees cannot modify or delete their existing timelogs.

Users with employee:manage permission can still modify timelogs for deactivated employees.

The system prevents any new time entries from being associated with a deactivated employee.

### Historical Data Preservation on Deactivation

When an employee is deactivated, all existing timelogs are preserved and remain accessible.

All submitted, approved, and rejected timesheets are preserved when an employee is deactivated.

Historical timelogs from deactivated employees remain visible to users with time:view_all permission.

All contract history for a deactivated employee is preserved.

Employee deactivation does not delete or modify any previously created data.

Reports that include deactivated employees will still show their historical time entries.

The deactivated employee's name and role remain associated with all historical records.

### Deactivated Employee Reactivation

Users with employee:manage permission can reactivate a previously deactivated employee.

A reactivated employee immediately regains the ability to create timelogs.

A reactivated employee can submit timesheets again after reactivation.

Reactivation sets the employee status back to active.

Reactivated employees retain all their historical data including timelogs, timesheets, and contracts.

Reactivation can be performed at any time, regardless of how long the employee has been deactivated.

The reactivation action is recorded in the activity log with the user who performed it.

### Role Assignment per Employee

Each employee in an organization must have exactly one role assigned.

Role assignment is required when creating an employee record.

Users with employee:manage permission can change an employee's role assignment.

The role determines what permissions the employee has within the organization.

An employee's role is visible in the employee list and employee details.

If a role is deleted, all employees assigned to that role are automatically reassigned to the Employee role.

Built-in roles (Owner, Manager, Employee) cannot be deleted from the system.

Custom roles can be reassigned to employees only if the role is not deleted.

## EmployeeContract Rules

Each employee contract requires a start date and end date, where end date can be null for ongoing contracts. Every contract must specify a pay rate as a numeric value and a pay period of hourly, daily, weekly, or monthly. Each contract must define working hours per week. Only one contract can be active for an employee at any given time. When a new contract is created, the previous active contract automatically ends on the day before the new contract start date. Past contracts become immutable historical records and cannot be edited. Only users with employee:manage permission can create or edit contracts. Employees can view their own contract history. Users with employee:view permission can view any employee's contract history.

### Single Active Contract Per Employee

Each employee can have only one active contract at any given time. A contract is considered active when it has no end date or its end date is in the future. When creating a new contract for an employee, the system checks if there is already an active contract. If an active contract exists, the new contract creation is rejected until the existing contract is properly closed or terminated.

### Contract Date Requirements

Every employee contract requires a start date. The start date must be a valid date and cannot be in the past. Each contract may have an optional end date. If the end date is null or not provided, the contract is treated as an ongoing employment contract. The end date, when provided, must be on or after the start date. Contracts with end dates in the past are automatically treated as completed historical records.

### Compensation and Hours Specification

Each contract must specify a pay rate as a numeric value. The pay rate must be a positive number. Each contract must also specify a pay period, which can be hourly, daily, weekly, or monthly. The pay period determines how the pay rate should be applied for compensation calculations. Additionally, each contract must define working hours per week, which represents the standard work week for that employee (for example, 40 hours). The working hours must be a positive integer value.

### Automatic Previous Contract End Date Setting

When a new contract is created for an employee who already has an active contract, the previous active contract automatically ends. The end date of the previous contract is set to the day immediately before the new contract's start date. This automatic termination happens without requiring manual intervention. The system records this automatic closure in the activity log, noting that the previous contract ended due to new contract creation.

### Historical Contract Immutability

Once a contract's status is no longer active (either by reaching its end date or being automatically closed by a new contract), it becomes immutable. Past contracts cannot be edited, modified, or deleted. This preserves historical records of employment terms and compensation for auditing and reporting purposes. Only the current active contract can be edited by users with employee:manage permission. Deletions of past contracts are not permitted under any circumstances.

### Contract Viewing Permissions

Employees can view their own contract history, including both active and past contracts. Users with employee:view permission can view any employee's contract history within their organization. Users without these permissions cannot view contract information for any employee. When viewing contracts, users can see contract dates, pay rate, pay period, working hours, and status, but cannot see compensation details of employees in other organizations due to data isolation rules.

## Department Rules

Each department requires a name and can optionally have a description. Departments support one level of nesting through parent department references. Only users with org:manage permission can create, edit, or delete departments. When a department is deleted, employees assigned to it have their department field set to null instead of being deleted. Department hierarchy is limited to a single level of parent-child relationships. Users with any level of employee view permission can view the department list. Departments are organization-specific and not shared across organizations.

### Department Name and Description

Each department requires a name that must be unique within the organization. The same name cannot be used for multiple departments in the same organization. A description field is optional and may be left empty. If a description is provided, it can contain any text to describe the department's purpose or function. The name field is required and cannot be null or empty when creating or editing a department.

### Department Hierarchy and Parent Relationship

Departments support a hierarchical structure with one level of nesting. A department can optionally reference a parent department, creating a child-parent relationship. A department cannot be its own parent. A parent department cannot be set to a child department, preventing circular references. Only one level of nesting is allowed; a child department cannot have its own child departments. If a parent department is deleted, the child departments retain their reference to the former parent, but the relationship is broken.

### Department Creation and Management Permissions

Only users with org:manage permission can create new departments. Users with org:manage permission can edit existing department details including name, description, and parent department assignment. Users with org:manage permission can delete departments. Users without org:manage permission cannot create, edit, or delete departments, regardless of their other permissions. The ability to manage departments is scoped to the currently selected organization and does not grant cross-organization access.

### Department Deletion and Employee Assignment

When a department is deleted, all employees currently assigned to that department have their department field set to null. Deleting a department does not delete the employees themselves; employees remain active with their other records intact. Employees previously in the deleted department have no department assignment until reassigned. The deletion is permanent and cannot be undone. If an employee is assigned to a child department and the parent department is deleted, the employee's department becomes null. Employee reassignment to a new department requires a user with employee:manage permission.

### Department Viewing Permissions

All employees in an organization can view the list of departments, regardless of their specific permissions. Employees can see department names, descriptions, and parent-child relationships. Employees cannot see department details they do not have permission to view. The department list is paginated when the number of departments exceeds the display limit. Employees can filter the department list by parent department relationship. Department viewing is organization-specific and does not expose departments from other organizations the user belongs to.

### Department Deletion Error Conditions

A department cannot be deleted if it has child departments assigned to it; the child departments must be deleted or reassigned first. A department cannot be deleted if there are active employee contracts referencing it. Attempting to delete a department with these conditions results in a rejection with an explanation of the blocking conditions. A department cannot be deleted if it is referenced in employee records that are being actively used in time tracking or timesheets. The system checks for these conditions before allowing deletion and rejects the operation if any are present.

## Project Rules

Each project requires a name and color code for display purposes. Projects can have optional description, budget hours, start date, and end date. Project status can be active, archived, or completed. Only users with project:manage permission can create, edit, archive, or complete projects. Archived or completed projects cannot receive new timelogs, but existing timelogs are preserved. Projects can be deleted only when they have no associated timelogs. Users with project:view permission can view all projects in the organization. The project list supports pagination and filtering by status.

### Project Name and Color Code

Every project requires a name that identifies the project within the organization. The project name must be provided when creating a new project. Every project also requires a color code for visual display in the user interface. The color code helps users distinguish between projects at a glance. If the project name or color code is missing, the project creation request is rejected. Both the project name and color code cannot be modified after the project is created.

### Project Metadata Fields

Projects have several optional metadata fields that can be provided at creation or updated later. The description field provides additional context about the project's purpose and scope. Budget hours represent the total estimated hours for the project and are optional. If provided, budget hours track project resource allocation. Start date and end date are optional fields that define the project's timeframe. These dates help with planning and reporting. If only the start date is provided, the project has no planned end date. If only the end date is provided, the project has no defined start date.

### Project Status States

Projects exist in one of three states: active, archived, or completed. Active projects are ongoing and can receive new timelogs and tasks. Archived projects are paused and cannot receive new timelogs but remain visible in the system for historical reference. Completed projects mark the project as finished and cannot receive new timelogs. Only users with project management permission can change a project's status from active to archived or completed. Once a project is archived or completed, the status cannot be reverted to active. Users with project view permission can view all projects regardless of their status.

### Project Management Permissions

Only users with project management permission can create new projects in the organization. Users with project management permission can edit existing projects including name, description, color code, budget hours, start date, and end date. Users with project management permission can archive or complete projects. Users with project management permission can delete projects when specific conditions are met. Users with project view permission can view all projects in the organization but cannot modify them. Users without project view permission cannot see projects at all.

### Timelog Restrictions for Archived Projects

Archived projects cannot receive new timelogs. When an employee attempts to create a timelog for an archived project, the request is rejected. The system validates that the project is active before accepting any timelog entry. Existing timelogs associated with archived projects are preserved and remain accessible for reporting. Archived projects can still have tasks, and these tasks remain visible to project members. The archive action does not affect any historical data, only future timelog creation.

### Timelog Restrictions for Completed Projects

Completed projects cannot receive new timelogs. When an employee attempts to create a timelog for a completed project, the request is rejected. The system validates that the project is active before accepting any timelog entry. Existing timelogs associated with completed projects are preserved and remain accessible for reporting. Once a project is marked as completed, it retains all its historical timelogs, tasks, and project member assignments. The completion action does not delete or modify any existing project data.

### Project Deletion Requirements

Projects can only be deleted when they have no associated timelogs. If a project has any timelogs, whether from active or completed status, the deletion request is rejected. This ensures that historical time tracking data is not lost. Users with project management permission can only delete projects that have zero timelogs. Before deleting a project, users should archive the project if it has any timelog data. When a project is deleted, all associated tasks, project memberships, and related data are also permanently removed. Deleted projects cannot be restored.

### Project List Filtering

Users with project view permission can browse the project list with filtering capabilities. The project list can be filtered by status to show only active, archived, or completed projects. This filtering helps users focus on relevant projects for their work. The project list supports pagination to handle large numbers of projects. Only projects from the user's currently selected organization are displayed. Users without project view permission cannot access the project list at all. The system enforces organization-level data isolation on all project list queries.

## ProjectMember Rules

Each project membership requires an employee, a project, and an assigned role of either member or project-lead. Users with project:manage permission can assign employees to projects or remove them from projects. An employee can be assigned to multiple projects simultaneously. Project leads have special capabilities to manage tasks within their assigned projects. Users with project:manage permission can change employee roles from member to project-lead or vice versa. Employees can view which projects they are assigned to through the project member association.

### Employee Project Membership Structure

Every employee assigned to a project must have a project membership record that links the employee, the project, and an assigned role.

A project membership is the only way an employee can be associated with a project for task and time tracking purposes.

The membership structure ensures that all time logged against a project is attributed to the correct employee.

Each membership must specify a role of either member or project-lead.

Employees who are not members of a project cannot be assigned tasks within that project.

Employees who are not members of a project cannot log time against that project.

An employee can hold multiple project memberships simultaneously, one for each project they work on.

When an employee is removed from a project, their project membership is deleted.

Removing a project membership does not delete the employee's historical timelogs on that project.

Removing a project membership does not delete tasks that were assigned to that employee in that project.

### Member and Project Lead Role Options

Every project membership must assign one of two roles: member or project-lead.

Members can view tasks within the project and log time against project tasks they are assigned.

Project leads have additional capabilities to manage tasks within their assigned projects.

Project leads can create new tasks in their assigned projects.

Project leads can edit tasks they created or any task in their assigned project.

Project leads can change the status of tasks in their assigned projects.

Project leads can reassign tasks to other project members.

Members cannot create new tasks in the project unless they also have project:manage permission at the organization level.

Members can only edit or delete tasks assigned to them, not tasks assigned to other employees.

The role is stored as part of the project membership and cannot be null.

The role cannot be changed after the project membership is created; a new membership must be created with the desired role.

### Multiple Project Assignment Capability

An employee can be assigned to multiple projects simultaneously.

Each project assignment is tracked as a separate project membership record.

Employees can work on multiple projects in parallel.

An employee's time logged on one project is separate from time logged on another project.

Task assignments are specific to each project membership.

A task assigned to an employee in one project does not affect tasks in other projects.

Employees can view their task assignments across all assigned projects through the dashboard.

Timelogs are linked to a specific project membership when created.

There is no limit on the number of projects an employee can be assigned to.

Employees can be project leads on multiple projects simultaneously.

Employees can be regular members on multiple projects simultaneously.

### Project Lead Task Management Authority

Project leads have exclusive authority to manage tasks within their assigned projects.

Project leads can create new tasks in their assigned projects without additional permissions.

Project leads can edit any task in their assigned project, regardless of who was assigned the task.

Project leads can change the status of any task in their assigned project.

Project leads can reassign tasks to other employees who are also members of the same project.

Project leads cannot create tasks outside of their assigned projects.

Project leads cannot delete tasks from projects they do not lead.

Project leads cannot modify tasks in projects where they are only members.

Project leads have access to view all tasks in their assigned projects.

Task history records show project lead actions when they modify tasks.

Task creation and editing by project leads is tracked in the activity log.

### Project Assignment Management Permission

Only users with project:manage permission can assign employees to projects.

Users with project:manage permission can create new project memberships for employees.

Users with project:manage permission can remove employees from projects.

Users without project:manage permission cannot assign employees to projects.

Project leads cannot assign employees to projects, only to tasks within their project.

Employees cannot assign themselves to projects; this requires another user with project:manage permission.

Organization owners and users with project:manage permission can assign any employee to any project.

The project assignment action requires selecting both the employee and the project.

The project assignment action requires specifying the role (member or project-lead).

Employees assigned to projects cannot modify their own assignment role.

### Employee Project Viewing Capability

Employees can view the list of projects they are assigned to.

The project view shows only projects where the employee has an active project membership.

Employees cannot view projects where they have no membership.

Each assigned project shows the employee's role (member or project-lead) for that project.

Employees can see task assignments within their assigned projects.

Employees can view timelogs they have created on their assigned projects.

The project list is paginated to handle large numbers of assignments.

Employees can search and filter their project assignments by project name.

Employees cannot view project members of projects they are not assigned to.

Project leads can see all tasks and timelogs within their led projects.

Members can see only their own tasks and timelogs within their member projects.

### Role Change Permissions

Users with project:manage permission can change an employee's role within a project.

Role changes can modify a member to project-lead or vice versa.

The role change requires selecting both the employee and the project.

Role changes take effect immediately upon saving.

Changing an employee's role from project-lead to member removes task management authority.

Changing an employee's role from member to project-lead grants task management authority.

Only users with project:manage permission can modify the role field of project memberships.

Employees cannot change their own role within a project.

Project leads cannot change their own role or other employees' roles.

Role changes are tracked in the activity log with the timestamp and user who made the change.

The role field is required and cannot be empty or null for any project membership.

## Task Rules

Each task requires a title and can have optional description, estimated hours, and due date. Task status can be open, in-progress, completed, or closed. Task priority can be low, medium, high, or urgent. Each task can have at most one parent task for one level of subtask nesting. Assigned employees must be members of the project containing the task. Project leads can edit tasks within their assigned projects. Users with project:manage permission can edit any task in the organization. Task status changes are automatically recorded in task history with timestamps and user information.

### Task Title Requirement

Each task must have a title. The title is a required field when creating a task. Tasks without a title cannot be created. The title uniquely identifies the task within a project but does not need to be globally unique across all projects.

### Optional Task Metadata Fields

Tasks can have an optional description field that provides additional context about the task. Estimated hours are optional and represent the expected time investment for completing the task. Due date is optional and indicates when the task should be completed. All optional fields can be left empty when creating a task and can be added or modified later.

### Task Status Options

Tasks have four possible statuses: open, in-progress, completed, and closed. A task starts with status open when created. Status can be changed from open to in-progress when work begins. Status can be changed from in-progress to completed when work is finished. Status can be changed from any state to closed when a task is no longer relevant regardless of completion. Each status change is automatically recorded in task history with the timestamp, the previous status, the new status, and the user who made the change.

### Task Priority Classification

Tasks can be assigned one of four priority levels: low, medium, high, or urgent. Priority helps determine the order in which tasks should be addressed. Priority is an optional field when creating a task. Priority can be changed at any time by authorized users. Tasks with higher priority should be addressed before tasks with lower priority.

### Single-Parent Subtask Limitation

Each task can have at most one parent task, creating a one-level nesting hierarchy for subtasks. A task with a parent is considered a subtask. A task with no parent is considered a main task. Subtasks cannot have their own subtasks (no multi-level nesting). The parent task relationship can be modified by authorized users. When a subtask is assigned to a project, the parent task must belong to the same project.

### Task Assignment Requirement

A task can be assigned to an employee, but assignment is optional. When a task is assigned to an employee, the employee must be a member of the project containing the task. An employee who is not a project member cannot be assigned a task in that project. The assignment can be changed or removed by authorized users. Tasks without an assigned employee can be worked on by any project member with appropriate permissions.

### Task Editing Authority

Project leads can edit tasks within projects where they have been assigned the project lead role. Users with the project:manage permission can edit any task in any project within the organization. Users can only edit tasks for projects they have access to based on their permissions. Task editing includes modifying the title, description, status, priority, estimated hours, due date, and assignment. Task history is recorded for all edits.

### Task Status Change Recording

Every change to a task's status is automatically recorded in the task history. Each history entry includes the timestamp of the change, the previous status, the new status, and the user who made the change. The task history provides an audit trail of all status transitions. History entries are stored for the lifetime of the task and cannot be deleted.

## Timelog Rules

Each timelog requires a date, duration in minutes, and an associated project. The project must be one that the employee is assigned to. The task field is optional but must belong to the selected project if specified. Billable flag defaults to true for all timelogs. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if they are not part of an approved timesheet. Employees can delete their own timelogs only if they are not part of any submitted or approved timesheet. Users with time:manage permission can edit or delete any employee's timelogs. Timelogs can be filtered by date range, project, task, and billable status.

### Timelog Date and Duration Requirements

Each timelog must include a date and a duration expressed in minutes. The date specifies the day the work was performed and is required for all timelogs. The duration represents the total time spent and must be a positive number of minutes.

If either the date or duration is missing, the timelog request is rejected. The system does not accept empty dates or zero-minute durations.

### Project and Task Assignment Validation

Each timelog must be associated with a project. The project must be one that the employee is currently assigned to as a project member. If the project is not in the employee's assigned projects list, the request is rejected.

The task field is optional. However, if a task is specified, it must belong to the selected project. The system validates that the task is a child of the chosen project before accepting the timelog. If the task does not belong to the project, the request is rejected.

### Billable Flag Default Behavior

All timelogs have a billable flag that indicates whether the logged time can be billed to a client. By default, the billable flag is set to true for all new timelogs.

Users can modify the billable flag when creating or editing a timelog. The flag can be toggled between true (billable) and false (non-billable) based on the nature of the work performed.

### Self-Only Creation and Approval Restrictions

Employees can only create timelogs for themselves. Attempts to create a timelog for another employee are rejected. Each timelog is permanently associated with the employee who created it.

Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. If the timelog belongs to an approved timesheet, the edit request is rejected. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. If the timelog is part of a submitted or approved timesheet, the delete request is rejected.

### Time Management Permission Override

Users with the time:manage permission can edit or delete any employee's timelogs, regardless of ownership. This includes timelogs that belong to approved timesheets.

This permission bypasses the normal self-only and approval restrictions that apply to regular employees. It is intended for managers and administrators who need to correct or manage timelog data across the organization.

## Timesheet Rules

Each timesheet covers a specific week from Monday to Sunday and requires a week start date. Timesheets can have status of draft, submitted, approved, or rejected. Employees can create draft timesheets that automatically include all timelogs for that week. Timesheets cannot be submitted if they have no timelogs included. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Once approved, timesheets lock all included timelogs preventing edits or deletions. Rejected timesheets return to draft status with a required rejection reason. Users with time:approve permission can view all submitted timesheets for approval.

### ### Weekly Period Definition

A timesheet covers a specific week defined from Monday to Sunday. The week start date (Monday) and week end date (Sunday) must be specified when creating a timesheet. Each timesheet represents exactly one calendar week and cannot span multiple weeks. The week dates are derived from the selected week start date, ensuring all timelogs in the timesheet fall within that Monday-to-Sunday range.

### ### Timesheet Statuses

Timesheets have four possible statuses: draft, submitted, approved, or rejected.

Draft Status:
- A timesheet starts in draft status when created
- Users can modify timelogs in a draft timesheet
- A draft timesheet cannot be viewed by users with approval permissions

Submitted Status:
- A timesheet transitions to submitted status when the employee submits it for approval
- Once submitted, the timesheet cannot be modified by the employee
- Users with time:approve permission can view submitted timesheets

Approved Status:
- A timesheet transitions to approved status when reviewed and approved by an authorized user
- Once approved, the timesheet cannot be modified or deleted
- All timelogs included in the approved timesheet become locked

Rejected Status:
- A timesheet transitions to rejected status when reviewed and rejected by an authorized user
- A rejected timesheet returns to draft status automatically
- The employee can modify the timesheet and resubmit it

### ### Automatic Timelog Inclusion

When an employee creates a draft timesheet for a specific week, the system automatically includes all timelogs the employee has created for that week.

Automatic Inclusion Rules:
- All timelogs with dates falling within the selected week are included
- Timelogs are added at the moment the draft timesheet is created
- Employees can manually add or remove timelogs from a draft timesheet after initial creation
- Timelogs must belong to the employee creating the timesheet

Timelog Association:
- Only timelogs with the same employee reference as the timesheet owner are included
- Deleted timelogs are not included in the timesheet
- Timelogs can be added to a draft timesheet even if they were created before the timesheet existed

### ### Submission Requires Timelogs

A timesheet cannot be submitted if it contains no timelogs.

Validation Rules:
- The system checks that at least one timelog exists in the timesheet before allowing submission
- If no timelogs are included, the submission request is rejected
- The employee receives a message indicating that timelogs must be added before submission

Behavior:
- A timesheet remains in draft status if submission is attempted with no timelogs
- The employee must add at least one timelog before the timesheet can be submitted
- This validation applies only to submission attempts, not to timesheet creation

### ### Duplicate Week Timesheet Prevention

Only one timesheet per week can exist in submitted or approved status for a given employee.

Duplicate Prevention Rules:
- If a timesheet for a specific week is already in submitted or approved status, a new timesheet for that same week cannot be created
- If a timesheet for a specific week is already in draft status, attempting to create another draft for that week is rejected
- The week is identified by the week start date (Monday)

Validation Process:
- Before creating or submitting a timesheet, the system checks for existing timesheets with the same week start date
- If an existing timesheet with submitted or approved status is found, the new submission request is rejected
- The employee receives a message indicating that a timesheet for that week has already been submitted or approved

Exception:
- If an existing timesheet for the week is in rejected status, a new timesheet can be created for that week

### ### Approved Timesheet Lock Behavior

When a timesheet is approved, all timelogs included in that timesheet become locked and cannot be edited or deleted.

Lock Behavior:
- Approved timelogs cannot have their duration modified
- Approved timelogs cannot have their description modified
- Approved timelogs cannot be removed from the timesheet
- Approved timelogs cannot be deleted from the system
- Attempts to modify or delete approved timelogs are rejected

Unlock Behavior:
- A timesheet must be rejected (not just deleted) to unlock its timelogs
- When a timesheet is rejected, the lock is released and timelogs become editable again
- Only approved timesheet locks apply; draft and submitted timelogs remain editable by the owner

Permission Override:
- Users with time:manage permission can edit or delete any employee's timelogs even if approved, as an administrative override

### ### Rejected Timesheet Returns to Draft

When a timesheet is rejected, it automatically returns to draft status, allowing the employee to modify it.

Rejection Workflow:
- A rejected timesheet is set back to draft status immediately upon rejection
- The rejection reason is recorded and becomes visible to the employee
- The timesheet retains all its timelogs in their current state
- The employee can modify timelogs, add new timelogs, or remove timelogs

Resubmission:
- After modifications, the employee can resubmit the rejected timesheet for approval
- The same week start date is preserved across the rejection and resubmission
- A new review process begins when the timesheet is resubmitted

Audit Trail:
- The system records that the timesheet was rejected and returned to draft
- The rejection date and reviewer are recorded in the timesheet history

### ### Rejection Reason Requirement

When a timesheet is rejected, a rejection reason must be provided by the user performing the rejection.

Rejection Reason Requirements:
- The rejection reason field is mandatory when rejecting a timesheet
- If no rejection reason is provided, the rejection request is rejected
- The rejection reason must be text and can be of variable length

Visibility:
- The rejection reason is visible to the employee who owns the timesheet
- The rejection reason is stored with the timesheet history
- The rejection reason helps the employee understand what needs to be corrected

Validation:
- An empty or blank rejection reason is not accepted
- The system prompts the reviewer to provide a reason if they attempt to reject without one
- The reviewer cannot submit the rejection until a valid reason is entered

## ActivityLog Rules

The system automatically records significant actions as activity log entries with timestamps. Each log entry records the user who performed the action, action type, target entity, and details. Logged actions include employee invitations, deactivations, reactivations, and contract changes. Project lifecycle actions like creation, archiving, completion, and deletion are logged. Task status changes are recorded with before and after states. Timesheet submission, approval, and rejection actions are tracked. Role assignment and changes are captured in the activity log. Only users with org:manage permission can view the full activity log. Activity logs are paginated and can be filtered by action type, user, and date range.

### Automatic Activity Logging

The system automatically records activity log entries when significant actions occur. Each activity log entry includes a timestamp, the user who performed the action, the action type, the target entity, and relevant details. The system captures employee lifecycle events including invitations, deactivations, and reactivations. Project lifecycle events are logged when projects are created, archived, completed, or deleted. Task status changes are recorded with both the previous status and the new status. Timesheet workflow actions such as submission, approval, and rejection are tracked in the activity log. Role assignments and role changes for organization members are logged. Users with org:manage permission can view the full activity log. The activity log supports pagination with a configurable page size. Activity logs can be filtered by action type, user, and date range. Only the organization owner has permission to access the activity log feature.

### Employee Lifecycle Action Logging

When a new employee is invited to an organization, an activity log entry is created recording the invitation details including the invited email address and the inviter. When an employee is deactivated, the system records the deactivation with the actor who performed it and the effective date. When a deactivated employee is reactivated, the system logs the reactivation with the actor and the effective date. Employee contract creation is logged with details about the contract type and pay period. Contract edits to the current active contract are recorded with both the old and new values for changed fields. Users with org:manage permission can view all employee-related activity logs. Employee invitations, deactivations, and reactivations are tracked regardless of whether the employee has an existing account or not. The activity log entry includes the employee identifier and the specific action performed.

### Project Lifecycle Action Logging

When a new project is created within an organization, the system logs the creation with the creator's identity and the project name. When a project is archived, the activity log records the action with the archiver and the timestamp. When a project is marked as completed, the system logs this with the actor and completion details. Project deletion is logged only when successful, recording the deleter and the project being deleted. When a project's budget hours are modified, the system logs the change with both the previous and new values. Project ownership transfer or project lead assignment changes are logged. Users with org:manage permission can view all project-related activity logs. Project lifecycle actions are tracked for active, archived, and completed project states. The activity log entry includes the project identifier and the specific lifecycle transition that occurred.

### Task Status Change Tracking

When a task's status changes, the system creates an activity log entry with the timestamp, the actor who made the change, and the task identifier. The activity log records both the previous status value and the new status value for status transitions. Status transitions from open to in-progress, in-progress to completed, or any other status change are logged. Task reassignment to a different employee is logged with the previous assignee and the new assignee. When a task's priority is changed, the activity log captures both the old and new priority values. Task creation, editing, and deletion actions are logged with the actor and timestamp. Only users with org:manage permission can view activity logs for task-related actions. Task status changes are recorded in the order they occur, maintaining a chronological history. Each task activity log entry includes details about what specific field triggered the log entry.

### Timesheet Workflow Action Logging

When an employee submits a timesheet for approval, the system logs the submission with the employee identifier, the week covered, and the submission timestamp. When a timesheet is approved, the activity log records the approver's identity, the approval timestamp, and the total hours approved. When a timesheet is rejected, the system logs the rejection with the rejector, the rejection timestamp, and the rejection reason. Timesheet resubmission after rejection is logged as a distinct action from the original submission. Once a timesheet is approved, any subsequent modifications to its timelogs are logged with both the previous and new values. Users with org:manage permission can view all timesheet-related activity logs. The activity log captures the full workflow from draft through submission, approval, or rejection. Timesheet workflow actions include both the workflow state transition and the actor who triggered the transition.

### Role and Permission Change Logging

When a custom role is created within an organization, the system logs the creation with the creator's identity and the role name. When a custom role is modified, the activity log records all permission additions and removals with before and after values. When a custom role is deleted, the system logs the deletion with the actor and the timestamp. When a role is assigned to an organization member, the activity log captures the member identifier, the role assigned, and the assigner. When a role is changed for an organization member, the log includes both the previous role and the new role. Role deletion is logged only if successful, requiring that no members are assigned to the role. Users with org:manage permission can view all role-related activity logs. Built-in role changes (such as Owner or Manager status) are also logged. The activity log entry includes the member identifier and the specific role assignment action.

### Activity Log Viewing and Access

Only users with org:manage permission can access the activity log feature within an organization. The activity log displays all logged actions in reverse chronological order by default. The activity log supports filtering by action type to narrow down results to specific event categories. The activity log supports filtering by user to show actions performed by a specific actor. The activity log supports filtering by date range to focus on actions within a time period. The activity log uses pagination with a maximum of 50 entries per page. Users can navigate through multiple pages of activity log results. The activity log displays the actor's display name rather than their internal identifier. Each activity log entry shows the target entity type and the specific action that occurred. Users without org:manage permission cannot access any activity log entries.

### Activity Log Browsing and Filtering

Activity log entries can be filtered by the following action types: employee invitation, employee deactivation, employee reactivation, contract creation, contract edit, project creation, project archiving, project completion, project deletion, task creation, task edit, task status change, task deletion, timesheet submission, timesheet approval, timesheet rejection, role creation, role edit, role deletion, role assignment, and role change. Activity log entries can be filtered by date range using a start date and end date. The date range filter is inclusive of both the start and end dates. Users can sort activity log results by timestamp in ascending or descending order. The activity log supports searching by keywords within the action details field. Activity log entries persist for the lifetime of the organization and are not deleted on organization deletion. Paginated results show the current page number and total number of pages. Activity log browsing does not require special session handling beyond standard authentication.

## Timer Rules

Each employee can have at most one active timer running at any time. Starting a timer requires selecting a project and optionally a task. The timer records the start timestamp, selected project, selected task, and description. Employees can stop their timer to create a timelog with the calculated duration. Timer duration is rounded to the nearest minute when creating a timelog. Employees can discard their timer without creating any timelog. If an employee forgets to stop their timer, it continues running without automatic stop. Employees can edit the description and project-task selection of a running timer. Employees can view their currently running timer through the timer interface.

### Single Active Timer Limit

Each employee can have at most one active timer running at any time. When an employee starts a timer, the system checks if they already have a timer in progress. If a timer is already active, the start request is rejected until the existing timer is stopped or discarded.

### Timer Start Project Selection

Starting a timer requires selecting a project. The selected project must be one that the employee is assigned to. If no project is selected, the timer cannot be started. If the selected project is not assigned to the employee, the start request is rejected.

### Optional Task Selection for Timer

When starting a timer, the employee may optionally select a task to associate with the time tracking. The task must belong to the project selected for the timer. If no task is selected, the timer is created without a task association. The task can be changed later when editing the running timer.

### Timer Stop to Timelog Conversion

When an employee stops their active timer, the system automatically creates a timelog entry with the calculated duration. The timelog includes the project and task that were selected for the timer, along with the description recorded during the timer session. The timelog date defaults to the current date at the time the timer is stopped.

### Duration Rounding Behavior

Timer duration is rounded to the nearest minute when creating a timelog upon timer stop. The duration is calculated as the difference between the start timestamp and the stop timestamp. Time spent less than 30 seconds is rounded down to 0 minutes; time spent 30 seconds or more is rounded up to the next full minute.

### Timer Discard Without Creation

Employees can discard their active timer without creating any timelog. When a timer is discarded, no duration is recorded and no timelog is created in the system. The discarded timer cannot be recovered. This option is available before the employee stops the timer.

### No Automatic Stop Timer Behavior

If an employee forgets to stop their timer, it continues running indefinitely without automatic stop. The system does not enforce a maximum timer duration or automatically end timers after a certain period. Employees are responsible for stopping their timers when they finish working or taking a break.

### Running Timer Editing Capability

Employees can edit the description of their running timer at any time before stopping it. Employees can also change the project or task associated with a running timer. Changes to the project must still reference a project the employee is assigned to. The updated information is used when the timer is eventually stopped and a timelog is created.

### View Running Timer

Employees can view the status of their currently running timer. The view displays the start time, current elapsed duration, selected project, selected task (if any), and the current description. Only the employee who started the timer can view and manage their own running timer.

## Report Rules

Only users with report:view permission can access organization reports. Available reports include time reports, project budget reports, and weekly summary reports. Time reports show total hours logged per employee grouped by employee, project, or task. Project budget reports compare budget hours against actual logged hours for each project. Projects without budget hours are excluded from the project budget report. Weekly summary reports show week-by-week totals of hours, timelogs, and employees. Reports can be filtered by date range, employee, project, and billable status. Reports include breakdowns of total hours, billable hours, and non-billable hours.

### Report Access Permission

Only users with the report:view permission can access organization reports. This permission is granted to Owner and Manager roles by default. Employees without this permission cannot view any reports. Guest users have no access to organization reports.

### Time Report Aggregation Options

Time reports can be aggregated by employee, project, or task. When grouped by employee, each row shows one employee with their total hours. When grouped by project, each row shows one project with total hours logged across all employees. When grouped by task, each row shows one task with total hours logged. Users can choose one aggregation method per report generation.

### Billable Hour Breakdown

All time reports include a breakdown of billable and non-billable hours. Each aggregated group shows three values: total hours, billable hours, and non-billable hours. Billable hours are calculated from timelogs marked as billable. Non-billable hours are calculated from timelogs marked as non-billable. The sum of billable and non-billable hours equals total hours.

### Project Budget Utilization Tracking

Project budget reports compare budget hours against actual hours logged for each project. The system calculates the percentage of budget consumed by dividing actual hours by budget hours and multiplying by 100. Projects with budget utilization over 80% are highlighted on the organization dashboard. The percentage is rounded to one decimal place.

### Budget Hours Missing Project Exclusion

Projects without budget hours defined are excluded from the project budget report. If a project has a budget hours value of zero or null, it does not appear in the report. Users with budget hours set on a project will see it in the report once actual timelogs are recorded against it.

### Weekly Summary Calculation Rules

Weekly summary reports calculate totals for each week independently. Each week's row includes total hours logged, count of timelogs submitted, and count of unique employees who logged time. The week starts on Monday and ends on Sunday. Date ranges in the report cover complete weeks only. Partial weeks are excluded from calculations.

### Report Filtering Capabilities

Reports support filtering by date range, employee, project, and billable status. Date range filters require a start date and end date. Employee filter allows selecting one or multiple employees from the organization. Project filter allows selecting one or multiple projects. Billable status filter shows either billable only, non-billable only, or both. Multiple filters can be combined in a single report generation.

### Report Generation Parameters

Each report requires specific parameters based on its type. Time reports require a date range and optionally an aggregation method. Project budget reports require a date range but cannot be filtered by employee. Weekly summary reports require a date range and optionally a project filter. All reports include the generation timestamp and are stored for later reference.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Employee List Browsing

The employee list displays paginated results with a configurable number of entries per page.

Users with employee:view permission can filter the employee list by department, employment type, or status.

Users can search the employee list by employee name.

The employee list supports sorting by name, department, employment type, and status.

Deactivated employees can be included or excluded from the filtered list based on user selection.

The employee list always reflects the currently selected organization context.

### Project List Browsing

The project list displays paginated results with a configurable number of entries per page.

Users with project:view permission can filter the project list by status (active, archived, completed).

The project list supports sorting by name, status, start date, and end date.

The list automatically excludes archived and completed projects from the default view, though users can include them via filter options.

The project list always reflects the currently selected organization context.

Users without project:manage permission can only view the filtered list and cannot perform management actions.

### Task List Browsing

The task list displays paginated results with a configurable number of entries per page.

Users can filter tasks by status (open, in-progress, completed, closed).

Users can filter tasks by priority (low, medium, high, urgent).

Users can filter tasks by assigned employee.

The task list supports sorting by due date, priority, and creation date.

Tasks can be sorted in ascending or descending order.

Subtasks are visually indicated within the list but remain in the same paginated results as parent tasks.

Users can only view tasks from projects they are assigned to or have project:view permission for.

The task list always reflects the currently selected organization context.

### Timelog List Browsing

The timelog list displays paginated results with a configurable number of entries per page.

Users can filter timelogs by date range (start date and end date).

Users can filter timelogs by project.

Users can filter timelogs by task within the selected project.

Users can filter timelogs by billable status (billable, non-billable).

The timelog list supports sorting by date, duration, project, and creation timestamp.

Employees can only view their own timelogs unless they have time:view_all permission.

Users with time:manage permission can view all employees' timelogs regardless of ownership.

The timelog list always reflects the currently selected organization context.

### Timesheet List Browsing

The timesheet list displays paginated results with a configurable number of entries per page.

Users can filter timesheets by status (draft, submitted, approved, rejected).

Users can filter timesheets by date range (week start date).

The timesheet list supports sorting by week start date, status, and total hours.

Employees can only view their own timesheets unless they have time:approve permission.

Users with time:approve permission can view all employees' timesheets for approval review.

Submitted and approved timesheets are displayed separately from draft and rejected timesheets for clarity.

The timesheet list always reflects the currently selected organization context.

### Activity Log Browsing

The activity log displays paginated results with a configurable number of entries per page.

Users can filter activity log entries by action type (employee invite, employee deactivate, employee reactivate, contract create, contract edit, project create, project archive, project complete, project delete, task status change, timesheet submit, timesheet approve, timesheet reject, role assign, role change).

Users can filter activity log entries by user who performed the action.

Users can filter activity log entries by date range.

The activity log supports sorting by timestamp, action type, and target entity.

Users can sort in ascending or descending order by any available field.

Only users with org:manage permission can view the full activity log.

The activity log always reflects the currently selected organization context.

### General Pagination Rules

All list views implement pagination to manage large datasets efficiently.

The default page size displays 20 entries per page across all lists.

Users can adjust the page size to display 10, 25, 50, or 100 entries per page.

Pagination controls show the current page number, total pages, and total entry count.

Navigation between pages is available via next, previous, and direct page number selection.

The current page is preserved when applying or modifying filters.

Changing the page size resets to page 1.

Pagination applies consistently across all entity types: employees, projects, tasks, timelogs, timesheets, and activity logs.

### General Filtering Rules

All list views support filtering to help users find relevant entries efficiently.

Filters can be combined, and results update in real-time as filters are applied or removed.

Applied filters are displayed prominently with the ability to remove individual filters.

Clearing all filters returns the list to its default unfiltered state.

Filter options are context-aware and only show valid choices based on the current list state.

Empty results are displayed with a helpful message explaining the filtered criteria.

Filters reset to their default values when navigating away from the list view.

All filtering respects the user's permission level and organization context.

### General Sorting Rules

All list views support sorting to help users organize information according to their needs.

Sorting is applied after filtering, so results are first narrowed by filters, then sorted.

Users can toggle between ascending and descending sort order for most fields.

The current sort field and direction are indicated with visual markers in the list header.

Default sort order varies by list: employees by name, projects by creation date, tasks by due date, timelogs by date, timesheets by week start date, activity logs by timestamp.

Sorting options are limited to fields that make business sense for each entity type.

Sorting respects permission-based data visibility (employees cannot sort by fields they cannot view).

### Search Behavior

Name-based search is available on employee and task lists.

Search queries match partial names using case-insensitive matching.

Search results update in real-time as the user types.

Search is independent of filter selections and can be combined with other filters.

Search does not extend to description fields to maintain performance.

Users can clear the search query to return to unfiltered results.

Search is scoped to the user's permission level and organization context.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Failures

Organization owners cannot delete their organization while any pending timesheets exist. The system rejects the deletion request with an explanation that all pending timesheets must be resolved first.

Organization owners cannot delete their organization while any employee contracts are active. The system rejects the deletion request with an explanation that all active contracts must be ended first.

If an organization deletion fails due to pending timesheets or active contracts, the organization and all its data remain unchanged. The owner retains access to the organization and can attempt deletion again after resolving the issues.

### Timesheet Submission Rejections

Employees cannot submit a timesheet that contains no timelogs. The system rejects the submission and displays an error message indicating that at least one time entry must be included.

Employees cannot submit a timesheet for a week where another timesheet already exists with submitted or approved status. The system rejects the submission and indicates that a timesheet for that week is already in progress or finalized.

When a timesheet is rejected by a user with approval permissions, the timesheet returns to draft status and the rejection reason becomes visible to the employee. The employee cannot resubmit without addressing the stated reason.

Users without time:approve permission cannot submit, approve, or reject timesheets for any employee. The system denies the action and requires the user to have appropriate approval authority.

### Timelog Modification Failures

Employees cannot edit a timelog that is part of an approved timesheet. The system rejects the edit request and indicates that the time entry is locked due to timesheet approval.

Employees cannot delete a timelog that is part of any submitted timesheet. The system rejects the deletion request and indicates that the time entry cannot be removed while part of a pending or approved timesheet.

Employees cannot delete a timelog that is part of an approved timesheet. The system rejects the deletion request and indicates that the time entry is permanently locked upon approval.

Users without time:manage permission cannot edit or delete another employee's timelogs. The system denies the action and requires the appropriate management permission for cross-employee time management.

### Employee Deactivation Constraints

Users cannot deactivate an employee who has pending timesheets awaiting approval. The system rejects the deactivation request and indicates that all timesheets must be resolved first to prevent data loss.

Users cannot deactivate an employee who has active contracts. The system rejects the deactivation request and indicates that contracts must be ended before deactivation to maintain employment records.

Deactivated employees automatically lose the ability to log time or submit timesheets. The system prevents any time tracking attempts from deactivated employee accounts.

Deactivated employees retain access to view their own historical timelogs and timesheets. The system allows viewing but not modifying or creating new entries.

### Contract Creation Conflicts

Users cannot create a new contract for an employee that overlaps with an existing active contract's date range. The system rejects the creation and indicates that only one active contract can exist at a time.

Users cannot create a contract with a start date before the employee's hire date. The system rejects the creation and indicates that the start date must be on or after the employee's initial hire date.

Users cannot edit past contracts that have already ended. The system rejects the edit request and indicates that historical contracts are immutable for audit purposes.

Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract's start date. The previous contract remains as an immutable historical record.

### Project Deletion Restrictions

Users cannot delete a project that has any associated timelogs. The system rejects the deletion request and indicates that the project must be archived or completed instead.

Users cannot delete a project that has active tasks with incomplete status. The system rejects the deletion request and indicates that all tasks must be completed or closed first.

Users without project:manage permission cannot delete any projects. The system denies the deletion action and requires project management authority.

Once a project is archived or completed, users cannot add new timelogs to it. The system rejects any timelog creation attempts for archived or completed projects.

### Task Assignment Errors

Users cannot assign a task to an employee who is not a member of the project. The system rejects the assignment and indicates that only project members can be assigned to tasks.

Users cannot assign a task to a project when the employee is not assigned to that project. The system rejects the assignment and indicates that the employee must be added to the project first.

Users cannot assign more than one parent task to a single task. The system rejects assignments with multiple parents and indicates that tasks can only have one parent for the subtask hierarchy.

Users without project:manage permission or project lead status in a project cannot create or edit tasks in that project. The system denies the action and requires appropriate project management authority.

### Timer Usage Limitations

Employees cannot start a timer when they already have an active timer running. The system rejects the timer start request and indicates that only one timer can be active at a time.

Employees cannot start a timer without selecting a project. The system rejects the timer start request and indicates that a project selection is required before tracking time.

Employees can only edit the description, project, and task of a running timer. The system rejects attempts to edit any other timer attributes.

When an employee stops their timer, the duration is rounded to the nearest minute and a new timelog is created with that duration. The system does not preserve sub-minute precision in the timelog.

### Role and Permission Errors

Organization owners cannot delete a custom role that has any employees assigned to it. The system rejects the deletion request and indicates that all employees must be reassigned to other roles first.

Organization owners cannot delete the three built-in roles (owner, manager, employee). The system rejects any deletion attempt and indicates that built-in roles are permanent and cannot be removed.

Users cannot assign more than one role to a single organization member. The system rejects the role assignment and indicates that each employee must have exactly one role within an organization.

Users without employee:manage permission cannot change any employee's role assignment. The system denies the role change action and requires employee management authority.

### Activity Log Access Restrictions

Users without org:manage permission cannot view the complete activity log. The system denies access to the full log and indicates that organization management authority is required.

Users can only view activity log entries from their currently selected organization. The system filters out all activity from other organizations to which the user belongs.

Activity log entries cannot be deleted or modified by any user. The system permanently retains all activity log entries for audit purposes.

The system automatically creates activity log entries when significant actions occur. Users cannot prevent the creation of these entries for tracked events.

### Timesheet Review Exceptions

Users who approve a timesheet lock all timelogs included in that timesheet. No employee or manager can edit or delete those timelogs after approval.

Users who reject a timesheet must provide a rejection reason. The system rejects the rejection action if no reason is provided and requires the user to enter an explanation.

Employees can modify and resubmit a rejected timesheet after the rejection. The system allows the employee to change timelogs and resubmit with the updated timesheet.

Once a timesheet is approved, no user can change its status or remove timelogs from it. The system maintains the approved state permanently until the next timesheet cycle.

### Department Management Exceptions

Users cannot delete a department that has employees assigned to it without first reassigning those employees. The system rejects the deletion request and indicates that employees must have a department assignment.

When a department is deleted, all employees' department assignments are set to null. The system does not delete the employees themselves, only the department association.

Users cannot create a circular department hierarchy (e.g., department A is parent of B, B is parent of C, C is parent of A). The system rejects the creation and indicates that only one level of nesting is allowed.

Users without org:manage permission cannot create, edit, or delete any departments. The system denies these actions and requires organization management authority.

### Filter and Sort Validation Failures

Users cannot filter timelogs by a date range that exceeds the system's retention period. The system rejects the filter request and indicates that only recent data can be searched.

Users cannot sort timelogs by a field that is not available for the current filter criteria. The system rejects the sort request and indicates that the field is incompatible with the selected filters.

When filtering projects by status, users can only select from the valid status values (active, archived, completed). The system rejects requests with invalid status values.

When filtering employees by status, users can only select from the valid status values (active, deactivated). The system rejects requests with invalid status values.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Data Validation Rules

Organization name must be provided when creating an organization.

User email must be a valid email format for account creation and login.

Password must meet minimum complexity requirements when creating or changing a user account.

Department name must be provided when creating a new department.

Project name and color code must be provided when creating a project.

Task title must be provided when creating a task within a project.

Employee contract start date must be provided; end date is optional for ongoing contracts.

Employee contract pay rate must be a positive numeric value.

Timelog date must be a valid calendar date; duration must be a positive number of minutes.

Timesheet week start date must be a Monday; week end date must be the following Sunday.

Timelog duration is rounded to the nearest minute when creating from timer stop action.

Organization owner cannot delete the organization if there are pending timesheets awaiting approval.

Organization owner cannot delete the organization if there are active employee contracts.

Custom role name must be unique within the organization.

Custom role cannot be deleted if any employees are assigned to that role.

Project cannot be deleted if there are any timelogs associated with it.

Contract cannot be created with a start date before the previous contract end date; creating a new contract automatically ends the previous active contract.

Timesheet cannot be submitted if it contains no timelogs.

Timesheet cannot be submitted if another timesheet for the same week is already submitted or approved.

Timesheet cannot be rejected without providing a rejection reason.

Employee invitation is rejected if the email format is invalid.

User account cannot be deleted if the user is the sole owner of an organization unless ownership is transferred or the organization is deleted first.

User account deletion does not delete the user's account but marks employee records as deactivated in other organizations.

Employee can only create timelogs for their own employee record, not for other employees.

Timelog cannot be edited or deleted if it is part of an approved timesheet.

Timelog cannot be deleted if it is part of any submitted or approved timesheet.

Timer cannot be started if an employee already has an active timer; maximum one active timer per employee at any time.

### Data Format Requirements

Email addresses must follow standard email format (user@domain.tld) for all user accounts and employee invitations.

Date fields use the organization's configured timezone for consistency across all records.

Time durations are stored and displayed in minutes, converted to hours for reporting.

Currency values use the organization's configured currency code (ISO 4217 format: USD, EUR, KRW).

Color codes use hexadecimal format (#RRGGBB) for project color assignments.

Timestamps are recorded in ISO 8601 format with timezone information.

Phone numbers accept international formats with country code.

Department descriptions, project descriptions, task descriptions, and employee notes accept free text without length restrictions.

Pay rates are stored as decimal numbers allowing for fractional values.

Working hours per week are stored as numeric values (typically 40 for full-time employees).

Task priority uses predefined string values: low, medium, high, urgent.

Task status uses predefined string values: open, in-progress, completed, closed.

Project status uses predefined string values: active, archived, completed.

Employment type uses predefined string values: full-time, part-time, contractor, intern.

Employee status uses predefined string values: active, deactivated.

Timesheet status uses predefined string values: draft, submitted, approved, rejected.

Role permission values use predefined format: module:action (e.g., employee:view, project:manage).

Rejection reasons are text fields with no minimum length but must be provided when rejecting a timesheet.

Timer descriptions, timelog descriptions, and contract notes are optional text fields.

### Data Retention and Deletion

When an organization is deleted, all associated data is permanently deleted: employees, departments, projects, tasks, timelogs, timesheets, contracts, and activity logs.

Organization deletion does not delete the owner's user account; the account remains but becomes unassociated with any organization.

When an employee is deactivated, their historical data (timelogs, timesheets, contracts) is preserved indefinitely for reporting and audit purposes.

Deactivated employees cannot create new timelogs, submit timesheets, or be assigned to new projects.

Deactivated employees can be reactivated by users with employee management permission, restoring their ability to work.

Past employee contracts are immutable historical records; only the active contract can be edited.

When a new contract is created, the previous active contract's end date is automatically set to the day before the new contract starts.

Timelogs on archived or completed projects are preserved; no new timelogs can be added to such projects.

Archived or completed projects cannot be deleted; only active projects without timelogs can be deleted.

Activity log entries are preserved for all significant actions performed within the organization.

Timesheet approval or rejection does not delete underlying timelogs; approved timelogs become locked and cannot be edited.

Rejected timesheets return to draft status; the employee can modify and resubmit them.

Project member assignments are preserved when employees are deactivated or transferred between projects.

Department deletion does not delete employees; it sets their department field to null.

Subtasks are preserved when parent tasks are deleted; they maintain their reference to the original project.

Timer data is discarded if the employee explicitly discards the timer before stopping it.

Activity logs cannot be deleted by users; they are maintained for audit trail purposes.

### Not Applicable Scenarios

The system does not support file upload functionality; therefore, virus scanning of uploaded files is not applicable.

The system does not support document attachments; all data is stored as structured text fields.

The system does not process image files or other media files as user input or organizational data.

Content-type validation for file uploads is not applicable as the system only accepts structured data through the application interface.

File retention policies do not apply as there are no files stored in the system.

No file-based storage validation or file integrity checks are performed because no file storage exists.

The system does not implement any file-based backup or restore mechanisms; data is managed through database operations.

No file virus signatures or malware detection systems are implemented because the system does not accept file uploads.