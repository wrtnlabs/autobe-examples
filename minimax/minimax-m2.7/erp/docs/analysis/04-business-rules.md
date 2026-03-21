**erpHrm — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## Organization Rules

Each organization must have a unique name between 1 and 200 characters and an optional description up to 1000 characters. The organization requires a currency selection that determines how pay rates and financial reports are displayed. Timezone settings affect how dates and times are presented to users within the organization. Fiscal start month determines the beginning of the organization's financial year for reporting purposes. An organization may have a logo image for branding identification. The organization creator automatically becomes the owner with full access rights. An organization can only be deleted when all pending timesheets have been resolved through approval or rejection and when no active employee contracts remain in place. Deleting an organization permanently removes all associated employees, projects, tasks, timelogs, and timesheets while preserving the owner's user account.

### Organization Name Length Requirements

The organization name is a required field that identifies the organization to users and employees. The name must contain at least one character and cannot exceed two hundred characters in length. The system must reject any attempt to save an organization with a name that is empty or exceeds this limit.

#### Organization Description Constraints

The organization description is an optional field that allows owners to provide additional context about the organization. When provided, the description must not exceed one thousand characters. The system should allow saving an organization without a description, and owners can update or remove the description at any time.

#### Currency Selection Requirements

Each organization must select a currency code that determines how monetary values are displayed throughout the platform. The currency selection is required during organization creation and cannot be left blank. Available currency options include standard international codes such as USD, EUR, and KRW. Once selected, the currency affects how pay rates, financial reports, and any monetary values are presented to users within the organization. The currency can be changed by organization owners at a later time.

#### Timezone Configuration

Organizations must configure their timezone setting to ensure dates and times are presented correctly to users. The timezone setting affects how all datetime values are displayed, including timelog dates, timesheet periods, contract dates, and any timestamped records. Organizations must select a timezone during setup, and the selected timezone applies to all employees within that organization. Timezone can be updated by organization owners.

#### Fiscal Year Start Month

The organization must specify which month represents the start of its fiscal year. This setting is used for financial reporting purposes and helps generate accurate period-based reports. The fiscal start month can be any month from January through December. Organization owners can modify this setting to align with their business accounting practices.

#### Logo Image Branding

Organizations may optionally upload a logo image to serve as visual identification. The logo appears in the organization interface and helps employees and users quickly identify their organization. When a logo is not provided, the system displays a default placeholder. Organization owners can upload, replace, or remove the logo at any time.

#### Organization Owner Assignment

When a user creates an organization, that user automatically becomes the organization owner. The owner receives full access rights to all organization features and settings without needing to be explicitly assigned a role. The owner role cannot be transferred through normal role assignment mechanisms. Only the current owner can transfer ownership to another user within the organization.

#### Organization Deletion Prerequisites

An organization can only be deleted when specific conditions are met to prevent data integrity issues. First, all pending timesheets must be resolved, meaning every timesheet in the organization must have a status of approved or rejected. Second, there must be no active employee contracts remaining. An active contract is defined as a contract where the end date has not been set or the end date has not passed. The system must verify both conditions before allowing deletion to proceed.

#### Pending Timesheet Resolution Requirement

Before an organization can be deleted, every timesheet in the organization must be in a terminal state. A timesheet is considered resolved when it has been approved or rejected. Draft and submitted timesheets block deletion. The system must check the status of all timesheets across all employees and reject the deletion request if any unresolved timesheets exist.

#### Active Contract Check Before Deletion

The organization must verify that no employees have active contracts at the time of deletion. A contract is considered active when it has no end date specified or when the current date is before the contract end date. The system must examine all employee contracts and prevent deletion if any contract remains active. Deactivated employees with active contracts also prevent deletion.

#### Cascade Deletion of Related Records

When an organization is deleted, the following records are permanently removed: all employee records associated with the organization, all project records including their tasks, all timelog entries, and all timesheet records. Contract records and department records are also deleted. The deletion is permanent and cannot be undone. The owner's user account remains intact but is no longer associated with the deleted organization. Users who belong only to the deleted organization will have no organization context after deletion.

### Organization Deletion Validation

Refer to the Organization Name Length Requirements section for the complete set of organization validation rules.

#### Error Scenarios for Organization Operations

When a user attempts to create an organization without providing a name, the system must reject the request and return an error indicating that the organization name is required. When the name exceeds two hundred characters, the system must reject the request and indicate the maximum allowed length. When the description exceeds one thousand characters, the system must reject the request and indicate the description limit.

If a user attempts to delete an organization that contains pending timesheets, the system must reject the deletion and inform the user that all timesheets must be resolved first. If a user attempts to delete an organization with active employee contracts, the system must reject the deletion and indicate that active contracts must be ended or removed first.

When a currency or timezone is not selected during organization creation, the system must prompt the user to provide these required settings before proceeding. If the fiscal start month is not specified, the system should default to January but allow the owner to update this setting later.

### Organization Data Browsing

The Organization Rules are defined in the Organization Name Length Requirements section. The error conditions for organization operations are defined in the Organization Deletion Validation section.

#### Filtering and Pagination for Organization Data

When viewing the list of organizations that a user belongs to, results are displayed in a list format showing the organization name, logo if present, and current status. Users who belong to multiple organizations can see all their organizations in this list.

The activity log for an organization displays records of significant actions and can be filtered by action type, by the user who performed the action, and by a date range. Activity log entries are displayed in reverse chronological order and support pagination to handle large volumes of records.

## User Rules

Users must provide a valid email address and password during sign-up to create an account. Password change requires verification of the current password before setting a new one. A single user account can be associated with multiple organizations simultaneously. Users must select an organization context upon login to determine which organization's data they can access. Users can switch between their organizations without requiring a separate login session. Account deletion is only permitted when the user does not own any organization as sole owner, or after transferring ownership or deleting such organizations. When a user's account is deleted, their employee records in other organizations are marked as deactivated rather than permanently removed.

### User Sign-Up Requirements

## User Sign-Up Requirements

Users must provide a valid email address and a password when creating an account.

The email address serves as the unique identifier for the user account across the entire platform. Each email address can only be registered once, regardless of how many organizations the user may later join.

The password must meet minimum security requirements established by the platform. Users are responsible for maintaining the confidentiality of their credentials.

If the provided email address is already registered in the system, the sign-up request is rejected with an appropriate error message indicating that an account with that email already exists.

### Password Change Verification

## Password Change Requirements

When a user requests to change their password, the system must verify the user's identity by requiring the current password before allowing the new password to be set.

The new password must also meet the same minimum security requirements applied during sign-up. The system rejects password change requests when the current password is incorrect or missing.

Upon successful password change, all existing sessions are invalidated and the user must log in again with the new password.

### Multi-Organization Membership

## Multi-Organization Membership

A single user account can be associated with multiple organizations simultaneously. This allows users who work with multiple companies or clients to maintain one set of credentials while accessing different organizational contexts.

Each organization maintains its own independent set of employee records, projects, and data. The user's global profile information is shared across all organizations they belong to.

There is no maximum limit on the number of organizations a user can join.

### Organization Context Selection

## Organization Context Selection

Upon successful login, users who belong to multiple organizations must select which organization they wish to work in for the current session.

The selected organization determines the scope of data the user can access, including employees, projects, timelogs, and reports that belong to that organization.

If a user belongs to only one organization, they are automatically placed into that organization's context without requiring an explicit selection.

### Organization Switching Without Logout

## Organization Switching

Users can switch from one organization to another without ending their login session or logging out and back in.

When a user switches organizations, the system updates the data context to reflect the newly selected organization. All subsequent actions are scoped to the newly selected organization.

Users can switch organizations as many times as needed during an active session.

### Sole Ownership Transfer Requirement

## Account Deletion Prerequisites

A user cannot delete their account while they are the sole owner of one or more organizations. Before account deletion can proceed, the user must either transfer ownership of such organizations to another user or delete the organizations entirely.

If a user is one of multiple owners of an organization, they may delete their account without affecting the organization's existence, as other owners remain.

The system validates the ownership status before attempting to process any account deletion request. Requests to delete accounts with active sole ownership are rejected.

### Employee Deactivation on Account Deletion

## Account Deletion Effects

When a user's account is deleted, the system does not permanently remove their employee records from other organizations. Instead, these employee records are marked as deactivated.

Deactivated employee records retain all historical data including timelogs and timesheets, but the associated user account can no longer be accessed.

The user's global profile information is permanently removed from the system upon deletion.

## Employee Rules

Each employee must be linked to exactly one user account and one organization. An employee record can optionally contain a department assignment and position title. Employment type must be one of the predefined values: full-time, part-time, contractor, or intern. The employee status indicates whether the employee is active and can access the system or deactivated and prevented from logging time. Deactivated employees cannot create new timelogs or submit timesheets, though their historical data remains accessible. Each employee must be assigned exactly one role within the organization. Only users with the appropriate permission can modify an employee's department, position, employment type, or status. The system maintains a paginated list of employees that can be filtered by department, employment type, and status.

### Employee Core Linkage Rules

### Employee Core Linkage Rules

Each employee record MUST be linked to exactly one user account.

THE system SHALL prevent an employee record from existing without an associated user account.

Each employee record MUST belong to exactly one organization.

