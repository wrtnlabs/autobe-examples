**hrm — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

Organizations serve as the foundation for multi-tenancy in the platform, with each organization operating independently. Users create an organization during initial sign-up, providing name, description, logo image, currency, timezone, and fiscal start month. Organization owners have full control to edit these settings at any time. Deleting an organization requires meeting specific conditions: all pending timesheets must be resolved (approved or rejected) and there must be no active employee contracts. When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's account remains in the system but becomes unassociated with any organization.

### Organization Creation and Multi-Tenancy Support

THE system SHALL allow users to create an organization during initial sign-up.

THE system SHALL require organization name, currency, timezone, and fiscal start month during organization creation.

THE system SHALL accept organization description and logo image as optional information during organization creation.

THE system SHALL assign the creating user as the organization owner with full access to all features.

THE system SHALL support multi-tenancy by allowing multiple organizations to operate independently.

THE system SHALL maintain separate data sets for each organization including employees, projects, tasks, timelogs, timesheets, departments, and roles.

THE system SHALL allow a user to belong to multiple organizations simultaneously.

### Organization Settings Management

THE system SHALL allow organization owners to edit organization settings at any time.

THE system SHALL allow organization owners to modify the organization name.

THE system SHALL allow organization owners to modify the organization description.

THE system SHALL allow organization owners to modify the organization logo image.

THE system SHALL allow organization owners to modify the organization currency.

THE system SHALL allow organization owners to modify the organization timezone.

THE system SHALL allow organization owners to modify the fiscal start month.

THE system SHALL apply organization setting changes immediately upon modification.

THE system SHALL restrict organization settings modification to users with the org:manage permission.

### Organization Deletion Conditions

THE system SHALL allow organization owners to delete their organization.

THE system SHALL verify that all pending timesheets are resolved before allowing organization deletion.

THE system SHALL verify that there are no active employee contracts before allowing organization deletion.

THE system SHALL block organization deletion when pending timesheets exist.

THE system SHALL inform the user that all pending timesheets must be approved or rejected before organization deletion.

THE system SHALL block organization deletion when active employee contracts exist.

THE system SHALL inform the user that all active contracts must be ended before organization deletion.

THE system SHALL prevent organization deletion until all blocking conditions are resolved.

### Organization Data Cascade Deletion

THE system SHALL permanently delete all employees when an organization is deleted.

THE system SHALL permanently delete all projects when an organization is deleted.

THE system SHALL permanently delete all tasks when an organization is deleted.

THE system SHALL permanently delete all timelogs when an organization is deleted.

THE system SHALL permanently delete all timesheets when an organization is deleted.

THE system SHALL permanently delete all departments when an organization is deleted.

THE system SHALL permanently delete all custom roles when an organization is deleted.

THE system SHALL permanently delete all activity log entries for the organization when the organization is deleted.

THE system SHALL retain the organization owner's user account in the system after organization deletion.

THE system SHALL disassociate the organization owner from the deleted organization.

THE system SHALL allow the former owner to join or create other organizations after deletion.

### Organization Data Isolation and Independent Operations

THE system SHALL enforce strict data isolation between organizations.

THE system SHALL require organization context selection after login when a user belongs to multiple organizations.

THE system SHALL scope all subsequent actions to the selected organization context.

THE system SHALL allow users to switch between organizations without logging out.

THE system SHALL prevent employees in one organization from accessing data from another organization.

THE system SHALL maintain independent data sets for each organization.

THE system SHALL enforce organization context on every request to ensure data isolation is maintained.

## User Operations

Users sign up with email and password to create their account, then log in with the same credentials. Each user maintains a global profile with display name, avatar image, and phone number that is shared across all organizations. Users can change their password for security purposes. A single user can belong to multiple organizations simultaneously. When logging in, users select which organization to work in, establishing the organization context for all subsequent actions. Users can switch between organizations without logging out. Account deletion requires special handling: if the user is the sole owner of an organization, they must transfer ownership or delete the organization first. When a user deletes their account, their employee records in other organizations are marked as deactivated.

### User Registration and Authentication

Users can register for a new account by providing an email address and password. The email address must be unique across the platform. Upon successful registration, the user account is created and the user can immediately log in.

Users can log in to the system using their registered email address and password. After successful authentication, users must select which organization they want to work in from their list of member organizations.

The selected organization becomes the active context for all subsequent actions until the user switches to a different organization or logs out.

When a user signs up with an email that has a pending invitation to join an organization, the user is automatically added to that organization after registration completes.

### Password Management

Users can change their account password by providing their current password and a new password. The current password must be verified before the change is allowed.

### Multi-Organization Membership and Context

A single user account can belong to multiple organizations simultaneously. Users can see a list of all organizations they are members of.

Users can switch between their organizations without logging out. When switching organizations, the user's active context changes to the newly selected organization, and all subsequent actions are scoped to that organization.

All data is strictly isolated per organization. Users can only view, create, update, or delete data that belongs to their currently selected organization. Users cannot access data from other organizations even if they are members of those organizations.

The organization context is established at login and can be changed by the user at any time without re-authentication.

### Global Profile Management

Users maintain a global profile that is shared across all organizations they belong to. The profile includes display name, avatar image, and phone number.

Users can edit their display name at any time. Users can upload or change their avatar image. Users can update their phone number.

Profile changes are immediately visible across all organizations the user belongs to.

### Account Deletion

Users can delete their account if they are not the sole owner of any organization. If a user is the sole owner of one or more organizations, they must first transfer ownership to another employee or delete those organizations before their account can be deleted.

When a user deletes their account, their employee records in all other organizations are marked as deactivated. The deactivated employee records preserve historical data including timelogs, timesheets, and activity history.

## Employee Operations

Users with employee:manage permission can invite new employees to the organization by email address. If the invited email already has an account, that user is added to the organization immediately. If the email has no account, a pending invitation is created, and when the user signs up with that email, they are automatically added to all pending organizations. Each employee record contains reference to the user account, role in the organization, department, position, employment type, and status. Users with employee:manage permission can edit employee records for department, position, and employment type. They can also deactivate employees, which prevents them from logging time or submitting timesheets while preserving their historical data. Deactivated employees can be reactivated at any time. The employee list is paginated and supports filtering by department, employment type, and status, as well as search by name.

### Employee Invitation and Onboarding

Users with `employee:manage` permission can invite new employees to the organization by sending an invitation email.

WHEN a user with `employee:manage` permission invites an employee by email, THE system SHALL create an employee record in the organization.

WHEN the invited email already has a user account, THE system SHALL add that user to the organization immediately as an employee.

WHEN the invited email does not have a user account, THE system SHALL create a pending invitation record.

WHEN a user signs up with an email that has a pending invitation, THE system SHALL automatically add the user to all organizations with pending invitations for that email.

The invitation process requires the inviter to have `employee:manage` permission.

### Employee Record Management

Users with `employee:manage` permission can manage employee records within the organization.

Users with `employee:manage` permission can assign a role to each employee. Each employee is assigned exactly one role within the organization.

Users with `employee:manage` permission can assign a department to an employee. The department is optional and can be set to null.

Users with `employee:manage` permission can assign a position or title to an employee. The position is optional.

Users with `employee:manage` permission can set the employment type for an employee. The employment type must be one of: full-time, part-time, contractor, or intern.

Users with `employee:view` permission can view employee records including role, department, position, and employment type.

### Employee Status Management

Users with `employee:manage` permission can deactivate employees in the organization.

WHEN an employee is deactivated, THE system SHALL prevent the employee from logging time.

WHEN an employee is deactivated, THE system SHALL prevent the employee from submitting timesheets.

WHEN an employee is deactivated, THE system SHALL preserve all historical data including timelogs and timesheets.

Users with `employee:manage` permission can reactivate deactivated employees.

WHEN a deactivated employee is reactivated, THE system SHALL restore the employee's ability to log time.

WHEN a deactivated employee is reactivated, THE system SHALL restore the employee's ability to submit timesheets.

Users with `employee:view` permission can view the status of employees (active or deactivated).

### Employee List and Search

Users with `employee:view` permission can view the list of employees in the organization.

The employee list is paginated to support browsing large employee populations.

Users can filter the employee list by department.

Users can filter the employee list by employment type (full-time, part-time, contractor, intern).

Users can filter the employee list by status (active or deactivated).

Users can search the employee list by name.

Multiple filters can be combined when viewing the employee list.

## Role Operations

Each organization maintains its own set of roles with three built-in roles that cannot be deleted: Owner, Manager, and Employee. The Owner role has full access to all features and can manage roles and members. The Manager role can manage employees, projects, approve timesheets, and view reports. The Employee role can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and set of permissions from the available permission list. These permissions include org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. Owners can edit custom roles and delete them only if no employees are assigned to them. Each employee in an organization is assigned exactly one role, and role assignment changes require the employee:manage permission.

