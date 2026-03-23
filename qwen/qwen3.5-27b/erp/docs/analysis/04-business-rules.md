**hrmPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

An organization must have a unique name between 1 and 100 characters. The description can be up to 500 characters and is optional. Each organization requires a currency setting such as USD, EUR, or KRW for financial calculations. A timezone must be specified to determine working hours and timesheet periods. The fiscal start month defines when the organization's financial year begins. Organization owners can modify these settings at any time. Before an organization can be deleted, all pending timesheets must be either approved or rejected. No active employee contracts can exist when deleting an organization. When deleted, all associated employees, projects, tasks, timelogs, and timesheets are permanently removed. The organization owner's user account remains but loses its association with any organization.

### Organization Name Validation

WHEN an organization is created, THE system SHALL validate that the organization name is between 1 and 100 characters.

IF the organization name is empty or exceeds 100 characters, THEN THE system SHALL reject the organization creation.

WHEN an organization is created, THE system SHALL ensure the organization name is unique within the platform.

IF an organization with the same name already exists, THEN THE system SHALL reject the duplicate name.

WHEN an organization owner edits the organization name, THE system SHALL validate the new name against the same constraints as creation.

IF the new organization name conflicts with an existing organization, THEN THE system SHALL reject the name change.

### Currency Setting Requirement

WHEN an organization is created, THE system SHALL require a currency setting to be specified.

THE system SHALL only accept valid three-letter currency codes such as USD, EUR, or KRW.

IF the currency code is invalid or not in the three-letter format, THEN THE system SHALL reject the organization creation.

WHEN an organization owner edits the organization settings, THE system SHALL allow the currency to be changed.

IF the new currency code is invalid, THEN THE system SHALL reject the currency change.

THE currency setting is used for all financial calculations within the organization.

### Timezone Configuration

WHEN an organization is created, THE system SHALL require a timezone to be specified.

THE timezone determines working hours and timesheet periods for all employees in the organization.

IF no timezone is specified during organization creation, THEN THE system SHALL reject the creation.

WHEN an organization owner edits the organization settings, THE system SHALL allow the timezone to be changed.

IF the new timezone is invalid, THEN THE system SHALL reject the timezone change.

THE timezone setting affects timesheet week boundaries and timer calculations.

### Fiscal Start Month Definition

WHEN an organization is created, THE system SHALL require a fiscal start month to be defined.

THE fiscal start month defines when the organization's financial year begins.

IF no fiscal start month is specified during organization creation, THEN THE system SHALL reject the creation.

WHEN an organization owner edits the organization settings, THE system SHALL allow the fiscal start month to be changed.

THE fiscal start month setting affects financial reporting and budget calculations.

### Organization Deletion Prerequisites

WHEN an organization owner attempts to delete an organization, THE system SHALL first check for pending timesheets.

IF any timesheets have a status of submitted or draft, THEN THE system SHALL reject the organization deletion.

WHEN an organization owner attempts to delete an organization, THE system SHALL check for active employee contracts.

IF any employee has an active contract (no end date or end date in the future), THEN THE system SHALL reject the organization deletion.

THE organization owner must resolve all pending timesheets and end all active contracts before deletion is permitted.

### Pending Timesheets Resolution

WHEN an organization owner attempts to delete an organization, THE system SHALL identify all timesheets with status submitted or draft.

IF pending timesheets exist, THEN THE system SHALL require them to be either approved or rejected before deletion.

THE system SHALL not allow organization deletion while any timesheet remains in a pending state.

Employees and managers must complete the timesheet approval workflow before the organization can be deleted.

### Active Contract Constraint

WHEN an organization owner attempts to delete an organization, THE system SHALL check all employee contracts for active status.

IF any employee has a contract without an end date or with an end date in the future, THEN THE system SHALL prevent deletion.

THE system SHALL require all active contracts to be ended before organization deletion.

Contract end dates must be set to a past date to satisfy the deletion requirement.

No employee can have an ongoing contract when the organization is deleted.

### Permanent Data Deletion Scope

WHEN an organization is deleted, THE system SHALL permanently delete all employees associated with the organization.

THE system SHALL permanently delete all projects associated with the organization.

THE system SHALL permanently delete all tasks associated with the organization.

THE system SHALL permanently delete all timelogs associated with the organization.

THE system SHALL permanently delete all timesheets associated with the organization.

THE system SHALL permanently delete all departments associated with the organization.

THE system SHALL permanently delete all roles (except built-in roles) associated with the organization.

THE system SHALL permanently delete all activity log entries associated with the organization.

No data from the deleted organization can be recovered after deletion.

### Owner Account Preservation

WHEN an organization is deleted, THE system SHALL preserve the owner's user account.

THE owner's user account remains in the platform but is no longer associated with any organization.

THE owner retains their global profile including display name, avatar, and phone number.

THE owner can create a new organization or join existing organizations after deletion.

IF the owner is a member of other organizations, those memberships remain unchanged.

THE deleted organization's data is not accessible through the owner's account after deletion.

## User Rules

Users must register with a valid email address between 3 and 200 characters. The email must be unique across the entire platform. A password is required for account creation and authentication. Users can change their password at any time after account creation. A single user account can belong to multiple organizations simultaneously. When logging in, users must select which organization context to work within. All subsequent actions are scoped to the selected organization only. Users can switch between organizations without logging out. Before deleting their account, users who are sole owners must first transfer ownership or delete the organization. When a user account is deleted, their employee records in other organizations are marked as deactivated rather than removed.

### Email Validation Rules

WHEN a user attempts to register, THE system SHALL validate that the email address is between 3 and 200 characters in length.

WHEN a user attempts to register, THE system SHALL validate that the email address follows a valid email format.

WHEN a user attempts to register, THE system SHALL check if the email address already exists in the platform.

IF the email address already exists in the platform, THEN THE system SHALL reject the registration attempt.

IF the email address is less than 3 characters, THEN THE system SHALL reject the registration attempt.

IF the email address exceeds 200 characters, THEN THE system SHALL reject the registration attempt.

IF the email address does not follow a valid format, THEN THE system SHALL reject the registration attempt.

### Password Rules

WHEN a user attempts to register, THE system SHALL require a password for account creation.

WHEN a user attempts to log in, THE system SHALL require a password for authentication.

WHEN a user attempts to change their password, THE system SHALL allow the password change at any time after account creation.

IF a user does not provide a password during registration, THEN THE system SHALL reject the account creation attempt.

IF a user does not provide a password during login, THEN THE system SHALL reject the login attempt.

### Organization Membership Rules

WHEN a user registers, THE system SHALL allow the user to belong to multiple organizations simultaneously.

WHEN a user logs in, THE system SHALL require the user to select which organization context to work within.

WHEN a user selects an organization context, THE system SHALL scope all subsequent actions to the selected organization only.

WHEN a user is logged in, THE system SHALL allow the user to switch between organizations without logging out.

WHEN a user switches organizations, THE system SHALL update the organization context for all subsequent actions.

IF a user does not select an organization context after login, THEN THE system SHALL not allow access to organization-specific features.

### Account Deletion Rules

WHEN a user who is the sole owner of an organization attempts to delete their account, THE system SHALL require the user to first transfer ownership or delete the organization.

WHEN a user deletes their account, THE system SHALL mark their employee records in other organizations as deactivated rather than removing them.

IF a user is the sole owner of an organization and has not transferred ownership or deleted the organization, THEN THE system SHALL reject the account deletion attempt.

WHEN a user's account is deleted, THE system SHALL preserve historical data associated with their deactivated employee records.

WHEN an employee record is marked as deactivated due to account deletion, THE system SHALL prevent the employee from logging time or submitting timesheets.

## UserProfile Rules

Each user has a global profile that is shared across all organizations they belong to. The display name is required and must be between 1 and 100 characters. An avatar image can be uploaded and is optional. A phone number can be added and must be between 1 and 50 characters if provided. Users can edit their profile information at any time. Profile changes are immediately visible across all organizations. The profile is independent of organization-specific employee records. Display name updates do not affect the user's email address. Avatar images are stored globally and accessible from any organization context.

### Global Profile Scope and Cross-Organization Visibility

THE system SHALL maintain a single global user profile for each user account that is shared across all organizations the user belongs to.

THE system SHALL make the user profile immediately visible in all organization contexts when any profile attribute is updated.

THE system SHALL ensure that avatar images uploaded to the user profile are accessible from any organization the user is a member of.

THE system SHALL not create separate profile instances for different organizations.

IF a user belongs to multiple organizations, THEN THE system SHALL display the same profile information in each organization context.