THE system SHALL ensure that an employee can access data only within their assigned organization.

WHEN a user creates an employee record, THE system SHALL associate that record with the currently selected organization context.

THE system SHALL prevent a user account from having more than one active employee record within the same organization.

### Employee Profile Attributes

The department assignment on an employee record is optional.

WHEN an employee has no department assigned, THE system SHALL store a null value for the department field.

The position title on an employee record is optional.

WHEN saving an employee record, THE system SHALL accept an empty or null position title.

### Employment Type Enumeration

THE system SHALL accept only the following employment types: full-time, part-time, contractor, or intern.

WHEN an employment type is specified, THE system SHALL validate that the value matches one of the allowed enumeration values.

WHEN an invalid employment type is provided, THE system SHALL reject the request with an appropriate error message.

THE system SHALL allow the employment type to be changed for an active employee by authorized users.

### Employee Status States

The employee status MUST be either active or deactivated.

An active employee can log time, submit timesheets, and access system features according to their assigned role.

A deactivated employee cannot create new timelogs or submit new timesheets.

WHEN an employee is deactivated, THE system SHALL preserve all historical timelogs and timesheets associated with that employee.

Historical data belonging to a deactivated employee SHALL remain accessible to users with appropriate view permissions.

### Role Assignment Rules

Each employee MUST be assigned exactly one role within their organization.

WHEN an employee record is created, THE system SHALL require a role to be specified.

THE system SHALL allow users with the `employee:manage` permission to change an employee's assigned role.

Users without the `employee:manage` permission SHALL NOT be able to modify an employee's role assignment.

WHEN a role is changed, THE system SHALL immediately apply the new permissions to the employee's access.

### Employee List Browsing Rules

THE system SHALL return employee records in a paginated format when listing employees.

WHEN pagination is requested, THE system SHALL return a specific number of records per page along with navigation information.

Users with the `employee:view` permission can retrieve the employee list.

Users without the `employee:view` permission SHALL be denied access to the employee list.

### Employee Filtering Rules

THE system SHALL allow filtering the employee list by department.

WHEN a department filter is applied, THE system SHALL return only employees assigned to that department, including employees with no department assignment when explicitly requested.

THE system SHALL allow filtering the employee list by employment type.

WHEN an employment type filter is applied, THE system SHALL return only employees whose employment type matches the selected value.

THE system SHALL allow filtering the employee list by status.

WHEN a status filter is applied, THE system SHALL return only employees whose status matches the selected value of either active or deactivated.

THE system SHALL support combining multiple filters simultaneously.

WHEN no filters are applied, THE system SHALL return all employees within the organization.

## Role Rules

Every organization has three built-in roles that cannot be modified or deleted: Owner, Manager, and Employee. The Owner role grants full access to all features including role and member management. The Manager role allows employee management, project oversight, timesheet approval, and report viewing. The Employee role restricts users to time tracking, timesheet submission, and viewing their own information. Organizations can create custom roles with a unique name and a defined set of permissions. Custom role names must be between 1 and 100 characters. A custom role can only be deleted when no employees are currently assigned to that role. Role assignments can be modified by users holding the employee management permission.

### Built-in Role Definition and Permissions

### Built-in Role Definition

Every organization automatically has three built-in roles upon creation: Owner, Manager, and Employee. These roles cannot be created, modified, or deleted by any user within the organization.

### Owner Role Permissions

The Owner role grants full access to all platform features. Owners can manage organization settings, manage all roles including built-in and custom roles, manage organization members, manage employees, manage projects, manage time entries, approve or reject timesheets, view reports, and access the activity log.

### Manager Role Permissions

The Manager role provides elevated access for supervisory functions. Managers can manage employees including adding new employees, editing employee details, and deactivating employees. Managers can view the employee list and employee details. Managers can create, edit, and manage projects and tasks. Managers can approve or reject timesheets submitted by employees. Managers can view organization reports. Managers cannot modify organization settings or manage roles.

### Employee Role Permissions

The Employee role provides basic access for regular staff members. Employees can track time by creating and editing their own timelogs. Employees can submit their own timesheets for approval. Employees can view their own timesheets and timelogs. Employees can view tasks assigned to them within projects they are members of. Employees cannot access reports, manage other employees, or modify organization settings.

### Role Immutability for Built-in Roles

Built-in roles cannot have their name changed. Built-in roles cannot have their permissions modified. Built-in roles cannot be assigned a different set of permissions. Built-in roles cannot be deleted even when no employees are assigned to them. This immutability ensures system stability and prevents accidental loss of essential organizational functions.

### Custom Role Creation

Organization owners can create custom roles to define specific job functions within their organization. Each custom role must have a unique name within that organization. Custom role names must be between 1 and 100 characters in length. Each custom role must have at least one permission assigned to it.

### Custom Role Permission Assignment

When creating a custom role, the organization owner must select the permissions the role will have. Available permissions include: organization management permission for editing organization settings, employee management permission for adding, editing, and deactivating employees, employee viewing permission for viewing employee list and details, project management permission for creating, editing, and deleting projects and tasks, project viewing permission for viewing projects and tasks, time management permission for editing or deleting any employee's timelogs, time approval permission for approving or rejecting timesheets, time viewing permission for viewing all employees' timelogs and timesheets, and report viewing permission for accessing organization reports.

### Custom Role Deletion

A custom role can only be deleted when no employees are currently assigned to that role. If any employee holds the role, the deletion request is rejected. This prevents accidental data inconsistency where employees would reference a non-existent role. Organization owners must reassign all employees to other roles before a custom role can be removed.

### Role Assignment to Employees

Each employee in an organization must be assigned exactly one role. When an employee is invited to an organization, they must be assigned a role at the time of invitation. Role assignment defines what the employee can and cannot do within the organization context. The employee-to-role mapping determines the employee's permissions for all organizational operations.

### Role Assignment Modification

Users with employee management permission can change the role assigned to any employee within their organization. Role assignment can be changed at any time without affecting the employee's historical data. When an employee's role is changed, the new permissions take effect immediately for subsequent actions. Role assignment modifications are recorded in the activity log for audit purposes.

### Custom Role Lifecycle

### Custom Role Creation Requirements

Organization owners can create custom roles tailored to their organizational structure. Custom role names must be unique within the organization and cannot duplicate the names of built-in roles. The role name must contain at least 1 character and cannot exceed 100 characters. Each custom role must have at least one permission assigned at the time of creation.

### Custom Role Modification

Organization owners can edit existing custom roles. Owners can change the custom role name to a different valid name. Owners can add or remove permissions from the custom role's permission set. Owners cannot modify built-in roles in any way.

### Custom Role Deletion Constraints

A custom role cannot be deleted if any employee is currently assigned to that role. The system must verify no employees reference the role before deletion proceeds. When employees are assigned to the role scheduled for deletion, the deletion request is rejected with an error message indicating the constraint violation. Organization owners must reassign all affected employees to other roles before attempting to delete the custom role.

### Role Assignment Requirements

Each employee must have exactly one role assigned within an organization. An employee cannot have zero roles assigned. An employee cannot have multiple roles assigned simultaneously. The role assignment determines the employee's capabilities for all organizational operations including time tracking, project access, and administrative functions.

### Role Assignment and Mapping

### Role Assignment Process

When inviting a new employee to an organization, the inviting user must specify which role the employee will hold. The role assignment is finalised when the employee record is created. Employees cannot assign themselves a role; only users with employee management permission can assign or change roles.

### Role Change Authority

Users with employee management permission can modify the role assigned to any employee in their organization. Users without employee management permission cannot change role assignments for any employee including themselves. Role changes take effect immediately upon confirmation.

### Employee to Role Mapping

The system maintains a mapping between each employee record and exactly one role within the organization. This mapping determines the employee's permission scope for all operations. When an employee's role changes, the previous role is replaced entirely. Historical actions performed under a previous role assignment remain valid and are not affected by role changes.

### Role Validation on Operations

Before allowing any operation, the system verifies the current user's role includes the required permission for that operation. If the required permission is not present in the user's role, the operation is rejected. Role permissions are evaluated in the context of the currently selected organization only.

### Role Validation and Constraints

### Built-in Role Protection

Built-in roles cannot be renamed. Built-in roles cannot have permissions added or removed. Built-in roles cannot be assigned different permissions than their original set. Built-in roles cannot be deleted under any circumstances. This immutability applies regardless of who attempts the modification or how many employees are assigned to the role.

### Custom Role Name Constraints

Custom role names must be between 1 and 100 characters long. Custom role names must be unique within the organization. Custom role names cannot match the name of any built-in role. Empty or blank names are not permitted. Leading and trailing spaces in names are trimmed but counted toward the character limit.

### Permission Set Requirements

Custom roles require at least one permission to be assigned. Permissions available for custom roles include: organization management, employee management, employee viewing, project management, project viewing, time management, time approval, time viewing all, and report viewing. Permissions are additive; a custom role includes all permissions selected during creation or modification.

### Role Assignment Constraints

Employees must always have exactly one role assigned. Role assignments can be modified only by users with employee management permission. Role changes do not affect historical data already recorded. An employee whose role is changed retains their previous work records intact.

## Department Rules

