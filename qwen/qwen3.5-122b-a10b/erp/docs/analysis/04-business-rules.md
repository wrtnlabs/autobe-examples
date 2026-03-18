**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Each organization operates as an independent entity with its own name, description, logo, currency, timezone, and fiscal start month. Organization owners have full control to edit these settings at any time. The organization name must be provided and cannot be empty. Currency selection is limited to supported options like USD, EUR, or KRW. Timezone configuration affects all time-based operations within that organization. Fiscal start month determines the accounting period boundaries for financial reporting. Organizations maintain complete data isolation from all other organizations on the platform.

### Organization Identification and Configuration

An organization must have a name provided during creation. The name cannot be empty or left blank.

The organization must have a currency selected from supported options such as USD, EUR, or KRW. The currency cannot be left unspecified.

The organization must have a timezone configured. This timezone setting affects all time-based operations within the organization.

The organization must have a fiscal start month configured for accounting period boundaries.

If the organization name is missing during creation, the organization cannot be created.

If the currency is not selected during creation, the organization cannot be created.

If the timezone is not specified during creation, the organization cannot be created.

### Organization Settings Management

Organization owners can edit the organization name at any time.

Organization owners can change the currency selection at any time.

Organization owners can update the timezone configuration at any time.

Organization owners can modify the fiscal start month at any time.

Organization owners can update the organization description at any time.

If the user attempting to edit organization settings is not the organization owner, the request is rejected.

If the user does not have the manage organization permission, the request is rejected.

### Data Isolation and Multi-Tenancy Boundaries

Each organization operates as a completely independent entity with its own data.

Employees in one organization cannot see or access data from another organization.

Users who belong to multiple organizations only see data for their currently selected organization.

All data including employees, projects, tasks, timelogs, and timesheets are isolated per organization.

Organization data isolation is enforced at all times, regardless of user permissions.

If a user attempts to access data from an organization they do not belong to, the request is rejected.

If a user switches organizations, all previous organization data becomes inaccessible until they switch back.

### Organization Logo Management

An organization can have a logo image stored as a URL reference.

Organization owners can upload and update the organization logo at any time.

The logo is displayed as an image in the organization interface.

If the logo URL is invalid or the image cannot be loaded, the system displays a default placeholder.

If the user attempting to update the logo is not the organization owner, the request is rejected.

## User Rules

Users authenticate with email and password credentials. Each user maintains a single global profile with display name, avatar, and phone number that is shared across all organizations they belong to. Users can belong to multiple organizations simultaneously and switch between them without logging out. Password changes affect the user account globally across all organizations. Email addresses must be unique across the entire platform. When a user deletes their account, they must first transfer ownership of any organization they solely own or delete that organization. Deletion marks employee records as deactivated in other organizations but preserves historical data.

### Email-Based Authentication

Users authenticate to the platform using an email address and password combination. Each email address must be unique across the entire platform and cannot be shared between multiple user accounts.

When a user logs in, they provide their email address and password. The system validates these credentials and grants access if they match the registered account. Invalid credentials result in access denial.

Users can change their password at any time. The password change applies to the user account globally and affects authentication across all organizations the user belongs to. After changing the password, the user must use the new password for all subsequent logins.

If a user forgets their password, they cannot recover it through the system. The user must contact support or create a new account with a different email address.

When an email address is already registered, a new registration attempt with that email is rejected. The user must either log in with existing credentials or use a different email address.

### Global Profile Management

Each user maintains a single global profile that is shared across all organizations they belong to. The profile includes a display name, avatar image, and phone number.

Users can edit their display name at any time. The display name is visible to other users within organizations and must be between 1 and 100 characters. Changing the display name updates it across all organizations immediately.

Users can upload an avatar image to represent their profile visually. The avatar image is stored as a URL reference and is displayed consistently across all organizations. Users can replace their avatar image at any time.

Users can store a phone number in their profile for contact purposes. The phone number is optional and is stored as a text string. Users can update or remove their phone number at any time. The phone number is visible to other users within the same organization based on permission settings.

All profile changes affect the user globally and are immediately visible in all organizations the user belongs to. Profile information is not organization-specific.

### Multiple Organization Membership

A user can belong to multiple organizations simultaneously. Each organization membership is independent and maintains separate employee records, roles, and permissions within that organization.

When logging in, users must select which organization to work in. This selection establishes the organization context for all subsequent actions during that session. All data access, time tracking, and reporting are scoped to the selected organization.

Users can switch between organizations without logging out. When switching organizations, the user's organization context changes immediately, and all data views reflect the newly selected organization. The user's global profile remains unchanged during organization switches.

Users can only access data belonging to their currently selected organization. Data from other organizations the user belongs to is not visible until the user switches to that organization. This ensures strict data isolation between organizations.

If a user is removed from an organization or their employee record is deactivated in an organization, they can no longer access that organization's data even if they previously had access.

### Account Deletion Conditions

Users can delete their account from the platform, but certain conditions must be met before deletion is allowed.

