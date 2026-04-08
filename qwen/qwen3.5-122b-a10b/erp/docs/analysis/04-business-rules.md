**hrm — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Organization name is required and must be unique within the platform. Each organization must specify a valid currency code such as USD, EUR, or KRW. The timezone must be a valid timezone identifier. Fiscal start month must be a number between 1 and 12 representing January through December. Organization owners can edit all organization settings including name, description, logo, currency, timezone, and fiscal start month. An organization can only be deleted if all pending timesheets are resolved to approved or rejected status. An organization can only be deleted if there are no active employee contracts. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account remains but is no longer associated with any organization.

### Organization Name Validation

The organization name is required when creating an organization. The organization name must be unique across the platform. If the organization name is missing, the creation request is rejected. If the organization name already exists in the platform, the creation request is rejected.

### Currency Code Validation

Each organization must specify a valid currency code. Supported currency codes include USD, EUR, KRW, and other standard ISO 4217 currency codes. If an invalid currency code is provided, the request is rejected. Organization owners can update the currency code through organization settings.

### Timezone Validation

Each organization must specify a valid timezone identifier. The timezone must be a recognized IANA timezone identifier such as America/New_York, Europe/London, or Asia/Seoul. If an invalid timezone identifier is provided, the request is rejected. Organization owners can update the timezone through organization settings.

### Fiscal Start Month Range

The fiscal start month must be a number between 1 and 12, representing January through December. If a value outside this range is provided, the request is rejected. Organization owners can update the fiscal start month through organization settings.

### Organization Editing Permissions

Organization owners have full access to edit all organization settings. Organization owners can update the organization name, description, logo, currency, timezone, and fiscal start month. Non-owner members cannot edit organization settings regardless of their role permissions.

### Pending Timesheet Deletion Constraint

An organization cannot be deleted if there are any pending timesheets. All timesheets must be in either approved or rejected status before organization deletion is allowed. If pending timesheets exist, the deletion request is rejected with an error indicating that pending timesheets must be resolved first.

### Active Contract Deletion Constraint

An organization cannot be deleted if there are any active employee contracts. All employee contracts must be ended (have an end date) before organization deletion is allowed. If active contracts exist, the deletion request is rejected with an error indicating that active contracts must be resolved first.

### Organization Deletion Cascade

When an organization is deleted, all associated data is permanently removed. This includes all employees, projects, tasks, timelogs, and timesheets belonging to the organization. The deletion is irreversible and all data is immediately purged from the system.

### Owner Account Preservation

When an organization is deleted, the owner's user account remains intact but is no longer associated with any organization. The owner retains their global profile information including display name, avatar, and phone number. The owner can create a new organization or join existing organizations after deletion.

### Multi-Tenancy Data Isolation

All data is strictly isolated per organization. Employees in one organization cannot access or view data from another organization. Users who belong to multiple organizations only see data for their currently selected organization. Organization context is enforced on all data access operations.

## User Rules

Users must provide a valid email address and password during account creation. Email addresses must be unique across the platform for login purposes. Users can change their password after logging in. A single user account can belong to multiple organizations simultaneously. Users select which organization context to work in when logging in. All subsequent actions are scoped to the selected organization. Users can switch between organizations without logging out. Account deletion requires the user to transfer ownership if they are the sole owner of any organization. If a user is the sole owner of an organization, they must either transfer ownership or delete the organization before deleting their account. When a user deletes their account, their employee records in other organizations are marked as deactivated.

### Account Creation and Authentication

THE system SHALL require a valid email address for user account creation. THE system SHALL enforce email uniqueness across the entire platform—no two user accounts may share the same email address. THE system SHALL require a password during account creation. The password must meet security requirements defined by the system. WHEN a user attempts to log in, THE system SHALL validate the provided email and password against stored credentials. IF the email does not exist or the password is incorrect, THE system SHALL reject the login attempt. IF the email format is invalid, THE system SHALL reject the registration request.

### Password Management

A registered user SHALL be able to change their password after logging in. THE system SHALL require the user to provide their current password before accepting a password change request. THE system SHALL validate that the new password meets security requirements. IF the current password is incorrect, THE system SHALL reject the password change request. THE new password SHALL be different from the current password.

### Organization Membership and Context

A user SHALL be able to belong to multiple organizations simultaneously. WHEN a user logs in, THE system SHALL require the user to select one organization as the active context. ALL subsequent actions performed by the user SHALL be scoped to the selected organization. THE user SHALL be able to switch between organizations without logging out. WHEN the user switches organizations, THE system SHALL update the active context to the newly selected organization. ALL data accessed or modified SHALL be from the currently selected organization only.

