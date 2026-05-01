**erpHrm — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

An organization is created when a user completes initial sign-up, providing a name, description, logo image, currency, timezone, and fiscal start month. The creating user automatically becomes the organization owner with full access. Organization owners can edit all organization settings at any time, including changing the name, description, logo, currency, timezone, or fiscal start month. Editing currency does not retroactively alter historical financial records. An organization can only be deleted by its owner, and only when all pending timesheets across the organization have been resolved — meaning every timesheet is either approved or rejected. Additionally, there must be no active employee contracts at the time of deletion. When an organization is deleted, all associated data is permanently removed: every employee record, project, task, timelog, and timesheet belonging to that organization is erased. The owner's user account survives deletion and can be used to create or join other organizations. Every organization operates in complete isolation from others; data from one organization is never visible to members of another organization.

### Organization Creation During Sign-Up

THE system SHALL create an organization when a user completes the initial sign-up process, requiring the user to provide an organization name and a description.

THE system SHALL allow the user to upload a logo image for the organization during sign-up.

THE system SHALL require the user to select a currency for the organization from supported currency codes such as USD, EUR, and KRW.

THE system SHALL require the user to set the organization's timezone during sign-up.

THE system SHALL require the user to define a fiscal start month — a numeric month value from 1 to 12 — for the organization during sign-up.

WHEN the organization is created, THE system SHALL automatically assign the creating user as the organization owner with the built-in Owner role, granting full access to all features of that organization.

### Editing Organization Settings

THE system SHALL allow the organization owner to edit all organization settings at any time, including the organization name, description, logo image, currency, timezone, and fiscal start month.

WHEN the organization currency is changed, THE system SHALL preserve historical financial data with its original currency values without retroactive conversion.

WHEN the organization logo image is updated, THE system SHALL replace the previously stored logo image with the new one.

WHEN the organization timezone is changed, THE system SHALL apply the new timezone to all subsequent date and time displays and calculations without altering historical timestamps.

### Organization Deletion

THE system SHALL allow only the organization owner to initiate organization deletion.

IF the organization has any timesheets that are neither approved nor rejected (pending resolution), THEN THE system SHALL block the deletion and inform the owner that all pending timesheets must be resolved first.

IF the organization has any active employee contracts at the time of the deletion request, THEN THE system SHALL block the deletion and inform the owner that all active employee contracts must be ended first.

WHEN an organization is successfully deleted, THE system SHALL permanently remove all organization data, including every employee record, project, task, timelog, timesheet, contract, department, role, activity log entry, and invitation belonging to that organization.

WHEN an organization is deleted, THE system SHALL preserve the owner's user account so that it remains available for creating a new organization or joining other organizations as an employee.

### Multi-Tenancy Data Isolation and Organization Context

THE system SHALL ensure that every organization operates independently, with its own employees, projects, departments, roles, and all other data completely isolated from every other organization.

THE system SHALL prevent any member of one organization from viewing, accessing, or modifying data belonging to another organization.

WHERE a user belongs to multiple organizations, THE system SHALL allow the user to switch the active organization context at any time without logging out.

THE system SHALL scope every user action — including viewing data, creating records, editing records, and running reports — exclusively to the currently selected organization context.

WHEN a user switches organization context, THE system SHALL immediately apply the permissions, roles, and data scope of the newly selected organization for all subsequent actions.

## User Operations

Users sign up by providing an email address and password, which creates their global account. After signing up, users log in using their email and password credentials. Once authenticated, users who belong to multiple organizations are prompted to select which organization they want to work in, establishing their organization context. All actions performed after login are scoped to the selected organization. Users can switch between organizations at any time without logging out, allowing them to move seamlessly between different workspaces. Users can change their password whenever needed by providing their current password and the new one. Each user has a global profile containing a display name, avatar image, and phone number, which is shared across all organizations they belong to. Users can edit their profile at any time, and changes are immediately reflected everywhere. A user can delete their own account, but if they are the sole owner of any organization, they must first either transfer ownership to another user or delete the organization entirely. When an account is deleted, the user's employee records in other organizations are marked as deactivated rather than removed, preserving historical data integrity.

### User Registration

THE system SHALL allow users to sign up by providing an email address and password.

THE system SHALL create a global user account upon successful sign-up. This account serves as the user's identity across all organizations they may join.

IF the provided email address is already registered, THEN THE system SHALL reject the sign-up request.

IF the provided email address matches a pending invitation in any organization, THEN THE system SHALL automatically add the user to that organization upon account creation.

WHEN a user signs up with an email that has pending invitations in multiple organizations, THE system SHALL add the user to all of those organizations automatically.

### User Login

THE system SHALL allow users to log in using their registered email address and password.

WHEN a user successfully authenticates and belongs to exactly one organization, THE system SHALL automatically set that organization as the active context without prompting.

WHEN a user successfully authenticates and belongs to multiple organizations, THE system SHALL prompt the user to select which organization to work in, establishing the organization context for the session.

IF the provided email is not registered, THEN THE system SHALL reject the login request.

IF the provided password does not match the registered email, THEN THE system SHALL reject the login request.

THE system SHALL scope all subsequent actions to the selected organization context after login is complete.

### Password Management

THE system SHALL allow users to change their password by providing their current password and a new password.

IF the provided current password is incorrect, THEN THE system SHALL reject the password change request.

WHEN a password is successfully changed, THE system SHALL apply the new password for all subsequent login attempts immediately.

### Multi-Organization Membership

THE system SHALL allow a single user account to belong to multiple organizations simultaneously.

THE system SHALL allow users to switch between organizations they belong to at any time without logging out.

WHEN a user switches organizations, THE system SHALL immediately apply the new organization context to all subsequent actions, ensuring the user only sees and interacts with data belonging to the newly selected organization.

THE system SHALL maintain independent organization contexts so that switching organizations does not affect the state of work in any other organization.

### User Profile Management

THE system SHALL maintain a global user profile containing a display name, an avatar image, and a phone number.

THE system SHALL allow users to edit their display name at any time.

THE system SHALL allow users to upload an avatar image to their profile.

THE system SHALL allow users to set or update their phone number in their profile.

THE system SHALL share the global user profile across all organizations the user belongs to, so that changes appear consistently regardless of which organization context is active.

WHEN a user edits any profile field, THE system SHALL reflect the change immediately and consistently across all organizations the user belongs to.

### Account Deletion

THE system SHALL allow users to delete their own account.

IF the user is the sole owner of any organization, THEN THE system SHALL block account deletion. The user must first either transfer ownership to another active employee within that organization or delete the organization entirely.

THE system SHALL allow a sole owner to transfer organization ownership to another active employee in the organization before proceeding with account deletion.

WHEN a user account is deleted, THE system SHALL mark the user's employee records in other organizations as deactivated rather than removing them entirely.

WHEN a user account is deleted, THE system SHALL preserve all historical data — including timelogs, timesheets, activity log entries, and contracts — associated with the deactivated employee records, maintaining the integrity of organizational records.

## Employee Operations

Users with employee management permission can invite new employees to the organization by providing an email address. If the invited email already belongs to an existing user account, that user is immediately added as an employee of the organization. If no account exists with that email, a pending invitation is created and the person will be automatically added when they sign up. Each employee record includes a reference to the user account, the assigned role within the organization, an optional department, an optional position or title, an employment type such as full-time, part-time, contractor, or intern, and a status of either active or deactivated. Users with employee management permission can edit an employee's department, position, and employment type at any time. Employees can be deactivated, which prevents them from logging time or submitting timesheets while preserving all their historical timelogs and timesheets intact. Deactivated employees can be reactivated later, restoring their ability to track time. Users with employee view permission can browse the full employee list, which is paginated for performance. The employee list supports filtering by department, employment type, and status, as well as searching by employee name to quickly locate individuals.

### Inviting Employees

THE system SHALL allow users with the employee management permission to invite new employees to the organization by providing an email address.

WHEN the invited email address belongs to an existing user account, THE system SHALL immediately add that user as an employee of the organization with the role specified during the invitation.

WHEN the invited email address does not belong to any existing user account, THE system SHALL create a pending invitation associated with the organization and the provided email address, recording the invitation timestamp and the assigned role.

WHEN a new user signs up with an email address that matches one or more pending invitations, THE system SHALL automatically add the user to each corresponding organization as an employee with the role specified in each invitation.

### Setting Up Employee Records

THE system SHALL require each employee record to have exactly one role assigned from the organization's available roles.

THE system SHALL allow an optional department to be set on each employee record, referencing a department that exists within the same organization.

THE system SHALL allow an optional position or job title to be set on each employee record as free-form text.

THE system SHALL require each employee record to be classified with an employment type of exactly one of: full-time, part-time, contractor, or intern.

THE system SHALL allow users with the employee management permission to edit an existing employee's department, position, and employment type at any time.

THE system SHALL allow users with the employee management permission to change an employee's assigned role to any other role available in the same organization.

### Managing Employee Status

THE system SHALL allow users with the employee management permission to deactivate an active employee.

WHEN an employee is deactivated, THE system SHALL block the employee from creating new timelogs, editing existing timelogs, or submitting timesheets.

WHEN an employee is deactivated, THE system SHALL preserve all historical timelogs, timesheets, and contract records belonging to that employee without modification or deletion.

WHEN an employee is deactivated, THE system SHALL retain the employee record in the organization while marking the employee as inactive; the employee SHALL appear in the employee list only when filtered by deactivated status.

THE system SHALL allow users with the employee management permission to reactivate a previously deactivated employee.

WHEN a deactivated employee is reactivated, THE system SHALL restore the employee's ability to log time entries and submit timesheets, and the employee SHALL reappear in the active employee list when filtered by active status.

### Browsing the Employee List

THE system SHALL provide a paginated list of all employees within the currently selected organization for users with the employee view permission or employee management permission.

THE system SHALL allow filtering the employee list by department, showing only employees assigned to the selected department.

THE system SHALL allow filtering the employee list by employment type, showing only employees matching the selected employment type classification.

THE system SHALL allow filtering the employee list by status, showing only active employees or only deactivated employees based on the selected filter.

THE system SHALL allow searching the employee list by name to locate specific individuals, matching against the employee's display name.

WHERE multiple filters and a search term are applied simultaneously, THE system SHALL return only employees who match all applied criteria.

## Role Operations

Every organization starts with three built-in roles that cannot be deleted: Owner, Manager, and Employee. The Owner role grants full access to all features including managing roles and members. The Manager role allows managing employees and projects, approving timesheets, and viewing reports. The Employee role permits basic time tracking, timesheet submission, and viewing personal data. Organization owners can create custom roles, each defined by a name and a selection of permissions from the available set. The available permissions include managing organization settings, managing and viewing employees, managing and viewing projects, managing and approving time entries, viewing all timelogs and timesheets, and viewing reports. Organization owners can edit custom roles at any time, adjusting the name or permission set as organizational needs evolve. A custom role can be deleted only when no employees are currently assigned to it, ensuring no employee is left without a valid role. Each employee in the organization is assigned exactly one role at all times. Users with employee management permission can change an employee's role assignment, moving them between built-in or custom roles as responsibilities shift.

### Built-in Roles

Every organization is provisioned with exactly three built-in roles upon creation: Owner, Manager, and Employee.

**Owner Role**

The Owner role grants unrestricted access to all features within the organization. Users with the Owner role can manage organization settings, manage employees and their contracts, create and manage departments, create and manage projects and tasks, manage roles and permissions, approve or reject timesheets, view all timelogs and timesheets, and access all organization reports and the activity log. The Owner role cannot be modified or removed.

**Manager Role**

The Manager role provides supervisory capabilities. Users with the Manager role can manage employees (including creating contracts), manage projects and tasks, approve or reject submitted timesheets, and view organization reports. The Manager role cannot modify organization settings, manage roles, or view the activity log. The Manager role cannot be modified or removed.

**Employee Role**

The Employee role provides basic workforce capabilities. Users with the Employee role can log time entries, start and stop the live timer, submit timesheets for approval, view their own timelogs and timesheets, view tasks assigned to them, view projects they are assigned to, and view their own contracts. The Employee role cannot manage other employees, approve timesheets, or view reports. The Employee role cannot be modified or removed.

**Built-in Role Protection**

Built-in roles cannot be deleted under any circumstances. The system shall reject any attempt to delete an Owner, Manager, or Employee role. Built-in role names and core permission sets cannot be edited.

### Custom Role Creation

Users with the Owner role can create custom roles within their organization.

When creating a custom role, the Owner provides a name for the role and selects a set of permissions from the available permission catalog (defined in Permission Set below). The name must be unique within the organization.

At least one permission must be assigned to a custom role. A custom role with no permissions cannot be created.

Custom roles are scoped to the organization in which they are created and are not visible or usable by other organizations.

Once created, a custom role becomes immediately available for assignment to employees within the organization.

### Permission Set

The following permissions are available for assignment to custom roles. Each permission grants a specific set of capabilities within the organization.

**Organization Management** (`org:manage`): Grants the ability to edit organization settings including name, description, logo image, currency, timezone, and fiscal start month. Also grants the ability to create, edit, and delete departments. Also grants the ability to view the activity log.

**Employee Management** (`employee:manage`): Grants the ability to invite new employees, edit employee records (department, position, employment type), deactivate and reactivate employees, and create and edit employee contracts.

**Employee View** (`employee:view`): Grants the ability to view the employee list and individual employee details including their contracts.

**Project Management** (`project:manage`): Grants the ability to create, edit, archive, complete, and delete projects. Also grants the ability to assign and remove employees from projects, and to create and edit any task within projects.

**Project View** (`project:view`): Grants the ability to view all projects, their tasks, and project memberships within the organization.

**Time Management** (`time:manage`): Grants the ability to edit or delete any employee's timelogs that are not part of an approved timesheet. Timelogs within an approved timesheet are immutable and cannot be modified or deleted by this permission.

**Time Approval** (`time:approve`): Grants the ability to view all submitted timesheets, approve submitted timesheets, and reject submitted timesheets with a reason.

**Time View All** (`time:view_all`): Grants the ability to view all employees' timelogs and timesheets across the organization.

**Report View** (`report:view`): Grants the ability to access all organization reports including Time Report, Project Budget Report, and Weekly Summary Report. Also grants access to the organization-level dashboard.

Permissions are additive. Assigning multiple permissions grants the union of all assigned capabilities. The Owner role implicitly holds all permissions. The Manager and Employee roles have fixed permission sets that cannot be changed.

### Custom Role Editing and Deletion

**Editing Custom Roles**

Users with the Owner role can edit custom roles at any time. Editing a custom role may change its name or its assigned permission set, or both.

When the name of a custom role is changed, the new name must be unique within the organization. When the permission set is changed, the new permission set takes effect immediately for all employees currently assigned to that role.

If a permission is removed from a custom role, all employees assigned to that role lose the corresponding capabilities immediately.

**Deleting Custom Roles**

Users with the Owner role can delete a custom role only when no employees are currently assigned to it. If one or more employees hold the custom role, the deletion is rejected. The Owner must first reassign those employees to a different role before the custom role can be deleted.

When a custom role is deleted, it is permanently removed and cannot be recovered. Any historical references to the deleted role in activity log entries are preserved as-is.

### Employee Role Assignment

**One Role Per Employee Rule**

Every employee in an organization must be assigned exactly one role at all times. An employee cannot hold multiple roles simultaneously within the same organization. An employee cannot have no role assigned.

When an employee is invited to the organization, a role must be specified at the time of invitation. The employee record is created with that role assignment.

**Changing Role Assignments**

Users with the `employee:manage` permission can change an employee's role assignment at any time. Changing an employee's role immediately updates the permissions and capabilities available to that employee within the organization.

When an employee's role is changed, the system records the change in the activity log with the previous role, the new role, and the user who made the change.

An employee's current role determines what they can and cannot do in the organization context at any given moment. There is no grace period or transitional state during a role change — the new role takes effect immediately upon assignment.

**Role Assignment Constraints**

An employee can be assigned any role available in the organization, whether built-in or custom. The Owner role can be assigned to multiple employees; there is no restriction on the number of employees who may hold the Owner role.

If a custom role assigned to an employee is subsequently deleted (after the employee has been reassigned to a different role), the employee's capabilities are unaffected as they are governed by their current role.

## Contract Operations

Each employee can have multiple contracts over time, forming a complete employment history, but only one contract can be active at any given moment. Every contract includes a required start date, an optional end date that when omitted indicates an ongoing arrangement, a required pay rate as a numeric value, a pay period specified as hourly, daily, weekly, or monthly, required working hours per week such as forty hours, and optional notes for additional context. Users with employee management permission can create new contracts for any employee. When a new contract is created, the system automatically ends the previously active contract by setting its end date to the day before the new contract's start date, ensuring no overlapping active periods. Users with employee management permission can edit the current active contract, adjusting pay rate, working hours, or other fields as employment terms change. Past contracts with an end date in history are immutable and cannot be modified, preserving an accurate historical record of all employment terms. Employees can view their own complete contract history at any time. Users with employee view permission can access and review the contract history of any employee in the organization.

### Contract Creation

Users with employee management permission can create a contract for any employee within the same organization. Each employee may accumulate multiple contracts over time, forming a complete employment history.

When creating a contract, the following information must be provided:

- A start date, which is required
- A pay rate as a numeric value, which is required
- A pay period, selected from one of four options: hourly, daily, weekly, or monthly
- Working hours per week as a numeric value, which is required

Additionally, the following information is optional:

- An end date; when omitted, the contract is considered ongoing with no predetermined end
- Notes for additional context about the contract terms

THE system SHALL enforce that each employee has at most one active contract at any given time. A contract is considered active when its start date has been reached and its end date is either not set (ongoing) or not yet passed.

WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date. This ensures that no two active contract periods overlap for the same employee.

IF the new contract's start date is earlier than or equal to the previous active contract's start date, THEN THE system SHALL reject the creation to prevent overlapping active periods.

IF the pay rate is zero or negative, THEN THE system SHALL reject the creation.

IF the working hours per week is zero or negative, THEN THE system SHALL reject the creation.

IF the end date is provided and is earlier than the start date, THEN THE system SHALL reject the creation.

IF the specified pay period is not one of hourly, daily, weekly, or monthly, THEN THE system SHALL reject the creation.

THE system SHALL store the contract as part of the employee's historical record, preserving all contract details for future reference.

### Contract Editing

THE system SHALL allow users with employee management permission to edit the current active contract of any employee within the same organization.

Editable fields of the active contract include the pay rate, pay period, working hours per week, end date, and notes. The start date of the active contract may also be modified, subject to the same non-overlapping constraint that applies during creation.

WHEN the start date of the active contract is changed, THE system SHALL ensure the new start date does not create an overlap with any other contract belonging to the same employee.

WHEN the end date of the active contract is changed or removed, THE system SHALL ensure no gap or overlap is introduced that would violate the single-active-contract rule.

THE system SHALL treat past contracts — those whose end date has passed — as immutable historical records. No user may modify any field of a past contract, regardless of their permissions. This preserves an accurate and auditable history of all employment terms for every employee.

IF a user attempts to edit a past contract, THEN THE system SHALL reject the edit.

### Contract Viewing

THE system SHALL allow each employee to view their own complete contract history, including all past contracts and the current active contract.

THE system SHALL allow users with employee view permission to view the contract history of any employee within the same organization.

For each contract in the history, the following information is visible:

- Start date
- End date (or an indication that the contract is ongoing)
- Pay rate
- Pay period (hourly, daily, weekly, or monthly)
- Working hours per week
- Notes (if provided)
- Whether the contract is currently active or historical

THE system SHALL present the contract history in chronological order, with the most recent contract appearing first.

THE system SHALL paginate the contract history when an employee has a large number of historical contracts.

WHERE an employee belongs to multiple organizations, THE system SHALL show only the contracts associated with the currently selected organization context.

## Department Operations

Each organization can establish departments to structure its workforce, with each department having a name and description. Departments support one level of nesting, meaning a department can optionally have a parent department but cannot be nested deeper than one level below its parent. Users with organization management permission can create new departments, providing the name, description, and optionally selecting a parent department. These users can also edit existing departments, changing the name, description, or parent department relationship as the organizational structure evolves. When a department is deleted, any employees who were assigned to that department have their department association set to null rather than being removed from the organization. This ensures that deleting a department never results in employee data loss. All employees in the organization, regardless of their role, can view the complete list of departments. This visibility allows everyone to understand the organizational structure and see where colleagues are situated within the company hierarchy.

### Department Creation

A user with organization management permission can create a new department by providing a name and an optional description. The department name is required and must be provided at creation time.

A user with organization management permission can optionally assign a parent department when creating a new department. When a parent department is specified, the new department becomes a child of that parent, establishing one level of nesting. A department that already has a parent cannot serve as a parent to another department, ensuring the nesting depth is constrained to one level.

The newly created department is immediately available for employee assignment and appears in the organization's department list. An activity log entry is recorded capturing the department creation event with the department name, description, and any parent department assignment.

### Department Editing

A user with organization management permission can edit an existing department's name and description. Both fields can be updated independently; changing one does not require changing the other.

A user with organization management permission can change the parent department relationship of an existing department. The new parent must be a different department that does not already have a parent of its own, maintaining the one-level nesting rule. A department cannot be set as its own parent, and a department cannot be assigned a child department as its parent, preventing circular relationships.

When a department's parent is changed, employees remain assigned to the same department. Only the organizational hierarchy is affected. An activity log entry records the department edit event with the old and new values.

### Department Deletion

A user with organization management permission can delete an existing department. When a department is deleted, all employees who were assigned to that department have their department association set to null rather than being removed from the organization. This ensures that deleting a department never results in the loss of employee records or their associated data such as timelogs, timesheets, contracts, and project assignments.

A department that serves as a parent to other departments cannot be deleted until all child departments are either reassigned to a different parent or deleted first. This prevents orphaned child departments from existing in the hierarchy.

An activity log entry records the department deletion event, including the department name and the number of affected employees whose department association was cleared.

### Department Listing and Visibility

All employees, regardless of their role, can view the complete list of departments within their organization. The department list is paginated to handle organizations with a large number of departments efficiently.

Employees can see the organizational structure including parent-child department relationships. The listing displays each department's name, description, and its parent department if one exists, providing full transparency into how the workforce is structured across departments.

Employees can use the department list to understand where colleagues are situated within the company hierarchy, supporting cross-departmental awareness and collaboration. The department structure is read-only for employees without organization management permission.

## Project Operations

Users with project management permission can create projects, each requiring a name, an optional description, a color code for visual identification in the user interface, a status set to active by default, optional budget hours representing the total estimated effort, and optional start and end dates to define the project timeline. Projects can be edited at any time by users with project management permission, allowing updates to the name, description, color code, budget hours, or dates as project details change. A project can be moved to archived or completed status, which prevents any new timelogs from being recorded against it while preserving all existing timelog entries for historical reference. Projects can only be deleted when they have no timelogs associated with them, ensuring that no time tracking data is ever lost through project removal. Users with project view permission can browse all projects in the organization through a paginated list. The project list supports filtering by status so that users can quickly find active, archived, or completed projects based on their needs.

### Creating Projects

Users with project management permission can create a new project. The project must have a name, which is required and cannot be empty. The project must have a color code, which is required and is used for visual identification in the user interface.

A description may optionally be set when creating the project. This provides additional context about the project's purpose or scope.

Optional budget hours may be set to indicate the total estimated effort for the project. Budget hours must be a positive number when provided.