### Built-in Roles

THE SYSTEM SHALL maintain three built-in roles in every organization: Owner, Manager, and Employee.

THE SYSTEM SHALL make the built-in roles automatically available when an organization is created.

THE SYSTEM SHALL prevent deletion of the Owner, Manager, and Employee roles by any user.

THE SYSTEM SHALL prevent modification of the built-in role permissions by any user.

THE SYSTEM SHALL allow organization owners to have full access to all features within their organization.

THE SYSTEM SHALL allow organization owners to manage roles and members within their organization.

THE SYSTEM SHALL allow managers to manage employees within their organization.

THE SYSTEM SHALL allow managers to manage projects within their organization.

THE SYSTEM SHALL allow managers to approve timesheets within their organization.

THE SYSTEM SHALL allow managers to view organization reports.

THE SYSTEM SHALL allow employees to track time within their organization.

THE SYSTEM SHALL allow employees to submit timesheets within their organization.

THE SYSTEM SHALL allow employees to view their own data within their organization.

### Custom Role Management

THE SYSTEM SHALL allow organization owners to create custom roles within their organization.

Each custom role SHALL have a name.

Each custom role SHALL have a set of permissions assigned to it.

THE SYSTEM SHALL allow organization owners to edit custom roles within their organization.

THE SYSTEM SHALL allow organization owners to modify the permissions assigned to custom roles.

THE SYSTEM SHALL allow organization owners to rename custom roles.

THE SYSTEM SHALL allow organization owners to delete custom roles only if no employees are assigned to them.

THE SYSTEM SHALL prevent deletion of a custom role if any employee is assigned to that role.

THE SYSTEM SHALL require that employees previously assigned to a deleted custom role be reassigned to a different role before the deletion is completed.

Custom roles SHALL be scoped to a single organization and not shared across organizations.

### Role Permissions

THE SYSTEM SHALL provide the following permissions that can be assigned to roles:

- org:manage — edit organization settings
- employee:manage — add, edit, deactivate employees
- employee:view — view employee list and details
- project:manage — create, edit, delete projects and tasks
- project:view — view projects and tasks
- time:manage — edit or delete any employee's timelogs
- time:approve — approve or reject timesheets
- time:view_all — view all employees' timelogs and timesheets
- report:view — view organization reports

THE SYSTEM SHALL allow organization owners to assign one or more permissions to each custom role.

A custom role SHALL have at least one permission assigned.

Permissions SHALL be assigned at the role level, not at the individual employee level.

THE permission set assigned to a role SHALL determine what operations a user can perform when assigned that role.

### Employee Role Assignment

THE SYSTEM SHALL enforce that each employee in an organization is assigned exactly one role.

THE SYSTEM SHALL prevent an employee from having multiple roles within the same organization.

THE SYSTEM SHALL require the employee:manage permission for role assignment changes.

THE SYSTEM SHALL allow users with the employee:manage permission to assign roles to employees.

THE SYSTEM SHALL allow users with the employee:manage permission to change an employee's role assignment.

WHEN a role is assigned to an employee, THE SYSTEM SHALL grant the employee the permissions of that role immediately.

WHEN an employee's role is changed, THE SYSTEM SHALL remove permissions from the old role and grant permissions from the new role.

THE SYSTEM SHALL allow employees to view their own role assignment.

THE SYSTEM SHALL allow users with the employee:view permission to view role assignments for all employees.

## Contract Operations

Each employee can have multiple contracts that serve as a historical record of their employment terms. Only one contract can be active at any given time. Each contract includes start date, end date (optional for ongoing contracts), pay rate, pay period, working hours per week, and optional notes. Users with employee:manage permission can create contracts for employees. When a new contract is created, the system automatically ends the previous active contract by setting its end date to the day before the new contract starts. Users with employee:manage permission can edit the current active contract, but past contracts are immutable and cannot be edited. Employees can view their own contracts, and users with employee:view permission can view any employee's contracts.

### Contract Creation and Auto-Termination

Users with employee:manage permission can create a contract for an employee. Each contract must include a start date, pay rate, pay period, and working hours per week. An end date and notes are optional.

When a new contract is created for an employee who already has an active contract, the system automatically ends the previous active contract by setting its end date to the day before the new contract's start date. This ensures only one contract remains active at any time.

A contract includes the following information:
- Start date (required)
- End date (optional, null indicates an ongoing contract)
- Pay rate (required, numeric value)
- Pay period (required: hourly, daily, weekly, or monthly)
- Working hours per week (required)
- Notes (optional)

Employees can have multiple contracts over time, serving as a historical record of their employment terms.

### Contract Editing and Immutability

Users with employee:manage permission can edit the current active contract for an employee. Changes to the active contract take effect immediately.

Past contracts (those with an end date set) are immutable and cannot be edited. This preserves the historical record of employment terms as they were at the time.

Only one contract per employee can be active at any given time. An active contract is identified by having no end date set.

### Contract Viewing and Access

Employees can view all contracts associated with their own employee record, including both active and historical contracts.

Users with employee:view permission can view all contracts for any employee within the organization. This includes active contracts and historical contract records.

Contract viewing does not require employee:manage permission; employee:view permission is sufficient to browse contract information.

## Department Operations

Each organization can have departments to organize employees structurally. Each department has a name, description, and optional parent department supporting one level of nesting. Users with org:manage permission can create new departments, edit existing ones, and delete departments. When a department is deleted, the employees assigned to it have their department set to null, but the employees themselves are not deleted. Employees can view the list of departments in their organization to understand the organizational structure.

### Department Creation

Users with `org:manage` permission can create new departments within their organization.

A department requires a name. A description is optional.

A department can be assigned a parent department to establish hierarchical structure. Only one level of nesting is supported — a department cannot have a parent that already has a parent.

When creating a department, the system validates that:
- The parent department (if specified) exists in the organization
- The parent department is not the department being created (preventing self-reference)
- The parent department does not already have a parent (enforcing one-level nesting)

The department is immediately available for assignment to employees and for use as a parent for other departments.

### Department Editing

Users with `org:manage` permission can edit existing department records.

Editable attributes include:
- Department name
- Department description
- Parent department assignment

When changing a department's parent, the system validates:
- The new parent exists in the organization
- The new parent is not the department itself
- The new parent does not already have a parent (maintaining one-level nesting)

Changing a department's parent updates the organizational structure immediately. All employees assigned to this department retain their department assignment.

### Department Deletion

Users with `org:manage` permission can delete departments from the organization.

When a department is deleted:
- The department record is permanently removed
- All employees assigned to this department have their department set to null
- Employees themselves are not deleted or deactivated
- Employee records, contracts, timelogs, and timesheets are preserved

Deleting a department does not prevent deletion of sub-departments. Each department must be deleted individually.

### Department Viewing and Organizational Structure

Users with `employee:view` permission can view the list of departments in their organization. The department list shows:
- Department name
- Department description
- Parent department (if any)

This allows employees to understand the organizational structure without requiring `org:manage` permission.

Organizations use departments to structure employees hierarchically. The department hierarchy supports one level of nesting:
- Root departments have no parent
- Child departments have exactly one parent
- A department cannot be both a root and a child

Employees are assigned to at most one department at a time. An employee's department assignment is optional.

## Project Operations

Users with project:manage permission can create projects with a name, optional description, required color code for UI display, status, optional budget hours, and optional start and end dates. Projects have three possible statuses: active, archived, and completed. Users with project:manage permission can edit project details, archive projects, or mark them as completed. Archived and completed projects cannot receive new timelogs, but existing timelogs are preserved. Projects can only be deleted if they have no timelogs associated with them. Users with project:view permission can view all projects. The project list is paginated and can be filtered by status.

### Project Creation

Users with `project:manage` permission can create a new project within their organization. A project requires a name and a color code for visual identification in the user interface. An optional description may be provided to explain the project's purpose. Users may optionally specify budget hours to estimate the total effort expected for the project. Start date and end date may be set to define the project timeline. The project is initially created with an "active" status. If the project name is missing, the creation request is rejected. If the color code is missing, the creation request is rejected.

### Project Editing

Users with `project:manage` permission can modify an existing project's details. Users can change the project name, description, color code, budget hours, start date, and end date. Users with `project:manage` permission can change a project's status between active, archived, and completed. When a project is archived, it transitions from active status to archived status. When a project is marked as completed, it transitions from active or archived status to completed status. If the project name is updated to a missing value, the update is rejected. If the color code is updated to a missing value, the update is rejected.

### Project Archiving and Completion

Archiving a project changes its status to "archived". A project can be archived by users with `project:manage` permission. Once archived, the project cannot receive new timelogs. Existing timelogs on the archived project are preserved and remain visible. A completed project cannot receive new timelogs. A completed project cannot be reactivated to active status. Archived projects can be reactivated to active status by users with `project:manage` permission. Completed projects can be changed back to active status by users with `project:manage` permission.