### Sole Owner Deletion Constraint

IF a user is the sole owner of an organization, THE system SHALL prevent the user from deleting their account. THE user SHALL be required to either transfer ownership of the organization to another member or delete the organization before proceeding with account deletion. IF the user transfers ownership, the new owner becomes responsible for the organization. IF the user deletes the organization, all associated data (employees, projects, tasks, timelogs, timesheets) is permanently deleted, and the user's account may then be deleted.

### Account Deletion Cascade Effects

WHEN a user deletes their account, THE system SHALL mark all their employee records in other organizations as deactivated. Deactivated employee records preserve historical data (timelogs, timesheets, contracts) but prevent the user from logging time or submitting timesheets in those organizations. The user's global profile data (display name, avatar, phone number) is removed from the system. The user's organization ownership records are removed, and any organizations they owned become orphaned unless ownership was transferred prior to deletion.

## Employee Rules

Each employee record must reference an existing user account. Each employee in an organization is assigned exactly one role. The role assignment can be changed by users with employee management permission. Department and position fields are optional and can be null. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status must be either active or deactivated. Deactivated employees cannot log time or submit timesheets. Deactivated employees' historical timelogs and timesheets are preserved. Deactivated employees can be reactivated by users with employee management permission. Employee records are paginated when browsing the list. Employees can filter the list by department, employment type, and status.

### Employee Record Validation

THE system SHALL require each employee record to reference an existing user account.

THE system SHALL enforce exactly one role assignment per employee within an organization.

WHEN an employee record references a non-existent user account, THE system SHALL reject the record as invalid.

WHEN an attempt is made to assign a second role to an existing employee, THE system SHALL reject the request.

### Employment Attribute Constraints

THE system SHALL allow department and position fields to be optional or null.

THE system SHALL require employment type to be one of: full-time, part-time, contractor, or intern.

THE system SHALL require employee status to be one of: active or deactivated.

WHEN an employment type value outside the allowed enumeration is provided, THE system SHALL reject the request.

WHEN an employee status value outside the allowed enumeration is provided, THE system SHALL reject the request.

### Deactivated Employee Restrictions

WHILE an employee is deactivated, THE system SHALL prevent the employee from logging time entries.

WHILE an employee is deactivated, THE system SHALL prevent the employee from submitting timesheets.

WHILE an employee is deactivated, THE system SHALL prevent assignment to new projects.

WHILE an employee is deactivated, THE system SHALL prevent assignment to new tasks.

WHEN a user with employee management permission requests to deactivate an employee, THE system SHALL process the deactivation.

### Historical Data Preservation

THE system SHALL preserve deactivated employees' historical timelogs for reporting and review.

THE system SHALL preserve deactivated employees' historical timesheets for reporting and review.

THE system SHALL preserve deactivated employees' historical project assignments.

THE system SHALL preserve deactivated employees' historical task assignments.

THE system SHALL preserve deactivated employees' historical contracts and keep them viewable.

### Employee Reactivation Rules

WHEN a user with employee management permission requests to reactivate a deactivated employee, THE system SHALL process the reactivation.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to log time entries.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to submit timesheets.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to be assigned to projects and tasks.

THE system SHALL NOT modify the employee's role assignment upon reactivation.

### Role Assignment and Modification

WHEN a user with employee management permission requests to change an employee's role, THE system SHALL process the role change.

THE system SHALL apply role changes immediately upon completion.

THE system SHALL record role changes in the activity log for audit purposes.

WHEN a user without employee management permission requests to change a role assignment, THE system SHALL reject the request.

WHEN an attempt is made to assign a role that does not exist within the organization, THE system SHALL reject the request.

## Role Rules

Each organization has its own set of roles that are independent from other organizations. Three built-in roles exist: Owner, Manager, and Employee. Built-in roles cannot be deleted under any circumstances. Organization owners can create custom roles with custom names. Each custom role must have a name and a set of permissions. Available permissions are predefined and cannot be extended. Organization owners can edit custom role names and permissions. Custom roles can only be deleted if no employees are assigned to them. Each employee in an organization is assigned exactly one role. Role assignment changes require employee management permission.

### Organization Role Isolation

THE system SHALL isolate roles by organization. WHEN a role is defined in an organization, THE system SHALL restrict its visibility and usability to that organization only. WHEN a user belongs to multiple organizations, THE system SHALL determine the user's role separately for each organization. THE system SHALL scope all role permissions and assignments exclusively to the selected organization context.

