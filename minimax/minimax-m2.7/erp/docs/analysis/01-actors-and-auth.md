**erpHrm — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not yet registered or logged into the platform. Guests can create a new account by providing a valid email address and a secure password during the sign-up process. They can also authenticate with existing credentials through the login flow. The system validates that the provided email is properly formatted and unique within the platform. Password requirements ensure basic security standards are met. Guests cannot access any organization data, employee records, projects, or business operations until they have successfully authenticated. Their access is strictly limited to authentication-related screens and the registration form. Once a guest completes registration or logs in, they transition to an authenticated state and can access the system based on their assigned roles.

### Guest Identity Definition

A guest is an unauthenticated user who has not yet registered or logged into the platform. Guests are identified solely by their browser session and have no account, identity, or data associated with them in the system. The platform recognizes guests by the absence of valid authentication credentials. Guests cannot be identified by name, email, or any other personal information until they complete the registration or login process. The system assigns a temporary session identifier to track the guest through the public registration flow.

### Account Registration Requirements

Guests can create a new account by providing a valid email address and a secure password. The registration process requires the guest to enter their desired password twice for confirmation. Email addresses must be properly formatted and unique within the platform. The system validates that no existing account uses the provided email before proceeding. Passwords must meet minimum security standards to ensure account protection. Upon successful registration, the guest transitions from an unauthenticated state to an authenticated member of the platform.

### New Account Creation Process

New accounts are created when a guest completes the registration form with valid credentials. The system records the email address and a secure representation of the password. Each new account receives a unique internal identifier. The account is created in an inactive state pending initial organization setup. The registration process also initializes the user's global profile with minimal required information. The account becomes fully functional once the user completes the organization creation process during first-time setup.

### Login with Credentials

Guests can authenticate with existing credentials through the login flow. The login process requires a valid email address associated with an existing account and the corresponding password. The system verifies that the provided credentials match a registered account. Successful authentication establishes a new session for the user. Failed authentication attempts are reported with appropriate feedback without revealing whether the email exists. Multiple failed login attempts do not lock the account but may trigger rate limiting to prevent brute force attacks.

### Authentication Gateway

The authentication gateway serves as the entry point for all unauthenticated access to the platform. It presents guests with clear options to register a new account or log into an existing one. The gateway validates initial inputs before processing authentication requests. It enforces rate limiting to protect against automated attacks. The gateway ensures that all sensitive operations occur over secure connections. After successful authentication, the gateway initializes the user's session and redirects to the appropriate destination.

### Unauthenticated Access Boundaries

Guests cannot access any organization data, employee records, projects, tasks, timesheets, or business operations until they have successfully authenticated. Unauthenticated access is strictly limited to authentication-related screens including the registration form, login form, and password assistance pages. Guests cannot view reports, activity logs, or any organizational information. The system enforces authentication requirements on all endpoints that return sensitive business data. Any attempt to access protected resources without authentication results in redirection to the authentication gateway.

### Session Initialization

Upon successful registration or login, the system initializes a session for the authenticated user. Session initialization establishes the user's identity within the platform and prepares the environment for their operations. The session links the user to their account and organizational memberships. Initial session data includes the user's unique identifier and basic account status. The system determines whether the user has existing organization memberships to restore their previous context. If no organization context exists, the system presents the organization selection or creation interface.

### Public Interface Access

The public interface accessible to guests consists of the registration page, login page, and supporting pages such as password reset request. These pages contain standard web form elements for entering credentials and submitting authentication requests. The public interface provides clear guidance on registration requirements and login procedures. Help text and error messages assist guests in completing authentication successfully. The public interface does not reveal any information about the platform's organizations, features, or internal operations.

### Credential Validation

The system validates guest-provided credentials before accepting registration or login requests. Email validation ensures proper formatting matching standard email address conventions. Password validation enforces minimum requirements for security including length and character complexity. The system checks email uniqueness during registration to prevent duplicate accounts. All credential validation occurs server-side to prevent client-side bypass. Invalid credentials result in clear error messages that help guests correct their input.

## member Actor

A member is an authenticated user who has an active Employee record within the currently selected organization. Members can only access data and perform operations within the organization they are currently working in. Each member is assigned exactly one role that determines their permissions and what actions they can perform. Members with the Employee role can track time, submit timesheets, and view their own data including timelogs, tasks, and projects they are assigned to. Members who belong to multiple organizations can switch between them without logging out, and their access scope updates to reflect the newly selected organization. The member's role can be changed by users with the employee:manage permission. Deactivated employees lose their ability to log time or submit timesheets, though their historical data remains accessible. All member actions are scoped to the selected organization context, and no cross-organization data visibility is permitted.