### Project Deletion

Users with `project:manage` permission can delete a project only if the project has no timelogs associated with it. If any timelog exists for the project, the deletion request is rejected. When a project is deleted, all associated tasks are also deleted. When a project is deleted, all project member assignments for that project are removed. Project deletion does not affect employee records or their other project assignments. Timelogs that were associated with the deleted project are also permanently deleted.

### Project List and Browsing

Users with `project:view` permission can view all projects within their organization. The project list displays project name, description, color code, status, budget hours, start date, and end date. The project list is paginated to support browsing large numbers of projects. Users can navigate through pages to view all projects. Users with `project:view` permission can filter the project list by status (active, archived, completed). Users can view the total count of projects matching their filter criteria.

## ProjectMember Operations

Users with project:manage permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership record contains the employee, project, and assigned role which is either member or project-lead. Project leads have the ability to manage tasks within their assigned project. Users with project:manage permission can remove employees from projects. Employees can view which projects they are assigned to, allowing them to see their project responsibilities.

### Employee Project Assignment

Users with project management permission can assign employees to projects.

WHEN a user with project management permission assigns an employee to a project, THE SYSTEM SHALL create a project membership linking the employee to the project.

An employee can be assigned to multiple projects simultaneously. Each project membership is independent.

WHEN an employee is already assigned to the same project, THE SYSTEM SHALL reject the assignment request.

WHEN the employee does not exist in the organization, THE SYSTEM SHALL reject the assignment request.

WHEN the project does not belong to the organization, THE SYSTEM SHALL reject the assignment request.

Employees can be assigned to projects regardless of their employment status. Deactivated employees retain their project memberships but have restricted access to project features.

### Project Membership Structure

Each project membership contains the employee, the project, and an assigned role.

The role is either member or project-lead. An employee can have different roles in different projects within the same organization.

WHEN an employee is assigned to a project, THE SYSTEM SHALL create a project membership with the specified role.

WHEN a user with project management permission views a project, THE SYSTEM SHALL display all project memberships for that project.

WHEN an employee views their own profile, THE SYSTEM SHALL display all projects they are assigned to.

The project membership persists until the employee is removed from the project or the project is deleted.

### Project Lead Privileges

Project leads can manage tasks within their assigned project.

WHEN a project lead creates a task in their project, THE SYSTEM SHALL allow the task to be created.

WHEN a project lead edits a task in their project, THE SYSTEM SHALL allow the task to be updated.

WHEN a project lead assigns a task to another project member, THE SYSTEM SHALL allow the assignment.

Users with project management permission can also manage tasks in any project, regardless of their project membership role. This includes creating, editing, and deleting tasks.

Project leads cannot modify project settings, add or remove project members, or change the project status. These operations require project management permission.

WHEN a project lead attempts to modify project settings, THE SYSTEM SHALL reject the request.

WHEN a project lead attempts to remove project members, THE SYSTEM SHALL reject the request.

### Project Membership Management

Users with project management permission can remove employees from projects.

WHEN a user with project management permission removes an employee from a project, THE SYSTEM SHALL delete the project membership.

WHEN an employee is removed from a project, THE SYSTEM SHALL preserve any tasks assigned to them in that project. The tasks remain in the project but are no longer assigned to that employee.

WHEN a project lead is removed from a project, THE SYSTEM SHALL preserve any tasks they created. The tasks retain their status and other attributes. No tasks are automatically reassigned.

WHEN an employee is removed from a project, THE SYSTEM SHALL notify the employee of the removal.

Users with project management permission can view all current project memberships for any project.

### Assigned Projects Viewing

Employees can view which projects they are assigned to.

WHEN an employee views their assigned projects, THE SYSTEM SHALL display the project name, the employee's role in the project, and the project status.

WHEN an employee views tasks within their assigned projects, THE SYSTEM SHALL display only the tasks in projects where they are current project members.

The assigned projects list supports pagination.

WHEN an employee filters their assigned projects by status, THE SYSTEM SHALL display only projects matching the selected status.

WHEN an employee searches their assigned projects by project name, THE SYSTEM SHALL display projects matching the search term.

## Task Operations

Project leads or users with project:manage permission can create tasks within a project. Each task has a title, optional description, status, priority, optional estimated hours, optional due date, optional assigned employee, and optional parent task for subtasks. Tasks support one level of nesting for subtasks. Project leads can edit tasks in their project, while users with project:manage permission can edit any task. Task status changes are recorded in task history, which includes timestamp, old status, new status, and who made the change. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee, and sorted by due date, priority, or creation date.

### Task Creation

Project leads or users with project:manage permission can create tasks within a project. Each task requires a title. A description, status, priority, estimated hours, due date, assigned employee, and parent task are optional.

When a task is created, it is automatically associated with the project. The assigned employee must be a member of the project. The parent task, if specified, must belong to the same project. Tasks support one level of nesting for subtasks only.

If the title is missing, the task creation is rejected. If the assigned employee is not a member of the project, the task creation is rejected. If the parent task does not belong to the same project, the task creation is rejected.

### Task Editing

Project leads can edit tasks within their assigned projects. Users with project:manage permission can edit any task in any project.

When editing a task, users can modify the description, status, priority, estimated hours, due date, assigned employee, and parent task. The title cannot be changed after creation.

If the user does not have the required permission, the task edit is rejected. If the assigned employee is not a member of the project, the task edit is rejected. If the parent task does not belong to the same project, the task edit is rejected.

### Task Status Change Recording

Task status changes are automatically recorded in task history. Each history entry includes the timestamp of the change, the old status, the new status, and the user who made the change.

Task history is maintained for all status transitions. When a task status changes from open to in-progress, from in-progress to completed, or from completed to closed, the change is recorded. Users can view the complete history of status changes for any task they have access to.

### Task Viewing and Filtering

Employees can view tasks in projects they are assigned to. The task list supports pagination.

Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, or creation date.

If the user is not a member of the project, the task list is not accessible. If the filter criteria are invalid, the request is rejected.

## Timelog Operations

Employees can log time entries called timelogs for their work. Each timelog includes a date, duration in minutes, project (must be a project the employee is assigned to), optional task (must belong to the selected project), optional description, and billable flag defaulting to true. Employees can only create timelogs for themselves. They can edit their own timelogs only if the timelog is not part of an approved timesheet. They can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time:manage permission can edit or delete any employee's timelogs. Users with time:view_all permission can view all employees' timelogs. Employees can view their own timelogs. Timelogs are paginated and can be filtered by date range, project, task, and billable status. Employees can also use a live timer to track time in real-time, starting and stopping the timer to automatically create timelogs with calculated duration rounded to the nearest minute. The timer can be discarded without creating a timelog, and employees can view and edit their currently running timer.

### Timelog Creation

Employees can create time entries called timelogs to record work performed. Each timelog must include:

- A date indicating when the work was performed (required)
- Duration in minutes indicating how long the work took (required)
- A project the employee is assigned to (required)
- An optional task that belongs to the selected project
- An optional description of what was done
- A billable flag indicating whether the time is billable (defaults to true)

Employees can only create timelogs for themselves. They cannot create timelogs on behalf of other employees.

The system validates that:
- The selected project is one the employee is assigned to
- If a task is specified, it belongs to the selected project

If the project validation fails, the timelog creation is rejected. If the task validation fails, the timelog creation is rejected.

### Timelog Editing and Deletion

Employees can edit their own timelogs under the following conditions:

- The timelog is not part of an approved timesheet

Employees can delete their own timelogs under the following conditions:

- The timelog is not part of any submitted timesheet
- The timelog is not part of any approved timesheet

Users with the time:manage permission can edit or delete any employee's timelogs regardless of timesheet status.

When a timelog is part of an approved timesheet, it becomes locked and cannot be edited or deleted by employees. When a timelog is part of a submitted timesheet (but not yet approved), it cannot be deleted but may be editable depending on approval workflow state.

If an employee attempts to edit a timelog in an approved timesheet, the request is rejected. If an employee attempts to delete a timelog in a submitted or approved timesheet, the request is rejected.

### Timelog Viewing and Filtering

Employees can view their own timelogs. The timelog list is paginated to support browsing large volumes of entries.

Employees with the time:view_all permission can view all employees' timelogs across the organization.

Timelogs can be filtered by the following criteria:

- Date range: filter timelogs within a specified start and end date
- Project: filter timelogs for a specific project
- Task: filter timelogs for a specific task
- Billable status: filter timelogs by billable or non-billable flag

Multiple filters can be combined. For example, an employee can view all billable timelogs for a specific project within a date range.

Users with the time:manage permission can view, edit, and delete any employee's timelogs, in addition to the viewing capabilities of time:view_all.

