**erpTimeTrack — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with a valid email address and password to create an account. The email address serves as the unique identifier for the user across the platform. Users can log in using their registered email and password combination. Password changes are allowed for security purposes, requiring the user to provide their current password. A single user account can belong to multiple organizations, enabling cross-organization access. During login, users must select which organization context they wish to work within. Users can switch between their organizations without needing to log out. Account deletion is restricted when the user is the sole owner of an organization, requiring either ownership transfer or organization deletion first. User profiles include display name, avatar image, and phone number that are shared across all organizations the user belongs to. Profile information can be edited by the user at any time. The system prevents duplicate email addresses during registration to maintain account uniqueness.

### User Registration Requirements

Users must sign up for an account using a valid email address and password. The email address serves as the user's primary identifier for authentication. During registration, both email and password fields are required. If either field is missing, registration fails. The email address must follow standard email format conventions (contains '@' and domain). The password must meet minimum security requirements (not specified in requirements, but implied as system policy). New users automatically create an organization during sign-up as described in organization rules.

### Email Uniqueness Constraint

Each email address can be registered to only one user account across the entire platform. When a user attempts to register with an email address already associated with an existing account, the registration is rejected. Email address uniqueness is enforced regardless of case (case-insensitive comparison). This constraint prevents duplicate accounts and ensures each user has a unique identity.

### Password Change Verification

Users can change their password at any time. To change password, users must provide their current password for verification. If the current password does not match the stored credentials, the password change request is rejected. Password changes do not affect the user's session - they remain logged in. Users who forget their current password must use a password reset mechanism (implied but not specified in requirements).

### Multi-Organization Membership

A single user account can belong to multiple organizations simultaneously. There is no limit to the number of organizations a user can join. When invited to an organization, users are added to that organization's employee list with an assigned role. Users maintain separate employee records in each organization they belong to. Users can access any organization they belong to by switching organization context.

### Organization Context Selection and Switching

When users log in, they must select which organization context they wish to work within from the organizations they belong to. All subsequent actions (viewing data, creating records, etc.) are scoped to the selected organization. Users can switch to a different organization without logging out. Organization switching is immediate and does not require re-authentication. The system maintains strict data isolation between organizations - users only see data for their currently selected organization.

### Account Deletion Restrictions

Users can delete their account, subject to the following restrictions:

1. If the user is the sole owner of an organization, they must either transfer ownership to another user or delete the organization before they can delete their account.
2. When a user deletes their account, their employee records in organizations where they are not the sole owner are marked as "deactivated" rather than deleted.
3. Deactivated employee records preserve historical data (timelogs, timesheets, etc.) for organizational reporting purposes.
4. Account deletion is permanent and irreversible.

If a user attempts to delete their account while being the sole owner of one or more organizations, the deletion request is rejected with instructions to resolve the ownership issue first.

### Profile Management Rules

Each user has a global profile with the following fields:
- Display name (required)
- Avatar image (optional)
- Phone number (optional)

Profile information is shared across all organizations the user belongs to. Changes to profile information are reflected immediately in all organization contexts. Users can edit their own profile at any time. There are no organization-specific profile overrides - the same profile data is visible in all organizations.

### Email Validation During Registration

During user registration, the system validates the email address for:
1. Format correctness (must contain '@' and valid domain structure)
2. Uniqueness (must not already be registered to another user)
3. Availability (must not be reserved or blacklisted by system policy)

If the email address fails any validation check, registration is rejected with an appropriate error message. Email validation occurs synchronously during the registration process - users receive immediate feedback. Email addresses are normalized (trimmed, lowercased) before validation to ensure consistent uniqueness checking.

## Organization Rules

Organizations are created during the initial user sign-up process, establishing the foundational multi-tenant structure. Each organization requires a name for identification and can include an optional description for context. Organizations can set a logo image for branding purposes within their instance. Currency settings must be selected from supported options (USD, EUR, KRW) for financial reporting consistency. Timezone configuration ensures proper time tracking alignment across the organization. Fiscal start month determines the accounting period boundaries for reporting purposes. Organization owners have exclusive permission to edit organization settings after creation. Organization deletion is only permitted when all pending timesheets have been resolved (approved or rejected). Organization deletion also requires that no active employee contracts exist within the organization. When an organization is deleted, all associated data including employees, projects, tasks, timelogs, and timesheets are permanently removed. The owner's user account remains active but loses association with the deleted organization. Each organization operates independently with complete data isolation from other organizations.

### Organization Creation and Basic Properties

### Organization Creation and Basic Properties

**Organization Creation During Sign-Up**
- WHEN a user completes the sign-up process, THE SYSTEM SHALL create a new organization.
- WHERE organization creation, THE SYSTEM SHALL automatically assign the creating user as the organization owner.
- THE SYSTEM SHALL NOT allow users to create multiple organizations during initial sign-up.

**Required Organization Name Field**
- WHERE organization creation or editing, THE SYSTEM SHALL require a name to be provided.
- IF the organization name is empty or contains only whitespace, THE SYSTEM SHALL reject the request.
- THE SYSTEM SHALL enforce a maximum character limit for organization names to ensure consistent display.
- THE SYSTEM SHALL allow organization names to be edited by users with appropriate permissions.

**Logo Image Upload for Branding**
- WHERE organization settings, THE SYSTEM SHALL allow organization owners to upload a logo image.
- THE SYSTEM SHALL validate uploaded logo images to ensure they meet format and size requirements.
- IF an invalid image format is uploaded, THE SYSTEM SHALL reject the upload with an appropriate error message.
- IF the uploaded image exceeds size limits, THE SYSTEM SHALL reject the upload with guidance on acceptable dimensions.
- THE SYSTEM SHALL display the organization logo in the user interface when available.

**Complete Organizational Data Isolation**
- THE SYSTEM SHALL enforce strict data isolation between organizations.
- WHERE any data access request, THE SYSTEM SHALL verify the requesting user belongs to the target organization.
- IF a user attempts to access data from an organization they do not belong to, THE SYSTEM SHALL reject the request.
- THE SYSTEM SHALL prevent cross-organization data leakage in all queries and reports.

### Organization Configuration and Settings

### Organization Configuration and Settings

**Currency Selection from Supported Options**
- WHERE organization creation or settings update, THE SYSTEM SHALL require selection of a currency from supported options.
- THE SYSTEM SHALL validate that the selected currency is among the supported list (USD, EUR, KRW).
- IF an unsupported currency is specified, THE SYSTEM SHALL reject the request.
- THE SYSTEM SHALL apply the selected currency to all financial calculations and reports within the organization.
- THE SYSTEM SHALL prevent currency changes if there are financial transactions or contracts using the current currency.

**Timezone Configuration for Time Tracking**
- WHERE organization creation or settings update, THE SYSTEM SHALL require selection of a timezone.
- THE SYSTEM SHALL validate that the selected timezone is a recognized and supported timezone identifier.
- THE SYSTEM SHALL apply the selected timezone to all time tracking, reporting, and scheduling within the organization.
- THE SYSTEM SHALL ensure consistent timezone handling across all date and time displays for organization members.
- THE SYSTEM SHALL convert all times entered by users to the organization's timezone for storage and reporting.

**Fiscal Start Month Setting**
- WHERE organization creation or settings update, THE SYSTEM SHALL allow specification of a fiscal start month.
- THE SYSTEM SHALL validate that the fiscal start month is a valid month (1-12 representing January to December).
- THE SYSTEM SHALL use the fiscal start month to determine reporting periods and financial year boundaries.
- THE SYSTEM SHALL generate reports based on fiscal periods aligned with the fiscal start month.
- THE SYSTEM SHALL prevent fiscal start month changes during active reporting periods to maintain data consistency.

### Organization Ownership and Management Permissions

### Organization Ownership and Management Permissions

**Organization Owner Exclusive Edit Permissions**
- WHERE organization settings modification, THE SYSTEM SHALL verify the requesting user has organization owner role.
- IF a non-owner user attempts to modify organization settings, THE SYSTEM SHALL reject the request.
- THE SYSTEM SHALL allow organization owners to modify all organization properties: name, description, logo, currency, timezone, and fiscal start month.
- THE SYSTEM SHALL provide organization owners with a settings interface accessible only to them.
- THE SYSTEM SHALL maintain an audit trail of all organization setting changes made by owners.

**Role-Based Access Enforcement**
- WHERE any organizational operation, THE SYSTEM SHALL verify the user's role within the organization.
- THE SYSTEM SHALL enforce that only organization owners can manage roles and permissions.
- THE SYSTEM SHALL ensure managers can perform employee and project management but cannot modify organization settings.
- THE SYSTEM SHALL ensure employees can only perform time tracking and view their own data.
- THE SYSTEM SHALL prevent role escalation or permission bypass attempts.

### Organization Deletion and Data Cleanup

### Organization Deletion and Data Cleanup

**Organization Deletion with Resolved Timesheets Requirement**
- WHERE organization deletion is requested, THE SYSTEM SHALL verify all pending timesheets are resolved.
- THE SYSTEM SHALL check that no timesheets in 'submitted' status exist within the organization.
- IF any submitted timesheets exist, THE SYSTEM SHALL prevent deletion and notify the owner.
- THE SYSTEM SHALL require all timesheets to be either approved or rejected before allowing deletion.
- THE SYSTEM SHALL provide a report of pending timesheets that must be resolved before deletion.

**Organization Deletion with No Active Contracts Requirement**
- WHERE organization deletion is requested, THE SYSTEM SHALL verify no active employee contracts exist.
- THE SYSTEM SHALL check that all employee contracts have end dates in the past or are explicitly terminated.
- IF any active contracts exist (ongoing without end dates), THE SYSTEM SHALL prevent deletion.
- THE SYSTEM SHALL require contract termination or completion before allowing organization deletion.
- THE SYSTEM SHALL provide a list of employees with active contracts that must be addressed.

**Data Permanence on Organization Deletion**
- WHEN an organization is deleted, THE SYSTEM SHALL permanently remove all organization data.
- THE SYSTEM SHALL delete all associated employees, projects, tasks, timelogs, and timesheets.
- THE SYSTEM SHALL NOT retain any organization data after deletion for recovery purposes.
- THE SYSTEM SHALL maintain the owner's user account but remove its association with the deleted organization.
- THE SYSTEM SHALL provide a confirmation warning about permanent data loss before finalizing deletion.

**Deletion Validation Sequence**
- THE SYSTEM SHALL perform deletion validation checks in sequence: timesheets first, then contracts.
- IF either validation fails, THE SYSTEM SHALL halt the deletion process and report the specific failure.
- THE SYSTEM SHALL provide actionable guidance on resolving each validation failure.
- THE SYSTEM SHALL allow the deletion process to resume after all validation requirements are met.

## Employee Rules

Employee invitations are sent via email by users with employee management permissions. If the invited email already has a user account, the user is immediately added to the organization. For emails without existing accounts, pending invitations are created and automatically fulfilled upon user registration. Each employee record must have exactly one role assigned within the organization. Employee department assignment is optional and can be set or left empty. Position or title information is optional for employee identification. Employment type must be specified as full-time, part-time, contractor, or intern. Employee status must be either active or deactivated, controlling system access. Deactivated employees cannot log time or submit timesheets but their historical data is preserved. Reactivation of deactivated employees restores their ability to participate in time tracking. Employees can be searched by name within the organization's employee list. Employee lists support filtering by department, employment type, and status for better management. Each employee record references a user account, linking identity to organizational role.

### Employee Invitation via Email

WHEN a user with employee management permissions invites a new employee to the organization via email, THE SYSTEM SHALL send an invitation email to the specified address.

IF the invited email address already has a user account in the system, THEN THE SYSTEM SHALL immediately add that user as an employee to the organization with the designated role.

IF the invited email address does not have a user account in the system, THEN THE SYSTEM SHALL create a pending invitation record associated with that email address.

WHEN a user later signs up with an email address matching a pending invitation, THE SYSTEM SHALL automatically fulfill the invitation by adding the new user as an employee to the organization with the designated role.

IF an invitation email cannot be delivered (e.g., invalid email format, domain unreachable), THEN THE SYSTEM SHALL reject the invitation request and inform the inviting user.

### Single Role Assignment per Employee

THE SYSTEM SHALL ensure that each employee record within an organization is assigned exactly one role.

WHEN assigning or changing an employee's role, THE SYSTEM SHALL require that the specified role exists within the organization.

