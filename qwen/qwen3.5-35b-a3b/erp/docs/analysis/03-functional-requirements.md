**hrmPlatform — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## Organization Operations

Users can create a new organization during initial sign-up, providing a name, description, logo image, currency, timezone, and fiscal start month. Organization owners can edit organization settings to update the name, description, logo, currency, timezone, or fiscal start month. Organization owners can delete their organization, but only if all pending timesheets are resolved and there are no active employee contracts. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently removed, though the owner's account remains without any organization association. Users who belong to multiple organizations can switch between them without logging out, and all actions are scoped to the currently selected organization.

### ### Organization Creation During Sign-Up

During initial sign-up, users can create a new organization for their business or team.
The user provides an organization name, description, and uploads a logo image.
The user selects a currency (e.g., USD, EUR, KRW), timezone, and fiscal start month for the organization.
The newly created organization becomes the current organization context for the user.
The organization is created with the user as its owner, with full access to all organization features.

### ### Organization Settings Update

Organization owners can update organization settings to modify the organization's basic information.
The owner can change the organization name, description, logo image, currency, timezone, or fiscal start month.
Changes are saved immediately and apply to all organization data.
Any user in the organization sees the updated organization information.

### ### Organization Owner Permissions

Organization owners have full access to all organization features and settings.
Owners can manage organization roles and members, including creating custom roles.
Owners can edit or delete custom roles, provided no employees are assigned to them.
Owners can delete their organization, subject to deletion conditions.
Owners can transfer ownership to another user in the organization.

### ### Organization Deletion Conditions

Organization owners can delete their organization, but only if specific conditions are met.
All pending timesheets in the organization must be resolved (approved or rejected) before deletion.
There must be no active employee contracts in the organization at the time of deletion.
If pending timesheets exist, the deletion request is rejected until they are resolved.
If active contracts exist, the deletion request is rejected until all contracts are ended.
Owners must complete these conditions before the organization can be deleted.

### ### Pending Timesheets Resolution

A timesheet is considered pending if it is in draft or submitted status awaiting approval.
Pending timesheets must be resolved before the organization can be deleted.
Approved timesheets lock their associated timelogs and cannot be modified.
Rejected timesheets return to draft status and can be resubmitted.
Organization deletion cannot proceed while any timesheet remains in pending status.

### ### Active Contracts Check

An employee contract is considered active if it has no end date or if the current date falls within the contract period.
Only one contract can be active for an employee at any given time.
Creating a new contract for an employee automatically ends the previous active contract.
An organization cannot be deleted if any employee has an active contract.
All active contracts must be ended before organization deletion can proceed.

### ### Organization Data Permanent Deletion

When an organization is deleted, all data within that organization is permanently removed.
All employees, projects, tasks, timelogs, and timesheets associated with the organization are deleted.
This deletion is irreversible and cannot be undone.
Historical data including task history and activity logs are also deleted.
The deletion occurs immediately upon confirmation of the deletion request.

### ### Owner Account Remains

When an organization is deleted, the owner's user account remains active.
The owner is no longer associated with any organization after deletion.
The owner's account retains login credentials and profile information.
The owner can join or create a new organization after deletion.

### ### Multi-Organization Membership

Users can belong to multiple organizations simultaneously.
A user can create their own organization and also be invited to other organizations.
Each organization maintains separate data, employees, projects, and settings.
Users must select which organization to work in when logging in.
All subsequent actions are scoped to the currently selected organization.

### ### Organization Context Switching

When logging in, users must select which organization to work in from their list.
All actions performed are scoped to the selected organization only.
Users can switch between their organizations without logging out.
Switching organizations changes the data context for all subsequent operations.
The user maintains separate sessions for each organization they work in.

### ### Data Isolation Per Organization

All data is strictly isolated between organizations.
Employees in one organization cannot access or view data from another organization.
Each organization operates independently with its own employees, projects, and settings.
Users can only see data for their currently selected organization.
API requests enforce organization context on every operation.

### ### Organization Independence

Each organization operates as an independent business entity.
Organization settings do not affect other organizations.
Data in one organization is not shared with or visible to other organizations.
Custom roles and permissions are defined per organization and do not transfer.
Employees must be invited separately to each organization they belong to.

## User Operations

Users can sign up with an email and password, or log in using the same credentials. Users can change their password at any time from their profile settings. Each user can belong to multiple organizations simultaneously and can switch between organizations without logging out. Users can delete their account, but if they are the sole owner of an organization, they must either transfer ownership or delete the organization first. When a user account is deleted, their employee records in other organizations are marked as deactivated rather than removed. User profiles include a display name, avatar image, and phone number, which are shared across all organizations the user belongs to.

### User Registration and Authentication

Users can create an account by providing an email address and password.

The email address serves as the user's unique identifier across all organizations.

Users can log in to the system using their email address and password.

Upon successful login, the system presents a list of organizations the user belongs to.

If the user has never joined an organization before, the system prompts them to create a new organization.

Users who already have organizations can select which organization to enter.

After selecting an organization, all subsequent actions are scoped to that organization.

If a user logs in and has no organizations, the user must create one before accessing any features.

The system maintains a separate session for each organization context.

If the user has no active session in the selected organization, the system redirects to the organization selection screen.

### Password Management

Users can change their password from their profile settings.

The password change applies to the user's account globally across all organizations.

Users must provide their current password to change to a new password.

The new password must differ from the current password.

If the current password is incorrect, the password change request is rejected.

If the new password matches the current password, the password change request is rejected.

After a successful password change, the user must log in again with the new password.

All active sessions for the user are invalidated after a password change.

### Organization Context and Switching

Each user can belong to multiple organizations simultaneously.

Users can switch between organizations without logging out.

When switching organizations, the user's current session continues without interruption.

All actions taken after switching are scoped to the newly selected organization.

Data and operations are strictly isolated between organizations.

Users cannot see any data from organizations they are not currently active in.

The organization context persists across page refreshes and browser sessions.

Users can view which organization they are currently active in at all times.

When a user is removed from an organization, their next action requiring that organization fails with an access denied message.

### Account Deletion and Ownership Transfer

Users can delete their account from their profile settings.

If the user is the sole owner of an organization, they must either transfer ownership or delete the organization before deleting their account.

To transfer ownership, the user must assign another member as the new owner of the organization.

If the user is not the sole owner, they can delete their account immediately.

When a user deletes their account, their employee records in all organizations are marked as deactivated.

Deactivated employee records preserve all historical data including timelogs and timesheets.

Deactivated employees cannot log time or submit timesheets.

Deactivated employees can be reactivated by users with the appropriate permission.

The account deletion process permanently removes the user's login credentials and authentication tokens.

Users who are removed from an organization lose all access to that organization's data.

### User Profile Management

Each user has a global profile that is shared across all organizations.

Users can view and edit their profile from the settings menu.

The profile includes a display name, avatar image, and phone number.

The display name is used to identify the user in activity logs and reports.

Users can upload or update their avatar image.

Users can update their phone number at any time.

Profile changes are reflected immediately across all organizations.

The display name must be unique within each organization.

If the user is the sole owner of an organization, they cannot be deleted until ownership is transferred.

Users can view their profile information in the organization settings menu.

Profile edits require the user to be authenticated in at least one organization.

### Organization Creation During Sign-up

New users who have no existing organizations are prompted to create an organization during sign-up.

The organization creation requires a name and description.

The user becomes the owner of the newly created organization.

The organization owner can configure the organization's currency, timezone, and fiscal start month.

The organization logo is optional during creation.

Upon completing organization creation, the user is automatically logged into the new organization.

The organization name and description can be edited later by the owner.

The organization owner receives full access to all features in the newly created organization.

The organization cannot be deleted while there are pending timesheets or active employee contracts.

## Role Operations

Each organization has three built-in roles that cannot be deleted: Owner with full access, Manager with employee and project management capabilities, and Employee with time tracking privileges. Organization owners can create custom roles with a name and specific set of permissions from the available permission list. Custom roles can be edited by organization owners to adjust their permissions. Custom roles can be deleted only if no employees are currently assigned to them. Each employee in an organization must be assigned exactly one role, and role assignments can be changed by users with the employee management permission.

### Built-in Roles

Each organization has three built-in roles that cannot be deleted: Owner, Manager, and Employee. These roles are protected and remain permanently available in every organization. Organization owners cannot delete or remove these built-in roles under any circumstances. If an organization needs different permissions, custom roles should be created instead of modifying the built-in roles.

### Owner Role

The Owner role has full access to all features within the organization. Owners can manage all aspects of the organization including organization settings, all employees, all projects, all timesheets, and all reports. Only users with the Owner role can create custom roles, assign roles to employees, and delete custom roles. The Owner role includes all permissions available in the system.

### Manager Role

The Manager role has management capabilities for employees, projects, and timesheets. Managers can add, edit, and deactivate employees; create, edit, and delete projects and tasks; approve or reject timesheets; and view all reports. However, Managers cannot edit organization settings or manage roles. Managers can view all employees' data but cannot assign roles to employees.

### Employee Role

The Employee role has time tracking privileges and limited access to personal data. Employees can track time by creating timelogs and submitting timesheets; view their own timelogs and timesheets; view projects and tasks they are assigned to; and view their own contracts and department information. Employees cannot view other employees' data, cannot manage projects, and cannot approve timesheets.

### Custom Role Creation

Organization owners can create custom roles with a name and a set of permissions from the available permission list. When creating a custom role, the owner must specify the role name and select which permissions the role should have from the predefined permission codes. Custom roles are created for specific organizational needs and can have any combination of permissions. Once created, custom roles appear in the role assignment list for employee role selection.

### Custom Role Editing

Organization owners can edit custom roles to adjust their permissions. When editing a custom role, the owner can modify the set of permissions assigned to the role and update the role name. Edits to custom roles take effect immediately and apply to all employees currently assigned to that role. Editing a custom role does not affect employees' existing assignments to other roles.

### Role Permissions

The available permissions for custom roles are: edit organization settings; add, edit, and deactivate employees; view employee list and details; create, edit, and delete projects and tasks; view projects and tasks; edit or delete any employee's timelogs; approve or reject timesheets; view all employees' timelogs and timesheets; and view organization reports. Each custom role must have at least one permission assigned. Permissions can be combined in any way to create roles with specific privilege levels.

### Role Deletion

Organization owners can delete custom roles only if no employees are currently assigned to that role. Before deleting a custom role, all employees assigned to that role must be reassigned to a different role. Once all employees have been reassigned, the custom role can be deleted. Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances. If an employee has no role assigned, the assignment must be changed before the employee can perform any organizational actions.

## Employee Operations

Users with employee management permission can invite new employees to the organization via email invitation. If the invited email already has an account, the user is immediately added to the organization. If the email has no account, a pending invitation is created and the user is automatically added when they sign up. Each employee record includes a reference to the user account, their role, department, position, employment type, and status. Users with employee management permission can edit employee records including department, position, and employment type. Employees can be deactivated, which prevents them from logging time or submitting timesheets while preserving their historical data. Deactivated employees can be reactivated at any time. Users with employee view permission can view the employee list, which can be filtered by department, employment type, status, and searched by name.

### Employee Invitation

Users with employee management permission can invite new people to join the organization by sending an invitation email.

The invitation is sent to the email address provided by the user initiating the invitation.

The system checks whether the email address already has an existing user account.

If the email already has an account, the existing user is immediately added to the organization with the assigned role.

If the email does not have an account, the system creates a pending invitation record and waits for the user to sign up.

When the user with the invited email address completes the sign-up process, they are automatically added to the organization and assigned the role that was set during the invitation.

The invitation is considered complete once the user is added to the organization.

Users who receive a pending invitation can sign up with that email address to accept the invitation automatically.

Users with employee management permission can view the status of pending invitations and cancel them if needed before the user accepts.

### Existing User Organization Addition

When an invitation is sent to an email address that already has a user account, the system immediately adds that user to the organization.

The existing user retains their account and profile information.

The user is assigned the role specified during the invitation.

The user can then access the organization with their existing credentials.

If the user already belongs to multiple organizations, they can switch to this newly joined organization without logging out.

The user becomes an employee record in the organization with the assigned role and default department and position values.

This immediate addition allows organizations to quickly onboard existing team members.

The user's existing employee records in other organizations are not affected by joining a new organization.

### Pending Invitation Creation

When an invitation is sent to an email address that does not have an existing user account, the system creates a pending invitation record.

The pending invitation stores the email address, the role assigned to the invitation, and the organization it is for.

The invitation remains in pending status until the user signs up with that email address.

The pending invitation can be cancelled by users with employee management permission before the user accepts.

Once the user signs up with the invited email address, the pending invitation is automatically resolved.

The user is then added to the organization with the role that was specified during the invitation.

If the user never signs up, the pending invitation remains in the system until cancelled.

Organizations can view a list of all pending invitations and their current status.

The pending invitation ensures that new employees can be prepared for onboarding before they complete their account registration.

### Employee Record Details

Each employee record stores the employee's full name, email address, role in the organization, department, position, employment type, and status.

The employee record references the user account that belongs to the organization.

The role determines the employee's permissions within the organization.

The department is an optional organizational grouping that the employee belongs to.

The position is the employee's job title within the organization.

The employment type indicates the nature of the employment relationship.

The status indicates whether the employee is active or deactivated.

All employee records are associated with exactly one organization.

Each employee can only have one active employee record within an organization at a time.

The employee record serves as the central reference point for all employee-related operations.

### Employee Record Editing

Users with employee management permission can edit employee records to update department, position, and employment type information.

The employee's role can also be changed by users with employee management permission.

The employee's email address cannot be edited as it is tied to the user account.

The employee's name is updated through the user's global profile, not through the employee record.

Changes to the employee record take effect immediately and are visible to all users with appropriate permissions.

Users with employee view permission can view the updated information but cannot make changes.

When an employee's role is changed, their access to organization features is updated immediately.

The employee record maintains a history of significant changes for audit purposes.

All edits must be performed by users with the appropriate employee management permission.

The employee record is updated in real-time across all organization views.

### Employee Deactivation Process

Users with employee management permission can deactivate employee records to prevent them from logging time or submitting timesheets.

When an employee is deactivated, their status is changed to deactivated.

Deactivated employees cannot create new timelogs or submit timesheets.

Deactivated employees' access to the organization is restricted based on their role.

The employee's historical data including timelogs, timesheets, and contracts is preserved and remains accessible.

Deactivated employees are removed from the active employee list but can be found when searching for inactive employees.

The deactivation date and the user who performed the deactivation are recorded.

This action is recorded in the activity log for audit purposes.

Deactivated employees can be reactivated at any time by users with employee management permission.

The deactivation process does not delete the employee or their historical data.

### Employee Reactivation

Users with employee management permission can reactivate deactivated employee records.

When an employee is reactivated, their status is changed back to active.

The employee immediately regains the ability to log time and submit timesheets.

The employee's role and other information remain unchanged during reactivation.

The employee becomes visible in the active employee list again.

The reactivation date and the user who performed the reactivation are recorded.

This action is recorded in the activity log for audit purposes.

Reactivated employees can access the organization with their existing credentials.

The employee's historical data from before deactivation remains intact.

Reactivation does not create a new employee record but updates the existing one.

### Employee List Access

Users with employee view permission can view the list of all employees in the organization.

The employee list displays each employee's name, role, department, position, employment type, and status.

The list is paginated to display a manageable number of employees per page.

Users can filter the employee list by department to see only employees in a specific department.

Users can filter the employee list by employment type to see only employees with a specific employment type.

Users can filter the employee list by status to see only active or deactivated employees.

Users can search the employee list by name to find employees with matching names.

The search matches against the employee's full name and can find partial matches.

Multiple filters can be applied simultaneously to narrow the employee list.

Users without employee view permission cannot access the employee list.

## Contract Operations

Each employee can have multiple contracts that serve as a historical record of their employment terms. Only one contract can be active at a time for any employee. Each contract includes a start date, optional end date, pay rate, pay period, working hours per week, and optional notes. Users with employee management permission can create contracts for employees, and creating a new contract automatically ends the previous active contract by setting its end date to the day before the new contract starts. The current active contract can be edited, but past contracts are immutable and cannot be modified. Employees can view their own contracts, and users with employee view permission can view any employee's contracts.

### Contract Creation

Users with employee management permission can create contracts for employees in their organization.

When creating a contract, the user must specify the employee, start date, pay rate, pay period, and working hours per week. The end date, employment notes, and department are optional fields that may be left blank.

The start date must be on or after the current date. If the start date is in the past, the request is rejected.

Creating a contract automatically ends any currently active contract for that employee by setting the previous contract's end date to one day before the new contract's start date.

### Contract Reading

Users can retrieve a specific contract by its identifier to view its details.

Employees can view their own contracts.

Users with employee view permission can view any employee's contracts within the organization.

When retrieving a contract, the system returns the employee reference, start date, end date (null if ongoing), pay rate, pay period, working hours per week, and optional notes.

### Contract Editing

Users with employee management permission can edit the current active contract for an employee.

When editing, the user may update the pay rate, pay period, working hours per week, notes, or end date to make the contract ongoing by setting it to null.

Users cannot edit past contracts that are no longer active. Only the current active contract can be modified.

If the user attempts to edit a past contract, the request is rejected with an error indicating that historical contracts cannot be modified.

### Contract Listing

Users with employee management permission can retrieve a list of contracts for an employee or all employees in the organization.

Contract listings support filtering by:
- Employee
- Date range (start date and end date)
- Contract status (active or inactive)

The contract list is paginated, and each page displays contract start date, end date, pay rate, pay period, and current status.

Users can sort the contract list by start date or end date in ascending or descending order.

### Contract History Viewing

Employees can view their own contract history.

Users with employee view permission can view the full contract history of any employee in the organization.

Contract history shows all contracts in chronological order with their start dates, end dates, pay rates, and status to provide a complete record of employment terms over time.

## Department Operations

Each organization can have departments, each with a name, description, and optional parent department for one level of nesting. Users with organization management permission can create, edit, and delete departments. When a department is deleted, employees previously assigned to it have their department set to null, but the employees themselves are not deleted. Employees can view the complete list of departments available in their organization. Departments help organize employees within the organization structure.

### Department Creation

Users with organization management permission can create departments within their organization. When creating a department, the user provides a name and description. A department may optionally reference a parent department to create a one-level hierarchy. The system records the creation timestamp and the user who created it.

### Department Editing