### Authenticated Employee Identity

A member is an authenticated user who has established their identity through the login process using their registered email and password. Once authenticated, the system identifies the member by linking their user account to an active Employee record within the currently selected organization. The member's identity remains constant across all organizations they belong to, but their effective permissions and accessible data change based on which organization they are currently working in. A member cannot perform any actions without first selecting an organization context, and all operations are executed under the member's authenticated identity.

### Organization Membership

Organization membership defines the scope of a member's access within the system. A member can belong to multiple organizations, with each membership represented by a separate Employee record linking the member's user account to that specific organization. Each Employee record carries the member's role within that organization, allowing the same user to have different permission levels in different organizations. When a member logs in, they must select which organization they wish to work in before accessing any functionality. The system maintains the association between the member and each organization through these Employee records, which are created when the member is invited or when they accept an invitation to join an organization.

### Role-Based Access Control

Role-based access control determines what actions a member can perform within an organization. Every member is assigned exactly one role for each organization they belong to, and this role defines their complete set of permissions within that organization. The three built-in roles available are Owner (granting full access including role management and member administration), Manager (allowing employee management, project oversight, timesheet approval, and report access), and Employee (restricted to time tracking, timesheet submission, and viewing their own data). Custom roles created by organization owners can have any combination of the available permissions. A member's role can only be changed by users holding the employee:manage permission, and this change takes effect immediately upon assignment.

### Organization Context

The organization context determines the data boundaries for all member actions. When a member selects an organization to work in, that selection establishes the scope within which all subsequent operations execute. Members can only view and modify data belonging to the currently selected organization, and no visibility exists across organizational boundaries. The currently active organization context is maintained throughout the member's session and must be explicitly changed to access data in a different organization. All API requests, data queries, and business operations are filtered to return only data associated with the selected organization.

### Employee Record Linkage

Each member is linked to their Employee record through a reference that connects their user account to their role and organizational membership. This Employee record serves as the bridge between the member's global user identity and their organization-specific permissions and attributes. The Employee record contains the member's assigned role, department, position, employment type, and status within that organization. The system uses this linkage to enforce permissions, determine what data the member can access, and track the member's activities within the organization. When a member switches organizations, the system loads the corresponding Employee record for the newly selected organization to establish the correct permission context.

### Permission Scope Definition

Permission scope defines the boundaries of what actions a member can take based on their assigned role. Each role contains a specific set of permissions that control access to features and data within the organization. Available permissions include org:manage for editing organization settings, employee:manage for adding and managing employees, employee:view for viewing employee information, project:manage for creating and modifying projects, project:view for viewing projects, time:manage for editing any timelogs, time:approve for approving or rejecting timesheets, time:view_all for viewing all employee time records, and report:view for accessing organizational reports. A member can only exercise permissions that are explicitly granted to their assigned role, and attempts to perform actions beyond their permission scope are rejected by the system.

### Multi-Organization Membership

A member may belong to multiple organizations simultaneously, with each organization represented by a separate Employee record. Multi-organization membership allows the same user to participate in different capacities across different organizations, such as being an Owner in one organization while working as an Employee in another. Each membership is independent, with its own role assignment, department, and employment status. When a member belongs to multiple organizations, they must maintain a separate identity and permission set for each. The system tracks all organizational memberships and allows the member to manage their participation in each organization independently, including deactivating their Employee record in one organization while remaining active in others.

### Role Assignment

Role assignment connects a member to their permissions within an organization. When a member is added to an organization as an Employee, they are assigned a role that determines their capabilities. The Owner role is automatically assigned when creating a new organization. The Manager or Employee roles, along with any custom roles created by the organization owner, can be assigned to members by users holding the employee:manage permission. Role assignments are stored within the Employee record for each organization membership. When a member's role is changed, the new permissions take effect immediately for all subsequent actions, though any active session retains the updated permission context on the next request.

### Active Session Management

Active session management maintains the member's authenticated state and current organization context throughout their interaction with the system. When a member logs in successfully, the system establishes an authenticated session that preserves their identity and currently selected organization. This session remains active during continuous interaction and allows the member to perform actions without re-authenticating for each operation. The active session stores the member's selected organization context, ensuring all data access and operations remain scoped to that organization. Session state is maintained server-side and associated with the member's authenticated identity.

### Organization Switching

