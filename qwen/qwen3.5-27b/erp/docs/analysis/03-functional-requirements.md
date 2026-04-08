**hrmTimeTrack — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

Users create an organization during initial sign-up with name, description, logo image, currency, timezone, and fiscal start month. Organization owners can edit organization settings at any time. Owners can delete their organization only if all pending timesheets are resolved and there are no active employee contracts. When deleted, all employees, projects, tasks, timelogs, and timesheets are permanently removed while the owner's account remains. The platform supports multiple organizations with each operating independently. Users can belong to multiple organizations and switch between them without logging out. All data is strictly isolated per organization to ensure proper multi-tenancy.

### Organization Creation

THE system SHALL allow users to create an organization during initial sign-up.

THE system SHALL require the following information when creating an organization:
- Organization name
- Organization description
- Logo image
- Currency (e.g., USD, EUR, KRW)
- Timezone
- Fiscal start month

THE system SHALL automatically associate the creating user as the owner of the new organization.

THE system SHALL establish the organization as an independent entity with its own employees, projects, and data.

### Organization Settings Management

THE system SHALL allow organization owners to edit organization settings at any time.

THE system SHALL permit organization owners to update the following organization attributes:
- Organization name
- Organization description
- Logo image
- Currency
- Timezone
- Fiscal start month

THE system SHALL apply organization setting changes immediately to all users within that organization.

THE system SHALL record organization setting changes in the activity log.

### Organization Deletion

THE system SHALL allow organization owners to delete their organization only when specific conditions are met.

THE system SHALL require all pending timesheets to be resolved (approved or rejected) before allowing organization deletion.

THE system SHALL require all active employee contracts to be ended before allowing organization deletion.

WHEN an organization is deleted, THE system SHALL permanently delete all employees associated with that organization.

WHEN an organization is deleted, THE system SHALL permanently delete all projects associated with that organization.

WHEN an organization is deleted, THE system SHALL permanently delete all tasks associated with that organization.

WHEN an organization is deleted, THE system SHALL permanently delete all timelogs associated with that organization.

WHEN an organization is deleted, THE system SHALL permanently delete all timesheets associated with that organization.

WHEN an organization is deleted, THE system SHALL preserve the owner's user account but remove their association with any organization.

THE system SHALL record organization deletion in the activity log.

### Multi-Tenancy Operations

THE system SHALL support multiple organizations operating independently on the platform.

THE system SHALL allow users to belong to multiple organizations simultaneously.

THE system SHALL require users to select which organization to work in when logging in.

THE system SHALL scope all subsequent actions to the selected organization context.

THE system SHALL allow users to switch between organizations without logging out.

THE system SHALL ensure that all data is strictly isolated per organization.

THE system SHALL prevent employees in one organization from viewing or accessing data from another organization.

THE system SHALL ensure that users who belong to multiple organizations only see data for their currently selected organization.

## User Operations

Users sign up with email and password to create their account. Users log in with email and password and can change their password at any time. A user can belong to multiple organizations and must select which organization to work in when logging in. All subsequent actions are scoped to the selected organization context. Users can switch organizations without logging out to access different organizational data. Users can delete their account but if they are the sole owner of an organization, they must transfer ownership or delete the organization first. When a user deletes their account, their employee records in other organizations are marked as deactivated.

### User Registration

THE system SHALL allow guests to create a new user account by providing an email address and password.

THE system SHALL validate that the email address provided during registration is not already associated with an existing user account.

THE system SHALL create a new user account upon successful validation of email and password.

THE system SHALL associate the newly created user account with the organization being created during initial sign-up.

WHEN a user signs up with an email that has a pending organization invitation, THE system SHALL automatically add the user to the pending organizations.

### User Authentication

THE system SHALL allow users to log in by providing their email address and password.

THE system SHALL validate the provided email and password against registered user accounts.

THE system SHALL grant access to the platform upon successful authentication.

THE system SHALL require users to select which organization to work in after successful login when the user belongs to multiple organizations.

THE system SHALL scope all subsequent actions to the selected organization context.

THE system SHALL reject login attempts with invalid email or password credentials.

### Password Management

THE system SHALL allow authenticated users to change their password at any time.

THE system SHALL require users to provide their current password when changing their password.

THE system SHALL require users to provide a new password that meets security requirements.

THE system SHALL update the user's password upon successful validation and confirmation.

THE system SHALL invalidate existing sessions when a password is changed, requiring re-authentication.

### Multi-Organization Membership

THE system SHALL allow a user to belong to multiple organizations simultaneously.

THE system SHALL maintain separate employee records for the same user across different organizations.

THE system SHALL allow users to view the list of organizations they belong to.

THE system SHALL display the user's role and status within each organization.

THE system SHALL maintain organization-specific permissions for each user based on their role assignment in that organization.

### Organization Context Selection

THE system SHALL present a list of organizations for users who belong to multiple organizations upon login.

THE system SHALL require users to select one organization to establish the working context.

THE system SHALL display the currently selected organization to the user.

THE system SHALL restrict data visibility to only the selected organization's data.

THE system SHALL enforce organization context on all user operations and data access requests.

### Organization Switching

THE system SHALL allow authenticated users to switch between organizations without logging out.

THE system SHALL present a list of available organizations for the user to select from.

THE system SHALL update the organization context when a user selects a different organization.

THE system SHALL refresh the user interface to reflect data from the newly selected organization.

THE system SHALL maintain the user's authentication session during organization switching.

THE system SHALL preserve the user's work state when switching organizations and allow return to the previous organization.

### Account Deletion

THE system SHALL allow users to request deletion of their user account.

THE system SHALL prevent account deletion if the user is the sole owner of an organization without resolving the ownership first.

THE system SHALL require users who are sole organization owners to either transfer ownership to another user or delete the organization before account deletion.

THE system SHALL mark employee records as deactivated in all organizations when a user account is deleted.

THE system SHALL preserve historical data including timelogs and timesheets when employee records are deactivated.

THE system SHALL permanently remove the user account and associated profile data upon successful deletion.

THE system SHALL allow users to transfer organization ownership to another eligible user within the same organization.

## UserProfile Operations

Each user has a global profile containing display name, avatar image, and phone number. Users can edit their profile information at any time. The profile is shared across all organizations the user belongs to, providing consistent identity. Profile updates are reflected immediately across all organizational contexts. Users can view their own profile details. The profile serves as the primary identity representation for the user across the platform.

### View User Profile

Users can view their own profile details including display name, avatar image, and phone number.

Users can access their profile information from any organization context.

The profile view shows all current profile attributes in a consolidated view.

Users can view their profile at any time without restrictions.

### Edit User Profile

Users can edit their display name at any time.

Users can upload or change their avatar image.

Users can update their phone number.

Users can modify any combination of profile attributes in a single update.

Profile edits are saved immediately upon submission.

Users can view their updated profile information immediately after saving changes.

The system validates that required profile fields are provided when editing.

Users receive confirmation when profile updates are successfully saved.

### Profile Global Scope

The user profile is global and shared across all organizations the user belongs to.

Profile updates made in one organization context are immediately reflected in all other organization contexts.

Users maintain a single consistent identity across all organizational memberships.

The same display name, avatar image, and phone number appear in every organization the user joins.

Profile changes propagate instantly without requiring re-login or context switching.

Users cannot have different profile information for different organizations.

The global profile serves as the primary identity representation for the user across the entire platform.

## Employee Operations

Users with employee management permission can invite new employees to the organization by email. If the invited email already has an account, the user is added to the organization immediately. If the email has no account, a pending invitation is created and the user is automatically added when they sign up. Each employee record includes role, department, position, employment type, and status. Users with employee management permission can edit employee records including department, position, and employment type. Users can deactivate employees, which prevents them from logging time or submitting timesheets while preserving historical data. Deactivated employees can be reactivated. Users with employee view permission can view the employee list with pagination, filtering by department, employment type, and status, and searching by name.

### Employee Invitation

Users with employee management permission can invite new employees to the organization by providing their email address.

When an invitation is sent to an email that already has a user account, the system automatically adds that user to the organization with the invited role and employee record.

When an invitation is sent to an email without an existing account, the system creates a pending invitation for that user.

When a user signs up with an email that has pending invitations, the system automatically adds them to all organizations with pending invitations and creates their employee records.

The employee record created during invitation includes the assigned role, department (optional), position (optional), employment type, and status.

### Employee Record Updates

Users with employee management permission can edit employee records to update department, position, and employment type.

Users with employee management permission can change an employee's department assignment to a different department or remove the department assignment entirely.

Users with employee management permission can update an employee's position or job title.

Users with employee management permission can change an employee's employment type among full-time, part-time, contractor, or intern.

All changes to employee records are recorded in the activity log for audit purposes.

### Employee Status Management

Users with employee management permission can deactivate employees, which changes their status to deactivated.

When an employee is deactivated, they can no longer log time entries or submit timesheets for approval.

When an employee is deactivated, all their historical data including timelogs, timesheets, and contracts is preserved and remains viewable.

Users with employee management permission can reactivate deactivated employees, restoring their ability to log time and submit timesheets.

When an employee is reactivated, their previous status and permissions are restored.

All deactivation and reactivation actions are recorded in the activity log with timestamp and the user who performed the action.

### Employee List Viewing

Users with employee view permission can view the list of all employees in the organization.

The employee list displays pagination to handle large numbers of employees.

Users can filter the employee list by department to show only employees in a specific department.

Users can filter the employee list by employment type to show only full-time, part-time, contractor, or intern employees.

Users can filter the employee list by status to show only active or deactivated employees.

Users can search the employee list by name to find specific employees.

Users can combine multiple filters and search to narrow down the employee list results.

The employee list shows each employee's name, role, department, position, employment type, and status.

## EmployeeContract Operations

Each employee can have multiple contracts as a historical record with only one active contract at a time. Each contract includes start date, end date, pay rate, pay period, working hours per week, and optional notes. Users with employee management permission can create contracts for employees. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts. Users with employee management permission can edit the current active contract. Past contracts cannot be edited and serve as immutable historical records. Employees can view their own contracts. Users with employee view permission can view any employee's contracts.

### Create Employee Contract

WHEN a user with employee management permission creates a contract for an employee, THE system SHALL record the contract with a start date, pay rate, pay period, and working hours per week.

WHEN a user creates a contract, THE system SHALL require a start date as a mandatory field.

WHEN a user creates a contract, THE system SHALL require a pay rate as a mandatory numeric value.

WHEN a user creates a contract, THE system SHALL require selection of a pay period from hourly, daily, weekly, or monthly options.

WHEN a user creates a contract, THE system SHALL require working hours per week as a mandatory numeric value.

WHERE a user creates a contract, THE system SHALL allow an optional end date to be specified.

WHERE a user creates a contract, THE system SHALL allow optional notes to be added.

WHEN a user creates a new contract for an employee who has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date.

### Active Contract Enforcement

WHILE an employee has an active contract, THE system SHALL maintain only one active contract at any given time.

WHEN a new contract is created for an employee with an existing active contract, THE system SHALL automatically transition the previous contract to ended status.

WHEN the system automatically ends a previous contract, THE system SHALL preserve it as an immutable historical record.

WHEN a user views an employee's contracts, THE system SHALL clearly indicate which contract is currently active.

WHEN a user creates a contract without specifying an end date, THE system SHALL treat the contract as ongoing until explicitly ended or replaced.

### Edit Active Contract

WHEN a user with employee management permission edits an active contract, THE system SHALL allow modification of the pay rate, pay period, working hours per week, and notes.

WHEN a user edits an active contract, THE system SHALL allow extension of the end date if one was previously set.

WHEN a user edits an active contract, THE system SHALL preserve the original start date without allowing changes.

WHEN a user attempts to edit a past contract, THE system SHALL reject the request and maintain the contract as an immutable historical record.

WHEN a user attempts to edit a contract that has already ended, THE system SHALL reject the request to preserve historical accuracy.

### View Employee Contracts

WHEN an employee views their own contracts, THE system SHALL display all their contracts including active and historical records.

WHEN an employee views their contracts, THE system SHALL show the start date, end date, pay rate, pay period, and working hours per week for each contract.

WHEN a user with employee view permission views any employee's contracts, THE system SHALL display all contracts for that employee.

WHEN a user views contracts, THE system SHALL indicate the current status of each contract as active or ended.

WHEN a user views contracts, THE system SHALL display any notes associated with each contract.

WHEN a user views multiple contracts for the same employee, THE system SHALL present them in chronological order by start date.

## Department Operations

