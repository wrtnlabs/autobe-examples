**hrmTimeTrack — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest represents an unregistered email address that has received an organization invitation but has not yet created an account. Guests have no permissions within the organization system and cannot access any organizational data or features. They exist only as pending invitations awaiting account creation. When a guest creates an account using the invited email address, they are automatically added to the organization with their assigned role. Until registration is complete, guests cannot perform any actions within the platform. The guest state is temporary and transitions to member status upon successful account creation. Guests cannot view employees, projects, tasks, or any other organizational resources. Their identity is limited to the email address used in the invitation.

### Guest Identity and State

A guest represents an unregistered email address that has received an organization invitation but has not yet created an account. The guest exists only as a pending invitation within the organization system. The guest state is temporary and exists only until the invited email address either accepts the invitation by creating an account or the invitation expires. A guest's identity is limited to the email address used in the invitation. The guest is in a pre-registration state and cannot access any organizational features until account creation is complete. The pending invitation state indicates that an email address has been invited to join an organization but the recipient has not yet registered.

### Guest Permissions and Access

Guests have no system permissions within the organization platform. Guests cannot access any organizational data or features. Guests cannot view employees, projects, tasks, timelogs, timesheets, or any other organizational resources. Guests cannot perform any actions within the platform. Guests have no organizational access until they complete account registration. The lack of permissions means guests cannot read, create, update, or delete any data within the organization.

### Invitation Acceptance Flow

When a guest creates an account using the invited email address, they are automatically added to the organization with their assigned role. The invitation acceptance flow transitions the guest from unregistered status to registered member status. Upon successful account creation, the guest's temporary status is replaced with full member status in the organization. The system processes the pending invitation and associates the new user account with the inviting organization. The invitation is consumed during account creation and cannot be reused. If the invited email address already has an existing account, the user is immediately added to the organization without creating a duplicate account.

## member Actor

A member is a registered user who belongs to one or more organizations and has been assigned a role within each organization. Members have their identity defined by their user account and profile, which includes display name, avatar, and contact information. Each member is assigned exactly one role per organization, which determines their permissions and access boundaries. Members can switch between organizations they belong to without logging out, selecting which organization context to work in. The member's permissions are scoped strictly to their selected organization and cannot access data from other organizations. Members have access to features based on their assigned role, which can be one of the built-in roles (Owner, Manager, Employee) or a custom role. Role assignments can be changed by users with employee management permissions. Members retain their global profile across all organizations while having organization-specific role assignments.

### Member Identity

A member is a registered user who has created an account with email and password authentication. Each member has a unique identity defined by their user account, which includes email address and password credentials. The member's identity is global and persists across all organizations they belong to. Members have a user profile that contains display name, avatar image, and phone number. This profile is shared across all organizations the member belongs to and is not organization-specific. The member's identity remains constant regardless of which organization context they are currently working in.

### Organization Membership

Members can belong to multiple organizations simultaneously. Each organization maintains its own independent employee records for the member. When a member joins an organization, they are added as an employee with an organization-specific employee record. This employee record includes role assignment, department, position, employment type, and status. A member's membership in an organization is independent of their membership in other organizations. Members can view which organizations they belong to and can switch between them without logging out. When switching organizations, the member's selected organization context determines which data they can access.

### Role Assignment

Each member is assigned exactly one role per organization. This role determines the member's permissions and access boundaries within that organization. Organizations have three built-in roles: Owner, Manager, and Employee. These built-in roles cannot be deleted or modified. Organization owners can create custom roles with specific permission sets. Each custom role has a name and a set of permissions selected from available permissions. Members can be assigned either built-in roles or custom roles. Role assignment is managed by users with employee management permissions. When a member is invited to an organization, they are assigned a role as part of the invitation process.

### Permission Model

Permissions are granted to members through their assigned role. Available permissions include: org:manage for editing organization settings, employee:manage for adding and editing employees, employee:view for viewing employee information, project:manage for managing projects and tasks, project:view for viewing projects, time:manage for editing any employee's time logs, time:approve for approving timesheets, time:view_all for viewing all time data, and report:view for accessing reports. Built-in roles have predefined permission sets: Owner has all permissions, Manager has permissions to manage employees, projects, and approve timesheets, and Employee has permissions to track time and view own data. Custom roles can be configured with any combination of available permissions. A member's effective permissions are determined by their current role in their selected organization.