IF an attempt is made to assign multiple roles to a single employee, THEN THE SYSTEM SHALL reject the assignment.

IF an attempt is made to remove an employee's only role without assigning a new one, THEN THE SYSTEM SHALL reject the removal.

WHEN a custom role is deleted, THE SYSTEM SHALL prevent the deletion if any employees are currently assigned to that role.

### Optional Department and Position Fields

THE SYSTEM SHALL allow the department field in an employee record to be empty (null).

THE SYSTEM SHALL allow the position/title field in an employee record to be empty (null).

WHEN an employee's department is set, THE SYSTEM SHALL require that the specified department exists within the organization.

IF a department is deleted while employees are assigned to it, THEN THE SYSTEM SHALL set those employees' department fields to null (but preserve the employees).

THE SYSTEM SHALL allow editing of department and position fields for employees by users with employee management permissions.

### Employment Type Specification Requirement

THE SYSTEM SHALL require that every employee record specifies an employment type.

THE SYSTEM SHALL restrict employment type values to: full-time, part-time, contractor, or intern.

IF an attempt is made to create or update an employee record without specifying an employment type, THEN THE SYSTEM SHALL reject the request.

THE SYSTEM SHALL prevent changing employment type to values outside the allowed set.

WHEN filtering employee lists by employment type, THE SYSTEM SHALL include only employees matching the selected type(s).

### Active Versus Deactivated Status Control

THE SYSTEM SHALL require that every employee record has a status of either 'active' or 'deactivated'.

WHEN an employee is first added to an organization, THE SYSTEM SHALL set their status to 'active'.

WHEN a user with employee management permissions deactivates an employee, THE SYSTEM SHALL change the employee's status from 'active' to 'deactivated'.

THE SYSTEM SHALL prevent deactivated employees from logging time entries (timelogs).

THE SYSTEM SHALL prevent deactivated employees from submitting timesheets.

WHEN an employee is deactivated, THE SYSTEM SHALL preserve all historical data (timelogs, timesheets, contracts) associated with that employee.

WHEN an employee is reactivated, THE SYSTEM SHALL restore their ability to log time and submit timesheets.

### Employee Reactivation Capability

WHEN a user with employee management permissions reactivates a deactivated employee, THE SYSTEM SHALL change the employee's status from 'deactivated' to 'active'.

THE SYSTEM SHALL allow reactivation of employees who were previously deactivated.

AFTER reactivation, THE SYSTEM SHALL treat the employee as active for all purposes (time tracking, timesheet submission, project assignments).

IF an attempt is made to reactivate an employee who is already active, THEN THE SYSTEM SHALL reject the request.

THE SYSTEM SHALL preserve all employee data (contracts, timelogs, timesheets) during both deactivation and reactivation processes.

### Employee Search and Filtering Capabilities

THE SYSTEM SHALL provide search functionality that allows users to find employees by name.

WHEN searching for employees by name, THE SYSTEM SHALL match against the employee's user display name.

THE SYSTEM SHALL provide filtering options for employee lists by department.

WHEN filtering by department, THE SYSTEM SHALL include only employees assigned to the selected department(s).

THE SYSTEM SHALL provide filtering options for employee lists by employment type.

WHEN filtering by employment type, THE SYSTEM SHALL include only employees with the selected employment type(s).

THE SYSTEM SHALL provide filtering options for employee lists by status (active/deactivated).

WHEN filtering by status, THE SYSTEM SHALL include only employees with the selected status.

THE SYSTEM SHALL paginate employee lists when the number of results exceeds a reasonable display limit.

WHEN paginating employee lists, THE SYSTEM SHALL maintain applied search terms and filters across pages.

### User Account Reference in Employee Records

THE SYSTEM SHALL require that every employee record references exactly one user account.

WHEN creating an employee record from an existing user account, THE SYSTEM SHALL validate that the referenced user account exists.

WHEN creating an employee record from a pending invitation, THE SYSTEM SHALL create the employee record only after the user account is created with the matching email.

THE SYSTEM SHALL prevent creation of employee records that do not reference a valid user account.

IF a user account is deleted, THEN THE SYSTEM SHALL handle the associated employee records according to account deletion rules (mark as deactivated if not sole owner).

THE SYSTEM SHALL allow a single user account to be referenced by multiple employee records across different organizations.

WITHIN a single organization, THE SYSTEM SHALL prevent a user account from being referenced by more than one employee record.

## Role Rules

Three built-in roles (Owner, Manager, Employee) exist in every organization and cannot be deleted. Organization owners have full access to all features including role and member management. Managers can manage employees, projects, approve timesheets, and view organizational reports. Employees can track time, submit timesheets, and view their own data. Custom roles can be created by organization owners with specific permission sets. Each custom role requires a name for identification and a defined set of permissions. Available permissions include organization management, employee management, project management, time management, time approval, time viewing, and report viewing. Custom roles can be edited by organization owners to modify permission assignments. Custom role deletion is only allowed when no employees are assigned to that role. Each employee must be assigned exactly one role within the organization. Role assignment changes require employee management permissions. Permission definitions control access to specific organizational features and data. Built-in roles serve as foundational templates that cannot be modified or removed.

### Built-in Roles Definition and Properties

### Three Fixed Built-in Roles

Every organization in the system has exactly three built-in roles that cannot be deleted, modified, or removed:
1. Owner
2. Manager
3. Employee

These roles serve as the foundation for organizational access control and cannot be altered in their core definitions. The system enforces their permanent existence in every organization.

### Owner Role Full Access

The Owner role provides complete access to all features and data within the organization. Owners can perform any action including:
- Managing organization settings and configuration
- Creating, editing, and deleting custom roles
- Managing all employees and their assignments
- Accessing all projects, tasks, and time tracking data
- Approving or rejecting any timesheet
- Viewing all organizational reports and activity logs

### Manager Role with Approval Authority

The Manager role includes capabilities for organizational oversight and approval workflows. Managers can:
- Manage employees (add, edit, deactivate)
- Manage projects and tasks (create, edit, archive, complete)
- Approve or reject timesheets submitted by employees
- View organizational reports and analytics
- Access employee lists and details

### Employee Role with Time Tracking Focus

The Employee role focuses on time tracking and personal data management. Employees can:
- Track time through timelogs and timer functionality
- Submit timesheets for approval
- View their own time tracking data and personal information
- Access assigned projects and tasks
- View their own contracts and employment details

### Custom Role Creation and Management

### Custom Role Creation by Owners

Only users with the Owner role can create custom roles within an organization. When creating a custom role, the system requires:
- A unique role name within the organization
- A defined set of permissions selected from available options

### Role Name Requirements

Every role (including custom roles) must have a name that:
- Is not empty
- Is unique within the organization (no two roles can share the same name)
- Does not conflict with built-in role names (Owner, Manager, Employee)

### Permission Set Definition

Custom roles must be assigned a specific set of permissions. The available permissions include:
- Organization management: Edit organization settings
- Employee management: Add, edit, deactivate employees
- Employee viewing: View employee list and details
- Project management: Create, edit, delete projects and tasks
- Project viewing: View projects and tasks
- Time management: Edit or delete any employee's timelogs
- Time approval: Approve or reject timesheets
- Time viewing (all): View all employees' timelogs and timesheets
- Report viewing: View organization reports

### Custom Role Editing

Owners can edit custom roles to modify their permission assignments. Editing a role affects all employees assigned to that role immediately upon saving changes.

### Custom Role Deletion Constraints

Custom roles can only be deleted when:
- No employees are currently assigned to the role
- The role is not one of the three built-in roles (Owner, Manager, Employee)

If any employee is assigned to a custom role, deletion is prohibited until all assignments are removed or changed.

### Role Assignment and Permissions

### Single Role Assignment per Employee

Each employee within an organization must be assigned exactly one role. The system enforces that:
- Every active employee has one assigned role
- No employee can have zero roles assigned
- No employee can have multiple roles assigned simultaneously

### Role Assignment Change Authorization

Changing an employee's role assignment requires the `employee:manage` permission. Users with this permission can:
- Assign a different role to an employee
- Change assignments between built-in and custom roles
- Update role assignments as part of employee management

### Permission-Based Access Control

The system grants access to features based on the permissions assigned to a user's role. When a user attempts to perform an action, the system checks if their assigned role includes the required permission for that action.

### Organization Management Permission Scope

The organization management permission (`org:manage`) allows users to:
- Edit organization name, description, logo, currency, timezone, and fiscal start month
- Manage departments (create, edit, delete)
- Access the full activity log
- Delete the organization when conditions are met

### Employee Management Permission Scope

The employee management permission (`employee:manage`) allows users to:
- Invite new employees via email
- Edit employee records (department, position, employment type)
- Deactivate or reactivate employees
- Create and edit employee contracts
- Change employee role assignments

### Project Management Permission Scope

The project management permission (`project:manage`) allows users to:
- Create, edit, archive, complete, and delete projects
- Assign employees to projects as members or project leads
- Create and edit tasks within projects
- Remove employees from projects

### Time Approval Permission Scope

The time approval permission (`time:approve`) allows users to:
- View all submitted timesheets awaiting approval
- Approve timesheets, which locks all included timelogs from editing
- Reject timesheets with a required rejection reason
- Return rejected timesheets to draft status for employee modification

### Role Validation and Error Conditions

### Role Name Validation Errors

The system rejects role creation or editing when:
- The role name is empty or contains only whitespace
- The role name duplicates an existing role name within the organization
- The role name matches a built-in role name (Owner, Manager, Employee) for custom roles

### Permission Assignment Errors

The system prevents invalid permission configurations by rejecting:
- Role assignments that include permissions not available in the system
- Attempts to assign the `org:manage` permission to non-Owner roles (for built-in roles)
- Permission sets that would create security conflicts (determined by system logic)

### Role Deletion Error Conditions

Role deletion fails when:
- Attempting to delete any of the three built-in roles (Owner, Manager, Employee)
- The role has one or more employees currently assigned to it
- The user attempting deletion does not have Owner role permissions

### Role Assignment Change Errors

Changing an employee's role assignment fails when:
- The target role does not exist in the organization
- The user making the change lacks `employee:manage` permission
- The employee record is deactivated (requires reactivation first)
- The change would violate single-role-per-employee constraint

### Built-in Role Protection

The system protects built-in roles by preventing:
- Deletion of Owner, Manager, or Employee roles
- Modification of built-in role names
- Removal of core permissions from built-in roles
- Assignment of built-in roles to custom role permission sets

## Department Rules

Departments are organizational units that help structure employee groupings. Each department requires a name for identification and can include an optional description. Departments support one level of nesting through optional parent department assignment. Parent departments cannot reference themselves or create circular dependencies. Department creation, editing, and deletion require organization management permissions. When a department is deleted, employees previously assigned to that department have their department field set to null. Department deletion does not affect employee records beyond the department assignment. Employees can view the list of departments within their organization. Department structures help organize reporting and project assignment within the organization. The system prevents orphaned departments by maintaining referential integrity. Department names must be unique within an organization to avoid confusion. Parent department assignment allows for hierarchical organizational structures.

### Department Name Requirements

THE system SHALL require a department name when creating or editing a department.
THE department name SHALL be a non-empty string.
THE department name SHALL be unique within the organization to avoid confusion.
IF a department name is not provided, THEN THE system SHALL reject the request.
IF a department name matches an existing department name within the same organization, THEN THE system SHALL reject the request.

### Department Description and Nesting

WHERE department description is provided, THE system SHALL accept it as optional text.
THE system SHALL support one level of parent department nesting.
WHERE a parent department is assigned, THE parent department SHALL belong to the same organization.
THE system SHALL prevent circular department references (a department cannot be its own parent or create dependency loops).
IF a parent department is specified that does not exist in the organization, THEN THE system SHALL reject the request.
IF assigning a parent department would create circular dependency (e.g., Department A → Department B → Department A), THEN THE system SHALL reject the request.

### Department Management Permissions

THE system SHALL require organization management permission for creating departments.
THE system SHALL require organization management permission for editing departments.
THE system SHALL require organization management permission for deleting departments.
IF a user without organization management permission attempts to create, edit, or delete a department, THEN THE system SHALL reject the request.
Users with organization management permission SHALL be able to view all department operations.

### Department Deletion Rules

WHEN a department is deleted, THE system SHALL set the department field to null for all employees previously assigned to that department.
THE system SHALL preserve all employee records when deleting a department (employees are not deleted).
THE system SHALL maintain referential integrity when deleting departments (no orphaned department references in employee records).
IF a department has child departments (nested departments), THEN THE system SHALL require deletion of child departments first or reassignment of their parent references before deleting the parent department.

