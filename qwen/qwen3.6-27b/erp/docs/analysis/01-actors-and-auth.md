**hrmPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest actor represents an unauthenticated user interacting with the platform before completing registration or signing in. Guests possess no assigned role and hold zero permissions within the system. Their identity is entirely separate from any user account or employee record. Guests are restricted to accessing only public entry points such as the sign-up and login pages. Any attempt to view or modify organizational resources is immediately denied by the system. The access boundary for guests strictly stops at the authentication interface. Guests cannot perform any business operations, including time tracking or report viewing, until they authenticate. Their only permitted actions are creating a new account or retrieving access to an existing one. This restriction ensures that all organizational data remains completely secure. Guests remain in this unauthenticated state until they successfully complete the registration or login process.

### Unauthenticated User State and Zero Permissions

A guest actor represents an unauthenticated user with no established identity within the platform. Guests SHALL exist in an unauthenticated user state that is entirely separate from any user account, employee record, or organization membership. This unauthenticated user state persists until the user successfully completes the registration or login process. Guests SHALL possess zero assigned permissions within the system. They hold no role, no permission set, and no access rights to any organizational resources including employees, projects, tasks, timelogs, timesheets, reports, or dashboards. The pre-registration user boundary ensures that guests cannot participate in any business workflows, data queries, filtering operations, or reporting features. The access boundary for guests strictly stops at the authentication interface, preventing any interaction with organizational data or business functionality.

### Public Entry Point Access

Guests SHALL be granted access only to the platform's public entry points, which are the sign-up page and login page. The sign-up and login restriction confines guests to the authentication interface and prevents entry to any internal application pages or organizational resources. Guests cannot access employee management, project management, time tracking, timesheet submission, timer operations, or report generation features. All organizational data remains completely inaccessible to guests regardless of whether they have previously interacted with the platform. Guests SHALL not be able to infer or discover organizational data through any public-facing mechanism. This organizational data isolation applies universally across all organizations on the platform.

### Authentication Gate and Account Creation

The authentication gate enforcement ensures that guests cannot bypass the registration or login process to reach protected content. WHEN an unauthenticated user attempts to access any internal application page or organizational resource, THE system SHALL block the request and deny access immediately. The authentication gate prevents guests from navigating to URLs for employees, projects, tasks, timelogs, timesheets, reports, dashboards, or any other protected endpoints. Guests are restricted to the sign-up and login pages only. The only pathway for guests to gain access to the platform is through account creation capability. Guests SHALL be able to initiate the user registration process by providing the necessary information to create a new account, including an email address and password. Alternatively, guests with existing accounts can authenticate through the login page using their credentials.

## member Actor

A member actor is an authenticated user who has actively selected an organization to operate within. Members function inside a specific organizational context that dictates their available features and data access. Their system identity connects a global user account to a localized employee record. Members receive exactly one role assignment for their currently selected organization. This role directly controls their permission set, enabling actions like time tracking, project management, or timesheet approval. The member's access boundary strictly confines their operations to the resources of their chosen employer. Members can seamlessly switch between different organizations without requiring a logout to change their working context. Their capabilities change immediately upon switching, reflecting the role assigned by the new employer. All member actions are evaluated against their current role's permissions before execution. This contextual structure guarantees that members only interact with authorized organizational assets.

### Authenticated Organization Member

An authenticated organization member is a user who has successfully logged in and selected an organization to operate within. Membership requires an active session and a selected organizational context. The member actor represents a distinct state from unauthenticated guests, who lack access to any organizational resources. Once authenticated, the member operates under a single role assignment tied to their current organization context. Member identity is composed of a global user profile, shared across all organizations, and a localized employee record specific to each employer relationship. This dual-identity structure enables members to maintain a single user account while participating in multiple organizations under different roles and attributes. Members can be added to organizations through employee invitations sent by users with employee management permissions. Members can be deactivated by users with employee management permissions, which restricts their ability to log time or submit timesheets while preserving historical data. Upon successful reactivation, members regain all previously assigned capabilities within that organization.

### Multi-Organization Membership

Users who belong to multiple organizations maintain simultaneous memberships with independent employee records, roles, and permissions in each organization. Each organizational membership is fully independent; a role change, deactivation, or attribute modification in one organization does not affect the member's status or identity in any other organization. The global user profile, including display name, avatar image, and phone number, is shared uniformly across all organizational contexts. Organization-specific attributes, including role assignments, department assignments, position titles, and employment types, remain distinct per organizational boundary. Members can be members of unrelated organizations, such as a primary employer and a consulting firm, with no overlap in organizational data or permissions. Membership in multiple organizations enables members to maintain separate working relationships under distinct role assignments without any cross-context interference. If a member is deactivated in one organization, they can continue to operate normally in other organizations where their status remains active.