Optional start and end dates may be set to define the project timeline. When both are provided, the end date must not be earlier than the start date.

Upon creation, the project status is automatically set to active. The newly created project is immediately available for time tracking by assigned employees.

### Editing Project Details

Users with project management permission can edit an existing project's details at any time. All fields that were settable during creation can be modified: the name, description, color code, budget hours, start date, and end date.

When updating budget hours, the new value must be a positive number. When updating start and end dates, the end date must not be earlier than the start date if both are set.

Editing a project does not affect its existing timelogs, task assignments, or project memberships. The project's active, archived, or completed status is managed separately through status transition operations.

### Archiving and Completing Projects

Users with project management permission can change a project's status to archived or completed. Both status transitions serve to indicate that the project is no longer active.

When a project is archived or completed, new timelogs cannot be recorded against it. This ensures that time tracking data is only added to active projects.

All existing timelogs associated with the project are preserved and remain accessible. Historical time tracking data is never lost when a project is archived or completed. Timelogs on archived or completed projects can still be viewed, reported on, and included in timesheets that were already in progress.

A project in archived or completed status cannot be transitioned back to active unless a user with project management permission explicitly reopens it.

### Deleting Projects

Users with project management permission can delete a project, but only when the project has no timelogs associated with it. This restriction ensures that time tracking data is never lost through project deletion.

If a project has any timelogs — regardless of whether those timelogs are in draft, submitted, or approved timesheets — the deletion request is rejected. The project must first have all its timelogs removed before deletion is permitted.

When a project is deleted, all associated data is permanently removed. This includes project memberships, tasks belonging to the project, and task history entries for those tasks.

### Viewing and Listing Projects

Users with project view permission can browse all projects within the organization.

The project list is paginated, allowing users to navigate through projects in manageable portions.

Users can filter the project list by status. Available status filters are active, archived, and completed. This allows users to quickly locate projects based on their current state.

Each project in the list displays its name, color code, status, and other descriptive information. The color code provides visual identification as intended for user interface display.

Users without project view permission cannot access the project list or view project details.

### Project Timeline Management

Users with project management permission can manage the timeline of a project through its start and end dates.

Setting a start date indicates when the project is expected to begin. The start date is optional and can be set at creation or updated later. A project without a start date has no defined beginning.

Setting an end date indicates when the project is expected to conclude. The end date is optional and can be set independently of the start date. However, when both are provided, the end date must not be earlier than the start date.

When no end date is set, the project is considered to have an open-ended timeline. This is appropriate for ongoing projects with no fixed completion target.

Timeline dates do not automatically trigger status changes. Archiving or completing a project is a separate, explicit action taken by a user with project management permission, regardless of whether the dates have passed.

## ProjectMember Operations

Users with project management permission can assign employees to projects, creating project memberships that link an employee to a specific project. Each project membership includes an assigned role that is either member or project-lead. An employee can be assigned to multiple projects simultaneously, enabling cross-project collaboration. Project leads gain elevated capabilities within their assigned projects, specifically the ability to manage tasks including creating, editing, and tracking task progress. Users with project management permission can remove employees from projects at any time, revoking their access and any project-lead privileges they held. When an employee is removed from a project, their historical timelogs recorded against that project remain intact. Employees can view the list of all projects they are currently assigned to, giving them clear visibility into their project commitments. This self-service view helps employees manage their workload across multiple concurrent projects.

### Assigning Employees to Projects

THE system SHALL allow a user who holds the project management permission to assign any active employee in the organization to a project.

WHEN assigning an employee to a project, THE system SHALL require the user to select a membership role, either member or project-lead. WHERE no role is explicitly selected, THE system SHALL default to the member role.

THE system SHALL create a project membership record that links the specified employee to the specified project with the selected role upon successful assignment.

IF the employee being assigned is not active within the organization, THEN THE system SHALL reject the assignment.

IF the employee is already a member of the specified project, THEN THE system SHALL reject the assignment as a duplicate membership.

IF the project status is archived or completed, THEN THE system SHALL reject the assignment, preventing new members from joining non-active projects.

IF the requesting user does not hold the project management permission, THEN THE system SHALL reject the assignment request.

IF the employee does not belong to the same organization as the project, THEN THE system SHALL reject the assignment.

### Multiple Project Assignments and Cross-Project Collaboration

THE system SHALL allow an employee to be a member of multiple projects simultaneously without any limit on the number of concurrent project memberships.

THE system SHALL treat each project membership as independent. An employee holding the member role in one project and the project-lead role in another project SHALL have their authority scoped to each project individually, with no aggregation or conflict of roles across projects.

WHEN an employee who belongs to multiple projects creates a timelog, THE system SHALL require the employee to select the specific project to which the timelog applies. The timelog SHALL be associated exclusively with that selected project, ensuring accurate time tracking per project regardless of how many projects the employee is concurrently assigned to.

THE system SHALL support cross-project collaboration by allowing project leads and users with project management permission to assign any eligible employee to any project, regardless of the employee's existing project memberships.

### Project Lead Task Management Authority

THE system SHALL grant an employee assigned with the project-lead role in a project the authority to manage tasks within that specific project.

WHEN a project lead creates a task in their project, THE system SHALL allow them to define the task title, description, priority, estimated hours, due date, and to assign the task to any employee who is a member of the same project.

WHEN a project lead edits a task in their project, THE system SHALL allow them to modify the task title, description, status, priority, estimated hours, due date, and assigned employee. THE system SHALL record each status change made by a project lead in the task history along with the timestamp and the identity of the project lead who made the change.

THE system SHALL allow a project lead to view all tasks within their project, regardless of who created the task or who the task is assigned to. THE system SHALL allow the project lead to filter and sort tasks using the same filtering and sorting options available to users with project management permission.

THE system SHALL NOT allow a project lead to delete any task. Task deletion SHALL be restricted to users who hold the project management permission.

THE system SHALL allow users who hold the project management permission to create, edit, and delete any task across all projects, regardless of their own project membership roles. The project management permission SHALL provide full task management authority that is not limited by project membership.

### Removing Employees from Projects

THE system SHALL allow a user who holds the project management permission to remove any employee from any project at any time.

WHEN an employee is removed from a project, THE system SHALL permanently delete their project membership record.

WHEN an employee is removed from a project, THE system SHALL immediately revoke all project-lead privileges the employee held within that project. The employee SHALL no longer be able to create, edit, or view tasks in that project through project-lead authority.

WHEN an employee is removed from a project, THE system SHALL preserve all historical timelogs that the employee recorded against that project. These timelogs SHALL remain intact and SHALL continue to appear in reports, timesheets, and all other views that reference them.

WHEN an employee is removed from a project, THE system SHALL clear any task assignments that linked the removed employee to tasks within that project. The tasks SHALL remain in the project but SHALL become unassigned.

IF the specified employee is not currently a member of the specified project, THEN THE system SHALL reject the removal request.

IF the requesting user does not hold the project management permission, THEN THE system SHALL reject the removal request. A project lead SHALL NOT be able to remove other members from the project.

### Viewing Own Project Assignments

THE system SHALL allow each employee to view the list of all projects to which they are currently assigned. This self-service view SHALL provide the employee with clear visibility into their active project commitments.

The system SHALL display for each assigned project the project name, description, color code, status, and the employee's membership role within that project. WHERE the employee holds the project-lead role in a project, THE system SHALL clearly indicate this elevated role.

The system SHALL display only active projects by default. THE system SHALL provide the employee with the option to include archived or completed projects in the view so that the employee can see their full project assignment history.

The system SHALL scope this view to the requesting employee. An employee SHALL NOT see projects assigned to other employees through this view. Access to other employees' project assignments SHALL require the employee view permission and SHALL be available through the employee management features.

## Task Operations

Project leads and users with project management permission can create tasks within projects. Each task requires a title and can optionally include a description, a status that starts as open, a priority level of low, medium, high, or urgent, estimated hours, a due date, an assigned employee who must already be a project member, and a parent task for creating subtasks limited to one level of nesting. Project leads can edit tasks within their own projects, while users with project management permission can edit any task across all projects. Task status can be changed through a defined workflow moving from open to in-progress, then to completed or directly to closed. Every status change is automatically recorded in the task history for audit purposes. Employees can view tasks belonging to projects they are assigned to, allowing them to see their work assignments. The task list supports filtering by status, priority, and assigned employee, and can be sorted by due date, priority, or creation date to help teams prioritize their work effectively.

### Task Creation

THE system SHALL allow project leads and users with project management permission to create tasks within a project.

WHEN creating a task, THE system SHALL require a title.

WHERE the user provides a description, THE system SHALL store the description for the task.

THE system SHALL set the initial status of a newly created task to "open".

WHERE the user specifies a priority, THE system SHALL accept one of: low, medium, high, or urgent. IF no priority is specified, THEN THE system SHALL default the priority to "medium".

WHERE the user provides estimated hours, THE system SHALL store the numeric estimate for the task.

WHERE the user provides a due date, THE system SHALL store the due date for the task.

WHEN assigning an employee to a task, THE system SHALL verify that the employee is a member of the project. IF the employee is not a project member, THEN THE system SHALL reject the assignment.

WHERE the user specifies a parent task, THE system SHALL create a subtask relationship limited to one level of nesting. IF the specified parent task already has a parent of its own, THEN THE system SHALL reject the request. IF the specified parent task belongs to a different project, THEN THE system SHALL reject the request. IF the task references itself as its parent, THEN THE system SHALL reject the request.

### Task Editing

THE system SHALL allow project leads to edit tasks within projects they lead.

THE system SHALL allow users with project management permission to edit any task in the organization.

WHEN a project lead attempts to edit a task in a project they do not lead, THE system SHALL reject the request unless the user also holds project management permission.

THE system SHALL allow editing of task title, description, priority, estimated hours, due date, assigned employee, and parent task.

WHEN editing the assigned employee, THE system SHALL verify that the new assignee is a member of the project. IF the new assignee is not a project member, THEN THE system SHALL reject the change.

WHEN editing the parent task, THE system SHALL enforce the one-level nesting rule and same-project constraint as defined in task creation.

### Task Status Workflow

THE system SHALL support the following task status transitions:

- An "open" task can transition to "in-progress".
- An "in-progress" task can transition to "completed" or "closed".
- An "open" task can transition directly to "closed".

THE system SHALL reject any status transition not listed above.

Project leads SHALL be allowed to change the status of tasks within projects they lead.

Users with project management permission SHALL be allowed to change the status of any task in the organization.

WHEN a task status is changed, THE system SHALL automatically create a task history entry recording the timestamp of the change, the old status, the new status, and the user who made the change.

Task history entries SHALL be immutable once created. THE system SHALL not allow manual creation, editing, or deletion of task history entries.

### Task Viewing

THE system SHALL allow employees to view tasks belonging to projects they are assigned to.

THE system SHALL allow project leads to view all tasks within projects they lead.

THE system SHALL allow users with project management permission to view all tasks in the organization.

THE system SHALL allow users with project view permission to view tasks in any project they can view.

WHEN an employee attempts to view a task in a project they are not assigned to, THE system SHALL reject the request unless the user holds project management permission or project view permission.

### Task Listing, Filtering, and Sorting

THE system SHALL provide a paginated list of tasks scoped to the user's viewable projects.

THE system SHALL allow filtering tasks by:

- Status: one or more of open, in-progress, completed, or closed
- Priority: one or more of low, medium, high, or urgent
- Assigned employee: a specific employee within the organization

THE system SHALL allow sorting the task list by:

- Due date (ascending or descending)
- Priority (ascending or descending, ordered by urgency)
- Creation date (ascending or descending)

WHEN multiple filters are applied, THE system SHALL return only tasks that match all specified filter criteria.

THE system SHALL respect the user's organization context when returning task results, showing only tasks from the currently selected organization.

## TaskHistory Operations

Task history entries are automatically created by the system whenever a task's status changes. Each entry captures the exact timestamp of the change, the old status before the transition, the new status after the transition, and the user who made the change. No user can manually create, edit, or delete task history entries; they are an immutable audit trail generated solely by the system in response to status changes. This ensures a tamper-proof record of how each task has progressed through its lifecycle. Task history entries are always tied to a specific task, providing a chronological log of every status transition that task has undergone. Users who can view the associated task can also view its complete history, allowing project leads, managers, and assigned employees to trace the evolution of work items. The history provides visibility into who changed what and when, supporting accountability and retrospective analysis of task workflows.

### Automatic History Creation on Status Change

WHEN a user with permission to edit a task changes the task's status, THE system SHALL automatically create a task history entry recording the transition.

This applies to all status changes regardless of the path — for example, from "open" to "in-progress", from "in-progress" to "completed", from "completed" to "closed", or any revert such as from "closed" back to "in-progress". The history entry is created by the system itself; users do not trigger it explicitly beyond performing the status change on the task.

No task history entry is created when a task is edited without a status change — for instance, changing only the title, description, priority, estimated hours, due date, or assigned employee does not produce a history entry.

### Captured History Data

THE system SHALL record the following in every task history entry:

- The exact timestamp when the status change occurred
- The old status before the transition (e.g., "open")
- The new status after the transition (e.g., "in-progress")
- The user who made the status change

THE system SHALL ensure these four fields are always populated; a history entry must never be created with missing timestamp, old status, new status, or user information.

The timestamp SHALL reflect the moment the status change was committed, not when a draft was initiated or when the change was queued.

### Immutability of Task History

THE system SHALL treat all task history entries as an immutable audit trail. Once created, a history entry cannot be altered or removed by any user — including organization owners.

THE system SHALL prevent manual creation of task history entries. Users cannot create history entries directly; history entries are generated exclusively by the system in response to a task status change.

THE system SHALL prevent editing of any existing task history entry. No field — timestamp, old status, new status, or user — may be modified after the entry is created.

THE system SHALL prevent deletion of any task history entry. Even when the associated task or project is deleted, the history entries are permanently removed only as a consequence of the parent entity's deletion — never through a direct delete action on a history entry.

This immutability guarantees that the task history remains a trustworthy, tamper-proof record of every status transition a task has undergone throughout its lifecycle.

### Viewing Task History Chronologically

Users who are authorized to view a task's history SHALL see all entries for that task presented in chronological order, from the earliest status change to the most recent.

Each entry SHALL display:
- The timestamp of the change
- The old status
- The new status
- The display name of the user who made the change

The chronological log provides a complete, time-ordered narrative of how the task has progressed through its lifecycle — from creation through each status transition to its current state.

IF a task has no status change history (for example, a newly created task whose status has never been modified), THEN THE system SHALL indicate that no history entries exist rather than showing an error.

### Access Control for Task History Viewing

THE system SHALL allow the following users to view a task's history:

- Project leads assigned to the project containing the task
- Users with `project:manage` permission in the organization
- The employee assigned to the task (if any)
- Any employee who is a member of the project containing the task

WHERE a user has `employee:view` permission but is not a project member and not assigned to the task, THE system SHALL deny access to the task's history.

Viewing task history does not require a separate permission beyond what is already granted through project membership, task assignment, or the `project:manage` permission. The visibility of task history follows the same access rules as viewing the task itself.

This access model ensures that everyone involved with the task — project leads, managers, and assigned workers — can review the full history to understand how the task has evolved, who made changes, and when those changes occurred.

## Timelog Operations

Employees log time entries called timelogs, each capturing the date the work was performed, the duration in minutes, the project the work belongs to which must be a project the employee is assigned to, an optional task that must belong to the selected project, an optional description of what was accomplished, and a billable flag that defaults to true. Employees can only create timelogs for themselves and cannot log time on behalf of other employees. An employee can edit their own timelogs as long as the timelog is not part of an approved timesheet, ensuring that approved work records remain locked. Similarly, an employee can delete their own timelogs only when the timelog is not part of any submitted or approved timesheet, preventing removal of entries that are under review or already finalized. Users with time management permission have broader authority and can edit or delete any employee's timelogs regardless of timesheet status. Users with the view all time permission can browse every employee's timelogs across the organization. All employees can view their own timelogs through a paginated list that supports filtering by date range, project, task, and billable status.

### Creating Timelogs

Employees can log time entries called timelogs to record work performed.

THE system SHALL allow an employee to create a timelog with the following:
- A date indicating when the work was performed (required)
- A duration in minutes representing how long the work took (required)
- A project that the employee is assigned to (required)
- An optional task that belongs to the selected project
- An optional description of what work was done
- A billable flag indicating whether the time is billable; this defaults to yes when not specified

THE system SHALL only permit an employee to create timelogs for themselves. An employee cannot log time on behalf of another employee.

IF the selected project is not one the employee is assigned to, THEN the system SHALL reject the request.

IF the selected task does not belong to the selected project, THEN the system SHALL reject the request.

IF a task is provided but no project is selected, THEN the system SHALL reject the request.

### Editing Timelogs

An employee may need to correct a timelog after creating it.

THE system SHALL allow an employee to edit their own timelog, including changing the date, duration, project, task, description, or billable flag.

WHEN a timelog is part of an approved timesheet, THE system SHALL prevent the employee from editing it. Approved timelogs are locked and cannot be modified by the employee who owns them.

WHERE a user holds the time management permission, THE system SHALL allow that user to edit any employee's timelog that is not part of an approved timesheet, including timelogs that are part of a submitted but not yet approved timesheet. WHEN a timelog is part of an approved timesheet, THE system SHALL prevent any editing by anyone, including users with the time management permission — the approved-timesheet lock is absolute.

### Deleting Timelogs

An employee may remove a timelog that was created in error.

THE system SHALL allow an employee to delete their own timelog.

WHEN a timelog is part of a submitted timesheet — whether the timesheet is in submitted or approved status — THE system SHALL prevent the employee from deleting it. Timelogs under review or already finalized cannot be removed by the owning employee.

WHERE a user holds the time management permission, THE system SHALL allow that user to delete any employee's timelog that is not part of an approved timesheet, including timelogs that are part of a submitted but not yet approved timesheet. WHEN a timelog is part of an approved timesheet, THE system SHALL prevent any deletion by anyone, including users with the time management permission — the approved-timesheet lock is absolute.

### Viewing and Browsing Timelogs

Employees and authorized users can browse timelogs to review logged work.

THE system SHALL allow every employee to view their own timelogs.

WHERE a user holds the view-all-time permission, THE system SHALL allow that user to view all employees' timelogs across the organization.

THE system SHALL present timelogs as a paginated list.

THE system SHALL support filtering timelogs by:
- Date range, allowing users to narrow results to a specific period
- Project, showing only timelogs for a particular project
- Task, showing only timelogs associated with a particular task
- Billable status, allowing users to see only billable or only non-billable timelogs

## Timesheet Operations

A timesheet represents a collection of timelogs for a specific week defined as Monday through Sunday, owned by a single employee. Employees create draft timesheets for a given week, and the system automatically populates the draft with all timelogs recorded by that employee during that week. Employees can manually add or remove timelogs from their draft timesheet before submission, giving them control over which entries are included. A draft timesheet can be submitted for approval, but the submission is blocked if the timesheet contains no timelogs or if another timesheet for the same week is already in submitted or approved status. Each timesheet tracks its total hours calculated from the included timelogs, the submission timestamp, and upon review the review timestamp, the reviewing user, and a rejection reason if applicable. Users with time approval permission can view all submitted timesheets and either approve or reject them. Approval locks all included timelogs permanently, preventing any further edits or deletions. Rejection requires providing a reason and returns the timesheet to draft status, allowing the employee to make adjustments and resubmit. Employees can view all their own timesheets through a paginated list with filtering by status and date range.

### Timesheet Week Structure

A timesheet represents a collection of timelogs for a specific calendar week. THE system SHALL define each timesheet's week as starting on Monday and ending on Sunday. THE system SHALL calculate the total hours for a timesheet by summing the duration of all included timelogs and converting from minutes to hours.

THE system SHALL store the week start date, week end date, current status, total hours, and submission timestamp for each timesheet. WHEN a timesheet is reviewed, THE system SHALL record the review timestamp, the reviewing user, and a rejection reason if the timesheet is rejected.


### Creating Draft Timesheets

An employee can create a draft timesheet for a specific week. WHEN an employee creates a draft timesheet for a given week, THE system SHALL automatically include all timelogs recorded by that employee whose date falls within that Monday-to-Sunday week. THE system SHALL set the newly created timesheet's status to draft and calculate the total hours from the included timelogs.

IF the employee has no timelogs for the requested week, THEN THE system SHALL still create the draft timesheet with zero included timelogs and a total hours value of zero. THE system SHALL prevent the same employee from creating more than one draft timesheet for the same week.


### Managing Timelogs Within Draft Timesheets

An employee can add timelogs to a draft timesheet that they own. THE system SHALL allow adding only timelogs whose date falls within the timesheet's week range and that belong to the same employee. An employee can remove timelogs from a draft timesheet they own; removing a timelog SHALL only disassociate it from the timesheet without deleting the timelog itself.

IF the timesheet is not in draft status, THEN THE system SHALL reject any attempt to add or remove timelogs. WHEN timelogs are added or removed from a draft timesheet, THE system SHALL recalculate the total hours.


### Submitting Timesheets for Approval

An employee can submit a draft timesheet for approval. WHEN an employee submits a draft timesheet, THE system SHALL change its status to submitted and record the submission timestamp.

IF the timesheet contains no timelogs, THEN THE system SHALL reject the submission. IF another timesheet for the same week belonging to the same employee is already in submitted or approved status, THEN THE system SHALL reject the submission. THE system SHALL reject the submission if the timesheet is not owned by the submitting employee.


### Approving Timesheets

A user with time approval permission can approve a submitted timesheet. WHEN a submitted timesheet is approved, THE system SHALL change its status to approved, record the review timestamp, and record the reviewing user.

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet, preventing any further edits or deletions of those timelogs. This lock is absolute: no user permission, including time management permissions, SHALL override the lock on timelogs belonging to an approved timesheet. IF a timesheet is not in submitted status, THEN THE system SHALL reject the approval attempt.


### Rejecting Timesheets

A user with time approval permission can reject a submitted timesheet. WHEN a submitted timesheet is rejected, THE system SHALL change its status to draft, record the review timestamp, and record the reviewing user. THE system SHALL require a rejection reason; IF no rejection reason is provided, THEN THE system SHALL reject the rejection attempt.

WHEN a timesheet is rejected, THE system SHALL require the reviewer to provide a rejection reason. The system SHALL store this rejection reason with the timesheet. IF a timesheet is not in submitted status, THEN THE system SHALL reject the rejection attempt.


### Modifying and Resubmitting Rejected Timesheets

After a timesheet has been rejected and returned to draft status, the owning employee can modify the timesheet by adding or removing timelogs. THE system SHALL allow modification only on timesheets in draft status regardless of whether they were previously rejected.

THE system SHALL allow the employee to resubmit the modified timesheet following the same submission rules that apply to any draft timesheet: the timesheet must contain at least one timelog, and there must be no other submitted or approved timesheet for the same week.


### Viewing Timesheets

An employee can view all timesheets they own. THE system SHALL present the employee's timesheets as a paginated list. THE system SHALL allow filtering the list by timesheet status, enabling employees to narrow results by draft, submitted, approved, or rejected status.

THE system SHALL allow filtering by date range, enabling employees to view timesheets whose week falls partially or fully within the specified range. THE system SHALL display for each timesheet its week start date, week end date, status, total hours, and submission timestamp. A user with time approval permission can view all submitted timesheets across the organization.