Each organization can have departments with name, description, and optional parent department for one level of nesting. Users with organization management permission can create, edit, and delete departments. When a department is deleted, all employees in that department have their department set to null without deleting the employees themselves. Employees can view the list of departments in their organization. Departments provide organizational structure for employee grouping and reporting purposes.

### Department Creation

Users with organization management permission can create a new department within their organization.

A department must have a name and may optionally include a description.

When creating a department, users may optionally assign it as a child department to an existing parent department, allowing one level of department nesting.

A department cannot have a parent department that is itself a child department (only one level of nesting is supported).

If the department name is missing, the creation request is rejected.

If the parent department specified does not exist, the creation request is rejected.

If the parent department already has a child department, the creation request is rejected (only one child department per parent is allowed).

When a department is successfully created, the action is recorded in the activity log.

### Department Editing

Users with organization management permission can edit the details of an existing department.

Users can update the department name.

Users can update the department description.

Users can change the parent department assignment, provided the new parent department exists and does not already have a child department.

Users can remove the parent department assignment by setting it to null.

If the new department name is missing, the edit request is rejected.

If the new parent department does not exist, the edit request is rejected.

If the new parent department already has a child department, the edit request is rejected.

If the new parent department is the same as the current parent department, the change is ignored.

When a department is successfully edited, the action is recorded in the activity log.

### Department Deletion

Users with organization management permission can delete an existing department.

When a department is deleted, all employees currently assigned to that department have their department assignment set to null.

Deleting a department does not delete the employees themselves; only their department assignment is removed.

If the department has a child department, the deletion request is rejected (child departments must be deleted or re-parented first).

When a department is successfully deleted, the action is recorded in the activity log.

When employees have their department set to null due to department deletion, this change is recorded in the activity log.

### Department Listing and Viewing

Employees can view the list of all departments in their organization.

The department list displays the name and description of each department.

The department list shows the parent-child relationship between departments.

The department list is paginated to handle large numbers of departments.

Users can filter the department list by parent department.

Users can search for departments by name.

When viewing a department, users can see all employees assigned to that department.

Employees can only view departments within their own organization; departments from other organizations are not visible.

## Role Operations

Each organization has its own set of roles with three built-in roles that cannot be deleted: Owner with full access, Manager with employee and project management capabilities, and Employee with time tracking and submission abilities. Organization owners can create custom roles with a name and set of permissions from available options. Available permissions include organization management, employee management and viewing, project management and viewing, time management and approval, and report viewing. Organization owners can edit custom roles to modify permissions. Owners can delete custom roles only if no employees are assigned to them. Each employee in an organization is assigned exactly one role. Role assignment can be changed by users with employee management permission.

### Built-in Roles

THE system SHALL provide three built-in roles for every organization: Owner, Manager, and Employee.

THE system SHALL prevent deletion of the three built-in roles (Owner, Manager, Employee).

THE Owner role SHALL have full access to all features within the organization.

THE Owner role SHALL be able to manage roles and members.

THE Manager role SHALL be able to manage employees, projects, approve timesheets, and view reports.

THE Employee role SHALL be able to track time, submit timesheets, and view own data.

Each organization SHALL have its own independent set of roles.

### Custom Role Creation

Organization owners SHALL be able to create custom roles for their organization.

When creating a custom role, the owner SHALL provide a name for the role.

When creating a custom role, the owner SHALL select a set of permissions from available options.

Available permissions include organization management, employee management and viewing, project management and viewing, time management and approval, and report viewing.

THE system SHALL associate the custom role with the organization that created it.

### Custom Role Management

Organization owners SHALL be able to edit custom roles they created.

When editing a custom role, the owner SHALL be able to modify the role's name.

When editing a custom role, the owner SHALL be able to modify the set of permissions assigned to the role.

Organization owners SHALL be able to delete custom roles.

THE system SHALL prevent deletion of a custom role if any employees are assigned to it.

THE system SHALL allow deletion of a custom role only when no employees are assigned to it.

### Role Assignment

Each employee in an organization SHALL be assigned exactly one role.

Users with employee management permission SHALL be able to assign a role to an employee.

Users with employee management permission SHALL be able to change the role assignment for an employee.

When a role assignment is changed, THE system SHALL update the employee's access permissions immediately.

THE system SHALL enforce permission-based access control based on the employee's assigned role.

### Permission-Based Access Control

THE system SHALL enforce access control based on the permissions associated with each role.

When a user attempts to perform an action, THE system SHALL verify the user's role has the required permission.

If the user's role lacks the required permission, THE system SHALL deny the action.

Permission checks SHALL occur for all operations including viewing, creating, editing, and deleting resources.

THE system SHALL apply permissions consistently across all features within the organization.

## Project Operations

Users with project management permission can create projects with name, description, color code, status, budget hours, start date, and end date. The color code is required for UI display purposes. Users with project management permission can edit project details at any time. Users can archive or complete projects, which prevents new timelogs from being added while preserving existing timelogs. Users with project management permission can delete projects only if the project has no timelogs associated with it. Users with project view permission can view all projects with pagination and filtering by status.

### Project Creation

Users with project management permission can create new projects within their organization.

When creating a project, users provide a project name and optional description.

Users assign a color code to the project for visual display purposes.

Users may specify a project status when creating the project.

Users may optionally set budget hours representing total estimated hours for the project.

Users may optionally set a start date for the project.

Users may optionally set an end date for the project.

When a project is created without a specified status, the system sets the default status to active.

### Project Editing

Users with project management permission can edit project details at any time.

Users can update the project name.

Users can update the project description.

Users can update the color code for display purposes.

Users can update the budget hours.

Users can update the start date.

Users can update the end date.

Users can change the project status between active, archived, and completed states.

### Project Status Management

Users with project management permission can archive projects.

Users with project management permission can mark projects as completed.

When a project is archived, new timelogs cannot be added to that project.

When a project is completed, new timelogs cannot be added to that project.

When a project is archived, all existing timelogs associated with the project are preserved.

When a project is completed, all existing timelogs associated with the project are preserved.

Users can reactivate archived projects by changing the status back to active.

Users can reopen completed projects by changing the status back to active.

### Project Deletion

Users with project management permission can delete projects.

Users can only delete projects that have no timelogs associated with them.

When a project is deleted, all project data including tasks and project memberships are permanently removed.

The system records the deletion action in the activity log.

### Project Viewing

Users with project view permission can view all projects in their organization.

The project list is presented with pagination.

Users can filter projects by status.

The project list displays project name, description, color code, status, and budget hours.

Users can view detailed project information including all associated tasks and project members.

## ProjectMember Operations

Users with project management permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership includes the employee, project, and assigned role as either member or project-lead. Project leads can manage tasks within their assigned project. Users with project management permission can remove employees from projects. Employees can view which projects they are assigned to.

### Assign Employees to Projects

Users with project management permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership requires selecting an employee, a project, and an assigned role. The assigned role can be either member or project-lead. When assigning an employee to a project, the employee must already exist in the organization. When an employee is assigned as a project-lead, they gain the ability to manage tasks within that project. When an employee is assigned as a member, they can view and work on tasks but cannot manage them. The system records each project membership assignment for audit purposes.

### Project Member Roles

Each project membership includes an assigned role that determines the employee's capabilities within the project. The member role allows employees to view project details, view tasks, and log time against tasks. The project-lead role includes all member capabilities plus the ability to create tasks, edit tasks, assign tasks to other project members, and change task status. Project leads can only manage tasks within their assigned project, not in other projects. An employee can have different roles across different projects. An employee can be a project-lead in one project and a member in another project simultaneously. The role assignment is independent of the employee's organization-level role.

### Remove Employees from Projects

Users with project management permission can remove employees from projects. When an employee is removed from a project, their project membership is deleted. Removing an employee from a project does not delete any timelogs the employee has already logged for that project. Removing an employee from a project does not delete any tasks the employee has created or been assigned. When an employee is removed from a project, they lose all access to view or work on that project. When a project-lead is removed from a project, their task management capabilities for that project are immediately revoked. The system records each project membership removal for audit purposes.

### View Assigned Projects

Employees can view the list of projects they are assigned to. The project list shows the project name, status, and the employee's role in each project. Employees can filter the project list by their role (member or project-lead). Employees can filter the project list by project status (active, archived, completed). Users with project view permission can view all projects in the organization. Users with project view permission can see which employees are assigned to each project. Users with project view permission can see the role of each employee in the project. The project list is paginated for large organizations.

## Task Operations

Project leads or users with project management permission can create tasks within a project. Each task has title, description, status, priority, estimated hours, due date, assigned employee, and optional parent task for one level of subtask nesting. Project leads can edit tasks in their project while users with project management permission can edit any task. Task status changes are recorded in task history. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, and creation date.

### Task Creation

Project leads can create tasks within projects where they have project-lead role.

Users with project management permission can create tasks within any project in their organization.

A task requires a title to be created.

A task may include an optional description when created.

When creating a task, the creator may assign a status from: open, in-progress, completed, or closed.

When creating a task, the creator may assign a priority from: low, medium, high, or urgent.

When creating a task, the creator may specify estimated hours.

When creating a task, the creator may set a due date.

When creating a task, the creator may assign the task to an employee who is a member of the same project.

When creating a task, the creator may specify a parent task to create a subtask, allowing only one level of nesting.

The task is automatically associated with the project in which it is created.

### Task Editing and Status Management

Project leads can edit tasks within projects where they have project-lead role.

Users with project management permission can edit any task in their organization.

Project leads can modify the title of tasks in their projects.

Project leads can modify the description of tasks in their projects.

Project leads can change the status of tasks in their projects.

Users with project management permission can change the status of any task in their organization.

Task status can be changed to: open, in-progress, completed, or closed.

When a task status is changed, the system records the change in task history.

Project leads can change the priority of tasks in their projects.

Users with project management permission can change the priority of any task in their organization.

Task priority can be set to: low, medium, high, or urgent.

The priority level is used for filtering and sorting tasks.

Project leads can update the estimated hours of tasks in their projects.

Users with project management permission can update the estimated hours of any task in their organization.

Project leads can update the due date of tasks in their projects.

Users with project management permission can update the due date of any task in their organization.

Project leads can reassign tasks to different employees within their projects.

Users with project management permission can reassign any task to any employee who is a member of the project.

### Task Employee Assignment and Subtasks

When creating or editing a task, the creator may assign an employee to the task.

Only employees who are members of the same project can be assigned to a task.

Employee assignment is optional for tasks.

An unassigned task may remain without an employee assignment.

When creating a task, the creator may specify a parent task to create a subtask.

Subtasks allow one level of nesting only.

A subtask cannot have its own subtasks.

Project leads can create subtasks under tasks within their projects.

Users with project management permission can create subtasks under any task in their organization.

The parent task must belong to the same project as the subtask.

### Task Estimated Hours and Due Date

When creating or editing a task, the creator may specify estimated hours.

Estimated hours is an optional field for tasks.

Estimated hours can be used for project planning and budget tracking.

When creating or editing a task, the creator may set a due date.

Due date is an optional field for tasks.

The due date is used for sorting and filtering tasks.

### Task Viewing, Filtering, and Sorting

Employees can view tasks in projects where they are assigned as members.

Employees can view task details including title, description, status, priority, estimated hours, due date, and assigned employee.

Employees can view subtasks under parent tasks.

Project leads can view all tasks within their projects.

Users with project management permission can view all tasks across all projects in their organization.

Task viewing is restricted to projects the user has access to.

Employees can filter tasks by status when viewing tasks.

Employees can filter tasks by priority when viewing tasks.

Employees can filter tasks by assigned employee when viewing tasks.

Project leads can filter tasks by status, priority, and assigned employee within their projects.

Users with project management permission can filter tasks by status, priority, and assigned employee across all projects.

Filtering can be applied in combination to narrow task results.

Employees can sort tasks by due date when viewing tasks.

Employees can sort tasks by priority when viewing tasks.

Employees can sort tasks by creation date when viewing tasks.

Project leads can sort tasks by due date, priority, and creation date within their projects.

Users with project management permission can sort tasks by due date, priority, and creation date across all projects.

Sorting can be applied to organize task display order.

## TaskHistory Operations

The system automatically records task status changes in task history. Each task history entry includes timestamp, old status, new status, and the user who made the change. Task history provides an audit trail of all status transitions for a task. Users can view the complete history of status changes for any task. Task history entries are immutable once created. The history helps track task progress and accountability.

### Automatic Task Status Change Recording

WHEN a task status changes, THE system SHALL automatically create a task history entry.

THE system SHALL record the timestamp of each status change.

THE system SHALL record the old status value before the change.

THE system SHALL record the new status value after the change.