### Department Visibility and Structure

Employees SHALL be able to view the list of departments within their organization.
THE system SHALL support hierarchical department structures through parent department assignment.
THE system SHALL maintain the parent-child relationship integrity within department structures.
Employees SHALL be able to see the department hierarchy when viewing the department list.
The department list SHALL display department names and their hierarchical relationships.

## Project Rules

Projects require a name for identification and a color code for visual differentiation in the user interface. Project descriptions are optional but can provide additional context about the project's purpose. Projects must have a status of active, archived, or completed to indicate their current state. Budget hours can be set optionally to track estimated versus actual time spent. Start and end dates are optional for project timeline tracking. Archived or completed projects cannot receive new timelogs, preserving historical data integrity. Project deletion is only permitted when the project has no associated timelogs. Project lists support pagination for managing large numbers of projects. Projects can be filtered by status (active, archived, completed) for easier management. Project creation and management require project management permissions. Color codes ensure consistent visual representation across the application interface. Active projects allow new time tracking entries from assigned employees.

### Project Naming and Visual Identification

### Project Naming and Visual Identification

All projects must have a name for identification purposes. The name is required and cannot be empty.

All projects must have a color code for visual differentiation in the user interface. The color code is required and must be a valid color representation that ensures consistent display across the application.

Color codes must maintain visual consistency when displayed to users. If a project's color code changes, the system must update all visual representations of that project throughout the user interface.

Project names must be unique within an organization to prevent confusion. If a user attempts to create a project with a name that already exists in the same organization, the request is rejected.

Project names must be between 1 and 100 characters in length. Names shorter than 1 character or longer than 100 characters are rejected.

Color codes must follow a standard format that the user interface can properly interpret. If the color code format is invalid, the request is rejected.

When editing a project, both the name and color code can be updated. However, the name must still meet all naming requirements after the update.

If a project name is changed, the system must reflect this change in all references to that project, including reports, timesheets, and dashboards.

Color codes are used for visual grouping and identification in reports and dashboards. The system must ensure color codes remain distinct enough for users to differentiate between projects.

### Project Status and Timeline Restrictions

### Project Status and Timeline Restrictions

Projects must have a status of either active, archived, or completed. No other status values are permitted.

When a project is archived or completed, no new timelogs can be created for that project. If an employee attempts to log time against an archived or completed project, the request is rejected.

Existing timelogs on archived or completed projects remain visible and cannot be modified unless the project status is changed back to active.

Projects can have optional start and end dates for timeline tracking. If both dates are provided, the end date must be on or after the start date. If the end date precedes the start date, the request is rejected.

Start and end dates are for informational purposes only and do not automatically affect project status. A project can be active, archived, or completed regardless of its timeline dates.

When a project reaches its end date, the status does not automatically change. Manual intervention is required to archive or complete the project.

Projects without start or end dates are still fully functional for time tracking and task management.

Only active projects can receive new task assignments, new project members, and new timelogs.

Archived projects are preserved for historical reporting but cannot participate in current operations.

Completed projects are preserved for historical reporting and cannot be reactivated to active status.

### Project Budget and Description Rules

### Project Budget and Description Rules

Projects can have optional budget hours for tracking estimated versus actual time spent. Budget hours are numeric values representing total estimated hours for the project.

If budget hours are provided, they must be a positive number greater than zero. Budget hours of zero or negative numbers are rejected.

Budget hours are informational and do not enforce hard limits on actual hours logged. Employees can log time exceeding the budget hours, but the system will indicate when budget utilization exceeds certain thresholds.

Project descriptions are optional but can provide additional context about the project's purpose, scope, or requirements.

If a description is provided, it must not exceed 5000 characters. Descriptions longer than 5000 characters are rejected.

Descriptions can contain formatting, links, or other rich content as supported by the user interface, but must not contain malicious code or scripts.

Budget hours can be updated at any time, even after time has been logged against the project. This allows for project scope adjustments.

If budget hours are removed (set to null or empty), the system no longer tracks budget utilization for that project but preserves historical budget data.

Project descriptions can be edited multiple times, with each edit overwriting the previous description. No version history is maintained for description changes.

When viewing project reports, the description may be included to provide context for the reported data.

### Project Deletion Requirements

### Project Deletion Requirements

Projects can only be deleted when they have no timelogs associated with them. If a project has any timelogs, the deletion request is rejected.

Before deleting a project, the system must check for any associated timelogs, tasks, or project memberships. Only if all timelogs are absent can the project be deleted.

If a project has tasks but no timelogs, the tasks must be deleted along with the project. The system automatically removes all tasks belonging to the project during deletion.

If a project has project memberships but no timelogs, the memberships are automatically removed during project deletion.

When a project is deleted, all references to that project in reports, dashboards, and other organizational data are removed or marked as unavailable.

Project deletion is a permanent action that cannot be undone. Once deleted, a project and all its associated data (except timelogs which were already prohibited) cannot be recovered.

Users attempting to delete a project must be informed of the requirement that no timelogs exist. If timelogs are present, the system should indicate how many timelogs are preventing deletion.

Historical reports that reference deleted projects should still display the project name (if stored historically) or indicate "Deleted Project" to maintain report integrity.

The system must prevent deletion of projects that have pending timesheets containing timelogs from that project, even if the timelogs themselves would be checked.

Only users with project management permission can delete projects (permission requirement defined in the authorization model).

### Project Browsing and Filtering Rules

### Project Browsing and Filtering Rules

The project list must support pagination to manage large numbers of projects. Users can navigate through pages of projects rather than loading all projects at once.

Each page of projects displays a reasonable number of projects (e.g., 20-50 per page) to ensure good performance and usability.

Users can filter the project list by status (active, archived, completed). The filter should allow selecting one or multiple status values.

When filtering by status, only projects matching the selected status values are displayed. Projects with non-matching statuses are hidden from the list.

Filtering should be applied consistently across all project browsing interfaces, including reports and dashboards that show project lists.

Users can clear filters to view all projects regardless of status.

The project list should default to showing active projects only, as these are most relevant for current operations.

Pagination controls should clearly indicate the current page, total number of pages, and total number of projects matching the current filters.

When projects are added, archived, completed, or deleted, the pagination and filtering should update accordingly to reflect the current state.

Users should be able to sort the project list by name, creation date, or status, though the original requirements only specify filtering by status.

### Project Permission and Management Requirements

### Project Permission and Management Requirements

Creating a project requires project management permission. Users without this permission cannot create new projects.

Editing existing projects requires project management permission. Users without this permission cannot modify project details.

Archiving or completing a project requires project management permission. Users without this permission cannot change a project's status to archived or completed.

Deleting a project requires project management permission. Users without this permission cannot delete projects.

Viewing projects requires project viewing permission. Users without this permission cannot see the project list or project details.

Assigning employees to projects requires project management permission. Users without this permission cannot add or remove project members.

Managing tasks within a project requires either project management permission or project-lead role for that specific project.

The system must check permissions before allowing any project-related operation. If a user lacks the required permission, the operation is rejected.

Permission checks must consider the user's role within the organization and any project-specific assignments (like project-lead role).

Users with only project viewing permission can see project details but cannot make any changes to projects, tasks, or project memberships.

## Task Rules

Tasks require a title for identification and can include an optional description for details. Task status must be one of: open, in-progress, completed, or closed to track progress. Priority levels (low, medium, high, urgent) help categorize task importance. Estimated hours are optional for planning purposes but not required. Due dates are optional for time-sensitive task management. Task assignment to employees is optional but requires the employee to be a project member. Tasks support one level of nesting through optional parent task assignment for subtasks. Task status changes are recorded in task history with timestamp, old status, new status, and who made the change. Project leads can edit tasks within their assigned projects. Users with project management permissions can edit any task across the organization. Tasks can be filtered by status, priority, and assigned employee for better organization. Tasks can be sorted by due date, priority, or creation date for workflow management. Employees can view tasks in projects they are assigned to. Parent task assignment creates hierarchical task structures within projects.

### Task Creation and Assignment Rules

## Task Creation and Assignment Rules

**Required Title**
- THE system SHALL require a title for every task creation
- THE title SHALL be provided by the user creating the task
- IF the title is missing during task creation, THEN THE system SHALL reject the task creation request

**Optional Description**
- WHERE description is provided, THE system SHALL accept a text description for task details
- The description SHALL be optional and may be left empty
- WHEN editing a task, THE system SHALL allow users to add, modify, or remove the description

**Task Assignment**
- WHERE an employee is assigned to a task, THE assigned employee SHALL be a member of the project containing the task
- IF an employee not assigned to the project is selected for task assignment, THEN THE system SHALL reject the assignment
- Task assignment SHALL be optional; tasks may be created without an assigned employee
- WHEN assigning a task to an employee, THE system SHALL verify the employee has active status in the organization

**Parent Task Nesting**
- WHERE a parent task is specified, THE parent task SHALL belong to the same project as the child task
- THE system SHALL allow only one level of parent-child nesting
- IF a parent task is specified for a task that already has a parent, THEN THE system SHALL reject the assignment
- IF a user attempts to create circular parent-child relationships, THEN THE system SHALL reject the task creation

**Estimated Hours and Due Dates**
- Estimated hours for a task SHALL be optional and may be left unspecified
- WHERE estimated hours are provided, THE value SHALL be a positive number
- Due dates for tasks SHALL be optional and may be left unspecified
- WHERE a due date is provided, THE due date SHALL be a valid future or present date

**Priority Levels**
- THE system SHALL require a priority level for every task
- Valid priority levels SHALL be: low, medium, high, urgent
- IF an invalid priority level is provided, THEN THE system SHALL reject the task creation or update
- WHEN no priority is explicitly selected, THE system SHALL default to medium priority

**Task Status**
- THE system SHALL require a status for every task
- Valid task statuses SHALL be: open, in-progress, completed, closed
- IF an invalid status is provided, THEN THE system SHALL reject the task creation or update
- WHEN a task is first created, THE system SHALL automatically set the status to open

**Status Change History**
- WHEN a task's status changes, THE system SHALL record the change in task history
- Each status change record SHALL include: timestamp of change, previous status, new status, user who made the change
- THE history SHALL be immutable and cannot be modified or deleted by users
- Employees with task view permissions SHALL be able to view the status change history for tasks they can access

### Task Editing and Permission Rules

## Task Editing and Permission Rules

**Project Lead Editing Permissions**
- WHERE a user is designated as project lead for a project, THE user SHALL be able to edit tasks within that project
- Project leads SHALL be able to modify all task attributes: title, description, status, priority, estimated hours, due date, assignment, and parent task
- Project leads SHALL NOT be able to edit tasks in projects where they are not designated as project lead
- IF a project lead attempts to edit a task outside their project, THEN THE system SHALL reject the edit request

**Project Management Permissions**
- WHERE a user has project management permissions, THE user SHALL be able to edit any task across the organization
- Users with project management permissions SHALL be able to modify all task attributes regardless of project or assignment
- Project management permissions SHALL override project lead restrictions
- Users with project management permissions SHALL be identified by the system permission 'project:manage'

**Task Assignment Constraints**
- WHEN editing task assignment, THE system SHALL verify the new assigned employee is a member of the project
- IF a task is reassigned to an employee who is not a project member, THEN THE system SHALL reject the assignment change
- WHEN an employee is removed from a project, THE system SHALL NOT automatically unassign them from tasks; manual reassignment is required
- IF an assigned employee becomes deactivated, THE task SHALL remain assigned but with a visual indication of the deactivated status

**Task Deletion Constraints**
- THE system SHALL NOT allow direct deletion of tasks with associated timelogs
- IF a task has timelogs associated with it, THEN THE system SHALL prevent task deletion
- Tasks without timelogs MAY be deleted by users with project management permissions or project leads
- WHEN a task is deleted, THE system SHALL remove all task history records associated with that task

**Parent Task Editing Constraints**
- WHEN editing a parent task relationship, THE system SHALL verify the new parent task belongs to the same project
- IF a user attempts to set a task as its own parent, THEN THE system SHALL reject the change
- WHEN a parent task is deleted, THE system SHALL set the parent reference to null for all child tasks
- Circular parent-child relationships SHALL be prevented by the system

