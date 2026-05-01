**erpHrm — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any person who visits the platform without being authenticated. Guests have not signed in and therefore possess no identity within the system. The guest actor can initiate the sign-up process by providing an email address and password to create a user account. The guest actor can also initiate the login process by submitting valid credentials. Upon successful authentication, the guest transitions into the member actor. A guest cannot access any organization data, view employee lists, browse projects, track time, or perform any action that requires an authenticated session. The guest has no assigned role and holds no permissions within any organization. All organization-scoped functionality is entirely invisible to the guest actor. Guests are limited to the public authentication surface of the platform only. If a guest attempts to access a protected resource, the system denies the request and directs them to authenticate. A guest who receives an email invitation to join an organization must first create an account (or log in to an existing one) before gaining any access to that organization.

### Guest Identity

A guest is any person who visits the platform without having signed in. The guest has not provided any credentials and therefore possesses no identity recognized by the system. The system does not associate the guest with any user account, organization membership, or role. There is no persistent record for a guest — the guest session exists only transiently and carries no privileges. The guest cannot be looked up, referenced, or targeted by any platform operation that depends on knowing who the user is. From the system's perspective, a guest is an anonymous visitor with no distinguishing characteristics beyond the session itself.

### Public Authentication Surface

The guest may interact only with the public authentication surface of the platform. This surface consists of two capabilities:

**Sign-Up**: A guest may initiate the account creation process by providing an email address and a password. The guest supplies these credentials directly, and the system processes them to create a new user account. If the email address is already associated with an existing account, the system informs the guest that the email is already registered and directs them to log in instead. If the email matches a pending invitation to an organization, the guest is automatically added to that organization upon successful account creation.

**Login**: A guest may initiate the login process by providing a registered email address and the corresponding password. The system validates the credentials against stored user accounts. If the credentials are valid, the guest is authenticated and transitions to the member actor. If the credentials are invalid, the system rejects the login attempt and the guest remains a guest.

A guest cannot reach any interface, page, or functionality beyond sign-up and login. Any attempt to navigate elsewhere results in the system directing the guest to authenticate.

### Guest to Member Transition

The guest transitions to a member through two possible paths:

**Login with existing account**: When a guest provides a registered email and matching password, the system authenticates the guest and creates an authenticated session. At this moment, the guest ceases to be a guest and becomes a member.

**Sign-up with new account**: When a guest completes the sign-up process by providing an email and password, the system creates a new user account and automatically authenticates the guest. The guest immediately becomes a member with an active session. No separate login step is required after sign-up.

In both cases, the new member now possesses a system-recognized identity and may proceed to select an organization context if they belong to multiple organizations, or enter directly if they belong to only one.

### Access Boundaries

The guest actor operates under a complete access restriction to all organization-scoped functionality:

- **No access to organization data**: A guest cannot view, search, or interact with any data belonging to any organization. This includes employees, projects, tasks, timelogs, timesheets, contracts, departments, roles, reports, activity logs, and dashboards. None of these resources are reachable by a guest.

- **No assigned role**: A guest has no role in any organization. Roles exist only within the context of an employee record, and a guest has no employee record. The built-in roles — Owner, Manager, Employee — as well as any custom roles are entirely inapplicable to a guest.

- **No permissions in any organization**: Since the guest has no role, the guest holds zero permissions. Permissions such as managing employees, viewing projects, approving timesheets, or accessing reports are unavailable. The guest cannot perform any action that requires a permission check.

- **Protected resource access denied**: If a guest attempts to access any resource that requires authentication — whether by direct navigation, bookmark, or any other means — the system denies the request. The guest is not granted a partial view or any glimpse of protected data. The system directs the guest to the login surface.

### Invitation Flow for Guests

A person who receives an email invitation to join an organization may arrive at the platform as a guest. The invitation alone does not grant the guest any access or elevated privileges. The guest must take one of two paths to gain access to the inviting organization:

- **If the guest already has an account** with the invited email address: The guest logs in with their existing credentials. Upon authentication, the system recognizes the pending invitation and adds the user to the inviting organization. The user becomes a member of that organization with the role specified in the invitation.