THE system SHALL not allow organization-specific modifications to the global user profile.

THE system SHALL treat the user profile as independent from organization-specific employee records.

### Display Name Validation Rules

THE system SHALL require a display name for all user profiles.

THE system SHALL enforce that the display name is between 1 and 100 characters in length.

IF the display name is empty or missing during profile creation or update, THEN THE system SHALL reject the request.

IF the display name exceeds 100 characters, THEN THE system SHALL reject the request.

THE system SHALL allow the display name to contain any valid text characters.

THE system SHALL not require the display name to be unique across users.

THE system SHALL allow the display name to be changed at any time by the user.

IF the display name is updated, THEN THE system SHALL propagate the change to all organization contexts immediately.

### Display Name and Email Separation Rules

THE system SHALL treat the display name and email address as separate, independent attributes.

THE system SHALL not use the display name for authentication or login purposes.

THE system SHALL not allow the display name to replace or modify the user's email address.

IF the display name is changed, THEN THE system SHALL not affect the email address associated with the user account.

THE system SHALL continue to use the email address for account authentication regardless of display name changes.

THE system SHALL allow the display name to differ from the email address.

THE system SHALL not enforce any relationship between the display name and email address format.

### Avatar Image Upload Rules

THE system SHALL allow users to upload an avatar image to their profile.

THE system SHALL treat the avatar image as optional.

IF no avatar image is provided, THEN THE system SHALL use a default avatar.

THE system SHALL store the avatar image globally for the user account.

THE system SHALL make the avatar image visible in all organization contexts where the user is a member.

IF the avatar image is updated, THEN THE system SHALL replace the previous avatar image globally.

THE system SHALL not allow organization-specific avatar images.

THE system SHALL preserve the avatar image even if the user is deactivated from an organization.

### Phone Number Format Validation

THE system SHALL allow users to add a phone number to their profile.

THE system SHALL treat the phone number as optional.

IF a phone number is provided, THEN THE system SHALL enforce that it is between 1 and 50 characters in length.

IF the phone number exceeds 50 characters, THEN THE system SHALL reject the request.

THE system SHALL allow the phone number to be updated at any time.

THE system SHALL allow the phone number to be removed from the profile.

IF the phone number is updated, THEN THE system SHALL propagate the change to all organization contexts immediately.

THE system SHALL not enforce a specific phone number format or country code.

### Profile Edit Capability and Independence

THE system SHALL allow users to edit their own profile information at any time.

THE system SHALL allow users to update their display name, avatar image, and phone number.

IF a profile attribute is updated, THEN THE system SHALL immediately reflect the change across all organization contexts.

THE system SHALL not require approval or permission to edit the user's own profile.

THE system SHALL maintain profile independence from organization-specific employee records.

IF the user is deactivated from an organization, THEN THE system SHALL preserve the global profile unchanged.

IF the user is removed from all organizations, THEN THE system SHALL retain the global profile until the user account is deleted.

THE system SHALL not allow other users to edit another user's profile.

## Employee Rules

Each employee record must reference an existing user account. Every employee must be assigned exactly one role within the organization. The department assignment is optional and can be null. Position or title is optional and can be left empty. Employment type must be one of: full-time, part-time, contractor, or intern. Employee status must be either active or deactivated. Deactivated employees cannot create new timelogs or submit timesheets. Historical timelogs and timesheets are preserved when an employee is deactivated. Deactivated employees can be reactivated at any time by users with appropriate permissions. Users with employee management permissions can modify department, position, and employment type.

### Employee Account and Role Assignment

WHEN creating an employee record, THE system SHALL require a reference to an existing user account.

IF a user account does not exist for the provided email, THEN THE system SHALL reject the employee creation request.

WHEN an employee is created, THE system SHALL assign exactly one role to that employee within the organization.

IF an attempt is made to assign multiple roles to the same employee, THEN THE system SHALL reject the request and maintain the existing role assignment.

IF an attempt is made to remove all role assignments from an employee, THEN THE system SHALL reject the request.

WHEN a user with employee management permission changes an employee's role, THE system SHALL update the role assignment immediately.

IF a user without employee management permission attempts to change an employee's role, THEN THE system SHALL reject the request.

### Employee Attributes and Classification

WHEN creating or editing an employee record, THE system SHALL allow the department assignment to be optional or null.

IF a department is assigned to an employee, THE system SHALL verify that the department belongs to the same organization.

IF an employee is assigned to a department that no longer exists, THEN THE system SHALL set the department assignment to null.

WHEN creating or editing an employee record, THE system SHALL allow the position or title to be optional or empty.

IF a position or title is provided, THE system SHALL accept text input up to one hundred characters.

WHEN creating or editing an employee record, THE system SHALL require the employment type to be one of: full-time, part-time, contractor, or intern.

IF an employment type is provided that is not in the allowed enumeration, THEN THE system SHALL reject the employee record update.

IF the employment type is left unspecified during employee creation, THEN THE system SHALL reject the request.

### Employee Status and Time Logging

WHEN an employee record is created, THE system SHALL set the status to active by default.

WHEN a user with employee management permission deactivates an employee, THE system SHALL change the employee status to deactivated.

IF an employee's status is deactivated, THEN THE system SHALL prevent that employee from creating new time logs.

IF an employee's status is deactivated, THEN THE system SHALL prevent that employee from submitting timesheets for approval.

WHEN a deactivated employee attempts to start a timer, THE system SHALL reject the request and display an appropriate message.

IF a user attempts to submit a timesheet on behalf of a deactivated employee, THEN THE system SHALL reject the request.

WHILE an employee is deactivated, THE system SHALL preserve all historical time logs and timesheets associated with that employee.

IF a user attempts to delete time logs or timesheets from a deactivated employee, THEN THE system SHALL reject the request unless the user has time management permission.

### Employee Data Retention and Reactivation

WHEN an employee is deactivated, THE system SHALL retain all time logs, timesheets, and task assignments associated with that employee.

WHEN an employee is deactivated, THE system SHALL retain all contract records associated with that employee.

WHEN an employee is deactivated, THE system SHALL retain all project memberships associated with that employee.

WHEN a user with employee management permission reactivates a deactivated employee, THE system SHALL change the employee status back to active.

IF a deactivated employee is reactivated, THEN THE system SHALL restore the employee's ability to create time logs and submit timesheets.

WHEN a deactivated employee is reactivated, THE system SHALL preserve the employee's historical data without modification.

IF an employee has been deactivated for an extended period, THE system SHALL allow reactivation at any time without data loss.

WHEN a user attempts to reactivate an employee, THE system SHALL verify that the user has employee management permission.

### Employee Record Modification Permissions

WHEN a user with employee management permission edits an employee record, THE system SHALL allow modification of department assignment.

WHEN a user with employee management permission edits an employee record, THE system SHALL allow modification of position or title.

WHEN a user with employee management permission edits an employee record, THE system SHALL allow modification of employment type.

WHEN a user with employee management permission edits an employee record, THE system SHALL allow deactivation of the employee.

IF a user without employee management permission attempts to edit an employee's department, THEN THE system SHALL reject the request.

IF a user without employee management permission attempts to edit an employee's position, THEN THE system SHALL reject the request.

IF a user without employee management permission attempts to edit an employee's employment type, THEN THE system SHALL reject the request.

IF a user without employee management permission attempts to deactivate an employee, THEN THE system SHALL reject the request.

WHEN an employee attempts to edit their own record, THE system SHALL allow viewing but restrict modification of department, position, and employment type.

IF a user attempts to modify an employee record that does not exist, THEN THE system SHALL reject the request.

## Role Rules

Each organization has three built-in roles: Owner, Manager, and Employee that cannot be deleted. Owner role has full access to all features including role and member management. Manager role can manage employees, projects, approve timesheets, and view reports. Employee role can track time, submit timesheets, and view their own data. Organization owners can create custom roles with a name and set of permissions. Custom role names must be between 1 and 100 characters. Available permissions include organization management, employee management, project management, time management, and report viewing. Custom roles can only be deleted if no employees are currently assigned to them. Each employee must be assigned exactly one role at all times. Role assignments can be changed by users with employee management permission.

### Built-in Role Protection

WHEN a user attempts to delete the Owner role, THE system SHALL reject the request.
WHEN a user attempts to delete the Manager role, THE system SHALL reject the request.
WHEN a user attempts to delete the Employee role, THE system SHALL reject the request.
WHEN a user attempts to rename the Owner role, THE system SHALL reject the request.
WHEN a user attempts to rename the Manager role, THE system SHALL reject the request.
WHEN a user attempts to rename the Employee role, THE system SHALL reject the request.
WHEN a user attempts to modify the permissions of the Owner role, THE system SHALL reject the request.
WHEN a user attempts to modify the permissions of the Manager role, THE system SHALL reject the request.
WHEN a user attempts to modify the permissions of the Employee role, THE system SHALL reject the request.

