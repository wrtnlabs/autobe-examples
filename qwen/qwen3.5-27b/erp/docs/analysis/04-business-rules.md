**hrmTimeTrack — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

An organization represents a business entity with its own employees, projects, and data. Each organization requires a unique name and can include an optional description and logo image. Organizations must specify a currency for financial reporting and a timezone for time tracking. The fiscal start month determines when the organization's fiscal year begins. Organization owners have exclusive permission to edit organization settings. An organization can only be deleted when all pending timesheets are resolved and no active employee contracts exist. When deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account persists but becomes unassociated with any organization.

### Organization Name Uniqueness

Organization names must be unique within the system.

IF an organization name already exists, THEN THE system SHALL reject the creation of a new organization with the same name.

IF an organization owner attempts to change the organization name to an existing name, THEN THE system SHALL reject the request.

Organization names are compared in a case-insensitive manner.

### Organization Currency Selection

THE system SHALL require organizations to specify a currency from available options.

THE system SHALL accept currency values such as USD, EUR, KRW, and other standard currency codes.

IF a currency is not specified during organization creation, THEN THE system SHALL reject the request.

Organization owners can change the currency setting at any time.

IF the currency is changed, THEN all future financial reports SHALL use the new currency.

Historical financial data is not automatically converted to the new currency.

### Organization Timezone Configuration

THE system SHALL require organizations to specify a timezone for time tracking purposes.

THE system SHALL accept standard timezone identifiers (e.g., UTC, America/New_York, Asia/Seoul).

IF a timezone is not specified during organization creation, THEN THE system SHALL reject the request.

Organization owners can change the timezone setting at any time.

IF the timezone is changed, THEN all time tracking displays SHALL reflect the new timezone.

Historical timelog timestamps are not modified when timezone is changed.

### Fiscal Start Month Validation

THE system SHALL require organizations to specify a fiscal start month.

THE system SHALL accept fiscal start month values between January and December (1-12).

IF a fiscal start month is not specified during organization creation, THEN THE system SHALL reject the request.

IF a fiscal start month value is outside the valid range, THEN THE system SHALL reject the request.

Organization owners can change the fiscal start month at any time.

IF the fiscal start month is changed, THEN all future fiscal period calculations SHALL use the new month.

### Organization Logo Requirements

Organizations may include an optional logo image.

IF a logo image is provided, THEN THE system SHALL validate that the image file is in a supported format.

Supported image formats include common web formats (PNG, JPG, JPEG, GIF, SVG).

IF the logo image file exceeds reasonable size limits, THEN THE system SHALL reject the upload.

Organization owners can update or remove the logo image at any time.

IF the logo image is removed, THEN THE system SHALL display a default placeholder.

### Owner Edit Permissions

ONLY organization owners SHALL have permission to edit organization settings.

Organization owners can modify the organization name, description, logo, currency, timezone, and fiscal start month.

Users without organization owner role SHALL NOT be able to access organization settings editing functionality.

IF a non-owner user attempts to edit organization settings, THEN THE system SHALL reject the request.

### Organization Deletion Prerequisites

THE system SHALL prevent organization deletion if pending timesheets exist.

THE system SHALL prevent organization deletion if active employee contracts exist.

Organization owners MUST resolve all pending timesheets before deleting the organization.

Organization owners MUST end all active employee contracts before deleting the organization.

### Pending Timesheet Resolution Requirement

IF an organization has timesheets with status "submitted" or "draft", THEN THE system SHALL block the deletion request.

IF an organization has timesheets with status "approved" or "rejected", THEN those timesheets do not block deletion.

Pending timesheets must be either approved or rejected before organization deletion is allowed.

IF a timesheet is in draft status, THEN the employee must either submit it for approval or leave it as draft (draft timesheets still block deletion).

### Active Contract Deletion Block

IF an employee has an active contract (no end date specified), THEN THE system SHALL block the deletion request.

IF all employee contracts have end dates in the past, THEN they do not block deletion.

Active contracts must have their end date set before organization deletion is allowed.

Contract end dates must be in the past or present to allow deletion.

### Permanent Data Cascade Deletion

WHEN an organization is deleted, ALL associated employees SHALL be permanently removed.

WHEN an organization is deleted, ALL associated projects SHALL be permanently removed.

WHEN an organization is deleted, ALL associated tasks SHALL be permanently removed.

WHEN an organization is deleted, ALL associated timelogs SHALL be permanently removed.

WHEN an organization is deleted, ALL associated timesheets SHALL be permanently removed.

WHEN an organization is deleted, ALL associated departments SHALL be permanently removed.

WHEN an organization is deleted, ALL associated roles SHALL be permanently removed.

WHEN an organization is deleted, ALL associated activity logs SHALL be permanently removed.

The organization owner's user account SHALL remain in the system after organization deletion.

The organization owner's user account SHALL no longer be associated with any organization after deletion.

Organization deletion is irreversible and cannot be undone.

## User Rules

Users authenticate using email and password credentials. A single user account can belong to multiple organizations simultaneously. When logging in, users must select which organization context to work within. All subsequent actions are scoped to the selected organization. Users can switch between organizations without logging out. Users can change their password at any time. If a user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account. When a user account is deleted, their employee records in other organizations are marked as deactivated. Users with pending invitations are automatically added to organizations upon signup with the invited email.

### Authentication and Credentials

WHEN a user attempts to log in, THE system SHALL require both email and password credentials.

IF the email does not match any registered account, THEN THE system SHALL reject the login attempt.

IF the password does not match the stored credentials, THEN THE system SHALL reject the login attempt.

THE system SHALL allow users to change their password at any time.

### Organization Membership and Context

THE system SHALL allow a single user account to belong to multiple organizations simultaneously.

WHEN a user logs in and belongs to multiple organizations, THE system SHALL require the user to select which organization to work within.

THE system SHALL scope all subsequent actions to the selected organization context.

THE system SHALL allow users to switch between organizations without logging out.

WHEN a user switches organization context, THE system SHALL update all subsequent actions to the newly selected organization.

IF a user attempts to access data from a different organization than their current context, THEN THE system SHALL reject the request.

THE system SHALL ensure that employees in one organization cannot see data from another organization.

### Account Deletion and Ownership

IF a user is the sole owner of an organization, THEN THE system SHALL require the user to either transfer ownership or delete the organization before allowing account deletion.

WHEN a user account is deleted, THE system SHALL mark all employee records belonging to that user in other organizations as deactivated.

IF a user attempts to delete their account while being the sole owner of an organization without transferring ownership or deleting the organization first, THEN THE system SHALL reject the deletion request.