Users with organization management permission can edit existing departments. They can update the department name, description, or parent department assignment. The system records the edit timestamp and the user who made the change. Department name must be unique within the organization.

### Department Deletion

Users with organization management permission can delete departments. When a department is deleted, all employees previously assigned to that department have their department assignment set to null. The employees themselves are not affected. The deletion is permanent and cannot be undone.

### Parent Department Nesting

Departments support one level of nesting only. A department can have one parent department, but a parent department cannot have a parent itself. When creating or editing a department, the system validates that the selected parent department is not itself a child department. This constraint ensures the hierarchy remains flat.

### Department List Viewing

All employees can view the complete list of departments in their organization. The department list displays each department's name, description, and parent department (if applicable). Employees can navigate the hierarchy to understand the organization structure.

## Project Operations

Users with project management permission can create projects with a name, optional description, color code, status, optional budget hours, and optional start and end dates. Projects can be edited to update any of these fields. Projects can be archived or completed, after which they cannot receive new timelogs but existing timelogs are preserved. Projects can only be deleted if they have no associated timelogs. Users with project view permission can view all projects in the organization. The project list can be paginated and filtered by status.

### Project Creation

Users with project management permission can create a new project.

A project requires a name and a color code. The name identifies the project and must be unique within the organization.

The following fields are optional:
- Description: A text field providing context about the project
- Budget hours: The total estimated hours for the project
- Start date: The date when the project begins
- End date: The date when the project is expected to complete
- Status: Defaults to active when created

The project is automatically associated with the creating organization. A project cannot be created if the required name or color code is missing.

Users can create an unlimited number of projects within an organization.

### Project Editing

Users with project management permission can edit any project in the organization.

Edited fields include:
- Name: The project name can be changed
- Description: The project description can be updated
- Color code: The project color can be modified
- Status: The project status can be changed between active, archived, or completed
- Budget hours: The budget hours can be updated
- Start date: The project start date can be modified
- End date: The project end date can be modified

All edits are recorded in the system for audit purposes. The project's timelogs remain associated with the project regardless of field changes.

### Project Archiving

Users with project management permission can archive a project.

When a project is archived:
- The project status changes to archived
- No new timelogs can be created for the archived project
- All existing timelogs on the project are preserved
- The project remains visible in project listings for reference
- The project name, description, and other details remain unchanged

Archived projects can be viewed by users with project view permission. Archived projects cannot be converted back to active status.

### Project Completion

Users with project management permission can mark a project as completed.

When a project is completed:
- The project status changes to completed
- No new timelogs can be created for the completed project
- All existing timelogs on the project are preserved
- The project remains visible in project listings for reference
- The project name, description, and other details remain unchanged

Completed projects can be viewed by users with project view permission. Completed projects cannot be converted back to active status. A project can be archived or completed, but not both simultaneously.

### Project Deletion

Users with project management permission can delete a project.

A project can only be deleted if:
- The project has no timelogs associated with it

When a project is deleted:
- The project is permanently removed from the organization
- All project members are automatically unassigned from the deleted project
- Any tasks within the project remain (tasks are managed separately)

If the project has any timelogs, the deletion request is rejected. Users must first remove all timelogs from the project before deletion.

### Project Viewing and Listing

Users with project view permission can view all projects in the organization.

The project list includes the following information for each project:
- Project name
- Status
- Budget hours (if set)
- Start date (if set)
- End date (if set)
- Color code for visual display

The project list is paginated to manage large numbers of projects. Users can navigate through pages to access all projects.

Users can filter the project list by status (active, archived, completed). Multiple status filters can be applied simultaneously.

Users without project view permission cannot see any project information.

### Budget Hours Tracking

Projects can track budget hours to monitor project consumption.

Budget hours represent the total estimated hours for a project. This value is set when creating the project or updated during project editing.

When budget hours are set:
- The system tracks actual hours logged against the project
- Reports can show budget vs. actual hours comparison
- Projects with budget hours can be identified in filtered lists
- Budget utilization can be calculated as a percentage

Projects without budget hours set are excluded from budget-focused reports and filtering. Budget hours must be a positive numeric value.

### Project Date Fields

Projects can track start dates and end dates for timeline management.

Start date:
- Optional when creating a project
- Can be set or updated when editing the project
- Represents when the project is expected to begin
- Used for reporting and filtering purposes

End date:
- Optional when creating a project
- Can be set or updated when editing the project
- Represents when the project is expected to complete
- Can be used to calculate project duration

Start and end dates are independent fields and do not affect project status. A project can have a start date without an end date, or vice versa. Both dates may be left unset if timeline tracking is not required.

## ProjectMembership Operations

Users with project management permission can assign employees to projects, and each employee can be assigned to multiple projects simultaneously. Each project membership includes the employee, the project, and an assigned role of either member or project-lead. Project leads have special privileges to manage tasks within their project. Users with project management permission can remove employees from projects. Employees can view which projects they are assigned to and their role in each project.

### Employee Project Assignment

Users with project management permission can assign employees to projects.

When an employee is assigned to a project, they become a member of that project and can access project-related features.

Assignment requires specifying the employee and the project.

The assignment can optionally include a role of either member or project-lead.

If no role is specified, the employee is assigned as a member by default.

### Multiple Projects per Employee

An employee can be assigned to multiple projects simultaneously.

There is no limit to the number of projects an employee can be assigned to.

Each project assignment is independent and tracked separately.

An employee can hold different roles across different projects (e.g., project-lead in one project and member in another).

### Project Membership Role

Each project membership includes a role that defines the employee's level of access within the project.

There are two possible roles: member and project-lead.

The role determines what tasks the employee can manage within the project.

When creating a project membership, the role must be explicitly specified.

The role is stored as part of the membership record.

### Member Role Privileges

Project members have the ability to view all tasks within their assigned projects.

Members can view task details, status, and assignments.

Members cannot create, edit, or delete tasks unless they have additional project management permission.

Members can contribute to tasks by logging time and providing updates.

Members can be assigned tasks within the project.

### Project Lead Task Management

Project leads have special privileges to manage tasks within their assigned project.

Project leads can create new tasks within the project.

Project leads can edit tasks within the project.

Project leads can change task status and priority.

Project leads can assign tasks to other team members within the project.

Project leads cannot delete tasks or modify project settings unless they also have project management permission.

### Employee Project Removal

Users with project management permission can remove employees from projects.

When an employee is removed from a project, their project membership is deleted.

The employee loses access to the project and all project-related features.

Removing an employee does not delete their timelogs associated with the project.

Historical data remains intact for audit purposes.

### Assigned Projects Viewing

Employees can view all projects they are assigned to.

For each assigned project, the employee can see their role (member or project-lead).

Employees can view project details including name, description, and status.

Employees can view tasks within projects they are assigned to.

Employees can filter their assigned projects by status.

### Project Membership Details

Project membership records include the employee, the project, and the assigned role.

Each membership record is unique per employee-project combination.

Duplicate assignments are prevented (an employee cannot be assigned to the same project twice).

The membership record can be viewed by users with project viewing permission.

Only users with project management permission can modify membership details.

## Task Operations

Project leads or users with project management permission can create tasks within a project. Each task includes a title, optional description, status, priority, optional estimated hours, optional due date, optional assigned employee, and optional parent task for one level of subtask nesting. Project leads can edit tasks within their project, and users with project management permission can edit any task. Task status changes are recorded in task history with timestamps and the user who made the change. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee, and sorted by due date, priority, or creation date.

### Task Creation

Project leads and users with project management permission can create tasks within a project.

When creating a task, the user must provide a title. The description is optional.

A project lead can only create tasks in projects where they have been assigned as project lead.
Users with project management permission can create tasks in any project.

The task is automatically associated with the project where it is created.
If the task includes a due date, it is recorded for future reference.
If the task includes estimated hours, it is recorded for budget tracking.

If the user does not have permission to create tasks in the project, the request is rejected.

### Task Attributes

Each task has the following attributes:

- Title (required): A descriptive name for the task
- Description (optional): Additional details about the task
- Status: Indicates current progress (open, in_progress, completed, closed)
- Priority: Urgency level (low, medium, high, urgent)
- Estimated hours (optional): Time estimate for task completion
- Due date (optional): Target completion date
- Assigned employee (optional): Employee responsible for the task
- Parent task (optional): For subtask hierarchy, one level of nesting only

The assigned employee must be a member of the project.
A task can have at most one parent task, forming a single level of subtasks.
Employees can view tasks where they are assigned.

If an invalid priority level is specified, the request is rejected.
If the assigned employee is not a project member, the request is rejected.
If the parent task is not in the same project, the request is rejected.

### Task Editing

Project leads can edit tasks within their project.
Users with project management permission can edit any task in the organization.

When editing a task, users can update:
- Title and description
- Status
- Priority
- Estimated hours
- Due date
- Assigned employee
- Parent task reference

Project leads can only edit tasks in projects where they have been assigned as project lead.
Users with project management permission can edit tasks across all projects.

If the user does not have editing permissions for the task, the request is rejected.

### Task Status Changes

Task status progresses through defined states: open, in_progress, completed, closed.

A task can transition from open to in_progress when work begins.
A task can transition from in_progress to completed when work finishes.
A task can transition to closed for administrative purposes.

Each status change is recorded in task history.
Employees can view their assigned tasks and update their status.
Project leads and users with project management permission can update status for any task.

If a user attempts to change status without permission, the request is rejected.
If the task does not exist, the request is rejected.

### Task History Recording

Every task status change is automatically recorded in task history.

Each history entry records:
- Timestamp of the change
- Previous status
- New status
- User who made the change

Task history provides an audit trail for all status modifications.
History entries cannot be modified or deleted.

Employees can view task history for tasks they are assigned to.
Users with project management permission can view history for all tasks.

If the task does not exist, the request is rejected.
If the user does not have viewing permission, the request is rejected.

### Task Browsing

Employees can browse tasks in projects where they are assigned.

Users can filter tasks by:
- Status (open, in_progress, completed, closed)
- Priority (low, medium, high, urgent)
- Assigned employee

Users can sort task results by:
- Due date
- Priority
- Creation date

Task results are paginated for efficient browsing.

If no tasks match the filter criteria, an empty list is returned.
If the user does not have viewing permission for the project, the request is rejected.

## TaskHistory Operations

Every task status change is automatically recorded in task history. Each history entry captures the timestamp of the change, the old status, the new status, and the user who made the change. Task history provides an audit trail of all status modifications. Task history entries cannot be deleted or modified. Users can view the complete history of task status changes for any task.

### Automatic Task History Recording

Whenever a task's status is changed, the system automatically records this change in the task history.

A task status change occurs when a project lead edits a task in their project, or when a user with the manage permission edits any task.

The system creates a new history entry at the moment the status change is saved. This happens without requiring any manual action from the user.

The history entry captures the exact timestamp when the change occurred, the status before the change, the new status after the change, and identifies the user who made the modification.

If a task has multiple status changes over time, each change is recorded as a separate history entry. All history entries for a task are preserved and can be viewed together.

### Task History Entry Information

Each task history entry contains the following information:

The timestamp of when the status change occurred, recorded at the moment the change was saved.

The status before the change — the previous state of the task.

The status after the change — the new state that the task was set to.

The user who made the change — the person who performed the status modification.

These four pieces of information are required for every history entry. No entry can be created without all of them.

The timestamp is always accurate and reflects the actual time when the change was saved in the system.

### Task History Audit Trail

Task history serves as an audit trail for all status modifications made to a task.

Users can view the complete history of status changes for any task to understand how and when the task's status has evolved over time.

The audit trail shows the chronological sequence of all status changes, allowing users to track the task's progression through different states.

This audit trail is preserved for the lifetime of the task and cannot be removed or altered.

### Task History Immutability

Task history entries are immutable — they cannot be deleted or modified after they are created.

Once a status change is recorded in the history, it remains permanently stored.

No user, regardless of their permissions, can alter or remove a history entry.

This immutability ensures the integrity of the audit trail and provides a reliable record of all status changes that have occurred.

### Task History Viewing

Users who have permission to view tasks can also view the complete history of status changes for that task.

The history is displayed as a chronological list, with the most recent changes appearing first or last depending on the user interface.

Each history entry in the list shows the timestamp, the status before the change, the status after the change, and the user who made the change.

There are no restrictions on viewing task history based on when the change occurred — users can see the entire history from the task's creation.

## Timelog Operations

Employees can log time entries (timelogs) with a date, duration in minutes, associated project, optional task, optional description, and billable flag. Employees can only create timelogs for themselves on projects they are assigned to. Employees can edit their own timelogs only if they are not part of an approved timesheet. Employees can delete their own timelogs only if they are not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs. Users with time view all permission can view all employees' timelogs. Employees can view their own timelogs. Timelogs can be filtered by date range, project, task, and billable status.

### Timelog Creation

Employees can create a timelog entry with a date, duration in minutes, an associated project, an optional task, an optional description, and a billable flag that defaults to true.

The timelog date must be a valid calendar date. The duration must be a positive number of minutes. The project must be one that the employee is assigned to. If a task is specified, it must belong to the selected project.

Employees can only create timelogs for themselves. When creating a timelog, the employee must select a project from the list of projects they are assigned to. The system automatically associates the timelog with the creating employee.

### Timelog Approval Lock

When a timesheet is approved, all timelogs included in that timesheet become locked and cannot be edited or deleted by anyone.

The approval lock applies even if the timesheet is later rejected and returned to draft status. The lock remains permanently for approved timesheets.

Users with time management permission can still view approved timelogs but cannot modify or remove them.

When a timesheet is submitted but not yet approved, timelogs within it can still be edited or deleted according to standard permissions.

### Timelog Editing Permissions

Employees can edit their own timelogs, but only if the timelog is not part of an approved timesheet.

Employees can modify the date, duration, task assignment, description, or billable flag of their own timelogs.

Users with time management permission can edit any employee's timelogs, except those in approved timesheets.

Timelogs in submitted timesheets that have not been approved can be edited by the owning employee or by users with time management permission.

### Timelog Deletion Permissions

Employees can delete their own timelogs, but only if the timelog is not part of any submitted or approved timesheet.

Timelogs in draft timesheets can be deleted by the owning employee.

Timelogs in submitted timesheets cannot be deleted by the owning employee or anyone else until the timesheet status changes.

Users with time management permission can delete any employee's timelogs, except those in approved timesheets.

### Timelog View Permissions

Employees can view their own timelogs without any special permission.

Users with time view all permission can view all employees' timelogs across the organization.

This permission grants read-only access to timelog details including date, duration, project, task, description, and billable status.

Users without time view all permission can only view timelogs that they own.

### Timelog Filtering and Listing

Timelogs can be filtered by date range, project, task, and billable status when viewing the timelog list.

Date range filtering allows users to specify a start date and end date to see timelogs within that period.

Project filtering allows users to view timelogs for a specific project or all projects.

Task filtering allows users to view timelogs for a specific task or all tasks.

Billable status filtering allows users to view only billable timelogs, only non-billable timelogs, or all timelogs regardless of billable status.

Multiple filters can be combined. The timelog list is paginated with a configurable number of entries per page.

## Timesheet Operations

A timesheet groups timelogs for a specific week from Monday to Sunday. Employees can create a draft timesheet for a specific week, which automatically includes all their timelogs for that period. Employees can add or remove timelogs from a draft timesheet. Employees can submit a draft timesheet for approval, but only if it has at least one timelog and no other timesheet for the same week is already submitted or approved. Users with time approve permission can view all submitted timesheets. These users can approve submitted timesheets, which locks all included timelogs from further editing or deletion. They can also reject timesheets with a required reason, which returns them to draft status for employee modification. Employees can view their own timesheets. Timesheets can be filtered by status and date range.

### Timesheet Week Definition

A timesheet represents a collection of timelogs for a specific week period that always runs from Monday to Sunday.

The week start date is always a Monday and the week end date is always the following Sunday.

Each timesheet is uniquely identified by the employee and the week start date combination.

When viewing a timesheet, the week period is displayed as a date range from Monday to Sunday.

### Timesheet Draft Creation

Employees can create a draft timesheet for any specific week by selecting the week start date (Monday).

The system checks that no draft, submitted, or approved timesheet exists for that employee and week period before allowing draft creation.

A new draft timesheet starts empty and can accept timelogs.

The draft status indicates the timesheet is not yet ready for submission.

Employees can have only one draft timesheet per week period at any time.

### Automatic Timelog Inclusion

When a draft timesheet is created, all existing timelogs for that employee within that week period are automatically included in the timesheet.

The automatic inclusion captures all timelogs created before the draft was created for that specific week period.

This ensures no timelogs are lost when creating a timesheet.

Employees can add additional timelogs or remove timelogs from the draft after the automatic inclusion.

The total hours is automatically calculated based on all included timelogs.

### Timesheet Submission Requirements

Employees can submit a draft timesheet for approval by using the submit action.

A timesheet cannot be submitted if it contains no timelogs — at least one timelog must be included.

A timesheet cannot be submitted if another timesheet for the same week period is already submitted or approved.

The system validates that only one timesheet per employee per week exists in submitted or approved status.

The submission timestamp is recorded automatically when the timesheet is submitted.

Once submitted, the timesheet cannot be edited by the employee.

### Timesheet Approval Process

Users with time approve permission can view all submitted timesheets in the organization.

These users can approve a submitted timesheet by using the approve action.

When a timesheet is approved, all timelogs included in the timesheet are locked from further editing or deletion.

The approval timestamp is recorded automatically when the timesheet is approved.

The user who approved the timesheet is recorded for audit purposes.

Approved timesheets change their status to approved and cannot be modified.

### Timesheet Rejection with Reason

Users with time approve permission can reject a submitted timesheet by using the reject action.

A rejection reason text is required when rejecting a timesheet.

The rejection reason must be provided and cannot be empty.

When a timesheet is rejected, it returns to draft status.

The rejection timestamp is recorded automatically when the timesheet is rejected.

The user who rejected the timesheet is recorded for audit purposes.

The rejected timesheet is returned to the employee for modification and resubmission.

### Approved Timesheet Lock

When a timesheet is approved, all timelogs included in the timesheet are immediately locked.

Locked timelogs cannot be edited by the employee who created them.

Locked timelogs cannot be deleted by any user except users with time manage permission.

The lock prevents any modifications to timelog date, duration, project, task, description, or billable flag.

Approved timesheet lock remains in effect unless the timesheet is deleted with proper authorization.