### Owner Role Full Access

THE system SHALL grant the Owner role full access to all organization features.
THE system SHALL grant the Owner role permission to manage organization settings.
THE system SHALL grant the Owner role permission to manage roles and members.
THE system SHALL grant the Owner role permission to manage employees.
THE system SHALL grant the Owner role permission to manage projects.
THE system SHALL grant the Owner role permission to manage time entries and timesheets.
THE system SHALL grant the Owner role permission to view all reports.
THE system SHALL grant the Owner role permission to view the activity log.

### Manager Role Capabilities

THE system SHALL grant the Manager role permission to manage employees.
THE system SHALL grant the Manager role permission to manage projects.
THE system SHALL grant the Manager role permission to approve timesheets.
THE system SHALL grant the Manager role permission to view reports.
THE system SHALL grant the Manager role permission to view employee data.
THE system SHALL grant the Manager role permission to view project data.
THE system SHALL grant the Manager role permission to view time entries.
IF a Manager role user attempts to manage organization settings, THEN THE system SHALL reject the request.
IF a Manager role user attempts to manage roles, THEN THE system SHALL reject the request.

### Employee Role Limitations

THE system SHALL grant the Employee role permission to track time.
THE system SHALL grant the Employee role permission to submit timesheets.
THE system SHALL grant the Employee role permission to view their own data.
IF an Employee role user attempts to manage other employees, THEN THE system SHALL reject the request.
IF an Employee role user attempts to manage projects, THEN THE system SHALL reject the request.
IF an Employee role user attempts to approve timesheets, THEN THE system SHALL reject the request.
IF an Employee role user attempts to view organization reports, THEN THE system SHALL reject the request.
IF an Employee role user attempts to view other employees' data, THEN THE system SHALL reject the request.

### Custom Role Creation

WHEN a user with organization management permission creates a custom role, THE system SHALL require a role name.
WHEN a user with organization management permission creates a custom role, THE system SHALL require at least one permission.
WHEN a user with organization management permission creates a custom role, THE system SHALL allow selection from available permissions.
WHEN a user with organization management permission creates a custom role, THE system SHALL create the role with the specified name and permissions.
IF a user without organization management permission attempts to create a custom role, THEN THE system SHALL reject the request.

### Custom Role Name Validation

IF a custom role name is empty, THEN THE system SHALL reject the role creation request.
IF a custom role name exceeds 100 characters, THEN THE system SHALL reject the role creation request.
IF a custom role name contains only whitespace, THEN THE system SHALL reject the role creation request.
IF a custom role name duplicates an existing role name in the organization, THEN THE system SHALL reject the role creation request.
IF a custom role name matches a built-in role name (Owner, Manager, Employee), THEN THE system SHALL reject the role creation request.

### Permission Set Definition

THE system SHALL provide the following available permissions for custom roles: organization management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing.
THE system SHALL allow custom roles to have any combination of available permissions.
THE system SHALL allow custom roles to have no permissions.
WHEN a custom role is created, THE system SHALL store the selected permission set.
WHEN a custom role is edited, THE system SHALL update the permission set with the new selection.
IF a permission is removed from a custom role, THEN employees with that role lose that permission immediately.

### Role Deletion Employee Constraint

WHEN a user attempts to delete a custom role, THE system SHALL check if any employees are assigned to that role.
IF employees are assigned to the custom role, THEN THE system SHALL reject the deletion request.
IF no employees are assigned to the custom role, THEN THE system SHALL allow the deletion request.
WHEN a custom role is deleted, THE system SHALL permanently remove the role from the organization.
IF a user without organization management permission attempts to delete a custom role, THEN THE system SHALL reject the request.

### Single Role Per Employee

THE system SHALL require each employee to have exactly one role assigned at all times.
WHEN an employee is created, THE system SHALL require a role assignment.
IF an employee has no role assigned, THEN THE system SHALL reject any operations requiring role validation.
WHEN a role is assigned to an employee, THE system SHALL remove any previously assigned role.
IF a role is deleted and employees are assigned to it, THEN THE system SHALL prevent the deletion until roles are reassigned.

### Role Assignment Change Permission

WHEN a user with employee management permission changes an employee's role, THE system SHALL update the role assignment.
WHEN a user without employee management permission attempts to change an employee's role, THEN THE system SHALL reject the request.
WHEN an employee's role is changed, THE system SHALL immediately apply the new permissions.
WHEN an employee's role is changed, THE system SHALL record the change in the activity log.
IF a role change would leave an employee without a role, THEN THE system SHALL reject the change request.

## Department Rules

Each department must have a name between 1 and 100 characters. The description is optional and can be up to 500 characters. Departments can have an optional parent department allowing one level of nesting. A department cannot be its own parent or create circular references. Users with organization management permission can create, edit, and delete departments. When a department is deleted, all employees assigned to it have their department set to null. Deleting a department does not delete the employees themselves. Employees can view the complete list of departments in their organization. Department names do not need to be unique across the entire organization.

### Department Name Validation

WHEN creating a department, THE system SHALL require a name between 1 and 100 characters.

WHEN creating a department, THE system SHALL allow duplicate names within the same organization.

WHEN editing a department, THE system SHALL maintain the name length constraint of 1 to 100 characters.

IF the department name is empty or exceeds 100 characters, THEN THE system SHALL reject the department creation or update request.

IF the department name contains only whitespace characters, THEN THE system SHALL reject the request.

### Department Description Rules

WHEN creating a department, THE system SHALL allow an optional description up to 500 characters.

WHEN creating a department, THE system SHALL permit an empty description field.

WHEN editing a department, THE system SHALL allow the description to be updated or cleared.

IF the description exceeds 500 characters, THEN THE system SHALL reject the department creation or update request.

A department without a description is valid and does not require one for creation.

### Department Hierarchy Rules

WHEN creating a department, THE system SHALL allow an optional parent department assignment.

WHEN assigning a parent department, THE system SHALL permit only one level of nesting (parent-child relationship only).

IF a user attempts to assign a child department as a parent, THEN THE system SHALL reject the request to prevent circular references.

IF a user attempts to assign a department as its own parent, THEN THE system SHALL reject the request.

A department without a parent department is valid and does not require a parent for creation.

WHEN editing a department's parent, THE system SHALL validate that the new parent does not create a circular reference.

### Department Management Permissions

WHEN creating a department, THE system SHALL require the user to have organization management permission.

WHEN editing a department, THE system SHALL require the user to have organization management permission.

WHEN deleting a department, THE system SHALL require the user to have organization management permission.

IF a user without organization management permission attempts to create a department, THEN THE system SHALL reject the request.

IF a user without organization management permission attempts to edit a department, THEN THE system SHALL reject the request.

IF a user without organization management permission attempts to delete a department, THEN THE system SHALL reject the request.

### Department Deletion Rules

WHEN deleting a department, THE system SHALL set the department field to null for all employees currently assigned to that department.

WHEN deleting a department, THE system SHALL preserve all employee records and not delete them.

WHEN deleting a department, THE system SHALL not delete any child departments (if they exist).

IF a department has child departments, THEN THE system SHALL still allow deletion but child departments remain intact.

WHEN a department is deleted, THE system SHALL make the department unavailable for new employee assignments.

### Department Visibility Rules

WHEN viewing departments, THE system SHALL display the complete list of departments to all employees within the organization.

WHEN viewing departments, THE system SHALL show department names and descriptions (if provided).

WHEN viewing departments, THE system SHALL display the hierarchical structure showing parent-child relationships.

IF an employee belongs to multiple organizations, THEN THE system SHALL show departments only for the currently selected organization.

The department list is available to all employees regardless of their role or permissions within the organization.

## Contract Rules

Each employee can have multiple contracts throughout their employment history. Only one contract can be active at any given time for an employee. Every contract requires a start date. The end date is optional and null indicates an ongoing contract. A pay rate is required and must be a numeric value. The pay period must be one of: hourly, daily, weekly, or monthly. Working hours per week is required and specifies the standard work schedule. Notes are optional and can provide additional contract details. Creating a new contract automatically ends the previous active contract by setting its end date. Past contracts cannot be edited and serve as immutable historical records. Users with employee management permission can create and edit active contracts.

### Contract Structure and Required Fields

THE system SHALL allow each employee to have multiple contracts throughout their employment history.

THE system SHALL require a start date for every contract.

