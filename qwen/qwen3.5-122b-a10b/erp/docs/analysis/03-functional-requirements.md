**hrmPlatform — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

Users create an organization during initial sign-up with a name, description, logo image, currency, timezone, and fiscal start month. Organization owners can edit all organization settings at any time. The platform supports multiple organizations operating independently with separate employees, projects, and data. Users can belong to multiple organizations and select which organization context to work in when logging in. All subsequent actions are scoped to the selected organization. Users can switch between organizations without logging out. Organization owners can delete their organization only when all pending timesheets are resolved and there are no active employee contracts. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's account remains but is no longer associated with any organization. Users with org:manage permission can access organization settings and view organization-level information.

### Organization Creation

Users create an organization during initial sign-up with a name (required), currency (required), and timezone (required). An optional description, logo image, and fiscal start month may be provided. The user who creates the organization becomes its owner with full access to all features. Each organization operates independently with its own employees, projects, and data. The platform supports multiple organizations, allowing users to create and manage more than one organization over time.

### Organization Settings Management

Organization owners can edit all organization settings at any time, including name, description, logo image, currency, timezone, and fiscal start month. Users with the org:manage permission can access organization settings and view organization-level information. Changes to organization settings are immediately reflected across the organization. The fiscal start month determines the beginning of the organization's financial year for reporting purposes.

### Multi-Organization Support

Users can belong to multiple organizations simultaneously. When logging in, users select which organization to work in, establishing the organization context for that session. All subsequent actions are scoped to the selected organization, ensuring data isolation between organizations. Users can switch between organizations without logging out, changing the organization context to access different organizational data. Each organization maintains separate employees, projects, tasks, timelogs, timesheets, and settings.

### Organization Deletion

Organization owners can delete their organization when certain conditions are met. Before deletion, all pending timesheets must be resolved (approved or rejected) to prevent data loss during the deletion process. There must be no active employee contracts at the time of deletion. When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently deleted from the system. The owner's user account remains in the system but is no longer associated with any organization. The owner can later create a new organization or join existing organizations.

## User Operations

Users sign up with email and password to create a new account. Users log in with email and password and select which organization to work in. Users can change their password at any time. A user can belong to multiple organizations simultaneously. When logging in, users select which organization context to activate for their session. All actions are scoped to the currently selected organization. Users can switch organizations without logging out. Users can delete their account if they are not the sole owner of any organization. If a user is the sole owner of an organization, they must transfer ownership or delete the organization first before deleting their account. When a user deletes their account, their employee records in other organizations are marked as deactivated. Users have a global profile with display name, avatar image, and phone number that is shared across all organizations.

### User Account Registration

Users can create a new account by providing an email address and password during registration. The email address must be unique across the platform. Upon successful registration, a new organization is automatically created with the user as the owner. Users receive confirmation of successful account creation. If the email is already registered, the registration request is rejected. Users can proceed to log in after completing registration.

### User Authentication and Organization Selection

Users can log in to the system using their registered email and password. Upon successful authentication, users must select which organization to work in from their list of organizations. The selected organization becomes the active context for all subsequent actions. Users cannot log in with invalid email or password combinations. Users who have no organizations associated with their account cannot complete the login process until an organization is created or they are added to one.

### Password Management

Users can change their password at any time after logging in. The user must provide their current password to verify identity before setting a new password. The new password must be confirmed by entering it twice. Password changes apply to the user account globally across all organizations. If the current password is incorrect, the password change request is rejected. Users can request password reset through the login interface if they have forgotten their password.

### Multi-Organization Membership

A user can belong to multiple organizations simultaneously. Each organization maintains separate employee records for the user with organization-specific roles and permissions. The user's global profile information is shared across all organizations. Employee records in each organization are independent and can have different roles, departments, and employment types. Users can view and manage their organization memberships from their profile settings.

### Organization Context Management

Users can select which organization context to activate when logging in or during an active session. All actions performed by the user are scoped to the currently selected organization. Users can switch between organizations without logging out. When switching organizations, the user's context changes immediately and all subsequent actions follow the new organization context. Organization context is maintained throughout the user session until explicitly changed or the session ends.

### Account Deletion and Ownership Transfer

Users can delete their account if they are not the sole owner of any organization. If a user is the sole owner of an organization, they must first transfer ownership to another employee or delete the organization before deleting their account. When a user deletes their account, their employee records in all other organizations are automatically marked as deactivated. The user's global profile data is removed from the system. Organization owners who are not sole owners can delete their account while remaining employee records in other organizations are deactivated.

### Global User Profile

Users have a global profile that is shared across all organizations they belong to. The global profile includes display name, avatar image, and phone number. Users can edit their global profile at any time. Profile changes are immediately reflected across all organizations. Each organization does not maintain separate profile information for the user. Users can view their current profile information from their account settings.

## Employee Operations

Users with employee:manage permission can invite new employees to the organization by email. If the invited email already has an account, the user is added to the organization immediately. If the invited email has no account, a pending invitation is created. When a user signs up with a pending invitation email, they are automatically added to the pending organizations. Each employee record includes reference to the user account, role in the organization, optional department, optional position, employment type, and status. Users with employee:manage permission can edit employee records including department, position, and employment type. Users with employee:manage permission can deactivate employees who cannot log time or submit timesheets thereafter. Deactivated employees' historical data including timelogs and timesheets is preserved. Deactivated employees can be reactivated by users with employee:manage permission. Users with employee:view permission can view the employee list with pagination. The employee list can be filtered by department, employment type, and status. Employees can search the list by name.

### Employee Invitation and Onboarding

Users with employee:manage permission can invite new employees to the organization by providing an email address.

If the invited email address already has a user account, the user is immediately added to the organization as an employee with a specified role.

If the invited email address does not have an existing account, a pending invitation is created and stored until the user registers.

When a user signs up with an email address that has a pending invitation, the user is automatically added to all organizations associated with that invitation.

The invitation process records the inviting user, the target email address, and the organization for audit purposes.

### Employee Record Structure

Each employee record links a user account to an organization and contains the employee's role within that organization.

The employee record includes optional department assignment and optional position or title information.

The employee record specifies employment type as one of: full-time, part-time, contractor, or intern.

The employee record includes a status field indicating whether the employee is active or deactivated.

Users with employee:view permission can view the complete employee record including role, department, position, employment type, and status.

Users with employee:manage permission can view all employee record fields and modify editable fields.

### Employee Record Editing

Users with employee:manage permission can update the department assignment for any employee in the organization.

Users with employee:manage permission can update the position or title for any employee in the organization.

Users with employee:manage permission can update the employment type for any employee in the organization.

Users with employee:manage permission cannot modify the user account reference or the employee status through the edit operation.

Changes to employee records are recorded in the activity log with timestamp and the user who made the change.

### Employee Deactivation

Users with employee:manage permission can deactivate an employee in the organization.

When an employee is deactivated, the employee cannot create new timelogs for time tracking.

When an employee is deactivated, the employee cannot submit new timesheets for approval.

Deactivation does not remove the employee record from the system.

All historical data for the deactivated employee, including timelogs and timesheets, is preserved and remains viewable.

The employee status is updated to deactivated in the employee record.

### Employee Reactivation

Users with employee:manage permission can reactivate a deactivated employee in the organization.

When an employee is reactivated, the employee status is updated to active in the employee record.

After reactivation, the employee can create new timelogs for time tracking.

After reactivation, the employee can submit new timesheets for approval.

Historical data from before deactivation remains preserved and accessible.

The reactivation action is recorded in the activity log with timestamp and the user who performed the reactivation.

### Employee List Browsing

Users with employee:view permission can view the list of employees in the organization.

The employee list is paginated to display employees in manageable batches.

Users can filter the employee list by department to view only employees in a specific department.

Users can filter the employee list by employment type to view only employees with a specific employment type.

Users can filter the employee list by status to view only active or only deactivated employees.

Users can search the employee list by name to find specific employees.

Multiple filters can be combined to narrow the employee list results.

The employee list displays the employee's name, role, department, employment type, and status for each employee.

## Contract Operations

Each employee can have multiple contracts serving as a historical record. Only one contract can be active at a time for each employee. Each contract includes start date, optional end date, required pay rate, pay period, working hours per week, and optional notes. Users with employee:manage permission can create contracts for employees. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts. Users with employee:manage permission can edit the current active contract. Past contracts cannot be edited as they form an immutable historical record. Employees can view their own contracts at any time. Users with employee:view permission can view any employee's contracts. Contract pay rate is a required numeric value. Pay period can be hourly, daily, weekly, or monthly. Working hours per week is a required field.

### Contract Creation

Users with employee:manage permission can create contracts for employees.

Each contract must include a start date, which is required. The end date is optional; if not provided, the contract is considered ongoing.

Each contract must include a pay rate as a required numeric value. The pay period must be specified as one of: hourly, daily, weekly, or monthly.

Each contract must include working hours per week as a required field.

Notes may be added to a contract as optional information.

When a new contract is created for an employee, the system automatically terminates the previous active contract by setting its end date to the day before the new contract's start date.

A contract can only be created for an employee who has an active status in the organization.

### Contract Management

Each employee can have only one active contract at a time. The system enforces this constraint when creating or editing contracts.

Users with employee:manage permission can edit the current active contract for an employee. Changes to the active contract include updating the end date, pay rate, pay period, working hours per week, or notes.

Past contracts form an immutable historical record and cannot be edited. Once a contract is terminated (by end date or by a new contract replacing it), its information is preserved as-is and cannot be modified.

When an employee's active contract is edited, the system records the change and maintains the historical integrity of all past contracts.

If an employee has no active contract, users with employee:manage permission can create a new contract to establish employment terms.

### Contract Viewing

Employees can view their own contracts at any time, including both active and past contracts. This allows employees to review their employment history and current terms.

Users with employee:view permission can view any employee's contracts within the organization. This includes viewing active and past contracts for all employees they have access to.

Multiple contracts serve as a historical record for each employee, showing the progression of employment terms over time.

Contract viewing includes all contract details: start date, end date (if applicable), pay rate, pay period, working hours per week, and notes.

The system displays contracts in chronological order, with the active contract (if any) clearly indicated.

## Department Operations

Each organization can have departments with a name, description, and optional parent department for one level of nesting. Users with org:manage permission can create new departments. Users with org:manage permission can edit existing departments including name and description. Users with org:manage permission can delete departments. When a department is deleted, employees' department is set to null but employees are not deleted. Employees can view the list of departments in their organization. Departments support hierarchical structure with parent-child relationships limited to one level. Department deletion does not affect employee employment status. Department name is required while description is optional.

### Department Creation

Users with org:manage permission can create a new department within their organization.

When creating a department, the user must provide a department name. A description may be optionally provided.

The system shall assign the newly created department to the current organization context.

If the department name is missing, the creation request is rejected.

If the user does not have org:manage permission, the creation request is rejected.

### Department Editing

Users with org:manage permission can edit an existing department's name and description.

When editing a department, the user must provide a new department name. The description may be updated or left unchanged.

The system shall preserve the department's parent relationship during editing unless explicitly changed.

If the user does not have org:manage permission, the edit request is rejected.

If the department does not exist in the current organization, the edit request is rejected.

### Department Hierarchy Management

Users with org:manage permission can assign a parent department to a department, creating a parent-child relationship.

A department can have at most one parent department.

A parent department cannot be assigned as a child to one of its own descendants (circular reference prevention).

The hierarchy is limited to one level: a department can have children, but those children cannot have their own children.

Users with org:manage permission can remove the parent department assignment, making the department a top-level department.

If the user does not have org:manage permission, the parent assignment request is rejected.

If the proposed parent-child relationship would create a circular reference, the request is rejected.

If the proposed hierarchy would exceed one level, the request is rejected.

### Department Deletion

Users with org:manage permission can delete a department from the organization.

When a department is deleted, all employees assigned to that department have their department reference set to null.

Employee records are preserved when their department is deleted. Employment status, contracts, and other data remain unchanged.

The system shall remove the department and all its hierarchical relationships.

If the user does not have org:manage permission, the deletion request is rejected.

If the department does not exist, the deletion request is rejected.

### Department List Viewing

All employees can view the list of departments in their organization.

The department list displays each department's name and description.

The department list shows the hierarchical structure with parent-child relationships.

Employees without org:manage permission can view but cannot create, edit, or delete departments.

The department list is paginated.

Employees can filter the department list by parent department to view only top-level departments or only children of a specific parent.

## Project Operations

Users with project:manage permission can create projects with a required name, optional description, required color code, status, optional budget hours, optional start date, and optional end date. Users with project:manage permission can edit project details. Users with project:manage permission can archive or complete projects. Archived or completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Users with project:manage permission can delete projects only if the project has no timelogs associated with it. Users with project:view permission can view all projects. The project list is paginated. Projects can be filtered by status. Project status can be active, archived, or completed. Color code is required for UI display purposes.

### Project Creation

Users with project:manage permission can create new projects within an organization. Each project requires a name and a color code for UI display purposes. Projects may optionally include a description, budget hours, start date, and end date. The project is automatically associated with the creating organization. When a project is created, it is set to active status by default.

### Project Editing and Status Management

Users with project:manage permission can edit project details including name, description, color code, budget hours, start date, and end date. Users with project:manage permission can change the project status to archived or completed. Project status changes affect timelog access as described in the project status and timelog access section. Project edits are immediately visible to all users with project:view permission.

### Project Archiving and Completion

Users with project:manage permission can archive projects that are no longer actively used but need to be retained for historical reference. When a project is archived, it cannot receive new timelogs. Existing timelogs on the archived project remain visible and are preserved. Users with project:manage permission can also mark projects as completed when all work is finished. Completed projects cannot receive new timelogs. Existing timelogs on completed projects are preserved and remain visible.

### Project Deletion

Users with project:manage permission can delete projects from the organization. Project deletion is only permitted when the project has no timelogs associated with it. If timelogs exist on the project, deletion is blocked until all timelogs are addressed. When a project is successfully deleted, all associated tasks and project memberships are also removed. Timelogs on the project must be handled before deletion can proceed.

### Project Viewing and Browsing

Users with project:view permission can view all projects within their organization. The project list displays paginated results to support organizations with many projects. Users can filter the project list by status (active, archived, or completed) to find projects of interest. All project details including name, description, color code, status, budget hours, and dates are visible to users with project:view permission.

### Project Status and Timelog Access Control

When a project status changes to archived or completed, the system enforces timelog access restrictions. Employees cannot create new timelogs against archived projects. Employees cannot create new timelogs against completed projects. Existing timelog records on archived or completed projects remain intact and visible in reports and timesheets. This ensures historical time tracking data is preserved even when projects are no longer active for new work.

## ProjectMember Operations

Users with project:manage permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership includes the employee, project, and assigned role which can be member or project-lead. Project leads can manage tasks within their assigned project. Users with project:manage permission can remove employees from projects. Employees can view which projects they are assigned to. Project membership establishes the relationship between employees and projects. Project-lead role grants task management capabilities. Member role provides standard project access. Assignment removal revokes project access for the employee.

### Project Assignment

Users with project:manage permission can assign employees to projects within their organization. An employee can be assigned to multiple projects simultaneously, allowing participation across different initiatives. Each project assignment creates a project membership record that establishes the relationship between the employee and the project.

When an employee is assigned to a project, the system records the employee, the project, and the assigned role for that membership. The assigned role determines what actions the employee can perform within the project context. Project assignments are scoped to the current organization context.

Users with project:manage permission can view all project memberships to understand which employees are assigned to which projects. This visibility supports resource planning and workload management across the organization.

### Project Membership Roles

Each project membership includes an assigned role that defines the employee's access level within the project. Two role options are available: member and project-lead.

The member role provides standard project access, allowing the employee to log time against the project and view project information. Members cannot create or manage tasks within the project.

The project-lead role grants additional capabilities for project management. Project leads can create, edit, and manage tasks within their assigned project. They can assign tasks to other project members and track task progress. Project leads have the same time tracking capabilities as members, plus task management authority.

Users with project:manage permission can assign either role to employees when adding them to projects. The role assignment can be updated by users with project:manage permission to change an employee's access level within a project.

### Project Lead Responsibilities

Project leads have specific task management rights within their assigned projects. They can create new tasks, edit existing tasks, and change task status throughout the task lifecycle. Project leads can assign tasks to other employees who are members of the same project.

Project leads can view all tasks within their project, including task details, status, priority, and assigned employees. They can track task progress and monitor completion rates. Project leads can manage subtasks, creating one-level nested task hierarchies where appropriate.