THE system SHALL record which user made the status change.

THE system SHALL create a history entry for every status transition, regardless of who makes the change.

THE system SHALL include the task identifier in each history entry to link it to the correct task.

### View Task Status History

Users with project:view permission SHALL be able to view the complete task status history for any task in their accessible projects.

THE system SHALL display all historical status changes for a selected task in chronological order.

THE system SHALL show the timestamp, old status, new status, and the user who made each change.

Users with project:manage permission SHALL be able to view task history for all tasks in the organization.

Project leads SHALL be able to view task history for all tasks within their assigned projects.

THE system SHALL present task history as a list of status transitions with full details for each entry.

### Task History Immutability and Audit Trail

THE system SHALL preserve all task history entries permanently once created.

THE system SHALL NOT allow any user to edit or delete task history entries.

THE system SHALL maintain the complete audit trail of all status changes for the lifetime of the task.

THE system SHALL use task history to track task progress through different status stages.

THE system SHALL provide accountability by recording which user performed each status change.

THE system SHALL retain task history even if the task is closed or the project is archived.

THE system SHALL include task history as part of the task's permanent record for audit and review purposes.

## Timelog Operations

Employees can log time entries with date, duration in minutes, project, task, description, and billable flag. Each timelog requires a date, duration, and project that the employee is assigned to. Task is optional but must belong to the selected project. The billable flag defaults to true. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs. Users with time view all permission can view all employees' timelogs. Employees can view their own timelogs with pagination and filtering by date range, project, task, and billable status.

### Timelog Creation

Employees SHALL log time entries with a date, duration in minutes, project assignment, optional task selection, optional description, and billable flag.

WHEN an employee creates a timelog, THE system SHALL require the employee to specify a date for the time entry.

WHEN an employee creates a timelog, THE system SHALL require the employee to specify a duration in minutes.

WHEN an employee creates a timelog, THE system SHALL require the employee to select a project they are assigned to.

WHEN an employee creates a timelog, THE system SHALL allow the employee to optionally select a task that belongs to the selected project.

WHEN an employee creates a timelog, THE system SHALL allow the employee to optionally provide a description of the work performed.

WHEN an employee creates a timelog without specifying a billable flag, THE system SHALL set the billable flag to true by default.

Employees SHALL only create timelogs for their own work; employees cannot create timelogs on behalf of other employees.

### Timelog Editing

Employees SHALL edit their own timelogs only when the timelog is not part of an approved timesheet.

WHEN an employee attempts to edit a timelog that is part of an approved timesheet, THE system SHALL prevent the edit operation.

Users with time management permission SHALL edit any employee's timelogs regardless of timesheet status.

WHEN a user with time management permission edits a timelog, THE system SHALL allow modification of the date, duration, project, task, description, and billable flag.

WHEN a user with time management permission edits a timelog, THE system SHALL record the change in the activity log.

### Timelog Deletion

Employees SHALL delete their own timelogs only when the timelog is not part of any submitted or approved timesheet.

WHEN an employee attempts to delete a timelog that is part of a submitted timesheet, THE system SHALL prevent the deletion.

WHEN an employee attempts to delete a timelog that is part of an approved timesheet, THE system SHALL prevent the deletion.

Users with time management permission SHALL delete any employee's timelogs regardless of timesheet status.

WHEN a user with time management permission deletes a timelog, THE system SHALL record the deletion in the activity log.

### Timelog Viewing and Filtering

Employees SHALL view their own timelogs with pagination support.

Users with time view all permission SHALL view all employees' timelogs with pagination support.

WHEN viewing timelogs, THE system SHALL allow filtering by date range.

WHEN viewing timelogs, THE system SHALL allow filtering by project.

WHEN viewing timelogs, THE system SHALL allow filtering by task.

WHEN viewing timelogs, THE system SHALL allow filtering by billable status.

WHEN an employee views their own timelogs, THE system SHALL display only timelogs created by that employee.

WHEN a user with time view all permission views timelogs, THE system SHALL display timelogs from all employees in the organization.

## Timesheet Operations

A timesheet is a collection of timelogs for a specific week from Monday to Sunday. Employees submit timesheets for approval with status progressing from draft to submitted to approved or rejected. Creating a draft timesheet automatically includes all timelogs for that employee in that week. Employees can add or remove timelogs from a draft timesheet. Employees can submit a draft timesheet for approval only if it has timelogs and no other timesheet for the same week is already submitted or approved. Users with time approval permission can view all submitted timesheets. Users can approve submitted timesheets, which locks all included timelogs preventing edits or deletions. Users can reject submitted timesheets with a required reason, returning them to draft status for modification and resubmission. Employees can view their own timesheets with pagination and filtering by status and date range.

### Weekly Timesheet Structure

THE system SHALL organize timesheets by week from Monday to Sunday.

THE system SHALL associate each timesheet with a specific week defined by its start date (Monday) and end date (Sunday).

THE system SHALL calculate the total hours for each timesheet based on the duration of all timelogs included in that timesheet.

### Draft Timesheet Creation

Employees can create a draft timesheet for a specific week.

WHEN an employee creates a draft timesheet, THE system SHALL automatically include all timelogs for that employee within the selected week.

THE system SHALL set the status of newly created timesheets to draft.

### Draft Timesheet Modification

Employees can add timelogs to a draft timesheet.

Employees can remove timelogs from a draft timesheet.

Employees can modify draft timesheets at any time before submission.

### Timesheet Submission

Employees can submit draft timesheets for approval.

IF a draft timesheet has no timelogs, THEN THE system SHALL prevent submission.

IF another timesheet for the same week is already submitted or approved, THEN THE system SHALL prevent duplicate submission.

WHEN a timesheet is submitted, THE system SHALL record the submission timestamp.

THE system SHALL change the timesheet status from draft to submitted upon successful submission.

### Timesheet Approval

Users with time approval permission can view all submitted timesheets.

Users with time approval permission can approve submitted timesheets.

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet.

WHEN a timesheet is approved, THE system SHALL prevent editing or deletion of locked timelogs.

THE system SHALL record the approval timestamp and the user who approved the timesheet.

THE system SHALL change the timesheet status from submitted to approved upon approval.

### Timesheet Rejection

Users with time approval permission can reject submitted timesheets.

WHEN rejecting a timesheet, THE system SHALL require a rejection reason to be provided.

WHEN a timesheet is rejected, THE system SHALL return the timesheet status to draft.

WHEN a timesheet is returned to draft status, THE employee SHALL be able to modify and resubmit the timesheet.

THE system SHALL record the rejection timestamp, the user who rejected, and the rejection reason.

### View Own Timesheets

Employees can view their own timesheets.

Employees can filter their timesheets by status.

Employees can filter their timesheets by date range.

THE system SHALL display timesheets in paginated format for employee viewing.

### View All Submitted Timesheets

Users with time approval permission can view all submitted timesheets across all employees.

Users with time approval permission can filter submitted timesheets by status.

Users with time approval permission can filter submitted timesheets by date range.

THE system SHALL display submitted timesheets in paginated format for approval workflow.

## Timer Operations

Employees can start a timer to track time in real-time with at most one active timer at a time. Starting a timer requires selecting a project while task is optional. The timer records start timestamp, project, task, and description. Employees can stop their timer, which creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard their timer without creating a timelog. Employees can view their currently running timer. If an employee forgets to stop their timer, it continues running indefinitely without automatic stop. Employees can edit the description and project or task of a running timer.

### Start Timer

WHEN an employee wants to track time in real-time, THE system SHALL allow them to start a timer.

WHERE a project is selected, THE system SHALL record the timer with that project association.

WHERE a task is optionally selected, THE system SHALL associate the timer with that task if provided.

WHEN a timer is started, THE system SHALL record the start timestamp automatically.

IF an employee already has an active timer running, THEN THE system SHALL prevent starting another timer until the existing one is stopped or discarded.

WHERE a description is provided, THE system SHALL store it with the timer for reference.

### Stop Timer

WHEN an employee stops their running timer, THE system SHALL create a timelog entry automatically.

WHEN a timer is stopped, THE system SHALL calculate the duration from the start timestamp to the stop time.

WHEN a timer is stopped, THE system SHALL round the calculated duration to the nearest minute for the timelog.

WHEN a timer is stopped, THE system SHALL associate the created timelog with the project selected when the timer was started.

WHERE a task was selected with the timer, THE system SHALL associate the created timelog with that task.

WHEN a timer is stopped, THE system SHALL use the description provided with the timer for the timelog entry.

### Discard Timer

WHEN an employee discards their running timer, THE system SHALL terminate the timer without creating a timelog.

WHEN a timer is discarded, THE system SHALL not record any time entry in the system.

WHEN a timer is discarded, THE system SHALL allow the employee to start a new timer immediately.

### View Running Timer

WHEN an employee views their timer status, THE system SHALL display whether a timer is currently running.

WHERE a timer is running, THE system SHALL show the start time of the timer.

WHERE a timer is running, THE system SHALL show the project associated with the timer.

WHERE a task is associated with the timer, THE system SHALL display the task information.

WHERE a description is provided with the timer, THE system SHALL show the description to the employee.

### Edit Running Timer

WHEN an employee edits their running timer, THE system SHALL allow them to update the description.

WHEN an employee edits their running timer, THE system SHALL allow them to change the project association.

WHERE a task is currently associated with the timer, THE system SHALL allow the employee to change to a different task.

WHERE no task is currently associated with the timer, THE system SHALL allow the employee to add a task association.

WHEN an employee edits the running timer, THE system SHALL preserve the original start timestamp.

### Timer Behavior

WHILE a timer is running, THE system SHALL continue tracking time without automatic stop.

IF an employee forgets to stop their timer, THEN THE system SHALL allow it to continue running indefinitely.

WHEN a timer is running, THE system SHALL allow the employee to view the elapsed time.

WHERE only one active timer is allowed per employee, THE system SHALL enforce this constraint throughout the timer lifecycle.

## ActivityLog Operations

The system automatically records significant actions as activity log entries with timestamp, user who performed the action, action type, target entity, and details. Logged actions include employee invited, deactivated, and reactivated events. Contract creation and editing are recorded. Project creation, archiving, completion, and deletion are logged. Task status changes are tracked. Timesheet submission, approval, and rejection events are recorded. Role assignment and changes are logged. Users with organization management permission can view the full activity log with pagination. The activity log can be filtered by action type, user, and date range.

### Automatic Activity Recording

THE system SHALL automatically record significant actions as activity log entries without manual intervention.

THE system SHALL create an activity log entry with a timestamp when a logged action occurs.

THE system SHALL record the user who performed the action in each activity log entry.

THE system SHALL capture the action type for each logged event.

THE system SHALL identify the target entity affected by each action.

THE system SHALL store details about what occurred for each activity log entry.

### Employee Lifecycle Logging

THE system SHALL log when an employee is invited to the organization.

THE system SHALL log when an employee is deactivated.

THE system SHALL log when an employee is reactivated.

THE system SHALL record the user who performed each employee lifecycle action.

THE system SHALL capture the timestamp of each employee lifecycle event.

### Contract Activity Logging

THE system SHALL log when a contract is created for an employee.

THE system SHALL log when a contract is edited.

THE system SHALL record which user created or edited the contract.

THE system SHALL capture the timestamp of contract creation and editing events.

### Project Lifecycle Logging

THE system SHALL log when a project is created.

THE system SHALL log when a project is archived.

THE system SHALL log when a project is marked as completed.

THE system SHALL log when a project is deleted.

THE system SHALL record which user performed each project lifecycle action.

THE system SHALL capture the timestamp of each project lifecycle event.

### Task Status Change Logging

THE system SHALL log when a task status is changed.

THE system SHALL record the previous status before the change.

THE system SHALL record the new status after the change.

THE system SHALL capture which user made the status change.

THE system SHALL record the timestamp of each task status change.

### Timesheet Event Logging

THE system SHALL log when a timesheet is submitted for approval.

THE system SHALL log when a timesheet is approved.

THE system SHALL log when a timesheet is rejected.

THE system SHALL record which user submitted, approved, or rejected the timesheet.

THE system SHALL capture the timestamp of each timesheet status change.

### Role Assignment Logging

THE system SHALL log when a role is assigned to an employee.

THE system SHALL log when a role assignment is changed for an employee.

THE system SHALL record which user performed the role assignment or change.

THE system SHALL capture the timestamp of each role assignment event.

### Activity Log Viewing

Users with organization management permission can view the full activity log.

Users can see all activity log entries for their organization.

Users can view the timestamp of each activity log entry.

Users can view which user performed each action.

