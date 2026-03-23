**hrmTracker — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

Users create a new organization during initial sign-up, providing name, description, logo, currency, timezone, and fiscal start month. Only the organization owner can edit these settings or delete the organization. Deletion is permitted only when there are no pending timesheets (all must be approved or rejected), no active employee contracts, and all associated data—including employees, projects, tasks, timelogs, and timesheets—are permanently removed. The owner's account remains but loses access to the deleted organization. Users with multiple organizations can switch contexts without logging out, and all subsequent actions are scoped to the selected organization.

### Organization Creation Flow

Users can create a new organization during initial sign-up by providing required details: organization name (required), description (optional), logo image (optional), currency (e.g., USD, EUR, KRW), timezone, and fiscal start month (e.g., January, July). The creating user becomes the organization's sole owner. Each organization must have a unique name within the system. If the name is already in use, the request is rejected. The organization is associated with the creating user's account and becomes their first organization context upon sign-up.

### Owner-Only Settings Editing

Only organization owners can edit organization settings, including name, description, logo, currency, timezone, and fiscal start month. All other roles (Managers, Employees, custom roles) cannot modify these fields. The system enforces that only users with the Owner role in the current organization can access settings editing. Any non-owner attempting to edit organization settings is denied. The organization context must be explicitly selected by the user for any edit request to be valid.

### Deletion Eligibility Conditions

Organization owners can delete their organization only if all of the following conditions are met: (1) All pending timesheets are resolved (either approved or rejected), (2) There are no active employee contracts in the organization (all contracts must have an end date set), and (3) The organization has no pending invitations. If any of these conditions are not met, the deletion request is rejected with a clear explanation of what remains unresolved. Deletion cannot be initiated if the organization is the user's only organization and they attempt to delete without prior ownership transfer.

### Data Permanence on Delete

When an organization is deleted, all associated data is permanently removed and cannot be recovered. This includes all employees, projects, tasks, timelogs, timesheets, departments, contracts, activity logs, pending invitations, and project members linked to the organization. The deletion is irreversible and immediate. No backup or soft-delete mechanism exists—the data is purged from the system.

### Organization Context Switching

Users who belong to multiple organizations can switch their organization context without logging out. After selecting a new organization, all subsequent actions (creating timelogs, viewing reports, editing projects, etc.) are scoped exclusively to the selected organization. The user's global profile (display name, avatar, phone number) remains unchanged and is used across all organization contexts. Context switching does not affect session validity or authentication tokens.

### Multi-Tenancy Isolation

All data is strictly isolated per organization. Employees in one organization cannot view, access, or interact with data from another organization, even if they belong to both. The system enforces organization-scoped queries on all operations—every request must include the current organization context, and the system rejects any attempt to access data outside that scope. This isolation applies to employees, projects, tasks, timelogs, timesheets, departments, and activity logs.

### Owner Account Retention After Delete

When an organization is deleted, the owner's user account remains active in the system but is no longer associated with the deleted organization. The owner can continue to use the system if they are a member of other organizations by switching to another organization context. If the owner had no other organizations, they remain signed in but with no available organization context until they join or create a new one. Their global profile and authentication credentials persist unchanged.

## User Operations

Users sign up with a unique email and password, and log in by selecting an organization context. Users can change their password at any time. A user may belong to multiple organizations, and their login includes organization selection. Users can delete their own account only after resolving ownership responsibilities: transferring organization ownership or deleting the organization first. When deleting their account, their employee records in other organizations are deactivated rather than deleted. All actions are scoped to the selected organization, and profile settings (e.g., display name, avatar) remain global across organizations.

### User Sign-Up

Users can sign up for an account using a unique email address and a password. The email address must be unique across the entire system. During sign-up, users provide their display name, which will be used globally across all organizations they join. The password is stored encrypted and is used for authentication across all organizations. Upon successful sign-up, the user account is created and remains active until explicitly deleted by the user or organizational policies apply.

### Login with Organization Context

Users log in using their email and password. After successful authentication, users must select an organization context in which to work. All subsequent actions are scoped to the selected organization. The selected organization determines which employee record, projects, tasks, and data the user can access. Switching organization contexts does not require re-authentication and is available from within the application interface.

### Password Change

Users can change their password at any time. The new password must meet basic complexity requirements (e.g., sufficient length). The system requires the current password for verification before allowing a change. If the current password is incorrect, the request is rejected. Password changes apply globally and affect all future logins across all organizations.

### Multi-Organization Membership

A single user account can belong to multiple organizations. Each organization membership is represented by a separate employee record within that organization, with its own role and department assignments. The same user account is referenced across all organizations, but all operations and data visibility remain strictly scoped to the currently selected organization. Users see only the data and features available in the selected organization context.

### Account Deletion Responsibility

Users can delete their own account. However, if the user is the sole owner of an organization, they must first transfer ownership to another user or delete the organization entirely before account deletion can proceed. The system will block account deletion if the user has active ownership responsibilities. Ownership transfer or organization deletion must be completed first. Once eligibility is confirmed, account deletion proceeds and applies globally.

### Employee Deactivation on Account Delete

When a user deletes their account, their employee records in all organizations are marked as 'deactivated'. Deactivated employee records preserve historical data (timelogs, timesheets, activity logs) but prevent future activity such as logging time or submitting timesheets. Deactivation does not delete employee records or associated historical data. Reactivation of a previously deleted account is not possible.

### Global Profile Consistency

Each user has a global profile consisting of display name, avatar image, and phone number. This profile is shared across all organizations the user belongs to. Changes to profile information are immediately reflected across all organizational contexts. Department, position, and employment type are defined per organization and are not part of the global profile.

## Employee Operations

Users with employee:manage permission invite new employees via email. Invitations create either direct membership (if email already has an account) or a pending invitation. Each employee record links to a user account, assigns a role, and optionally includes department, position, employment type, and status (active/deactivated). Employees can be deactivated—preventing time tracking and timesheet submission—while preserving historical data. Deactivated employees can be reactivated. Employees with employee:view permission can search and filter the employee list by department, employment type, status, and name, and pagination is applied to the list.

### Employee Invitation by Email

Users with employee:manage permission can invite new employees to the organization by entering their email address.

If the invited email corresponds to an existing user account, the user is immediately added to the organization as an employee with the invited role.

If the invited email does not correspond to an existing account, a pending invitation is created for that email address within the organization.

The invitation email contains a secure link to either sign up (if new user) or join the organization (if existing user).

The invited user is notified via email of the invitation.

### Direct Join vs Pending Invitation Handling

When an invited email already has an account, the user is directly added to the organization as an employee with the assigned role, department, and position (if provided in the invitation).

The user gains access to the organization immediately upon account verification.

When an invited email has no account, a pending invitation record is created in the organization.

The pending invitation remains until the user signs up using the exact email address from the invitation.

Upon signup, the user is automatically added to the organization with the role and details from the pending invitation.

No manual intervention is required to finalize either the direct join or pending invitation process.

### Deactivation Impact on Operations

Users with employee:manage permission can deactivate an employee.

When an employee is deactivated:

- They cannot create or edit timelogs
- They cannot submit or modify timesheets
- They cannot start timers
- They cannot access project-related time tracking features

Deactivation does not delete historical data.

The employee record remains in the system with status "deactivated".

All existing timelogs, timesheets, and project memberships associated with the deactivated employee are preserved.

### Historical Data Preservation on Deactivation

When an employee is deactivated, their historical timelogs, timesheets, and project memberships remain intact.

Timelogs associated with the deactivated employee are preserved and can be viewed by users with appropriate permissions.

Timesheets submitted by the deactivated employee before deactivation remain in their original state (draft, submitted, approved, or rejected).

Project memberships are preserved to maintain historical project contribution records.

Deactivated employees' roles, contracts, and activity log entries remain in place as immutable historical records.

No data is deleted or modified during deactivation except the employee's active status field.

### Employee Reactivation Flow

Users with employee:manage permission can reactivate a deactivated employee.

Reactivation restores the employee's active status to "active".

Upon reactivation:

- The employee can create and edit timelogs (subject to timesheet approval rules)
- The employee can submit timesheets
- The employee can start timers
- The employee can access project-related time tracking features

The employee's historical data remains unchanged.

The employee's previous role, department, position, and contract records remain unchanged.

No new records are created during reactivation—only the status field is updated.

### Employee List Filtering and Search

Users with employee:view permission can view the employee list for their organization.

The employee list supports filtering by:

- Department (shows employees in selected department or no department)
- Employment type (full-time, part-time, contractor, intern)
- Status (active, deactivated)

The employee list supports search by name (case-insensitive partial match).

All filters and search terms can be combined.

The filter state is preserved during pagination.

### Employee List Pagination

The employee list is paginated to improve performance and usability.

Each page shows a fixed number of employee records (page size is determined by the system).

Pagination controls include first, previous, next, and last page navigation.

Page numbering or offset-based navigation is supported.

When filtering or searching, pagination restarts from the first page.

Pagination is applied after filtering and sorting, ensuring consistent page boundaries.

## Role Operations

Each organization defines its own set of roles. Three built-in roles—Owner, Manager, and Employee—cannot be deleted. Organization owners can create custom roles with a name and set of permissions. Custom roles can be edited or deleted only if no employees are currently assigned to them. Each employee in an organization is assigned exactly one role, and role assignments can be changed by users with employee:manage permission. Role-based permissions determine access to features like editing projects, approving timesheets, or viewing reports.

### Built-in Role Immutability

Three built-in roles — Owner, Manager, and Employee — are automatically created when an organization is established. These roles cannot be deleted or renamed. The permission set for each built-in role is fixed and defined by the system; organization owners cannot modify which permissions each built-in role possesses. The Owner role always has all permissions, including org:manage, employee:manage, time:approve, and report:view. The Manager role has permissions to manage employees, projects, approve timesheets, and view reports, but cannot manage roles or delete the organization. The Employee role has limited permissions: time:manage is not included; employees can only view their own data, track time, and submit timesheets for themselves.

### Custom Role Creation

Organization owners can create custom roles to support role-based access control tailored to their organization's structure. When creating a custom role, the owner must provide a unique name and select one or more permissions from the available set (e.g., org:manage, employee:manage, time:approve). A custom role can only be assigned to employees after creation. The same permission can be assigned to multiple custom roles. Creating a custom role does not affect existing employee assignments or built-in roles.

### Role Deletion Constraint

Custom roles can only be deleted if no employee is currently assigned to them. If any employee in the organization has the role assigned—even if that role is rarely used—the deletion request is rejected. Organization owners must reassign or remove all employees from a custom role before deleting it. Deletion of a role does not affect the employees themselves; it only removes the role assignment. Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances.

### Single Role Assignment Per Employee

Each employee in an organization is assigned exactly one role at a time. An employee cannot hold multiple roles simultaneously. When an organization owner or user with employee:manage permission changes an employee's role, the previous role assignment is replaced, not added to. Employees retain their historical role assignments as part of their activity log (if logging is enabled), but only their current role determines their permissions. Role changes take effect immediately for all subsequent actions.

### Role Edit Permission Scope

Only organization owners can create, edit, or delete roles. This applies to both built-in and custom roles. Users with employee:manage or other permissions cannot modify role definitions—even if they are managers. Editing a role updates its name (for custom roles only) or assigned permissions. When an organization owner edits a role, all employees assigned to that role immediately inherit the new permissions. Editing a built-in role is blocked; only its permissions (system-defined) can change through platform updates.

