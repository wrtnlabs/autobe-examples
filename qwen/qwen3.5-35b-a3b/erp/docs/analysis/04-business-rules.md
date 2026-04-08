**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Users create an organization during initial sign-up with a name, description, logo image, currency, timezone, and fiscal start month. Organization owners can edit organization settings at any time. An organization can only be deleted by its owner if all pending timesheets have been resolved (approved or rejected) and there are no active employee contracts. When an organization is deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed from the system. The owner's user account remains in the system but is no longer associated with any organization.

### Organization Creation

A new organization is created during the initial user sign-up process. The creator becomes the owner of the organization. The organization must be provided with a name, description, currency, timezone, and fiscal start month. A logo image may be uploaded at creation time.

### Logo Image Upload

The logo image is optional during organization creation but can be added or updated by the organization owner at any time. The image is used for visual identification of the organization within the platform.

### Currency Configuration

The currency setting determines the monetary unit used for all financial calculations within the organization. Once set, the currency cannot be changed after organization creation. All pay rates, budgets, and financial reports use this configured currency.

### Timezone Configuration

The timezone setting defines the local time reference for the organization. All date and time displays, timer operations, and timesheet weeks are calculated based on this timezone. The organization owner can update the timezone setting at any time.

### Fiscal Year Configuration

The fiscal start month setting defines which month the organization's fiscal year begins. This configuration is used for financial reporting and budget tracking. The organization owner can update the fiscal start month at any time.

### Organization Settings Edit

The organization owner can edit the organization's name, description, currency, timezone, fiscal start month, and logo at any time. All changes take effect immediately and are reflected across all organization views and reports.

### Pending Timesheets Resolution

An organization can only be deleted when all pending timesheets have been resolved. A pending timesheet is considered resolved when it has been either approved or rejected by an authorized user. No timesheet with draft or submitted status may exist at the time of organization deletion.

### Active Contract Check

An organization can only be deleted when there are no active employee contracts. An active contract is defined as a contract with no end date or an end date that has not yet passed. All employee contracts must either have an end date in the past or be explicitly terminated before the organization can be deleted.

### Organization Deletion Conditions

Only the organization owner can delete the organization. The deletion can only proceed when both conditions are met: (1) all pending timesheets have been resolved (approved or rejected), and (2) there are no active employee contracts. If either condition is not satisfied, the deletion request is rejected.

### Organization Data Permanent Deletion

When an organization is deleted, all data associated with the organization is permanently removed from the system. This includes all employee records, project records, task records, timelog records, timesheet records, and activity log records. This action is irreversible and cannot be undone.

### Owner Account Separation

When an organization is deleted, the owner's user account remains in the system. The owner is no longer associated with any organization and becomes a member without organizational affiliation. The owner can create a new organization or join an existing one through invitation.

### Multi-Tenancy Isolation

All data within the platform is strictly isolated per organization. Employees in one organization cannot access or view any data from another organization. Users who belong to multiple organizations can only see and interact with data from their currently selected organization. Every operation is scoped to the active organization context.

## User Rules

Users sign up and log in using their email and password. Users can change their password from their profile. A single user can belong to multiple organizations and must select which organization to work in when logging in. All subsequent actions are scoped to the currently selected organization context. Users can switch between organizations without logging out. Users can delete their account, but if they are the sole owner of an organization, they must transfer ownership to another user or delete the organization first. When a user deletes their account, their employee records in other organizations are marked as deactivated but preserved.

### User Registration Validation

Users can sign up by providing an email address and password. The email address must be valid and unique across all users in the system. The password must meet minimum security requirements: at least 8 characters, containing at least one uppercase letter, one lowercase letter, and one number.

If the email address is already registered, the registration is rejected with an error message.

If the password does not meet the security requirements, the registration is rejected with specific guidance on what is missing.

Upon successful registration, the user account is created and the user must create their first organization before proceeding.

### Login Authentication

Users can log in by providing their registered email address and password.

The system validates the email address format and checks if the account exists.

The system validates the password against the stored credential.

If the email address is not found, the login is rejected.

If the password is incorrect, the login is rejected.

Users cannot log in if their account has been deleted or deactivated.

### Password Change

Authenticated users can change their password from their profile settings.

Users must provide their current password to verify their identity.

Users must provide a new password that meets the minimum security requirements.

If the current password is incorrect, the password change is rejected.

If the new password does not meet the security requirements, the password change is rejected.

Upon successful password change, the user must log in again with the new password. All existing active sessions are invalidated.

### Multi-Organization Membership

A single user can belong to multiple organizations simultaneously.

Users can create one organization during initial sign-up.

Users can be invited to join additional organizations by existing members with employee management permissions.

Users can accept or decline invitations to join organizations.

Users have separate roles and permissions in each organization they belong to.

Membership in one organization does not grant access to other organizations.

### Organization Context Selection

When logging in, users must select which organization to work in.

Users can only select organizations where they have an active membership (active employee record).

Deactivated employee memberships cannot be selected as the current organization context.

The selected organization becomes the active context for all subsequent actions.

All data access and operations are scoped to the currently selected organization.

Users cannot view or access data from organizations that are not their current context.

### Organization Switching

Users can switch between their organizations without logging out.

Users must have an active membership in the target organization.

Switching organizations updates the active context immediately.

All subsequent actions are performed within the newly selected organization context.

Users cannot switch to an organization where their membership has been deactivated.

When switching organizations, pending timesheets and draft data from the previous context are not automatically transferred.

### Account Deletion Conditions

Users can request deletion of their user account.

Users must have at least one active organization membership before deletion can proceed.

If the user has no memberships in any organization, deletion can proceed immediately.

If the user has memberships but is not the sole owner of any organization, deletion can proceed.

The system checks for sole ownership before allowing deletion to complete.

All required conditions must be met before deletion is executed.

### Sole Owner Restriction

If a user is the sole owner of an organization, they cannot delete their account.

The user must transfer ownership to another member with owner permissions.

The user must delete the organization before account deletion can proceed.

Ownership transfer requires another member to be assigned as the new owner.

Transfer cannot occur if there are no other members with sufficient permissions.

Sole owners must resolve ownership before account deletion is permitted.

### Ownership Transfer Requirement

Owners must transfer ownership before account deletion if they are the sole owner.

Transfer requires selecting a member to receive ownership permissions.

The recipient must have a valid active membership in the organization.

The transfer process updates all owner-level permissions to the new owner.

Upon successful transfer, the original owner retains their membership but loses owner-level access.

If transfer fails due to no eligible recipients, the owner must delete the organization instead.

### Organization Deletion Prerequisite

Before a sole owner can delete their organization, certain conditions must be met.

All pending timesheets must be resolved (approved or rejected) before deletion.

There must be no active employee contracts in the organization.

Pending invitations must be canceled before deletion.

If any condition is not met, deletion is blocked with specific guidance on what must be resolved.

Once all conditions are met, the owner can proceed with organization deletion.

### Employee Record Deactivation

When a user deletes their account, their employee records in other organizations are marked as deactivated.

Deactivated employee records are preserved and cannot be restored.

Deactivated employees cannot log time or submit timesheets.

Deactivated employees' historical data (timelogs, timesheets, contracts) remains accessible to organization managers.

Deactivated status prevents any new activity from the former user.

Deactivated records are excluded from active employee lists but remain visible in historical reports.

### Account Data Preservation

Upon account deletion, all user personal data is permanently removed from the system.

The user's email address becomes available for future registrations.

Employee records in other organizations are preserved in deactivated status.

Organization data remains intact and is not affected by user account deletion.

Activity log entries referencing the deleted user retain the action but are marked as performed by a deleted account.

All data deletion is irreversible and cannot be recovered.

## Role Rules

Each organization has three built-in roles: Owner, Manager, and Employee. These three built-in roles cannot be deleted. Owners have full access and can manage roles and members. Managers can manage employees, projects, approve timesheets, and view reports. Employees can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and set of permissions. Custom roles can be edited by owners but can only be deleted if no employees are assigned to them. Each employee in an organization must be assigned exactly one role. Role assignments can only be changed by users with the employee:manage permission.

### Built-in Role Definitions

Each organization has three built-in roles that cannot be deleted: Owner, Manager, and Employee.

The Owner role has full access to all organization features and is the only role that can manage other roles and member assignments.

The Manager role can manage employees, manage projects, approve or reject timesheets, and view organization reports.

The Employee role can track time by creating timelogs, submit timesheets for approval, and view only their own data.

These built-in roles serve as the foundational permission structure for all organizations on the platform.

### Owner Permissions Scope

Users with the Owner role can edit organization settings including name, description, logo, currency, timezone, and fiscal start month.

Owners can create, edit, and delete custom roles within their organization.

Owners can assign and change roles for any employee in the organization.

Owners have full access to all organization data and features regardless of custom role configurations.

Owners are the only role that can delete their organization, subject to deletion conditions being met.

### Manager Permissions Scope

Users with the Manager role can add, edit, and deactivate employees in the organization.

Managers can create, edit, and delete projects and tasks within the organization.

Managers can approve or reject submitted timesheets from employees.

Managers can view all organization reports including time reports, project budget reports, and weekly summaries.

Managers can view all employees' timelogs and timesheets for reporting purposes.

### Employee Permissions Scope

Users with the Employee role can create and edit their own timelogs.

Employees can submit their own timesheets for approval.

Employees can view their own timelogs, timesheets, and assigned tasks.

Employees can view their own contract information.

Employees can start and stop a timer to track time in real-time for their own work.

Employees cannot view or modify other employees' data or organization-level configurations.

### Custom Role Creation

Organization owners can create custom roles with a name and a set of selected permissions.