Users can view the action type for each entry.

Users can view the target entity affected by each action.

Users can view the details of what occurred for each entry.

### Activity Log Filtering

Users can filter the activity log by action type.

Users can filter the activity log by the user who performed the action.

Users can filter the activity log by date range.

Users can combine multiple filters to narrow activity log results.

Users can clear filters to view all activity log entries.

### Activity Log Pagination

Users can browse the activity log in paginated pages.

Users can navigate between pages of activity log entries.

Users can see how many total activity log entries exist.

Users can see which page they are currently viewing.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Organization deletion is blocked when pending timesheets exist in the system. The system prevents organization deletion if any active employee contracts are present. Organization owners must resolve all pending timesheets by approval or rejection before deletion. Organization owners must end all active employee contracts before deletion can proceed. Organization name is required and cannot be empty during creation or editing. Currency must be a valid currency code such as USD, EUR, or KRW. Timezone must be a valid timezone identifier. Fiscal start month must be between 1 and 12. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account remains active but is no longer associated with any organization. Multi-tenancy ensures employees in one organization cannot access data from another organization. Users belonging to multiple organizations only see data for their currently selected organization.

### Organization Deletion Blocked by Pending Timesheets

WHEN an organization owner attempts to delete an organization, THE system SHALL check for pending timesheets.

IF any timesheets with status submitted or draft exist in the organization, THEN THE system SHALL reject the deletion request.

IF the deletion is rejected due to pending timesheets, THEN THE system SHALL display which timesheets are pending.

THE system SHALL require the owner to resolve all pending timesheets before organization deletion can proceed.

### Organization Deletion Blocked by Active Contracts

WHEN an organization owner attempts to delete an organization, THE system SHALL check for active employee contracts.

IF any employee contracts with no end date exist, THEN THE system SHALL reject the deletion request.

IF the deletion is rejected due to active contracts, THEN THE system SHALL display which employees have active contracts.

THE system SHALL require the owner to end all active contracts before organization deletion can proceed.

### Resolve Pending Timesheets Before Deletion

THE system SHALL require organization owners to approve or reject all pending timesheets before deleting an organization.

WHEN a user with time approval permission approves a submitted timesheet, THE system SHALL change its status to approved.

WHEN a user with time approval permission rejects a submitted timesheet, THE system SHALL change its status to rejected and return it to draft.

WHEN all timesheets are either approved or rejected, THE system SHALL allow the organization deletion to proceed.

THE system SHALL provide a summary of pending timesheets that need resolution before deletion.

### End Active Contracts Before Deletion

THE system SHALL require organization owners to set end dates for all active employee contracts before deleting an organization.

WHEN a user with employee management permission edits an active contract to add an end date, THE system SHALL no longer consider the contract active.

THE system SHALL provide a list of employees with active contracts that need to be ended.

WHEN all active contracts have end dates, THE system SHALL allow the organization deletion to proceed.

### Organization Name Validation Errors

WHEN creating an organization, IF the name field is empty or contains only whitespace, THEN THE system SHALL reject the creation request.

WHEN editing an organization, IF the name field is changed to empty or whitespace-only, THEN THE system SHALL reject the update request.

IF the name is missing, THEN THE system SHALL display an error message indicating that organization name is required.

THE system SHALL require organization names to contain at least one character to be valid.

### Currency Code Validation Errors

WHEN creating an organization, IF the currency code is not a valid format, THEN THE system SHALL reject the creation request.

THE system SHALL accept standard three-letter currency codes such as USD, EUR, KRW, GBP, JPY.

WHEN editing an organization, IF the currency code is changed to an invalid format, THEN THE system SHALL reject the update request.

IF the currency code is invalid, THEN THE system SHALL display an error message indicating the currency code must be valid.

### Timezone Identifier Validation Errors

WHEN creating an organization, IF the timezone identifier is not valid, THEN THE system SHALL reject the creation request.

THE system SHALL accept standard timezone identifiers such as America/New_York, Asia/Seoul, Europe/London.

WHEN editing an organization, IF the timezone identifier is changed to an invalid format, THEN THE system SHALL reject the update request.

IF the timezone identifier is invalid, THEN THE system SHALL display an error message indicating the timezone must be valid.

### Fiscal Start Month Validation Errors

WHEN creating an organization, IF the fiscal start month is not between 1 and 12, THEN THE system SHALL reject the creation request.

THE system SHALL require month values to be integers from 1 (January) through 12 (December).

WHEN editing an organization, IF the fiscal start month is changed to a value outside the 1-12 range, THEN THE system SHALL reject the update request.

IF the fiscal start month is invalid, THEN THE system SHALL display an error message indicating the fiscal start month must be between 1 and 12.

### Permanent Data Deletion on Organization Removal

WHEN an organization is successfully deleted, THE system SHALL permanently remove all associated data.

THE system SHALL delete all employee records, projects, tasks, timelogs, timesheets, departments, roles, contracts, and activity logs.

THE system SHALL make the deletion irreversible with no data recovery possible.

THE system SHALL remove all data belonging to the organization in a single atomic operation.

### Owner Account Preserved After Organization Deletion

WHEN an organization is deleted, THE system SHALL keep the organization owner's user account active.

THE system SHALL preserve the owner's user profile, including display name, avatar, and phone number.

THE system SHALL keep the owner's email and password credentials valid for authentication.

WHEN an organization is deleted, THE system SHALL remove the owner's association with any organization.

THE system SHALL allow the owner to create a new organization or join existing organizations using their preserved account.

### Multi-Tenancy Data Isolation Enforcement

THE system SHALL enforce strict data isolation between organizations.

THE system SHALL prevent employees in one organization from accessing any data from another organization, even if they belong to multiple organizations.

THE system SHALL automatically scope all queries and operations to the currently selected organization.

THE system SHALL reject cross-organization data access attempts.

THE system SHALL maintain complete separation of employee records, projects, tasks, timelogs, timesheets, and all other organizational data.

### Organization Context Data Scoping

THE system SHALL require users who belong to multiple organizations to select an organization context before performing operations.

THE system SHALL scope all subsequent actions to the selected organization only.

WHEN a user switches organization context, THE system SHALL update all data views to show only the new organization's data.

THE system SHALL prevent users from seeing or accessing data from organizations they are not currently viewing.

THE system SHALL maintain the organization context across the user session until explicitly changed.

## User Error Scenarios

Users cannot sign up with an email address that already exists in the system. Login fails when email or password is incorrect. Users can change their password through the password change feature. Users can belong to multiple organizations simultaneously. When logging in, users must select which organization to work in. All actions after login are scoped to the selected organization context. Users can switch between organizations without logging out. Account deletion is blocked if the user is the sole owner of an organization. Sole owners must transfer ownership to another user before deleting their account. Sole owners must delete their organization before deleting their account. When a user deletes their account, their employee records in other organizations are marked as deactivated. The system prevents login attempts with invalid credentials.

### Duplicate Email Sign Up Prevention

WHEN a user attempts to sign up with an email address, THE system SHALL check if the email already exists in the system.

IF the email address is already registered, THEN THE system SHALL reject the sign up request.

THE system SHALL prevent account creation when a duplicate email address is provided.

THE system SHALL inform the user that the email address is already in use when duplicate email sign up is attempted.

### Invalid Login Credentials Rejection

WHEN a user attempts to log in with email and password, THE system SHALL validate the credentials against registered accounts.

IF the email address does not exist in the system, THEN THE system SHALL reject the login attempt.

IF the password does not match the registered password for the email, THEN THE system SHALL reject the login attempt.

THE system SHALL prevent access to the platform when login credentials are invalid.

THE system SHALL not reveal whether the email exists or the password is incorrect for security purposes.

THE system SHALL deny access to all features and data when credentials are invalid.

### Password Change Functionality

Users can change their password through the password change feature.

WHEN a user initiates a password change, THE system SHALL require the current password for verification.

WHEN a user submits a new password, THE system SHALL update the password for the user account.

THE system SHALL allow users to change their password at any time while logged in.

AFTER a successful password change, THE system SHALL require the user to log in again with the new password.

### Multiple Organization Membership

Users can belong to multiple organizations simultaneously.

WHEN a user is invited to a new organization, THE system SHALL add the user to that organization while maintaining membership in existing organizations.

THE system SHALL allow a single user account to be associated with multiple organizations.

WHEN a user belongs to multiple organizations, THE system SHALL maintain separate employee records for each organization.

### Organization Context Selection on Login

WHEN a user logs in and belongs to multiple organizations, THE system SHALL require the user to select which organization to work in.

THE system SHALL present a list of all organizations the user belongs to for selection.

AFTER the user selects an organization, THE system SHALL establish that organization as the active context.

ALL subsequent actions by the user are scoped to the selected organization context.

THE system SHALL not allow operations across organization boundaries without explicit context selection.

### Organization Switching Without Logout

Users can switch between organizations without logging out.

WHEN a user switches organizations, THE system SHALL update the active organization context.

AFTER switching organizations, THE system SHALL display data and features relevant to the newly selected organization.

THE system SHALL maintain the user's authentication session during organization switching.

Users can switch organizations at any time while logged in.

### Account Deletion Blocked for Sole Owner

Account deletion is blocked if the user is the sole owner of an organization.

WHEN a sole owner attempts to delete their account, THE system SHALL prevent the deletion.

THE system SHALL inform the user that they must resolve organization ownership before deleting their account.

A sole owner cannot delete their account while owning an organization without another owner.

### Ownership Transfer Before Account Deletion

Sole owners must transfer ownership to another user before deleting their account.

WHEN a sole owner transfers ownership, THE system SHALL assign a new owner to the organization.

AFTER ownership transfer, THE system SHALL allow the former sole owner to delete their account.

THE system SHALL require the new owner to be an existing member of the organization.

Ownership transfer resolves the account deletion block for sole owners.

### Organization Deletion Before Account Deletion

Sole owners must delete their organization before deleting their account.

WHEN a sole owner deletes their organization, THE system SHALL remove all organization data including employees, projects, tasks, timelogs, and timesheets.

AFTER organization deletion, THE system SHALL allow the former owner to delete their account.

The user's account remains after organization deletion but is no longer associated with any organization.

Organization deletion is an alternative to ownership transfer for resolving account deletion blocks.

### Employee Records Deactivated on Account Deletion

WHEN a user deletes their account, THE system SHALL mark their employee records in other organizations as deactivated.

Deactivated employee records cannot log time or submit timesheets.

Historical data from deactivated employees including timelogs and timesheets is preserved.

Deactivated employees can be reactivated by users with employee management permissions.

THE system SHALL maintain the association between the deactivated employee record and the user's former identity for audit purposes.

## UserProfile Error Scenarios

Each user has a global profile shared across all organizations they belong to. Users can edit their display name, avatar image, and phone number. Display name cannot be empty when updating the profile. Avatar image must be a valid image file format. Phone number format must be valid according to international standards. Profile changes apply globally to all organizations the user belongs to. The profile is independent of organization-specific employee records. Users cannot delete their profile separately from their account. Profile updates are immediately visible across all organizations. The system validates avatar image size and format requirements. Display name updates must meet minimum length requirements.

### Display Name Validation Errors

When updating the display name, the system SHALL reject the update if the display name is empty.

When updating the display name, the system SHALL reject the update if the display name does not meet minimum length requirements.

When updating the display name with only whitespace characters, the system SHALL reject the update as invalid.

When a user attempts to set a display name that exceeds maximum allowed length, the system SHALL reject the update.

The system SHALL provide a clear error message indicating why the display name update was rejected.

### Avatar Image Validation Errors

When uploading an avatar image, the system SHALL reject the upload if the file is not a valid image format.

When uploading an avatar image, the system SHALL reject the upload if the file size exceeds the maximum allowed size.

When uploading an avatar image with a corrupted file, the system SHALL reject the upload.

When uploading an avatar image that is not a recognized image type, the system SHALL reject the upload.

When a user attempts to upload an empty file as an avatar, the system SHALL reject the upload.

The system SHALL provide a clear error message indicating why the avatar image upload was rejected.

### Phone Number Validation Errors

When updating the phone number, the system SHALL reject the update if the phone number format does not conform to international standards.

When updating the phone number with an empty value, the system SHALL reject the update.

When updating the phone number with invalid characters, the system SHALL reject the update.

When updating the phone number with an incomplete format, the system SHALL reject the update.

The system SHALL provide a clear error message indicating why the phone number update was rejected.

### Global Profile Scope Behavior

When a user updates their profile, the changes SHALL apply globally to all organizations the user belongs to.

When a user updates their profile, the changes SHALL be immediately visible across all organizations.