If a user is the sole owner of any organization, they cannot delete their account until they either transfer ownership to another employee in that organization or delete the organization entirely. The system prevents account deletion while the user holds sole ownership of any organization.

When a user transfers ownership of an organization, they must designate another employee in that organization to become the new owner. The transfer must be completed before account deletion can proceed.

When a user deletes their account, their employee records in all other organizations are marked as deactivated. Deactivated employee records preserve all historical data including timelogs, timesheets, and activity logs. The deactivated employee cannot log in or access any organization data.

Account deletion is permanent and cannot be undone. All user profile data, authentication credentials, and organization memberships are removed. The user's email address becomes available for future registration by a different user.

If the user is the only employee in an organization and deletes their account, the organization becomes ownerless. The system requires ownership transfer before allowing account deletion in this scenario.

## Employee Rules

Each employee record links a user account to a specific organization with an assigned role. Department and position are optional fields that provide organizational context. Employment type must be one of four values: full-time, part-time, contractor, or intern. Employee status can be active or deactivated. Only one role can be assigned to an employee within an organization at any time. Deactivated employees lose the ability to log time or submit timesheets but their historical timelogs and timesheets remain preserved. Role assignments can be changed by users with employee management permission.

### Role Assignment Rules

Each employee within an organization is assigned exactly one role at any given time. The role determines what permissions the employee has within that organization. Role assignment occurs when an employee is invited to or added to an organization. The three built-in roles are Owner, Manager, and Employee, each with predefined permissions. Organization owners can also create custom roles with specific permission sets.

Role assignments can be changed by users who have the employee management permission. When a role is changed, the employee immediately gains or loses the permissions associated with the new role. The previous role assignment is replaced entirely; an employee cannot hold multiple roles within the same organization simultaneously.

If a user attempts to assign a role to an employee who already has a role in that organization, the new assignment replaces the existing one. There is no support for role history or role versioning within the system.

### Employment Type and Status Validation

Employment type must be one of four valid values: full-time, part-time, contractor, or intern. This field is required when creating an employee record and cannot be left empty. The employment type is used for reporting and organizational classification purposes.

Employee status can be either active or deactivated. Active employees can log time, submit timesheets, and access all features available based on their assigned role. Deactivated employees cannot log time or submit timesheets, but they retain access to view their historical data.

When an employee's status is changed to deactivated, the system immediately prevents any new timelogs or timesheet submissions from that employee. Existing timelogs and timesheets remain in the system and are preserved for historical reporting. The employee can be reactivated at any time by a user with employee management permission, at which point they regain full access to time tracking features.

### Employee Profile Fields

The department field is optional when creating or editing an employee record. If a department is assigned, it must be a valid department that exists within the organization. Employees can be viewed and filtered by department in the employee list.

The position or job title field is also optional and can contain up to 200 characters of text. This field is used for organizational context and reporting purposes. Both department and position can be updated at any time by users with employee management permission.

If a department is deleted from the organization, all employees who were assigned to that department have their department field set to null. The employee records themselves are not deleted or affected beyond this field update.

### Historical Data Preservation

When an employee is deactivated, all historical timelogs and timesheets associated with that employee are preserved in the system. This includes timelogs on projects, timesheets that were submitted, approved, or rejected, and any timer data. The data remains accessible for reporting and audit purposes.

Deactivated employees can still view their own historical timelogs and timesheets. Users with time view all permission can also view the historical data of deactivated employees. The data is not hidden or removed from reports that include historical time entries.

If an employee record is permanently deleted (not just deactivated), all associated timelogs, timesheets, contracts, and project memberships are also permanently deleted. This is an irreversible action. Employee deletion is only allowed when the employee has no pending timesheets that require approval and is not the sole owner of any organization.

## Contract Rules

Each employee can have multiple contracts as a historical record but only one contract can be active at any given time. Contract start date is required and must be a valid date. End date is optional and when null indicates an ongoing contract. Pay rate is required and must be a positive numeric value. Pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required and represents the standard work schedule. When a new contract is created, the previous active contract automatically receives an end date set to the day before the new contract starts. Past contracts become immutable and cannot be edited once superseded.

### Single Active Contract Rule

An employee may have multiple contracts stored as a historical record within an organization.

At any given time, an employee can have only one active contract. A contract is considered active when its end date is not set (null).

When an employee has an active contract, no other contract for that employee can be in an active state simultaneously.

The system shall enforce that only one contract per employee has a null end date at any time.

An ongoing contract is indicated by the absence of an end date, meaning the contract continues indefinitely until terminated or superseded.

### Contract Date Requirements

Every contract must have a start date specified at the time of creation.

The start date shall be a valid calendar date and cannot be null or empty.

An end date is optional for contracts. When an end date is not provided, the contract is considered ongoing.

When an end date is specified, it must be a valid calendar date on or after the start date.

If an end date is provided, it must not precede the start date of the contract.

The system shall reject contract creation or updates that violate the start date and end date relationship.

### Contract Compensation Validation

Every contract must have a pay rate specified as a required field.

The pay rate shall be a positive numeric value greater than zero.

The system shall reject contract creation or updates where the pay rate is zero, negative, or non-numeric.