THE system SHALL allow the end date to be optional, where a missing end date indicates an ongoing contract.

THE system SHALL require a pay rate as a numeric value for every contract.

THE system SHALL require the pay period to be one of: hourly, daily, weekly, or monthly.

THE system SHALL require working hours per week as a numeric value for every contract.

THE system SHALL allow optional notes to provide additional contract details.

IF a contract is created without a start date, THEN THE system SHALL reject the request.

IF a contract is created without a pay rate, THEN THE system SHALL reject the request.

IF the pay rate is not a numeric value, THEN THE system SHALL reject the request.

IF the pay period is not one of hourly, daily, weekly, or monthly, THEN THE system SHALL reject the request.

IF a contract is created without working hours per week, THEN THE system SHALL reject the request.

### Active Contract Constraints

THE system SHALL enforce that only one contract can be active at any given time for an employee.

WHEN a new contract is created for an employee, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract's start date.

IF an employee already has an active contract and a new contract is being created, THEN THE system SHALL set the end date of the current active contract automatically.

THE system SHALL allow users with employee management permission to create contracts for employees.

THE system SHALL allow users with employee management permission to edit the current active contract.

IF a user attempts to edit a contract that is not currently active, THEN THE system SHALL reject the request.

IF a user without employee management permission attempts to create or edit a contract, THEN THE system SHALL reject the request.

IF a user attempts to edit a past contract, THEN THE system SHALL reject the request.

THE system SHALL preserve all past contracts as immutable historical records.

WHEN an active contract is edited, THE system SHALL maintain the contract's active status.

IF an employee has no active contract, THEN THE system SHALL allow creation of a new contract without automatic ending of a previous contract.

### Contract Validation and Error Conditions

IF the start date of a new contract is earlier than the end date of the current active contract, THEN THE system SHALL reject the request.

IF the pay rate is negative or zero, THEN THE system SHALL reject the request.

IF the working hours per week is negative or zero, THEN THE system SHALL reject the request.

IF an employee is deactivated, THEN THE system SHALL prevent creation of new contracts for that employee.

IF a contract's end date is earlier than its start date, THEN THE system SHALL reject the request.

IF a user attempts to set an end date on a past contract, THEN THE system SHALL reject the request.

IF a user attempts to modify the start date of an active contract to a date in the past, THEN THE system SHALL reject the request.

IF the employee referenced in a contract does not belong to the same organization, THEN THE system SHALL reject the request.

THE system SHALL validate that the employee exists and is active before allowing contract creation.

THE system SHALL validate that the user has appropriate permissions before allowing contract modifications.

## Project Rules

Each project must have a name between 1 and 100 characters. The description is optional and can be up to 1000 characters. A color code is required for UI display and must be between 1 and 20 characters. Project status must be one of: active, archived, or completed. Budget hours are optional and represent total estimated hours for the project. Start date and end date are both optional. Users with project management permission can create and edit projects. Archived or completed projects cannot receive new timelogs. Existing timelogs on archived or completed projects are preserved. Projects can only be deleted if they have no timelogs associated with them. Users with project view permission can see all projects regardless of their status.

### Project Name and Description Validation

THE system SHALL require a project name between 1 and 100 characters when creating a project.

THE system SHALL accept an optional project description of up to 1000 characters.

IF the project name is missing, THEN THE system SHALL reject the project creation request.

IF the project name exceeds 100 characters, THEN THE system SHALL reject the project creation request.

IF the project description exceeds 1000 characters, THEN THE system SHALL reject the project creation request.

WHEN editing a project, THE system SHALL enforce the same name and description length constraints as creation.

### Project Color Code Requirement

THE system SHALL require a color code for UI display when creating a project.

THE system SHALL accept a color code between 1 and 20 characters.

IF the color code is missing, THEN THE system SHALL reject the project creation request.

IF the color code exceeds 20 characters, THEN THE system SHALL reject the project creation request.

WHEN editing a project, THE system SHALL enforce the same color code constraints as creation.

### Project Status Rules

THE system SHALL allow project status to be one of: active, archived, or completed.

THE system SHALL default new projects to active status.

WHEN a project is archived, THE system SHALL prevent new timelogs from being created for that project.

WHEN a project is completed, THE system SHALL prevent new timelogs from being created for that project.

WHEN a project status changes to archived or completed, THE system SHALL preserve all existing timelogs associated with the project.

Users with project management permission can change project status to archived or completed.

Users without project management permission cannot change project status.

### Project Budget and Date Configuration

THE system SHALL accept optional budget hours representing total estimated hours for the project.

THE system SHALL accept optional start date for the project.

THE system SHALL accept optional end date for the project.

IF an end date is provided, THE system SHALL allow it to be any date relative to the start date.

Budget hours do not constrain timelog creation or approval.

Start date and end date are informational only and do not enforce timelog date restrictions.

### Project Management Permissions

THE system SHALL require project management permission to create new projects.

THE system SHALL require project management permission to edit project details.

THE system SHALL require project management permission to change project status.

THE system SHALL require project management permission to archive or complete projects.

THE system SHALL require project management permission to delete projects.

Users without project management permission cannot perform any project management operations.

### Archived Project Timelog Restrictions

WHEN a project status is archived, THE system SHALL reject any attempt to create new timelogs for that project.

WHEN a project status is completed, THE system SHALL reject any attempt to create new timelogs for that project.

THE system SHALL preserve all existing timelogs when a project is archived.

THE system SHALL preserve all existing timelogs when a project is completed.

Existing timelogs on archived or completed projects remain visible and included in reports.

Timelogs on archived or completed projects cannot be edited or deleted by employees without time management permission.

### Project Deletion Constraints

THE system SHALL allow project deletion only if the project has no timelogs associated with it.

IF a project has one or more timelogs, THEN THE system SHALL reject the deletion request.

WHEN deleting a project, THE system SHALL permanently remove all project data including project memberships and tasks.

Users without project management permission cannot delete projects.

The system SHALL provide a clear error message when deletion is rejected due to existing timelogs.

### Project View Access Rules

Users with project view permission can view all projects in the organization regardless of status.

Users with project view permission can view active, archived, and completed projects.

Users without project view permission cannot access the project list.

Project view permission does not grant ability to edit or delete projects.

Project view permission does not grant ability to create new timelogs on archived or completed projects.

## ProjectMembership Rules

Each project membership links an employee to a specific project. The employee must be an active member of the organization. The project must exist within the same organization. Each membership has an assigned role of either member or project-lead. An employee can be assigned to multiple projects simultaneously. A single employee cannot have duplicate memberships on the same project. Project leads have the ability to manage tasks within their assigned project. Users with project management permission can assign employees to projects. Users with project management permission can remove employees from projects. Employees can view which projects they are currently assigned to.

### Project Membership Validation Rules

THE system SHALL validate that an employee exists in the organization before creating a project membership.

THE system SHALL validate that the employee has an active status before creating a project membership.

THE system SHALL validate that the project exists within the same organization as the employee before creating a project membership.

THE system SHALL validate that the assigned role is either member or project-lead when creating a project membership.

IF the employee is deactivated, THEN THE system SHALL reject the project membership creation.

IF the project belongs to a different organization than the employee, THEN THE system SHALL reject the project membership creation.

IF the assigned role is not member or project-lead, THEN THE system SHALL reject the project membership creation.

### Duplicate Membership Prevention

THE system SHALL prevent duplicate project memberships for the same employee on the same project.

THE system SHALL allow an employee to be assigned to multiple different projects simultaneously.

IF a project membership already exists for an employee on a specific project, THEN THE system SHALL reject the duplicate membership creation.

IF the request is to update an existing membership role, THEN THE system SHALL update the existing record instead of creating a duplicate.

THE system SHALL maintain a unique constraint on the combination of employee and project for project memberships.

### Project Lead Task Management

THE system SHALL grant project leads the ability to create tasks within their assigned project.

THE system SHALL grant project leads the ability to edit tasks within their assigned project.

THE system SHALL restrict project leads to managing tasks only in projects where they have project-lead role.

THE system SHALL not grant project leads the ability to manage tasks in projects where they have member role.

IF a user does not have project-lead role on a project, THEN THE system SHALL reject task management operations on that project.

### Membership Management Permissions

THE system SHALL require project:manage permission to assign employees to projects.

THE system SHALL require project:manage permission to remove employees from projects.

THE system SHALL require project:manage permission to change an employee's role on a project.

THE system SHALL allow employees to view which projects they are currently assigned to.

THE system SHALL allow employees to view their assigned role on each project.

IF a user does not have project:manage permission, THEN THE system SHALL reject project membership assignment operations.

