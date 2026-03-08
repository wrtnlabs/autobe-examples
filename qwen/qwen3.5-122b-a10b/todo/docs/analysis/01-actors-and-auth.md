**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are unauthenticated visitors who have not yet created an account or signed in to the application. Guests cannot access any todo functionality or view any todo-related content. Guests may browse the public landing page to learn about the application features and benefits. To use any application features, guests must first register for a new account or log in with existing credentials. Guest sessions do not persist any data or preferences across page visits. The system treats all guest requests as anonymous and does not associate them with any user identity. Guest access is intentionally limited to encourage registration while still allowing potential users to explore the application.

### Guest Access and Capabilities

### Guest Access and Capabilities

THE system SHALL treat all unauthenticated visitors as guest actors.

WHEN a guest visits the application, THE system SHALL provide access to the public landing page.

WHEN a guest accesses the public landing page, THE system SHALL display application features and benefits.

WHEN a guest attempts to access any todo-related functionality, THE system SHALL deny access.

WHEN a guest attempts to view a todo list, THE system SHALL reject the request.

WHEN a guest attempts to view a single todo, THE system SHALL reject the request.

WHEN a guest attempts to create a todo, THE system SHALL reject the request.

WHEN a guest attempts to edit a todo, THE system SHALL reject the request.

WHEN a guest attempts to delete a todo, THE system SHALL reject the request.

WHEN a guest attempts to access the trash, THE system SHALL reject the request.

WHEN a guest attempts to view edit history, THE system SHALL reject the request.

THE system SHALL not associate guest requests with any user identity.

THE system SHALL not store any todo data for guest sessions.

THE system SHALL not persist guest preferences across page visits.

Guests SHALL be able to learn about the application without creating an account.

Guests SHALL be able to view feature descriptions on the landing page.

Guests SHALL be able to understand the benefits of the application before registering.

### Session Management for Guests

WHEN a guest initiates a session, THE system SHALL treat it as anonymous.

WHEN a guest makes a request, THE system SHALL not associate it with a user account.

WHEN a guest navigates between pages, THE system SHALL not persist any session data.

WHEN a guest closes the browser, THE system SHALL terminate the anonymous session.

THE system SHALL not store any user-specific data for guest sessions.

THE system SHALL not remember guest navigation history across visits.

THE system SHALL not save guest form inputs or selections.

THE system SHALL treat each guest page visit as a fresh session.

### Registration and Login Triggers

WHEN a guest attempts to access protected todo features, THE system SHALL prompt for registration or login.

WHEN a guest clicks on a todo feature link, THE system SHALL display a login prompt.

WHEN a guest attempts to create their first todo, THE system SHALL require account registration.

WHEN a guest has an existing account, THE system SHALL offer the login option.

WHEN a guest does not have an account, THE system SHALL offer the registration option.

WHEN a guest successfully registers, THE system SHALL transition them to the member actor.

WHEN a guest successfully logs in, THE system SHALL transition them to the member actor.

WHEN a guest abandons the registration process, THE system SHALL return them to the landing page.

WHEN a guest abandons the login process, THE system SHALL return them to the landing page.

THE system SHALL clearly communicate that registration is required to use todo features.

THE system SHALL clearly communicate that login is required for existing users.

THE system SHALL not allow guests to bypass the authentication requirement.

### Guest Session Management

### Guest Session Management

WHEN a guest accesses the application, THE system SHALL create an anonymous session.

WHEN a guest navigates the landing page, THE system SHALL not store navigation history.

WHEN a guest submits a form without authentication, THE system SHALL reject the submission.

WHEN a guest session expires, THE system SHALL clear any temporary data.

THE system SHALL not persist guest session data to storage.

THE system SHALL not associate guest activity with any user identifier.

THE system SHALL not track guest preferences across sessions.

THE system SHALL treat all guest requests as stateless interactions.

### Authentication Prompt Scenarios

### Authentication Prompt Scenarios

