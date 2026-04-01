**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not logged into the platform. Guests can access the registration page to create a new account with email and password. Guests can access the login page to authenticate with existing credentials. Guests have no organization context and cannot select or view any organization. Guests have no role assignment within any organization. Guests possess no permissions to access organization features or data. Guests cannot view employee lists, projects, tasks, or timesheets. Guests cannot track time or submit timesheets. Guests cannot create or join organizations without first authenticating. All guest capabilities are limited to authentication-related operations only. Guests exist outside the organization boundary until they successfully log in.

### Guest Identity

A guest is an unauthenticated user who has not logged into the platform. A guest exists in a pre-authentication state before creating an account or logging in. The guest identity is temporary and is not associated with any user account until authentication is completed. A guest has no persistent identity in the system beyond the current browser session.

### Guest Authentication Access

A guest can access the registration page to create a new account with email and password. A guest can access the login page to authenticate with existing credentials. A guest's capabilities are limited to authentication-related operations only. A guest cannot access any platform features beyond registration and login pages. WHEN a guest completes registration successfully, THEN the guest becomes an authenticated member. WHEN a guest logs in successfully, THEN the guest becomes an authenticated member with organization context selection available.

### Guest Access Boundaries

A guest has no organization context and cannot select or view any organization. A guest has no role assignment within any organization. A guest possesses no permissions to access organization features or data. A guest exists outside the organization boundary until successfully logging in. The guest access boundary restricts all interactions to authentication flows only. IF a guest attempts to access any organization-scoped resource, THEN the request is rejected and the guest is redirected to the login page.

### Guest Capability Restrictions

A guest cannot view employee lists, projects, tasks, or timesheets. A guest cannot track time or submit timesheets. A guest cannot create or join organizations without first authenticating. A guest cannot access any dashboard, reports, or activity logs. IF a guest attempts to perform any action requiring authentication, THEN the system rejects the action and prompts the guest to log in. All guest capabilities are limited to viewing the registration and login pages only.

## member Actor

A member is an authenticated user who belongs to at least one organization. Members select an organization context when logging in to work within that organization's scope. Each member is assigned exactly one role per organization they belong to. Built-in roles include Owner with full access, Manager with employee and project management capabilities, and Employee with time tracking and timesheet rights. Organization owners can create custom roles with specific permission combinations. Members operate under role-based permissions that determine their feature access. Members can only access data within their currently selected organization. Members cannot view data from organizations they do not belong to. Members retain their global profile across all organizations they belong to. Members can switch between organizations without logging out. Member permissions are enforced at the organization level.

### Member Identity and Profile

A member is an authenticated user who belongs to at least one organization.

Members have a global profile that is shared across all organizations they belong to. The global profile includes display name, avatar image, and phone number. Members can edit their global profile at any time. Changes to the global profile are reflected across all organizations the member belongs to.

WHEN a member authenticates with valid credentials, THE system SHALL grant access as a member actor.

WHILE a member is authenticated, THE system SHALL maintain their identity across all organization contexts.

WHERE a member belongs to multiple organizations, THE system SHALL present the same global profile in each organization.

IF a member attempts to access the system without authentication, THEN THE system SHALL deny access and require login.

Members retain their global profile even when switching between organizations. The global profile is independent of any specific organization's settings or data.

### Organization Context Management

WHEN a member logs in, THE system SHALL require the member to select an organization context to work within.

WHILE a member is working in the system, THE system SHALL scope all actions to the selected organization only.

WHERE a member belongs to multiple organizations, THE system SHALL allow the member to switch between organizations without logging out.

THE system SHALL enforce that members can only access data within their currently selected organization.

THE system SHALL prevent members from viewing or accessing data from organizations they do not belong to.

THE system SHALL maintain separate organization contexts for each organization the member belongs to.

WHEN a member switches organizations, THE system SHALL load the member's role and permissions for the newly selected organization.

IF a member attempts to access data from an organization they do not belong to, THEN THE system SHALL reject the request.

All member actions are scoped to the selected organization context. The member cannot perform actions across multiple organizations simultaneously.

### Role-Based Permission System

Each member is assigned exactly one role per organization they belong to. The role determines the member's permissions within that organization.

THE system SHALL provide three built-in roles that cannot be deleted: Owner, Manager, and Employee.

THE Owner role SHALL have full access to all features within the organization, including the ability to manage roles and members.

THE Manager role SHALL have permissions to manage employees, manage projects, approve timesheets, and view reports.

THE Employee role SHALL have permissions to track time, submit timesheets, and view their own data.

