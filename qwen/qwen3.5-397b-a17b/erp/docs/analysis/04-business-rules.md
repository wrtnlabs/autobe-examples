**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Each organization must have a name during creation. The organization can optionally include a description, logo image, currency selection, timezone, and fiscal start month configuration. Organization owners have the authority to edit all organization settings. An organization can only be deleted when all pending timesheets are resolved through approval or rejection. The organization must have no active employee contracts before deletion is permitted. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's user account remains intact but loses association with the deleted organization. Each organization operates independently with its own data and configuration. Multiple organizations can exist on the platform with complete separation. Organization settings changes require owner-level permissions to execute.

### Organization Creation Requirements

Every organization must have a name during creation. The name is required and cannot be empty. Each organization can optionally include a description to provide additional context about the organization. A logo image can be uploaded during creation or added later, but is not required. The organization must select a currency for financial tracking, such as USD, EUR, or KRW. The currency selection is required. The organization must configure a timezone to ensure consistent date and time handling across all features. The timezone selection is required. The organization can optionally set a fiscal start month to align reporting periods with their financial year. If not specified, the system uses a default fiscal start month. All required fields must be provided before the organization can be created. If the organization name is missing, the creation request is rejected. If the currency is not selected, the creation request is rejected. If the timezone is not configured, the creation request is rejected.

### Organization Settings Management

Organization owners have the authority to edit all organization settings. Owners can modify the organization name, description, logo image, currency, timezone, and fiscal start month at any time. Changes to organization settings take effect immediately. Settings changes require owner-level permissions to execute. Users without owner permissions cannot edit organization settings. If a user without owner permissions attempts to edit organization settings, the request is rejected. Organization settings are shared across all employees within the organization. All employees see the same organization configuration.

### Organization Deletion Prerequisites

An organization can only be deleted when specific conditions are met. All pending timesheets must be resolved before deletion is permitted. A timesheet is considered resolved when it has been approved or rejected. If any timesheet remains in draft or submitted status, the deletion request is rejected. The organization must have no active employee contracts before deletion is permitted. An active contract is one where the end date is null or in the future. If any employee has an active contract, the deletion request is rejected. These prerequisites ensure that all time tracking and employment records are finalized before the organization is removed. If the deletion prerequisites are not met, the request is rejected with an indication of which condition failed.

### Organization Deletion Consequences

When an organization is deleted, all associated data is permanently removed. All employee records within the organization are permanently deleted. All projects and tasks belonging to the organization are permanently deleted. All timelogs and timesheets associated with the organization are permanently deleted. All departments, roles, contracts, and activity logs are permanently deleted. This deletion is irreversible and cannot be undone. The owner's user account remains intact after organization deletion. The owner retains access to the platform but is no longer associated with the deleted organization. If the owner belongs to other organizations, they can continue accessing those organizations. If the deleted organization was the owner's only organization, they can create a new organization or join an existing one through invitation.

### Multi-Tenancy Isolation

Each organization operates independently with its own data and configuration. Organizations are completely isolated from one another. Employees in one organization cannot see data from another organization. Users who belong to multiple organizations only see data for their currently selected organization. All data is strictly scoped to the organization context. When a user switches organizations, they access a completely separate set of employees, projects, tasks, and records. This isolation ensures that sensitive business information remains confidential between organizations. The platform supports multiple organizations with complete separation. Organization independence means that settings, roles, and data in one organization have no effect on any other organization.

## User Rules

Users must provide a valid email address and password during sign-up. Email addresses must be unique across the platform. Users can change their password after account creation. A single user account can belong to multiple organizations simultaneously. Users must select an organization context when logging in to access features. Users can switch between organizations without logging out and back in. Account deletion requires that the user is not the sole owner of any organization. If the user is the sole owner, they must transfer ownership or delete the organization first. When a user account is deleted, their employee records in other organizations are marked as deactivated. User profiles include display name, avatar image, and phone number that are shared across all organizations.

### User Account Creation

WHEN a user signs up, THE system SHALL require a valid email address and password.

THE system SHALL ensure email addresses are unique across the entire platform.

IF the provided email address already exists, THEN THE system SHALL reject the sign-up request.

IF the email address is invalid or the password does not meet requirements, THEN THE system SHALL reject the sign-up request.

### Password Management

THE system SHALL allow users to change their password after account creation.

WHEN a user changes their password, THE system SHALL validate the new password meets security requirements.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request.

### Organization Membership

THE system SHALL allow a single user account to belong to multiple organizations simultaneously.

WHEN a user logs in, THE system SHALL require the user to select an organization context before accessing features.

THE system SHALL allow users to switch between organizations without logging out and back in.

WHILE a user is working in an organization, THE system SHALL scope all actions and data access to the selected organization only.

### Account Deletion

IF a user is the sole owner of an organization, THEN THE system SHALL prevent account deletion until ownership is transferred or the organization is deleted.

WHEN a user requests account deletion and owns an organization, THE system SHALL require ownership transfer or organization deletion first.

WHEN a user account is deleted, THE system SHALL mark the user's employee records in other organizations as deactivated.

THE system SHALL preserve the user's employee records and historical data in other organizations after account deletion.

### User Profile

THE system SHALL maintain a global user profile shared across all organizations the user belongs to.

THE system SHALL allow users to edit their display name at any time.

WHERE a user provides an avatar image, THE system SHALL store and display it across all organizations.

WHERE a user provides a phone number, THE system SHALL store and display it across all organizations.

THE avatar image and phone number are optional fields in the user profile.

## Employee Rules