When a user belongs to multiple organizations, the profile SHALL remain consistent across all organizations.

When a user switches between organizations, the profile SHALL display the same information regardless of the selected organization.

The profile SHALL be independent of organization-specific employee records.

Changes to the profile SHALL not affect employee records in any organization.

### Profile Deletion Constraints

When a user attempts to delete their profile separately from their account, the system SHALL reject the deletion.

When a user deletes their account, the profile SHALL be deleted along with the account.

When a user is the sole owner of an organization and attempts to delete their account, the system SHALL require ownership transfer or organization deletion first.

When a user's account is deleted, their employee records in other organizations SHALL be marked as deactivated.

The profile cannot exist independently from the user account.

## Employee Error Scenarios

Users with employee management permission can invite new employees by email. If the invited email already has an account, the user is added to the organization. If the invited email has no account, a pending invitation is created. When the user signs up with that email, they are automatically added to pending organizations. Each employee record includes role, department, position, and employment type. Employment type must be one of: full-time, part-time, contractor, or intern. Status must be either active or deactivated. Deactivated employees cannot log time or submit timesheets. Deactivated employees historical data is preserved in the system. Deactivated employees can be reactivated by authorized users. Duplicate employee records for the same user in one organization are prevented. Users can filter employee list by department, employment type, and status. Users can search employees by name.

### Employee Invitation Error Scenarios

WHEN inviting employees by email, IF the invited email address already has a user account in the system, THEN THE system SHALL automatically add the user to the organization with the pending role assignment.

WHEN inviting employees by email, IF the invited email address does not have an existing account, THEN THE system SHALL create a pending invitation record.

WHEN a new user signs up with an email address that has pending invitations, THE system SHALL automatically add the user to all organizations with pending invitations for that email.

WHEN an invitation is sent to an email address that is already an active employee in the same organization, THEN THE system SHALL reject the invitation and prevent duplicate employee record creation.

WHEN a pending invitation is created, THE system SHALL notify the invited user of the invitation.

WHEN a pending invitation exists, THE system SHALL maintain the invitation until the user signs up or the invitation is explicitly cancelled by an authorized user.

### Employment Type and Status Validation

WHEN creating or updating an employee record, IF the employment type is not one of the following values: full-time, part-time, contractor, or intern, THEN THE system SHALL reject the employee record creation or update.

WHEN creating or updating an employee record, IF the status is not one of the following values: active or deactivated, THEN THE system SHALL reject the employee record creation or update.

WHEN creating a new employee record, THE system SHALL default the status to active.

WHEN editing an employee record, users with employee management permission SHALL be able to change the status to deactivated.

WHEN an attempt is made to set employment type to null or empty, THEN THE system SHALL reject the operation.

WHEN an attempt is made to set status to null or empty, THEN THE system SHALL reject the operation.

### Deactivated Employee Time Restrictions

WHILE an employee's status is deactivated, THE system SHALL prevent the employee from creating new time entries.

WHILE an employee's status is deactivated, THE system SHALL prevent the employee from submitting timesheets for approval.

WHILE an employee's status is deactivated, THE system SHALL allow the employee to view their historical time entries and timesheets.

WHILE an employee's status is deactivated, THE system SHALL prevent the employee from modifying existing time entries, even if those entries are part of draft timesheets.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to log time and submit timesheets.

### Historical Data Preservation for Deactivated Employees

WHEN an employee is deactivated, THE system SHALL preserve all historical time entries associated with the employee.

WHEN an employee is deactivated, THE system SHALL preserve all timesheets associated with the employee, including their approval status.

WHEN generating project budget calculations and reports, THE system SHALL include time entries from deactivated employees.

WHEN an employee is reactivated, THE system SHALL maintain all historical data without creating duplicate records or modifying existing historical entries.

WHEN an employee is deactivated, THE system SHALL preserve all contracts associated with the employee.

### Deactivated Employee Reactivation

WHEN a user with employee management permission requests reactivation, THE system SHALL change the employee status from deactivated back to active.

WHEN an employee is reactivated, THE system SHALL restore the employee's role assignment and access to organization features according to their assigned role permissions.

WHEN an employee is reactivated, THE system SHALL not require the employee to re-accept an invitation.

WHEN an employee has been deactivated and reactivated multiple times, THE system SHALL maintain all historical time entries and timesheets intact.

WHEN an employee is reactivated, THE system SHALL immediately allow the employee to log time and submit timesheets without additional approval or configuration.

### Duplicate Employee Prevention

WHEN creating an employee record, IF the user account is already associated with the organization, THEN THE system SHALL reject the operation to prevent duplicate employee records.

WHEN inviting a user by email, IF that email corresponds to a user already in the organization, THEN THE system SHALL reject the invitation rather than creating a duplicate employee record.

WHEN determining if an employee record exists, THE system SHALL use the user account reference to check for existing employee records in the organization.

WHEN a user belongs to multiple organizations, THE system SHALL allow separate employee records in each organization without considering them duplicates.

WHEN merging or consolidating employee records is attempted, THE system SHALL require manual intervention by organization owners to prevent accidental data loss.

### Employee List Filtering and Search

WHEN filtering the employee list by department, THE system SHALL display only employees assigned to that department and exclude employees with no department assignment.

WHEN filtering the employee list by employment type, THE system SHALL display only employees with that employment type and allow multiple employment types to be selected for combined filtering.

WHEN filtering the employee list by status, THE system SHALL display only employees with that status and allow both active and deactivated statuses to be selected to view all employees.

WHEN searching for employees by name, THE system SHALL match against the employee's display name from their user profile and support partial name matches.

WHEN multiple filters are applied simultaneously, THE system SHALL return employees that match all filter criteria using logical AND logic.

WHEN displaying the employee list, THE system SHALL paginate results to handle large numbers of employees and maintain filter and search selections across pages.

## EmployeeContract Error Scenarios

Each employee can have multiple contracts as historical records. Only one contract can be active at any given time. Start date is required when creating a contract. Pay rate is required and must be a numeric value. Pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required when creating a contract. Creating a new contract automatically ends the previous active contract. The previous active contract end date is set to the day before the new contract starts. Users with employee management permission can edit the current active contract. Past contracts cannot be edited and remain immutable historical records. Employees can view their own contracts. Users with employee view permission can view any employee contracts. Contract date overlap is prevented by automatic end date setting.

### Contract Creation Validation Errors

WHEN creating a new employee contract, THE system SHALL reject the request if the start date is not provided.

WHEN creating a new employee contract, THE system SHALL reject the request if the pay rate is not provided.

WHEN creating a new employee contract, THE system SHALL reject the request if the pay rate is not a valid numeric value.

WHEN creating a new employee contract, THE system SHALL reject the request if the pay period is not one of: hourly, daily, weekly, or monthly.

WHEN creating a new employee contract, THE system SHALL reject the request if the working hours per week is not provided.

WHEN creating a new employee contract, THE system SHALL reject the request if the user does not have employee management permission.

WHEN creating a new employee contract, THE system SHALL reject the request if the employee does not exist in the organization.

### Single Active Contract Enforcement

WHEN an employee already has an active contract, THE system SHALL automatically end the previous active contract before creating a new one.

WHEN a new contract is created, THE system SHALL set the previous active contract's end date to the day before the new contract's start date.

WHEN multiple contracts exist for an employee, THE system SHALL ensure only one contract has an active status at any given time.

WHEN an active contract exists, THE system SHALL prevent creation of another contract without first ending the current one.

WHEN contract date overlap is detected, THE system SHALL prevent the overlap by automatically adjusting the previous contract's end date.

### Contract Editing Restrictions

WHEN a user attempts to edit a past contract, THE system SHALL reject the request because past contracts are immutable historical records.

WHEN a user attempts to edit a contract that is not active, THE system SHALL reject the request.

WHEN a user without employee management permission attempts to edit an active contract, THE system SHALL reject the request.

WHEN editing an active contract, THE system SHALL allow modification of all contract fields including start date, end date, pay rate, pay period, and working hours per week.

WHEN an active contract is edited, THE system SHALL preserve the contract's historical status and maintain the single active contract rule.

### Contract Access and Viewing

WHEN an employee attempts to view contracts, THE system SHALL allow viewing only their own contracts.

WHEN a user with employee view permission attempts to view contracts, THE system SHALL allow viewing any employee's contracts in the organization.

WHEN a user without employee view permission attempts to view another employee's contracts, THE system SHALL reject the request.

WHEN viewing contracts, THE system SHALL display all historical contracts for the employee, including active and past contracts.

WHEN an employee's status is deactivated, THE system SHALL still allow viewing their historical contracts for record-keeping purposes.

## Department Error Scenarios

Each organization can have multiple departments. Each department has a name, description, and optional parent department. Only one level of department nesting is allowed. Users with organization management permission can create departments. Users with organization management permission can edit departments. Users with organization management permission can delete departments. Deleting a department sets employees department to null. Deleting a department does not delete employee records. Department names must be unique within an organization. Parent department must exist when creating a child department. Employees can view the list of departments in their organization. Circular parent department references are prevented.

### Department Creation Validation Errors

WHEN creating a department, THE system SHALL reject the request if the department name is missing or blank.

WHEN creating a department, THE system SHALL reject the request if another department in the same organization already has the same name.

WHEN creating a child department with a parent department, THE system SHALL reject the request if the specified parent department does not exist.

WHEN creating a child department, THE system SHALL reject the request if the parent department already has a parent department (violating one-level nesting limit).

WHEN creating a department, THE system SHALL reject the request if the user attempts to set the department as its own parent.

### Department Nesting Constraint Violations

WHEN attempting to create a grandchild department (a child of a child department), THE system SHALL reject the request and indicate that only one level of nesting is allowed.

WHEN attempting to edit a department to add a parent that is already a child department, THE system SHALL reject the change and indicate that only one level of nesting is allowed.

WHEN a department A has parent B, THE system SHALL prevent setting B's parent to A (circular reference prevention).

WHEN a user attempts to set a department's parent to itself, THE system SHALL reject the request.

THE system SHALL enforce that departments can have at most one level of nesting (a department can have a parent, but that parent cannot have its own parent).

### Department Deletion Edge Cases

WHEN deleting a department that has employees assigned to it, THE system SHALL clear all those employees' department assignments without deleting the employees.

WHEN deleting a department, THE system SHALL preserve all employee records (employee records are not deleted when their department is deleted).

WHEN deleting a parent department, THE system SHALL not automatically delete child departments (child departments remain in the system).

WHEN deleting a parent department, THE system SHALL clear the parent reference on child departments.

WHEN deleting a department, THE system SHALL allow the deletion to proceed regardless of whether employees are assigned to it (only employee department assignments are cleared).

### Department Editing Validation Errors

WHEN editing a department name, THE system SHALL reject the request if the new name is blank or empty.

WHEN editing a department name, THE system SHALL reject the request if another department in the organization already has the same name.

WHEN editing a department to change its parent, THE system SHALL reject the request if the new parent department does not exist.

WHEN editing a department to add a parent, THE system SHALL reject the request if the new parent already has a parent (violating one-level nesting limit).

WHEN editing a department's parent, THE system SHALL reject the request if the change would create a circular parent chain.

### Department List Access Scenarios

WHEN employees view the department list, THE system SHALL display all departments in their organization regardless of whether employees are assigned to them.

WHEN viewing the department list, THE system SHALL display department names and descriptions along with parent-child relationships to show the hierarchy.

WHEN viewing the department list, THE system SHALL paginate the results to allow navigation through all departments.

WHEN a department is deleted, THE system SHALL remove it from the department list (deleted departments are no longer visible).

WHEN a department's parent is cleared (due to parent deletion), THE system SHALL display the department as a top-level department in the list.

## Role Error Scenarios

Each organization has its own set of roles. Three built-in roles exist: Owner, Manager, and Employee. Built-in roles cannot be deleted from the system. Organization owners can create custom roles. Each custom role has a name and a set of permissions. Available permissions include organization management, employee management, employee view, project management, project view, time management, time approve, time view all, and report view. Organization owners can edit custom roles. Organization owners can delete custom roles only if no employees are assigned to them. Each employee in an organization is assigned exactly one role. Role assignment can be changed by users with employee management permission. Built-in role permissions cannot be modified.

### Built-in Role Protection Errors

WHEN a user attempts to delete a built-in role (Owner, Manager, or Employee), THE system SHALL reject the deletion request and display an error message indicating that built-in roles cannot be deleted.

WHEN a user attempts to modify the permissions of a built-in role, THE system SHALL reject the modification request and display an error message indicating that built-in role permissions are immutable.