### Invitation Handling

WHEN a user signs up with an email that has pending invitations, THE system SHALL automatically add the user to all organizations with pending invitations.

IF an invited email already has an existing account, THE system SHALL add the user to the organization immediately.

IF an invited email does not have an existing account, THE system SHALL create a pending invitation record.

WHEN a pending invitation is accepted through signup, THE system SHALL automatically assign the new user to the inviting organization.

IF multiple pending invitations exist for the same email, THEN THE system SHALL add the user to all associated organizations upon signup.

## UserProfile Rules

Each user has a global profile containing display name, avatar image, and phone number. The profile is shared across all organizations the user belongs to. Users can edit their own profile information at any time. The display name identifies the user in the organization. Avatar images provide visual identification in lists and dashboards. Phone numbers are optional contact information. Profile changes are immediately reflected across all organization contexts. The profile exists independently from organization-specific employee records.

### Global Profile Sharing

The user profile is global and shared across all organizations the user belongs to. When a user updates their profile information, the changes apply to all organization contexts simultaneously. The profile is not duplicated per organization — there is only one profile per user account. Users cannot have different display names, avatars, or phone numbers in different organizations. The profile exists at the account level, not at the organization level. When a user joins a new organization, they use their existing global profile. When a user leaves an organization, their global profile remains unchanged and available in other organizations.

### Display Name

The display name is part of the user profile. The display name identifies the user in organization contexts. The display name is visible to employees within the same organization. The display name is used in timesheet approval workflows to identify the reviewer. The display name is used in activity logs to identify who performed actions. Users can update their display name through profile editing. When the display name is updated, the change is immediately reflected across all organizations.

### Avatar Image

The avatar image is part of the user profile. The avatar image provides visual identification in lists and dashboards. The avatar image is visible to employees within the same organization. The avatar image is displayed in the employee list, project member lists, and timesheet views. Users can upload an avatar image through profile editing. Users can update their avatar image at any time. When the avatar image is updated, the change is immediately reflected across all organizations.

### Phone Number

The phone number is part of the user profile. The phone number serves as contact information for the user. The phone number is visible to employees within the same organization. Users can update their phone number through profile editing. When the phone number is updated, the change is immediately reflected across all organizations.

### Profile Editing Permissions

Users can edit their own profile information. Users cannot edit other users' profiles, even if they have administrative permissions in an organization. Profile editing is available to all authenticated users regardless of their role or permissions. Users can edit their display name, avatar image, and phone number independently. There are no restrictions on how frequently users can update their profile. Profile edits do not require approval from organization owners or managers. Users cannot delete their global profile — only their account can be deleted.

### Cross-Organization Visibility

Profile information is visible to all employees within the same organization. Users cannot see profile information from organizations they do not belong to. When a user switches organization contexts, they see their profile as it applies to that organization. The same profile information is displayed consistently across all organizations the user belongs to. Users with employee:view permission can view other employees' profiles within their organization. Profile visibility is not affected by the user's role (Owner, Manager, or Employee). Profile information is included in employee list views and project member lists.

### Profile Independence from Employee Records

The user profile exists independently from organization-specific employee records. When an employee record is deactivated, the user's global profile remains unchanged. When an employee record is deleted, the user's global profile remains unchanged. Users can have a profile without being an active employee in any organization. The profile is created when the user account is created, not when they join an organization. Employee records reference the user's profile but do not duplicate profile information. Changes to the profile do not affect the employee record's department, position, or employment type. The profile persists even if the user is removed from all organizations.

### Immediate Profile Synchronization

Profile changes are immediately reflected across all organization contexts. When a user updates their display name, the change is visible in all organizations simultaneously. When a user updates their avatar image, the change is visible in all organizations simultaneously. When a user updates their phone number, the change is visible in all organizations simultaneously. There is no delay or caching period for profile updates. Users switching organizations see the most recent profile information immediately. Activity logs record profile changes with timestamps. The system does not require users to log out and log back in to see profile changes.

## Employee Rules

Each employee record links a user account to an organization with a specific role. Employees must be assigned exactly one role within each organization. The role determines the employee's permissions and access level. Employees can have an optional department assignment and position title. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status is either active or deactivated. Only users with employee management permission can invite, edit, or deactivate employees. Deactivated employees cannot log time or submit timesheets. Deactivated employees retain their historical timelogs and timesheets. Deactivated employees can be reactivated at any time.

### Role Assignment Rules

Each employee must be assigned exactly one role within an organization. An employee cannot have multiple roles simultaneously in the same organization. The role assignment determines the employee's permissions and access level within the organization. Only users with employee management permission can assign or change role assignments for employees. When a role is changed, the employee immediately gains or loses permissions based on the new role. If a role is deleted, all employees assigned to that role must be reassigned to another role before the deletion can proceed. Role changes are recorded in the activity log with the user who made the change, the previous role, and the new role.

IF an employee is assigned to a role that does not exist, THEN the system SHALL reject the assignment and display an error. IF a user without employee management permission attempts to change a role assignment, THEN the system SHALL reject the request. IF a role deletion is attempted while employees are still assigned to it, THEN the system SHALL reject the deletion and require reassignment of all affected employees first.

### Employee Attribute Validation

Department assignment is optional for each employee. An employee may be assigned to one department or have no department assignment. When a department is deleted, all employees assigned to that department have their department set to null (no department). Employees can be filtered by department, including those with no department assignment. Position title is optional and can be any text value describing the employee's job function. Employment type must be one of four values: full-time, part-time, contractor, or intern. The employment type cannot be empty or null. Employment type changes are allowed at any time by users with employee management permission.

IF an employee is assigned to a department that does not exist, THEN the system SHALL reject the assignment. IF a user without employee management permission attempts to edit employee attributes, THEN the system SHALL reject the request. IF an employment type value is provided that is not one of the four allowed values, THEN the system SHALL reject the update.

### Employee Status and Lifecycle

Employee status is either active or deactivated. Active employees can perform all actions permitted by their role, including logging time and submitting timesheets. Deactivated employees cannot log time or submit timesheets. Deactivated employees retain all historical data including timelogs and timesheets. Deactivated employees can be reactivated at any time by users with employee management permission. When an employee is reactivated, they regain all permissions based on their assigned role. Deactivation does not delete the employee record or any associated data. Only users with employee management permission can deactivate or reactivate employees. Deactivation and reactivation actions are recorded in the activity log.