**Status Transition Rules**
- THE system SHALL allow any status transition between open, in-progress, completed, and closed
- WHEN a task status changes to completed or closed, THE system SHALL record the completion timestamp
- Employees SHALL be able to change task status for tasks assigned to them, subject to project lead or management permissions
- Status changes SHALL be recorded in the task history even when performed by automated processes

### Task Filtering and Sorting Rules

## Task Filtering and Sorting Rules

**Filtering by Status**
- WHERE users view task lists, THE system SHALL allow filtering by task status
- Available status filters SHALL include: open, in-progress, completed, closed
- Users SHALL be able to select multiple status values for filtering
- WHEN no status filter is applied, THE system SHALL display tasks of all statuses
- THE system SHALL apply status filters at the database level for performance

**Filtering by Priority**
- WHERE users view task lists, THE system SHALL allow filtering by task priority
- Available priority filters SHALL include: low, medium, high, urgent
- Users SHALL be able to select multiple priority values for filtering
- WHEN no priority filter is applied, THE system SHALL display tasks of all priorities
- Priority filtering SHALL be combinable with status filtering

**Filtering by Assigned Employee**
- WHERE users view task lists, THE system SHALL allow filtering by assigned employee
- Available employee filters SHALL include all active employees in the organization
- Users SHALL be able to select multiple employees for filtering
- WHEN filtering by unassigned tasks, THE system SHALL display tasks with no assigned employee
- Employee filtering SHALL respect data isolation per organization

**Sorting by Due Date**
- WHERE users view task lists, THE system SHALL allow sorting by due date
- Due date sorting SHALL arrange tasks with the earliest due dates first
- Tasks without due dates SHALL appear at the end of the list when sorting by due date
- Users SHALL be able to toggle between ascending and descending due date order
- WHEN sorting by due date, THE system SHALL consider both date and time components

**Sorting by Priority**
- WHERE users view task lists, THE system SHALL allow sorting by priority
- Priority sorting SHALL arrange tasks in order: urgent, high, medium, low
- Users SHALL NOT be able to define custom priority sorting orders
- Priority sorting SHALL be combinable with secondary sorts (e.g., priority then due date)
- THE system SHALL apply priority sorting consistently across all task views

**Sorting by Creation Date**
- WHERE users view task lists, THE system SHALL allow sorting by creation date
- Creation date sorting SHALL arrange tasks with the most recently created first by default
- Users SHALL be able to toggle between newest-first and oldest-first ordering
- Creation date SHALL be recorded automatically when a task is created and cannot be modified
- Creation date sorting SHALL be available in addition to due date and priority sorting

**Combined Filtering and Sorting**
- Users SHALL be able to apply multiple filters simultaneously (status, priority, employee)
- WHEN multiple filters are applied, THE system SHALL display tasks that match ALL filter criteria
- Sorting SHALL be applied after filtering is complete
- THE system SHALL maintain filter and sort preferences during user sessions
- Filter and sort configurations SHALL be reset when switching organizations

### Task Visibility and Access Rules

## Task Visibility and Access Rules

**Employee Task Visibility**
- WHERE an employee is assigned to a project, THE employee SHALL be able to view tasks within that project
- Employees SHALL see all tasks in projects they are assigned to, regardless of individual task assignment
- Employees SHALL NOT be able to view tasks in projects they are not assigned to
- Task visibility SHALL be enforced at the data access layer for security

**Assigned Task Access**
- WHERE an employee is assigned to a specific task, THE employee SHALL have access to that task's details
- Assigned employees SHALL be able to view task history, comments, and attachments (if implemented)
- Assigned employees SHALL be able to update task status for tasks assigned to them
- Assigned employees SHALL NOT be able to modify task attributes other than status without additional permissions

**Project Lead Visibility**
- Project leads SHALL be able to view all tasks within their assigned projects
- Project lead visibility SHALL extend to tasks not assigned to any employee
- Project leads SHALL have the same visibility as regular employees for projects where they are not designated as lead
- Project lead status SHALL be determined by the project membership role (member or project-lead)

**Management Visibility**
- Users with project management permissions SHALL be able to view all tasks across the organization
- Management visibility SHALL NOT be restricted by project assignments or employee assignments
- Users with 'project:view' permission SHALL have organization-wide task visibility
- Management visibility SHALL include archived and completed projects

**Task Search Capabilities**
- WHERE users can view tasks, THE system SHALL provide search functionality by task title
- Search SHALL be case-insensitive and support partial matching
- Search results SHALL respect the same visibility rules as regular task lists
- Search SHALL be combinable with filtering and sorting options
- IF no search term is provided, THE system SHALL display all visible tasks according to filters

**Archived and Completed Project Visibility**
- Tasks in archived projects SHALL remain visible to users who previously had access
- Tasks in completed projects SHALL remain visible to users who previously had access
- New timelogs SHALL NOT be created for tasks in archived or completed projects
- Task editing SHALL be restricted in archived and completed projects
- Project status SHALL NOT affect historical task data visibility

**Cross-Organization Data Isolation**
- Task data SHALL be strictly isolated per organization
- Employees in one organization SHALL NOT be able to view tasks from another organization
- WHEN users switch organizations, THE system SHALL only display tasks from the selected organization
- Organization context SHALL be enforced on all task queries and operations

## Timelog Rules

Timelogs require a date to indicate when the work was performed. Duration must be specified in minutes to track time accurately. Each timelog must be associated with a project that the employee is assigned to. Task association is optional but must belong to the selected project if specified. Descriptions are optional but can provide details about the work completed. Billable flag indicates whether the time should be considered for billing purposes. Employees can only create timelogs for themselves, not for other employees. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Users with time management permissions can edit or delete any employee's timelogs. Users with time viewing permissions can view all employees' timelogs. Timelogs support pagination for managing large numbers of entries. Timelogs can be filtered by date range, project, task, and billable status. Each timelog represents a discrete time entry with specific project and task context.

### Timelog Field Validation

### Required Fields

WHEN creating a timelog, THE system SHALL validate that:
1. The date is provided and must be a valid calendar date (required timelog date)
2. The duration is provided as a positive integer representing minutes (duration in minutes requirement)
3. A project is selected that the employee is assigned to (project assignment requirement)

### Optional Fields

WHERE a timelog includes optional fields, THE system SHALL validate that:
1. If a task is specified, it must belong to the selected project (optional task assignment within project)
2. The description field accepts any text input up to a reasonable length (optional description field)
3. The billable flag defaults to true but can be set to false (billable flag for billing purposes)

### Field Format Validation

IF the date is in the future beyond the current date, THEN THE system SHALL reject the timelog creation.
IF the duration exceeds 24 hours (1440 minutes), THEN THE system SHALL warn the user but allow submission.
IF the project is archived or completed, THEN THE system SHALL prevent timelog creation for that project.

### Timelog Creation Rules

### Self-Only Creation Restriction

WHEN an employee attempts to create a timelog, THE system SHALL ensure the timelog is created only for themselves (self-only timelog creation).

IF an employee attempts to create a timelog for another employee, THEN THE system SHALL reject the request with an appropriate error message.

### Project Membership Requirement

WHERE an employee creates a timelog, THE system SHALL verify that the employee is assigned to the selected project.

IF the employee is not a member of the selected project, THEN THE system SHALL reject the timelog creation.

### Task Project Consistency

IF a task is specified in the timelog, THEN THE system SHALL verify that the task belongs to the selected project.

IF the task belongs to a different project, THEN THE system SHALL reject the timelog creation.

### Timelog Editing Constraints

### Employee Self-Editing Rules

WHEN an employee attempts to edit their own timelog, THE system SHALL verify that the timelog is not part of an approved timesheet (timelog editing with non-approved timesheet restriction).

IF the timelog is included in an approved timesheet, THEN THE system SHALL prevent editing and display an error message.

### Management Permission Override

WHILE a user has time management permission, THE system SHALL allow them to edit any employee's timelogs regardless of timesheet status (time management permission for any timelog editing).

### Field Edit Restrictions

WHERE a timelog is edited, THE system SHALL allow modification of:
1. Duration
2. Description
3. Billable flag
4. Project assignment (if the employee is a member of the new project)
5. Task assignment (if the task belongs to the selected project)

IF the date field is modified to a date outside the current week, THEN THE system SHALL require the timelog to be removed from any draft timesheets.

### Timelog Deletion Constraints

### Employee Self-Deletion Rules

WHEN an employee attempts to delete their own timelog, THE system SHALL verify that the timelog is not part of any submitted or approved timesheet (timelog deletion with non-submitted timesheet restriction).

IF the timelog is included in a submitted or approved timesheet, THEN THE system SHALL prevent deletion and display an error message.

### Management Permission Override

WHILE a user has time management permission, THE system SHALL allow them to delete any employee's timelogs regardless of timesheet status.

### Cascading Effects

WHERE a timelog is deleted, THE system SHALL automatically:
1. Remove the timelog from any draft timesheets
2. Recalculate totals for affected draft timesheets
3. Record the deletion in the activity log

IF a timelog deletion would cause a submitted timesheet to have zero timelogs, THEN THE system SHALL automatically reject the timesheet and return it to draft status.

### Timelog Viewing Permissions

### Employee Self-Viewing

WHILE an employee views timelogs, THE system SHALL display only their own timelogs by default.

### Management Viewing Privileges

WHILE a user has time viewing permission, THE system SHALL allow them to view all employees' timelogs within the organization (time viewing permission for all timelogs).

### Project-Based Visibility

WHERE project leads view timelogs, THE system SHALL show timelogs for employees assigned to their projects.

### Date Range Visibility Constraints

IF an employee attempts to view timelogs outside their employment period, THEN THE system SHALL restrict access to timelogs dated before their contract start or after their deactivation date.

### Timelog Browsing and Filtering

### Pagination Requirements

WHILE browsing timelogs, THE system SHALL implement pagination to manage large result sets (timelog pagination).

WHERE timelog lists exceed the page size, THE system SHALL provide navigation controls to move between pages.

### Filtering Capabilities

WHERE employees filter timelogs, THE system SHALL support filtering by:
1. Date range (start date and end date) (filtering by date range and project)
2. Specific project
3. Specific task within a project
4. Billable status (billable or non-billable) (billable status filtering)

### Combined Filter Logic

WHEN multiple filters are applied, THE system SHALL combine them using AND logic.

WHERE no filters are applied, THE system SHALL display timelogs sorted by date descending.

### Search Limitations

IF an employee searches for timelogs, THEN THE system SHALL limit results to timelogs they have permission to view.

### Timelog Business Logic Constraints

### Billable Status Rules

WHILE calculating reports, THE system SHALL distinguish between billable and non-billable timelogs based on the billable flag.

WHERE a timelog is marked as non-billable, THE system SHALL exclude it from billing calculations but include it in productivity reports.

### Duration Validation

IF a timelog duration is zero or negative, THEN THE system SHALL reject the timelog creation or update.

WHERE a timelog duration exceeds reasonable limits (e.g., 24 hours), THE system SHALL require manager approval for durations over 12 hours.

### Date Validation

WHEN creating a timelog for a past date outside the current fiscal month, THE system SHALL require additional approval from a user with time management permission.

WHERE a timelog date is before the employee's contract start date, THE system SHALL reject the timelog creation.

### Project Status Constraints

IF a project is archived or completed, THEN THE system SHALL prevent new timelog creation for that project.

WHERE existing timelogs belong to archived or completed projects, THE system SHALL preserve them for historical reporting.

## Timesheet Rules

Timesheets cover a specific week from Monday to Sunday for standardized reporting. Each timesheet must have a week start date (Monday) and week end date (Sunday). Timesheet status can be draft, submitted, approved, or rejected to track approval workflow. Total hours are automatically calculated from included timelogs for accuracy. Submitted timestamp records when the employee submitted the timesheet for approval. Reviewed timestamp and reviewer capture when and who approved or rejected the timesheet. Rejection reason is required when rejecting a timesheet to provide feedback. Employees create draft timesheets that automatically include all their timelogs for that week. Timesheets cannot be submitted if they contain no timelogs. Employees cannot submit a timesheet if another timesheet for the same week is already submitted or approved. Approved timesheets lock all included timelogs, preventing edits or deletions. Rejected timesheets return to draft status for modification and resubmission. Timesheets support pagination for historical review. Timesheets can be filtered by status and date range for management purposes. Time approval permissions are required to view, approve, or reject submitted timesheets.

### Weekly Timesheet Structure and Dates

The system shall structure timesheets to cover exactly one week from Monday to Sunday.