Available permissions include: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view.

When creating a custom role, the owner must select at least one permission.

Custom roles are created within the context of a specific organization and cannot be shared across organizations.

### Custom Role Editing

Organization owners can edit existing custom roles to change their name or modify the set of permissions.

Editing a custom role does not affect employees currently assigned to that role.

The Owner, Manager, and Employee built-in roles cannot be edited.

When editing a custom role, the owner may remove or add permissions to the role's permission set.

All changes to custom roles are recorded in the activity log.

### Custom Role Deletion Conditions

Organization owners can delete custom roles only if no employees are currently assigned to that role.

If any employee is assigned to a custom role, the role cannot be deleted.

Before deleting a custom role with assigned employees, the owner must first reassign all employees to different roles.

Built-in roles (Owner, Manager, Employee) can never be deleted under any circumstances.

Deleted custom roles cannot be recovered.

### Single Role Per Employee

Each employee in an organization must be assigned exactly one role.

An employee cannot have multiple roles simultaneously within the same organization.

When assigning a new role to an employee, the previous role is automatically removed.

New employees are assigned a role at the time they are invited to the organization.

Every employee record must reference a valid role within the organization.

### Role Assignment Changes

Only users with the employee:manage permission can change role assignments for employees.

Role changes apply immediately and affect what data and features the employee can access.

Changing an employee's role does not affect their access to other organizations where they may have different roles.

When an employee's role is changed, the change is recorded in the activity log with the timestamp and the user who made the change.

Role changes do not delete any of the employee's existing data such as timelogs, timesheets, or contracts.

### Permission Assignment Logic

Each permission controls specific system capabilities and must be explicitly assigned to a role.

Permissions follow a principle of least privilege — roles should only have the permissions necessary for their function.

Permissions cannot be granted to individual users directly; they must be assigned through a role.

An employee's effective permissions are determined by the role assigned to them.

Permission codes are predefined and cannot be customized or created by organization owners.

### Role Hierarchy Structure

Built-in roles have a fixed hierarchy: Owner has more permissions than Manager, and Manager has more permissions than Employee.

Custom roles can be created with any combination of permissions and do not follow a strict hierarchy.

An employee with a custom role may have more or fewer permissions than a Manager or Employee built-in role.

The Owner role is always at the top of the hierarchy and cannot be overridden by custom roles.

Role hierarchy determines default access patterns but custom permissions can override expected access within custom roles.

### Employee Manage Permission

The employee:manage permission is required to invite new employees to the organization.

Users with employee:manage can create, edit, and deactivate employee records.

Users with employee:manage can change employee details including department, position, and employment type.

Users with employee:manage can assign and change roles for employees.

Users without employee:manage cannot view the employee list unless they have the employee:view permission.

### Role Assignment Validation

When assigning a role to an employee, the role must exist in the organization.

The assignment fails if the specified role does not belong to the organization.

The assignment fails if trying to assign a role to an employee record that does not exist.

Role assignments are validated against the organization context — a role from one organization cannot be assigned to an employee in another organization.

All role assignment operations require the user performing the operation to have the employee:manage permission.

### Role Data Requirements

Each role must have a unique name within its organization.

Custom roles must have a name that is provided during creation and cannot be empty.

Each role has a fixed set of permissions that cannot be modified except by role owners.

Built-in roles have predefined, immutable permission sets that all organizations inherit.

Role names are used for display purposes and must be provided when roles are created or edited.

## Employee Rules

Users with employee:manage permission can invite new employees to the organization by email. If the invited email already has an account, the user is added to the organization immediately. If the email has no account, a pending invitation is created and the user is automatically added when they sign up with that email. Each employee record includes a role, optional department, optional position, employment type, and status. Employee status can be active or deactivated. Users with employee:manage permission can deactivate employees, who then cannot log time or submit timesheets. Deactivated employees' historical data is preserved and they can be reactivated later.

### Employee Invitation Flow

Users with employee:manage permission can invite new employees to the organization by sending an email invitation.

When an email invitation is sent, the system checks if an account exists for that email address.

If the email already has an account, the user is immediately added to the organization with the assigned role.

If the email has no account, a pending invitation is created. The invitation remains in pending status until the user signs up using that email address.

When a user signs up with an email that has a pending invitation, they are automatically added to the organization and assigned the appropriate role.

### Employee Status Management

Each employee has a status that can be either active or deactivated.

Users with employee:manage permission can change an employee's status from active to deactivated.

An active employee can log time and submit timesheets.

A deactivated employee cannot log time or submit timesheets.

Users with employee:manage permission can change a deactivated employee's status back to active (reactivation).

When reactivating an employee, their previous role is restored.

### Historical Data Preservation

When an employee is deactivated, all their historical data is preserved.

This includes all timelogs, timesheets, and contract history.

Deactivated employees' past timelogs and timesheets remain accessible to users with time:view_all permission.

Deactivated employees' contract history remains viewable to users with employee:view permission.

Historical data is never deleted or modified when an employee's status changes.

### Time and Timesheet Restrictions

Deactivated employees are prevented from creating new timelogs.

Deactivated employees cannot submit new timesheets.

Deactivated employees' draft timesheets cannot be modified.

Deactivated employees cannot start or stop a timer.

If a deactivated employee has pending timesheets awaiting approval, those timesheets remain in their current status but cannot be edited.

### Employee Information Assignment

When creating an employee record, users with employee:manage permission must assign a role to the employee.

The employment type can be set as full-time, part-time, contractor, or intern.

Users with employee:manage permission can assign a department to an employee.

Users with employee:manage permission can assign a position/title to an employee.

Department and position are optional fields. If not assigned, they remain unassigned.

### Employee List Viewing Permissions

Users with employee:view permission can view the list of employees in the organization.

The employee list is paginated with a maximum of 20 employees per page.

Employees in the list can be filtered by department, employment type, and status.

Employees in the list can be searched by name.

Users without employee:view permission cannot view the employee list.

### Employee Edit Permissions

Users with employee:manage permission can edit an employee's department.

Users with employee:manage permission can edit an employee's position/title.

Users with employee:manage permission can edit an employee's employment type.

Users with employee:manage permission can edit an employee's role.

Users without employee:manage permission cannot edit any employee information.

## Contract Rules

Each employee can have multiple contracts as a historical record, but only one contract can be active at a time. Each contract requires a start date, pay rate, working hours per week, and pay period. The end date is optional; if null, the contract is considered ongoing. When creating a new contract, the system automatically ends the previous active contract by setting its end date to the day before the new contract starts. Users with employee:manage permission can create and edit contracts. Creating a new contract automatically closes the previous active contract. Past contracts cannot be edited and are immutable historical records. Employees can view their own contracts, and users with employee:view permission can view any employee's contracts.

### Contract Creation Requirements

Each employee can have multiple contracts recorded as a historical record. A new contract can be created for an employee by a user with employee:manage permission. The contract creation requires the following information:

- Start date (required)
- Pay rate (required, must be a positive numeric value)
- Pay period (required, must be one of: hourly, daily, weekly, monthly)
- Working hours per week (required, must be a positive numeric value)
- End date (optional)
- Notes (optional text field)

The start date must be on or after the current date. The system validates that all required fields are provided before allowing contract creation.

### Active Contract Limitation

Each employee can have only one active contract at any given time. When creating a new contract for an employee, the system checks if the employee already has an active contract. If an active contract exists, the system automatically terminates it before creating the new contract. This ensures that no two contracts overlap in their active periods. The limitation applies to all employees in the organization regardless of their role or permissions.

### Contract End Date Specification

The end date field on a contract is optional. When the end date is not provided (null), the contract is considered ongoing and remains active until a new contract is created for the employee or the contract is terminated. If an end date is provided, the contract ends at the close of business on that date. The end date must be on or after the contract's start date. An ongoing contract (null end date) can be edited by users with employee:manage permission, but once an end date is set, the contract becomes a historical record and cannot be further edited.

### Previous Contract Auto-Termination

When creating a new contract for an employee, if there is an existing active contract, the system automatically terminates the previous contract by setting its end date to the day before the new contract's start date. This ensures no gap or overlap in contract periods. The auto-termination occurs at contract creation time and is part of the transaction. The terminated contract becomes a historical record and is preserved in the employee's contract history for reference and reporting purposes.

### Contract Edit Permissions

Only users with employee:manage permission can create or edit contracts for employees. The permission requirement is enforced at the organization level and applies to all contract operations. Users without employee:manage permission cannot view other employees' contracts unless they also have employee:view permission. Users with only employee:view permission can view contract details but cannot create, edit, or delete contracts. Organization owners automatically have employee:manage permission as part of their role permissions.

### Contract Immutability After Creation

Once a contract is created and is no longer active, it becomes immutable and cannot be edited. A contract is considered no longer active when: the end date is before the current date, or a new contract has been created that supersedes it. Past contracts serve as an immutable historical record and are preserved for audit and compliance purposes. Users can view historical contracts if they have employee:view permission, but they cannot modify any field on an inactive contract. This immutability ensures data integrity for historical employment records.

### Historical Contract Access

Employees can view their own contract history, including all past and active contracts. Users with employee:view permission can view any employee's contract history within their organization. Historical contract records are preserved indefinitely and include all original contract details at the time of creation or last modification. The contract history shows the chronological sequence of contracts for each employee, with each contract displaying its start date, end date, pay rate, pay period, working hours, and any notes. Contract history cannot be deleted, only viewed.

### Employee Contract View