Departments require a name between 1 and 100 characters and may have an optional description. Each department can optionally reference a parent department, but nesting is limited to one level deep only. A department's parent reference cannot create deeper hierarchical chains. When a department is deleted, employees assigned to that department have their department reference set to null rather than being removed from the organization. Only users with organization management permission can create, edit, or delete departments.

### Department Name Validation

THE system SHALL require a department name to be provided when creating or updating a department.

THE system SHALL reject any request to create or update a department if the name field is empty or contains only whitespace characters.

THE system SHALL enforce a minimum length of 1 character and a maximum length of 100 characters for department names.

THE system SHALL reject any request to create or update a department if the name exceeds 100 characters.

THE system SHALL accept department names containing letters, numbers, spaces, hyphens, and common punctuation marks.

### Department Description

THE system SHALL allow an optional description field when creating or updating a department.

THE system SHALL accept department descriptions up to 1000 characters in length.

THE system SHALL permit an empty description, which represents the absence of descriptive information.

THE system SHALL preserve the description content when other department attributes are updated.

### Parent Department Reference

THE system SHALL allow each department to optionally reference a parent department.

THE system SHALL require the parent department to belong to the same organization as the child department.

THE system SHALL reject any attempt to create a parent reference to a department in a different organization.

THE system SHALL permit a department to exist without a parent reference, representing a top-level department.

THE system SHALL validate that the referenced parent department exists before accepting the relationship.

### Department Nesting Depth Limit

THE system SHALL limit department hierarchy nesting to exactly one level.

THE system SHALL reject any attempt to assign a parent department to a department that already has a parent (preventing two levels of nesting).

THE system SHALL reject any attempt to create a circular reference chain where Department A references Department B and Department B references Department A.

THE system SHALL allow a parent department to have multiple child departments.

WHEN a department with children is updated, THE system SHALL verify that setting the new parent does not create invalid nesting depth.

### Department Deletion

THE system SHALL allow deletion of a department only by users with organization management permission.

WHEN a department is deleted, THE system SHALL set the department reference to null for all employees assigned to that department.

WHEN a department is deleted, THE system SHALL preserve all employee records within the organization (employees are not deleted).

WHEN a department is deleted, THE system SHALL remove any child department references pointing to the deleted department.

THE system SHALL reject deletion of a department if the user does not possess organization management permission.

WHEN a parent department is deleted, THE system SHALL convert all child departments to top-level departments (removing their parent reference).

### Department List Visibility

THE system SHALL allow all employees within an organization to view the list of departments.

THE system SHALL return only departments belonging to the currently selected organization when listing departments.

THE system SHALL return department information including name, description, and parent department reference.

THE system SHALL sort department listings alphabetically by name by default.

WHEN a user with organization context queries departments, THE system SHALL include departments that have been marked as inactive alongside active departments.

## Contract Rules

An employee can have multiple contracts recorded to maintain historical employment information, but only one contract may be active at any given time. Each contract requires a start date and must include a pay rate as a numeric value and a pay period specifying how compensation is calculated. The pay period options are hourly, daily, weekly, or monthly. Working hours per week must be specified for each contract. The end date is optional; when null, the contract is considered ongoing. When a new contract is created for an employee, the previously active contract is automatically ended by setting its end date to the day before the new contract starts. Past contracts are immutable and cannot be edited, preserving the historical accuracy of compensation records.

### Multiple Contracts per Employee

An employee may have multiple contracts recorded in the system to maintain a complete historical record of their employment terms.

Each contract represents a distinct period of employment with specific compensation terms. Historical contracts remain in the system even after they end, allowing the organization to reference past employment terms when needed.

THE system SHALL allow an employee to have zero or more contracts.

THE system SHALL store all contracts regardless of their end date for historical reference.

THE system SHALL display contracts in chronological order starting from the most recent.

### Single Active Contract Constraint

Only one contract may be active for any employee at a given point in time.

An active contract is one where the current date falls on or after the start date and either has no end date or the end date has not yet passed.

THE system SHALL enforce that only one contract per employee can be active at any moment.

THE system SHALL validate that no two contracts overlap in their active periods.

IF a new contract would cause an overlap with an existing active contract, THEN the system SHALL reject the request with an appropriate error message.

WHEN an employee requires new employment terms, the existing active contract must be ended before a new one can begin.

### Contract Start Date Requirement

A start date is required when creating a contract. The start date determines when the contract becomes active.

THE system SHALL require a start date for every contract.

THE system SHALL reject any contract creation request that does not include a start date.

THE system SHALL validate that the start date is a valid calendar date.

The start date represents the first day on which the new employment terms take effect.

### Contract End Date and Ongoing Contracts

The end date is optional when creating a contract. When no end date is provided, the contract is considered ongoing.

THE system SHALL allow the end date to be null when creating a contract.

IF the end date is null, THEN the contract represents an ongoing employment relationship with no predetermined end.

IF the end date is provided, THEN the contract ends at the close of business on that date.

An ongoing contract can be ended at any time by creating a new contract with an earlier end date or by manually setting an end date on the current contract.

THE system SHALL display ongoing contracts with a visual indicator to distinguish them from ended contracts.

### Contract Pay Rate Requirement

A pay rate is required for every contract. The pay rate represents the compensation amount paid according to the specified pay period.

THE system SHALL require a pay rate for every contract.

THE system SHALL reject any contract creation request that does not include a pay rate.

THE pay rate must be a positive numeric value.

THE system SHALL reject pay rates that are zero or negative.

THE pay rate is stored as a numeric value without currency formatting, as the currency is determined by the organization settings.

### Contract Pay Period Options

The pay period specifies how frequently compensation is calculated and paid. Four options are available.

THE system SHALL support the following pay period options:

- Hourly: compensation is calculated based on hours worked
- Daily: compensation is a fixed amount per day
- Weekly: compensation is a fixed amount per week
- Monthly: compensation is a fixed amount per month

THE system SHALL require a pay period to be selected when creating a contract.

THE system SHALL reject any contract creation request that does not specify a pay period.

THE system SHALL validate that the pay period is one of the four allowed options.

The pay period determines how the pay rate is applied and affects calculations in reports and timesheet approvals.

### Working Hours per Week Requirement

The expected working hours per week is a required field for every contract. This value represents the standard number of hours an employee is expected to work.

THE system SHALL require working hours per week for every contract.

THE system SHALL reject any contract creation request that does not include working hours per week.

THE working hours per week must be a positive numeric value.

THE system SHALL accept decimal values for working hours (for example, 37.5 hours).

THE system SHALL reject zero or negative values for working hours per week.

Common values include 40 hours for full-time employment, though part-time contracts may specify lower values.

### Automatic Previous Contract Ending

When a new contract is created for an employee, the system automatically ends the previously active contract.

WHEN a new contract is created for an employee who has an active contract, THEN the system SHALL automatically set the end date of the previous active contract to the day immediately before the new contract start date.

THE system SHALL perform this automatic ending without requiring manual intervention from the user.

THE system SHALL preserve all information on the previous contract, only updating the end date.

This rule ensures that there is never a gap or overlap between consecutive contracts for the same employee.

IF the new contract has the same start date as the current date, the previous contract ends the day before.

IF the employee has no active contract (all previous contracts have ended), the system SHALL create the new contract without modifying any other contract.

### Past Contract Immutability

Contracts that have ended are immutable and cannot be modified. This ensures the historical accuracy of employment records.

THE system SHALL prevent any modifications to contracts where the end date has passed.

THE system SHALL reject any edit request on a contract that has ended.

THE system SHALL prevent changes to the start date, end date, pay rate, pay period, and working hours of a past contract.

Immutable contracts serve as accurate historical records of employment terms at the time they were in effect.

IF a user attempts to edit a past contract, THEN the system SHALL return an error message indicating that ended contracts cannot be modified.

Contract notes, if supported, are also immutable once the contract has ended.

### Contract Editing Restrictions

Only the current active contract may be edited. All other contracts are protected from modification.

THE system SHALL allow editing of contracts where the end date has not yet passed or is null.

THE system SHALL restrict editing to the following fields when modifying an active contract:

- End date (to end the contract early)
- Pay rate (if the compensation changes)
- Pay period (if the payment frequency changes)
- Working hours per week (if the expected hours change)
- Notes (if additional information needs to be recorded)

THE system SHALL NOT allow editing of the start date on any active contract.

THE system SHALL NOT allow editing of any field on a contract that has already ended.

IF a user attempts to edit an ended contract, THEN the system SHALL return an error message.

Users with the employee management permission can edit active contracts for any employee in their organization.

## Project Rules

Projects require a name between 1 and 200 characters and must have a color code for visual identification in the user interface. Projects may have an optional description and budget hours representing the total estimated effort. Start and end dates are optional and define the project's planned timeline. Project status determines its operational state: active projects accept new timelogs, while archived or completed projects preserve existing data but do not accept new entries. A project can only be deleted if it has no timelogs associated with it. Color code is a required field to ensure consistent UI display across the application.

### Project Attribute Validation

### Project Name

THE system SHALL require a project name with a length between 1 and 200 characters.

IF the project name is empty or exceeds 200 characters, THEN the system SHALL reject the request.

### Project Description

THE system SHALL treat the project description as optional.