### Live Timer Operations

Employees can start a live timer to track time in real-time. When starting a timer, the employee must select a project. An optional task from that project can also be selected. An optional description can be provided.

Each employee can have at most one active timer at a time. If a timer is already running, starting a new timer is not permitted.

Employees can stop their running timer. When stopped, the system creates a timelog with:

- The current date as the timelog date
- Duration calculated from timer start to stop time, rounded to the nearest minute
- The selected project (and optional task)
- The provided description
- Billable flag set to true by default

Employees can discard their running timer without creating a timelog. Discarding simply stops the timer with no record created.

Employees can view their currently running timer, including the start time, selected project, task, and description.

Employees can edit the description and the selected project or task of a running timer before stopping it. The start time remains unchanged.

## Timesheet Operations

A timesheet is a collection of timelogs for a specific week from Monday to Sunday. Employees submit timesheets for approval. Each timesheet contains the employee owner, week start date, week end date, status, total hours calculated from included timelogs, submitted at timestamp, reviewed at timestamp, reviewed by user, and rejection reason when rejected. Employees can create a draft timesheet for a specific week, which automatically includes all timelogs for that employee in that week. They can add or remove timelogs from a draft timesheet. Employees can submit a draft timesheet for approval, but cannot submit if it has no timelogs or if another timesheet for the same week is already submitted or approved. Users with time:approve permission can view all submitted timesheets, approve them, or reject them with a reason. Approved timesheets lock all included timelogs so they cannot be edited or deleted. Rejected timesheets return to draft status, allowing the employee to modify and resubmit. Employees can view their own timesheets, which are paginated and can be filtered by status and date range.

### Timesheet Structure

A timesheet is a weekly collection of time entries for an employee. Each timesheet covers a week from Monday to Sunday.

Each timesheet contains:
- The employee who owns the timesheet
- Week start date (Monday)
- Week end date (Sunday)
- Status (draft, submitted, approved, or rejected)
- Total hours calculated from all included timelogs
- Submitted at timestamp (when submitted for approval)
- Reviewed at timestamp (when approved or rejected)
- Reviewed by user (the approver who approved or rejected)
- Rejection reason (text, required when rejected)

The total hours are automatically calculated by summing all timelogs included in the timesheet.

### Draft Timesheet Creation

Employees can create a draft timesheet for a specific week.

When a draft timesheet is created, the system automatically includes all timelogs that belong to the employee for that week.

Employees can add additional timelogs to a draft timesheet.

Employees can remove timelogs from a draft timesheet.

### Timesheet Submission

WHEN an employee submits a draft timesheet for approval, THE system SHALL validate the submission conditions.

A timesheet cannot be submitted if it contains no timelogs.

A timesheet cannot be submitted if another timesheet for the same week already exists in submitted or approved status.

WHEN a draft timesheet is submitted, THE system SHALL record the submitted at timestamp and change the status to submitted.

### Timesheet Approval and Rejection

Users with time:approve permission can view all submitted timesheets in the organization.

WHEN a user with time:approve permission approves a submitted timesheet, THE system SHALL record the reviewed at timestamp, record the reviewed by user, and change the status to approved.

WHEN a user with time:approve permission rejects a submitted timesheet, THE system SHALL require a rejection reason, record the reviewed at timestamp, record the reviewed by user, and change the status to rejected.

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in the timesheet so they cannot be edited or deleted.

### Rejected Timesheet Handling

WHEN a timesheet is rejected, THE system SHALL return the timesheet to draft status.

Employees can modify a rejected timesheet that has returned to draft status.

Employees can resubmit a rejected timesheet after modifying it, subject to the same submission conditions.

### Timesheet Viewing and Filtering

Employees can view their own timesheets.

The timesheet list is paginated.

Timesheets can be filtered by status.

Timesheets can be filtered by date range.

## ActivityLog Operations

The system records significant actions as activity log entries for audit purposes. Each activity log entry includes a timestamp, the user who performed the action, action type, target entity, and details about the action. Logged actions include employee invitations, deactivations, and reactivations, contract creation and editing, project creation, archiving, completion, and deletion, task status changes, timesheet submissions, approvals, and rejections, and role assignments or changes. Users with org:manage permission can view the full activity log. The activity log is paginated and can be filtered by action type, user, and date range.

### Activity Log Recording

The system automatically records significant actions as activity log entries for audit purposes. Each activity log entry includes a timestamp, the user who performed the action, the action type, the target entity, and details about the action.

The system records the following action types:

**Employee Actions:**
- Employee invitation
- Employee deactivation
- Employee reactivation

**Contract Actions:**
- Contract creation
- Contract editing

**Project Actions:**
- Project creation
- Project archiving
- Project completion
- Project deletion

**Task Actions:**
- Task status change

**Timesheet Actions:**
- Timesheet submission
- Timesheet approval
- Timesheet rejection

**Role Actions:**
- Role assignment
- Role change

Activity log entries are created automatically when these actions occur. Users cannot manually create, modify, or delete activity log entries.

### Activity Log Viewing and Filtering

Users with the org:manage permission can view the full activity log for their organization. The activity log displays all recorded actions within the organization.

The activity log list is paginated to handle large volumes of entries. Users can navigate through pages to view older or newer entries.

Users can filter the activity log by action type to view only specific types of actions (e.g., only employee-related actions, only project-related actions, or only timesheet-related actions).

Users can filter the activity log by the user who performed the action to see all actions performed by a specific user.

Users can filter the activity log by date range to view actions that occurred within a specific time period.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Organization deletion fails if there are pending timesheets that are neither approved nor rejected. The system blocks deletion when active employee contracts exist. Organization owners must resolve all pending timesheets before deletion is allowed. Owners must either transfer ownership or delete the organization if they are the sole owner before deleting their account. Multi-tenancy isolation prevents users from accessing another organization's data when switching contexts. Organization settings can only be edited by users with org:manage permission. The currency and timezone settings affect all employees within the organization and cannot be changed without considering historical data implications.

### Organization Deletion Constraints

The system SHALL prevent organization deletion when there are pending timesheets in submitted status. The organization owner must resolve all pending timesheets by approving or rejecting them before deletion is allowed.

The system SHALL prevent organization deletion when there are active employee contracts. An active contract is one where the end date is null or in the future. The organization owner must end all active contracts before deletion is allowed.

When an organization is deleted, the system SHALL permanently delete all employees, projects, tasks, timelogs, and timesheets associated with that organization.

When an organization is deleted, the system SHALL preserve the owner's user account but remove the association with the deleted organization.

### Account Deletion Restrictions

The system SHALL prevent a user from deleting their account when they are the sole owner of an organization. The user must either transfer ownership to another member or delete the organization before account deletion is allowed.

When a user deletes their account and they are a member (not owner) of other organizations, the system SHALL mark their employee records in those organizations as deactivated.

When a user deletes their account, the system SHALL preserve the historical data (timelogs, timesheets, contracts) associated with their employee records in other organizations.

### Organization Context and Data Isolation

The system SHALL require users to select an organization context after logging in. All subsequent actions are scoped to the selected organization.

The system SHALL allow users to switch between organizations without logging out. When switching organizations, the system SHALL update the context to the newly selected organization.

The system SHALL prevent users from accessing data belonging to organizations they are not members of. Multi-tenancy isolation enforces that employees in one organization cannot see data from another organization.

The system SHALL enforce organization context on all data access requests. Users who belong to multiple organizations only see data for their currently selected organization.

### Organization Settings Management

The system SHALL restrict organization settings editing to users with org:manage permission. Users without this permission cannot view or modify organization settings.

The system SHALL allow organization owners to edit organization settings including name, description, logo, currency, timezone, and fiscal start month.

The system SHALL warn organization owners when changing currency or timezone settings, as these changes affect all employees within the organization and may have historical data implications.

The system SHALL apply currency and timezone settings to all employees within the organization. Changes to these settings affect time tracking calculations and reporting for the entire organization.

## User Error Scenarios

Users cannot delete their account if they are the sole owner of an organization without transferring ownership first. When a user account is deleted, their employee records in other organizations are marked as deactivated but historical data is preserved. Users must select an organization context after login before performing any organization-scoped actions. Password changes require the current password to be verified. Users logging in with an email that has pending invitations are automatically added to those organizations. Email authentication failures prevent account access until credentials are corrected.

### Sole Owner Account Deletion

Users who are the sole owner of an organization cannot delete their account without first transferring ownership to another employee. The system must verify that at least one other active employee exists in the organization before allowing account deletion. If the user is the sole owner, the system must require them to either transfer ownership to another employee or delete the organization itself. When ownership is transferred, the new owner assumes full administrative rights. The original user's employee record is then deactivated in that organization upon account deletion.

### Account Deletion and Employee Records

