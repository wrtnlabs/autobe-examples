**hrms — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is a person who has not yet created an account in the system. Guests can only access the registration and login pages. They cannot view any organization data or use any platform features. Guests have no access to projects, employees, timesheets, or reports. When a guest registers with an email and password, they become a member. When a guest logs in with their credentials, they become a member. Guests must create an account before they can join an organization. Until they sign up, guests have no organization association or permissions. Guests cannot switch organizations or view any business data. They exist outside the organization structure until registration completes.

### Guest Account Creation

A guest is a person who has not yet created an account in the system. Guests can register by providing an email address and password. During registration, the system validates that the email is not already registered. If the email is valid and unique, the system creates a new user account. After successful registration, the newly created user becomes a member and can log in. Guests cannot perform any other actions during registration except creating the initial account credentials.

### Registration Access Only

Guests have exclusive access to the registration page. They can view and interact with the registration form but cannot access any other pages or features of the platform. The registration page is the only entry point available to unauthenticated visitors. Guests cannot browse organization content, view projects, employees, timesheets, or reports. They cannot view any dashboard, department list, or activity logs. All organizational data remains inaccessible until registration completes successfully.

### Login Required Access

Guests must log in with their registered email and password before accessing any member features. The login process authenticates the user and establishes their session. After successful login, the guest transitions to member status and gains access to features appropriate for their role. Guests cannot access member-only pages or perform member actions without completing the login process. The system requires valid credentials before granting any access beyond the public landing pages.

### No Organization Data Visibility

Guests have no visibility into any organization data. They cannot view organization names, descriptions, logos, or settings. They cannot see lists of organizations, departments, employees, projects, tasks, timelogs, or timesheets. The system does not display any organizational structure or content to guests. All organization-specific information is completely hidden from unauthenticated visitors. Guests exist entirely outside the organization data hierarchy.

### No Role Assignment

Guests have no role assignments in any organization. Roles such as Owner, Manager, or Employee are only assigned after a user joins an organization through invitation or membership. Guests do not have permissions like org:manage, employee:manage, project:manage, time:approve, or any other role-based permission. Without organization membership, no permissions are granted. Guests cannot access role-restricted features or view role-specific content until they join an organization and are assigned a role.

### No Organization Membership

Guests have no organization membership. They are not associated with any organization, cannot be listed in employee directories, and cannot participate in organizational activities. Membership requires being invited by someone with employee:manage permission or having already created an account and being added to an organization. Without membership, guests have no connection to any organization's data, cannot access organization resources, and cannot be part of any team or project.

### Unauthenticated Visitor Status

Guests are considered unauthenticated visitors to the platform. The system cannot identify them beyond their temporary session cookie or session state. Unauthenticated visitors cannot perform any actions that require identity verification. All requests from guests are treated as coming from unidentified users. The system does not store any permanent record of guest activity beyond basic session data. Guest sessions expire when the browser is closed or after a defined timeout period.

### Pending Registration State

During the registration process, a user may be in a pending state while their account is being created. This pending state is temporary and resolves immediately upon successful account creation. The system does not maintain a long-term pending registration state. All pending actions must complete within a single registration session. If registration is interrupted, the user must restart the process. The system does not save draft registrations or allow users to resume registration later.

### Account Creation Restrictions

Guests cannot create accounts with duplicate email addresses. If an email is already registered, the system directs the user to the login page instead of allowing another registration. Guests cannot create accounts without providing both email and password. Both fields are required and must meet minimum validity criteria. Invalid email formats or weak passwords are rejected during the registration process. The system validates input before creating the account.

### Guest Session Management

Guest sessions are ephemeral and do not persist user identity. Sessions are automatically destroyed when the user logs out, the browser is closed, or the session expires. Guests cannot maintain persistent login states across different devices or sessions. Each visit to the platform requires a new session that begins in guest status. Session data does not carry over to subsequent visits. Users must always log in to establish a new session after their previous session ends.

### Public Landing Pages