### Custom Role Edit and Delete Workflow

Organization owners can edit the name or permission set of a custom role at any time. When a custom role is edited, the changes apply to all employees assigned to it immediately. Before deleting a custom role, the system checks if any employee has that role assigned. If one or more employees are assigned, deletion is rejected and the owner is notified. If no employees are assigned, the custom role is permanently removed, and the owner receives confirmation. Editing or deleting a custom role does not affect built-in roles or other custom roles.

## Permission Operations

Permissions are predefined system codes (e.g., org:manage, employee:manage, time:approve) that determine what actions a user can perform. They are assigned to roles and cannot be created or modified directly by users. Each permission has a clear business description (e.g., edit organization settings, approve timesheets). Permissions are listed and inherited via role assignment. No user-level permission overrides exist—permissions flow strictly through role membership.

### Permission Code Definition and Meaning

The system includes a predefined set of permission codes that define specific business capabilities. Each permission code has a clear business description:
- org:manage — allows editing organization settings (name, description, currency, timezone)
- employee:manage — allows adding, editing, deactivating, and reactivating employees
- employee:view — allows viewing the employee list and individual employee details
- project:manage — allows creating, editing, archiving, completing, and deleting projects and tasks
- project:view — allows viewing all projects and tasks
- time:manage — allows editing or deleting any employee’s timelogs
- time:approve — allows approving or rejecting timesheets
- time:view_all — allows viewing all employees’ timelogs and timesheets
- report:view — allows viewing organization reports and dashboards

No user can create, modify, or delete permission codes directly; they are fixed system-defined values.

### Permission-to-Role Assignment Flow

Each role is assigned a set of permissions upon creation. Built-in roles (Owner, Manager, Employee) come with fixed permission sets defined by the system. Custom roles created by organization owners must include at least one permission code. Permissions are assigned in bulk to roles during role creation or editing; there is no per-user permission assignment. Once a role is assigned to an employee, the employee inherits all permissions associated with that role.

### No Direct User Permission Override

Users cannot have permissions granted or denied directly at the individual level. All permission access flows through role membership. An employee cannot bypass role restrictions by having special permission assignments. If an employee changes roles, their permissions update automatically based on the new role’s assigned permissions.

### Role Inheritance of Permissions

When a user is assigned a role within an organization, they inherit all permissions associated with that role. If a role’s permissions are updated, all employees with that role immediately gain or lose the updated permissions. The system enforces permissions at the time of each operation based on the user’s current role assignment.

### Permission List Visibility per Role

The permission list is not directly visible to regular employees. Users with employee:view or project:view permissions can see role names but not the detailed permission lists. Only organization owners and managers (who have org:manage or employee:manage permissions) can view the full list of permission codes associated with each role during role management operations. Permissions are always invisible in employee-facing interfaces; only the effective capability is reflected through allowed actions.

## Department Operations

Users with org:manage permission can create departments, each with a name, description, and optional parent department (one-level nesting only). Departments support hierarchical structuring but do not cascade employee assignments—editing a department does not update employees automatically. Deleting a department leaves employee department fields as null rather than deleting employees. All users can view the department list, though employees with restricted access cannot manage departments.

### Department Creation

Users with org:manage permission can create departments. Each department requires a name and may include a description. A parent department may be selected, but only one level of nesting is allowed—departments cannot have grandparent departments. A department cannot be its own parent, and circular parent-child references are prohibited. If a parent department is selected, it must belong to the same organization. Departments are scoped to the organization and cannot be shared across organizations.

### Department Editing and Deletion

Users with org:manage permission can edit department details (name, description, parent department). Editing a department does not automatically update employee records—employees retain their current department assignment even if the department structure changes. When a department is deleted, all employees assigned to that department retain their record but have their department field set to null. No employees are deleted when a department is removed. Deletion is allowed only if no employees are currently assigned to the department; otherwise, the request is rejected. Departments cannot be edited or deleted if doing so would violate nesting constraints (e.g., making a department a child of its own descendant).

### Employee Independence from Department Structure

Employees remain associated with their assigned organization regardless of department changes. Deactivating, reassigning, or deleting a department has no impact on employee accounts—only the department field on employee records changes (to null on department deletion). Employees can exist in an organization without being assigned to any department (department field is optional). Department structure changes do not affect employee status, roles, contracts, or historical data. The organization’s employee list and employee records are independent of department hierarchy.

### Department List Visibility

All users can view the list of departments in their currently selected organization. The department list is paginated and supports filtering by parent department (to display only direct children). Employees with employee:view or project:view permissions can view departments but cannot create, edit, or delete them. Only users with org:manage permission can modify department structure. Department visibility does not depend on role or permission beyond read access; all authenticated users in the organization can see the full department hierarchy.

## Contract Operations

Users with employee:manage permission can create contracts for employees. Each contract includes a start date, optional end date, pay rate, pay period, weekly working hours, and notes. Creating a new contract automatically ends the prior active contract (end date set to day before the new start date). Only the active contract can be edited; past contracts are immutable. Employees can view their own contracts. Employees with employee:view permission can view any employee's contracts. Contract history is preserved for reporting and auditing.

### Contract Creation

Users with employee:manage permission can create a new contract for an employee. Each contract must include a start date (required), pay rate (required), pay period (hourly, daily, weekly, monthly), and weekly working hours (required). Optional fields include an end date (null means ongoing) and notes.

Creating a new contract automatically terminates the employee's active contract by setting its end date to the day before the new contract's start date. This ensures only one active contract exists at a time.

### Active Contract Editing

Only the employee's active contract (current, not ended) can be edited by users with employee:manage permission.

Editing an active contract allows updating the pay rate, pay period, weekly working hours, notes, and end date (to set or extend). The start date is immutable once set.

Edits to the active contract do not affect past contract records; historical data remains unchanged for auditing.

### Past Contract Immutability

Past contracts (with an end date before today) are immutable and cannot be edited by anyone, including users with employee:manage permission.

No system action—including rollovers, corrections, or bulk updates—may modify any past contract.

This ensures integrity of historical compensation and compliance records.

### Employee Self-Contract Visibility

Employees can view their own contracts, including both active and past contracts.

Employees can see contract details such as start date, end date, pay rate, pay period, weekly working hours, and notes.

### Contract Review and Reporting

Contract history supports reporting and auditing needs. Past contracts remain accessible for generating compensation reports, verifying pay history, and ensuring payroll accuracy.

## Project Operations

Users with project:manage permission can create projects with a name, optional description, required color code, and optional budget, start/end dates. Projects have status: active, archived, or completed. Archived/completed projects cannot accept new timelogs, but existing timelogs remain intact. Projects can be deleted only if no timelogs exist. Users with project:view permission can view the project list, which supports filtering by status and pagination.

### Project Creation

Users with project:manage permission can create a project with a name (required), optional description, color code (required for UI display), and optional budget hours, start date, and end date. The project is automatically associated with the current organization context. If the name or color code is missing, the creation request is rejected. Projects begin in active status upon creation.

### Project Archiving and Completion

Users with project:manage permission can change a project's status to archived or completed. Once archived or completed, the project cannot receive new timelogs—any attempt to log time against it is rejected. Existing timelogs associated with the project remain intact and are preserved in full. Employees can still view archived/completed projects, but cannot perform time tracking actions against them.

### Project Deletion Requirements

Users with project:manage permission can delete a project only if no timelogs exist for that project. If any timelogs are associated with the project (including those from deactivated employees), the deletion request is rejected. Deleting a project removes it from the project list but does not affect other organization data such as employees or departments.

### Project Status Management Workflow

Projects have three statuses: active, archived, and completed. A newly created project starts as active. Only active projects can accept new timelogs. Users with project:manage permission can transition projects from active to archived or completed. Archived/completed projects cannot be reactivated to active status. Status changes are tracked in the activity log for audit purposes.

### Project List Filtering and Pagination

Users with project:view permission can view the project list. The list is paginated and supports filtering by status (active, archived, completed). Employees assigned to projects can view all projects they are assigned to, regardless of status. The project list does not expose data from other organizations—strict data isolation per organization is enforced.

## Task Operations

Tasks are created within a project by project leads or users with project:manage permission. Each task has a required title, optional description, status (open/in-progress/completed/closed), priority, estimated hours, due date, assigned employee (must be a project member), and optional parent task (one-level nesting). Task status changes are tracked in history with timestamp, user, old status, and new status. Project leads can edit tasks in their project; project:manage users can edit any task. Employees can view tasks in projects they’re assigned to, and filtering/sorting by status, priority, due date, and assignee is supported.

### Task Creation Within a Project

Users with project:manage permission can create tasks within any project.

Project leads can create tasks only within projects where they hold project-lead membership.

Each task must have a title (required). A description, status, priority, estimated hours, due date, assigned employee (optional), and parent task (optional) may also be provided.

The task is automatically associated with the selected project. When a task is created, it inherits the project’s status (e.g., if the project is archived or completed, creation is still allowed, but status editing is later restricted).

If the assigned employee is specified, they must be a member of the project.

A task can have one parent task to enable subtask nesting, but only one level of nesting is allowed — no nested subtasks (i.e., subtasks of subtasks are not permitted).

### Subtask Nesting Rules

A task may have a single parent task, forming a one-level subtask hierarchy.

A task that is itself a subtask (i.e., has a parent) cannot have any subtasks assigned to it.

Cross-project parent task assignment is prohibited — a parent task must belong to the same project as the child task.

When a subtask is created, its due date and priority are independent of the parent task; no automatic propagation occurs.

A parent task can be removed by editing the task and clearing the parent field, unless the system restricts this action for completed or archived project tasks.

### Task Status Change History Tracking

Every time a task’s status changes (e.g., from open to in-progress), the system automatically records the change in task history.

Each history entry includes: the timestamp of the change, the previous status, the new status, and the user who made the change.

Status changes without an actual state transition (e.g., editing other fields like description or due date) do not generate a history entry.

Manual entries or edits to task history are not allowed — history is immutable and system-generated only.

Task history entries are read-only and visible to users with project:view permission.

### Edit Permissions: Project Lead vs project:manage

Users with project:manage permission can edit any task in any project.

Project leads can edit tasks only within projects where they hold project-lead membership.

Both roles can modify: title, description, status, priority, estimated hours, due date, assigned employee, and parent task.

However, editing is blocked if the task belongs to an archived or completed project and the edit would attempt to change the status back from completed/closed.

Editing a task that is part of an approved timesheet does not lock the task itself — only timelogs are locked by timesheet approval.

### Task Assignment Constraint

When assigning an employee to a task, the system verifies that the employee is a member of the task’s parent project.

If the selected employee is not assigned to the project, the assignment is rejected.

Deactivated employees may still be assigned to tasks, but the system should issue a warning.

Once assigned, the employee gains visibility to the task and its details, provided they have project:view permission or are assigned to the task.

Only one employee may be assigned as the primary assignee per task.

### Task Filtering and Sorting

Employees can view tasks in projects they are assigned to (as members or project leads).

The task list is paginated.

Tasks can be filtered by: status (open, in-progress, completed, closed), priority (low, medium, high, urgent), assigned employee (including unassigned), and project.