IF a user does not have project:manage permission, THEN THE system SHALL reject project membership removal operations.

IF a user does not have project:manage permission, THEN THE system SHALL reject project membership role change operations.

## Task Rules

Each task must have a title between 1 and 200 characters. The description is optional and can be up to 2000 characters. Task status must be one of: open, in-progress, completed, or closed. Priority must be one of: low, medium, high, or urgent. Estimated hours are optional and help with planning. Due date is optional and can be used for tracking deadlines. The assigned employee is optional but must be a member of the project if specified. Tasks can have one level of nesting for subtasks with a parent task reference. Project leads can edit tasks within their assigned project. Users with project management permission can edit any task in the organization. Task status changes are automatically recorded in task history.

### Task Title and Description Validation

**Task Title Validation**

THE system SHALL require a task title to be between 1 and 200 characters.
IF the task title is empty, THEN THE system SHALL reject the task creation request.
IF the task title exceeds 200 characters, THEN THE system SHALL reject the task creation request.
IF the task title contains only whitespace, THEN THE system SHALL reject the task creation request.

**Optional Task Description**

THE system SHALL allow tasks to have an optional description.
IF a task description is provided, THEN THE system SHALL limit it to a maximum of 2000 characters.
IF the task description exceeds 2000 characters, THEN THE system SHALL reject the task creation request.
THE system SHALL allow tasks to exist without a description.

### Task Status and Priority Values

**Task Status Enumeration**

THE system SHALL restrict task status to one of the following values: open, in-progress, completed, or closed.
IF a task status is set to a value outside the allowed enumeration, THEN THE system SHALL reject the request.
THE system SHALL default new tasks to "open" status if no status is specified.

**Priority Level Enumeration**

THE system SHALL restrict task priority to one of the following values: low, medium, high, or urgent.
IF a task priority is set to a value outside the allowed enumeration, THEN THE system SHALL reject the request.
THE system SHALL default new tasks to "medium" priority if no priority is specified.

### Task Time and Assignment Constraints

**Optional Estimated Hours**

THE system SHALL allow tasks to have an optional estimated hours value.
IF estimated hours are provided, THEN THE system SHALL accept only positive numeric values.
IF estimated hours are negative or zero, THEN THE system SHALL reject the task creation or update request.

**Optional Due Date**

THE system SHALL allow tasks to have an optional due date.
IF a due date is provided, THEN THE system SHALL accept valid date values.
IF the due date is invalid (e.g., not a valid calendar date), THEN THE system SHALL reject the request.

**Project Member Assignment Constraint**

THE system SHALL allow tasks to have an optional assigned employee.
IF an employee is assigned to a task, THEN THE system SHALL verify that the employee is a member of the project containing the task.
IF the assigned employee is not a member of the project, THEN THE system SHALL reject the task creation or update request.
IF the assigned employee's status is "deactivated", THEN THE system SHALL reject the task assignment.

### Task Subtask Nesting Rules

**One-Level Subtask Nesting**

THE system SHALL allow tasks to have one level of nesting for subtasks.
IF a task is created as a subtask, THEN THE system SHALL require a valid parent task reference.
IF the parent task does not exist, THEN THE system SHALL reject the subtask creation request.
IF the parent task belongs to a different project, THEN THE system SHALL reject the subtask creation request.
THE system SHALL prevent tasks from having more than one level of nesting (subtasks cannot have their own subtasks).
IF a task with existing subtasks is deleted, THEN THE system SHALL reject the deletion request.
IF a parent task is deleted, THEN THE system SHALL automatically remove the parent reference from all child subtasks.

### Task Edit Permissions

**Project Lead Task Edit Permission**

THE system SHALL allow project leads to edit tasks within their assigned project.
IF a user without project lead role attempts to edit a task in a project where they are not a lead, THEN THE system SHALL reject the edit request.
Project leads can modify task title, description, status, priority, estimated hours, due date, and assigned employee.

**Project Management Task Edit Permission**

THE system SHALL allow users with project management permission to edit any task in the organization.
IF a user without project management permission attempts to edit a task outside their project lead assignments, THEN THE system SHALL reject the edit request.
Users with project management permission can override all task restrictions and edit any task regardless of project membership.

### Task Status Change Recording

**Automatic Status Change Recording**

WHEN a task status is changed, THE system SHALL automatically create a task history entry.
THE system SHALL record the timestamp of the status change in the task history.
THE system SHALL record the old status value in the task history.
THE system SHALL record the new status value in the task history.
THE system SHALL record the user who made the status change in the task history.
IF a status change occurs without proper authorization, THEN THE system SHALL reject the change and not create a history entry.
Task history entries are immutable once created and cannot be edited or deleted.

## TaskHistory Rules

Each task history entry records a status change for a specific task. The timestamp is automatically generated when the status changes. The old status captures the previous state before the change. The new status captures the state after the change. The user who made the change is automatically recorded. Task history entries are immutable once created. History entries cannot be edited or deleted. Each status change creates exactly one history entry. The history provides an audit trail of all task state transitions. Users can view the complete history for any task they have access to.

### Status Change Recording

WHEN a task status changes, THE system SHALL automatically create a task history entry.

WHEN a task history entry is created, THE system SHALL automatically record the timestamp of the status change.

WHEN a task history entry is created, THE system SHALL capture the previous status value as the old status.

WHEN a task history entry is created, THE system SHALL capture the new status value as the new status.

WHEN a task history entry is created, THE system SHALL automatically record the user who performed the status change.

IF a status change attempt does not result in an actual status change, THEN THE system SHALL NOT create a history entry.

### History Entry Constraints

WHEN a task history entry is created, THE system SHALL make the entry immutable.

IF a user attempts to edit a task history entry, THEN THE system SHALL reject the request.

IF a user attempts to delete a task history entry, THEN THE system SHALL reject the request.

WHEN a task status changes, THE system SHALL create exactly one history entry for that change.

IF multiple status changes occur in rapid succession, THEN THE system SHALL create separate history entries for each change.

IF a task is created with an initial status, THEN THE system SHALL NOT create a history entry for the initial status.

### History Visibility and Audit Trail

WHEN a user views a task, THE system SHALL provide access to the complete task history if the user has permission to view the task.

WHEN a user views task history, THE system SHALL display all history entries in chronological order.

WHEN a user views task history, THE system SHALL show the timestamp, old status, new status, and the user who made the change for each entry.

IF a user does not have permission to view a task, THEN THE system SHALL NOT display the task history.

WHEN a task is deleted, THE system SHALL preserve the task history entries for audit purposes.

## Timelog Rules

Each timelog must have a date associated with the work performed. Duration is required and measured in minutes with a minimum of 1 minute. The project is required and must be one the employee is assigned to. The task is optional but must belong to the selected project if specified. Description is optional and explains what work was done. The billable flag defaults to true if not specified. Employees can only create timelogs for themselves. Employees can edit their own timelogs only if not part of an approved timesheet. Employees can delete their own timelogs only if not part of any submitted or approved timesheet. Users with time management permission can edit or delete any employee's timelogs.

### Timelog Date Requirement

THE system SHALL require a date for every timelog entry.

WHEN a user creates a timelog, THE system SHALL validate that a date is provided.

IF no date is provided during timelog creation, THEN THE system SHALL reject the request.

THE system SHALL associate the date with the actual work performed date, not the creation date.

### Timelog Duration Validation

THE system SHALL require a duration in minutes for every timelog entry.

THE system SHALL enforce a minimum duration of 1 minute for all timelogs.

WHEN a user creates a timelog, THE system SHALL validate that the duration is at least 1 minute.

IF the duration is less than 1 minute or not provided, THEN THE system SHALL reject the request.

THE system SHALL store duration as a whole number of minutes.

### Project Assignment Validation

THE system SHALL require a project for every timelog entry.

WHEN a user creates a timelog, THE system SHALL validate that a project is selected.

IF no project is provided during timelog creation, THEN THE system SHALL reject the request.

THE system SHALL validate that the selected project belongs to the same organization as the employee.

IF the selected project is not in the same organization, THEN THE system SHALL reject the request.

THE system SHALL validate that the employee is assigned to the selected project.

IF the employee is not assigned to the selected project, THEN THE system SHALL reject the request.

### Task Belonging Constraint

THE system SHALL allow optional task selection for timelogs.

WHERE a task is specified in a timelog, THE system SHALL validate that the task belongs to the selected project.

IF a task is provided but does not belong to the selected project, THEN THE system SHALL reject the request.

THE system SHALL allow timelogs without a task assignment when only a project is specified.

### Timelog Description and Billable Settings