IF a deactivated employee attempts to log time, THEN the system SHALL reject the action. IF a deactivated employee attempts to submit a timesheet, THEN the system SHALL reject the action. IF a user without employee management permission attempts to deactivate or reactivate an employee, THEN the system SHALL reject the request.

## EmployeeContract Rules

Each employee can have multiple contracts throughout their employment history. Only one contract can be active at any given time. Each contract requires a start date and pay rate. The end date is optional, with null indicating an ongoing contract. Pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required for calculating expected work time. Creating a new contract automatically ends the previous active contract by setting its end date. Past contracts are immutable and cannot be edited. Only users with employee management permission can create or edit contracts. Employees can view their own contracts. Users with employee view permission can view any employee's contracts.

### Contract Validation Rules

WHEN creating an employee contract, THE system SHALL require a start date.

WHEN creating an employee contract, THE system SHALL require a pay rate.

WHEN creating an employee contract, THE system SHALL require working hours per week.

WHEN creating an employee contract, THE system SHALL require a pay period value of hourly, daily, weekly, or monthly.

WHEN creating an employee contract, THE system SHALL allow an end date to be omitted to indicate an ongoing contract.

IF the pay rate is not provided, THEN THE system SHALL reject the contract creation request.

IF the start date is not provided, THEN THE system SHALL reject the contract creation request.

IF the working hours per week is not provided, THEN THE system SHALL reject the contract creation request.

IF the pay period is not one of hourly, daily, weekly, or monthly, THEN THE system SHALL reject the contract creation request.

### Active Contract Constraints

WHILE an employee has an active contract, THE system SHALL prevent creation of another contract without ending the existing one.

WHEN creating a new contract for an employee with an active contract, THE system SHALL automatically set the end date of the previous active contract to the day before the new contract's start date.

WHEN creating a new contract, THE system SHALL ensure only one contract is active at any given time.

IF a new contract's start date overlaps with an existing active contract's period, THEN THE system SHALL reject the creation request.

### Contract Modification Rules

WHILE a contract is in the past (end date has passed), THE system SHALL prevent any modifications to that contract.

WHEN a user with employee management permission attempts to edit a past contract, THE system SHALL reject the modification request.

WHEN a user with employee management permission attempts to edit the current active contract, THE system SHALL allow the modification.

IF a user without employee management permission attempts to create or edit a contract, THEN THE system SHALL reject the request.

### Contract Visibility Rules

WHEN an employee views their own contracts, THE system SHALL display all their contracts including past and current.

WHEN a user with employee view permission views any employee's contracts, THE system SHALL display all contracts for that employee.

IF a user without employee view permission attempts to view another employee's contracts, THEN THE system SHALL reject the request.

WHEN an employee attempts to view another employee's contracts, THE system SHALL reject the request unless the employee has employee view permission.

## Department Rules

Departments organize employees within an organization. Each department has a name and optional description. Departments support one level of nesting through parent department assignment. Only users with organization management permission can create, edit, or delete departments. When a department is deleted, all employees assigned to it have their department set to null. Deleting a department does not delete the employees themselves. All employees can view the list of departments in their organization. Department names must be unique within the same parent level.

### Department Naming and Description Rules

THE system SHALL require a name for every department created within an organization.

THE system SHALL allow an optional description for each department.

THE system SHALL enforce unique department names within the same parent level. Departments at the root level (no parent) must have unique names across all root departments. Departments sharing the same parent must have unique names among siblings.

IF a department name already exists at the same parent level, THEN THE system SHALL reject the department creation or edit request.

WHERE a description is provided, THE system SHALL store it as optional metadata for the department.

### Department Nesting Rules

THE system SHALL support single-level nesting of departments. A department can have at most one parent department.

THE system SHALL allow a department to exist without a parent (root-level department).

THE system SHALL allow a department to have child departments (sub-departments).

THE system SHALL NOT allow circular parent-child relationships (a department cannot be its own ancestor).

IF a department is assigned as a parent to another department, THEN THE system SHALL prevent that parent department from being assigned as a child to a different department.

### Department Permission Rules

THE system SHALL require organization management permission to create new departments.

THE system SHALL require organization management permission to edit existing departments.

THE system SHALL require organization management permission to delete departments.

IF a user does not have organization management permission, THEN THE system SHALL reject any attempt to create, edit, or delete departments.

THE system SHALL allow all employees to view the list of departments in their organization, regardless of their role or permissions.

### Department Deletion Rules

WHEN a department is deleted, THE system SHALL set the department assignment to null for all employees currently assigned to that department.

WHEN a department is deleted, THE system SHALL NOT delete any employees who were assigned to the department.

WHEN a department is deleted, THE system SHALL preserve all historical data associated with employees who were previously assigned to the department.

### Department Visibility Rules

THE system SHALL display all departments to all employees within the same organization.

THE system SHALL organize departments in a hierarchical view showing parent-child relationships.

THE system SHALL allow employees to filter or search the department list by department name.

IF an employee belongs to an organization with no departments, THEN THE system SHALL display an empty department list.

THE system SHALL NOT display departments from other organizations, even if the user belongs to multiple organizations.

## Role Rules

Each organization maintains its own set of roles with three built-in roles that cannot be deleted. The Owner role has full access to all features and can manage roles and members. The Manager role can manage employees, projects, approve timesheets, and view reports. The Employee role can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and set of permissions. Available permissions include organization management, employee management, project management, time management, and report viewing. Custom roles can be edited by organization owners. Custom roles can only be deleted when no employees are assigned to them. Each employee is assigned exactly one role.

### Built-in Roles Definition

Each organization has three built-in roles that cannot be deleted or renamed: Owner, Manager, and Employee.

The Owner role has full access to all features within the organization, including the ability to manage roles and members.

The Manager role can manage employees, manage projects, approve timesheets, and view reports.

The Employee role can track time, submit timesheets, and view their own data only.

Built-in roles are automatically created when an organization is created and are available for assignment to employees immediately.

### Built-in Role Protection

Built-in roles (Owner, Manager, Employee) cannot be deleted from an organization.

Built-in roles cannot be renamed or have their names modified.

Built-in roles cannot have their permissions modified or customized.

If an attempt is made to delete a built-in role, the request is rejected.

If an attempt is made to edit a built-in role's permissions, the request is rejected.

### Custom Role Creation

Organization owners can create custom roles with a unique name and a set of permissions.

Custom role names must be unique within the organization.

If a custom role name already exists, the creation request is rejected.

Custom roles must have at least one permission assigned.

If no permissions are selected during custom role creation, the request is rejected.

Available permissions for custom roles include: organization management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing.