## Timer Operations

Employees can start a live timer to track their work in real time, with each employee limited to at most one active timer at any given moment. Starting a timer requires selecting a project that the employee is assigned to, and optionally a task within that project along with a description of the ongoing work. The timer records the start timestamp, the selected project, the optional task, and the description. An employee can stop their running timer at any point, which automatically creates a new timelog with the duration calculated from the elapsed time between start and stop, rounded to the nearest minute. Alternatively, an employee can discard their running timer entirely, in which case no timelog is created and the timer data is simply cleared. Employees can view their currently running timer to see how long they have been tracking and what project they are working on. If an employee forgets to stop their timer, it continues running indefinitely with no automatic stop mechanism, requiring the employee to manually stop or discard it later. Employees can also edit the description, project, or task of an actively running timer without needing to stop and restart it.

### Starting a Timer

An employee can start a live time tracking timer to record work in real time.

THE system SHALL allow an employee to start a timer by providing a project, an optional task, and an optional description of the ongoing work.

THE system SHALL ensure the employee has at most one active timer at any given moment. If the employee already has a running timer, the system SHALL reject the request to start a new one.

THE system SHALL require the employee to select a project that they are assigned to as a project member.

WHERE the employee provides a task, THE system SHALL verify the task belongs to the selected project.

THE system SHALL record the start timestamp at the moment the timer is started.

THE system SHALL allow the employee to set a free-text description describing the work being performed during the timer session.

### Stopping a Timer

An employee can stop their currently running timer at any time.

WHEN the employee stops the timer, THE system SHALL automatically create a new timelog with the following properties:
- Date set to the current date
- Duration in minutes calculated from the elapsed time between the timer's start timestamp and the stop moment
- Project set to the project recorded on the timer
- Task set to the task recorded on the timer, if any
- Description set to the description recorded on the timer, if any
- Billable flag set to yes by default

THE system SHALL round the calculated duration to the nearest whole minute.

THE system SHALL clear the timer data after the timelog has been successfully created.

### Discarding a Timer

An employee can discard their currently running timer instead of stopping it.

WHEN the employee discards the timer, THE system SHALL clear the timer data without creating any timelog. No time entry is recorded from a discarded timer.

THE system SHALL permanently remove the discarded timer's data, including the start timestamp, project, task, and description.

### Viewing Timer Status

An employee can view their currently running timer to monitor their active tracking session.

THE system SHALL display the following information about the running timer:
- The project being worked on
- The task being worked on, if one was selected
- The description of the ongoing work
- The elapsed time since the timer was started

The elapsed time SHALL update in real time while viewing, reflecting the current duration since the start timestamp.

### Timer Duration Behavior

A running timer continues indefinitely until the employee takes action.

THE system SHALL NOT automatically stop a timer under any circumstances. There is no time limit, session timeout, or automatic cutoff.

IF an employee forgets to stop their timer, THEN the employee SHALL be required to manually stop or discard it at a later time. The timer will have been running for the entire elapsed duration since it was started.

WHEN a forgotten timer is eventually stopped, THE system SHALL create a timelog covering the full elapsed duration (rounded to the nearest minute), with the date reflecting the day the timer is stopped.

### Editing a Running Timer

An employee can modify the details of an actively running timer without needing to stop and restart it.

THE system SHALL allow the employee to edit the description of a running timer at any time while the timer is active.

THE system SHALL allow the employee to change the project on a running timer. The new project must be one that the employee is assigned to as a project member.

THE system SHALL allow the employee to change the task on a running timer. If a new task is provided, it must belong to the currently selected project on the timer.

Where the employee changes the project, THE system SHALL clear any previously selected task if that task does not belong to the new project.

## ActivityLog Operations

The system automatically records significant actions as activity log entries, capturing the timestamp of each action, the user who performed it, the type of action, the target entity that was affected, and relevant details about what changed. The logged actions span the full range of organizational activities including when an employee is invited, deactivated, or reactivated, when a contract is created or edited, when a project is created, archived, completed, or deleted, when a task status changes, when a timesheet is submitted, approved, or rejected, and when a role is assigned to or changed for an employee. Activity log entries are system-generated and cannot be manually created, edited, or deleted by any user, ensuring a trustworthy and tamper-proof audit trail. Users with organization management permission can view the full activity log across the entire organization. The activity log is presented as a paginated list to handle potentially large volumes of entries. Users can filter the activity log by action type, by the specific user who performed the actions, and by date range to narrow down the events of interest.

### Automatic Activity Log Creation and Immutability

THE system SHALL automatically create an activity log entry whenever a logged action occurs within the organization, without requiring any manual user action.

IF any user attempts to manually create, edit, or delete an activity log entry, THEN THE system SHALL reject the request.

THE system SHALL preserve all activity log entries as an immutable, tamper-proof audit trail for the organization's lifetime.

### Activity Log Entry Structure

THE system SHALL record the following attributes in every activity log entry:

- The timestamp of when the action occurred
- The user who performed the action
- The action type that classifies the nature of the action
- The target entity that was affected by the action
- Relevant details describing what changed

THE system SHALL associate every activity log entry with the organization in which the action took place.

### Employee-Related Activity Logging

WHEN an employee is invited to the organization, THE system SHALL create an activity log entry with action type "employee invited," identifying the inviting user and the invited email address.

WHEN an employee is deactivated, THE system SHALL create an activity log entry with action type "employee deactivated," identifying the user who performed the deactivation and the affected employee.

WHEN a deactivated employee is reactivated, THE system SHALL create an activity log entry with action type "employee reactivated," identifying the user who performed the reactivation and the affected employee.

### Contract-Related Activity Logging

WHEN a contract is created for an employee, THE system SHALL create an activity log entry with action type "contract created," identifying the user who created the contract and the affected employee.

WHEN an active contract is edited, THE system SHALL create an activity log entry with action type "contract edited," identifying the user who made the edit, the affected employee, and details of what was changed.

### Project-Related Activity Logging

WHEN a project is created, THE system SHALL create an activity log entry with action type "project created," identifying the user who created the project and the project name.

WHEN a project is archived, THE system SHALL create an activity log entry with action type "project archived," identifying the user who archived the project and the affected project.

WHEN a project is marked as completed, THE system SHALL create an activity log entry with action type "project completed," identifying the user who completed the project and the affected project.

WHEN a project is deleted, THE system SHALL create an activity log entry with action type "project deleted," identifying the user who deleted the project and the project name.

### Task-Related Activity Logging

WHEN a task status changes, THE system SHALL create an activity log entry with action type "task status changed," identifying the user who made the change, the affected task, and recording the old status and new status in the entry details.

### Timesheet-Related Activity Logging

WHEN a timesheet is submitted for approval, THE system SHALL create an activity log entry with action type "timesheet submitted," identifying the employee who submitted the timesheet and the timesheet's week start date.

WHEN a submitted timesheet is approved, THE system SHALL create an activity log entry with action type "timesheet approved," identifying the user who approved the timesheet and the employee who owns the timesheet.

WHEN a submitted timesheet is rejected, THE system SHALL create an activity log entry with action type "timesheet rejected," identifying the user who rejected the timesheet, the employee who owns the timesheet, and the rejection reason.

### Role-Related Activity Logging

WHEN a role is assigned to an employee, THE system SHALL create an activity log entry with action type "role assigned," identifying the user who made the assignment, the affected employee, and the assigned role.

WHEN an employee's role is changed to a different role, THE system SHALL create an activity log entry with action type "role changed," identifying the user who made the change, the affected employee, the old role, and the new role.

### Viewing and Filtering the Activity Log

THE system SHALL allow users with organization management permission to view the full activity log for the currently selected organization.

THE system SHALL present the activity log as a paginated list to accommodate potentially large volumes of entries.

THE system SHALL allow filtering the activity log by action type, so viewers can narrow results to specific categories of actions.

THE system SHALL allow filtering the activity log by the user who performed the actions, so viewers can review all actions taken by a particular individual.

THE system SHALL allow filtering the activity log by date range, so viewers can narrow results to actions that occurred within a specified time period.

THE system SHALL scope all activity log views strictly to the currently selected organization context.

## Invitation Operations

Invitations are created when a user with employee management permission invites someone to join the organization by email and no user account exists for that email address. Each invitation records the invited email address, the invitation status, and the timestamp when the invitation was sent. The invitation remains in a pending state until the invited person signs up for the platform using that exact email address. When the invited person completes sign-up with the matching email, the system automatically adds them to the organization as an employee and fulfills the pending invitation. A single email address can have pending invitations to multiple organizations, and signing up with that email automatically fulfills all pending invitations across all organizations simultaneously. Users with employee management permission can view the list of all pending invitations for their organization, giving them visibility into which invitations are still outstanding. Invitations that have been fulfilled are no longer considered pending and reflect the completed status.

### Invitation Creation

WHEN a user with employee management permission provides an email address that does not belong to any existing user account, THE system SHALL create a pending invitation for that email address within the current organization.

THE system SHALL record the invited email address, set the invitation status to pending, and capture the timestamp when the invitation was sent.

IF the provided email address already belongs to an existing user account, THEN THE system SHALL add that user directly to the organization as an employee instead of creating an invitation (defined in Employee Operations).

IF the provided email address already has a pending invitation in the same organization, THEN THE system SHALL reject the creation of a duplicate pending invitation.

THE system SHALL validate that the provided email address is in a valid email format before creating an invitation.

### Invitation Status and Fulfillment

THE system SHALL maintain the invitation in a pending state from the moment it is created until the invited person completes sign-up with the matching email address.

WHEN the invited person signs up using the exact email address recorded in the invitation, THE system SHALL automatically fulfill the invitation and add the new user to the organization as an employee.

WHERE an invitation has been fulfilled, THE system SHALL update the invitation status to reflect the fulfilled state.

THE system SHALL allow users with employee management permission to distinguish between pending and fulfilled invitations when viewing the invitation list.

### Multi-Organization Invitation Handling

THE system SHALL allow a single email address to have pending invitations from multiple organizations simultaneously.

WHEN a user signs up with an email address, THE system SHALL check for all pending invitations across all organizations that match that email address.

IF the signing-up email address has pending invitations in multiple organizations, THEN THE system SHALL automatically fulfill all matching pending invitations at once and add the user as an employee to each of those organizations.

THE system SHALL ensure that fulfillment of one invitation does not affect the status of other pending invitations that do not match the signing-up email address.

### Viewing Pending Invitations

WHERE a user has employee management permission, THE system SHALL allow viewing of all invitations for their current organization.

THE system SHALL display each invitation with its invited email address, current status, and the timestamp when the invitation was sent.

The system SHALL support pagination of the invitation list.

THE system SHALL allow filtering the invitation list by status so that users can view only pending invitations, only fulfilled invitations, or all invitations.

THE system SHALL allow users to search invitations by invited email address within their organization.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Organization owners may attempt to delete their organization while unresolved conditions exist. The system must block deletion when any pending timesheets remain in submitted status that have not been approved or rejected. Deletion is also blocked if there are active employee contracts within the organization. When an owner tries to delete an organization that fails these checks, the system provides clear reasoning listing which timesheets or contracts are blocking the action. Organization creation during initial sign-up requires a unique name within the system; duplicate organization names are rejected with an error. Required fields such as name, currency, and timezone cannot be left blank during creation or editing. The currency field must be a recognized currency code; entering an unsupported or malformed currency value is rejected. The fiscal start month must be a valid month number between 1 and 12; values outside this range or non-numeric input are not accepted. An organization owner who is the sole owner cannot leave the organization or transfer out without first appointing a successor; the system prevents orphaned organizations. When editing organization settings, users without org:manage permission receive an access denied error and the changes are not applied. If an organization is deleted, all associated data is permanently removed; any attempt to access that organization's data afterward results in a not-found error. During multi-tenancy operations, an action scoped to the wrong organization context is blocked with an appropriate context mismatch error.

### Organization Deletion Precondition Checks

IF there are timesheets in submitted status that have not been approved or rejected within the organization, THEN THE system SHALL block organization deletion.

IF there are active employee contracts within the organization, THEN THE system SHALL block organization deletion. An active contract is one whose end date is null or set to a future date, and whose associated employee has an active status.

WHEN organization deletion is blocked due to pending timesheets or active contracts, THE system SHALL provide a clear error message detailing every blocking item. For each blocking timesheet, the message SHALL identify the associated employee and the week it covers. For each blocking contract, the message SHALL identify the associated employee, the contract start date, and the pay rate.

WHEN an organization is successfully deleted, THE system SHALL permanently remove all associated employees, projects, tasks, timelogs, timesheets, departments, roles, invitations, and activity log entries. THE system SHALL preserve the owner's user account but remove its association with the deleted organization.

### Organization Creation Validation

IF an organization is created with a name that already exists in the system, THEN THE system SHALL reject the creation and return an error indicating that the organization name is already taken.

IF any required field — name, currency, or timezone — is missing during organization creation, THEN THE system SHALL reject the creation and indicate which required fields are missing.

IF the currency field does not contain a recognized currency code, THEN THE system SHALL reject the request and indicate that an unsupported currency was provided. Recognized currency codes include ISO currency codes such as USD, EUR, and KRW; any value not matching a supported currency is rejected.

IF the fiscal start month is not an integer between 1 and 12 inclusive, THEN THE system SHALL reject the request and indicate that the fiscal start month must be a value from 1 to 12.

### Organization Timezone Validation

IF the timezone field does not contain a valid timezone identifier, THEN THE system SHALL reject the request and indicate that a valid timezone is required. A valid timezone is one recognized by the system, such as those from the IANA timezone database.

WHEN an organization owner edits the timezone setting, THE system SHALL apply the same validation as during creation.

### Sole Owner Transfer Restriction

IF an organization owner who is the sole owner of the organization attempts to leave the organization or transfer their ownership without first designating a successor owner, THEN THE system SHALL block the action. THE system SHALL return an error indicating that the organization must have at least one owner and that a successor must be assigned before the current sole owner can leave or transfer.

### Organization Settings Edit Authorization

IF a user without the org:manage permission attempts to edit organization settings, THEN THE system SHALL reject the request with an access denied error. THE system SHALL not apply any changes to the organization settings.

### Deleted Organization Data Access

IF a user attempts to access any data belonging to a deleted organization, THEN THE system SHALL return a not-found error. This applies to all entity types associated with the organization, including employees, projects, tasks, timelogs, timesheets, departments, roles, and activity logs.

WHEN an organization is deleted, THE system SHALL ensure that all organization-scoped queries return no results for that organization.

### Organization Context Mismatch

IF a user attempts to perform an action scoped to an organization that does not match their currently selected organization context, THEN THE system SHALL reject the request with a context mismatch error. THE system SHALL enforce organization context on every request to ensure data isolation between organizations.

WHEN a context mismatch is detected, THE system SHALL indicate that the requested organization does not match the user's active organization context.

## User Error Scenarios

A user attempting to sign up with an email that already has an account receives a duplicate email error and is prompted to log in instead. Sign-up with an invalid email format is rejected before any account is created, and the user must correct the email to proceed. Passwords that do not meet minimum strength requirements are rejected during sign-up with guidance on what constitutes an acceptable password. During login, entering an incorrect password results in an invalid credentials error without revealing whether the email or password was wrong, preserving security. A user trying to change their password must provide their current password correctly; entering the wrong current password blocks the change and displays an authentication failure message. Setting the new password identical to the current password is rejected to enforce meaningful changes. Account deletion is blocked if the user is the sole owner of an active organization; the system requires ownership transfer or organization deletion before the account can be removed. If the user deletes their account while belonging to other organizations as an employee, those employee records are deactivated rather than deleted, preserving organizational history. Switching to an organization the user does not belong to is prevented with an access denied error. Logging in without selecting an organization context prevents any further actions until a valid organization is chosen. Session expiry while performing an action results in a re-authentication requirement and the incomplete action is not persisted.

### Sign-Up Error Scenarios

When a user attempts to sign up with an email that already has an existing account, the system rejects the registration and informs the user that an account with that email already exists, prompting them to log in instead. No duplicate account is created.

When sign-up is attempted with an email address that does not conform to a valid email format, the system rejects the request before any account is created. The user must correct the email address to a properly formatted one to proceed.

When a password provided during sign-up does not meet minimum strength requirements, the system rejects the registration and provides the user with clear guidance on what constitutes an acceptable password. The account is not created until a sufficiently strong password is provided.

### Login Error Scenarios

When a user attempts to log in with an incorrect password, the system returns a generic invalid credentials error. The system does not distinguish between an unrecognized email and an incorrect password, preserving security through credential ambiguity. The user must re-enter both email and password to retry.

The system never reveals which specific credential component — email or password — is incorrect during a failed login attempt. Every failed login returns the same uniform error message regardless of whether the email exists in the system or the password was simply wrong. This prevents an attacker from enumerating valid email addresses.

### Password Change Error Scenarios

When a user attempts to change their password but provides an incorrect current password, the system blocks the password change and displays an authentication failure message. The password remains unchanged, and the user must supply the correct current password to proceed.

When the new password is identical to the current password, the system rejects the change. The user is informed that the new password must differ from the current password to enforce a meaningful update.

### Account Deletion Error Scenarios

When a user who is the sole owner of an active organization attempts to delete their account, the system blocks the deletion. The user must first transfer ownership to another member of the organization or delete the organization entirely before their account can be removed. This ensures the organization is never left without a responsible owner.

When a user deletes their account while belonging to other organizations as a non-owner employee, the system deactivates those employee records rather than deleting them. The user's historical contributions — such as timelogs, timesheets, and task assignments — are preserved for organizational record-keeping and audit purposes. The deactivated employee record is marked with a deactivated status and the user account reference is retained.

### Organization Context Error Scenarios

When a user attempts to switch to an organization they do not belong to, the system denies the switch and displays an access denied error. The user remains in their current organization context or, if no context was previously set, is returned to the organization selection screen.

When a user is logged in but has not selected an organization context, the system blocks all subsequent actions. Any attempt to perform an operation without an active organization context is rejected with an error indicating that an organization must be selected first. The user must choose a valid organization they belong to before any work can begin.

### Session Expiry Error Scenarios

When a user's session expires while they are performing an action, the system requires the user to re-authenticate before proceeding. The system detects the expired session and interrupts the current operation, presenting the login prompt. Once re-authenticated, the user must reselect an organization context before continuing.

When a session times out during an in-progress action, the incompletely processed action is not persisted to the system. Any data the user was in the process of entering or modifying is lost. After re-authentication, the user must restart the entire operation from the beginning.

## Employee Error Scenarios

Inviting an employee who is already active in the same organization results in a duplicate membership error, and no new record is created. When an invited email belongs to a previously deactivated employee, the system handles the invitation by reactivating the existing record rather than creating a duplicate. Editing an employee record without the employee:manage permission returns an access denied error and the changes are discarded. Assigning a role that does not exist within the current organization is rejected, and the user must select from the organization's defined roles. The employment type field must be one of the recognized values: full-time, part-time, contractor, or intern; any other value is rejected during creation or editing. Deactivating an already deactivated employee results in a no-op or a notification that the employee is already inactive. Reactivating an already active employee similarly produces a warning that no change is needed. Filtering the employee list with criteria that match no employees returns an empty result set rather than an error, allowing the user to adjust their filters. Searching by name with a string that matches no employee displays a no-results message. Assigning a department that does not exist in the organization is rejected with a not-found error. An employee who has been deactivated attempting to log time or submit a timesheet receives an access denied error specific to their inactive status.

### Invitation Error Scenarios

### Duplicate Active Employee Invitation

WHEN a user with employee:manage permission invites an email that already belongs to an active employee in the same organization, THE system SHALL reject the invitation and no new employee record SHALL be created.

### Deactivated Employee Invitation

WHEN a user with employee:manage permission invites an email that belongs to a previously deactivated employee in the organization, THE system SHALL reactivate the existing employee record rather than creating a duplicate. The reactivated employee SHALL retain their previous role, department, position, and employment type unless explicitly changed during the reactivation process.

### Permission Denied on Employee Edit

### Unauthorized Employee Edit

IF a user without the employee:manage permission attempts to edit an employee record, THEN THE system SHALL reject the request and the employee record SHALL remain unchanged.

This applies to all employee edit operations including changing department, position, employment type, and role assignment.

### Validation Errors

### Invalid Role Assignment

IF a user attempts to assign a role that does not exist within the current organization to an employee, THEN THE system SHALL reject the assignment. The role MUST be selected from the organization's defined roles.

### Invalid Employment Type

IF an employment type value is not one of the recognized values — full-time, part-time, contractor, or intern — THEN THE system SHALL reject the request during employee creation or editing.

### Department Not Found

IF a department assigned to an employee does not exist in the organization, THEN THE system SHALL reject the assignment with a not-found error.

### Status Change No-Op Scenarios

### Deactivating an Already Deactivated Employee

WHEN a user attempts to deactivate an employee whose status is already deactivated, THE system SHALL respond indicating that no change is necessary. The employee's status SHALL remain unchanged.

### Reactivating an Already Active Employee

WHEN a user attempts to reactivate an employee whose status is already active, THE system SHALL respond indicating that no change is necessary. The employee's status SHALL remain unchanged.

### Empty Result Handling

### Empty Filter Results

WHEN filtering the employee list by department, employment type, or status with criteria that match no employees, THE system SHALL return an empty result set. No error SHALL be raised, allowing the user to adjust their filter criteria.

### Name Search with No Matches

WHEN searching employees by name with a search string that matches no employee records, THE system SHALL display a no-results message. No error SHALL be raised.

### Deactivated Employee Action Restrictions

### Time Logging Restriction

IF a deactivated employee attempts to create or edit a timelog, THEN THE system SHALL deny the request. The denial SHALL indicate that the action is not permitted due to the employee's inactive status.

### Timesheet Submission Restriction

IF a deactivated employee attempts to submit a timesheet, THEN THE system SHALL deny the request. The denial SHALL indicate that the action is not permitted due to the employee's inactive status.

### General Action Restriction

WHILE an employee has a deactivated status, THE system SHALL restrict all time-related actions including time logging, timesheet submission, and timer operations. Historical data belonging to the deactivated employee, including existing timelogs and timesheets, SHALL remain preserved and accessible to authorized users.

## Role Error Scenarios

Attempting to delete a built-in role such as Owner, Manager, or Employee is unconditionally blocked, and the system returns an error explaining these roles cannot be removed. Deleting a custom role that still has employees assigned to it is rejected; the owner must reassign all affected employees to another role before deletion can proceed. Creating a custom role with a name that duplicates an existing role in the same organization is rejected to maintain unique role identification. Assigning a permission that does not exist in the system's defined permission set results in a validation error and the role is not created or updated. A custom role created with an empty permission set is technically allowed but results in the assigned employee having no actionable permissions beyond basic access. Editing a built-in role's permissions is not permitted; any such attempt returns an access denied error. The role name field is required; submitting a blank or missing name during creation or editing is rejected. A user attempting to change role assignments without the employee:manage permission is blocked and the assignment remains unchanged. The three built-in roles must always exist in every organization; the system ensures they are seeded on organization creation and cannot be deleted under any circumstances.

### Built-in Role Deletion Blocked

WHEN an organization owner attempts to delete a built-in role (Owner, Manager, or Employee), THE system SHALL reject the request unconditionally.

IF the target role is one of the three built-in roles, THEN THE system SHALL return an error stating that built-in roles cannot be deleted.

