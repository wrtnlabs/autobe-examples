**hrm — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents users who have not yet authenticated or selected an organization context. Guests can access the public sign-up page to create a new user account with email and password. They can also access the login page to authenticate with existing credentials. Once authenticated, guests transition to the member actor state and can select an organization to work within. Guests cannot view any organization-specific data, employee records, projects, or time tracking information. All organization data remains completely inaccessible until the user authenticates and selects an organization context. The guest state is temporary and exists only during the registration or login process.

### Guest Actor Definition

The guest actor represents an unauthenticated user who has not yet logged in or selected an organization context. Guests exist in a pre-authentication state and have no access to organization-specific data, employee records, projects, tasks, or time tracking information. All organization data remains completely inaccessible until the user authenticates and selects an organization. The guest state is temporary and exists only during the registration or login process. Once authenticated, the user transitions to the member actor state.

### Authentication Entry Points

Guests can access the public sign-up page to create a new user account with email and password. Guests can also access the public login page to authenticate with existing credentials. These authentication pages are the only entry points available to unauthenticated users. No other system features or pages are accessible without authentication.

### Access Limitations

Guests cannot view any organization-specific data including employee records, projects, tasks, timelogs, timesheets, or reports. Guests cannot access organization settings, department lists, or activity logs. Guests cannot perform any operations within an organization context. All data queries and actions require an authenticated member with a selected organization context.

### State Transition to Member

When a guest successfully registers with email and password, they become an authenticated member and can select an organization to work within. When a guest successfully logs in with email and password, they become an authenticated member and can select an organization to work within. After authentication, the guest state is replaced by the member actor state with organization-scoped access. Users can switch between organizations without logging out, but must always have an organization context selected to access data.

## member Actor

The member actor represents authenticated users who have selected an organization context and belong to one or more organizations. Members have a global user profile with display name, avatar, and contact information shared across all organizations. Within each organization, a member is assigned exactly one role: Owner, Manager, or Employee. Each role grants specific permissions that determine what the member can do within that organization. Members can switch between organizations without logging out, and all actions are scoped to the currently selected organization. Members have employee records in each organization they belong to, containing department, position, employment type, and status. Member permissions are strictly enforced based on their assigned role, and they cannot access data from organizations they do not belong to. The member actor state persists until logout or account deletion.

### Member Identity and Session

A member is an authenticated user who has successfully logged in with email and password. Members maintain an active session that persists until logout or account deletion. Members can change their password while authenticated. The member state begins after successful authentication and ends when the user logs out or deletes their account.

### Organization Context and Multi-Tenancy

Members can belong to multiple organizations simultaneously. Upon login, members select which organization to work in, establishing the organization context. All subsequent actions are scoped to the selected organization. Members can switch between organizations without logging out, changing the organization context for all operations. Members cannot access data from organizations they do not belong to. Data isolation is enforced at the organization level, ensuring members only see data within their selected organization context.

### Global User Profile

Each member has a global user profile that is shared across all organizations they belong to. The profile includes display name, avatar image, and phone number. Members can edit their global profile at any time. Profile changes are reflected across all organization contexts immediately.

### Employee Record per Organization

Within each organization, a member has an employee record that contains organization-specific information. The employee record includes department (optional), position or title (optional), employment type (full-time, part-time, contractor, or intern), and status (active or deactivated). Each member is assigned exactly one role within each organization. Deactivated employees cannot log time or submit timesheets, but their historical data is preserved. Deactivated employees can be reactivated by users with employee management permission.

### Role-Based Access Control

Each organization has three built-in roles that cannot be deleted: Owner, Manager, and Employee. The Owner role grants full access to all features and the ability to manage roles and members. The Manager role grants permission to manage employees and projects, approve timesheets, and view reports. The Employee role grants permission to track time, submit timesheets, and view own data. Organization owners can create custom roles with specific permissions. Each custom role has a name and a set of permissions selected from the available permission set. Organization owners can edit custom roles and delete custom roles only if no employees are assigned to them. Role assignment to employees can be changed by users with employee management permission. Permission enforcement is based on the member's assigned role within the selected organization context.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address and password.

The system validates the email format and ensures it is not already registered.

Upon successful registration, the user can create their first organization during the sign-up process.

The user's global profile is created with a display name that can be edited later.

If a user is invited to an organization via email before having an account, they can complete registration with that email and will automatically be added to the pending organization.

### User Login and Organization Selection

Users can log in to the system using their registered email address and password.

Upon successful authentication, the system presents the list of organizations the user belongs to.

The user must select one organization to establish their working context.

All subsequent actions are scoped to the selected organization until the user switches organizations or logs out.

The user can switch to a different organization without logging out by selecting it from their organization list.

Authentication failures occur when the email or password is incorrect, and the user is prompted to try again.

### Session and Organization Context

The system maintains an authenticated session after successful login.

The session is associated with the selected organization context.

Users remain authenticated until they explicitly log out or their session expires.

The system enforces organization context on all authenticated requests to ensure data isolation.

Users belonging to multiple organizations only see data for their currently selected organization.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, users must select an organization to establish their working context. All subsequent actions within the session are scoped to this selected organization.

Users can switch to a different organization within the same session without logging out. When switching organizations, the user's role and permissions change to reflect their assignment in the newly selected organization.

The session maintains the organization context until the user explicitly switches organizations or logs out. All data access, including employee records, projects, tasks, timelogs, and timesheets, is strictly limited to the selected organization.

Users who belong to multiple organizations can quickly switch between them without re-authentication. Each organization view displays only data belonging to that organization.

### Logout Behavior

Users can log out from the system at any time. Logging out terminates the current session and clears the organization context.

After logout, users must re-authenticate with their email and password to access the system again. Upon re-login, users must select an organization to establish a new session context.

The system does not automatically log out users due to inactivity. Sessions remain active until the user explicitly logs out.

### Account Security

Users can change their password at any time after logging in. Password changes require the current password for verification.

The system uses email and password authentication. No additional authentication mechanisms are required.

When a user deletes their account, they are removed from all organizations. If the user is the sole owner of an organization, they must transfer ownership or delete the organization before account deletion.

Deactivated employee records are preserved for historical data integrity. Deactivated employees cannot log in to access the organization's data.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and password during initial sign-up.

The email address must be unique across the platform. If the email is already registered, the account creation request is rejected.

Upon successful registration, the user must provide an organization name. The user is automatically created as the owner of this new organization.

The user's global profile is initialized with the provided email. Display name, avatar image, and phone number can be added or updated through profile editing (defined in User Profile section).

### Password Management

Users can change their password by providing their current password and a new password.

The current password must be valid for the change to proceed. If the current password is incorrect, the password change request is rejected.

The new password must meet the platform's security requirements (as defined by the system).

Password changes apply globally to the user account and affect access to all organizations the user belongs to.

### Account Deletion

Users can delete their account, but certain conditions must be met:

If the user is the sole owner of an organization, they must either transfer ownership to another employee or delete the organization before their account can be deleted. An account cannot be deleted while the user is the only owner of any organization.

When a user deletes their account:
- The user account is permanently removed from the platform
- The user's employee records in all other organizations are marked as deactivated
- Historical data (timelogs, timesheets, contracts) associated with the user is preserved for organizational records
- The user can no longer log in or access any organization data

Account deletion is irreversible. Users should be warned of this consequence before confirming deletion.