### Timelogs Locked Approved

Once a timelog is included in an approved timesheet, its status becomes immutable for regular employees.

Employees cannot change any field of a timelog that is part of an approved timesheet.

Users with time manage permission can edit locked timelogs if they have the appropriate authorization.

Locked timelogs are flagged in the system as belonging to an approved timesheet.

The timelog retains its approval lock even if the timesheet is later rejected.

Locked timelogs can still be viewed and reported on as part of the approved timesheet.

### Timesheet View Own

Employees can view their own timesheets at any time.

Each employee can see the status of their own timesheets: draft, submitted, approved, or rejected.

Employees can view the details of their timesheets including all timelogs included.

Employees can view the total hours calculated for each timesheet.

Employees can view the submission date and review date for their timesheets.

Employees can view who reviewed and approved or rejected their timesheets.

### Timesheet Filtering by Status

The timesheet list can be filtered by status: draft, submitted, approved, or rejected.

Users can select a single status or view all statuses in the list.

The filtering applies to the employee's own timesheets when viewing personal timesheets.

Users with time approve permission can filter all submitted timesheets by status.

The filtering supports multiple status selections for combined views.

Filtered timesheets are paginated with standard pagination controls.

### Timesheet Resubmission

A rejected timesheet can be resubmitted by the employee after modifications.

The employee can edit the rejected timesheet which is now in draft status.

The employee can add new timelogs or remove existing timelogs from the rejected timesheet.

Once modifications are complete, the employee can submit the timesheet again.

The resubmission creates a new submission timestamp while retaining the original timesheet record.

The timesheet status changes from rejected back to submitted after resubmission.

A maximum of one timesheet per week can be in submitted or approved status at any time.

### Timesheet Week Dates Calculation

The week dates for a timesheet are calculated based on the selected week start date.

The week end date is automatically calculated as the Sunday following the Monday start date.

The week period always follows a Monday through Sunday pattern regardless of the employee's location.

The calculated dates are displayed when viewing the timesheet.

The week period cannot be changed after the timesheet is created.

### Once Per Week Rule

An employee can have only one timesheet per week period in submitted or approved status at any time.

The system prevents creating a new draft if a submitted or approved timesheet exists for that week.

The system prevents submitting a timesheet if another timesheet for the same week is already submitted or approved.

This rule ensures data integrity and prevents duplicate timesheet entries.

Employees must wait for approval or rejection of an existing timesheet before creating a new one for the same week.

## Timer Operations

Employees can start a timer to track time in real-time, requiring selection of a project with an optional task. Each employee can have at most one active timer running at any given time. The timer records the start timestamp, project, optional task, and optional description. Employees can stop their timer, which creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard their timer without creating a timelog. Employees can view their currently running timer and edit its description, project, and task. If an employee forgets to stop the timer, it continues running indefinitely with no automatic stop.

### Timer Start with Project Selection

Employees can start a timer to track time in real-time for work activities.

Starting a timer requires selecting a project from the list of projects the employee is assigned to. The project selection is mandatory.

When starting a timer, the system records the start timestamp and associates it with the selected project.

The task is optional when starting a timer. If no task is selected, the timer is associated only with the project.

An employee can only start a timer if they do not already have an active timer running.

If the employee is not assigned to the selected project, the request to start the timer is rejected.

### Single Active Timer Limit

Each employee can have at most one active timer running at any given time.

If an employee attempts to start a new timer while one is already running, the request is rejected.

The system allows the employee to stop the existing timer first before starting a new one.

This limitation ensures accurate time tracking without overlapping timer entries.

### Timer Start Timestamp

When a timer is started, the system records the exact start timestamp.

The start timestamp is captured at the moment the timer is activated.

The start timestamp is used to calculate the duration when the timer is stopped.

The start timestamp is visible to the employee in the timer view.

The start timestamp is immutable once recorded.

### Timer Stop Creates Timelog

When an employee stops their timer, the system creates a timelog entry.

The timelog is automatically associated with the employee who started the timer.

The timelog includes the project and task from the running timer.

The timelog is created with the description provided during timer start.

The timelog's date is set to the date when the timer is stopped.

Creating the timelog from timer stop is automatic and does not require manual entry.

### Timer Duration Calculation

The system calculates the duration by measuring the time elapsed between timer start and timer stop.

The calculated duration is rounded to the nearest minute.

Rounding is performed after the full calculation is complete.

The duration is recorded in minutes in the created timelog.

The duration calculation includes the full elapsed time up to the stop moment.

### Timer Discard Option

Employees can choose to discard their running timer without creating a timelog.

Discarding the timer permanently removes it without creating any time record.

Discarding is an irreversible action.

Discarding can be selected when the employee wants to stop tracking time for the current activity.

Discarding does not create any historical record of the timer activity.

### Timer Editing While Running

Employees can edit certain fields of a running timer.

Employees can edit the description of the running timer.

Employees can change the project associated with the running timer.

Employees can change the task associated with the running timer.

Project and task changes are only allowed if the employee is assigned to the new project.

The start timestamp cannot be modified.

Changes to project or task do not recalculate the elapsed duration.

### Viewing Current Timer

Employees can view their currently running timer.

The timer view displays the current elapsed time from the start timestamp.

The timer view shows the associated project and task.

The timer view displays the current description.

The timer view shows options to stop or discard the timer.

### No Automatic Timer Stop

If an employee forgets to stop their timer, it continues running indefinitely.

The system does not automatically stop any timer.

No maximum duration limits are enforced on running timers.

Employees are responsible for stopping their timers manually.

The running timer will continue to accumulate elapsed time until explicitly stopped or discarded by the employee.

## ActivityLog Operations

The system automatically records significant actions as activity log entries, including employee invitations, deactivations, reactivations, contract creation or editing, project creation, archiving, completion, or deletion, task status changes, timesheet submissions, approvals or rejections, and role assignments or changes. Each activity log entry includes the timestamp, the user who performed the action, the action type, the target entity, and details. Users with organization management permission can view the full activity log. The activity log can be paginated and filtered by action type, user, and date range.

### Automatic Activity Recording

The system automatically records significant business actions as activity log entries.

Each activity log entry captures the exact moment an action occurred, the user who performed it, the type of action, the entity that was affected, and relevant details about the change.

The system records the following actions automatically:
- Employee lifecycle events: invitations sent, activations, and deactivations
- Contract lifecycle events: creation, editing of active contracts
- Project lifecycle events: creation, archiving, completion, and deletion
- Task status changes: any transition between open, in-progress, completed, and closed statuses
- Timesheet lifecycle events: submission, approval, and rejection
- Role management events: assignment and changes to employee roles

Automatic recording ensures that all significant organizational changes are tracked for audit and compliance purposes. Users cannot manually create or delete activity log entries.

### Employee Action Logging

The system logs all employee lifecycle actions performed by users with employee management permissions.

Logged employee actions include:
- New employee invitation sent via email
- Employee account activated
- Employee account deactivated
- Employee information updated (department, position, employment type)

When an employee is invited, the system records the invitation sender, the invited email address, and the timestamp. When an invitation is accepted and the user is added to the organization, this is recorded separately.

Deactivating an employee triggers logging of the deactivation action, including which user performed it and when. Reactivating a previously deactivated employee also generates an activity log entry.

Employees without employee management permissions cannot trigger employee action logging. They can only view the activity log if they have organization management permissions.

### Contract Action Logging

The system logs all contract creation and editing actions for employees.

Contract actions that generate activity log entries:
- New contract created for an employee
- Active contract edited by a user with employee management permissions

Contract creation logging includes the employee affected, the contract start date, and the user who created it. The system records that creating a new contract automatically ended the previous active contract.

Editing a contract is only logged when the current active contract is modified. Past contracts cannot be edited and therefore do not generate activity log entries when viewed or accessed.

Only users with employee management permissions can create or edit contracts, and only these users trigger contract action logging. Employees can view their own contracts without generating log entries.

### Project Action Logging

The system logs all project lifecycle actions performed by users with project management permissions.

Logged project actions include:
- New project created
- Project information edited
- Project archived
- Project marked as completed
- Project deleted

Project creation logging captures the project name, creator, creation timestamp, and project status (active). Project editing logs record what changes were made to the project.

Archiving or completing a project logs the transition from active status, including the user who performed the action and the timestamp. This is important for understanding why a project stopped accepting new timelogs.

Project deletion is logged only when the project has no associated timelogs. The log entry includes the project name, deleting user, and deletion timestamp.

### Task Status Change Logging

The system automatically logs every task status change with complete audit trail information.

Every time a task status changes, the system records:
- The task affected
- The old status value
- The new status value
- The exact timestamp of the change
- The user who made the change

Status transitions that are logged:
- Open to in-progress
- In-progress to completed
- Completed to closed
- Any other status change

Both project leads and users with project management permissions can change task statuses. Both actions generate activity log entries with full attribution.

Employees viewing tasks without changing their status do not generate log entries. Only actual status transitions are recorded.

### Timesheet Action Logging

The system logs all timesheet lifecycle actions that affect organizational time tracking.

Logged timesheet actions include:
- Timesheet submitted for approval
- Timesheet approved by an authorized user
- Timesheet rejected with a reason

Timesheet submission logging captures the employee owner, the week covered, the submission timestamp, and the user who submitted it.

Approval logging records the approving user, the approval timestamp, the total hours approved, and notes that this action locks all included timelogs from further editing.

Rejection logging captures the rejecting user, rejection timestamp, and the reason text provided. The log indicates that the timesheet returned to draft status and is available for resubmission.

### Role Action Logging

The system logs all role assignment and change actions within an organization.

Logged role actions include:
- New role assigned to an employee
- Existing role changed for an employee
- Custom role created by an organization owner
- Custom role edited by an organization owner
- Custom role deleted by an organization owner

Role assignment logging captures the employee affected, the previous role (if any), the new role, and the user who made the assignment. This is typically performed by users with employee management permissions.

Custom role management actions (create, edit, delete) are logged separately and include the role name, action type, and the organization owner who performed the action.

Built-in roles (Owner, Manager, Employee) cannot be deleted or recreated, so no activity log is generated for these standard roles.

### Activity Log Viewing Permissions

Only users with organization management permission can view the complete activity log.

Activity log viewing requires the org:manage permission. Users without this permission cannot see the activity log, regardless of their other permissions.

Organization owners automatically have viewing access to the activity log. Managers and employees must be explicitly granted the organization management permission to view activity logs.

Viewing the activity log is a read-only operation. Users cannot modify, delete, or create activity log entries, regardless of their role.

### Activity Log Filtering

The system provides filtering capabilities for the activity log to help users find specific actions.

Activity log filtering options:
- Filter by action type: view only employee actions, only project actions, only task changes, only timesheet events, or only role changes
- Filter by user: view actions performed by a specific user
- Filter by date range: view actions within a specified time period

Multiple filters can be combined. For example, users can view all project deletion actions performed by a specific user within a specific month.

Filtering does not restrict access. A user with organization management permission can still only view actions they have permission to see based on their role and the entity type.

### Activity Log Pagination

The activity log is paginated to improve performance and usability when viewing large amounts of historical data.

Activity log pagination works as follows:
- Each page displays a fixed number of entries
- Users can navigate between pages using pagination controls
- The total number of pages is calculated based on the current filter criteria

Pagination is applied after filtering is performed. This ensures that the page count reflects the filtered results, not the entire log.

Users can view activity logs from any time period, regardless of how many entries exist. The system handles large volumes of historical data transparently through pagination.

### Action Timestamp Recording

Every activity log entry includes an exact timestamp when the action occurred.

Timestamps are recorded with second-level precision and represent the actual moment the system processed the action.

All timestamps are stored in the system's standard format and can be displayed in the organization's configured timezone.

The timestamp is immutable once recorded. It cannot be changed or edited after the entry is created.

### Action User Tracking

Every activity log entry records the exact user who performed the action.

User tracking includes:
- The user's display name
- The user's email address (for audit purposes)
- The user's ID (for internal reference)

When an action is performed, the system captures the authenticated user's identity at that moment. This provides complete attribution for all organizational changes.

If an action is performed on behalf of another user (such as an organization owner performing actions for an employee), the action is logged under the owner's identity, not the employee's.

### Action Type Categorization

The system categorizes activity log entries by action type for organized viewing and filtering.

Action types include:
- Employee: employee invitations, activations, deactivations, and information updates
- Contract: new contracts created or existing contracts edited
- Project: project creation, editing, archiving, completion, and deletion
- Task: task status changes and updates
- Timesheet: submission, approval, and rejection actions
- Role: role assignments, custom role creation, editing, and deletion

Each action type is a distinct category that can be filtered independently in the activity log view.

Action type categorization enables users to quickly find specific types of changes without reviewing all activity log entries.

### Action Target Entity

Every activity log entry identifies the specific entity that was affected by the action.

Target entity tracking includes:
- Entity type: employee, contract, project, task, timesheet, or role
- Entity identifier: unique reference to the specific entity
- Entity name: human-readable name for display
- Relevant details: additional context about the entity state

For example, a task status change log entry would record the task title, task ID, and the project the task belongs to. A timesheet approval entry would record the week start date, employee name, and total hours approved.

This level of detail ensures that anyone reviewing the activity log can understand exactly which entity was affected without needing to navigate to the entity itself.

## Permission Operations

The system has a defined set of permissions including organization management, employee management and viewing, project management and viewing, time management and approval, time view all, and report viewing. Each permission has a unique code and description. Permissions are assigned to custom roles when roles are created or edited by organization owners. Built-in roles have predefined permission sets that cannot be modified. Permissions control what actions users can perform within their organization.

### Permission Code and Description

The system defines permissions with unique codes and descriptions that specify the business action they control.

The organization management permission (code: org:manage) allows editing organization settings.

The employee management permission (code: employee:manage) allows adding, editing, and deactivating employees.

The employee viewing permission (code: employee:view) allows viewing the employee list and details.

The project management permission (code: project:manage) allows creating, editing, and deleting projects and tasks.

The project viewing permission (code: project:view) allows viewing projects and tasks.

The time management permission (code: time:manage) allows editing or deleting any employee's time logs.

The time approval permission (code: time:approve) allows approving or rejecting timesheets.

The time viewing permission (code: time:view_all) allows viewing all employees' time logs and timesheets.

The report viewing permission (code: report:view) allows viewing organization reports.

### Permission Role Assignment

Permission role assignment occurs when organization owners assign permissions to custom roles or when roles are assigned to employees.

When a custom role is created, organization owners must define a set of permissions that the role includes.

The assigned permissions define what actions the role can perform within the organization.

When an employee is assigned a role, they inherit all permissions associated with that role.

Permission assignments are enforced on all system operations.

Users can only perform actions for which they have the required permission in their assigned role.

### Custom Roles with Permissions

Organization owners can create custom roles to meet specific organizational needs.

Each custom role has a name and a defined set of permissions.

Organization owners define which permissions are included in each custom role.

Custom roles can include any combination of the available permissions.

Organization owners can edit custom roles to add or remove permissions.

Custom roles are deleted only when no employees are assigned to them.

### Built-in Role Permission Sets

The system has three built-in roles with predefined permission sets that cannot be modified.

The owner role has full access to all features and all permissions.

The owner role can manage roles and members within the organization.

The manager role has permissions to manage employees, projects, approve timesheets, and view reports.

The manager role includes employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing permissions.

The employee role has limited permissions for time tracking and viewing own data.

The employee role includes project viewing, time viewing, and employee viewing permissions.

### Organization Management Permission Operations

Users with organization management permission can view and edit organization settings.

This includes updating the organization name, description, logo, currency, timezone, and fiscal start month.

Only organization owners can create and delete organizations.

Organization owners can delete their organization when all pending timesheets are resolved.

Organization owners can delete their organization when there are no active employee contracts.

### Employee Management Permission Operations

Users with employee management permission can invite new employees to the organization by email.

If the invited email already has an account, the user is added to the organization.

If the invited email has no account, a pending invitation is created.

Users with employee management permission can edit employee records including department, position, and employment type.

Users with employee management permission can deactivate employees.

Deactivated employees cannot log time or submit timesheets.

Users with employee management permission can reactivate deactivated employees.

### Project Management Permission Operations

Users with project management permission can create new projects with a name, description, color code, and optional budget hours.

Users with project management permission can edit existing projects.

Users with project management permission can archive or complete projects.

Archived or completed projects cannot receive new time logs.

Users with project management permission can delete projects that have no time logs.

Project leads can manage tasks within their assigned projects.

### Time Management Permission Operations

Users with time management permission can edit any employee's time logs.

Users with time management permission can delete any employee's time logs.

Users with time management permission cannot edit or delete time logs that are part of approved timesheets.

Users with time management permission cannot edit time logs that are part of submitted timesheets.

Time management operations require that the time log belongs to a valid project the employee is assigned to.

### Time Approval Permission Operations

Users with time approval permission can view all submitted timesheets.

Users with time approval permission can approve submitted timesheets.

Approved timesheets lock all included time logs preventing edits or deletions.

Users with time approval permission can reject submitted timesheets with a reason.

Rejected timesheets return to draft status for the employee to modify.

Employees can resubmit rejected timesheets after making corrections.

### Report View Permission Operations

Users with report viewing permission can access organization reports.

Users can view the time report showing total hours logged per employee with breakdown by billable and non-billable hours.

Users can view the project budget report showing budget hours versus actual hours logged.

Users can view the weekly summary report showing week-by-week summaries of total hours and time log counts.

Reports can be filtered by date range, employee, project, and billable status.

### Permission-Based Access Control

All system operations enforce permission-based access control.

The system checks the user's role permissions before allowing any action.

Users cannot perform operations for which they do not have the required permission.

Access violations are prevented without exposing technical details.

Each action is evaluated against the user's assigned role permissions.

Permission checks are enforced consistently across all business operations.

## Dashboard Operations

Each employee has a personal dashboard showing hours logged today and this week, active timer status, recent timelogs, pending timesheet status for the current week, and tasks assigned to them with in-progress or open status. Users with report view permission see an organization dashboard displaying total active employees, total hours logged this week across all employees, pending timesheets awaiting approval, projects with budget utilization over 80%, and the top five employees by hours logged this week. Dashboards provide quick overview metrics relevant to each user's role and responsibilities.

### Personal Dashboard Access