IF a description is provided, THE system SHALL store it without length restrictions.

### Project Color Code

THE system SHALL require a color code for every project to ensure consistent UI display.

IF the color code is missing, THEN the system SHALL reject the project creation or update request.

### Project Budget Hours

THE system SHALL treat budget hours as optional for projects.

IF budget hours are provided, THE system SHALL store the numeric value representing total estimated hours.

IF budget hours are not provided, THE system SHALL leave this field empty.

### Project Start Date and End Date

THE system SHALL treat both start date and end date as optional fields for projects.

IF both dates are provided, THE system SHALL validate that the end date is not earlier than the start date.

IF the end date precedes the start date, THEN the system SHALL reject the request.

### Project Status Rules

### Active Project Status

WHEN a project has status set to active, THE system SHALL allow employees to create new timelogs against that project.

### Archived Project Status

WHEN a project has status set to archived, THE system SHALL prevent employees from creating new timelogs against that project.

WHEN a project has status set to archived, THE system SHALL preserve all existing timelogs associated with the project.

### Completed Project Status

WHEN a project has status set to completed, THE system SHALL prevent employees from creating new timelogs against that project.

WHEN a project has status set to completed, THE system SHALL preserve all existing timelogs associated with the project.

### Status Transition Eligibility

THE system SHALL allow any active project to be transitioned to archived or completed status.

THE system SHALL allow any archived project to be transitioned to completed status.

THE system SHALL allow any completed project to be transitioned to archived status.

### Project Deletion Constraints

### Deletion Eligibility

THE system SHALL prevent the deletion of a project that has any timelogs associated with it.

IF the project has one or more timelogs, THEN the system SHALL reject the deletion request and return an error message.

### Pre-Deletion Timelog Check

BEFORE processing a project deletion request, THE system SHALL check whether any timelogs are associated with the target project.

IF timelogs exist for the project, THEN the system SHALL NOT delete the project and SHALL return an error indicating the constraint violation.

IF no timelogs exist for the project, THEN the system SHALL delete the project along with its tasks and project members.

### Orphaned Timelog Prevention

THE system SHALL maintain referential integrity by ensuring timelogs cannot exist without an associated project.

WHEN a project is deleted, THE system SHALL ensure no timelogs reference that project ID.

## ProjectMember Rules

Employees can be assigned to multiple projects simultaneously, allowing them to track time across different initiatives. Each project membership must specify the assigned employee, the project, and an assigned role of either member or project-lead. Project leads receive elevated permissions within their specific project, including the ability to manage tasks. A user with project management permission can add employees to projects and remove them from projects. Employees can view which projects they are assigned to but cannot modify their own project assignments.

### Employee Project Assignment

### Employee Project Assignment

THE system SHALL require a valid employee reference when creating a project membership.

THE system SHALL require a valid project reference when creating a project membership.

THE system SHALL prevent duplicate project memberships where the same employee is assigned to the same project more than once.

When a project membership is created, THE system SHALL store the assigned employee identifier, the target project identifier, and the assigned role.

### Multiple Project Assignment Per Employee

THE system SHALL allow an employee to be assigned to multiple different projects simultaneously.

THE system SHALL NOT restrict the maximum number of project assignments per employee.

THE system SHALL calculate timelog totals across all projects for employees with multiple assignments.

### Project Membership Assigned Role

THE system SHALL require an assigned role to be specified when creating a project membership.

THE system SHALL validate that the assigned role is one of the permitted values: member or project-lead.

THE assigned role SHALL determine the permissions scope of the employee within that specific project.

### Project Lead Elevated Permissions

THE system SHALL grant project leads the ability to create tasks within their assigned project.

THE system SHALL grant project leads the ability to edit tasks within their assigned project.

THE system SHALL restrict project lead elevated permissions to the specific project where they hold the project-lead role.

THE system SHALL grant project leads the ability to view all tasks and timelogs within their assigned project.

### Project Member Task Management Restriction

THE system SHALL restrict employees assigned as member (non-lead) to viewing tasks only within projects they are assigned to.

THE system SHALL prevent employees with the member role from creating tasks unless they have the project:manage permission.

THE system SHALL prevent employees with the member role from editing tasks unless they have the project:manage permission.

### Project Assignment Permissions

THE system SHALL allow only users with the project:manage permission to assign employees to projects.

THE system SHALL reject assignment requests from users lacking the project:manage permission with an access denied message.

When an employee is assigned to a project, THE system SHALL record the assigning user in the audit trail.

### Project Removal Permissions

THE system SHALL allow only users with the project:manage permission to remove employees from projects.

THE system SHALL prevent removal of employees from projects if the action would orphan unreported timelogs.

THE system SHALL reject removal requests from users lacking the project:manage permission with an access denied message.

### Employee Project Visibility

THE system SHALL allow employees to view the list of projects they are assigned to.

THE system SHALL display the assigned role for each project in the employee's project list.

THE system SHALL allow employees to view tasks within projects they are assigned to.

THE system SHALL prevent employees from viewing project details for projects they are not assigned to, unless they have the project:view permission.

## Task Rules

Tasks require a title between 1 and 200 characters and must belong to a specific project. The description field is optional for additional context. Task status progression includes open, in-progress, completed, and closed states. Priority levels determine urgency with options of low, medium, high, and urgent. Estimated hours and due date are optional fields for planning purposes. A task can optionally be assigned to an employee, but that employee must be a member of the task's project. Tasks support one level of subtasking through an optional parent task reference; subtasks cannot have their own subtasks. Project leads and users with project management permission can create, edit, and update task status.

### Task Title Requirements

THE system SHALL require a title for every task.

THE system SHALL reject task creation or update requests that do not include a title.

THE task title SHALL be between 1 and 200 characters in length.

THE system SHALL reject task titles that exceed 200 characters or are empty.

WHEN a user attempts to create a task with a title exceeding the maximum length, THE system SHALL return an appropriate validation error message.

WHEN a user attempts to create a task with an empty title, THE system SHALL return an appropriate validation error message.

### Task Description

THE task description SHALL be optional.

THE system SHALL allow task creation without providing a description.

THE system SHALL allow task updates that modify the description field.

WHEN a description is not provided, THE system SHALL store an empty or null value for the description field.

THE system SHALL accept descriptions of any length up to 10,000 characters.

WHEN a description exceeds 10,000 characters, THE system SHALL reject the request with a validation error.

### Task Status Enumeration

THE system SHALL support four task statuses: open, in-progress, completed, and closed.

THE system SHALL only allow task status values from the defined enumeration.

THE system SHALL reject any attempt to set a status not defined in the enumeration.

WHEN a task is created, THE system SHALL set the initial status to open by default.

THE system SHALL allow status transitions in any order based on user permissions.

WHEN a status change occurs, THE system SHALL record the change in task history.

### Task Priority Enumeration

THE system SHALL support four priority levels: low, medium, high, and urgent.

THE system SHALL only allow priority values from the defined enumeration.

THE system SHALL reject any attempt to set a priority not defined in the enumeration.

WHEN a task is created, THE system SHALL set the initial priority to medium by default.

WHEN displaying tasks, THE system SHALL sort or indicate priority in accordance with the enumeration order: urgent first, then high, then medium, then low.

### Task Estimated Hours

THE task estimated hours SHALL be optional.

THE system SHALL allow task creation without providing estimated hours.

WHEN estimated hours are not provided, THE system SHALL store a null value.

THE task estimated hours SHALL be a positive numeric value.

THE system SHALL reject estimated hours that are negative or zero.

WHEN estimated hours are provided, THE system SHALL accept decimal values to allow fractional hours.

WHEN a user provides estimated hours exceeding reasonable bounds, THE system SHALL reject the request with a validation error.

### Task Due Date

THE task due date SHALL be optional.

THE system SHALL allow task creation without providing a due date.

WHEN a due date is not provided, THE system SHALL store a null value.

THE task due date SHALL be a valid calendar date.

THE system SHALL reject invalid date formats.

IF a task has a start date defined in its parent project, THE system SHALL allow due dates before, on, or after the project start date without restriction.

IF a task has a parent task with a due date, THE system SHALL allow the subtask due date to be any value without automatic validation.

### Task Employee Assignment

THE task employee assignment SHALL be optional.

THE system SHALL allow tasks to exist without being assigned to any employee.

IF an employee is assigned to a task, THE system SHALL verify that the employee is a member of the task's project.

THE system SHALL reject assignments where the specified employee is not a member of the project.

WHEN displaying assigned tasks, THE system SHALL show the employee name or identifier.

IF a project membership is removed, THE system SHALL automatically unassign the employee from all tasks within that project.

### Task Project Membership Requirement

THE system SHALL require every task to belong to a specific project.

THE system SHALL reject task creation requests that do not specify a project.

THE system SHALL store the project reference when a task is created.

WHEN a task is retrieved, THE system SHALL always include its associated project.

IF a project is deleted, THE system SHALL delete all tasks associated with that project.

Tasks from one project SHALL NOT be accessible through another project.

### Task Parent Reference

THE task parent reference SHALL be optional.

THE system SHALL allow tasks to exist without a parent task.

WHEN a task has no parent, THE system SHALL store a null value for the parent reference.