THE system SHALL ensure the three built-in roles (Owner, Manager, Employee) are seeded automatically upon organization creation and remain immutable for the lifetime of the organization.

No user, including the organization owner, SHALL be permitted to delete any of the three built-in roles under any circumstances.


### Custom Role Deletion with Assigned Employees Rejected

WHEN an organization owner attempts to delete a custom role that currently has one or more employees assigned to it, THE system SHALL reject the request.

IF any employee in the organization is assigned to the custom role being deleted, THEN THE system SHALL return an error indicating that all employees must be reassigned to a different role before the role can be deleted.

THE system SHALL require the organization owner to reassign every affected employee to another valid role prior to permitting the deletion.


### Duplicate Role Name Rejection

WHEN an organization owner attempts to create a new custom role or rename an existing custom role with a name that already belongs to another role in the same organization, THE system SHALL reject the request.

IF the submitted role name matches an existing role name in the organization (case-insensitive), THEN THE system SHALL return an error indicating that role names must be unique within the organization.

THE system SHALL enforce role name uniqueness across both built-in and custom roles within each organization.


### Invalid Permission Assignment Validation

WHEN an organization owner attempts to create or update a custom role with a permission that does not exist in the system's defined permission set, THE system SHALL reject the request.

IF any permission in the submitted permission list is not part of the defined set (org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, report:view), THEN THE system SHALL return a validation error and the role SHALL NOT be created or updated.

THE system SHALL validate every permission against the defined set before persisting any role changes.


### Empty Permission Set on Custom Role

THE system SHALL allow an organization owner to create a custom role with an empty permission set.

IF a custom role is created with no permissions assigned, THEN THE system SHALL accept the role creation without error.

WHEN an employee is assigned to a custom role with an empty permission set, THE system SHALL grant the employee basic access to the organization but no actionable permissions beyond viewing their own profile and data.


### Editing Built-in Role Permissions Denied

WHEN an organization owner attempts to modify the permissions of a built-in role (Owner, Manager, or Employee), THE system SHALL reject the request.

IF the target role is a built-in role, THEN THE system SHALL return an access denied error indicating that the permissions of built-in roles cannot be changed.

THE built-in role permission sets SHALL remain fixed and immutable for all organizations.


### Missing Role Name Validation

WHEN an organization owner attempts to create a custom role without providing a name, or edits an existing custom role to have a blank or missing name, THE system SHALL reject the request.

IF the role name field is empty, contains only whitespace, or is not provided, THEN THE system SHALL return a validation error indicating that the role name is required.

THE system SHALL require a non-empty role name for both role creation and role update operations.


### Role Assignment Authorization

WHEN a user without the employee:manage permission attempts to change an employee's role assignment, THE system SHALL reject the request.

IF the requesting user does not hold the employee:manage permission in the organization, THEN THE system SHALL return an access denied error and the employee's role assignment SHALL remain unchanged.

THE system SHALL verify the requesting user holds the employee:manage permission before processing any role assignment change.


## Contract Error Scenarios

Creating a contract with a start date that falls after the end date is rejected as an invalid date range; the system requires start date to be on or before the end date. The pay rate field must be a positive numeric value; entering zero or a negative number is rejected during contract creation or editing. The pay period must be one of the recognized values: hourly, daily, weekly, or monthly; any other string is rejected. Working hours per week must be a positive number; a value of zero or negative is rejected. Creating a contract for an employee who does not exist in the organization results in a not-found error. When a new contract is created for an employee who already has an active contract, the system automatically ends the previous active contract by setting its end date to the day before the new contract starts; this is a business rule rather than an error. Attempting to edit a past contract that has already ended is blocked; the system considers past contracts immutable historical records and rejects modifications. Setting an end date on a new or active contract that precedes the contract's own start date returns a date validation error. Notes are optional, and submitting a contract without notes is accepted without error. A user without employee:manage permission attempting to create or edit a contract receives an access denied error.

### Start Date and End Date Validation

When creating or editing a contract, the system validates the relationship between the start date and the end date.

If the start date is after the end date, the request is rejected. The system requires the start date to be on or before the end date. This validation applies to both contract creation and editing of the current active contract.

An end date of null is permitted and indicates an ongoing contract with no predetermined end. No date range validation is performed when the end date is null.

### Pay Rate Validation

The pay rate field must contain a positive numeric value.

If the pay rate is zero, the request is rejected. A zero pay rate has no business meaning in a compensation context and is treated as invalid input.

If the pay rate is a negative number, the request is rejected. Negative compensation values are not supported.

If the pay rate is missing entirely during contract creation, the request is rejected since the pay rate is a required field.

### Pay Period Validation

The pay period field must be exactly one of the four recognized values: hourly, daily, weekly, or monthly.

If the pay period is any other string — such as "biweekly", "annually", "quarterly", or a misspelled variant — the request is rejected. The system does not accept custom or unrecognized pay period values.

If the pay period is missing during contract creation, the request is rejected since the pay period is a required field.

If the pay period is an empty string, the request is rejected as an invalid value.

### Working Hours Per Week Validation

The working hours per week field must contain a positive numeric value.

If working hours per week is zero, the request is rejected. A zero-hour work week is not meaningful for a contract.

If working hours per week is a negative number, the request is rejected. Negative working hours are not valid.

If working hours per week is missing during contract creation, the request is rejected since the field is required.

### Non-Existent Employee Error

When creating a contract, the system verifies that the specified employee exists within the organization.

If the employee does not exist — for example, the employee has been deleted from the organization or the employee identifier does not correspond to any employee record — the request is rejected with a not-found error.

If the employee exists but is not a member of the current organization context, the request is rejected. Contracts are scoped to the organization and employees in one organization cannot have contracts created from another organization.

### Automatic Previous Contract End Date Setting

When a new contract is created for an employee who already has an active contract, the system automatically ends the previous active contract.

The previous active contract's end date is set to the day before the new contract's start date. For example, if the new contract starts on March 15, the previous contract's end date is set to March 14.

This automatic end date setting is a business rule, not an error condition. The system performs this action silently during the new contract creation process.

This automatic adjustment applies only to contract creation, not to contract editing. Editing an existing contract does not affect other contracts.

### Immutable Past Contract

Past contracts — those with an end date that has already passed — are treated as immutable historical records.

Any attempt to edit a past contract is blocked. The system rejects the modification request and the contract's data remains unchanged.

Editing is only permitted on the current active contract. An active contract is one with a null end date or an end date in the future.

If a user attempts to edit a past contract, the system responds with an error indicating that historical contracts cannot be modified.

### Optional Notes

The notes field on a contract is optional.

If notes are omitted during contract creation, the request is accepted without error. The contract is created with a null or blank notes value.

If notes are submitted as an empty string, the request is accepted. An empty string is treated as equivalent to no notes.

If notes are submitted with content, the content is stored as provided.

### Permission Enforcement

Contract creation and editing are restricted to users with the employee:manage permission within the organization.

If a user without the employee:manage permission attempts to create a contract, the request is rejected with an access denied error.

If a user without the employee:manage permission attempts to edit an existing contract, the request is rejected with an access denied error.

Users with the employee:manage permission can create and edit any contract for any employee in the organization.

Employees can view their own contracts. Users with the employee:view permission can view any employee's contracts. Viewing contracts does not require the employee:manage permission.

## Department Error Scenarios

Creating a department with a name that already exists in the same organization is rejected to maintain uniqueness. The department name is required; submitting a blank or missing name during creation or editing results in a validation error. Setting a parent department that does not exist in the organization returns a not-found error and the assignment is not saved. Setting a department as its own parent is detected as a circular reference and blocked. Similarly, creating a chain where department A's parent is department B and department B's parent is department A is prevented through circular reference detection. Deleting a department that has employees assigned to it does not fail; instead, the system sets those employees' department to null, effectively unassigning them. This is a graceful edge case where data integrity is maintained without blocking the deletion. Editing a department's parent to a value that would create a circular chain is rejected with a clear error message. A user without org:manage permission attempting any department management operation receives an access denied error. The description field is optional, and a department can be created or edited with an empty description without triggering an error.

### Department Name Validation

IF a department is created or edited with a missing or blank name, THEN THE system SHALL reject the request with a validation error indicating that the department name is required.

IF a department is created with a name that already exists within the same organization, THEN THE system SHALL reject the request with a duplicate name error. Department names must be unique within each organization.

IF a department is edited to change its name to one that already exists within the same organization, THEN THE system SHALL reject the request with a duplicate name error.

### Parent Department Existence Verification

IF a department is created or edited with a parent department identifier that does not correspond to any existing department in the same organization, THEN THE system SHALL reject the request with a not-found error indicating that the parent department does not exist.

WHEN setting a parent department for a department, THE system SHALL verify that the referenced parent department belongs to the same organization as the child department. IF the parent department belongs to a different organization, THEN THE system SHALL reject the request.

### Circular Parent Reference Prevention and Nesting Depth Enforcement

THE system SHALL enforce a maximum department nesting depth of one level. IF a department is created or edited with a parent department that already has a parent of its own, THEN THE system SHALL reject the request with an error indicating that the maximum nesting depth would be exceeded.

IF a department is edited to set its own identifier as its parent department, THEN THE system SHALL detect the self-reference and reject the request with a circular reference error.

IF a department is edited to set a parent department that would create a circular chain (for example, department A is parent of department B, and department B is being set as parent of department A), THEN THE system SHALL detect the circular chain and reject the request with a clear error message indicating that the operation would create a circular parent hierarchy.

WHEN validating parent department assignments, THE system SHALL traverse the parent chain to detect any circular references before allowing the assignment to be saved.

### Department Deletion with Assigned Employees

WHEN a department that has employees assigned to it is deleted, THE system SHALL not block the deletion. Instead, THE system SHALL set the department field of all affected employees to null, effectively unassigning them from the deleted department.

### Permission Enforcement for Department Operations

IF a user without the org:manage permission attempts to create a department, THEN THE system SHALL reject the request with an access denied error.

IF a user without the org:manage permission attempts to edit a department, THEN THE system SHALL reject the request with an access denied error.

IF a user without the org:manage permission attempts to delete a department, THEN THE system SHALL reject the request with an access denied error.

### Optional Description Field Handling

WHERE a department is created or edited, THE system SHALL accept an empty or omitted description field without triggering any validation error. The description field is optional.

## Project Error Scenarios

Deleting a project that has timelogs associated with it is blocked; the system requires all timelogs to be removed from the project before deletion can proceed. The project name is required, and submitting a blank name during creation or editing is rejected. The color code field is required for UI display purposes; a missing or invalid color code results in a validation error. Budget hours, if provided, must be a positive number; a negative or zero budget hours value is rejected. If the start date and end date are both provided, the end date must not precede the start date; an invalid date range is rejected. Archiving or completing a project that is already in archived or completed status results in an error indicating the project is already in that state. Once a project is archived or completed, any attempt to log time against it is blocked with an error explaining the project is not active. Editing a project without the project:manage permission returns an access denied error. Filtering the project list by status and receiving no results displays an empty set rather than an error. A project start date and end date are optional; a project can be created without these dates and edited later without issue.

### Project Field Validation Errors

IF the project name is empty or missing during creation or editing, THEN THE system SHALL reject the request with an error indicating that the project name is required.

IF the project color code is missing or not a valid color value during creation or editing, THEN THE system SHALL reject the request with an error indicating that a valid color code is required.

IF the project budget hours is provided and is zero or a negative number, THEN THE system SHALL reject the request with an error indicating that budget hours must be a positive number.

IF both the project start date and end date are provided and the end date is earlier than the start date, THEN THE system SHALL reject the request with an error indicating that the end date must not precede the start date.

### Project Deletion Blocked by Existing Timelogs

IF a user attempts to delete a project that has one or more timelogs associated with it, THEN THE system SHALL block the deletion and return an error indicating that all timelogs must be removed from the project before deletion can proceed.

A project with no timelogs may be deleted without restriction by users with the project:manage permission.

### Archiving an Already Archived Project

IF a user attempts to archive a project that is already in archived status, THEN THE system SHALL reject the request with an error indicating that the project is already archived.

### Completing an Already Completed Project

IF a user attempts to mark a project as completed when it is already in completed status, THEN THE system SHALL reject the request with an error indicating that the project is already completed.

### Time Logging Against Non-Active Projects

IF an employee attempts to log time against a project that is in archived status, THEN THE system SHALL block the timelog creation and return an error indicating that time cannot be logged against an archived project.

IF an employee attempts to log time against a project that is in completed status, THEN THE system SHALL block the timelog creation and return an error indicating that time cannot be logged against a completed project.

Existing timelogs on archived or completed projects SHALL be preserved and remain viewable.

### Permission Denied on Project Edit

IF a user without the project:manage permission attempts to edit a project, THEN THE system SHALL reject the request with an access denied error.

### Empty Project Filter Results

IF the project list is filtered by status and the filter produces no matching results, THEN THE system SHALL return an empty list rather than an error response. This applies to filtering by active, archived, completed, or any combination of statuses.

### Optional Start and End Date Acceptance

The project start date and end date are optional fields. THE system SHALL accept project creation and editing requests that omit either or both of these dates. A project created without start and end dates may have them set or updated at any later time without restriction, provided the end date does not precede the start date when both are present.

## ProjectMember Error Scenarios

Assigning an employee to a project when the employee is not part of the organization results in a not-found or invalid membership error. Attempting to assign a deactivated employee to a project is rejected; only active employees can be added as project members. Adding the same employee to a project twice produces a duplicate membership error, and the duplicate assignment is not created. Removing an employee from a project when they are not currently a member returns an error indicating no such membership exists. The assigned role for a project membership must be either member or project-lead; any other value is rejected. A project lead attempting to manage tasks in a project where they are not assigned as project-lead receives an authorization error. A user without project:manage permission attempting to assign or remove project members is blocked with an access denied error. When an employee is deactivated from the organization, their project memberships are preserved but they can no longer log time against those projects. If a project is archived or completed, existing project memberships remain intact but no new members can be assigned. An employee who is removed from a project can still view their historical timelogs associated with that project.

### Assigning Non-Organization Employee to Project

When a user with project:manage permission attempts to assign an employee to a project and that employee does not belong to the same organization, the system rejects the assignment. The employee must be a member of the organization before being assigned to any project within that organization.

### Deactivated Employee Project Assignment Blocked

When a user with project:manage permission attempts to assign a deactivated employee to a project, the system rejects the assignment. Only employees with an active status can be added as project members. An employee who was previously deactivated must be reactivated before they can be assigned to any project.

### Duplicate Project Membership Rejection

When a user with project:manage permission attempts to add an employee to a project and that employee is already a member of the same project, the system rejects the request. Each employee can appear only once in a project's member list. The duplicate assignment is not created.

### Removing Non-Member from Project

When a user with project:manage permission attempts to remove an employee from a project and that employee is not currently a member of the project, the system rejects the request. No such membership exists, so the removal cannot be performed.

### Invalid Project Member Role Validation

When assigning an employee to a project or updating a project membership, the assigned role must be either "member" or "project-lead". Any other role value is rejected by the system. These are the only two valid roles for a project membership.

### Project Lead Authorization for Task Management

When a project lead attempts to manage tasks in a project where they are not assigned as project-lead, the system rejects the operation with an authorization error. A project lead's task management authority is limited to the specific project(s) where they hold the project-lead role. For projects where the employee is assigned only as a member, they cannot perform task management operations reserved for project leads.

### Permission Denied for Project Member Operations

When a user without the project:manage permission attempts to assign employees to a project or remove employees from a project, the system blocks the operation with an access denied error. Only users with the project:manage permission can perform project member assignment and removal operations.

### Deactivated Employee Membership Preservation

When an employee is deactivated from the organization, their existing project memberships are preserved. However, the deactivated employee can no longer log time against those projects. The memberships remain intact as historical records of project participation.

### Archived or Completed Project New Member Assignment Blocked

When a user with project:manage permission attempts to assign a new member to a project that has been archived or completed, the system rejects the assignment. Projects with a status of archived or completed cannot receive new project members. Existing project memberships on archived or completed projects remain intact.

### Historical Timelog Visibility After Project Removal

When an employee is removed from a project, they retain the ability to view their own historical timelogs that were previously logged against that project. Removal from a project does not revoke access to the employee's own past work records associated with that project.

## Task Error Scenarios

Assigning a task to an employee who is not a member of the project returns an invalid assignment error and the task assignment is not saved. Setting a task as its own parent task is detected and blocked as a circular reference. Creating a subtask where the parent task belongs to a different project is rejected; subtasks must reside within the same project as their parent. Only one level of nesting is permitted; attempting to create a subtask under a task that is already a subtask of another is rejected to enforce the nesting depth limit. The task title is required; submitting a blank title results in a validation error. Estimated hours, if provided, must be a positive number; a negative or zero value is rejected. When a task's status changes, the system must record a history entry capturing the old status, new status, timestamp, and who made the change; if no status change occurs, no history entry is created. A user who is neither a project lead for the project nor has project:manage permission cannot edit the task and receives an authorization error. Filtering tasks by status, priority, or assigned employee with no matching results returns an empty set. Sorting by due date or priority handles null values gracefully, with tasks missing those fields appearing last or first depending on the business preference. A closed task can be reopened by changing its status back to open or in-progress.

### Task Assignment to Non-Project Members

WHEN a user attempts to assign a task to an employee who is not a member of the task's project, THE system SHALL reject the assignment and return an error indicating the employee is not a project member.

WHEN a user creates a task with an assigned employee who does not belong to the task's project, THE system SHALL reject the task creation and return an assignment validation error.

WHEN a user updates an existing task's assigned employee to someone who is not a project member, THE system SHALL reject the update.

### Task Editing Authorization

IF a user attempts to edit a task and the user does not have project:manage permission and is not a project lead for that task's project, THEN THE system SHALL reject the edit and return an authorization error.

WHERE a user is a project lead for a project, THE system SHALL allow editing tasks within that project.

WHERE a user has project:manage permission, THE system SHALL allow editing any task in the organization.

IF a user who was previously a project lead is removed from the project, THEN THE system SHALL revoke their ability to edit tasks in that project.

### Task Hierarchy Constraints

WHEN a user attempts to set a task as its own parent, THE system SHALL detect the circular reference and reject the operation.

WHEN a user attempts to create a subtask where the parent task belongs to a different project, THE system SHALL reject the creation and return an error indicating the parent task and subtask must belong to the same project.

WHEN a user attempts to move a task to a parent belonging to a different project, THE system SHALL reject the move.

WHEN a user attempts to create a subtask under a task that is already a subtask of another task, THE system SHALL reject the creation to enforce the maximum nesting depth of one.

WHEN a user attempts to change a task's parent to a task that is itself a subtask, THE system SHALL reject the change to maintain the nesting depth of one.

### Task Field Validation

IF a task is created or edited with a blank or whitespace-only title, THEN THE system SHALL reject the operation and return a validation error indicating the title is required.

IF estimated hours are provided and the value is zero, THEN THE system SHALL reject the operation and return a validation error indicating estimated hours must be a positive number.

IF estimated hours are provided and the value is negative, THEN THE system SHALL reject the operation and return a validation error indicating estimated hours must be a positive number.

WHERE a task's priority is set, THE system SHALL only accept values of low, medium, high, or urgent; any other value is rejected.

WHERE a task's status is set, THE system SHALL only accept values of open, in-progress, completed, or closed; any other value is rejected.

### Task Status Change History Recording

WHEN a task's status is changed from one value to a different value, THE system SHALL automatically create a task history entry recording the timestamp, old status, new status, and the user who made the change.

IF a task is updated but the status value remains the same as before the update, THEN THE system SHALL NOT create a task history entry.

WHERE a task history entry exists, THE system SHALL prevent any user from editing or deleting it, ensuring the audit trail is immutable.

### Empty Task Filter Results

WHEN tasks are filtered by status and no tasks match the specified status, THE system SHALL return an empty result set rather than an error.

WHEN tasks are filtered by priority and no tasks match the specified priority, THE system SHALL return an empty result set.

WHEN tasks are filtered by assigned employee and no tasks match, THE system SHALL return an empty result set.

WHEN tasks are filtered by multiple criteria simultaneously and no tasks match all criteria, THE system SHALL return an empty result set.

### Null Value Handling in Task Sorting

WHEN tasks are sorted by due date in ascending order and some tasks have no due date set, THE system SHALL place tasks without a due date at the end of the sorted results.

WHEN tasks are sorted by due date in descending order and some tasks have no due date set, THE system SHALL place tasks without a due date at the end of the sorted results.

WHEN tasks are sorted by priority and some tasks have no priority set, THE system SHALL treat tasks without a priority as lower than the lowest defined priority, placing them at the end of the sorted results.

WHEN tasks are sorted by creation date, all tasks have a creation date so no null handling is required.

### Task Status Reopening from Closed

WHEN a user changes a task's status from closed to open, THE system SHALL record the status transition in the task history and update the task status to open.

WHEN a user changes a task's status from closed to in-progress, THE system SHALL record the status transition in the task history and update the task status to in-progress.

WHERE a task's status is closed, THE system SHALL allow authorized users to change the status to open or in-progress; changing directly to completed is not allowed from closed.

IF a user attempts to change a closed task's status to completed, THEN THE system SHALL reject the change as invalid.

## TaskHistory Error Scenarios

Task history entries are created automatically by the system when a task's status changes; they cannot be created, edited, or deleted manually by any user regardless of permissions. If a task update does not include a status change, no history entry is generated; the system only records meaningful status transitions. Each history entry must capture four required pieces of information: the timestamp of the change, the old status, the new status, and the user who made the change. If any of these fields were missing, the history entry would be incomplete and the system must ensure all are populated at creation time. Task history is immutable once recorded; no user, including the organization owner, can alter or delete history entries. This immutability ensures a tamper-proof audit trail of all task status changes. The old status and new status must differ for a valid history entry; recording a transition from a status to the same status is an invalid scenario that the system does not permit. Task history belongs to a specific task within a specific project within a specific organization, and cross-organization access is strictly prevented. Viewing task history requires that the requesting user has visibility into the parent task, which means they must be a project member or have sufficient permissions.

### Manual Task History Creation Blocked

IF a user attempts to manually create a task history entry, THEN THE system SHALL reject the request.

THE system SHALL generate task history entries exclusively through automatic detection of task status changes. No user — including the organization owner, a manager, or a project lead — may manually insert a history record. Any attempt to bypass automatic generation and create a history entry directly SHALL be refused.

WHEN a task's status field is modified, THE system SHALL automatically create a corresponding task history entry. This is the sole mechanism by which history entries are produced.

### Task History Edit or Delete Prohibited

IF a user attempts to edit an existing task history entry, THEN THE system SHALL reject the request.

IF a user attempts to delete a task history entry, THEN THE system SHALL reject the request.

THE system SHALL preserve all task history entries in their originally recorded form for the lifetime of the parent task. Task history entries are immutable once generated; no user, including the organization owner, may modify or remove them.

WHEN an organization owner attempts to alter a task history entry, THE system SHALL reject the request with the same enforcement applied to all other users.

THE system SHALL maintain a tamper-proof audit trail by ensuring that every recorded status transition remains permanently intact and unaltered.

### No History Entry Without Status Change

WHEN a task is updated without a change to its status field, THE system SHALL NOT create a task history entry.

THE system SHALL compare the incoming status value against the current status of the task for every update request. IF the incoming value matches the current status — or if no status field is present in the update — THEN THE system SHALL treat this as a non-status-changing update and SHALL NOT generate a history entry.