Guests can access public landing pages that describe the platform's features and benefits. These pages do not contain sensitive organization data or require authentication. Landing pages may show marketing information, pricing, and feature descriptions. Guests can navigate between public pages without restrictions. However, all pages requiring organization access or member features redirect guests to the login or registration page. The system distinguishes between public-facing content and member-only content.

### Access Restriction Enforcement

The system enforces strict access restrictions on guest users. Any attempt to access member-only resources automatically redirects guests to authentication pages. The system blocks all unauthorized requests from unauthenticated visitors. Access controls operate at the page level, feature level, and data level. Guests cannot bypass restrictions through direct links or API calls. All access paths require successful authentication before granting permissions.

### No Activity Logging for Guests

The system does not create activity log entries for guest actions. Activity logs only record actions performed by authenticated users with established identities. Guest interactions are not tracked in the activity log because the user has no persistent identity. The system maintains no record of guest navigation, form interactions, or feature exploration. Only authenticated actions generate entries in the activity log.

### Registration Email Validation

During registration, the system validates the provided email address against standard email format requirements. The system checks that the email follows a valid pattern with a domain and local part. Invalid email formats are rejected with a clear error message. The system may also check if the email domain is acceptable for organizational use. Failed validation prevents account creation until a valid email is provided. Validated emails are stored as the primary identifier for the user account.

### Guest Account Deletion

Guest accounts are not created until registration completes successfully. Until then, there is no account to delete. Once registration completes and the user becomes a member, the account deletion rules for members apply. Members who have not joined any organization can delete their account. Members who are organization owners must follow the owner deletion process. Guest status has no deletion process because no permanent account exists until registration finishes.

## member Actor

A member is a user who has created an account and belongs to at least one organization. Each member must select which organization they want to work in. Once they select an organization, all their actions are scoped to that organization. Members can switch between organizations they belong to without logging out. Each member has exactly one role within each organization they belong to. The role determines what features and data the member can access. Members cannot see data from organizations where they are not members. Members are assigned one of three built-in roles: Owner, Manager, or Employee, or a custom role. Each role grants a specific set of permissions for organization features. Members' data access and actions are limited to their assigned role permissions. Members can view and use features that their role allows them to access within their selected organization context.

### Member Organization Membership

A member is a registered user who has created an account and belongs to at least one organization within the system.

Membership begins when a member is added to an organization through one of the following methods:
- Direct account creation where the user creates their first organization during sign-up
- Invitation by an organization member with employee management permissions via email
- Manual assignment by an organization owner or member with employee management permissions

Each member must have at least one active organization membership to perform any system operations. A member may belong to multiple organizations simultaneously.

When a member is invited to an organization and already has an account, the invitation is automatically accepted and membership is established. When a member is invited and does not yet have an account, a pending invitation is created that will automatically associate the new account with the organization once registration is completed.

An organization membership becomes deactivated when the member's role is revoked or when the member's account is deleted while still having memberships in other organizations. A deactivated membership prevents the member from accessing any organization data or performing operations.

Each organization maintains a complete list of its members. Organization owners and members with employee management permissions can view the full member list for their organization.

### Role-Based Access Control

The system implements role-based access control (RBAC) to govern all member actions and data visibility. Each member within an organization is assigned exactly one role that determines their permissions.

The system includes three built-in roles that cannot be deleted:
- Owner: Full access to all features including organization management, role management, and member management
- Manager: Can manage employees, projects, approve timesheets, and view reports
- Employee: Can track time, submit timesheets, and view their own data

Organization owners may create custom roles with specific permission sets tailored to organizational needs. Each custom role must have a unique name within the organization.

The available permissions that may be assigned to roles are:
- Organization management: Edit organization settings
- Employee management: Add, edit, and deactivate employees
- Employee viewing: View employee list and details
- Project management: Create, edit, and delete projects and tasks
- Project viewing: View projects and tasks
- Time management: Edit or delete any employee's time logs
- Time approval: Approve or reject timesheets
- Time viewing: View all employees' time logs and timesheets
- Report viewing: View organization reports

Role assignments can be modified by users with employee management permissions. When a role is changed, the member immediately gains or loses access to all features and data covered by the new role's permissions.