WHEN a guest attempts to create a todo, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to view the todo list, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to mark a todo as complete, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to edit a todo, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to delete a todo, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to access the trash, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to view edit history, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to filter todos, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to sort todos, THE system SHALL display a registration or login prompt.

WHEN a guest attempts to paginate through todos, THE system SHALL display a registration or login prompt.

THE system SHALL provide a clear path to registration for new users.

THE system SHALL provide a clear path to login for existing users.

THE system SHALL explain why authentication is required before showing the prompt.

THE system SHALL preserve the user's intended action after successful authentication.

## member Actor

Members are authenticated users who have successfully registered and logged into the application. Members can create, view, complete, edit, and delete their own todos. Members can manage their profile by updating their display name at any time. Members can change their password to maintain account security. Members can delete their account, which permanently removes all their todos and edit history. Members can restore deleted todos from the trash or permanently remove them. Members can filter and sort their todo list by various criteria. Members can view the complete edit history for any of their todos. Members cannot view, access, or share another member's todos under any circumstances. Each member's data is completely isolated and private from all other members. Members maintain full ownership and control over their todo data throughout their account lifecycle.

### Member Authentication & Session

WHEN a member registers with email and password, THE system SHALL create an authenticated user account.
WHEN a member logs in with email and password, THE system SHALL establish an authenticated session.
WHILE a member has an active session, THE system SHALL allow access to all member features.
WHEN a member's session expires, THE system SHALL require re-authentication.
WHEN a member changes their password, THE system SHALL invalidate all existing sessions and require re-login.

THE system SHALL maintain session state for authenticated members.
THE system SHALL provide session refresh capability for active members.
THE system SHALL enforce single active session policy per member account.

### Todo Creation

WHEN a member creates a todo, THE system SHALL require a title.
WHEN a member creates a todo, THE system SHALL allow an optional description.
WHEN a member creates a todo, THE system SHALL allow an optional start date.
WHEN a member creates a todo, THE system SHALL allow an optional due date.
WHEN a member creates a todo, THE system SHALL set the completion status to incomplete by default.
WHEN a member creates a todo, THE system SHALL associate the todo with the creating member.

IF a member attempts to create a todo without a title, THE system SHALL reject the request.
IF a member attempts to create a todo with a due date earlier than the start date, THE system SHALL reject the request.

### Todo Viewing & List Management

WHEN a member views their todo list, THE system SHALL display only todos belonging to that member.
WHEN a member views their todo list, THE system SHALL paginate the results.
WHEN a member views their todo list, THE system SHALL show title, completion status, start date (if set), due date (if set), and creation date for each todo.
WHEN a member views a single todo, THE system SHALL display all details including the full description.

WHEN a member filters by completion status, THE system SHALL show only todos matching the selected status (all, complete, or incomplete).
WHEN a member sorts by creation date, THE system SHALL order todos by newest first or oldest first.
WHEN a member sorts by start date, THE system SHALL order todos with earliest first or latest first, placing todos without a start date at the end.
WHEN a member sorts by due date, THE system SHALL order todos with earliest first or latest first, placing todos without a due date at the end.

### Todo Completion

WHEN a member marks a todo as complete, THE system SHALL update the completion status to complete.
WHEN a member marks a todo as incomplete, THE system SHALL update the completion status to incomplete.

THE system SHALL support toggling between complete and incomplete states.
THE system SHALL preserve all other todo details when changing completion status.

### Todo Editing & History

WHEN a member edits a todo's title, THE system SHALL record the change in edit history.
WHEN a member edits a todo's description, THE system SHALL record the change in edit history.
WHEN a member edits a todo's start date, THE system SHALL record the change in edit history.
WHEN a member edits a todo's due date, THE system SHALL record the change in edit history.

WHEN a member views a todo's edit history, THE system SHALL display all history entries sorted from most recent to oldest.
WHEN a member views edit history, THE system SHALL show the timestamp of each edit.
WHEN a member views edit history, THE system SHALL show what each field was changed to (if changed).