### Custom Role Modification

Organization owners can edit custom role names and permission sets.

When editing a custom role name, the new name must be unique within the organization.

If the new custom role name conflicts with an existing role name, the edit request is rejected.

Custom roles must always have at least one permission after editing.

If editing would result in a custom role with no permissions, the request is rejected.

Built-in roles cannot be edited or modified in any way.

### Role Deletion Constraints

Organization owners can delete custom roles only when no employees are assigned to that role.

If employees are assigned to a custom role, the deletion request is rejected.

Before deleting a custom role, all employees must be reassigned to a different role.

Built-in roles cannot be deleted under any circumstances.

If an attempt is made to delete a role with assigned employees, the system indicates which employees are using that role.

### Role Assignment Validation

Each employee in an organization is assigned exactly one role at all times.

When creating or editing an employee record, a role must be selected.

If no role is selected during employee creation, the request is rejected.

Role assignments can only be changed by users with employee management permission.

If a user without employee management permission attempts to change a role assignment, the request is rejected.

When an employee's role is changed, the change is recorded in the activity log.

## Project Rules

Projects represent work initiatives within an organization. Each project requires a name and color code for visual identification. Projects can have an optional description and budget hours for tracking. Project status can be active, archived, or completed. Start and end dates are optional for project planning. Only users with project management permission can create, edit, or change project status. Archived or completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Projects can only be deleted when they have no associated timelogs. Users with project view permission can view all projects.

### Project Creation Requirements

THE system SHALL require a project name when creating a project.

IF the project name is missing, THEN THE system SHALL reject the project creation request.

THE system SHALL require a color code when creating a project.

IF the color code is missing, THEN THE system SHALL reject the project creation request.

THE system SHALL allow an optional description when creating a project.

THE system SHALL allow an optional description when editing a project.

### Project Budget Rules

THE system SHALL allow an optional budget hours value when creating a project.

THE system SHALL allow an optional budget hours value when editing a project.

IF a project has no budget hours defined, THEN THE system SHALL exclude it from budget reports.

### Project Status Rules

THE system SHALL support three project status values: active, archived, and completed.

Users with project management permission can change a project's status to archived.

Users with project management permission can change a project's status to completed.

### Project Date Rules

THE system SHALL allow an optional start date when creating a project.

THE system SHALL allow an optional start date when editing a project.

THE system SHALL allow an optional end date when creating a project.

THE system SHALL allow an optional end date when editing a project.

### Archived and Completed Project Timelog Restrictions

WHILE a project status is archived, THE system SHALL prevent new timelogs from being associated with the project.

WHILE a project status is completed, THE system SHALL prevent new timelogs from being associated with the project.

THE system SHALL preserve existing timelogs when a project is archived.

THE system SHALL preserve existing timelogs when a project is completed.

### Project Deletion Rules

IF a project has associated timelogs, THEN THE system SHALL prevent project deletion.

Users with project management permission can delete a project only when no timelogs are associated with it.

IF the requested project does not exist, THEN THE system SHALL reject the deletion request.

IF the user does not have project management permission, THEN THE system SHALL reject the deletion request.

## ProjectMember Rules

Project members link employees to projects they work on. Each project membership specifies an employee, a project, and an assigned role. The assigned role is either member or project-lead. An employee can be assigned to multiple projects simultaneously. Project leads have permission to manage tasks within their project. Only users with project management permission can assign or remove employees from projects. Employees can view which projects they are assigned to. Project membership is required for employees to log time on that project.

### Employee Project Assignment

WHEN a user with project management permission assigns an employee to a project, THE system SHALL create a project membership record linking the employee to that project.

WHEN a user attempts to assign an employee who is not part of the organization, THE system SHALL reject the request.

WHEN a user attempts to assign an employee to a project that does not exist, THE system SHALL reject the request.

WHEN a user attempts to assign an employee to a project that is already archived or completed, THE system SHALL reject the request.

IF an employee is already assigned to a project, THEN THE system SHALL reject duplicate assignment requests for the same employee-project combination.

### Member and Project-Lead Roles

THE system SHALL support two project membership roles: member and project-lead.

WHEN a project membership is created, THE system SHALL assign either member or project-lead role.

THE system SHALL default to member role when no role is specified during assignment.

Project leads have the ability to manage tasks within their assigned project.

Members cannot manage tasks within projects they are assigned to.

WHEN a user changes a project member's role from member to project-lead, THE system SHALL update the role immediately.

WHEN a user changes a project member's role from project-lead to member, THE system SHALL update the role immediately.

### Multiple Project Membership

Employees can be assigned to multiple projects simultaneously.

THE system SHALL allow an employee to have unlimited project memberships.

WHEN an employee is assigned to a new project, THE system SHALL not affect existing project memberships.

THE system SHALL track each project membership independently with its own assigned role.

An employee can have different roles (member or project-lead) across different projects.

WHEN a project is archived or completed, THE system SHALL preserve the employee's membership record but prevent new time logging on that project.

### Project Lead Task Management Authority

Project leads can create tasks within their assigned project.

Project leads can edit tasks within their assigned project.

Project leads can change task status within their assigned project.

Project leads can assign tasks to project members within their assigned project.

Project leads cannot manage tasks in projects where they do not have project-lead role.

WHEN a project lead is removed from a project, THE system SHALL revoke their task management permissions for that project immediately.

### Project Management Permission Requirement

Only users with project management permission can assign employees to projects.

Only users with project management permission can remove employees from projects.

Only users with project management permission can change project member roles.

WHEN a user without project management permission attempts to assign an employee to a project, THE system SHALL reject the request.

WHEN a user without project management permission attempts to remove an employee from a project, THE system SHALL reject the request.

WHEN a user without project management permission attempts to change a project member's role, THE system SHALL reject the request.

Project leads cannot assign or remove other employees from their project, even if they have task management authority.

### Employee Project Visibility

Employees can view the list of projects they are assigned to.

Employees can view their assigned role for each project.

Employees cannot view projects they are not assigned to.

WHEN an employee is removed from a project, THE system SHALL immediately hide that project from their visible project list.

WHEN an employee is assigned to a new project, THE system SHALL immediately make that project visible in their project list.

Employees can view project details including name, description, and status for projects they are assigned to.

### Project Membership Timelog Prerequisite

Employees can only log time on projects they are assigned to.

WHEN an employee attempts to create a timelog for a project they are not assigned to, THE system SHALL reject the request.

WHEN an employee attempts to start a timer for a project they are not assigned to, THE system SHALL reject the request.

