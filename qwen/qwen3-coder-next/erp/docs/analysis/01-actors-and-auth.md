**hrmTracker — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents a user who has initiated the system but has not yet logged in or established an organization context. Guests cannot perform any business operations and have no assigned roles or permissions within any organization. They are restricted to public-facing actions such as sign-up and login. Guests cannot view, modify, or access any organization data—including employee records, projects, timelogs, or timesheets—because they lack an active organization context. The system treats all guests identically until authentication succeeds and an organization is selected. Guests must create or join an organization to become members and gain role-based access. A guest's session remains unauthenticated until they provide valid credentials and select an organization.

### guest actor identity

The guest actor represents a user who has not yet logged into the system. Guests are not associated with any organization and do not have an assigned role. The system treats all guests identically until they successfully authenticate and select an organization context. A guest remains a guest until they sign up with a new account or log in with an existing account.

### pre-authentication state

Before authentication, users exist only as guests. They have not provided credentials and have not selected an organization. The system cannot associate any organizational data with a guest because no authentication token or session context is established. Guests are considered unverified users who have not yet proven their identity to the system.

### no role or permissions

Guests do not have any roles assigned. They do not inherit any permissions from built-in or custom roles. The system does not evaluate permissions for guests because all permission checks are skipped for unauthenticated users. Any request requiring a role or permission is automatically rejected for guests.

### no organization context

Guests have no organization context. They cannot access, view, or modify any data belonging to an organization—including employee records, projects, timelogs, or timesheets—because no organization has been selected. All operations are blocked until the guest logs in and selects an organization to work within.

### public-only access

Guests can only perform actions available to the public, specifically sign-up and login. They may access public endpoints such as registration forms and authentication flows. No other system features are accessible to guests, including dashboards, reports, or any organizational data. The system enforces strict access boundaries that block all non-public requests from guests.

### sign-up and login access

Guests can initiate account creation by registering with email and password. Guests can also log in with existing credentials. After successful authentication, guests become members and gain role-based access based on their assigned organization role. The sign-up and login processes are the only operations available to guests before becoming authenticated members.

### blocked from data operations

Guests are completely blocked from performing any data operations. They cannot view, create, edit, or delete employee records, projects, tasks, timelogs, timesheets, departments, contracts, or activity logs. Any attempt to access protected resources results in immediate rejection without further processing.

### session before login

Before login, the session is unauthenticated and empty. No session token is issued to guests, and no user identity is persisted. The system maintains no state between guest requests except for temporary session identifiers used solely during the login flow. No organizational or personal data is loaded or retained for guests outside of login-related operations.

### unauthenticated user status

Guests are unauthenticated users with no verified identity. The system explicitly treats all guest requests as untrusted. All security checks prioritize blocking guest access to protected resources before evaluating any other conditions. The unauthenticated status persists until the guest successfully authenticates and selects an organization.

## member Actor

The member actor represents a user who has successfully authenticated and selected an organization context. Each member is associated with exactly one role per organization—either built-in (Owner, Manager, Employee) or custom—and inherits all permissions assigned to that role. Members can perform only the operations permitted by their role within the selected organization. Their access is strictly isolated to the chosen organization’s data—no cross-organization visibility exists. A member may belong to multiple organizations but operates as one distinct member actor per active organization context. Role assignments are set by organization owners or managers and can be updated over time, altering the member’s access boundaries accordingly. Members retain their global profile across organizations but lose access upon account deactivation or removal from the organization.

### Authenticated User with Role

A member is an authenticated user who has successfully logged in and selected an organization context. Once authenticated, each member is associated with exactly one role per organization. The role determines what actions the member can perform within that organization. A user must select an organization before performing any action; until then, they operate in a pre-authentication state (handled by the guest actor).

### Built-in or Custom Role Membership

Each member is assigned exactly one role within an organization. There are three built-in roles—Owner, Manager, and Employee—that cannot be deleted or renamed. Organizations may also create custom roles, each with a unique name and a defined set of permissions. A member cannot hold multiple roles in the same organization; role changes replace the current assignment.

### Role-Based Permission Inheritance

Permissions are assigned only to roles, not directly to members. A member inherits all permissions from their assigned role. For example, a member with the Manager role inherits permissions such as project:manage, time:approve, and report:view. Custom roles inherit the specific permissions their creator assigns. No member can exceed the permissions of their role.

### Single Organization Context per Session

At any moment, a member operates within exactly one organization context. All actions—including viewing, editing, or creating data—are scoped to this selected organization. Even if a member belongs to multiple organizations, the system enforces that only data from the current organization is accessible or modifiable.

### Organization Data Isolation

Data from one organization is strictly isolated from another. A member cannot view, access, or modify data belonging to an organization outside their current context. This isolation applies to employees, projects, timelogs, timesheets, departments, and all other entities. Cross-organization data leakage is impossible by design.

### Global Profile Shared Across Organizations

A member’s global profile—including display name, avatar image, and phone number—is shared across all organizations they belong to. This profile is independent of the organization context and remains consistent regardless of which organization the member is currently working in.

### Role Assignment and Updates

Only organization owners and users with employee:manage permission can assign or change roles for employees. Role changes take effect immediately and replace the previous role assignment. Role assignments are recorded in the activity log, including who performed the change, when, and the prior and new roles.

### Deactivation and Removal Effects

