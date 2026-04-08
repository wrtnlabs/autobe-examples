**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an individual who has not yet created an account in the system. Guests can access the public sign-up page where they provide their email and password to register. Before registration, guests have no access to any organizational features, data, or resources. A guest cannot view employees, projects, tasks, timesheets, or any organization-specific information. Once a guest completes the sign-up process, they transition to becoming a member and can begin building their organization.

### Guest Access

A guest is an individual who has not yet created an account in the system.

Guests have no access to any organizational features, data, or resources.
Guests cannot view employees, projects, tasks, timesheets, or any organization-specific information.
Guests cannot access any private organizational dashboards or reports.
Guests cannot view activity logs or system history.
Guests are not visible in employee lists or organizational directories.

All organizational data is strictly isolated and inaccessible to guests.

### Sign-Up Page Access

Guests can access the public sign-up page.
The sign-up page is available to all visitors without authentication.
Guests can view the sign-up page to begin the registration process.
Guests cannot view the sign-up page from within any organization context (they have no organization context).

The sign-up page allows guests to enter their email address and password.
Guests must provide both email and password to complete registration.
Both email and password fields are required on the sign-up form.

### Pre-Registration State

Guests exist in a pre-registration state with no account credentials.
Guests have no user profile in the system.
Guests have no display name, avatar, or phone number stored.
Guests cannot be identified or tracked across sessions.
Guests have no organization ownership or membership.

Guests cannot initiate password recovery (no account exists to recover).
Guests cannot request account deletion (no account exists to delete).
Guests have no activity log entries (no actions to record).

### Organization Data Access Restrictions

Guests have zero access to organizational data.
Guests cannot search for or discover organizations.
Guests cannot view organization names, descriptions, or logos.
Guests cannot view any organization settings or configurations.
Guests cannot view organization-specific data such as currencies, timezones, or fiscal start months.

Guests cannot attempt to access organization data through any means.
Any request from a guest for organizational data is rejected.
Organization data remains completely hidden from guests.

### Guest to Member Transition

Guests transition to members upon successful registration.
Registration creates a new user account with the provided email and password.
Upon registration completion, the user immediately becomes a member.
Guests cannot transition to members through any method other than registration.

After registration, the new member can create their first organization.
During the initial sign-up, the user creates an organization with name, description, logo, currency, timezone, and fiscal start month.
The organization owner role is automatically assigned to the user.
The user now belongs to their newly created organization as the owner.

### Email and Password Registration

Users register by providing an email address and password.
The email address becomes the user's primary identifier for login.
The email address is used across all organizations the user belongs to.
The password is stored securely and used for authentication.
Users can change their password at any time after registration.

Registration validates that the email is properly formatted.
Registration validates that the password meets security requirements.
Registration prevents duplicate email addresses (same email cannot register twice).
Upon successful registration, the user gains access as a member.

### Public Access Restrictions

The sign-up page is the only public-facing feature available to guests.
No other pages or features are accessible without registration.
Guests are redirected to the sign-up page if they attempt to access protected resources.
The system requires authentication before displaying any organizational content.

Guests cannot access member-only features such as:
  - Dashboard
  - Employee management
  - Project management
  - Time tracking
  - Reports
  - Activity logs
  - Account settings

The system enforces public access restrictions at all levels.

### Account Creation During Sign-Up

During sign-up, the user creates their first organization.
The organization creation is part of the registration process.
The user becomes the owner of this newly created organization.
The organization has name, description, logo, currency, timezone, and fiscal start month.

The organization owner role is automatically assigned during sign-up.
The organization owner role has full access to all features.
The organization owner role can manage roles and members.

After organization creation, the user can access the system as a member.
The user is now logged in with their newly created account.

## member Actor

A member is a registered user who has created an account and belongs to at least one organization. Members maintain a global profile containing their display name, avatar image, and phone number that is shared across all organizations. Each member can belong to multiple organizations simultaneously and selects which organization context to work in during login. Within each organization, a member is assigned a role such as Owner, Manager, or Employee, or a custom role created by the organization owner. The member's permissions and access boundaries are determined by the role assigned within that specific organization. Members can switch between organizations without logging out, and all actions remain scoped to the currently selected organization context. Members cannot access or view any data from organizations where they are not members.

### Registered User Identity

A registered user is a member who has created an account using their email address and password. The user maintains a single global identity across all organizations they belong to. The account is created during the sign-up process and cannot be modified without changing the password through the account security features.

A registered user can log in by providing their email address and password. The login process validates the credentials and establishes a secure session that persists across multiple requests until explicitly logged out.

### Global Profile

Each member maintains a global profile containing their display name, avatar image, and phone number. This profile is shared across all organizations the member belongs to and is managed in a single location. Any updates to the global profile immediately reflect in all organizations.