IF a member attempts to edit a todo they do not own, THE system SHALL reject the request.
IF a member attempts to edit a deleted todo, THE system SHALL reject the request.

### Todo Deletion & Trash

WHEN a member deletes a todo, THE system SHALL perform a soft delete and remove it from the normal todo list.
WHEN a member deletes a todo, THE system SHALL retain the todo in the trash with all its data intact.

WHEN a member views their trash, THE system SHALL display only deleted todos belonging to that member.
WHEN a member views their trash, THE system SHALL paginate the results.

WHEN a member restores a deleted todo from trash, THE system SHALL return it to the normal todo list with all data intact.
WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo and all its edit history permanently.

IF a member attempts to restore a todo that does not exist in trash, THE system SHALL reject the request.
IF a member attempts to permanently delete a todo they do not own, THE system SHALL reject the request.

### Profile Management

WHEN a member views their profile, THE system SHALL display their display name.
WHEN a member edits their display name, THE system SHALL update the profile.
WHEN a member changes their password, THE system SHALL update the authentication credentials.

IF a member attempts to view another member's profile, THE system SHALL deny access.
IF a member attempts to edit a display name exceeding the allowed length, THE system SHALL reject the request.

### Account Deletion

WHEN a member deletes their account, THE system SHALL permanently remove all todos including those in trash.
WHEN a member deletes their account, THE system SHALL permanently remove all edit history associated with their todos.
WHEN a member deletes their account, THE system SHALL remove the member's profile and authentication credentials.

THE system SHALL require confirmation before processing account deletion.

IF a member attempts to delete their account while having active sessions, THE system SHALL terminate all sessions upon successful deletion.

### Data Privacy & Ownership

THE system SHALL ensure each member can only view, access, and modify their own todos.
THE system SHALL ensure each member's todos are completely private from all other members.

WHEN a member accesses any todo operation, THE system SHALL verify ownership before allowing the operation.
WHEN a member attempts to access another member's data, THE system SHALL deny the request.

THE system SHALL enforce data isolation at all access points.
THE system SHALL prevent any mechanism for sharing or viewing another member's todos.

THE system SHALL maintain member ownership of all created todos throughout the account lifecycle.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a guest registers for an account, THE system SHALL:
1. Require a valid email address
2. Require a password
3. Validate the email format
4. Ensure the email is not already registered
5. Create a new user account with the provided credentials
6. Automatically log the user in after successful registration

WHEN the email format is invalid, THE system SHALL reject the registration request.

WHEN the email is already registered, THE system SHALL reject the registration request with an appropriate error message.

WHEN the password does not meet security requirements, THE system SHALL reject the registration request.

WHEN registration succeeds, THE system SHALL create the user account and initiate an authenticated session.

### User Login

WHEN a user logs in, THE system SHALL:
1. Require email and password
2. Validate the email format
3. Verify the credentials match a registered account
4. Create an authenticated session
5. Return session credentials to the user

WHEN the email format is invalid, THE system SHALL reject the login request.

WHEN the credentials are invalid, THE system SHALL reject the login request without revealing whether the email exists.

WHEN the account has been deleted, THE system SHALL reject the login request.

WHEN login succeeds, THE system SHALL establish an authenticated session for the user.

### Password Change

WHEN an authenticated user changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password
3. Validate the new password meets security requirements
4. Ensure the new password is different from the current password
5. Update the user's password in the system

WHEN the current password is incorrect, THE system SHALL reject the password change request.

WHEN the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN the new password is the same as the current password, THE system SHALL reject the password change request.

WHEN password change succeeds, THE system SHALL invalidate existing sessions and require re-authentication.

### Account Deletion

WHEN an authenticated user deletes their account, THE system SHALL:
1. Require password confirmation for verification
2. Permanently delete all todos belonging to the user
3. Permanently delete all edit history for those todos
4. Mark the user account as deleted
5. Invalidate all active sessions for the user