If a member’s employee record is deactivated, they lose access to the organization immediately: they cannot log in to that organization, view data, or submit timesheets. Their global account remains active, but their organization-specific membership is suspended. If removed entirely from the organization (by the owner), all organization-specific data ties are severed, including timesheet history.

### Multi-Organization Membership Support

A single user account may belong to multiple organizations as a member. Each membership is independent, with its own role, department, and permissions. When switching organization contexts, the member’s identity and global profile remain, but their permissions and visible data update to reflect the newly selected organization.

### Owner, Manager, Employee Roles

The three built-in roles define baseline access: Owners have full access to all features and can manage roles, members, and organization settings. Managers can manage employees and projects, approve timesheets, and view reports. Employees can track time, submit timesheets, and view their own data only. No custom role can grant more or fewer permissions than the built-in roles without explicit definition.

### Custom Role Access Boundaries

Custom roles inherit access solely from the permissions explicitly assigned to them by an organization owner. They cannot automatically include permissions from built-in roles. A custom role with no permissions grants access to nothing. Custom roles can be deleted only if no employees are currently assigned to them.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can register for an account using an email address and a password.
The email must be unique across the system.
If the email is already in use, registration is rejected.
The password must meet minimum security requirements (e.g., length, character types).
During registration, users also provide their display name and can optionally upload an avatar image and provide a phone number.
After successful registration, the user is not yet associated with any organization.
Users can create an organization immediately after registration or later from their dashboard.

### Login and Organization Context

Users log in using their registered email and password.
After successful authentication, users must select an organization context to work in.
Users can select from all organizations they belong to.
The selected organization determines which data is visible and modifiable for the session.
All subsequent operations are scoped to the selected organization.
Users can switch organization context at any time without logging out.
If a user has no organizations, they cannot log in until they create or join an organization.

### Authentication Security

Passwords are stored encrypted and never exposed to the system.
Failed login attempts do not reveal whether the email exists in the system.
Users can change their password at any time from their profile settings.
Password changes require verification of the current password.
Users can request a password reset via email if they forget their password.
Password reset links expire after a set period and become invalid after use.

### Account Status During Login

If a user's account is deactivated (e.g., by organization ownership transfer or deletion requirement), they cannot log in.
If a user belongs to an organization but their employee record in that organization is deactivated, they can still log in but cannot perform employee-specific actions in that organization.
Deactivation status is checked at login and when switching organization context.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Behavior

Each authenticated user maintains a session scoped to one organization at a time.

When a user logs in, they must select an organization to work in. All subsequent actions (time tracking, project access, reports, etc.) are automatically scoped to the selected organization.

Users can switch between organizations they belong to without logging out. Switching organizations updates only the session’s organization context — no re-authentication is required.

The session persists across page refreshes and browser closures until explicitly logged out or terminated by system policy (e.g., inactivity, account deletion).

Employees assigned to multiple organizations can freely switch between those organizations using the organization context selector. Each switch updates only the visible data scope and permission context — no additional authentication step is needed.

### Logout Behavior

Users can log out from their current organization context.

Logging out clears the session’s organization context but does not invalidate the core user authentication (email/password remains valid).

After logout:
- The user is no longer associated with any organization
- All protected data (timelogs, projects, timesheets, etc.) becomes inaccessible
- The user must log in again and select an organization to resume work

If a user switches to a different organization while logged in, then logs out, the logout applies only to the currently selected organization context — returning to the login screen with no organization selected.

Logging out does not deactivate the user’s account or employee records; it only ends the current session.

### Session Security

Sessions are protected against unauthorized access and session hijacking through standard security practices.

Each session is tied to the authenticated user and cannot be used by another person.

When an employee is deactivated in an organization, any active session scoped to that organization is immediately invalidated — the user must log in again, and if reactivated later, must reselect the organization to resume access.

When an organization is deleted, all sessions scoped to that organization are permanently invalidated — users must select a different organization or re-register if eligible.

When a user changes their password, all active sessions for that user are invalidated — the user must log in again on all devices.

No session timeout duration is defined, as the user did not specify inactivity-based session expiration requirements.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Anyone can create a user account by providing a valid email address and a password. The email must be unique across the system. After submitting the registration request, the user is immediately authenticated and can select an organization to work in or create a new organization. During sign-up, if the user provides an email that was previously used for an organization invitation (pending invitation), they are automatically added to that organization. The account is created globally but has no organization context until the user selects one or creates an organization.

### Account Deletion

Users can delete their account only if they meet specific conditions. If the user is the sole owner of an organization, they must first transfer ownership or delete the organization. Deleting an organization follows its own rules (all timesheets resolved, no active employee contracts). When an account is deleted: if the user belongs to multiple organizations, their employee records in those organizations are marked as "deactivated"; if they were the sole owner of an organization, the organization is not automatically deleted — the user must delete it separately before account deletion; if they own an organization with other owners, they must transfer ownership or remove themselves before deletion. The user’s global profile, email, and password are permanently removed. Historical data (timelogs, timesheets, activities) remains in the organizations they belonged to.

### Password Change

Authenticated users can change their password at any time. To change the password, users must provide their current password for verification. If the current password is incorrect, the request is rejected. The new password must meet basic complexity requirements (length and character variety). Once the password is successfully changed, the change takes effect immediately for all future sessions. The old password becomes invalid, and all active sessions remain valid (no forced logout required). Users can change their password from any organization context — the change affects their global account credentials, not organization-specific settings.