Members can edit their display name, update their avatar image, or change their phone number at any time. These changes apply globally and are visible across all organizations where the member is an active participant.

### Multiple Organization Membership

A single member can belong to multiple organizations simultaneously. Each organization maintains independent data, including employees, projects, tasks, timesheets, and reports. The member's membership in each organization is established through invitation or by creating an organization during sign-up.

Members can view and switch between their organizations at any time. However, they can only access data from the organization they have currently selected as their working context. Data from organizations where they are not a member remains completely inaccessible.

### Organization Context Selection

When a member logs into the system, they must select which organization to work in. This selection establishes the organizational context for all subsequent actions. All operations performed after login are scoped to the selected organization, and the system enforces strict boundaries to prevent accidental access to other organizations.

The selected organization context is maintained throughout the session until the member explicitly switches to a different organization or logs out.

### Role Assignment Per Organization

Within each organization, a member is assigned exactly one role that determines their permissions and access boundaries. This role can be a built-in role (Owner, Manager, or Employee) or a custom role created by the organization owner. The role assignment is specific to each organization and does not transfer between organizations.

Members may have different roles in different organizations. For example, a user could be an Owner in one organization and an Employee in another. Each role assignment grants the permissions defined for that role within that specific organization.

### Role-Based Permissions

A member's ability to perform actions is determined entirely by the role assigned within their current organization context. Each role has a defined set of permissions that control access to features, data, and operations within the organization.

The available permissions include managing organization settings, adding and editing employees, viewing employee details, creating and managing projects and tasks, editing and approving timesheets, viewing all employee data, and accessing reports. Members can only perform actions for which their assigned role has explicit permission.

### Built-In Roles

Three built-in roles are provided by the system and cannot be deleted:

**Owner**: Has full access to all features within the organization, including managing roles and members, editing organization settings, viewing all data, and deleting the organization under specific conditions.

**Manager**: Can manage employees, approve timesheets, create and manage projects, view reports, and perform all employee management operations. Managers cannot manage organization settings or role assignments.

**Employee**: Can track time, submit timesheets, view their own data, and access tasks assigned to them in projects they are members of. Employees cannot manage other employees, projects, or timesheets.

Organization owners can create additional custom roles with granular permissions beyond the built-in roles.

### Custom Role Assignment

Organization owners can create custom roles with a unique name and a specific set of permissions. Each custom role is created by selecting from the available permission set, allowing organizations to define roles tailored to their specific operational needs.

Organization owners can edit custom roles to modify their name or permissions. Custom roles can only be deleted if no employees are currently assigned to them. Once a custom role is deleted, any employees assigned to that role must be reassigned to a different role.

### Organization Switching Without Logout

Members can switch between organizations without logging out. When switching organizations, the system preserves the member's session and securely changes the organizational context. All actions after the switch are automatically scoped to the new organization.

The switch is instant and does not require re-authentication. However, the member's permissions and available features immediately change to reflect the role assigned in the newly selected organization.

### Scoped Action Context

All actions performed by a member are strictly scoped to the currently selected organization. The system enforces that operations such as viewing employees, managing projects, or approving timesheets only affect data within the current organization context.

Any attempt to access or modify data outside the current organization is blocked. The system ensures that employees from one organization can never see or interact with data from another organization, even if they are members of multiple organizations simultaneously.

### Cross-Organization Access Boundaries

Each organization maintains complete data isolation from all other organizations. Employees in one organization have no visibility into employees, projects, tasks, timesheets, or reports from other organizations, even if they belong to multiple organizations.

The system enforces these boundaries at every level, ensuring that data queried or displayed is always filtered by the current organization context. Members cannot use any feature to bypass these boundaries or access data outside their current organizational scope.

### Member to Non-Member Data Isolation

Users who have not yet registered or joined an organization have no access to any organizational data. Guests can only access the sign-up page and cannot view any organization-specific content, employee lists, projects, or reports.

Members who are not assigned to a particular organization cannot see any data belonging to that organization, even if they know the organization's existence. The system requires explicit membership in an organization before any data from that organization becomes accessible.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can register by providing an email address and password. The system validates that the email address is properly formatted and that the password meets security requirements. When a user attempts to register with an email that already has an account, the request is rejected.

Users can be invited to an organization by email. If the invited email already has an account, the user is automatically added to the organization with a pending status until their role is assigned. If the invited email has no account, a pending invitation is created, and when the user registers with that email, they are automatically added to the pending organizations.

If the registration request is missing required fields or if the email is already in use, the request is rejected with an appropriate error message.

### Organization Creation During Registration

During initial registration, users must create an organization. The organization requires a name and a currency selection (e.g., USD, EUR, KRW). Users may optionally provide a description, upload a logo image, select a timezone, and specify a fiscal start month.