Each employee can access their personal dashboard from the application interface. The dashboard provides quick visibility into their current work status and recent activity. Access to the personal dashboard is available to all employees upon logging in with their organization context selected. The personal dashboard displays real-time metrics that are relevant to the individual employee's daily workflow and responsibilities.

### Hours Logged Today Display

The personal dashboard shows the total hours logged by the employee on the current day. This value represents the sum of all timelogs with a date equal to today's date. The hours are displayed as a numeric value with appropriate unit indication (hours). Employees can reference this metric to understand their daily productivity and track their time entry activity for the day.

### Hours Logged This Week Display

The personal dashboard shows the total hours logged by the employee for the current week. The week is calculated from Monday to Sunday, matching the timesheet week definition. This value represents the sum of all timelogs with dates falling within the current week's date range. Employees can use this metric to monitor their weekly time accumulation and ensure they are meeting their expected working hours.

### Active Timer Status Display

The personal dashboard displays the current status of the employee's active timer, if one exists. The timer status shows whether an in-progress timer is running and provides key information about the active time tracking session. When a timer is active, the display includes the project and task associated with the running timer, along with the elapsed time since the timer was started. If no timer is currently active, the dashboard indicates that the employee is not tracking time at this moment.

### Recent Timelogs Display

The personal dashboard displays the last five timelogs created by the employee. Each timelog entry shows the date, duration, associated project, and a brief description of the work performed. The timelogs are ordered by creation date in descending order, with the most recent entry appearing first. This feature allows employees to quickly review their most recent time entries and verify that their data has been recorded correctly.

### Pending Timesheet Status Display

The personal dashboard shows the status of the employee's pending timesheet for the current week. This status indicates whether a timesheet has been submitted for approval, is currently in draft status, or if there is no timesheet yet created for the current week. If a timesheet exists, the dashboard displays its current state (draft, submitted, approved, or rejected) along with any rejection reason if applicable. This allows employees to track their timesheet submission progress and take action if needed.

### Assigned Tasks Viewing

The personal dashboard displays tasks that are assigned to the employee and have a status of in_progress or open. Each task entry shows the task title, current status, and the project to which the task belongs. This feature helps employees prioritize their work by providing visibility into tasks that require their attention and are currently active or awaiting their action. Employees can use this information to focus on their most urgent responsibilities.

### Organization Dashboard Access

Users with the report view permission can access the organization dashboard, which provides a high-level view of organization-wide metrics and activities. The organization dashboard is intended for managers and users with appropriate permissions to monitor overall team performance and organizational health. Access to the organization dashboard requires the user to have report view permission assigned in their role within the organization.

### Total Active Employees Display

The organization dashboard displays the total count of active employees in the organization. This count includes only employees with an active status and excludes deactivated employees from the count. The value represents all employees currently employed by the organization and available to perform work. This metric provides organization leaders with an immediate understanding of their current workforce size and active capacity.

### Total Hours Organization Display

The organization dashboard displays the total hours logged this week across all employees in the organization. This value is calculated as the sum of all timelogs created by any employee within the current week's date range (Monday to Sunday). The metric provides management with visibility into overall organizational time investment and workload distribution. This helps track total time contribution across the entire organization.

### Pending Timesheets Count Display

The organization dashboard shows the number of timesheets currently pending approval from employees. This count includes all submitted timesheets that have not yet been reviewed by users with approve permission. The metric helps managers prioritize their approval workflow and understand their current workload in terms of timesheets requiring review. Users with approve permission can use this information to manage their approval queue effectively.

### Budget Utilization Monitoring

The organization dashboard displays projects that have budget utilization exceeding 80 percent of their allocated budget hours. For each project, the display shows the project name, budget hours, actual hours logged, and the percentage of budget consumed. Projects are included in this view only when they have budget hours defined. This feature helps identify projects approaching or exceeding their time budget, enabling proactive budget management and resource allocation decisions.

### Top Employees Ranking Display

The organization dashboard displays the top five employees ranked by total hours logged during the current week. This ranking shows employee names (or identifiers) along with their respective hours logged for the week. The top five metric highlights the highest contributors in terms of time logged within the organization for that week. This information can be used to recognize employee productivity and identify workload patterns across the organization.

### Dashboard Metrics Display Requirements

All dashboard metrics must be displayed in a clear, readable format with appropriate units and labels. Personal dashboard metrics must update in real-time or near real-time as new timelogs and timer activities occur. Organization dashboard metrics must reflect the current state of all organization data accessible to the user. Dashboard values must be calculated accurately from the underlying timelog, timesheet, and employee data to ensure reliable reporting.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## Organization Error Scenarios

Organization owners can delete their organization only if all pending timesheets are resolved and there are no active employee contracts. When deletion conditions are not met, the system prevents deletion and displays which constraints are blocking the operation. If an owner attempts to delete with pending timesheets, they receive a list of unresolved timesheets. If active contracts exist, the owner must terminate contracts before deletion. Organization creation requires a valid name, description, logo image, currency, timezone, and fiscal start month. Duplicate organization names within a tenant context are rejected. Currency must be a valid ISO currency code supported by the system. Timezone must match one of the supported timezone identifiers. The system prevents organization deletion during active billing cycles to protect historical financial data.

### Organization Deletion Constraints

Organization owners can delete their organization only when all blocking conditions are resolved.

Two primary blocking conditions exist:
- All pending timesheets must be resolved (approved or rejected) — no timesheets can be in draft or submitted status
- There must be no active employee contracts — all employee contracts must have an end date

When blocking conditions exist, the system prevents deletion and displays which conditions are blocking the operation. Owners cannot force deletion while blocking conditions remain.

### Pending Timesheets Resolution

Before an organization can be deleted, all timesheets in the organization must be resolved.

Timesheet statuses that prevent deletion:
- Draft — timesheets that have been created but not submitted
- Submitted — timesheets waiting for approval review

Timesheet statuses that allow deletion:
- Approved — timesheets that have been approved
- Rejected — timesheets that have been rejected with a reason

When an owner attempts to delete with pending timesheets, they receive a list showing which timesheets are unresolved. Each entry displays the employee name, week start date, and current status.

### Active Contract Prevention

Organization deletion is blocked while any employee has an active contract.

An active contract is defined as a contract where:
- The start date is on or before the current date
- The end date is null (ongoing) or in the future

The system calculates which contracts are active at deletion time. Active contracts are counted for each employee in the organization. Deletion proceeds only when the count of active contracts equals zero.

If active contracts exist, the owner must first terminate all contracts by setting end dates before deletion can proceed.

### Owner Deletion Rights

Organization deletion rights are exclusive to the organization owner.

No other user role can initiate organization deletion:
- Managers cannot delete the organization even with full management permissions
- Employees cannot delete the organization regardless of contract length or data volume
- Custom role assignments cannot grant deletion authority

Only the user who owns the organization has the deletion right. This right cannot be transferred or delegated to other users.

### Organization Creation Requirements

Creating a new organization requires the following information:
- Name (required) — must be unique within the system
- Description (required) — brief summary of the organization's purpose
- Logo image (required) — visual identifier for the organization
- Currency (required) — primary currency for financial operations
- Timezone (required) — for displaying dates and times correctly
- Fiscal start month (required) — which month the fiscal year begins

All fields must be provided during organization creation. Missing required fields cause the creation to be rejected with specific error messages indicating which fields are incomplete.

### Duplicate Organization Validation

During organization creation, the system validates that the organization name is unique.

Uniqueness is enforced across all organizations in the system. No two organizations can have the same name.

If an organization with the same name already exists, the creation is rejected. The error message indicates that an organization with this name already exists and suggests using a different name.

This validation prevents naming confusion and ensures each organization can be uniquely identified.

### Currency Code Validation

The currency field accepts only valid ISO currency codes.

Supported currency codes are three-letter codes such as:
- USD for United States Dollar
- EUR for Euro
- KRW for South Korean Won

The system validates that the provided currency code matches an ISO standard format. Invalid codes (such as two-letter codes or non-standard abbreviations) are rejected.

When validation fails, the error message lists the format requirement and provides examples of valid codes.

### Timezone Identifier Validation

The timezone field accepts only valid timezone identifiers from the IANA Time Zone Database.

Valid identifiers follow the format 'Area/Location' such as:
- America/New_York
- Europe/London
- Asia/Seoul
- Asia/Tokyo

The system validates that the provided timezone identifier exists in the supported list. Custom or invalid timezone names are rejected.

When validation fails, the error message indicates that the timezone identifier is not recognized and provides examples of valid formats.

### Fiscal Month Configuration

The fiscal start month specifies which month the organization's fiscal year begins.

Valid values are the twelve months of the year:
- January, February, March, April, May, June
- July, August, September, October, November, December

The fiscal start month affects how financial reporting periods are calculated throughout the year. Once set during organization creation, this value can be edited by organization owners.

The fiscal month must be a valid calendar month. Invalid selections are rejected with an explanation of acceptable values.

### Billing Cycle Protection

The system prevents organization deletion during active billing cycles to protect historical financial data.

An active billing cycle is detected when:
- The organization has submitted timesheets from the current billing period
- Financial reports are being generated for the current fiscal period
- Pending invoices exist for the current billing cycle

When active billing cycles exist, deletion is blocked and the owner is shown which financial processes are preventing deletion. The owner must complete or cancel these processes before deletion can proceed.

### Organization Data Isolation

All organization data is strictly isolated from other organizations.

Employees in one organization cannot view, access, or interact with data from another organization. This includes:
- Employee records and personal information
- Projects and tasks
- Timesheets and timelogs
- Contracts and departments

Users who belong to multiple organizations only see data for their currently selected organization context. The system enforces organization boundaries on every operation.

When users switch organizations, their view changes completely to show only data from the newly selected organization.

### Deletion Confirmation Workflow

Before deleting an organization, owners must confirm deletion through a multi-step workflow.

The workflow consists of:

1. Initiate deletion — owner clicks delete organization option
2. Review blocking conditions — system shows any blocking conditions that must be resolved
3. Confirm intent — owner must type the organization name to confirm
4. Final confirmation — owner clicks a dedicated confirm deletion button

This multi-step process prevents accidental deletion. Owners cannot skip any step. The organization name must be typed exactly as displayed to enable the final confirmation button.

### Blocking Condition Display

When blocking conditions prevent organization deletion, the system displays detailed information about what is blocking the operation.

The display includes:
- Number of pending timesheets and links to view each one
- Number of active contracts and which employees hold them
- Specific actions required to resolve each condition

Owners can click on each blocking item to see more details. For pending timesheets, the display shows the employee name and timesheet week. For active contracts, the display shows the employee name and contract start date.

Deletion proceeds only when all blocking conditions are resolved and the count for each condition type reaches zero.

### Organization Setting Edit Rights

Organization settings can only be edited by organization owners.

Editable settings include:
- Name
- Description
- Logo image
- Currency
- Timezone
- Fiscal start month

Users with manager or employee roles cannot modify organization settings. They can view current settings but cannot make changes.

When a non-owner attempts to edit organization settings, the request is rejected with an access denied message. The system logs the attempt in the activity log for audit purposes.

## User Error Scenarios

Users can delete their account only after transferring ownership or deleting any organization where they are the sole owner. When account deletion is blocked by ownership, the system displays organizations requiring ownership transfer. If a user attempts to delete their account while still assigned as sole owner, the system rejects the request with clear instructions. Email addresses must be unique across the entire platform during registration. Passwords must meet minimum complexity requirements before account creation. Users can switch organizations without logging out, but if the selected organization no longer exists, the system defaults to the last used organization. Users without any organization assignment see an onboarding screen prompting organization selection or creation. Invalid login credentials are rejected with generic error messaging to prevent enumeration attacks. Account password changes require confirmation with the current password for security.

### Account Deletion Ownership Constraints

Users can delete their account only after transferring ownership of any organization where they are the sole owner. If a user owns an organization, the system blocks account deletion and displays a list of organizations requiring ownership transfer. The user must either transfer ownership to another employee or delete the organization before proceeding with account deletion. If ownership transfer is initiated, the system validates that the receiving user exists and has an active account. If the transfer fails, the user remains as owner and account deletion remains blocked.

### Sole Owner Transfer Requirement

When a user is the sole owner of an organization, they cannot delete their account without first transferring ownership. The transfer process requires selecting a receiving user who is already an employee of the organization. The receiving user must accept the ownership transfer before it takes effect. Once transferred, the original owner becomes a regular employee and can proceed with account deletion. The system prevents transfer to users who are deactivated or have no assigned role.

### Organization Deletion Before Account Delete

If a user chooses to delete an organization rather than transfer ownership, the organization must meet deletion criteria before account deletion can proceed. All pending timesheets must be resolved through approval or rejection. There must be no active employee contracts associated with the organization. When these conditions are met, the organization can be deleted, which permanently removes all employees, projects, tasks, timelogs, and timesheets. The owner's account remains but is no longer associated with any organization, allowing account deletion to proceed.

### Email Uniqueness Validation

During user registration, the system validates that the email address is unique across the entire platform. If the email is already registered, the system rejects the registration and displays an error indicating the email is in use. Existing users attempting to change their email address also undergo this uniqueness validation. The validation occurs before account creation to prevent duplicate accounts. Email addresses are case-insensitive for uniqueness checks.

### Password Complexity Requirements

Passwords must meet minimum complexity requirements before account creation or password changes are accepted. The system validates password strength during registration and password update operations. If the password does not meet complexity requirements, the system rejects the request and displays the specific requirements. Password requirements include minimum length, inclusion of uppercase letters, inclusion of lowercase letters, inclusion of numbers, and inclusion of special characters.

### Organization Context Switching

Users who belong to multiple organizations can switch between organizations without logging out. When switching organizations, all subsequent actions are scoped to the newly selected organization. The system validates that the user has appropriate permissions in the target organization. If the user does not have any active organization context, the system prompts them to select an organization before proceeding with operations.

### Default Organization Fallback

If a user attempts to access the system but their selected organization no longer exists or is deleted, the system applies a default organization fallback. The system attempts to default to the last used organization that is still accessible. If no previous organization exists, the system shows an onboarding screen prompting the user to select or create a new organization. The fallback mechanism ensures users can always access a valid organizational context.

### Onboarding Organization Selection

Users without any organization assignment see an onboarding screen that guides them to select or create an organization. The onboarding process presents a list of organizations the user has been invited to or created. Users can choose to join an existing organization or create a new one. The system validates organization creation requirements including required fields like organization name and currency selection. Once an organization is selected or created, the user gains access to the platform.

### Invalid Login Rejection

When users attempt to log in with invalid credentials, the system rejects the login and displays a generic error message. The generic messaging prevents information leakage about whether the email exists in the system or the password is incorrect. The system does not distinguish between invalid email and invalid password errors to protect against enumeration attacks. Multiple failed login attempts are handled according to security policies.

### Password Change Confirmation

Users changing their password must confirm their current password before the new password is accepted. The system validates the current password before allowing any password update. If the current password is incorrect, the password change is rejected with a clear error message. This confirmation step ensures that only authorized users can modify their account credentials. The new password must also meet all complexity requirements.

### Account Association Display

The system displays all organizations associated with a user's account when they attempt to manage their organizations. Users can see which organizations they own, which they have been invited to, and which they have joined. The display includes the organization name, the user's role in each organization, and their membership status. Users can switch between organizations from this association view. Organizations where the user is the sole owner are marked distinctly.

### Organization Existence Validation

When users attempt to access or manage organizations, the system validates that the organization exists and is active. If an organization does not exist, the system rejects the request with an appropriate error message. Deactivated or deleted organizations are not accessible for normal operations. The validation occurs on every request that involves an organization context to ensure data integrity. Users cannot view or modify data from organizations that do not exist or are no longer active.

### Login Credential Protection

The system implements protection mechanisms for login credentials to prevent unauthorized access. Passwords are never displayed in plain text anywhere in the interface. Password fields mask input to prevent shoulder-surfing attacks. The system does not store or transmit passwords without proper encryption. Failed login attempts are logged for security monitoring but do not reveal whether the email exists in the system.

### Account Deletion Workflow

The account deletion workflow is a multi-step process that ensures data integrity and user consent. Users must first review and address any organization ownership requirements. The system displays a confirmation screen showing all consequences of account deletion. Users must explicitly confirm the deletion action before it is processed. Once confirmed, the system processes account deletion according to the ownership status. If the user was an owner, the system checks organization deletion requirements before allowing account deletion to complete.

## Role Error Scenarios

Built-in roles (Owner, Manager, Employee) cannot be deleted under any circumstances. Organization owners cannot delete custom roles assigned to any employee. When attempting to delete a role with assigned employees, the system displays the count of employees still using that role. Custom roles must have a unique name within the organization context. Each custom role requires at least one permission assigned during creation. Role names cannot be changed if they are currently assigned to active employees. The system prevents permission conflicts where a role has no active permissions. Role hierarchy cannot create circular references since each role is a flat permission set. Removing all permissions from a custom role is allowed but the role becomes functionally inert. System prevents deletion of the only role with manager-level permissions in an organization.

### Built-In Role Protection

The system protects three built-in roles from deletion under all circumstances: Owner, Manager, and Employee. Organization owners attempting to delete any built-in role will see a message indicating that built-in roles are permanent system components and cannot be removed.

Built-in roles cannot be deleted even when no employees are assigned to them. The system maintains these three roles as foundational elements of the organization's permission structure, ensuring that every organization always has at least these three role types available.

Built-in role names cannot be changed. Organization owners attempting to rename Owner, Manager, or Employee will receive a message that built-in role names are fixed and cannot be modified. This ensures consistent identification of these core role types across the system.

Built-in roles cannot have all permissions removed. The system prevents removing the last remaining permission from any built-in role, ensuring each retains at least one functional capability. This maintains the basic utility of Owner, Manager, and Employee roles even when permissions are otherwise customized.

### Custom Role Deletion Constraints

Organization owners can delete custom roles only after ensuring no employees are currently assigned to that role. Before deletion can proceed, the system displays a summary showing all employees currently holding that custom role, including their names and the date they were assigned.

When an organization owner attempts to delete a custom role that has assigned employees, the system blocks the deletion and displays an error message showing the count of employees still using that role. The error message includes a link to the role assignment management page where the owner can reassign employees before attempting deletion again.

Once a custom role is successfully deleted, the system automatically reassigns all employees who were assigned to that role to the default Employee role. This reassignment is logged in the activity log, recording the timestamp, the owner who performed the deletion, and the count of employees affected.