IF a parent reference is provided, THE system SHALL verify that the parent task exists within the same project.

THE system SHALL reject parent references to tasks in different projects.

Tasks with parents SHALL be considered subtasks.

WHEN a parent task is deleted, THE system SHALL set the parent reference of all child tasks to null without deleting the child tasks.

### Task Subtask Nesting Limit

THE system SHALL enforce a maximum nesting depth of one level for subtasks.

Tasks that have a parent task SHALL NOT be allowed to have their own subtasks.

THE system SHALL reject attempts to create a subtask under a task that already has a parent.

WHEN a user attempts to create a task with a parent that is itself a subtask, THE system SHALL return an appropriate validation error.

IF a user attempts to set a parent reference that would violate the nesting limit, THE system SHALL reject the request.

The following nesting structure SHALL be valid: Project → Parent Task → Subtask

The following nesting structure SHALL be invalid: Project → Parent Task → Subtask → Grandchild Task

## TaskHistory Rules

The system automatically records a history entry whenever a task's status changes, maintaining an audit trail of task progression. Each task history entry captures the timestamp of the change, the previous status value, the new status value, and the user who initiated the change. Task history records are immutable once created, preserving the accuracy of the audit trail. Task history entries cannot be modified or deleted after creation.

### Task Status Change Recording

WHEN a task's status is changed, THE system SHALL automatically create a task history entry to record the change.

A task history entry SHALL be created only when the status value differs from its previous value. If the status is set to the same value, no history entry is created.

The task history entry SHALL be created immediately upon successful status change and SHALL be associated with the task whose status was modified.

### Task History Timestamp

EACH task history entry SHALL record the exact timestamp when the status change occurred.

The timestamp SHALL represent the moment the status change was completed and accepted by the system.

The timestamp SHALL be stored in a format that preserves the date, time, and time zone information of the change.

### Task History Old Status Capture

EACH task history entry SHALL record the previous status value before the change was made.

The old status SHALL reflect the status value that was active immediately prior to the new status being set.

The old status SHALL be stored as a human-readable text representation of the status enumeration value that was replaced.

### Task History New Status Capture

EACH task history entry SHALL record the new status value after the change was made.

The new status SHALL reflect the status value that was set as a result of the change action.

The new status SHALL be stored as a human-readable text representation of the status enumeration value that was applied.

Valid status values include: open, in-progress, completed, and closed.

### Task History User Tracking

EACH task history entry SHALL record the user who initiated the status change.

The recorded user SHALL be the authenticated user who performed the action that resulted in the status change.

The user reference SHALL be stored using the user's unique identifier within the organization.

If a status change occurs through an automated process without direct user action, the system SHALL record the appropriate system actor or process identifier.

### Task History Immutability

TASK history entries SHALL NOT be modified after creation.

TASK history entries SHALL NOT be deleted after creation.

The system SHALL prevent any user, including organization owners and users with administrative permissions, from altering or removing task history entries.

This immutability ensures the integrity and reliability of the audit trail for compliance and accountability purposes.

### Task History Audit Trail

THE system SHALL maintain a complete and unbroken audit trail of all task status changes.

The audit trail SHALL be queryable by authorized users and SHALL support viewing the full progression of a task's status over time.

The audit trail SHALL be scoped to the organization and SHALL only display history entries for tasks within the currently selected organization context.

Users with appropriate permissions SHALL be able to retrieve the complete status change history for any task, including the chronological sequence of changes, who made each change, and when each change occurred.

## Timelog Rules

Timelogs must be associated with a date, duration measured in minutes, and a project where the employee is a member. The task field is optional but must belong to the selected project if provided. A description field allows employees to document what work was performed. The billable flag defaults to true and indicates whether the time can be charged to a client. Employees can only create, edit, or delete their own timelogs. Editing or deleting a timelog is prevented if that timelog is part of an approved timesheet. Timelogs included in submitted or approved timesheets cannot be deleted by the owning employee.

### Timelog Date Requirement

THE system SHALL require that every timelog entry has a date specified.

The date represents the calendar day on which the work was performed. This field is mandatory and cannot be left empty when creating or updating a timelog.

### Timelog Duration Requirement

THE system SHALL require that every timelog entry has a duration measured in minutes.

The duration represents the length of time worked and must be a positive numeric value. Zero or negative durations are not permitted.

### Timelog Project Assignment

THE system SHALL require that every timelog be associated with a project.

The project field is mandatory when creating a timelog. Employees must select from the list of projects they are assigned to as members.

### Timelog Task Optional Constraint

THE system MAY allow a timelog to be associated with a task.

When a task is provided, THE system SHALL verify that the task belongs to the selected project. If the task does not belong to the selected project, THE system SHALL reject the timelog creation or update.

### Timelog Project Membership Requirement

THE system SHALL only allow employees to log time against projects they are assigned to.

WHEN an employee attempts to create a timelog for a project they are not a member of, THE system SHALL reject the request with an appropriate error message.

### Timelog Description Optional

THE system MAY allow employees to provide a description with their timelog entry.

The description field is optional and allows employees to document what work was performed during the logged time. When provided, it should capture meaningful details about the work done.

### Timelog Billable Flag Default

THE system SHALL set the billable flag to true by default when creating a new timelog.

The billable flag indicates whether the logged time can be charged to a client. Employees may change this flag to false if the time is not billable. The default value ensures that new timelogs are assumed billable unless explicitly marked otherwise.

### Own Timelog Editing Restrictions

THE system SHALL only allow employees to edit their own timelog entries.

WHEN an employee attempts to edit a timelog that belongs to another employee, THE system SHALL reject the request. Users with the time manage permission can edit any employee's timelogs.

### Approved Timesheet Timelog Protection

THE system SHALL prevent editing of any timelog that is part of an approved timesheet.

WHEN an employee attempts to edit a timelog that belongs to an approved timesheet, THE system SHALL reject the request. Users with the time manage permission can override this restriction.

### Submitted Timesheet Timelog Deletion Restriction

THE system SHALL prevent deletion of any timelog that is part of a submitted or approved timesheet by the owning employee.

WHEN an employee attempts to delete a timelog that is included in a submitted or approved timesheet, THE system SHALL reject the request. Users with the time manage permission can delete any timelog regardless of timesheet status.

### Timelog Employee Ownership

THE system SHALL associate each timelog with the employee who created it.

Every timelog entry belongs to exactly one employee. Employees can only create timelogs for their own account. The system automatically associates new timelogs with the currently authenticated employee's record.

## Timesheet Rules

Timesheets cover a specific week defined by Monday as the start date and Sunday as the end date. The status progression for timesheets is draft, submitted, approved, and rejected. Total hours are automatically calculated from all included timelogs. When approved, the timesheet records the timestamp of approval and the reviewer who approved it. When rejected, a rejection reason text must be provided and the timesheet returns to draft status. A timesheet cannot be submitted if it contains no timelogs. A timesheet cannot be submitted if another timesheet for the same employee and week already exists with submitted or approved status. Approved timesheets lock all their included timelogs, preventing any modifications or deletions.

### Timesheet Week Definition

### Timesheet Week Boundary

Each timesheet covers exactly one calendar week, defined as Monday through Sunday.

### Week Start Date

THE system SHALL define the week start date as Monday of the respective week.

### Week End Date

THE system SHALL define the week end date as Sunday of the same week.

### Week Coverage

THE system SHALL ensure that every timesheet references exactly one complete Monday-to-Sunday period.

WHEN a user creates a draft timesheet, THE system SHALL automatically set the week start date to the Monday of the specified week and the week end date to the following Sunday.

### Timesheet Status States

### Status Enumeration

Every timesheet has exactly one status value drawn from the following states:

- **Draft**: The timesheet is being prepared and has not been submitted for approval
- **Submitted**: The timesheet has been submitted and awaits review by an authorized reviewer
- **Approved**: The timesheet has been reviewed and accepted by an authorized reviewer
- **Rejected**: The timesheet was reviewed but not accepted, and has returned to draft status

### Status Transition Rules

THE system SHALL permit transitions between statuses according to the following rules:

```mermaid
flowchart LR
    A["draft"] -->|"Submit for approval"| B["submitted"]
    B -->|"Approve"| C["approved"]
    B -->|"Reject with reason"| A
    C -->|"Cannot transition"| D["locked"]
```

- A draft timesheet MAY transition to submitted when the employee submits it
- A submitted timesheet MAY transition to approved when an authorized reviewer approves it
- A submitted timesheet MAY transition to rejected when an authorized reviewer rejects it with a reason
- An approved timesheet CANNOT transition to any other status
- A rejected timesheet returns to draft status and MAY be resubmitted

### Status Integrity

THE system SHALL prevent any status transition that is not defined in the status transition rules.

IF an approved timesheet is attempted to be modified, THE system SHALL reject the request with an appropriate error message.

### Timesheet Total Hours Calculation

### Automatic Calculation

THE system SHALL automatically calculate the total hours for a timesheet by summing the duration values from all included timelogs.

### Duration Unit

Timelog duration is measured in minutes. The total hours display SHALL convert minutes to hours for readability.

### Calculation Trigger

THE system SHALL recalculate the total hours whenever:

- A timelog is added to the timesheet
- A timelog is removed from the timesheet
- A timelog's duration is modified