Employees can view their own contract information, including active and historical contracts. This view shows the contract start date, end date (or ongoing status), pay rate, pay period, working hours per week, and any associated notes. The employee contract view is personal and employees cannot access other employees' contract information. Users with employee:view permission can view any employee's contract information as part of their management or review responsibilities. All contract views are scoped to the user's currently selected organization.

### Pay Rate Specification

Each contract requires a pay rate to be specified as a numeric value. The pay rate must be a positive number greater than zero. The pay rate must be provided in the organization's currency (e.g., USD, EUR, KRW). The pay rate is stored with up to two decimal places for precision. When viewing a contract, the pay rate is displayed with the appropriate currency symbol. Changes to pay rate are only possible during contract creation or when editing an active contract. Historical contracts retain their original pay rate without modification.

### Pay Period Options

The pay period field specifies how frequently the employee is paid and must be one of the following predefined values: hourly, daily, weekly, monthly. The pay period is a required field during contract creation and cannot be omitted. Once set, the pay period for an active contract can be changed by users with employee:manage permission. For historical contracts, the pay period is preserved as originally set. The pay period is used for calculating total compensation and for timesheet processing rules. Each pay period option has specific rules for how timesheets are generated and approved.

### Working Hours Specification

Each contract requires a working hours per week specification as a numeric value. This value represents the standard number of hours the employee is expected to work each week. The working hours per week must be a positive number and is typically between 10 and 60 hours. The standard working hours are used as a baseline for timesheet validation and for determining overtime eligibility. The working hours per week can be updated when editing an active contract but cannot be changed for historical contracts. This value is used in reports to calculate expected hours versus actual hours logged.

### Contract Start Date Requirement

The start date field is required for all contracts and must be provided during contract creation. The start date must be on or after the current date, preventing backdating of contracts. The start date determines when the contract becomes effective and when the employee begins receiving the specified pay rate and working hours. The system validates that the start date is a valid calendar date before allowing contract creation. When multiple contracts exist for an employee, the start dates define the chronological order of employment periods.

### Contract Overlapping Prevention

The system prevents the creation of contracts that would overlap in their active periods. When a new contract is created, the system checks if there would be any date range overlap with existing contracts for the same employee. If an overlap would occur, the previous contract is automatically terminated before the new one begins. This ensures that each contract has a clear, non-overlapping time period. The prevention applies to all contract operations, whether creating a new contract or editing an existing one. Users are notified if a proposed start date would conflict with existing contracts.

### Contract History Preservation

All contracts, whether active or historical, are preserved indefinitely in the system. Historical contracts cannot be deleted or modified, ensuring a complete and accurate employment history for each employee. The preservation applies to all contract fields including start date, end date, pay rate, pay period, working hours, and notes. Contract history is accessible through the employee's profile and through reports. This preservation supports compliance requirements, audits, and historical analysis. The system maintains the original values and timestamps of all contract records.

## Department Rules

Each organization can have departments with a name, description, and an optional parent department for one level of nesting. Users with org:manage permission can create, edit, and delete departments. When a department is deleted, all employees in that department have their department set to null, but the employees themselves are not deleted. Employees can view the list of departments in their organization. Departments support one level of nesting only; no sub-departments beyond the parent level.

### Department Creation Requirements

Each organization can have departments for organizing employees.

The system SHALL accept a department creation request only when the user has the org:manage permission for that organization.

A department must have a name that is unique within the organization.
The name is required and cannot be empty.
The system SHALL reject department creation when the name is empty or missing.

A department must have a description that explains the department's purpose.
The description is optional and may be left blank.

The system SHALL reject department creation when the user does not have the org:manage permission.

A department can optionally reference a parent department to create a hierarchical structure.
The parent department must exist and belong to the same organization as the new department.
The parent department reference is optional; a department without a parent is a top-level department.

When a department is successfully created, it becomes immediately available to all employees in the organization.

### Department Edit Permissions and Constraints

The system SHALL allow users with the org:manage permission to edit existing departments in their organization.

Editing a department allows changing the name or description.
The new name must be unique within the organization.

When editing a department, the system SHALL reject changes if the new name conflicts with an existing department name.
The system SHALL accept description changes even if the description is empty.

Users without the org:manage permission cannot edit department information.
Only organization owners and users assigned roles with the org:manage permission can modify departments.

Employees can view department information but cannot modify it.
The ability to edit a department is scoped to the user's currently selected organization.

Department edits take effect immediately and are reflected for all employees viewing department information.

### Department Deletion Conditions

The system SHALL allow users with the org:manage permission to delete departments in their organization.

When a department is deleted, the system SHALL set all employees currently assigned to the department to have a null department value.
The employees themselves are NOT deleted and retain all other information.
All historical data associated with the employees is preserved.

The system SHALL reject deletion when the user does not have the org:manage permission.
The system SHALL reject deletion when the department does not exist.

Deleting a department does not require special conditions beyond the org:manage permission.
The deletion immediately removes the department from all employee records.

Deleted departments cannot be restored. A new department must be created if the organizational structure needs to be re-established.

### Parent Department Relationship Rules

A department can optionally have one parent department, creating a hierarchical structure.

The system SHALL enforce that the parent department must exist in the same organization as the child department.
The system SHALL enforce that a child department can have only one parent department.
The system SHALL enforce that a parent department can have multiple child departments.

The parent department relationship is optional; most departments may not have a parent.
A top-level department has no parent and appears at the root of the department hierarchy.
A child department has exactly one parent department and appears nested beneath it.

When viewing the department list, the system SHALL display each department with its parent relationship clearly indicated.
Users can identify the hierarchical structure by examining the parent reference of each department.

### One Level Nesting Limit Enforcement

The system SHALL enforce a strict one-level nesting limit for departments.

A child department cannot have its own child department (grandchildren are not allowed).
The system SHALL reject attempts to create a department with a parent that already has a parent.

When a user attempts to create a department with a parent that already has a parent, the system SHALL reject the request.
The system SHALL return an error message indicating that the parent must be a top-level department.

This limit ensures the organizational structure remains simple and manageable.
Attempting to assign a grandchild department to a parent is not permitted.

The one-level nesting restriction applies to all department creation operations.
The one-level nesting restriction also applies to all department edit operations that modify the parent relationship.

The system SHALL validate the parent's parent status when processing any department creation or edit request.

### Employee Department Nullification on Delete

The system SHALL automatically nullify employee department assignments when their department is deleted.

When a department deletion occurs, all employees currently assigned to that department have their department field set to null.
This nullification happens automatically and immediately upon department deletion.
The employees retain their other information including position, employment type, and status.

Employees with a null department assignment can still be viewed in the employee list.
The system SHALL display these employees with a blank or null value in the department column.

Employees whose department was nullified can be reassigned to a new department later.
This reassignment requires users with the employee:manage permission.

Historical timesheets and timelogs from employees with null departments are preserved and remain accessible.
The system SHALL maintain data integrity by preserving all employee records regardless of department status.

### Department List View and Browsing

The system SHALL allow employees to view the list of all departments in their organization.

The department list SHALL show each department's name, description (if present), and parent department name (if applicable).

The department list SHALL be paginated to manage large organizations with many departments.
Users can navigate through pages to see all departments in the organization.

The system SHALL support filtering the department list by top-level departments only (no parent).
The system SHALL support filtering the department list by child departments only (with parent).
The system SHALL support viewing all departments as the default filter.

Sorting options include alphabetical order by name and by creation date.

Users with the employee:view permission can view department information.
Users without the employee:view permission cannot view the department list.

### Department Description Requirements

Each department has an optional description field that provides additional context about the department's purpose.

The description can contain text explaining the department's function, responsibilities, or goals.
The description field can hold up to 500 characters.

The description is not required when creating a department.
Departments without descriptions can be created with only a name.

Users with the org:manage permission can update the description at any time.
Other users can view the description but cannot modify it.

The description is searchable as part of the department list view.
Users can find departments by searching within descriptions as well as names.

The system SHALL trim whitespace from the beginning and end of the description when saved.
The system SHALL reject descriptions that exceed 500 characters.

### Organization Department Structure Management

All departments within an organization form a single cohesive hierarchy under one organizational namespace.
Each organization maintains its own independent department structure.
Departments from different organizations are never mixed or visible together.

The organization owner can restructure the department hierarchy at any time by creating new departments, editing existing department names and descriptions, assigning new parent relationships between departments, and deleting departments as needed.

There is no limit to the number of top-level departments an organization can have.
The only constraint is the one-level nesting rule for child departments.

The system SHALL validate that all parent-child relationships remain within the same organization.
Department structure changes are reflected immediately for all organization users.

The system SHALL maintain the department hierarchy integrity even during concurrent modifications.
Users can view the complete department structure at any time after changes are made.

### Hierarchical Department Support Summary

The system SHALL support hierarchical organization of departments with parent-child relationships.

A department can serve as a parent to multiple child departments.
A child department can have only one parent department.

The hierarchy enables representing organizational structures such as company-wide departments with specialized teams, regional offices with departmental sub-teams, and functional areas within larger departments.

The one-level nesting ensures clarity and prevents overly complex structures.
The system SHALL display the hierarchy by showing parent references in the department list.

When filtering by department in other parts of the system, employees can be filtered by their direct department assignment only.
Parent department filtering is not supported; only direct assignments are used.

The hierarchy is primarily for organizational clarity and employee management.
The hierarchy is not used for access control or data filtering decisions.

## Project Rules

Users with project:manage permission can create projects with a name, optional description, and required color code. Each project has a status of active, archived, or completed. Projects can have optional budget hours, start date, and end date. Users with project:manage permission can edit projects and archive or complete them. Once a project is archived or completed, it cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Users can delete a project only if it has no timelogs associated with it. Users with project:view permission can view all projects in the organization.