Built-in roles cannot be modified or have their permissions changed. Only organization owners can modify custom roles.

### Multi-Organization Membership

Members may belong to multiple organizations simultaneously. Each membership is independent and maintains its own role assignment, permissions, and data context.

A member's global account is shared across all organizations they belong to. The same profile information (display name, avatar image, phone number) appears across all organizational contexts.

Within each organization, a member may have a different role. A member may be an Owner in one organization, a Manager in another, and an Employee in a third organization. Each organizational role is assigned independently.

All data is strictly isolated by organization. A member cannot access or view any data from an organization where they are not a member. Data visibility is limited to the organizations where the member has active membership.

A member's account deletion follows different rules depending on their organizational roles:
- If the member is the sole owner of any organization, they must transfer ownership to another member or delete that organization before their account can be deleted
- When a member's account is deleted, their employee records in all other organizations are marked as deactivated
- The member's account itself is permanently deleted after all organizational ownership requirements are satisfied

### Selected Organization Context

Each member must select which organization they want to work in when they log in. This selection establishes the active organizational context for all subsequent operations.

All actions performed by a member are scoped to their selected organization. The member can only perform operations that are permitted by their role within that specific organization.

The selected organization determines:
- Which employee records the member can access and manage
- Which projects and tasks the member can view and modify
- Which timesheets and time logs the member can submit, approve, or edit
- Which reports the member can generate and view
- Which activity log entries the member can view

A member can switch between organizations they belong to without logging out. When switching organizations, the member's session remains active, but their context changes to the newly selected organization.

The system enforces that a member can only perform operations on data within their currently selected organization. Any attempt to access data from a non-selected organization is rejected.

Organization switching is available to all active members regardless of their role in any organization. A member can switch to any organization where they have active membership.

### Role Assignment Permissions

Only specific users have permission to assign or change roles within an organization.

Organization owners can:
- Assign any built-in or custom role to any member
- Change a member's role to any other role within the organization
- Create new custom roles with specific permission sets
- Edit existing custom roles to modify their permissions
- Delete custom roles

Users with employee management permission can:
- Change a member's role to another role within the organization
- Cannot create new custom roles
- Cannot modify the permissions of any role
- Cannot delete built-in roles

Custom roles can only be deleted by organization owners. A custom role cannot be deleted if any members are currently assigned to that role. All member assignments must be transferred to other roles before deletion.

Built-in roles (Owner, Manager, Employee) cannot be deleted by any user. The permissions of built-in roles cannot be modified. These roles serve as the foundation for role-based access control.

When a member's role is changed, the change takes effect immediately. The member loses access to features covered by the old role's permissions and gains access to features covered by the new role's permissions.

### Organization-Scoped Data Access

All data access is scoped to the member's selected organization. A member can only access, view, or modify data that belongs to their currently selected organization.

Each organization maintains complete isolation from all other organizations. Members cannot view, access, or modify any data from organizations where they are not members.

Data ownership within an organization:
- Employee records are owned by the organization and can only be managed by members with employee management permissions
- Project data is owned by the organization and can only be managed by members with project management permissions
- Time logs and timesheets are owned by the organization and can only be managed according to the member's assigned role
- Department structures are owned by the organization and can only be managed by members with organization management permissions
- Custom roles and their permissions are owned by the organization and can only be managed by organization owners

Reports generated within an organization contain only data from that organization. No cross-organization data appears in any report.

The activity log within an organization contains only actions performed by members of that organization. Activity logs are organization-specific and cannot be viewed across organizations.

Even when a member belongs to multiple organizations, they only see data from the one organization they have currently selected. Organization boundaries are strictly enforced at all times.

### Cross-Organization Data Isolation

The system maintains strict data isolation between organizations. Each organization's data is completely separate and cannot be accessed by members of other organizations.

A member who belongs to multiple organizations can only view and interact with data from their currently selected organization. Data from other organizations is completely invisible and inaccessible.