A pay period must be specified for every contract and must be one of the following values: hourly, daily, weekly, or monthly.

The system shall reject any contract where the pay period is not one of the four allowed values.

Working hours per week is a required field for every contract and represents the standard work schedule expectation.

The working hours per week shall be a positive numeric value.

The system shall reject contract creation or updates where the working hours per week is zero, negative, or non-numeric.

### Contract Succession and Immutability

When a new contract is created for an employee who already has an active contract, the system shall automatically end the previous active contract.

The previous active contract shall receive an end date set to the day before the new contract's start date.

This automatic termination ensures the single active contract rule is maintained during contract succession.

Once a contract is superseded by a new contract (i.e., it receives an end date), it becomes part of the historical record.

Past contracts that have been superseded shall be immutable and cannot be edited or modified.

The system shall reject any attempt to edit a contract that is no longer active.

Only the currently active contract for an employee may be edited by authorized users.

Contract edits shall preserve the historical integrity of past contract records.

## Department Rules

Departments organize employees within an organization with a name and optional description. Each department can have an optional parent department enabling one level of hierarchical nesting. Department names must be unique within the organization. Deleting a department does not delete associated employees but sets their department field to null. Only users with organization management permission can create, edit, or delete departments. All employees can view the list of departments in their organization.

### Department Naming Rules

Each department must have a name that uniquely identifies it within the organization. No two departments in the same organization may share the same name.

A department may optionally include a description to provide additional context about the department's purpose or scope.

Department names must be provided and cannot be empty. Descriptions are optional and may be omitted when creating or editing a department.

### Department Hierarchy Rules

A department may optionally be assigned a parent department to create a hierarchical structure.

The hierarchy is limited to a single level of nesting. A department can have at most one parent department, and parent departments cannot themselves have parent departments.

This creates a two-level structure where departments exist either at the top level (no parent) or as child departments (with one parent).

### Department Deletion Rules

When a department is deleted, the department record is permanently removed from the organization.

Deleting a department does not delete employees who were assigned to that department. Instead, the department assignment for each affected employee is set to null, removing their department association.

All other employee data, including contracts, timelogs, timesheets, and project memberships, remains intact and unaffected by the department deletion.

### Department Access Rules

Only users with the organization management permission can create new departments, edit existing department information, or delete departments from the organization.

All employees within the organization, regardless of their role or permissions, can view the list of departments. Department visibility is not restricted and does not require any special permission beyond being an active employee of the organization.

## Project Rules

Projects require a name and color code for identification and visual distinction. Description is optional and provides additional context about the project purpose. Project status can be active, archived, or completed. Budget hours are optional and represent the total estimated hours for the project. Start date and end date are optional fields for project scheduling. Archived or completed projects cannot receive new timelogs but existing timelogs are preserved. Projects can only be deleted if no timelogs are associated with them. Users with project management permission can create, edit, archive, complete, or delete projects.

### Project Identification Requirements

A project must have a name that is between 1 and 200 characters. The name is required and serves as the primary identifier for the project.

A project must have a color code that is exactly 7 characters long. The color code is required and is used for visual distinction in the user interface.

A project may have an optional description that provides additional context about the project purpose. The description can be up to 1000 characters.

If a project name is missing or empty, the project creation is rejected.

If a color code is missing or does not match the required format, the project creation is rejected.

### Project Status Values

A project has a status that can be one of the following: active, archived, or completed.

The default status when a project is created is active.

A project status can be changed from active to archived by users with project management permission.

A project status can be changed from active to completed by users with project management permission.

A project status can be changed from archived to active by users with project management permission.

A completed project cannot be changed back to active or archived status.

If an invalid status value is provided, the project update is rejected.

### Project Scheduling Rules

A project may have optional budget hours that represent the total estimated hours for the project. Budget hours are not required for project creation.

A project may have an optional start date for project scheduling. The start date is not required.

A project may have an optional end date for project scheduling. The end date is not required.

If a start date is provided, it must be a valid date.

If an end date is provided, it must be a valid date.

If both start date and end date are provided, the end date must not be earlier than the start date.

If the end date precedes the start date, the project update is rejected.

### Archived and Completed Project Restrictions

An archived project cannot receive new timelogs. Employees cannot log time against an archived project.

A completed project cannot receive new timelogs. Employees cannot log time against a completed project.

Existing timelogs on an archived project are preserved and remain visible.

Existing timelogs on a completed project are preserved and remain visible.

Tasks in an archived project cannot be assigned new timelogs.

Tasks in a completed project cannot be assigned new timelogs.

If an employee attempts to create a timelog for an archived project, the request is rejected.

If an employee attempts to create a timelog for a completed project, the request is rejected.

### Project Deletion Rules

A project can only be deleted if it has no timelogs associated with it.

If a project has one or more timelogs, the deletion request is rejected.

The timelog association check is performed before allowing project deletion.

Project deletion permanently removes the project and all associated tasks.

Project deletion does not affect timelogs from other projects.

Only users with project management permission can delete a project.