### Project Creation Requirements

Users with project:manage permission can create a project with a name and an optional description.
Every project must have a color code assigned at creation.
The color code is required and cannot be left blank.
The color code is used for visual display in the user interface to distinguish projects.
The project is created with an initial status of active.
Each project may optionally include budget hours, a start date, and an end date.
Project creation automatically associates the project with the user's organization.
If the project name is missing, the request is rejected.
If the color code is not provided, the request is rejected.

### Project Edit Permissions

Users with project:manage permission can edit any project in the organization.
Editing allows modification of the project name, description, color code, budget hours, start date, end date, and status.
Users without project:manage permission cannot modify any project attributes.
Project changes are recorded in the activity log with timestamp attribution.
Editing a project does not affect existing timelogs on the project.
Project editing is allowed for projects in any status including archived and completed.

### Project Status Management

A project has one of three statuses: active, archived, or completed.
An active project can receive new timelogs.
Users with project:manage permission can transition a project from active to archived.
Users with project:manage permission can transition a project from active to completed.
Once a project transitions to archived or completed, it cannot be reverted to active status.
Project status changes are recorded in the activity log with timestamp attribution.
The initial status of a newly created project is always active.

### Archive Project Rules

Users with project:manage permission can archive a project.
Once a project is archived, it cannot receive new timelogs.
Existing timelogs on the project are preserved and remain accessible for reporting.
Archived projects remain viewable by users with project:view permission.
Archiving a project does not delete associated tasks or task history.
Timelogs submitted to timesheets before archiving remain associated with the project for historical records.
Attempting to create a timelog on an archived project is rejected.

### Complete Project Rules

Users with project:manage permission can mark a project as completed.
Once a project is completed, it cannot receive new timelogs.
Existing timelogs on the project are preserved and remain accessible for reporting.
Completed projects indicate final project closure with all work finished.
A project can be transitioned directly from active to completed status without archiving.
Timelogs submitted to timesheets before completion remain associated with the project for historical records.
Attempting to create a timelog on a completed project is rejected.

### Budget Hours Specification

Projects may optionally include a budget hours value.
Budget hours represent the total estimated hours for the project.
Projects without budget hours are not included in budget utilization reports.
Budget hours can be modified by users with project:manage permission.
Budget hours can be set to any positive numeric value.
Budget hours are used for comparison with actual logged hours in the project budget report.
Budget hours cannot be negative.

### Project Date Range

Projects may optionally include a start date and an end date.
When both dates are specified, the end date must not precede the start date.
If the end date precedes the start date, the request is rejected.
Projects without specified dates have no date range constraints.
Start date and end date can be modified by users with project:manage permission.
Project status changes do not automatically affect start and end dates.
Date range information is used for project planning and reporting purposes.

### Project Deletion Conditions

Users with project:manage permission can delete a project only if it has no timelogs associated with it.
Projects with existing timelogs cannot be deleted to preserve historical time tracking data.
If a project has no timelogs, deletion permanently removes the project, its tasks, and all associated data.
Deleted projects are irrecoverable and cannot be restored.
Attempting to delete a project with existing timelogs is rejected.
Project deletion requires explicit confirmation due to the irreversible nature of the action.

### Project View Permissions

Users with project:view permission can view all projects in the organization.
Users without project:view permission cannot access project information.
The project list supports pagination for efficient browsing.
Projects can be filtered by status: active, archived, or completed.
Users with project:view permission can view project details including name, description, and status.
Project list browsing respects the user's organization context.
Users can sort the project list by name, status, or date created.

### Timelog Restriction on Archived Projects

New timelogs cannot be created on projects with status archived.
Timelog creation attempts on archived projects are rejected.
The system prevents time tracking on archived projects.
Employees cannot assign timelogs to archived projects through the timer feature.
Existing timelogs on archived projects remain accessible and unchanged.
Archived projects maintain their timelog data for historical reporting purposes.

### Timelog Restriction on Completed Projects

New timelogs cannot be created on projects with status completed.
Timelog creation attempts on completed projects are rejected.
The system prevents time tracking on completed projects.
Employees cannot assign timelogs to completed projects through the timer feature.
Existing timelogs on completed projects remain accessible and unchanged.
Completed projects maintain their timelog data for historical reporting purposes.

### Timelog Preservation on Archive

All timelogs on a project are preserved when the project is archived.
Preserved timelogs remain fully accessible for viewing and reporting.
Timelogs on archived projects retain their original date, duration, and description.
Timelogs submitted to timesheets before archiving maintain their approval status.
Archived project timelogs can be included in historical reports and audits.
Timelog preservation on archive ensures complete project history is maintained.

### Timelog Preservation on Completion

All timelogs on a project are preserved when the project is completed.
Preserved timelogs remain fully accessible for viewing and reporting.
Timelogs on completed projects retain their original date, duration, and description.
Timelogs submitted to timesheets before completion maintain their approval status.
Completed project timelogs can be included in final project reports and audits.
Timelog preservation on completion ensures complete project history is maintained.

### Color Code Requirement

Every project must have a color code assigned at creation.
The color code is required and cannot be left blank or empty.
Project creation requests without a color code are rejected.
The color code is used for visual display in the user interface to distinguish projects.
Color codes can be modified by users with project:manage permission after creation.
The color code requirement applies to all project creation regardless of other attributes.
Color code values are validated to ensure they are properly formatted for display purposes.

### Project Status Transition Errors

Attempting to archive a project that is already archived is rejected.
Attempting to complete a project that is already completed is rejected.
Attempting to transition a project to archived from completed status is rejected.
Attempting to transition a project to completed from archived status is rejected.
Transitioning a project to archived or completed from any status other than active is rejected.
Status transition errors are recorded in the activity log with appropriate error messages.
The project retains its current status when a transition request fails.

## ProjectMembership Rules

Users with project:manage permission can assign employees to projects. An employee can be assigned to multiple projects simultaneously. Each project membership has an assigned role of either member or project-lead. Project leads can manage tasks within their assigned project. Users with project:manage permission can remove employees from projects. Employees can view which projects they are assigned to. Multiple project assignments are allowed for a single employee. Each membership defines the employee's role within that specific project.

### Employee Project Assignment

Users with `project:manage` permission can assign employees to projects. An employee can be assigned to a project only if the employee belongs to the same organization as the project. Assignment requires selecting an assigned role of either member or project-lead for the employee within that project.

### Multiple Project Membership

A single employee can be assigned to multiple projects simultaneously without restriction. Each project assignment is independent and maintains its own assigned role and permissions within that project context. There is no limit on the number of projects an employee can be assigned to.

### Project-Member Role

Employees assigned with the member role can view project details and tasks within the project. Members can view timelogs and timesheets related to the project if they have `time:view_all` permission. Members cannot create, edit, or delete tasks within the project.

### Project-Lead Role

Employees assigned with the project-lead role have additional permissions within their assigned project. Project leads can create, edit, and delete tasks within their project. Project leads can manage task assignments and status changes for tasks in their project.

### Project-Lead Task Management

Project leads can assign tasks to other employees who are members of the same project. Task assignments by project leads must reference employees who are already project members. Project leads can modify task details including title, description, status, priority, estimated hours, and due date for tasks in their project.

### Project Removal Rules

Users with `project:manage` permission can remove employees from projects. When an employee is removed from a project, their project membership is terminated but their historical data (timelogs, timesheets) remains intact. Employees cannot remove themselves from projects where they have the project-lead role without first assigning project-lead responsibilities to another member.

### Employee Project View

All employees can view the list of projects they are assigned to. Project visibility shows the assigned role (member or project-lead) for each project assignment. Employees with `project:view` permission can view all projects in the organization regardless of their assignments.

### Assignment Role Specification

Each project membership record specifies one assigned role: either member or project-lead. The assigned role cannot be changed to a different role without removing and re-adding the employee to the project. The assigned role determines the employee's permissions and capabilities within that specific project context.

### Project Membership Structure

A project membership consists of three required elements: the assigned employee, the project reference, and the assigned role (member or project-lead). Project memberships are persistent records that track an employee's relationship with a project over time. When an employee is removed from a project, the membership record is retained for historical purposes.

### Cross-Project Assignment

Employees can maintain project memberships across different projects with different assigned roles in each. An employee can be a project-lead in one project while being a member in another project simultaneously. Each project membership operates independently without affecting other project assignments for the same employee.

## Task Rules

Project leads or users with project:manage permission can create tasks within a project. Each task requires a title and can have an optional description, status, priority, estimated hours, and due date. The assigned employee must be a member of the project. Tasks support one level of nesting with a parent task for subtasks. Task status can change between open, in-progress, completed, and closed. Each status change is recorded in task history. Employees can view tasks in projects they are assigned to. Tasks can be filtered by status, priority, and assigned employee, and sorted by due date, priority, or creation date.

### Task Creation Permissions

Project leads or users with project:manage permission can create tasks within any project.

When creating a task, the user must be associated with the project (either as project-lead or have project:manage permission on that project).

If the user does not have permission to manage the project, the request is rejected.

The project to which the task belongs must exist and must be in an active status.
If the project does not exist, the request is rejected.
If the project is archived or completed, the request is rejected.

### Task Title Requirement

Each task must have a title.

The title is required and cannot be empty.

If a task is created without a title, the request is rejected.

When updating a task, the title cannot be changed to an empty value.
If an update attempt sets the title to empty, the request is rejected.

### Task Status Changes

Task status can be: open, in-progress, completed, or closed.

A task can transition from open to in-progress.
A task can transition from in-progress to completed.
A task can transition from in-progress to open.
A task can transition from completed to closed.

A task can be closed directly from open status.