Each employee record must reference a user account and be assigned exactly one role within the organization. Department and position fields are optional for employee records. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status can only be active or deactivated. Deactivated employees cannot log time or submit timesheets for the organization. Historical data including timelogs and timesheets is preserved for deactivated employees. Deactivated employees can be reactivated to restore their access. Each employee belongs to exactly one organization context at a time. Employee records can only be edited by users with employee management permissions. Department assignment is optional and can be set to null.

### Role Assignment

Each employee record must be assigned exactly one role within the organization. Role assignment is mandatory when creating a new employee record and cannot be left empty. The role assigned to an employee determines their permissions within the organization. Role assignment can only be changed by users with employee management permissions. An employee cannot exist without a role assignment, and the system rejects any attempt to create or update an employee record without specifying a valid role.

### Employment Type

Employment type is a required field for every employee record and must be specified during employee creation. The employment type must be one of the following four values: full-time, part-time, contractor, or intern. No other employment types are accepted by the system. The employment type field cannot be null or empty. If an invalid employment type is provided, the request is rejected. Employment type can be updated by users with employee management permissions, but it must always remain one of the four valid values.

### Department and Position Fields

Department and position are optional fields for employee records. Department assignment is not required, and an employee record can have a null department value. Position or title is also optional and can be left empty. When a department is deleted from the organization, employees assigned to that department have their department field set to null automatically. Users with employee management permissions can set or clear the department and position fields at any time. The absence of a department or position value does not affect the employee's ability to perform their assigned role.

### Employee Status and Deactivation

Employee status can only be one of two values: active or deactivated. Deactivated employees cannot log time entries for the organization. Deactivated employees cannot submit timesheets for approval. When an employee is deactivated, all historical data including past timelogs and timesheets is preserved in the system. Deactivated employees can be reactivated by users with employee management permissions, which restores their ability to log time and submit timesheets. Reactivation does not affect the preserved historical data. If a request is made to log time or submit a timesheet for a deactivated employee, the request is rejected.

### Management Permissions and Organization Context

Employee records can only be created, edited, or deactivated by users with employee management permissions. Attempts to modify employee records without the required permissions are rejected. Each employee record belongs to exactly one organization context. An employee record in one organization is independent from employee records in other organizations, even if they reference the same user account. When a user switches organization context, they can only access and modify employee records within the currently selected organization. Employee data from one organization is not visible or accessible from another organization context.

## Role Rules

Three built-in roles exist in every organization: Owner, Manager, and Employee. Built-in roles cannot be deleted from the organization. Organization owners can create custom roles with specific names and permission sets. Each custom role must have a name and a defined set of permissions. Available permissions include organization management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing. Organization owners can edit custom roles to change their permissions. Custom roles can only be deleted if no employees are currently assigned to them. Each employee must be assigned exactly one role within the organization. Role assignments can be changed by users with employee management permissions. Permission sets define what actions a role can perform within the organization.

### Built-in Role Definition

Every organization has three built-in roles: Owner, Manager, and Employee. These built-in roles exist automatically when an organization is created and cannot be removed from the organization. The Owner role has full access to all organization features including managing organization settings, managing all employees, managing all projects, approving timesheets, and viewing all reports. The Manager role can manage employees, manage projects, approve timesheets, and view reports but cannot edit organization settings. The Employee role can track time, submit timesheets, and view their own data only. Built-in roles cannot be deleted under any circumstances. Built-in roles cannot be renamed. Built-in roles cannot have their permissions modified. If a user attempts to delete a built-in role, the request is rejected with an error indicating that built-in roles are protected. If a user attempts to rename a built-in role, the request is rejected with an error indicating that built-in role names are fixed.

### Custom Role Creation

Organization owners can create custom roles to define specific permission sets for their organization. When creating a custom role, a name must be provided and cannot be empty. The role name must be unique within the organization and cannot duplicate the name of any existing role (built-in or custom). A set of permissions must be selected for the custom role. A custom role cannot be created without at least one permission assigned. If the role name is missing or empty, the request is rejected. If the role name already exists in the organization, the request is rejected with an error indicating the name is already in use. If no permissions are selected, the request is rejected with an error indicating that at least one permission is required. Custom roles are marked as editable and deletable (subject to assignment constraints).

### Available Permissions

The system provides ten distinct permissions that can be assigned to custom roles. The organization management permission allows editing organization settings including name, description, logo, currency, timezone, and fiscal start month. The employee management permission allows adding new employees, editing employee records, and deactivating or reactivating employees. The employee view permission allows viewing the employee list and viewing details of any employee in the organization. The project management permission allows creating new projects, editing existing projects, archiving or completing projects, and deleting projects that have no timelogs. The project view permission allows viewing all projects and their tasks in the organization. The time management permission allows editing or deleting any employee's timelogs regardless of ownership. The time approval permission allows viewing all submitted timesheets, approving timesheets, and rejecting timesheets with a reason. The time view all permission allows viewing all employees' timelogs and timesheets but does not allow editing or approval actions. The report view permission allows accessing organization reports including time reports, project budget reports, and weekly summary reports. Each permission is independent and can be combined with any other permission in a custom role.

### Custom Role Editing and Deletion

Organization owners can edit custom roles to change their name or permission set. When editing a custom role name, the new name must be unique within the organization and cannot duplicate any existing role name. When editing permissions, any combination of the ten available permissions can be selected including adding or removing permissions. Changes to a custom role's permissions take effect immediately for all employees assigned to that role. Custom roles can be deleted only if no employees are currently assigned to them. Before deleting a custom role, all employees assigned to it must be reassigned to a different role. If a user attempts to delete a custom role that has employees assigned, the request is rejected with an error indicating that the role cannot be deleted while employees are assigned to it. The error message should include the count of employees currently assigned to the role. Deleted custom roles cannot be recovered. Employees who were assigned to a deleted role must be reassigned before the deletion can proceed.