### Employee Record Linkage

Employee record linkage binds the global user account to an organization-specific employee record, establishing the member's localized identity within that organization. Each employee record stores the assigned role, department, position title, employment type, and activation status, all scoped to a single organizational context. A single global user account can be linked to multiple employee records across different organizations, with each record serving as the authoritative source for identity attributes within that employer's boundaries. The employee record is the reference point for all permission validations and data access decisions within the selected organization. When a member authenticates and selects an organization, the system locates the corresponding employee record to determine the applicable role and permissions. Employee record attributes can be edited by users with employee management permissions in that organization. If an employee record is deactivated, the member loses the ability to perform time-tracking actions within that organization, but the global user account and memberships in other organizations remain unaffected.

### Organization Context Selection

Members who belong to multiple organizations must select one organization context to establish their active working environment after authentication. The system presents all organizations where the member holds an active membership, allowing selection of the desired context. All authorized operations and data access are strictly scoped to the selected organization until the context is changed. If a member belongs to only one organization, the system automatically establishes that organization as the active context. Organization context selection is required before the member can access any organization-scoped features, including projects, employees, timelogs, and reports. The selected context determines which employee record, role, and permission set apply to the member's current operations. Members without an active session cannot perform context selection and must first authenticate. If the member's employee record in the selected organization is deactivated, the system restricts time-tracking capabilities while permitting access to read-only features, subject to permissions. Organization context selection establishes the foundational boundary for all subsequent member actions and data visibility.

### Organization Switching Capability

Members can switch between organizations at any time without logging out or terminating their active session. Organization switching immediately replaces the current organizational context with the newly selected one. Upon switching, the member's available features, permissions, and data access boundaries update instantly to align with the role assigned by the new organization. Previously loaded organizational data is no longer accessible once the context changes; members can only interact with resources belonging to the current context. Members can perform organization switching repeatedly without any session interruption or re-authentication requirement. Role changes, deactivations, or permission modifications in the newly selected organization take immediate effect upon switching back to that context. Historical data and employee records in previously visited organizations remain preserved and accessible only when the member switches back to that specific context. Organization switching provides seamless context transitions while maintaining strict data isolation between employers.

### Single Role Per Context

Each member receives exactly one role assignment within a given organizational context, preventing role splitting or role combination within the same organization. The single role definition establishes the complete permission set and data access boundaries for the member within that employer's boundaries. Members cannot hold multiple roles simultaneously in the same organization; they must be reassigned to a different single role if their responsibilities change. The role assignment is immutable to the member themselves and can only be modified by users with employee management permissions in that organization. Role changes apply immediately upon assignment, updating the member's available features without invalidating historical actions performed under the previous role. Built-in roles (Owner, Manager, Employee) and custom roles created by organization owners each constitute valid single-role assignments. If a member's role is deleted and replaced, the system assigns a new single role to maintain continuous organizational access. The single role per context rule ensures clear, unambiguous permission boundaries for every member within each organization.

### Role-Based Permission Assignment

Organizations define roles with specific permission sets that control what actions members can perform within that organization. Built-in roles (Owner, Manager, Employee) come with predefined permission catalogs that cannot be deleted or modified. Organization owners can create custom roles by selecting from the available permission catalog, allowing tailored permission configurations for specific organizational needs. Permissions include capabilities such as managing employees, viewing projects, approving timesheets, viewing all timelogs, editing organization settings, generating reports, and managing projects. Each permission grants discrete access to specific features or data categories within the organization. Members inherit all permissions associated with their assigned role automatically, without the need for individual capability grants. Permission sets cannot overlap or be split across roles; each permission belongs to exactly one role within an organization. Organization owners can edit custom role permissions or delete custom roles entirely, provided no employees are currently assigned to those roles.

### Authorized Feature Interaction

Members can only perform actions explicitly covered by the permission set of their assigned role in the current organizational context. Every member action is validated against the permission catalog before execution, ensuring unauthorized actions are rejected. Members without the required permission for a specific feature or data category cannot access or interact with that resource within the current context. Data access boundaries are strictly confined to the selected organization; members cannot view or modify resources from other organizations, even if they hold memberships elsewhere. Elevated permissions, such as time management or employee management, grant cross-entity access within the organization but do not extend beyond the organizational boundary. Members cannot aggregate organizational data across multiple contexts simultaneously; all operations are scoped to the currently active organization. If a member attempts an action outside their permission set, the request is rejected. Authorized feature interaction ensures that members only operate within the boundaries defined by their organizational role, maintaining data security and access control integrity.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### #### User Registration