When a user deletes their account, their employee records in all other organizations are marked as deactivated rather than removed. Historical data including timelogs, timesheets, contracts, and task assignments is preserved for audit and reporting purposes. The deactivated employee records remain visible in the organization's employee list but the user cannot log in or perform any actions. Organization owners and users with employee:view permission can still view the deactivated employee's historical data. The user's global profile data is removed from the system upon account deletion.

### Organization Context After Login

After successful login, users must select an organization context before performing any organization-scoped actions. The system does not allow access to employee management, project operations, time tracking, or timesheet functions until an organization context is established. Users can switch between organizations they belong to without logging out. Each organization context is isolated, and data from one organization is not accessible when working in another organization's context. Session data is scoped to the selected organization.

### Password Change Verification

Password changes require verification of the current password before accepting a new password. The system must validate that the provided current password matches the stored credentials before allowing the password to be updated. If the current password is incorrect, the password change request is rejected and the user must retry with the correct current password. The new password must meet the system's password requirements. After successful password change, the user must log in again with the new password.

### Pending Invitation Auto-Join

When a user signs up with an email address that has pending invitations, the system automatically adds the user to all organizations that sent invitations to that email. The user's employee records are created in each organization with the role specified in the invitation. Pending invitations are consumed upon successful account creation. Users do not need to manually accept invitations if they create an account with the invited email address. The user can then select any of these organizations as their working context after login.

### Email Authentication Failures

Email authentication failures occur when users provide incorrect email or password credentials. The system must reject login attempts with invalid credentials without revealing which part of the credentials was incorrect. Multiple failed authentication attempts do not lock the account but the user must provide correct credentials to gain access. Users who forget their password must use the password reset flow rather than attempting repeated login. Authentication failures are recorded in the activity log for security monitoring.

### Multi-Organization Membership

Users can belong to multiple organizations simultaneously with separate employee records in each organization. Each organization maintains independent employee records with potentially different roles, departments, positions, and contracts. Users can switch between organization contexts without logging out, and all actions are scoped to the currently selected organization. Data isolation is enforced so users cannot access another organization's data while working in a different organization's context. The user's global profile remains consistent across all organizations.

## Employee Error Scenarios

Employees cannot log time or submit timesheets when their status is deactivated. Invitations to emails that already have accounts add the user to the organization instead of creating duplicate records. Employee records can only be edited by users with employee:manage permission. Deactivated employees' historical timelogs and timesheets remain accessible for reporting. Reactivating an employee restores their ability to track time and submit timesheets. Department and position edits require employee:manage permission. Employment type changes affect contract calculations and must be validated against existing contracts.

### Deactivated Employee Time Logging Blocked

When an employee's status is deactivated, the system SHALL prevent them from logging new time entries.
When an employee's status is deactivated, the system SHALL prevent them from submitting timesheets for approval.
Deactivated employees can still view their historical timelogs and timesheets from before deactivation.
Deactivated employees cannot start a new timer for time tracking.
If a deactivated employee attempts to log time, the system SHALL reject the request and display an error message indicating their account is deactivated.
If a deactivated employee attempts to submit a timesheet, the system SHALL reject the request and display an error message indicating their account is deactivated.

### Invitation Email Existing Account Handling

When an invitation is sent to an email address that already has a user account, the system SHALL add the existing user to the organization instead of creating a duplicate account.
When an invitation is sent to an email address without an existing account, the system SHALL create a pending invitation record.
When a user signs up with an email address that has a pending invitation, the system SHALL automatically add them to the organization associated with the pending invitation.
Pending invitations remain valid until the user signs up or the invitation is cancelled by the organization.
If the same email is invited to multiple organizations, the user will be added to all pending organizations upon sign-up.

### Employee Manage Permission Required for Editing

Only users with the employee:manage permission SHALL be able to edit employee records including department, position, and employment type.
Only users with the employee:manage permission SHALL be able to deactivate an employee.
Only users with the employee:manage permission SHALL be able to reactivate a deactivated employee.
Only users with the employee:manage permission SHALL be able to assign or change an employee's role within the organization.
Users without employee:manage permission SHALL receive an error when attempting to edit employee records.
Users with only employee:view permission SHALL be able to view employee records but cannot modify them.

### Deactivated Employee Historical Data Preserved

When an employee is deactivated, their historical timelogs SHALL remain preserved and accessible for reporting purposes.
When an employee is deactivated, their historical timesheets SHALL remain preserved and accessible for reporting purposes.
When an employee is deactivated, their contract records SHALL remain preserved and viewable.
When an employee is deactivated, their project memberships SHALL remain preserved for historical accuracy.
When an employee is deactivated, their task assignments SHALL remain visible in task history.
Deactivation SHALL not delete or modify any historical data created by the employee before deactivation.

### Employee Reactivation Time Logging Restored

When a deactivated employee is reactivated, the system SHALL restore their ability to log time entries.
When a deactivated employee is reactivated, the system SHALL restore their ability to submit timesheets for approval.
When a deactivated employee is reactivated, the system SHALL restore their ability to start a timer for time tracking.
Reactivation SHALL not modify any historical timelogs or timesheets created before deactivation.
Reactivation SHALL restore the employee to their previous role and project assignments.
Only users with employee:manage permission SHALL be able to reactivate a deactivated employee.

### Department Position Edit Permission Required

Only users with employee:manage permission SHALL be able to change an employee's department.
Only users with employee:manage permission SHALL be able to change an employee's position or title.
Only users with employee:manage permission SHALL be able to change an employee's employment type.
When an employee's department is changed, the change SHALL be recorded in the activity log.
When an employee's position is changed, the change SHALL be recorded in the activity log.
When an employee's employment type is changed, the system SHALL validate that existing contracts are compatible with the new employment type.

### Employment Type Contract Validation

When an employee's employment type is changed, the system SHALL validate that all active contracts are compatible with the new employment type.
When a new contract is created, the system SHALL validate that no other contract is currently active for the same employee.
When a new contract is created with a start date, the system SHALL automatically end any previously active contract by setting its end date to the day before the new start date.
When editing an active contract, the system SHALL validate that the start date does not create an overlap with other contracts.
Past contracts SHALL be immutable and cannot be edited or deleted.
Contract changes SHALL be recorded in the activity log with the previous and new values.

## Role Error Scenarios

Custom roles cannot be deleted if any employees are assigned to them. Built-in roles (Owner, Manager, Employee) cannot be deleted or renamed. Role assignment changes require employee:manage permission. Permission conflicts may arise when custom roles are created with overlapping permissions to built-in roles. Users cannot be assigned roles they do not have permission to assign. Role changes affect all employee operations immediately and may invalidate pending actions like timesheet submissions.

### Custom Role Deletion Constraints

Custom roles can be deleted by organization owners only if no employees are assigned to them.

If any employee in the organization has the custom role assigned, the deletion request is rejected.

The system must check all employee records in the organization before allowing custom role deletion.

When deletion is blocked due to assigned employees, the organization owner is informed that employees must be reassigned to a different role before deletion.

Employees assigned to the custom role retain their access until reassigned to a different role.

### Built-in Role Protection

The three built-in roles (Owner, Manager, Employee) are immutable and cannot be deleted or renamed.

Organization owners cannot delete built-in roles through any operation.

Organization owners cannot rename built-in roles to prevent confusion with custom roles.

Built-in role permissions cannot be modified or removed.

Built-in roles are automatically created when an organization is established and persist for the organization's lifetime.

Custom roles created by organization owners can be deleted following the constraints defined in Custom Role Deletion Constraints.

### Role Assignment Operations

Role assignment and reassignment operations require the employee:manage permission.

Users without employee:manage permission cannot assign roles to employees.

Users without employee:manage permission cannot change an employee's role assignment.

Users without employee:manage permission cannot view role assignment options for other employees.

When a user with employee:manage permission assigns a role to an employee, the system validates that the target role exists within the organization.

Role assignment changes take effect immediately upon successful completion.

The system records role assignment changes in the activity log with timestamp, user who performed the change, and affected employee.

### Custom Role Permission Management

Custom roles may be created with permission sets that overlap with built-in role permissions.

The system allows custom roles to have permission combinations that include permissions from multiple built-in roles.

When a custom role is created with permissions that duplicate built-in role capabilities, no conflict is raised.

Permission overlap between custom roles and built-in roles does not prevent custom role creation or assignment.

Organization owners are responsible for ensuring custom role permission sets align with organizational needs.

Custom roles can be edited to add or remove permissions, but built-in roles remain unchanged.

### Role Change Immediate Impact

Role assignment changes affect all employee operations immediately after the change is applied.

Pending actions initiated by the employee under their previous role may be affected by the role change.

If an employee's role is changed from a role with time:approve permission to a role without it, any timesheets they submitted for approval remain in submitted status but they cannot approve new timesheets.