WHERE an organization owner creates a custom role, THE system SHALL allow the owner to define a name and select a set of permissions for the role.

THE system SHALL provide the following permissions for role assignment:
- org:manage — edit organization settings
- employee:manage — add, edit, deactivate employees
- employee:view — view employee list and details
- project:manage — create, edit, delete projects and tasks
- project:view — view projects and tasks
- time:manage — edit or delete any employee's timelogs
- time:approve — approve or reject timesheets
- time:view_all — view all employees' timelogs and timesheets
- report:view — view organization reports

WHEN a custom role is created, THE system SHALL allow the organization owner to assign any combination of available permissions to the role.

THE system SHALL enforce that organization owners can delete custom roles only if no employees are assigned to them.

WHERE a member's role is changed, THE system SHALL update the member's permissions immediately within that organization.

THE system SHALL enforce role-driven permissions at the organization level for all member actions.

IF a member attempts to perform an action without the required permission, THEN THE system SHALL reject the request.

Each organization maintains its own independent set of roles and role assignments. Role assignments in one organization do not affect the member's role in other organizations.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can register an account by providing an email address and password.

The email address must be unique across all user accounts. If the email is already registered, the request is rejected.

If the user registers with an email that has a pending invitation to one or more organizations, the user is automatically added to those organizations upon successful registration.

Upon successful registration, the user account is created.

If the registration fails for any reason, the user is notified of the error and no account is created.

### Login

Users can log in by providing their registered email address and password.

The system validates the provided credentials against stored user accounts. If the credentials do not match any account, the login attempt is rejected.

Upon successful login, if the user belongs to multiple organizations, the user must select which organization to work in. All subsequent actions are scoped to the selected organization.

If the user belongs to only one organization, that organization is automatically selected as the context.

If the user does not belong to any organization, the user is prompted to create a new organization.

Users can switch between organizations they belong to without logging out. When switching organizations, the context changes and all data views update to reflect the newly selected organization.

If login fails due to invalid credentials, the user is notified and remains on the login page.

### Authentication Validation

The system authenticates users by verifying the provided email and password combination.

WHEN a user attempts to log in, THE system SHALL validate the email format and check if the email exists in the system.

WHEN the email exists, THE system SHALL verify the password matches the stored credentials.

IF the email does not exist, THEN THE system SHALL reject the authentication attempt without revealing whether the email is registered.

IF the password is incorrect, THEN THE system SHALL reject the authentication attempt.

IF the user account is deactivated, THEN THE system SHALL reject the authentication attempt.

All authentication attempts are processed securely. The system does not expose technical details about authentication failures to prevent information disclosure.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Behavior

After successful login, the user maintains an authenticated session.
The session includes the selected organization context.
Users can switch between organizations without ending their session.
All actions during the session are scoped to the currently selected organization.
The session persists until the user explicitly logs out.
When a user belongs to multiple organizations, they select which organization to work in at login.
The organization selection can be changed at any time during the session without re-authentication.

### Logout

Users can log out to end their authenticated session.
After logout, the user must log in again to access organization features.
Logout clears the organization context.
Logging out does not delete the user account.
Users can log in again with their existing credentials after logout.

### Account Security

User accounts use email and password for authentication.
Users can change their password.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users create an account by providing an email address and password during registration.

The email address must be unique across the platform. If the email already exists, the registration is rejected.

Upon successful account creation, the user can create or join organizations. A single user account can belong to multiple organizations simultaneously.

The account is created with a global profile that includes display name, avatar image, and phone number. This profile is shared across all organizations the user belongs to.

If a user accepts an invitation to an organization before creating an account, the account creation automatically associates the user with the pending organizations.

### Account Deletion

Users can delete their account permanently.

If the user is the sole owner of any organization, the account deletion is rejected. The user must first either transfer ownership to another member or delete the organization entirely.

When an account is deleted:
- The user's employee records in all organizations are marked as deactivated
- Historical data (timelogs, timesheets, activity logs) associated with the user is preserved
- The user loses access to all organizations immediately

Organization owners can delete their organization only if all pending timesheets are resolved (approved or rejected) and there are no active employee contracts. When an organization is deleted, all employees, projects, tasks, timelogs, and timesheets within that organization are permanently deleted, but the owner's account remains.

### Password Change

Authenticated users can change their password at any time.

The user must provide their current password and a new password to complete the change. If the current password is incorrect, the request is rejected.

After a successful password change, all existing sessions remain valid. The new password applies to all future login attempts.

The password is used for authentication across all organizations the user belongs to, as the account is global.