### Built-in Role Existence

THE system SHALL automatically create three built-in roles for every organization: Owner, Manager, and Employee. THE system SHALL maintain these built-in roles in all organizations regardless of whether they are actively used. THE system SHALL preserve the core identity of built-in roles and prevent renaming or modification of their fundamental definition.

### Built-in Role Deletion Prohibition

THE system SHALL prohibit deletion of the Owner, Manager, and Employee built-in roles under all circumstances. WHEN a deletion request is made for a built-in role, THE system SHALL reject the request. THE system SHALL allow deletion only for custom roles created by organization owners.

### Custom Role Creation

WHEN an organization owner requests to create a custom role, THE system SHALL create the custom role within that organization. THE system SHALL ensure custom roles are independent of built-in roles and exist alongside them. THE system SHALL scope all custom roles to their defining organization only.

### Custom Role Name Requirement

THE system SHALL require a name for every custom role. WHEN a custom role is created without a name, THE system SHALL reject the request. THE system SHALL enforce name uniqueness within each organization. WHEN duplicate names are detected, THE system SHALL reject the custom role creation request.

### Permission Set Assignment

THE system SHALL require each custom role to be assigned a set of permissions from the predefined permission list. THE system SHALL prevent creation or extension of permissions beyond the available set. THE available permissions SHALL include: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. THE system SHALL allow a custom role to have one or more permissions, or potentially no permissions.

### Custom Role Editing Permissions

WHEN an organization owner requests to edit a custom role, THE system SHALL allow modification of the role name and assigned permissions. WHEN a user without organization owner status requests to edit any role, THE system SHALL reject the request. THE system SHALL restrict role editing to organization owners only.

### Custom Role Deletion Constraint

THE system SHALL allow deletion of custom roles only when no employees are currently assigned to them. WHEN a deletion request is made for a custom role with assigned employees, THE system SHALL reject the request. THE system SHALL verify employee assignments before allowing role deletion.

### Single Role Per Employee

THE system SHALL assign exactly one role to each employee in an organization at any given time. THE system SHALL prevent an employee from having multiple roles simultaneously. WHEN an employee is added to an organization, THE system SHALL require a role assignment. THE system SHALL grant the employee all permissions from their assigned role.

### Role Change Permissions

WHEN a user requests to change an employee's role assignment, THE system SHALL require the employee:manage permission. THE system SHALL restrict role modifications to users with employee:manage permission only. WHEN a role change is made, THE system SHALL apply the change immediately and update all permissions for that employee within the organization.

## Contract Rules

Each contract must have a required start date. The pay rate is required and must be a numeric value. The pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required. Notes are optional and can be null. Only one contract can be active at a time for each employee. Creating a new contract automatically ends the previous active contract by setting its end date. The end date of the previous contract is set to the day before the new contract start date. Past contracts with end dates cannot be edited and are immutable historical records. Only the current active contract can be edited by users with employee management permission. Employees can view their own contracts. Users with employee view permission can view any employee's contracts.

### Contract Field Requirements

Every contract must have a start date, which is required and cannot be null or empty. This date marks when the employment relationship begins and is used to calculate contract duration and determine active periods.

The pay rate is a required field for every contract. It must be a positive numeric value representing the compensation amount for the employee. Contracts without a pay rate or with invalid values are rejected.

The pay period must be exactly one of the following values: hourly, daily, weekly, or monthly. This value determines how the pay rate is applied for compensation calculations. Any other value is rejected.

Working hours per week is a required numeric field for every contract. It specifies the expected number of working hours for the employee and is used for workload planning and capacity calculations. Invalid or missing values are rejected.

The notes field is optional and may be left empty or contain any text. Notes provide additional context about the contract terms but do not affect validation, business logic, or calculations.

### Single Active Contract Constraint

Each employee can have only one active contract at any given time. An active contract is defined as one with a start date but no end date. When creating a new contract for an employee who already has an active contract, the system enforces this constraint by automatically terminating the previous contract.

When a new contract is created for an employee who already has an active contract, the system automatically terminates the previous active contract. This ensures the single active contract constraint is maintained without requiring manual intervention.

When terminating a previous active contract due to a new contract creation, the end date is set to the day before the new contract's start date. This creates a continuous employment record without gaps or overlapping periods between contracts.

### Contract Editing and Viewing Rules