Users with project:manage permission can also manage tasks in any project, regardless of their project-lead assignment. This provides oversight capability for project management beyond individual project leads.

Project leads cannot delete the project itself or remove other employees from the project. These actions require project:manage permission.

### Member Role Access

Members have standard project access that enables time tracking and project visibility. Members can log time entries against the project they are assigned to, associating their work with specific tasks when applicable. Members can view project information including project details, status, and task lists.

Members cannot create or modify tasks within the project. Task management is restricted to project leads and users with project:manage permission. Members cannot add or remove other employees from the project.

Members can view their own time entries and timesheets related to the project. They can see task assignments where they are the assigned employee and track the status of their assigned work.

The member role is the default assignment when adding employees to projects unless the project-lead role is explicitly specified.

### Project Assignment Management

Users with project:manage permission can remove employees from projects when necessary. When an employee is removed from a project, their project membership is terminated and they lose access to that project. The employee can no longer log time against the project or view project information.

Existing timelogs and timesheets associated with the removed employee's project membership are preserved for historical record. Task assignments to the removed employee remain in the system but the employee is no longer a project member.

Employees can view which projects they are currently assigned to through their project membership list. This view shows all active project memberships including the project name and their assigned role within each project. Employees cannot modify their own project assignments; only users with project:manage permission can add or remove project memberships.

Project membership removal does not affect the employee's status in the organization or their access to other projects where they remain assigned.

## Task Operations

Project leads or users with project:manage permission can create tasks within a project. Each task has a required title, optional description, required status, priority, optional estimated hours, optional due date, optional assigned employee, and optional parent task for subtasks. Task status can be open, in-progress, completed, or closed. Priority can be low, medium, high, or urgent. Assigned employee must be a project member. Parent task support allows one level of nesting for subtasks. Project leads can edit tasks in their project. Users with project:manage permission can edit any task. Task status changes are recorded in task history with timestamp, old status, new status, and who made the change. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee. Tasks can be sorted by due date, priority, or creation date.

### Task Creation

Project leads can create tasks within their assigned projects. Users with project:manage permission can also create tasks in any project. Each task requires a title field that must be provided. Optional fields include a description, estimated hours, and due date. When creating a task, the creator can optionally assign it to an employee who is a member of the project. The task can also be linked to a parent task to create a subtask relationship.

### Task Attributes and Structure

Each task has a status that can be open, in-progress, completed, or closed. Tasks also have a priority level that can be low, medium, high, or urgent. Estimated hours can be specified to indicate the expected effort required. A due date may be set to indicate when the task should be completed. Tasks can be assigned to employees who are members of the project. Tasks support one level of subtask nesting, where a task can have a parent task but subtasks cannot have their own subtasks.

### Task Editing

Project leads can edit tasks within their assigned projects. Users with project:manage permission can edit any task in the organization. When editing a task, users can modify the description, estimated hours, due date, assigned employee, priority, status, and parent task relationship. The task title cannot be changed once created.

### Task Status Change History

When a task status changes, the system records this change in the task history. Each history entry includes the timestamp of the change, the old status value, the new status value, and the user who made the change. Task history provides an audit trail of all status transitions for each task. The history is maintained for the lifetime of the task and cannot be modified.

### Task Viewing and Browsing

Employees can view all tasks in projects to which they are assigned. The task list can be filtered by status, priority, or assigned employee. Tasks can be sorted by due date, priority, or creation date. Employees can only see tasks within their assigned projects and cannot view tasks from projects they are not members of.

## Timelog Operations

Employees can log time entries called timelogs with required date, required duration in minutes, required project, optional task, optional description, and billable flag defaulting to true. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time:manage permission can edit or delete any employee's timelogs. Users with time:view_all permission can view all employees' timelogs. Employees can view their own timelogs. Timelogs are paginated. Timelogs can be filtered by date range, project, task, and billable status. Project must be a project the employee is assigned to. Task must belong to the selected project.

### Timelog Creation

Employees can create timelogs to record time spent on work activities. Each timelog requires a date and duration in minutes. A project must be selected, and it must be a project the employee is assigned to. An optional task can be included, but if specified, it must belong to the selected project. A description may be added to explain what work was performed. The billable flag defaults to true, indicating the time is billable unless explicitly marked otherwise. Employees can only create timelogs for themselves; they cannot log time on behalf of other employees.

### Timelog Editing

Employees can edit their own timelogs to correct errors or update information. However, editing is only permitted if the timelog is not part of an approved timesheet. Once a timelog is included in an approved timesheet, it becomes locked and cannot be modified. Users with the time:manage permission can edit any employee's timelogs regardless of timesheet status, providing administrative override capability for corrections or adjustments.

### Timelog Deletion

Employees can delete their own timelogs when they are no longer needed. Deletion is only allowed if the timelog is not part of any submitted or approved timesheet. Timelogs in draft timesheets can be deleted, but once a timesheet is submitted or approved, the timelogs it contains are protected from deletion. Users with the time:manage permission can delete any employee's timelogs, providing administrative control for data cleanup or corrections.

### Timelog Viewing and Access

Employees can view their own timelogs to track their time recording history. The timelog list is paginated to handle large volumes of entries efficiently. Users with the time:view_all permission can view all employees' timelogs across the organization, enabling managers and administrators to monitor time tracking activities. This permission is separate from time:manage and focuses on read-only visibility of all timelogs.

### Timelog Filtering and Browsing

Timelogs can be filtered to help employees and managers find specific time entries. Filtering options include date range to narrow results to a specific period, project to view time logged on a particular project, and task to see time entries for a specific task within a project. The billable status can also be used as a filter to distinguish between billable and non-billable time entries. These filters can be combined to create precise queries for reporting and analysis purposes.

## Timesheet Operations

A timesheet is a collection of timelogs for a specific week from Monday to Sunday. Employees submit timesheets for approval. Each timesheet includes employee owner, week start date, week end date, status, total hours calculated from included timelogs, submitted at timestamp, reviewed at timestamp, reviewed by user, and rejection reason when rejected. Status can be draft, submitted, approved, or rejected. Employees can create a draft timesheet for a specific week. Creating a draft automatically includes all timelogs for that employee in that week. Employees can add or remove timelogs from a draft timesheet. Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Users with time:approve permission can view all submitted timesheets. Users with time:approve permission can approve submitted timesheets. Approved timesheets lock all included timelogs. Users with time:approve permission can reject submitted timesheets with a reason. Rejected timesheets return to draft status. Employees can view their own timesheets. Timesheets are paginated. Timesheets can be filtered by status and date range.

### Timesheet Weekly Collection Structure

A timesheet is a collection of timelogs for a specific week from Monday to Sunday. Each timesheet includes the employee who owns it, the week start date (Monday), the week end date (Sunday), a status, the total hours calculated from included timelogs, a submitted at timestamp, a reviewed at timestamp, a reviewed by user, and a rejection reason when rejected. The total hours are calculated by summing the duration of all timelogs included in the timesheet. The week boundaries are fixed from Monday to Sunday, ensuring consistent weekly periods across the organization.

### Draft Timesheet Creation

Employees can create a draft timesheet for a specific week. When creating a draft timesheet, the system automatically includes all timelogs that belong to that employee for the selected week. The draft timesheet has a status of "draft" and is not yet submitted for approval. Employees can create draft timesheets for any week, including past weeks, as long as no other timesheet for the same week already exists in a submitted or approved state.

### Timesheet Modification

Employees can add timelogs to a draft timesheet manually. Employees can remove timelogs from a draft timesheet manually. These modifications can only be performed while the timesheet remains in draft status. Once a timesheet is submitted, no timelogs can be added or removed. The total hours are recalculated whenever timelogs are added or removed from a draft timesheet.

### Timesheet Submission

Employees can submit a draft timesheet for approval. A timesheet cannot be submitted if it contains no timelogs. A timesheet cannot be submitted if another timesheet for the same week (Monday to Sunday) already exists in a submitted or approved status. When a timesheet is submitted, the submitted at timestamp is recorded. The timesheet status changes from "draft" to "submitted" upon successful submission.

### Timesheet Status Lifecycle

A timesheet has four possible statuses: draft, submitted, approved, and rejected. A draft timesheet can be submitted for approval or modified by the employee. A submitted timesheet can be approved or rejected by users with the time:approve permission. An approved timesheet is locked and cannot be modified. A rejected timesheet returns to draft status and can be modified and resubmitted by the employee. Status transitions are recorded in the system for audit purposes.

### Timesheet Approval and Rejection

Users with the time:approve permission can view all submitted timesheets across the organization. Users with the time:approve permission can approve submitted timesheets. When a timesheet is approved, the reviewed at timestamp is recorded and the reviewed by user is identified. All timelogs included in an approved timesheet become locked and cannot be edited or deleted. Users with the time:approve permission can reject submitted timesheets. When rejecting a timesheet, a rejection reason must be provided as text. Rejected timesheets return to draft status, allowing the employee to modify and resubmit them.

### Timesheet Viewing and Browsing

Employees can view their own timesheets. Employees can view the status, total hours, and included timelogs for each of their timesheets. Timesheets are displayed in a paginated list to handle large volumes of historical data. The timesheet list can be filtered by status (draft, submitted, approved, rejected) and by date range. The date range filter allows employees to view timesheets within a specific period.

## Timer Operations

Employees can start a timer to track time in real-time. Each employee can have at most one active timer at a time. Starting a timer requires selecting a project with task being optional. The timer records start timestamp, project, task, and description. Employees can stop their timer. Stopping the timer creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard their timer without creating a timelog. Employees can view their currently running timer. If an employee forgets to stop their timer, it continues running indefinitely with no automatic stop. Employees can edit the description and project or task of a running timer. Timer functionality enables real-time time tracking separate from manual timelog entry.

### Timer Start and Real-Time Tracking

Employees can start a timer to track time in real-time for their work activities.

When an employee starts a timer, the system records the start timestamp, the selected project, and an optional task within that project. The employee may also provide a description of the work being performed.

Each employee can have at most one active timer at any given time. If an employee attempts to start a new timer while one is already running, the system prevents the new timer from starting.

Starting a timer requires the employee to select a project from their assigned projects. The task selection is optional and may be left unspecified.

The timer records the start timestamp at the moment the employee initiates tracking.

### Timer Stop and Timelog Creation

Employees can stop their running timer to finalize the time entry.

When an employee stops their timer, the system automatically creates a timelog entry with the calculated duration between the start timestamp and the stop time. The duration is rounded to the nearest minute.

The created timelog includes the project and task that were associated with the timer, along with the description provided during timer operation.

Employees can only stop their own running timer. The system does not allow employees to stop timers belonging to other employees.

### Timer Discard and Viewing

Employees can discard their running timer without creating a timelog entry.

When an employee discards their timer, no timelog is created and the timer session is terminated without recording any time.

Employees can view their currently running timer at any time, including the start timestamp, associated project, task, and description.

If an employee forgets to stop their timer, it continues running indefinitely without any automatic stop mechanism. The system does not impose a maximum duration limit on active timers.

Employees can view the pending timesheet status for the current week on their dashboard, which includes information about whether a timesheet needs to be submitted for the timer entries.

### Running Timer Editing

Employees can edit the description of their running timer at any time while the timer is active.

Employees can edit the project associated with their running timer. When the project is changed, the employee must select from their assigned projects.

Employees can edit the task associated with their running timer. When the task is changed, the employee must select a task that belongs to the currently selected project. The task may also be removed, leaving the timer without an associated task.

All timer edits occur in real-time and are reflected immediately in the running timer display. The start timestamp remains unchanged when the timer is edited.

## ActivityLog Operations

The system records significant actions as activity log entries. Each activity log entry includes timestamp, user who performed the action, action type, target entity, and details. Logged actions include employee invited, deactivated, and reactivated. Contract created or edited actions are logged. Project created, archived, completed, and deleted actions are logged. Task status changed actions are logged. Timesheet submitted, approved, and rejected actions are logged. Role assigned or changed actions are logged. Users with org:manage permission can view the full activity log. The activity log is paginated. The activity log can be filtered by action type, user, and date range. Activity logs provide audit trail for organizational changes.

### Activity Log Entry Structure

The system records activity log entries for significant organizational actions. Each activity log entry includes a timestamp, the user who performed the action, the action type, the target entity, and details about the action.

The timestamp records when the action occurred.

The system attributes each action to the user who performed it.

Action types are categorized by the type of operation performed.

The target entity identifies which business object was affected by the action.

Action details capture additional context about what changed or what occurred.

Activity log entries are created automatically when actions are performed.

Users with the org:manage permission can view the full activity log.

The activity log is paginated for browsing.

### Action Type Logging

The system logs employee lifecycle actions including employee invitation, employee deactivation, and employee reactivation.

The system logs contract actions including contract creation and contract editing.

The system logs project lifecycle actions including project creation, project archiving, project completion, and project deletion.

The system logs task status change actions when a task status is modified.

The system logs timesheet workflow actions including timesheet submission, timesheet approval, and timesheet rejection.

The system logs role assignment actions when an employee is assigned a role or when a role assignment is changed.

Each logged action is recorded at the time it occurs.

The logged actions provide an audit trail for organizational changes.

Historical activity log entries are preserved for review.

### Activity Log Viewing and Filtering

Users with the org:manage permission can view all activity log entries for the organization.

The activity log list is paginated to support browsing large numbers of entries.

The activity log can be filtered by action type to show only specific types of actions.

The activity log can be filtered by user to show only actions performed by a specific user.

The activity log can be filtered by date range to show actions within a specific time period.

Multiple filters can be combined to narrow the activity log results.

Filtered results are also paginated.

Users without the org:manage permission cannot view the activity log.

## Role Operations

Each organization has its own set of roles for access control. Three built-in roles exist and cannot be deleted: Owner with full access to all features including role and member management, Manager who can manage employees, projects, approve timesheets, and view reports, and Employee who can track time, submit timesheets, and view own data. Organization owners can create custom roles. Each custom role has a name and a set of permissions. Available permissions include org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. Organization owners can edit custom roles including their permission sets. Organization owners can delete custom roles only if no employees are assigned to them. Each employee in an organization is assigned exactly one role. Role assignment can be changed by users with employee:manage permission. Users can view the list of roles in their organization.

### Built-in Roles

THE system SHALL provide three built-in roles for every organization: Owner, Manager, and Employee.

THE Owner role SHALL have full access to all features within the organization, including the ability to manage roles and members.

THE Manager role SHALL be able to manage employees, manage projects, approve timesheets, and view organization reports.

THE Employee role SHALL be able to track time, submit timesheets, and view their own data.

THE built-in roles SHALL NOT be deletable by any user, including organization owners.

THE built-in roles SHALL NOT be editable to prevent modification of their core permission sets.

### Custom Role Creation

Organization owners SHALL create custom roles within their organization.

Each custom role SHALL have a unique name within the organization.

Each custom role SHALL have a set of permissions selected from the available permission types.

Custom roles SHALL be specific to the organization in which they are created.

Organization owners SHALL view the list of available permissions when creating a custom role.

THE system SHALL validate that custom role names are unique within the organization.

### Permission Definitions

THE org:manage permission SHALL allow a user to edit organization settings.

THE employee:manage permission SHALL allow a user to add, edit, and deactivate employees.

THE employee:view permission SHALL allow a user to view the employee list and employee details.

THE project:manage permission SHALL allow a user to create, edit, and delete projects and tasks.

THE project:view permission SHALL allow a user to view projects and tasks.

THE time:manage permission SHALL allow a user to edit or delete any employee's timelogs.

THE time:approve permission SHALL allow a user to approve or reject timesheets.

THE time:view_all permission SHALL allow a user to view all employees' timelogs and timesheets.

THE report:view permission SHALL allow a user to view organization reports.

### Custom Role Management

Organization owners SHALL edit custom roles including their names and permission sets.

Organization owners SHALL delete custom roles from their organization.

THE system SHALL prevent deletion of a custom role if any employees are assigned to it.

THE system SHALL notify the user when role deletion is blocked due to employee assignments.

Users without organization owner status SHALL NOT edit or delete custom roles.

THE system SHALL validate permission selections when editing a custom role.

### Employee Role Assignment

Each employee in an organization SHALL be assigned exactly one role.

Users with employee:manage permission SHALL assign roles to employees.

Users with employee:manage permission SHALL change the role assignment of an existing employee.

THE system SHALL enforce single role assignment per employee per organization.