### Organization Context

Members must select an organization context when logging in or switching organizations. All system actions and data access are scoped to the currently selected organization. Members cannot access data from organizations they do not belong to. Members cannot access data from other organizations even if they belong to multiple organizations. The organization context is maintained during the session until the member switches to a different organization. When a member switches organizations, their permissions and access boundaries change based on their role in the new organization. The member's global profile remains accessible regardless of organization context, but all other data is organization-specific.

### Role Change

A member's role within an organization can be changed by users with employee management permissions. When a role is changed, the member's permissions are immediately updated to reflect the new role. Role changes do not affect the member's employee record attributes such as department, position, or employment type. Members can have different roles in different organizations they belong to. Changing a member's role does not require the member to log out or re-authenticate. The member retains access to the organization after a role change unless the new role has no permissions for a specific feature.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address and password.

During initial sign-up, users must create an organization. The organization name is required.

When a user registers with an email address that has a pending invitation to an organization, the user is automatically added to that organization upon successful registration.

If the email address is already registered, the registration request is rejected.

Upon successful registration, the user becomes the owner of the newly created organization.

Users who are invited to an organization but do not yet have an account must register with the invited email address to accept the invitation.

### User Login

Users can log in by providing their email address and password.

If the email address is not registered, the login request is rejected.

If the password is incorrect, the login request is rejected.

After successful authentication, users who belong to multiple organizations must select which organization to work in.

If a user belongs to only one organization, that organization is automatically selected.

Once an organization is selected, all subsequent actions are scoped to that organization.

Users can switch to a different organization they belong to without logging out.

### Authentication and Password Management

Users can change their password after logging in.

To change a password, users must provide their current password and a new password.

If the current password is incorrect, the password change request is rejected.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user logs in, the system creates a session that maintains the user's authenticated state.

Each session is associated with a specific organization context. The user selects which organization to work in during login, and all subsequent actions are scoped to that organization.

Users can switch to a different organization without logging out. When switching organizations, the session remains active but the organization context changes to the newly selected organization.

Users who belong to multiple organizations can only access data and features for their currently selected organization context.

### Logout

Users can log out from the system at any time.

When a user logs out, their session is terminated and they are no longer authenticated.

After logout, the user must log in again to access any system features.

Logging out clears the organization context and requires the user to select an organization upon the next login.

If a user has active timers when logging out, the timers continue running independently of the session.

### Account Security

Users can change their password at any time while logged in.

If a user is the sole owner of an organization and wishes to delete their account, they must first transfer ownership or delete the organization.

When a user deletes their account, their employee records in other organizations are marked as deactivated.

When a user deletes their account, they can still log in to other organizations they belong to.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create a new account by providing an email address and password during initial sign-up.

When creating an account, users simultaneously create a new organization and become its owner.

The email address must be unique across all existing accounts in the system.

If the email address is already registered, the account creation request is rejected.

Upon successful account creation, the user is automatically logged in and associated with the newly created organization.

Users who received an organization invitation with an unregistered email address can create an account using that email.

When a user creates an account with an email that has pending organization invitations, they are automatically added to those organizations upon completion of sign-up.

### Account Deletion

Users can delete their own account at any time.

If the user is the sole owner of an organization, they must either transfer ownership to another employee or delete the organization before deleting their account.

When an account is deleted, all employee records for that user in other organizations are automatically marked as deactivated.

Deactivated employee records preserve all historical data including timelogs and timesheets.

The user's global profile information is permanently removed when the account is deleted.

After account deletion, the email address becomes available for new account registration.

### Password Change

Users can change their password at any time after account creation.

To change a password, users must provide their current password and a new password.

If the current password is incorrect, the password change request is rejected.

When a password is successfully changed, the user remains logged in with the same session.

All active sessions for the user remain valid after a password change.

Users can change their password through the account settings interface.