If an employee's role is changed from a role with project:manage permission to a role without it, any tasks they created remain but they cannot create new tasks or edit existing ones.

Timesheet submissions made while the employee had approval permissions remain valid and do not require re-approval.

The system does not automatically invalidate or rollback pending operations when role changes occur.

Employees and managers should be aware that role changes have immediate effect on available operations.

## Contract Error Scenarios

Only one contract can be active for an employee at any time. Creating a new contract automatically ends the previous active contract with an end date one day before the new start date. Past contracts cannot be edited as they form an immutable historical record. Contract start dates must not overlap with existing active contracts. Pay rate and pay period are required fields that cannot be left empty. Working hours per week must be a positive numeric value. Contract edits by users without employee:manage permission are rejected.

### Single Active Contract Rule

THE system SHALL enforce that each employee has at most one active contract at any time. An active contract is defined as a contract with no end date set. WHEN an employee has an active contract, THE system SHALL prevent the creation of any additional active contracts for that employee. Only one contract per employee can be in an active state simultaneously.

### Contract Auto-End on New Creation

WHEN a user with employee:manage permission creates a new contract for an employee, THE system SHALL automatically end the previously active contract. THE system SHALL set the end date of the previous contract to one day before the new contract's start date. This automatic end date assignment ensures continuous employment coverage without overlapping contract periods.

### Historical Contract Immutability

PAST contracts SHALL be preserved as immutable historical records. THE system SHALL prevent any edits to contracts that have an end date in the past. Only the currently active contract (the one with no end date) may be modified by users with employee:manage permission. Historical contract data remains unchanged to maintain accurate employment records.

### Contract Field Validation

THE system SHALL require a pay rate value when creating or editing a contract. THE system SHALL require a pay period selection (hourly, daily, weekly, or monthly) when creating or editing a contract. THE system SHALL require a positive numeric value for working hours per week. THE system SHALL reject contract creation or editing requests if any of these required fields are missing, empty, or invalid.

### Contract Permission Enforcement

ONLY users with the employee:manage permission SHALL be able to create, edit, or deactivate employee contracts. WHEN a user without employee:manage permission attempts to create or edit a contract, THE system SHALL reject the request. EMPLOYEES can view their own contracts. USERS with employee:view permission can view any employee's contracts within their organization.

## Department Error Scenarios

Departments can have at most one level of parent department nesting. Deleting a department sets all employees' department to null rather than deleting employees. Department names must be unique within an organization. Department edits require org:manage permission. Circular parent department references are prevented to avoid infinite loops. Empty departments can be deleted without restrictions. Department descriptions are optional but provide context for organizational structure.

### Department Parent-Nesting Constraints

Departments can have at most one level of parent department nesting. A department cannot be assigned as a parent to another department that already has a parent. If an attempt is made to create a two-level parent chain, the request is rejected.

Circular parent department references are prevented to avoid infinite loops. A department cannot be set as its own parent, directly or indirectly. If an attempt is made to create a circular reference, the request is rejected.

### Department Deletion Behavior

Deleting a department sets all employees' department to null rather than deleting employees. The employees remain in the organization with their department field cleared. This operation does not affect employee contracts, project assignments, or time tracking records.

Empty departments can be deleted without restrictions. A department with no employees assigned can be deleted immediately. The deletion does not require confirmation or additional validation beyond the org:manage permission.

### Department Name Uniqueness Validation

Department names must be unique within an organization. Two departments in the same organization cannot have the same name. If an attempt is made to create a department with a duplicate name, the request is rejected.

Department name uniqueness is enforced at the organization level. The same department name can exist in different organizations without conflict.

### Department Management Permissions

Department edits require org:manage permission. Users without this permission cannot create, edit, or delete departments. This includes changing the department name, description, or parent department assignment.

Only users with org:manage permission can modify department structure. Regular employees, managers without this permission, and users with other custom roles cannot perform department management operations.

### Department Description Handling

Department descriptions are optional but provide context for organizational structure. A department can be created without a description. If a description is provided, it is stored and displayed but not validated for content or length.

Omitting a department description does not prevent department creation or editing. The system accepts departments with or without descriptions without requiring either option.

## Project Error Scenarios

Projects cannot be deleted if they have any timelogs associated with them. Archived and completed projects cannot receive new timelogs. Project color codes are required for UI display. Project status changes from active to archived or completed require project:manage permission. Budget hours are optional but affect project budget reports. Project start and end dates must be valid calendar dates. Deleting a project without timelogs permanently removes all associated tasks and project members.

### Project Deletion Validation

Users with `project:manage` permission can delete a project only if it has no timelogs associated with it. If any timelogs exist for the project, the deletion request is rejected. When a project is deleted without timelogs, all associated tasks and project members are permanently removed from the system. This cascade deletion is irreversible.

### Project Status Transition Rules

Users with `project:manage` permission can change a project status from active to archived or completed. Archived or completed projects cannot receive new timelogs. Any attempt to log time against an archived or completed project is rejected. Existing timelogs on archived or completed projects are preserved and remain visible in reports. Project status changes require the `project:manage` permission.

### Project Creation and Editing Validation

When creating or editing a project, a color code is required for UI display. Projects without a color code cannot be saved. Project start date and end date, if provided, must be valid calendar dates. If an end date is specified, it must not precede the start date. Invalid date values cause the project creation or update to be rejected.

### Project Budget Hours

Budget hours are optional when creating or editing a project. Projects without budget hours are excluded from the Project Budget Report. When budget hours are specified, the system tracks actual hours logged against the budget and calculates the percentage consumed. This information is used in the organization dashboard to highlight projects with budget utilization over 80%.

## ProjectMember Error Scenarios

Employees can only be assigned to projects they have access to through their role. Project membership requires both employee and project references. Project leads can manage tasks only within their assigned project. Removing employees from projects requires project:manage permission. Employees can be assigned to multiple projects simultaneously. Project lead role grants task management permissions within that specific project. Membership changes affect employee visibility in project-related features.

### Project Assignment Authorization

Users with project:manage permission can assign employees to projects. The system validates that the employee belongs to the same organization as the project before allowing assignment. If the employee does not belong to the organization, the assignment request is rejected. If the project does not exist or belongs to a different organization, the assignment request is rejected. Users without project:manage permission cannot assign employees to projects, regardless of their other permissions. The system validates the user has project:manage permission before allowing project assignment.

### Project Membership Structure

Project membership requires valid references to both an employee and a project. Each project membership record links one employee to one project. An employee can be assigned to multiple projects simultaneously without restriction. The system validates that both the employee and project references exist before creating a membership. If either reference is invalid or missing, the membership creation is rejected. Each membership includes a role designation of either member or project-lead. Users with project:manage permission can create project memberships.

### Project Lead Task Management Scope

Project leads can manage tasks only within their assigned project. The project-lead role grants permission to create, edit, and manage tasks in that specific project only. Project leads cannot manage tasks in projects where they are assigned as regular members. Users with project:manage permission can manage tasks across all projects in the organization, regardless of project membership. If a project lead attempts to manage a task outside their project, the system rejects the action. The system validates project membership before allowing task management operations.

### Project Membership Removal

Users with project:manage permission can remove employees from any project in the organization. Users without project:manage permission cannot remove employees from projects, even if they are project leads. When an employee is removed from a project, their access to tasks and timelogs for that project is revoked. Historical timelogs and task assignments remain preserved but are no longer visible to the removed employee. The system validates the user has project:manage permission before allowing membership removal. If the user lacks project:manage permission, the removal request is rejected.

### Multiple Project Assignments

Employees can be assigned to multiple projects simultaneously without limitation. Each project membership is independent and does not affect other memberships. An employee can hold different roles in different projects (member or project-lead in each). The system tracks each project membership separately. Removing an employee from one project does not affect their memberships in other projects. Employees can view all projects they are assigned to across the organization. The system does not impose a maximum limit on the number of project assignments per employee.

### Project Lead Task Permissions

The project-lead role grants task management permissions within that specific project. Project leads can create tasks, edit task details, and change task status. Project leads cannot assign tasks to employees who are not members of their project. If a project lead attempts to assign a task to a non-member, the assignment is rejected. The system validates that the assigned employee is a project member before allowing task assignment. Users with project:manage permission can manage all tasks across all projects.

### Membership Change Feature Visibility Impact

Membership changes affect employee visibility in project-related features. When an employee is assigned to a project, they gain visibility to that project's tasks and can log time against it. When an employee is removed from a project, they lose visibility to project tasks and cannot create new timelogs for that project. Existing timelogs on the project remain preserved in historical records. Task assignments to removed employees are preserved but the employee can no longer update those tasks. Project membership changes take effect immediately upon completion. The system updates feature visibility immediately after membership changes are processed.

## Task Error Scenarios