THE system SHALL only produce a task history entry when the new status value differs from the current status value of the task. Updates that modify other task fields (such as title, description, priority, estimated hours, due date, or assigned employee) without changing the status SHALL proceed without creating a history record.

### Required Fields for Task History Entries

WHEN the system automatically generates a task history entry, THE system SHALL populate all four required fields: the timestamp of the status change, the old status, the new status, and the user who made the change.

IF at the time of generation any of these four fields cannot be determined — for example, if the user context is unavailable — THEN THE system SHALL reject the status change and SHALL NOT create a partially populated history entry.

THE system SHALL record the timestamp reflecting the exact moment the status change was processed. THE system SHALL capture the identity of the authenticated user who initiated the status change. THE system SHALL record both the status before the change (old status) and the status after the change (new status) as discrete, accurate values.

### Same-Status Transition Prevention

IF a task status change is requested where the new status value is identical to the current status, THEN THE system SHALL NOT record a task history entry for that request.

THE system SHALL detect same-status transitions before attempting to generate a history entry. A transition from a status to the same status — for example, from "in-progress" to "in-progress" — is not a meaningful status change and SHALL NOT produce a history record.

THE system SHALL compare the old status and the new status as part of the automatic history generation logic. Only transitions where the old status and new status are distinct SHALL result in a history entry.

### Cross-Organization History Access Blocked

IF a user attempts to access task history entries belonging to a task within an organization the user does not belong to, THEN THE system SHALL deny access.

THE system SHALL scope all task history access to the user's currently selected organization context. Task history entries SHALL only be accessible when the parent task, its parent project, and the user's active organization selection are all aligned.

THE system SHALL NOT return task history entries that belong to tasks in organizations outside the user's current organization context under any circumstances.

### Task History Visibility Requires Task Access

IF a user attempts to view task history entries for a task they do not have access to, THEN THE system SHALL deny the request.

THE system SHALL verify that the requesting user has visibility into the parent task before returning any history entries. A user has visibility when they are a member of the project containing the task or when they hold a permission that grants view access to tasks in the organization.

THE system SHALL NOT reveal task history entries to users who lack access to the parent task, even if those users belong to the same organization. Task history visibility is fully contingent upon the user's access to the parent task.

## Timelog Error Scenarios

An employee attempting to log time against a project they are not assigned to receives an access error and the timelog is not created. Logging time against a task that belongs to a different project than the selected project is rejected; the task must be part of the specified project. The duration in minutes must be a positive value; zero or negative duration is rejected during creation. The date field is required and cannot be a future date; employees can only log time for the current date or past dates. Editing a timelog that is part of an approved timesheet is blocked; approved timesheets lock all included timelogs from modification. Deleting a timelog that belongs to a submitted or approved timesheet is blocked to preserve timesheet integrity. Employees can only create timelogs for themselves; attempting to create a timelog on behalf of another employee without the time:manage permission is denied. Users with time:manage permission can edit or delete any employee's timelogs, but they must still respect the approved timesheet lock. The project field is required; a timelog without a project assignment is rejected. The billable flag defaults to true if not explicitly set; this is not an error but an expected edge case behavior. Filtering timelogs with a date range that contains no entries returns an empty result set.

### Project and Task Assignment Validation

### Project Assignment Requirement

THE system SHALL require a project for every timelog.

IF the project field is missing or null, THEN THE system SHALL reject the timelog creation and return an error indicating that a project assignment is required.

### Project Membership Validation

WHEN an employee attempts to create a timelog, THE system SHALL verify that the employee is an active member of the selected project.

IF the employee is not assigned to the selected project, THEN THE system SHALL reject the timelog creation and return an error indicating the employee is not a member of the project.

IF the employee is a deactivated member of the organization, THEN THE system SHALL reject the timelog creation regardless of past project membership.

### Task-Project Consistency Validation

WHEN an employee selects both a project and a task for a timelog, THE system SHALL verify that the task belongs to the selected project.

IF the task belongs to a different project than the selected project, THEN THE system SHALL reject the timelog creation and return an error indicating the task does not belong to the specified project.

### Duration Validation

### Positive Duration Requirement

THE system SHALL require the duration in minutes to be a positive integer greater than zero.

IF the duration is zero, THEN THE system SHALL reject the timelog creation and return an error indicating that duration must be greater than zero.

IF the duration is a negative value, THEN THE system SHALL reject the timelog creation and return an error indicating that duration cannot be negative.

IF the duration is not a valid numeric value, THEN THE system SHALL reject the timelog creation and return an error indicating the duration format is invalid.

### Date Validation

### Date Requirement

THE system SHALL require a date for every timelog.

IF the date field is missing or null, THEN THE system SHALL reject the timelog creation and return an error indicating that the date is required.

### Future Date Prevention

THE system SHALL prevent employees from logging time for future dates.

IF the specified date is after the current date, THEN THE system SHALL reject the timelog creation and return an error indicating that future dates are not allowed.

THE system SHALL allow employees to log time for the current date and any past date.

### Timesheet Lock Enforcement

### Approved Timesheet Lock Enforcement

THE system SHALL lock all timelogs that are part of an approved timesheet.

WHEN a timesheet is approved, THE system SHALL prevent any modification or deletion of all timelogs included in that timesheet.

IF a user attempts to edit a timelog that belongs to an approved timesheet, THEN THE system SHALL reject the edit and return an error indicating the timelog is locked due to timesheet approval.

IF a user attempts to delete a timelog that belongs to an approved timesheet, THEN THE system SHALL reject the deletion and return an error indicating the timelog is locked.

### Submitted Timesheet Deletion Block

THE system SHALL prevent deletion of timelogs that are part of a submitted timesheet, even if the timesheet has not yet been approved or rejected.

IF a user attempts to delete a timelog that belongs to a submitted timesheet, THEN THE system SHALL reject the deletion and return an error indicating the timelog cannot be deleted while its timesheet is submitted.

### Lock Scope

THE timesheet lock SHALL apply uniformly regardless of which user attempts the modification. Even users with the time:manage permission SHALL respect the approved timesheet lock.

### Permission-Based Access Control

### Self-Only Timelog Creation for Employees

THE system SHALL restrict employees to creating timelogs only for themselves.

WHEN an employee without the time:manage permission creates a timelog, THE system SHALL automatically associate the timelog with the creating employee.

IF an employee without the time:manage permission attempts to create a timelog on behalf of another employee, THEN THE system SHALL reject the request and return an error indicating that employees can only log time for themselves.

### Time:Manage Permission for Cross-Employee Operations

WHERE a user has the time:manage permission, THE system SHALL allow that user to edit or delete any employee's timelogs within the organization, provided the timelogs are not part of an approved timesheet.

IF a user with the time:manage permission attempts to edit or delete a timelog that belongs to an approved timesheet, THEN THE system SHALL reject the operation — the approved timesheet lock overrides the time:manage permission.

### Default Value Behavior

### Billable Flag Default

THE system SHALL set the billable flag to yes when no explicit value is provided during timelog creation.

WHEN a timelog is created without specifying the billable flag, THE system SHALL default the value to yes without generating an error or warning.

WHEN a timelog is created with an explicit billable flag of no, THE system SHALL respect the provided value.

### Empty Filter Results Handling

### Empty Filter Results

THE system SHALL return an empty result set when filter criteria match no timelogs.

WHEN a user filters timelogs with a date range that contains no entries, THE system SHALL return an empty list rather than an error.

WHEN a user filters timelogs by a project that has no timelogs, THE system SHALL return an empty list.

WHEN a user filters timelogs by a task that has no timelogs, THE system SHALL return an empty list.

WHEN a user filters timelogs by billable status that matches no entries, THE system SHALL return an empty list.

## Timesheet Error Scenarios

Submitting a timesheet that contains no timelogs is rejected; a timesheet must have at least one timelog to be eligible for submission. An employee attempting to submit a timesheet for a week that already has a submitted or approved timesheet receives a duplicate submission error; only one submitted or approved timesheet is allowed per employee per week. Approving a timesheet that is already approved returns an error indicating the timesheet has already been processed. Rejecting an already approved timesheet is blocked; approval is a terminal state in the timesheet workflow. When rejecting a timesheet, the rejection reason is required; submitting a rejection without a reason text is rejected with a validation error. Once a timesheet is approved, all included timelogs become locked and cannot be edited or deleted; any attempt to modify these timelogs is denied. A rejected timesheet returns to draft status and the employee can modify it by adding or removing timelogs before resubmitting. Week boundaries are strictly Monday to Sunday; a timesheet's week start must be a Monday and week end the following Sunday. Creating a timesheet for a future week is allowed as a draft but cannot be submitted until that week has elapsed. Users without time:approve permission attempting to approve or reject a timesheet receive an access denied error. Viewing timesheets belonging to another employee requires time:view_all permission.

### Timesheet Submission Validation

IF an employee submits a timesheet that contains no timelogs, THEN the system SHALL reject the submission. A timesheet must have at least one timelog to be eligible for submission.

IF an employee submits a timesheet for a week that already has a submitted or approved timesheet, THEN the system SHALL reject the submission with a duplicate submission error. Only one submitted or approved timesheet is allowed per employee per week.

THE system SHALL enforce that no more than one timesheet per employee per week can exist in a submitted or approved state.

### Approval Terminal State Enforcement

IF a user with time:approve permission attempts to approve a timesheet that is already in the approved status, THEN the system SHALL reject the action. The system SHALL indicate that the timesheet has already been processed.

IF a user with time:approve permission attempts to reject a timesheet that is already in the approved status, THEN the system SHALL block the action. The approved status is a terminal state in the timesheet workflow.

THE system SHALL treat the approved status as a terminal state from which no further status transitions are permitted.

### Rejection Reason Required

WHEN a user with time:approve permission rejects a submitted timesheet, THE system SHALL require a rejection reason text to be provided.

IF a rejection is submitted without a reason text, THEN the system SHALL reject the action with a validation error. The rejection reason is a mandatory field when rejecting a timesheet.

### Approved Timesheet Timelog Lock Enforcement

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet. Locked timelogs cannot be edited or deleted by any user.

IF any user attempts to edit a timelog that is part of an approved timesheet, THEN the system SHALL deny the operation. The timelog is protected by the approved timesheet lock.

IF any user attempts to delete a timelog that is part of an approved timesheet, THEN the system SHALL deny the operation. The timelog is protected by the approved timesheet lock.

THE system SHALL enforce the timelog lock regardless of the user's permissions, including users with time:manage permission.

### Rejected Timesheet Recovery

WHEN a submitted timesheet is rejected, THE system SHALL return the timesheet to draft status. The employee can then modify the timesheet before resubmitting.

THE system SHALL allow the employee who owns a rejected timesheet to add timelogs to it.

THE system SHALL allow the employee who owns a rejected timesheet to remove timelogs from it.

THE system SHALL allow the employee who owns a rejected timesheet to resubmit it for approval after making modifications.

### Week Boundary Validation

THE system SHALL enforce that the week start date of a timesheet must be a Monday.

THE system SHALL enforce that the week end date of a timesheet must be the Sunday immediately following the week start date.

IF a timesheet is created or submitted with week boundaries that do not conform to the Monday-to-Sunday week definition, THEN the system SHALL reject it with a validation error.

### Future Week Submission Restriction

THE system SHALL allow employees to create draft timesheets for future weeks.

IF an employee attempts to submit a timesheet for a future week — a week whose Sunday end date has not yet elapsed — THEN the system SHALL reject the submission. Timesheets can only be submitted for weeks that have completed or for the current week that has already started.

THE system SHALL not restrict the creation of draft timesheets for future weeks; only the submission action is restricted.

### Approval Permission Enforcement

IF a user who does not have the time:approve permission attempts to approve a timesheet, THEN the system SHALL reject the action with an access denied error.

IF a user who does not have the time:approve permission attempts to reject a timesheet, THEN the system SHALL reject the action with an access denied error.

THE system SHALL enforce that only users assigned the time:approve permission can perform approval or rejection actions on timesheets.

### Timesheet Viewing Permission Enforcement

IF a user attempts to view timesheets belonging to another employee without holding the time:view_all permission, THEN the system SHALL reject the request with an access denied error.

THE system SHALL allow employees to view their own timesheets without requiring the time:view_all permission.

THE system SHALL allow users with time:view_all permission to view any employee's timesheets within the organization.

## Timer Error Scenarios

Starting a timer when the employee already has an active timer running is blocked; each employee can have at most one active timer at a time. The employee must first stop or discard the current timer before starting a new one. Attempting to start a timer without selecting a project returns a validation error; the project field is required for timer creation. The task field is optional, but if provided, the task must belong to the selected project; a mismatch results in a validation error. Stopping a timer that is not running results in an error, as there is no active timer to stop. Similarly, discarding a timer when none is active produces a no-active-timer error. When a timer is stopped, the duration is calculated from the start timestamp to the stop timestamp and rounded to the nearest minute; this rounding is a business rule and not an error condition. If an employee forgets to stop their timer, it continues running indefinitely with no automatic stop; this is an expected edge case where the resulting timelog duration may span many hours or even days. Editing the description or project of a timer while it is stopped is not meaningful and returns an error; these fields can only be modified while the timer is actively running. A timer running across midnight or across daylight saving time boundaries calculates duration based on actual elapsed time. Cross-organization timer access is strictly prevented.

### Starting Timer While Already Active

WHEN an employee attempts to start a new timer while already having an active timer running, THE system SHALL reject the request. The error SHALL indicate that only one active timer is permitted per employee and that the employee must stop or discard the currently running timer before starting a new one. This restriction applies regardless of the project or task selected for the new timer.


### Missing Project on Timer Start

WHEN an employee attempts to start a timer without specifying a project, THE system SHALL reject the request with a validation error. The error SHALL indicate that a project selection is required before a timer can be started.


### Task-Project Mismatch on Timer Start

WHEN an employee starts a timer with a task specified, THE system SHALL verify that the provided task belongs to the selected project. IF the task does not belong to the selected project, THEN the system SHALL reject the request with a validation error indicating that the task must be part of the selected project.


### Stopping or Discarding a Non-Running Timer

WHEN an employee attempts to stop a timer that is not actively running, THE system SHALL reject the request with an error indicating that no active timer exists to stop. WHEN an employee attempts to discard a timer that is not actively running, THE system SHALL reject the request with an error indicating that no active timer exists to discard. In both cases, the system SHALL NOT create a timelog or perform any state change.


### Duration Calculation and Rounding

WHEN an employee stops a running timer, THE system SHALL calculate the elapsed duration from the timer's start timestamp to the stop timestamp and round the result to the nearest minute. IF the timer spans across midnight, THEN the system SHALL calculate duration based on the actual elapsed time across calendar days, not as a negative or zero value. IF the timer spans a daylight saving time boundary, THEN the system SHALL calculate duration based on the actual elapsed wall-clock time, accounting for the clock change so that the recorded duration reflects the true time worked.


### Timer Running Indefinitely Without Auto-Stop

WHILE a timer is running, THE system SHALL NOT automatically stop the timer after any period of inactivity or elapsed time. IF an employee forgets to stop their timer, THEN the timer SHALL continue running indefinitely until the employee manually stops or discards it. This may result in a timelog with a very long duration when eventually stopped; the system SHALL accept such durations as valid elapsed time.


### Editing Stopped Timer Properties

WHEN an employee attempts to modify the description, project, or task of a timer that is not actively running, THE system SHALL reject the request with an error. THE system SHALL indicate that timer properties can only be modified while the timer is actively running. A stopped, discarded, or never-started timer has no modifiable properties.


### Cross-Organization Timer Access Prevention

WHEN any timer operation is requested — including starting, stopping, discarding, viewing, or editing — THE system SHALL enforce that the timer belongs to the employee's currently selected organization context. IF a timer belongs to a different organization than the employee's active context, THEN the system SHALL reject the request as unauthorized, preventing any cross-organization timer access.


## ActivityLog Error Scenarios

Activity log entries are generated automatically by the system in response to significant actions; no user can manually create, edit, or delete activity log entries. This immutability ensures a reliable audit trail that cannot be tampered with by any user, including the organization owner. Each entry must include a timestamp, the user who performed the action, the action type, the target entity, and relevant details; if the system cannot capture all required information, the underlying action itself may still succeed but the log entry may be incomplete, which is a system integrity concern. Activity log entries are scoped strictly to the organization where the action occurred; cross-organization log access is blocked. A user without org:manage permission attempting to view the full activity log receives an access denied error. Filtering the activity log by action type, user, or date range that yields no results returns an empty set rather than an error. Pagination works normally; requesting a page number that exceeds the available pages returns an empty result set. The system records actions regardless of whether the actor had explicit permission to perform them, as unauthorized attempts are themselves notable events worthy of logging. Deleting an organization removes all associated activity log entries permanently.

### Manual Activity Log Creation Blocked

Activity log entries are generated exclusively by the system in response to significant actions occurring within the organization. No user — regardless of role or permission — can manually create an activity log entry through any user interface or operation.

WHEN a user attempts to create an activity log entry through any means other than performing a logged action, THE system SHALL reject the attempt.

IF the system receives a request to create an activity log entry that does not originate from an automated action handler, THEN THE system SHALL reject the request.

The only path to an activity log entry existing is through automatic generation triggered by one of the logged action types: employee invited, deactivated, or reactivated; contract created or edited; project created, archived, completed, or deleted; task status changed; timesheet submitted, approved, or rejected; role assigned or changed.

### Activity Log Immutability

Activity log entries, once created by the system, cannot be altered by any user. This immutability extends to all users, including the organization owner.

IF a user attempts to edit an existing activity log entry, THEN THE system SHALL reject the attempt.

IF a user attempts to delete an existing activity log entry, THEN THE system SHALL reject the attempt.

The organization owner — despite having full access to all features — cannot modify, delete, or tamper with any activity log entry. The owner's elevated privileges do not override the immutability of the audit trail.

WHEN the system generates an activity log entry, THE system SHALL store it in a form that prevents subsequent modification by any user.

This immutability ensures that the activity log serves as a trustworthy, tamper-proof historical record of all significant actions within the organization.

### Incomplete Activity Log Entry Fields

Every activity log entry must contain: a timestamp indicating when the action occurred, the user who performed the action, the action type classification, the target entity that was affected, and relevant details describing what changed.

IF the system cannot capture all required fields for an activity log entry, THEN the system SHALL still generate the entry with the available information, but the entry SHALL be marked as incomplete where data is missing.

The underlying action that triggered the log entry MAY still succeed even when the activity log entry is incomplete. For example, if the system cannot determine which user performed an action, the action itself may still take effect, but the associated log entry will lack the user identification.

An incomplete activity log entry represents a system integrity concern and SHALL be distinguishable from complete entries when viewed.

### Cross-Organization Activity Log Isolation

Activity log entries are strictly scoped to the organization in which the triggering action occurred.

WHEN a user is viewing activity logs within one organization, THE system SHALL only return entries belonging to that organization.

IF a user belongs to multiple organizations, THEN activity logs from other organizations SHALL NOT be visible when the user is operating under a different organization context.

THE system SHALL enforce organization context on every activity log query, ensuring that cross-organization log access is never permitted.

Even the organization owner cannot view activity log entries from a different organization — each organization's audit trail is completely isolated.

### Activity Log Viewing Authorization

Viewing the full activity log requires the `org:manage` permission.

WHEN a user without the `org:manage` permission attempts to view the full organization activity log, THE system SHALL reject the request with an access denied response.

Users with other permissions — such as `employee:view`, `project:view`, `time:view_all`, or `report:view` — do not have access to the activity log unless they also hold `org:manage`.

THE system SHALL verify the user's permission at the time of each activity log access request, not only at the start of a session.

The activity log access control applies to all views of the log, including filtered and paginated views.

### Activity Log Filtering Edge Cases

Filtering the activity log by action type, user, date range, or any combination of filters may yield no matching entries.

IF a filter criteria produces no matching activity log entries, THEN THE system SHALL return an empty result set rather than an error.

An empty result set is a valid outcome — it indicates that no logged actions match the requested criteria within the organization.

WHEN filtering by action type yields no matches, THE system SHALL present an empty list without signaling an error condition.

THE system SHALL treat all filter combinations consistently: any combination of action type, user, and date range filters that returns zero results produces an empty set, not a rejection.

### Activity Log Pagination Edge Cases

The activity log is paginated, and users may request pages that do not exist.

IF a user requests a page number that exceeds the total number of available pages, THEN THE system SHALL return an empty result set rather than an error.

THE system SHALL calculate the total page count based on the current filter criteria; if filters change, the page count SHALL be recalculated accordingly.

WHEN a user navigates beyond the last available page — for example, after filters have reduced the total entry count — THE system SHALL return an empty page without raising an exception.

Pagination operates consistently across all filter states: an empty page is a normal result, not an error condition.

### Unauthorized Attempt Logging

The system logs significant actions regardless of whether the actor had explicit authorization, because unauthorized attempts are themselves notable events.

WHEN an unauthorized action is attempted against the system, THE system SHALL record the attempt in the activity log with the action type indicating the nature of the attempt, the user who attempted it, the target entity, and relevant details.

THE system SHALL log the unauthorized attempt even though the attempted action itself is blocked.

The activity log entry for an unauthorized attempt SHALL be distinguishable from entries for authorized actions, allowing reviewers to identify potential security concerns.

Unauthorized attempt logging covers actions such as: attempts to edit or delete activity log entries, attempts to access restricted resources, and attempts to perform actions without the required permissions.

### Organization Deletion Impact on Activity Logs

Deleting an organization has a cascading effect on all data within that organization, including activity log entries.

WHEN an organization is deleted, THE system SHALL permanently remove all activity log entries associated with that organization.

THE system SHALL delete activity log entries as part of the organization deletion process, not as a separate operation.

IF an organization deletion is initiated, THEN all activity log entries for that organization SHALL be removed alongside all other organization data (employees, projects, tasks, timelogs, and timesheets).

No recovery of deleted activity log entries is possible after organization deletion completes — the entries are permanently removed.

THE system SHALL ensure that activity log entries from other organizations are unaffected by the deletion of an unrelated organization.

## Invitation Error Scenarios

Inviting an employee to an organization when they are already an active member results in a duplicate invitation error; no new invitation is created. Inviting with an invalid email format is rejected before any invitation record is persisted, and the inviter must correct the email address. Creating a duplicate pending invitation for the same email address in the same organization is rejected; an invitation already exists for that email. If a pending invitation exists and the user signs up with that email, they are automatically added to the organization and the invitation is marked as fulfilled; no error occurs. If a user signs up with a different email than the one used in the invitation, the pending invitation is not matched and remains pending; the user must be invited again with the correct email. Invitations do not have an explicit expiration, but they remain pending indefinitely until the invited user signs up or the invitation is manually revoked. The invitation status transitions from pending to fulfilled when the user joins; no other status transitions are valid. A user without employee:manage permission attempting to send an invitation receives an access denied error. If an organization is deleted, all pending invitations associated with it are also permanently removed.

### Duplicate Active Member Invitation Rejection

IF a user with employee:manage permission attempts to send an invitation to an email address belonging to a user who is already an active employee in the target organization, THEN the system SHALL reject the invitation request.

IF a user with employee:manage permission attempts to send an invitation to an email address belonging to a user who is a deactivated employee in the target organization, THEN the system SHALL reject the invitation and notify the inviter that the user already exists in the organization (see employee reactivation flow).