Role assignment changes SHALL be recorded in the activity log.

THE system SHALL validate that the target role exists in the organization before assignment.

### Role List Viewing

Users SHALL view the list of roles in their currently selected organization.

THE role list SHALL display role names and their associated permissions.

THE role list SHALL indicate which roles are built-in roles.

THE role list SHALL be paginated for organizations with many roles.

THE role list SHALL be accessible to all authenticated users within the organization.

THE role list SHALL reflect the current state of roles including recent changes.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Organization deletion is blocked when pending timesheets exist that have not been approved or rejected. The system prevents deletion if any employee contracts remain active within the organization. When an organization owner deletes their organization, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's user account persists but loses all organizational associations. Users cannot delete their own account if they are the sole owner of an organization without first transferring ownership or deleting the organization. Organization settings edits require the owner role or appropriate permissions. Currency and timezone changes may affect historical data calculations and should be handled carefully.

### Organization Deletion Blocked by Pending Timesheets

An organization cannot be deleted while pending timesheets exist that have not been approved or rejected. The system must verify all timesheets are in a final state (approved or rejected) before allowing deletion. If any timesheet remains in draft or submitted status, the deletion request is rejected. The system must check all employee timesheets across the organization before confirming deletion eligibility.

### Organization Deletion Blocked by Active Contracts

An organization cannot be deleted while any employee contracts remain active within the organization. An active contract is one where the end date is null or in the future. The system must verify all contracts have been terminated before allowing deletion. If any contract is currently active, the deletion request is rejected. Organization owners must end all active contracts before proceeding with organization deletion.

### Owner Account Persists After Organization Deletion

When an organization is deleted, the owner's user account persists but loses all organizational associations. The account remains accessible for login but is no longer associated with any organization. The user must create a new organization or join an existing one to regain access to organizational features. Historical data from the deleted organization is permanently removed and cannot be recovered through the user account.

### User Account Deletion Blocked for Sole Owners

A user cannot delete their own account if they are the sole owner of an organization without first transferring ownership or deleting the organization. The system must check if the user is the only owner before allowing account deletion. If the user is a sole owner, they must either transfer ownership to another employee or delete the organization before proceeding with account deletion. Account deletion is rejected if these conditions are not met.

### Organization Settings Edit Permissions

Organization settings can only be edited by users with the owner role or those granted the org:manage permission. The owner role has implicit org:manage permission and cannot be modified. Custom roles must explicitly include the org:manage permission to allow settings editing. Users without this permission cannot access or modify organization settings including name, description, logo, currency, timezone, and fiscal start month.

### Currency and Timezone Change Impact

Changing currency or timezone settings may affect historical data calculations and should be handled carefully. The system must preserve historical timelogs and timesheets with their original values. Currency conversions for historical pay rates are not automatically recalculated. Timezone changes affect the display of time records but do not alter the underlying recorded times. Users should be warned about the impact of these changes before confirming.

### Multi-Tenancy Data Isolation

All data is strictly isolated per organization to ensure multi-tenancy security. Employees in one organization cannot see data from another organization under any circumstances. Users who belong to multiple organizations only see data for their currently selected organization. Organization context is enforced on every request and cannot be bypassed. Data from one organization cannot be exported to or imported from another organization.

## User Error Scenarios

Users cannot delete their account while serving as the sole owner of any organization. Before account deletion, sole owners must transfer ownership to another employee or delete the organization entirely. When a user deletes their account, their employee records in all other organizations are marked as deactivated rather than removed. Users switching between organizations maintain their session without requiring re-authentication. Pending invitations are automatically resolved when the invited user creates an account with the matching email address. Email and password authentication requires valid credentials for login. Users can change their password but must provide the current password for verification.

### User Account Deletion

Users cannot delete their account while they are the sole owner of any organization. Before account deletion, a sole owner must transfer ownership to another employee in that organization or delete the organization entirely. If a user is not the sole owner of any organization, they may proceed with account deletion. When a user deletes their account, their employee records in all other organizations they belong to are marked as deactivated rather than removed. Deactivated employee records preserve all historical data including timelogs, timesheets, and contracts. The user's global profile data is removed upon account deletion. After account deletion, the user must create a new account to rejoin any organization.

### Organization Context and Multi-Organization Membership

Users can belong to multiple organizations simultaneously. When logging in, users must select which organization to work in, establishing the organization context for their session. All subsequent actions within the session are scoped to the selected organization. Users can switch between organizations without logging out or re-authenticating. When switching organizations, the system updates the organization context to the newly selected organization. Data from one organization is strictly isolated and cannot be accessed when viewing another organization. Users who belong to only one organization still go through the organization selection process at login.

### User Authentication and Password Management

Users sign up using an email address and password. Users log in using their registered email address and password. Invalid email or password combinations result in login rejection. The system does not reveal whether an email is registered or if the password is incorrect, to prevent enumeration attacks. Users can change their password at any time. Password change requires providing the current password for verification. The new password must meet the system's password requirements. After successful password change, all existing sessions remain active but the new password applies to future logins.

### Employee Invitation and Pending Invitation Resolution

Organization owners or users with employee management permission can invite new employees by email address. If the invited email already has a registered user account, that user is immediately added to the organization with the specified role. If the invited email has no registered account, a pending invitation is created and stored. The invited user receives notification of the pending invitation. When a user signs up with an email address that matches a pending invitation, the user is automatically added to all organizations that sent pending invitations to that email. The pending invitations are resolved and removed after automatic organization join. Users can only accept invitations sent to their registered email address.

## Employee Error Scenarios

Deactivated employees cannot log time entries or submit timesheets for approval. Their historical timelogs and timesheets remain preserved and visible to authorized users. Reactivating a deactivated employee restores their ability to track time and submit timesheets immediately. Employee invitations to organizations fail if the email address is invalid or already associated with an active employee record. Employee record edits require the employee:manage permission. Department and position fields are optional and can be left empty. Employment type must be one of the four allowed values: full-time, part-time, contractor, or intern. Employee list pagination handles edge cases where filter results return zero employees.

### Deactivated Employee Time Tracking Restrictions

When an employee's status is deactivated, the employee shall NOT be able to create new timelogs.

When an employee's status is deactivated, the employee shall NOT be able to submit timesheets for approval.

When an employee's status is deactivated, the employee shall NOT be able to edit existing timelogs.

When an employee's status is deactivated, the employee shall NOT be able to delete existing timelogs.

When an employee's status is deactivated, the employee shall NOT be able to start or stop a timer.

When an employee attempts to log time while deactivated, the system shall reject the request and indicate that the employee account is deactivated.

When an employee attempts to submit a timesheet while deactivated, the system shall reject the request and indicate that the employee account is deactivated.

### Historical Data Preservation for Deactivated Employees

When an employee's status is deactivated, all historical timelogs shall remain preserved and visible to authorized users.

When an employee's status is deactivated, all historical timesheets shall remain preserved and visible to authorized users.

When an employee's status is deactivated, all historical contract records shall remain preserved and visible to authorized users.

When an employee's status is deactivated, all historical project memberships shall remain preserved and visible to authorized users.

When an employee's status is deactivated, all historical task assignments shall remain preserved and visible to authorized users.

The preservation of historical data shall NOT require additional action from users with employee:view permission.

### Employee Reactivation Restores Time Tracking

When an employee's status is changed from deactivated to active, the employee shall immediately regain the ability to create timelogs.

When an employee's status is changed from deactivated to active, the employee shall immediately regain the ability to submit timesheets for approval.

When an employee's status is changed from deactivated to active, the employee shall immediately regain the ability to start and stop timers.

When an employee is reactivated, all previously preserved historical data shall remain accessible.

When an employee is reactivated, the employee shall be able to view their own historical timelogs and timesheets.

### Invalid Email Invitation Rejection

When an employee invitation is sent with an invalid email address format, the system shall reject the invitation and indicate the email format is invalid.

When an employee invitation is sent with an email address already associated with an active employee record in the organization, the system shall reject the invitation and indicate the employee already exists.

When an employee invitation is sent with an email address that has a pending invitation in the organization, the system shall not create a duplicate invitation.

When an employee invitation is rejected due to invalid email, the inviting user shall receive a clear error message explaining the rejection reason.

### Employee Record Editing Permissions

When a user attempts to edit an employee record without the employee:manage permission, the system shall reject the request and indicate insufficient permissions.

When a user with employee:manage permission attempts to edit an employee record, the system shall allow editing of department, position, and employment type fields.

When a user with employee:manage permission attempts to deactivate an employee, the system shall allow the deactivation.

When a user with employee:manage permission attempts to reactivate a deactivated employee, the system shall allow the reactivation.

When a user with only employee:view permission attempts to edit an employee record, the system shall reject the request and indicate insufficient permissions.

### Employment Type Validation

When a user attempts to set an employee's employment type to a value other than full-time, part-time, contractor, or intern, the system shall reject the request and indicate the employment type must be one of the four allowed values.

When creating a new employee record, the employment type field shall be required and must be one of: full-time, part-time, contractor, or intern.

When editing an existing employee record, the employment type field shall accept only the values: full-time, part-time, contractor, or intern.

When an invalid employment type value is submitted, the system shall return an error message listing the four valid employment type options.

### Empty Filter Results Pagination

When filtering the employee list returns zero matching employees, the system shall return an empty list with pagination metadata indicating zero total results.

When filtering the employee list by department returns no results for a non-existent department, the system shall return an empty list without error.

When filtering the employee list by employment type returns no results for a selected type, the system shall return an empty list without error.

When filtering the employee list by status returns no results for a selected status, the system shall return an empty list without error.

When searching the employee list by name returns no matching employees, the system shall return an empty list without error.

When pagination is applied to empty filter results, the system shall return the current page number with zero items and indicate there are no total pages.

## Contract Error Scenarios

Only one contract can be active for an employee at any given time. Creating a new contract automatically sets the end date of the previous active contract to the day before the new contract start date. Past contracts become immutable historical records and cannot be edited after a new contract begins. Contract start dates must be provided and cannot be empty. Pay rate values must be numeric and greater than zero. Working hours per week must be specified and cannot be zero or negative. Contract end dates are optional and null indicates an ongoing contract. Users with employee:manage permission can create and edit contracts but cannot modify historical contracts.

### Single Active Contract Per Employee

THE system shall enforce that each employee has at most one active contract at any given time.

WHEN an employee is assigned a new contract with a start date, THE system shall ensure no other contract for that employee remains active on the same or overlapping dates.

IF an employee already has an active contract, THE system shall prevent creation of another active contract without first terminating the existing one.

THE system shall consider a contract active when its start date is on or before the current date and its end date is null or in the future.

THE system shall consider a contract inactive when its end date is on or before the current date or when it has been explicitly terminated.

### New Contract Auto-Terminates Previous Contract

WHEN a user with employee:manage permission creates a new contract for an employee, THE system shall automatically set the end date of the previously active contract to one day before the new contract start date.

THE system shall perform the auto-termination of the previous contract before saving the new contract to maintain data consistency.

WHEN a new contract is created, THE system shall record the termination of the previous contract as part of the same transaction.

IF no active contract exists for the employee, THE system shall create the new contract without modifying any existing records.

THE system shall preserve all historical contracts as immutable records after they are terminated by a new contract creation.

### Past Contracts as Immutable Historical Records

WHEN a contract is terminated by a new contract or by setting an end date, THE system shall mark it as a historical record that cannot be edited.

IF a user attempts to edit a contract whose end date is set (terminated contract), THE system shall reject the edit request.

THE system shall allow viewing of all historical contracts for an employee by users with employee:view permission.

THE system shall preserve all data from terminated contracts including start date, end date, pay rate, pay period, working hours, and notes.

WHEN an employee has multiple contracts, THE system shall display them in chronological order by start date with the active contract clearly identified.

### Contract Field Validation Requirements

WHEN a user attempts to create a contract, THE system shall validate that the start date is provided and not empty.

IF the contract start date is missing or null, THE system shall reject the contract creation request.

WHEN a user enters a pay rate value, THE system shall validate that it is a numeric value greater than zero.

IF the pay rate is non-numeric, zero, or negative, THE system shall reject the contract creation or edit request.

WHEN a user enters working hours per week, THE system shall validate that it is a specified numeric value greater than zero.

IF the working hours per week is missing, zero, or negative, THE system shall reject the contract creation or edit request.

WHEN a user provides an end date for a contract, THE system shall validate that it is on or after the start date if provided.

IF the end date precedes the start date, THE system shall reject the contract creation or edit request.

### Contract Edit Permission Restrictions

WHEN a user with employee:manage permission attempts to create a contract for an employee, THE system shall allow the operation.

WHEN a user with employee:manage permission attempts to edit the currently active contract for an employee, THE system shall allow the operation.

IF a user without employee:manage permission attempts to create a contract, THE system shall reject the request.

IF a user without employee:manage permission attempts to edit any contract, THE system shall reject the request.

WHEN an employee attempts to view their own contracts, THE system shall allow the operation.

WHEN a user with employee:view permission attempts to view any employee's contracts, THE system shall allow the operation.

IF a user attempts to edit a contract that is not currently active (has an end date set), THE system shall reject the edit request regardless of permission level.

## Department Error Scenarios

Deleting a department does not delete employees but sets their department field to null. Departments support one level of nesting with optional parent department assignment. Circular parent-child relationships are prevented. Department names must be unique within an organization. Users with org:manage permission can create, edit, and delete departments. Empty department descriptions are allowed. Department filtering in employee lists returns all employees when no department filter is applied. Deleting a department with many employees requires confirmation to prevent accidental data loss.

### Department Deletion Employee Impact

When a department is deleted, all employees assigned to that department have their department field set to null. The employees themselves are not deleted and remain active in the organization. This ensures that employee records are preserved even when organizational structure changes. Historical timelogs and timesheets associated with these employees remain intact and continue to reference the deleted department for reporting purposes. The system does not cascade delete employees when a department is removed.

### Department Hierarchy Nesting Limit

Departments support only one level of nesting, meaning a department can have at most one parent department. Sub-departments cannot have their own child departments. When creating or editing a department, the system validates that the selected parent department does not already have a parent, preventing multi-level hierarchies beyond the allowed single nesting level. Attempting to assign a parent department that already has a parent results in a validation error. This constraint ensures organizational structure remains simple and manageable.

### Circular Department Relationship Prevention

The system prevents circular parent-child relationships between departments. When assigning a parent department, the system validates that the selected department is not already a descendant of the department being edited. This prevents scenarios where a department would become its own ancestor through the parent chain. For example, if Department A is the parent of Department B, Department B cannot be assigned as the parent of Department A. Any attempt to create such a circular reference is rejected with a validation error.

### Department Name Uniqueness

Department names must be unique within an organization. Two departments cannot share the same name in the same organization, though the same department name may exist in different organizations. When creating a new department or renaming an existing one, the system validates that no other department in the organization already has that name. If a duplicate name is detected, the operation is rejected and the user must choose a different name. This ensures clear identification and prevents confusion when selecting departments for employee assignment or filtering.

### Department Management Permission Requirement

Only users with the org:manage permission can create, edit, or delete departments within an organization. Users without this permission cannot perform any department management operations, even if they have other elevated permissions like employee:manage or project:manage. When a user attempts to access department management features without the required permission, the system denies the request. This permission requirement ensures that organizational structure changes are controlled by users with appropriate authority.

### Department Description Optionality

Department descriptions are optional and may be left empty. The system does not require a description when creating or editing a department. An empty description is treated as a valid value and does not trigger any validation errors. Users may choose to provide a description to clarify the department's purpose or scope, but this information is not mandatory for department creation or operation. Empty descriptions are displayed as blank in department listings and employee views.

### Department Filter Empty Value Behavior

When filtering the employee list by department without specifying a department value, the system returns all employees regardless of their department assignment. An empty department filter is interpreted as "no filter applied" rather than "filter for employees with no department." This behavior ensures that users viewing the full employee list are not unexpectedly restricted to only unassigned employees. To specifically view employees without a department, users must explicitly select the "no department" or null option if available in the filter interface.

### Department Deletion Confirmation Requirement

Deleting a department requires explicit user confirmation to prevent accidental data loss. When a user initiates department deletion, the system displays a confirmation dialog that explains the impact: all employees assigned to the department will have their department field set to null. The user must explicitly confirm this action before the deletion proceeds. This confirmation step is mandatory and cannot be bypassed, even for users with org:manage permission. The confirmation message clearly states that employee records will be preserved but their department assignment will be removed.