### Display Format

The total hours SHALL be presented as a numeric value representing hours, with minutes optionally shown as a decimal fraction or separate field.

### Timesheet Approval Tracking

### Approval Timestamp

WHEN a timesheet is approved, THE system SHALL record the exact date and time when the approval occurred.

### Approval Reviewer Tracking

WHEN a timesheet is approved, THE system SHALL record which user performed the approval action.

### Reviewer Eligibility

Only users with the time approval permission within the same organization as the timesheet owner MAY approve or reject timesheets.

### Timestamp Immutability

Once recorded, the approval timestamp and reviewer information SHALL NOT be modified.

### Timesheet Rejection Handling

### Rejection Reason Requirement

WHEN a reviewer rejects a timesheet, THE system SHALL require a non-empty rejection reason text to be provided.

THE system SHALL reject any rejection attempt that does not include a rejection reason.

### Post-Rejection Status

WHEN a timesheet is rejected, THE system SHALL:

- Set the timesheet status back to draft
- Store the rejection reason for the employee's reference
- Record the review timestamp
- Record the reviewing user

### Resubmission After Rejection

THE system SHALL permit the employee to modify and resubmit a rejected timesheet following the same submission rules as a new timesheet.

### Timesheet Submission Validation

### Empty Submission Prevention

THE system SHALL prevent submission of a timesheet that contains no timelogs.

WHEN an employee attempts to submit an empty timesheet, THE system SHALL reject the request and display an error message indicating that at least one timelog is required.

### Duplicate Week Prevention

THE system SHALL prevent submission of a timesheet for a week that already has a submitted or approved timesheet for the same employee.

WHEN an employee attempts to submit a timesheet for a week with an existing submitted or approved timesheet, THE system SHALL reject the request and display an error message indicating the duplicate week conflict.

### Draft Editing Allowance

THE system SHALL permit unlimited modifications to a timesheet while its status is draft.

Employees MAY add timelogs to a draft timesheet.

Employees MAY remove timelogs from a draft timesheet.

Employees MAY modify timelog details within a draft timesheet.

### Timesheet Timelog Locking

### Lock Trigger

WHEN a timesheet transitions to approved status, THE system SHALL lock all timelogs that are included in that timesheet.

### Locked Timelog Behavior

For timelogs that are part of an approved timesheet:

- The timelog duration CANNOT be modified
- The timelog project assignment CANNOT be changed
- The timelog task assignment CANNOT be changed
- The timelog CANNOT be deleted
- The timelog date CANNOT be modified
- The timelog description CANNOT be modified

### Lock Immutability

THE system SHALL maintain the locked state of timelogs permanently. There is no mechanism to unlock approved timelogs.

### Authorized Override

Users with time management permission CANNOT override the lock on approved timelogs. The lock is absolute and permanent.

### Timesheet Draft Status Constraints

### Draft Exclusivity

A timesheet with draft status belongs exclusively to the employee who created it.

Only the owning employee MAY modify a draft timesheet.

### Draft Retention

THE system SHALL retain draft timesheets indefinitely until one of the following occurs:

- The employee submits the draft
- The employee deletes the draft
- The draft is removed through organization data management

### Draft Auto-Population

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL automatically include all timelogs belonging to that employee within that Monday-to-Sunday date range.

## Timer Rules

Employees can start a timer to track time in real-time, which requires selecting a project and optionally a task. Each employee can have at most one active timer running at any time. When a timer is stopped, it creates a timelog entry with the calculated duration rounded to the nearest minute. Employees can discard an active timer, which deletes the timer without creating any timelog. Active timers can have their description, project, and task modified while running. The timer records the start timestamp when initiated. Employees can view their currently running timer at any time.

### Timer Initialization

### Timer Start Requirement

THE system SHALL require employees to select a project before starting a timer.

THE system SHALL record the start timestamp automatically when an employee initiates a timer.

### Single Active Timer Constraint

THE system SHALL allow each employee to have at most one active timer at any given time.

IF an employee attempts to start a new timer while one is already running, THEN the system SHALL reject the request and return an error indicating an active timer already exists.

### Timer Project Selection

THE system SHALL require a valid project to be selected when starting a timer.

THE system SHALL require the selected project to be one the employee is assigned to as a project member.

IF the selected project does not exist or the employee is not assigned to it, THEN the system SHALL reject the timer start request.

### Timer Task Selection (Optional)

THE system SHALL allow an employee to optionally select a task when starting a timer.

IF a task is selected, THE system SHALL require the task to belong to the selected project.

IF a task is selected that does not belong to the selected project, THEN the system SHALL reject the timer start request.

### Timer Description

THE system SHALL allow employees to provide an optional description when starting a timer.

THE description field captures what work is being performed during the timed session.

### Timer Duration Calculation

### Timer Stop Duration Calculation

WHEN an employee stops a running timer, THE system SHALL calculate the duration as the difference between the stop timestamp and the start timestamp.

### Timer Duration Rounding

THE system SHALL round the calculated duration to the nearest minute.

### Timer to Timelog Conversion

WHEN a timer is stopped, THE system SHALL automatically create a timelog entry with the calculated rounded duration.

THE system SHALL associate the created timelog with the same project and task that were selected for the timer.

THE system SHALL use the timer description as the timelog description.

THE system SHALL set the timelog date to the current date when the timer is stopped.

### Timer Discard

WHEN an employee discards a running timer, THE system SHALL delete the timer without creating any timelog entry.

IF a timer is discarded, THEN no time record shall be created and no duration shall be recorded.

### Timer Editing While Running

### Timer Description Modification

WHILE a timer is running, THE system SHALL allow the employee to modify the timer description.

### Timer Project Modification

WHILE a timer is running, THE system SHALL allow the employee to change the selected project to a different project they are assigned to.

IF the employee changes the project to one they are not assigned to, THEN the system SHALL reject the project change request.

### Timer Task Modification

WHILE a timer is running, THE system SHALL allow the employee to change the selected task or remove the task assignment.

IF a task is selected after modification, THE system SHALL require the task to belong to the currently selected project.

IF a task is selected that does not belong to the current project, THEN the system SHALL reject the task change request.

### Timer Start Timestamp

THE system SHALL preserve the original start timestamp when any edits are made to a running timer.

THE system SHALL calculate duration only from the original start timestamp when the timer is stopped, regardless of any modifications made during the session.

### Timer Visibility

### Running Timer Visibility

THE system SHALL allow employees to view their currently running timer at any time.

IF an employee has an active timer, THE system SHALL display the timer details including: the project, the task (if assigned), the description, and the elapsed time since the start timestamp.

IF an employee has no active timer, THE system SHALL indicate that no timer is currently running.

### Timer Status Indicators

THE system SHALL clearly indicate whether a timer is actively running or stopped on the employee dashboard.

THE system SHALL display the active timer status prominently when present, allowing employees to quickly stop or edit the timer.

## Report Rules

Reports are scoped to a specific organization and must specify one of three report types: time, project-budget, or weekly-summary. Time reports show hours logged grouped by employee, project, or task with filtering by date range, employee, project, and billable status. Project budget reports display budget hours versus actual logged hours, showing the percentage consumed, and exclude projects without budget hours defined. Weekly summary reports provide week-by-week breakdowns showing total hours, timelog counts, and the number of employees who logged time, filterable by project. Access to reports requires the report viewing permission.

### Time Report Grouping

### Grouping Options

Time reports must support grouping by exactly one of three dimensions: employee, project, or task. Grouping by employee shows total hours logged per person. Grouping by project shows total hours logged per project. Grouping by task shows total hours logged per task within projects.

### Time Report Breakdown by Employee

When grouped by employee, the report must display each employee's total hours within the selected date range. For each employee, the report shows: employee name, total hours logged, billable hours, and non-billable hours. The sum of billable and non-billable hours must equal the total hours for each employee.

### Time Report Breakdown by Project

When grouped by project, the report must display each project's total hours within the selected date range. For each project, the report shows: project name, total hours logged, billable hours, and non-billable hours. The sum of billable and non-billable hours must equal the total hours for each project.

### Time Report Breakdown by Task

When grouped by task, the report must display each task's total hours within the selected date range. For each task, the report shows: task title, associated project name, total hours logged, billable hours, and non-billable hours. Tasks without a parent task (standalone tasks) and subtasks are both included in the grouping.

### Billable Hours Calculation

Billable hours represent the sum of durations from timelogs where the billable flag is set to true. The system must calculate billable hours automatically based on the timelogs included in the report scope.

### Non-Billable Hours Calculation

Non-billable hours represent the sum of durations from timelogs where the billable flag is set to false. The system must calculate non-billable hours automatically based on the timelogs included in the report scope.

### Project Budget Report Rules

### Budget Comparison Display

The project budget report must compare budgeted hours against actual hours logged for each project. For each project, the report must display: project name, budget hours (total estimated hours), actual hours logged, and the difference between budget and actual.

### Budget Percentage Consumed

The system must calculate and display the percentage of budget consumed for each project using the formula: (actual hours divided by budget hours) multiplied by 100. Projects with actual hours exceeding budget must show the percentage as greater than 100 percent.

### Projects Without Budget Hours Exclusion