THE system SHALL return a distinct error message for each case: "already active member" when the target user is an active employee, and "existing deactivated employee" when the target user is deactivated.

THE system SHALL NOT create an invitation record in either case. The rejection occurs before any invitation is created.

### Invalid Email Format on Invitation

IF the email address provided in an invitation does not conform to a valid email format, THEN the system SHALL reject the invitation before it is created.

THE system SHALL validate that the email address contains a local part, an @ symbol, and a valid domain portion. An email lacking any of these structural components is considered invalid.

THE system SHALL NOT verify whether the email address actually exists or can receive mail. Only structural format validation is performed.

The inviter SHALL receive an error message indicating the email format is invalid and must correct the email address before resubmitting.

### Duplicate Pending Invitation Blocked

IF a pending invitation already exists for the same email address within the same organization, THEN the system SHALL reject any new invitation for that email address in that organization.

THE system SHALL check for existing pending invitations by matching the email address against all invitations with pending status in the target organization. If a match is found, the new invitation is rejected.

The inviter SHALL receive a notification that an invitation is already pending for that email address. No duplicate invitation is created.

IF a previous invitation for the same email has been revoked, THEN a new invitation for that email address is permitted; the new invitation is treated as an entirely independent invitation.

### Pending Invitation Auto-Fulfillment on Signup

WHEN a new user completes sign-up with an email address that matches one or more pending invitations across any organizations, THE system SHALL automatically add the user to each organization with a matching pending invitation.

THE system SHALL check all organizations for pending invitations matching the sign-up email at the time of account creation. Multiple pending invitations across different organizations are all fulfilled simultaneously during the same sign-up process.

THE system SHALL transition each matched invitation status from pending to fulfilled. The user is added to each organization as an employee.

IF a pending invitation exists but the invited user signs up with a different email address, THEN that pending invitation is not matched and remains pending.

### Email Mismatch Between Signup and Invitation

IF a user signs up with an email address that does not match any pending invitation, THEN the system SHALL NOT match any invitations. All pending invitations for other email addresses remain in pending status.

IF an invited user later signs up with a different email than the one used in the invitation, THEN the pending invitation is not fulfilled. The user must be re-invited using the correct email address to join the organization through the automatic matching process.

THE system SHALL NOT attempt fuzzy matching or alternative email resolution. Only exact email matches trigger invitation fulfillment.

A user who signs up with a different email can still be manually added to the organization through the employee management process if applicable, but the original pending invitation remains unresolved.

### Indefinite Pending Invitation Lifetime

Pending invitations SHALL remain in pending status indefinitely. The system does not impose an expiration date on pending invitations.

THE system SHALL NOT automatically clean up or remove pending invitations based on elapsed time. A pending invitation remains valid and fulfillable at any future point in time.

A pending invitation can be resolved in one of three ways:

- The invited user signs up with the matching email address, causing the invitation to transition to fulfilled status.
- A user with employee:manage permission manually revokes the invitation, causing it to transition to revoked status.
- The organization is deleted, permanently removing all invitations.

### Invitation Status Transition Enforcement

THE system SHALL enforce that invitations follow a strict status lifecycle. The only valid transitions are:

- From pending to fulfilled: when the invited user signs up with the matching email address.
- From pending to revoked: when a user with employee:manage permission revokes a pending invitation.

THE system SHALL NOT allow any other status transitions. Specifically:

- A fulfilled invitation cannot transition to any other status.
- A revoked invitation cannot transition to any other status.
- An invitation cannot transition from fulfilled or revoked back to pending.

IF any attempt is made to transition an invitation status outside the permitted paths, THEN the system SHALL reject the operation.

### Permission-Based Invitation Control

IF a user without the employee:manage permission attempts to send an invitation, THEN the system SHALL reject the request with an access denied error.

IF a user without the employee:manage permission attempts to revoke a pending invitation, THEN the system SHALL reject the request with an access denied error.

IF a user without the employee:manage permission attempts to view the list of pending invitations for the organization, THEN the system SHALL reject the request with an access denied error.

Only users assigned a role that includes the employee:manage permission can perform invitation-related operations within the organization. The system SHALL enforce this permission check for every invitation operation regardless of the user's other permissions.

### Organization Deletion Removes Pending Invitations

WHEN an organization is deleted, THE system SHALL permanently remove all pending invitations associated with that organization as part of the deletion process.

THE system SHALL remove all invitations — regardless of their status at the time of deletion — along with all other organization data. This removal is irreversible.

Fulfilled invitations (where the invited user has already joined the organization) are also removed during organization deletion. No invitation records survive organization deletion.

IF an organization deletion is attempted while pending timesheets exist or active employee contracts are in place, THEN the deletion is blocked (see Organization Error Scenarios). Only when deletion proceeds are invitations removed.

### Invitation Revocation Edge Cases

A user with employee:manage permission may revoke a pending invitation at any time. Revocation transitions the invitation status from pending to revoked.

IF an invitation has already been fulfilled (the invited user has joined the organization), THEN the invitation cannot be revoked. The employee must be deactivated through the employee management process instead.

IF an invitation has already been revoked, THEN attempting to revoke it again SHALL be rejected. A revoked invitation is terminal and cannot be reverted to pending status.

IF a revoked invitation existed for an email address and a new invitation is sent to that same email address, THEN the new invitation is permitted and is treated as an entirely new invitation with its own pending status.

IF a user with a matching email for a revoked invitation later signs up, THEN the revoked invitation is NOT fulfilled. A new invitation must be sent after revocation for the user to be automatically added to the organization upon signup.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Scenario: New Employee Onboarding

This scenario describes the complete journey of bringing a new employee into an organization, from invitation through initial project assignment.

**Step 1 — Invite the Employee**

A user with employee management permission initiates the onboarding by inviting the new employee via email. The system creates an invitation record in pending status, recording the invited email address and the timestamp of the invitation.

If the invited email already belongs to an existing user account, the user is immediately added as an employee in the organization. If no account exists yet, the invitation remains in pending status until the invited person signs up.

**Step 2 — New User Sign-Up**

The invited person receives the invitation and signs up with the same email address and a password. Upon successful sign-up, the system automatically resolves all pending invitations for that email address. The new user is added to each organization that had a pending invitation, with the invited role applied.

The user now has an employee record in the organization. The employee record includes the assigned role, employment type (defaults as specified during invitation), and status set to active.

**Step 3 — Assign to Projects**

A user with project management permission assigns the new employee to one or more projects. For each assignment, a project membership is created with a role of either member or project-lead. The employee can now view the projects they are assigned to.

**Step 4 — Create Tasks for the Employee**

A project lead or a user with project management permission creates tasks within the assigned projects and assigns them to the new employee. The employee can now view their assigned tasks on their personal dashboard, filtered by open and in-progress statuses.

**Step 5 — Employee Begins Work**

The new employee can now start tracking time against assigned projects and tasks. They may use the timer for live tracking or log timelog entries directly. All time entries are scoped to the organization and linked to the employee record.

**Outcome**

The employee is fully onboarded: they have an active employee record with a role, are assigned to projects, have tasks to work on, and can track their time. Their dashboard reflects assigned tasks and recent time entries.

### Scenario: Daily Time Tracking with Timer and Manual Entry

This scenario follows an employee through a typical workday, combining live timer tracking with manual timelog entry.

**Step 1 — Start the Workday**

The employee opens the platform and views their personal dashboard. The dashboard shows zero hours logged today, the active timer status (not running), recent timelogs from previous days, the pending timesheet status for the current week, and tasks assigned to them with open or in-progress status.

**Step 2 — Start a Timer**

The employee selects an assigned project and optionally a task within that project. They may enter a description of the work they are about to do. The employee starts the timer. The system records the start timestamp, the selected project, any selected task, and the description. The dashboard now shows the timer as active.

The employee cannot start another timer while one is running. If they attempt to do so, the request is rejected.

**Step 3 — Work in Progress**

While the timer is running, the employee may edit the description or change the project and task selection. The timer continues uninterrupted.

**Step 4 — Stop the Timer**

The employee stops the timer. The system calculates the elapsed duration from the start timestamp to the stop timestamp, rounding to the nearest minute. A new timelog is automatically created with the calculated duration, the selected project, any selected task, the description, and the billable flag set to true by default. The timer is now cleared and the dashboard reflects the hours logged today.

**Step 5 — Manual Timelog Entry**

Later in the day, the employee realizes they forgot to start the timer for a meeting. They manually create a timelog entry specifying the date, duration in minutes, a project from their assigned projects, an optional task within that project, a description of the meeting, and the billable flag. The timelog is created and associated with the employee and the current week.

**Step 6 — End of Day Review**

The employee returns to their dashboard. The dashboard now shows the combined hours logged today from both the timer-created timelog and the manual entry. Recent timelogs include the day's entries. The pending timesheet for the current week reflects the updated total hours.

**Outcome**

The employee has accurately tracked their time for the day using both live tracking and manual entry. All timelogs are recorded and visible on the dashboard, ready for eventual timesheet submission.

### Scenario: Weekly Timesheet Submission and Approval

This scenario follows the complete timesheet workflow from draft creation through manager approval, spanning the employee and approver perspectives.

**Step 1 — Create Draft Timesheet**

At the end of the work week (or during the week), the employee creates a draft timesheet for a specific Monday-to-Sunday week. The system automatically gathers all timelogs belonging to that employee for that week and includes them in the draft. The system calculates the total hours from the included timelogs.

The employee cannot create a draft for a week that already has a submitted or approved timesheet.

**Step 2 — Review and Adjust**

The employee reviews the draft timesheet. They may add any timelogs from that week that were not automatically included, or remove timelogs they do not wish to submit. Timelogs that are part of an approved timesheet from another week cannot be added.

**Step 3 — Submit for Approval**

The employee confirms the timesheet is complete and submits it for approval. The system validates that the timesheet contains at least one timelog. If the timesheet is empty, the submission is rejected. Upon successful submission, the timesheet status changes from draft to submitted, and the submitted timestamp is recorded.

**Step 4 — Manager Review**

A user with time approval permission views the list of submitted timesheets. They select the submitted timesheet and review its contents: the employee who submitted it, the week range, the list of included timelogs with project, task, description, duration, and billable status, and the total hours.

**Step 5a — Approval Path**

The reviewer approves the timesheet. The timesheet status changes to approved. The reviewed timestamp and the reviewer's identity are recorded. All timelogs included in the approved timesheet become locked — they cannot be edited or deleted by the employee or anyone else. The employee can view their approved timesheet but cannot modify it or its timelogs.

**Step 5b — Rejection Path**

The reviewer rejects the timesheet. The timesheet status changes from submitted back to draft. The reviewed timestamp and the reviewer's identity are recorded, along with the required rejection reason explaining why the timesheet was rejected. The employee can view the rejection reason, modify the timesheet (add or remove timelogs, or edit the individual timelogs if not locked by another approved timesheet), and resubmit for approval.

**Outcome**

If approved, the week's timelogs are locked and the timesheet serves as an immutable record. If rejected, the employee has clear feedback and can correct and resubmit. In both cases, the activity log records the submission, approval, or rejection event.

### Scenario: Project Lifecycle — Creation to Completion

This scenario traces a project from initial creation through active work tracking to eventual archival, involving multiple actors across project management, task management, time tracking, and reporting.

**Step 1 — Create the Project**

A user with project management permission creates a new project. They provide the required name, an optional description, a color code for UI display, and optionally a budget in estimated hours along with start and end dates. The project is created with a status of active.

**Step 2 — Assign Project Members**

The project creator (or another user with project management permission) assigns employees to the project. Each assignment creates a project membership with a role of member or project-lead. At least one project lead should be assigned to manage tasks. Employees can be assigned to multiple projects simultaneously.

**Step 3 — Create and Assign Tasks**

A project lead or a user with project management permission creates tasks within the project. For each task, they provide the required title, an optional description, a priority level (low, medium, high, or urgent), optionally estimated hours and a due date, and assign the task to a project member. Subtasks may be created under a parent task, limited to one level of nesting.

Tasks are created with an initial status of open. The assigned employee sees the task appear on their personal dashboard under open or in-progress tasks.

**Step 4 — Work and Track Time**

Assigned employees begin working on tasks. They log time against the project using timers or manual timelog entries, selecting the project and optionally the specific task they worked on. Each timelog records the date, duration, project, optional task, description, and billable flag.

As work progresses, project leads or users with project management permission update task statuses through the workflow: open → in-progress → completed → closed. Each status change is automatically recorded in the task history with the timestamp, old status, new status, and the user who made the change.

**Step 5 — Monitor Budget**

A user with report viewing permission accesses the project budget report. The report shows each project's budget hours versus actual hours logged, including the percentage of budget consumed. Projects approaching or exceeding their budget can be identified and reviewed. Projects without budget hours set are excluded from this report.

**Step 6 — Complete or Archive the Project**

When the project is finished, a user with project management permission changes the project status to completed. Alternatively, if the project is no longer active but not fully complete, it may be set to archived. Once archived or completed, the project cannot receive new timelogs. Existing timelogs and historical data are preserved.

A project can only be deleted if it has no timelogs associated with it. If timelogs exist, the deletion request is rejected.

**Outcome**

The project has moved through its full lifecycle: created, staffed, worked on with time tracked, budget monitored, and finally completed or archived. All task history, timelogs, and timesheets related to the project remain available for reporting and audit purposes.

### Scenario: Employee Contract Lifecycle

This scenario follows the contract management journey for an employee, covering contract creation, active contract management, and historical record preservation.

**Step 1 — Create Initial Contract**

A user with employee management permission creates a contract for an employee. They specify the required start date, the pay rate as a numeric value, the pay period (hourly, daily, weekly, or monthly), the working hours per week, and optional notes and end date. Since no prior contract exists, the new contract becomes the active contract for the employee.

If the pay rate is zero or negative, the request is rejected. If the start date is after the end date (when an end date is provided), the request is rejected. If the working hours per week is zero or negative, the request is rejected.

**Step 2 — Employee Views Contract**

The employee views their own contracts. They can see the active contract with its details: start date, end date (or indication that it is ongoing), pay rate, pay period, working hours per week, and notes. They can also view any past contracts as a historical record.

Users with employee viewing permission can view any employee's contracts, including both active and historical contracts.

**Step 3 — Create a New Contract (Replacement)**

Later, the employee's terms change (for example, a raise or change in working hours). A user with employee management permission creates a new contract with updated terms. The system performs the following automatically:

- The previous active contract has its end date set to the day before the new contract's start date, closing it.
- The new contract becomes the active contract with its specified start date and terms.

Only one contract can be active at any given time for an employee.

**Step 4 — Edit Active Contract**

A user with employee management permission edits the current active contract to adjust terms such as pay rate or working hours. The edits are applied directly to the active contract. Past contracts cannot be edited — they are immutable historical records. Any attempt to edit a past contract is rejected.

**Step 5 — Historical Record**

The employee now has a contract history: one or more past contracts showing previous terms, and one active contract showing current terms. All contracts are preserved for the lifetime of the employee record. The activity log records each contract creation and edit event.

**Outcome**

The employee has a clear, auditable contract history. The organization maintains accurate records of compensation and working hour agreements over time.

# Real-time Events

WebSocket/SSE event definitions and subscription specifications.

## Organization Events

The system emits real-time events whenever an organization's settings are modified. Organization owners and users with the org:manage permission receive these events so they can stay informed of changes without refreshing. Event payloads include the organization identifier, the name of the changed setting (such as name, description, logo image, currency, timezone, or fiscal start month), and the new value. When an organization owner edits multiple settings at once, the system emits a single event containing all changed fields. A dedicated deletion event is emitted when an organization owner initiates organization deletion; this event is broadcast to all active members before cascading deletion begins so that users can save any work in progress. Subscription to organization events is scoped strictly to members of the organization — users in other organizations never receive these events. Events are delivered over a persistent connection such as WebSocket or through Server-Sent Events, and the system ensures that only authenticated users within the correct organization context receive them.

### Organization Settings Change Notification

The system emits a single batch event whenever an organization owner modifies one or more organization settings in a single save operation.

WHEN the organization owner saves changes to organization settings, THE system SHALL emit exactly one settings change event containing the organization identifier and all modified setting names with their new values.

THE system SHALL include in the event payload only those settings whose values changed during the save operation. Settings whose values were not modified SHALL be excluded from the event payload.

Changed settings may include any combination of: organization name, description, logo image, currency, timezone, and fiscal start month.

WHEN the organization owner edits multiple settings in a single save operation, THE system SHALL bundle all changed fields into exactly one batch event rather than emitting separate events for each modified field.

### Individual Setting Change Events

The system includes individual setting change details as part of the batch settings change event described in Organization Settings Change Notification. Individual field changes are never emitted as standalone events.

**Name Change**: WHEN the organization owner changes the organization name, THE system SHALL include the new name value in the settings change event.

**Description Change**: WHEN the organization owner changes the organization description, THE system SHALL include the new description value in the settings change event.

**Logo Image Update**: WHEN the organization owner uploads or changes the organization logo image, THE system SHALL include the updated logo image reference in the settings change event.

**Currency Change**: WHEN the organization owner changes the organization currency, THE system SHALL include the new currency code in the settings change event.

**Timezone Modification**: WHEN the organization owner changes the organization timezone, THE system SHALL include the new timezone value in the settings change event.

**Fiscal Start Month Update**: WHEN the organization owner changes the fiscal start month, THE system SHALL include the new fiscal start month value in the settings change event.

### Organization Deletion Warning

The system emits a dedicated pre-deletion warning event before cascading deletion of an organization begins.

WHEN the organization owner confirms organization deletion and all deletion preconditions are satisfied, THE system SHALL broadcast a pre-deletion warning event to all active members of the organization before the cascading deletion process starts.

THE system SHALL deliver the pre-deletion warning to every active member of the organization, regardless of their role or permissions, so that all members can save any work in progress before the organization is permanently removed.

WHEN the pre-deletion warning has been broadcast, THE system SHALL proceed with permanently deleting all organization data including employees, projects, tasks, timelogs, and timesheets. The organization owner's account SHALL remain but is no longer associated with the deleted organization.

### Event Subscription and Authorization

Organization events are delivered only to authorized subscribers within the relevant organization context.

WHEN an organization settings change event is emitted, THE system SHALL deliver the event exclusively to users who meet both of the following conditions: the user is currently authenticated, and the user holds either the owner role or the org:manage permission within the affected organization.

WHEN an organization deletion warning event is emitted, THE system SHALL deliver the event to all active members of the affected organization who are currently authenticated, regardless of their role or permission level.

THE system SHALL enforce strict organization context isolation for all event delivery. Users in one organization SHALL NOT receive events from any other organization, even if they belong to multiple organizations.

WHEN a user switches their active organization context, THE system SHALL stop delivering events from the previous organization and begin delivering events from the newly selected organization, provided the user is authorized to receive events in that organization.

IF a user is not authenticated, THEN THE system SHALL NOT deliver any organization events to that user.

IF a user belongs to the organization but the user's employee status is deactivated, THEN THE system SHALL NOT deliver organization settings change events to that user. Deactivated members SHALL still receive the organization deletion warning event if they are currently authenticated.

### Event Delivery Mechanism

The system delivers organization events in real time over a persistent connection to ensure timely notification to all eligible subscribers.

WHEN an organization event is emitted, THE system SHALL push the event to all eligible subscribers over an established persistent connection without requiring the subscriber to poll or refresh.

THE system SHALL ensure that only authenticated users with a valid session can establish or maintain a persistent event delivery connection. Connection attempts from unauthenticated users SHALL be rejected.

THE system SHALL deliver each event to eligible subscribers within the affected organization's scope. Subscribers in other organizations SHALL NOT receive the event even if they share the same persistent connection infrastructure.

## User Events

The system emits real-time events when a user's global profile is updated. Because the user profile — including display name, avatar image, and phone number — is shared across all organizations the user belongs to, profile change events are broadcast to every organization where the user is an active member. Event payloads carry the user's identifier, the fields that changed, and the updated values. When a user deletes their own account, a deactivation event is emitted to all organizations where the user was an employee, notifying relevant parties that the employee record has been marked as deactivated. Switching organization context does not generate a broadcast event — it is handled on the client side by changing the active organization scope. User profile events are subscribed to automatically for any organization where the user holds membership, ensuring coworkers see updated names and avatars in real time.

### Global Profile Change Event Emission

WHEN a user updates their global profile — including the display name, avatar image, or phone number — THE system SHALL emit a real-time event containing the user's identifier, the specific fields that were changed, and their updated values.

THE system SHALL include in the event payload:
- The user's identifier
- A list of changed fields (e.g., display name, avatar image, phone number)
- The new value for each changed field
- The timestamp of the change

WHEN only a subset of profile fields is modified, THE system SHALL include only the changed fields in the event payload, not the entire profile.

IF a user updates multiple profile fields in a single operation, THEN THE system SHALL emit a single event containing all changes rather than separate events per field.

### Cross-Organization Profile Broadcast

THE system SHALL broadcast global profile change events to every organization where the user holds an active employee membership.

Since the user profile — display name, avatar image, and phone number — is shared across all organizations the user belongs to, THE system SHALL ensure that all coworkers in all relevant organizations receive the updated profile information in real time.

WHEN a profile change event is emitted, THE system SHALL deliver it to all active members of each organization where the affected user is an active employee, enabling coworkers to see updated names and avatars without refreshing.

THE system SHALL subscribe users automatically to profile change events for every organization where they hold membership, without requiring manual subscription.

### Account Deletion Event Emission

WHEN a user deletes their own account, THE system SHALL emit an account deletion event to all organizations where the user was an active employee.

THE system SHALL include in the account deletion event payload:
- The deleted user's identifier
- The timestamp of deletion
- A notification that the corresponding employee records have been marked as deactivated

WHEN the account deletion event is received, THE system SHALL notify relevant parties — such as organization owners and managers — that the employee record has been deactivated, so they can take appropriate action regarding projects, tasks, and pending timesheets.

THE system SHALL NOT broadcast account deletion events beyond the organizations where the user held an employee record.

### Organization Context Switch Behavior

THE system SHALL NOT emit any broadcast event when a user switches their active organization context.

Switching the organization context is a client-side operation that changes which organization's data is displayed. THE system SHALL handle the context switch by updating the active organization scope on the client without generating server-side events or notifying other users.

WHERE a user belongs to multiple organizations, THE system SHALL allow the user to switch between them freely without logging out, and SHALL NOT treat the switch as a login, logout, or presence change event.

## Employee Events

The system emits real-time events whenever an employee record is created, updated, deactivated, or reactivated within an organization. Users with the employee:view permission automatically subscribe to these events for their current organization context. Event payloads include the affected employee's identifier, the type of change (invited, edited, deactivated, reactivated), and the changed fields such as department, position, employment type, or role assignment. When an employee is deactivated, the event notifies project leads and managers so they can reassign tasks or adjust project memberships if needed. Reactivation events inform the organization that a previously deactivated employee is active again and can log time and submit timesheets. Employee events are scoped to the organization — members of different organizations never receive cross-organization employee events. The system does not emit events for bulk employee list views or pagination navigation since those are passive read operations.

### Employee Invited Event

WHEN an employee is successfully invited to an organization, THE system SHALL emit a real-time employee event with the action type "invited".