## Project Error Scenarios

Projects cannot be deleted if any timelogs are associated with them. Archived and completed projects cannot receive new timelogs but preserve existing timelogs. Project status transitions from active to archived or completed are irreversible without recreating the project. Project names must be unique within an organization. Color codes must be valid hex values for UI display. Budget hours are optional and projects without budget hours are excluded from budget utilization reports. Project filtering by status handles cases where no projects match the selected status. Project creation requires the project:manage permission.

### Project Deletion Restrictions

Projects can only be deleted if they have no timelogs associated with them. If timelogs exist on a project, the deletion request is rejected. Users must archive or complete projects before deletion if timelogs are present. The system prevents deletion of projects with any time tracking history. Project deletion is permanently blocked until all timelogs are removed or the project is restructured.

### Archived and Completed Project Timelog Restrictions

Archived projects cannot receive new timelogs. Completed projects cannot receive new timelogs. Existing timelogs on archived projects are preserved and remain viewable. Existing timelogs on completed projects are preserved and remain viewable. Timelogs created before archiving or completion remain accessible for reporting purposes. The system enforces read-only status for timelogs on non-active projects. Users with time:manage permission cannot create new timelogs on archived or completed projects.

### Project Naming and Color Validation

Project names must be unique within an organization. Duplicate project names within the same organization are rejected during creation or editing. Color codes must be valid hex values for UI display. Invalid color code formats are rejected during project creation or editing. The system validates color codes before accepting project changes. Project name uniqueness is enforced at the organization level only.

### Budget Hours and Reporting

Budget hours are optional for projects. Projects without budget hours are excluded from budget utilization reports. Budget utilization reports only include projects with defined budget hours. The system calculates budget percentage for projects with budget hours defined. Projects without budget hours appear in other reports but not in budget-specific reports.

### Project Creation Permissions

Project creation requires the project:manage permission. Users without project:manage permission cannot create projects. The system validates user permissions before allowing project creation. Permission checks occur at the time of project creation request. Users with only project:view permission can view projects but cannot create new ones.

## ProjectMember Error Scenarios

Employees must be assigned to a project before they can be added as project members. Project membership requires specifying either member or project-lead role. Project leads can manage tasks within their assigned project but cannot delete the project. Users with project:manage permission can remove employees from projects. Employees can be assigned to multiple projects simultaneously. Project lead role does not grant project deletion permissions. Removing the only project lead from a project requires assigning a new lead first. Project member removal does not delete historical timelogs associated with that employee on the project.

### Project Member Assignment Requirements

WHEN an employee is assigned to a project, THE system shall verify that the employee exists in the organization.

WHEN an employee is assigned to a project, THE system shall create a project membership record with the employee, project, and assigned role.

WHEN creating a project membership, THE system shall require the role to be either member or project-lead.

WHEN an employee is not yet a member of the organization, THE system shall reject the project assignment request.

An employee can be assigned to multiple projects simultaneously.

### Project Membership Role Assignment

WHEN a project membership is created, THE system shall require exactly one role to be specified: member or project-lead.

WHEN the role is set to project-lead, THE system shall grant the employee permission to manage tasks within that project.

WHEN the role is set to member, THE system shall grant the employee permission to log time on the project and view project tasks.

WHEN a project membership role is updated, THE system shall record the change in the employee's project membership record.

The role assignment can be changed by users with project:manage permission.

### Project Lead Permission Limitations

WHILE an employee has project-lead role on a project, THE system shall allow them to create, edit, and manage tasks within that project.

WHILE an employee has project-lead role on a project, THE system shall NOT allow them to delete the project.

WHILE an employee has project-lead role on a project, THE system shall NOT allow them to remove other project members without project:manage permission.

Project lead role does not grant organization-level permissions such as org:manage or employee:manage.

Project lead role does not grant permission to archive or complete the project.

### Project Member Removal Process

WHEN a user with project:manage permission requests to remove an employee from a project, THE system shall verify the user has project:manage permission.

WHEN an employee is removed from a project, THE system shall delete the project membership record.

WHEN an employee is removed from a project, THE system shall preserve all historical timelogs associated with that employee on the project.

WHEN an employee is removed from a project, THE system shall preserve all historical task assignments associated with that employee on the project.

WHEN an employee is removed from a project, THE system shall NOT delete any timelogs, tasks, or timesheets created by that employee.

### Multiple Project Membership Support

WHEN an employee is assigned to a project, THE system shall allow the employee to already be assigned to other projects.

WHEN viewing an employee's project assignments, THE system shall display all projects the employee is a member of.

WHEN logging time, THE system shall allow the employee to select any project they are assigned to.

WHEN viewing tasks, THE system shall allow the employee to view tasks from all projects they are assigned to.

An employee can have up to all projects in the organization as their project memberships.

### Project Lead Continuity Requirements

WHEN removing the only project lead from a project, THE system shall require assigning a new project lead first.

WHEN a project has no project lead assigned, THE system shall block the removal of any remaining project lead until a new lead is assigned.

WHEN a project lead is reassigned to a different role, THE system shall require another employee to be assigned project-lead role on the same project.

WHEN a project lead is removed from the organization, THE system shall require a new project lead to be assigned before the removal is complete.

A project must always have at least one project lead if tasks exist in the project.

### Historical Data Preservation on Member Removal

WHEN an employee is removed from a project, THE system shall preserve all timelogs created by that employee on the project.

WHEN an employee is removed from a project, THE system shall preserve all timesheets that include timelogs from that employee on the project.

WHEN an employee is removed from a project, THE system shall preserve all task assignments and task history associated with that employee.

WHEN viewing project reports after member removal, THE system shall include historical time data from removed employees.

WHEN viewing project budget utilization, THE system shall include hours logged by employees who are no longer project members.

## Task Error Scenarios

Tasks can only be assigned to employees who are members of the same project. Subtasks support only one level of nesting and cannot have their own subtasks. Task status changes are recorded in task history with timestamp, old status, new status, and the user who made the change. Task titles must be provided and cannot be empty. Priority values must be one of: low, medium, high, or urgent. Estimated hours are optional and can be zero or omitted. Due dates are optional and can be in the past. Task filtering handles edge cases where no tasks match the selected criteria.

### Task Assignment Validation

Tasks can only be assigned to employees who are members of the same project. When a task is created or edited with an assigned employee, the system verifies that the employee has an active project membership in that project.

If the assigned employee is not a project member, the task creation or update is rejected. The employee must first be added to the project before they can be assigned to tasks within that project.

When an employee is removed from a project, existing tasks assigned to that employee retain the assignment but the employee can no longer view or interact with those tasks. Task assignments to deactivated employees are preserved for historical accuracy but the employee cannot log time or submit timesheets for those tasks.

Project leads and users with project management permission can assign any project member to tasks. Employees without project management permission can only view task assignments, not modify them.

### Task Subtask Nesting Rules

Subtasks support only one level of nesting. A task can have at most one parent task, and a task can have multiple child subtasks, but those child subtasks cannot have their own subtasks.

When creating a subtask, the parent task is specified. The system prevents creating a subtask of a subtask. If a user attempts to set a parent task that already has a parent, the operation is rejected.

A task can have zero or one parent task. Tasks without a parent are top-level tasks. Tasks with a parent are subtasks and cannot themselves have subtasks.

When a parent task is deleted, all its subtasks are also deleted. When a parent task is archived or completed, its subtasks follow the same status change. Subtasks cannot exist independently of their parent task.

Task status changes on parent tasks do not automatically propagate to subtasks. Each task, including subtasks, maintains its own independent status.

### Task Status Change History Recording

Task status changes are recorded in task history with date and time, old status, new status, and the user who made the change. Every time a task status is modified, a history entry is created.

The history entry includes the exact date and time when the change occurred, the status value before the change, the status value after the change, and the identity of the user who performed the change.

Task history is immutable once created. History entries cannot be edited or deleted. The complete history of all status changes for a task is preserved for audit purposes.

Employees can view the status history of tasks they have access to. Project leads can view the full status history for all tasks in their project. Users with project management permission can view status history for all tasks in the organization.

Status changes include transitions between: open, in-progress, completed, and closed. Any transition between these states is recorded, including transitions back to previous states.

### Task Creation and Edit Validation

Task titles must be provided and cannot be empty. When creating or editing a task, the title field is required. If the title is missing or contains only whitespace, the operation is rejected.

Priority values must be one of: low, medium, high, or urgent. When setting task priority, only these four values are accepted. Any other value results in the operation being rejected.

Estimated hours are optional and can be zero or omitted. When creating or editing a task, the estimated hours field may be left blank. If provided, it must be a non-negative number. Zero estimated hours is valid and indicates no time estimate is required.

Due dates are optional and can be in the past. When setting a due date, the system does not validate that the date is in the future. Past due dates are accepted, allowing tasks to be created with overdue due dates for historical or catch-up scenarios.

Task descriptions are optional and can be empty. When creating or editing a task, the description field may be omitted or left blank without affecting task validity.

When editing a task, all validation rules apply to the updated values. Partial updates that omit fields preserve the existing values for those fields.

### Task Filtering and Search Results

Task filtering handles edge cases where no tasks match the selected criteria. When filtering tasks by status, priority, assigned employee, or any combination of filters, the system returns an empty result set if no tasks match.

Empty filter results are displayed without error. The user interface indicates that no tasks were found matching the current filter criteria. Users can modify their filters to find matching tasks.

When filtering by assigned employee, if the selected employee has no tasks in the current project, an empty result is returned. This applies to both active and inactive assignments.

When filtering by status, if no tasks exist with the selected status, an empty result is returned. This includes filtering for completed or closed tasks when none exist.

When filtering by priority, if no tasks exist with the selected priority level, an empty result is returned.

Task search handles empty search queries by returning all tasks or no results based on the default view configuration. Partial text matching is used for task title and description search.

Filter combinations are applied using AND logic. All specified filter criteria must be satisfied for a task to appear in results. If any filter excludes all tasks, the result set is empty.

## Timelog Error Scenarios

Timelogs require a project that the employee is assigned to. Timelogs can optionally reference a task that belongs to the selected project. Employees can only create timelogs for themselves, not for other employees. Timelog editing is blocked if the timelog is part of an approved timesheet. Timelog deletion is blocked if the timelog is part of any submitted or approved timesheet. Duration must be specified in minutes and cannot be zero or negative. Date field is required and cannot be empty. Billable flag defaults to true when not specified. Users with time:manage permission can edit or delete any employee's timelogs regardless of timesheet status.

### Project Assignment Validation

Every timelog must reference a project that the employee is assigned to. When creating a timelog, the system validates that the employee has an active project membership for the selected project. If the employee is not a member of the project, the timelog creation is rejected.

WHEN an employee creates a timelog, THE system shall validate that the employee is assigned to the selected project.

WHEN an employee creates a timelog for a project they are not assigned to, THE system shall reject the request.

WHEN a user with time:manage permission creates a timelog for another employee, THE system shall validate that the target employee is assigned to the selected project.

### Task-Project Relationship Validation

When a timelog references a task, that task must belong to the selected project. The system validates the task-project relationship before accepting the timelog.

WHEN a timelog includes a task reference, THE system shall validate that the task belongs to the selected project.

WHEN a timelog references a task that does not belong to the selected project, THE system shall reject the request.

WHEN a task is deleted from a project, existing timelogs referencing that task are preserved without validation errors.

### Employee Self-Tracking Restriction

Employees can only create timelogs for themselves. An employee cannot log time on behalf of another employee. Users with time:manage permission can create timelogs for any employee in the organization.

WHEN an employee creates a timelog, THE system shall associate it with the creating employee.

WHEN an employee attempts to create a timelog for another employee, THE system shall reject the request.

WHEN a user with time:manage permission creates a timelog for another employee, THE system shall accept the request and associate it with the target employee.

### Approved Timesheet Edit Lock

Timelogs that are part of an approved timesheet cannot be edited. Once a timesheet containing a timelog is approved, all timelogs within that timesheet become read-only.

WHEN a timelog is included in an approved timesheet, THE system shall prevent any edits to that timelog.

WHEN an employee attempts to edit a timelog in an approved timesheet, THE system shall reject the request.

WHEN a user with time:manage permission attempts to edit a timelog in an approved timesheet, THE system shall reject the request.

WHEN a timesheet is rejected, the timelogs within it become editable again.

### Submitted Timesheet Delete Lock

Timelogs that are part of any submitted or approved timesheet cannot be deleted. A timelog in a draft timesheet can be deleted, but once the timesheet is submitted, the timelog is locked from deletion.

WHEN a timelog is included in a submitted or approved timesheet, THE system shall prevent deletion of that timelog.

WHEN an employee attempts to delete a timelog in a submitted timesheet, THE system shall reject the request.

WHEN an employee attempts to delete a timelog in an approved timesheet, THE system shall reject the request.

WHEN a user with time:manage permission attempts to delete a timelog in a submitted or approved timesheet, THE system shall reject the request.

WHEN a timesheet is rejected, the timelogs within it become deletable again.

### Duration and Date Validation

The duration field is required for every timelog and must be specified in minutes. The duration cannot be zero or negative. The date field is also required and cannot be empty.

WHEN an employee creates a timelog without a duration value, THE system shall reject the request.

WHEN an employee creates a timelog with a duration of zero minutes, THE system shall reject the request.

WHEN an employee creates a timelog with a negative duration, THE system shall reject the request.

WHEN an employee creates a timelog without a date, THE system shall reject the request.

WHEN an employee creates a timelog with an empty date, THE system shall reject the request.

### Billable Flag Default Behavior

The billable flag defaults to true when not explicitly specified during timelog creation. This default applies to all employees regardless of their role.

WHEN an employee creates a timelog without specifying the billable flag, THE system shall set the billable flag to true.

WHEN a user with time:manage permission creates a timelog for another employee without specifying the billable flag, THE system shall set the billable flag to true.

### Time Management Permission Override

Users with time:manage permission can edit or delete any employee's timelogs regardless of timesheet status. This permission overrides the standard restrictions on timelog editing and deletion.

WHEN a user with time:manage permission edits a timelog in an approved timesheet, THE system shall accept the request.

WHEN a user with time:manage permission deletes a timelog in a submitted timesheet, THE system shall accept the request.

WHEN a user without time:manage permission attempts to edit or delete timelogs outside their own, THE system shall reject the request.

WHEN a user with time:manage permission edits a timelog, THE system shall record the action in the activity log.

## Timesheet Error Scenarios

Timesheets cannot be submitted if they contain no timelogs. A timesheet cannot be submitted if another timesheet for the same week already exists in submitted or approved status. Timesheet week boundaries are Monday to Sunday. Approved timesheets lock all included timelogs preventing any edits or deletions. Rejected timesheets return to draft status allowing the employee to modify and resubmit. Rejection reasons are required when rejecting a timesheet. Submitted timesheets cannot be edited by the employee until rejected. Total hours are calculated automatically from included timelogs. Employees can add or remove timelogs from draft timesheets but not from submitted timesheets.

### Timesheet Submission Validation

When an employee submits a timesheet for approval, the system shall validate that the timesheet contains at least one timelog. If the timesheet has no timelogs, the system shall reject the submission and notify the employee.

When an employee submits a timesheet for a specific week, the system shall validate that no other timesheet for the same employee exists for that week in submitted or approved status. If a duplicate timesheet is detected, the system shall reject the submission and notify the employee.

The system shall enforce Monday to Sunday week boundaries for all timesheets. The week start date shall always be a Monday and the week end date shall always be the following Sunday. Employees cannot create timesheets with arbitrary date ranges.

### Timesheet Approval and Locking

When a timesheet is approved by a user with time:approve permission, the system shall lock all timelogs included in that timesheet. Locked timelogs cannot be edited or deleted by any user, including the employee who created them.

When rejecting a submitted timesheet, the system shall require the reviewer to provide a rejection reason. The rejection reason shall be stored with the timesheet and visible to the employee. The system shall not allow timesheet rejection without a rejection reason.

### Timesheet Rejection and Resubmission

When a timesheet is rejected, the system shall return the timesheet to draft status. The employee shall be able to modify the rejected timesheet by adding or removing timelogs, updating the description, or making other necessary changes.

When a timesheet is in submitted status, the system shall block any edits by the employee. The employee cannot add, remove, or modify timelogs in a submitted timesheet until it is rejected and returned to draft status. Only users with time:manage permission can modify timelogs in a submitted timesheet.

### Timesheet Draft Management