- **If the guest does not have an account**: The guest must complete the sign-up process using the invited email address. When the account is created, the system matches the email to the pending invitation, adds the new user to the inviting organization, and automatically authenticates the guest. The guest immediately becomes a member of the organization without needing a separate login step.

A guest who receives an invitation cannot bypass account creation or login. The invitation does not serve as a substitute for authentication. Until the guest creates an account (if needed) and authenticates, the inviting organization and its data remain entirely inaccessible.

## member Actor

A member is any authenticated user who has successfully signed in to the platform. A member may belong to a single organization or multiple organizations simultaneously. Upon login, a member must select which organization to work within, establishing an organization context that scopes all subsequent actions. A member's permissions are determined entirely by the role assigned to them within the currently selected organization. Each organization has its own independent set of roles with three built-in types: Owner, Manager, and Employee. The Owner role grants full access to all features including managing roles and members. The Manager role allows managing employees, projects, approving timesheets, and viewing reports. The Employee role permits time tracking, timesheet submission, and viewing personal data. Organization owners can define custom roles with granular permission sets drawn from available permissions. A member holds exactly one role per organization, and that role may differ across organizations. A member can switch their active organization context at any time without logging out. When switching organizations, the member's permissions, accessible data, and available features change to reflect the role assigned in the newly selected organization. A member's global profile is shared across all organizations they belong to, but their permissions and data access are strictly bounded by the current organization context.

### Member Identity and Profile

A member is any user who has successfully authenticated through an explicit login with valid credentials. Registration or signup alone does not automatically grant member access — a user must perform a separate, explicit login action after completing registration to become a member. Upon successful login, the member gains access to the platform and assumes a system identity that persists for the duration of their session.

Every member has a global profile containing a display name, avatar image, and phone number. This profile is established once and shared across all organizations to which the member belongs. When the member updates their profile — such as changing their display name or phone number — the change is reflected universally in every organization context. The profile belongs to the member, not to any single organization.

A member can change their password at any time while authenticated. Changing the password does not affect the member's profile, role assignments, or organization memberships.

### Multi-Organization Membership and Context Switching

A member may belong to one organization or to multiple organizations simultaneously. Membership in each organization is independent: the member holds a distinct employee record, role assignment, and set of permissions within each organization they belong to.

**Organization Selection on Login**

When a member logs in, they are presented with a list of all organizations they belong to. The member must select one organization before proceeding. This selection establishes the organization context that scopes every subsequent action during the session. Until an organization is selected, the member cannot perform any organization-scoped operations.

**Switching Organizations**

A member can switch their active organization context at any time without logging out. Switching organizations immediately changes:

- The member's effective permissions, which now reflect the role assigned in the newly selected organization
- The data accessible to the member, which is now limited to the newly selected organization
- The features available to the member, which are determined by the role in the new context

The member's session remains intact throughout the switch. The global profile does not change.

**Data Access Boundary**

All data access is strictly bounded by the current organization context. A member working within Organization A cannot see, access, or interact with any data belonging to Organization B, even if they are also a member of Organization B. The organization context acts as an absolute data isolation boundary for all operations.

### Built-in Roles

Each organization has three built-in roles that are present from the moment the organization is created. These roles cannot be deleted under any circumstances. They serve as the foundation for the organization's permission structure.

**Owner**

The Owner role grants full, unrestricted access to all features within the organization. An Owner can:

- Manage organization settings, including editing and deleting the organization
- Manage employees: invite, edit, deactivate, and reactivate employees
- Manage roles: create custom roles, edit custom roles, delete custom roles, and assign roles to employees
- Manage projects and tasks: create, edit, archive, complete, and delete projects; create and edit tasks
- Manage all timelogs and timesheets for any employee
- Approve or reject submitted timesheets
- View all reports
- View the full activity log

The member who creates the organization is automatically assigned the Owner role. An organization may have multiple Owners.

**Manager**

The Manager role grants broad operational access focused on team management, project oversight, and timesheet approval. A Manager can:

