**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

A guest is an unauthenticated user who has not yet created an account or logged in. Guests can initiate the registration process to create a new account but cannot access any protected features. They are unable to view, search, or interact with any todos—including their own since none exist yet. Guests cannot view profile details, edit account settings, or access the trash. All actions requiring authentication are restricted until the guest completes registration and verifies their email. Registration attempts are subject to security measures to prevent abuse. Guests may attempt to log in after successful registration. Guest status persists until a verified account is created.

### Guest Status

A guest is an unauthenticated user who has not yet created an account or logged in.

THE system SHALL treat any user without active authentication as a guest.
WHEN a user is in guest status, THE system SHALL prevent access to all protected features.
WHEN a guest attempts to access a protected resource, THE system SHALL redirect to the registration or login flow.

### Registration Access

Guests may initiate account registration to become members.

WHEN a guest initiates registration, THE system SHALL provide a registration form.
THE system SHALL require email address and password for registration.
WHEN registration is initiated, THE system SHALL send a verification email.
IF the email address is already in use, THE system SHALL reject the registration request.

### No Todo Visibility

Guests cannot view, search, or interact with any todos—including their own since none exist yet.

WHEN a guest attempts to view any todo list, THE system SHALL reject the request.
WHEN a guest attempts to view a single todo, THE system SHALL reject the request.
WHEN a guest attempts to filter or sort todos, THE system SHALL reject the request.
THE system SHALL not expose any todo data to guests under any circumstances.

### No Profile Access

Guests cannot view profile details.

WHEN a guest attempts to view a profile, THE system SHALL reject the request.
WHEN a guest attempts to edit profile information, THE system SHALL reject the request.
THE system SHALL not expose any profile data to guests under any circumstances.

### Restricted Permissions

Guests have severely limited permissions by design.

Guests can only register for a new account.
Guests can only attempt to log in after successful registration.
Guests cannot view, create, edit, complete, delete, or restore todos.
Guests cannot view their own profile or any other user's profile.
Guests cannot access the trash or edit history.

### Account Creation

Account creation transitions a guest to a member role.

WHEN a guest completes registration, THE system SHALL create a new account.
WHEN a new account is created, THE system SHALL create an associated profile.
WHEN account creation succeeds, THE system SHALL send verification email.
WHEN the guest verifies their email address, THE system SHALL transition them to member status.

### Email Verification Prerequisite

Account creation is incomplete until email verification is confirmed.

WHEN a guest attempts to log in before email verification, THE system SHALL reject the login request.
THE system SHALL mark newly created accounts as "unverified" until email verification is completed.
WHEN an unverified account remains inactive for 24 hours, THE system SHALL purge the account.

### Login Initiation

After successful registration and email verification, guests can become members through login.

WHEN a guest submits valid credentials, THE system SHALL authenticate them and transition to member status.
WHEN a guest submits invalid credentials, THE system SHALL reject the login request.
WHEN a guest attempts to log in, THE system SHALL validate email format and password correctness.

## member Actor

A member is an authenticated user with a verified account who can fully manage their personal todo data. Members can create new todos with a title, description, and optional dates. They can view paginated lists of their own todos, filter by completion status, and sort by creation, start, or due date. Members can complete, incomplete, edit, and delete their own todos. Deleted todos move to a private trash area, where members can restore them or permanently delete them (including history). Members can edit their display name and change their password. They can also delete their entire account, which permanently removes all todos, including those in trash. Privacy is strictly enforced: members cannot view, search, or infer any other users' data or existence.

### Authenticated Access

WHEN a member accesses the system, THE system SHALL require valid authentication credentials.
WHILE authenticated, THE system SHALL allow a member to perform only operations permitted for their role.
WHEN authentication fails, THE system SHALL reject the request and prevent access to protected resources.
THE system SHALL maintain session state only for authenticated members.

### Own Todo Management

WHEN a member creates a todo, THE system SHALL associate it with their user account.
WHEN a member views their todo list, THE system SHALL include only todos owned by them.
WHEN a member edits a todo, THE system SHALL update only the specified fields while preserving history.
WHEN a member completes or incompletes a todo, THE system SHALL toggle only their own todo's status.
WHEN a member deletes a todo, THE system SHALL move only their own todo to trash.

### Profile Editing

WHEN a member updates their profile, THE system SHALL allow changing only their display name.
IF the display name is missing, THE system SHALL reject the update request.
IF the display name exceeds 100 characters, THE system SHALL reject the update request.
WHEN a member views their profile, THE system SHALL show only their own display name.

### Password Change