The system shall calculate the total hours for a timesheet automatically based on the duration of all included timelogs. The total hours shall be updated whenever timelogs are added or removed from the timesheet. Employees cannot manually set or override the total hours value.

When a timesheet is in draft status, the system shall allow employees to add timelogs to the timesheet. The system shall also allow employees to remove timelogs from the timesheet. When a timesheet is submitted, the system shall block employees from adding or removing timelogs until the timesheet is rejected and returned to draft status.

## Timer Error Scenarios

Each employee can have at most one active timer at any given time. Starting a timer requires selecting a project but task selection is optional. Stopping the timer creates a timelog with duration rounded to the nearest minute. Discarding the timer does not create any timelog entry. Running timers continue indefinitely if the employee forgets to stop them. Employees can edit the description and project or task of a running timer. Timer duration calculation handles edge cases where the timer runs across midnight. Timer start timestamp is recorded for audit purposes. If an employee starts a timer while one is already running, the existing timer must be stopped or discarded first.

### Timer Active State Management

Each employee can have at most one active timer at any given time. If an employee attempts to start a timer while one is already running, the request is rejected. The employee must stop or discard the existing timer before starting a new one.

Running timers continue indefinitely if the employee forgets to stop them. There is no automatic timer stop mechanism. The system does not impose any time limits on how long a timer can run.

The timer start date and time is recorded for audit purposes and is used to calculate the duration when the timer is stopped.

### Timer Project Selection and Editing

Starting a timer requires selecting a project. The project selection is mandatory and cannot be omitted. Task selection is optional when starting a timer.

While a timer is running, employees can edit the timer description. Employees can also change the project or task associated with a running timer. These edits are applied immediately and the timer continues running with the updated values.

The employee can view their currently running timer and all its associated details including the start time, project, task, and description.

### Timer Stop and Discard Behavior

When an employee stops their timer, the system creates a timelog entry with the calculated duration. The duration is calculated from the timer start timestamp to the stop timestamp and is rounded to the nearest minute.

When an employee discards their timer, no timelog entry is created. The timer is simply terminated without recording any time entry.

Timer duration calculation properly handles edge cases where the timer runs across midnight. The duration is calculated based on the actual elapsed time regardless of date boundaries.

## ActivityLog Error Scenarios

Activity log entries are created for all significant actions including employee invitations, contract changes, project lifecycle events, task status changes, and timesheet workflow events. Activity log filtering by action type handles cases where no actions match the selected type. Activity log pagination returns empty results when filters exclude all entries. Activity log date range filtering respects timezone boundaries. Users with org:manage permission can view the full activity log. Activity log entries include timestamp, user, action type, target entity, and details. Activity log cannot be modified or deleted once created.

### Activity Log Entry Creation and Structure

The system shall record activity log entries for all significant actions performed within the organization. The following actions are logged:

- Employee invited, deactivated, and reactivated
- Contract created and edited
- Project created, archived, completed, and deleted
- Task status changed
- Timesheet submitted, approved, and rejected
- Role assigned or changed

Each activity log entry shall include:

- Date and time when the action occurred
- The user who performed the action
- The action type categorizing the event
- The target entity that was affected
- Details providing context about the action

Activity log entries are created automatically when these actions occur. Users cannot manually create or suppress activity log entries.

### Activity Log Access and Permissions

Users with the org:manage permission SHALL have access to view the full activity log for their organization. Users without the org:manage permission SHALL NOT be able to view the activity log.

When a user with org:manage permission requests to view the activity log, THE system SHALL return all activity log entries for the organization filtered by the requested criteria.

When a user without org:manage permission attempts to access the activity log, THE system SHALL deny the request.

### Activity Log Filtering and Pagination

Users with org:manage permission SHALL be able to filter the activity log by action type. When no actions match the selected action type, THE system SHALL return empty results.

Users with org:manage permission SHALL be able to filter the activity log by the user who performed the action. When no actions were performed by the selected user, THE system SHALL return empty results.

Users with org:manage permission SHALL be able to filter the activity log by date range. When no actions fall within the selected date range, THE system SHALL return empty results.

The activity log list SHALL support pagination. When all filtered results are exhausted, THE system SHALL return empty results for subsequent pages.

Multiple filters SHALL be combinable. When the combination of filters excludes all entries, THE system SHALL return empty results.

### Activity Log Immutability

Activity log entries SHALL be immutable once created. The system SHALL NOT allow modification of any activity log entry after it has been recorded.

The system SHALL NOT allow deletion of any activity log entry. Activity log entries SHALL be permanently retained as an audit trail.

When a user attempts to modify an activity log entry, THE system SHALL reject the request.

When a user attempts to delete an activity log entry, THE system SHALL reject the request.

### Activity Log Timezone Handling

Activity log date range filtering SHALL respect timezone boundaries of the organization. When filtering by date range, THE system SHALL interpret dates according to the organization's configured timezone.

When a user selects a date range for filtering, THE system SHALL include all activity log entries where the timestamp falls within the specified range in the organization's timezone.

Activity log timestamps SHALL be stored in a consistent format and converted to the organization's timezone when displayed or filtered.

## Role Error Scenarios

Built-in roles Owner, Manager, and Employee cannot be deleted under any circumstances. Custom roles can only be deleted if no employees are assigned to them. Custom role names must be unique within an organization. Permission assignments must be from the predefined list of available permissions. Role assignment changes require the employee:manage permission. Changing an employee's role does not affect their historical timelogs or timesheets. Custom role creation requires a name and at least one permission. Permission values are validated against the allowed set before assignment. Deleting a custom role with assigned employees requires reassigning those employees first.

### Built-in Role Deletion Protection

Built-in roles (Owner, Manager, and Employee) are protected from deletion under all circumstances. Users with organization management permissions cannot delete any of the three built-in roles. The system prevents deletion attempts on built-in roles and returns an error indicating the role is protected. Built-in roles can be viewed by all employees but cannot be modified or deleted. Only custom roles created by organization owners can be deleted, subject to assignment restrictions.

### Custom Role Deletion with Employee Assignments

Custom roles can only be deleted if no employees are currently assigned to them. Users attempting to delete a custom role with assigned employees receive an error indicating the role cannot be deleted. Before deleting a custom role, all employees assigned to that role must be reassigned to a different role. Users with employee management permissions can view which employees are assigned to a role before attempting deletion. The system validates employee assignments before allowing role deletion. Once all employees are reassigned, the custom role can be deleted.

### Custom Role Name Uniqueness

Custom role names must be unique within each organization. Users attempting to create or rename a custom role to a name that already exists in the organization receive an error. The system checks for name conflicts before creating or updating custom roles. Organization owners can view all existing role names to avoid conflicts when creating new roles. Role names are case-sensitive, so "Manager" and "manager" would be treated as different names. Each organization maintains its own set of unique role names independently from other organizations.

### Custom Role Creation Requirements

Custom roles require both a name and at least one permission to be created. Users attempting to create a role without providing a name receive an error. Users attempting to create a role without assigning any permissions receive an error. Organization owners must select permissions from the predefined list of available permissions. The system validates all permission values against the allowed set before accepting the role creation. Permissions that are not in the predefined list are rejected. At least one valid permission must be assigned for the role to be created.

### Permission Assignment Validation

Permission assignments on custom roles are validated against the predefined list of available permissions. Users attempting to assign invalid permissions receive an error. The system only accepts permissions from the established set: organization management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing. Organization owners can view the complete list of available permissions before assigning them to custom roles. Permission assignments are validated at creation time and when editing existing roles.

### Role Change Permission Requirements

Changing an employee's role requires the employee management permission. Users without employee management permission cannot modify role assignments for any employee. The system validates the requesting user's permissions before allowing role changes. Only users with employee management permission can assign or change roles for employees within the organization. Role changes are recorded in the activity log with the date and time the change was made and the user who made the change.

### Role Change Historical Data Preservation

Changing an employee's role does not affect their historical timelogs or timesheets. All historical data remains associated with the employee regardless of role changes. Timelogs and timesheets created under a previous role remain accessible and unchanged. The system preserves all historical records when role assignments are modified. Employees retain access to their historical time tracking data after role changes. Role changes only affect future permissions and access rights.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding and Organization Setup

A new user can sign up with an email and password to create an account. During sign-up, the user creates their first organization with a name, description, currency, timezone, and fiscal start month. The user becomes the Owner of the organization with full access to all features.

After sign-up, the user can log in with their email and password. At login, the user selects which organization to work in if they belong to multiple organizations. All subsequent actions are scoped to the selected organization.

The user can switch between organizations without logging out. The organization context changes immediately, and the user sees data only for the selected organization.

The user can edit their global profile with a display name, avatar image, and phone number. The profile is shared across all organizations the user belongs to.

If the user is the sole Owner of an organization, they must transfer ownership or delete the organization before deleting their account. When a user deletes their account, their employee records in other organizations are marked as deactivated.

### Employee Invitation and Contract Management Workflow

A user with employee:manage permission can invite a new employee to the organization by email. If the invited email already has an account, the user is automatically added to the organization as an employee. If the invited email has no account, a pending invitation is created.

When a user signs up with an email that has a pending invitation, they are automatically added to the pending organizations. The user can then select which organization to work in.

A user with employee:manage permission can create an employee contract with a start date, pay rate, pay period, and working hours per week. Only one contract can be active at a time. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts.

A user with employee:manage permission can edit the current active contract. Past contracts cannot be edited and serve as an immutable historical record.

A user with employee:manage permission can deactivate an employee. Deactivated employees cannot log time or submit timesheets. Their historical data including timelogs and timesheets is preserved. A deactivated employee can be reactivated to restore time tracking capabilities.

### Time Tracking and Timesheet Approval Workflow

An employee can start a timer to track time in real-time. The employee must select a project, and may optionally select a task. The employee can have at most one active timer at a time.

While the timer is running, the employee can edit the description and the selected project or task. The timer continues running indefinitely until the employee stops it or discards it.

When the employee stops the timer, the system creates a timelog with the calculated duration rounded to the nearest minute. The timelog includes the date, duration, project, optional task, and description.

The employee can discard the timer without creating a timelog. The timer stops and no time entry is recorded.

An employee can create a draft timesheet for a specific week from Monday to Sunday. Creating a draft automatically includes all timelogs for that employee in that week. The employee can add or remove timelogs from the draft timesheet.

An employee can submit a draft timesheet for approval. A timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved.

A user with time:approve permission can view all submitted timesheets. The user can approve a submitted timesheet, which locks all included timelogs so they cannot be edited or deleted. The user can reject a submitted timesheet with a reason. A rejected timesheet returns to draft status, and the employee can modify and resubmit it.

### Project Setup and Task Management Workflow

A user with project:manage permission can create a project with a name, description, color code, and optional budget hours, start date, and end date. The project status is set to active by default.

A user with project:manage permission can assign employees to the project. Each project membership includes the employee, project, and an assigned role of member or project-lead. An employee can be assigned to multiple projects.

A project lead can create tasks within their project. A user with project:manage permission can also create tasks. Each task has a title, optional description, status, priority, optional estimated hours, optional due date, and optional assigned employee who must be a project member.

A project lead can edit tasks in their project. A user with project:manage permission can edit any task. Task status changes are recorded in task history with timestamp, old status, new status, and the user who made the change.

An employee can log time on a project they are assigned to. The employee creates a timelog with a date, duration in minutes, project, optional task, optional description, and billable flag defaulting to true. The employee can only create timelogs for themselves.

An employee can edit their own timelog if it is not part of an approved timesheet. An employee can delete their own timelog if it is not part of any submitted or approved timesheet. A user with time:manage permission can edit or delete any employee's timelog.

### Activity Logging and Reporting Workflow

A user with org:manage permission can view the full activity log for the organization. The activity log records significant actions including employee invitations, deactivations, and reactivations. Contract creations and edits are logged. Project creations, archiving, completions, and deletions are logged. Task status changes are logged. Timesheet submissions, approvals, and rejections are logged. Role assignments and changes are logged.

Each activity log entry includes a timestamp, the user who performed the action, the action type, the target entity, and details about the action.

The activity log is paginated and can be filtered by action type, user, and date range.

An employee with report:view permission can access organization reports. The time report shows total hours logged per employee for a given date range, grouped by employee, project, or task. The report can be filtered by date range, employee, project, and billable status, and shows breakdown of total hours, billable hours, and non-billable hours.

The project budget report shows each project's budget hours versus actual hours logged, including the percentage of budget consumed. Projects without budget hours are excluded from this report.

The weekly summary report shows a week-by-week summary for a given date range. Each week shows total hours, number of timelogs, and number of employees who logged time. The report can be filtered by project.

# Real-time Events

WebSocket/SSE event definitions and subscription specifications.

## Organization Events

Organization changes trigger real-time notifications to users with appropriate permissions. When an organization is created during initial sign-up, the owner receives immediate confirmation. Organization setting updates including name, description, logo, currency, timezone, or fiscal start month are broadcast to all members. When an organization is deleted after meeting the prerequisites (all pending timesheets resolved and no active employee contracts), all members receive notification that their organization context is no longer available. The system ensures organization deletion events cascade to notify users that their associated data including employees, projects, tasks, timelogs, and timesheets has been permanently removed. Organization owners can edit settings and receive confirmation of successful updates in real-time.

### Organization Creation Confirmation

When a user creates an organization during initial sign-up, the system shall send an immediate confirmation notification to the newly created organization owner.

The confirmation notification shall include:
- Organization name
- Organization name (for verification)
- Date and time of confirmation

This notification ensures the user receives real-time feedback that their organization has been successfully created and is ready for use.

The system shall send this notification to the owner's active session when they first log in after organization creation.

### Organization Settings Update Notification

When an organization owner updates organization settings, the system shall notify all members of the organization about the settings update.

The following setting changes shall trigger notifications:
- Organization name changes
- Organization description changes
- Logo image changes
- Currency changes
- Timezone changes
- Fiscal start month changes

Each notification shall include:
- Type of setting that was changed
- Previous value (for audit purposes)
- New value
- Date and time of the change
- Name of the user who made the change

Members receiving this notification shall refresh their organization context to reflect the updated settings immediately.

Organization owners shall receive immediate confirmation of their own setting changes in their active session.

### Organization Deletion Notification

When an organization is deleted, the system shall send a deletion notification to all members who were part of the organization.

The deletion notification shall include:
- Organization name (as it was before deletion)
- Organization name (for verification)
- Date and time of deletion
- Name of the user who deleted the organization

This notification shall be sent only after all prerequisites for deletion are met:
- All pending timesheets have been resolved (approved or rejected)
- There are no active employee contracts

The system shall permanently remove all organization-associated data including employees, projects, tasks, timelogs, and timesheets before sending the deletion notification.

### Organization Access Invalidation

When an organization is deleted, the system shall invalidate the organization access for all users who had access to it.

The system shall:
- Remove the deleted organization from each user's available organization list
- Redirect users who had the deleted organization selected to their default organization or login screen
- Clear any stored organization information for the deleted organization
- Prevent any further operations scoped to the deleted organization

Users who belong to multiple organizations shall automatically switch to their next available organization.

Users who belonged only to the deleted organization shall be redirected to the sign-up or organization creation flow.

The owner's user account shall remain active but will no longer be associated with any organization until they create or join a new one.

### Fiscal Start Month Changes

When an organization owner updates the fiscal start month setting, the system shall notify all organization members about this change.

The notification shall include:
- Previous fiscal start month
- New fiscal start month
- Effective date of the change
- Name of the user who made the change

Members shall use the new fiscal start month for all future fiscal period calculations including:
- Financial reporting periods
- Timesheet aggregation by fiscal period
- Budget tracking cycles

The system shall ensure that historical data remains associated with the fiscal period it was originally recorded in, regardless of future fiscal start month changes.

### Currency and Timezone Updates

When an organization owner updates the currency or timezone settings, the system shall notify all organization members about these changes.

Currency change notifications shall include:
- Previous currency code
- New currency code
- Effective date of the change

Timezone change notifications shall include:
- Previous timezone reference
- New timezone reference
- Effective date of the change

Members shall display all monetary values in the new currency immediately after receiving the notification.

Members shall adjust all date and time displays to the new timezone immediately after receiving the notification.

The system shall preserve the original recorded values for historical timelogs, timesheets, and contracts, displaying them according to the new currency and timezone settings.

### Logo Image Changes

When an organization owner updates the logo image, the system shall notify all organization members about this change.

The notification shall include:
- New logo image URL
- Date and time of the update
- Name of the user who made the change