The event payload SHALL include:
- The identifier of the newly created employee record
- The action type set to "invited"
- The invited user's email address
- The department assigned to the employee, if any
- The position or title assigned to the employee, if any
- The employment type assigned to the employee
- The role assigned to the employee

This event applies to both immediate additions (when the invited email already belongs to an existing user account) and pending invitation fulfillment (when a new user signs up with the invited email and is automatically added to the organization).

THE system SHALL broadcast this event only to subscribers within the same organization.

### Employee Record Edited Event

WHEN an employee record is updated, THE system SHALL emit a real-time employee event with the action type "edited".

The event payload SHALL include the employee identifier, the action type "edited", and the specific fields that were changed.

Changed fields that trigger this event include:
- Department assignment: WHEN an employee's department is changed, THE system SHALL include the old and new department values in the event payload.
- Position or title: WHEN an employee's position or title is updated, THE system SHALL include the old and new position values in the event payload.
- Employment type: WHEN an employee's employment type is changed, THE system SHALL include the old and new employment type values in the event payload.

THE system SHALL emit this event for each individual update operation. If multiple fields are changed in a single operation, THE system SHALL include all changed fields in a single event payload rather than emitting separate events.

THE system SHALL broadcast this event only to subscribers within the same organization.

### Employee Deactivated Notification

WHEN an employee's status is changed to "deactivated", THE system SHALL emit a real-time employee event with the action type "deactivated".

The event payload SHALL include:
- The identifier of the deactivated employee
- The action type set to "deactivated"
- The employee's active status changed from "active" to "deactivated"
- The timestamp of the deactivation

THE system SHALL also notify project leads and managers who have the deactivated employee assigned to their projects. This notification SHALL indicate that the deactivated employee can no longer log time or submit timesheets, enabling project leads to reassign tasks or adjust project memberships as needed.

IF the deactivated employee was designated as a project lead on any project, THEN THE system SHALL include a project lead reassignment trigger in the notification, alerting relevant users with project management permission that a project lead role has been vacated.

THE system SHALL broadcast this event only to subscribers within the same organization.

### Employee Reactivated Event

WHEN an employee's status is changed from "deactivated" back to "active", THE system SHALL emit a real-time employee event with the action type "reactivated".

The event payload SHALL include:
- The identifier of the reactivated employee
- The action type set to "reactivated"
- The employee's active status changed from "deactivated" to "active"
- The timestamp of the reactivation

THE system SHALL broadcast this event to all subscribers within the organization, informing them that the previously deactivated employee is now active again and can resume logging time and submitting timesheets.

THE system SHALL broadcast this event only to subscribers within the same organization.

### Role Assignment Change Event

WHEN an employee's role assignment is changed, THE system SHALL emit a real-time employee event with the action type "edited".

The event payload SHALL include:
- The identifier of the affected employee
- The action type set to "edited"
- The old role assignment and the new role assignment
- The timestamp of the role change

This event SHALL be emitted regardless of whether the role change is from a built-in role to another built-in role, from a built-in role to a custom role, from a custom role to a built-in role, or between custom roles.

THE system SHALL broadcast this event only to subscribers within the same organization.

### Project Lead Reassignment Trigger

WHEN an employee who holds the project lead role on one or more projects is deactivated, THE system SHALL emit a notification that a project lead reassignment is needed.

THE event payload SHALL include:
- The identifier of the deactivated employee
- The list of projects where the deactivated employee served as project lead
- An indicator that each affected project no longer has an active project lead

Users with the project management permission SHALL receive this notification so they can assign a new project lead to each affected project. This notification is part of the deactivated event and does not generate a separate event type.

THE system SHALL broadcast this notification only to subscribers within the same organization.

### Event Subscription and Broadcasting

THE system SHALL automatically subscribe users who have the `employee:view` permission to employee events for their current organization context.

WHEN a user switches organization context, THE system SHALL update their event subscriptions to receive employee events only for the newly selected organization. Events from the previous organization context SHALL no longer be delivered.

Employee events are strictly organization-scoped. THE system SHALL NOT emit employee events to subscribers who belong to a different organization, even if the subscribing user also belongs to the organization where the event originated but has switched to a different organization context.

THE system SHALL NOT emit employee events for passive read operations, including:
- Viewing paginated employee lists
- Navigating between pages of the employee list
- Filtering or searching the employee list

Events are only emitted for state-changing operations: invitation, editing, deactivation, reactivation, and role assignment changes.

### Deactivation Halts Time Logging

WHEN an employee is deactivated, THE system SHALL immediately prevent the deactivated employee from performing any time logging operations.

Specifically, the deactivated employee SHALL NOT be able to:
- Create new timelogs
- Edit existing timelogs
- Delete existing timelogs
- Start a live timer
- Submit timesheets for approval

THE system SHALL preserve all historical timelogs and timesheets belonging to the deactivated employee. These records remain accessible for reporting and audit purposes.

IF a deactivated employee had an active timer running at the time of deactivation, THEN THE system SHALL stop the timer and create a timelog for the elapsed duration up to the moment of deactivation.

WHEN an employee is reactivated, THE system SHALL restore the employee's ability to log time and submit timesheets.

## Role Events

The system emits real-time events when roles are created, edited, or deleted within an organization. Organization owners and users with the org:manage permission are the primary subscribers to role events. The event payload for a new role includes the role name and the set of permissions assigned to it. When a custom role is edited — for example, adding or removing specific permissions — the event carries the role identifier, the old permission set, and the new permission set so subscribers can assess the impact. The three built-in roles (Owner, Manager, Employee) never generate creation or deletion events since they cannot be removed; however, if an owner reassigns permissions to built-in roles, an edit event is emitted. When a custom role is deleted successfully (only possible when no employees are assigned to it), the system emits a deletion event confirming the role removal. Role events are scoped to the organization and are never visible to external members.

### Custom Role Creation Event

WHEN a custom role is created in the organization, THE system SHALL emit a real-time role creation event.

THE event SHALL include the role name exactly as defined by the organization owner during creation.

THE event SHALL include the complete set of permissions assigned to the new role, reflecting the permission configuration specified at creation time.

The role creation event SHALL be scoped to the organization where the role was created.

Built-in roles — Owner, Manager, and Employee — SHALL NOT generate creation events, as these roles are immutable and exist from the organization's inception.

### Role Permission Edit Event

WHEN an organization owner edits the permissions of a role, THE system SHALL emit a real-time role edit event.

THE event SHALL include the role identifier, the complete previous permission set, and the complete new permission set so that subscribers can compare the changes.

THE event payload SHALL clearly distinguish between permissions that were added and permissions that were removed during the edit.

WHEN the permission set is modified for any role — including built-in roles Owner, Manager, and Employee — THE system SHALL emit the edit event with the old and new permission comparison.

WHEN no permissions are actually changed (the submitted permission set is identical to the existing permission set), THE system SHALL NOT emit an edit event.

### Built-in Role Edit Event

THE system SHALL emit edit events for built-in roles when their permissions are modified, but SHALL NOT emit creation or deletion events for built-in roles.

The three built-in roles — Owner, Manager, and Employee — are fixed roles within every organization and cannot be created or deleted; therefore, only permission edit events apply to them.

WHEN the Owner role's permissions are modified, THE system SHALL emit an edit event containing the previous and updated permission sets.

WHEN the Manager role's permissions are modified, THE system SHALL emit an edit event containing the previous and updated permission sets.

WHEN the Employee role's permissions are modified, THE system SHALL emit an edit event containing the previous and updated permission sets.

Built-in role edit events SHALL follow the same payload structure as custom role edit events, including the role identifier, old permission set, and new permission set.

### Custom Role Deletion Event

WHEN a custom role is deleted from the organization, THE system SHALL emit a real-time role deletion event confirming the role removal.

A custom role SHALL only be deletable when no employees are currently assigned to that role. THE deletion event is therefore emitted only after this prerequisite is satisfied.

THE deletion confirmation event SHALL include the role identifier and the role name of the deleted custom role.

IF a deletion is attempted while employees are still assigned to the role, THEN THE system SHALL reject the deletion and SHALL NOT emit a deletion event.

Built-in roles — Owner, Manager, and Employee — SHALL NOT generate deletion events under any circumstances.

### Role Event Subscription and Scope

THE system SHALL deliver role events only to subscribers who are members of the organization where the event originated.

Users with the org:manage permission SHALL be the primary subscribers to all role events, including role creation, permission edits, and role deletion.

Organization owners SHALL also receive all role events by virtue of their full-access role.

Role events SHALL NOT be visible to members outside the organization, regardless of the subscriber's role in other organizations.

THE system SHALL scope each role event to the organization context, ensuring that role events from one organization are never delivered to members of a different organization.

## Contract Events

The system emits real-time events when an employee contract is created or edited. Users with employee:view permission and the employee who owns the contract receive these events. When a new contract is created for an employee, the event payload includes the start date, pay rate, pay period, working hours per week, and notes — and it also signals that the previous active contract has been automatically ended. The previous contract's end date is set to the day before the new contract starts, and this closure is included in the same event payload. Editing the current active contract generates an event carrying the changed fields and their new values. Past contracts are immutable and never generate edit events. Contract events are scoped to the organization and are not broadcast to users outside the organization. Employees viewing their own contracts receive events only for their own records, while users with employee:view permission receive events for any employee in the organization.

### Contract Created Event

WHEN a new contract is created for an employee, THE system SHALL emit a real-time contract-created event.

The event payload SHALL include the following details from the newly created contract:
- Start date
- Pay rate as a numeric value
- Pay period, which SHALL be one of: hourly, daily, weekly, or monthly
- Working hours per week as a numeric value

WHERE the contract includes notes, THE system SHALL include the notes in the event payload. WHERE no notes were provided, THE system SHALL include an empty notes field.

WHEN the new contract is created, THE system SHALL automatically end the employee's previous active contract. THE system SHALL set the previous contract's end date to the day before the new contract's start date. The event payload SHALL signal that the previous active contract has been ended and SHALL include the end date applied to that contract.

### Active Contract Edited Event

WHEN the current active contract for an employee is edited, THE system SHALL emit a real-time contract-edited event.

The event payload SHALL carry only the fields that were changed and their new values. Fields that were not modified SHALL NOT appear in the changed-fields payload.

Editable fields on an active contract SHALL include:
- Start date
- Pay rate
- Pay period
- Working hours per week
- Notes

The event SHALL identify which contract was edited and which employee owns the contract.

### Past Contract Immutability and Event Suppression

Past contracts — those that are not the current active contract — SHALL be immutable and SHALL NOT be editable.

IF an attempt is made to edit a past contract, THEN THE system SHALL reject the request.

THE system SHALL NOT emit contract-edited events for historical contracts. Only the current active contract SHALL be eligible to generate a contract-edited event.

### Contract Event Subscribers

WHEN a contract event (contract-created or contract-edited) is emitted, THE system SHALL deliver the event to the following subscribers within the organization:
- The employee who owns the contract, so they receive notifications about their own contract records
- All users who hold the employee:view permission within the same organization

Employees SHALL receive contract events only for their own contracts. Users with the employee:view permission SHALL receive contract events for any employee within the organization.

### Organization-Scoped Broadcast

THE system SHALL scope all contract events to the organization in which the contract belongs.

Contract events SHALL NOT be broadcast to users outside the organization. Users who belong to multiple organizations SHALL receive contract events only for the organization currently selected as their active context.

IF a user is not actively viewing the organization where the contract event originates, THEN THE system SHALL NOT deliver the event to that user until they switch to that organization context.

## Department Events

The system emits real-time events when departments are created, edited, or deleted within an organization. Users with the org:manage permission and all employees who can view the department list are subscribers to these events. The event payload for a new department includes its name, description, and optional parent department reference. When a department is edited, the event carries the changed fields. Deleting a department generates an event that confirms the deletion and notifies affected employees — their department assignment is set to null, but their employee records remain intact. One level of nesting is supported, so events for a parent department may be relevant to employees assigned to its child departments. Department events are scoped to the organization, ensuring data isolation across tenants.

### Department Created Event

WHEN a department is created within an organization, THE system SHALL emit a real-time event to all eligible subscribers.

The emitted event SHALL include the department name and description as provided during creation.

WHERE the department is assigned a parent department at creation time, THE system SHALL include the parent department reference in the event payload.

THE system SHALL support a maximum nesting depth of one, meaning a department may reference at most one parent department, and that parent department SHALL NOT itself reference another parent department.

### Department Edited Event

WHEN a department is edited, THE system SHALL emit a real-time event containing the fields that have changed.

The event SHALL identify the department by its name and SHALL include the updated values of the modified fields, such as a changed name or description.

WHERE the parent department assignment is changed during an edit, THE system SHALL include the new parent department reference in the event payload.

### Department Deleted Event

WHEN a department is deleted, THE system SHALL emit a real-time event confirming the deletion to all eligible subscribers.

The deletion event SHALL notify affected employees that their department assignment has been set to null.

THE system SHALL preserve all employee records in full when a department is deleted; no employee data is removed or altered beyond the department field being set to null.

### Department Event Subscription Rules

THE system SHALL deliver department events to users who hold the org:manage permission within the organization.

THE system SHALL deliver department events to all employees who have permission to view the department list, as defined by employee membership in the organization.

### Department Event Scope and Isolation

THE system SHALL scope all department events to the organization in which the department resides.

WHEN an event occurs for a parent department, THE system SHALL deliver the event to employees assigned to the parent department as well as to employees assigned to any child department that belongs to that parent.

THE system SHALL ensure cross-tenant isolation by restricting department event delivery exclusively to subscribers within the originating organization; no department event SHALL be delivered to users outside the organization.

## Project Events

The system emits real-time events when projects are created, edited, archived, completed, or deleted. Users with the project:view permission automatically subscribe to project events for their organization. The event payload for a new project includes its name, description, color code, status, optional budget hours, and optional start and end dates. When a project is archived or completed, the event notifies all project members that no new timelogs can be recorded against it. Editing a project generates an event carrying only the changed fields. Project deletion is only possible when no timelogs are associated with the project; when a deletion occurs, the event confirms removal and notifies all project members. Budget-related changes are included in the payload when budget hours are set or modified, helping users with report:view permission track budget utilization in near real time.

### Project Created Event

WHEN a new project is created, THE system SHALL emit a real-time event to all subscribers within the organization.

The event payload SHALL include the project name, description, and color code.

THE event payload SHALL include the project status, which is one of: active, archived, or completed.

WHERE budget hours have been set on the project, THE event payload SHALL include the budget hours value.

WHERE a start date has been set on the project, THE event payload SHALL include the start date.

WHERE an end date has been set on the project, THE event payload SHALL include the end date.

### Project Edited Event

WHEN an existing project is edited, THE system SHALL emit a real-time event to all subscribers within the organization.

The event payload SHALL include only the fields that have changed.

WHERE the project name, description, or color code is modified, THE event payload SHALL include the updated values.

WHERE budget hours are set or modified, THE event payload SHALL include the new budget hours value.

WHERE the start date is changed, THE event payload SHALL include the updated start date.

WHERE the end date is changed, THE event payload SHALL include the updated end date.

### Project Archived Event

WHEN a project is archived, THE system SHALL emit a real-time event to all project members and subscribers within the organization.

The event SHALL notify recipients that the project has been archived.

THE event SHALL indicate that no new timelogs can be recorded against the archived project.

THE system SHALL preserve all existing timelogs associated with the archived project.

### Project Completed Event

WHEN a project is completed, THE system SHALL emit a real-time event to all project members and subscribers within the organization.

The event SHALL notify recipients that the project has been completed.

THE event SHALL indicate that no new timelogs can be recorded against the completed project.

THE system SHALL preserve all existing timelogs associated with the completed project.

### Project Deleted Event

IF a project has no timelogs associated with it, THEN a user with project management permission MAY delete it.

WHEN a project is deleted, THE system SHALL emit a real-time event to all project members and subscribers within the organization.

The event SHALL confirm the permanent removal of the project.

THE event SHALL notify all project members that the project no longer exists.

IF a project has one or more timelogs, THEN THE system SHALL reject the deletion request and not emit any deletion event.

### Project Event Subscription

THE system SHALL automatically subscribe users with the project:view permission to all project events within their currently selected organization.

WHEN a project event is emitted, THE system SHALL deliver it only to subscribers whose organization context matches the project's organization.

THE system SHALL not deliver project events to users outside the project's organization.

WHEN a user switches their organization context, THE system SHALL update their event subscriptions to reflect the new organization's project events.

Project members SHALL automatically receive project-specific events — archived, completed, and deleted — for projects they belong to, regardless of their permission level.

### Budget Utilization Tracking via Events

WHERE budget hours are set or modified on a project, THE system SHALL include the budget hours value in the corresponding project event payload.

WHEN a project's budget hours are updated, THE system SHALL emit an event enabling subscribers with the report:view permission to track budget utilization in near real time.

THE system SHALL provide budget-related event data so that subscribers can calculate the percentage of budget consumed based on actual hours logged against the project.

## ProjectMember Events

The system emits real-time events when employees are assigned to or removed from projects, and when their assigned role within a project changes. Users with project:view permission, the affected employee, and all current project members are subscribers to these events. The event payload for a new assignment includes the employee identifier, the project identifier, and the assigned role — either member or project-lead. When a project lead is assigned, the event signals that this employee now has authority to manage tasks within the project. Removal events notify the employee and remaining project members that the person is no longer part of the project. If an employee is assigned to a project they were not previously a member of, the event payload carries the full membership details. Project member events are scoped to the organization and are never broadcast to non-members of the project.

### Project Member Assignment and Event Emission

WHEN a user with project management permission assigns an employee to a project, THE system SHALL emit a real-time assignment event.

The event payload SHALL include the employee identifier, the project identifier, and the assigned role — either member or project-lead.

IF the employee was not previously a member of the project, THEN THE system SHALL include full membership details in the event payload. These full details include the assigned role and the date the employee joined the project, providing subscribers with complete context about the new membership.

THE system SHALL support assigning an employee to multiple projects. Each assignment SHALL generate its own independent event. THE system SHALL NOT impose a limit on how many projects an employee can join.

### Project Lead Authority Signaling

WHEN an employee is assigned the project-lead role — whether through an initial assignment or a subsequent role change — THE system SHALL signal in the event payload that the employee now has the authority to manage tasks within that project.

This task management authority SHALL include the ability to create tasks, edit tasks, and manage task statuses within the project. The event serves as a notification to all subscribers that the designated employee has been granted elevated task management permissions for that specific project.

The project lead authority SHALL be limited to task management within the project. It SHALL NOT extend to project editing, project deletion, or member management — those operations remain with users holding project management permission.

### Project Member Removal and Event Emission

WHEN a user with project management permission removes an employee from a project, THE system SHALL emit a real-time removal event.

The event payload SHALL include the employee identifier and the project identifier, indicating that the person is no longer a member of the project.

IF an employee has been removed from a project, THEN THE system SHALL exclude that employee from receiving any future events scoped to that project — including task updates, membership changes, or any other project-scoped events.

### Role Change Within a Project and Event Emission

WHEN a user with project management permission changes an existing project member's assigned role — for example, promoting a member to project-lead or demoting a project-lead to member — THE system SHALL emit a real-time role change event.

The event payload SHALL include the employee identifier, the project identifier, the previous role, and the new role, allowing subscribers to understand the nature of the transition.

IF the role change results in the employee gaining project-lead status, THEN THE system SHALL additionally signal in the event that the employee now has task management authority within the project.

IF the role change results in the employee losing project-lead status, THEN THE system SHALL signal in the event that the employee no longer has task management authority. The employee's task history and previously created tasks within the project SHALL remain unaffected by the role change.

### Event Notification Delivery

THE system SHALL deliver project member events to three categories of subscribers within the organization:

- The affected employee — the person who was assigned, removed, or had their role changed
- All current project members — so they are aware of who joins, leaves, or changes role on the project roster
- Users with project viewing permission — enabling them to track project staffing changes across the organization

The affected employee SHALL receive a notification specific to the action taken: a confirmation upon being assigned to a project, a notification upon being removed, and a notification upon having their role changed.

All current project members SHALL receive notification of membership changes, ensuring the team is aware when a new person joins the project or when an existing member leaves.

### Event Scoping and Subscriber Exclusion

THE system SHALL scope all project member events to a single organization. Events from one organization SHALL never be delivered to users working in a different organization context.

IF a user belongs to multiple organizations, THEN THE system SHALL deliver events only for the user's currently selected organization.

IF a user does not have project viewing permission and is not a project member, THEN THE system SHALL NOT deliver any project member events to that user. Non-members are strictly excluded from receiving these events, even if they belong to the same organization.

THE system SHALL deliver project member events to currently connected subscribers only. IF a subscriber is offline at the time an event is emitted, THEN THE system SHALL NOT store the event for later replay.

### Multiple Project Assignment Support

THE system SHALL support assigning an employee to multiple projects simultaneously.

WHEN an employee is assigned to an additional project while already being a member of other projects, THE system SHALL treat each assignment as an independent operation. Each assignment SHALL produce its own event with its own payload, reflecting the specific project and assigned role.

THE system SHALL NOT impose a limit on the number of projects an employee can join. An employee who is a member of multiple projects SHALL receive events for all projects they belong to, each scoped to its respective project context.

## Task Events

The system emits real-time events when tasks are created, edited, or when their status changes. Employees assigned to the parent project, the assigned employee (if any), project leads, and users with project:manage permission are subscribers to task events. The event payload for a new task includes its title, description, status, priority, estimated hours, due date, assigned employee, and optional parent task reference. Status change events are particularly important — when a task moves from open to in-progress, or from in-progress to completed, the event triggers a task history entry and notifies the assigned employee and project lead. Priority changes (low, medium, high, urgent) are also broadcast so team members can reprioritize their work accordingly. When a task's assigned employee changes, both the previous and new assignee receive the event. Parent task assignments are limited to one level of nesting, and events for subtasks include the parent task reference. Task events are scoped to members of the project the task belongs to.

### Task Event Subscribers

WHEN a task event is emitted, THE system SHALL deliver the event to all employees who are members of the project the task belongs to.

WHEN a task event is emitted, THE system SHALL deliver the event to the assigned employee of the task, if an employee is assigned.

WHEN a task event is emitted, THE system SHALL deliver the event to the project lead of the project the task belongs to.

WHEN a task event is emitted, THE system SHALL deliver the event to all users with project:manage permission in the organization.

THE system SHALL scope all task events exclusively to members of the project the task belongs to; users who are not project members SHALL NOT receive task events.

### Task Created Event

WHEN a new task is created within a project, THE system SHALL emit a task created event.

THE system SHALL include in the task created event payload the following information:
- Task title
- Task description
- Task status (open, in-progress, completed, or closed)
- Task priority (low, medium, high, or urgent)
- Estimated hours, if set
- Due date, if set
- Assigned employee reference, if an employee is assigned

WHERE the new task is a subtask with a parent task, THE system SHALL include the parent task reference in the event payload.

THE system SHALL deliver the task created event to all project members as defined in Task Event Subscribers.

### Task Status Change Event

WHEN a task's status changes, THE system SHALL emit a task status change event.

THE system SHALL include in the status change event payload: the old status, the new status, and the task title.

WHEN a task status change event is emitted, THE system SHALL automatically create a task history entry recording the timestamp of the change, the old status, the new status, and the user who made the change.

WHEN a task status change event is emitted, THE system SHALL notify the assigned employee of the task.

WHEN a task status change event is emitted, THE system SHALL notify the project lead of the project the task belongs to.