### Assigned Employee Blocking

The system validates for assigned employees before allowing any role modification that would impact current assignments. When an organization owner attempts to delete a custom role, the system first checks if any employees are currently assigned to that role.

If employees exist with that role assignment, the system prevents the deletion and displays a message listing each affected employee by name. The system also shows the role assignment date for each employee to help the owner understand the assignment history.

The system requires all employees to be reassigned to different roles before a custom role can be deleted. This ensures no employees lose their role assignment during the deletion process and maintains clear role attribution for each employee.

### Role Name Uniqueness

Organization owners must create custom roles with unique names within the organization context. The system validates that no two custom roles share the same name before allowing role creation. If a duplicate name is detected, the system displays an error message indicating the name is already in use and suggests using a different name.

When renaming an existing custom role, the system performs the same uniqueness validation against all other custom roles in the organization. If the new name conflicts with an existing role, the rename operation is rejected with an error message showing which role name already exists.

The system performs case-insensitive name matching, meaning "Manager" and "manager" are considered duplicates. Organization owners must ensure their custom role names are unique regardless of case variation.

### Role Name Edit Restrictions

Organization owners cannot rename a custom role if any employees are currently assigned to that role. The system checks for active role assignments before allowing the name change. If employees are found assigned to the role, the system displays an error message listing the affected employees and explaining that the role name must remain unchanged until all employees are reassigned.

The system requires the owner to reassign all employees to different roles before the custom role name can be modified. This restriction prevents confusion about which role each employee currently holds when names are changed.

Once all employees have been reassigned from the role, the system allows the custom role name to be edited. The new name must still pass the uniqueness validation and cannot conflict with any other custom role's name in the organization.

### Permission Assignment Requirement

When creating a new custom role, organization owners must assign at least one permission to the role. The system validates that the permission list is not empty before allowing role creation. If no permissions are selected during creation, the system displays an error message explaining that custom roles must have at least one permission to be functional.

The system provides a list of available permissions with brief descriptions to help owners select appropriate permissions during role creation. The permission list includes all standard permissions defined for the organization, and owners must select at least one before the role can be saved.

Organization owners can review the permission list before finalizing role creation to ensure the role will have the intended capabilities for employees who are assigned to it.

### Role Hierarchy Flat Structure

The system maintains a flat permission structure for roles, meaning each role is independent with no parent-child relationships. Organization owners cannot create circular references where a role depends on another role in a way that creates a cycle.

Since roles do not inherit permissions from other roles, each custom role maintains its own complete, self-contained permission set. When a custom role is created, the system treats it as a standalone permission collection that does not reference or depend on any other role.

This flat structure simplifies role management and ensures that role permissions are always clear and predictable, without complex inheritance chains or dependency validations.

### Inert Role Prevention

The system allows custom roles to have all permissions removed, but the role becomes functionally inert when empty. Organization owners can remove all permissions from a custom role, and the system permits this change.

However, when a custom role has no permissions assigned, it cannot grant any capabilities to employees. Employees assigned to an empty role effectively have no functional permissions within the organization, which may be intentional for deactivation purposes or may indicate an administrative error.

The system does not prevent empty custom roles from existing, but recommends caution when removing all permissions as this may cause confusion about employee capabilities.

### Manager Permission Minimum

The system ensures that each organization maintains at least one role with Manager-level capabilities available. When an organization owner attempts to remove all Manager-level permissions from the Manager built-in role, the system checks whether any other role in the organization has Manager-level permissions.

If no other role has Manager-level permissions, the system blocks the change and displays a warning that the organization requires at least one role with Manager capabilities. The Owner built-in role always retains its full permissions regardless of changes to Manager or Employee roles.

The system allows removal of Manager-level permissions from custom roles as long as at least one role with Manager capabilities remains in the organization, whether it is the built-in Manager role or a custom role.

### Role Assignment Display

Organization owners viewing the role management interface see a complete list of all roles with their assigned permissions displayed clearly. Each role shows its name, type (built-in or custom), permission count, and the number of employees currently assigned to it.

When selecting a specific role, the system displays a detailed view showing all permissions assigned to that role. The interface also shows a list of all employees currently assigned to that role, with their names and assignment dates visible.

The system provides visual indicators for roles that have been recently modified, showing when changes were made and by which owner. This helps owners track recent changes to the permission structure.

### Role Deletion Confirmation

When an organization owner attempts to delete a custom role, the system requires explicit confirmation before proceeding. The confirmation dialog displays the role name, the number of employees currently assigned to it, and what will happen to those employees if the deletion proceeds.

The confirmation dialog clearly states that employees assigned to the role will be reassigned to the default Employee role. This ensures the owner understands the impact of the deletion before confirming.

After successful deletion, the system displays a confirmation message showing the role name that was deleted and the count of employees who were reassigned. This provides clear feedback that the action completed successfully.

### Organization Role Management

Organization owners have exclusive authority to create, edit, and delete custom roles within their organization. Other users cannot modify custom roles or built-in roles. The system enforces this restriction by showing role management capabilities only to users with Owner-level permissions.

When an owner creates a new custom role, the system requires the role to be associated with a specific organization. The role cannot be shared across multiple organizations, ensuring each organization maintains its own independent permission structure.

The system provides tools for organization owners to preview role configurations before saving, showing how the role's permissions would affect employees who are or could be assigned to it. This helps owners make informed decisions about role design.

## Employee Error Scenarios

Invitations are rejected if the email already belongs to an account that is deactivated in the organization. Users can only be invited to organizations where they do not already have an employee record. Deactivated employees cannot be assigned to new projects or tasks. When deactivating an employee, the system shows pending timesheets that require resolution first. Invitation email validation rejects invalid email formats before sending the invitation. Employees must be assigned exactly one role per organization, and removing role assignment is not allowed. Department assignment can be removed, which sets the field to null. Employment type changes do not affect existing historical data. Search and filter operations return no results if filters have no matching employees. Pagination handles empty result sets gracefully with appropriate messaging.

### Invitation Email Conflict

When inviting a new employee by email, the system checks if the email address already has an account with an active employee record in the organization. If the email already belongs to an employee in the organization, the invitation is rejected and the requester is informed that the user is already a member of the organization.

If the email already has an account but that account is deactivated in the organization, the invitation is rejected. The system displays a message that the user's account is deactivated and must be reactivated before they can be invited.

If the invitation email matches an account that belongs to a different organization but not this organization, the invitation is accepted and the user is added to the current organization.

### Deactivated Account Invitation

Users with deactivated employee status cannot receive new invitations to the organization. When an attempt is made to invite a user who has a deactivated employee record, the system rejects the invitation and displays an error message stating that the account is deactivated and must be reactivated first.

Deactivated users can be reactivated by users with employee management permission. Once reactivated, the user's previous employee record is restored with their prior department, position, and employment type.

Deactivated employees retain their historical data including timelogs and timesheets, but cannot log new time or submit new timesheets while deactivated.

### New Employee Record Creation

When a new employee is invited and the email does not correspond to an existing account, a pending invitation record is created. The invitation stores the email address, the inviting user, the assigned role, and the department assignment.

The invited user receives an email invitation containing a secure link to create their account. When the user completes registration using the invited email, their account is automatically added to the organization with the pending invitation details.

If the invited user already has an account but is not in the organization, the pending invitation is accepted and the user is added to the organization with the assigned role and department.

### Pending Timesheet Resolution

Before an employee can be deactivated, the system checks for any pending timesheets (draft or submitted but not yet approved or rejected) for that employee. If pending timesheets exist, the deactivation is blocked and the user must resolve them first.

Pending timesheets must be either submitted for approval, rejected by a manager, or returned to draft status before deactivation can proceed. The system displays a list of pending timesheets with their week start and end dates.

Once all pending timesheets are resolved, the employee can be deactivated. Their historical timelogs and approved timesheets are preserved.

### Employee Deactivation Workflow

Employees with employee management permission can deactivate an employee's record. The deactivation process sets the employee status to deactivated and prevents them from logging time or submitting timesheets.

Before confirming deactivation, the system shows a summary of the employee's current assignments including active projects, pending timesheets, and assigned role. The user must confirm the deactivation action.

Deactivated employees cannot be assigned to new projects or tasks. Their historical data including timelogs, timesheets, and contracts remain accessible for reporting and audit purposes.

Deactivated employees can be reactivated by users with employee management permission. Reactivation restores the employee's status to active and allows them to log time and submit timesheets again.

### Employee Project Assignment

Employees with project management permission can assign employees to projects. Each assignment creates a project membership record that links the employee to the project and assigns them a role as either member or project lead.

An employee can be assigned to multiple projects simultaneously. The system tracks the current assignment status and alerts if an employee is already assigned to the requested project.

Deactivated employees cannot be assigned to new projects. Attempts to assign a deactivated employee result in an error message stating that the employee must be reactivated first.

Employees can view the list of projects they are assigned to and their role on each project.

### Single Role Requirement

Each employee must have exactly one role assigned in the organization. The system enforces this requirement by preventing any action that would leave an employee without a role.

When assigning a role to an employee, the system validates that the role exists and has at least one permission assigned. Empty roles with no permissions cannot be created or assigned.

Role changes can be performed by users with employee management permission. The system logs all role assignment changes in the activity log for audit purposes.

Role names must be unique within an organization. Attempts to create a role with an existing name are rejected.

### Department Null Assignment

When a department is deleted, all employees assigned to that department have their department assignment set to null. The employees are not deleted or deactivated.

Users with organization management permission can remove an employee's department assignment explicitly by setting it to null. This action is logged in the activity log.

Department assignment is optional for new employees. During invitation or employee creation, the department field can be left unassigned.

Deactivated employees retain their department assignment even after deactivation. The department assignment is restored upon reactivation.

### Employment Type History Preservation

Changes to an employee's employment type (full-time, part-time, contractor, or intern) are recorded but do not modify historical data. The previous employment type remains accessible in the employee's record.

Employment type changes can be made by users with employee management permission. The change is logged in the activity log with the date, old value, new value, and the user who made the change.

Historical timelogs and timesheets retain their original context even if the employee's employment type changes. Reports can filter by employment type using the current assignment.

Past contracts preserve the employment type that was active during the contract period. Employment type changes do not affect existing contract records.

### Employee List Filtering

Employees with employee view permission can filter the employee list by department, employment type, and status (active or deactivated). The system displays only employees matching all active filter criteria.

Filtering by department shows employees assigned to that specific department. Employees with null department assignment are excluded unless a null filter option is available.

Filtering by employment type displays only employees with that employment type. Multiple employment types cannot be selected simultaneously.

Filtering by status allows viewing active employees only, deactivated employees only, or both combined.

### Employee Pagination Handling

The employee list is paginated with a maximum of 25 employees per page. Navigation controls display the current page number and total number of pages.

Empty result sets are handled gracefully. When no employees match the search or filter criteria, the system displays a message stating no employees were found.

Pagination maintains filter context across page changes. When navigating to the next page, the same filters and search terms are applied.

The first page displays a summary showing the total number of employees matching the current filters.

### Invitation Format Validation

Email format validation is performed before sending an invitation. Invalid email formats are rejected and the user is prompted to enter a valid email address.

The system checks for proper email syntax including the presence of an @ symbol, domain name, and valid character set. Common format errors such as missing domain or multiple @ symbols are detected.

Duplicate invitation attempts for the same email are blocked. If an invitation already exists for an email, the system informs the user that an invitation has already been sent.

Email addresses are case-insensitive for lookup purposes but stored in lowercase for consistency.

### Employee Status Tracking

Each employee record tracks status as either active or deactivated. The status is visible on the employee detail page and in the employee list.

Status changes are logged in the activity log with a timestamp, the previous status, the new status, and the user who made the change.

The status determines what actions the employee can perform. Active employees can log time, submit timesheets, and view their assignments. Deactivated employees cannot perform these actions.

Status is separate from account existence. An employee can be deactivated while their user account remains active in the system.

### Role Assignment Validation

When assigning a role to an employee, the system validates that the role exists in the organization and has at least one permission assigned. Unusable roles cannot be assigned.

Built-in roles (owner, manager, employee) cannot be deleted but can be assigned to employees. Custom roles can be assigned and deleted by organization owners.

Role assignment changes are validated against the user's permissions. Users without employee management permission cannot change role assignments.

When a custom role is deleted, all employees assigned to that role must be reassigned to a different role first. The system displays a list of affected employees.

## Contract Error Scenarios

Creating a new contract automatically ends the previous active contract by setting its end date. Two overlapping contracts are rejected during creation. Past contracts cannot be edited to maintain historical integrity. End date being null indicates an ongoing contract. Pay rate must be a positive numeric value. Working hours per week must be within realistic business limits (1-168 hours). Start dates cannot be in the future for initial contract creation. Employees can view their own contracts but only users with employee:view permission can view any employee's contracts. Contract editing is blocked once the contract becomes inactive. The system validates that contract end dates do not create gaps between active contracts. Contract creation requires a valid employee reference and all mandatory fields are validated before save.

### Contract Overlap Prevention

When an employee already has an active contract, any attempt to create a new contract for the same employee is rejected with an error message indicating that only one active contract is allowed.

Before creating a new contract, the system automatically checks if the proposed contract period overlaps with any existing contract for the employee. If an overlap is detected, the contract creation is rejected.

Overlapping contracts are defined as any date range where the start date of the new contract is before the end date of an existing contract (or where the new contract has no end date but overlaps with the start date of another).

The system displays the overlapping contract details to help the user understand which contract conflicts with the new one.

After validation, if no overlap exists, the contract creation proceeds normally.

### Automatic Previous Contract Ending

When a new contract is created for an employee, the system automatically ends any previously active contract by setting its end date to the day before the new contract's start date.

This automatic ending process occurs atomically as part of the new contract creation operation.

The previous contract's end date is set only when the new contract successfully saves to the system.

Users with employee:manage permission can see the historical record showing when the previous contract ended and when the new one began.

This ensures continuous employment record coverage without gaps.

### Active Contract Limitation

Each employee can have only one active contract at any given time in the system.

Once a contract becomes inactive (either through automatic ending or manual end date setting), a new contract can be created.

Attempts to create a second active contract for an employee while one is already active are rejected.

The system clearly indicates which contract is currently active and which contracts are inactive when viewing an employee's contract history.

An active contract is identified by having either no end date or an end date in the future.

Employees can view their own contract history, which includes both active and past contracts.

### Past Contract Immutability

Past contracts (those with an end date before the current date) cannot be edited once they have become inactive.

Any edit attempt to a past contract is rejected with an error indicating that historical contracts are immutable.

Only the current active contract can be modified by users with employee:manage permission.

The immutability of past contracts ensures the integrity of historical employment records.

If a past contract needs to be corrected, a new contract must be created with the corrected dates and the system will flag this as a correction to the historical record.

### Ongoing Contract Null End Date

A contract with no end date indicates an ongoing contract that is still active.

The end date field is optional and when left null, the contract remains active until an end date is added.

When viewing a contract list, contracts without an end date are visually distinguished from those with an end date.

A null end date allows for continuous employment records without requiring immediate future date specification.

Users can add or modify an end date on an ongoing contract at any time before the contract naturally ends.

### Positive Pay Rate Validation

The pay rate field must contain a positive numeric value greater than zero.

Attempting to save a contract with a pay rate of zero or a negative value is rejected.

The system displays a clear error message indicating that pay rate must be a positive number.

The pay rate is stored as a decimal value allowing for currency-specific precision.

All pay rate changes require the user to have employee:manage permission.

### Working Hours Range Limits

The working hours per week field must be a numeric value between 1 and 168 hours.

Attempting to save a contract with working hours less than 1 or greater than 168 is rejected.

The system displays an error message indicating the valid range for working hours.

This range ensures that working hours are within realistic business limits and prevents data entry errors.

The default working hours value is 40 hours per week when creating new contracts.

### Start Date Future Restriction

The start date for a new contract cannot be set to a future date during initial contract creation.

Attempting to save a contract with a start date in the future is rejected with an error indicating the start date must be today or in the past.

This restriction ensures that all contracts represent actual or past employment periods.

Future contract dates can be handled by creating a draft contract that converts to active status on the desired start date.

The system validates start date against the current date at the time of submission.

### Employee Contract Viewing Rights

Each employee can view their own contract history including active and past contracts.

Viewing an employee's contract details requires either ownership of the contract (being that employee) or having the employee:view permission.

Employees can see all contract information including pay rate, working hours, and dates on their own contracts.

Users with employee:view permission can view any employee's contract details within their organization.

Contract viewing is read-only and does not allow modifications during viewing.

### Contract Edit Restrictions

Only the current active contract can be edited by users with employee:manage permission.

Attempting to edit an inactive or past contract is rejected with an error indicating that only active contracts can be modified.

Once a contract becomes inactive, all its information becomes immutable and cannot be changed.

Contract editing includes changes to pay rate, working hours, notes, and other contract fields.

The system tracks when and by whom each contract was edited in the activity log.

### Contract Gap Validation

The system validates that contract end dates do not create gaps between active contracts.

When creating a new contract, the system checks if there would be a period with no active contract between the end of the previous contract and the start of the new one.

If a gap is detected, the system warns the user and requests confirmation before proceeding.

Gaps in employment records are flagged in the activity log for review by organization administrators.

This validation ensures continuous employment record coverage for compliance and reporting purposes.

### Contract Field Validation

All required contract fields must be validated before the contract can be saved to the system.

Required fields include: start date, pay rate, pay period, and working hours per week.

Attempting to save a contract with missing required fields is rejected with specific error messages for each missing field.

Optional fields such as end date and notes can be left blank during initial contract creation.

The validation occurs before any data is persisted to ensure data integrity.

### Contract Historical Record

Each contract serves as a historical record of an employee's employment terms and conditions.

The system preserves all contract information including pay rates, working hours, and notes throughout the employment lifecycle.

Past contracts remain accessible for reporting and audit purposes even after they become inactive.

The contract history provides a complete timeline of an employee's employment terms within the organization.

All contracts are stored permanently and cannot be deleted from the system.

### Employee Contract Access

Employees have access to view their own contract information including all historical contracts.

Access to an employee's contract information is controlled by the employee:view permission or by being that employee.

Employees can see the full details of their contracts including pay rate, pay period, and working hours.

The system provides a clear interface for employees to view their contract history chronologically.

Contract access is scoped to the organization and employees cannot view contracts from other organizations.

## Department Error Scenarios

