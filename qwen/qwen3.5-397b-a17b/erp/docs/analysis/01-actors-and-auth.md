**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who has not yet created an account or logged into the platform. Guests can access the sign-up page to create a new user account with email and password credentials. Guests can also access the login page to authenticate with existing credentials. Until authentication is complete, guests cannot view or interact with any organization data. Guests have no organization context and cannot select or switch between organizations. All platform features related to time tracking, project management, and employee management remain inaccessible to guests. Guests cannot view dashboards, reports, or any employee information. The guest actor represents the entry point before a user becomes a platform member. Once a guest completes sign-up or login, they transition to a member actor with organization access.

### Guest Identity and Platform Entry

A guest is an unauthenticated visitor who has not created an account or logged into the platform. The guest actor represents the pre-authentication state of any user accessing the platform. Guests can access public pages only, which include the sign-up page and login page. The platform entry point for all users begins in the guest state. Guests have no organization context and cannot select or switch between organizations. Until authentication is complete, guests remain in this unauthenticated visitor state with no association to any organization.

### Guest Access Boundaries

Guests cannot view or interact with any organization data. All platform features remain inaccessible to guests until authentication is completed. Guests cannot access dashboards, reports, or employee information. Guests cannot track time, view projects, or manage tasks. Guests cannot view timelogs, timesheets, or any time tracking data. The authentication required boundary ensures that all organization-scoped features are protected from unauthenticated access. This access boundary applies uniformly regardless of whether the user will eventually become an Owner, Manager, or Employee.

### Guest Authentication Pathways

Guests can access the sign-up page to create a new user account using email and password registration. Guests can access the login page to authenticate with existing credentials. The account creation flow allows guests to register with a unique email address and a password. Upon successful sign-up or login, the guest transitions to a member actor with organization access. This transition from guest to member grants the user the ability to select an organization context and access features based on their assigned role.

## member Actor

A member is an authenticated user who belongs to one or more organizations within the platform. Members select an organization context upon login, and all subsequent actions are scoped to that selected organization. Each member holds exactly one role per organization, which determines their available permissions and access boundaries. The three built-in roles are Owner, Manager, and Employee, each with distinct permission sets. Members can switch between organizations they belong to without logging out. Members with the Owner role have full access to all features and can manage roles and members. Members with the Manager role can manage employees, projects, approve timesheets, and view reports. Members with the Employee role can track time, submit timesheets, and view their own data. All member actions are strictly isolated to their currently selected organization. Members cannot see or access data from organizations they do not belong to. The member actor represents any authenticated user operating within an organization context.

### Member Identity and Organization Context

A member is an authenticated user who has signed up with email and password and belongs to one or more organizations within the platform. Upon login, a member selects which organization to work in, establishing their organization context. All subsequent actions performed by the member are scoped to the selected organization. Members can switch between organizations they belong to without logging out. When switching organizations, the member's available permissions and accessible data change to reflect the new organization context. A member's identity is tied to their global user account, which includes their display name, avatar image, and phone number. This profile is shared across all organizations the member belongs to. Each member holds exactly one role per organization, which determines their available permissions and access boundaries within that organization.

### Built-in Role Types

The platform defines three built-in roles that cannot be deleted. The Owner role has full access to all features within the organization, including the ability to manage roles and members. The Manager role can manage employees, manage projects, approve timesheets, and view organization reports. The Employee role can track time, submit timesheets, and view their own data. Each built-in role has a predefined set of permissions that cannot be modified. Organization owners cannot delete built-in roles. Every organization has all three built-in roles available by default. Members assigned to built-in roles inherit all permissions associated with that role.

### Custom Role Assignment

Organization owners can create custom roles with a name and a set of permissions selected from the available permission list. Available permissions include: org:manage (edit organization settings), employee:manage (add, edit, deactivate employees), employee:view (view employee list and details), project:manage (create, edit, delete projects and tasks), project:view (view projects and tasks), time:manage (edit or delete any employee's timelogs), time:approve (approve or reject timesheets), time:view_all (view all employees' timelogs and timesheets), and report:view (view organization reports). Organization owners can edit custom roles to change their name or permission set. Organization owners can delete custom roles only if no employees are currently assigned to that role. Each employee in an organization is assigned exactly one role, which can be a built-in role or a custom role. Role assignment can be changed by members with the employee:manage permission.

### Owner Role Full Access

Members with the Owner role have full access to all features within their organization. Owners can edit organization settings including name, description, logo image, currency, timezone, and fiscal start month. Owners can manage roles by creating, editing, and deleting custom roles. Owners can manage members by inviting new employees, editing employee records, deactivating employees, and changing role assignments. Owners can delete their organization only if all pending timesheets are resolved (approved or rejected) and there are no active employee contracts. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets are permanently deleted, but the owner's account remains. Owners can view the full activity log for their organization. Owners have access to the organization dashboard showing total employees, total hours logged, pending timesheets, budget utilization, and top employees by hours logged.

### Manager Role Employee and Project Management

Members with the Manager role can manage employees within their organization. Managers can invite new employees to the organization by email. Managers can edit employee records including department, position, and employment type. Managers can deactivate employees, which prevents them from logging time or submitting timesheets while preserving their historical data. Managers can reactivate deactivated employees. Managers can view the employee list with pagination and filter by department, employment type, and status. Managers can search employees by name. Managers with the project:manage permission can create, edit, and delete projects. Managers can archive or complete projects, which prevents new timelogs but preserves existing timelogs. Managers can assign employees to projects and remove employees from projects. Managers can view all projects with pagination and filter by status. Managers can view tasks in projects and filter by status, priority, and assigned employee.