### Role Assignment Constraints

Each employee in an organization must be assigned exactly one role at all times. An employee cannot exist without a role assignment. An employee cannot have multiple roles simultaneously within the same organization. When a new employee is added to an organization, a role must be selected during the creation process. If no role is selected during employee creation, the request is rejected with an error indicating that a role assignment is required. Role assignments can be changed by users who have the employee management permission. When changing an employee's role, the new role must be a valid role within the organization (built-in or custom). The previous role assignment is replaced entirely by the new role assignment. Role changes take effect immediately, granting or revoking permissions based on the new role. If a user without employee management permission attempts to change a role assignment, the request is rejected with an error indicating insufficient permissions. If the selected role does not exist in the organization, the request is rejected with an error indicating the role is not found.

## Department Rules

Each department must have a name during creation. Department description is optional and can be left empty. Departments can have an optional parent department for organizational hierarchy. Department nesting is limited to one level only, preventing deeper hierarchies. Deleting a department sets all employees' department assignments to null. Employee records are not deleted when their department is removed. Only users with organization management permissions can create, edit, or delete departments. All employees in the organization can view the list of departments. Department names must be unique within the organization context. Parent department references must point to existing departments within the same organization.

### Department Creation Rules

A department must have a name when created. The name cannot be empty or null. The department name must be unique within the organization. No two departments in the same organization can share the same name. A department description is optional and may be left empty during creation. A parent department is optional when creating a department. If a parent department is specified, it must be an existing department within the same organization. A department cannot reference itself as its parent. Only users with organization management permissions can create departments. When a department is created, it is immediately available for employee assignment.

### Department Hierarchy Constraints

Department hierarchy is limited to one level of nesting only. A department can have a parent department, but the parent department cannot itself have a parent. This creates a two-level structure: top-level departments and sub-departments. A sub-department cannot have its own sub-departments. When selecting a parent department, only top-level departments (those without a parent) are available as options. This constraint prevents complex multi-level hierarchies. All departments in a hierarchy must belong to the same organization. Cross-organization department references are not permitted.

### Department Edit Rules

Only users with organization management permissions can edit departments. The department name can be changed, but the new name must remain unique within the organization. The department description can be added, modified, or cleared at any time. The parent department can be changed or removed during editing. When changing the parent, the same hierarchy constraints apply: the new parent must be a top-level department within the same organization. A department cannot be set as its own parent. Editing a department does not affect employees currently assigned to it. The department's unique identifier remains unchanged throughout edits.

### Department Deletion Impact

Only users with organization management permissions can delete departments. When a department is deleted, all employees assigned to that department have their department assignment set to null. Employee records are not deleted when their department is removed. Historical records referencing the deleted department are preserved with null department references. Timelogs, timesheets, and other historical data remain intact. The deletion is permanent and cannot be undone. If a sub-department is deleted, only employees directly assigned to that sub-department are affected. Employees assigned to the parent department are not affected. Deleting a parent department does not automatically delete its sub-departments; sub-departments become top-level departments with null parent references.

### Department Viewing Rules

All employees in the organization can view the list of departments. This includes active and deactivated employees. Employees can view department names and descriptions. The department list includes information about the hierarchy structure, showing which departments are sub-departments. Employees without organization management permissions cannot create, edit, or delete departments. The department list can be filtered and searched according to the list browsing expectations defined in the List Browsing Expectations section. Department viewing does not require any special permissions beyond organization membership.

## Contract Rules

Each employee can have multiple contracts serving as historical records. Only one contract can be active at any given time for an employee. Start date is required for every contract. End date is optional, with null indicating an ongoing contract. Pay rate is required and must be a numeric value. Pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required for each contract. Notes field is optional for additional contract details. Creating a new contract automatically ends the previous active contract by setting its end date. Past contracts become immutable historical records and cannot be edited. Only the current active contract can be edited by users with employee management permissions. Employees can view their own contracts regardless of status.

### Contract Structure and Attributes

Each employee can have multiple contracts serving as a historical record of their employment terms. Every contract must have a start date. The end date is optional; when not provided, the contract is considered ongoing. Each contract requires a pay rate as a numeric value. The pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required for each contract. An optional notes field is available for additional contract details. A contract without a start date cannot be created. A contract with an invalid pay period is rejected.

### Contract Lifecycle and State Management

Only one contract can be active at any given time for an employee. When a new contract is created for an employee, the previous active contract is automatically ended by setting its end date to the day before the new contract's start date. Past contracts become immutable historical records and cannot be edited. Only the current active contract can be edited by users with employee management permissions. Attempting to edit a past contract is rejected. Attempting to create a new contract when one is already active results in the previous contract being automatically ended.

### Contract Access Permissions

Employees can view their own contracts regardless of status. Users with employee view permissions can view any employee's contracts. Users without appropriate permissions cannot access contract information. An employee attempting to view another employee's contracts without proper permissions is rejected.

## Project Rules

Each project must have a name during creation. Project description is optional and can be left empty. Color code is required for UI display and identification purposes. Project status must be one of: active, archived, or completed. Budget hours is optional and represents total estimated hours for the project. Start date and end date are both optional fields. Archived or completed projects cannot receive new timelogs from employees. Existing timelogs on archived or completed projects are preserved and remain accessible. Projects can only be deleted if they have no timelogs associated with them. Project editing requires project management permissions. Color codes help visually distinguish projects in the interface.