WHEN a user without organization management permission attempts to view the role management interface, THE system SHALL reject the access request and display an error message indicating insufficient permissions.

WHEN an organization owner attempts to rename a built-in role, THE system SHALL reject the rename request and display an error message indicating that built-in role names cannot be changed.

### Custom Role Creation Validation Errors

WHEN an organization owner attempts to create a custom role without providing a name, THE system SHALL reject the creation request and display an error message indicating that a role name is required.

WHEN an organization owner attempts to create a custom role with a name that duplicates an existing role name in the organization, THE system SHALL reject the creation request and display an error message indicating that the role name already exists.

WHEN an organization owner attempts to create a custom role with a name that matches a built-in role name (Owner, Manager, or Employee), THE system SHALL reject the creation request and display an error message indicating that the role name is reserved.

WHEN an organization owner attempts to create a custom role with an invalid permission set, THE system SHALL reject the creation request and display an error message indicating that one or more permissions are invalid.

WHEN a user without organization management permission attempts to create a custom role, THE system SHALL reject the creation request and display an error message indicating insufficient permissions.

### Custom Role Deletion Constraints

WHEN an organization owner attempts to delete a custom role that has one or more employees assigned to it, THE system SHALL reject the deletion request and display an error message indicating that employees are currently assigned to the role.

WHEN an organization owner attempts to delete a custom role, THE system SHALL first check if any employees are assigned to the role and block the deletion if employees exist.

WHEN a user without organization management permission attempts to delete a custom role, THE system SHALL reject the deletion request and display an error message indicating insufficient permissions.

WHEN an organization owner successfully deletes a custom role with no assigned employees, THE system SHALL permanently remove the role from the organization's role set.

### Role Assignment Errors

WHEN a user with employee management permission attempts to assign a role to an employee who already has a different role, THE system SHALL automatically update the employee's role to the newly assigned role.

WHEN a user without employee management permission attempts to change an employee's role assignment, THE system SHALL reject the assignment request and display an error message indicating insufficient permissions.

WHEN a user attempts to assign a non-existent role to an employee, THE system SHALL reject the assignment request and display an error message indicating that the role does not exist.

WHEN a user attempts to assign a built-in role that does not exist in the organization's role set, THE system SHALL reject the assignment request and display an error message indicating that the role is not available.

IF an employee is the sole owner of an organization, THEN THE system SHALL prevent role changes that would remove the owner role from that employee.

### Role Permission Modification Errors

WHEN an organization owner attempts to edit a custom role's permissions, THE system SHALL validate that all selected permissions are valid before saving the changes.

WHEN an organization owner attempts to remove all permissions from a custom role, THE system SHALL allow the modification but the role will have no effective permissions.

WHEN a user without organization management permission attempts to edit a custom role's permissions, THE system SHALL reject the modification request and display an error message indicating insufficient permissions.

WHEN an organization owner attempts to edit a built-in role's permissions, THE system SHALL reject the modification request and display an error message indicating that built-in role permissions cannot be modified.

WHEN an organization owner successfully edits a custom role's permissions, THE system SHALL immediately apply the new permission set to all employees assigned to that role.

## Project Error Scenarios

Users with project management permission can create projects. Project name is required when creating a project. Color code is required for UI display purposes. Project status can be active, archived, or completed. Budget hours is optional when creating a project. Start date and end date are optional. Users with project management permission can edit projects. Users with project management permission can archive or complete projects. Archived projects cannot receive new timelogs. Completed projects cannot receive new timelogs. Existing timelogs on archived projects are preserved. Existing timelogs on completed projects are preserved. Users with project management permission can delete projects only if the project has no timelogs. Users with project view permission can view all projects. Projects can be filtered by status.

### Project Creation Validation

WHEN creating a project, THE system SHALL require a project name to be provided.

WHEN creating a project, THE system SHALL require a color code to be provided for UI display purposes.

WHEN creating a project, THE system SHALL allow budget hours to be omitted as an optional field.

WHEN creating a project, THE system SHALL allow start date to be omitted as an optional field.

WHEN creating a project, THE system SHALL allow end date to be omitted as an optional field.

IF a project name is not provided during creation, THEN THE system SHALL reject the project creation request.

IF a color code is not provided during creation, THEN THE system SHALL reject the project creation request.

### Project Status and Timelog Restrictions

WHEN a project status is set to active, THE system SHALL allow new timelogs to be created for that project.

WHEN a project status is changed to archived, THE system SHALL block creation of new timelogs for that project.

WHEN a project status is changed to completed, THE system SHALL block creation of new timelogs for that project.

WHEN a project is archived, THE system SHALL preserve all existing timelogs associated with that project.

WHEN a project is completed, THE system SHALL preserve all existing timelogs associated with that project.

IF a user attempts to create a timelog for an archived project, THEN THE system SHALL reject the timelog creation.

IF a user attempts to create a timelog for a completed project, THEN THE system SHALL reject the timelog creation.

### Project Deletion Constraints

WHEN a user with project management permission attempts to delete a project, THE system SHALL check if any timelogs are associated with that project.

IF a project has one or more timelogs associated with it, THEN THE system SHALL block the project deletion.

IF a project has no timelogs associated with it, THEN THE system SHALL allow the project deletion.

IF a user attempts to delete a project with existing timelogs, THEN THE system SHALL reject the deletion request.

### Project Viewing and Filtering

WHEN a user with project view permission accesses the project list, THE system SHALL display all projects within the organization.

WHEN viewing the project list, THE system SHALL allow filtering by project status.

WHEN filtering by status, THE system SHALL allow filtering for active projects.

WHEN filtering by status, THE system SHALL allow filtering for archived projects.

WHEN filtering by status, THE system SHALL allow filtering for completed projects.

IF a user does not have project view permission, THEN THE system SHALL prevent access to the project list.

## ProjectMember Error Scenarios

Users with project management permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership includes employee, project, and assigned role. Assigned role can be member or project-lead. Project leads can manage tasks within their project. Users with project management permission can remove employees from projects. Duplicate project member assignments are prevented. Employees must exist in the organization to be assigned to projects. Employees can view which projects they are assigned to. Removing a project member does not delete their tasks. Project lead role grants task management permissions.

### Duplicate Assignment Prevention

WHEN a user with project management permission attempts to assign an employee to a project, THE system SHALL check if the employee is already assigned to that project.

IF an employee is already assigned to a project, THEN THE system SHALL reject the assignment request.

IF a duplicate assignment attempt is detected, THEN THE system SHALL return an error indicating the employee is already a member of the project.

WHEN viewing project members, THE system SHALL display each employee only once per project, even if duplicate assignment attempts were made.

THE system SHALL prevent multiple membership records for the same employee-project combination.

### Employee Existence Validation

WHEN a user attempts to assign an employee to a project, THE system SHALL verify the employee exists in the organization.

IF the employee does not exist in the organization, THEN THE system SHALL reject the assignment request.

IF the employee record is deactivated, THEN THE system SHALL reject the assignment request.

WHEN an employee is deactivated after being assigned to a project, THE system SHALL preserve the project membership record.

IF a user attempts to assign a non-existent employee, THEN THE system SHALL return an error indicating the employee cannot be found.

THE system SHALL validate employee existence before creating any project membership.

### Project Existence Validation

WHEN a user attempts to assign an employee to a project, THE system SHALL verify the project exists in the organization.

IF the project does not exist, THEN THE system SHALL reject the assignment request.

IF the project has been deleted, THEN THE system SHALL reject the assignment request.

WHEN a project is archived or completed, THE system SHALL still allow employee assignments to that project.

IF a user attempts to assign an employee to a non-existent project, THEN THE system SHALL return an error indicating the project cannot be found.

THE system SHALL validate project existence before creating any project membership.

### Role Assignment Constraints

WHEN assigning an employee to a project, THE system SHALL require an assigned role of either member or project-lead.

IF an invalid role is specified during assignment, THEN THE system SHALL reject the assignment request.

WHEN a user with project management permission changes an employee's role, THE system SHALL validate the new role is either member or project-lead.

IF an invalid role change is attempted, THEN THE system SHALL reject the role change request.

THE system SHALL enforce that each project membership has exactly one assigned role.

WHEN viewing project members, THE system SHALL display the assigned role for each employee.

### Member Removal and Task Preservation

WHEN a user with project management permission removes an employee from a project, THE system SHALL preserve all tasks assigned to that employee.

IF an employee is removed from a project, THEN THE system SHALL not delete their associated tasks.

WHEN a project member is removed, THE system SHALL retain task history records for that employee's tasks.

IF a project lead is removed from a project, THEN THE system SHALL preserve their task management history.

WHEN removing a member, THE system SHALL not cascade delete any related data such as timelogs or task assignments.

THE system SHALL allow reassignment of tasks to other employees after a member is removed.

### Project Lead Access Control

WHEN a project lead attempts to manage tasks outside their assigned project, THE system SHALL reject the request.

IF a user without project-lead role attempts to manage tasks, THEN THE system SHALL reject the request.

WHEN a project lead's role is changed to member, THE system SHALL remove their task management permissions for that project.

IF a project lead attempts to assign tasks to employees not in the project, THEN THE system SHALL reject the assignment.

WHEN viewing tasks, THE system SHALL only show tasks within the project lead's assigned project.

THE system SHALL validate project lead permissions before allowing task creation, editing, or deletion.

## Task Error Scenarios

Project leads or users with project management permission can create tasks within a project. Task title is required when creating a task. Task status can be open, in-progress, completed, or closed. Task priority can be low, medium, high, or urgent. Estimated hours is optional when creating a task. Due date is optional when creating a task. Assigned employee is optional and must be a project member. Parent task is optional for subtasks with one level of nesting only. Project leads can edit tasks in their project. Users with project management permission can edit any task. Task status changes are recorded in task history. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, and creation date.

### Task Creation Validation Errors

WHEN a project lead attempts to create a task without providing a title, THE system SHALL reject the task creation request.

WHEN a project lead attempts to create a task and assigns an employee who is not a member of the project, THE system SHALL reject the task creation request.

WHEN a project lead attempts to create a subtask with a parent task that already has a parent task, THE system SHALL reject the task creation request (only one level of nesting allowed).

WHEN a project lead attempts to create a task with an invalid priority value (not low, medium, high, or urgent), THE system SHALL reject the task creation request.

WHEN a project lead attempts to create a task with an invalid status value (not open, in-progress, completed, or closed), THE system SHALL reject the task creation request.

WHEN a user without project lead role or project management permission attempts to create a task, THE system SHALL reject the task creation request.

### Task Editing Permission Errors

WHEN a project lead attempts to edit a task in a project where they do not have project lead role, THE system SHALL reject the task edit request.

WHEN an employee without project lead role or project management permission attempts to edit a task, THE system SHALL reject the task edit request.

WHEN a project lead attempts to change the assigned employee to someone who is not a project member, THE system SHALL reject the task edit request.

WHEN a user attempts to edit a task in a project they are not assigned to, THE system SHALL reject the task edit request.

### Task Status Change Errors

WHEN a user attempts to change a task status to an invalid value, THE system SHALL reject the status change request.

WHEN a user without project lead role or project management permission attempts to change a task status, THE system SHALL reject the status change request.

### Task Assignment Validation Errors

WHEN a task is created with an assigned employee, THE system SHALL verify that the employee is a member of the project.

WHEN a task assignment is changed to an employee who has been deactivated, THE system SHALL reject the assignment change request.

WHEN a task assignment is changed to an employee who has been removed from the project, THE system SHALL reject the assignment change request.

WHEN a task is created without an assigned employee, THE system SHALL allow the task creation with no employee assigned.

### Task Parent-Child Relationship Errors

WHEN a parent task is created, THE system SHALL allow the task without a parent task reference.

WHEN a subtask is created with a parent task, THE system SHALL verify that the parent task belongs to the same project.

WHEN a subtask is created with a parent task that does not exist, THE system SHALL reject the task creation request.

WHEN a user attempts to create a subtask of a subtask (second-level nesting), THE system SHALL reject the task creation request.

WHEN the parent task of a subtask is deleted, THE system SHALL set the subtask's parent task reference to null.

### Task Viewing Access Errors

WHEN an employee attempts to view tasks in a project they are not assigned to, THE system SHALL reject the task view request.

WHEN an employee attempts to view tasks, THE system SHALL only show tasks from projects where the employee is a project member.

WHEN a user with project view permission attempts to view tasks, THE system SHALL allow viewing all tasks in the organization.

WHEN a deactivated employee attempts to view tasks, THE system SHALL reject the task view request.

### Task Filtering and Sorting Errors