Departments can only nest one level deep, so parent department must not itself have a parent. Department names must be unique within the organization at the same nesting level. Deleting a department does not delete employees; instead, it sets their department field to null. Department deletion requires confirmation when employees are currently assigned to it. Department edit operations allow name and description changes. Creating a department with an invalid parent reference is rejected. The system validates that parent department references point to existing departments. Department deletion with assigned employees displays the count of affected employees. Employees can view department lists regardless of their permissions. Department hierarchy display handles null parent references gracefully.

### Department Creation with Parent Validation

Users with `org:manage` permission can create a department for their organization.

Each department has a name and description. The name must be unique within the organization at the same nesting level.

Users can optionally select a parent department. The parent department must exist and must not itself have a parent (one level nesting constraint only).

If the parent department selection is invalid or the parent department itself has a parent, the request is rejected.

The system displays the current department hierarchy to help users select valid parent departments.

### Department Edit Operations

Users with `org:manage` permission can edit an existing department.

Edit operations allow changing the department name and description.

The updated name must be unique within the organization at the same nesting level.

The parent department can be changed, subject to the one level nesting constraint.

If the new parent department reference is invalid or violates the nesting constraint, the request is rejected.

### Department Deletion with Employee Impact

Users with `org:manage` permission can delete a department from their organization.

If the department has employees currently assigned to it, the system displays the count of affected employees and requires confirmation before deletion.

Deletion does not remove employees; instead, it sets their department field to null.

Employees without a department assignment remain in the organization and can be assigned a new department later.

If the department has no assigned employees, deletion proceeds immediately after confirmation.

### Department List Viewing

Users with `org:manage` permission can view the complete list of departments in their organization.

The department list displays the hierarchy, showing parent-child relationships where applicable.

Departments with no parent display as top-level departments.

The list includes department names, descriptions, and the count of assigned employees.

Employees can also view the department list regardless of their permissions.

### Department Hierarchy Display and Null Parent Handling

When displaying department hierarchies, the system handles null parent references gracefully.

Departments without a parent are displayed at the top level.

The hierarchy display shows the nesting structure up to one level deep.

Any reference to a parent that no longer exists is handled by displaying the department without a parent indicator.

### Department Deletion Confirmation

When deleting a department with assigned employees, the system requires explicit confirmation.

The confirmation dialog displays:
- The department name being deleted
- The count of employees who will be affected
- The impact: employees will have their department set to null

Deletion proceeds only after the user confirms.

If the user cancels the confirmation, no changes are made to the department or employee records.

### Parent Reference Validation

The system validates parent department references during department creation and editing.

A parent department reference is valid only if:
- The referenced department exists
- The referenced department is part of the same organization
- The referenced department does not itself have a parent (one level nesting constraint)

Invalid parent references are rejected with a clear error message.

### Department Name Uniqueness

Department names must be unique within the organization at the same nesting level.

Two departments cannot have the same name if they share the same parent department (or both have no parent).

The system checks name uniqueness when creating a new department and when updating an existing department name.

If a duplicate name is detected, the request is rejected with a validation error.

### Employee Department Null Assignment

When a department is deleted, all employees assigned to that department have their department field set to null.

This ensures employees remain active in the organization while losing their department association.

The employee records themselves are not modified or deleted.

The null assignment is immediate and takes effect for all operations.

### Department Parent Assignment

Users with `org:manage` permission can edit the parent department of a department.

The new parent must satisfy the one level nesting constraint.

If the new parent department already has a parent, the operation is rejected.

The change is logged in the activity log with timestamp and user attribution.

## Project Error Scenarios

Projects cannot be deleted if they have any associated timelogs. Archived or completed projects cannot receive new timelogs. Budget hours must be a positive number if specified. Projects without budget hours are excluded from budget reports. Start and end dates cannot have start after end date. Project color codes must be valid hexadecimal values. Deleting a project requires confirmation because all associated tasks and timelogs are affected. Users without project:manage permission cannot edit or delete projects. Project status transitions from active to archived preserve historical data. The system prevents duplicate project names within the same organization context. Project editing is allowed for all statuses except deletion constraints.

### Project Timelog Deletion Block

Users cannot delete timelogs that are part of a submitted or approved timesheet. When a timesheet is submitted for approval, all associated timelogs are protected from deletion. When a timesheet is approved, all included timelogs become locked and cannot be deleted by any user. Users with time:manage permission can delete timelogs only if they are not part of any timesheet. Employees can delete their own timelogs only if they are not part of any submitted or approved timesheet. The system prevents deletion when a timelog is referenced by an active timesheet.

### Timelog Prevention on Archived Projects

Archived projects cannot receive new timelogs. Completed projects cannot receive new timelogs. When a project is archived or completed, the system blocks any attempt to create timelogs for that project. Existing timelogs on archived or completed projects are preserved and remain visible. Users can still view historical timelogs on archived or completed projects. Project members cannot create timelogs for projects they are assigned to if the project status is archived or completed. The system displays a clear message when a user attempts to create a timelog on an archived project.

### Budget Hours Validation

Budget hours must be a positive number if specified for a project. Users cannot enter zero or negative budget hours when creating or editing a project. Budget hours is optional—if not specified, the project has no budget limit. The system validates budget hours before saving project changes. Projects with invalid budget hours are rejected with an error message.

### Budget Report Exclusion

Projects without budget hours are excluded from budget reports. The system only includes projects with budget hours assigned in project budget reports. Projects without budget hours do not appear in the budget utilization dashboard. Users can filter budget reports to show only projects with budget hours. Projects without budget tracking are not considered for budget consumption calculations.

### Date Range Validation

Start date cannot be later than end date when both dates are specified. When creating a project, if both start date and end date are provided, the system validates that start date is on or before end date. The system displays an error if start date is after end date. Optional dates can be entered without validation until both are provided. Project editing allows date changes as long as start date does not exceed end date.

### Hexadecimal Color Validation