IF the task has no assigned employee, THEN THE system SHALL still notify the project lead and create the task history entry.

THE system SHALL support status transitions across all four defined statuses: open, in-progress, completed, and closed.

### Task Priority Change Event

WHEN a task's priority changes, THE system SHALL emit a task priority change event.

THE system SHALL include in the priority change event payload: the old priority, the new priority, and the task title.

THE system SHALL support priority changes across all four defined levels: low, medium, high, and urgent.

WHEN a task priority change event is emitted, THE system SHALL broadcast the event to all project members so team members can reprioritize their work accordingly.

THE system SHALL deliver the priority change event to the assigned employee and the project lead as part of the broadcast to all project members.

### Task Assigned Employee Change Event

WHEN a task's assigned employee changes, THE system SHALL emit an assigned employee change event.

THE system SHALL include in the assigned employee change event payload: the previous assignee reference, the new assignee reference, and the task title.

WHEN an assigned employee change event is emitted, THE system SHALL notify the previous assignee that they are no longer assigned to the task.

WHEN an assigned employee change event is emitted, THE system SHALL notify the new assignee that they have been assigned to the task.

IF the task previously had no assigned employee, THEN THE system SHALL only notify the new assignee.

IF the task's assigned employee is being cleared (set to none), THEN THE system SHALL only notify the previous assignee.

THE system SHALL ensure both the previous and new assignee receive the event only if they are members of the project the task belongs to.

### Task Edited Event

WHEN an existing task is edited, THE system SHALL emit a task edited event.

THE system SHALL include in the task edited event payload: the fields that were updated and their new values.

WHERE the edited task is a subtask, THE system SHALL include the parent task reference in the event payload.

WHERE a task's parent task field is changed, THE system SHALL include both the old parent task reference (if any) and the new parent task reference in the event payload.

THE system SHALL enforce that parent task assignments are limited to one level of nesting; a subtask SHALL NOT serve as a parent task for another task.

THE system SHALL deliver the task edited event to all project members as defined in Task Event Subscribers.

IF the edit includes changes covered by more specific event types (status change, priority change, or assigned employee change), THEN THE system SHALL emit the corresponding specific event in addition to or in place of the general edited event.

## TaskHistory Events

The system emits real-time events each time a task status change is recorded in the task history. These events are tied directly to task status transitions — whenever a task moves between open, in-progress, completed, or closed, a history entry is created and an event is emitted. The event payload includes the timestamp of the change, the old status, the new status, and the identifier of the user who made the change. Project leads and users with project:manage permission are the primary subscribers since they need to audit task progression. The assigned employee also receives task history events for their own tasks. Task history events are always append-only — entries are never edited or deleted, so the system never emits update or deletion events for task history records. These events enable real-time audit trail visibility, helping managers track how tasks move through the workflow without needing to refresh or run reports.

### Task History Event Emission

WHEN a task status change is recorded in the task history, THE system SHALL emit a real-time event to all authorized subscribers.

The event payload SHALL include:
- The timestamp of when the status change was recorded
- The old status value before the transition
- The new status value after the transition
- The identifier of the user who made the status change
- The identifier of the task whose status changed
- The identifier of the project containing the task

THE system SHALL emit the event immediately upon creation of the task history entry, without delay or batching.

### Status Transition Events

THE system SHALL emit a task history event for every valid task status transition, including but not limited to:
- When a task moves from open to in-progress
- When a task moves from in-progress to completed
- When a task moves from completed to closed
- When a task moves from in-progress back to open
- When a task moves from any status to any other valid status

THE system SHALL include both the old status and the new status in the event payload, enabling subscribers to understand the direction and nature of the transition.

THE system SHALL NOT emit an event when a task is updated without a status change — only actual status transitions trigger task history events.

### Append-Only Event Guarantee

THE system SHALL emit only creation events for task history entries. Task history records are immutable — once created, they cannot be modified or removed.

THE system SHALL NOT emit update events for task history entries, as editing task history is prohibited.

THE system SHALL NOT emit deletion events for task history entries, as deleting task history is prohibited.

Subscribers SHALL receive only a single event per task history entry: the creation event triggered at the moment the status change is recorded.

### Event Subscription and Delivery

WHEN a task history event is emitted, THE system SHALL deliver the event to:
- Project leads assigned to the project containing the task
- All users who hold the project:manage permission in the organization
- The employee assigned to the task (for their own tasks only)

Project leads SHALL receive task history events for all tasks within their project, regardless of which employee the task is assigned to.

Users with project:manage permission SHALL receive task history events for all tasks across all projects in the organization.

The assigned employee SHALL receive task history events only for tasks specifically assigned to them.

THE system SHALL scope all event deliveries to the organization context — subscribers SHALL NOT receive events from organizations they do not belong to.

### Real-Time Audit Trail Purpose

WHERE the system emits task history events in real time, authorized subscribers SHALL be able to track task workflow progression without manually refreshing views or generating reports.

Project leads and managers SHALL receive immediate visibility when:
- A task is picked up and moved to in-progress
- A task is completed
- A task is closed
- A task is reopened or its status regresses

This real-time audit trail SHALL enable managers to monitor team productivity and task pipeline flow as changes occur.

## Timelog Events

The system emits real-time events when timelogs are created, edited, or deleted. The employee who owns the timelog always receives events for their own records. Users with time:view_all permission receive events for all timelogs in the organization. When an employee stops a running timer, the resulting timelog creation triggers an event carrying the date, duration in minutes, project, optional task, description, and billable flag. Editing a timelog emits an event only if the timelog is not part of an approved timesheet — once approved, timelogs are locked. Deletion events are emitted only when the timelog is not part of any submitted or approved timesheet. Users with time:manage permission who edit or delete another employee's timelogs generate events visible to both the acting user and the timelog owner. Timelog events are scoped to the organization context, preserving data isolation.

### Timelog Created Event

WHEN a timelog is created, THE system SHALL emit a real-time timelog created event scoped to the organization context.

WHEN an employee stops a running timer, THE system SHALL create a new timelog from the timer data and emit a timelog created event.

The event payload SHALL include:
- The date of the timelog entry
- The duration in minutes
- A reference to the project (required)
- A reference to the optional task (if one was selected and belongs to the referenced project)
- A description of the work performed (optional)
- A billable flag, which SHALL default to true when the timelog is created via timer stop

THE timelog created event SHALL be delivered to:
- The employee who owns the timelog
- All users with time:view_all permission within the same organization

### Timelog Edited Event

WHEN an employee edits their own timelog, THE system SHALL emit a timelog edited event, provided the timelog is not part of a submitted or approved timesheet.

WHEN a user with time:manage permission edits another employee's timelog, THE system SHALL emit a timelog edited event, provided the timelog is not part of an approved timesheet.

IF a timelog is part of a submitted timesheet and the acting user is the timelog owner, THEN THE system SHALL NOT emit an edit event because submitted timesheets lock employee-owned timelogs from self-editing.

IF a timelog is part of an approved timesheet, THEN THE system SHALL NOT emit an edit event because approved timesheets lock all included timelogs, preventing any edits regardless of permission level.

The event payload SHALL include the updated fields of the timelog and identify who performed the edit.

When a user with time:manage permission performs a cross-employee edit, THE event SHALL be delivered to both the acting user and the timelog owner.

### Timelog Deleted Event

WHEN an employee deletes their own timelog, THE system SHALL emit a timelog deleted event, provided the timelog is not part of any submitted or approved timesheet.

WHEN a user with time:manage permission deletes another employee's timelog, THE system SHALL emit a timelog deleted event, provided the timelog is not part of any submitted or approved timesheet.

IF a timelog is part of a submitted timesheet, THEN THE system SHALL NOT emit a deletion event because the timelog cannot be deleted.

IF a timelog is part of an approved timesheet, THEN THE system SHALL NOT emit a deletion event because approved timesheets lock all included timelogs.

When a user with time:manage permission performs a cross-employee deletion, THE event SHALL be delivered to both the acting user and the timelog owner.

### Event Subscription Rules

THE system SHALL always deliver timelog events to the employee who owns the affected timelog.

Users with time:view_all permission SHALL receive timelog created, edited, and deleted events for all timelogs within their currently selected organization.

All timelog events SHALL be strictly scoped to the organization context. Users who belong to multiple organizations SHALL only receive events for the organization they are currently working in, preserving data isolation.

WHEN a user with time:manage permission performs a cross-employee edit or deletion, THE event SHALL be visible to:
- The acting user who holds the time:manage permission
- The timelog owner whose record was modified

THE system SHALL NOT deliver timelog events to users outside the organization where the timelog belongs.

## Timesheet Events

The system emits real-time events at every stage of the timesheet lifecycle: creation, submission, approval, and rejection. The employee who owns the timesheet receives all events for their own timesheets. Users with time:approve permission receive events for all submitted timesheets in the organization. A draft creation event includes the week start date (Monday), week end date (Sunday), and the initial collection of included timelogs with the calculated total hours. Submission events carry the submission timestamp and notify approvers that a new timesheet awaits review. Approval events include the reviewer's identity and the review timestamp, and they signal that all included timelogs are now locked. Rejection events carry the rejection reason and the reviewer's identity, and the timesheet returns to draft status so the employee can modify and resubmit. The system prevents submission events if the timesheet has no timelogs or if another timesheet for the same week is already submitted or approved.

### Timesheet Draft Creation Event

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL emit a timesheet draft creation event.

The event SHALL include the week start date (Monday) and week end date (Sunday), establishing the Monday-to-Sunday scope of the timesheet.

THE system SHALL automatically include all timelogs belonging to that employee within the specified Monday-to-Sunday week in the draft. The event payload SHALL contain the initial collection of these auto-included timelogs.

The event SHALL include the total hours calculated from all timelogs included in the draft.

The employee who owns the timesheet SHALL receive this draft creation event.

### Timesheet Submission Event

WHEN an employee submits a draft timesheet for approval, THE system SHALL emit a timesheet submission event.

IF the timesheet contains no timelogs, THEN THE system SHALL prevent the submission and SHALL NOT emit a submission event.

IF another timesheet for the same Monday-to-Sunday week is already submitted or approved, THEN THE system SHALL prevent the submission and SHALL NOT emit a submission event.

The submission event SHALL include the submission timestamp indicating when the timesheet was submitted.

The submission event SHALL notify all users who hold the time:approve permission in the organization that a new timesheet is awaiting review.

### Timesheet Approval Event

WHEN a user with the time:approve permission approves a submitted timesheet, THE system SHALL emit a timesheet approval event.

The approval event SHALL include the reviewer's identity (the user who approved the timesheet) and the review timestamp indicating when the approval occurred.

Upon approval, all timelogs included in the approved timesheet SHALL become locked. The approval event SHALL signal that these timelogs can no longer be edited or deleted.

The employee who owns the timesheet SHALL receive the approval event, along with all users who hold the time:approve permission in the organization.

### Timesheet Rejection Event

WHEN a user with the time:approve permission rejects a submitted timesheet and provides a rejection reason, THE system SHALL emit a timesheet rejection event.

The rejection event SHALL include the rejection reason (the text explanation for the rejection) and the reviewer's identity indicating who rejected the timesheet.

Upon rejection, the timesheet SHALL return to draft status. The rejection event SHALL signal this status reversion.

The employee who owns the timesheet SHALL receive the rejection event.

After receiving the rejection event, the employee SHALL be able to modify the draft timesheet — adding or removing timelogs — and resubmit it for approval. The resubmission SHALL follow the same submission rules, including the prevention of empty timesheet submissions and the detection of duplicate week submissions.

### Timesheet Event Subscriptions

Employees SHALL receive all timesheet events for their own timesheets: draft creation, submission, approval, and rejection.

Users who hold the time:approve permission SHALL receive submission, approval, and rejection events for all timesheets within the organization. This ensures approvers are notified when a timesheet is submitted for review and are informed of approval and rejection actions taken by other approvers.

Timesheet event delivery SHALL be scoped to the currently selected organization context. Users who belong to multiple organizations SHALL only receive events for the organization they are currently operating in.

Event subscriptions for timesheet events are automatic and based on the user's role-based permissions and ownership of the timesheet. No explicit subscription action is required from the user.

## Timer Events

The system emits real-time events for all timer-related actions: starting, stopping, discarding, and editing a running timer. Timer events are delivered exclusively to the employee who owns the timer, since each employee can have at most one active timer at a time and timer state is personal. When an employee starts a timer, the event payload includes the start timestamp, the selected project, the optional task, and any description provided. Stopping the timer generates an event that includes the calculated duration rounded to the nearest minute and confirms that a corresponding timelog has been created. Discarding the timer emits an event confirming no timelog was created. Employees can edit the description, project, or task of a running timer, and each edit generates an event so the dashboard can reflect the current timer state in real time. If an employee forgets to stop the timer, it continues running indefinitely, and the system periodically emits a heartbeat or status event showing the elapsed time. Timer events enable the personal dashboard to display active timer status without polling.

### Timer Started Event

WHEN an employee starts a timer, THE system SHALL emit a timer-started event. The event payload SHALL include the start timestamp, the selected project, any optional task, and the description of the ongoing work. The project SHALL be required to start the timer; the task SHALL be optional. IF no project is selected, THEN the system SHALL reject the timer start and no event SHALL be emitted. IF the employee already has one active timer, THEN the system SHALL reject the start attempt and no event SHALL be emitted. The event SHALL be delivered exclusively to the employee who started the timer.

### Timer Stopped Event

WHEN an employee stops a running timer, THE system SHALL emit a timer-stopped event. The event payload SHALL include the calculated duration rounded to the nearest minute. The system SHALL confirm in the event that a corresponding timelog has been created with the calculated duration. The event SHALL be delivered exclusively to the employee who stopped the timer. IF no timer is currently running for the employee, THEN the stop attempt SHALL be rejected and no event SHALL be emitted.

### Timer Discarded Event

WHEN an employee discards a running timer, THE system SHALL emit a timer-discarded event. The event SHALL confirm that no timelog was created as a result of the discard operation. The timer SHALL be terminated without producing any time entry. The event SHALL be delivered exclusively to the employee who discarded the timer. IF no timer is currently running for the employee, THEN the discard attempt SHALL be rejected and no event SHALL be emitted.

### Timer Edited Events

WHEN an employee edits the description of a running timer, THE system SHALL emit a timer-edited event reflecting the updated description.

WHEN an employee changes the project of a running timer, THE system SHALL emit a timer-edited event reflecting the updated project. The new project SHALL be one the employee is assigned to.

WHEN an employee changes the task of a running timer, THE system SHALL emit a timer-edited event reflecting the updated task. The task SHALL belong to the currently selected project.

All timer-edited events SHALL be delivered exclusively to the employee who owns the timer. IF no timer is currently running for the employee, THEN the edit attempt SHALL be rejected and no event SHALL be emitted.

### Timer Heartbeat Event

WHILE a timer is running, THE system SHALL periodically emit a timer-heartbeat event showing the current elapsed time since the timer started. The heartbeat SHALL continue to be emitted indefinitely as long as the timer remains running — there SHALL be no automatic stop. An employee may have at most one active timer at any time, and the heartbeat event SHALL reflect that single running timer. The event SHALL be delivered exclusively to the employee who owns the timer. WHEN the timer is stopped or discarded, the system SHALL cease emitting heartbeat events for that timer.

### Timer Event Subscription Scope

THE system SHALL deliver all timer events exclusively to the employee who owns the timer. No other user, including those with elevated permissions, SHALL receive timer events for timers they do not own. An employee's personal dashboard SHALL use timer events to display live active timer status without the need for polling. The dashboard SHALL reflect the current timer state — running, stopped, or discarded — as well as the elapsed time, project, task, and description as they are updated through timer events.

## ActivityLog Events

The system emits real-time events each time a significant action is recorded in the activity log. Users with the org:manage permission are the primary subscribers to activity log events. The event payload includes the timestamp, the user who performed the action, the action type, the target entity, and contextual details about what changed. Action types that generate events include: employee invited, deactivated, or reactivated; contract created or edited; project created, archived, completed, or deleted; task status changed; timesheet submitted, approved, or rejected; and role assigned or changed. Activity log events are append-only — entries are never modified or removed, so the system never emits update or deletion events for log entries. These events enable organization owners to monitor organizational activity in near real time through a live activity feed without refreshing. Events are scoped to the organization and are never visible to users outside the organization.

### Activity Log Entry Created Event

WHEN a significant action is recorded in the activity log, THE system SHALL emit an "activity log entry created" event in real time.

The event payload SHALL include the following fields:

- **timestamp**: the date and time when the action was performed
- **actor**: the user who performed the action, including their display name and user identifier
- **action type**: a classification of the action that occurred
- **target entity**: the business entity that was affected by the action (e.g., employee, contract, project, task, timesheet, role)
- **target identifier**: a reference that uniquely identifies the affected entity instance
- **details**: contextual information describing what changed, which may include old and new values where applicable

### Action Types That Generate Events

THE system SHALL emit an event for each of the following action types:

- **employee invited**: WHEN a user with employee:manage permission invites a new employee to the organization
- **employee deactivated**: WHEN a user with employee:manage permission deactivates an existing employee
- **employee reactivated**: WHEN a user with employee:manage permission reactivates a previously deactivated employee
- **contract created**: WHEN a new employee contract is created, including its start date, pay rate, pay period, and working hours per week
- **contract edited**: WHEN an active employee contract is modified, including the fields that were changed
- **project created**: WHEN a new project is created with its name, description, color code, and optional budget hours
- **project archived**: WHEN a project's status is changed to archived
- **project completed**: WHEN a project's status is changed to completed
- **project deleted**: WHEN a project is permanently deleted from the organization
- **task status changed**: WHEN a task's status transitions from one value to another (e.g., open to in-progress, in-progress to completed), including the old status, new status, and the user who made the change
- **timesheet submitted**: WHEN an employee submits a draft timesheet for approval
- **timesheet approved**: WHEN a user with time:approve permission approves a submitted timesheet
- **timesheet rejected**: WHEN a user with time:approve permission rejects a submitted timesheet, including the rejection reason
- **role assigned**: WHEN a role is assigned to an employee, including the role name and the employee affected
- **role changed**: WHEN an existing employee's role assignment is changed to a different role, including the old role and the new role

### Event Subscription Rules

### Subscriber Authorization

THE system SHALL deliver activity log events only to users who have the org:manage permission within the organization where the action occurred.

Users without the org:manage permission SHALL NOT receive activity log events, even if they are members of the same organization.

### Organization Scoping

THE system SHALL scope every activity log event to the organization in which the action was performed.

Users who belong to multiple organizations SHALL only receive activity log events for their currently selected organization context.

Activity log events SHALL NOT be visible to users outside the organization, including users belonging to other organizations in the same platform.

### Append-Only Event Behavior

THE system SHALL only emit "activity log entry created" events when a new entry is added to the activity log.

THE system SHALL NOT emit update or deletion events for activity log entries, because activity log entries are immutable once recorded.

Activity log entries SHALL NOT be editable or deletable by any user, including the organization owner. The system SHALL enforce this immutability at all levels, including the event stream.

### Live Activity Feed Behavior

### Real-Time Delivery

WHEN a user with org:manage permission is connected to the event stream for their current organization, THE system SHALL deliver activity log events as they occur, without requiring the user to refresh or poll.

The system SHALL deliver events through a persistent real-time connection such as WebSocket or Server-Sent Events (SSE), enabling a live activity feed.

### Connection Lifecycle

WHEN a user switches their organization context, THE system SHALL disconnect the event stream for the previous organization and establish a new stream scoped to the newly selected organization.

WHEN a user loses the org:manage permission (e.g., due to a role change), THE system SHALL terminate the existing event stream connection for that user.

### Feed Ordering

THE system SHALL deliver activity log events in the order they were recorded, preserving chronological sequence in the live feed.

Newly connected subscribers SHALL begin receiving events from the moment of connection onward. Historical events from before the connection was established are not delivered through the live feed.

## Invitation Events

The system emits real-time events when employee invitations are created or when their status changes. Users with the employee:manage permission are the primary subscribers to invitation events. When an invitation is sent to an email address, the event payload includes the invited email, the invitation status (pending), and the timestamp. If the invited email already belongs to an existing user account, the system emits an immediate acceptance event confirming the user has been added to the organization. When a previously unregistered user signs up with the invited email, the system emits an acceptance event notifying that the pending invitation has been fulfilled and the user is now an active employee. The system also emits events when invitations expire or are manually revoked by an organization owner. Invitation events enable managers to track the onboarding pipeline in real time — they can see which invitations are still pending and which have been accepted without manually checking.

### Invitation Sent Event

WHEN an invitation is created for an email address that is not yet associated with a registered user account, THE system SHALL emit a real-time invitation sent event.

The event payload SHALL include:
- The invited email address
- The invitation status set to "pending"
- The timestamp when the invitation was sent

The invitation sent event SHALL be scoped to the organization in which the invitation was created. The event SHALL be delivered to subscribers with the employee:manage permission who are currently operating within that organization context.

### Existing User Auto-Added Event

WHEN an invitation is sent to an email address that already belongs to a registered user account, THE system SHALL automatically add that user to the organization as an active employee.

THE system SHALL emit an immediate acceptance event confirming that the user has been added to the organization. The acceptance event payload SHALL include:
- The invited email address
- The user who was added
- The acceptance timestamp

The acceptance event SHALL be delivered to subscribers with the employee:manage permission within the organization where the invitation was created.

### Invitation Fulfillment on Signup

WHEN a previously unregistered user signs up with an email address that matches a pending invitation, THE system SHALL automatically fulfill the pending invitation.

THE system SHALL emit an acceptance event notifying that the pending invitation has been fulfilled and the user is now an active employee in the organization. The acceptance event payload SHALL include:
- The invited email address
- The newly registered user
- The fulfillment timestamp

The acceptance event is organization-scoped and SHALL be delivered to subscribers with the employee:manage permission within that organization.

### Pending Invitation Tracking

THE system SHALL enable managers to track the onboarding pipeline in real time through invitation events.

Subscribers with the employee:manage permission SHALL receive a stream of invitation-related events including:
- New pending invitations created
- Invitations fulfilled by existing users
- Invitations fulfilled by new user signups
- Invitations that have expired
- Invitations revoked by the organization owner

This real-time event stream SHALL allow managers to monitor which invitations are still pending and which have been accepted without requiring manual inspection of invitation records.

### Invitation Expiration and Revocation Events

WHEN a pending invitation expires, THE system SHALL emit an invitation expired event to subscribers with the employee:manage permission. The expiration event payload SHALL include:
- The invited email address
- The expiration timestamp

WHEN a pending invitation is manually revoked by the organization owner, THE system SHALL emit an invitation revoked event. The revocation event payload SHALL include:
- The invited email address
- The user who performed the revocation
- The revocation timestamp

Both expiration and revocation events SHALL be scoped to the organization in which the invitation was originally created.

### Event Subscription and Scoping

Users with the employee:manage permission SHALL be the primary subscribers to invitation events within their current organization context.

THE system SHALL enforce organization-scoped delivery for all invitation events. An invitation created in one organization SHALL NOT produce events visible to users operating in a different organization, even if those users hold the employee:manage permission elsewhere.

When a user switches their active organization context, the real-time event subscription SHALL update to reflect only the newly selected organization's invitation events. Invitation events from the previous organization SHALL no longer be delivered until the user switches back to that organization context.