WHEN a guest provides an email address and password, THE hrmPlatform SHALL create a new user account.

WHEN a guest registers, THE hrmPlatform SHALL require the guest to create an organization as part of the sign-up process.

THE hrmPlatform SHALL reject registration if the provided email address is already associated with an existing user account.

WHEN registration succeeds, THE hrmPlatform SHALL register the user as the owner of the newly created organization.

WHEN a guest completes registration successfully, THE hrmPlatform SHALL transition the user from guest status to authenticated member status.

THE hrmPlatform SHALL record the registration event in the activity log.

### #### User Login

WHEN a user provides a valid email address and matching password, THE hrmPlatform SHALL authenticate the user and grant access.

THE hrmPlatform SHALL reject authentication if the provided email address is not associated with any registered account.

THE hrmPlatform SHALL reject authentication if the provided password does not match the account's stored password.

WHEN an authenticated user belongs to multiple organizations, THE hrmPlatform SHALL require the user to select which organization to work in.

THE hrmPlatform SHALL place users who belong to exactly one organization directly into that organization's context.

WHEN an authenticated user with a single organization logs in, THE hrmPlatform SHALL automatically select that organization as the active context.

WHEN an authenticated user belongs to multiple organizations and selects an organization, THE hrmPlatform SHALL set the selected organization as the active context for all subsequent actions.

### #### Authentication Requirements

THE hrmPlatform SHALL require all users to authenticate using email address and password before accessing organizational data.

THE hrmPlatform SHALL reject all requests to access organizational features from guests who are not authenticated.

WHEN a user is authenticated, THE hrmPlatform SHALL maintain the user's identity for the duration of the session.

WHEN an authenticated user switches organizations, THE hrmPlatform SHALL preserve the authentication state and only change the active organization context.

## Session and Logout

Define session behavior and logout from a user perspective.

### Active Session Behavior

WHILE a session is active, THE system SHALL maintain the user's authentication state across application interactions.

WHILE a session is active, THE system SHALL maintain the currently selected organization as the active organizational scope.

WHEN a user switches to a different organization while logged in, THE system SHALL update the active organizational scope without terminating the session.

WHILE a session is active, THE system SHALL restrict all user actions to data within the currently selected organization.

Sessions SHALL not terminate automatically; sessions remain active until the user explicitly logs out.

### Logout

Authenticated users can log out to end their session.

WHEN a user logs out, THE system SHALL terminate the active session and require re-authentication for subsequent actions.

AFTER a user logs out, THE system SHALL clear the active organizational scope and return the user to an unauthenticated guest state.

Logging out SHALL not affect the user's membership in any organization or delete any user data, employee records, or account information.

Logging out SHALL not automatically stop any running timer; the timer continues tracking time until explicitly stopped or discarded by the employee.

### Session Security

Sessions SHALL be scoped exclusively to the authenticated user and SHALL not permit access to another user's data.

WHILE a session is active, THE system SHALL enforce that the user can only access data belonging to the currently selected organization.

The system SHALL require an active authenticated session for all operations that require permissions beyond public entry points.

Guests without active sessions SHALL be limited to public entry points such as sign-up and login pages.

When a user who belongs to multiple organizations switches between organizations, THE system SHALL enforce strict data isolation so that the user only sees data for the newly selected organization.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users create accounts by providing an email address and password. The system validates that the email address is unique across all organizations on the platform.

Upon successful creation:
- The account is initially unassigned to any organization
- Users can create their own organization during initial sign-up, which establishes them as the organization owner
- Alternatively, users may join an existing organization through an employee invitation sent to their email address

The account creation process establishes a global user profile that is shared across all organizations the user may join. The account remains independent of any single organization, allowing users to participate in multiple organizations simultaneously.

### Account Deletion

Users can request deletion of their account subject to organizational constraints.

**Ownership constraint**: If the user is the sole owner of an organization, they must either transfer ownership to another member or delete the organization entirely before their account can be deleted.

**Employee record handling**: Upon account deletion, the system marks the user's employee records in all other organizations as deactivated rather than permanently removing them. This preserves historical records such as timelogs and timesheets while preventing the deactivated employee records from being used for active work submission.

**Post-deletion state**: The user's global profile and authentication credentials are permanently removed from the system. The user can create a new account in the future if desired, but previous organizational memberships and roles are not automatically restored.

### Password Change

Authenticated users can change their password at any time. The password is part of the user's global profile and applies across all organizations the user belongs to.

**Password change process**: Users provide their current password along with a new password. The system validates that the current password matches the existing credential before accepting the change.

**Session impact**: Changing the password affects authentication for all organization contexts associated with the user account, as the credential is globally scoped rather than per-organization.