Tasks cannot be created in projects where the user is not a member or lacks project:manage permission. Task status transitions follow defined workflows and invalid transitions are rejected. Assigned employees must be project members. Parent task references create one-level nesting only and cannot create circular dependencies. Task due dates must be valid calendar dates. Priority values are limited to low, medium, high, and urgent. Task history records all status changes with timestamps and user information.

### Task Creation Validation

WHEN a user attempts to create a task in a project where they are not a member, THE system SHALL reject the request.

WHEN a user attempts to create a task without the project:manage permission, THE system SHALL reject the request.

WHEN a user attempts to create a task with a missing or empty title, THE system SHALL reject the request.

WHEN a user attempts to create a task with an invalid or non-existent project reference, THE system SHALL reject the request.

### Task Status Transition Validation

WHEN a user attempts an invalid status transition outside the defined workflow, THE system SHALL reject the request.

WHEN a user attempts to change task status without appropriate permissions, THE system SHALL reject the request.

WHEN a task status changes, THE system SHALL record the transition in task history with timestamp, old status, new status, and the user who made the change.

### Task Assignment Validation

WHEN a user attempts to assign an employee to a task who is not a member of the task's project, THE system SHALL reject the request.

WHEN a user attempts to assign an employee who is deactivated to a task, THE system SHALL reject the request.

WHEN a user attempts to assign an employee who is not part of the organization to a task, THE system SHALL reject the request.

### Task Nesting Validation

WHEN a user attempts to create more than one level of task nesting (subtask of a subtask), THE system SHALL reject the request.

WHEN a user attempts to create a circular parent-child relationship between tasks, THE system SHALL reject the request.

WHEN a user attempts to set a task as its own parent, THE system SHALL reject the request.

### Task Date and Priority Validation

WHEN a user attempts to create or update a task with an invalid due date format, THE system SHALL reject the request.

WHEN a user attempts to create or update a task with a priority value outside the allowed set (low, medium, high, urgent), THE system SHALL reject the request.

WHEN a user attempts to create or update a task with a non-numeric or negative estimated hours value, THE system SHALL reject the request.

### Task History Integrity

WHEN a task status change occurs, THE system SHALL automatically record it in task history.

WHEN a user attempts to manually create, edit, or delete task history entries, THE system SHALL reject the request.

WHEN a user without project:view permission attempts to access task history, THE system SHALL reject the request.

## Timelog Error Scenarios

Timelogs cannot be created for projects the employee is not assigned to. Tasks in timelogs must belong to the selected project. Employees can only edit their own timelogs unless they have time:manage permission. Timelogs in approved timesheets cannot be edited or deleted. Timelogs in submitted timesheets cannot be deleted. Duration must be a positive value in minutes. Date field is required and must be a valid calendar date. Billable flag defaults to true when not specified.

### Timelog Project Assignment Validation

Employees can only create timelogs for projects they are assigned to. If an employee attempts to log time against a project they are not a member of, the request is rejected. Project membership is verified at the time of timelog creation.

### Timelog Task Project Membership Validation

When a task is specified in a timelog, the task must belong to the selected project. If the task does not exist or does not belong to the project, the request is rejected. This ensures data consistency between projects and their associated tasks.

### Employee Own Timelog Editing Restriction

Employees can only edit their own timelogs. Users with the time:manage permission can edit any employee's timelogs. If an employee attempts to edit another employee's timelog without the time:manage permission, the request is rejected.

### Approved Timesheet Timelog Edit Blocked

Timelogs that are included in an approved timesheet cannot be edited or deleted. When a timesheet is approved, all timelogs within it become locked. If an employee or manager attempts to edit or delete a locked timelog, the request is rejected.

### Submitted Timesheet Timelog Delete Blocked

Timelogs that are included in a submitted timesheet cannot be deleted. While submitted timesheets can be rejected and returned to draft status, the timelogs themselves cannot be deleted while the timesheet is in submitted status. If a deletion is attempted, the request is rejected.

### Timelog Duration Positive Minutes Validation

Timelog duration must be a positive value in minutes. A duration of zero or negative values is rejected. The system validates the duration at the time of creation or update.

### Timelog Date Required Calendar Validation

The timelog date field is required and must be a valid calendar date. If the date is missing, invalid, or not a real calendar date, the request is rejected. The system does not accept future dates beyond reasonable business limits.

## Timesheet Error Scenarios

Timesheets cannot be submitted if they contain no timelogs. Only one timesheet can exist per employee per week in submitted or approved status. Timesheet week boundaries are fixed Monday to Sunday. Rejected timesheets return to draft status and require a rejection reason. Approved timesheets lock all included timelogs from further editing. Timesheet total hours are calculated automatically from included timelogs. Employees cannot submit timesheets for weeks where another timesheet is already submitted or approved.

### Timesheet Submission with Empty Timelogs

Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it contains no timelogs. The system validates that the timesheet has at least one timelog before allowing submission. If the timesheet is empty, the submission request is rejected. The employee must add at least one timelog to the timesheet before submitting it.

### One Timesheet Per Employee Per Week

Each employee can have only one timesheet per week in submitted or approved status. A week is defined as Monday to Sunday. If an employee attempts to submit a timesheet for a week where another timesheet already exists in submitted or approved status, the submission is rejected. The employee must wait until the existing timesheet is approved, rejected, or withdrawn before creating a new timesheet for the same week. Draft timesheets for the same week are allowed, but only one timesheet per week can be in submitted or approved status.

### Timesheet Week Boundaries

Timesheet weeks follow a fixed Monday to Sunday boundary. The week start date is always Monday, and the week end date is always Sunday. When an employee creates a timesheet for a specific date, the system automatically determines the correct week boundaries. Employees cannot create timesheets with custom week boundaries. All timelogs included in a timesheet must fall within the week's Monday to Sunday range.

### Rejected Timesheet Returns to Draft Status

When a timesheet is rejected by a reviewer with the time:approve permission, the timesheet status returns to draft. The reviewer must provide a rejection reason when rejecting a timesheet. The rejection reason is stored with the timesheet and is visible to the employee. The employee can modify the rejected timesheet by adding, removing, or editing timelogs. The employee can resubmit the timesheet after making the necessary changes.

### Approved Timesheet Timelog Lock

When a timesheet is approved by a reviewer with the time:approve permission, all timelogs included in the timesheet become locked. Locked timelogs cannot be edited or deleted by any user, including the employee who created them. Users with the time:manage permission also cannot edit or delete timelogs that are part of an approved timesheet. The timelog lock persists until the timesheet is no longer in approved status (which does not occur under normal operation). This ensures the integrity of approved time records.

### Timesheet Total Hours Calculation

The total hours of a timesheet are calculated automatically from all included timelogs. The system sums the duration of each timelog in the timesheet and displays the total. The total hours are updated whenever timelogs are added or removed from a draft timesheet. The total hours cannot be manually edited by employees or reviewers. The calculated total is displayed on the timesheet for visibility and reporting purposes.

### Timesheet Week Duplicate Submission Prevention

Employees cannot submit a timesheet for a week where another timesheet for the same employee already exists in submitted or approved status. If an employee attempts to submit a timesheet for a week that already has a submitted or approved timesheet, the submission is rejected with an error indicating the duplicate week conflict. The employee must resolve the existing timesheet (by having it approved or rejected) before submitting a new timesheet for that week. This prevents duplicate time records for the same period.

## ActivityLog Error Scenarios

Activity log entries are automatically created for all significant actions and cannot be manually created or deleted. Users without org:manage permission cannot view the full activity log. Activity log filtering requires valid action types, user references, and date ranges. Pagination limits the number of entries returned per request. Activity log entries preserve historical action records even when related entities are deleted. Action types are limited to predefined categories like employee invitation, contract creation, project changes, and timesheet approvals.

### Activity Log Automatic Creation and Immutability

WHEN a significant action occurs in the organization, THE system SHALL automatically create an activity log entry.

THE system SHALL NOT allow users to manually create activity log entries.

THE system SHALL NOT allow users to delete activity log entries.

Activity log entries remain in the system permanently once created.

### Activity Log Access and Permissions

WHEN a user requests to view the activity log, THE system SHALL grant access only if the user has the org:manage permission.

WHEN a user does not have the org:manage permission, THE system SHALL deny access to the activity log.

THE activity log SHALL be scoped to the currently selected organization.

WHEN a user belongs to multiple organizations, THE system SHALL allow viewing only the activity log for the currently selected organization.

### Activity Log Filter Validation

WHEN a user requests activity log filtering by action type, THE system SHALL validate that the action type is one of the predefined categories.

WHEN a user requests activity log filtering by user, THE system SHALL validate that the user exists in the organization.

WHEN a user requests activity log filtering by date range, THE system SHALL validate that the start date is not later than the end date.

WHEN filter parameters are invalid, THE system SHALL reject the request.