THE system SHALL allow optional work description for timelogs.

THE system SHALL default the billable flag to true when not explicitly specified.

WHERE a user creates a timelog without specifying billable status, THE system SHALL set billable to true.

THE system SHALL allow users to explicitly set the billable flag to false when creating or editing timelogs.

### Timelog Creation Permissions

THE system SHALL restrict timelog creation to the employee themselves.

WHEN a user attempts to create a timelog, THE system SHALL validate that the user is creating it for their own employee record.

IF a user attempts to create a timelog for another employee, THEN THE system SHALL reject the request.

THE system SHALL allow users with time management permission to create timelogs on behalf of any employee.

### Timelog Edit Restrictions

THE system SHALL allow employees to edit their own timelogs only under specific conditions.

WHILE a timelog is not part of an approved timesheet, THE system SHALL allow the employee to edit their own timelog.

IF a timelog is part of an approved timesheet, THEN THE system SHALL prevent the employee from editing it.

THE system SHALL allow users with time management permission to edit any employee's timelogs regardless of timesheet status.

### Timelog Delete Restrictions

THE system SHALL allow employees to delete their own timelogs only under specific conditions.

WHILE a timelog is not part of any submitted or approved timesheet, THE system SHALL allow the employee to delete their own timelog.

IF a timelog is part of a submitted timesheet, THEN THE system SHALL prevent the employee from deleting it.

IF a timelog is part of an approved timesheet, THEN THE system SHALL prevent the employee from deleting it.

THE system SHALL allow users with time management permission to delete any employee's timelogs regardless of timesheet status.

## Timesheet Rules

Each timesheet represents a collection of timelogs for a specific week from Monday to Sunday. The employee is the owner of the timesheet and cannot be changed. The week start date must be a Monday and the week end date must be the following Sunday. Timesheet status must be one of: draft, submitted, approved, or rejected. Total hours are calculated automatically from included timelogs. A timesheet cannot be submitted if it contains no timelogs. A timesheet cannot be submitted if another timesheet for the same week is already submitted or approved. Approved timesheets lock all included timelogs preventing any edits or deletions. Rejected timesheets return to draft status allowing modifications. Rejected timesheets require a reason when rejecting.

### Weekly Scope and Date Validation

WHEN a timesheet is created, THE system SHALL ensure the week start date falls on a Monday.

WHEN a timesheet is created, THE system SHALL ensure the week end date falls on a Sunday.

WHEN a timesheet is created, THE system SHALL ensure the week end date is exactly six days after the week start date.

WHEN a timesheet is created, THE system SHALL ensure the week represents a complete Monday-to-Sunday period.

IF the week start date is not a Monday, THEN THE system SHALL reject the timesheet creation.

IF the week end date is not a Sunday, THEN THE system SHALL reject the timesheet creation.

IF the week end date does not match the week start date plus six days, THEN THE system SHALL reject the timesheet creation.

### Employee Ownership

THE system SHALL associate each timesheet with exactly one employee as the owner.

THE system SHALL not allow changes to the employee owner of a timesheet after creation.

WHEN a timesheet is created, THE system SHALL automatically set the creating employee as the owner.

IF an attempt is made to change the employee owner, THEN THE system SHALL reject the modification.

### Status Values

THE system SHALL restrict timesheet status to one of the following values: draft, submitted, approved, or rejected.

WHEN a timesheet is created, THE system SHALL initialize the status as draft.

THE system SHALL not allow any status value other than draft, submitted, approved, or rejected.

### Total Hours Calculation

THE system SHALL automatically calculate total hours from all timelogs included in the timesheet.

WHEN timelogs are added to a timesheet, THE system SHALL recalculate the total hours.

WHEN timelogs are removed from a timesheet, THE system SHALL recalculate the total hours.

WHEN a timelog duration is modified within a timesheet, THE system SHALL recalculate the total hours.

THE system SHALL not allow manual entry of total hours.

IF total hours are modified manually, THEN THE system SHALL reject the modification.

### Submission Rules

WHEN a timesheet is submitted, THE system SHALL verify that at least one timelog is included.

IF a timesheet contains no timelogs, THEN THE system SHALL prevent submission.

WHEN a timesheet is submitted, THE system SHALL check for existing timesheets covering the same week.

IF another timesheet for the same week already exists with status submitted or approved, THEN THE system SHALL prevent submission.

WHEN a timesheet is submitted, THE system SHALL change the status from draft to submitted.

WHEN a timesheet is submitted, THE system SHALL record the submission timestamp.

### Approved Timesheet Locking

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in the timesheet.

WHILE a timesheet status is approved, THE system SHALL prevent editing of any included timelog.

WHILE a timesheet status is approved, THE system SHALL prevent deletion of any included timelog.

WHILE a timesheet status is approved, THE system SHALL prevent adding new timelogs to the timesheet.

WHILE a timesheet status is approved, THE system SHALL prevent removing timelogs from the timesheet.

IF an attempt is made to modify a timelog in an approved timesheet, THEN THE system SHALL reject the modification.

### Rejection Rules

WHEN a timesheet is rejected, THE system SHALL require a rejection reason to be provided.

IF no rejection reason is provided, THEN THE system SHALL reject the timesheet rejection action.

WHEN a timesheet is rejected, THE system SHALL change the status from submitted to draft.

WHEN a timesheet is rejected, THE system SHALL allow the employee to modify included timelogs.

WHEN a timesheet is rejected, THE system SHALL allow the employee to add or remove timelogs.

WHEN a timesheet is rejected, THE system SHALL allow the employee to resubmit the timesheet.

WHEN a timesheet is rejected, THE system SHALL record the rejection timestamp and the user who performed the rejection.

## Timer Rules

Each employee can have at most one active timer running at any time. Starting a timer requires selecting a project the employee is assigned to. Task selection is optional when starting a timer. The timer records the start timestamp, project, task, and description. Description can be provided when starting the timer or edited while running. Employees can stop their timer to create a timelog with the calculated duration. Duration is rounded to the nearest minute when the timer stops. Employees can discard their timer without creating any timelog. Employees can edit the description and project or task of a running timer. If forgotten, the timer continues running indefinitely with no automatic stop.

### Timer Active Constraint

WHEN an employee starts a timer, THE system SHALL prevent starting another timer if one is already running.

IF an employee attempts to start a timer while one is active, THEN THE system SHALL reject the request and display an error message.

WHILE a timer is running for an employee, THE system SHALL maintain exactly one active timer per employee.

WHEN an employee stops or discards their timer, THE system SHALL allow them to start a new timer immediately.

### Timer Project Selection

WHEN an employee starts a timer, THE system SHALL require selection of a project.

IF the selected project is not assigned to the employee, THEN THE system SHALL reject the timer start request.

IF the selected project has status archived or completed, THEN THE system SHALL reject the timer start request.

WHEN an employee starts a timer, THE system SHALL record the selected project as part of the timer data.

### Timer Task Selection

WHEN an employee starts a timer, THE system SHALL allow task selection as optional.

IF a task is selected, THEN THE system SHALL verify that the task belongs to the selected project.

IF the selected task does not belong to the selected project, THEN THE system SHALL reject the timer start request.

WHEN an employee starts a timer without selecting a task, THE system SHALL record the task as null.

### Timer Start Recording

WHEN an employee starts a timer, THE system SHALL automatically record the start timestamp.

WHEN an employee starts a timer, THE system SHALL capture the exact date and time of timer initiation.

THE system SHALL use the recorded start timestamp to calculate duration when the timer is stopped.

THE system SHALL preserve the original start timestamp without modification once the timer begins.

### Timer Description Rules

WHEN an employee starts a timer, THE system SHALL allow providing a description as optional.

WHEN an employee starts a timer without a description, THE system SHALL record the description as null.

WHILE a timer is running, THE system SHALL allow the employee to edit the description.

WHEN an employee edits a running timer's description, THE system SHALL update and save the new description immediately.

### Timer Stop and Timelog Creation

WHEN an employee stops their timer, THE system SHALL automatically create a timelog entry.

WHEN an employee stops their timer, THE system SHALL calculate the duration from the start timestamp to the stop timestamp.

WHEN the timer stops, THE system SHALL round the calculated duration to the nearest minute.

WHEN a timelog is created from a stopped timer, THE system SHALL use the current date for the timelog date field.

WHEN a timelog is created from a stopped timer, THE system SHALL include the project, task, and description from the timer.

IF the calculated duration is less than one minute, THEN THE system SHALL round to one minute as the minimum duration.

### Timer Discard Rules

WHEN an employee discards their timer, THE system SHALL not create any timelog entry.