Tasks can be sorted by: due date (ascending/descending), priority (using a defined priority order), or creation date (ascending/descending).

Filter and sort options are available across both personal and organizational task views, depending on the user’s permission level.

## Timelog Operations

Employees can log time entries for themselves on projects they're assigned to. Timelogs require date, duration in minutes, project, and optionally task, description, and billable flag. Employees can edit/delete their own timelogs only if not part of a submitted or approved timesheet. Users with time:manage permission can edit or delete any timelog. Users with time:view_all permission can view all timelogs. Timelogs support filtering by date range, project, task, and billable flag, and pagination is applied to lists.

### Timelog Creation

Employees can create timelogs for themselves only. Each timelog must include a date (required), duration in minutes (required, must be positive), and project (required, must be one the employee is assigned to). An optional task, description, and billable flag may also be included. The billable flag defaults to true. Timelogs cannot be created for archived or completed projects. If the selected project is not assigned to the employee, the timelog is rejected. Timelog dates must not be in the future; future dates are rejected.

### Editing Own Timelogs

Employees can edit their own timelogs only if the timelog is not part of a submitted or approved timesheet. Editing a timelog updates its description, task (if still assigned to the same project), or billable flag. Changing the project, date, or duration requires deletion and recreation of the timelog (if allowed). Employees cannot edit timelogs associated with approved timesheets; those requests are rejected.

### Deleting Own Timelogs

Employees can delete their own timelogs only if the timelog is not part of a submitted or approved timesheet. Deletion removes the timelog permanently. Employees cannot delete timelogs associated with approved timesheets; those requests are rejected. Deactivated employees cannot delete their timelogs, but their historical data is preserved.

### time:manage Permission Override

Users with time:manage permission can edit or delete any employee's timelog, regardless of timesheet status or employee status. This includes timelogs in approved timesheets. Editing via this permission allows changing all fields (date, project, task, description, billable flag, and duration). Deletion via this permission removes the timelog permanently.

### Project Assignment Requirement

Every timelog must reference a project the employee is assigned to. If the employee is not assigned to the selected project at the time of creation, edit, or deletion, the request is rejected. The system does not enforce task assignment if a task is included — only project membership is validated. Archived or completed projects cannot receive new timelogs; such requests are rejected.

### Timelog Filtering

Employees can filter their own timelogs by date range, project, task (if assigned), and billable status. Users with time:view_all permission can apply the same filters to view all employees' timelogs. Filters support ranges (e.g., start and end dates), exact match (e.g., specific project or task), and boolean flags (billable yes/no). Invalid date ranges or unknown project/task IDs return empty results.

### Timelog Pagination

Timelog lists are paginated. Employees see paginated results for their own timelogs. Users with time:view_all permission see paginated results across all employees (filtered by their selection). Pagination supports standard cursor- or page-based traversal, with configurable page size. First and last pages are marked explicitly. Empty result sets return zero pages.

## Timesheet Operations

Employees create weekly timesheets (Monday–Sunday) that automatically include all their timelogs for that week. Draft timesheets allow adding/removing timelogs before submission. Submission requires at least one timelog and prevents duplicate submissions for the same week. Users with time:approve permission can approve or reject timesheets. Approved timesheets lock all included timelogs (no edits or deletions). Rejected timesheets return to draft for revision. Employees can view their own timesheets, and filtering by status and date range is supported.

### Weekly Timesheet Creation

Employees can create a draft timesheet for a specific week (Monday to Sunday). When created, the system automatically includes all timelogs belonging to that employee for the selected week. The timesheet is initially in draft status and can be modified before submission. Each draft timesheet is associated with exactly one employee and one week. A draft timesheet is created only if the employee has at least one timelog for the selected week; otherwise, creation is blocked. If an employee already has a draft, submitted, or approved timesheet for the same week, a new timesheet cannot be created for that week.

### Draft Timesheet Modification

Employees can add or remove timelogs from their own draft timesheets. Only timelogs belonging to the selected employee and falling within the timesheet's week can be included. Editing a draft timesheet is allowed at any time before submission. Once a timesheet is submitted, no further edits are permitted on the included timelogs. When a timelog is removed from a draft timesheet, it is only disassociated from the timesheet; the timelog itself is preserved. When a timelog is added, it must meet all validation rules for timelogs (e.g., project assignment, date within week).

### Timesheet Submission Requirements

Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it contains no timelogs; the request is rejected in this case. A timesheet cannot be submitted if another timesheet (draft, submitted, or approved) for the same employee and same week already exists; the request is rejected to prevent duplicate submissions. Upon successful submission, the timesheet status changes from draft to submitted, and the submitted at timestamp is recorded. The employee cannot edit or delete the timesheet or its included timelogs after submission.

### Timesheet Approval Workflow

Users with time:approve permission can view all submitted timesheets across the organization. They can approve a submitted timesheet by confirming its correctness. Upon approval, the timesheet status changes to approved, the reviewed at timestamp is recorded, and the reviewer is logged. All timelogs included in an approved timesheet become locked: employees and even users with time:manage permission cannot edit or delete them. Approved timesheets cannot be modified or rejected after approval.

### Timesheet Rejection Workflow

Users with time:approve permission can reject a submitted timesheet. Rejection requires providing a rejection reason (text, required). Upon rejection, the timesheet status changes back to draft. The employee can revise the timesheet by adding/removing timelogs and resubmit it. Rejected timesheets are excluded from approval queues but remain visible to the employee and reviewers. The rejected timesheet retains its historical record including the rejection reason and reviewer. Only the current draft version can be revised; once resubmitted, the previous rejected version is archived but retained.

### Timesheet Duplication Prevention

The system enforces a single active timesheet per employee per week. If an employee attempts to create, submit, or approve a timesheet for a week where a draft, submitted, or approved timesheet already exists, the request is rejected. This applies across all status transitions: a draft cannot be created if a draft exists; a new draft cannot be created if a submitted or approved timesheet exists. The rule ensures data integrity and prevents conflicting timesheet entries for the same week. Duplicate checks are performed on week boundaries (Monday–Sunday) using the week start date.

## ActivityLog Operations

The system automatically records key actions as activity log entries—including employee invitations, contract changes, project status updates, timesheet actions, role changes, and task status transitions. Each entry records timestamp, performing user, action type, target entity, and details. Users with org:manage permission can view the full activity log, which supports filtering by action type, user, and date range, and includes pagination for large datasets.

### Automatic Activity Logging for Key Actions

The system automatically creates an activity log entry whenever key organizational actions occur, without user intervention. Each entry captures the timestamp of the action, the user who performed it, the action type, the target entity, and additional details as context.

Key actions that trigger activity log entries include:
- Employee invitation (email of invited user, inviting user)
- Employee deactivation or reactivation (status change details — note: deactivation is soft; employee record and related data are preserved)
- Contract creation or update (change summary, previous start date if applicable)
- Project creation, archiving, completion, or deletion (project name, status change)
- Task status change (old status, new status, user who made the change)
- Timesheet submission, approval, or rejection (employee name, week dates, reason if rejected)
- Role assignment or change for employees (role name, affected employee)

No manual activity log entry creation is allowed — only the system generates entries in response to these defined actions.

### Org:Manage-Only Activity Log Access

Only users with the org:manage permission can view the full activity log for their organization. This ensures sensitive operational history remains restricted to organization owners and administrative personnel.

Users without org:manage permission see no activity log access and receive a permission denied response if they attempt to view logs.

All activity log entries are strictly scoped to the currently selected organization context. Users cannot access activity logs from organizations other than their currently selected one, even if they belong to multiple organizations.

### Activity Log Filtering Options

Users with org:manage permission can filter activity log entries by multiple criteria to narrow results to relevant events.

Available filter options include:
- Action type: restrict to specific action types (e.g., 'employee-invited', 'contract-edited', 'project-archived', 'timesheet-approved', 'role-changed')
- User: restrict to actions performed by a specific user (filterable by display name or email)
- Date range: restrict to entries within a specific start and end date (inclusive)

Filters can be combined (e.g., filter by action type + date range, or user + action type). Empty or invalid filters return an empty list without error. No filtering returns all entries for the organization context.

### Activity Log Pagination Support

The activity log supports pagination for efficient viewing of large datasets. Each request returns a page of entries with consistent metadata.

Pagination behavior:
- Default page size is 25 entries per page
- Page number or cursor-based navigation is supported
- Each page response includes total count of matching entries
- First and last page indicators are provided
- Navigation between pages is stateless and based on page token or index

Clients must handle pagination to avoid timeouts and performance degradation when loading full logs.

### Activity Log Entity and Action Type Coverage

Activity log entries record specific action types tied to core business entities.

Supported entity-action combinations include:
- Employee: 'employee-invited', 'employee-deactivated', 'employee-reactivated' (note: 'employee-deactivated' refers to soft deactivation — the employee record remains in the system and data is preserved in line with organization-wide data retention policies)
- Contract: 'contract-created', 'contract-edited'
- Project: 'project-created', 'project-archived', 'project-completed', 'project-deleted'
- Task: 'task-status-changed'
- Timesheet: 'timesheet-submitted', 'timesheet-approved', 'timesheet-rejected'
- Role: 'role-assigned', 'role-changed'

Each action type has a standardized set of recorded details:
- Timestamp (UTC)
- User who performed the action (user ID and display name)
- Action type (machine-readable code)
- Target entity (entity type and ID)
- Contextual details (structured or text-based, e.g., old/new status for task changes, reason for timesheet rejection)

## ProjectMember Operations

Users with project:manage permission can assign employees to projects, defining their role as member or project-lead. Each membership links an employee and project. Project leads gain task management authority within their project. Assignments can be removed by project:manage users. Employees can view which projects they’re assigned to. No duplicate assignments per employee-project pair exist, and employees must be assigned before being assigned tasks.

### Project Assignment with Member or Project-Lead Role

Users with project:manage permission can assign employees to projects. Each assignment links a single employee and a single project. During assignment, the role must be specified as either "member" or "project-lead". The assignment is automatically scoped to the currently selected organization. Duplicate assignments for the same employee-project pair are not permitted—attempting to add an already assigned employee results in no change. Employees must be active (not deactivated) to be assigned to a project.

### Project-Lead Task Management Authority

Employees assigned to a project as project-lead gain the ability to manage tasks within that project. This includes creating new tasks, editing task details (title, description, priority, due date, estimated hours), assigning tasks to other project members (including themselves), creating subtasks (one level of nesting only), and changing task status. Project leads cannot delete tasks or assign tasks to employees not assigned to the project. Task assignments to project leads are unrestricted for other project members, but only project-lead role grants these management rights.

### Assignment Removal by project:manage Users

Users with project:manage permission can remove any employee from a project. Removing an employee from a project revokes their project-lead status if applicable and prevents them from accessing or managing tasks in that project. If the employee was the sole project-lead of a project, removal is blocked unless another project-lead exists for that project. Once removed, the employee can no longer have tasks assigned to them within that project, and their existing timelogs on that project are preserved and remain viewable.

### Project Visibility Per Employee

Employees can view all projects they are assigned to, including those where they hold the project-lead role. This list includes project details such as name, status (active/archived/completed), color code, and assigned role (member or project-lead). Employees can see which projects they lead and which they join as a regular member. Deactivated employees retain visibility of their historical project assignments but cannot create new timelogs or tasks on those projects.