A completed task cannot transition back to open or in-progress status.
Once a task is closed, it cannot be reopened.

If an invalid status transition is attempted, the request is rejected.
The system will not allow status changes that violate the allowed transitions.

The current status of a task must always be one of the four defined statuses.
If a task is created with an invalid status, the request is rejected.

### Task Priority Levels

Tasks can be assigned one of four priority levels: low, medium, high, or urgent.

The priority level is optional when creating a task.
If no priority is specified, the task has no assigned priority.

Priority levels cannot be changed to an undefined or null value.
Once a priority is assigned, it must be changed to one of the four valid levels.

If an invalid priority level is specified during creation or update, the request is rejected.
The system will not accept priority values outside the four defined levels.

### Estimated Hours Specification

Estimated hours is an optional field for tasks.
If no estimated hours are specified, the task is created with no estimated hours.

When estimated hours are specified, they must be a numeric value.

Users with project:manage permission or project leads can update the estimated hours of tasks in their projects.

If the estimated hours update results in an invalid value, the request is rejected.

### Due Date Specification

Due date is an optional field for tasks.
If no due date is specified, the task is created with no due date.

When a due date is specified, it must be a valid date value.
Invalid date formats are not accepted.

Users with project:manage permission or project leads can update the due date of tasks in their projects.

A task can have its due date removed by setting it to null.

If the due date update results in an invalid date value, the request is rejected.

### Task Assignment Validation

An employee can be assigned to a task only if they are a member of the project.

When creating a task, if an assigned employee is specified, that employee must be a project member.

If the assigned employee is not a member of the project, the request is rejected.

When updating a task assignment, the new employee must be a member of the project.
If the new employee is not a project member, the request is rejected.

A task can have at most one assigned employee.
Multiple employees cannot be assigned to the same task.

If a task already has an assigned employee, assigning a different employee replaces the previous assignment.

If no employee is to be assigned, the assigned employee field can be set to null.

### Subtask Nesting Limit

Tasks can have a parent task to create subtasks.

A task can have at most one parent task.
A task cannot have multiple parent tasks.

Subtask nesting is limited to one level.
A subtask cannot have its own subtasks.

If a subtask is specified as a parent for another task, the request is rejected.

A task cannot be its own parent.
Self-referencing parent relationships are not allowed.

### Parent Task Relationship

A task can reference at most one parent task.

The parent task must belong to the same project as the subtask.

If the parent task belongs to a different project, the request is rejected.

The parent task must exist and must be in an active state.
If the parent task does not exist or has been deleted, the request is rejected.

A task cannot be assigned as a parent if it is already a subtask of another task.
Tasks can only be parents if they have no parent.

When a parent task is deleted, the subtasks are unaffected but lose their parent reference.

A task that has no parent is considered a top-level task.
Top-level tasks cannot have a parent task assigned.

### Task History Recording

Every task status change is recorded in task history.

Each history entry records: timestamp, previous status, new status, and the user who made the change.

The history is immutable once created.
History entries cannot be edited or deleted.

If a task status is changed multiple times, each change creates a separate history entry.

The history is ordered chronologically with the most recent change listed first.

Users can view the complete history of status changes for any task they can access.

A task with no status changes has no history entries.

History entries are created automatically when status changes occur and cannot be manually created.

### Task Filter by Status

Tasks can be filtered by their current status.

The available filter values are: open, in-progress, completed, closed.

When filtering by status, only tasks with the specified status are returned.

Multiple status values can be used in a single filter request.

If an invalid status value is used as a filter, the request is rejected.

Tasks with no status are not returned by any status filter.

The status filter operates independently of other filters and can be combined with priority and assignment filters.

When no status filter is applied, all tasks are returned regardless of status.

### Task Filter by Priority

Tasks can be filtered by their assigned priority level.

The available filter values are: low, medium, high, urgent.

When filtering by priority, only tasks with the specified priority are returned.

Multiple priority values can be used in a single filter request.

If a task has no priority assigned, it is not returned by priority filters.

The priority filter can be combined with status and assignment filters.

When no priority filter is applied, tasks with or without priority are returned.

### Task Filter by Assignment

Tasks can be filtered by assigned employee.

When filtering by assigned employee, only tasks assigned to that employee are returned.

Tasks that have no assigned employee are not returned by employee filters.

Multiple employees can be specified in a single filter request.

The employee filter can be combined with status and priority filters.

When no employee filter is applied, tasks assigned to any employee are returned.

A user can only filter tasks by employees they have permission to view.

### Task Sorting Options

Tasks can be sorted by due date.

Sorting by due date orders tasks with due dates first, then tasks without due dates.

Tasks can be sorted by priority.

Sorting by priority orders tasks by urgency: urgent, high, medium, low, then unassigned.

Tasks can be sorted by creation date.

Sorting by creation date orders tasks from most recently created to oldest.

When multiple sort criteria are specified, they are applied in order.

Tasks with null values for the sort field are placed at the end of the results.

Sorting order is ascending by default unless explicitly specified as descending.

### Task Browsing and Display

Tasks are displayed in paginated lists.

The default page size is 20 tasks per page.

Users can request different page sizes within system limits.

Each page of results shows task summary information including title, status, priority, and assigned employee.

Pagination does not affect filtering or sorting operations.

The total number of tasks matching the criteria is returned with the results.

Users can navigate between pages using page numbers.

Tasks without access are never included in results, even if they match other filters.

## TaskHistory Rules

Every task status change is recorded as an entry in task history. Each history entry records the timestamp of the change, the old status, the new status, and the user who made the change. Task history cannot be modified or deleted; it is an immutable audit trail. History entries are created automatically whenever a task's status transitions from one state to another. Project leads and users with project:manage permission can view task history for tasks in their projects.

### Task Status Change Logging

THE system SHALL automatically record every task status change as a history entry.

Task status changes occur when a task transitions between statuses: from open to in-progress, from in-progress to completed, or from completed to closed. The system captures each transition automatically without requiring manual entry.

A history entry is only created when the status actually differs from the previous status. If a task is set to a status it already has, no history entry is created.

Users with project:manage permission can change the status of any task in projects they manage. Project leads can change the status of tasks in projects where they have been assigned as leads. All other users cannot modify task status.

If a user attempts to change a task's status without appropriate permissions, the request is rejected. If a task does not exist, the request is rejected. If a task status change is requested but the status value is not one of the valid statuses (open, in-progress, completed, closed), the request is rejected.

### History Entry Structure

Each task history entry contains the following information:

- When the change occurred
- The previous status before the change
- The new status after the change
- The user who made the status change
- The task to which the history entry belongs

The history entry is created immediately when the status change is successfully processed. The entry cannot be modified, deleted, or undone after creation. History entries are permanent records that form an audit trail.

When the status change occurs is recorded in the system's local time zone and represents the exact moment the status change was committed. The time record includes the date and time down to the second.

The history entry structure ensures that anyone reviewing the task history can understand exactly what changed, when it changed, who made the change, and what the state was before and after the change.

Error conditions:
- If the system cannot create a history entry due to a technical error, the status change operation fails and the task remains in its original status
- If a history entry cannot be retrieved, it is treated as a system error and the user is notified

### Status Change Details

Each history entry captures both the status before the change and the status after the change. This allows users to see the exact transition that occurred.

The status before the change shows what state the task was in immediately prior to the modification. The status after the change shows what state the task is now in after the modification is complete.

This before-and-after information enables users to track the progression of a task through different states and understand how it evolved over time.

The status before and after information is stored together as a single atomic record. Users cannot view the before and after values independently; they must view them as part of the complete history entry.

### User Attribution

Each history entry is attributed to the specific user who made the status change. This attribution identifies exactly who performed the action, providing accountability and traceability.

The user attribution is captured at the moment the status change is submitted. It cannot be changed after the entry is created. The attribution ensures that each action can be traced back to its source.

If a user account is deactivated or deleted, the history entries retain the attribution to the original user. The attribution displays the user's name or identifier at the time the change was made, allowing historical context to be preserved.

Users with project:view permission can view the user attribution for history entries in tasks they can access. Users without appropriate permissions cannot view who made specific status changes.

Error conditions:
- If the user who made a status change has been deleted from the system, the history entry retains their attribution using their original name and identifier
- If user attribution information is missing for any reason, the entry displays a generic "System" attribution with an internal error flag

### History Immutability

Task history entries are immutable and cannot be modified, deleted, or altered after creation. Once an entry is recorded, it becomes a permanent part of the task's history.

No user, including system administrators, can change the content of a history entry or remove it from the history. This ensures the integrity of the audit trail.

The immutability of history entries applies to all fields within the entry: the time the change occurred, the status before the change, the status after the change, and the user attribution.

If a data corruption or system error is detected in a history entry, the entry cannot be repaired. Instead, a new history entry is created to document the discovery and resolution of the issue, preserving the original (potentially corrupted) entry.

Error conditions:
- Attempts to modify or delete a history entry are always rejected
- If the system detects corruption in a history entry, it reports the error but does not alter the original entry

### Audit Trail Preservation

Task history forms an immutable audit trail that must be preserved for the lifetime of the task. Once a history entry is created, it cannot be modified, deleted, or hidden from users with appropriate permissions.

The audit trail provides a complete record of all status changes throughout the task's lifecycle. This includes the current status and all previous statuses the task has held.

Users with project:manage permission can view the complete audit trail for tasks in their projects. Users who are project leads can view the audit trail for tasks in projects where they have lead assignment. Other users may have limited access based on their project:view permissions.

The audit trail can be filtered and sorted by when the change occurred, allowing users to focus on specific time periods or view changes in chronological order. The system preserves all history entries regardless of the task's current status.