### Activity Log Pagination

WHEN activity log entries are retrieved, THE system SHALL return a limited number of entries per page.

THE system SHALL allow users to navigate through pages to view all activity log entries.

WHEN pagination parameters are invalid, THE system SHALL reject the request.

### Activity Log Deleted Entity Preservation

WHEN an employee is deleted, THE system SHALL preserve their activity log entries.

WHEN a project is deleted, THE system SHALL preserve activity log entries related to that project.

WHEN a task is deleted, THE system SHALL preserve activity log entries related to that task.

THE activity log SHALL maintain a complete audit trail regardless of entity deletion.

### Activity Log Predefined Action Types

THE activity log SHALL record only the following action types:
- Employee invited
- Employee deactivated
- Employee reactivated
- Contract created
- Contract edited
- Project created
- Project archived
- Project completed
- Project deleted
- Task status changed
- Timesheet submitted
- Timesheet approved
- Timesheet rejected
- Role assigned
- Role changed

THE system SHALL NOT record action types outside this predefined set.

### Activity Log Historical Record Integrity

WHEN an activity log entry is created, THE system SHALL record the timestamp when the action occurred.

WHEN an activity log entry is created, THE system SHALL record the user who performed the action.

WHEN an activity log entry is created, THE system SHALL record the action type.

WHEN an activity log entry is created, THE system SHALL record the target entity.

WHEN an activity log entry is created, THE system SHALL record details about the action.

THE system SHALL NOT allow modification of activity log entries after creation.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Employee Onboarding and First Week Workflow

This scenario describes the complete journey of a new employee from invitation to submitting their first timesheet.

**Invitation and Account Creation**
- Users with employee:manage permission can invite new employees by email
- If the invited email has no account, a pending invitation is created
- When the invited user signs up with that email, they are automatically added to the pending organization
- If the invited email already has an account, the user is added to the organization immediately

**Employee Record Setup**
- The new employee record is created with the inviting user as reference
- The employee is assigned a role (default: Employee)
- Department and position can be set during or after invitation
- Employment type must be specified (full-time, part-time, contractor, or intern)

**Contract Creation**
- Users with employee:manage permission create the first contract for the employee
- The contract requires start date, pay rate, pay period, and working hours per week
- This becomes the active contract

**Project Assignment**
- Users with project:manage permission assign the employee to projects
- The employee can be assigned a role within each project (member or project-lead)

**First Time Tracking**
- The employee can log time entries for assigned projects
- Each timelog requires date, duration, and project; task and description are optional
- The employee can start a timer for real-time tracking

**First Timesheet Submission**
- The employee creates a draft timesheet for the current week (Monday to Sunday)
- The draft automatically includes all timelogs for that week
- The employee submits the timesheet for approval
- The timesheet enters pending approval status

**Approval and Completion**
- Users with time:approve permission review the submitted timesheet
- The timesheet is approved or rejected with a reason
- If approved, all included timelogs become locked and cannot be edited
- If rejected, the timesheet returns to draft status for revision

### Project Lifecycle and Time Tracking Flow

This scenario describes the complete lifecycle of a project from creation through time tracking to completion.

**Project Creation**
- Users with project:manage permission create a new project
- The project requires a name and color code; description and budget hours are optional
- Start date and end date can be set for planning purposes
- The project status is set to active by default

**Team Assignment**
- Users with project:manage permission assign employees to the project
- Each assignment includes the employee and their role (member or project-lead)
- Project leads gain the ability to manage tasks within the project

**Task Creation and Management**
- Project leads or users with project:manage permission create tasks
- Each task requires a title; description, priority, estimated hours, and due date are optional
- Tasks can be assigned to project members
- Tasks can have one parent task for subtask organization
- Task status progresses through open, in-progress, completed, and closed

**Time Tracking on Project**
- Assigned employees log time against the project
- Timelogs can reference specific tasks within the project
- The timer feature allows real-time tracking with automatic timelog creation upon stop
- Employees can view their own timelogs filtered by project

**Budget Monitoring**
- Users with report:view permission access the project budget report
- The report shows budget hours versus actual hours logged
- Percentage of budget consumed is calculated and displayed
- Projects without budget hours are excluded from this report

**Project Completion**
- Users with project:manage permission change project status to archived or completed
- Archived or completed projects cannot receive new timelogs
- Existing timelogs and task history are preserved
- Projects can only be deleted if no timelogs are associated with them

### Timesheet Submission and Approval Process

This scenario describes the weekly timesheet workflow from time logging through approval.

**Weekly Timelog Collection**
- Employees log time entries throughout the week
- Each timelog records date, duration in minutes, project, and optional task and description
- Timelogs are automatically associated with the employee who created them
- Employees can edit or delete their own timelogs before timesheet submission

**Draft Timesheet Creation**
- Employees create a draft timesheet for a specific week (Monday to Sunday)
- The system automatically includes all timelogs for that employee in that week
- Employees can manually add or remove timelogs from the draft
- Total hours are calculated from included timelogs

**Timesheet Submission**
- Employees submit the draft timesheet for approval
- Submission is blocked if the timesheet has no timelogs
- Submission is blocked if another timesheet for the same week is already submitted or approved
- The timesheet status changes to submitted
- Submitted at timestamp is recorded

**Manager Review**
- Users with time:approve permission view all submitted timesheets
- The reviewer can approve or reject the timesheet
- Review at timestamp and reviewer identity are recorded

**Approval Outcome**
- When approved, the timesheet status changes to approved
- All timelogs included in the approved timesheet are locked
- Locked timelogs cannot be edited or deleted by anyone
- Users with time:manage permission can still edit or delete locked timelogs

**Rejection Outcome**
- When rejected, the timesheet status returns to draft
- A rejection reason must be provided
- The employee can modify the timesheet and resubmit
- The rejection reason is recorded for reference

### Multi-Organization User Experience

This scenario describes how users manage multiple organization memberships and context switching.

**Initial Login**
- Users sign in with email and password
- Upon successful authentication, users see their list of organization memberships
- Users select which organization to work in for the current session
- The selected organization becomes the active context for all subsequent actions

**Organization Context**
- All data operations are scoped to the selected organization
- Employees, projects, tasks, timelogs, and timesheets from other organizations are not visible
- The user's profile (display name, avatar, phone number) is shared across all organizations
- The user's role and permissions are specific to each organization

**Context Switching**
- Users can switch to a different organization without logging out
- The organization context changes immediately
- All data views and operations now reference the new organization
- The user's profile remains unchanged during context switching

**Data Isolation**
- Employees in one organization cannot see or access data from another organization
- Timelogs, timesheets, projects, and tasks are strictly isolated by organization
- Activity logs are scoped to the selected organization
- Reports display data only for the selected organization

**Multi-Organization Permissions**
- A user may have different roles in different organizations (e.g., Owner in one, Employee in another)
- Permissions are evaluated based on the role in the current organization context
- Custom roles and their permissions are defined separately for each organization

**Account Deletion Considerations**
- Users can delete their account if they are not the sole owner of any organization
- If the user is the sole owner of an organization, they must transfer ownership or delete the organization first
- When an account is deleted, employee records in other organizations are marked as deactivated
- Historical data (timelogs, timesheets, contracts) is preserved for deactivated employees

### Organization Setup and Initial Configuration

This scenario describes the initial setup of a new organization from creation to operational readiness.

**Organization Creation**
- During user sign-up, users create their first organization
- The organization requires a name; description, logo, currency, timezone, and fiscal start month are configurable
- The creating user becomes the organization owner with full access

**Role Configuration**
- Three built-in roles exist and cannot be deleted: Owner, Manager, Employee
- The Owner role has full access to all features and can manage roles and members
- The Manager role can manage employees, projects, approve timesheets, and view reports
- The Employee role can track time, submit timesheets, and view their own data
- Organization owners can create custom roles with specific permissions
- Custom roles can be edited or deleted if no employees are assigned

**Department Setup**
- Users with org:manage permission create departments
- Each department has a name and optional description
- Departments can have one parent department for one level of nesting
- Departments help organize employees structurally

**Initial Employee Management**
- The organization owner invites initial employees
- Invitations are sent by email; existing users are added directly, new users receive pending invitations
- Each employee is assigned a role within the organization
- Employment type, department, and position are recorded for each employee
- Contracts are created for employees with pay rate, pay period, and working hours

**Project Initialization**
- Users with project:manage permission create initial projects
- Projects are assigned color codes for visual identification
- Employees are assigned to projects with member or project-lead roles
- Tasks are created within projects for work breakdown

**Operational Readiness**
- Employees can begin logging time once assigned to projects
- Timesheets follow the weekly Monday-to-Sunday cycle
- Users with time:approve permission can review and approve submitted timesheets
- Reports are available for users with report:view permission
- Activity logs capture all significant actions for audit purposes