- Manage employees: invite, edit, deactivate, and reactivate employees
- View the employee list and employee details
- Manage projects and tasks: create, edit, archive, and complete projects; create and edit tasks
- View all projects and tasks
- Approve or reject submitted timesheets
- View all employees' timelogs and timesheets
- View organization reports

A Manager cannot edit organization settings, manage roles, or delete the organization.

**Employee**

The Employee role grants basic access for personal time tracking and data viewing. An Employee can:

- Track time by creating timelogs and using the live timer
- Submit timesheets for approval
- View their own timelogs, timesheets, and contracts
- View projects and tasks they are assigned to
- View the list of departments
- View their personal dashboard

An Employee cannot view other employees' timelogs or timesheets, manage projects, approve timesheets, or access organization reports.

### Custom Roles and Permissions

Organization Owners can create custom roles to tailor the permission structure beyond the three built-in roles. Each custom role is defined by:

- A name that identifies the role within the organization
- A set of permissions drawn from the available permission list

**Available Permissions**

The following permissions are available for assignment to custom roles:

| Permission | What It Allows |
|---|---|
| `org:manage` | Edit organization settings |
| `employee:manage` | Add, edit, deactivate, and reactivate employees |
| `employee:view` | View the employee list and employee details |
| `project:manage` | Create, edit, delete, archive, and complete projects; create and edit tasks |
| `project:view` | View projects and tasks |
| `time:manage` | Edit or delete any employee's timelogs |
| `time:approve` | Approve or reject submitted timesheets |
| `time:view_all` | View all employees' timelogs and timesheets |
| `report:view` | View organization reports |

A custom role may include any combination of these permissions. There is no restriction on which permissions can be combined.

**Managing Custom Roles**

Owners can edit a custom role at any time, including changing its name and modifying its permission set. Changes to a custom role take effect immediately for all employees assigned to that role.

Owners can delete a custom role only if no employees are currently assigned to it. If any employee holds the role, the deletion is rejected. The Owner must reassign those employees to a different role before the custom role can be deleted. Built-in roles can never be deleted, regardless of how many employees are assigned to them.

### Role Assignment and Contextual Permissions

**Single Role per Organization**

Within a given organization, every member holds exactly one role. A member cannot hold multiple roles within the same organization. The assigned role exclusively determines what the member can do within that organization.

**Roles Across Organizations**

A member's role in one organization does not carry over to another organization. A member may hold the Owner role in Organization A, the Employee role in Organization B, and a custom role in Organization C — all simultaneously. Each role is scoped strictly to its respective organization.

**Permission Determination**

A member's effective permissions at any moment are determined by:

1. The organization currently selected as the active context
2. The role assigned to the member within that organization

When a member switches organizations, their permissions change immediately to reflect the role in the newly selected organization. There is no caching or delay — the permission change is instantaneous with the context switch.

**Role Assignment Changes**

Users with `employee:manage` permission (or Owners, who hold this implicitly) can change the role assigned to any employee in the organization. When a member's role is changed, the new permissions take effect immediately, including for the member's current session if they are actively using the platform. The member does not need to log out and log back in for the new role to apply.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

A guest can register for an account by providing an email address and a password. Both fields are required — registration is rejected if either is missing or empty.

During sign-up, the guest must also create their first organization. The organization requires a name and may optionally include a description, a logo image, a currency (such as USD, EUR, or KRW), a timezone, and a fiscal start month. The registering user automatically becomes the Owner of this new organization.

If the email address is already registered in the system, the registration is rejected. The user is informed that an account with that email already exists.

If the email matches a pending invitation in any organization, the new account is automatically associated with those organizations upon successful registration and the invitations are resolved. The user gains access to those organizations in addition to the one they created during sign-up.

The organization name is required. If it is missing or empty, the registration is rejected.

After successful registration, the user is NOT automatically authenticated. The user must explicitly log in using the registered email and password to access the system.

### Login

A user logs in by providing their registered email address and password. Both fields are required.