WHEN a member requests a password change, THE system SHALL require the current password and a new password.
IF the current password is incorrect, THE system SHALL reject the password change request.
WHEN a member successfully changes their password, THE system SHALL invalidate existing sessions and require re-authentication.

### Account Deletion

WHEN a member requests account deletion, THE system SHALL permanently remove all their todos, including those in trash.
WHEN account deletion completes, THE system SHALL also permanently delete the member's edit history entries.
WHEN account deletion completes, THE system SHALL also permanently delete the member's profile data.
WHEN account deletion completes, THE system SHALL terminate all active sessions for that member.

### Privacy Enforcement

WHEN a member requests any resource, THE system SHALL ensure they can only see their own data.
IF a member attempts to access another user's todo, THE system SHALL reject the request.
IF a member attempts to view another user's profile, THE system SHALL reject the request.
THE system SHALL not expose any information about other users, including their existence or activity.

### Trash Management

WHEN a member deletes a todo, THE system SHALL move it to their private trash folder.
WHEN a member views trash, THE system SHALL include only their own deleted todos in the list.
WHEN a member restores a todo from trash, THE system SHALL return only their own todo to the active list.
WHEN a member permanently deletes a todo from trash, THE system SHALL remove only their own todo and its edit history.

### Completion Status Filtering

WHEN a member filters their todo list by completion status, THE system SHALL apply the filter only to their own todos.
IF filtering by 'complete', THE system SHALL show only completed todos owned by the member.
IF filtering by 'incomplete', THE system SHALL show only incomplete todos owned by the member.
IF filtering by 'all', THE system SHALL show all todos owned by the member regardless of status.

### Customizable Sorting

WHEN a member sorts their todo list by creation date, THE system SHALL order their own todos accordingly.
IF sorting by start date, THE system SHALL place todos without a start date at the end of the list.
IF sorting by due date, THE system SHALL place todos without a due date at the end of the list.
WHEN sorting by any date field, THE system SHALL support both ascending and descending order for the member's own todos.

## admin Actor

The admin actor exists as a defined role but has no elevated permissions beyond those of a regular member in this private todo application. Like members, admins can manage their own todos—create, view, edit, complete, delete—and access their own profile and trash. Critically, admins cannot view, search, or access any other users' data—including other members' todos, profiles, or account details—due to strict privacy enforcement. There are no system-wide administrative functions such as user management, audit logging access, or global data viewing available in this system. The admin role is functionally identical to the member role for all practical purposes.

### Admin Actor Role and Capabilities

The admin actor has identical business capabilities to the member actor with no elevated permissions in this private todo application.

WHEN an admin actor accesses the system, THE system SHALL:
1. Grant authentication and session management identical to member actors
2. Allow management of the admin's own todos (create, view, edit, complete, delete)
3. Enable editing of the admin's own profile display name
4. Permit changing the admin's own password
5. Allow deletion of the admin's own account (including cascading deletion of all todos)
6. Enable viewing of the admin's own trash and restoring or permanently deleting items

The admin actor has NO additional privileges beyond those granted to member actors.

IF any system operation would expose data belonging to another user, THE system SHALL reject the request regardless of actor type.

The admin actor has no access to user management functions, audit logging, or system-wide data views in this privacy-preserving design.

The admin actor can only view, edit, and manage todos that belong to their own user account.

The admin actor cannot view, search, filter, or access any todos belonging to other users in the system.

The admin actor cannot view or access any user profile other than their own.

All admin actions are logged only for the admin's own activity, not for other users' activities.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a user registers, THE system SHALL:
1. Accept a unique email address
2. Accept a password meeting minimum complexity requirements
3. Require confirmation of the password
4. Store the password securely (hashed)
5. Automatically create a profile with the provided email

IF the email is already registered, THE system SHALL reject the registration.
IF the password does not meet complexity requirements, THE system SHALL reject the registration.
IF the password confirmation does not match, THE system SHALL reject the registration.

A newly registered user is authenticated automatically and receives a valid session.

### User Login

WHEN a user attempts to sign in, THE system SHALL:
1. Accept the user's email address
2. Accept the user's password
3. Verify the credentials against stored credentials
4. Issue a session token upon successful verification

IF the email does not exist, THE system SHALL reject the request.
IF the password does not match the stored credential, THE system SHALL reject the request.

THE system SHALL NOT reveal whether the email exists or the password is incorrect in error messages to prevent user enumeration.

### Authentication

WHEN a user authenticates, THE system SHALL:
1. Validate the email and password credentials
2. Verify the account is not suspended or deleted
3. Create an active session
4. Issue a secure authentication token