Organization isolation applies to all data types:
- Employee records are isolated and cannot be viewed or accessed across organizations
- Projects and tasks are isolated and cannot be viewed or accessed across organizations
- Time logs and timesheets are isolated and cannot be viewed or accessed across organizations
- Departments are isolated and cannot be viewed or accessed across organizations
- Activity logs are isolated and cannot be viewed or accessed across organizations
- Reports are isolated and contain only data from a single organization

Organization owners have no special access to data from other organizations. Each organization is a separate tenant with completely isolated data.

When an organization is deleted, all its data is permanently deleted and cannot be recovered. This includes all employees, projects, tasks, time logs, timesheets, departments, activity logs, and reports.

### Member Role Privileges

Each role within an organization grants specific privileges that determine what features and data a member can access.

Owner privileges:
- Full access to all organization features
- Manage all organization settings and configuration
- Create, edit, and delete custom roles
- Assign any role to any member
- View and export all organization reports
- View the complete activity log
- Delete the organization (subject to constraints)
- Approve or reject any timesheet
- Edit or delete any employee's time logs
- Create, edit, and delete any project or task
- Invite or deactivate any employee
- View all employee records and contract information

Manager privileges:
- Manage employee records (add, edit, deactivate)
- View all employee records and contract information
- Approve or reject submitted timesheets
- Create, edit, and delete projects and tasks
- Assign employees to projects
- View all organization reports
- View all timesheets and time logs
- Cannot manage roles or organization settings

Employee privileges:
- Create and manage their own time logs
- Submit their own timesheets for approval
- View their own employee record and contract information
- View projects and tasks they are assigned to
- View their own timesheets and time logs
- Cannot approve timesheets or manage other employees
- Cannot create or edit projects or tasks

Custom role privileges are determined by the specific permissions assigned when the role is created. A custom role may have a subset or combination of permissions from the built-in roles.

### Role-Based Feature Access

Access to system features is controlled by the permissions assigned to each role. A member can only use features for which their role includes the necessary permissions.

Organization features require organization management permission:
- Edit organization settings
- Manage department structure
- View and export organization reports
- View the complete activity log

Employee features require employee management permission:
- Add new employees via invitation
- Edit employee records (department, position, employment type)
- Deactivate or reactivate employees
- Assign roles to employees
- Create employee contracts

Project features require project management permission:
- Create new projects
- Edit project details (name, description, status, budget)
- Archive or complete projects
- Delete projects
- Assign employees to projects
- Create, edit, and delete tasks

Time tracking features have different permission levels:
- Time viewing permission: View all time logs and timesheets
- Time management permission: Edit or delete any time log
- Time approval permission: Approve or reject timesheets

Report features require report viewing permission:
- Access the time report
- Access the project budget report
- Access the weekly summary report
- Access the organization dashboard

Features not explicitly granted by role permissions cannot be accessed. For example, a member with only employee privileges cannot access project management features even if they belong to an organization that has projects.

Permission checks are performed for every feature access. If a member attempts to use a feature without the required permission, access is denied.

### Single Role per Organization

Each member is assigned exactly one role within each organization they belong to. A member cannot have multiple simultaneous roles within the same organization.

When a member is first added to an organization, they are assigned a single role. This role assignment is permanent until changed by a user with role assignment permissions.

The single role determines all of the member's access and capabilities within that organization:
- What data they can view
- What actions they can perform
- What features they can access
- What reports they can generate

A member may have different roles in different organizations. The role in one organization does not affect or influence the role in another organization. Each organizational role is independent.

Role assignments are tracked and can be viewed by users with employee management permissions. The role assignment history shows when roles were assigned and by whom.

If a member's role is changed, the change is immediate and affects all future operations. The member cannot temporarily hold privileges from a different role while maintaining their original role.

Members with the Owner role in their organization have special capabilities for managing other members' roles and can reassign roles to themselves or other members.

### Member Data Visibility Scope

A member's data visibility is determined by three factors: their selected organization, their role within that organization, and their relationship to specific data.