If the project deletion condition is not met (timelogs exist), the system returns an error indicating that the project has associated timelogs.

### Project Data Visibility

Users with project view permission can view all projects in the organization.

Users with project view permission can view project details including name, description, color code, status, budget hours, start date, and end date.

Users without project view permission cannot view any projects in the organization.

The project list is paginated to support browsing large numbers of projects.

Projects can be filtered by status when viewing the project list.

Employees can view which projects they are assigned to through project memberships.

## ProjectMember Rules

Project members link employees to projects with an assigned role of either member or project-lead. Each employee can be assigned to multiple projects simultaneously. Project leads have the ability to manage tasks within their assigned project. Only users with project management permission can assign or remove employees from projects. The assigned role determines task management capabilities within the project context. Employees can view which projects they are assigned to through their project membership records.

### Project Membership Roles

Each project membership record assigns exactly one role to an employee within a project.

The assigned role must be either "member" or "project-lead".

The project-lead role grants the employee authority to manage tasks within the assigned project.

The member role provides standard access without task management authority.

Role assignment is recorded at the time of project membership creation.

Role assignment can be changed when the project membership is updated.

### Multiple Project Assignment Rules

An employee can be assigned to multiple projects simultaneously.

Each project assignment creates a separate project membership record.

An employee's role in one project does not affect their role in other projects.

An employee can be project-lead in some projects and member in others.

Removing an employee from one project does not affect their assignments to other projects.

### Membership Management Permissions

Users with project management permission can assign employees to projects.

Users with project management permission can remove employees from projects.

Users without project management permission cannot create or modify project memberships.

Users with project management permission can change an employee's role within a project.

Project leads cannot assign or remove employees from their project unless they also have project management permission.

### Project Lead Task Management

Project leads can create tasks within their assigned project.

Project leads can edit tasks within their assigned project.

Project leads can change task status within their assigned project.

Users with project management permission can manage tasks in any project.

Employees who are only members (not project-leads) cannot manage tasks in the project.

### Project Assignment Viewing

Employees can view the list of projects they are assigned to.

The project membership view shows the project name and assigned role.

Employees cannot view project memberships of other employees.

Users with project view permission can view all project memberships in the organization.

### Project Assignment Validation

If an employee is not assigned to a project, they cannot log time to that project.

If an employee is not assigned to a project, they cannot create timelogs referencing tasks from that project.

If a project has no members assigned, no timelogs can be created for the project.

If an employee is removed from a project, existing timelogs on that project are preserved.

If an employee is removed from a project, they cannot create new timelogs for that project.

If a project is archived or completed, project memberships remain but no new timelogs can be created.

## Task Rules

Tasks require a title and can have an optional description for additional details. Status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Estimated hours and due date are optional fields for planning purposes. Tasks can be assigned to an employee who must be a member of the project. Tasks can have an optional parent task enabling one level of subtask nesting. Task status changes are recorded in task history with timestamp, old status, new status, and the user who made the change. Project leads can edit tasks in their project while users with project management permission can edit any task.

### Task Field Validation

Every task must have a title that is required and cannot be empty. The title uniquely identifies the task within its project context.

A task may have an optional description that provides additional details about the work to be performed. The description is not required for task creation.

A task status must be one of: open, in-progress, completed, or closed. The system rejects any attempt to set a task to a status outside this set.

A task priority must be one of: low, medium, high, or urgent. The system rejects any attempt to set a task to a priority outside this set.

Estimated hours for a task are optional and used for planning purposes. When provided, the estimated hours must be a positive numeric value.

A due date for a task is optional and used for deadline tracking. When provided, the due date must be a valid calendar date.

### Task Assignment Validation

When a task is assigned to an employee, the employee must be a member of the project that contains the task. The system rejects any attempt to assign an employee who is not associated with the project.

An employee can be assigned to at most one task at a time for tracking purposes, though this is a business convention rather than a system constraint.

When an employee is removed from a project, any tasks assigned to that employee within the project remain in the system but the assigned employee field is cleared.

### Task Hierarchy Rules

A task may have an optional parent task, enabling hierarchical organization of work items. When a parent task is specified, the child task becomes a subtask of the parent.

Subtask nesting is limited to one level only. A subtask cannot itself have child tasks. The system rejects any attempt to create a task with a parent that already has a parent.

When a parent task is deleted, all its subtasks are also deleted. The system cascades the deletion to preserve data integrity.

### Task History Tracking

When a task status changes, the system records the change in task history. Each history entry captures the timestamp of the change, the previous status, the new status, and the user who made the change.

All status transitions are recorded regardless of who initiated the change. This includes transitions initiated by project leads, users with project management permission, or any authorized actor.

The task history is immutable once recorded and serves as an audit trail for task status changes over time.

## Timelog Rules

Timelogs require a date and duration in minutes for accurate time tracking. Project is required and must be a project the employee is assigned to. Task is optional but when specified must belong to the selected project. Description is optional and documents what work was performed. Billable flag defaults to true and indicates whether the time should be billed. Employees can only create timelogs for themselves. Timelogs that are part of an approved timesheet cannot be edited or deleted. Timelogs in submitted but not yet approved timesheets cannot be deleted. Users with time management permission can edit or delete any employee's timelogs.