WHEN creating a new timesheet, THE system SHALL calculate the week start date as the Monday of the selected week.
WHEN creating a new timesheet, THE system SHALL calculate the week end date as the Sunday of the selected week.

WHERE weekly timesheet structure, THE system SHALL ensure that all timelogs included in the timesheet fall within the Monday to Sunday period.
IF a timesheet week is outside the organization's fiscal year boundaries, THEN THE system SHALL reject the timesheet creation.

### Timesheet Status Values and Transitions

Timesheets have four possible status values:
1. Draft - The timesheet is being prepared by the employee
2. Submitted - The timesheet has been submitted for approval
3. Approved - The timesheet has been approved by a manager
4. Rejected - The timesheet has been rejected by a manager

WHEN an employee submits a timesheet, THE system SHALL change its status from draft to submitted.
WHEN a manager approves a timesheet, THE system SHALL change its status from submitted to approved.
WHEN a manager rejects a timesheet, THE system SHALL change its status from submitted to rejected.
WHEN a rejected timesheet is modified and resubmitted, THE system SHALL change its status from rejected to submitted.

Employees can only modify timesheets that are in draft or rejected status.

### Timesheet Calculation and Timestamps

WHEN creating or updating a timesheet, THE system SHALL automatically calculate the total hours by summing the duration of all timelogs included in the timesheet.

WHEN an employee submits a timesheet, THE system SHALL record the current date and time as the submitted timestamp.

WHEN a manager approves or rejects a timesheet, THE system SHALL record:
1. The current date and time as the reviewed timestamp
2. The manager's user identity as the reviewer

WHERE rejection, THE system SHALL require the manager to provide a rejection reason before completing the rejection action.
IF a manager attempts to reject a timesheet without providing a rejection reason, THEN THE system SHALL reject the rejection action.

### Draft Timesheet Creation and Content

WHEN an employee creates a draft timesheet for a specific week, THE system SHALL automatically include all timelogs belonging to that employee for that week (Monday to Sunday).

WHERE draft timesheet creation, THE system SHALL allow employees to add or remove timelogs from the draft timesheet.

IF an employee attempts to submit a timesheet that contains no timelogs, THEN THE system SHALL reject the submission.

Employees cannot submit a timesheet for a week if another timesheet for the same week (same employee, same Monday to Sunday period) is already in submitted or approved status.

### Timesheet Approval and Locking

WHEN a timesheet is approved, THE system SHALL lock all timelogs included in that timesheet.
WHERE timelog locking, THE system SHALL prevent any edits or deletions to locked timelogs.
Employees cannot edit or delete timelogs that are part of an approved timesheet.
Users with time management permission cannot edit or delete timelogs that are part of an approved timesheet.

WHEN a timesheet is rejected, THE system SHALL return it to draft status.
WHERE rejected timesheet, THE system SHALL allow the employee to modify the timesheet and resubmit it.
Timelogs in a rejected timesheet remain unlocked and can be modified.

### Timesheet Browsing and Access Rules

Timesheets shall support pagination for browsing historical timesheets.

Timesheets can be filtered by:
1. Status (draft, submitted, approved, rejected)
2. Date range (based on week start date or week end date)

Users with time approval permission can view all submitted timesheets.
Users with time approval permission can approve or reject submitted timesheets.

Employees can only view their own timesheets.
Users with time view all permission can view all employees' timesheets.

### Timesheet Submission Constraints

THE system SHALL prevent submission of timesheets under the following conditions:

1. IF the timesheet contains no timelogs, THEN THE system SHALL reject the submission.
2. IF the employee already has a timesheet for the same week in submitted status, THEN THE system SHALL reject the submission.
3. IF the employee already has a timesheet for the same week in approved status, THEN THE system SHALL reject the submission.
4. IF the timesheet week is in the future (beyond current date), THEN THE system SHALL reject the submission.
5. IF the employee is deactivated, THEN THE system SHALL reject the submission.

WHERE timesheet submission, THE system SHALL verify that all included timelogs belong to the submitting employee and fall within the timesheet week.
IF any timelog does not meet these criteria, THEN THE system SHALL reject the submission.

## Contract Rules

Each employee can have multiple contracts as historical employment records. Only one contract can be active at any given time for an employee. Contracts require a start date to indicate when the employment terms begin. End dates are optional, with null values indicating ongoing employment. Pay rate must be specified as a numeric value for compensation tracking. Pay period must be defined as hourly, daily, weekly, or monthly for payment frequency. Working hours per week must be specified for full-time equivalence calculations. Notes are optional for additional contract details or special conditions. Creating a new contract automatically ends the previous active contract by setting its end date. Current active contracts can be edited by users with employee management permissions. Past contracts cannot be edited to maintain historical record integrity. Employees can view their own contracts for reference. Users with employee viewing permissions can view any employee's contracts. Contract creation ensures only one active employment arrangement exists per employee. Historical contracts provide a complete employment timeline for each employee.

### Contract Quantity and Active Status

### Contract Quantity and Active Status

**Multiple Contracts per Employee**
- THE system SHALL allow each employee to have multiple employment contracts as historical records.
- WHERE an employee has multiple contracts, THE system SHALL store all contracts to maintain a complete employment timeline.

**Single Active Contract Restriction**
- WHILE an employee has an active contract, THE system SHALL prevent creation of another active contract for the same employee.
- THE system SHALL ensure only one contract per employee can be active at any given time.
- WHEN creating a new contract for an employee with an existing active contract, THE system SHALL automatically end the previous contract before activating the new one.

**Historical Employment Timeline**
- WHERE contracts are created, edited, or ended, THE system SHALL maintain chronological order of employment terms.
- THE system SHALL provide a view of all contracts for an employee in date order to show employment history.

### Contract Date Requirements and Restrictions

### Contract Date Requirements and Restrictions

**Required Contract Start Date**
- WHEN creating a contract, THE system SHALL require a start date.
- IF no start date is provided, THEN THE system SHALL reject the contract creation request.
- THE system SHALL validate that the start date is not in the future beyond the current date.

**Optional Contract End Date**
- WHERE a contract end date is provided, THE system SHALL require it to be after the start date.
- IF an end date is provided that is before the start date, THEN THE system SHALL reject the contract.
- WHERE no end date is provided, THE system SHALL interpret the contract as ongoing.
- WHEN an ongoing contract exists, THE system SHALL allow creation of a new contract only if the new start date is after the current date.

### Compensation and Work Specifications

### Compensation and Work Specifications

**Required Pay Rate Numeric Value**
- WHEN creating a contract, THE system SHALL require a pay rate.
- THE system SHALL validate that the pay rate is a positive numeric value.
- IF the pay rate is not a positive number, THEN THE system SHALL reject the contract creation.
- THE system SHALL store pay rate with sufficient precision for currency calculations.

**Pay Period Specification**
- THE system SHALL require selection of a pay period from the options: hourly, daily, weekly, monthly.
- IF no pay period is selected, THEN THE system SHALL reject the contract creation.
- THE system SHALL validate that pay period is one of the allowed values.

**Required Working Hours per Week**
- THE system SHALL require specification of working hours per week for each contract.
- THE system SHALL validate that working hours per week is a positive integer.
- IF working hours per week is not a positive integer, THEN THE system SHALL reject the contract creation.

**Optional Contract Notes**
- WHERE contract notes are provided, THE system SHALL store them as optional text.
- THE system SHALL limit contract notes to a reasonable text length.
- THE system SHALL preserve contract notes for historical reference even after contract ends.

### Contract Modification Rules

### Contract Modification Rules

**Automatic Previous Contract Ending on New Creation**
- WHEN creating a new contract for an employee with an existing active contract, THE system SHALL automatically set the end date of the previous contract to one day before the new contract's start date.
- IF the new contract start date is the same as or before the previous contract start date, THEN THE system SHALL reject the new contract creation.
- THE system SHALL ensure there is no gap or overlap between consecutive contracts.

**Editable Current Active Contracts**
- WHILE a contract is active, THE system SHALL allow users with employee management permission to edit its details.
- THE system SHALL allow editing of all contract fields except the start date once the contract is active.
- WHEN editing an active contract, THE system SHALL validate all changes against business rules.
- IF an edit would create invalid contract conditions, THEN THE system SHALL reject the edit.

**Immutable Past Contracts**
- WHERE a contract has ended (has an end date in the past), THE system SHALL prevent any modifications to that contract.
- THE system SHALL preserve past contracts as read-only historical records.
- IF an attempt is made to edit a past contract, THEN THE system SHALL reject the request with an error indicating historical immutability.

### Contract Viewing Permissions

### Contract Viewing Permissions

**Employee Self-Contract Viewing**
- WHERE an employee views their own profile, THE system SHALL allow them to see all their own contracts.
- THE system SHALL display contracts in chronological order with most recent first.
- THE system SHALL clearly indicate which contract is currently active.
- THE system SHALL prevent employees from viewing contracts of other employees without permission.

**Employee Viewing Permission for All Contracts**
- WHERE a user has employee viewing permission, THE system SHALL allow them to view contracts for any employee in the organization.
- THE system SHALL enforce that contract viewing is limited to employees within the same organization.
- IF a user without employee viewing permission attempts to view another employee's contracts, THEN THE system SHALL reject the request.

**Contract Access Validation**
- WHEN accessing any contract, THE system SHALL verify the requesting user has appropriate permissions.
- THE system SHALL enforce organization boundary for all contract access requests.
- WHERE an employee belongs to multiple organizations, THE system SHALL only show contracts for the currently selected organization context.

### Contract Status and Lifecycle Rules

### Contract Status and Lifecycle Rules

**Active Contract Determination**
- THE system SHALL consider a contract active when:
  - The start date is on or before the current date
  - The end date is either null or after the current date
- THE system SHALL ensure only one contract per employee meets active criteria at any time.

**Contract Overlap Prevention**
- WHEN creating or editing contracts, THE system SHALL prevent date overlaps between an employee's contracts.
- IF a contract edit would create an overlap with another contract for the same employee, THEN THE system SHALL reject the edit.
- THE system SHALL validate contract dates against all existing contracts for the same employee.

**Contract End Date Handling**
- WHERE a contract end date is reached, THE system SHALL automatically consider the contract as ended.
- THE system SHALL not automatically create new contracts when an existing one ends.
- WHEN an active contract ends without a new one being created, THE system SHALL mark the employee as having no active contract.

**Contract Deletion Restrictions**
- THE system SHALL prevent deletion of any contract that has historical significance.
- IF a contract is associated with any time tracking records or payroll calculations, THEN THE system SHALL prevent its deletion.
- WHERE contract data is incorrect, THE system SHALL require correction through proper amendment procedures rather than deletion.

## Timer Rules

Each employee can have at most one active timer at a time for real-time time tracking. Starting a timer requires selecting a project, with optional task assignment for more specific tracking. Timer descriptions are optional but can provide context about the work being performed. The timer records the start timestamp when initiated and tracks elapsed time continuously. Employees can stop their timer, which creates a timelog with the calculated duration rounded to the nearest minute. Employees can discard a running timer without creating a timelog entry. Running timers can be edited to change the description, project, or task assignment. Employees can view their currently running timer status and elapsed time. Timers continue running indefinitely if not manually stopped, requiring employee intervention. The timer functionality provides real-time tracking without requiring manual duration entry. Timer data includes project context for accurate time allocation. Elapsed time calculation happens in real-time for precise duration tracking.

### Single Active Timer Restriction

## Single Active Timer Restriction

### Rule 1: One Timer Per Employee
WHILE an employee has an active timer, THE system SHALL prevent the employee from starting a new timer.

### Rule 2: Concurrent Timer Prevention
WHEN an employee attempts to start a new timer while another timer is already running, THE system SHALL reject the request with an error message indicating that an active timer already exists.

### Rule 3: Timer Availability Check
BEFORE allowing an employee to start a timer, THE system SHALL verify that no active timer exists for that employee within the current organization context.

### Rule 4: Deactivated Employee Restriction
WHILE an employee is deactivated, THE system SHALL prevent the employee from starting or editing any timer.

### Rule 5: Timer Continuity
WHEN an employee switches organization context, THE system SHALL preserve the timer's running state but SHALL enforce that timers are only tracked within the organization they were started in.

### Timer Start Requirements

## Timer Start Requirements

### Rule 6: Project Selection Requirement
WHEN an employee starts a timer, THE system SHALL require the employee to select a project from the list of projects they are assigned to in the current organization.