### Project Assignment Prerequisite for Task Assignment

Before an employee can be assigned to a task, they must first be assigned to the project that contains the task. Task assignment validation checks ensure the employee is a member of the project—assignment is rejected if not. This rule applies to both project leads and users with project:manage permission when creating or reassigning tasks. Active project membership (not deactivated status) is required at the time of task assignment; deactivated employees cannot be newly assigned to tasks even if previously assigned to the project.

## TaskHistory Operations

Task status changes automatically generate history entries with timestamp, user who made the change, old status, and new status. These entries are immutable and cannot be edited or deleted. Task history is read-only and accessible via the parent task record. Employees and managers can review status change timelines for auditing or debugging, but cannot alter or remove any history entry.

### Automatic Task Status Change Logging

When an employee or manager with appropriate permissions changes a task’s status, the system automatically creates a task history entry without requiring a separate action. This entry is generated only when the status actually changes and includes the timestamp, the user who performed the change, the previous status, and the new status. No manual or duplicate entries are created for the same change, and no history is generated if the status is unchanged.

### Task History Immutability

Task history entries are immutable once created. They cannot be edited, updated, or deleted by any user, regardless of role or permission level. Even users with full administrative privileges cannot modify or remove any historical record. This ensures integrity of the audit trail for compliance and debugging purposes.

### Timestamp and User Attribution

Each task history entry records the exact time (including date and time of day) when the status change occurred, in the organization’s configured timezone. The entry also identifies the specific user who performed the status change by their display name and user ID, ensuring clear accountability. The timestamp and user attribution are captured at the moment of the change and cannot be altered or falsified.

### Read-Only Task History Access

Task history is view-only and accessible only through the parent task record. Users can view the complete timeline of status changes for any task they have permission to view (e.g., employees assigned to the task, project members, managers, and owners). No user can directly manipulate or query task history outside the context of the task interface. History entries appear chronologically and cannot be reordered or filtered independently by users.

### Status Change Audit Trail

The task history provides a complete audit trail of all status transitions for a task, supporting internal review, compliance verification, and troubleshooting. Each status change is permanently recorded, including who made the change, when it occurred, and how the status evolved (e.g., open → in-progress → completed). This audit trail remains intact even if the task is later archived, completed, or deleted. The organization can rely on this trail for process auditing and historical analysis.

## Timer Operations

Employees can start a live timer to track time in real-time, selecting a project and optionally a task. Only one active timer per employee is allowed. Starting a timer requires a project assignment. Employees can stop the timer, which creates a timelog with duration rounded to the nearest minute. They can also discard the timer or edit its description and project/task while running. There is no automatic stop—timers run indefinitely if left active.

### Start Timer

Employees can start a live timer to track time in real-time. Starting a timer requires selecting a project (task is optional). An employee can have at most one active timer at a time. If an employee starts a new timer while another is active, the previous timer is automatically replaced. Timers can only be started for projects the employee is assigned to. If the selected project is archived or completed, the timer starts but may fail validation when stopped (defined in business rules). Timers do not expire or stop automatically— they continue running indefinitely if left active.

### Edit Running Timer

Employees can edit the description and project/task of a running timer at any time. Editing the project changes the timer's project context; editing the task changes the associated task (must belong to the new project). The start timestamp remains unchanged during edits. Edits are applied immediately and do not affect the timer's running state or duration calculation.

### Stop Timer

Employees can stop their running timer. Stopping the timer creates a timelog with the calculated duration (end timestamp minus start timestamp), rounded to the nearest minute. The timelog includes the selected project, task (if any), description at the time of stopping, and billable status defaults to true. The timelog is associated with the employee who started the timer. If stopping would create a timelog that violates validation rules (e.g., project not assigned to employee, project archived), the stop action is rejected and the timer remains active.

### Discard Timer

Employees can discard their running timer without creating a timelog. Discarding a timer cancels the session and removes all associated data without any record in the timelog history. The employee can start a new timer immediately after discarding. Discard actions cannot be undone.

### View Active Timer

Employees can view their currently running timer, including start timestamp, selected project, optional task, and description. If no timer is active, the system returns no active timer. This view updates in real-time to reflect any edits made to the timer.

## PendingInvitation Operations

When inviting a new employee via email, if the email has no existing account, a pending invitation is created with the inviter, organization reference, and email. The invitation is resolved when the invited user signs up with that email, automatically linking them to the organization. Pending invitations can be viewed and managed only by users with appropriate permissions. They do not expire automatically, and no user-level edits are permitted to pending invitations.

### Pending Invitation Creation and Resolution

When inviting an employee via email who does not yet have an account, a pending invitation is created automatically. The pending invitation includes the inviter, organization reference, and email address. It remains in the system until the invited user signs up with that exact email address. Upon signup with the matching email, the pending invitation is automatically resolved and the new user is added to the organization with their invited email associated. No manual editing of pending invitations is permitted; they can only be created, viewed, and automatically resolved through successful signup.

### Inviter and Organization Association

Each pending invitation is permanently associated with the user who sent the invitation (inviter) and the organization where the invitation originated. The inviter must have appropriate permissions to invite employees to the organization. Pending invitations are isolated per organization and cannot be transferred between organizations. When a pending invitation is resolved through signup, the new employee record is created under the organization referenced in the invitation, not the inviter's other organizations. No user can manually edit, cancel, or modify the organization association or inviter reference on a pending invitation.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Users cannot delete an organization if it has pending timesheets (not yet approved or rejected), as deletion requires all timesheet workflows to complete. Deletion is also blocked if any employee still has an active contract, ensuring contractual integrity before termination. If an owner attempts deletion while inactive contracts exist but active ones do not, the system still blocks it—only resolved contracts count as cleared. If multiple owners exist and one initiates deletion, all must first transfer or delete the organization—deletion cannot proceed with shared ownership. When deletion is blocked, the system returns a clear error explaining the remaining items (e.g., '3 pending timesheets', '1 active contract'). Deletion is also blocked if the organization has no employees, as this violates the multi-tenant premise of an active tenant. Attempting to create an organization with an empty name or invalid currency raises a validation error. The system prevents creation of duplicate organization names under strict isolation, though this is enforced at signup only if the tenant naming policy permits uniqueness checks.

### Organization Deletion Blocked Due to Pending Timesheets

Users with owner permission cannot delete an organization if there are any pending timesheets (status: draft or submitted) for employees in the organization. The system blocks deletion until all timesheets reach a final state (approved or rejected). A timesheet is considered pending if its status is draft or submitted. If deletion is attempted with pending timesheets, the system returns an error indicating how many timesheets remain unresolved.

### Organization Deletion Blocked Due to Active Employee Contracts

Users with owner permission cannot delete an organization if any employee has an active contract (a contract with no end date or an end date in the future). Historical contracts with past end dates do not prevent deletion. The system enforces this rule to maintain contractual integrity and prevent termination of active employment relationships during deletion. If deletion is attempted with active contracts, the system returns an error specifying how many active contracts exist.

### Shared Ownership Prevents Deletion

If an organization has multiple users with owner permission, deletion requires agreement from all owners. A single owner cannot delete the organization unilaterally unless all other owners have transferred ownership or removed themselves. The system enforces this by checking for additional owners before allowing deletion. If other owners exist, the deletion request is rejected with an error indicating that all owners must consent.

### Empty Organization Name Rejection

When creating a new organization, the organization name field must contain a non-empty value. If the name is missing, blank, or consists only of whitespace, the system rejects the creation request. The error message indicates that the organization name is required. This rule applies only at creation time—not during later edits.

### Invalid Currency Code Rejection

When creating or editing an organization, the currency code must be a valid ISO 4217 three-letter currency code (e.g., USD, EUR, KRW). If an invalid or unsupported currency code is provided, the system rejects the request. The error message indicates that the currency code must be a standard three-letter code.

### Multi-Tenant Boundary Violation

When performing any action that accesses organization data (e.g., viewing projects, editing employees), the system enforces strict isolation between organizations. If a user attempts to access data belonging to a different organization than their currently selected context, the request is rejected with an unauthorized error. This rule prevents data leakage across organizational boundaries.

### Deletion Validation Summary Error

When organization deletion fails due to multiple constraints (e.g., pending timesheets and active contracts), the system returns a single error message that lists all outstanding issues. The error summary includes counts and brief descriptions (e.g., '3 pending timesheets', '1 active contract', '2 other owners') to help the owner resolve all blockers in one attempt.

### Owner-Only Deletion Initiation Rule

Only users with the built-in owner role can initiate organization deletion. Users with other roles (e.g., manager or employee) cannot start the deletion process. The system checks the current user’s role in the selected organization before allowing the deletion request to proceed. If the user lacks owner permission, the system rejects the request with an unauthorized error.

## User Error Scenarios

Users cannot delete their account if they are the sole owner of an organization, as this would orphan the organization; they must first transfer ownership or delete the organization. When deleting an account that belongs to multiple organizations, the system deactivates their employee records in other orgs but preserves historical data, which may surprise users expecting full removal. A user cannot sign up with an email already used in another organization without an invitation, enforcing email uniqueness across the platform. Password change fails if the new password matches the current one, preventing no-op updates. Login fails if the selected organization context is not among the user’s assigned orgs, blocking unauthorized context switching. If a user logs out and back in, their organization context resets to null, requiring reselection—this is expected behavior but may cause confusion without guidance. Attempts to log in with an unverified email fail only if email verification is enabled, but since the requirements do not mandate it, login succeeds regardless. If a user tries to sign up with an already taken email, the system responds with a conflict message indicating the account exists.

### Sole Owner Account Deletion Blocked

If a user attempts to delete their account while being the sole owner of an organization, the request is rejected to prevent orphaning the organization. The system requires the user to first transfer ownership to another employee or delete the organization entirely. No account deletion proceeds when ownership would be left unassigned.

### Employee Record Deactivation on Account Deletion

When a user deletes their account but remains a member of other organizations, the system marks all their employee records in those organizations as 'deactivated'. Their historical data (timelogs, timesheets, tasks, etc.) is preserved and remains accessible to other users, but the deactivated employee cannot log in, track time, or perform actions within those organizations.

### Duplicate Email Signup Rejection

If a user attempts to sign up using an email address that already exists in the system—even under a different organization—the request is rejected. The system does not allow duplicate email addresses across organizations, enforcing global email uniqueness for account identification.

### Password Change No-Op Rejection

If a user attempts to change their password to a value identical to the current password, the request is rejected. The system requires a meaningful change to prevent unnecessary updates and maintains the integrity of the password history.

### Invalid Organization Context Login Block

If a user attempts to log in and selects an organization context that is not among their assigned organizations, the login is rejected. Users must only select organizations where they have a valid employee record or invitation to ensure proper data isolation.

### Organization Context Reset on Relogin

When a user logs out and logs back in, their selected organization context is reset to null. They must reselect an organization from their list of eligible organizations before performing any scoped actions. This behavior is intentional to support multi-organization membership and avoid accidental context persistence.

### Unverified Email Login Allowed

The system allows users to log in using an unverified email address, as the requirements do not specify mandatory email verification. Email verification status is not enforced during authentication unless explicitly required by the user input, which it is not.

### Duplicate Email Signup Error Message