If the credentials are valid, the user is authenticated and becomes a member. The system then presents the list of organizations the user belongs to. The user must select one organization to establish the organization context for the session. All subsequent actions are scoped to that organization.

If the user belongs to only one organization, that organization is selected automatically without requiring the user to choose.

If the email is not registered or the password does not match, the login is rejected. The system informs the user that the credentials are invalid without disclosing whether the email or password was incorrect.

A member who belongs to multiple organizations can switch their active organization context without logging out (see Session and Logout).

### Authentication

The system authenticates users by verifying their email address and password. A user who presents valid credentials becomes an authenticated member. A guest who attempts a protected operation without authenticating is rejected.

Once authenticated, the member's identity is established. All actions are scoped to the member's currently selected organization. The member's permissions within that organization are determined by the role assigned to their employee record in that organization.

A member can change their password while authenticated (see Account Management).

A member can delete their account, subject to ownership transfer or organization deletion constraints (see Account Management).

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

### Session Establishment

When a user successfully logs in with their email and password, the system creates a session for that user. The session represents the user's authenticated identity within the platform.

Registration alone does not create a session. A newly registered user must complete a separate login step to establish an authenticated session.

### Organization Context Selection

Upon login, if the user belongs to multiple organizations, the system prompts the user to select which organization to work in. This selection establishes the organization context for the session. If the user belongs to only one organization, that organization is automatically set as the context.

All subsequent actions during the session are scoped to the selected organization. The user sees only data belonging to that organization, and any operations they perform apply within that organization's boundaries.

### Switching Organization Context

A user who belongs to multiple organizations can switch their organization context at any time without logging out. Switching the context immediately scopes all subsequent actions to the newly selected organization. Data and permissions from the previous organization context become inaccessible until the user switches back.

### Session Scope

A session is tied to the authenticated user, not to a specific organization. The user remains authenticated regardless of which organization context is currently active. Switching organizations does not create a new session.

### Logout

### Logout

A user can log out at any time. Logging out terminates the current session and the user returns to an unauthenticated (guest) state. After logout, any attempt to access organization-scoped data requires a new login.

### Account Security

### Password Change

An authenticated user can change their password. The user must provide their current password and a new password. If the current password is incorrect, the change is rejected.

### Account Deletion

A user can delete their own account. Before deletion, the system checks for ownership constraints:

- If the user is the sole owner of any organization, they must either transfer ownership to another member or delete the organization first. The account cannot be deleted while the user remains the sole owner of an active organization.
- If the user is not a sole owner of any organization, deletion proceeds.

When an account is deleted, the user's employee records in all other organizations are marked as deactivated. The user can no longer log in with the deleted account.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

A guest creates an account by providing an email address and a password. The email must be unique across the entire platform.

During initial sign-up, the user must also create their first organization. The organization requires a name and may optionally include a description, logo image, currency (e.g., USD, EUR, KRW), timezone, and a fiscal start month. The user becomes the Owner of this newly created organization.

If the provided email is already associated with a pending invitation to an organization, the user is automatically added to that organization upon account creation in addition to creating their own first organization.

After successful account creation, the user must explicitly authenticate with their new credentials before accessing the platform. Automatic login after sign-up is not permitted.

### Account Deletion

A member may delete their own account at any time.

Before deletion can proceed, the system checks whether the member is the sole owner of any organization. If the member is the sole owner of an organization, they must either transfer ownership to another member in that organization or delete the organization entirely before deleting their account. Account deletion is blocked until this condition is resolved.

When an account is deleted:
- The member's employee records in all other organizations (where they are not the sole owner) are marked as deactivated rather than deleted, preserving historical data such as timelogs and timesheets.
- The member can no longer log in or access any organization.
- The member's global profile information is removed.

If the member is not the sole owner of any organization, deletion proceeds without additional steps.

### Password Change

An authenticated member can change their password at any time. The member must provide their current password and the new password to complete the change.

The new password replaces the existing password immediately. The member remains logged in after the password change and does not need to re-authenticate.

If the current password provided does not match the stored password, the change is rejected.