WHEN tasks are filtered by status, THE system SHALL only accept valid status values (open, in-progress, completed, closed).

WHEN tasks are filtered by priority, THE system SHALL only accept valid priority values (low, medium, high, urgent).

WHEN tasks are filtered by assigned employee, THE system SHALL verify that the employee exists in the organization.

WHEN tasks are sorted by due date, THE system SHALL handle tasks without a due date by placing them at the end of the sorted list.

WHEN tasks are sorted by priority, THE system SHALL order tasks by priority level (urgent, high, medium, low).

WHEN tasks are sorted by creation date, THE system SHALL order tasks chronologically by when they were created.

## TaskHistory Error Scenarios

Task status changes are automatically recorded in task history. Each task history entry records the timestamp of the change. Each task history entry records the old status before the change. Each task history entry records the new status after the change. Each task history entry records who made the change. Task history entries are immutable after creation. Task history provides audit trail for status transitions. Multiple status changes create multiple history entries. Task history is associated with the specific task. Task history cannot be modified by users. Task history entries are created on every status transition.

### Task Status Change Recording

When a task status changes, the system automatically creates a task history entry. Each history entry records the timestamp when the status change occurred. Each history entry captures the old status before the change. Each history entry captures the new status after the change. Each history entry records the user who made the status change. Task history entries are created on every status transition without exception. The system records status changes regardless of which user performs the action.

### Task History Immutability

Task history entries cannot be modified after creation. Task history entries cannot be deleted by any user. Task history entries remain permanently associated with their original task. Users cannot edit historical status change records. Users cannot remove entries from the task history. The system preserves all task history entries as an immutable audit record.

### Task History Audit Trail

Task history provides a complete audit trail for all status transitions. Multiple status changes on the same task create multiple separate history entries. Each history entry is permanently associated with its specific task. The task history shows the complete sequence of status changes over time. Users can view the chronological order of all status changes. The audit trail enables tracking of task progression through different statuses.

## Timelog Error Scenarios

Employees can log time entries as timelogs. Date is required when creating a timelog. Duration in minutes is required when creating a timelog. Project is required and must be a project the employee is assigned to. Task is optional and must belong to the selected project. Description is optional when creating a timelog. Billable flag defaults to true when creating a timelog. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if not part of an approved timesheet. Employees can delete their own timelogs only if not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee timelogs. Users with time view all permission can view all employees timelogs. Employees can view their own timelogs. Timelogs can be filtered by date range, project, task, and billable status.

### Timelog Creation Validation Errors

When creating a timelog, the system shall reject the request if the date is not provided.

When creating a timelog, the system shall reject the request if the duration in minutes is not provided.

When creating a timelog, the system shall reject the request if the project is not specified.

When creating a timelog, the system shall reject the request if the selected project is not one the employee is assigned to.

When creating a timelog with a task, the system shall reject the request if the task does not belong to the selected project.

When creating a timelog without specifying a billable flag, the system shall default the billable status to true.

When creating a timelog, the description field may be left empty without causing rejection.

### Timelog Creation Permission Errors

When an employee attempts to create a timelog for another employee, the system shall reject the request.

When an employee attempts to create a timelog, the system shall associate it only with that employee's record.

Employees shall not be able to create timelogs on behalf of other employees, regardless of their role within the organization.

### Timelog Edit Permission Errors

When an employee attempts to edit a timelog that is part of an approved timesheet, the system shall reject the request.

When an employee attempts to edit a timelog that is part of a submitted timesheet awaiting approval, the system shall reject the request.

When a user with time management permission attempts to edit any employee's timelog, the system shall allow the edit regardless of timesheet status.

When an employee attempts to edit another employee's timelog, the system shall reject the request.

### Timelog Delete Permission Errors

When an employee attempts to delete a timelog that is part of a submitted timesheet, the system shall reject the request.

When an employee attempts to delete a timelog that is part of an approved timesheet, the system shall reject the request.

When a user with time management permission attempts to delete any employee's timelog, the system shall allow the deletion regardless of timesheet status.

When an employee attempts to delete another employee's timelog, the system shall reject the request.

### Timelog View Permission Errors

When an employee attempts to view another employee's timelogs, the system shall reject the request.

When an employee views their own timelogs, the system shall display only their timelog records.

When a user with time view all permission attempts to view all employees' timelogs, the system shall display timelogs from all employees in the organization.

When a user without time view all permission attempts to view all employees' timelogs, the system shall reject the request.

### Timelog Filtering Errors

When filtering timelogs by date range, the system shall return only timelogs within the specified date range.

When filtering timelogs by project, the system shall return only timelogs associated with the selected project.

When filtering timelogs by task, the system shall return only timelogs associated with the selected task.

When filtering timelogs by billable status, the system shall return only timelogs matching the selected billable filter.

When applying multiple filters simultaneously, the system shall return timelogs that match all specified filter criteria.

When filtering timelogs with invalid filter values, the system shall return an empty result set without error.

## Timesheet Error Scenarios

A timesheet is a collection of timelogs for a specific week from Monday to Sunday. Employees submit timesheets for approval. Timesheet status can be draft, submitted, approved, or rejected. Total hours is calculated from included timelogs. Employees can create a draft timesheet for a specific week. Creating a draft automatically includes all timelogs for that employee in that week. Employees can add or remove timelogs from a draft timesheet. Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Users with time approve permission can view all submitted timesheets. Users with time approve permission can approve submitted timesheets. Approved timesheets lock all included timelogs from editing or deletion. Users with time approve permission can reject submitted timesheets with a reason. Rejection reason is required when rejecting a timesheet. Rejected timesheets return to draft status. Employees can modify and resubmit rejected timesheets. Employees can view their own timesheets. Timesheets can be filtered by status and date range.

### Timesheet Week Definition and Validation

WHEN a timesheet is created, THE system SHALL define the week as starting on Monday and ending on Sunday.

WHEN an employee attempts to create a timesheet for a week, THE system SHALL validate that the week start date falls on a Monday.

IF the provided week start date is not a Monday, THEN THE system SHALL reject the timesheet creation request.

WHEN a timesheet is created, THE system SHALL automatically calculate the week end date as Sunday of the same week.

WHEN viewing timesheets, THE system SHALL display the week range as Monday through Sunday for each timesheet.

### Timesheet Status Transitions and Constraints

WHEN a timesheet is created, THE system SHALL initialize its status as draft.

WHILE a timesheet status is draft, THE system SHALL allow the employee to add or remove timelogs.

WHEN an employee submits a draft timesheet, THE system SHALL change the status to submitted.

WHILE a timesheet status is submitted, THE system SHALL prevent the employee from modifying the timesheet.

WHEN a user with time approve permission approves a submitted timesheet, THE system SHALL change the status to approved.

WHILE a timesheet status is approved, THE system SHALL prevent any modifications to the timesheet or its timelogs.

WHEN a user with time approve permission rejects a submitted timesheet, THE system SHALL change the status to rejected.

WHEN a timesheet status is rejected, THE system SHALL automatically transition it back to draft status.

WHILE a timesheet status is draft after rejection, THE system SHALL allow the employee to modify and resubmit the timesheet.

IF an employee attempts to modify an approved timesheet, THEN THE system SHALL reject the modification request.

### Draft Timesheet Creation and Timelog Inclusion

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL automatically include all timelogs belonging to that employee for that week.

WHEN a draft timesheet is created, THE system SHALL calculate the total hours by summing the duration of all included timelogs.

WHEN an employee adds a timelog to a draft timesheet, THE system SHALL update the total hours calculation to include the new timelog duration.

WHEN an employee removes a timelog from a draft timesheet, THE system SHALL update the total hours calculation to exclude the removed timelog duration.

IF a timelog belongs to a different week than the timesheet, THEN THE system SHALL reject the attempt to add it to the timesheet.

IF an employee attempts to add a timelog that is already part of an approved timesheet, THEN THE system SHALL reject the addition request.

IF an employee attempts to remove a timelog that is part of an approved timesheet, THEN THE system SHALL reject the removal request.

WHEN a draft timesheet is created and no timelogs exist for that employee in that week, THE system SHALL create an empty draft timesheet with zero total hours.

### Timesheet Submission Validation Errors

WHEN an employee attempts to submit a draft timesheet, THE system SHALL validate that the timesheet contains at least one timelog.

IF a timesheet has no timelogs, THEN THE system SHALL reject the submission request and display an error indicating timelogs are required.

WHEN an employee attempts to submit a timesheet for a week, THE system SHALL check if another timesheet for the same week already exists with status submitted or approved.

IF another timesheet for the same week is already submitted or approved, THEN THE system SHALL reject the submission request and display an error indicating a timesheet for that week already exists.

IF an employee attempts to submit a timesheet that is already in submitted status, THEN THE system SHALL reject the request and indicate the timesheet is already submitted.

IF an employee attempts to submit a timesheet that is already in approved status, THEN THE system SHALL reject the request and indicate the timesheet cannot be resubmitted.

IF an employee attempts to submit a timesheet that is in rejected status, THEN THE system SHALL allow the submission after the employee has made modifications.

### Timesheet Approval and Timelog Locking

WHEN a user with time approve permission views submitted timesheets, THE system SHALL display only timesheets with status submitted.

WHEN a user with time approve permission approves a submitted timesheet, THE system SHALL change the timesheet status to approved.

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet.

WHILE timelogs are locked by an approved timesheet, THE system SHALL prevent the employee from editing those timelogs.

WHILE timelogs are locked by an approved timesheet, THE system SHALL prevent the employee from deleting those timelogs.

IF an employee attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the edit request and indicate the timelog is locked.

IF an employee attempts to delete a timelog that is part of an approved timesheet, THEN THE system SHALL reject the delete request and indicate the timelog is locked.

IF a user with time manage permission attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the edit request and indicate the timelog is locked by approval.

IF a user with time manage permission attempts to delete a timelog that is part of an approved timesheet, THEN THE system SHALL reject the delete request and indicate the timelog is locked by approval.

### Timesheet Rejection and Rejection Reason Validation

WHEN a user with time approve permission rejects a submitted timesheet, THE system SHALL require a rejection reason to be provided.

IF a user attempts to reject a timesheet without providing a rejection reason, THEN THE system SHALL reject the action and display an error indicating a reason is required.

WHEN a timesheet is rejected with a reason, THE system SHALL store the rejection reason for the employee to review.

WHEN a timesheet is rejected, THE system SHALL automatically change the status from submitted back to draft.

WHEN a timesheet is rejected and returns to draft status, THE system SHALL allow the employee to view the rejection reason.

WHEN a timesheet is rejected, THE system SHALL unlock all timelogs that were previously locked by the submitted status.

WHEN an employee modifies a rejected timesheet, THE system SHALL allow the employee to add, remove, or edit timelogs as with any draft timesheet.

### Timesheet Viewing and Filtering Constraints

WHEN an employee views timesheets, THE system SHALL display only timesheets belonging to that employee.

IF an employee attempts to view timesheets belonging to another employee, THEN THE system SHALL reject the request and indicate insufficient permissions.

WHEN a user with time view all permission views timesheets, THE system SHALL display timesheets for all employees in the organization.

WHEN users view timesheets, THE system SHALL allow filtering by timesheet status (draft, submitted, approved, rejected).

WHEN users view timesheets, THE system SHALL allow filtering by date range to show timesheets within specific weeks.

IF a user applies both status and date range filters, THEN THE system SHALL return timesheets that match both filter criteria.

WHEN timesheets are filtered by date range, THE system SHALL include timesheets where the week start date falls within the specified range.

WHEN timesheets are displayed, THE system SHALL paginate the results.

IF no timesheets match the applied filters, THEN THE system SHALL display an empty state message.

## Timer Error Scenarios

Employees can start a timer to track time in real-time. Each employee can have at most one active timer at a time. Starting a timer requires selecting a project. Task selection is optional when starting a timer. The timer records start timestamp, project, task, and description. Employees can stop their timer. Stopping the timer creates a timelog with the calculated duration. Duration is rounded to the nearest minute when timer stops. Employees can discard their timer without creating a timelog. Employees can view their currently running timer. If an employee forgets to stop their timer, it continues running indefinitely. No automatic timer stop occurs. Employees can edit the description of a running timer. Employees can edit the project of a running timer. Employees can edit the task of a running timer.

### Timer Starting Error Conditions