### Project Creation and Attributes

A project must have a name during creation. The project name cannot be empty. Project description is optional and can be left empty or omitted. A color code is required for each project and is used for UI display and visual identification purposes. Budget hours is optional and represents the total estimated hours for the project. Start date is optional and can be left unspecified. End date is optional and can be left unspecified. When budget hours is not provided, the project has no budget constraint. When start date or end date is not provided, the project has no defined timeline boundaries.

### Project Status and Timelog Restrictions

Project status must be one of: active, archived, or completed. Only active projects can receive new timelogs from employees. Archived projects cannot receive new timelogs. Completed projects cannot receive new timelogs. Existing timelogs on archived projects are preserved and remain accessible for viewing and reporting. Existing timelogs on completed projects are preserved and remain accessible for viewing and reporting. Employees attempting to log time on an archived or completed project have their request rejected. The system validates project status before accepting any timelog entry.

### Project Deletion Rules

A project can only be deleted if it has no timelogs associated with it. If a project has one or more timelogs, the deletion request is rejected. Projects with no timelogs can be deleted by users with project management permission. Deleting a project permanently removes the project record. Project deletion does not affect timelogs on other projects. Before deletion, the system checks for any existing timelogs linked to the project.

### Project Editing Constraints

Editing a project requires project management permission. Users without project management permission cannot edit project details. All project attributes can be edited: name, description, color code, status, budget hours, start date, and end date. Changing a project from active to archived or completed status immediately prevents new timelogs. Changing a project from archived or completed back to active status re-enables timelog creation. Color code changes are reflected immediately in the user interface. Project edits are recorded in the activity log with timestamp and user identification.

## ProjectMember Rules

Each project membership connects an employee to a specific project. An employee can be assigned to multiple projects simultaneously. Each membership must specify the employee's role as either member or project-lead. Project leads have special permissions to manage tasks within their assigned project. Only users with project management permissions can assign employees to projects. Only users with project management permissions can remove employees from projects. Employees can view which projects they are assigned to within the organization. Project membership requires that the employee exists in the organization. The assigned role determines what actions the employee can take within the project context. Removing an employee from a project does not affect their other project assignments.

### Project Membership Assignment and Validation

A project membership connects an employee to a specific project within the organization. Each membership represents a single assignment relationship between one employee and one project.

An employee can be assigned to multiple projects simultaneously. There is no limit to the number of projects an employee can join.

Before assigning an employee to a project, the system validates that the employee exists in the organization and has an active status. If the employee does not exist or is deactivated, the assignment request is rejected.

Only users with the project management permission can assign employees to projects. When assigning, the user must specify which role the employee will have in the project.

Only users with the project management permission can remove employees from projects. Removing an employee from a project affects only that specific project membership. The employee's assignments to other projects remain unchanged.

If a project is archived or completed, existing project memberships are preserved but no new assignments can be made to that project.

### Project Member Roles and Permissions

Each project membership must specify the employee's role as either member or project-lead. The role cannot be left unspecified or null.

The assigned role determines what actions the employee can take within the project context. This role constraint is enforced for all project-related operations.

A member can view project details, view tasks within the project, and log time to tasks they are assigned to. Members cannot create or edit tasks.

A project-lead has all member permissions plus the ability to manage tasks within their assigned project. Project leads can create new tasks, edit existing tasks, and change task status for tasks in their project.

The project-lead role does not grant permission to assign or remove other employees from the project. Only users with the project management permission at the organization level can modify project memberships.

An employee's role in a project can be changed by users with the project management permission. Changing from project-lead to member immediately removes task management capabilities for that project.

### Project Membership Visibility and Lifecycle

Employees can view which projects they are assigned to within the organization. The view includes the project name, status, and the employee's role in each project.

Employees cannot view projects they are not assigned to, unless they have the project view permission at the organization level.

When an employee is removed from a project, the membership connection is permanently deleted. Historical timelogs associated with that project membership are preserved.

If an employee is deactivated in the organization, their project memberships are preserved but they cannot actively participate in project activities. The employee can be reactivated and resume their project assignments.

If a project is deleted, all memberships for that project are automatically removed. This does not affect the employee's memberships in other projects.

## Task Rules

Each task must have a title during creation. Task description is optional and can provide additional context. Task status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Estimated hours is optional for planning purposes. Due date is optional and can be set for deadline tracking. Assigned employee is optional but must be a project member if specified. Parent task is optional for creating subtasks with one level of nesting only. Tasks can only be created within an existing project. Task editing requires project lead status or project management permissions. Assigned employees must already be members of the parent project.

### Task Title and Description Validation

Every task must have a title during creation. The title cannot be empty or contain only whitespace. If a title is not provided, the task creation request is rejected.

The task description is optional. If provided, it can contain any text to provide additional context about the task work. An empty description is valid and treated as no description. The description can be added or updated at any time by users with task editing permissions.

### Task Status and Priority Values

Task status must be one of four values: open, in-progress, completed, or closed. If an invalid status value is provided during task creation or status update, the request is rejected.

Task priority must be one of four values: low, medium, high, or urgent. If an invalid priority value is provided, the request is rejected.

Both status and priority are required fields. A task cannot be created without specifying both values. Default values are not automatically assigned; the creating user must explicitly select both status and priority.

### Task Planning Attributes