WHEN an employee attempts to associate a timelog with a task, THE system SHALL verify the employee is assigned to the project containing that task.

WHEN an employee is removed from a project, THE system SHALL prevent new timelogs on that project but preserve existing timelogs.

Employees can view their own timelogs on archived or completed projects they were previously assigned to.

### Member Removal Capability

Only users with project management permission can remove employees from projects.

WHEN a user removes an employee from a project, THE system SHALL delete the project membership record.

WHEN an employee is removed from a project, THE system SHALL preserve all historical timelogs associated with that project.

WHEN an employee is removed from a project, THE system SHALL preserve all historical task assignments within that project.

WHEN a project lead is removed from a project, THE system SHALL not automatically reassign their tasks.

WHEN an employee is removed from a project, THE system SHALL prevent them from creating new timelogs on that project.

Employees can be re-added to a project they were previously removed from by users with project management permission.

## Task Rules

Tasks represent work items within projects. Each task requires a title and can have an optional description. Task status can be open, in-progress, completed, or closed. Priority can be low, medium, high, or urgent. Estimated hours and due date are optional for planning. Tasks can be assigned to an employee who must be a project member. Tasks support one level of nesting through parent task assignment for subtasks. Only project leads or users with project management permission can create or edit tasks. Task status changes are recorded in task history. Employees can view tasks in projects they are assigned to.

### Task Title Validation

A task requires a title. The system SHALL reject task creation if the title is missing or empty. The system SHALL reject task updates that would remove the title or make it empty.

### Task Description

A task may have an optional description. The system SHALL accept task creation without a description. The system SHALL allow the description to be cleared or modified at any time.

### Task Status Values

A task status must be one of: open, in-progress, completed, or closed. The system SHALL reject task creation or updates with an invalid status value.

### Task Priority Values

A task priority must be one of: low, medium, high, or urgent. The system SHALL reject task creation or updates with an invalid priority value. The system SHALL allow priority to be changed at any time.

### Task Estimated Hours

A task may have optional estimated hours for planning purposes. The system SHALL accept task creation without estimated hours. The system SHALL allow estimated hours to be modified or cleared at any time.

### Task Due Date

A task may have an optional due date. The system SHALL accept task creation without a due date. The system SHALL allow the due date to be modified or cleared at any time.

### Task Assignment Constraints

A task may be assigned to an employee. If an employee is assigned, the system SHALL verify that the employee is a member of the project containing the task. The system SHALL reject task creation or updates that assign a non-project-member employee.

### Subtask Nesting Rules

A task may have a parent task to create a subtask relationship. The system SHALL support only one level of nesting. The system SHALL reject subtask creation if the parent task already has a parent task. A subtask must belong to the same project as its parent task.

### Task Editing Permissions

Project leads can edit tasks within their assigned projects. Users with project management permission can edit any task in the organization. The system SHALL reject task edits by users without appropriate permissions. The system SHALL reject task edits that move a task to a different project.

## TaskHistory Rules

Task history records all status changes made to tasks. Each history entry captures the timestamp when the change occurred. The entry records the old status before the change. The entry records the new status after the change. The entry records which user made the status change. Task history is automatically created when task status changes. History entries are immutable and cannot be edited or deleted. History provides audit trail for task progression. Users can view task history to understand task lifecycle.

### Task Status Change Recording

WHEN a task status changes, THE system SHALL automatically create a task history entry.

THE task history entry SHALL record the timestamp when the status change occurred.

THE task history entry SHALL record the old status before the change.

THE task history entry SHALL record the new status after the change.

THE task history entry SHALL record which user made the status change.

THE system SHALL create a history entry only when the task status actually changes.

IF a status change attempt results in the same status, THEN THE system SHALL NOT create a history entry.

### Task History Immutability and Audit Trail

THE system SHALL NOT allow editing of any task history entry after creation.

THE system SHALL NOT allow deletion of any task history entry.

THE system SHALL preserve all task history entries for the lifetime of the task.

Users with task viewing permission SHALL be able to view the complete task history.

THE task history SHALL provide a chronological audit trail of all status changes.

THE task history SHALL enable users to trace the complete lifecycle of a task from creation to closure.

## Timelog Rules

Timelogs represent individual time entries for work performed. Each timelog requires a date and duration in minutes. The timelog must be associated with a project the employee is assigned to. Task association is optional and must belong to the selected project. Description of work done is optional. The billable flag defaults to true for all timelogs. Employees can only create timelogs for themselves. Employees can edit their own timelogs only when not part of an approved timesheet. Employees can delete their own timelogs only when not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs.

### Timelog Creation Requirements

THE system SHALL require a date for every timelog entry.

THE system SHALL require a duration in minutes for every timelog entry.

THE system SHALL require project association for every timelog entry.

THE system SHALL only allow timelog creation for projects where the employee is assigned.

THE system SHALL allow optional task association with a timelog.

THE system SHALL only allow task association if the task belongs to the selected project.

THE system SHALL allow optional work description for timelog entries.

THE system SHALL set the billable flag to true by default for all new timelogs.

THE system SHALL allow users to explicitly set the billable flag to false when creating a timelog.

THE system SHALL only allow employees to create timelogs for themselves.

THE system SHALL reject timelog creation attempts for other employees.

### Timelog Modification Rules

THE system SHALL allow employees to edit their own timelogs only when the timelog is not part of an approved timesheet.

THE system SHALL reject edit attempts on timelogs that are part of approved timesheets.

THE system SHALL allow employees to delete their own timelogs only when the timelog is not part of any submitted or approved timesheet.

THE system SHALL reject deletion attempts on timelogs that are part of submitted timesheets.

THE system SHALL reject deletion attempts on timelogs that are part of approved timesheets.

THE system SHALL allow users with time management permission to edit any employee's timelogs regardless of timesheet status.

THE system SHALL allow users with time management permission to delete any employee's timelogs regardless of timesheet status.

### Timelog Validation Errors

IF a timelog is created without a date, THEN THE system SHALL reject the request.

IF a timelog is created without a duration in minutes, THEN THE system SHALL reject the request.

IF a timelog is created without project association, THEN THE system SHALL reject the request.

IF a timelog is created for a project the employee is not assigned to, THEN THE system SHALL reject the request.

IF a timelog is created with a task that does not belong to the selected project, THEN THE system SHALL reject the request.

IF an employee attempts to create a timelog for another employee, THEN THE system SHALL reject the request.

IF an employee attempts to edit a timelog that is part of an approved timesheet, THEN THE system SHALL reject the request.