WHEN the password confirmation is incorrect, THE system SHALL reject the account deletion request.

WHEN account deletion succeeds, THE system SHALL permanently remove all user data including todos and edit history.

WHEN the account is deleted, THE system SHALL prevent any future login attempts with those credentials.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Management

THE system SHALL create a session when a user successfully authenticates.

WHEN a user logs in with valid credentials, THE system SHALL:
1. Create a new session for the user
2. Associate the session with the authenticated user account
3. Record the session creation timestamp
4. Issue authentication tokens to the user

WHEN a user logs out, THE system SHALL:
1. Invalidate the active session
2. Revoke all associated authentication tokens
3. Prevent further access to protected resources using the invalidated session

THE system SHALL maintain session state for authenticated users throughout the session lifetime.

WHILE a session is active, THE system SHALL allow the user to access protected resources without re-authentication.

THE system SHALL track session activity including:
- Session creation time
- Last activity timestamp
- Session status (active, expired, revoked)

IF a session is not found, THE system SHALL treat the request as unauthenticated.
IF a session is expired, THE system SHALL require the user to re-authenticate.
IF a session is revoked, THE system SHALL deny access and require re-authentication.

### JWT Token Policy

THE system SHALL issue JWT (JSON Web Token) tokens upon successful authentication.

WHEN a user authenticates successfully, THE system SHALL:
1. Generate a JWT token containing user identification
2. Include the user ID in the JWT payload
3. Sign the JWT token using a secure cryptographic algorithm
4. Return the JWT token to the client for subsequent requests

THE system SHALL include the following claims in each JWT token:
- User identifier (user ID)
- Token issuance timestamp
- Token expiration timestamp
- Token type identifier

WHEN validating a JWT token, THE system SHALL:
1. Verify the token signature is valid
2. Check that the token has not expired
3. Confirm the token belongs to the requesting user
4. Reject tokens with invalid signatures

IF a JWT token has an invalid signature, THE system SHALL reject the request.
IF a JWT token is malformed, THE system SHALL reject the request.
IF a JWT token is missing required claims, THE system SHALL reject the request.

THE system SHALL NOT store JWT tokens in the database (stateless validation).

THE system SHALL use industry-standard JWT libraries for token generation and validation.

### Token Refresh Mechanism

THE system SHALL support token refresh to maintain user sessions without requiring re-authentication.

WHEN a JWT token is approaching expiration, THE system SHALL allow the client to request a new token.

WHEN a token refresh request is received, THE system SHALL:
1. Validate the refresh token or current JWT token
2. Verify the user session is still active
3. Issue a new JWT token with updated expiration
4. Invalidate the previous token (if applicable)

THE system SHALL issue a new JWT token upon successful token refresh.

WHEN a token refresh fails, THE system SHALL:
1. Require the user to re-authenticate with credentials
2. Clear any cached tokens on the client side
3. Return an appropriate error indicating re-authentication is required

IF the user session has expired, THE system SHALL reject the token refresh request.
IF the user session has been revoked, THE system SHALL reject the token refresh request.
IF the refresh token is invalid, THE system SHALL reject the request.

THE system SHALL limit the number of consecutive token refresh attempts to prevent abuse.

THE system SHALL provide clear error messages when token refresh fails.

### Session Expiration Rules

THE system SHALL enforce session expiration policies to ensure security.

THE system SHALL expire sessions after a defined period of inactivity (session timeout).

THE system SHALL expire sessions after a maximum absolute duration from creation (absolute timeout).

WHEN a session expires due to inactivity, THE system SHALL:
1. Invalidate the session
2. Revoke all associated tokens
3. Require the user to re-authenticate to continue

WHEN a session expires due to absolute timeout, THE system SHALL:
1. Invalidate the session regardless of activity
2. Revoke all associated tokens
3. Require the user to re-authenticate to continue

