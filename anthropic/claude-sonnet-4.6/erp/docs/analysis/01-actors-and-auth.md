**erpHrm — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any individual who accesses the platform without an authenticated session. Guests have no identity within the system and are not associated with any organization, employee record, or role. The only actions available to a guest are signing up for a new account and logging in to an existing account. Guests cannot view any organizational data, employee information, projects, timelogs, timesheets, or reports. Once a guest successfully authenticates, they transition into a member actor with full access to the organizations they belong to. Guests who receive an invitation by email remain guests until they complete the sign-up process, at which point they are automatically associated with the pending organization. The guest actor represents the outermost access boundary of the platform, with no permissions granted beyond authentication-related entry points.

### Guest Identity and Access Boundary

A guest is any individual who interacts with the platform without an authenticated session. Guests carry no identity within the system — they are not associated with any user account, organization, employee record, role, or permission set.

Guests have exactly zero permissions within the platform. They cannot view, create, modify, or delete any organizational data, including employees, projects, tasks, timelogs, timesheets, reports, or activity logs. The only entry points available to a guest are the sign-up page (account registration) and the login page (account authentication).

All other areas of the platform are inaccessible to guests. Any attempt by a guest to access a protected resource is denied.

### Sign-Up and Login Entry Points

The platform provides two and only two entry points accessible to guests:

**Sign-Up**: A guest may create a new user account by providing an email address and a password. Upon successful account creation, the guest transitions into a member. If the guest was invited to one or more organizations prior to sign-up, those associations are automatically applied at the moment of account creation (see Pending Invitation below).

**Login**: A guest with an existing account may authenticate by providing their registered email address and password. Upon successful authentication, the guest transitions into a member and gains access to the organizations they belong to.

No other actions are available to guests beyond these two entry points.

### Pending Invitation Prior to Sign-Up

An organization member with the appropriate permission may invite a person to join an organization by email. If the invited email address does not correspond to an existing user account, a pending invitation is created and held by the system.

The recipient of the invitation remains a guest until they complete the sign-up process. During this period, they have no access to the platform or the inviting organization — the invitation confers no permissions and grants no identity within the system.

When the guest signs up using the same email address that received the invitation, the system automatically associates the newly created account with all organizations that have a pending invitation for that email. The pending invitation is resolved at sign-up time, and the new user is immediately added to the relevant organizations as a member.

### Transition from Guest to Member

A guest becomes a member the moment they successfully authenticate — either through a new account registration or through login to an existing account. This transition is immediate and requires no additional steps.

Upon becoming a member, the user gains access to the organizations they belong to and must select an organization context to begin working. All platform features, permissions, and data are scoped to the selected organization context.

A member who logs out returns to the guest state. The guest state persists until the next successful authentication.

## member Actor

A member is any user who has successfully authenticated and belongs to at least one organization. Members interact with the platform within the context of a selected organization, and all their actions are scoped to that organization. Every member holds exactly one role within each organization they belong to — either one of the three built-in roles (Owner, Manager, or Employee) or a custom role defined by the organization owner. The Owner role grants full access to all features, including managing roles, members, and organization settings. The Manager role allows managing employees and projects, approving timesheets, and viewing reports. The Employee role covers time tracking, timesheet submission, and viewing personal data. Custom roles are defined by organization owners and carry a specific set of permissions drawn from the available permission codes: org:manage, employee:manage, employee:view, project:manage, project:view, time:manage, time:approve, time:view_all, and report:view. A member's effective capabilities within an organization are entirely determined by the permissions attached to their assigned role. Members can belong to multiple organizations and may hold different roles in each one. When a member switches organization context, their permissions change to reflect the role assigned in the newly selected organization. Deactivated members retain their historical data but lose the ability to perform active operations such as logging time or submitting timesheets.

### Member Identity

A member is any user who has successfully authenticated and belongs to at least one organization. Membership in an organization is established either by creating an organization during sign-up or by accepting an invitation from an existing organization.

Every member's identity is tied to their user account, which is identified by their registered email address. A member's global profile — display name, avatar image, and phone number — is shared across all organizations they belong to.

Within each organization, a member has a separate employee record that captures organization-specific attributes: their assigned role, department, position, employment type, and status. These attributes are independent for each organization the member belongs to.

A member is considered active within an organization when their employee record status is "active". A member whose employee record status is "deactivated" is treated as an inactive member in that organization.

### Organization Context Selection and Switching

After authenticating, a member must select an organization context before performing any platform actions. If a member belongs to only one organization, the system operates within that organization by default. If a member belongs to multiple organizations, they must choose which organization to work in upon login.

All actions a member performs — viewing data, creating records, managing employees, approving timesheets — are scoped exclusively to the currently selected organization. Data from other organizations the member belongs to is not visible in the current context.