If a user attempts to sign up with an email that already exists in the system, the system responds with an error message indicating that an account with that email already exists. The message clearly communicates the conflict without exposing whether the existing account is active or pending.

## Employee Error Scenarios

Inviting a user to an organization fails if their email already belongs to another account but they lack invite permissions in that account’s org context—though the requirements do not specify this, so in practice, the invitee is added once they accept. Inviting an email already in the org as an employee returns a conflict error stating the user is already part of the organization. Deactivating an employee fails if that employee is the only active employee, as the organization cannot operate without any active staff (implied by multi-tenancy). Reactivating an employee who was previously deactivated restores their access, but only if the org still exists and they are not marked as permanently deleted in system logs. Editing an employee’s role fails if the assigning user lacks `employee:manage` permission—role assignment is a privileged operation. Editing employment type to an unsupported value (e.g., 'temporary-worker' instead of 'contractor') raises a validation error. The system allows deactivation even if the employee has active timers—these are stopped automatically to prevent invalid timelogs after deactivation. Creating an employee without a role assignment is blocked since every employee must have exactly one role per org.

### Duplicate Employee Invite Rejection

When a user with employee:manage permission attempts to invite an email address that already belongs to an existing employee in the same organization, the system rejects the request and provides a clear error message stating that the user is already part of the organization. This constraint ensures organizational data integrity and prevents duplicate employee records for the same individual within one organization.

Duplicate invites are not allowed even if the existing employee record is deactivated. A deactivated employee still counts as a member of the organization for the purpose of this uniqueness check.

The error message explicitly identifies the conflicting employee's display name and role to help the inviting user resolve any accidental duplicates.

### Deactivation Blocked for Last Active Employee

An employee cannot be deactivated if they are the sole active employee in the organization. This rule ensures the organization maintains at least one active employee to preserve business continuity.

The system checks for active employee count before processing the deactivation request. If the employee being deactivated is the only active employee, the request is rejected with an error indicating that at least one active employee must remain.

Deactivation of other employees is allowed only if one or more other active employees remain in the organization after the deactivation.

### Role Required on Employee Creation

Every employee record must have exactly one role assigned at the time of creation. Creating an employee without a role assignment is invalid and the request is rejected.

The assigned role must be one that exists within the organization—either a built-in role (Owner, Manager, Employee) or a custom role created by an owner.

The role assignment is immutable on creation; if an invalid role is specified, the request is rejected with a clear error message indicating the acceptable role options.

### Permission Denied on Role Edit

Only users with employee:manage permission can change an employee's role. Any request to edit an employee's role from a user without this permission is rejected.

The system enforces role edit authorization at the business logic layer, independent of direct database access. Role assignment changes are logged in the activity log for audit purposes.

If a user attempts to assign a role they do not have permission to manage (e.g., assigning an Owner role without having Owner privileges), the request is rejected regardless of their current permission set.

### Invalid Employment Type Validation Error

Employment type values are strictly constrained to the following options: full-time, part-time, contractor, and intern. Any attempt to set an employment type outside this list results in a validation error.

The system validates employment type during employee creation and any subsequent edit. If an unsupported value such as 'temporary-worker' is provided, the request is rejected with a clear error listing the acceptable values.

Employment type is part of the employee record but does not affect role assignment, contract management, or permissions—its primary purpose is for reporting and classification.

### Timer Auto-Stopped on Employee Deactivation

When an employee is deactivated, any currently active timer they possess is automatically stopped, and no timelog is created from the timer session.

This behavior ensures deactivated employees cannot accrue time against projects after losing access to the system. The system clears the timer state and logs this action in the activity log as "timer stopped" with context indicating employee deactivation.

The employee is notified of the deactivation and that their active timer was stopped, preventing confusion about missing timer entries.

### Employee Reactivation Restoration Rule

A deactivated employee can be reactivated by a user with employee:manage permission, restoring their access to the organization.

Upon reactivation, the employee regains all permissions previously assigned through their role. Their historical data—including timelogs, timesheets, projects, and tasks—remains intact and accessible.

The employee's previous role, department, and employment type are restored exactly as they were at deactivation unless updated during the reactivation process. However, if the organization no longer exists or the employee record was permanently deleted in system records, reactivation is impossible and the request fails.

### Organization Membership Uniqueness Constraint

Each user account can belong to only one employee record per organization. Attempting to create a duplicate employee record for the same user within the same organization is blocked.

This constraint applies regardless of invitation method: direct signup with the invited email or acceptance of a pending invitation. If a user signs up with an email that was previously invited, the system links the account to the pending invitation instead of creating a new employee record.

The uniqueness is enforced at the system level to maintain clean employee-to-user relationships and prevent ambiguous permission and data ownership scenarios.

## Role Error Scenarios

Creating a custom role fails if the name duplicates an existing role in the same organization, enforcing unique role names per org. Creating a role with reserved names (e.g., 'Owner', 'Manager') is rejected to prevent confusion with built-in roles. Deleting a custom role fails if any employees are currently assigned to it, preserving role assignment integrity—only roles with zero assignees can be deleted. Editing a built-in role’s permissions is blocked, as these roles are immutable. Changing a role’s name to an empty string or whitespace-only value triggers a validation error. Attempting to assign an employee to a role that belongs to a different organization results in a cross-org boundary violation error. If a role is edited while employees are assigned, the changes apply immediately, which may cause unexpected permission shifts if the user overlooks this. Deleting the last role in an organization is blocked to ensure at least one role remains for access control—though the requirements imply roles can be reused, not removed entirely.

### Duplicate Custom Role Name Rejection

When creating or editing a custom role, if another role with the same name already exists in the same organization, the operation is rejected. Role names must be unique within each organization. The system prevents creation or update of custom roles that would cause duplicate names.

### Reserved Role Name Conflict

Creating or renaming a custom role to match the exact name of a built-in role (Owner, Manager, or Employee) is rejected. Built-in role names are reserved and cannot be used for custom roles. This prevents confusion between system-defined and user-defined roles.

### Role Deletion Blocked with Active Assignments

Attempting to delete a custom role that has one or more employees currently assigned to it is rejected. Role deletion is only permitted when no employees hold that role. This preserves role assignment integrity and prevents accidental removal of active access structures.

### Built-in Role Edit Protection

Any attempt to edit the permissions or properties of built-in roles (Owner, Manager, or Employee) is rejected. Built-in roles are immutable and cannot be modified. Only custom roles can be edited or deleted by organization owners.

### Empty Role Name Validation Error

Creating or renaming a role with an empty name, whitespace-only name, or a name containing only special characters triggers a validation error. Role names must contain at least one non-whitespace character to be valid.

### Cross-Organization Role Assignment Violation

Assigning an employee to a role that belongs to a different organization is rejected. Role assignments must be within the same organization. This enforces strict data isolation between organizations and prevents unauthorized cross-organization access.

### Role Name Change Runtime Override Risk

If a role’s name is changed, the new name applies immediately to all assignments of that role. The system does not provide a way to maintain historical role names for assignments. Organization owners should verify role usage before renaming to avoid unexpected permission shifts.

### Minimum One Role Enforcement

The system enforces that every organization must have at least one role defined at all times. Deletion of the last custom role or attempts to delete a built-in role when no custom roles exist is rejected. This ensures that role-based access control remains functional for the organization.

## Permission Error Scenarios

Assigning a permission to a role fails if the permission code is not in the defined list (e.g., `org:write` instead of `org:manage`)—validation ensures only known codes are allowed. A role cannot be created with duplicate permissions in its set, as each permission code must appear only once. Removing a permission that is required for an operation (e.g., `time:approve` for timesheet approval) while employees hold that role immediately blocks those operations, and users receive permission-denied errors on future attempts. Adding a permission to a built-in role is blocked, as built-in roles are immutable. If a user has multiple roles across orgs, the permission set is evaluated per organization context—cross-org permission leakage is prevented by strict scoping. Attempting to assign an invalid permission code (e.g., 'project:read') results in a schema validation failure. Permissions are always additive; there is no concept of 'denying' a permission beyond omitting it from a role. If a role is deleted but permissions remain in the system definition, they are not removed—only role-role mappings are cleaned up.

### Invalid Permission Code Rejection

When creating or editing a role, if a permission code not in the predefined set is assigned (e.g., `org:write` instead of `org:manage`), the system rejects the operation. Only defined permission codes (e.g., `org:manage`, `employee:manage`, `project:view`) are allowed. The user receives an error indicating the permission code is invalid or unrecognized.

### Duplicate Permission in Role Set Blocked

A role cannot be created or updated if its set of permissions contains duplicate permission codes. For example, assigning both `time:approve` and `time:approve` to the same role is rejected. Each permission code must appear only once in a role's permission set. The system prevents this at the validation layer and returns an error for duplicate entries.

### Permission Removal Triggers Immediate Enforcement

If a permission is removed from a role that employees hold, the system immediately enforces the change. Any user who previously had that permission via that role loses access instantly. Future attempts to perform actions requiring the removed permission result in a permission-denied error. The system does not require any manual synchronization or delayed enforcement for permission revocation.

### Built-in Role Permission Edit Blocked

Built-in roles (Owner, Manager, Employee) are immutable. Any attempt to add, remove, or modify permissions in these roles is blocked by the system. Role definitions are fixed at creation and cannot be altered. The system returns an error if a user with `org:manage` permission tries to edit built-in role permissions.

### Cross-org Permission Isolation

Permissions are strictly scoped to the organization context. A user who belongs to multiple organizations cannot leverage permission sets from one organization in another. Each organization maintains its own role and permission assignments. Attempting to perform actions outside the currently selected organization context results in access being denied, regardless of global user permissions.

### Schema-level Permission Validation

All permission assignments undergo schema-level validation before storage. The system checks that each permission code matches the predefined list of valid codes. If the schema validation fails (e.g., due to malformed or unknown codes), the entire operation is rejected. This validation occurs at the domain layer and does not rely on database constraints.

### Additive Permission-only Model

Permissions are always additive and never subtractive. There is no mechanism to explicitly deny a permission beyond omitting it from a role's set. Roles cannot be configured with negative permissions (e.g., 'deny `time:manage`'). System behavior relies solely on permission presence—absence means no access, and presence means full access for that capability.

### Role Mapping Cleanup on Role Deletion

When a custom role is deleted, the system removes only the role-role mapping and retains permission definitions. The permission codes themselves remain in the system definition and are not deleted. Employees who previously held that role retain no permissions from the deleted role, but the permission definitions remain available for other roles. No employee data or historical records are affected by role deletion.

## Department Error Scenarios

Deleting a department fails if it has employees assigned to it, as employees must be reassigned or department-nullified first. Creating a department with a parent department that belongs to a different organization is blocked, enforcing strict org-level hierarchy isolation. Creating a department with a circular parent reference (e.g., Dept A parent of Dept B, Dept B parent of Dept A) is prevented by one-level nesting validation. Setting a department’s parent to itself triggers a self-reference validation error. Editing a department’s name to empty or duplicate (within the same org) is rejected. If a department is deleted, employees’ department references become null, but no error is raised—this is intentional per requirements. Nested departments beyond one level (e.g., Dept A → Dept B → Dept C) are disallowed during creation or update. Attempting to create a department with a null name results in a validation error.

### Department Delete with Employees Assigned