WHILE a user has an active session, THE system SHALL:
1. Accept requests authenticated with the session token
2. Maintain session validity until explicitly terminated
3. Refresh session tokens according to token policy

IF a session expires or is revoked, THE system SHALL reject subsequent requests using that token.
IF a user attempts to access resources while unauthenticated, THE system SHALL reject the request with appropriate error.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Authentication

WHEN a user logs in successfully, THE system SHALL issue a JWT token that contains: the user's unique identifier, role (guest/member/admin), and timestamp of issue.

WHEN a user makes a request requiring authentication, THE system SHALL validate the JWT token's signature and expiration.

WHILE a valid JWT token is presented, THE system SHALL treat the user as authenticated and grant access to member-level resources.

WHEN a user's session expires, THE system SHALL reject subsequent requests until re-authentication occurs.

THE system SHALL store session tokens securely on the client and never expose them in logs or error messages.

### Token Structure and Validity

THE system SHALL generate JWT tokens with the following claims: user_id, role, iat (issued at), and exp (expiration time).

JWT tokens SHALL include a unique token identifier (jti) to support revocation.

THE system SHALL set the default token expiration time to 30 minutes from issue.

WHEN token validation fails due to invalid signature, THE system SHALL reject the request without revealing the specific failure reason.

WHEN token validation fails due to expiration, THE system SHALL return an error indicating the session has expired.

### Token Refresh Mechanism

WHEN a user's JWT token is nearing expiration (within 10 minutes), THE system SHALL allow the user to request a token refresh.

WHEN a token refresh request is made with a valid, non-expired token, THE system SHALL issue a new JWT token with a renewed expiration time.

THE system SHALL invalidate the old refresh token when a new token is issued.

WHEN a token refresh request is made with an expired token, THE system SHALL reject the request and require re-authentication.

THE system SHALL limit refresh requests to a maximum of 5 per hour per session to prevent abuse.

### Session Expiration Behavior

WHEN a user's session expires, THE system SHALL automatically redirect the user to the login page.

WHEN a user attempts to perform an action after session expiration, THE system SHALL reject the request and indicate the session has expired.

THE system SHALL clear all client-side session tokens upon explicit logout.

WHEN a user logs in from a new device or browser, THE system SHALL invalidate previous sessions for that user.

THE system SHALL record session expiration events for security audit purposes.

### Token Invalidation and Security

WHEN a user logs out, THE system SHALL invalidate the current session token immediately.

WHEN a user changes their password, THE system SHALL invalidate all active sessions and require re-authentication on all devices.

WHEN a user deletes their account, THE system SHALL invalidate all active session tokens for that user.

WHEN suspicious activity is detected (multiple failed token validations), THE system SHALL temporarily block token generation for the affected account.

THE system SHALL implement token rotation where each refresh request generates a new token and invalidates the previous one.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL support the following account states: active, suspended, and permanently deleted.

WHEN a user completes registration, THE system SHALL set the account state to active.

WHEN an admin suspends an account, THE system SHALL set the account state to suspended.

WHEN a user initiates account deletion, THE system SHALL set the account state to permanently deleted after the required confirmation period.

### Active State

WHILE an account is in the active state, THE system SHALL allow the user to:
1. Log in to their account
2. Create, view, edit, and delete their todos
3. Edit their profile information
4. Change their password

THE system SHALL allow all active users to access their own todo list with filtering and sorting capabilities.

### Suspended State

WHEN an account is suspended, THE system SHALL:
1. Prevent the user from logging in
2. Invalidate all active sessions and tokens
3. Preserve all user data (todos, profiles, edit history)

WHILE an account is suspended, THE system SHALL NOT allow the user to:
1. Access any part of the application
2. View or edit their todos
3. Perform any actions that require authentication

WHEN an admin reinstates a suspended account, THE system SHALL set the account state back to active.

### Permanently Deleted State

WHEN an account is permanently deleted, THE system SHALL:
1. Permanently remove all user data including todos, profiles, and edit history
2. Invalidate all sessions and tokens
3. Remove the account from all authentication systems

WHEN a user account transitions to permanently deleted, THE system SHALL NOT preserve any data associated with that account.

IF a user attempts to log in with a permanently deleted account, THE system SHALL reject the authentication request.

### Account Deactivation

WHEN a user requests account deactivation, THE system SHALL:
1. Present the user with deactivation confirmation
2. After confirmation, transition the account to permanently deleted state
3. Promptly begin the data removal process

WHEN account deactivation is initiated by the user, THE system SHALL require explicit confirmation before proceeding with deletion.