### Rule 7: Task Assignment Optionality
WHERE task assignment is available, THE system SHALL allow the employee to optionally select a task that belongs to the selected project.

### Rule 8: Timer Start Validation
WHEN starting a timer, THE system SHALL validate that:
1. The selected project exists and is active in the current organization
2. If a task is selected, the task belongs to the selected project
3. The employee is assigned to the selected project (if project membership is required)

### Rule 9: Invalid Project Error
IF the employee selects a project that is archived, completed, or deleted, THE system SHALL reject the timer start request with an appropriate error message.

### Rule 10: Unassigned Project Error
IF the employee selects a project they are not assigned to, THE system SHALL reject the timer start request with an error message indicating they must be assigned to the project.

### Timer Description and Context

## Timer Description and Context

### Rule 11: Description Field Optionality
WHEN creating or editing a timer, THE system SHALL allow the employee to optionally provide a description of the work being performed.

### Rule 12: Project Context Preservation
WHILE a timer is running, THE system SHALL preserve the project and task context throughout the timer's lifecycle.

### Rule 13: Timer Metadata Recording
WHEN a timer is started, THE system SHALL record:
1. The start timestamp with precision to the second
2. The selected project reference
3. The selected task reference (if provided)
4. The description (if provided)

### Rule 14: Context Display
WHILE a timer is running, THE system SHALL display to the employee:
1. The selected project name and color code
2. The selected task title (if applicable)
3. The timer description (if provided)
4. The elapsed time in real-time

### Timer Stop and Timelog Creation

## Timer Stop and Timelog Creation

### Rule 15: Timer Stop Action
WHEN an employee stops their active timer, THE system SHALL:
1. Record the stop timestamp with precision to the second
2. Calculate the elapsed duration between start and stop timestamps
3. Round the duration to the nearest minute
4. Create a timelog entry with the calculated duration

### Rule 16: Duration Calculation and Rounding
THE system SHALL calculate timer duration by subtracting the start timestamp from the stop timestamp and SHALL round the result to the nearest minute using standard rounding rules (0.5 minutes rounds up).

### Rule 17: Timelog Creation Rules
WHEN creating a timelog from a stopped timer, THE system SHALL:
1. Use the timer's date (based on start timestamp date)
2. Use the rounded duration in minutes
3. Copy the project and task references from the timer
4. Copy the description from the timer (if provided)
5. Set billable flag to true (default)
6. Associate the timelog with the employee who stopped the timer

### Rule 18: Timelog Validation
BEFORE creating a timelog from a stopped timer, THE system SHALL validate that:
1. The timer duration is greater than 0 minutes after rounding
2. The project still exists and is active
3. The employee is still assigned to the project
4. The employee is active in the organization

### Timer Discard Operation

## Timer Discard Operation

### Rule 19: Timer Discard Option
WHILE a timer is running, THE system SHALL allow the employee to discard the timer without creating a timelog.

### Rule 20: Discard Confirmation
WHEN an employee attempts to discard a timer, THE system SHALL require confirmation before proceeding with the discard operation.

### Rule 21: Discard Consequences
WHEN a timer is discarded, THE system SHALL:
1. Stop the timer without recording a stop timestamp
2. Delete the timer record without creating a timelog
3. Clear the active timer status for the employee
4. Not record any activity log entry for the discard action

### Rule 22: Discard Without Penalty
THE system SHALL NOT penalize employees for discarding timers, and SHALL NOT count discarded timers toward any performance metrics or reports.

### Timer Editing Capabilities

## Timer Editing Capabilities

### Rule 23: Running Timer Edit Permissions
WHILE a timer is running, THE system SHALL allow the employee who started the timer to edit:
1. The timer description
2. The selected project (must be changed to another active project the employee is assigned to)
3. The selected task (must belong to the newly selected project if changing project)

### Rule 24: Timer Edit Validation
WHEN editing a running timer, THE system SHALL validate that:
1. The new project is active and the employee is assigned to it
2. If changing tasks, the new task belongs to the selected project
3. The timer remains running during and after the edit

### Rule 25: Edit Without Interruption
THE system SHALL preserve the timer's elapsed time and continue counting while edits are being made.

### Rule 26: Historical Edit Restriction
THE system SHALL NOT allow editing of:
1. Timer start timestamp
2. Timer duration or elapsed time
3. Stopped or discarded timers
4. Timers belonging to other employees

### Timer Status and Viewing

## Timer Status and Viewing

### Rule 27: Active Timer Status Viewing
WHILE an employee has an active timer, THE system SHALL allow the employee to view:
1. The current elapsed time in real-time
2. The project and task context
3. The timer description
4. The start timestamp

### Rule 28: Timer Status Display
THE system SHALL display active timer status on the employee's dashboard showing:
1. That a timer is currently running
2. The elapsed time formatted in hours and minutes
3. The project name
4. A prominent stop/discard button

### Rule 29: Timer Access Restriction
THE system SHALL restrict timer viewing to:
1. The employee who started the timer
2. Users with `time:view_all` permission (view-only access)
3. Users with `time:manage` permission (view and edit access)

### Rule 30: Cross-Organization Timer Visibility
WHEN an employee belongs to multiple organizations, THE system SHALL only display timers for the currently selected organization context.

### Indefinite Timer Operation

## Indefinite Timer Operation

### Rule 31: No Automatic Timer Stop
THE system SHALL NOT automatically stop running timers based on:
1. Time elapsed (no maximum duration limit)
2. Employee inactivity or logout
3. System maintenance or updates
4. Organization switching

### Rule 32: Timer Persistence
WHILE a timer is running, THE system SHALL preserve the timer state through:
1. Browser refreshes or page navigation
2. Employee logout and subsequent login
3. Organization context switching
4. System restarts or server downtime

### Rule 33: Long-Running Timer Handling
WHEN a timer has been running for an extended period (multiple days), THE system SHALL:
1. Continue tracking elapsed time accurately
2. Allow the employee to stop or discard the timer normally
3. Create a timelog with the full duration when stopped
4. Round the total duration to the nearest minute when creating the timelog

### Rule 34: Timer Recovery
IF a timer's running state is lost due to system failure, THE system SHALL:
1. Attempt to recover the last known timer state
2. If recovery fails, notify the employee that the timer was lost
3. NOT automatically create a timelog for lost timers

### Real-Time Tracking and Accuracy

## Real-Time Tracking and Accuracy

### Rule 35: Real-Time Elapsed Time Calculation
WHILE a timer is running, THE system SHALL calculate and display elapsed time in real-time by:
1. Continuously updating the displayed time at least once per second
2. Calculating the difference between current time and start timestamp
3. Displaying the elapsed time in hours, minutes, and seconds

### Rule 36: Timer Accuracy Requirements
THE system SHALL track timer duration with accuracy to the second, and SHALL round to the nearest minute only when creating a timelog from a stopped timer.

### Rule 37: Timezone Handling
THE system SHALL track and display timer times in the organization's configured timezone, and SHALL convert timestamps appropriately for employees in different timezones.

### Rule 38: Timer Synchronization
THE system SHALL synchronize timer state across all devices and sessions where the employee is logged in, ensuring that:
1. Timer start/stop actions are reflected immediately across all sessions
2. Elapsed time displays are consistent across devices
3. Only one active timer is maintained per employee regardless of device count

## ActivityLog Rules

The system automatically records significant actions as activity log entries for audit and tracking purposes. Each activity log entry requires a timestamp

### Activity Log Recording Requirements

THE SYSTEM SHALL automatically create an activity log entry when the following actions occur:
- WHEN an employee is invited to an organization, THE SYSTEM SHALL record the inviting user and the invited email
- WHEN an employee is deactivated or reactivated, THE SYSTEM SHALL record the user performing the action and the employee affected
- WHEN a contract is created or edited, THE SYSTEM SHALL record the user performing the action and the employee affected
- WHEN a project is created, archived, completed, or deleted, THE SYSTEM SHALL record the user performing the action and project details
- WHEN a task status is changed, THE SYSTEM SHALL record the user performing the action, the task, old status, and new status
- WHEN a timesheet is submitted, approved, or rejected, THE SYSTEM SHALL record the user performing the action, the timesheet, and the new status
- WHEN a role is assigned or changed for an employee, THE SYSTEM SHALL record the user performing the action, the employee, and the new role

WHEN recording an activity log entry, THE SYSTEM SHALL include:
- Timestamp of when the action occurred
- User who performed the action
- Action type (e.g., "employee_invited", "project_created", "timesheet_approved")
- Target entity (e.g., "employee", "project", "timesheet")
- Details about what changed (in structured format)

### Activity Log Data Browsing Rules

WHERE activity log entries exist, THE SYSTEM SHALL:
- Apply organization data isolation, ensuring users can only view activity logs for their currently selected organization
- Support pagination of activity log entries
- Allow filtering activity logs by:
  - Action type (single selection)
  - User who performed the action
  - Date range (start and end date)
- Sort activity logs in reverse chronological order (newest first) by default
- Provide the ability to view a limited number of recent activity log entries on dashboards

IF a user attempts to view activity logs without the required permissions, THEN THE SYSTEM SHALL reject the request

WHILE viewing filtered activity logs, THE SYSTEM SHALL only return entries matching all applied filters

### Activity Log Access Control Rules

WHERE activity log viewing is requested, THE SYSTEM SHALL enforce:
- Only users with `org:manage` permission can view the full activity log for their organization
- Users without `org:manage` permission cannot access the activity log
- Activity log entries cannot be edited or deleted by any user (read-only historical record)
- Activity log entries are permanently retained and cannot be manually purged

IF a user without `org:manage` permission attempts to access the activity log, THEN THE SYSTEM SHALL reject the request with an appropriate error message

### Activity Log Error Scenarios

IF activity log recording fails due to a system error, THEN THE SYSTEM SHALL:
- Attempt to retry recording the activity log entry
- If retry attempts fail, log the system error for troubleshooting
- Continue processing the original user action (activity log failure should not block business operations)

WHERE activity log filters are applied incorrectly, THE SYSTEM SHALL:
- Validate date range filters (end date must not be earlier than start date)
- Validate user filter exists in the current organization
- Reject requests with invalid filters

WHEN activity log pagination parameters are invalid, THE SYSTEM SHALL:
- Use default values for missing pagination parameters
- Reject requests with negative page numbers or page sizes
- Enforce maximum page size limits to prevent performance issues

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Data Filtering Rules

### Data Filtering Rules

**Employee List Filtering:**
- THE SYSTEM SHALL allow users with `employee:view` permission to filter the employee list by department.
- THE SYSTEM SHALL allow users with `employee:view` permission to filter the employee list by employment type (full-time, part-time, contractor, intern).
- THE SYSTEM SHALL allow users with `employee:view` permission to filter the employee list by status (active, deactivated).
- THE SYSTEM SHALL allow users with `employee:view` permission to search the employee list by name (display name).
- WHEN filtering by department, THE SYSTEM SHALL display only employees assigned to the selected department or employees with no department if "None" is selected.
- WHEN filtering by employment type, THE SYSTEM SHALL display only employees with the selected employment type.
- WHEN filtering by status, THE SYSTEM SHALL display only employees with the selected status.
- WHEN searching by name, THE SYSTEM SHALL perform case-insensitive partial matching on employee display names.

**Project List Filtering:**
- THE SYSTEM SHALL allow users with `project:view` permission to filter the project list by status (active, archived, completed).
- WHEN filtering by status, THE SYSTEM SHALL display only projects with the selected status.

**Timelog List Filtering:**
- THE SYSTEM SHALL allow employees to filter their own timelogs by date range.
- THE SYSTEM SHALL allow employees to filter their own timelogs by project.
- THE SYSTEM SHALL allow employees to filter their own timelogs by task.
- THE SYSTEM SHALL allow employees to filter their own timelogs by billable status (billable or non-billable).
- THE SYSTEM SHALL allow users with `time:view_all` permission to apply the same filters to any employee's timelogs.
- WHEN filtering by date range, THE SYSTEM SHALL include only timelogs with dates within the specified range (inclusive).
- WHEN filtering by project, THE SYSTEM SHALL include only timelogs associated with the selected project.
- WHEN filtering by task, THE SYSTEM SHALL include only timelogs associated with the selected task.
- WHEN filtering by billable status, THE SYSTEM SHALL include only timelogs with matching billable flag value.