WHEN a session expires, THE system SHALL:
1. Prevent access to protected resources
2. Redirect or return an error indicating session expiration
3. Provide clear feedback that re-authentication is required

THE system SHALL provide users with warning before session expiration (optional feature).

IF a request is made with an expired session, THE system SHALL return an authentication error.
IF a request is made with an expired JWT token, THE system SHALL return a token expiration error.

THE system SHALL NOT extend session expiration beyond the maximum absolute timeout.

THE system SHALL apply the same expiration policies to all user sessions uniformly.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States and Transitions

### Account States

THE system SHALL maintain the following account states for each user:

1. **Active** - The default state after successful registration
2. **Deleted** - The state after permanent account deletion

WHEN a user successfully registers, THE system SHALL set their account state to Active.

WHEN a user deletes their account, THE system SHALL set their account state to Deleted.

### Account State Transitions

WHEN a user is in the Active state, THE system SHALL allow the following transitions:
- Active → Deleted (via account deletion)

WHEN a user is in the Deleted state, THE system SHALL NOT allow any state transitions.

A Deleted account cannot be reactivated or restored.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
1. Set the account state to Deleted
2. Permanently delete all todos owned by the user (including those in trash)
3. Permanently delete all edit history associated with the user's todos
4. Invalidate all active sessions for the user
5. Prevent any future login attempts with the deleted account

IF the account is already in the Deleted state, THE system SHALL reject the deletion request.

### Account Deactivation

THE system SHALL NOT support temporary account deactivation or suspension.

Users may only permanently delete their accounts; there is no temporary disable or suspend functionality.

### Session Invalidations

WHEN an account transitions to Deleted state, THE system SHALL:
1. Immediately invalidate all active sessions
2. Prevent any new session creation for the deleted account
3. Return authentication errors for any requests using invalidated tokens

### Account Lifecycle Management

### Account Lifecycle Events

WHEN a user completes registration, THE system SHALL:
1. Create a new User record with Active state
2. Initialize the account with the provided email and password
3. Set the createdAt timestamp
4. Allow immediate login

WHEN a user logs in, THE system SHALL:
1. Verify the account is in Active state
2. Create a new session
3. Issue authentication tokens

IF the account is in Deleted state, THE system SHALL reject the login attempt.

### Account State Verification

WHEN processing any user action, THE system SHALL verify the account is in Active state.

IF the account is not in Active state, THE system SHALL reject the request with an appropriate error.

### Email Uniqueness After Deletion

WHEN an account is deleted, THE system SHALL release the email address for future registration.

A new user MAY register with an email address that was previously used by a deleted account.

### Profile Visibility During Lifecycle

WHILE an account is in Active state, THE system SHALL allow the user to view and edit their own profile.

WHEN an account is in Deleted state, THE system SHALL NOT allow any profile access.

THE system SHALL NOT allow users to view other users' profiles at any time (privacy requirement).

### Account Deletion Process

### Deletion Confirmation

WHEN a user requests account deletion, THE system SHALL require explicit confirmation.

THE system SHALL present a warning that:
1. All todos will be permanently deleted
2. All trash items will be permanently deleted
3. All edit history will be permanently deleted
4. This action cannot be undone

IF the user does not confirm, THE system SHALL NOT proceed with deletion.

### Deletion Timing

WHEN account deletion is confirmed, THE system SHALL process the deletion immediately.

THE system SHALL NOT delay or schedule account deletion for later processing.

### Data Retention After Deletion

WHEN an account is deleted, THE system SHALL NOT retain any user data.

All associated data (todos, trash, history) SHALL be permanently removed from the system.

### Audit Trail for Deletion

WHEN an account is deleted, THE system SHALL record the deletion event.

THE deletion record SHALL include:
1. The timestamp of deletion
2. The user ID (before permanent removal)

This audit record SHALL be kept separately from user data for compliance purposes.