Employee data visibility:
- Members with employee viewing permission can view all employee records within their selected organization
- Members without employee viewing permission can only view their own employee record
- Deactivated employees' records remain visible to members with appropriate permissions but cannot be accessed for operations
- Each employee can view their own employee record and contract information regardless of role

Project and task visibility:
- Members with project viewing permission can view all projects and tasks within their selected organization
- Members without project viewing permission can only view projects and tasks they are directly assigned to
- Project leads can view and manage all tasks within their assigned projects
- Archived and completed projects remain visible according to the member's permissions

Time log and timesheet visibility:
- Members with time viewing permission can view all employees' time logs and timesheets
- Members with only employee privileges can view only their own time logs and timesheets
- Employees can view their own submitted timesheets and approval status
- Time logs in approved timesheets are locked and visible but not editable

Report visibility:
- Members with report viewing permission can access all organization reports
- Members without report viewing permission cannot generate or view any reports
- Reports contain only data from the member's selected organization

Activity log visibility:
- Members with organization management permission can view the complete activity log
- Members without organization management permission cannot view any activity log entries
- Activity logs are scoped to the selected organization only

### Organization Context Switching

Members can switch between organizations they belong to without logging out or creating a new session.

The organization context switching process:
- A member views the list of organizations they belong to
- A member selects the organization they want to work in
- The system updates the member's current context to the selected organization
- All subsequent operations are scoped to the new organization
- The member's session remains active throughout the switch

When switching organizations, the member immediately gains or loses access to different data:
- Different employee records become visible
- Different projects and tasks become available
- Different timesheets and time logs become accessible
- Different reports can be generated
- Different activity log entries can be viewed

The member's global account information (display name, avatar, phone number) remains the same across all organizations. Only the organizational role and permissions change.

Organization switching does not affect any existing work. If a member has an active timer, drafts, or open operations in one organization, those remain in that organization and are not affected by switching.

Members can switch organizations at any time. There is no limit to the number of times a member can switch between their organizations.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

New users can create an account by providing an email address and password.

The email address must be unique across all accounts. If an email already exists in the system, registration is rejected.

The password is required and must meet security requirements.

During registration, users create their first organization. They must provide:
- Organization name (required)
- Organization description (optional)
- Organization logo image (optional)
- Currency (required, e.g., USD, EUR, KRW)
- Timezone (required)
- Fiscal start month (required)

Users with this registration become the owner of the newly created organization and receive full access to all features.

If organization creation fails during registration, the account is not created.

Users who receive an invitation to an organization do not need to register separately. When they sign up with the invited email address, they are automatically added to the pending organization.

### User Login

Registered users can log in to the system using their email address and password.

Users must provide their registered email and password to authenticate.

If the email does not exist in the system, login is rejected.

If the password is incorrect, login is rejected.

If the account has been deactivated, login is rejected.

After successful authentication, users must select which organization to work in.

If the user belongs to only one organization, that organization is automatically selected.

If the user belongs to multiple organizations, a list of available organizations is presented for selection.

Once an organization is selected, all subsequent actions are scoped to that organization.

The system remembers the last selected organization for the current session.

### Organization Selection

After login, users must select their working organization context.

Users can switch between organizations they belong to without logging out.

When switching organizations, the system re-authenticates the user's session for the new organization context.

All data visibility is scoped to the currently selected organization.

Employees cannot see data from organizations where they are not members or not currently selected.

Users who belong to multiple organizations can quickly switch between them using an organization selector.

The organization selector shows the user's name and the current organization name.

Switching organizations preserves the user's session and authentication state.

If a user's access to a previously selected organization is revoked, they cannot switch back to that organization.

### Multi-Organization Membership

Users can belong to multiple organizations simultaneously.

Each user can be a member of multiple organizations with different roles.

Users can view all organizations they belong to in their account settings.

Organization owners can belong to other organizations as managers or employees.

When invited to an organization, users see the invitation in their dashboard.

Users can accept invitations to join organizations they were invited to.

Users can leave organizations they belong to (except when they are the sole owner).

When a user leaves an organization, they lose all access to that organization's data.

Users can manage their organization memberships through account settings.