Contracts that have an end date (past contracts) are immutable and cannot be edited, modified, or deleted. This preserves the historical record of employment terms and ensures audit trail integrity. Only contracts without an end date (active contracts) may be modified.

Only users with employee management permission can create new contracts and edit the current active contract (as defined in 01-actors-and-auth). Employees can view their own contracts. Users with employee view permission can view any employee's contracts within the organization. Past contracts with end dates cannot be edited by any user.

## Department Rules

Each department must have a required name. Department description is optional and can be null. Departments can have an optional parent department for one level of nesting. Only one level of parent-child relationship is allowed. Users with organization management permission can create, edit, and delete departments. Deleting a department sets all employees' department field to null. Deleting a department does not delete the employees themselves. Employees can view the list of departments. Department names should be unique within the organization.

### Department Naming Rules

Every department must have a name. The name is required and cannot be empty.

Department names must be unique within an organization. Two departments in the same organization cannot share the same name.

When a department name is missing or empty during creation, the request is rejected. When a duplicate department name is detected within the organization, the request is rejected.

### Department Description Rules

A department may have a description that provides additional context about the department's purpose or scope.

The description field is optional and can be left empty or null.

Users can update the description at any time without restrictions.

### Department Hierarchy Rules

Departments can be organized hierarchically using a parent department relationship.

A department can have at most one parent department. A department cannot be its own parent.

Only one level of nesting is permitted. A parent department cannot itself have a parent department. This means departments exist at either the root level or as direct children of a root department.

When a parent department is assigned, the system validates that the parent does not already have a parent, rejecting the request if this constraint would be violated.

### Department Management Permissions

Users with organization management permission can create new departments within their organization.

Users with organization management permission can edit existing department properties, including name, description, and parent department.

Users with organization management permission can delete departments. Before deletion, the system validates that no constraints prevent deletion.

### Department Deletion Impact

When a department is deleted, all employees assigned to that department have their department field set to null.

The deletion of a department does not affect employee records themselves. Employees remain active in the organization with their other attributes preserved.

The department nullification occurs automatically as part of the deletion process and cannot be undone.

### Department Viewing Rules

All employees within an organization can view the list of departments.

The department list includes department name, description, and parent department relationship where applicable.

Department visibility is not restricted by role or permission. Any authenticated member of the organization can browse available departments.

## Project Rules

Each project must have a required name. Project description is optional and can be null. Color code is required for UI display purposes. Project status must be one of: active, archived, or completed. Budget hours is optional and can be null. Start date and end date are optional. Users with project management permission can create and edit projects. Users with project management permission can archive or complete projects. Archived and completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Projects can only be deleted if they have no timelogs associated with them. The project list is paginated and can be filtered by status.

### Project Field Validation

A project must have a name, which is required and cannot be empty. The project description is optional and may be left blank or null. A color code is required for UI display purposes and must be provided when creating or editing a project. The project status must be one of: active, archived, or completed. Budget hours is optional and can be null when not specified. Start date and end date are optional fields that may be set when creating or editing a project.

### Project Creation and Status Change Permissions

Users with project management permission can create new projects. Users with project management permission can edit project name, description, color code, budget hours, start date, and end date. Users with project management permission can change the project status to archived or completed. Status changes are permanent and cannot be reversed to active once a project is archived or completed.

### Archived and Completed Project Timelog Restrictions

Archived projects cannot receive new timelogs. Completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved and remain visible in reports and timesheets. Employees assigned to archived or completed projects cannot log additional time against these projects.

### Project Deletion Constraints

A project can only be deleted if it has no timelogs associated with it. If any timelog exists for the project, the deletion request is rejected. Users with project management permission must verify that all timelogs have been removed or transferred before attempting to delete a project. Project deletion permanently removes the project and all associated tasks, but does not affect timelogs from other projects.

## ProjectMember Rules

Each project membership must reference an employee who belongs to the organization. Each project membership must reference an existing project. Each project membership has an assigned role that is either member or project-lead. An employee can be assigned to multiple projects. Each project membership is unique for the employee and project combination. Project leads can manage tasks within their assigned project. Users with project management permission can remove employees from projects. Employees can view which projects they are assigned to. Project membership changes require project management permissions.

### Project Membership Validation

Each project membership must reference a valid employee record. The employee must belong to the same organization as the project. If the employee does not exist or does not belong to the organization, the membership creation is rejected.

Each project membership must reference a valid project. The project must belong to the same organization as the employee. If the project does not exist or does not belong to the organization, the membership creation is rejected.