### Employee Role Time Tracking and Timesheets

Members with the Employee role can track time by creating timelogs. Employees can only create timelogs for themselves. Each timelog includes a date, duration in minutes, project (must be a project the employee is assigned to), optional task, optional description, and a billable flag. Employees can edit their own timelogs only if the timelog is not part of an approved timesheet. Employees can delete their own timelogs only if the timelog is not part of any submitted or approved timesheet. Employees can submit timesheets for approval. A timesheet is a collection of timelogs for a specific week (Monday to Sunday). Employees can create a draft timesheet that automatically includes all their timelogs for that week. Employees can add or remove timelogs from a draft timesheet. A timesheet cannot be submitted if it has no timelogs or if another timesheet for the same week is already submitted or approved. Employees can view their own timesheets with pagination and filter by status and date range. Employees can view their own timelogs with pagination and filter by date range, project, task, and billable status.

### Organization Data Isolation

All data is strictly isolated per organization. Members can only see and access data from organizations they belong to. Members cannot see or access data from organizations they do not belong to. When a member switches organizations, their view and available actions change to reflect the new organization's data. API endpoints enforce organization context on every request. Members who belong to multiple organizations only see data for their currently selected organization. If a member is deactivated in an organization, they cannot log time or submit timesheets in that organization, but their historical data (timelogs, timesheets) is preserved. If a member deletes their account and is the sole owner of an organization, they must transfer ownership or delete the organization first. When a member's account is deleted, their employee records in other organizations are marked as deactivated.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address and a password. The email address must be unique across the platform. During registration, users can optionally create a new organization or join an existing organization if they have an invitation.

If the email address is already registered, the registration is rejected. If the password does not meet security requirements, the registration is rejected. If the user is joining via invitation, the invitation must be valid and not expired.

Upon successful registration, the user account is created and the user is automatically logged in. If the user created a new organization, they are assigned the Owner role for that organization. If the user joined via invitation, they are added to the invited organizations with the assigned role.

### User Login

Users can log in by providing their registered email address and password. Upon successful authentication, if the user belongs to multiple organizations, the user must select which organization to work in. All subsequent actions are scoped to the selected organization.

If the user belongs to only one organization, that organization is automatically selected. Users can switch between organizations without logging out.

If the email address is not registered, the login is rejected. If the password is incorrect, the login is rejected. If the user account is deactivated, the login is rejected.

### Authentication Validation

The system validates user credentials during registration and login. Email addresses must be in a valid format. Passwords must meet minimum security requirements defined by the organization.

When authentication fails, the system returns a generic error message without revealing whether the email exists or the password was incorrect. This prevents enumeration attacks.

Users can request to reset their password if they forget it. The password reset flow sends a secure link to the registered email address. The reset link expires after a defined period. If the email is not registered, no action is taken and no notification is sent to prevent email enumeration.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session and Organization Context

When a user logs in, they select which organization to work in. This selection establishes the organization context for the session.

All actions performed during the session are scoped to the selected organization. Users cannot access data from other organizations while working in a specific organization context.

Users can switch between organizations they belong to without logging out. When switching organizations, the session remains active but the organization context changes to the newly selected organization.

The session persists until the user explicitly logs out or deletes their account. Users can view their current organization context at any time during the session.

### Logout

Users can log out from the system at any time during their session.

When a user logs out, the session is terminated and the user is returned to the login page.

After logging out, the user must log in again to access any organization data.

Logging out does not affect the user's account or data. All employee records, timelogs, timesheets, and other data remain intact.

If a user belongs to multiple organizations, logging out ends the session for all organizations. The user must log in again and select an organization to resume work.

### Account Security

Users can change their password at any time from their account settings.

When changing a password, the user must provide their current password and the new password.

The password change applies to the user's global account and affects access to all organizations the user belongs to.

After a successful password change, the user remains logged in with the current session.

If a user suspects unauthorized access, they should change their password immediately.

Users can delete their account from their account settings. If the user is the sole owner of an organization, they must transfer ownership or delete the organization before deleting their account.

When an account is deleted, the user's employee records in other organizations are marked as deactivated. Historical data such as timelogs and timesheets created by the user are preserved.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

When a user creates an account, they provide an email address and password. The email address must be unique across all user accounts. A global profile is automatically created for the user with the ability to set display name, avatar image, and phone number. The user profile is shared across all organizations the user belongs to. A single user account can belong to multiple organizations. When invited to an organization during sign-up, the user is automatically associated with that organization upon account creation. If a user is invited to multiple organizations before creating an account, all pending invitations are applied when they sign up with the invited email address.

### Account Deletion

Users can delete their own account permanently. If the user is the sole owner of any organization, they must either transfer ownership to another user or delete the organization before deleting their account. When a user deletes their account, all organizations they solely own must be resolved first. Upon account deletion, the user's employee records in other organizations are marked as deactivated. Historical data such as timelogs and timesheets created by the user are preserved. The user loses access to all organizations immediately. Account deletion is irreversible.

### Password Change

Authenticated users can change their password at any time. The user must provide their current password to verify identity before setting a new password. The new password replaces the old password immediately across all sessions. All active sessions remain valid after a password change. The user receives confirmation that the password has been changed successfully. If the current password is incorrect, the password change request is rejected.