Each organization membership has its own role that determines access permissions.

### Password Management

Users can change their password from the account settings.

To change their password, users must provide their current password and a new password.

The new password must meet security requirements.

If the current password is incorrect, the password change is rejected.

If the new password is too similar to the current password, the change is rejected.

After a successful password change, users must log in again with the new password.

All existing sessions are invalidated after a password change.

Users with forgotten passwords can request a password reset via email.

Password reset links expire after a set time period.

Each organization can have its own password policy enforced by organization owners.

### Account Deletion

Users can delete their own accounts from the account settings.

Before account deletion, users must verify their identity by providing their current password.

If a user is the sole owner of an organization, they must first transfer ownership to another member.

If a user is the sole owner of an organization, they must first delete the organization.

Account deletion permanently removes the user's account from the system.

When an account is deleted, the user's employee records in other organizations are marked as deactivated.

The user's historical data (timelogs, timesheets, activity logs) in other organizations is preserved.

Organization owners cannot delete their account if they are the only member of their organization.

Users can restore their account within a short period after deletion by contacting support.

Account deletion is irreversible after the restoration period expires.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, a session is established for the member.
The session remains active until the member logs out or the session expires.
A member can have at most one active session at a time per browser session.
If a member attempts to log in from another device or browser, the previous session is terminated.
The session includes the member's selected organization context.
All actions during the session are scoped to the selected organization.

### Organization Context Switching

Members can switch between organizations without logging out.
When switching organizations, the current session is maintained but the organization context changes.
All subsequent actions are scoped to the newly selected organization.
Members can view a list of all organizations they belong to.
Only organizations where the member has an active membership can be selected.
Switching organizations does not affect the session expiration time.

### Session Security

Sessions are automatically terminated when members change their password.
Members can view their current session information including the last activity time.
Members can terminate all active sessions from the security settings.
Terminating all active sessions requires logging in again from all devices.
Session expiration occurs after a period of inactivity as defined by the organization settings.
Members are notified before session expiration if they have pending unsaved changes.

### Logout

Members can manually log out from the system at any time.
Logging out terminates the current session and clears all organization context.
After logout, members must log in again to access the system.
Logging out from all organizations ends the session for all organizations.
Members can be automatically logged out if their account is deactivated.
Members can be automatically logged out if the organization they are in is deleted.
When logging out, the system clears all session-related data.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and password. The email address must be unique across the system.

During initial account creation, the user must create an organization. The organization requires a name and description. The organization is associated with the creating user as the owner.

The system validates that the email address is properly formatted. If the email format is invalid, the account creation request is rejected. If the email address is already registered, the request is rejected.

Users can log in to the system using their email and password. Upon successful authentication, the user is prompted to select an organization to work in if they belong to multiple organizations.

All subsequent actions are scoped to the selected organization context. Users can switch between organizations without logging out, but each organization's data remains isolated.

### Account Deletion

Users can delete their account. The deletion process depends on the user's organizational ownership status.

If the user is the sole owner of an organization, they must either transfer ownership to another user or delete the organization before they can delete their account. If ownership is not transferred and the organization is not deleted, the account deletion request is rejected.

If the user has multiple organizations and is not the sole owner of any of them, their account can be deleted directly.

When an account is deleted:
- The user's account is permanently removed from the system
- If the user was the owner of an organization that was deleted, all organization data (employees, projects, tasks, timelogs, timesheets) is permanently deleted
- The user's employee records in other organizations are marked as deactivated but not deleted
- The user can no longer log in to the system

Deactivated employee records preserve historical data including timelogs and timesheets. The historical data remains accessible for reporting and audit purposes.

### Password Change

Users can change their password at any time. Password changes are made through the user profile settings.

To change a password, the user must provide their current password and the new password. The system validates that the current password is correct before applying the change.

The new password must meet the system's password requirements. If the new password does not meet the requirements, the change request is rejected.

After a successful password change, the user is logged out from all active sessions and must log in again using the new password.

Users who forget their password can request a password reset through the login interface. The password reset process sends a reset link to the user's registered email address.