Members shall refresh their organization branding display to show the new logo immediately.

The system shall clear any stored logo images to ensure the new logo is displayed.

If the logo image fails to load, the system shall display a default organization icon until the new logo is available.

### Organization Owner Edit Permissions

Organization owners shall have exclusive permission to edit organization settings including name, description, logo, currency, timezone, and fiscal start month.

The system shall enforce that only users with the Owner role in an organization can modify these settings.

When an organization owner makes a setting change, the system shall:
- Validate the change meets all requirements
- Apply the change to the organization record
- Notify all organization members about the change
- Record the change in the activity log
- Send a confirmation to the owner

The system shall prevent any user without Owner role from attempting to edit organization settings.

Custom roles shall not be granted the ability to edit core organization settings, even if they have the org:manage permission.

### Member Notification on Organization Changes

When any organization-related change occurs, the system shall send real-time notifications to members with appropriate permissions.

The following changes shall trigger member notifications:
- Organization creation (to owner)
- Organization setting updates (to all members)
- Organization deletion (to all members)
- Fiscal start month changes (to all members)
- Currency and timezone updates (to all members)
- Logo image changes (to all members)

Notification delivery shall occur within the same session where the change was made.

Members with multiple active sessions shall receive notifications on all their active sessions.

The system shall ensure notifications are delivered even if the member is viewing a different part of the application when the change occurs.

Members shall be able to see notification history for organization-related events through the activity log (for users with org:manage permission).

## User Events

User account events are broadcast to maintain awareness of authentication and profile changes across organizations. When users sign up with email and password, they receive immediate confirmation and can begin creating their first organization. Login events notify the system when users select which organization to work in, establishing the organization context for subsequent actions. Users can switch organizations without logging out, triggering real-time context switch events that update their view. Profile changes including display name, avatar image, or phone number are broadcast to ensure consistency across all organizations the user belongs to. When users change their password, the system confirms the update and invalidates any existing sessions for security. Account deletion events occur when users transfer ownership or delete their organization first, and their employee records in other organizations are marked as deactivated with appropriate notifications.

### User Registration and Sign-up Events

When users sign up with email and password, the system sends an immediate sign-up confirmation to notify them their account is ready.

After sign-up confirmation, users can begin creating their first organization.

When a user signs up with an email that matches a pending invitation, the system automatically resolves the invitation and adds the user to the pending organization.

The system sends a notification to relevant parties when a pending invitation is resolved through sign-up.

### Organization Context Selection and Switching Events

When users log in, they must select which organization to work in, establishing the organization context for all subsequent actions.

The system sends a notification about organization context selection to establish the user's working context.

All actions performed by the user are scoped to the selected organization.

Users can switch organizations without logging out, which triggers an organization switching notification.

When an organization is switched, the system updates the user's view to display data from the newly selected organization.

The system sends a notification to clear previously stored data from the previous organization when the context changes.

### Profile Update Notification Events

When a user updates their display name, the system sends a profile update notification to all organizations the user belongs to.

When a user updates their avatar image, the system sends a profile update notification to all organizations the user belongs to.

When a user updates their phone number, the system sends a profile update notification to all organizations the user belongs to.

Profile updates are shared across all organizations the user belongs to, ensuring consistency.

The system confirms profile updates are complete before sending the update notification.

### Password Change and Session Invalidation Events

When users change their password, the system sends a password change confirmation to notify them the update was successful.

When a password is changed, the system invalidates all existing sessions for that user for security purposes.

Users must log in again with their new password after their sessions are invalidated.

The system sends a session invalidation notification to the user's active sessions that their session is no longer valid.

Existing authentication sessions are revoked when the password change is confirmed.

### Account Deletion and Employee Record Deactivation Events

When a user deletes their account, the system sends an account deletion notification to confirm the deletion.

Before account deletion, if the user is the sole owner of an organization, they must transfer ownership or delete the organization first.

When an account is deleted, the system marks the user's employee records in other organizations as deactivated.

The system sends an employee record deactivation notification to affected organizations that the employee has been deactivated.

Deactivated employee records preserve historical data including timelogs and timesheets.

The user's global profile data is removed when the account is deleted.

### Multi-Organization Membership Update Events

When a user joins a new organization, the system sends a multi-organization membership update notification.

When a user leaves an organization, the system sends a multi-organization membership update notification.

The system maintains a list of all organizations the user belongs to and sends notifications about changes to this membership.

Multi-organization membership updates ensure all systems have current information about which organizations a user can access.

Membership updates are sent to relevant systems that need to know about organization access changes.

## Employee Events

Employee management events ensure all organization members stay informed about workforce changes. When users with employee:manage permission invite new employees by email, pending invitation events are created and broadcast. If the invited email already has an account, the user is added to the organization and receives a membership notification. When users sign up with an invited email, they are automatically added to pending organizations with confirmation events. Employee record edits including department, position, or employment type changes are broadcast to relevant viewers. Deactivation events occur when employees are deactivated, preventing them from logging time or submitting timesheets while preserving historical data. Reactivation events allow deactivated employees to regain access. Employee list changes trigger updates for users with employee:view permission who are viewing the paginated, filterable employee list.

### Employee Invitation Events

When users with employee:manage permission invite a new employee by email, the system shall create a pending invitation event.

When a pending invitation event is created, the system shall notify all organization members with employee:view permission of the new invitation.

The pending invitation event shall include the invited email address, the inviting user, and the date and time when the invitation was sent.

Pending invitations shall remain active until the invited user signs up with the matching email address or the invitation is cancelled by a user with employee:manage permission.

### Automatic Organization Addition on Sign-Up

When a user signs up with an email address that matches a pending invitation, the system shall automatically add the user to the pending organization.

When automatic organization addition occurs, the system shall send a membership confirmation to the newly joined user.

The membership confirmation shall include the organization name, the assigned role, and any department or position information from the invitation.

When a user is automatically added to an organization through pending invitation resolution, the system shall remove the pending invitation.

### Employee Record Edit Notifications

When users with employee:manage permission edit an employee record including department, position, or employment type, the system shall notify users of the employee record edit.

When an employee record edit notification is sent, the system shall inform all users with employee:view permission who are viewing the employee list.

The employee record edit notification shall include the employee name, the fields that were changed, the old values, and the new values.

Department changes shall trigger a notification that includes the new department name.

Position changes shall trigger a notification that includes the new position title.

Employment type updates shall trigger a notification that includes the new employment type classification.

### Employee Deactivation and Reactivation Events

When users with employee:manage permission deactivate an employee, the system shall notify users of the employee deactivation.

When an employee deactivation notification is sent, the system shall inform all users with employee:view permission that the employee can no longer log time or submit timesheets.

The employee deactivation notification shall include the employee name, the deactivating user, and the date and time of deactivation.

When an employee is deactivated, the system shall preserve all historical timelogs and timesheets associated with that employee.

When users with employee:manage permission reactivate a deactivated employee, the system shall notify users of the employee reactivation.

The employee reactivation notification shall inform all users with employee:view permission that the employee can resume logging time and submitting timesheets.

The employee reactivation notification shall include the employee name, the reactivating user, and the date and time of reactivation.

### Employee List Synchronization Events

When the employee list changes due to any employee management action, the system shall notify users of employee list updates.

When employee list update notifications are sent, the system shall inform all users with employee:view permission who are viewing the paginated and filterable employee list.

Employee list updates shall occur when employees are invited, added, deactivated, reactivated, or have their records edited.

When department and position changes occur, the system shall notify users of updates to the employee list for users filtering by department.

When employment type updates occur, the system shall notify users of updates to the employee list for users filtering by employment type.

The employee list update notification shall include the total count of active employees and any employees that were added, removed, or modified in the update cycle.

## Contract Events

Contract events maintain historical accuracy and notify relevant parties of employment changes. When users with employee:manage permission create a new contract for an employee, the system broadcasts the contract creation event. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts, triggering a contract termination event. Contract edits to the current active contract including pay rate, pay period, or working hours per week are broadcast in real-time. Past contracts remain immutable as historical records and do not generate modification events. Employees can view their own contracts and receive notifications when new contracts are created or existing ones are modified. Users with employee:view permission receive updates when any employee's contracts change.

### Contract Creation Events

When users with employee:manage permission create a new contract for an employee, the system notifies all relevant parties of the contract creation.

The contract creation notification includes the contract start date, pay rate, pay period, and working hours per week.

Employees receive a notification when a new contract is created for them.

Users with employee:view permission receive updates when any employee's contract is created.

The system validates that the contract start date is provided before sending the creation notification.

If the contract start date is missing, the creation is rejected and no notification is sent.

### Contract Termination on New Contract

When a new contract is created for an employee, the system automatically terminates the previous active contract.

The previous contract's end date is set to the day before the new contract's start date.

A contract termination notification is sent when the previous contract is automatically ended.

The termination notification includes the original start date and the calculated end date.

Employees receive a notification when their previous contract is terminated due to a new contract.

Users with employee:view permission receive updates when any employee's contract is terminated.

The system ensures only one contract remains active at any time for each employee.

### Active Contract Edit Notification

When users with employee:manage permission edit the current active contract, the system notifies of an active contract modification.

Changes to the pay rate trigger a modification notification that includes the old and new pay rate values.

Changes to the pay period trigger a modification notification that includes the old and new pay period values.

Changes to the working hours per week trigger a modification notification that includes the old and new working hours values.

Employees receive a notification when their active contract is modified.

Users with employee:view permission receive updates when any employee's active contract is modified.

The system records the date and time of each modification and the user who made the change.

### Contract End Date Updates

When a new contract is created, the system updates the end date of the previous active contract to the day before the new start date.

Contract end date updates are included in the contract termination notification.

The end date update is permanent and cannot be reversed through editing.

Employees receive a notification when their contract end date is updated.

Users with employee:view permission receive updates when any employee's contract end date is updated.

The system ensures end date updates maintain the historical accuracy of the contract record.

### Pay Rate and Pay Period Changes

When the pay rate of an active contract is changed, the system notifies of a pay rate change.

The notification includes the previous pay rate and the new pay rate value.

Employees receive a notification when their pay rate is changed.

Users with employee:view permission receive updates when any employee's pay rate is changed.

When the pay period of an active contract is changed, the system notifies of a pay period change.

The notification includes the previous pay period and the new pay period value.

Employees receive a notification when their pay period is changed.

Users with employee:view permission receive updates when any employee's pay period is changed.

### Working Hours Per Week Updates

When the working hours per week of an active contract is changed, the system notifies of a working hours update.

The notification includes the previous working hours per week and the new working hours per week value.

Employees receive a notification when their working hours per week is changed.

Users with employee:view permission receive updates when any employee's working hours per week is changed.

The system ensures working hours updates are reflected in future time tracking calculations.

### Contract Historical Record Immutability

Past contracts remain immutable as historical records and do not generate modification notifications.

Once a contract is terminated by a new contract, it cannot be edited or modified.

The system prevents any changes to terminated contracts after the end date is set.

Employees can view their historical contracts but cannot modify them.

Users with employee:view permission can view historical contracts but cannot modify them.

The system preserves all historical contract data for audit and reporting purposes.

Contract historical records maintain their original start date, end date, pay rate, pay period, and working hours per week.

### Employee Contract View Notifications

Employees receive notifications when new contracts are created for them.

Employees receive notifications when their active contracts are modified.

Employees receive notifications when their previous contracts are terminated.

Employees can view all their contracts including active and historical records.

Employees can view contract details including start date, end date, pay rate, pay period, and working hours per week.

Employees receive real-time updates when contract changes occur that affect their employment record.

### Contract Start Date Events

When a new contract is created, the system notifies of a contract start date.

The start date notification includes the contract start date and indicates the contract is now active.

Employees receive a notification when their contract start date is established.

Users with employee:view permission receive updates when any employee's contract start date is established.

The system validates that the contract start date is not in the past before sending the notification.

If the contract start date is invalid, the creation is rejected and no notification is sent.

## Department Events

Department events keep organization members informed about structural changes. Users with org:manage permission can create new departments with name and description, triggering department creation events. Department edits including name, description, or parent department changes are broadcast to all organization members. When departments are deleted, employees' department assignments are set to null with notification events, but employees themselves are not deleted. Employees can view the list of departments and receive updates when the department structure changes. Parent department nesting changes trigger cascading notifications to ensure all members understand the organizational hierarchy. Department creation, editing, and deletion events ensure consistent visibility across the organization.

### Department Creation Events

Users with org:manage permission can create new departments within their organization. When a department is created with a name and description, the system notifies all organization members about the new department. The notification includes the new department's name, description, and any parent department assignment. This ensures all members are immediately aware of structural changes to the organization hierarchy. Department creation activities are also recorded in the activity log for audit purposes.

### Department Modification Events

Users with org:manage permission can update department name, description, or parent department assignments. When any of these fields are modified, the system notifies all organization members about the department update. Parent department nesting changes trigger cascading notifications to ensure all members understand the updated organizational hierarchy. The notification includes the department name, the fields that were changed, and the new values. Department modification activities are recorded in the activity log with the date and time and the user who made the change.

### Department Deletion Events

Users with org:manage permission can delete departments from the organization. When a department is deleted, the system notifies all organization members about the department deletion. All employees who were assigned to the deleted department have their department assignment set to null. The deletion notification includes the department name and a list of affected employee counts. Employees themselves are not deleted, only their department assignment is removed. This ensures data integrity while maintaining employee records. Department deletion activities are recorded in the activity log.

### Department List and View Updates

Employees can view the list of departments within their organization. When the department list changes due to creation, modification, or deletion activities, all organization members receive updates to their department list view. Users with org:manage permission receive the same updates as other members, ensuring consistent visibility across the organization. The department list updates include the full department hierarchy with parent-child relationships. All organization members can view the department list regardless of their role, as department viewing is a basic organizational feature.

## Project Events

Project events ensure team members stay synchronized on project lifecycle changes. Users with project:manage permission can create projects with name, description, color code, status, budget hours, and dates, triggering project creation events. Project edits including any field modifications are broadcast to project members and users with project:view permission. When projects are archived or completed, they cannot receive new timelogs, and this status change is broadcast to prevent further time logging attempts. Existing timelogs on archived or completed projects are preserved but users are notified of the project status change. Project deletion events occur only when projects have no timelogs associated with them, and all members are notified of the deletion. Project list updates are broadcast for paginated, filterable views by status.

### Project Creation Events

When a user with project:manage permission creates a new project, the system notifies all users in the organization about the new project.

The project creation notification includes the project name, description, color code, status, budget hours, start date, and end date.

Project members and users with project:view permission receive notification of the new project immediately.

The new project becomes visible in the project list for all users with project:view permission.

Users without project:view permission do not receive notification of the project creation.

### Project Edit Notifications

When a user with project:manage permission edits any field of an existing project, the system notifies all project members and users with project:view permission about the changes.

Project edit notifications include changes to the project name, description, color code, status, budget hours, start date, or end date.

Budget hours updates are notified to all project members and users with project:view permission.

Start date and end date changes are notified to all project members and users with project:view permission.

Color code updates are notified to all project members and users with project:view permission.

Project members can see the updated project information immediately after receiving the edit notification.

Users without project:view permission do not receive project edit notifications.

### Project Status Changes

When a project status changes from active to archived or completed, the system notifies all project members and users with project:view permission about the status change.

Project archiving notifications inform all project members that the project can no longer receive new timelogs.

Project completion notifications inform all project members that the project has been completed and cannot receive new timelogs.

Existing timelogs on archived projects are preserved and remain visible to users with project:view permission.

Existing timelogs on completed projects are preserved and remain visible to users with project:view permission.

Users attempting to log time on an archived project receive a notification that the project status prevents time logging.

Users attempting to log time on a completed project receive a notification that the project status prevents time logging.

The project status change notification includes the previous status and the new status.

### Project Deletion Notifications

When a user with project:manage permission deletes a project, the system notifies all project members and users with project:view permission about the deletion.

Project deletion notifications only occur when the project has no timelogs associated with it.

Projects with existing timelogs cannot be deleted, and the deletion request is rejected.

Project deletion notifications include the project name and the user who performed the deletion.

All project members are notified of the project deletion.

Users with project:view permission are notified of the project deletion.

The deleted project is immediately removed from the project list for all users.

### Project View Permission Notifications

Users with project:view permission receive notification of all project changes in the organization.

Project creation notifications are sent to users with project:view permission.

Project edit notifications are sent to users with project:view permission for any field modifications.