Estimated hours is an optional field used for planning purposes. If provided, it represents the expected effort required to complete the task. If not provided, the task has no estimated hours. Estimated hours can be added or updated at any time by users with task editing permissions.

Due date is an optional field used for deadline tracking. If provided, it represents the target completion date for the task. If not provided, the task has no due date. Due date can be added or updated at any time by users with task editing permissions. The due date can be in the past, present, or future with no validation restrictions.

### Task Assignment Rules

Assigned employee is an optional field. A task can exist without being assigned to any employee. If an employee is assigned to a task, that employee must already be a member of the parent project. If the specified employee is not a project member, the task creation or assignment request is rejected.

Only one employee can be assigned to a task at a time. To change the assigned employee, the current assignment is replaced with the new employee. The new employee must also be a project member.

Unassigning a task removes the employee assignment, leaving the task unassigned. This is allowed at any time by users with task editing permissions.

### Subtask Hierarchy Constraints

Parent task is an optional field used to create subtasks. If provided, the task becomes a subtask of the specified parent task.

Subtask hierarchy is limited to one level only. A task can be a subtask of a parent task, but cannot have its own subtasks if it is already a subtask. In other words, only top-level tasks can have subtasks. If an attempt is made to create a subtask under an existing subtask, the request is rejected.

A task cannot be its own parent. If the parent task reference points to the same task, the request is rejected.

The parent task must belong to the same project as the subtask. If the parent task is from a different project, the request is rejected.

### Task Creation and Project Context

Tasks can only be created within an existing project. A task cannot exist independently without a project. If the specified project does not exist, the task creation request is rejected.

The creating user must have permission to create tasks in the project. This requires either project lead status on the project or the project:manage permission. If the user lacks the required permissions, the task creation request is rejected.

The project must be in a state that allows task creation. If the project is archived or completed, new tasks cannot be created. The task creation request is rejected if the project status is archived or completed.

### Task Editing Permissions

Task editing requires project lead status or project management permissions. Only users who are project leads on the parent project or users with the project:manage permission can edit tasks.

Users without editing permissions cannot modify any task attributes including title, description, status, priority, estimated hours, due date, assigned employee, or parent task. Edit attempts by unauthorized users are rejected.

Task status changes are recorded in task history (defined in TaskHistory Rules section). Each status change creates a history entry with timestamp, old status, new status, and the user who made the change. This recording is automatic and cannot be bypassed.

## TaskHistory Rules

Task history entries are automatically created when task status changes occur. Each history entry must record the timestamp of when the change happened. The old status before the change must be captured in the history entry. The new status after the change must be recorded in the history entry. The user who made the status change must be identified in the history entry. Task history entries are immutable once created and cannot be modified. History entries provide an audit trail of all status transitions for a task. Only status changes trigger history entry creation, not other task edits. Each history entry is linked to exactly one task. The system automatically generates history entries without manual intervention.

### Automatic Status Change Recording

Task history entries are automatically generated by the system when a task status change occurs. Users cannot manually create task history entries. The system creates history entries without any manual intervention or user action. Each status transition triggers the automatic creation of exactly one history entry. The automatic generation ensures complete tracking of all status changes. Users with task editing permissions do not need to take any additional steps to record history. The system handles history creation as part of the status change operation. Failed status changes do not create history entries. Only successful status transitions result in history entry creation.

### History Entry Requirements

Each task history entry must record the timestamp of when the status change occurred. The timestamp is required and cannot be null or omitted. The old status before the change must be captured in the history entry. The new status after the change must be recorded in the history entry. The user who made the status change must be identified in the history entry. Each history entry is linked to exactly one task. A history entry cannot be associated with multiple tasks. The timestamp reflects the exact moment the status change was completed. The old status and new status values must be valid task status values. The user identification allows tracking who made each change. If the user account is deleted, the history entry retains the user reference.

### Immutability and Audit Trail

Task history entries are immutable once created and cannot be modified. Task history entries cannot be deleted after creation. The immutability ensures an accurate audit trail of all status transitions. History entries provide a complete audit trail for task status changes. The audit trail purpose is to track all transitions throughout the task lifecycle. Users can view the full history of status changes for any task. The transition tracking shows the complete progression from initial status to current status. History constraints prevent any alteration of recorded changes. Change identification is preserved through the combination of timestamp, user, old status, and new status. The audit trail supports compliance and accountability requirements. No user, including organization owners, can modify or delete history entries.

### Status Change Trigger

Only status changes trigger history entry creation. Editing other task attributes such as title, description, priority, estimated hours, due date, or assigned employee does not create history entries. Changes to task attributes other than status are not recorded in the task history. If a task is updated without changing the status, no history entry is created. The history constraint ensures the audit trail focuses on status transitions only. Users editing task details without status changes will not see new history entries. This separation keeps the history focused on workflow progression rather than all edits.

## Timelog Rules

Each timelog must have a date indicating when the work was performed. Duration in minutes is required and must be a positive integer. Project is required and must be a project the employee is assigned to. Task is optional but must belong to the selected project if specified. Description is optional and can explain what work was done. Billable flag defaults to true if not specified. Employees can only create timelogs for their own work records. Timelogs cannot be edited if they are part of an approved timesheet. Timelogs cannot be deleted if they are part of any submitted or approved timesheet. Users with time management permissions can edit or delete any employee's timelogs. Project assignment must be validated before timelog creation. Task selection must match the selected project.

### Timelog Field Requirements

Each timelog must have a date indicating when the work was performed. The date is required and cannot be empty.

Duration in minutes is required and must be a positive integer. Zero or negative durations are rejected.

Description is optional and can explain what work was done. If not provided, the timelog is created without a description.