Project color codes must be valid hexadecimal values. Valid formats include six-digit hex codes (e.g., #FF5733) or three-digit hex codes (e.g., #F53). The system validates color codes when creating or editing projects. Invalid color codes are rejected with an error message. Users can select from predefined color options or enter custom hex codes.

### Project Deletion Confirmation

Deleting a project requires explicit confirmation because all associated tasks and timelogs are affected. The system displays a confirmation dialog showing the count of associated tasks and timelogs before deletion. Users must confirm deletion twice to prevent accidental removal. The confirmation message warns that all related data will be permanently deleted. Once confirmed, deletion cannot be undone.

### Role-Based Edit Restrictions

Users without project:manage permission cannot edit or delete projects. Only users with project:manage permission can create new projects. Users with project:view permission can only view projects but cannot modify them. Project editing is restricted based on the user's role within the organization. The system checks permissions before allowing any project modification actions.

### Status Transition Preservation

Project status transitions from active to archived preserve all historical data. When a project is archived, all timelogs, tasks, and memberships remain intact and accessible. Archived projects retain their task history and timelog records. Completed projects preserve all historical information for audit purposes. The system maintains data integrity during status transitions. Historical reports include data from archived and completed projects.

### Project Name Uniqueness

The system prevents duplicate project names within the same organization context. Each project name must be unique within an organization. When creating a project with an existing name, the system rejects the creation. Users can use the same project name across different organizations. The uniqueness validation applies only within the user's currently selected organization context.

### Project Edit Permissions

Users with project:manage permission can edit any project in the organization. Project editing is allowed for all statuses except when deletion constraints apply. Project owners can edit their own projects regardless of status. Users without project:manage permission cannot edit projects even if they are project members. Editing permissions are checked against the user's assigned role for each organization.

### Project Archive Workflow

Users with project:manage permission can archive active projects. Archiving a project changes its status from active to archived. Archived projects cannot receive new timelogs or task updates. Existing timelogs and tasks on the project are preserved. Users can view archived projects but cannot modify them. Archived projects can be archived again from other statuses but cannot be reactivated.

### Project Complete Workflow

Users with project:manage permission can complete active projects. Completing a project changes its status from active to completed. Completed projects cannot receive new timelogs or task updates. All historical data is preserved for reporting purposes. Users can view completed projects in reports and filters. Completed projects can be distinguished from archived projects in project lists.

### Project Deletion Constraints

Projects cannot be deleted if they have any associated timelogs. Projects with timelog records are protected from deletion. Users can only delete projects with zero timelogs. The system checks timelog count before allowing deletion. Projects with no associated timelogs can be deleted by users with project:manage permission.

## ProjectMembership Error Scenarios

Employees can be assigned to multiple projects without restriction. An employee can have the same project membership role only once per project. Duplicate membership assignments for the same employee and project combination are rejected. Project leads can only manage tasks in projects where they have project lead role. Users with project:manage permission can remove any employee from any project. Removing an employee from a project does not delete their timelogs from that project. Employee must exist and be active to be assigned to a project. Assigning an inactive employee to a project is allowed but they cannot log time. Project membership removal requires confirmation to prevent accidental data loss. The system validates that assigned employees are project members before allowing task assignment.

### Multiple Project Assignment

Employees can be assigned to multiple projects without restriction. An employee may participate in any number of projects simultaneously. There is no limit on the total number of projects an employee can be assigned to across the organization.

When assigning an employee to a project, the system checks that the employee record exists and is active. If the employee does not exist in the organization, the assignment request is rejected with an error indicating the employee was not found.

If the employee has been deactivated but still exists in the organization, the assignment is still allowed. However, deactivated employees cannot log time against tasks in that project until they are reactivated.

### Duplicate Membership Rejection

An employee can have the same project membership role only once per project. The system enforces membership role uniqueness within each project.

When attempting to assign a second membership for the same employee and project combination, the request is rejected. The system prevents duplicate entries where the same employee has two separate memberships for the same project.

If a duplicate membership assignment is detected, the system rejects the operation and displays a message indicating that the employee is already assigned to this project.

### Project Lead Task Management

Project leads can manage tasks within their assigned project. This includes creating, editing, and managing tasks specific to that project.

Users with the `project:manage` permission can edit any task in any project, regardless of their membership role in that project.

Project leads cannot manage tasks in projects where they do not have the project lead role. Task management permissions are scoped to the specific project where the user has project lead assignment.

### Project Membership Removal

Users with the `project:manage` permission can remove employees from projects. The removal operation removes the project membership but does not delete any historical data associated with that employee on the project.

When an employee is removed from a project, all existing timelogs, timesheets, and task history entries remain intact and are preserved. The timelogs are not deleted or modified in any way.

The system requires confirmation before removing an employee from a project to prevent accidental data loss. The user must confirm the removal action through a confirmation dialog.

### Employee Project Assignment

Employees can be assigned to projects by users with the `project:manage` permission. The employee must exist in the organization and have an active status to be assigned.

When assigning an employee to a project, the system requires selection of the assignment role: member or project lead. Each project membership must have one of these two roles defined.

If the employee being assigned is deactivated, the assignment is still allowed but the employee will not be able to log time or submit timesheets until reactivated.

### Inactive Employee Assignment

Inactive employees can be assigned to projects, but they are restricted from logging time. The system allows the assignment but prevents any time tracking activities.

When an inactive employee attempts to create a timelog, the request is rejected with an error indicating that the employee account is deactivated.

Inactive employees cannot submit timesheets or view timesheets they own. Their access is limited to viewing project information without any time tracking capabilities.

### Timelog Preservation on Removal

Timelogs are preserved when an employee is removed from a project. The historical time tracking data remains intact and accessible.

Removing an employee from a project does not delete any timelogs they created while assigned to that project. All existing timelogs continue to be associated with that project and employee.

Once a timesheet is approved, all timelogs included in that timesheet are locked and cannot be modified, regardless of subsequent project membership changes.

### Membership Role Uniqueness

Each project membership has a unique role assignment within the project. The role can be either member or project lead, and this designation is required for all assignments.

Membership role restrictions apply to task management capabilities. Only employees with the project lead role can manage tasks in their assigned project. Members can view tasks but cannot edit them.

Users with the `project:manage` permission can change an employee's role from member to project lead or vice versa.

### Employee Activity Validation

The system validates that the employee exists and is active before allowing project assignment. This validation occurs at the point of assignment creation.

If the employee does not exist in the organization, the system rejects the assignment request with an error message indicating the employee was not found.

If the employee has been deactivated, the assignment is allowed but the employee's ability to work on the project is restricted until reactivation.

### Project Member Task Assignment

Employees can only be assigned as task assignees if they are project members. The system validates that the employee has a project membership before allowing them to be assigned to a task.

When creating a task, the assigned employee must have an existing membership in that project. If the employee is not a project member, the task creation is rejected.

This validation applies to both employee assignment and task creation operations within the project context.

### Assignment Confirmation

Assignment operations require explicit confirmation to prevent accidental modifications. The confirmation step is mandatory for removing employees from projects.

When removing an employee from a project, the user must confirm the action through a confirmation dialog before the removal is processed.

The confirmation requirement helps prevent unintended loss of project membership assignments and associated work context.

### Membership Role Restrictions

Membership role restrictions define what actions employees can perform within their assigned project. Members have limited permissions compared to project leads.

Project members can view projects and tasks but cannot create, edit, or delete tasks. Project leads have full task management capabilities within their assigned project.

Users with the `project:manage` permission can assign or change any employee's role in any project, overriding default role restrictions.

### Employee Project Visibility

Employees can only view tasks in projects where they are assigned as members. Task visibility is scoped to the user's project memberships.

An employee assigned to multiple projects can view tasks from all projects they are a member of. Employees cannot view tasks from projects where they have no membership.

The system filters the task list based on the user's project memberships and active organization context.

### Role-Based Task Access

Task access is controlled by role-based permissions within each project. Users can only access tasks based on their role in the specific project.

Members can view tasks in their assigned projects but cannot edit or delete them. Project leads can edit and delete tasks in their assigned projects.

Users with the `project:manage` permission have full access to all tasks across all projects in the organization, regardless of their membership role.

## Task Error Scenarios

Tasks can only have one level of parent-child nesting. Subtasks cannot have their own subtasks. Task status changes are recorded in history automatically. Assigning a task to an employee requires them to be a project member. Task titles are required and cannot be empty strings. Due dates must not be before the creation date. Priority must be one of the allowed values: low, medium, high, urgent. Task status cannot transition to closed from any status without manager approval. Estimated hours must be non-negative if provided. Employees without project:view permission cannot see tasks outside their assigned projects. Deleting a task deletes all associated history records. Task filtering must handle zero results gracefully.

### Single Level Nesting Constraint

Tasks can have at most one level of parent-child nesting. Users can create a task as a subtask of another task within the same project. If a user attempts to create a subtask using an existing subtask as the parent, the system rejects the request with an error message indicating that only parent tasks can have children. The system enforces this constraint at creation time by checking the parent task's nesting level before allowing the assignment.

### Task Status Change Recording

Whenever a task's status changes from one state to another, the system automatically records the change in task history. The history entry captures the timestamp of the change, the previous status, the new status, and the user who made the change. This history is immutable once created; history entries cannot be edited or deleted. The automatic recording ensures a complete audit trail of all status transitions for each task.

### Project Member Assignment Requirement

When creating or editing a task, users can assign it to an employee only if that employee is a member of the project. If a user attempts to assign a task to an employee who is not a project member, the assignment is rejected with an error message. This requirement applies to both task creation and task editing operations. Project leads and users with project:manage permission must ensure the assigned employee is a valid project member before completing the assignment.

### Required Title Validation

All tasks must have a title. When creating a new task, the system validates that a title is provided. If the title is missing or an empty string, the task creation is rejected with an error message indicating that a title is required. The title cannot be a blank or whitespace-only string. Task editing also requires that the title field contains valid content; attempting to save a task with an empty title is rejected.

### Due Date Creation Date Validation

When creating a task, if a due date is provided, it must not be earlier than the task creation date. The system validates this constraint and rejects the task creation if the due date precedes the creation date. An error message indicates that the due date must be on or after the creation date. Users can create tasks without setting a due date, but if they do set one, it must be valid relative to the creation date.

### Priority Value Restrictions

When creating or editing a task, the priority must be one of the allowed values: low, medium, high, or urgent. If a user attempts to set a priority to any other value, the request is rejected with an error message. The system validates the priority value at submission time and only accepts the four defined priority levels. Default priority is not automatically assigned; users must explicitly choose a valid priority value.

### Closed Status Approval Requirement

Transitioning a task to closed status requires approval from a user with manager-level permissions within the organization. If a user without manager permissions attempts to close a task, the request is rejected with an error message indicating that manager approval is required. Once a task is closed, it cannot be changed back to any other status without re-approval from a manager. The system tracks the manager who approved the closure in the task history.

### Non-negative Estimated Hours

When creating or editing a task, if estimated hours are provided, they must be a non-negative number. Negative values are rejected with an error message indicating that estimated hours must be zero or greater. The system validates this constraint before saving the task. Users may choose not to specify estimated hours, but if they do, the value must be valid.

### Project View Permission

Employees can view tasks in projects they are assigned to. Users without project:view permission cannot see tasks outside their assigned projects. The system enforces permission checks on every task query to ensure users only see tasks they are authorized to view. Project leads can see and manage all tasks in their projects regardless of their general project:view permission level.

### Task Deletion and History

Tasks can be deleted only by users with project:manage permission. When a task is deleted, all associated task history entries are also deleted. Deletion is permanent; there is no recovery mechanism for deleted tasks. The system checks that the user has the required permission before allowing deletion. If the user lacks permission, the deletion request is rejected with an error message.

### Task Filtering Zero Results

When filtering tasks, if no tasks match the specified criteria, the system displays an empty list with a message indicating no tasks were found. Users can filter by status, priority, or assigned employee. When no results exist, the pagination controls show zero pages. Filtering never exposes tasks outside the user's project:view permission scope. The empty state provides clear feedback that the filter returned no results rather than indicating an error.

### Task Creation Requirements

Users with project:manage permission or project leads can create tasks within their project. A task requires a title; creation is rejected if the title is missing. An optional description may be provided. The task is automatically associated with the creating project. Task creation requires the user to have appropriate permissions for the project. Creating a task without proper permissions is rejected with an error message.

### Task Edit Permissions

Project leads can edit any task within their project. Users with project:manage permission can edit any task across all projects they manage. Employees without project:manage permission or project lead status cannot edit tasks they do not own. Attempting to edit a task without the required permissions is rejected with an error message. The system validates permissions before allowing any task modification.

### Parent Subtask Prevention

The system prevents subtasks from having their own subtasks. When creating a task, if the selected parent task is itself a subtask, the creation is rejected with an error indicating that only parent tasks can have children. This prevents multi-level nesting beyond one level. Users must select a task that is not already a subtask as the parent. The validation occurs at creation time before the task is saved.

## TaskHistory Error Scenarios

Task history entries are automatically created for every status change. History entries record timestamp, old status, new status, and the user who made the change. History cannot be modified or deleted once created to preserve audit trail. Empty history is valid for tasks with no status changes. Users with report:view permission can view all task history. History pagination handles large task histories gracefully. History entries are sorted chronologically with newest first. The system prevents history entries with invalid status transitions. Users without task edit permissions cannot trigger history changes. History displays show all users who have made status changes.

### Automatic Status Change Recording

Task status changes are automatically recorded in the task history. Every time a task status changes from one state to another, a new history entry is created.

### History Entry Immutability

History entries are immutable once created. They cannot be modified or deleted to preserve the integrity of the audit trail. Even users with task edit permissions cannot alter historical records. This immutability applies to all status change entries regardless of when they were created.

### Audit Trail Preservation

The system maintains task history as an audit trail of all status changes. This audit trail provides a complete record of task evolution and is used for compliance and reporting purposes. The audit trail cannot be disabled or modified.

### Timestamp Recording Requirement

Each history entry records the exact timestamp when the status change occurred. The timestamp captures both the date and time of the change. This timestamp is automatically generated by the system and cannot be manually set or modified.

### Old New Status Tracking

Every history entry tracks both the old status and the new status to show the transition. This allows users to understand what status the task had before the change and what it became after. The old status and new status are recorded as part of every history entry.

### Change User Attribution

Each history entry records which user made the status change. This user attribution is automatically captured when the change is made. The attribution allows tracking of who made each status change for accountability purposes.

### History Pagination Handling

The system handles large task histories through pagination. When a task has many status changes, the history entries are displayed in pages. This ensures that viewing task history remains performant even for tasks with extensive change history.

### Chronological Sorting

History entries are sorted chronologically with the newest changes displayed first. This ordering allows users to see the most recent status changes immediately without additional navigation. The chronological sort is the default display order for all history views.

### Invalid Status Transition Prevention

The system prevents history entries that record invalid status transitions. Only valid status changes are recorded in the history. If a status change attempt violates the allowed transitions, the change is rejected and no history entry is created.

### Task Edit Permission History

Only users with task edit permissions can trigger history changes through status modifications. Users without edit permissions cannot change task status and therefore cannot create new history entries. The permission requirement is enforced before any status change is processed.

### History Access Rights

Users with report:view permission can view all task history entries. This access right allows them to review the complete history of any task in their organization. Users without this permission cannot view task history.

### Change Attribution Display

The system displays who made each change in the history view. The change attribution is shown alongside each history entry, displaying the user who performed the status change. This display provides transparency about task evolution.

### Task History Viewing

Users can view task history entries for any task they have access to. The viewing capability is based on their task view permissions. Users can see all historical status changes for tasks within their authorized scope.

### History Entry Completeness

Every task history entry is complete with all required information. Each entry includes timestamp, old status, new status, and the user who made the change. Incomplete history entries are not created; the system ensures all required fields are populated.

## Timelog Error Scenarios

Employees can only create timelogs for themselves. Timelog editing is blocked if the timelog is part of an approved timesheet. Timelog deletion is blocked if part of any submitted timesheet. Project selection must be a project the employee is assigned to. Duration must be a positive number of minutes. Billable flag defaults to true for new timelogs. Employees with time:manage permission can edit any employee's timelogs. Billable status can be changed by users with appropriate permissions. Timelog date must be a valid calendar date within organization fiscal periods. Task selection is optional but must belong to the selected project. The system aggregates timelogs for timesheet calculations. Duplicate timelog entries on same date and project are allowed.

### Self Timelog Creation

Employees can only create timelogs for themselves. The system validates that the employee attempting to create a timelog matches the employee record being logged against. Requests to create timelogs for other employees are rejected with an access denied message. Only employees with `time:manage` permission can create timelogs on behalf of other employees.

### Approved Timesheet Edit Block

Employees cannot edit their own timelogs if the timelog is part of an approved timesheet. The system checks the timelog's inclusion in approved timesheets before allowing any modifications. Once a timesheet containing a timelog is approved, the timelog becomes immutable and locked for editing. Users with `time:manage` permission can still edit timelogs in approved timesheets.

### Submitted Timesheet Delete Block

Employees cannot delete their own timelogs if the timelog is part of any submitted timesheet (submitted, approved, or rejected). The system prevents deletion of timelogs that are associated with a timesheet in any status other than draft. Users with `time:manage` permission can delete timelogs regardless of timesheet status.

### Employee Project Assignment Validation

When creating or editing a timelog, the selected project must be a project the employee is assigned to. The system validates the project assignment before accepting the timelog. Requests to log time against a project the employee is not assigned to are rejected with a project assignment validation error. Users with `time:manage` permission can override this restriction.

### Duration Positive Validation

The duration field must contain a positive number of minutes. Zero or negative durations are rejected. The system validates duration before accepting the timelog and returns a validation error if the duration is not positive. Partial minutes are rounded to the nearest minute when creating timelogs from timer stops.

### Default Billable Flag

New timelogs are created with the billable flag set to true by default. Users can change the billable status to false during timelog creation or editing. The default billable status can only be changed by employees and users with `time:manage` permission. The billable status affects report calculations.

### Time Manage Permission Editing

Users with `time:manage` permission can edit any employee's timelogs, regardless of ownership or timesheet status. This permission bypasses all timelog edit restrictions including approved timesheet locks. Users with `time:manage` permission can modify any timelog field including date, duration, project, task, and billable status.

### Billable Status Changes

The billable status of a timelog can be changed by employees for their own timelogs and by users with `time:manage` permission for any timelog. Changes to billable status are reflected in report calculations for billable hours. Once a timesheet containing a timelog is approved, the billable status can no longer be changed by the employee.

### Fiscal Period Date Validation

The timelog date must be a valid calendar date that falls within the organization's fiscal periods. Dates outside the current fiscal period or in closed periods are rejected. The system validates the date against the organization's fiscal calendar and returns an error if the date is not within an active fiscal period.

### Task Project Association

When a task is selected for a timelog, the task must belong to the project specified in the timelog. The system validates that the selected task is a child of the selected project before accepting the timelog. Requests to associate a task from a different project with a timelog are rejected.

### Timesheet Calculation Aggregation

The system automatically aggregates all timelogs belonging to a timesheet to calculate total hours. Timesheet total hours are recalculated whenever timelogs are added, removed, or modified. If a timelog is deleted from a timesheet, the total hours are recalculated and the timesheet status may change from submitted to draft if it becomes empty.

### Timelog Duplicate Allowance

The system allows multiple timelogs on the same date for the same employee and project. Duplicate entries are permitted as long as they represent distinct work periods. The system does not prevent creating multiple timelogs with identical dates, projects, and tasks.

### Timelog Date Restrictions

Timelogs can only be created for dates on or before the current date. Past dates are allowed within the organization's fiscal periods, but future dates are rejected. The system validates the timelog date against the current date and fiscal calendar.

### Timelog Permission Access

Employees can only view their own timelogs. Users with `time:view_all` permission can view all employees' timelogs across the organization. Users without `time:view_all` permission cannot see timelogs of other employees even if they have other project or task access permissions.

## Timesheet Error Scenarios

Timesheets are calculated from Monday to Sunday week periods. Creating a timesheet automatically includes all timelogs for that week. Timesheets cannot be submitted without any timelogs. A week can only have one submitted or approved timesheet. Rejected timesheets return to draft status for resubmission. Rejection requires a reason field to be filled. Approved timesheets lock all included timelogs permanently. Timesheet total hours are recalculated when timelogs are modified. Draft timesheets can be modified by the owner at any time. Submitted timesheets cannot be edited by the employee. Users with time:approve permission can view all submitted timesheets. Timesheet pagination handles multiple weeks of history. The system prevents double submission for the same week period.

### Week Period Calculation

Timesheets are organized by week periods that run from Monday to Sunday.

When creating a timesheet, the system automatically calculates the week start date (Monday) and week end date (Sunday) based on the selected date.

The system enforces that all timelogs included in a timesheet must fall within the calculated week period.

Employees can create timesheets for any week period, regardless of whether they logged time in that week.

The week calculation ensures consistent reporting across all organization members.

### Automatic Timelog Inclusion

When an employee creates a draft timesheet for a specific week, the system automatically includes all their timelogs from that week period.

This automatic inclusion happens at the moment the draft is created.

Employees can later remove timelogs from their draft timesheet if they wish.

Employees can also add new timelogs to an existing draft timesheet.

Timelogs are not automatically added to timesheets after the draft is initially created.

### Submission Requirements

Employees can only submit a timesheet that contains at least one timelog entry.

If a draft timesheet has no timelogs, the submission is rejected with an error message.

Employees cannot submit a timesheet on behalf of another employee.

Only the timesheet owner can submit their own draft timesheet.

Once submitted, the timesheet moves from draft status to submitted status.

### Single Submission Per Week

An employee can only have one submitted or approved timesheet per week period.

If a timesheet for a specific week is already submitted or approved, the employee cannot submit another timesheet for that same week.

The system prevents double submission for the same week period.

If an employee needs to report additional time for a week with an approved timesheet, they must contact someone with approval permissions to make an adjustment.

Draft timesheets do not count as submitted and can exist alongside approved timesheets for the same week.

### Rejection and Resubmission

When a user with approval permissions rejects a timesheet, the timesheet returns to draft status.

The employee receives a notification of the rejection with the provided reason.

The employee can modify the timesheet in response to the rejection.

After making changes, the employee can resubmit the timesheet for approval.

There is no limit to the number of times a timesheet can be rejected and resubmitted.

### Rejection Reason Requirement

When rejecting a timesheet, the approver must provide a reason for the rejection.

The rejection reason is required and cannot be left blank.

The rejection reason is stored and visible to the timesheet owner.

Employees can see the rejection reason when reviewing their rejected timesheets.

This requirement ensures clear communication about what needs to be corrected.

### Timelog Locking on Approval

When a timesheet is approved, all timelogs included in that timesheet become locked.

Locked timelogs cannot be edited by anyone.

Locked timelogs cannot be deleted by anyone.

Employees who own the timelogs cannot make changes to approved timesheets or their included timelogs.

Users with edit permissions cannot modify timelogs that are part of an approved timesheet.

### Total Hours Recalculation

The total hours displayed on a timesheet are automatically calculated from the included timelogs.

When an employee adds a new timelog to their draft timesheet, the total hours are recalculated.

When an employee removes a timelog from their draft timesheet, the total hours are recalculated.

When an employee edits a timelog's duration in their draft timesheet, the total hours are recalculated.

This recalculation happens automatically without requiring manual intervention.

### Draft Timesheet Editing

Employees can edit their draft timesheets at any time before submission.

Editing includes adding or removing timelogs, changing timelog descriptions, or modifying timelog durations.

The timesheet owner has full editing rights on draft timesheets.

Other employees cannot edit draft timesheets that belong to different employees.

Draft timesheets can be kept in draft status indefinitely without penalty.

### Submitted Timesheet Restrictions

Once a timesheet is submitted, the owner can no longer edit it.

Submitted timesheets cannot be modified by the employee who owns them.

Submitted timesheets cannot be deleted by the employee who owns them.

The timesheet must be approved or rejected by an approver before any changes can be made.

If changes are needed after submission, the employee must request an approver to reject it first.

### Approval Permission Viewing

Users with approval permissions can view all submitted timesheets in their organization.

These users can see submitted timesheets for all employees, not just their own.

Users with approval permissions can access the timesheet for approval review.

Users without approval permissions cannot view submitted timesheets that belong to other employees.

This viewing capability is essential for the approval workflow.

### Timesheet Pagination

Timesheets are displayed in paginated format to handle multiple weeks of history.

Pagination allows employees and approvers to navigate through timesheet records efficiently.

The default page size shows a reasonable number of timesheets per page.

Employees can navigate between pages to view older or future timesheets.

Pagination ensures the system remains performant even with extensive timesheet history.

### Week Period Double Submission Prevention

The system validates that a week period does not already have a submitted or approved timesheet before allowing new submission.

This validation occurs when the employee attempts to submit the timesheet.

If another timesheet for the same week period exists and has been submitted or approved, the new submission is blocked.

The employee receives a clear error message explaining the conflict.

This prevention maintains data integrity and prevents duplicate reporting.

### Timesheet Status Workflow

Timesheets progress through four distinct statuses: draft, submitted, approved, and rejected.

Draft status means the timesheet is being prepared and can be freely edited.

Submitted status means the timesheet is awaiting approval review.

Approved status means the timesheet has been reviewed and locked for final processing.

Rejected status means the timesheet needs corrections and can be edited and resubmitted.

Status changes can only occur through defined business actions within the system.

### Timesheet Review Timeline

Timesheets can be submitted for approval at any time by the employee.

There is no enforced deadline for submission from the system.

The review timeline is managed through organizational policies rather than system constraints.

Timesheets can be approved or rejected regardless of how old the timesheet is.

Employees can submit timesheets for past weeks as needed for retroactive time entry.

### Employee Timesheet Visibility

Employees can view all their own timesheets regardless of status.

Employees cannot view timesheets belonging to other employees.

Each employee's timesheet view is filtered to show only their records.

The timesheet list includes all statuses: draft, submitted, approved, and rejected.

Employees can navigate through their timesheet history using pagination.

## Timer Error Scenarios

Employees can have at most one active timer at a time. Starting a new timer stops any existing timer automatically. Project selection is required when starting a timer. Task selection is optional when starting a timer. Timer duration is rounded to the nearest minute when stopped. Discarding a timer does not create a timelog. Running timers can be edited for description and project/task. If a timer is not stopped, it continues running indefinitely. The system prevents multiple simultaneous timers for the same employee. Timer display shows current duration from start timestamp. Stopping a timer requires project and optionally task. Timer operations require the employee to be active and not deactivated.

### Single Active Timer Limit

Employees can have at most one active timer at any given time. The system enforces this limit strictly across all timer operations. When an employee attempts to start a new timer while one is already running, the system handles the conflict according to the automatic previous timer stop rule. This constraint ensures accurate time tracking and prevents overlapping time entries.

### Automatic Previous Timer Stop

Starting a new timer automatically stops any existing timer for the same employee. The previous timer is stopped at the moment the new timer is initiated. A timelog is created from the stopped timer with the calculated duration. The duration is rounded to the nearest minute when the timer is stopped automatically. This ensures no timer runs indefinitely and all logged time is captured.

### Required Project Selection

Project selection is required when starting a timer. Employees must select a valid project before the timer can be initiated. The project must belong to the organization the employee is currently working in. If no project is selected, the timer cannot be started and the request is rejected. The selected project is recorded with the timer for accurate time attribution.

### Optional Task Selection

Task selection is optional when starting a timer. Employees can start a timer with just a project selected. If a task is provided, it must belong to the selected project. The task is not required for timer creation but allows more detailed time tracking. Timelogs created from timers inherit the task association when one is selected.

### Nearest Minute Rounding

Timer duration is rounded to the nearest minute when stopped. The system calculates the exact duration between start and stop timestamps. This duration is then rounded using standard rounding rules to the nearest whole minute. The rounded value is used for all subsequent calculations including timelog creation and timesheet totals.

### Discard No Timelog Creation

Discarding a timer does not create a timelog. When an employee discards a running timer, no time entry is recorded. The timer is simply cancelled without any impact on timesheets. Discarded time is lost and cannot be recovered. This provides a way to stop timer tracking without recording the time spent.

### Running Timer Edit Rights

Running timers can be edited for description and project task. Employees can modify the description field at any time while the timer is running. The project and task selection can also be changed while the timer is active. These edits do not affect the running timer's timestamp or duration. Changes are saved immediately and reflected in the timer display.

### Indefinite Running Prevention

If a timer is not stopped, it continues running indefinitely. The system does not implement automatic stop timers. Employees must manually stop their timers to end the tracking. This design allows for flexible time tracking but places responsibility on employees to stop timers. There is no timeout or forced termination of running timers.

### Simultaneous Timer Rejection

The system prevents multiple simultaneous timers for the same employee. If an employee attempts to start a timer while one is already active, the system rejects the new timer request. Instead of creating a second timer, the system follows the automatic previous timer stop behavior. This ensures data integrity and prevents duplicate time tracking.

### Timer Duration Display

Timer display shows current duration from start timestamp. The system continuously updates the displayed duration as the timer runs. The display shows elapsed time in hours and minutes format. Employees can view the running duration to monitor their time tracking. The display updates in real-time while the timer is active.

### Stop Timer Requirements

Stopping a timer requires project and optionally task. When a timer is stopped, the system captures the project association at that moment. The task field is optional and can be left unchanged. The timer stop action creates a timelog with all captured information. The timelog includes the date, duration, project, task, and description.

### Active Employee Timer Validation

Timer operations require the employee to be active and not deactivated. Deactivated employees cannot start or run timers. If an employee's status is deactivated, timer operations are blocked. This prevents time tracking by employees who are no longer active in the organization. Reactivated employees regain the ability to use timer functionality.

### Timer Start Workflow

Employees can start a timer through a defined workflow. The workflow requires selecting a project and optionally a task. The start timestamp is recorded automatically by the system. The timer then begins tracking elapsed time in real-time. The workflow is validated for project ownership and employee status before allowing the start. Once started, the timer runs until manually stopped or discarded.

### Timer Operation Permissions

Timer operations are restricted to employees only. Only active employees can start, stop, edit, or discard timers. Non-employee users cannot access timer functionality. The permission model ensures that time tracking is performed by authorized personnel. Timer operations are scoped to the employee's own time entries only.

## ActivityLog Error Scenarios

The system records significant actions automatically with timestamp and user attribution. Activity logs include employee invited, deactivated, reactivated events. Contract creation or edit actions are logged with before and after state. Project lifecycle events (created, archived, completed, deleted) are recorded. Task status changes generate history log entries. Timesheet status changes are logged for approval workflow tracking. Role assignment changes are recorded in the activity log. Only users with org:manage permission can view the full activity log. Activity log filtering by action type requires valid action type values. Date range filtering must handle invalid date ranges gracefully. Pagination handles large activity log volumes. Users cannot delete or modify activity log entries. The system ensures activity logs are never lost or overwritten.

### Automatic Action Recording

The system automatically records all significant organizational actions as activity log entries without requiring manual intervention.

Every employee invitation event is logged with the inviter and invited email address.
Every employee deactivation event is logged with the actor who performed the action.
Every employee reactivation event is logged with the actor who performed the action.
Every contract creation is logged with the contract details and creating user.
Every contract edit is logged with the before and after state comparison.
Every project creation is logged with the project name and creating user.
Every project archiving is logged with the project name and actor.
Every project completion is logged with the project name and actor.
Every project deletion is logged with the project name and actor.
Every task status change is logged with the old and new status values.
Every timesheet submission is logged with the employee and week date range.
Every timesheet approval is logged with the approver and review timestamp.
Every timesheet rejection is logged with the reviewer and rejection reason.
Every role assignment is logged with the employee, role, and assigning user.
Every role change is logged with the previous role and new role values.

The recording happens immediately when the action is completed, ensuring real-time audit trail.
Activity log entries are created even when the primary action fails, capturing the attempted action details.

### Timestamp and User Attribution

Each activity log entry includes a timestamp recorded in the organization's timezone.

The timestamp captures the exact moment the action was performed.
Each log entry includes the user who performed the action.
The user attribution is permanent and cannot be changed or removed.
When an action is performed by a service account or system, it is marked as "System".
Timestamps are recorded in chronological order and cannot be retroactively modified.
All timestamps use the organization's configured timezone for consistency.
When viewing activity logs, timestamps are displayed in the viewer's timezone preference.
The system ensures timestamps are never adjusted by administrators or other users.

Invalid timestamps or time zone mismatches are automatically corrected to the organization timezone.

### Employee Lifecycle Logging

All employee lifecycle events are automatically captured in the activity log.

Employee invitation creates a log entry with invitation email and inviting user.
Employee record creation is logged with the initial data values.
Employee profile updates are logged including which fields were modified.
Employee role assignment is logged with the previous role and new role.
Employee role change is logged with effective date and changing user.
Employee deactivation is logged with the deactivation reason and actor.
Employee reactivation is logged with the reactivating user and effective date.
Employee department changes are logged with old and new department values.
Employee position changes are logged with old and new position values.
Employment type changes are logged with the old and new employment type.

The system preserves a complete history of all employee status changes.
Deactivated employee records remain in the log for historical reference.
Reactivated employees show both the deactivation and reactivation events in their history.
Employee log entries can be filtered by employee reference for audit purposes.

### Contract Change Logging

All contract modifications are automatically recorded in the activity log.

New contract creation is logged with contract start date, end date, and pay rate.
Contract edit events capture the previous values and new values for comparison.
Contract end date updates are logged showing the effective change date.
Contract termination events are logged with the termination date and reason.
Contract reactivation is logged when an active contract is restored.
Contract pay rate changes are logged with old rate and new rate values.
Contract working hours changes are logged with the change details.

The system maintains immutable historical records of all contract changes.
Past contracts cannot be edited and their logs are preserved permanently.
Contract logs are linked to the employee contract reference for audit trails.
Contract change logs include the full state of the contract at the time of change.

### Project Lifecycle Events

All project lifecycle events are automatically recorded in the activity log.

Project creation is logged with the project name, description, and creating user.
Project editing is logged with the fields that were modified and new values.
Project archiving is logged with the archive date and archiving user.
Project completion is logged with the completion date and completing user.
Project deletion is logged with the deletion date and deleting user.
Project status changes are logged with the old status and new status values.
Project budget updates are logged with the previous and new budget hours.
Project assignment changes are logged when employees are added or removed.

Archived and completed projects retain their activity log entries for historical reference.
Deleted projects still show their activity log entries in the system.
Project lifecycle logs can be filtered by project reference for audit purposes.
The activity log captures all project changes regardless of who performed them.

### Task Status Change Logging

All task status changes are automatically captured in the activity log.

Task status transitions are logged with the old status and new status values.
Valid task status values are: open, in_progress, completed, closed.
Task status change events record the timestamp of the change.
Task status changes are attributed to the user who made the change.
Task priority changes are logged with the previous and new priority levels.
Task assignment changes are logged with the assigned user before and after.
Task due date changes are logged with the old and new due date values.

The system ensures task history logs are never overwritten or deleted.
Each status change creates a separate log entry for audit trail integrity.
Task status logs include the project reference for context.
Employees assigned to tasks can view the task's status change history.
Task history logs are preserved even when tasks are closed or deleted.
The activity log entry includes who made the change and when.

### Timesheet Status Logging

All timesheet status changes are automatically recorded in the activity log.

Timesheet draft creation is logged with the employee and week date range.
Timesheet submission is logged with the submission timestamp and submitting user.
Timesheet approval is logged with the approver and approval timestamp.
Timesheet rejection is logged with the reviewer, rejection timestamp, and reason.
Timesheet resubmission is logged when a rejected timesheet is submitted again.

The system preserves complete approval workflow history in the activity log.
Rejected timesheets retain their rejection reason in the log permanently.
Timesheet logs can be filtered by employee or date range for auditing.
Multiple status changes for the same timesheet create separate log entries.
Approval and rejection logs include the user who performed the action.

### Role Assignment Logging

All role assignment and changes are automatically captured in the activity log.

New role assignment is logged with the employee and role name.
Role change events are logged with the previous role and new role.
Custom role creation is logged with the role name and assigned permissions.
Custom role modification is logged with the fields that were changed.
Custom role deletion is logged with the role name and deleting user.

The system maintains a complete history of all role changes per employee.
Role assignment logs are linked to both the employee and role references.
Built-in role changes are logged even though the roles cannot be deleted.
Role change logs can be filtered by user, role, or date range.
Role assignment logs include the actor who made the change.

### Activity Log Viewing Permissions

Only users with org:manage permission can view the full activity log.

Users without org:manage permission cannot access activity log viewing.
The system checks org:manage permission before returning any activity log data.
Users without permission see an access denied message when attempting to view.
The permission check occurs for every activity log viewing request.
Activity log viewing is scoped to the user's currently selected organization.

When org:manage permission is revoked, the user immediately loses access.
Access is verified at the time of each request, not just at login.
Activity log entries themselves cannot be viewed by unauthorized users.
Permission is required to see even the existence of activity log entries.

### Action Type Filtering

Users can filter activity logs by specific action types.

Valid action types include: employee invited, employee deactivated, employee reactivated, contract created, contract edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, role assigned.
Filtering by action type returns only logs matching the specified type.
Multiple action types can be selected for combined filtering.
Invalid action type values are rejected with an appropriate error.
The system returns an empty result when no logs match the filter.
Filtering is case-insensitive for action type values.

The system validates action type values against the allowed list before executing the filter.

### Date Range Validation

Activity log queries support filtering by date range.

The start date and end date must be valid calendar dates.
The start date must not be after the end date.
Invalid date formats are rejected with an error message.
Future dates in activity logs are not possible as logs are historical.
The system handles leap years and timezone conversions correctly.
When only a start date is provided, the query uses that date as the beginning.
When only an end date is provided, the query uses that date as the end.

The system returns all logs within the specified date range inclusive of both boundaries.

### Activity Log Pagination

Activity log entries are paginated to handle large volumes of data.

Each page returns a configurable number of entries.
Pagination includes total entry count and total page count.
Navigation controls are provided for previous and next pages.
Invalid page numbers return an empty result or error.
The system maintains consistent ordering across paginated results.

Entries are sorted by timestamp in descending order by default.
Users can request ascending order for chronological viewing.
Page tokens are used for cursor-based pagination to ensure stability.

### Log Immutability Requirement

Activity log entries are immutable once created.

No user can modify existing activity log entries.
No user can delete activity log entries.
No user can alter the timestamp of log entries.
No user can change the user attribution on log entries.
The system prevents any operation that would modify log content.
Log entries are stored in append-only storage.
System administrators cannot edit activity log entries.
Log immutability is enforced at the storage layer.
Any attempt to modify a log entry is rejected immediately.
The system validates immutability on every read and write operation.

Immutability ensures audit trail integrity and compliance requirements.

### Log Preservation Guarantee

Activity log entries are preserved permanently and cannot be lost.

The system ensures all log entries are backed up regularly.
Log entries survive organization deletion and recreation.
Log entries survive user account deletion.
Log entries are preserved even when associated entities are deleted.
The system guarantees no data loss for activity log entries.
Archived or completed projects retain their log entries.
Deleted projects retain their log entries for audit purposes.
Deactivated employees' actions remain in the activity log.
Contract history is preserved for the full employee tenure.

The preservation guarantee applies to all log entries regardless of their age or the current state of associated entities. The system never overwrites existing log entries with new data.

## Permission Error Scenarios

Permission checks prevent unauthorized access to organization-scoped resources. Users without employee:view permission cannot see other employee records. Users without project:view permission cannot access project data. The system denies access and displays appropriate error messages. Role hierarchy cannot grant permissions beyond role assignments. Permission changes take effect immediately for new operations. Permission validation occurs on every action attempt. Users cannot override permission restrictions through workarounds. Custom permissions cannot duplicate built-in permission codes. Permission assignments are validated before role saving. Role assignment to employees requires valid permission sets. The system logs permission violation attempts for audit purposes.

### Organization Resource Isolation

All data is strictly isolated per organization. Employees in one organization cannot see or access data from another organization. Users who belong to multiple organizations only see data for their currently selected organization. The system enforces organization context on every action attempt. Resources such as employees, projects, tasks, timelogs, and timesheets are scoped to the active organization. If a user attempts to access organization-scoped data without the correct context, the request is rejected.

### Employee View Permission Denial

Users without employee:view permission cannot see other employee records in the organization. Attempting to view an employee list or individual employee details without this permission results in access denial. The system displays an error message indicating insufficient permissions. Users can only view employee information for which they have explicit permission. Permission denial occurs at the moment of the access attempt, not after data retrieval.

### Project View Permission Denial

Users without project:view permission cannot access project data in the organization. Attempting to view the project list or individual project details without this permission results in access denial. The system displays an error message indicating insufficient permissions. Users can only access project information for which they have explicit permission. Permission denial occurs at the moment of the access attempt, preventing any data exposure.

### Access Denied Error Messaging

When access is denied due to insufficient permissions, the system displays a clear error message to the user. The error message indicates that access is denied without revealing restricted information. The message does not specify which permission is missing or which resource was attempted. Users cannot infer restricted resources through error patterns or messages. Error messages are generic and consistent across all permission-based access denials.

### Role Permission Hierarchy

Role permissions follow a defined hierarchy where higher-level roles include permissions from lower-level roles. The Owner role has full access to all features and can manage roles and members. The Manager role includes permissions to manage employees, projects, and approve timesheets. The Employee role has limited permissions for time tracking and viewing own data. Built-in roles cannot be deleted or have their core permissions modified. Custom roles can only have a subset of available permissions, never exceeding their assigned users' required access.

### Immediate Permission Effect

Permission changes take effect immediately for new operations. When a user's role is changed or a permission is added or removed from a role, the change applies to the next action attempt. Previously completed actions are not retroactively affected. The system validates permissions on every action attempt, ensuring fresh permission evaluation. Users must be logged out and back in for permission changes to fully apply to their session in some cases.

### Action Permission Validation

The system validates permissions on every action attempt before performing the operation. Permission checks occur before data is accessed or modified. If the user lacks the required permission, the action is denied without any data exposure. Validation occurs at the point of action, not at the point of role assignment. Invalid permission combinations result in immediate denial of the requested operation.

### Permission Workaround Prevention

Users cannot override permission restrictions through workarounds or indirect methods. Attempting to access restricted data through alternative paths results in the same permission denial. The system validates permissions on all access points, not just primary interfaces. Permission checks are enforced server-side and cannot be bypassed through client-side modifications. Any attempt to circumvent permission restrictions is detected and blocked.

### Permission Code Uniqueness

Custom permissions must have unique codes that do not duplicate existing built-in permission codes. When creating a custom permission, the system validates that the permission code is unique within the organization. Duplicate permission codes are rejected during the role creation or editing process. Permission codes are case-sensitive and must follow the defined naming convention. Users attempting to create permissions with duplicate codes receive an error indicating the code already exists.

### Role Saving Validation

When saving a custom role, the system validates that the permission set is valid and complete. Roles cannot be saved without at least one permission assigned. Invalid permission combinations are rejected with specific error messages. The system ensures that all selected permissions are valid and available for assignment. Role changes are validated before they are persisted to prevent inconsistent state. Users receive feedback on which validations failed before the role is saved.

### Permission Set Requirement

Every role must have a defined set of permissions when created. Custom roles cannot exist without an explicit permission assignment. The permission set defines what actions users with that role can perform. Empty permission sets are not allowed and result in validation errors. Users cannot be assigned to a role without a valid permission set. Permission sets are validated during role creation and editing to ensure completeness.

### Permission Violation Auditing

The system logs all permission violation attempts for audit purposes. Each violation record includes the timestamp, user who attempted the action, the resource accessed, and the type of permission that was lacking. Audit logs are stored separately from regular activity logs to enable security analysis. Organization owners can review permission violation logs to identify potential security issues. Logged violations do not prevent the original action but provide visibility into attempted breaches.

### Permission Check Enforcement

Permission checks are enforced at all entry points to the system, including UI, API, and integration points. The system does not trust client-side permission data and validates all requests server-side. Permission enforcement occurs regardless of how the request was initiated. Failed permission checks are recorded in the activity log for compliance purposes. Permission enforcement is the first line of defense against unauthorized access.

### Role Assignment Permissions

Only users with employee:manage permission can assign roles to other employees. Attempting to assign a role without this permission results in access denial. The system validates that the user performing the assignment has the required role assignment permissions. Role assignments are logged in the activity log for audit purposes. Users cannot assign themselves to roles that grant additional permissions beyond their current role. Role changes require explicit confirmation and are immediately reflected in the system.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Employee Onboarding Journey

An organization owner can invite a new employee by providing their email address.

If the email already has an account in the system, the user is immediately added to the organization as an employee.

If the email does not have an account, a pending invitation is created. When the user signs up with that email, they are automatically added to the organization with a pending employee record.

A user with employee management permission assigns a role to the new employee, which determines their access level within the organization.

The new employee's personal information is set up through their global user profile, including display name and avatar.

An employment contract is created for the employee, including start date, pay rate, pay period, and working hours per week.

The employee can now access the organization, log time, and view their assigned projects and tasks.

### Weekly Timesheet Approval Workflow

An employee creates a draft timesheet for a specific week (Monday through Sunday).

The system automatically includes all timelogs the employee has created for that week in the timesheet.

The employee can add new timelogs or remove existing timelogs from the draft timesheet.

The employee submits the timesheet for approval. A timesheet cannot be submitted if it has no timelogs.

A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved.

A user with timesheet approval permission views all submitted timesheets.

The approver can approve the timesheet, which locks all included timelogs from further editing.

Alternatively, the approver can reject the timesheet with a rejection reason, returning it to draft status.

The employee can modify a rejected timesheet and resubmit it for approval.

Once approved, the timelogs in the timesheet are locked and cannot be edited or deleted.

### Project Management Lifecycle

A user with project management permission creates a new project, providing a name, description, and color code.

The project is created with active status and optional budget hours.

Project members are assigned to the project, each with an assigned role of member or project lead.

Project leads can create tasks within the project, including title, description, priority, and estimated hours.

Tasks can be assigned to employees who are project members.

Tasks have a parent-child relationship for subtasks, limited to one level of nesting.

Employees track time by creating timelogs that reference the project and optionally a specific task.

Project leads can update task status as work progresses: open, in_progress, completed, or closed.

When a project is completed or archived, new timelogs can no longer be added to it.

Existing timelogs on archived or completed projects are preserved for historical reporting.

### Employee Deactivation Journey

A user with employee management permission can deactivate an employee's status.

Once deactivated, the employee cannot log time or submit timesheets.

The employee's historical data, including all timelogs and timesheets, is preserved.

Deactivated employees can be reactivated at any time by a user with employee management permission.

If an employee is the sole owner of an organization, they must transfer ownership or delete the organization before they can delete their account.

When an employee account is deleted, their employee records in other organizations are marked as deactivated.

Deactivated employees retain access to view their historical data but cannot perform any new actions in the organization.

### Project Completion and Archive Workflow

A user with project management permission can mark a project as completed or archived.

When a project is archived or completed, no new timelogs can be added to the project.

All existing timelogs on the project are preserved and remain accessible for reporting.

Tasks within the project can continue to be viewed and have their status updated.

A project can only be deleted if it has no timelogs associated with it.

Once a project is archived or completed, its historical data remains available for budget reports and time analysis.

The project's budget hours, if set, continue to be tracked against actual logged hours for reporting purposes.

Project members retain access to view the archived project and its associated tasks and timelogs.

### Multi-Organization User Journey

A user who belongs to multiple organizations can switch between organizations without logging out.

When the user selects an organization, all subsequent actions are scoped to that organization.

The user's global profile (display name, avatar, phone number) is shared across all organizations.

The user has separate employee records in each organization they belong to.

Each employee record has its own role, department, and contract within that organization.

Timelogs and timesheets are always associated with a specific organization.

Users with multiple organization memberships can view and manage their roles separately in each organization.

The activity log shows actions scoped to the organization where they occurred.

### Task Lifecycle and Status Tracking

A project lead or user with project management permission creates a new task within a project.

The task is created with open status, and this change is recorded in the task history.

The task can be assigned to an employee who is a member of the project.

As work progresses, the task status changes through: open, in_progress, completed, and finally closed.

Each status change is recorded in the task history with timestamp, old status, new status, and the user who made the change.

Tasks can be filtered by status, priority, or assigned employee.

Tasks can be sorted by due date, priority, or creation date.

Subtasks can be created for a parent task, limited to one level of nesting.

Task history provides an audit trail of all status changes for accountability.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Organization Logo

Organization owners can upload a logo image for their organization.
The logo is displayed in the organization settings and throughout the platform.
Organization owners can update the logo at any time.
The logo is shared across all users in the organization.

### User Avatar

Users can upload an avatar image to their global profile.
The avatar is displayed next to the user's name throughout the platform.
Users can update their avatar at any time.
The avatar is shared across all organizations the user belongs to.