Organization switching allows members who belong to multiple organizations to change their working context without logging out. When a member initiates an organization switch, the system updates the active session to reflect the newly selected organization and loads the corresponding Employee record, role, and permissions for that organization. All subsequent actions are then executed within the context of the newly selected organization, with data access restricted to that organization's boundaries. Members can switch between their organizations as needed, with each switch immediately updating the permission scope and accessible data to match the target organization. Active timers, draft timesheets, and other work-in-progress items remain associated with their original organization and do not transfer during organization switching.

## admin Actor

An admin is a member with elevated permissions granted by specialized roles within an organization. The Owner role provides full access to all platform features, including the ability to manage organization settings, create and delete custom roles, and control all aspects of the organization's data. The Manager role allows users to manage employees, projects, and approve or reject timesheets, while also having access to organization reports. Custom roles can be created by organization owners with specific permission sets such as org:manage for editing organization settings, employee:manage for adding and editing employees, project:manage for creating and managing projects, time:manage for editing any employee's timelogs, time:approve for reviewing timesheets, and time:view_all for viewing all employees' time data. Admins with appropriate permissions can invite new employees, manage department structures, and handle role assignments. Organization owners can delete custom roles only when no employees are currently assigned to them. The admin actor encompasses anyone with permissions beyond the standard Employee role, including built-in roles and organization-defined custom roles.

### Organization Owner Role

Each organization has exactly one owner who is assigned during organization creation. The owner role is a built-in role that cannot be deleted or modified.

The organization owner has full access to all platform features within their organization. This includes the ability to edit organization settings such as name, description, logo, currency, timezone, and fiscal start month. The owner can invite new members, remove members, and assign or change roles for any employee. The owner can create, edit, and delete custom roles. The owner has access to view the full activity log and all organization reports. The owner can delete the organization, but only when all pending timesheets are resolved and no active employee contracts exist.

### Manager Role Permissions

The Manager role is a built-in role that cannot be deleted. Managers have elevated privileges compared to standard employees.

Managers can view the employee list and employee details. Managers can add new employees, edit employee records including department, position, and employment type, and deactivate or reactivate employees. Managers can create, edit, archive, complete, and delete projects. Managers can create, edit, and close tasks within projects. Managers can approve or reject submitted timesheets. Managers have access to organization reports including time reports, project budget reports, and weekly summary reports. Managers cannot edit organization settings, manage roles, or delete the organization.

### Custom Role Management

Organization owners can create custom roles beyond the three built-in roles. Each custom role has a name and a set of permissions.

Custom roles are scoped to the organization where they are created. When creating a custom role, the owner must assign a unique name within the organization and select one or more permissions from the available set. Organization owners can edit the name and permissions of any custom role. Organization owners can delete custom roles, but only when no employees are currently assigned to that role. Attempting to delete a role that has assigned employees results in rejection.

### Permission Assignment

Each employee in an organization is assigned exactly one role. This role determines what the employee can view and modify within the organization.

Users with employee:manage permission can assign any employee to a different role within the organization. When an employee's role is changed, the new permissions take effect immediately. An employee can only have one role at a time within an organization. If a user belongs to multiple organizations, their role in each organization is managed independently.

### org:manage Permission Scope

The org:manage permission grants the ability to edit organization settings and manage organizational structure.

Users with this permission can create, edit, and delete departments. They can view the full activity log for the organization. This permission does not include the ability to delete the organization, which is reserved for the owner. Users with org:manage permission can also invite employees and manage their roles, though they cannot create or delete custom roles without also being the organization owner.

### employee:manage Permission Scope

The employee:manage permission grants the ability to add, edit, and deactivate employees within the organization.

Users with this permission can invite new employees by email. If the invited email already has an account, the user is added to the organization immediately. If the invited email has no account, a pending invitation is created. Users with this permission can edit employee records including department, position, employment type, and role assignment. They can deactivate employees, which prevents those employees from logging time or submitting timesheets while preserving their historical data. They can reactivate previously deactivated employees. They can create and edit employee contracts, including automatically ending previous contracts when creating new ones.

### project:manage Permission Scope

The project:manage permission grants full control over projects and tasks.

Users with this permission can create new projects with name, description, color code, budget hours, and dates. They can edit any project attribute. They can archive or complete projects, which prevents new timelogs but preserves existing data. They can delete projects only when no timelogs are associated with them. They can assign employees to projects with either member or project-lead role. They can remove employees from projects. They can create tasks within projects, assign tasks to employees, and manage task status. They can edit any task within the organization regardless of which project lead created it.

### time:approve Permission Scope

The time:approve permission grants the authority to review and act on submitted timesheets.