Even if a task is deleted from a project, its history entries are preserved as part of the organizational audit trail. This ensures that historical context is never lost.

Error conditions:
- If a history entry cannot be retrieved due to corruption, the system reports an error but preserves the entry in its original state
- If the audit trail storage reaches capacity, the oldest entries are retained and newer entries may be queued for processing until space becomes available

### Automatic History Creation

History entries are created automatically whenever a task status is changed. Users do not need to manually create history entries or request that they be created.

The system creates the history entry as part of the same operation that changes the task status. The history entry creation is atomic with the status change, meaning either both happen or neither happens.

The automatic creation of history entries ensures that no status change can occur without being recorded. This prevents users from circumventing the history tracking mechanism.

The timing of history entry creation is immediate. The entry is created at the same moment the status change is committed to the system, ensuring that the chronological record is accurate.

Error conditions:
- If the history entry cannot be created due to a system error, the status change operation fails and the task remains in its original status
- The system does not allow users to bypass history entry creation by using special parameters or workarounds

## Timelog Rules

Employees can create timelogs with a date, duration in minutes, required project, optional task, optional description, and a billable flag. Timelogs can only be created for projects the employee is assigned to. If a task is selected, it must belong to the selected project. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if they are not part of an approved timesheet. Employees can delete their own timelogs only if they are not part of any submitted or approved timesheet. Users with time:manage permission can edit or delete any employee's timelogs. Timelogs can be filtered by date range, project, task, and billable status.

### Timelog Creation

Employees can create a timelog with a date, duration in minutes, a required project, an optional task, an optional description, and a billable flag that defaults to true.

The date must be a valid calendar date.

The duration must be a positive integer representing minutes.

The project must be one that the employee is assigned to.

If a task is selected, it must belong to the selected project.

The description is optional and may be left blank.

The billable flag can be toggled between true and false at creation time.

If the selected project does not belong to the employee's organization, the timelog creation is rejected.

If the selected task does not belong to the selected project, the timelog creation is rejected.

If the duration is zero or negative, the timelog creation is rejected.

### Timelog Ownership

Employees can only create timelogs for themselves.

Employees cannot create timelogs on behalf of other employees.

Timelogs are permanently associated with the employee who created them.

An employee can only view and manage their own timelogs unless they have additional permissions.

### Timelog Edit Restrictions

Employees can edit their own timelogs only if the timelog is not part of an approved timesheet.

If a timelog is included in a timesheet that is in draft status, employees may edit it.

If a timelog is included in a timesheet that is in submitted status, employees may edit it.

If a timelog is included in a timesheet that is in rejected status, employees may edit it.

Users with time:manage permission can edit any employee's timelogs regardless of timesheet status.

If a timelog is part of an approved timesheet, the edit request is rejected.

### Timelog Deletion Restrictions

Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet.

If a timelog is included in a timesheet with draft status, employees may delete it.

If a timelog is included in a timesheet with rejected status, employees may delete it.

If a timelog is included in a timesheet with submitted status, the deletion request is rejected.

If a timelog is included in a timesheet with approved status, the deletion request is rejected.

Users with time:manage permission can delete any employee's timelogs regardless of timesheet status.

### Billable Status Flag

Each timelog has a billable flag that can be true or false.

The billable flag defaults to true when a timelog is created.

Employees can toggle the billable flag when creating a timelog.

Employees can toggle the billable flag when editing a timelog (if not in approved timesheet).

The billable status is used for filtering timelogs.

The billable status is included in report calculations.

### Time Management Permissions

Users with time:manage permission can edit any employee's timelogs regardless of timesheet status.

Users with time:manage permission can delete any employee's timelogs regardless of timesheet status.

Users with time:manage permission override all timelog ownership restrictions.

Users with time:manage permission can edit timelogs in approved timesheets.

Users with time:manage permission can delete timelogs from submitted timesheets.

### Time View All Permissions

Users with time:view_all permission can view all employees' timelogs.

Users with time:view_all permission can see timelogs created by any employee in the organization.

Users with time:view_all permission cannot edit or delete timelogs unless they also have time:manage permission.

Users with time:view_all permission can view timelogs regardless of project assignment.

### Timelog Filtering

Timelogs can be filtered by date range.

Timelogs can be filtered by project.

Timelogs can be filtered by task.

Timelogs can be filtered by billable status.

Multiple filters can be applied simultaneously.

If no filters are applied, all timelogs accessible to the user are returned.

The date range filter accepts a start date and end date to define the range.

## Timesheet Rules

A timesheet covers a specific week from Monday to Sunday and is a collection of timelogs. Employees can create a draft timesheet for a week, which automatically includes all their timelogs for that week. Employees can add or remove timelogs from a draft timesheet. A timesheet cannot be submitted if it has no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Users with time:approve permission can view all submitted timesheets. Approved timesheets lock all included timelogs from being edited or deleted. Timesheets can be rejected with a required reason, returning them to draft status for employee modification.

### Timesheet Week Definition

A timesheet covers a specific calendar week, defined from Monday to Sunday. The week start date (Monday) and week end date (Sunday) are automatically calculated based on the selected week. Each timesheet is uniquely identified by the employee and the week it covers.

### Draft Timesheet Creation and Automatic Timelog Inclusion

Employees can create a draft timesheet for any week. When creating a draft timesheet, the system automatically includes all timelogs the employee has logged for that week. This ensures no time entries are forgotten when submitting for approval. Employees can then review, add, or remove timelogs from the draft before submission.

### Timesheet Submission Restrictions and Duplicate Week Prevention

A draft timesheet cannot be submitted if it contains no timelogs. A timesheet must have at least one timelog to be submitted for approval. This prevents submission of empty or incomplete timesheets.

A timesheet cannot be submitted if another timesheet for the same week is already in submitted or approved status. This prevents duplicate submissions for the same time period. The system checks all existing timesheets for the employee and week combination before allowing submission.

### Timesheet View Permissions and Approval Flow

Users with the time:approve permission can view all submitted timesheets in the organization. This includes timesheets from all employees. Users without this permission can only view timesheets they own.

Approved timesheets lock all included timelogs from being edited or deleted. Once a timesheet is approved, the timelogs it contains become immutable to ensure data integrity for payroll and reporting purposes. Users with time:manage permission cannot override this protection.

Rejected timesheets return to draft status. The employee can modify the timesheet and resubmit it for approval after addressing the rejection reason. Once a timesheet is approved, it cannot be reverted to draft status or modified in any way.

### Timesheet Approval, Rejection Requirements, and Reviewer Attribution

Users with the time:approve permission can approve submitted timesheets. When a timesheet is approved, all included timelogs become locked and cannot be edited or deleted. The approval action records the reviewer (the user who performed the approval) and the timestamp of approval.

Users with the time:approve permission can reject submitted timesheets. Rejection requires a mandatory reason that must be provided in text format. This reason explains why the timesheet was rejected and helps the employee understand what needs to be corrected. The rejection records the reviewer, timestamp, and rejection reason.

Rejected timesheets return to draft status. The employee can modify the rejected timesheet and resubmit it for approval once the issues are addressed. A rejected timesheet can be resubmitted multiple times until it is approved.

### Timesheet Edit Restrictions and Locked Timelog Protection

Employees can modify draft timesheets by adding new timelogs, removing existing timelogs, or editing timelog descriptions. Draft timesheets can be modified until they are submitted for approval.

Once a timesheet is submitted (but not yet approved or rejected), employees cannot modify it. Modification is only allowed in draft status.

After a timesheet is approved, all included timelogs are permanently locked. No modifications, deletions, or any changes to timelogs within an approved timesheet are permitted, regardless of user role or permission level.

### Timesheet Status Transitions

Timesheets have the following status states: draft, submitted, approved, and rejected.

Transitions from draft to submitted occur when the employee submits the timesheet for approval. This transition is only allowed if the timesheet has at least one timelog and no other timesheet for the same week exists in submitted or approved status.

Transitions from submitted to approved occur when a user with time:approve permission approves the timesheet.

Transitions from submitted to rejected occur when a user with time:approve permission rejects the timesheet with a required reason.

Transitions from rejected to draft occur automatically when a timesheet is rejected. The employee can then modify the timesheet and submit it again.

Approved timesheets remain in approved status permanently and cannot transition to any other status.

## Timer Rules

Employees can start a timer to track time in real-time. Each employee can have at most one active timer at a time. Starting a timer requires selecting a project and optionally a task. The timer records the start timestamp, project, task, and description. Employees can stop their timer, which creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard their timer without creating a timelog. Employees can edit the description and project/task of a running timer. If a timer is forgotten, it continues running indefinitely without automatic stop.

### Timer Start Requirements

Employees can start a timer to track time in real-time. Starting a timer requires selecting a project that the employee is assigned to. A task is optionally selected during timer start. If a task is selected, it must belong to the project chosen for the timer. The timer records the start timestamp, selected project, optionally selected task, and an initial description.

### Single Active Timer Restriction

Each employee can have at most one active timer at a time. If an employee attempts to start a new timer while another timer is already running, the request is rejected. The existing timer must be stopped or discarded before starting a new one.

### Timer Stop Creates Timelog

When an employee stops their timer, the system creates a timelog with the calculated duration. The timelog is automatically associated with the employee who started the timer, the selected project, and optionally the selected task. The timelog includes the duration, date of stopping, description, project, and optionally the task.

### Timer Discard Option

Employees can discard their running timer without creating a timelog. Discarding deletes the timer session entirely and creates no timelog record. The discarded timer cannot be recovered or recreated automatically.

### Timer Duration Calculation