WHEN an employee discards their timer, THE system SHALL remove the running timer immediately.

WHEN an employee discards their timer, THE system SHALL not preserve any timer data.

WHEN an employee discards their timer, THE system SHALL allow them to start a new timer immediately.

### Running Timer Modification

WHILE a timer is running, THE system SHALL allow the employee to edit the project selection.

WHEN an employee changes the project on a running timer, THE system SHALL verify that the employee is assigned to the new project.

IF the new project is not assigned to the employee, THEN THE system SHALL reject the modification.

WHILE a timer is running, THE system SHALL allow the employee to edit the task selection.

WHEN an employee changes the task on a running timer, THE system SHALL verify that the task belongs to the current project.

IF the new task does not belong to the current project, THEN THE system SHALL reject the modification.

WHILE a timer is running, THE system SHALL allow the employee to edit the description at any time.

### Timer Auto-Stop Policy

WHILE a timer is running, THE system SHALL not automatically stop the timer under any circumstances.

IF an employee forgets to stop their timer, THE system SHALL continue recording the timer indefinitely.

THE system SHALL not impose any maximum duration limit on running timers.

THE system SHALL not automatically stop timers at end of day, end of week, or any scheduled time.

WHEN a timer runs across multiple days, THE system SHALL continue calculating duration from the original start timestamp.

## ActivityLog Rules

Each activity log entry records a significant action performed in the system. The timestamp is automatically generated when the action occurs. The user who performed the action is automatically recorded. The action type describes what kind of action was taken. The target entity identifies what object was affected. Details provide additional context about the action. Logged actions include employee invitations, deactivations, and reactivations. Contract creation and edits are recorded. Project creation, archiving, completion, and deletion are logged. Task status changes are captured in the activity log. Timesheet submissions, approvals, and rejections are recorded. Role assignments and changes are logged. Users with organization management permission can view the full activity log.

### Activity Log Entry Creation

WHEN a significant action occurs in the system, THE system SHALL automatically create an activity log entry.

WHEN an activity log entry is created, THE system SHALL automatically record the timestamp of when the action occurred.

WHEN an activity log entry is created, THE system SHALL automatically record the user who performed the action.

WHEN an activity log entry is created, THE system SHALL record the action type that describes what kind of action was taken.

WHEN an activity log entry is created, THE system SHALL record the target entity that identifies what object was affected by the action.

WHEN an activity log entry is created, THE system SHALL record additional details that provide context about the action.

### Employee Action Logging

WHEN an employee is invited to an organization, THE system SHALL create an activity log entry recording the invitation action.

WHEN an employee is deactivated, THE system SHALL create an activity log entry recording the deactivation action.

WHEN an employee is reactivated, THE system SHALL create an activity log entry recording the reactivation action.

### Contract Action Logging

WHEN a contract is created for an employee, THE system SHALL create an activity log entry recording the contract creation action.

WHEN a contract is edited, THE system SHALL create an activity log entry recording the contract edit action.

### Project Action Logging

WHEN a project is created, THE system SHALL create an activity log entry recording the project creation action.

WHEN a project is archived, THE system SHALL create an activity log entry recording the project archiving action.

WHEN a project is marked as completed, THE system SHALL create an activity log entry recording the project completion action.

WHEN a project is deleted, THE system SHALL create an activity log entry recording the project deletion action.

### Task Status Change Logging

WHEN a task status is changed, THE system SHALL create an activity log entry recording the status change action.

NOTE: Task status changes are also recorded in the task history (defined in TaskHistory Rules).

### Timesheet Action Logging

WHEN a timesheet is submitted for approval, THE system SHALL create an activity log entry recording the submission action.

WHEN a timesheet is approved, THE system SHALL create an activity log entry recording the approval action.

WHEN a timesheet is rejected, THE system SHALL create an activity log entry recording the rejection action.

### Role Assignment Logging

WHEN a role is assigned to an employee, THE system SHALL create an activity log entry recording the role assignment action.

WHEN a role is changed for an employee, THE system SHALL create an activity log entry recording the role change action.

### Activity Log Access Control

WHERE organization management permission exists, THE system SHALL allow users to view the full activity log.

IF a user does not have organization management permission, THEN THE system SHALL prevent access to the activity log.

### Activity Log Browsing

WHERE users have organization management permission, THE system SHALL display activity log entries in paginated format.

WHERE users have organization management permission, THE system SHALL allow filtering of activity log entries by action type.

WHERE users have organization management permission, THE system SHALL allow filtering of activity log entries by the user who performed the action.

WHERE users have organization management permission, THE system SHALL allow filtering of activity log entries by date range.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

**Employee List Filtering**

- WHEN browsing the employee list, USERS SHALL filter employees by department
- WHEN browsing the employee list, USERS SHALL filter employees by employment type
- WHEN browsing the employee list, USERS SHALL filter employees by status
- WHEN browsing the employee list, USERS SHALL search employees by name

**Project List Filtering**

- WHEN browsing the project list, USERS SHALL filter projects by status

**Timelog List Filtering**

- WHEN browsing the timelog list, USERS SHALL filter timelogs by date range
- WHEN browsing the timelog list, USERS SHALL filter timelogs by project
- WHEN browsing the timelog list, USERS SHALL filter timelogs by task
- WHEN browsing the timelog list, USERS SHALL filter timelogs by billable status

**Timesheet List Filtering**

- WHEN browsing the timesheet list, USERS SHALL filter timesheets by status
- WHEN browsing the timesheet list, USERS SHALL filter timesheets by date range

**Task List Filtering**

- WHEN browsing the task list, USERS SHALL filter tasks by status
- WHEN browsing the task list, USERS SHALL filter tasks by priority
- WHEN browsing the task list, USERS SHALL filter tasks by assigned employee

**Activity Log Filtering**

- WHEN browsing the activity log, USERS SHALL filter entries by action type
- WHEN browsing the activity log, USERS SHALL filter entries by user
- WHEN browsing the activity log, USERS SHALL filter entries by date range

**Report Filtering**

- WHEN generating the time report, USERS SHALL filter by date range
- WHEN generating the time report, USERS SHALL filter by employee
- WHEN generating the time report, USERS SHALL filter by project
- WHEN generating the time report, USERS SHALL filter by billable status
- WHEN generating the weekly summary report, USERS SHALL filter by project

### Sorting Rules

**Employee List Sorting**

- WHEN browsing the employee list, USERS SHALL sort employees by name
- WHEN browsing the employee list, USERS SHALL sort employees by department
- WHEN browsing the employee list, USERS SHALL sort employees by employment type
- WHEN browsing the employee list, USERS SHALL sort employees by status

**Project List Sorting**

- WHEN browsing the project list, USERS SHALL sort projects by name
- WHEN browsing the project list, USERS SHALL sort projects by status
- WHEN browsing the project list, USERS SHALL sort projects by start date
- WHEN browsing the project list, USERS SHALL sort projects by end date

**Timelog List Sorting**

- WHEN browsing the timelog list, USERS SHALL sort timelogs by date
- WHEN browsing the timelog list, USERS SHALL sort timelogs by duration
- WHEN browsing the timelog list, USERS SHALL sort timelogs by project
- WHEN browsing the timelog list, USERS SHALL sort timelogs by task

**Timesheet List Sorting**

- WHEN browsing the timesheet list, USERS SHALL sort timesheets by week start date
- WHEN browsing the timesheet list, USERS SHALL sort timesheets by status
- WHEN browsing the timesheet list, USERS SHALL sort timesheets by total hours

**Task List Sorting**

- WHEN browsing the task list, USERS SHALL sort tasks by due date
- WHEN browsing the task list, USERS SHALL sort tasks by priority
- WHEN browsing the task list, USERS SHALL sort tasks by creation date
- WHEN browsing the task list, USERS SHALL sort tasks by status

**Activity Log Sorting**

- WHEN browsing the activity log, USERS SHALL sort entries by timestamp

### Pagination Rules

**Employee List Pagination**

- WHEN browsing the employee list, THE system SHALL display employees in paginated pages
- WHEN browsing the employee list, USERS SHALL navigate between pages

**Project List Pagination**

- WHEN browsing the project list, THE system SHALL display projects in paginated pages
- WHEN browsing the project list, USERS SHALL navigate between pages

**Timelog List Pagination**

- WHEN browsing the timelog list, THE system SHALL display timelogs in paginated pages
- WHEN browsing the timelog list, USERS SHALL navigate between pages

**Timesheet List Pagination**

- WHEN browsing the timesheet list, THE system SHALL display timesheets in paginated pages
- WHEN browsing the timesheet list, USERS SHALL navigate between pages