Users with this permission can view all submitted timesheets from employees. They can approve submitted timesheets, which locks all included timelogs from further editing or deletion. They can reject submitted timesheets with a mandatory rejection reason, which returns the timesheet to draft status for the employee to modify and resubmit. This permission does not grant the ability to create, edit, or delete individual timelogs directly.

### time:manage Permission Scope

The time:manage permission grants the ability to edit or delete any employee's timelogs regardless of who created them.

Users with this permission can modify timelogs even if those timelogs are part of an approved timesheet. This permission supersedes the normal restriction that prevents employees from editing timelogs on approved timesheets. Users with this permission can also delete any timelogs. This permission does not grant the ability to approve or reject timesheets.

### time:view_all Permission Scope

The time:view_all permission grants the ability to view all employees' timelogs and timesheets.

Users with this permission can see timelogs from any employee in the organization, including those from deactivated employees. They can see timesheets in all states including draft, submitted, approved, and rejected. This permission is typically granted to managers and role-based access controllers to enable oversight without necessarily granting edit capabilities.

### report:view Permission Scope

The report:view permission grants access to organization-level reports.

Users with this permission can access the Time Report showing hours logged per employee for any date range, with breakdowns by employee, project, or task, and filtering by billable status. They can access the Project Budget Report showing budget consumption across projects. They can access the Weekly Summary Report showing week-by-week statistics. This permission is required to view the organization dashboard showing aggregate metrics.

### Elevated Access Privileges Overview

The admin actor encompasses anyone with permissions that exceed the standard Employee role. This includes users with built-in roles (Owner and Manager) and users with custom roles that include administrative permissions.

Elevated access privileges allow users to manage organizational resources that regular employees cannot control. Admins can view and manage other users' data within the organization. Admins can approve or reject work submissions. Admins can create and modify organizational structures including departments and projects. Admins can generate and view reports about organizational activity. All admin actions are recorded in the activity log with timestamp, user identity, action type, and details. Admins are bound by data isolation policies and cannot access data from other organizations.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

### User Registration

Users can create a new account by providing an email address and a password.

#### Registration Requirements

THE system SHALL require users to provide a valid email address when registering.

THE system SHALL require users to provide a password that meets minimum security requirements when registering.

THE system SHALL prompt the user to confirm their password by entering it twice during registration.

THE system SHALL verify that the two password entries match before accepting the registration.

THE system SHALL verify that the provided email address is not already associated with an existing account.

WHEN a user submits a registration request with an email that already exists, THE system SHALL reject the request and inform the user that an account with that email already exists.

WHEN a user submits a registration request with mismatched passwords, THE system SHALL reject the request and prompt the user to enter matching passwords.

#### New Account Creation

WHEN a user successfully completes the registration form, THE system SHALL create a new user account associated with the provided email.

THE system SHALL associate the new account with an initial organization created during the registration process.

THE system SHALL prompt the user to provide the organization name during registration.

THE system SHALL assign the newly registered user the owner role within their initial organization.

THE system SHALL establish an authenticated session for the user immediately upon successful account creation.

#### Organization Setup During Registration

DURING the registration process, THE user SHALL provide the following organization details:

- Organization name (required)
- Organization description (optional)
- Currency setting for the organization (required, default to USD)
- Timezone setting for the organization (required, default to UTC)
- Fiscal start month for the organization (required, default to January)

THE user SHALL be able to upload a logo image for the organization during registration (optional).

WHEN the user completes organization setup, THE system SHALL create the organization record with the provided information.

### User Login

### User Login

Users can log in to the platform using their registered email and password.

#### Login Requirements

THE system SHALL require users to provide their email address when logging in.

THE system SHALL require users to provide their password when logging in.

THE system SHALL verify the provided credentials against stored account information.

WHEN a user enters valid credentials, THE system SHALL authenticate the user and establish a session.

WHEN a user enters an email that does not match any existing account, THE system SHALL reject the login attempt and inform the user that no account exists with that email address.

WHEN a user enters a valid email but an incorrect password, THE system SHALL reject the login attempt and inform the user that the password is incorrect.

THE system SHALL implement measures to prevent unauthorized access attempts, such as temporarily locking an account after multiple consecutive failed login attempts.

#### Organization Selection

WHEN a user successfully logs in and belongs to more than one organization, THE system SHALL present an organization selection screen.

THE organization selection screen SHALL display a list of all organizations the user is a member of.

EACH organization entry SHALL display the organization name and logo.

THE user SHALL select one organization from the list to proceed.

THE selected organization SHALL become the active organization context for all subsequent actions until changed.

WHEN a user belongs to only one organization, THE system SHALL automatically select that organization and proceed directly to the user dashboard.

#### Switching Organizations