The duration of a timer is calculated from the start timestamp to the stop timestamp. The duration represents the total elapsed time in minutes from when the timer was started to when it was stopped. The calculation is based on the actual time difference between when the timer was started and when it was stopped.

### Duration Rounding Rule

Timer duration is rounded to the nearest minute when creating a timelog. For example, 2 minutes and 30 seconds rounds to 3 minutes, while 2 minutes and 29 seconds rounds to 2 minutes. The rounded duration is recorded as the timelog duration in the system.

### Running Timer Editing

Employees can edit the description and project/task of a running timer at any time before stopping it. Changes to the description update the description that will be recorded in the created timelog. Changing the project updates the project reference that will be recorded in the timelog. Changing the task updates the task reference that will be recorded in the timelog. All edits are recorded in the final timelog when the timer is stopped.

### Timer Status Tracking

The system tracks the status of each timer as either running or stopped. Each employee can view their currently running timer, which displays the elapsed time, associated project, optionally associated task, and current description. The status is updated when the timer is stopped or discarded.

### Timer Indefinite Run

If an employee forgets to stop their timer, it continues running indefinitely. The system does not automatically stop or pause timers. Employees are responsible for stopping their own timers. There is no maximum duration limit for a running timer and no automatic timeout or suspension.

### Timer View Capability

Employees can view their own timers, including currently running timers and timer history. The view displays the elapsed time for running timers, project and task associations, and description. Employees can only view timers they started themselves and cannot access timers created by other employees.

## ActivityLog Rules

The system records significant actions as activity log entries. Each entry includes a timestamp, the user who performed the action, the action type, the target entity, and details. Logged actions include employee invitations, deactivations, and reactivations; contract creation or editing; project creation, archiving, completion, or deletion; task status changes; timesheet submissions, approvals, or rejections; and role assignments or changes. Users with org:manage permission can view the full activity log. The activity log is paginated and can be filtered by action type, user, or date range. Activity log entries are immutable and cannot be edited or deleted.

### Activity Log Entry Structure

Each activity log entry contains a timestamp, the user who performed the action, the action type, the target entity type, and detailed information about the action. The timestamp records when the action occurred. The user reference identifies which user performed the action. The action type categorizes the kind of change (e.g., employee invited, contract created, project archived). The target entity specifies which business object was affected. The details field contains relevant information about the change.

Activity log entries are created automatically by the system whenever a significant action occurs. Every entry is immutable once created and cannot be edited or deleted.

### Employee Action Logging

The system logs all employee-related actions including: employee invited to organization, employee activated, employee deactivated, employee record edited. When an employee is invited, the log records the invitation email and the inviter. When an employee status changes to deactivated, the log records the deactivator. When an employee record is edited, the log captures which fields were modified.

Employees who are deactivated cannot log time or submit timesheets until reactivated. Re-activation of a previously deactivated employee is logged with the reactivator and timestamp.

### Contract Action Logging

The system logs contract-related actions including: contract created, contract edited (active contract only). Each contract creation logs the employee, start date, and the manager who created it. When an active contract is edited, the log records the previous values and new values for changed fields.

Past (historical) contracts cannot be edited and therefore are never logged for edits. The creation of a new contract automatically logs the end date set on the previous active contract.

### Project Action Logging

The system logs project-related actions including: project created, project edited, project archived, project completed, project deleted. Each project creation logs the creator and project name. When a project is archived or completed, the log records the new status and the user who made the change. When a project is deleted, the log records the deletion reason and the deleter.

Project deletion is only permitted if the project has no associated timelogs; this condition is validated before the action is permitted.

### Task Action Logging

The system logs task status changes, recording the timestamp, the old status, the new status, and the user who made the change. Each status change (open, in-progress, completed, closed) is captured in the task history.

Only project leads or users with project:manage permission can change task status. The action type is recorded as task status changed.

### Timesheet Action Logging

The system logs timesheet-related actions including: timesheet created (draft), timesheet submitted, timesheet approved, timesheet rejected. When a timesheet is submitted, the log records the employee and week. When a timesheet is approved, the log records the approver and approval timestamp. When a timesheet is rejected, the log records the approver, rejection reason, and the date of rejection.

Employees can only submit timesheets if they have at least one timelog for the week. Employees cannot submit a timesheet if another timesheet for the same week already exists with submitted or approved status.

### Role Action Logging

The system logs role-related actions including: role created, role edited, role deleted, role assigned to employee, role changed for employee. Each custom role creation logs the creator and role name. When a custom role is edited, the log records the changes to the name or permission set. When a role is deleted, the log records that the deletion was only permitted because no employees were assigned to it.

When a role is assigned to or changed for an employee, the log records the employee, the old role (if applicable), and the new role.

### Organization Manage Log View

Only users with org:manage permission can view the full activity log for the organization. Users with other permissions cannot access the activity log. The activity log is visible only within the currently selected organization context.

Users can only view activity logs for organizations they belong to, and only if they have the org:manage permission for that organization.

### Log Pagination

Activity log entries are paginated to improve browsing performance. The system returns a manageable number of entries per page. Users can navigate through multiple pages of activity log entries.

The pagination allows users to browse historical activity without loading the entire log at once.

### Action Type Filtering

Users can filter the activity log by action type to view only specific kinds of events. Available action types for filtering include: employee invited, employee deactivated, employee reactivated, contract created, contract edited, project created, project archived, project completed, project deleted, task status changed, timesheet submitted, timesheet approved, timesheet rejected, role created, role edited, role deleted, role assigned.

Users can select one or more action types to narrow the log results.

### User Filtering

Users can filter the activity log by the user who performed the action. This allows users to view all actions taken by a specific person, such as a manager or another employee. The filter matches against the user reference stored in each log entry.

Users can combine user filtering with other filters (action type, date range) to find specific events performed by specific people.

### Date Range Filtering

Users can filter the activity log by a date range to view events within a specific time period. The filter accepts a start date and an end date. Only entries with timestamps within this range are returned.

Users can combine date range filtering with action type filtering and user filtering to precisely target the events they need to find.

### Log Immutability

Activity log entries are immutable once created. They cannot be edited, updated, or deleted by any user, including organization owners or administrators. This immutability ensures the integrity of the audit trail.

If an incorrect action was logged, the system does not allow correction of the log entry. The only option is to create a new entry that documents the corrective action taken.

### Audit Trail Scope

The activity log provides a comprehensive audit trail for significant organizational changes. Logged actions include employee lifecycle events (invitation, deactivation, reactivation), contract lifecycle events (creation, edit), project lifecycle events (creation, edit, archive, complete, delete), task status changes, timesheet lifecycle events (submission, approval, rejection), and role management events (creation, edit, deletion, assignment).

The audit trail covers all actions that affect the organization's data integrity and compliance requirements.

### Action Details Recording

Each activity log entry includes detailed information about the action performed. The details field captures relevant contextual information based on the action type. For employee actions, the email or employee name is recorded. For contract actions, the date range or pay rate changes are recorded. For project actions, the project name is recorded. For task actions, the status transition is recorded. For timesheet actions, the week date range is recorded. For role actions, the role name is recorded.

The level of detail is sufficient to understand what changed and by whom, without requiring access to the original business records.

## Permission Rules

Each organization has a set of permissions that can be assigned to roles. Available permissions include: org:manage for editing organization settings, employee:manage for adding and editing employees, employee:view for viewing employee lists, project:manage for creating and managing projects, project:view for viewing projects, time:manage for editing any employee's timelogs, time:approve for approving or rejecting timesheets, time:view_all for viewing all timelogs and timesheets, and report:view for viewing organization reports. Permissions are used to construct custom roles. Only organization owners can create, edit, and delete custom roles. Each role has a unique name and a specific set of permissions.

### Permission Code Definitions

Each permission has a unique code that identifies its business function. The organization has nine permissions: org:manage for editing organization settings, employee:manage for adding and editing employees, employee:view for viewing employee lists and details, project:manage for creating and managing projects and tasks, project:view for viewing projects and tasks, time:manage for editing or deleting any employee's time logs, time:approve for approving or rejecting timesheets, time:view_all for viewing all employees' time logs and timesheets, and report:view for viewing organization reports.

Each permission code has a specific purpose and describes what business action it enables. The permission codes are used as building blocks when constructing custom roles and assigning access rights.

### Permission Assignment Logic

Permissions are assigned to roles, and roles are assigned to employees. Each employee in an organization has exactly one role, which determines all their permissions. When a role is assigned to an employee, all permissions in that role's permission set become active for that employee.

Organization owners can assign roles to employees, change an employee's role, and modify which permissions a custom role contains. Only users with the employee:manage permission can assign or change roles for other employees.

### Organization Manage Permission

The org:manage permission allows users to edit organization settings including name, description, logo image, currency, timezone, and fiscal start month. Users with this permission can also create, edit, and delete departments. Only organization owners have this permission by default.

Deleting a department sets employees' department to null without deleting the employees themselves. Organization owners can delete their organization only if all pending timesheets are resolved and there are no active employee contracts.

### Employee Manage Permission

The employee:manage permission allows users to invite new employees to the organization by email. If the invited email already has an account, the user is added to the organization. If the invited email has no account, a pending invitation is created that automatically adds the user when they sign up.

Users with this permission can edit employee records including department, position, and employment type. They can deactivate employees, which prevents the employee from logging time or submitting timesheets while preserving historical data. They can also reactivate deactivated employees and create contracts for employees.

### Employee View Permission

The employee:view permission allows users to view the employee list and see details for any employee in the organization. The employee list can be filtered by department, employment type, and status. Users can search for employees by name.

Users with this permission can view any employee's contracts but cannot edit them. The employee list is paginated and displays employee information in a browsable format.