A member may switch their active organization context at any time without logging out. Upon switching, the system immediately applies the member's role and permissions from the newly selected organization. Any data previously visible from the prior organization context is no longer accessible until the member switches back.

When a member switches organization context, their permission set changes entirely to reflect the role assigned in the newly selected organization. A member who holds an Owner role in one organization and an Employee role in another will have full access in the first context and restricted access in the second.

### Built-In Roles

Each organization has three built-in roles that cannot be deleted or renamed. Every organization member is assigned exactly one of these built-in roles or one custom role.

**Owner**
The Owner role grants full access to all platform features within the organization. An owner can manage organization settings, invite and deactivate employees, manage roles and assign them to members, create and delete projects, approve or reject timesheets, view all timelogs and reports, and view the activity log. The Owner role also encompasses all permissions available to the Manager and Employee roles. There must always be at least one active Owner in an organization.

**Manager**
The Manager role grants broad operational access. A manager can manage employees (add, edit, deactivate), view the employee list, manage projects and tasks, view all projects, approve or reject timesheets, view all employees' timelogs and timesheets, and view organization reports. The Manager role does not include the ability to manage organization settings, manage custom roles, or delete the organization.

**Employee**
The Employee role is the baseline role for day-to-day time tracking work. An employee can log time for themselves, submit and manage their own timesheets, view projects and tasks they are assigned to, and view their own timelogs and contracts. The Employee role does not include access to other employees' data, project management, timesheet approval, or organization-level reports.

### Custom Roles and Available Permission Codes

In addition to the three built-in roles, organization owners can create custom roles to represent specific access configurations not covered by the built-in options. Each custom role has a name and a set of permissions drawn from the following available permission codes:

| Permission Code | What It Grants |
|---|---|
| `org:manage` | Edit organization settings (name, description, logo, currency, timezone, fiscal start month) |
| `employee:manage` | Add, edit, deactivate, and reactivate employees; create and edit employee contracts; manage invitations |
| `employee:view` | View the employee list, employee details, and employee contracts |
| `project:manage` | Create, edit, archive, complete, and delete projects; manage project members and tasks |
| `project:view` | View projects and their associated tasks |
| `time:manage` | Edit or delete any employee's timelogs regardless of timesheet status |
| `time:approve` | View all submitted timesheets; approve or reject submitted timesheets |
| `time:view_all` | View all employees' timelogs and timesheets |
| `report:view` | Access organization-level reports and the organization dashboard |

A custom role may be assigned zero or more of these permission codes. A member assigned a custom role has access only to the capabilities explicitly granted by the permissions in that role. Permissions are additive — a member gains every capability listed in their assigned role's permission set, and no more.

Custom roles can be edited by organization owners at any time. A custom role can be deleted only if no employees are currently assigned to it.

### Role Assignment and Permission Boundaries

Each member holds exactly one role per organization. A member cannot be assigned more than one role within the same organization at the same time. Role assignment is managed by users who hold the `employee:manage` permission.

When a member belongs to multiple organizations, they may hold entirely different roles in each organization. There is no relationship between a member's role in one organization and their role in another.

A member's effective capabilities within an organization are entirely determined by the permissions attached to their currently assigned role. The following boundaries apply:

- A member cannot perform any action that is not covered by their assigned role's permissions.
- Viewing data belonging to other employees requires either the `employee:view`, `time:view_all`, or `time:approve` permission, depending on the data type.
- Managing projects or tasks requires the `project:manage` permission, or the project-lead assignment within a specific project.
- Approving or rejecting timesheets requires the `time:approve` permission.
- Viewing organization reports requires the `report:view` permission.
- Editing organization settings requires the `org:manage` permission.

**Deactivated Member Access Boundary**

A member whose status is "deactivated" within an organization loses the ability to perform active operations in that organization. Specifically, a deactivated member cannot log time, start or stop timers, submit timesheets, or create or modify records. Their historical data — including timelogs, timesheets, and contracts — is preserved and remains viewable by members with appropriate permissions. A deactivated member can be reactivated by a user with `employee:manage` permission, restoring their ability to perform actions according to their assigned role.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

A guest can register for a new account by providing an email address and a password. The email address must be unique across the platform; if an account already exists with the same email, registration is rejected.

During registration, the user also creates their first organization by providing an organization name. The user who creates an organization is automatically assigned the built-in Owner role within that organization.

If the registering email address matches one or more pending invitations, the new user is automatically added to each of those organizations with the role and employment type defined in the invitation. No additional action is required from the user to accept these pending invitations upon sign-up.

After successful registration, the user is authenticated and directed to select or enter the organization context they wish to work in.

### User Login

A registered user logs in by providing their email address and password. If the credentials do not match any account, the login attempt is rejected with a generic error that does not reveal whether the email exists.

Upon successful credential verification, the user must select which organization they wish to work in for their current session. All subsequent actions are scoped to the selected organization context.