Organization owners have full access to edit organization settings. If the organization name is missing, the request is rejected.

When the registration is complete, the user becomes the owner of the newly created organization.

### User Login

Users can log in to the system using their email address and password. The system validates the credentials and grants access to the account.

If the email address or password is incorrect, the request is rejected with an appropriate error message.

After successful authentication, users can access the platform and view their account information.

### Organization Context Selection

When users log in, they must select which organization to work in. Users can belong to multiple organizations simultaneously.

All subsequent actions are scoped to the selected organization. Users cannot access data from other organizations unless they switch to that organization context.

Users can switch between organizations without logging out. When switching organizations, all user interface elements and data views update to reflect the new organization context.

If a user belongs to only one organization, that organization is selected by default.

### Password Management

Users can change their password at any time from their account settings. The current password must be provided to verify the user's identity before setting a new password.

The new password must meet security requirements. If the current password is incorrect or the new password does not meet requirements, the request is rejected.

After a successful password change, the user must log in again with the new password. All active sessions are invalidated, requiring re-authentication.

### Account Deletion

Users can delete their account. If the user is the sole owner of an organization, they must transfer ownership to another user or delete the organization before the account can be deleted.

When a user deletes their account:
- The user's account is permanently deleted from the system
- The user's employee records in other organizations are marked as deactivated
- All organizational data (including the organization itself if no other owners exist) remains in the system

If the user attempts to delete their account without first transferring ownership or deleting the organization, the request is rejected with instructions to complete these steps first.

### Organization Deletion

Organization owners can delete their organization using hard delete. Deletion is only allowed when:
- All pending timesheets are resolved (approved or rejected)
- There are no active employee contracts

When an organization is hard deleted:
- All employees, projects, tasks, timelogs, and timesheets are permanently deleted
- The owner's account remains but is no longer associated with any organization

If the organization has unresolved pending timesheets or active employee contracts, the deletion request is rejected with a list of items that must be resolved first.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Creation and Persistence

When a user logs in, a session is created that maintains the user's authenticated state.

The session persists when the user switches between organizations. Users can switch organizations without logging out or re-entering credentials. Each organization switch updates the active context while maintaining the same session.

All actions during a session are scoped to the currently selected organization. The user's authentication status remains valid across all organizations they belong to, but data access is always restricted to the active organization context.

### Organization Context Selection

During login, users select which organization they want to work in. This selection becomes the active context for all subsequent actions.

If a user belongs to multiple organizations, they must select one as the active organization. The selected organization determines which employees, projects, timelogs, and timesheets the user can access.

Users can switch their active organization at any time without logging out. Each switch updates the active context while maintaining the same session.

When no organization is selected, the user cannot access organization-specific data or perform organization operations.

### Logout Behavior

When users log out, their session is terminated and they are returned to the login page.

Logging out removes all active organization contexts. Users must log in again to regain access to any organization data.

Logout does not delete any data, change user profiles, or affect organizational memberships. All employee records, projects, timelogs, and timesheets remain intact.

Users must provide their email and password to log in again.

### Multiple Organization Membership

A single user account can belong to multiple organizations simultaneously. Users can be employees in one organization and project members in another.

Users view organization-specific data based on their currently selected organization context. They cannot see data from organizations where they have not selected the active context.

When a user is invited to a new organization, they can accept the invitation while maintaining their current session. After accepting, they can switch to the new organization without re-authenticating.

### Session Data Isolation

All data accessed during a session is strictly isolated per organization. Users cannot access another organization's data even if they are a member of that organization.

Data isolation is enforced by the organization context. The system only processes requests within the currently selected organization's boundaries.

Users who belong to multiple organizations must explicitly switch contexts before accessing data from a different organization.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and password.

During account creation, the system validates that the email address is not already registered. If the email is already in use, the registration is rejected.

After successful registration, users can log in with their email and password.

Users can join multiple organizations by accepting invitations or being added by organization members.

### Account Deletion

Users can request deletion of their account.

If the user is the sole owner of any organization, the account deletion request is rejected until one of the following conditions is met:
- The user transfers ownership of the organization to another employee, or
- The user deletes the organization (which is permitted only if all pending timesheets are resolved and there are no active employee contracts).

Upon successful account deletion:
- The user's account is hard deleted from the system
- The user's employee records in other organizations where they are not the sole owner are marked as deactivated
- The user's access to all organizations is terminated

Deactivated employee records preserve historical data including timelogs, timesheets, and contracts.

### Password Change

Authenticated users can change their password at any time.

To change a password, users must provide their current password and the new password.

The system validates that the new password is different from the current password. If the passwords match, the request is rejected.

After a successful password change, the user must log in again with the new password. Any active sessions are invalidated and require re-authentication.