If a department has one or more active employees assigned to it, the delete operation is rejected. The system must prevent deletion to maintain data integrity and avoid orphaned department references. The employee records must remain intact, and the department stays in place until employees are reassigned or department is set to null.

### Cross-Organization Parent Department Violation

When attempting to set a parent department that belongs to a different organization, the operation is rejected. Departments must only be nested within their own organization. The system verifies that the parent department and the child department are part of the same organization before allowing the parent-child relationship.

### Circular Parent Reference Prevention

A circular parent reference (e.g., Department A is parent of Department B, and Department B is parent of Department A) is rejected during creation or update. The system enforces a one-level nesting constraint and checks the full hierarchy path to ensure no cycles are introduced.

### Self-Referencing Department Error

If an attempt is made to set a department’s parent to itself, the operation is rejected. The system validates that the parent department ID is different from the department’s own ID before allowing any hierarchical relationship.

### Department Name Uniqueness Validation

A department name must be unique within an organization. If a new or updated department name conflicts with an existing department name in the same organization, the operation is rejected. Case-insensitive comparison is used to enforce uniqueness.

### Employee Department Nullification on Delete

When a department is successfully deleted, all employees previously assigned to that department have their department reference set to null. This operation succeeds and no error is raised. Employee records remain active; only the department association is cleared.

### Multi-Level Nesting Rejection

Department nesting beyond one level is prohibited. For example, if Department A has a parent Department B, then Department B cannot have its own parent. Attempting to create or update a department to form a deeper hierarchy is rejected. The system enforces a maximum depth of one level.

### Empty Department Name Validation

If a department creation or update request includes an empty string for the name, the operation is rejected. A non-empty name is required to identify the department within the organization. Whitespace-only names are also rejected as invalid.

## Contract Error Scenarios

Creating a new contract for an employee with an existing active contract automatically ends the prior one, but only if the new start date is after the current contract’s end date—if not, the system blocks overlap (e.g., start date must be ≥ next day). Editing the current active contract fails if the new dates overlap with another active contract, enforcing non-overlapping pay periods. Editing a past (ended) contract is blocked entirely, preserving historical immutability. Creating a contract with a negative pay rate raises a validation error, as pay must be non-negative. Setting a contract’s end date before the start date is invalid and rejected. If an employee has no active contract when one is queried (e.g., for payroll), the system returns no record, and any display or calculation defaults to ‘no active pay period’. A contract cannot be created for a deactivated employee—deactivated status implies no active payroll. Attempting to create a contract without a start date or pay rate triggers a required-field validation error.

### Overlapping Contract Start Dates Blocked

When creating a new contract for an employee, the system checks for overlap with any existing active contract. If the new contract’s start date is before or on the same day as the end date of an active contract (or if there is no end date and the start date is not after the current contract’s start date), the request is rejected. This ensures contracts never overlap in time for the same employee.

### Past Contract Edit Prohibition

Past contracts (those with an end date set before today) cannot be edited. Any attempt to modify a past contract’s fields (start date, end date, pay rate, pay period, working hours, or notes) results in the request being rejected. Only the current active contract is editable.

### Negative Pay Rate Validation Error

A contract cannot be created or updated with a negative pay rate. If a pay rate less than zero is provided, the request is rejected with a validation error. Pay rates must be zero or greater to be valid.

### End Date Before Start Date Rejection

If a contract is created or updated with an end date that precedes the start date, the request is rejected. The end date must be either null (indicating ongoing) or on or after the start date.

### Active Contract Query When None Exists

If a query for an employee’s current active contract is made and the employee has no active contract (all contracts have ended), the system returns no record. Downstream operations (e.g., payroll calculation) default to showing no active pay period rather than throwing an error.

### Contract Creation Blocked for Deactivated Employees

A new contract cannot be created for an employee whose status is deactivated. The system rejects the request if the employee’s status is not active at the time of contract creation.

### Required Field: Start Date and Pay Rate

When creating a contract, both the start date and pay rate are required. If either is missing, the request is rejected. The start date must be a valid date, and the pay rate must be a non-negative numeric value.

### Automatic Prior Contract End on New Start

When a new contract is created for an employee, the system automatically ends the previous active contract by setting its end date to one day before the new contract’s start date. This ensures a continuous, non-overlapping sequence of contracts while preserving historical records.

## Project Error Scenarios

Deleting a project fails if it has any timelogs associated with it, ensuring data integrity for time records—even if timelogs are archived, they count. Archiving or completing a project blocks adding new tasks or timelogs, but existing timelogs remain editable (unless in a locked timesheet), preserving flexibility for correction. Creating a project with an empty name or missing color code raises a validation error. Trying to archive a project that is already archived or completed results in a no-op—no error, but also no state change. Editing a project’s budget hours to a negative value is rejected. Assigning an employee to a project they’re not invited to (via ProjectMember) fails—members must exist before assignment. Archiving a project does not automatically delete its tasks; they remain visible but uneditable unless reactivated. Attempting to create a project with an invalid color code (not in allowed hex format or palette) triggers a format validation error.

### Project Deletion Blocked When Timelogs Exist

If a user attempts to delete a project that has any timelogs associated with it (including timelogs on archived or completed projects), the deletion request is rejected. The system preserves all timelog records to maintain accurate time tracking history. An error message indicates that timelogs must be removed before deletion — however, since timelogs cannot be individually deleted (only archived via project lifecycle), the practical resolution is to archive the project instead of deleting it.

### Empty Project Name or Missing Color Code Rejection

If a user attempts to create a project with an empty name or a missing color code, the request is rejected. The project name must be non-empty (at least one non-whitespace character), and the color code must be provided (cannot be blank or null). No additional business logic is applied — this is a strict validation requirement to ensure projects are identifiable and visually distinct in the UI.

### Archive or Completed State No-Op Behavior

If a user attempts to archive or complete a project that is already in the target state (archived or completed), the system accepts the request but takes no action — the project state remains unchanged. No error is returned, and no activity log entry is created for redundant status changes. This avoids misleading audit trails while preventing unintended side effects from repeated operations.

### Negative Budget Hours Validation Error

If a user attempts to set a project's budget hours to a negative value, the request is rejected. Budget hours must be a non-negative numeric value (zero or positive). This ensures financial planning remains meaningful — a negative budget has no business interpretation in this context.

### Project Member Required Before Assignment

If a user attempts to assign an employee to a project without first creating a ProjectMember record, the assignment fails. An employee must be formally added to the project (via the ProjectMember entity) before being assigned to tasks within that project. This enforces permission and membership integrity: only verified project members can be task assignees.

### Task Edit Lock on Archived Projects

When a project is archived or completed, users cannot edit task status, priority, due date, description, or assigned employee for tasks in that project. Tasks remain visible but are effectively locked to preserve historical project integrity. Editing a task in an archived project is only possible if the project is first reactivated to 'active' status. This ensures audit fidelity while allowing corrections through intentional status reversal.

### Invalid Color Code Format Validation

If a user attempts to create or update a project with a color code that does not conform to the allowed hex format (e.g., '#FF5733' or '#F53'), the request is rejected. The system enforces strict format validation: the color code must be a valid 3- or 6-digit hexadecimal color string starting with '#'. No color palette restrictions beyond format are applied — any valid hex color is accepted.

### Preservation of Archived Project Data

When a project is archived or completed, all associated data — including tasks, project members, and timelogs — is retained and remains accessible to users with appropriate permissions. Timelogs on archived projects can still be viewed and edited (unless locked by an approved timesheet), and tasks remain viewable. The project itself cannot receive new tasks, new project members, or new timelogs. Deletion is still prohibited if timelogs exist. This ensures business continuity and historical accuracy while reflecting the project's inactive status.

## Task Error Scenarios

Creating a task fails if it is assigned to an employee not assigned to the project, as only project members can own tasks. Setting a parent task that belongs to a different project (than the child task) is blocked, enforcing project-level nesting integrity. Creating a subtask with nesting deeper than one level (e.g., grandparent) is rejected, as one-level only is required. Changing a task’s status from completed to open fails if the task is in a completed project (status enforcement via project state). Assigning a task to an employee with deactivated status triggers a warning (not an error), but the assignment proceeds—deactivated employees can still be assigned historically. Editing a task in an archived project only allows status updates for logging changes, not metadata like title or due date. A task with no assigned employee can still be created, which is valid per the requirements. Creating a task with an estimated hours value of zero is allowed, as 'optional' includes zero.

### non-project-member task assignment blocked

A task cannot be assigned to an employee who is not assigned to the project to which the task belongs. If a user attempts to assign a task to an employee not listed as a project member, the system rejects the assignment and provides a clear message that the employee must first be added to the project.

### cross-project parent task rejection

A subtask cannot have a parent task that belongs to a different project. If a user selects a parent task from another project, the system blocks the subtask creation and explains that subtasks must be within the same project as their parent.

### subtask nesting depth enforcement

Only one level of nesting is allowed for subtasks. If a user attempts to create a subtask of a subtask (i.e., a grandchild task), the system rejects the operation and notifies the user that subtasks must be directly attached to a top-level task.

### completed project task status edit lock

When a project is in completed status, tasks within it cannot have their status changed to open or in-progress. Any attempt to move a completed task’s status to an earlier state is rejected, though the task history continues to record changes to other fields.

### deactivated employee task assignment warning

A task can be assigned to a deactivated employee, but the system displays a warning that the employee is no longer active. The assignment proceeds to preserve historical task ownership, but future time tracking or communication related to the task may note the employee’s deactivated status.

### archived project task metadata lock

In archived or completed projects, editing a task’s core metadata (title, description, due date, priority, estimated hours, assigned employee) is restricted. Only status updates are permitted to reflect ongoing progress tracking needs. Any attempt to modify locked metadata is rejected, with a message indicating the project’s archived/completed status.

### unassigned task allowed

A task may be created without assigning an employee. This is a valid state per the requirements, and no validation error occurs when the assigned employee field is left blank during task creation or editing.

### zero estimated hours permitted

A task may have an estimated hours value of zero. Since the field is optional, entering or leaving zero hours is accepted without validation errors, and does not prevent task creation or editing.

## Timelog Error Scenarios

Creating a timelog fails if the selected project is not assigned to the employee—data isolation is strict per project membership. Adding a timelog to an archived or completed project is blocked, as those projects no longer accept new time entries. Editing or deleting a timelog included in an approved timesheet fails—this is a critical business rule enforced to maintain audit integrity. A timelog cannot span multiple days; date must be a single calendar date, so creating one with invalid or ambiguous date range is rejected. Creating a timelog with zero duration in minutes is blocked, as duration must be positive. A timelog cannot be created for a future date—only current or past dates are allowed. If an employee tries to log time for themselves on a project they are not assigned to, the system returns access denied. Deleting a timelog that is part of a submitted (but not approved) timesheet also fails—only draft timesheets allow editing.

### Timelog Project Membership Validation

Employees can only create a timelog for a project they are assigned to. If an employee selects a project they are not assigned to, the request is rejected. Project assignments are managed separately via ProjectMember records. The system validates project membership at the time of timelog creation, and rejects any timelog tied to an unassigned project.

### Timelog Blocked on Archived Project

Timelogs cannot be created for projects with status 'archived' or 'completed'. Creating a timelog against such a project is rejected regardless of permission level. Existing timelogs on archived or completed projects remain accessible and unchanged, but no new entries can be added to those projects.