A user whose account status is deactivated cannot log in. If a deactivated user attempts to log in, the request is rejected.

### Authentication Model

Authentication establishes the identity of a user and determines their access rights within a selected organization context. The platform distinguishes two top-level actors:

- **Guest**: An unauthenticated visitor who has not yet logged in. Guests can only access the registration and login entry points. They have no access to any organizational data or features.
- **Member**: An authenticated user who has successfully logged in and selected an active organization context. A member's permissions within that organization are determined entirely by the role assigned to their employee record in that organization.

Authentication state is maintained for the duration of the session (see the Session and Logout section). A member must re-authenticate if their session expires or they explicitly log out.

Within an organization, a member's effective permissions are the union of permissions granted by their assigned role. The three built-in roles — Owner, Manager, and Employee — carry fixed permission sets that cannot be altered. Custom roles carry permissions explicitly assigned to them by an organization Owner. Role definitions and the full permission matrix are defined in the Roles and Permissions section.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session and Organization Context

After a successful login, a user establishes an active session with the platform. Because a user can belong to multiple organizations, the session requires the user to select which organization they wish to work in. All subsequent actions performed during the session are scoped exclusively to the selected organization.

A user may switch their active organization context at any time without logging out. When switching organizations, the system replaces the current organization context with the newly selected one, and all subsequent actions apply to the new organization. Data from the previous organization context is not accessible until the user switches back.

The session persists until the user explicitly logs out or the session is otherwise terminated. The platform does not automatically stop a running timer when the user switches organization context or logs out — timer state is preserved independently.

### Logout

Any authenticated user (member) can log out of the platform at any time. Logging out terminates the current session and removes the organization context associated with it.

After logout, the user is treated as a guest and cannot access any organization data, perform any actions, or view any protected content until they log in again.

Logging out does not affect any in-progress work. Specifically:
- A running timer continues to run after logout and will still be active when the user logs back in.
- Draft timesheets, pending timelog entries, and other unsaved selections are preserved in their last-saved state.

A user who belongs to multiple organizations must log in and select an organization context again after logging out, even if they were previously active in one of those organizations.

### Account Security Boundaries

The platform enforces strict boundaries to protect user accounts and organizational data:

- A user's credentials (email and password) are personal and apply globally across all organizations they belong to. Changing the password (defined in Account Management) affects access to all organizations.
- Each organization context is isolated: a member authenticated in Organization A cannot access data belonging to Organization B without explicitly switching context.
- A deactivated member account retains authentication capability (the user can still log in) but the deactivated employee record within the affected organization prevents them from performing organization-scoped actions such as logging time or submitting timesheets.
- If a user's account is marked as deactivated (at the user level, not the employee record level), they cannot log in or establish a session.
- The system does not allow concurrent sessions to share or merge organization contexts; each session independently maintains its own organization context.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

When a new user creates an account, the system associates a global user profile with that account. The profile includes a display name (required), an optional avatar image, and an optional phone number. The profile is shared across all organizations the user belongs to and is not specific to any single organization.

During account creation, the user also establishes the first organization they will work in. The organization is configured with a name, optional description, optional logo image, currency, timezone, and fiscal start month. The creating user is automatically assigned the built-in Owner role within that organization.

If the new user was previously invited to one or more organizations by email (while no account existed), those pending invitations are automatically accepted upon account creation. The user is added to each of those organizations with the role specified at the time of invitation.

The email address used to create an account must be unique across the platform. If an account with the same email already exists, account creation is rejected. (Registration flow details are defined in the Registration and Login section.)

### Account Deletion

A user may request to delete their own account at any time, subject to the following conditions.

Before account deletion is permitted, the system checks whether the user is the sole owner of any organization. If the user is the sole owner of one or more organizations, they must first either transfer ownership of each such organization to another member or delete the organization entirely. Account deletion is blocked until this condition is resolved for all affected organizations.

Once all sole-ownership conflicts are resolved, the user may proceed with account deletion. Upon deletion:

- The user's account and login credentials are permanently removed from the platform.
- The user's global profile (display name, avatar, phone number) is permanently deleted.
- In every organization where the user held an employee record (other than organizations they owned and deleted), that employee record is marked as deactivated. The historical data associated with those records — including timelogs, timesheets, and contracts — is preserved for the organization's records.
- Any active timer belonging to the user is discarded.
- Active sessions for the user are terminated immediately.

Account deletion is irreversible. Once deleted, the email address may be used to register a new account.

### Password Change

An authenticated user can change their account password at any time through their account settings.

To change their password, the user must provide their current password for verification and a new password to replace it. The system verifies that the provided current password matches the stored credentials. If the current password does not match, the request is rejected and the password is not changed.

Upon successful password change, the new password replaces the old one immediately. The user's existing session remains active after the password change. Other active sessions, if any, are not automatically terminated.

Password change applies globally to the user's account and affects access across all organizations the user belongs to.