**Task List Pagination**

- WHEN browsing the task list, THE system SHALL display tasks in paginated pages
- WHEN browsing the task list, USERS SHALL navigate between pages

**Activity Log Pagination**

- WHEN browsing the activity log, THE system SHALL display entries in paginated pages
- WHEN browsing the activity log, USERS SHALL navigate between pages

**Filter and Sort Persistence**

- WHEN users apply filters or sorting, THE system SHALL maintain these selections when navigating between pages
- WHEN users navigate to a different page, THE system SHALL preserve the current filter and sort state

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Errors

WHEN an organization owner attempts to delete their organization, THE system SHALL reject the request if any pending timesheets exist in the organization.

WHEN an organization owner attempts to delete their organization, THE system SHALL reject the request if any active employee contracts exist in the organization.

WHEN an organization owner successfully deletes their organization, THE system SHALL permanently delete all employees, projects, tasks, timelogs, and timesheets associated with that organization.

WHEN an organization is deleted, THE system SHALL retain the owner's user account but remove all organization associations.

IF an organization has pending timesheets, THEN THE system SHALL require all timesheets to be approved or rejected before allowing deletion.

IF an organization has active employee contracts, THEN THE system SHALL require all contracts to be ended before allowing deletion.

### User Account Deletion Errors

WHEN a user attempts to delete their account, THE system SHALL reject the request if the user is the sole owner of an organization without first transferring ownership or deleting the organization.

WHEN a user successfully deletes their account, THE system SHALL mark their employee records in other organizations as deactivated.

IF a user is the sole owner of an organization, THEN THE system SHALL require ownership transfer to another user or organization deletion before allowing account deletion.

WHEN a user account is deleted, THE system SHALL preserve all historical data (timelogs, timesheets, contracts) associated with that user's employee records.

### Project Deletion and Modification Errors

WHEN a user with project management permission attempts to delete a project, THE system SHALL reject the request if the project has any timelogs associated with it.

WHEN a user attempts to log time to an archived project, THE system SHALL reject the timelog creation request.

WHEN a user attempts to log time to a completed project, THE system SHALL reject the timelog creation request.

IF a project is archived or completed, THEN THE system SHALL prevent new timelog assignments while preserving existing timelogs.

WHEN a user attempts to assign a task to a project, THE system SHALL reject the request if the project is archived or completed.

### Timelog Editing and Deletion Errors

WHEN an employee attempts to edit their timelog, THE system SHALL reject the request if the timelog is part of an approved timesheet.

WHEN an employee attempts to delete their timelog, THE system SHALL reject the request if the timelog is part of any submitted timesheet.

WHEN an employee attempts to delete their timelog, THE system SHALL reject the request if the timelog is part of any approved timesheet.

IF a timelog is included in an approved timesheet, THEN THE system SHALL lock the timelog from any edits or deletions.

IF a timelog is included in a submitted timesheet, THEN THE system SHALL prevent deletion until the timesheet is rejected or withdrawn.

WHEN a user with time management permission attempts to edit any employee's timelog, THE system SHALL allow the edit regardless of timesheet status.

### Timesheet Submission Errors

WHEN an employee attempts to submit a timesheet, THE system SHALL reject the request if the timesheet contains no timelogs.

WHEN an employee attempts to submit a timesheet for a week, THE system SHALL reject the request if another timesheet for the same week already exists in submitted or approved status.

IF a timesheet has no timelogs, THEN THE system SHALL prevent submission and require at least one timelog to be added.

IF a timesheet for the same week is already submitted, THEN THE system SHALL prevent duplicate submission.

IF a timesheet for the same week is already approved, THEN THE system SHALL prevent any new timesheet creation for that week.

WHEN a timesheet is rejected, THE system SHALL return the timesheet to draft status and allow the employee to modify and resubmit.

### Employee Deactivation and Reactivation Errors

WHEN an employee is deactivated, THE system SHALL prevent that employee from creating new timelogs.

WHEN an employee is deactivated, THE system SHALL prevent that employee from submitting timesheets.

WHEN a deactivated employee's historical data is accessed, THE system SHALL preserve all timelogs and timesheets created before deactivation.

IF an employee is deactivated, THEN THE system SHALL allow reactivation by users with employee management permission.

WHEN an employee is reactivated, THE system SHALL restore their ability to create timelogs and submit timesheets.

IF a deactivated employee has an active contract, THEN THE system SHALL allow the contract to remain active during deactivation.

### Contract Management Errors

WHEN a new contract is created for an employee, THE system SHALL automatically end the previous active contract by setting its end date to the day before the new contract starts.

WHEN a user attempts to edit a past contract, THE system SHALL reject the request as past contracts are immutable.

IF an employee has an active contract, THEN THE system SHALL allow only one active contract at any time.

WHEN a user attempts to create a contract without a start date, THE system SHALL reject the request.

WHEN a user attempts to create a contract without a pay rate, THE system SHALL reject the request.

IF a contract end date is not specified, THEN THE system SHALL treat the contract as ongoing.

### Role Management Errors

WHEN an organization owner attempts to delete a built-in role, THE system SHALL reject the request as built-in roles cannot be deleted.

WHEN an organization owner attempts to delete a custom role, THE system SHALL reject the request if any employees are assigned to that role.

IF a custom role has employees assigned, THEN THE system SHALL require all employees to be reassigned to different roles before allowing deletion.

WHEN an organization owner attempts to delete the Owner role, THE system SHALL reject the request.

WHEN an organization owner attempts to delete the Manager role, THE system SHALL reject the request.

WHEN an organization owner attempts to delete the Employee role, THE system SHALL reject the request.

### Task Assignment and Modification Errors

WHEN a task is assigned to an employee, THE system SHALL reject the request if the employee is not a member of the project.

WHEN a task status is changed, THE system SHALL record the change in task history with timestamp, old status, new status, and the user who made the change.

IF a task is assigned to an employee who is not a project member, THEN THE system SHALL prevent the assignment.

WHEN a subtask is created, THE system SHALL reject the request if the parent task is not part of the same project.

IF a task has subtasks, THEN THE system SHALL allow only one level of nesting (no subtasks of subtasks).

WHEN a project lead attempts to edit a task in their project, THE system SHALL allow the edit regardless of who created the task.

### Timer Management Errors

WHEN an employee attempts to start a timer, THE system SHALL reject the request if the employee already has an active timer running.

WHEN an employee attempts to start a timer, THE system SHALL reject the request if no project is selected.

IF an employee has an active timer, THEN THE system SHALL prevent starting another timer until the current one is stopped or discarded.

WHEN an employee stops their timer, THE system SHALL create a timelog with the calculated duration rounded to the nearest minute.

WHEN an employee discards their timer, THE system SHALL not create any timelog.

IF an employee forgets to stop their timer, THEN THE system SHALL continue running the timer indefinitely without automatic stop.

### Data Access and Isolation Errors

WHEN a user attempts to access data from another organization, THE system SHALL reject the request as data is strictly isolated per organization.

WHEN a user who belongs to multiple organizations accesses data, THE system SHALL only return data for their currently selected organization.

IF a user switches organizations, THEN THE system SHALL update the organization context for all subsequent requests.

WHEN an employee attempts to view another employee's timelogs, THE system SHALL reject the request unless the viewer has time:view_all permission.

WHEN an employee attempts to view another employee's timesheets, THE system SHALL reject the request unless the viewer has time:view_all permission.

IF a user does not have the required permission for an action, THEN THE system SHALL reject the request.

### Department Management Errors

WHEN a department is deleted, THE system SHALL set all employees' department assignments to null without deleting the employees.

WHEN a user attempts to create a department with a circular parent reference, THE system SHALL reject the request.

IF a department has a parent department, THEN THE system SHALL allow only one level of nesting (no subdepartments of subdepartments).

WHEN a user without organization management permission attempts to create a department, THE system SHALL reject the request.

WHEN a user without organization management permission attempts to edit a department, THE system SHALL reject the request.

WHEN a user without organization management permission attempts to delete a department, THE system SHALL reject the request.

### Report Access Errors

WHEN a user without report viewing permission attempts to access organization reports, THE system SHALL reject the request.

WHEN a user attempts to generate a time report, THE system SHALL require a valid date range to be specified.

WHEN a user attempts to generate a project budget report, THE system SHALL exclude projects without budget hours from the results.

IF a report request has invalid date range parameters, THEN THE system SHALL reject the request.

WHEN a user attempts to filter reports by employee, THE system SHALL only include employees who have logged time in the specified date range.

IF a weekly summary report is requested, THEN THE system SHALL show week-by-week breakdown for the entire date range.