Projects that do not have budget hours defined (budget hours is null or zero) must be excluded from the project budget report entirely. The report must not display any row for projects without budget hours.

### Budget Report Date Range

The project budget report must calculate actual hours based on all timelogs within the organization's history up to the current date, unless a specific date range is provided for filtering.

### Weekly Summary Report Rules

### Week Breakdown Structure

The weekly summary report must present data broken down by individual weeks within the selected date range. Each week must be displayed as a distinct period spanning Monday through Sunday.

### Timelog Count per Week

For each week in the summary, the report must display the total count of timelogs submitted by all employees during that week. This count represents the number of individual time entries logged.

### Employee Count per Week

For each week in the summary, the report must display the count of unique employees who logged at least one timelog during that week. An employee who logs multiple timelogs in the same week counts as one unique employee.

### Total Hours per Week

For each week in the summary, the report must display the sum of all timelog durations converted to hours. The total hours must reflect billable and non-billable combined.

### Report Filtering

### Date Range Filtering

All reports must support filtering by date range. Users must specify a start date and end date. The start date must not be after the end date. If the start date equals the end date, the report returns data for that single day. All timelogs falling on or between the start and end dates are included in the report scope.

### Project Filtering

Time reports and weekly summary reports must support filtering by one or more specific projects. When project filter is applied, only timelogs associated with the selected project or projects are included. When no project filter is applied, all projects within the organization are included.

### Employee Filtering

Time reports must support filtering by one or more specific employees. When employee filter is applied, only timelogs belonging to the selected employee or employees are included. When no employee filter is applied, all employees within the organization are included.

### Billable Status Filtering

Time reports must support filtering by billable status with three options: all timelogs, billable only, or non-billable only. When billable only is selected, only timelogs with the billable flag set to true are included. When non-billable only is selected, only timelogs with the billable flag set to false are included.

### Report Access Rules

### Report Viewing Permission Requirement

Users must possess the report viewing permission to access any report within the organization. Users without this permission must not be able to view, generate, or export any reports. This permission applies to all three report types: time report, project budget report, and weekly summary report.

### Report Data Scope

Reports must only display data belonging to the organization currently selected by the user. Reports must never include data from other organizations, even if the user belongs to multiple organizations.

### Report Generation Context

When generating a report, the system must use the currently selected organization context. All filtering, grouping, and data aggregation applies only within this organization scope.

### Report Error Scenarios

### Empty Date Range Error

If the specified date range contains no timelogs, the report must display an empty result set with appropriate messaging indicating no data exists for the selected period.

### Insufficient Permission Error

If a user attempts to access reports without the report viewing permission, the request must be rejected with an appropriate error message indicating access is denied.

### Invalid Date Range Error

If the start date provided is after the end date, the request must be rejected with an error message indicating the date range is invalid.

### No Matching Projects Error

If filtering by a project that has no timelogs within the date range, the report must return an empty result set rather than showing zero values for that project.

## ActivityLog Rules

Activity log entries record significant system actions with a timestamp, the user who performed the action, the type of action, the target entity affected, and additional details. Logged actions include employee lifecycle events (invited, deactivated, reactivated), contract changes, project lifecycle events, task status changes, timesheet submissions and approvals, and role assignments. Entries are immutable once created to preserve audit integrity. The activity log supports pagination for browsing historical entries. The log can be filtered by action type, specific user, and date range to help administrators trace system activity.

### Activity Log Entry Structure

Every activity log entry must contain a timestamp indicating when the action occurred.

The activity log must record the user who performed the action, capturing both their identifier and display name at the time of the action.

Each entry must specify an action type from the predefined list of logged actions.

The target entity must be identified by its type and unique identifier so that administrators can trace what was affected.

Additional details must be captured as a structured description that provides context about what happened, including relevant before and after values when applicable.

### Employee Action Logging

When an employee is invited to an organization, the activity log must record the invitation action with the invited employee's email and the inviting user's identity.

When an employee is deactivated, the activity log must record the deactivation action with the employee's name and the reason if provided.

When an employee is reactivated, the activity log must record the reactivation action with the employee's name and the user who performed the reactivation.

The system must log employee status changes immediately upon the action being completed, not before or after.

### Contract Action Logging

When a new contract is created for an employee, the activity log must record the contract creation with the employee's name, contract start date, pay rate, and pay period.

When an existing contract is edited, the activity log must record the changes made, capturing both the old values and new values for each modified field.

Contract actions must identify whether the contract being modified is the currently active contract or a historical contract.

The system must not log actions on contracts that are not being modified.

### Project Action Logging

When a project is created, the activity log must record the project name, the creating user, and the project status at creation.

When a project is archived, the activity log must record the project name and the user who performed the archival.

When a project is marked as completed, the activity log must record the project name, total hours logged at completion, and the user who marked it complete.

When a project is deleted, the activity log must record the project name and the user who performed the deletion. Deletion logging occurs before the deletion action is executed.

Project actions must not log routine edits to project details unless the user explicitly saves changes.

### Task Status Change Logging

When a task's status changes, the activity log must record the task title, the project it belongs to, the previous status, the new status, and the user who made the change.

Status changes include transitions between open, in-progress, completed, and closed statuses.

The system must log task status changes at the moment the status is updated in the database, capturing the exact timestamp of the change.

Only actual status transitions are logged; attempts to set a task to its current status are not recorded.

### Timesheet Action Logging

When an employee submits a timesheet for approval, the activity log must record the employee's name, the week covered by the timesheet, the total hours submitted, and the submission timestamp.

When a timesheet is approved, the activity log must record the employee's name, the week covered, the approving user's identity, and the approval timestamp.

When a timesheet is rejected, the activity log must record the employee's name, the week covered, the rejecting user's identity, the rejection reason, and the rejection timestamp.

Timesheet actions must identify both the employee whose timesheet is being acted upon and the user performing the action.

### Role Assignment Logging

When an employee is assigned a role for the first time upon joining an organization, the activity log must record the role assignment with the employee's name and the assigned role name.

When an employee's role is changed, the activity log must record the employee's name, the previous role, the new role, and the user who made the change.

Role assignment logs must capture both the human-readable role names and their internal identifiers for audit purposes.

Custom role creations and modifications are logged at the organization level rather than the employee level.

### Activity Log Browsing

The activity log must support pagination to help administrators browse historical entries efficiently.

Default pagination must show the most recent entries first, with configurable page size up to one hundred entries per page.

The activity log must be filterable by action type, allowing administrators to view only specific categories of actions such as employee events or project events.

The activity log must be filterable by user, allowing administrators to view all actions performed by a specific user within the organization.

The activity log must be filterable by date range, allowing administrators to restrict results to entries within a specific time period.

### Activity Log Immutability

Activity log entries must be immutable once created to preserve audit integrity.

No user, including organization owners, may edit or delete activity log entries.

The system must reject any request to modify or remove activity log entries with an error indicating that the records are protected.

Immutability applies to all fields within an entry including timestamp, user, action type, target entity, and details.

This immutability rule ensures that activity logs serve as a reliable source of truth for organizational audits and compliance reviews.

## Invitation Rules

Invitations are sent by email to add new employees to an organization. The invitation must specify the email address of the person being invited and the organization sending the invitation. If the invited email already has an existing user account, the user is immediately added to the organization as an employee. If the invited email has no existing account, a pending invitation is created and stored until the user signs up with that email address. When a user signs up with an invited email, they are automatically associated with the pending organization. Invitations track the email address and the organization context.

### Invitation Email Requirement

Every invitation must specify exactly one email address of the person being invited.

THE system SHALL reject invitation requests that do not include an email address.

THE system SHALL validate that the provided email address follows a valid email format.

Invitation emails must be unique within an organization — duplicate invitations to the same email address are not permitted while an active invitation exists.

### Invitation Organization Reference

Every invitation must reference the organization that is sending the invitation.

THE invitation SHALL capture the organization identifier from the context of the user creating the invitation.

Invitations are scoped to a single organization and cannot be used to join multiple organizations.

A user must have the `employee:manage` permission to create invitations within their organization.

### Existing User Invitation Handling

WHEN an invitation is created for an email address that already has an associated user account, THEN the system SHALL immediately add that user to the organization as an active employee.

The newly created employee record must link the existing user to the current organization with the default Employee role.

No pending invitation record is created when the invited user already has an account.

The inviter is notified of the successful addition.

### New User Invitation Handling

WHEN an invitation is created for an email address that does not have an existing user account, THEN the system SHALL create a pending invitation record.

THE pending invitation SHALL store the invited email address and the organization identifier.

The pending invitation remains valid until the invited user creates an account with the matching email address.

Invitations can be created by users with `employee:manage` permission only.

### Pending Invitation Creation

THE system SHALL create a pending invitation record containing the email address, organization reference, invitation status, and timestamp when the invitation was sent.

Pending invitations must be tracked with a status of "pending" until accepted or expired.

The system SHALL record the timestamp when the invitation was created.

Pending invitations can be revoked by users with `employee:manage` permission before they are accepted.

### Automatic Organization Linking on Signup

WHEN a new user signs up with an email address that matches a pending invitation, THEN the system SHALL automatically associate the new user with the pending organization.

THE system SHALL automatically create an employee record linking the new user to the organization referenced in the pending invitation.