IF an employee attempts to delete a timelog that is part of a submitted timesheet, THEN THE system SHALL reject the request.

IF an employee attempts to delete a timelog that is part of an approved timesheet, THEN THE system SHALL reject the request.

## Timesheet Rules

Timesheets collect timelogs for a specific week from Monday to Sunday. Each timesheet belongs to one employee and covers one week. Timesheet status can be draft, submitted, approved, or rejected. Total hours are calculated from included timelogs. Employees can create draft timesheets for specific weeks. Creating a draft automatically includes all timelogs for that employee in that week. Employees can add or remove timelogs from draft timesheets. Timesheets cannot be submitted if they have no timelogs. Timesheets cannot be submitted if another timesheet for the same week is already submitted or approved. Approved timesheets lock all included timelogs from editing or deletion. Rejected timesheets return to draft status with a required rejection reason.

### Weekly Timesheet Scope

THE system SHALL associate each timesheet with exactly one employee.

THE system SHALL associate each timesheet with exactly one week period.

THE system SHALL prevent a timesheet from spanning multiple weeks.

THE system SHALL ensure each employee can have only one timesheet per week.

### Monday Sunday Week Definition

THE system SHALL define a week as starting on Monday and ending on Sunday.

THE system SHALL calculate week start date as the Monday of the given week.

THE system SHALL calculate week end date as the Sunday of the given week.

THE system SHALL use the week start date as the primary identifier for timesheet week periods.

### Timesheet Status Enumeration

THE system SHALL support four timesheet statuses: draft, submitted, approved, and rejected.

THE system SHALL set new timesheets to draft status by default.

THE system SHALL allow timesheets to transition from draft to submitted status.

THE system SHALL allow timesheets to transition from submitted to approved status.

THE system SHALL allow timesheets to transition from submitted to rejected status.

THE system SHALL allow timesheets to transition from rejected back to draft status.

THE system SHALL prevent status transitions that are not defined in the allowed transitions.

### Automatic Timelog Inclusion

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL automatically include all timelogs for that employee in that week.

THE system SHALL include timelogs where the timelog date falls within the week start date and week end date.

THE system SHALL include all timelogs regardless of their billable status when creating a draft timesheet.

### Draft Timesheet Editing

WHILE a timesheet is in draft status, THE system SHALL allow the employee to add timelogs to the timesheet.

WHILE a timesheet is in draft status, THE system SHALL allow the employee to remove timelogs from the timesheet.

THE system SHALL allow employees to modify timelogs included in draft timesheets.

THE system SHALL recalculate total hours whenever timelogs are added, removed, or modified in a draft timesheet.

### Empty Timesheet Submission Block

IF a timesheet contains no timelogs, THEN THE system SHALL reject the submission request.

THE system SHALL prevent employees from submitting timesheets that have zero total hours.

THE system SHALL display an error message when an employee attempts to submit an empty timesheet.

### Duplicate Week Submission Block

IF another timesheet for the same employee and same week is already in submitted status, THEN THE system SHALL reject the new submission request.

IF another timesheet for the same employee and same week is already in approved status, THEN THE system SHALL reject the new submission request.

THE system SHALL allow multiple draft timesheets for the same week before any are submitted.

THE system SHALL prevent employees from submitting a second timesheet for a week that already has a submitted or approved timesheet.

### Approved Timesheet Timelog Locking

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet.

THE system SHALL prevent employees from editing timelogs that are part of an approved timesheet.

THE system SHALL prevent employees from deleting timelogs that are part of an approved timesheet.

THE system SHALL prevent employees from removing timelogs from an approved timesheet.

THE system SHALL prevent employees from adding new timelogs to an approved timesheet.

Users with time:manage permission can override the lock and edit or delete timelogs in approved timesheets.

### Rejection Reason Requirement

WHEN a user with time:approve permission rejects a timesheet, THE system SHALL require a rejection reason to be provided.

THE system SHALL reject the rejection request if no rejection reason is provided.

THE system SHALL store the rejection reason with the timesheet record.

THE system SHALL make the rejection reason visible to the employee who owns the timesheet.

### Draft Status Restoration

WHEN a timesheet is rejected, THE system SHALL automatically change the timesheet status back to draft.

WHEN a timesheet is rejected, THE system SHALL allow the employee to modify the timesheet.

WHEN a timesheet is rejected, THE system SHALL allow the employee to add or remove timelogs.

WHEN a timesheet is rejected, THE system SHALL allow the employee to resubmit the timesheet for approval.

THE system SHALL preserve the rejection reason even after the timesheet is modified and resubmitted.

## Timer Rules

Timers enable real-time time tracking for employees. Each employee can have at most one active timer at any time. Starting a timer requires selecting a project from the employee's assigned projects. Task selection is optional when starting a timer. The timer records the start timestamp, project, task, and description. Employees can stop their timer to create a timelog with calculated duration. Duration is rounded to the nearest minute when the timer stops. Employees can discard their timer without creating a timelog. Employees can view their currently running timer status. Employees can edit the description and project or task of a running timer. Timers continue running indefinitely if not stopped manually.

### Single Active Timer Constraint

WHEN an employee starts a timer, THE system SHALL ensure that no other timer is currently running for that employee.

IF an employee already has an active timer, THEN THE system SHALL prevent starting a new timer until the existing timer is stopped or discarded.

THE system SHALL allow only one active timer per employee at any given time.

### Timer Start Requirements

WHEN an employee starts a timer, THE system SHALL require selection of a project.

THE system SHALL validate that the selected project is one the employee is assigned to.

IF the employee is not assigned to any projects, THEN THE system SHALL prevent timer start and display an appropriate message.

Task selection is optional when starting a timer. Employees may start a timer with only a project selected, or with both a project and task selected.

### Timer Recording

WHEN a timer is started, THE system SHALL record the start timestamp.

THE system SHALL record the selected project, task (if provided), and description (if provided) with the timer.

THE system SHALL associate the timer with the employee who started it.

### Timer Stop and Timelog Creation

WHEN an employee stops their timer, THE system SHALL create a timelog entry.

THE system SHALL calculate the duration from the start timestamp to the stop timestamp.

THE system SHALL use the project, task, and description from the timer when creating the timelog.

THE system SHALL set the timelog date to the date when the timer was stopped.

### Duration Rounding Behavior

WHEN a timer is stopped, THE system SHALL round the calculated duration to the nearest minute.

THE system SHALL use the rounded duration when creating the timelog entry.

Durations less than 30 seconds are rounded down to zero minutes.