The employee and project combination must be unique within an organization. An employee cannot be assigned to the same project more than once. If a duplicate membership is attempted, the request is rejected.

### Membership Role and Assignment Constraints

Each project membership has an assigned role that must be either "member" or "project-lead". No other role values are permitted.

An employee can be assigned to multiple projects within the same organization. There is no limit on the number of projects an employee can join.

An employee can have multiple project memberships, each with their own assigned role. The same employee can be a project-lead in one project and a member in another project.

### Membership Management Permissions

Users with project management permission can assign employees to projects. This requires both employee-view and project-view permissions to identify valid targets.

Users with project management permission can remove employees from projects. When an employee is removed, all their task assignments within that project are unaffected but the employee loses project access.

Project membership changes (assignment, role change, removal) require project management permission. Users without this permission cannot modify project memberships.

### Project Lead Task Permissions

Project leads can manage tasks within their assigned project. This includes creating, editing, and managing task status for tasks in their project.

Project leads cannot manage tasks in projects where they are assigned as a regular member. Task management is limited to projects where the user has the project-lead role.

Users with project management permission can manage tasks in any project within the organization, regardless of their project membership role.

### Project Assignment Visibility

Employees can view which projects they are assigned to. This includes viewing their own project memberships and their assigned role in each project.

Employees can view the list of all projects in the organization if they have project-view permission, but they can only see their own membership details.

Project membership visibility is scoped to the employee's organization context. Employees cannot see project memberships from other organizations.

## Task Rules

Each task must have a required title. Task description is optional and can be null. Task status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Estimated hours is optional and can be null. Due date is optional and can be null. Assigned employee must be a project member if specified. Tasks can have an optional parent task for subtasks with one level of nesting only. Task status changes are recorded in task history with timestamp, old status, new status, and who made the change. Project leads can edit tasks in their project. Users with project management permission can edit any task.

### Task Creation and Attributes

THE system SHALL require a title for every task at creation time.

THE system SHALL reject task creation if the title is missing or empty.

THE system SHALL allow an optional description for each task.

THE system SHALL allow the description to be null or omitted.

THE system SHALL allow an optional estimated hours value for each task.

THE system SHALL allow the estimated hours to be null or omitted.

THE system SHALL allow an optional due date for each task.

THE system SHALL allow the due date to be null or omitted.

### Task Status and Priority Values

THE system SHALL restrict task status to one of the following values: open, in-progress, completed, or closed.

THE system SHALL restrict task priority to one of the following values: low, medium, high, or urgent.

WHEN a task is created, THE system SHALL set the initial status to open.

WHEN a task is created, THE system SHALL set the initial priority to medium.

### Task Assignment and Hierarchy Rules

THE system SHALL require that an assigned employee must be a member of the task's project.

THE system SHALL reject task assignment if the employee is not a project member.

THE system SHALL allow a task to have no assigned employee.

THE system SHALL allow tasks to have an optional parent task for subtask relationships.

THE system SHALL restrict parent task nesting to one level only.

THE system SHALL reject assignment of a parent task to a task that already has a parent task.

THE system SHALL allow a task without a parent task to be a top-level task.

### Task Status History Recording

THE system SHALL record every task status change in the task history.

THE system SHALL record the timestamp of each status change.

THE system SHALL record the previous status for each status change.

THE system SHALL record the new status for each status change.

THE system SHALL record the person who made each status change.

THE system SHALL make task history immutable once recorded.

### Task Editing Permissions

THE system SHALL allow project leads to edit tasks within their assigned projects.

THE system SHALL allow users with project management permission to edit any task in the organization.

THE system SHALL reject task editing by users without appropriate permissions.

WHEN a task status is changed, THE system SHALL automatically record the change in task history.

## Timelog Rules

Each timelog must have a required date. Duration in minutes is required and must be a positive value. Project is required and the employee must be assigned to that project. Task is optional but must belong to the selected project if specified. Description is optional and can be null. Billable flag defaults to true. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs. Timelogs are paginated and can be filtered by date range, project, task, and billable status.

### Timelog Entry Requirements

Each timelog must have a date indicating when the work was performed. The date is required and cannot be null or empty.

Duration must be specified in minutes and must be a positive value. Zero or negative durations are not permitted.

A project must be associated with each timelog. The employee creating the timelog must be assigned to the selected project. Timelogs cannot be created for projects where the employee has no membership.

Task association is optional. When a task is specified, it must belong to the selected project. Timelogs cannot reference tasks from different projects.

Description is optional and may be left blank when no additional context is needed.