Project status change notifications are sent to users with project:view permission.

Project deletion notifications are sent to users with project:view permission.

Users without project:view permission do not receive any project event notifications.

Users can subscribe to project events for their organization when they have project:view permission.

Users can unsubscribe from project events without losing project:view permission.

## ProjectMember Events

Project member events track employee assignments and role changes within projects. Users with project:manage permission can assign employees to projects, triggering project membership creation events. Each project membership includes employee, project, and assigned role (member or project-lead), all of which are broadcast when changed. Project leads can manage tasks within their project, and this role assignment is communicated to relevant team members. Users with project:manage permission can remove employees from projects, triggering membership removal events. Employees can view which projects they are assigned to and receive notifications when their project assignments change. Project member additions, removals, and role changes ensure all team members understand the current project composition.

### Project Membership Creation Events

when a user with project:manage permission assigns an employee to a project, the system shall create a project membership record.

the system shall notify all users subscribed to the project when a new project membership is created.

the notification shall include the employee name, project name, and assigned role (member or project-lead).

the system shall record the date and time of the membership creation in the activity log.

when an employee is added to a project, the system shall inform the employee of their new project assignment.

the system shall ensure the employee can view the project in their assigned projects list after the membership is created.

### Project Lead Assignment Notifications

when an employee is assigned the project-lead role within a project, the system shall notify all project members of the project lead assignment.

the notification shall include the employee name, project name, and the assigned role of project-lead.

the system shall inform all team members that a project lead has been designated.

when a project lead is assigned, the system shall enable that employee to manage tasks within the project.

the system shall record the project lead assignment in the activity log with the date, time, and assigning user.

### Member Role Assignment Updates

when a user with project:manage permission changes an employee's role within a project membership, the system shall notify all subscribed users of the assigned role update.

the notification shall include the employee name, project name, previous role, and new role.

the system shall inform all project members of the role change.

when a member role is updated to project-lead, the system shall grant task management capabilities to that employee.

when a project-lead role is downgraded to member, the system shall revoke task management capabilities from that employee.

the system shall record the role change in the activity log.

### Project Membership Removal Events

when a user with project:manage permission removes an employee from a project, the system shall notify all subscribed users of the project membership removal.

the notification shall include the employee name, project name, and date and time of removal.

the system shall inform the removed employee of their project membership termination.

the system shall inform all remaining project members of the membership change.

the system shall preserve all historical timelogs and task assignments associated with the removed employee.

the system shall record the membership removal in the activity log.

### Employee Project Assignment Changes

when an employee's project assignments change (addition or removal), the system shall notify subscribed users of the employee project assignment change.

the notification shall include the employee name, list of affected projects, and the type of change (added or removed).

the system shall inform the employee of their updated project assignments.

the system shall update the employee's overview to reflect current project memberships.

the system shall ensure the employee can only access timelogs and tasks for their active project memberships.

### Project:Manage Permission Notifications

when a user with project:manage permission performs any project membership operation, the system shall notify subscribed users of the project:manage permission audit event.

the notification shall include the performing user name, operation type, target employee, and project name.

the system shall record all project membership modifications in the activity log for audit purposes.

the system shall ensure project:manage permission is validated before allowing any membership notification.

the system shall inform organization owners of significant project composition changes.

### Project Member View Notifications

when an employee views their assigned projects, the system shall provide project member view notifications showing current memberships.

the system shall display the project name, assigned role (member or project-lead), and membership status for each project.

the system shall update the view in real-time when membership changes occur.

when a project membership is added or removed, the system shall refresh the employee's project list automatically.

the system shall ensure employees only see projects where they have active membership.

### Assigned Role Updates

when a project membership role is updated, the system shall notify all subscribed users of an assigned role update event.

the notification shall include the employee name, project name, old role value, and new role value.

the system shall inform project members of role changes affecting team composition.

when a role update occurs, the system shall update all stored project membership data for affected users.

the system shall ensure role changes take effect immediately for all project operations.

### Project Composition Changes

when any project membership change occurs (creation, modification, or removal), the system shall notify all subscribed users of a project composition change event.

the notification shall include the project name, current member count, and list of affected employee names.

the system shall inform all project members of the updated team composition.

the system shall update project dashboards to reflect current membership status.

the system shall ensure project composition changes are visible to all members within the organization context.

## Task Events

Task events maintain synchronization on task lifecycle and status changes within projects. Project leads or users with project:manage permission can create tasks with title, description, status, priority, estimated hours, due date, assigned employee, and parent task, triggering task creation events. Task edits including any field modifications are broadcast to project members. Task status changes from open to in-progress, completed, or closed are recorded in task history and broadcast as status transition events. Each task history entry records timestamp, old status, new status, and who made the change, with these history updates broadcast in real-time. Task assignment changes including which employee is assigned are broadcast to relevant parties. Tasks can be filtered by status, priority, and assigned employee, and list updates are broadcast accordingly. Parent task relationships for subtasks trigger updates when modified.

### Task Creation Events

Project leads or users with project:manage permission can create tasks within their assigned projects. When a task is created, the system notifies all project members of the new task. The task creation notification includes the task reference, title, description, initial status, priority, estimated hours, due date, assigned employee (if any), and parent task relationship (if any). Project members receive the new task in their task list immediately. Task creation triggers an activity log entry recording the date and time, the user who created the task, the action type as task created, the target entity as the task, and details including the task title and project name. If the assigned employee is specified, that employee receives a notification about the new assignment. Task creation notifications are only sent to members of the project where the task was created.

### Task Update Notifications

Users with project:manage permission or project leads can edit any field of a task within their assigned projects. When a task is edited, the system notifies all project members of the task update. The task update notification includes the task reference, all modified fields with their new values, and the date and time of the modification. Modified fields include title, description, status, priority, estimated hours, due date, assigned employee, and parent task relationship. Project members see the updated task information in their task list immediately. Task edits trigger an activity log entry recording the date and time, the user who made the edit, the action type as task updated, the target entity as the task, and details including which fields were changed. If the priority field is modified, the priority update is included in the notification. If the due date field is modified, the due date change is included in the notification. If the estimated hours field is modified, the estimated hours update is included in the notification.

### Task Status Transition Events

Task status changes from open to in-progress, completed, or closed are recorded and communicated as status transition events. When a task status changes, the system notifies all project members of the status change. The status transition notification includes the task reference, the old status value, the new status value, and the date and time of the transition. Each task status change is recorded in task history. Task history entries record the date and time, the old status, the new status, and the user who made the change. Task history is accessible to all project members. Task history entries are immutable once created. Task status transitions trigger an activity log entry recording the date and time, the user who changed the status, the action type as task status changed, the target entity as the task, and details including the old and new status values. Status transitions are validated to ensure only valid status combinations are allowed.

### Task Assignment and Relationship Events

Task assignment changes occur when an employee is assigned to or removed from a task. When a task assignment changes, the system notifies relevant parties of the assignment change. The assignment change notification includes the task reference, the previously assigned employee (if any), the newly assigned employee (if any), and the date and time of the change. The assigned employee must be a project member. If an employee is assigned to a task, that employee receives a notification about the assignment. If an employee is removed from a task, that employee receives a notification about the removal. Task assignment changes trigger an activity log entry recording the date and time, the user who made the change, the action type as task assigned or task unassigned, the target entity as the task, and details including the employee name. Parent task relationship changes occur when a subtask is linked to or unlinked from a parent task. When a parent task relationship changes, the system notifies all project members of the relationship change. The parent task relationship change notification includes the task reference, the previous parent task (if any), the new parent task (if any), and the date and time of the change. Parent task relationships support one level of nesting only.

### Task List Filter Updates

Task list filter updates occur when tasks are filtered by status, priority, or assigned employee. When a task list is filtered, the system notifies project members of the filter update. The filter update notification includes the current filter criteria, the matching task references, and the date and time of the filter application. Filter criteria include status values, priority values, and assigned employee references. Project members can filter tasks by status to see only tasks with specific status values. Project members can filter tasks by priority to see only tasks with specific priority values. Project members can filter tasks by assigned employee to see only tasks assigned to specific employees. Task list updates are communicated when filters are applied, removed, or changed. Task list filter updates ensure all project members see consistent filtered views of the task list.

## Timelog Events

Timelog events ensure accurate time tracking visibility across the organization. Employees can create timelogs with date, duration in minutes, project, task, description, and billable flag, triggering timelog creation events. Employees can only create timelogs for themselves, and these events are broadcast to users with time:view_all permission. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet, and edit events are broadcast accordingly. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet, with deletion events broadcast to relevant viewers. Users with time:manage permission can edit or delete any employee's timelogs, and these actions trigger broadcast events. Timelog list updates for paginated, filterable views by date range, project, task, and billable status are broadcast in real-time.

### Timelog Creation Events

WHEN an employee creates a timelog with date, duration, project, and optional task, THE system shall notify all users with time:view_all permission in the organization of the new timelog.

WHEN an employee creates a timelog, THE system shall include the billable flag in the notification details, defaulting to true if not specified.

WHEN an employee creates a timelog with a project assignment, THE system shall include the project assignment information in the creation notification.

WHEN an employee creates a timelog with an optional task assignment, THE system shall include the task assignment information in the creation notification.

WHEN an employee creates a timelog, THE system shall record the date and time of creation and employee identity in the notification details for audit purposes.

### Timelog Edit Restrictions and Broadcasts

WHEN an employee attempts to edit their own timelog, THE system shall allow the edit only if the timelog is not part of an approved timesheet.

WHEN an employee edits their timelog duration, THE system shall notify users with time:view_all permission of the timelog duration change.

WHEN an employee edits their timelog billable flag, THE system shall notify users with time:view_all permission of the billable flag change.

WHEN an employee edits their timelog project assignment, THE system shall notify users with time:view_all permission of the project assignment update.

WHEN an employee edits their timelog task assignment, THE system shall notify users with time:view_all permission of the task assignment update.

WHEN a user with time:manage permission edits any employee's timelog, THE system shall notify all users with time:view_all permission in the organization of the edit.

### Timelog Deletion Events

WHEN an employee attempts to delete their own timelog, THE system shall allow deletion only if the timelog is not part of any submitted or approved timesheet.

WHEN an employee successfully deletes their timelog, THE system shall notify users with time:view_all permission of the timelog deletion.

WHEN a user with time:manage permission deletes any employee's timelog, THE system shall notify all users with time:view_all permission in the organization of the deletion.

WHEN a timelog deletion notification is sent, THE system shall inform all users receiving updates to remove the timelog from their displays.

### Timesheet Lock Events

WHEN a timesheet is approved, THE system shall notify all users of an approved timesheet lock that prevents all included timelogs from further editing or deletion.

WHEN a timesheet is approved, THE system shall inform all employees and users with time:manage permission that the included timelogs are now locked.

WHEN a timelog is part of an approved timesheet, THE system shall prevent any edit or delete operations and notify users of the lock status if attempted.

WHEN a timesheet is submitted, THE system shall notify all users of a submitted timesheet lock that prevents deletion of included timelogs (editing remains allowed until approval).

WHEN a timesheet is submitted, THE system shall inform the employee and users with time:approve permission that the timesheet is pending review with locked deletion status.

### Time:Manage Permission Notifications

WHEN a user with time:manage permission performs any timelog operation (create, edit, delete), THE system shall notify all users with time:view_all permission in the organization of the operation.

WHEN a user with time:manage permission edits any employee's timelog, THE system shall include the managing user's identity in the notification for record of action.

WHEN a user with time:manage permission deletes any employee's timelog, THE system shall include the managing user's identity and deletion reason in the notification.

WHEN time:manage permission notifications occur, THE system shall ensure all users with time:view_all permission receive the notification regardless of their current organization context.

### Timelog List Filter Update Events

WHEN a user with time:view_all permission requests the timelog list, THE system shall provide live updates when timelogs matching their filter criteria are created, edited, or deleted.

WHEN timelogs are filtered by date range, THE system shall notify of list changes only for timelogs within the specified date range.

WHEN timelogs are filtered by project, THE system shall notify of list changes only for timelogs assigned to the specified project.

WHEN timelogs are filtered by task, THE system shall notify of list changes only for timelogs assigned to the specified task.

WHEN timelogs are filtered by billable status, THE system shall notify of list changes only for timelogs matching the specified billable flag value.

WHEN timelog list filter updates occur, THE system shall maintain pagination integrity and notify users of total count changes.

### Billable Flag Change Events

WHEN an employee edits their timelog billable flag from true to false or vice versa, THE system shall notify users with time:view_all permission of the billable flag change.

WHEN a billable flag change notification is sent, THE system shall include the previous and new billable status in the notification details.

WHEN a billable flag change occurs, THE system shall recalculate any affected timesheet totals and notify of updated total hours if the timesheet is in draft status.

WHEN a billable flag change is attempted on a timelog in a submitted or approved timesheet, THE system shall reject the change and notify of a validation failure.

### Project and Task Assignment Update Events

WHEN an employee edits their timelog project assignment, THE system shall notify users with time:view_all permission of the project assignment update.

WHEN a project assignment update notification is sent, THE system shall include the previous and new project references in the notification details.

WHEN an employee edits their timelog task assignment, THE system shall notify users with time:view_all permission of the task assignment update.

WHEN a task assignment update notification is sent, THE system shall include the previous and new task references in the notification details.

WHEN a project or task assignment update occurs, THE system shall validate that the new task belongs to the new project before sending the update notification.

### Timelog Duration Edit Events

WHEN an employee edits their timelog duration, THE system shall notify users with time:view_all permission of the timelog duration change.

WHEN a timelog duration edit notification is sent, THE system shall include the previous and new duration values in the notification details.

WHEN a timelog duration edit occurs on a timelog in a draft timesheet, THE system shall recalculate the timesheet total hours and notify of the updated total.

WHEN a timelog duration edit is attempted on a timelog in a submitted or approved timesheet, THE system shall reject the edit and notify of a validation failure indicating the timesheet lock status.

## Timesheet Events

Timesheet events manage the approval workflow and status transitions for weekly time collections. Employees can create draft timesheets for specific weeks, and creating a draft automatically includes all timelogs for that employee in that week, triggering draft creation events. Employees can add or remove timelogs from a draft timesheet, with these modifications broadcast in real-time. Employees can submit a draft timesheet for approval, but only if it has timelogs and no other timesheet for the same week is already submitted or approved, triggering submission events. Users with time:approve permission can view all submitted timesheets and receive submission notifications. Users with time:approve permission can approve submitted timesheets, which locks all included timelogs and triggers approval events. Users can reject submitted timesheets with a reason, returning them to draft status with rejection events. Employees can view their own timesheets and receive status change notifications. Timesheet list updates for paginated, filterable views by status and date range are broadcast.

### Timesheet Draft Creation Events

When an employee creates a draft timesheet for a specific week, the system notifies all users with time:approve permission in the organization. The notification includes the timesheet reference, employee, week start date, week end date, and initial status. Creating a draft automatically includes all timelogs recorded by the employee for that week, and this inclusion is reflected in the initial draft state. If the employee has no timelogs for the week, the draft is created with zero hours but remains in draft status.

### Timelog Inclusion in Drafts

When an employee adds or removes timelogs from a draft timesheet, the system notifies users with time:approve permission. The notification includes the timesheet reference, the type of modification (addition or removal), the timelog, and the updated total hours. These modifications are visible in real-time to approvers monitoring pending timesheets. The employee can continue modifying the draft until submission, and each modification triggers a new notification.

### Timesheet Submission Events

When an employee submits a draft timesheet for approval, the system notifies all users with time:approve permission. The notification includes the timesheet reference, employee, week dates, total hours, and submission date and time. The timesheet status changes from draft to submitted. Users with time:approve permission receive a notification that a new timesheet requires review. The submission triggers validation before the notification is sent.

### Timesheet Submission Validation

Before sending a submission notification, the system validates that the draft timesheet contains at least one timelog. If the draft has no timelogs, submission is blocked and no notification is sent. The system also validates that no other timesheet for the same employee and same week (Monday to Sunday) is already in submitted or approved status. If a duplicate week timesheet exists, submission is blocked and no notification is sent. These validation failures prevent invalid submission notifications from being generated.

### Timesheet Approval Events

When a user with time:approve permission approves a submitted timesheet, the system notifies all users with time:approve permission and to the employee who owns the timesheet. The notification includes the timesheet reference, employee, week dates, total hours, reviewer, approval date and time, and new status. All timelogs included in the approved timesheet become locked and cannot be edited or deleted. The locked state is included in the approval notification.