THE pending invitation status SHALL be updated to "accepted" upon successful account creation and employee association.

If multiple pending invitations exist for the same email address across different organizations, the user is added to all referenced organizations.

### Invitation Status Tracking

THE system SHALL track invitation status using the following values: pending, accepted, and expired.

THE invitation status transitions from pending to accepted when the invited user creates an account and joins the organization.

Invitations may transition to expired status if the organization chooses to revoke pending invitations or if an expiration policy is defined.

Users with `employee:manage` permission can view the list of invitations for their organization including current status.

The activity log records when invitations are created, accepted, or revoked.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Requirements

### Filtering Requirements

Lists that support filtering must provide at least one filterable attribute based on the list type.

When a user applies a filter, the system SHALL return only records matching all selected filter criteria.

When a user clears all filters, the system SHALL return the complete unfiltered list.

#### Employee List Filtering

THE system SHALL allow filtering the employee list by department.

THE system SHALL allow filtering the employee list by employment type.

THE system SHALL allow filtering the employee list by status (active, deactivated).

THE system SHALL allow combining multiple filters simultaneously.

#### Project List Filtering

THE system SHALL allow filtering the project list by status (active, archived, completed).

#### Timelog Filtering

THE system SHALL allow filtering timelogs by date range.

THE system SHALL allow filtering timelogs by project.

THE system SHALL allow filtering timelogs by task.

THE system SHALL allow filtering timelogs by billable status.

#### Timesheet Filtering

THE system SHALL allow filtering timesheets by status.

THE system SHALL allow filtering timesheets by date range.

#### Task Filtering

THE system SHALL allow filtering tasks by status.

THE system SHALL allow filtering tasks by priority.

THE system SHALL allow filtering tasks by assigned employee.

#### Search Functionality

THE system SHALL allow searching the employee list by name.

Search results SHALL update dynamically as the user types.

Search SHALL be case-insensitive.

#### Filter Persistence

Selected filters SHALL persist during the user's session.

Selected filters SHALL be cleared when the user navigates away from the list view.

### Sorting Requirements

#### Task Sorting

THE system SHALL allow sorting tasks by due date.

THE system SHALL allow sorting tasks by priority.

THE system SHALL allow sorting tasks by creation date.

Default sort order SHALL be by creation date, descending (newest first).

#### Priority Sort Order

When sorting by priority, the system SHALL use the order: urgent, high, medium, low.

#### Sort Direction

THE system SHALL allow toggling between ascending and descending sort direction.

Default sort direction SHALL be descending.

### Pagination Requirements

#### Default Pagination

All list views SHALL display paginated results by default.

THE system SHALL display a maximum of 20 items per page.

#### Page Navigation

THE system SHALL display the current page number and total pages.

THE system SHALL provide navigation to go to the next page.

THE system SHALL provide navigation to go to the previous page.

THE system SHALL provide navigation to go to the first page.

THE system SHALL provide navigation to go to the last page.

#### Page Size Selection

THE system SHALL allow users to select page size from predefined options.

Available page size options SHALL be: 10, 20, 50, 100.

Changing page size SHALL reset the current page to the first page.

#### Empty Results

When no records match the current filters, the system SHALL display a message indicating no results were found.

#### Result Count

THE system SHALL display the total number of records matching the current filters.

The system SHALL display the range of records shown on the current page (e.g., "Showing 1-20 of 145").

### Activity Log Filtering

### Activity Log Filtering

THE system SHALL allow filtering the activity log by action type.

THE system SHALL allow filtering the activity log by user.

THE system SHALL allow filtering the activity log by date range.

THE system SHALL allow combining multiple filters on the activity log simultaneously.

### Report Filtering

#### Time Report Filtering

THE system SHALL allow filtering time reports by date range.

THE system SHALL allow filtering time reports by employee.

THE system SHALL allow filtering time reports by project.

THE system SHALL allow filtering time reports by billable status.

#### Weekly Summary Report Filtering

THE system SHALL allow filtering weekly summary reports by project.

### Filtering Behavior

When multiple filters are applied, the system SHALL apply all filters using AND logic (all conditions must match).

Invalid filter combinations SHALL return zero results without displaying an error.

Filters SHALL be validated before submission. If a filter value is invalid, the system SHALL reject the filter and display an error message describing the expected format.

### Combined Browsing Patterns

When users apply both filters and search, the system SHALL apply all criteria using AND logic.

When users apply filters, sorting, and pagination together, the system SHALL apply all three in sequence: filter first, then sort, then paginate the results.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Organization Deletion Errors

### Organization Deletion Errors

WHEN a user with organization management permission attempts to delete an organization, THE system SHALL reject the request if pending timesheets exist for any employee.

WHEN a user with organization management permission attempts to delete an organization, THE system SHALL reject the request if any employee has an active contract.

WHEN an organization deletion fails due to unresolved timesheets, THE system SHALL return an error indicating that all timesheets must be approved or rejected before deletion.

WHEN an organization deletion fails due to active contracts, THE system SHALL return an error indicating that all active employee contracts must be ended before deletion.

### User Account Deletion Errors

WHEN a user attempts to delete their own account, THE system SHALL reject the request if they are the sole owner of any organization.

WHEN a user account deletion is rejected, THE system SHALL inform the user that they must either transfer ownership or delete the organization first.

WHEN a user deletes their account while belonging to multiple organizations, THE system SHALL mark their employee records in other organizations as deactivated without deleting those records.

### Employee Deactivation Errors

WHEN a user with employee management permission attempts to allow a deactivated employee to create timelogs, THE system SHALL reject the request and display an error indicating the employee is deactivated.

WHEN a deactivated employee attempts to submit a timesheet, THE system SHALL reject the request.

### Role Management Errors

WHEN a user with organization management permission attempts to delete a built-in role, THE system SHALL reject the request and return an error indicating that built-in roles cannot be deleted.

WHEN a user with organization management permission attempts to delete a custom role that has employees assigned to it, THE system SHALL reject the request and return an error indicating that the role must be unassigned from all employees first.

### Project Operation Errors

WHEN a user with project management permission attempts to delete a project that has associated timelogs, THE system SHALL reject the request and return an error indicating that the project cannot be deleted because it contains timelog records.

WHEN an employee attempts to create a timelog for a project that has status archived or completed, THE system SHALL reject the request and return an error indicating that the project is no longer accepting timelogs.

### Timelog Edit and Delete Errors

WHEN an employee attempts to edit a timelog that is part of an approved timesheet, THE system SHALL reject the request and return an error indicating that timelogs within approved timesheets cannot be modified.

WHEN an employee attempts to delete a timelog that is part of any submitted or approved timesheet, THE system SHALL reject the request and return an error indicating that timelogs within submitted or approved timesheets cannot be removed.

WHEN a user without time management permission attempts to edit another employee's timelogs, THE system SHALL reject the request and return an access denied error.

### Timesheet Submission Errors

WHEN an employee attempts to submit a timesheet that contains no timelogs, THE system SHALL reject the request and return an error indicating that a timesheet must contain at least one timelog before submission.

WHEN an employee attempts to submit a timesheet for a week where another timesheet is already submitted or approved, THE system SHALL reject the request and return an error indicating that a timesheet for this period already exists with conflicting status.

WHEN a user with time approval permission attempts to approve a timesheet that has already been approved, THE system SHALL return an error indicating the timesheet is already in approved status.

WHEN a user with time approval permission rejects a timesheet without providing a rejection reason, THE system SHALL reject the request and require a rejection reason to be provided.

### Timer Operation Errors

WHEN an employee attempts to start a new timer while already having an active timer running, THE system SHALL reject the request and return an error indicating that only one timer can be active at a time.

### Invitation Errors

WHEN an invitation is sent to an email address that is already a member of the organization, THE system SHALL return an error indicating that this user is already part of the organization.

### Access Control Errors

WHEN a user attempts to perform an action without the required permission, THE system SHALL reject the request and return an access denied error.

WHEN a user attempts to access an employee's contracts without employee view permission, THE system SHALL reject the request and return an access denied error.

WHEN a user without time view all permission attempts to view another employee's timelogs, THE system SHALL reject the request and return an access denied error.

### Resource Not Found Errors

WHEN a request references an organization that does not exist, THE system SHALL reject the request and return a not found error.

WHEN a request references an employee that does not exist within the current organization context, THE system SHALL reject the request and return a not found error.

WHEN a request references a project that does not exist within the current organization, THE system SHALL reject the request and return a not found error.

WHEN a request references a task that does not exist, THE system SHALL reject the request and return a not found error.

### Data Isolation Errors

WHEN a user attempts to access data belonging to an organization different from the currently selected organization, THE system SHALL reject the request and return an access denied error.

### Validation Errors

WHEN required fields are missing from a create or update request, THE system SHALL reject the request and return a validation error listing all missing required fields.

WHEN a date range is invalid such that the end date precedes the start date, THE system SHALL reject the request and return a validation error indicating the date range is invalid.

WHEN a contract end date is set to a date before the contract start date, THE system SHALL reject the request and return a validation error indicating the end date must be after the start date.

WHEN an invitation is created for an invalid email format, THE system SHALL reject the request and return a validation error indicating the email address format is invalid.