The billable flag indicates whether the time entry is billable to a client. If not explicitly set, it defaults to true (billable).

### Timelog Creation Ownership

Employees can only create timelogs for themselves. An employee cannot log time on behalf of another employee.

Each timelog is automatically associated with the employee who created it. The system enforces this ownership at creation time.

### Timelog Modification Restrictions

Employees can edit their own timelogs only when the timelog is not part of an approved timesheet. Once a timelog is included in an approved timesheet, it becomes locked and cannot be modified.

Employees can delete their own timelogs only when the timelog is not part of any submitted or approved timesheet. Timelogs in draft timesheets can be deleted, but timelogs in submitted or approved timesheets cannot be deleted until the timesheet status changes.

### Administrative Override Permissions

Users with the time management permission can edit or delete any employee's timelogs, regardless of timesheet status. This permission overrides the standard restrictions that apply to employees.

Users with the time management permission can modify timelogs that are part of approved timesheets, including changing the date, duration, project, task, description, or billable flag.

### Timelog Browsing and Filtering

Timelog lists support pagination to handle large volumes of entries.

Timelogs can be filtered by date range to view entries within a specific period.

Timelogs can be filtered by project to view all time logged on a particular project.

Timelogs can be filtered by task to view time logged on specific tasks.

Timelogs can be filtered by billable status to separate billable from non-billable entries.

## Timesheet Rules

Each timesheet is tied to a specific week from Monday to Sunday. Each timesheet must have an employee owner. Week start date must be a Monday and week end date must be the following Sunday. Timesheet status must be one of: draft, submitted, approved, or rejected. Total hours is calculated from included timelogs. Submitted at timestamp is recorded when submitted. Reviewed at timestamp is recorded when approved or rejected. Reviewed by records the user who approved or rejected. Rejection reason is required when rejecting a timesheet. A timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Approved timesheets lock all included timelogs from editing or deletion.

### Week Definition and Employee Ownership

A timesheet is associated with exactly one employee who owns it. The employee owner must be active in the organization at the time of timesheet creation.

A timesheet covers a single week period. The week starts on Monday and ends on the following Sunday. The week start date must always be a Monday, and the week end date must always be the corresponding Sunday.

When a timesheet is created, the system SHALL assign the employee owner to the timesheet. The employee owner cannot be changed after timesheet creation.

### Timesheet Status Transitions

A timesheet status must be one of: draft, submitted, approved, or rejected.

WHEN a timesheet is created, THE system SHALL set its status to draft.
WHEN a timesheet is submitted for approval, THE system SHALL set its status to submitted and record the submission timestamp.
WHEN a timesheet is approved, THE system SHALL set its status to approved and record the approval timestamp and the user who approved it.
WHEN a timesheet is rejected, THE system SHALL return its status to draft, record the rejection timestamp, the user who rejected it, and the rejection reason.

IF a timesheet has status approved, THEN the system SHALL prevent editing or deletion of all timelogs included in that timesheet.
IF a timesheet has status draft or rejected, THEN the system SHALL allow the employee to modify and resubmit the timesheet.

### Submission Validation Rules

The total hours of a timesheet SHALL be calculated by summing the duration of all timelogs included in the timesheet.

A timesheet SHALL NOT be submitted if it contains no timelogs. The submission request SHALL be rejected.

A timesheet SHALL NOT be submitted if another timesheet for the same employee and the same week (Monday to Sunday period) already exists with status submitted or approved. The submission request SHALL be rejected.

### Review Recording Requirements

WHEN a timesheet is approved or rejected, THE system SHALL record the timestamp of the review action.

WHEN a timesheet is approved or rejected, THE system SHALL record the user who performed the approval or rejection.

WHEN a timesheet is rejected, THE system SHALL require a rejection reason to be provided. The rejection reason SHALL be stored with the timesheet.

## ActivityLog Rules

Each activity log entry must have a timestamp recording when the action occurred. Each activity log entry must record the user who performed the action. Each activity log entry must have an action type from predefined types. Each activity log entry must have a target entity reference. Each activity log entry must include details about the action. Logged action types include employee invite, deactivate, reactivate, contract create, contract edit, project create, project archive, project complete, project delete, task status change, timesheet submit, timesheet approve, timesheet reject, and role assignment changes. Users with organization management permission can view the full activity log. The activity log is paginated and can be filtered by action type, user, and date range.

### Activity Log Entry Requirements