### Timelog Lock on Approval

When a timesheet is approved, all timelogs included in that timesheet are locked. The system notifies the employee who owns the timelogs and to users with time:manage permission. The notification includes the timelogs, the timesheet reference, and the lock reason (approved timesheet). Locked timelogs cannot be edited or deleted by the employee or by users without time:manage permission. Users with time:manage permission can still edit or delete locked timelogs, and such actions trigger additional notifications.

### Timesheet Rejection Events

When a user with time:approve permission rejects a submitted timesheet, the system notifies the employee who owns the timesheet and to all users with time:approve permission. The notification includes the timesheet reference, employee, week dates, reviewer, rejection date and time, and rejection reason. The timesheet status changes from submitted back to draft. The employee receives a notification that their timesheet was rejected and can modify and resubmit it.

### Rejection Reason Requirements

When rejecting a timesheet, the user with time:approve permission must provide a rejection reason. The rejection reason is required and must be included in the rejection notification sent. The reason is stored with the timesheet and is visible to the employee. A timesheet cannot be rejected without a reason, and no rejection notification is sent if the reason is missing. The rejection reason helps the employee understand what corrections are needed before resubmission.

### Timesheet Return to Draft

When a timesheet is rejected, its status returns to draft and the system notifies the employee and users with time:approve permission. The employee can then modify the draft by adding or removing timelogs, and these modifications trigger draft modification notifications as described earlier. The employee can resubmit the timesheet after making corrections, which triggers a new submission notification. The rejection reason remains visible on the timesheet until it is resubmitted and approved or rejected again.

### time:approve Permission Notifications

Users with time:approve permission receive notifications for all timesheet events in their organization. This includes draft creation notifications, draft modification notifications, submission notifications, approval notifications, and rejection notifications. The notifications enable approvers to monitor pending timesheets in real-time and respond promptly to submission notifications. Users without time:approve permission only receive notifications for their own timesheets (submission, approval, rejection, and status changes).

### Timesheet Status Transitions

Timesheets have four status values: draft, submitted, approved, and rejected. Each status transition triggers a notification. Draft to submitted triggers a submission notification. Submitted to approved triggers an approval notification. Submitted to rejected triggers a rejection notification. Rejected to draft occurs automatically during rejection and triggers a status change notification. Draft to draft occurs when timelogs are added or removed and triggers a modification notification. These transitions are sent to relevant users based on their permissions.

### Weekly Timesheet Conflicts

The system prevents multiple timesheets for the same employee and same week from being submitted or approved simultaneously. When an employee attempts to submit a timesheet for a week where another timesheet already exists in submitted or approved status, the submission is blocked and a weekly conflict event is notified to the employee. The event includes the conflicting timesheet reference, the week dates, and the reason for rejection. The employee must wait for the existing timesheet to be approved or rejected before submitting a new one for the same week.

## Timer Events

Timer events enable real-time live time tracking visibility for employees. Employees can start a timer by selecting a project and optional task, triggering timer start events. Each employee can have at most one active timer at a time, and starting a timer while another is running is prevented with appropriate notifications. The timer records start timestamp, project, task, and description, all of which are broadcast in real-time. Employees can stop their timer, which creates a timelog with calculated duration rounded to the nearest minute, triggering timer stop and timelog creation events. Employees can discard their timer without creating a timelog, triggering discard events. Employees can view their currently running timer and receive updates if the timer state changes. Employees can edit the description and project/task of a running timer, with these modifications broadcast in real-time. If an employee forgets to stop their timer, it continues running indefinitely with no automatic stop event.

### Timer Start and Real-Time Tracking

Employees can start a timer to track time in real-time for a selected project and optional task. The system shall record the start time when the timer begins. The timer tracks duration from the start time continuously until stopped or discarded. Employees must select a project before starting the timer. Task selection is optional when starting the timer. The system shall notify other users of the active timer status. The timer includes an optional description field that employees can provide when starting the timer.

### Single Active Timer Enforcement

Each employee can have at most one active timer at a time within an organization. The system shall prevent an employee from starting a new timer if they already have a running timer. When an employee attempts to start a timer while another is active, the system shall notify them of the existing active timer. The active timer status is enforced per employee per organization context. Employees cannot start multiple timers simultaneously across different projects. The system shall maintain timer status consistency across organization context switches. If an employee switches organizations while a timer is running, the timer remains active in the original organization context.

### Timer Stop and Timelog Creation

Employees can stop their running timer to finalize the time entry. When an employee stops the timer, the system shall create a timelog with the calculated duration. The duration is calculated from the timer start time to the stop time and rounded to the nearest minute. The created timelog includes the project, optional task, description, and date of the timer session. The timelog is automatically associated with the employee who ran the timer. Stopping the timer triggers a timer stop notification and a timelog creation notification shared in real-time. The employee can then view the newly created timelog in their timelog list.

### Timer Discard and Cleanup

Employees can discard their running timer without creating a timelog entry. When an employee discards the timer, the system shall terminate the timer session without recording any time. Discarding the timer triggers a timer discard notification shared with relevant users. No timelog is created when a timer is discarded. The employee can start a new timer after discarding the previous one. The discard action is available at any time while the timer is running. Discarded timer sessions are not recorded in the activity log as time entries.

### Running Timer Visibility

Employees can view their currently running timer status on their dashboard and timer interface. The system shall display the active timer with start time, project, task, and elapsed duration. The elapsed duration updates continuously as the timer continues running. Employees can see which project and task their timer is currently tracking. The running timer visibility is scoped to the employee's own timer only. Other employees cannot see an individual employee's running timer unless they have time:view_all permission. The dashboard displays active timer status as part of the personal view.

### Timer Modification and Editing

Employees can edit the description and project or task of a running timer before stopping it. The system shall notify relevant parties when changes are made to a running timer. Description edits update the timer session description continuously. Project or task changes update the timer tracking context immediately. The start time remains unchanged when editing the timer. All modifications to the running timer are recorded in the activity log. Employees can make multiple edits to a running timer before stopping it. The final values at timer stop are used for the created timelog.

### Manual Timer Stop Requirement

Timers continue running indefinitely if an employee forgets to stop them. The system shall NOT automatically stop timers after any duration threshold. There is no automatic timer stop notification or alert. Employees are responsible for manually stopping their timers when work is complete. The timer duration calculation includes all time from start to manual stop. Employees can view how long their timer has been running to avoid forgetting to stop it. The manual stop requirement ensures accurate time tracking responsibility remains with the employee.

## ActivityLog Events

Activity log events provide audit trail visibility for significant organizational actions. The system records actions as activity log entries with timestamp, user who performed the action, action type, target entity, and details. Logged actions include employee invited, deactivated, and reactivated events. Contract created or edited events are recorded. Project created, archived, completed, and deleted events are logged. Task status changed events are recorded with history. Timesheet submitted, approved, and rejected events are logged. Role assigned or changed events are recorded. Users with org:manage permission can view the full activity log and receive notifications of new entries. The activity log is paginated and can be filtered by action type, user, and date range, with list updates broadcast in real-time. All significant organizational changes are captured and made visible to authorized users through activity log events.

### Activity Log Entry Creation

THE system shall create an activity log entry when significant organizational actions occur. Each activity log entry shall include the date and time the action occurred, the user who performed the action, the action type, the target entity, and details about the action. Activity log entries shall be created automatically when employees are invited, deactivated, or reactivated. Activity log entries shall be created automatically when contracts are created or edited. Activity log entries shall be created automatically when projects are created, archived, completed, or deleted. Activity log entries shall be created automatically when task status changes occur, recording the old status, new status, and who made the change. Activity log entries shall be created automatically when timesheets are submitted, approved, or rejected. Activity log entries shall be created automatically when roles are assigned or changed. THE system shall store all activity log entries as an immutable audit trail for organizational transparency.

### Employee Action Logging

WHEN an employee is invited to an organization, THE system shall create an activity log entry with action type "employee.invited" and record the inviting user, target employee, and organization. WHEN an employee is deactivated, THE system shall create an activity log entry with action type "employee.deactivated" and record the deactivating user, target employee, and the date and time the action occurred. WHEN an employee is reactivated, THE system shall create an activity log entry with action type "employee.reactivated" and record the reactivating user, target employee, and the date and time the action occurred. THE activity log entry shall be visible to all users with org:manage permission in the organization.

### Contract Action Logging

WHEN a contract is created for an employee, THE system shall create an activity log entry with action type "contract.created" and record the creating user, target employee, contract start date, and pay rate. WHEN an active contract is edited, THE system shall create an activity log entry with action type "contract.edited" and record the editing user, target employee, and fields that were modified. WHEN a new contract automatically ends a previous contract, THE system shall create an activity log entry with action type "contract.terminated" and record the affected employee and previous contract end date. Activity log entries for contract actions shall be visible to users with org:manage permission.

### Project Action Logging

WHEN a project is created, THE system shall create an activity log entry with action type "project.created" and record the creating user, project name, and organization. WHEN a project is archived, THE system shall create an activity log entry with action type "project.archived" and record the archiving user, project name, and the date and time the action occurred. WHEN a project is marked as completed, THE system shall create an activity log entry with action type "project.completed" and record the completing user, project name, and the date and time the action occurred. WHEN a project is deleted, THE system shall create an activity log entry with action type "project.deleted" and record the deleting user, project name, and the date and time the action occurred. THE activity log shall preserve all project action history for audit purposes.

### Task Status Change Logging

WHEN a task status changes, THE system shall create an activity log entry with action type "task.status_changed" and record the changing user, task title, old status, new status, and the date and time the action occurred. THE task status change shall be recorded in task history as defined in the task operations section. Activity log entries for task status changes shall be visible to users with project:view permission for the project containing the task. THE system shall ensure that every status transition through open, in-progress, completed, and closed states is captured in the activity log.

### Timesheet Workflow Logging

WHEN a timesheet is submitted for approval, THE system shall create an activity log entry with action type "timesheet.submitted" and record the submitting employee, week start date, week end date, and total hours. WHEN a timesheet is approved, THE system shall create an activity log entry with action type "timesheet.approved" and record the approving user, employee, week dates, and the date and time of approval. WHEN a timesheet is rejected, THE system shall create an activity log entry with action type "timesheet.rejected" and record the rejecting user, employee, week dates, rejection reason, and the date and time of rejection. Activity log entries shall be created for all timesheet workflow transitions from draft to submitted, approved, or rejected states.

### Role Assignment Logging

WHEN a role is assigned to an employee, THE system shall create an activity log entry with action type "role.assigned" and record the assigning user, target employee, role name, and organization. WHEN an employee's role is changed, THE system shall create an activity log entry with action type "role.changed" and record the changing user, target employee, previous role, new role, and the date and time the action occurred. Activity log entries for role assignments shall be visible to users with org:manage permission. THE system shall ensure that all role changes, including custom role assignments and built-in role changes, are captured in the activity log.

### Activity Log Access and Pagination

Users with org:manage permission shall be able to view the full activity log for their organization. THE system shall provide paginated access to the activity log with configurable page sizes. WHEN a user requests the activity log, THE system shall return activity log entries sorted by date and time in descending order (most recent first). THE activity log pagination shall support navigation through all historical entries. WHEN new activity log entries are created, THE system shall send notification updates to users with org:manage permission who are viewing the activity log in real-time.

### Activity Log Filtering and Broadcasts

Users with org:manage permission shall be able to filter the activity log by action type. THE system shall support filtering by specific action types such as employee.invited, employee.deactivated, contract.created, project.created, task.status_changed, timesheet.submitted, and role.assigned. Users shall be able to filter the activity log by the user who performed the action. Users shall be able to filter the activity log by date range. WHEN filters are applied, THE system shall send notification updates of the filtered view to authorized users. THE system shall return empty results when no activity log entries match the filter criteria.

### Audit Trail Visibility

THE activity log shall provide complete audit trail visibility for all significant organizational actions. Users with org:manage permission shall be able to trace any organizational change to the user who performed it and the date and time when it occurred. THE activity log shall serve as the authoritative record for organizational compliance and accountability. Activity log entries shall be immutable once created and shall not be editable or deletable by any user. THE audit trail shall support forensic analysis of organizational changes over time.

## Role Events

Role events manage custom role lifecycle and permission changes within organizations. Organization owners can create custom roles with name and a set of permissions, triggering role creation events. Each custom role defines specific access levels for organization features. Organization owners can edit custom roles including name and permissions, with these changes broadcast to affected users. Organization owners can delete custom roles only if no employees are assigned to them, triggering role deletion events with validation. When roles are deleted, employees assigned to those roles must be reassigned before deletion can proceed. Role assignment changes occur when each employee in an organization is assigned exactly one role, and these assignments are broadcast. Role assignment can be changed by users with employee:manage permission, triggering role change events. Built-in roles (Owner, Manager, Employee) cannot be deleted and their permission changes are restricted.

### Custom Role Creation Events

Organization owners can create custom roles within their organization.

WHEN an organization owner creates a custom role, THE system shall assign a unique name to the role.

WHEN an organization owner creates a custom role, THE system shall associate a set of permissions with the role from the available permission list.

WHEN a custom role is created, THE system shall notify all members of the organization of the new role.

WHERE a custom role name already exists in the organization, THE system shall reject the creation request.

WHERE the permission list is empty, THE system shall accept the role creation with zero permissions.

Each organization maintains its own set of custom roles independent of other organizations.

Custom roles are scoped to the organization where they were created.

Role creation notifications include the role name and assigned permissions.

Organization owners can view the list of custom roles they have created.

### Custom Role Edit and Permission Updates

Organization owners can edit existing custom roles within their organization.

WHEN an organization owner edits a custom role name, THE system shall update the role name and notify the organization.

WHEN an organization owner edits a custom role permissions, THE system shall update the permission set and notify the organization.

WHEN a custom role is edited, THE system shall notify all members of the organization of the role change.

WHEN role permissions are updated, THE system shall apply the changes immediately to all employees assigned to the role.

Built-in roles (Owner, Manager, Employee) cannot be edited or have their permissions modified.

Role permission updates affect all future permission checks for employees with the role.

Role edit notifications include the role name, updated name, and updated permissions.

Organization owners can view the audit history of role permission changes.

### Custom Role Deletion Validation

Organization owners can delete custom roles from their organization.

WHEN an organization owner attempts to delete a custom role, THE system shall check if any employees are assigned to the role.

WHERE employees are assigned to the custom role, THE system shall reject the deletion request and require reassignment first.

WHERE no employees are assigned to the custom role, THE system shall allow the deletion.

WHEN a custom role is deleted, THE system shall notify all members of the organization of the role deletion.

WHEN a custom role is deleted, THE system shall permanently remove the role from the organization.

Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances.

Role deletion notifications include the role name of the deleted role.

Employees previously assigned to a deleted role must be reassigned to another role before the deletion can proceed.

### Employee Role Assignment and Reassignment

Users with employee:manage permission can assign roles to employees within an organization.

WHEN a user with employee:manage permission assigns a role to an employee, THE system shall record the role assignment.

WHEN an employee is assigned a role, THE system shall notify the organization of the role assignment.

WHEN an employee's role is changed, THE system shall notify the organization of the role change.

WHEN a role assignment occurs, THE system shall validate that the employee belongs to the organization.

WHEN a role assignment occurs, THE system shall validate that the role exists in the organization.

Each employee in an organization is assigned exactly one role at any time.

WHEN a new role is assigned to an employee, THE system shall replace the previous role assignment.

Role assignment notifications include the employee name, role name, and the user who made the assignment.

Users with employee:view permission can view role assignments for all employees in the organization.

Role assignment changes take effect immediately for all permission checks.

### Built-in Role Protection

Built-in roles are protected from deletion and modification.

WHEN an organization owner attempts to delete the Owner role, THE system shall reject the deletion request.

WHEN an organization owner attempts to delete the Manager role, THE system shall reject the deletion request.

WHEN an organization owner attempts to delete the Employee role, THE system shall reject the deletion request.

WHEN an organization owner attempts to edit the Owner role permissions, THE system shall reject the edit request.

WHEN an organization owner attempts to edit the Manager role permissions, THE system shall reject the edit request.

WHEN an organization owner attempts to edit the Employee role permissions, THE system shall reject the edit request.

Built-in roles exist in every organization automatically upon organization creation.

Built-in roles cannot be renamed or have their core permissions altered.

Built-in role protection applies to all organization owners and administrators.

Built-in roles serve as the foundation for role-based access control in the organization.