### Project Manage Permission

The project:manage permission allows users to create projects with required name, color code, and optional description. Users with this permission can edit projects, archive them, or mark them as completed. Archived or completed projects cannot receive new time logs, but existing time logs are preserved.

Users with this permission can delete projects only if the project has no time logs associated with it. They can also assign employees to projects, remove employees from projects, create tasks, and delete or edit tasks. When creating a project, the name must be provided and a color code must be selected for UI display.

### Project View Permission

The project:view permission allows users to view all projects in the organization. Users with this permission can see project names, descriptions, status, and budget hours. The project list is paginated and can be filtered by status to show only active, archived, or completed projects.

Users with project:view permission can also view tasks within projects they have access to, but they cannot create, edit, or delete tasks.

### Time Manage Permission

The time:manage permission allows users to edit or delete any employee's time logs. This includes changing the date, duration, project, task, description, or billable flag on a time log. Users with this permission can modify time logs regardless of who created them.

However, time logs that are part of an approved timesheet cannot be edited or deleted, even by users with time:manage permission. Users can view all employees' time logs through the time:view_all permission.

### Time Approve Permission

The time:approve permission allows users to view all submitted timesheets and take action on them. Users can approve submitted timesheets, which locks all included time logs so they cannot be edited or deleted. They can also reject timesheets with a required reason text.

Rejected timesheets return to draft status, and the employee can modify and resubmit them. Users cannot submit a timesheet if another timesheet for the same week is already submitted or approved. A timesheet cannot be submitted if it has no time logs included.

### Time View All Permission

The time:view_all permission allows users to view all employees' time logs and timesheets in the organization. Users can see who logged time, when, for which projects and tasks, and how long they worked. They can filter time logs by date range, project, task, and billable status.

Time logs are displayed in a paginated list and can be sorted to help users find specific entries. This permission is required for viewing the time report and other organization-level time tracking reports.

### Report View Permission

The report:view permission allows users to access organization-level reports including the time report, project budget report, and weekly summary report. Users can view total hours logged per employee, billable versus non-billable hours, and budget utilization percentages.

Users with this permission can filter reports by date range, employee, project, and billable status. They can also view the organization dashboard showing total active employees, total hours logged this week, pending timesheets awaiting approval, and top employees by hours logged.

### Custom Role Permission Assignment

Organization owners can create custom roles with a unique name and assign specific permissions to them. Each custom role has a set of permissions that define what actions the role can perform. Owners can select from the available permissions when building the role's permission set.

Owners can edit custom roles to change their name or modify their permission set. However, owners can only delete custom roles if no employees are currently assigned to that role. This prevents accidentally removing access for employees while they are in the role.

### Permission Set Definition

A permission set is the complete collection of permissions assigned to a role. Each permission in the set is either present or absent — there are no partial permissions. The permission set defines the scope of actions that anyone with that role can perform.

When an employee is assigned a role, they inherit all permissions in that role's permission set. The permission set is immutable once the role is created, though owners can update the set later by editing the role.

### Role Permission Structure

Each role has a unique name within the organization and a specific permission set. Built-in roles (Owner, Manager, Employee) have fixed permission sets that cannot be deleted. Custom roles are defined by owners with custom names and custom permission sets.

The role structure ensures that each employee has exactly one role, and that role determines all their access rights. When viewing permissions for a role, the system displays which permission codes are included in that role's permission set.

### Owner Permission Control

Organization owners have full access to all features and can manage all roles and members. Owners can create, edit, and delete any custom role, including assigning or removing permissions. They can also transfer ownership to another employee.

Owners can delete their organization only when specific conditions are met: all pending timesheets must be resolved (approved or rejected), and there must be no active employee contracts. When an organization is deleted, all employees, projects, tasks, time logs, and timesheets are permanently deleted, but the owner's account remains active without an organization association.

### Role Deletion Constraints

Custom roles can only be deleted if no employees are currently assigned to them. This constraint prevents accidental loss of access when employees are using the role. If a role has employees assigned, the owner must first reassign those employees to a different role before deleting the custom role.

Built-in roles (Owner, Manager, Employee) cannot be deleted. These three roles are permanently available to all organizations and have fixed permission sets that define the standard access levels.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Employee List Filtering and Search

Users can browse the employee list using pagination, with results displayed in pages.

Employees can filter the employee list by department, employment type, and status.

Employees can search the employee list by name.

The employee list returns only employees belonging to the user's selected organization.

### Project List Filtering

Users can browse the project list using pagination, with results displayed in pages.

Users can filter the project list by status.

The project list returns only projects belonging to the user's selected organization.

### Task List Filtering and Sorting

Users can browse the task list using pagination, with results displayed in pages.

Users can filter the task list by status, priority, and assigned employee.

Users can sort the task list by due date, priority, or creation date.

The task list returns only tasks belonging to projects the user has access to.

### Timelog List Filtering and Pagination

Users can browse timelogs using pagination, with results displayed in pages.

Users can filter timelogs by date range, project, task, and billable status.

Employees can only view timelogs they created or timelogs belonging to their organization (if they have time:view_all permission).

Timelogs are returned in descending order by date.

### Timesheet List Filtering and Pagination

Users can browse timesheets using pagination, with results displayed in pages.

Users can filter timesheets by status and date range.

Employees can only view their own timesheets.

Managers and owners can view all timesheets in their organization.

### Activity Log Filtering and Pagination

Users can browse the activity log using pagination, with results displayed in pages.

Users can filter the activity log by action type, user, and date range.

Only users with organization management permissions can view the full activity log.

The activity log is sorted by timestamp in descending order, with most recent actions first.

### Time Report Filtering and Grouping

Users can access the time report with filtering and grouping options.

The time report can be grouped by employee, project, or task.

The time report can be filtered by date range, employee, project, and billable status.

The report shows total hours, billable hours, and non-billable hours.

### Project Budget Report Rules

Users can access the project budget report.

The report shows each project's budget hours versus actual hours logged.

The report displays the percentage of budget consumed for each project.

Projects without budget hours are excluded from this report.

### Weekly Summary Report Rules

Users can access the weekly summary report.

The report can be filtered by project.

Each week in the report shows total hours, number of timelogs, and number of employees who logged time.

The report covers a configurable date range.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Error Conditions

An organization owner cannot delete their organization if any pending timesheets exist that have not been approved or rejected.

The deletion request is rejected if there are active employee contracts that have not ended.

When an organization is successfully deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed from the system.

The owner's user account remains active after organization deletion but is no longer associated with any organization. The owner must select or create a new organization to access any platform features.

If the organization owner attempts to delete an organization with pending timesheets, the system displays a message indicating which pending timesheets must be resolved before deletion.

If the organization owner attempts to delete an organization with active employee contracts, the system displays a message indicating that all contracts must be ended before deletion.

### Employee Account Deactivation and Deletion Errors

A user who is the sole owner of an organization cannot delete their account until they transfer ownership to another user or delete the organization entirely.

The account deletion request is rejected if the user holds sole ownership and has not completed one of the required transfer or deletion actions.

When a user account is deleted, all employee records for that user in all organizations are marked as deactivated, preserving historical data such as timelogs and timesheets.

Deactivated employees are prevented from creating new timelogs or submitting timesheets.

Deactivated employees' historical data including timelogs and timesheets remain accessible for reporting and audit purposes.

A deactivated employee record can be reactivated by a user with employee management permission, restoring their ability to log time and submit timesheets.

If a user attempts to delete their account while being the sole owner, the system presents options to transfer ownership to another user or delete the organization before proceeding with account deletion.

### Timesheet Submission and Rejection Rules

A timesheet cannot be submitted if it contains no timelogs for the specified week.

A timesheet cannot be submitted if another timesheet for the same week (Monday to Sunday) is already in submitted or approved status.

The timesheet submission is rejected with an error message indicating that the week already has an existing timesheet.

When a timesheet is rejected by an approver, it returns to draft status and the employee can modify and resubmit it.

The rejection reason field is required when an approver rejects a timesheet. The request is rejected if the reason field is empty.

Approved timesheets lock all included timelogs, preventing any employee or approver from editing or deleting those timelogs.

Once a timesheet is approved, all timelogs included in that timesheet become immutable and cannot be modified.

Employees can view the status of their timesheets and the rejection reason when a timesheet is rejected.

Users with time approval permission can view all submitted timesheets awaiting review across the organization.

### Project and Task Deletion Constraints

A project can only be deleted if it has no timelogs associated with it. The deletion request is rejected if any timelogs exist.

When a project is archived or completed, it cannot receive new timelogs. Existing timelogs are preserved.

If a project owner attempts to delete a project with existing timelogs, the system displays the list of timelogs that prevent deletion.

Tasks can only be edited by project leads for tasks within their project or by users with full project management permission.

When deleting a task, any subtasks (child tasks) assigned to it are also deleted along with their history.

Task history entries are immutable and cannot be edited or deleted once created.

A task's assigned employee must be a member of the project. The task creation request is rejected if the assigned employee is not a project member.

Users without project management permission cannot delete projects or tasks, regardless of whether they own them.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Organization Logo Upload

Organization owners can upload a logo image when creating an organization.

Organization owners can update the logo image when editing organization settings.

When a logo image is uploaded, it becomes associated with the organization and is displayed in the organization context.

If an organization is deleted, its logo image is permanently removed from storage.

### User Avatar Image Upload

Users can upload an avatar image when creating their user profile.

Users can update their avatar image when editing their profile.

When an avatar image is uploaded, it becomes the user's display image across all organizations.

When a user account is deleted, their avatar image is permanently removed from storage.