Durations of 30 seconds or more are rounded up to one minute.

### Timer Discard Capability

WHEN an employee discards their timer, THE system SHALL terminate the timer without creating a timelog.

THE system SHALL not record any time entry when a timer is discarded.

Employees may discard their timer at any time before stopping it.

### Running Timer Visibility

Employees can view their currently running timer status.

THE system SHALL display the timer start time, selected project, task (if any), and description (if any) for a running timer.

THE system SHALL show the elapsed time for the running timer.

Employees can only view their own running timer, not timers from other employees.

### Running Timer Editing

WHILE a timer is running, THE system SHALL allow the employee to edit the description.

WHILE a timer is running, THE system SHALL allow the employee to change the project selection.

WHILE a timer is running, THE system SHALL allow the employee to change the task selection.

THE system SHALL validate that any new project selection is one the employee is assigned to.

THE system SHALL validate that any new task selection belongs to the selected project.

### Indefinite Timer Continuation

WHILE a timer is running, THE system SHALL continue tracking time until the employee stops or discards it.

THE system SHALL not automatically stop a running timer.

THE system SHALL not impose time limits on running timers.

Timers continue running indefinitely if the employee forgets to stop them.

## ActivityLog Rules

Activity logs record significant actions performed in the organization. Each activity log entry has a timestamp indicating when the action occurred. The entry records which user performed the action. The entry records the action type performed. The entry records the target entity affected. The entry includes details about the action. Logged actions include employee invitations, deactivations, and reactivations. Contract creations and edits are logged. Project status changes and deletions are logged. Task status changes are logged. Timesheet submissions, approvals, and rejections are logged. Role assignments and changes are logged. Only users with organization management permission can view the full activity log.

### Activity Log Entry Structure

WHEN a significant action occurs in the organization, THE system SHALL record an activity log entry.

THE activity log entry SHALL include a timestamp indicating when the action occurred.

THE activity log entry SHALL record which user performed the action.

THE activity log entry SHALL categorize the action by action type.

THE activity log entry SHALL identify the target entity affected by the action.

THE activity log entry SHALL include details about the action performed.

### Employee Action Logging

WHEN an employee is invited to the organization, THE system SHALL log the action in the activity log.

WHEN an employee is deactivated, THE system SHALL log the action in the activity log.

WHEN an employee is reactivated, THE system SHALL log the action in the activity log.

### Contract Action Logging

WHEN a contract is created for an employee, THE system SHALL log the action in the activity log.

WHEN a contract is edited, THE system SHALL log the action in the activity log.

### Project Action Logging

WHEN a project is created, THE system SHALL log the action in the activity log.

WHEN a project is archived, THE system SHALL log the action in the activity log.

WHEN a project is marked as completed, THE system SHALL log the action in the activity log.

WHEN a project is deleted, THE system SHALL log the action in the activity log.

### Task Action Logging

WHEN a task status is changed, THE system SHALL log the action in the activity log.

### Timesheet Action Logging

WHEN a timesheet is submitted for approval, THE system SHALL log the action in the activity log.

WHEN a timesheet is approved, THE system SHALL log the action in the activity log.

WHEN a timesheet is rejected, THE system SHALL log the action in the activity log.

### Role Action Logging

WHEN a role is assigned to an employee, THE system SHALL log the action in the activity log.

WHEN a role is changed for an employee, THE system SHALL log the action in the activity log.

### Activity Log Access Control

IF a user does not have organization management permission, THEN THE system SHALL prevent the user from viewing the full activity log.

THE activity log SHALL be accessible only to users with organization management permission.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Employee List Filtering and Browsing

THE system SHALL allow filtering the employee list by department to display employees within a specific department.
THE system SHALL allow filtering the employee list by employment type to display employees with a specific employment type (full-time, part-time, contractor, or intern).
THE system SHALL allow filtering the employee list by status to display employees with a specific status (active or deactivated).
THE system SHALL allow searching the employee list by name to find specific employees.
THE system SHALL paginate the employee list to display results in manageable pages.
THE system SHALL require employee:view permission to view the employee list with all available filters and search functionality.

### Project List Filtering and Browsing

THE system SHALL require project:view permission to view all projects within the organization.
THE system SHALL paginate the project list to display results in manageable pages.
THE system SHALL allow filtering the project list by status to display projects with a specific status (active, archived, or completed).
THE system SHALL display archived and completed projects in the project list.
THE system SHALL prevent new timelogs from being added to archived or completed projects.

### Task List Filtering and Sorting

THE system SHALL allow employees to view tasks in projects they are assigned to.
THE system SHALL allow filtering the task list by status to display tasks with a specific status (open, in-progress, completed, or closed).
THE system SHALL allow filtering the task list by priority to display tasks with a specific priority level (low, medium, high, or urgent).
THE system SHALL allow filtering the task list by assigned employee to display tasks assigned to a specific employee.
THE system SHALL allow sorting the task list by due date to prioritize upcoming deadlines.
THE system SHALL allow sorting the task list by priority to display most urgent tasks first.
THE system SHALL allow sorting the task list by creation date to display tasks in chronological order.
THE system SHALL allow project leads to view and filter all tasks within their project.
THE system SHALL require project:manage permission to view and filter all tasks across all projects.

### Timelog List Filtering and Browsing

THE system SHALL allow employees to view their own timelogs.
THE system SHALL require time:view_all permission to view all employees' timelogs within the organization.
THE system SHALL paginate the timelog list to display results in manageable pages.
THE system SHALL allow filtering the timelog list by date range to display timelogs within a specific time period.
THE system SHALL allow filtering the timelog list by project to display timelogs associated with a specific project.
THE system SHALL allow filtering the timelog list by task to display timelogs associated with a specific task.
THE system SHALL allow filtering the timelog list by billable status to display only billable or non-billable timelogs.
THE system SHALL prevent editing or deletion of timelogs that are part of approved timesheets by employees.

### Timesheet List Filtering and Browsing

THE system SHALL allow employees to view their own timesheets.
THE system SHALL require time:approve permission to view all submitted timesheets within the organization.
THE system SHALL paginate the timesheet list to display results in manageable pages.
THE system SHALL allow filtering the timesheet list by status to display timesheets with a specific status (draft, submitted, approved, or rejected).
THE system SHALL allow filtering the timesheet list by date range to display timesheets within a specific time period.
THE system SHALL return rejected timesheets to draft status for modification and resubmission by the employee.
THE system SHALL lock all timelogs in approved timesheets from further editing or deletion.

### Activity Log Filtering and Browsing