### Timelog Edit/Delete Locked in Approved Timesheet

If a timelog is included in a timesheet that has been approved, the timelog becomes locked. Employees cannot edit or delete such timelogs. Users with 'time:manage' permission also cannot edit or delete timelogs in approved timesheets. This ensures audit integrity and prevents retroactive time changes after approval.

### Timelog Duration Must Be Positive

Every timelog must have a positive duration in minutes. Creating or editing a timelog with zero or negative duration is rejected. The system validates that the duration value is greater than zero before accepting the timelog.

### Timelog Future Date Rejection

Timelogs cannot be created with a date in the future. The date must be the current date or a past date. Attempting to create a timelog for a future date is rejected with an appropriate validation error.

### Timelog Access Denied for Unassigned Projects

If an employee attempts to create a timelog for a project they are not assigned to, the request is rejected with access denied. This applies regardless of project visibility or other permission settings. Project assignment via ProjectMember is required to log time on a project.

### Timelog Locked in Submitted Timesheet

Once a timelog is included in a submitted (but not yet approved or rejected) timesheet, it cannot be edited or deleted by anyone, including users with 'time:manage' permission. Only draft timesheets allow modification of their timelogs. This ensures consistency during the review process.

### Single-Day Timelog Enforcement

Each timelog must correspond to exactly one calendar day. Creating a timelog with a date that spans multiple days or uses an ambiguous date range is rejected. The system validates that the date field represents a single calendar day only.

## Timesheet Error Scenarios

Submitting a timesheet fails if it contains no timelogs, as an empty timesheet is not allowed. Submitting a timesheet for a week where another timesheet is already submitted or approved triggers a conflict error, preventing duplicate submissions. Editing a timesheet while it is in draft state allows adding/removing timelogs, but once submitted, no changes are permitted—even minor ones. Rejecting a timesheet without providing a reason fails, as the requirement mandates a text rejection reason. A user cannot create a draft timesheet for a week where they already have a draft—only one draft per employee per week is allowed. Approving a timesheet for a week with no timelogs fails, as approval requires valid time entries. If an employee has an active timer during timesheet generation, its duration is not included unless stopped first—timers do not auto-count toward the draft. Creating a draft timesheet for a past week (e.g., last year) is allowed, as only future ones are restricted by business logic in other areas.

### Empty Timesheet Submission Blocked

Employees cannot submit a timesheet that contains no timelogs. A timesheet with zero total hours is rejected at submission time. The system ensures that a submitted timesheet must include at least one timelog with a duration greater than zero.

### Duplicate Week Timesheet Conflict Rejection

Employees cannot submit a timesheet for a week if another timesheet for the same week (Monday to Sunday) already exists in submitted or approved status. Attempting to submit a duplicate timesheet for the same week is rejected to prevent conflicting time entries.

### Draft Timesheet Edit-Only Before Submission

Employees can modify their draft timesheet by adding or removing timelogs only while the timesheet remains in draft status. Once a timesheet is submitted, no changes are permitted—even minor edits to description or duration of included timelogs are blocked.

### Rejected Timesheet Requires Reason

When a user with time:approve permission rejects a timesheet, they must provide a written rejection reason. The system blocks rejection without a reason, ensuring that employees receive clear feedback for rejected timesheets.

### Single Draft Timesheet Per Employee Per Week

An employee can have at most one draft timesheet for any given week (Monday to Sunday). Creating a new draft for a week where a draft already exists overwrites the existing draft or fails to create a duplicate, ensuring only one active draft per employee per week.

### Approval of Timesheet with No Timelogs Blocked

Users with time:approve permission cannot approve a timesheet that contains no timelogs. Approval requires at least one valid timelog in the timesheet. The system prevents approval of empty timesheets to maintain data integrity.

### Active Timer Excluded from Draft Timesheet

When an employee creates or updates a draft timesheet, any currently running timer is not automatically included—even if its duration falls within the target week. Only stopped timelogs are included in the draft; the employee must stop the timer first for its time to be added.

### Past Week Timesheet Draft Allowed

Employees can create draft timesheets for past weeks (e.g., previous months or years) without restriction. Business logic does not prohibit draft creation for historical weeks—only future week restrictions apply elsewhere in the system.

## ActivityLog Error Scenarios

Activity logs cannot be manually created or edited by users—they are system-generated, so any attempt to write to the log endpoint is ignored or blocked at the API boundary (implied by design). Filtering by action type fails if an invalid or unsupported action string is provided (e.g., 'contract:edited' vs. 'contract:created'), resulting in no matches, not an error—filtering is permissive. Viewing the full activity log without `org:manage` permission results in an access denied response, as only managers and owners have full access. Filtering by date range with invalid formats (e.g., non-ISO strings) returns no results, but does not error—graceful degradation. PAGINATION on the activity log must respect organization context; cross-org entries are excluded automatically. Deactivating an employee logs a record, but the log does not include sensitive data (e.g., reason or initiator IP), only entity and action. Recording the same action twice (e.g., due to retry) is prevented by idempotency keys or timestamp deduplication at the domain level. Attempting to log an action on a non-existent entity (e.g., project ID deleted) is logged anyway for audit trail—entity existence is not validated at log creation.

### Manual Log Entry Rejection

Activity logs are created exclusively by the system in response to business actions; users cannot manually create or edit activity log entries. Any attempt to manually add, modify, or delete an activity log entry is silently ignored or blocked at the system boundary without generating an error response. This ensures integrity and auditability of the activity log as a system-generated record.

### Invalid Action Type Filter Returns Empty

When filtering the activity log by action type using an invalid or unsupported action string (e.g., 'contract:edited' when the system only supports 'contract:created'), the system returns an empty result set rather than an error. Filtering is permissive: unrecognized action types produce zero matches but do not halt the operation or cause a failure.

### org:manage Required for Full Log Access

Access to view the full activity log is restricted to users with the 'org:manage' permission. Users without this permission, including Managers and Employees, cannot view the activity log. If a user without 'org:manage' attempts to view the activity log, the request is denied with no partial data exposure—only the availability of the log itself is denied, not a subset.

### Date Range Format Errors Suppress Results

When filtering the activity log by date range, if the provided date format is invalid (e.g., non-ISO strings or malformed dates), the system silently returns no results instead of raising an error. The system does not attempt to interpret or correct the format; gracefully degrades to empty results to avoid disrupting the user experience.

### Organization-Scoped Activity Log Isolation

All activity log entries are strictly isolated per organization. Entries generated in one organization never appear in the log of another, even for users who belong to multiple organizations. When viewing the activity log, only entries belonging to the currently selected organization context are returned. Cross-organization data leakage is impossible by design.

### Deactivation Logging Without Sensitive Details

When an employee is deactivated, the system records an activity log entry with the action type 'employee:deactivated'. The entry includes the affected employee entity and timestamp, but deliberately excludes sensitive details such as the reason for deactivation, theIP address of the requesting user, or other internal context. Only entity identification and action type are stored to preserve privacy while maintaining auditability.

### Idempotent Action Logging

The system prevents duplicate logging of identical actions within a short window by enforcing idempotency at the domain level. If the same action is triggered multiple times (e.g., due to retry logic), only one activity log entry is created for that action instance. Deduplication uses a combination of action type, target entity, user, and timestamp, ensuring accurate historical records without redundancy.

### Log Creation for Deleted Entities

Activity log entries are created for actions on entities even if those entities are subsequently deleted. For example, if a project is archived and then deleted, activity log entries for the project (e.g., 'project:archived', 'project:deleted') are still retained with references to the entity ID at the time of action. The system does not validate current entity existence when logging—audit trail integrity takes precedence over referential validity.

## ProjectMember Error Scenarios

Assigning an employee to a project fails if they are deactivated in the organization, as deactivated employees are not eligible for project assignments. Adding a member with an invalid role (e.g., 'admin' instead of 'member' or 'project-lead') results in a validation error, as only two roles are supported. Removing a project member who is the only project lead blocks the removal to prevent orphaned leadership in the project. Assigning an employee to a project they’re already a member of is a no-op—no error, but also no duplicate entry. Assigning a member to a project that is archived or completed succeeds, but they cannot perform lead actions (e.g., editing tasks), enforcing status-based permission. Creating a project member without assigning a role fails, as role is required. Deactivating an employee automatically removes their project memberships across all projects, preserving state consistency. Attempting to assign a project member to a non-existent project ID returns a reference resolution error.

### Deactivated Employee Project Assignment Blocked

An employee who has been deactivated in the organization cannot be assigned to a project. When a request attempts to add a deactivated employee as a project member, the system rejects the assignment and indicates that only active employees may be assigned to projects.

### Invalid Project Member Role Rejection

When creating a project member, the assigned role must be either 'member' or 'project-lead'. If any other value is provided (e.g., 'admin', 'viewer', or empty), the system rejects the request and indicates that only these two roles are supported for project membership.

### Project Lead Removal Blocked When Sole

If an employee is the only project lead for a project, removing them from the project is blocked. The system rejects the removal request and indicates that at least one project lead must remain assigned to ensure continued project leadership.

### Duplicate Project Membership No-Op

Attempting to assign an employee to a project they are already a member of is a no-op: the system does not create a duplicate membership, does not return an error, and leaves the existing membership unchanged.

### Archived Project Lead Action Restriction

A project member assigned as project-lead on an archived or completed project may not perform lead-specific actions (e.g., editing tasks or assigning tasks to team members). The system allows the membership to exist, but enforces status-based permission restrictions on lead capabilities.

### Required Role on Project Member Creation

Creating a project membership without specifying a role is not allowed. The system requires that every project member record include a valid role ('member' or 'project-lead'); if omitted, the request is rejected.

### Automatic Project Membership Removal on Employee Deactivation

When an employee is deactivated, the system automatically removes their membership from all projects. This ensures consistency: deactivated employees are no longer associated with any active project assignments, and historical timelogs remain intact.

### Non-Existent Project ID Resolution Error

If a request attempts to assign a project member to a project that does not exist (e.g., due to invalid or deleted project ID), the system rejects the request with a reference resolution error indicating the project could not be found.

## TaskHistory Error Scenarios

Task history entries are created automatically on status changes; manual creation is impossible and requests to do so are silently ignored. Changing a task’s status to the same as its current status does not generate a history entry—only actual changes trigger logging. Editing a task’s non-status fields (e.g., title or due date) does not create a task history entry, as history tracks only status transitions. Attempting to delete or update an existing task history entry is blocked—the history is immutable once recorded. Creating a history entry with an invalid old status or new status (e.g., 'completed' to 'cancelled') is prevented by enum validation—only valid transitions are allowed. Task history is scoped to the task’s project, ensuring visibility aligns with project-level access rules. If a task is moved to a different project (not explicitly supported in requirements, but inferred as disallowed), no history copy occurs—history stays with the original project context. The system logs who made the change, but not the IP or client timestamp, preserving privacy.

### Manual Task History Entry Blocked

Task history entries are created automatically by the system only when a task’s status changes. Users and external systems cannot manually create, add, or insert task history entries. Any attempt to submit a manual task history entry request is silently ignored by the system, with no error and no log of the attempt.

### Same-Status Change No History Created