### Timelog Creation Requirements

A timelog must have a date to record when the work was performed. The date is required and cannot be omitted.

A timelog must have a duration in minutes to record how long the work took. The duration is required and must be a positive value.

A timelog must be associated with a project. The project is required and identifies which project the time was spent on.

If the date is missing, the timelog cannot be created.

If the duration is missing or zero or negative, the timelog cannot be created.

If the project is missing, the timelog cannot be created.

### Timelog Content Validation

A timelog may have a task associated with it. The task is optional.

When a task is specified, it must belong to the selected project. A task from a different project cannot be associated with the timelog.

A timelog may have a description to document what work was performed. The description is optional.

A timelog has a billable flag to indicate whether the time should be billed. The billable flag defaults to true.

If a task is specified but does not belong to the selected project, the timelog cannot be created.

If the billable flag is not specified, it defaults to true.

### Timelog Ownership and Self-Creation

An employee can only create timelogs for themselves. An employee cannot create timelogs on behalf of another employee.

If an employee attempts to create a timelog for another employee, the request is rejected.

### Timesheet State Locking Rules

A timelog that is part of an approved timesheet cannot be edited. The timelog is locked to preserve the approved record.

A timelog that is part of an approved timesheet cannot be deleted. The timelog is locked to preserve the approved record.

A timelog that is part of a submitted timesheet (but not yet approved) cannot be deleted. The timelog is protected while awaiting approval.

If an employee attempts to edit a timelog in an approved timesheet, the request is rejected.

If an employee attempts to delete a timelog in an approved timesheet, the request is rejected.

If an employee attempts to delete a timelog in a submitted timesheet, the request is rejected.

### Permission-Based Override Rules

A user with the time management permission can edit any employee's timelogs, regardless of timesheet state.

A user with the time management permission can delete any employee's timelogs, regardless of timesheet state.

The time management permission overrides the standard editing and deletion restrictions imposed by timesheet states.

## Timesheet Rules

Timesheets represent a collection of timelogs for a specific week from Monday to Sunday. Week start date and week end date are required and must define a valid week. Status can be draft, submitted, approved, or rejected. Total hours are calculated automatically from included timelogs. A timesheet cannot be submitted if it contains no timelogs. A timesheet cannot be submitted if another timesheet for the same week already exists in submitted or approved status. Approved timesheets lock all included timelogs preventing any edits or deletions. Rejected timesheets return to draft status allowing the employee to modify and resubmit. Rejection requires a reason text explaining why the timesheet was rejected.

### Weekly Timesheet Period

A timesheet represents a collection of timelogs for a single calendar week.

The weekly period always runs from Monday to Sunday. The week start date must be a Monday, and the week end date must be the following Sunday.

Both the week start date and week end date are required fields. The dates must form a valid week where the end date is exactly six days after the start date.

Employees can create a draft timesheet for any week. The system validates that the provided dates form a valid Monday-to-Sunday period before accepting the timesheet.

### Timesheet Status and Submission Rules

A timesheet has four possible status values: draft, submitted, approved, and rejected.

The total hours for a timesheet are calculated automatically by summing the duration of all timelogs included in the timesheet. This value is recalculated whenever timelogs are added or removed.

A timesheet cannot be submitted for approval if it contains no timelogs. The system rejects the submission request when the timesheet is empty.

A timesheet cannot be submitted if another timesheet for the same employee already exists for that week in submitted or approved status. The system prevents duplicate timesheets for overlapping weeks.

### Timesheet Approval and Locking Rules

When a timesheet is approved, all timelogs included in that timesheet become locked. Locked timelogs cannot be edited or deleted by any user, including the employee who created them.

Users with time management permission can still edit or delete timelogs even if they are part of an approved timesheet.

When a timesheet is rejected, its status returns to draft. The employee can modify the timesheet by adding or removing timelogs, then resubmit it for approval.

A rejection must include a reason text that explains why the timesheet was rejected. The rejection reason is required and cannot be empty. This reason is stored with the timesheet and visible to the employee.

## Timer Rules

Each employee can have at most one active timer at any given time. Starting a timer requires selecting a project while task selection is optional. Timer records the start timestamp, selected project, optional task, and description. Stopping the timer creates a timelog with duration calculated from start to stop time and rounded to the nearest minute. Discarding the timer does not create any timelog entry. Employees can view their currently running timer. The running timer can be edited to change description, project, or task selection. Timers continue running indefinitely until manually stopped or discarded with no automatic timeout.

### Single Active Timer Rule

An employee can have at most one active timer running at any given time.

If an employee attempts to start a new timer while another timer is already running, the request is rejected.

The employee must first stop or discard the existing running timer before starting a new one.

This constraint ensures that time tracking remains accurate and prevents duplicate time entries for the same time period.

### Timer Initialization Requirements

Starting a timer requires the employee to select a project from the projects they are assigned to.

Task selection is optional when starting a timer. The employee may choose to log time at the project level without associating it with a specific task.