Billable flag defaults to true if not specified. When creating a timelog, if the billable flag is not explicitly set, it is automatically marked as billable.

### Project Assignment Validation

Project is required for every timelog. A timelog cannot be created without selecting a project.

The selected project must be a project the employee is assigned to. If the employee is not a member of the project, the timelog creation is rejected.

Before timelog creation, the system validates that the employee has an active project membership with the selected project. If no membership exists, the request is rejected with an error indicating the employee is not assigned to the project.

### Task Selection Rules

Task is optional when creating a timelog. A timelog can be logged against a project without specifying a task.

If a task is specified, it must belong to the selected project. The system validates that the task is part of the same project as the timelog's project.

If the selected task does not match the selected project, the timelog creation is rejected. The task must be directly associated with the project specified in the timelog.

### Timelog Creation Permissions

Employees can only create timelogs for their own work records. An employee cannot create timelogs on behalf of another employee.

When creating a timelog, the system automatically associates it with the currently authenticated employee. Attempts to create timelogs for other employees are rejected.

### Timelog Edit and Delete Restrictions

Timelogs cannot be edited if they are part of an approved timesheet. Once a timesheet is approved, all included timelogs are locked and cannot be modified.

Timelogs cannot be deleted if they are part of any submitted or approved timesheet. If a timelog is included in a timesheet with status submitted or approved, deletion is rejected.

Users with the time:manage permission can edit or delete any employee's timelogs, overriding the standard restrictions. This permission allows modification of timelogs regardless of timesheet status, except for timelogs in approved timesheets which remain locked from editing.

## Timesheet Rules

Each timesheet represents a collection of timelogs for a specific week from Monday to Sunday. Week start date and week end dates are required and define the timesheet period. Status must be one of: draft, submitted, approved, or rejected. Total hours are calculated automatically from included timelogs. A timesheet cannot be submitted if it contains no timelogs. Only one timesheet per employee per week can exist in submitted or approved status. Approved timesheets lock all included timelogs from editing or deletion. Rejected timesheets return to draft status for modification. Rejection reason is required text when a timesheet is rejected. Submitted timestamp records when the employee submitted for approval. Reviewed timestamp and reviewer are recorded when approved or rejected.

### Timesheet Period Definition

Each timesheet represents a single week period from Monday to Sunday. The week start date (Monday) is required and defines the beginning of the timesheet period. The week end date (Sunday) is required and defines the end of the timesheet period. The system automatically calculates the week end date as six days after the week start date to ensure the period spans exactly one week. A timesheet period cannot overlap with another timesheet period for the same employee. Each employee can have only one timesheet per week.

### Timesheet Status Lifecycle

Timesheets progress through four statuses: draft, submitted, approved, and rejected. When first created, a timesheet begins in draft status. Employees can submit draft timesheets for approval. Users with timesheet approval permission can change submitted timesheets to either approved or rejected status. When a timesheet is approved, all timelogs included in that timesheet become locked and cannot be edited or deleted. When a timesheet is rejected, it automatically returns to draft status, allowing the employee to make modifications and resubmit.

### Timesheet Submission Rules

The total hours displayed on a timesheet are calculated automatically from all included timelogs. A timesheet cannot be submitted if it contains no timelogs. An employee cannot have more than one timesheet in submitted or approved status for the same week. If a timesheet already exists for a week in submitted or approved status, creating another timesheet for that week is rejected. When an employee submits a timesheet, the system records the submitted timestamp indicating when the submission occurred.

### Timesheet Review Process

When rejecting a timesheet, the reviewer must provide a rejection reason as text. The rejection reason is required and cannot be empty. When a timesheet is approved or rejected, the system records the reviewed timestamp indicating when the review action occurred. The user who approved or rejected the timesheet is recorded as the reviewer. Only users with timesheet approval permission can perform review actions on submitted timesheets.

## Timer Rules

Each employee can have at most one active timer running at any time. Starting a timer requires selecting a project from the employee's assigned projects. Task selection is optional when starting a timer. The timer records the start timestamp when activated. Description is optional and can be set or edited while the timer is running. Project and task can be edited while the timer is actively running. Stopping the timer automatically creates a timelog with the calculated duration. Duration is rounded to the nearest minute when the timer stops. Discarding the timer creates no timelog entry. The timer continues running indefinitely if not manually stopped by the employee. No automatic stop mechanism exists for forgotten timers.

### Single Active Timer Constraint

THE system SHALL enforce that each employee can have at most one active timer running at any time.

IF an employee attempts to start a new timer while another timer is already active, THEN THE system SHALL reject the request.

THE employee SHALL be required to stop or discard their existing timer before starting a new one.

This constraint applies per employee, not per organization or project.

### Timer Creation Requirements

WHEN an employee starts a timer, THE system SHALL require selection of a project from the employee's assigned projects.

IF the employee is not assigned to any project, THEN THE system SHALL prevent timer creation.

Task selection SHALL be optional when starting a timer.

IF a task is selected, THE task SHALL belong to the selected project.

THE system SHALL record the start timestamp at the moment the timer is activated.

THE start timestamp SHALL be captured with precision to the second.

### Timer Editing Rules

WHILE a timer is actively running, THE employee SHALL be able to edit the description field.

THE description field SHALL remain optional throughout the timer's lifetime.

WHILE a timer is actively running, THE employee SHALL be able to change the selected project.

THE new project SHALL be from the employee's assigned projects.

WHILE a timer is actively running, THE employee SHALL be able to change the selected task.

IF a task is changed, THE new task SHALL belong to the currently selected project.