**Timesheet List Filtering:**
- THE SYSTEM SHALL allow employees to filter their own timesheets by status (draft, submitted, approved, rejected).
- THE SYSTEM SHALL allow employees to filter their own timesheets by date range.
- THE SYSTEM SHALL allow users with `time:approve` permission to apply the same filters to all timesheets in the organization.
- WHEN filtering by status, THE SYSTEM SHALL include only timesheets with the selected status.
- WHEN filtering by date range, THE SYSTEM SHALL include only timesheets with week start dates within the specified range.

**Task List Filtering:**
- THE SYSTEM SHALL allow employees to filter tasks in projects they are assigned to by status (open, in-progress, completed, closed).
- THE SYSTEM SHALL allow employees to filter tasks in projects they are assigned to by priority (low, medium, high, urgent).
- THE SYSTEM SHALL allow employees to filter tasks in projects they are assigned to by assigned employee.
- WHEN filtering by status, THE SYSTEM SHALL include only tasks with the selected status.
- WHEN filtering by priority, THE SYSTEM SHALL include only tasks with the selected priority.
- WHEN filtering by assigned employee, THE SYSTEM SHALL include only tasks assigned to the selected employee.

**Activity Log Filtering:**
- THE SYSTEM SHALL allow users with `org:manage` permission to filter the activity log by action type.
- THE SYSTEM SHALL allow users with `org:manage` permission to filter the activity log by user who performed the action.
- THE SYSTEM SHALL allow users with `org:manage` permission to filter the activity log by date range.
- WHEN filtering by action type, THE SYSTEM SHALL include only activity log entries with matching action type.
- WHEN filtering by user, THE SYSTEM SHALL include only activity log entries performed by the selected user.
- WHEN filtering by date range, THE SYSTEM SHALL include only activity log entries with timestamps within the specified range.

**Combined Filtering:**
- WHERE multiple filters are applied to a list, THE SYSTEM SHALL apply all filters concurrently (AND logic).
- WHEN no filters are applied, THE SYSTEM SHALL display all items in the list according to the user's permissions.
- IF a filter value is invalid (e.g., non-existent department, invalid date format), THEN THE SYSTEM SHALL reject the request with an appropriate error message.
- WHERE a filter requires a permission the user does not have, THE SYSTEM SHALL reject the request with an access denied message.

### Data Sorting Rules

### Data Sorting Rules

**Task List Sorting:**
- THE SYSTEM SHALL allow employees to sort tasks in projects they are assigned to by due date (ascending or descending).
- THE SYSTEM SHALL allow employees to sort tasks in projects they are assigned to by priority (ascending: low to urgent, descending: urgent to low).
- THE SYSTEM SHALL allow employees to sort tasks in projects they are assigned to by creation date (ascending or descending).
- WHEN sorting by due date, THE SYSTEM SHALL sort tasks with due dates first, followed by tasks without due dates at the end.
- WHEN sorting by priority, THE SYSTEM SHALL use the order: low, medium, high, urgent for ascending sort, and the reverse for descending sort.

**Default Sorting:**
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort employee lists by display name in ascending alphabetical order.
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort project lists by name in ascending alphabetical order.
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort timelog lists by date in descending order (most recent first).
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort timesheet lists by week start date in descending order (most recent first).
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort task lists by creation date in descending order (most recent first).
- WHERE no explicit sort order is specified, THE SYSTEM SHALL sort activity log lists by timestamp in descending order (most recent first).

**Sort Direction:**
- FOR any sortable list, THE SYSTEM SHALL support both ascending and descending sort directions.
- WHEN sorting by text fields (name, title), THE SYSTEM SHALL perform case-insensitive alphabetical sorting.
- WHEN sorting by date fields, THE SYSTEM SHALL use chronological order.
- WHEN sorting by numeric fields, THE SYSTEM SHALL use numerical order.

**Sort Combined with Filtering:**
- WHERE both filtering and sorting are applied, THE SYSTEM SHALL first apply all filters, then sort the filtered results.
- THE SYSTEM SHALL maintain consistent sort order across pagination pages.
- IF a sort field is not applicable to an item (e.g., null due date when sorting by due date), THEN THE SYSTEM SHALL place those items at the end of the sorted list.

**Sort Validation:**
- IF an invalid sort field is requested (not available for the list type), THEN THE SYSTEM SHALL reject the request with an appropriate error message.
- IF an invalid sort direction is requested (not "asc" or "desc"), THEN THE SYSTEM SHALL reject the request with an appropriate error message.

### Data Pagination Rules

### Data Pagination Rules

**Pagination Implementation:**
- THE SYSTEM SHALL paginate employee lists to prevent performance degradation with large datasets.
- THE SYSTEM SHALL paginate project lists to prevent performance degradation with large datasets.
- THE SYSTEM SHALL paginate timelog lists to prevent performance degradation with large datasets.
- THE SYSTEM SHALL paginate timesheet lists to prevent performance degradation with large datasets.
- THE SYSTEM SHALL paginate activity log lists to prevent performance degradation with large datasets.

**Page Size Rules:**
- THE SYSTEM SHALL use a default page size of 20 items per page for all paginated lists.
- THE SYSTEM SHALL allow users to request page sizes between 10 and 100 items per page.
- IF a requested page size exceeds 100, THEN THE SYSTEM SHALL use the maximum allowed page size of 100.
- IF a requested page size is less than 1, THEN THE SYSTEM SHALL use the default page size of 20.

**Pagination Metadata:**
- FOR each paginated response, THE SYSTEM SHALL include the current page number.
- FOR each paginated response, THE SYSTEM SHALL include the page size used.
- FOR each paginated response, THE SYSTEM SHALL include the total number of items matching the filters.
- FOR each paginated response, THE SYSTEM SHALL include the total number of pages.
- FOR each paginated response, THE SYSTEM SHALL include whether there is a previous page.
- FOR each paginated response, THE SYSTEM SHALL include whether there is a next page.

**Page Navigation:**
- THE SYSTEM SHALL allow users to request a specific page number by index (1-based).
- THE SYSTEM SHALL allow users to request the next page if one exists.
- THE SYSTEM SHALL allow users to request the previous page if one exists.
- WHEN a user requests a page number greater than the total number of pages, THEN THE SYSTEM SHALL return the last page.
- WHEN a user requests a page number less than 1, THEN THE SYSTEM SHALL return the first page.

**Consistency with Filtering and Sorting:**
- WHERE filters are applied to a paginated list, THE SYSTEM SHALL apply the same filters to all pages.
- WHERE a sort order is applied to a paginated list, THE SYSTEM SHALL apply the same sort order to all pages.
- THE SYSTEM SHALL maintain stable ordering across page requests when no data changes occur.
- WHEN data is added, modified, or deleted between page requests, THEN THE SYSTEM SHALL reflect those changes in subsequent page requests.

**Empty Results:**
- WHEN no items match the applied filters, THEN THE SYSTEM SHALL return an empty list with pagination metadata indicating zero total items.
- WHEN requesting a page beyond the available data with filters applied, THEN THE SYSTEM SHALL return an empty list for that page with appropriate pagination metadata.

**Performance and Limits:**
- THE SYSTEM SHALL limit the maximum page size to 100 items to prevent performance issues.
- THE SYSTEM SHALL enforce a maximum offset limit to prevent deep pagination performance degradation.
- IF a request would require scanning more than 10,000 records, THEN THE SYSTEM SHALL reject the request with a suggestion to apply more specific filters.

**Data Isolation in Pagination:**
- FOR all paginated lists, THE SYSTEM SHALL only include items belonging to the user's currently selected organization.
- THE SYSTEM SHALL never include data from other organizations in paginated responses, regardless of the user's membership in multiple organizations.
- WHEN switching organization context, THE SYSTEM SHALL reset pagination state for organization-scoped lists.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Error Scenarios for Data Modification

### Error Scenarios for Data Modification

This section describes business error scenarios that occur when users attempt to modify data, and how the system responds.

**Organization Deletion**

When an organization owner attempts to delete their organization:
- If there are pending timesheets that are neither approved nor rejected, the request is rejected
- If there are active employee contracts, the request is rejected
- If the owner is the sole user in the organization and has pending timesheets, the request is rejected

**User Account Deletion**

When a user attempts to delete their account:
- If the user is the sole owner of an organization, the request is rejected until ownership is transferred or the organization is deleted
- If the user has pending timesheets in any organization, the request is rejected

**Role Deletion**

When an organization owner attempts to delete a custom role:
- If any employees are assigned to the role, the request is rejected
- If the role is one of the three built-in roles (Owner, Manager, Employee), the request is rejected

**Project Deletion**

When a user with project management permission attempts to delete a project:
- If the project has any timelogs associated with it, the request is rejected
- If the project is currently active and has assigned employees, the request is rejected

**Department Deletion**

When a user with organization management permission attempts to delete a department:
- If the department has child departments, the request is rejected until child departments are reassigned or deleted
- The system does not delete employees when a department is deleted; it only sets their department to null

**Contract Creation**

When creating a new employee contract:
- If the start date overlaps with an existing active contract, the request is rejected
- If the pay rate is not a positive numeric value, the request is rejected
- If the working hours per week is not a positive integer, the request is rejected
- If the end date is earlier than the start date, the request is rejected

**Employee Invitation**

When inviting a new employee to the organization:
- If the email address format is invalid, the request is rejected
- If the email address already has a pending invitation for this organization, the request is rejected
- If the inviting user does not have employee management permission, the request is rejected

**Permission Validation**

When a user attempts any action:
- If the user does not have the required permission for the action in the current organization context, the request is rejected
- If the user is not a member of the organization they are trying to access, the request is rejected
- If the user's employee status in the organization is deactivated, the request is rejected for time tracking and timesheet operations

### Rejection Conditions for User Actions

### Rejection Conditions for User Actions

This section describes specific conditions under which user actions are rejected by the system.

**Timesheet Submission Rejection**

When an employee attempts to submit a timesheet:
- If the timesheet contains no timelogs, the request is rejected
- If another timesheet for the same week is already submitted or approved for that employee, the request is rejected
- If any timelogs in the timesheet have dates outside the week range (Monday to Sunday), the request is rejected
- If the employee's status is deactivated, the request is rejected

**Timelog Modification Rejection**

When an employee attempts to edit or delete their timelog:
- If the timelog is included in an approved timesheet, the request is rejected
- If the timelog is included in a submitted timesheet (not yet approved/rejected), the request is rejected
- If the timelog is for a project that is archived or completed, the request is rejected for new timelogs only (existing timelogs can be edited if not locked)
- If the employee attempts to edit another employee's timelog without time management permission, the request is rejected

**Task Assignment Rejection**

When assigning an employee to a task:
- If the employee is not a member of the project containing the task, the request is rejected
- If the task status is completed or closed, the request is rejected
- If the assigned employee's status is deactivated, the request is rejected

**Project Member Assignment Rejection**

When assigning an employee to a project:
- If the employee's status is deactivated, the request is rejected
- If the project status is archived or completed, the request is rejected
- If the assigning user does not have project management permission, the request is rejected

**Role Assignment Rejection**

When changing an employee's role:
- If the assigning user does not have employee management permission, the request is rejected
- If the target role does not exist in the organization, the request is rejected
- If attempting to change the role of the sole organization owner to a non-owner role, the request is rejected

**Contract Modification Rejection**

When editing an employee contract:
- If the contract is not the current active contract (past contracts), the request is rejected
- If the edit would create overlapping contracts, the request is rejected
- If the working hours per week is changed to a non-positive value, the request is rejected

**Timer Operation Rejection**

When an employee attempts timer operations:
- If the employee already has an active timer and attempts to start another, the request is rejected
- If the employee attempts to stop a timer that is not running, the request is rejected
- If the employee attempts to edit a timer that is not active, the request is rejected

**Data Access Rejection**

When a user attempts to access data:
- If the user does not have view permission for the type of data, the request is rejected
- If the user attempts to access data from an organization they are not a member of, the request is rejected
- If the data belongs to another employee and the user lacks appropriate permissions, the request is rejected

### Failure Cases in Time Tracking

### Failure Cases in Time Tracking

This section describes failure cases specific to time tracking operations and how the system handles them.

**Timer Failure Scenarios**

When a timer is running:
- If the employee's internet connection is lost while the timer is running, the timer continues tracking time locally and syncs when connection is restored
- If the employee closes the application while a timer is running, the timer continues tracking in the background
- If the system crashes while a timer is running, when the system restarts, the timer remains active with accurate elapsed time

**Timesheet Approval Failure**