When a task’s status is updated to the same value it currently has, the system does not create a task history entry. Only actual status transitions — where old status and new status differ — trigger the creation of a new history record. Idempotent status updates are treated as no-ops for history purposes.

### Non-Status Edits No History Entry

Editing non-status fields of a task — such as title, description, priority, due date, assigned employee, estimated hours, or parent task — does not generate a task history entry. Task history is strictly reserved for status transitions and does not track changes to other attributes of the task.

### Task History Immutable After Creation

Once a task history entry is created, it becomes a permanent, immutable audit record. No user or process may edit, update, delete, or modify any field of an existing task history entry. All fields — timestamp, old status, new status, and changer — are locked after creation.

### Invalid Status Transition Rejection

If a task status change would result in an invalid transition (for example, changing from ‘completed’ to ‘cancelled’, or from ‘closed’ to ‘in-progress’), the system rejects the status update request. The status remains unchanged, no history entry is created, and the operation fails with a clear business validation error.

### Project-Scoped Task History Access

Task history entries are accessible only to users who have visibility into the task itself. Since task visibility follows project membership and project-level permissions, users may view task history only for tasks they can see under their current organization context.

### History Stays with Original Project

If a task were to be moved to a different project (despite this not being explicitly supported), its associated task history entries would remain linked to the original project context. No history entries are copied, duplicated, or transferred during such a hypothetical move; history stays permanently associated with the task’s original project.

### User Attribution in Task History

Each task history entry records the user who performed the status change. The system logs the user’s identity at the time of change but does not log IP address, device identifier, or client-side timestamp. Only the internal system timestamp, the user, and the status transition are captured.

## Timer Error Scenarios

Starting a timer fails if the employee already has an active timer—the system allows only one concurrent timer per employee. Selecting a project the employee is not assigned to when starting a timer results in access denied. Starting a timer for a project in archived or completed status is allowed, but timelogs created from it will fail if the timer is stopped later—validation happens at log creation. Stopping a timer for a deactivated employee is allowed, but the resulting timelog may fail to save if the employee is no longer active—state must be valid at log creation. Discarding a running timer that has been running for over 24 hours is allowed, but may trigger a warning to the employee in the UI (though not in requirements—omitted). Editing a running timer’s description or project is allowed, even if the new project is not assigned, but the timer will be invalidated if stopped later (only current assignments count). If a user logs in from multiple devices, each device maintains its own timer state, but only one can be active per employee at the DB level—concurrent starts on different devices are prevented. Starting a timer for a future date is blocked—timelogs (and timers) must reference current or past dates.

### Single Active Timer Enforcement

Each employee can have only one active timer at a time. If an employee attempts to start a new timer while another timer is already running, the request is rejected. The system prevents overlapping timer sessions to ensure accurate time tracking and avoid duplicate timelog entries.

### Unassigned Project Timer Start Blocked

An employee cannot start a timer for a project they are not assigned to. If the employee selects a project they are not a member of, the request is rejected. Project membership must be valid at the time the timer starts to ensure accountability and accurate project allocation.

### Archived or Completed Project Timer Started Allowed but Stop Validation Fails

An employee can start a timer for a project that is archived or completed. However, when the timer is stopped and a timelog is created, the system validates that the project is still active. If the project is archived or completed at stop time, the timelog creation fails. This allows timer sessions to begin flexibly while preserving data integrity at log creation.

### Timer Stop for Deactivated Employee

A timer can be stopped for a deactivated employee. However, if the employee is deactivated at the time the timelog is saved, the timelog creation fails. The system validates employee status at timelog creation, not at timer start, to maintain data consistency and prevent entries for inactive contributors.

### Running Timer Description or Assignment Edit Allowed

An employee can edit the description, project, or task of a running timer at any time. This includes switching the project to one the employee is assigned to, even if the new project is not the original selection. However, if the timer is stopped with an invalid assignment (e.g., unassigned project or non-member project), the timelog creation fails. Validation occurs only when the timer is stopped.

### Multi-Device Timer State Isolation

Each device maintains its own timer state for the employee. However, only one timer can be active globally per employee across all devices. If an employee starts a timer on a new device while an active timer exists elsewhere, the request is rejected. This ensures that time tracking remains accurate regardless of device usage.

### Future Date Timer Start Blocked

An employee cannot start a timer for a future date. Timelogs must reflect time worked in the current or past. If an employee attempts to start a timer with a future date reference, the request is rejected. This prevents inaccurate planning or future-dated entries.

## PendingInvitation Error Scenarios

Sending an invitation to an email already associated with an existing account that is already in the organization results in a conflict error stating the user is already a member—no duplicate invitation is created. Sending an invitation to an email that does not yet have an account creates a pending invitation, but if the email domain is blocked (e.g., via org settings), the invitation fails—though domain blocking is not in requirements, so we assume no such rule exists. Re-inviting a pending user (email not yet signed up) overwrites the previous invitation’s expiry timestamp if one exists, but does not create duplicates. Deleting a pending invitation requires the inviter to have `employee:manage` permission—otherwise access is denied. Inviting a user with a deactivated status in another org is allowed—the system does not cross-check status across orgs due to isolation. If the invited email signs up with a different email address, the invitation is lost and not auto-applied—email matching must be exact. An invitation expires after 30 days if the requirements implied a policy, but since no expiry is stated, we assume it is persistent until accepted or revoked. Revoking an invitation (before signup) removes it entirely, preventing future matching.

### Duplicate Organization Member Invitation Conflict

If an employee invitation is sent to an email address that is already associated with an existing account that belongs to the same organization, the system rejects the invitation and displays a conflict error indicating that the user is already a member of the organization. No duplicate invitation is created, and the existing membership remains unchanged.

### Pending Invitation No Expiry (Persistent)

When a pending invitation is created for a user who has not yet signed up, it remains active indefinitely. There is no automatic expiration or expiry timestamp associated with the pending invitation unless explicitly revoked. The system preserves the pending invitation until the invitee signs up with the exact invited email or the invitation is manually revoked by the inviter.

### Revoked Invitation Permanent Removal

When an invitation is revoked before the invitee signs up, the pending invitation is permanently removed from the system. Once revoked, the invitation cannot be reinstated or reused. If the invitee later signs up, they are not automatically added to the organization. A new invitation must be created if the organization wishes to invite the same email address again.

### Sign-up Email Must Match Invitation Exactly

For a pending invitation to be applied during sign-up, the email address used to register the account must match the email address in the pending invitation exactly. If the invitee uses a different email address during sign-up, the invitation is not applied, and no automatic membership is created. The user becomes a standalone account with no association to the pending invitation.

### Cross-Org Status Independence

The status of a user in other organizations has no effect on invitation eligibility. For example, if a user is deactivated in one organization, they can still be invited to another organization. The system does not enforce or validate cross-organization status when sending or accepting invitations.

### Deactivated User Invitation Allowed

A user can be invited to an organization even if they are currently deactivated in another organization. The invitation process does not check the user’s status in other organizations. Once invited and accepted, the user becomes an employee in the new organization with their own active or deactivated status based on the invite action.

### Re-invite Overwrites Expiry Only

If the same pending invitation is re-sent to the same email (before signup), the system updates the invitation’s expiry timestamp (if applicable) but does not create a duplicate invitation. Only the internal timestamp tracking the re-invitation is updated; all other invitation data (email, organization, inviter) remains unchanged.

### Invitation Revocation Before Signup

Only the user who originally sent the invitation (inviter) can revoke a pending invitation. Revocation is allowed only while the invitation is still pending (i.e., the invitee has not signed up). Revoking an invitation terminates any future association between that invitation and the invitee’s account, even if the invitee later signs up with the exact email address.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New Organization Onboarding Journey

When a new user signs up, they create their first organization. During onboarding, they provide the organization name, currency, timezone, and fiscal start month. A logo image may be uploaded. After creation, the user becomes the sole owner of the organization.

They then invite their first employee by entering an email address. If the email belongs to an existing user, that user is added to the organization as an employee. If the email has no account, a pending invitation is created and remains until the invitee signs up with that email—automatically joining the organization.

Next, the owner assigns built-in or custom roles to employees. They create departments to organize employees and define project structures. The owner sets up at least one project with color code, status, and optionally budget hours and dates. Employees are assigned to the project, and tasks are created for initial work.

Once the setup is complete, the organization is ready for daily operations: employees can track time, submit timesheets, and managers can approve them.

### Employee Onboarding and First Timesheet Workflow

A new employee receives an invitation email and accepts it by signing up with the same email. Upon signup, they are automatically added to the organization and assigned their role (e.g., Employee or Manager). They receive an employee record with department, position, and employment type.

The employee reviews their personal profile and confirms contact details. They may create their first timelog by selecting a project (required) and optional task, entering duration and description.

At the end of the week (Monday to Sunday), the employee submits their timesheet for approval. The system automatically includes all timelogs logged during that week. If no timelogs exist, submission is blocked. The employee may first add or remove timelogs while the timesheet is in draft status.

Once submitted, the timesheet status changes to submitted and awaits review by a user with time:approve permission.

### Project Kickoff and Task Assignment Sequence

A project manager creates a new project by setting its name, color code, and status (active by default). They optionally add description, budget hours, start date, and end date.

Next, they assign employees to the project. Each assignment specifies the employee and their role in the project (member or project-lead). Only project members can be assigned to tasks in that project.

Once members are assigned, the project manager or a project-lead creates tasks within the project. Tasks include title, optional description, priority, estimated hours, and optional due date. A project-lead may assign tasks to project members, including themselves.

If a task needs subtasks, one level of nesting is supported. The parent task must belong to the same project. Subtasks inherit the project context but are tracked separately for status and due dates.

Once tasks are created, employees begin logging time against them. Managers can monitor progress using reports and update task status as work proceeds.

### Weekly Timesheet Submission and Approval Flow

At the end of each week (Monday to Sunday), employees review their timelogs. They open or create a draft timesheet for the week. The system automatically includes all timelogs from that week for the employee.

The employee can modify the draft: add additional timelogs, remove entries, or adjust descriptions. They cannot add timelogs from outside the week or from projects they are not assigned to.

Once satisfied, the employee submits the timesheet. Submission locks all included timelogs and prevents edits or deletions. If another timesheet for the same week is already submitted or approved, the submission is blocked.

A manager with time:approve permission reviews the submitted timesheet. They may approve it, locking timelogs permanently, or reject it with a reason. Rejection returns the timesheet to draft status so the employee can correct and resubmit.

Approved timesheets trigger financial reporting inclusion: hours are marked as billable/non-billable in project budget tracking.

### Employee Offboarding and Data Preservation Workflow

When an employee leaves the organization, an owner or manager with employee:manage permission deactivates their employee record. Deactivation prevents the employee from creating new timelogs, editing existing timelogs, or submitting new timesheets.

Historical data is preserved: all timelogs, timesheets, tasks, and project memberships remain intact and accessible in reports. The employee’s profile is retained but marked as deactivated.

If the employee is the sole owner of the organization, they cannot deactivate their account until ownership is transferred to another employee or the organization is deleted. Account deletion (not employee deactivation) is handled separately and requires resolution of organization-level constraints.

When an employee is deactivated, pending invitations to the same organization are voided. If the employee was assigned as a project lead, their assignments remain but with a warning that task management authority may be reassigned by project:manage users.