The timer records the start timestamp when activated, which serves as the reference point for calculating elapsed duration.

If the selected project is not valid (e.g., the employee is not a member of the project, or the project is archived or completed), the request is rejected.

### Timer Stop and Timelog Creation

When an employee stops their running timer, the system automatically creates a timelog entry.

The timelog duration is calculated as the difference between the stop time and the recorded start timestamp.

The calculated duration is rounded to the nearest minute before being stored in the timelog.

The timelog inherits the project and optional task selection from the timer configuration.

The description from the timer is copied to the timelog if one was provided.

If the timer was started but no valid project was selected (which should not occur due to initialization validation), the timelog creation fails.

### Timer Discard Behavior

An employee may discard their running timer without creating a timelog entry.

Discarding the timer removes the running timer record from the system.

No time is recorded when a timer is discarded, and no timelog is created.

This option allows employees to cancel time tracking if they started the timer by mistake or decided not to log the time spent.

### Running Timer Visibility and Editing

An employee can view their currently running timer at any time.

The running timer display shows the elapsed time since the timer started.

While the timer is running, the employee can edit the timer's description to update what work is being tracked.

The employee can also change the project or task selection for the running timer before stopping it.

Changes to the running timer take effect immediately and are reflected in the timelog that will be created when the timer is stopped.

### Timer Duration and Timeout

A running timer continues indefinitely until the employee manually stops or discards it.

The system does not enforce any automatic timeout or maximum duration for a running timer.

If an employee forgets to stop their timer, it will continue accumulating time without interruption.

This design gives employees full control over their time tracking duration without system-imposed limits.

Employees are responsible for stopping their timer when their work session ends to ensure accurate time records.

## ActivityLog Rules

Activity log entries record significant actions with timestamp, user, action type, target entity, and details. Action types include employee invitations, deactivations, reactivations, contract creations and edits, project lifecycle changes, task status changes, timesheet lifecycle changes, and role assignments. Each entry captures who performed the action and what entity was affected. The activity log provides an audit trail for organizational changes. Users with organization management permission can view the full activity log. All activity entries are immutable once created.

### Activity Log Entry Structure

Each activity log entry records the timestamp when the action occurred, capturing the exact moment the user performed the action. The timestamp is automatically generated by the system and cannot be modified after creation.

Each activity log entry attributes the action to the specific user who performed it. The system records which user initiated the action, enabling audit trails that show who made each change.

Each activity log entry records the action type, categorizing the nature of the change such as employee invitation, contract creation, project status change, task status change, timesheet submission, or role assignment. Action types are predefined by the system and cannot be customized.

Each activity log entry tracks the target entity affected by the action, identifying which business object was modified. The target entity type (employee, contract, project, task, timesheet, role) is recorded along with a reference to the specific entity instance.

### Employee Action Logging

The system logs employee invitations when users with employee management permission invite new employees to the organization. The activity log records who sent the invitation and the email address of the invited person.

The system logs employee deactivations when users with employee management permission deactivate an employee. The activity log records who performed the deactivation and which employee was deactivated.

The system logs employee reactivations when users with employee management permission reactivate a deactivated employee. The activity log records who performed the reactivation and which employee was reactivated.

Deactivated employees cannot log time or submit timesheets. Historical timelogs and timesheets for deactivated employees are preserved in the activity log for audit purposes.

When an employee is invited, the activity log captures whether the invitation was sent to an existing user account or created a pending invitation for a new user.

### Contract Action Logging

The system logs contract creation when users with employee management permission create a new contract for an employee. The activity log records who created the contract, which employee it was created for, and the contract start date.

The system logs contract edits when users with employee management permission modify the current active contract for an employee. The activity log records who made the edit, which employee's contract was modified, and the effective date of the change.

Past contracts cannot be edited. The system prevents modifications to contracts that are no longer active, and no edit activity is logged for such attempts.

When a new contract is created, the system automatically ends the previous active contract. This automatic termination is recorded in the activity log to maintain a complete audit trail of contract history.

### Project Action Logging

The system logs project creation when users with project management permission create a new project. The activity log records who created the project and the project name.

The system logs project archiving when users with project management permission archive an active project. The activity log records who archived the project and when the archiving occurred.

The system logs project completion when users with project management permission mark a project as completed. The activity log records who completed the project and when the completion occurred.

The system logs project deletion when users with project management permission delete a project. The activity log records who deleted the project and confirms that no timelogs were associated with the project at the time of deletion.

Archived or completed projects cannot receive new timelogs. Attempts to log time against such projects are rejected and may be recorded in the activity log if the user has appropriate permissions.

### Task Action Logging

The system logs task status changes when project leads or users with project management permission modify a task's status. The activity log records who made the change, which task was modified, the previous status, and the new status.

Task status transitions follow a defined workflow. The activity log captures each transition to provide a complete history of task progress.

The activity log records the timestamp of each status change, enabling tracking of how long tasks remain in each status.

Task assignments are also logged when a task is assigned to or unassigned from an employee. The activity log records who made the assignment change and which employee was affected.