LOGGED IN users who belong to multiple organizations SHALL be able to switch organizations without logging out.

THE system SHALL provide a mechanism to access the organization selection interface from within the application.

WHEN a user switches organizations, THE system SHALL update the active organization context to the newly selected organization.

ALL subsequent actions SHALL be scoped to the newly selected organization.

WHEN a user switches organizations, any unsaved work SHALL be handled according to the application's save policies.

### Authentication Session

### Authentication Session

The system manages authenticated sessions to maintain user identity and organization context throughout the user's interaction with the platform.

#### Session Establishment

WHEN a user successfully logs in or completes registration, THE system SHALL create an authenticated session for that user.

THE authenticated session SHALL contain the user's identity information.

THE authenticated session SHALL contain the currently selected organization context.

THE system SHALL associate all actions performed during the session with the authenticated user.

THE system SHALL enforce that all actions are scoped to the organization context established in the session.

#### Session Validity

THE system SHALL maintain the authenticated session as long as the user remains active in the application.

THE system SHALL validate the session on each request to ensure the user is still authenticated.

WHEN a session expires due to inactivity, THE system SHALL require the user to log in again before proceeding.

#### Session Security

THE system SHALL associate sessions with the user account and not share sessions between different users.

WHEN a user changes their password, THE system SHALL invalidate all existing sessions for that user and require re-authentication.

#### Session Termination

WHEN a user explicitly logs out, THE system SHALL terminate the current session and clear the session data.

THE system SHALL return the user to the login page after logout.

AFTER logout, the user SHALL need to log in again to access their account or any organization data.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Behavior

A session is established upon successful authentication with email and password credentials. Once authenticated, the user is recognized as a member within the selected organization context. All operations performed during the session are scoped to the currently selected organization.

The session persists until the user explicitly logs out or the session expires due to inactivity. During an active session, the user remains authenticated and can perform operations according to their assigned role and permissions within the organization.

### Organization Context Within Session

When a user belongs to multiple organizations, the session maintains awareness of the currently selected organization. The user can switch to a different organization without ending the current session or logging out. Switching organizations updates the organization context, and all subsequent operations apply to the newly selected organization.

The user may only view, create, modify, or delete data belonging to the currently selected organization. Data from other organizations the user belongs to remains inaccessible until the user switches to that organization's context.

### Logout

Users can end their session by explicitly requesting to log out. Upon logout, the session is terminated and the user is redirected to the login page.

When a user logs out:
- The session is cleared and no longer valid
- The organization context is cleared
- The user must authenticate again to access any organization

If the user has an active timer running when they log out, the timer continues running on the server. The user can resume the timer after logging back in.

### Password Change

Authenticated users can change their password at any time during an active session. To change the password, the user must provide their current password for verification along with the new password.

The system validates that the current password matches before accepting the new password. Upon successful password change, the session remains active and the user can continue working without interruption.

### Session Security

Each user account has a single active session at a time. When a user logs in from a new device or browser while an existing session is active, the previous session is automatically terminated and replaced by the new session.

The system enforces re-authentication when users attempt to delete their account or transfer organization ownership.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create a new account by providing a valid email address and a password.

The email address must not already be associated with an existing account.

The password must meet minimum security requirements established by the system.

Upon successful account creation, the user is automatically authenticated and can access their profile.

Users who create a new account may be automatically added to any organizations where they had a pending invitation, if the invited email matches the newly registered email address.

A newly created account has no organization affiliations until the user either creates an organization or accepts an invitation.

### Account Deletion

Users can request to delete their own account at any time.

Before an account can be deleted, the system checks whether the user is the sole owner of any organization. If the user is the sole owner of an organization, the system rejects the deletion request until the user either transfers ownership to another member or deletes the organization.

When an account is deleted, the user's employee records in organizations where they are not the sole owner are marked as deactivated rather than permanently removed. This preserves historical timelogs, timesheets, and other data associated with those records.

The user's owner account itself is permanently removed from the system. If the user was the sole owner of an organization, that organization and all its associated data are also permanently deleted as part of the cleanup process.

Deactivated employee records retain all their historical data including timelogs, timesheets, and contracts. These records remain visible to users with appropriate permissions for historical reporting purposes.

### Password Change

Authenticated users can change their current password at any time.

To change the password, the user must provide their current password for verification purposes.

The user must then provide a new password that meets the system's minimum security requirements.

The system confirms the new password by requiring it to be entered twice to prevent typos.

Upon successful password change, the user's existing session remains active and they do not need to log in again.

The system rejects password change requests if the current password provided does not match the stored password.