Task selection SHALL remain optional during editing.

THE system SHALL allow editing of description, project, and task independently or together.

### Timer Stopping and Timelog Creation

WHEN an employee stops their timer, THE system SHALL automatically create a timelog entry.

THE timelog SHALL include the date from the timer's start timestamp.

THE system SHALL calculate the duration by measuring the time elapsed between start and stop.

THE calculated duration SHALL be rounded to the nearest minute.

IF the duration is less than 30 seconds, THE duration SHALL round to zero minutes.

THE timelog SHALL inherit the project, task, and description from the timer.

THE billable flag SHALL default to true on the created timelog.

### Timer Discard Behavior

WHEN an employee discards their timer, THE system SHALL delete the timer without creating a timelog.

IF a timer is discarded, no record of the tracked time SHALL be preserved.

THE discard action SHALL be irreversible.

Discarding a timer SHALL immediately free the employee to start a new timer.

### Timer Duration and Automatic Stop

THE system SHALL allow a timer to continue running indefinitely if not manually stopped by the employee.

THE system SHALL NOT implement any automatic stop mechanism for forgotten timers.

IF an employee forgets to stop their timer, THE timer SHALL continue accumulating time until manually stopped or discarded.

No maximum duration limit SHALL be enforced on running timers.

No idle detection or automatic pause SHALL be applied to active timers.

## ActivityLog Rules

Each activity log entry must have a timestamp recording when the action occurred. The user who performed the action must be identified in the entry. Action type is required and categorizes the kind of action taken. Target entity identifies what object or record the action affected. Details field provides additional context about the action. Logged actions include employee invitations, deactivations, and reactivations. Contract creation and editing actions are recorded in the activity log. Project creation, archiving, completion, and deletion are logged. Task status changes are recorded with the change details. Timesheet submissions, approvals, and rejections are logged. Role assignments and changes are recorded. Only users with organization management permissions can view the full activity log.

### Activity Log Entry Structure

Each activity log entry must have a timestamp recording when the action occurred. The user who performed the action must be identified in the entry. Action type is required and categorizes the kind of action taken. Target entity identifies what object or record the action affected. Details field provides additional context about the action when applicable.

### Logged Employee Actions

Employee invitation actions are recorded in the activity log. Employee deactivation actions are recorded in the activity log. Employee reactivation actions are recorded in the activity log. Each employee-related log entry includes the employee identifier and the email address involved in the action.

### Logged Contract Actions

Contract creation actions are recorded in the activity log. Contract editing actions are recorded in the activity log. Each contract-related log entry includes the employee identifier and the contract start date.

### Logged Project Actions

Project creation actions are recorded in the activity log. Project archiving actions are recorded in the activity log. Project completion actions are recorded in the activity log. Project deletion actions are recorded in the activity log. Each project-related log entry includes the project identifier and project name.

### Logged Task Actions

Task status change actions are recorded in the activity log. Each task status change log entry includes the task identifier, the old status value, the new status value, and the user who made the change.

### Logged Timesheet Actions

Timesheet submission actions are recorded in the activity log. Timesheet approval actions are recorded in the activity log. Timesheet rejection actions are recorded in the activity log. Each timesheet-related log entry includes the employee identifier, the week start date, and for rejections, the rejection reason.

### Logged Role Actions

Role assignment actions are recorded in the activity log. Role change actions are recorded in the activity log. Each role-related log entry includes the employee identifier, the old role name (if applicable), and the new role name.

### Activity Log Access

Only users with organization management permissions can view the full activity log. Users without organization management permissions cannot access the activity log. The activity log is paginated to support browsing large volumes of entries. The activity log can be filtered by action type, user, and date range.

### Significant Actions Definition

Only significant actions are recorded in the activity log. Significant actions are those that change the state of an entity, affect user permissions, or impact organizational data integrity. Routine viewing actions, data browsing, and read-only operations are not logged. Timer start and stop actions are not logged as they create timelogs which are tracked separately.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

The employee list can be filtered by department, employment type, and status. Users can search the employee list by name. The project list can be filtered by status. The task list can be filtered by status, priority, and assigned employee. The timelog list can be filtered by date range, project, task, and billable status. The timesheet list can be filtered by status and date range. The time report can be filtered by date range, employee, project, and billable status. The weekly summary report can be filtered by project. The activity log can be filtered by action type, user, and date range. Multiple filters can be applied simultaneously to narrow down results. Filters persist only for the current browsing session and reset when navigating away from the list. If no items match the applied filters, an empty result is shown with a message indicating no matching items found.

### Sorting Rules

The task list can be sorted by due date, priority, or creation date. Users can choose ascending or descending order for each sort option. When sorting by priority, tasks are ordered from urgent to low priority in descending order, or from low to urgent in ascending order. When sorting by due date, tasks with no due date appear at the end of the list in ascending order, or at the beginning in descending order. The default sort order for tasks is by creation date in descending order, showing newest tasks first. Other lists use their default sort order: employee list by name, project list by name, timelog list by date descending, timesheet list by week start date descending, and activity log by timestamp descending. Sorting preferences do not persist across sessions and reset to default on each visit.

### Pagination Rules

The employee list, project list, timelog list, timesheet list, and activity log are all paginated. Each page displays a fixed number of items to ensure performance and readability. Users can navigate between pages using previous and next controls. Users can jump to a specific page number if the list has multiple pages. When filters or sorting criteria change, the list returns to the first page. If an item is deleted and the current page becomes empty, the list automatically navigates to the previous page if available, otherwise to the first page. The total number of items and total number of pages are displayed to provide context. If a list contains no items, pagination controls are hidden and an empty state message is shown. Pagination is applied consistently across all paginated lists within the organization.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Constraints