### Timesheet Action Logging

The system logs timesheet submission when employees submit a draft timesheet for approval. The activity log records which employee submitted the timesheet, the week period covered, and when the submission occurred.

The system logs timesheet approval when users with time approval permission approve a submitted timesheet. The activity log records who approved the timesheet, which employee's timesheet was approved, and when the approval occurred.

The system logs timesheet rejection when users with time approval permission reject a submitted timesheet. The activity log records who rejected the timesheet, which employee's timesheet was rejected, the rejection reason, and when the rejection occurred.

Rejected timesheets return to draft status. The activity log captures this status transition to maintain a complete audit trail of the timesheet lifecycle.

Timesheets without timelogs cannot be submitted. Attempts to submit empty timesheets are rejected and do not generate activity log entries.

### Role Action Logging

The system logs role assignments when users with employee management permission assign a role to an employee within an organization. The activity log records who made the assignment, which employee was assigned, and which role was assigned.

The system logs role changes when users with employee management permission modify an employee's role within an organization. The activity log records who made the change, which employee was affected, the previous role, and the new role.

Built-in roles (Owner, Manager, Employee) cannot be deleted or modified. Activity log entries are not generated for attempts to modify built-in role permissions.

Custom role creation, modification, and deletion by organization owners are logged in the activity log. The activity log records who performed the role management action and which custom role was affected.

### Activity Log Viewing Permission

Users with organization management permission can view the full activity log for their organization. This permission is required to access any activity log entries.

The activity log is paginated to support browsing through large volumes of log entries. Users can navigate through pages of activity entries.

The activity log can be filtered by action type, allowing users to view only specific categories of actions such as employee actions, project actions, or timesheet actions.

The activity log can be filtered by user, allowing users to view all actions performed by a specific person within the organization.

The activity log can be filtered by date range, allowing users to view actions that occurred within a specific time period.

Activity log entries are immutable once created. No user can modify or delete activity log entries after they are recorded.

## Role Rules

Each organization maintains its own set of roles that are independent from other organizations. Three built-in roles exist and cannot be deleted: Owner, Manager, and Employee. Owner has full access to all features including role and member management. Manager can manage employees, projects, approve timesheets, and view reports. Employee can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and set of permissions. Custom roles can be edited by organization owners. Custom roles can only be deleted if no employees are assigned to them. Each employee is assigned exactly one role within an organization.

### Organization Role Isolation

Each organization maintains its own independent set of roles that are not shared with other organizations. Role definitions, permissions, and assignments are scoped to the organization context. When a user belongs to multiple organizations, their role in one organization does not affect their role in another organization. Role changes in one organization do not propagate to other organizations.

### Built-in Role Definitions

The system provides three built-in roles that exist in every organization and cannot be deleted or renamed.

The Owner role has full access to all organization features including the ability to manage roles and members, edit organization settings, and perform all administrative actions.

The Manager role can manage employees including adding, editing, and deactivating employees, manage projects, approve timesheets, and view organization reports.

The Employee role can track time, submit timesheets for approval, and view their own data including timelogs, timesheets, and assigned tasks.

The built-in roles cannot be modified to change their permission sets, and they cannot be deleted under any circumstances.

### Custom Role Management

Organization owners can create custom roles within their organization. Each custom role must have a unique name within the organization. Custom roles are assigned a set of permissions from the available permission types.

The available permissions are: organization management, employee management, employee viewing, project management, project viewing, time log management, timesheet approval, time log viewing for all employees, and report viewing.

Organization owners can edit custom roles to change their name or modify their assigned permission set. Changes to custom roles take effect immediately for all employees assigned to that role.

Custom roles can only be deleted if no employees are currently assigned to them. If employees are assigned to a custom role, the organization owner must first reassign those employees to a different role before the custom role can be deleted.

### Employee Role Assignment

Each employee in an organization is assigned exactly one role at any given time. An employee cannot have multiple roles simultaneously within the same organization.

When assigning or changing an employee's role, the system validates that the new role exists within the organization and is either a built-in role or an active custom role.

Role assignment changes can only be performed by users who have the employee management permission.

When an employee is deactivated, their role assignment is preserved and restored if the employee is reactivated.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Data List Pagination

All paginated lists in the system return results in pages with a configurable page size.

The employee list is paginated and supports filtering by department, employment type, and status.
Employees can search the employee list by name.

The project list is paginated and supports filtering by status.

The timelog list is paginated and supports filtering by date range, project, task, and billable status.

The timesheet list is paginated and supports filtering by status and date range.

The activity log is paginated and supports filtering by action type, user, and date range.

Users can navigate between pages using standard pagination controls (previous, next, page numbers).

### List Filtering Capabilities

When viewing the employee list, users can filter results by department.
When viewing the employee list, users can filter results by employment type (full-time, part-time, contractor, intern).
When viewing the employee list, users can filter results by status (active, deactivated).
When viewing the employee list, users can search for employees by name.
Multiple filters can be combined when searching the employee list.

When viewing the project list, users can filter results by project status (active, archived, completed).