When approving or rejecting timesheets:
- If the approving user loses permission while reviewing a timesheet, the approval/rejection action is rejected
- If multiple users attempt to approve the same timesheet simultaneously, only the first approval succeeds; subsequent attempts are rejected
- If the timesheet status changes between viewing and attempting approval (e.g., from submitted to draft), the approval action is rejected

**Timelog Creation Failure**

When creating timelogs:
- If the selected project is archived or completed, the timelog creation is rejected
- If the selected task does not belong to the selected project, the timelog creation is rejected
- If the duration exceeds 24 hours in a single timelog, the creation is rejected
- If the date is in the future, the timelog creation is rejected

**Timesheet Period Failure**

When working with timesheets:
- If an employee attempts to create a timesheet for a week that is not Monday to Sunday, the request is rejected
- If the week start date is not a Monday, the timesheet creation is rejected
- If the week end date is not a Sunday, the timesheet creation is rejected

**Data Consistency Failure**

When time tracking data becomes inconsistent:
- If a timelog's project is deleted while the timelog exists, the timelog is preserved but marked as orphaned (no project association)
- If an employee is deactivated while they have an active timer, the timer is automatically stopped and a timelog is created
- If a project is archived while employees have active timelogs for it, existing timelogs are preserved but no new timelogs can be created

**Calculation Failure**

When calculating time data:
- If the total hours calculation for a timesheet exceeds reasonable limits (e.g., over 168 hours in a week), the calculation is reviewed for data integrity
- If timelog durations sum to a different total than the timesheet's calculated total, the timesheet shows a data inconsistency warning
- If rounding of timer durations results in zero-minute timelogs, those timelogs are not created

**Concurrency Failure**

When multiple users modify related time data:
- If two users attempt to edit the same timelog simultaneously, the second edit is rejected with a conflict warning
- If a timesheet is being approved while an employee is adding timelogs to it, the approval fails if new timelogs were added during the approval process
- If a timer is stopped while another user is editing its details, the edit is rejected

### Exception Conditions in Business Rules

### Exception Conditions in Business Rules

This section describes exceptional conditions that deviate from normal business rules and how the system handles them.

**Organization Context Exceptions**

When users work across multiple organizations:
- If a user switches organizations while editing data, the edit is cancelled and the user must start over in the new organization context
- If a user's access to an organization is revoked while they are actively using it, their session is terminated for that organization
- If an organization is deleted while users are actively working in it, all active sessions for that organization are terminated

**Permission Exception Scenarios**

When permission exceptions occur:
- If a user gains a permission while performing an action that required it, they must restart the action
- If a user loses a permission while performing an action, the action is immediately halted and rolled back if possible
- If permission assignments conflict (e.g., user has both grant and deny for same action), the more restrictive permission takes precedence

**Data Ownership Exceptions**

When data ownership conflicts occur:
- If an employee is removed from a project while they have pending timelogs for it, those timelogs are preserved but marked with warning
- If a task is deleted while timelogs reference it, the timelogs retain task reference but show "task deleted" indicator
- If a department is deleted while employees belong to it, the employees' department field is set to null (no cascade deletion)

**Temporal Exceptions**

When time-based exceptions occur:
- If the system timezone differs from the organization's configured timezone, all time displays use the organization timezone
- If a contract's end date passes while it is still marked as active, the system automatically marks it as inactive
- If a timesheet is submitted after its week has passed, it is still processable but may trigger late submission notifications

**State Transition Exceptions**

When invalid state transitions are attempted:
- If a task is attempted to move from "completed" back to "in-progress," the transition is allowed but recorded in task history
- If a project is attempted to move from "archived" to "active," the transition is allowed but requires confirmation
- If an employee is attempted to reactivate while their user account is deleted, the reactivation fails

**Multi-Tenancy Exceptions**

When multi-tenancy isolation is challenged:
- If data from one organization accidentally appears in another organization's context, the system logs the incident and removes the data
- If a user attempts to access another organization's data by manipulating identifiers, the request is rejected and logged
- If organization boundaries are crossed in API requests, the request is rejected regardless of user permissions

**Business Rule Conflict Exceptions**

When business rules conflict:
- If a new rule contradicts existing data, the system applies the new rule prospectively only, not retroactively
- If seasonal rules (like holiday schedules) conflict with regular working hours, holiday rules take precedence
- If contract rules conflict with organization policies, organization policies take precedence

**Recovery Exceptions**

When recovery from errors is needed:
- If a timesheet approval fails mid-process, the timesheet remains in submitted status for retry
- If a timer fails to create a timelog when stopped, the system preserves timer data for manual recovery
- If bulk operations fail partway through, completed items are preserved and failed items are logged for manual correction

# Integration Error Handling

Error handling and retry policies for external integrations.

## Integration Failure Policies

Define retry strategies, circuit breaker policies, fallback behavior, and error escalation for external service failures.

### Integration Retry Strategies

### Integration Retry Strategies

**Automatic Retry on Transient Failures**
When a connection to an external service fails due to network issues or temporary unavailability, the system shall automatically retry the request.

The retry strategy shall use exponential backoff with the following parameters:
- Initial retry delay: 1 second
- Maximum retry delay: 60 seconds
- Maximum number of attempts: 3
- Backoff multiplier: 2

**Retry-able Error Conditions**
The system shall retry only for the following error conditions:
- Network connection timeout
- Service temporarily unavailable (HTTP 503)
- Gateway timeout (HTTP 504)
- Rate limiting (HTTP 429)

**Non-Retry-able Error Conditions**
The system shall NOT retry for the following error conditions:
- Authentication failures (HTTP 401, 403)
- Client errors (HTTP 400, 404)
- Validation errors
- Permission denied

**Retry Context Preservation**
Each retry attempt shall include the same request context and parameters as the original request.

**Retry Logging**
Each retry attempt shall be logged in the activity log with:
- Timestamp of the attempt
- Error type encountered
- Retry attempt number
- Result of the retry attempt

**User Notification**
If all retry attempts fail, the user shall receive a notification indicating the persistent failure.

### Circuit Breaker Policies

### Circuit Breaker Policies

**Circuit Breaker Implementation**
The system shall implement a circuit breaker pattern for external service calls to prevent cascading failures.

**Circuit States**
The circuit shall have three states:
- **Closed**: Normal operation, requests flow through
- **Open**: Service is failing, requests are rejected immediately
- **Half-Open**: Limited requests allowed to test if service has recovered

**Failure Threshold**
The circuit shall open when:
- 50% of requests fail within a 1-minute rolling window
- OR 5 consecutive requests fail

**Timeout Configuration**
The circuit shall remain open for 60 seconds before transitioning to half-open state.

**Half-Open Behavior**
In half-open state:
- Only 1 request shall be allowed every 10 seconds
- Successful requests shall close the circuit
- Failed requests shall reset the timeout and keep circuit open

**Circuit Breaker Metrics**
The following metrics shall be tracked per external service:
- Total requests
- Failed requests
- Circuit state changes
- Time spent in each state

**Circuit Breaker Exceptions**
The circuit breaker shall NOT apply to:
- Internal system calls
- Database operations
- File system operations

### Fallback Behavior

### Fallback Behavior

**Fallback Trigger Conditions**
Fallback behavior shall be triggered when:
- Circuit breaker is open for an external service
- OR all retry attempts have failed
- OR response time exceeds 30 seconds

**Data Fallback Strategies**
The system shall implement the following fallback strategies:
1. **Cached Data Fallback**: Return cached data from previous successful responses with appropriate staleness indicators
2. **Default Value Fallback**: Return system-configured default values for missing data
3. **Partial Data Fallback**: Return available data with placeholders for missing fields
4. **Graceful Degradation**: Disable non-essential features while maintaining core functionality

**Fallback Priority Order**
Fallback strategies shall be applied in this priority order:
1. Use cached data (if available and less than 5 minutes old)
2. Use default values (system-configured)
3. Use partial data with warnings
4. Disable feature with user notification

**Fallback User Experience**
When fallback is active:
- Users shall see clear indicators that data may be stale or incomplete
- Critical operations requiring fresh data shall be disabled
- Users shall be notified when normal service resumes

**Fallback Recovery**
The system shall automatically attempt to restore normal operation when:
- The external service becomes available again
- Cached data exceeds maximum allowed age (15 minutes)
- User explicitly requests refresh

**Fallback Monitoring**
The system shall log all fallback activations with:
- Reason for fallback
- Fallback strategy applied
- Duration of fallback state
- Recovery timestamp

### Integration Error Handling and Escalation

### Integration Error Handling and Escalation

**Error Classification**
Integration errors shall be classified into three severity levels:
- **Low**: Temporary network issues, retry in progress
- **Medium**: Service degradation, fallback active
- **High**: Complete service failure, critical impact

**Error Notification**
Based on severity, notifications shall be sent as follows:
- **Low**: Logged in activity log only
- **Medium**: Notification to system administrators via internal alerts
- **High**: Immediate notification to organization owners and system administrators with escalation path

**Error Escalation Timeline**
Escalation shall follow this timeline:
1. **5 minutes of continuous failure**: System administrator notification
2. **15 minutes of continuous failure**: Organization owner notification
3. **30 minutes of continuous failure**: Priority support ticket creation
4. **60 minutes of continuous failure**: Executive escalation

**Error Context Preservation**
Each integration error shall preserve:
- Timestamp of first occurrence
- Service endpoint and method
- Request parameters (sanitized)
- Response status and body (if available)
- Retry attempts made
- Fallback strategies applied

**Manual Intervention**
For persistent high-severity errors:
- System administrators shall be able to manually trigger retry
- Organization owners shall be able to temporarily disable affected integrations
- Support personnel shall have access to detailed error diagnostics

**Post-Mortem Analysis**
After resolution of high-severity errors:
- Root cause analysis shall be performed
- System improvements shall be identified
- Prevention measures shall be implemented
- Summary report shall be shared with affected organization owners

**Error Recovery Verification**
Before declaring an integration restored:
- At least 3 consecutive successful test requests shall be required
- Response times shall be within normal bounds (< 2 seconds)
- Error rates shall be below 1% for 5 minutes
- Fallback mode shall be automatically disabled upon successful verification

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation Rules

### File Format Validation

THE system SHALL restrict uploaded files to specific content types for organization logos and user avatars.
WHEN a user attempts to upload an organization logo, THE system SHALL accept image files only.
WHEN a user attempts to upload a user avatar, THE system SHALL accept image files only.

### Content-Type Verification

THE system SHALL verify that the uploaded file's content type matches its file extension.
IF the content type does not match the file extension, THEN THE system SHALL reject the upload with an error message.
WHERE file uploads are performed, THE system SHALL validate content type before storing the file.

### Virus Scanning Requirements

WHEN any file is uploaded to the system, THE system SHALL perform virus scanning before storage.
IF a virus is detected during scanning, THEN THE system SHALL reject the upload and notify the user.
WHILE a file is being scanned for viruses, THE system SHALL prevent access to that file by other users.
WHERE malicious content is detected, THE system SHALL log the attempt in the activity log.

### File Retention Policies

THE system SHALL retain organization logos and user avatars for the duration of their respective entities' existence.
WHEN an organization is deleted, THE system SHALL permanently delete all associated logo files.
WHEN a user account is deleted, THE system SHALL permanently delete all associated avatar files.
IF a user updates their avatar, THEN THE system SHALL delete the previous avatar file.
IF an organization updates its logo, THEN THE system SHALL delete the previous logo file.
WHERE file deletion occurs, THE system SHALL perform secure deletion to prevent data recovery.

### File Size Limitations

THE system SHALL enforce maximum file size limits for uploaded files.
WHEN a user attempts to upload a file exceeding the size limit, THE system SHALL reject the upload.
WHERE file uploads are permitted, THE system SHALL communicate size limitations to users before upload attempts.

### File Storage Isolation

THE system SHALL store files in organization-isolated storage locations.
WHILE processing file requests, THE system SHALL verify that the requesting user has access to the organization owning the file.
WHERE multi-tenancy is enforced, THE system SHALL prevent file access across organization boundaries.

### Error Handling for File Operations

IF file validation fails due to unsupported format, THEN THE system SHALL provide a clear error message indicating supported formats.
IF virus scanning fails due to system error, THEN THE system SHALL reject the upload and notify administrators.
IF file storage fails due to insufficient space, THEN THE system SHALL reject the upload and notify organization owners.
WHERE file operations encounter errors, THE system SHALL log detailed error information for troubleshooting.