THE system SHALL record the exact timestamp when each action occurred for every activity log entry.
THE system SHALL record the user who performed the action for every activity log entry.
THE system SHALL record an action type from a predefined enumeration for every activity log entry.
THE system SHALL record the target entity that was affected by the action for every activity log entry.
THE system SHALL include descriptive details about the action for every activity log entry.

### Employee Action Logging

WHEN an employee is invited to an organization, THE system SHALL record an activity log entry with the inviting user, the invited email address, and the organization.
WHEN an employee is deactivated, THE system SHALL record an activity log entry with the deactivating user, the deactivated employee, and the organization.
WHEN a deactivated employee is reactivated, THE system SHALL record an activity log entry with the reactivating user, the reactivated employee, and the organization.
THE system SHALL NOT create activity log entries for viewing or browsing employee data.

### Contract Action Logging

WHEN a contract is created for an employee, THE system SHALL record an activity log entry with the creating user, the employee, the contract start date, and the organization.
WHEN an active contract is edited, THE system SHALL record an activity log entry with the editing user, the employee, the modified fields, and the organization.
THE system SHALL NOT create activity log entries for viewing employee contracts.
THE system SHALL NOT create activity log entries for past contracts that are immutable historical records.

### Project Action Logging

WHEN a project is created, THE system SHALL record an activity log entry with the creating user, the project name, and the organization.
WHEN a project is archived, THE system SHALL record an activity log entry with the archiving user, the project name, and the organization.
WHEN a project is marked as completed, THE system SHALL record an activity log entry with the completing user, the project name, and the organization.
WHEN a project is deleted, THE system SHALL record an activity log entry with the deleting user, the project name, and the organization.
THE system SHALL NOT create activity log entries for viewing or browsing project data.

### Task Action Logging

WHEN a task status changes, THE system SHALL record an activity log entry with the timestamp, the user who changed the status, the task title, the previous status, and the new status.
THE system SHALL record exactly one activity log entry for each status change.
THE system SHALL NOT create activity log entries for viewing tasks.
THE system SHALL NOT create activity log entries for task attribute changes such as description updates or assignment changes.

### Timesheet Action Logging

WHEN an employee submits a timesheet for approval, THE system SHALL record an activity log entry with the submitting employee, the week period, and the organization.
WHEN a timesheet is approved, THE system SHALL record an activity log entry with the approving user, the employee who owns the timesheet, the week period, and the organization.
WHEN a timesheet is rejected, THE system SHALL record an activity log entry with the rejecting user, the employee who owns the timesheet, the week period, the rejection reason, and the organization.
THE system SHALL NOT create activity log entries for viewing or browsing timesheet data.

### Role Assignment Logging

WHEN a role is assigned to an employee, THE system SHALL record an activity log entry with the assigning user, the employee, the role name, and the organization.
WHEN an employee's role is changed, THE system SHALL record an activity log entry with the changing user, the employee, the previous role, the new role, and the organization.
THE system SHALL NOT create activity log entries for viewing employee roles.
THE system SHALL NOT create activity log entries for browsing role definitions.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Pagination Support

THE system SHALL support pagination for the following lists:

- Employee list
- Project list
- Timelog list
- Timesheet list
- Activity log list

THE system SHALL return paginated results when users request these lists.

THE system SHALL allow users to navigate through pages to view all available records.

### Employee List Browsing

WHEN users request the employee list, THE system SHALL support filtering by:

- Department: Filter employees by their assigned department
- Employment type: Filter by full-time, part-time, contractor, or intern
- Status: Filter by active or deactivated status
- Name: Search employees by name

THE system SHALL allow multiple filters to be combined.

THE system SHALL return filtered results in paginated form.

### Project List Browsing

WHEN users request the project list, THE system SHALL support filtering by:

- Status: Filter by active, archived, or completed

THE system SHALL return filtered results in paginated form.

### Task List Browsing

WHEN users request the task list, THE system SHALL support filtering by:

- Status: Filter by open, in-progress, completed, or closed
- Priority: Filter by low, medium, high, or urgent
- Assigned employee: Filter by the employee assigned to the task

WHEN users request the task list, THE system SHALL support sorting by:

- Due date
- Priority
- Creation date

THE system SHALL allow multiple filters to be combined.

THE system SHALL apply sorting to the filtered results.

### Timelog List Browsing

WHEN users request the timelog list, THE system SHALL support filtering by:

- Date range: Filter timelogs by a start and end date
- Project: Filter timelogs by project
- Task: Filter timelogs by task
- Billable status: Filter by billable or non-billable

THE system SHALL return filtered results in paginated form.