When viewing the timelog list, users can filter results by a date range.
When viewing the timelog list, users can filter results by project.
When viewing the timelog list, users can filter results by task.
When viewing the timelog list, users can filter results by billable status.
Multiple filters can be combined when searching the timelog list.

When viewing the timesheet list, users can filter results by timesheet status (draft, submitted, approved, rejected).
When viewing the timesheet list, users can filter results by date range.
Multiple filters can be combined when searching the timesheet list.

When viewing the activity log, users can filter results by action type.
When viewing the activity log, users can filter results by user.
When viewing the activity log, users can filter results by date range.
Multiple filters can be combined when searching the activity log.

### Task List Sorting

When viewing the task list, users can sort results by due date.
When viewing the task list, users can sort results by priority (low, medium, high, urgent).
When viewing the task list, users can sort results by creation date.
Sorting can be applied in ascending or descending order.
Multiple sort criteria can be combined when viewing the task list.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Validation

An organization cannot be deleted if there are pending timesheets awaiting approval or rejection. All timesheets must be in either approved or rejected status before deletion is allowed.

An organization cannot be deleted if there are active employee contracts. All contracts must have an end date set (no ongoing contracts) before deletion is allowed.

When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed. This action cannot be undone.

The organization owner's user account is preserved after organization deletion but is no longer associated with any organization.

### User Account Deletion Validation

A user account cannot be deleted if the user is the sole owner of an organization. The user must first transfer ownership to another employee or delete the organization.

When a user account is deleted, their employee records in other organizations are marked as deactivated. Historical data including timelogs and timesheets is preserved.

A user cannot log in after their account is deleted. The account deletion is permanent and cannot be undone.

### Timesheet Submission Constraints

A timesheet cannot be submitted for approval if it contains no timelogs. At least one timelog must be included before submission.

A timesheet cannot be submitted if another timesheet for the same week already exists in submitted or approved status. Each week can have only one active timesheet per employee.

A rejected timesheet returns to draft status. The employee can modify the timelogs and resubmit the timesheet.

An approved timesheet locks all included timelogs. The timelogs cannot be edited or deleted while part of an approved timesheet.

A timesheet cannot be rejected without providing a rejection reason. The reason must be recorded for the employee to review.

### Timelog Modification Restrictions

An employee cannot edit their own timelog if it is part of an approved timesheet. The timelog is locked once the timesheet is approved.

An employee cannot delete their own timelog if it is part of any submitted or approved timesheet. The timelog must be removed from the timesheet first.

Users with time management permission can edit or delete any employee's timelog regardless of timesheet status.

A timelog cannot be created for a project the employee is not assigned to. The employee must be a project member before logging time.

A timelog cannot reference a task that does not belong to the selected project. The task must be part of the project.

### Project Deletion Constraints

A project cannot be deleted if it has any timelogs associated with it. All timelogs must be removed or the project must be archived instead.

An archived or completed project cannot receive new timelogs. Existing timelogs on the project are preserved.

A project cannot be created without a name and color code. Both fields are required.

Project status can only be set to active, archived, or completed. Invalid status values are rejected.

### Custom Role Deletion Constraints

A custom role cannot be deleted if any employees are assigned to it. All employees must be reassigned to a different role before deletion.

Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances. These roles are protected.

A custom role cannot be created without a name and at least one permission. Both are required.

Role permissions can only be selected from the defined permission set. Invalid permissions are rejected.

### Timer Conflict Rules

An employee cannot start a new timer if they already have an active timer running. The existing timer must be stopped or discarded first.

A timer cannot be stopped without creating a timelog. The duration is calculated from start time to stop time and rounded to the nearest minute.

A timer can be discarded without creating a timelog. No time is recorded when the timer is discarded.

A running timer cannot be associated with a project the employee is not assigned to. The project must be valid for the employee.

### Contract Activation Rules

An employee can have only one active contract at any time. Creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract start date.

A contract cannot be created without a start date, pay rate, pay period, and working hours per week. All are required fields.

Past contracts (those with an end date) cannot be edited. Only the current active contract can be modified.

A contract end date cannot be earlier than the start date. This validation applies when creating or editing contracts.

### Task Assignment Validation

A task cannot be assigned to an employee who is not a member of the project. The employee must be added as a project member first.

A task cannot have a parent task that is not in the same project. Parent-child relationships are limited to the project scope.

A task cannot be assigned to itself as a parent. Circular references are not allowed.

Task status can only transition between defined states: open, in-progress, completed, closed. Invalid transitions are rejected.

Task priority can only be set to low, medium, high, or urgent. Invalid priority values are rejected.

### Employee Status and Reference Restrictions

A deactivated employee cannot log time or submit timesheets. The employee must be reactivated first.

A deactivated employee's historical timelogs and timesheets are preserved and remain viewable.

An employee invitation cannot be sent to an email that already has a pending invitation for the same organization.

A department cannot be deleted if it is referenced as a parent department by another department. The parent relationship must be removed first.

When a department is deleted, employees assigned to that department have their department set to null. The employees are not deleted.