WHEN an employee attempts to start a timer without selecting a project, THE system SHALL reject the request. WHEN an employee attempts to start a timer for a project they are not assigned to, THE system SHALL reject the request. WHEN an employee attempts to start a timer while another timer is already running, THE system SHALL prevent starting a second timer. WHEN an employee attempts to start a timer for a project that does not exist, THE system SHALL reject the request. WHEN an employee attempts to start a timer for a project that is archived or completed, THE system SHALL reject the request. WHEN an employee attempts to start a timer for a task that does not belong to the selected project, THE system SHALL reject the request. WHEN an employee attempts to start a timer with a task that does not exist, THE system SHALL reject the request.

### Timer Stopping and Timelog Creation Errors

WHEN an employee attempts to stop a timer that does not exist, THE system SHALL reject the request. WHEN an employee attempts to stop a timer that does not belong to them, THE system SHALL reject the request. WHEN an employee attempts to stop a timer that is not currently running, THE system SHALL reject the request. WHEN stopping a timer creates a timelog with a duration of zero minutes after rounding, THE system SHALL still create the timelog. WHEN stopping a timer and the associated project is no longer active, THE system SHALL still create the timelog with the original project reference. WHEN stopping a timer and the associated task is no longer available, THE system SHALL still create the timelog with the original task reference.

### Timer Discarding Error Conditions

WHEN an employee attempts to discard a timer that does not exist, THE system SHALL reject the request. WHEN an employee attempts to discard a timer that does not belong to them, THE system SHALL reject the request. WHEN an employee attempts to discard a timer that is not currently running, THE system SHALL reject the request. WHEN an employee discards a timer, THE system SHALL not create any timelog entry. WHEN an employee discards a timer that has been running for an extended duration, THE system SHALL terminate the timer without creating any record.

### Timer Viewing Error Conditions

WHEN an employee attempts to view a timer that does not exist, THE system SHALL indicate no active timer is running. WHEN an employee attempts to view a timer that does not belong to them, THE system SHALL reject the request. WHEN an employee with no active timer views the timer status, THE system SHALL show that no timer is currently running. WHEN an employee views their running timer, THE system SHALL display the start time, selected project, task if any, and description. WHEN an employee views their running timer, THE system SHALL show the elapsed time from start to current moment.

### Timer Persistence and Auto-Stop Behavior

WHEN an employee forgets to stop their timer, THE system SHALL continue running it indefinitely. WHEN an employee logs out with a running timer, THE system SHALL preserve the timer state. WHEN an employee closes their browser with a running timer, THE system SHALL preserve the timer state. WHEN an employee switches organizations with a running timer, THE system SHALL preserve the timer in the original organization. WHEN no automatic timer stop is configured, THE system SHALL not impose any time limits on running timers. WHEN a timer has been running for an extended period without being stopped, THE system SHALL continue accumulating time.

### Timer Editing Error Conditions

WHEN an employee attempts to edit the start timestamp of a running timer, THE system SHALL reject the request. WHEN an employee attempts to edit the project of a running timer to a project they are not assigned to, THE system SHALL reject the request. WHEN an employee attempts to edit the project of a running timer to a project that does not exist, THE system SHALL reject the request. WHEN an employee attempts to edit the task of a running timer to a task that does not belong to the selected project, THE system SHALL reject the request. WHEN an employee attempts to edit the task of a running timer to a task that does not exist, THE system SHALL reject the request. WHEN an employee successfully edits the description of a running timer, THE system SHALL immediately reflect the change. WHEN an employee successfully edits the project of a running timer, THE system SHALL continue running the timer with the new project assignment. WHEN an employee successfully edits the task of a running timer, THE system SHALL continue running the timer with the new task assignment.

## ActivityLog Error Scenarios

The system records significant actions as activity log entries. Each activity log entry has timestamp, user, action type, target entity, and details. Logged actions include employee invited, deactivated, and reactivated. Logged actions include contract created or edited. Logged actions include project created, archived, completed, and deleted. Logged actions include task status changed. Logged actions include timesheet submitted, approved, and rejected. Logged actions include role assigned or changed. Users with organization management permission can view the full activity log. The activity log is paginated for large datasets. The activity log can be filtered by action type. The activity log can be filtered by user. The activity log can be filtered by date range. Activity log entries are immutable after creation.

### Activity Log Entry Structure

Each activity log entry records a timestamp indicating when the action occurred.
Each activity log entry records the user who performed the action.
Each activity log entry records the action type that was performed.
Each activity log entry records the target entity that was affected by the action.
Each activity log entry records details about the action that was performed.
Activity log entries are automatically created when significant actions occur in the system.
Activity log entries are created without requiring manual intervention from users.

### Employee Actions Logging

When an employee is invited to an organization, the system creates an activity log entry.
When an employee is deactivated, the system creates an activity log entry.
When an employee is reactivated, the system creates an activity log entry.
Employee invitation activity log entries record the invited email address.
Employee deactivation activity log entries record the deactivated employee and who performed the deactivation.
Employee reactivation activity log entries record the reactivated employee and who performed the reactivation.

### Contract Actions Logging

When an employee contract is created, the system creates an activity log entry.
When an employee contract is edited, the system creates an activity log entry.
Contract creation activity log entries record the employee, contract details, and who created the contract.
Contract edit activity log entries record the employee, what was changed, and who made the change.

### Project Actions Logging

When a project is created, the system creates an activity log entry.
When a project is archived, the system creates an activity log entry.
When a project is completed, the system creates an activity log entry.
When a project is deleted, the system creates an activity log entry.
Project creation activity log entries record the project name and who created it.
Project archive activity log entries record the archived project and who archived it.
Project completion activity log entries record the completed project and who completed it.
Project deletion activity log entries record the deleted project and who deleted it.

### Task Actions Logging

When a task status is changed, the system creates an activity log entry.
Task status change activity log entries record the task, old status, new status, and who made the change.
Task status changes are logged regardless of which user performs the status update.

### Timesheet Actions Logging

When a timesheet is submitted, the system creates an activity log entry.
When a timesheet is approved, the system creates an activity log entry.
When a timesheet is rejected, the system creates an activity log entry.
Timesheet submission activity log entries record the employee, week dates, and submission timestamp.
Timesheet approval activity log entries record the employee, week dates, approver, and approval timestamp.
Timesheet rejection activity log entries record the employee, week dates, reviewer, rejection timestamp, and rejection reason.

### Role Actions Logging

When a role is assigned to an employee, the system creates an activity log entry.
When a role is changed for an employee, the system creates an activity log entry.
Role assignment activity log entries record the employee, assigned role, and who made the assignment.
Role change activity log entries record the employee, old role, new role, and who made the change.

### Activity Log Viewing Permissions

Users with organization management permission can view the full activity log for their organization.
The activity log displays all recorded actions for the organization.
The activity log shows timestamp, user, action type, target entity, and details for each entry.
Users without organization management permission cannot view the activity log.
The activity log is scoped to the currently selected organization context.
If a user without organization management permission attempts to view the activity log, the request is rejected.

### Activity Log Pagination

The activity log is paginated to handle large datasets efficiently.
Users can navigate through multiple pages of activity log entries.
Each page displays a subset of activity log entries.
The system maintains consistent pagination across filtered and unfiltered views.
When all activity log entries have been viewed, no additional pages are available.

### Activity Log Filtering

Users with organization management permission can filter the activity log by action type.
Users with organization management permission can filter the activity log by user who performed the action.
Users with organization management permission can filter the activity log by date range.
Multiple filters can be combined to narrow down activity log results.
Filtering applies to the currently paginated view of the activity log.
If the date range filter has an end date before the start date, the filter is rejected.
If no activity log entries match the applied filters, an empty result set is returned.

### Activity Log Immutability

Activity log entries are immutable after creation.
Activity log entries cannot be edited by any user.
Activity log entries cannot be deleted by any user.
The system preserves all historical activity log entries for audit purposes.
Activity log entries maintain their original timestamp, user, action type, target entity, and details permanently.
If a user attempts to edit an activity log entry, the request is rejected.
If a user attempts to delete an activity log entry, the request is rejected.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New Organization Setup Journey

A new user signs up with email and password, creating their first organization during the initial registration process. The user provides organization details including name, description, currency, timezone, and fiscal start month. After organization creation, the user can optionally invite employees by email to join the organization. If invited users already have accounts, they are automatically added to the organization. If invited users do not have accounts, pending invitations are created and activated when those users sign up with the same email. The organization owner can create departments to structure the organization, with optional parent department relationships for one level of nesting. The owner can then create projects with names, descriptions, and required color codes for visual identification. Employees can be assigned to projects with specific roles such as member or project-lead. Once the organization structure is in place, employees can begin tracking time and submitting timesheets for approval. The organization owner can view the activity log to see all significant actions taken within the organization, including employee invitations, project creations, and role assignments.

### Employee Onboarding and Time Tracking Journey

An employee receives an email invitation to join an organization. If the employee already has a user account, they are automatically added to the organization with the assigned role. If the employee does not have an account, they sign up with email and password, and upon completion are automatically added to the pending organization. The employee logs in and selects the organization context to begin work. The employee views their assigned projects and tasks within those projects. The employee can start a timer to track time in real-time, selecting a project and optionally a specific task. While the timer is running, the employee can edit the description and project or task association. When the employee stops the timer, a time entry is automatically created with the calculated duration rounded to the nearest minute. The employee can also manually create time entries with date, duration, project, task, and description. The employee can view their own time entries, filtered by date range, project, task, or billable status. At the end of the week, the employee creates a draft timesheet that automatically includes all time entries for that week. The employee can add or remove time entries from the draft timesheet before submission. The employee submits the draft timesheet for approval, which changes its status to submitted. The employee can view the status of their timesheets and see any rejection reasons if a timesheet is rejected by a manager.

### Project Management and Task Workflow Journey

A user with project management permissions creates a new project with a name, optional description, and required color code. The user can optionally set budget hours, start date, and end date for the project. The user assigns employees to the project, designating some as project leads and others as members. Project leads can create tasks within their project with titles and optional descriptions. Tasks can have status values of open, in-progress, completed, or closed. Tasks can have priority levels of low, medium, high, or urgent. Project leads can assign tasks to specific employees who are members of the project. Project leads can set estimated hours and due dates for tasks. When a task status changes, the system automatically records the change in task history, including the timestamp, old status, new status, and who made the change. Employees assigned to tasks can view the tasks in projects they belong to. Employees can filter tasks by status, priority, or assigned employee. Employees can sort tasks by due date, priority, or creation date. When a project is archived or completed, no new time entries can be added to that project, but existing time entries are preserved. Project managers can delete projects only if no time entries are associated with them. The activity log records project creation, archiving, completion, and deletion events.

### Timesheet Approval and Review Journey

An employee creates a draft timesheet for a specific week, which automatically includes all time entries for that employee during that week. The employee can modify the draft timesheet by adding or removing time entries before submission. The employee submits the timesheet for approval, changing its status from draft to submitted. A user with timesheet approval permissions views all submitted timesheets awaiting approval. The reviewer can approve a submitted timesheet, which locks all included time entries so they cannot be edited or deleted. The reviewer can reject a submitted timesheet with a required rejection reason. When a timesheet is rejected, it returns to draft status and the employee can modify and resubmit it. The timesheet records the review timestamp and the user who approved or rejected it. The employee can view their own timesheets with their current status. Users with report viewing permissions can access organization-wide reports showing total hours logged per employee, project budget utilization, and weekly summaries. The activity log records timesheet submissions, approvals, and rejections with timestamps and user information.

### Employee Contract Management Journey

A user with employee management permissions creates a contract for an employee with a start date, pay rate, pay period, and working hours per week. The contract may have an optional end date, with null indicating an ongoing contract. When a new contract is created, any previous active contract for that employee is automatically ended by setting its end date to the day before the new contract starts. Only one contract can be active at any time for an employee. Users with employee management permissions can edit the current active contract, but past contracts cannot be modified and serve as an immutable historical record. Employees can view their own contracts to see their compensation details and contract periods. Users with employee viewing permissions can view any employee's contracts within the organization. When an employee is deactivated, their historical contract data is preserved. When an employee is reactivated, their contract history remains intact. The activity log records contract creation and editing events with timestamps and user information.

### Multi-Organization User Journey

A user belongs to multiple organizations and logs in with email and password. Upon login, the user selects which organization context to work in. All subsequent actions, including viewing employees, projects, tasks, time entries, and timesheets, are scoped to the selected organization. The user can switch between organizations without logging out, changing the organization context for all operations. The user's global profile, including display name, avatar image, and phone number, is shared across all organizations. When the user deletes their account, if they are the sole owner of an organization, they must first transfer ownership or delete the organization. After account deletion, the user's employee records in other organizations are marked as deactivated. The user can view the activity log for each organization separately, seeing only actions within the currently selected organization context.