### Timesheet List Browsing

WHEN users request the timesheet list, THE system SHALL support filtering by:

- Status: Filter by draft, submitted, approved, or rejected
- Date range: Filter timesheets by a start and end date

THE system SHALL return filtered results in paginated form.

### Activity Log Browsing

WHEN users request the activity log list, THE system SHALL support filtering by:

- Action type: Filter by specific action types
- User: Filter by the user who performed the action
- Date range: Filter by timestamp range

THE system SHALL return filtered results in paginated form.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Constraints

An organization cannot be deleted if there are pending timesheets that have not been approved or rejected. All pending timesheets must be resolved before deletion is allowed.

An organization cannot be deleted if there are active employee contracts. All contracts must be ended (with an end date set) before deletion is allowed.

When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account remains but is no longer associated with any organization.

### User Account Deletion Constraints

A user cannot delete their account if they are the sole owner of an organization. They must either transfer ownership to another employee or delete the organization first.

When a user deletes their account, their employee records in other organizations are marked as deactivated. Their historical data (timelogs, timesheets, contracts) is preserved in those organizations.

### Role Deletion Constraints

A custom role cannot be deleted if any employees are assigned to it. All employees must be reassigned to a different role before the custom role can be deleted.

Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances.

### Contract Editing Constraints

A past contract (one with an end date already set) cannot be edited. Only the current active contract can be modified.

When a new contract is created for an employee, the previous active contract is automatically ended with its end date set to the day before the new contract's start date.

### Project Management Constraints

A project cannot be deleted if it has any timelogs associated with it. All timelogs must be removed or the project must be archived instead.

Archived or completed projects cannot receive new timelogs. Existing timelogs on such projects remain preserved and viewable.

A project must have a name and a color code. Projects without these required fields cannot be created.

### Task Assignment Constraints

A task cannot be assigned to an employee who is not a member of the project. Only project members can be assigned tasks within that project.

A subtask cannot have another subtask as its parent. Only one level of task nesting is allowed.

### Timelog Creation Constraints

A timelog cannot be created without a date, a duration in minutes, and a project assignment.

A timelog's task must belong to the selected project. Timelogs cannot reference tasks from other projects.

An employee can only create timelogs for themselves. They cannot log time on behalf of other employees.

### Timelog Edit and Delete Constraints

An employee cannot edit their own timelog if it is part of an approved timesheet. Approved timelogs are locked and cannot be modified.

An employee cannot delete their own timelog if it is part of any submitted or approved timesheet. Timelogs in submitted (but not yet approved) timesheets are also protected from deletion.

### Timesheet Submission Constraints

A timesheet cannot be submitted for approval if it contains no timelogs. At least one timelog must be included.

A timesheet cannot be submitted if another timesheet for the same week (Monday to Sunday) already exists in submitted or approved status. Only one timesheet per week per employee is allowed.

A timesheet must be in draft status before it can be submitted. Submitted, approved, or rejected timesheets cannot be resubmitted without first being returned to draft status.

### Timesheet Rejection Rules

When rejecting a timesheet, a rejection reason must be provided. Timesheets cannot be rejected without explaining why.

Rejected timesheets return to draft status, allowing the employee to modify and resubmit them.

### Timer Operation Constraints

An employee can have at most one active timer running at any time. Starting a new timer while another is active is not allowed.

A timer requires a project selection. Starting a timer without selecting a project is not allowed.

### Access Control Constraints

An employee cannot log time on a project they are not assigned to. Project membership is required before timelogs can be created.

An employee cannot view or access data from organizations they do not belong to. All data is strictly isolated per organization.

### Data Browsing Pagination Rules

Employee list results are paginated. Users must request specific page numbers or page sizes to retrieve all employees.

Project list results are paginated. Users must request specific page numbers or page sizes to retrieve all projects.

Timelog list results are paginated. Users must request specific page numbers or page sizes to retrieve all timelogs.

Timesheet list results are paginated. Users must request specific page numbers or page sizes to retrieve all timesheets.

Activity log results are paginated. Users must request specific page numbers or page sizes to retrieve all activity entries.

### Filter Validation Rules

The employee list can be filtered by department, employment type, and status. Invalid filter values are rejected.

The project list can be filtered by status. Invalid status values are rejected.

The timelog list can be filtered by date range, project, task, and billable status. Invalid filter values are rejected.

The timesheet list can be filtered by status and date range. Invalid filter values are rejected.

The activity log can be filtered by action type, user, and date range. Invalid filter values are rejected.