THE system SHALL require org:manage permission to view the full activity log for the organization.
THE system SHALL paginate the activity log to display results in manageable pages.
THE system SHALL allow filtering the activity log by action type to display specific types of actions (employee invited, deactivated, reactivated, contract created, contract edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, role assigned, role changed).
THE system SHALL allow filtering the activity log by user to display actions performed by a specific user.
THE system SHALL allow filtering the activity log by date range to display actions within a specific time period.
THE system SHALL record the timestamp, user who performed the action, action type, target entity, and action details for each activity log entry.

### Pagination Behavior

THE system SHALL display paginated results with consistent page sizes across all list views.
THE system SHALL allow users to navigate between pages to view all results in filtered or unfiltered lists.
THE system SHALL apply pagination to the employee list, project list, timelog list, timesheet list, and activity log.
THE system SHALL maintain active filtering and sorting options when navigating between pages.
THE system SHALL paginate search results in the employee list when the result set exceeds the page size.
THE system SHALL display only items matching selected filter criteria on each page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Error Scenarios

WHEN an organization owner attempts to delete their organization, THE system SHALL reject the request IF any pending timesheets exist within the organization.

WHEN an organization owner attempts to delete their organization, THE system SHALL reject the request IF any active employee contracts exist within the organization.

IF the organization deletion request is rejected, THEN THE system SHALL display the specific reason for rejection (pending timesheets or active contracts).

WHEN an organization is successfully deleted, THEN THE system SHALL permanently remove all employees, projects, tasks, timelogs, and timesheets belonging to that organization.

WHEN an organization is deleted, THEN THE owner's user account SHALL remain active but SHALL no longer be associated with any organization.

### User Account Deletion Error Scenarios

WHEN a user attempts to delete their account, THE system SHALL reject the request IF the user is the sole owner of an organization without first transferring ownership or deleting the organization.

IF a user account deletion request is rejected due to sole ownership, THEN THE system SHALL require the user to either transfer organization ownership to another member or delete the organization before proceeding.

WHEN a user successfully deletes their account, THEN THE system SHALL mark all employee records belonging to that user in other organizations as deactivated.

WHEN a user deletes their account, THEN THE user SHALL lose access to all organizations they belonged to, except where their employee records remain deactivated in other organizations.

### Role and Permission Error Scenarios

WHEN an organization owner attempts to delete a custom role, THE system SHALL reject the request IF any employees are currently assigned to that role.

IF a role deletion request is rejected due to employee assignments, THEN THE system SHALL require the owner to reassign affected employees to different roles before deleting the role.

WHEN a user attempts to perform an action without the required permission, THEN THE system SHALL reject the request and indicate insufficient permissions.

WHEN a user attempts to edit organization settings without the org:manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to manage employees without the employee:manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to manage projects without the project:manage permission, THEN THE system SHALL reject the request.

WHEN a user attempts to approve timesheets without the time:approve permission, THEN THE system SHALL reject the request.

### Timesheet Rejection and Submission Failure Cases

WHEN an employee attempts to submit a timesheet, THE system SHALL reject the request IF the timesheet contains no timelogs.

WHEN an employee attempts to submit a timesheet, THE system SHALL reject the request IF another timesheet for the same week already exists with status submitted or approved.

IF a timesheet submission is rejected, THEN THE system SHALL display the specific reason for rejection.

WHEN a user with time:approve permission rejects a timesheet, THE system SHALL require a rejection reason to be provided.

WHEN a timesheet is rejected, THEN THE timesheet status SHALL change to draft and the employee SHALL be able to modify and resubmit the timesheet.

WHEN a timesheet is approved, THEN ALL timelogs included in that timesheet SHALL be locked and cannot be edited or deleted by any user.

### Timelog and Timer Error Scenarios

WHEN an employee attempts to create a timelog, THE system SHALL reject the request IF the selected project is not one the employee is assigned to.

WHEN an employee attempts to create a timelog, THE system SHALL reject the request IF the selected task does not belong to the selected project.

WHEN an employee attempts to edit a timelog, THE system SHALL reject the request IF the timelog is part of an approved timesheet.

WHEN an employee attempts to delete a timelog, THE system SHALL reject the request IF the timelog is part of any submitted or approved timesheet.

WHEN an employee attempts to start a timer, THE system SHALL reject the request IF the employee already has an active timer running.

IF an employee attempts to start a second timer, THEN THE system SHALL require stopping the current timer first.

WHEN a user without time:manage permission attempts to edit or delete another employee's timelog, THEN THE system SHALL reject the request.

### Project and Task Error Scenarios

WHEN a user attempts to delete a project, THE system SHALL reject the request IF any timelogs are associated with that project.

IF a project deletion is rejected due to existing timelogs, THEN THE system SHALL indicate that timelogs prevent deletion.

WHEN a user attempts to assign an employee to a task, THE system SHALL reject the request IF the employee is not a member of the project containing that task.

WHEN a user without project:manage permission attempts to delete a project, THEN THE system SHALL reject the request.

WHEN a user without project:manage permission or project-lead role attempts to create or edit tasks, THEN THE system SHALL reject the request.

WHEN an employee attempts to log time to an archived or completed project, THEN THE system SHALL reject the request.

### Employee Contract Error Scenarios

WHEN a user attempts to edit an employee contract, THE system SHALL reject the request IF the contract is not the current active contract.

WHEN a user attempts to create a new contract for an employee, THE system SHALL automatically end any existing active contract by setting the end date to the day before the new contract starts.

WHEN a user attempts to create a contract, THE system SHALL reject the request IF the start date is not provided.

WHEN a user attempts to create a contract, THE system SHALL reject the request IF the pay rate is not provided.

WHEN a user attempts to create a contract, THE system SHALL reject the request IF the working hours per week is not provided.

IF an employee has multiple active contracts at the same time, THEN THE system SHALL reject the contract creation request and require resolution of the conflict.

### Data Access and Isolation Error Scenarios

WHEN a user attempts to access data from an organization they do not belong to, THEN THE system SHALL reject the request.

WHEN a user belongs to multiple organizations, THEN THE system SHALL only display data from the currently selected organization context.

WHEN a user attempts to view another employee's timelogs without the time:view_all permission, THEN THE system SHALL reject the request.

WHEN a user attempts to view organization reports without the report:view permission, THEN THE system SHALL reject the request.

WHEN a deactivated employee attempts to log time or submit timesheets, THEN THE system SHALL reject the request.

WHEN a user attempts to access their own timesheet data from a different organization context, THEN THE system SHALL reject the request.