The system rejects organization deletion requests when pending timesheets exist in submitted or approved status. The system rejects organization deletion requests when active employee contracts exist. The owner must resolve all pending timesheets by approving or rejecting them, and end all active contracts before deletion is permitted. When an organization deletion request is rejected, the system indicates which constraint prevented the deletion, specifying whether unresolved timesheets or active contracts are blocking the operation.

### Account Deletion Constraints

The system rejects account deletion requests when the user is the sole owner of an organization. The user must transfer ownership to another user or delete the organization before account deletion is permitted. When an account deletion request is rejected, the system indicates which organization ownership prevents the deletion. If the user belongs to multiple organizations as an employee, those employee records are marked as deactivated rather than deleted.

### Employee Invitation Conflicts

The system rejects employee invitation requests when the email address already has a pending invitation to the organization. The system accepts invitation requests for emails that already have user accounts, adding the existing user to the organization instead of creating a duplicate invitation. When an invitation request is rejected, the system indicates whether the email is already a member or has a pending invitation awaiting acceptance.

### Contract Date Validation

The system rejects contract creation requests when the end date precedes the start date. The system rejects contract creation requests when a new contract's start date overlaps with an existing active contract's period. When creating a new contract, the system automatically ends the previous active contract by setting its end date to the day before the new contract starts. When a contract creation request is rejected due to date validation failure, the system indicates which date constraint was violated.

### Project Deletion Constraints

The system rejects project deletion requests when timelogs are associated with the project. The system allows project archiving or completion regardless of existing timelogs. When a project deletion request is rejected, the system indicates that timelogs must be removed or the project must be archived instead of deleted. Users with project management permission can archive projects with timelogs, preserving historical data while preventing new timelog entries.

### Task Assignment Validation

The system rejects task assignment requests when the assigned employee is not a member of the project. The system rejects subtask creation requests when the parent task belongs to a different project. The system rejects task creation requests when attempting to create a subtask under a task that already has subtasks, enforcing one level of nesting only. When a task assignment or creation request is rejected, the system indicates which validation constraint was violated.

### Timelog Editing Constraints

The system rejects timelog edit requests when the timelog is part of an approved timesheet. The system rejects timelog delete requests when the timelog is part of a submitted or approved timesheet. The system rejects timelog creation requests when the project is not assigned to the employee creating the timelog. The system rejects timelog creation requests when the task does not belong to the selected project. When a timelog operation is rejected, the system indicates whether the constraint is due to timesheet approval status or project assignment validation.

### Timesheet Submission Conflicts

The system rejects timesheet submission requests when the timesheet contains no timelogs. The system rejects timesheet submission requests when another timesheet for the same week is already in submitted or approved status. The system rejects timesheet submission requests when the employee has no timelogs recorded for that week. When a timesheet submission request is rejected, the system indicates whether the rejection is due to empty timelogs or a conflicting timesheet for the same week.

### Timesheet Approval and Rejection

The system rejects timesheet approval requests when the timesheet is not in submitted status. The system requires a rejection reason when rejecting a timesheet. When a timesheet is rejected, it returns to draft status and the employee can modify and resubmit it. The system rejects rejection requests without a provided reason. When an approval or rejection request is rejected, the system indicates the current timesheet status and what action is required before the operation can proceed.

### Timer Conflicts

The system rejects timer start requests when the employee already has an active timer running. The employee must stop or discard their current timer before starting a new one. The system allows only one active timer per employee at any time. When a timer start request is rejected due to an existing active timer, the system indicates that the current timer must be stopped or discarded first.

### Permission Denied Scenarios

The system rejects requests to edit employee records when the user lacks the employee management permission. The system rejects requests to view all employees' timelogs when the user lacks the time view all permission. The system rejects requests to approve timesheets when the user lacks the time approve permission. The system rejects requests to manage projects when the user lacks the project management permission. The system rejects requests to edit organization settings when the user lacks the organization management permission. When a request is rejected due to insufficient permissions, the system indicates that the user does not have access to perform the requested action.

### Role Assignment Constraints

The system rejects role deletion requests when employees are currently assigned to that role. The system rejects role assignment requests when the role does not belong to the organization. The system rejects built-in role deletion requests regardless of assignment status. The three built-in roles (Owner, Manager, Employee) cannot be deleted. When a role operation is rejected, the system indicates whether the rejection is due to active employee assignments or the role being a protected built-in role.

### Department Deletion Behavior

When a department is deleted, the system sets all employees' department references to null rather than deleting the employees. The system rejects department deletion requests when the department has child departments. Deleting a department does not affect employee records; employees previously assigned to the deleted department have their department field cleared. When a department deletion request is rejected, the system indicates that child departments must be deleted or reassigned first.

### Project Status Transition Errors

The system rejects timelog creation requests for projects in archived or completed status. The system allows viewing and editing of existing timelogs on archived or completed projects. The system rejects status change requests that would violate the allowed transitions. Archived or completed projects cannot return to active status. When a timelog or status change request is rejected, the system indicates the current project status and what operations are permitted for that status.

### Contract Editing Constraints

The system rejects edit requests for past contracts as they are immutable historical records. The system allows editing of the current active contract only. The system rejects contract creation requests when required fields are missing, including start date, pay rate, pay period, or working hours per week. When a contract operation is rejected, the system indicates whether the contract is a historical record that cannot be modified or which required field is missing.