**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are users who have not yet authenticated into the application. They can browse the application interface but cannot access any protected todo functionality. Guests can navigate to registration and login pages to create an account or sign in. They cannot view, create, edit, or delete any todos while in guest status. All todo operations require authentication before they can be performed. Guest access is limited to public-facing pages that introduce the application. Once a user registers or logs in, their guest status transitions to a member with full application access.

### Unauthenticated Visitor Access

WHEN a user visits the application without authentication, THE system SHALL display the public landing page.

WHEN an unauthenticated visitor accesses the application, THE system SHALL provide browse-only access to public-facing content.

THE system SHALL prevent unauthenticated visitors from accessing any protected todo functionality.

WHILE a user remains in unauthenticated state, THE system SHALL restrict all operations to the public interface only.

IF a user attempts to access protected functionality while unauthenticated, THE system SHALL redirect to the login page.

### Registration Page Access

WHEN a guest accesses the registration page, THE system SHALL display the account creation form.

THE system SHALL allow any unauthenticated user to navigate to the registration page.

WHEN a user completes the registration form with email and password, THE system SHALL create a new user account.

IF the registration form is submitted with valid email and password, THE system SHALL transition the user from guest to member status.

IF the email is already registered, THE system SHALL reject the registration and display an error message.

### Login Page Access

WHEN a guest accesses the login page, THE system SHALL display the sign-in form.

THE system SHALL allow any unauthenticated user to navigate to the login page.

WHEN a user enters their email and password in the login form, THE system SHALL authenticate the credentials.

IF the email and password match an existing account, THE system SHALL transition the user from guest to member status.

IF the credentials are invalid, THE system SHALL display an appropriate error message without revealing which field failed.

### Guest Creation Restrictions

WHEN a guest attempts to create a todo, THE system SHALL reject the request.

THE system SHALL require authentication before allowing todo creation operations.

IF a user is not authenticated, THE system SHALL prevent creation of any todos regardless of the action attempted.

WHEN a guest attempts todo creation, THE system SHALL display a message requiring login before proceeding.

EVERY todo creation operation SHALL require the user to have member status before execution.

### Guest Viewing Restrictions

WHEN a guest attempts to view todos, THE system SHALL reject the request.

THE system SHALL require authentication before allowing any todo viewing operations.

IF a user is not authenticated, THE system SHALL prevent viewing of any todos.

WHEN a guest attempts to access the todo list, THE system SHALL redirect to the login page.

EVERY todo viewing operation SHALL require the user to have member status before execution.

### Guest to Member Transition

WHEN a guest successfully registers with valid email and password, THE system SHALL transition the user from guest to member status.

WHEN a guest successfully logs in with valid credentials, THE system SHALL transition the user from guest to member status.

AFTER successful registration or login, THE system SHALL grant the user full application access.

UPON transition to member status, THE system SHALL allow the user to perform all member operations including creating, viewing, editing, and managing todos.

WHEN transitioning from guest to member, THE system SHALL maintain user session state for continued application access.

### Public Interface Access

WHEN a guest accesses the application, THE system SHALL display the public landing page.

THE system SHALL allow unauthenticated users to view the public interface without restrictions.

WHEN a guest browses the public interface, THE system SHALL provide information about the application without requiring authentication.

THE system SHALL ensure all public-facing content is accessible to guests without authentication.

GUESTS SHALL ONLY have access to pages explicitly marked as public, with all todo functionality requiring member status.

## member Actor

Members are authenticated users who have successfully registered and logged into the application. They have full access to create, view, edit, and delete their own todos. Each member's todos remain completely private and invisible to other users. Members can view their todos in a paginated list with filtering and sorting options. They can complete or mark todos as incomplete through a simple toggle action. Members can edit todo details including title, description, start date, and due date. Every edit creates an entry in the todo's edit history. Members can delete todos which moves them to trash instead of permanent deletion. They can restore deleted todos from the trash or permanently remove them. Members can manage their account by changing passwords, updating display names, or deleting their entire account. The trash feature allows recovery of accidentally deleted items within a reasonable timeframe. Account deletion permanently removes all todos including those in trash.

### Member Authentication and Access

WHEN a user logs in with valid email and password, THE system SHALL grant access to their private todo data.

THE authenticated member SHALL only access their own todos. No other user's todos are visible.

THE system SHALL reject access requests when the user is not authenticated.

THE system SHALL verify that todo belongs to the requesting member before returning any todo data.

WHEN a member views any todo, THE system SHALL confirm the member owns that todo.

### Private Todo Isolation

THE system SHALL ensure each user's todos are completely isolated from other users.

Members CANNOT view, access, or share another user's todos.

WHEN a user attempts to access another user's todo, THE system SHALL reject the request.

THE system SHALL enforce privacy isolation on all todo operations including viewing, editing, and deletion.

NO member shall have visibility into another member's todo list regardless of authentication status.

### Todo Creation

WHEN a member creates a todo, THE system SHALL require a title.

THE system SHALL allow an optional description that can be left empty.

THE system SHALL allow an optional start date that can be left empty.

THE system SHALL allow an optional due date that can be left empty.

NEWLY created todos SHALL be incomplete by default.

WHEN a todo is created, THE system SHALL associate it with the creating member.

IF the title is missing, THE system SHALL reject the todo creation request.

### Todo Viewing and Pagination

WHEN a member views their todo list, THE system SHALL display a paginated list of todos.

THE system SHALL show each todo's title, completion status, start date (if set), due date (if set), and creation date.

WHEN a member views a single todo, THE system SHALL display all details including the full description.

THE system SHALL paginate the todo list when the number of todos exceeds the page size.

THE system SHALL show todos without optional date fields (start date, due date) as empty values.

### Todo Filtering and Sorting

WHEN a member views their todo list, THE system SHALL allow filtering by completion status.

Members can filter to see: all todos, only complete todos, or only incomplete todos.

THE system SHALL allow sorting by creation date in newest-first or oldest-first order.

THE system SHALL allow sorting by start date in earliest-first or latest-first order.

THE system SHALL allow sorting by due date in earliest-first or latest-first order.

WHEN sorting by start date, todos without a start date SHALL appear at the end.

WHEN sorting by due date, todos without a due date SHALL appear at the end.

### Todo Completion Toggle

WHEN a member marks a todo as complete, THE system SHALL change its completion status to complete.

WHEN a member marks a todo as incomplete, THE system SHALL change its completion status to incomplete.

THIS is a simple toggle between two states: complete and incomplete.

THE system SHALL allow a member to toggle their own todo's completion status.

THE system SHALL prevent members from toggling completion status of todos they do not own.

### Todo Editing and History

WHEN a member edits a todo, THE system SHALL allow changes to title, description, start date, and due date.

EVERY time a todo is edited, THE system SHALL create a history entry.

Each history entry SHALL record: when the edit was made, what the title was changed to (if changed), what the description was changed to (if changed), what the start date was changed to (if changed), and what the due date was changed to (if changed).

MEMBERS SHALL be able to view the full edit history of any of their todos.

HISTORY entries SHALL be sorted from most recent to oldest.

THE system SHALL associate each edit history entry with the editing member.

### Todo Deletion and Trash

WHEN a member deletes a todo, THE system SHALL move it to trash instead of permanent deletion.

DELETED todos SHALL no longer appear in the normal todo list.

THE system SHALL allow members to view a list of their deleted todos (trash).

THE trash list SHALL be paginated.

WHEN a member restores a deleted todo from trash, THE system SHALL return it to the normal todo list.

THE system SHALL allow permanent deletion of todos from the trash.

WHEN a todo is permanently deleted from trash, THE system SHALL also delete its edit history.

### Account Management

WHEN a member manages their account, THE system SHALL allow password changes.

THE system SHALL allow members to update their display name.

THE system SHALL allow members to delete their entire account.

ACCOUNT deletion SHALL permanently delete all the member's todos, including those in trash.

Members CANNOT view other users' profiles as this is a private todo application.

THE system SHALL require current authentication for all account management actions.

### Password Management

WHEN a member changes their password, THE system SHALL update their password securely.

THE system SHALL require the member to provide their current password.

THE system SHALL require the member to provide a new password.

THE system SHALL require the member to confirm their new password matches.

THE system SHALL validate that the new password meets security requirements.

THE system SHALL prevent password reuse of recently used passwords.

WHEN password change succeeds, THE system SHALL invalidate existing sessions.

### Profile Management

WHEN a member updates their profile, THE system SHALL allow changing the display name.

EACH user has a profile with a display name.

THE system SHALL allow the member to update only their own display name.

THE display name SHALL be visible to the member who created it.

THE system SHALL allow an empty display name or a custom name.

THE system SHALL save the updated display name immediately upon submission.

### Account Deletion

WHEN a member requests account deletion, THE system SHALL permanently remove their account.

ACCOUNT deletion SHALL permanently delete all the member's todos.

ALL todos SHALL be deleted including those currently in trash.

EDIT history of all deleted todos SHALL be permanently removed.

THE system SHALL require explicit confirmation before deleting the account.

ACCOUNT deletion is irreversible and cannot be undone.

THE system SHALL verify the member is authenticated before processing deletion.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

### Email and Password Requirements

WHEN a user registers a new account, THE system SHALL:
1. Accept an email address and password as registration credentials
2. Ensure the email address follows valid email format
3. Ensure the password meets minimum complexity requirements
4. Create a new user account with the provided credentials

IF the email address is already registered, THE system SHALL reject the request and inform the user.
IF the email format is invalid, THE system SHALL reject the request and prompt the user to enter a valid email.
IF the password does not meet complexity requirements, THE system SHALL reject the request and indicate the requirements.

### Display Name Assignment

WHEN a user completes registration, THE system SHALL:
1. Prompt the user to provide a display name
2. Store the display name as part of the user profile
3. Use the display name for all user-facing operations

IF the display name is not provided during registration, THE system SHALL use a default generated name.

### Email Uniqueness Validation

THE system SHALL ensure that no two user accounts share the same email address.
THE system SHALL reject registration attempts where the email address already exists in the system.

### Guest to Member Transition

WHEN a guest provides valid registration credentials, THE system SHALL transition their account from guest to member status.
THE system SHALL grant the new member access to create and manage their personal todos.

### Account State After Registration

A newly registered account SHALL be in active state by default.
An active account SHALL have full access to all member permissions immediately after successful registration.

### User Login

### Credential Verification

WHEN a user attempts to log in, THE system SHALL:
1. Accept an email address and password as login credentials
2. Verify the credentials against stored user data
3. Grant access upon successful verification

IF the email address does not exist, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.

### Authentication Success

UPON successful credential verification, THE system SHALL:
1. Create an authenticated session for the user
2. Grant the user full member permissions
3. Allow the user to access their private todos

### Authentication Failure

THE system SHALL reject the login request when the user account does not exist.
THE system SHALL reject the login request when the provided password is incorrect.

### Session Initiation

WHEN login is successful, THE system SHALL establish a new authenticated session for the user.
The authenticated session SHALL grant the user access to member-only features.

### Guest Account Handling

GUESTS cannot log in with their guest account credentials.
GUESTS attempting to log in SHALL be directed to the registration page first.

### Login Session Creation

THE system SHALL create a new login session upon successful credential verification.
Each successful login SHALL establish a fresh session for the authenticated user.

### Authentication Token Management

### Token Generation

WHEN a user successfully logs in, THE system SHALL generate an authentication token.
The authentication token SHALL grant the user access to member-only features.

### Token Usage

WHILE a user is authenticated, THE system SHALL require a valid authentication token for all protected operations.
The authentication token SHALL be used to verify user identity on each request.

### Token Expiration

THE system SHALL enforce expiration on authentication tokens.
EXPIRED tokens SHALL be rejected for all protected operations.

### Session Termination

WHEN a token expires, THE system SHALL terminate the user's session.
THE system SHALL require the user to log in again to regain access.

### Token Security

THE system SHALL protect authentication tokens from unauthorized access.
THE system SHALL not expose tokens in error messages or logs.

### Token Revocation

WHEN a user logs out, THE system SHALL revoke the current authentication token.
THE revoked token SHALL no longer grant access to protected features.

### Refresh Token Policy

WHEN a token is nearing expiration, THE system SHALL allow the user to refresh the token without re-authentication.
THE refreshed token SHALL have the same expiration policy as the original token.

### Account Deletion

### Deletion Request Initiation

WHEN a member requests account deletion, THE system SHALL:
1. Verify the user's identity through credential re-authentication
2. Display a confirmation message warning of data loss
3. Require explicit confirmation before proceeding

IF the user cancels the deletion request, THE system SHALL preserve the account.
IF the user confirms deletion, THE system SHALL proceed with account deletion.

### Data Deletion Scope

UPON confirmed account deletion, THE system SHALL:
1. Permanently delete all todos associated with the account
2. Permanently delete all todos in the trash associated with the account
3. Permanently delete all edit history entries associated with the deleted todos
4. Remove the user account from the system

### Irreversible Deletion

ACCOUNT DELETION IS IRREVERSIBLE.
Once an account is deleted, THE system SHALL not provide any mechanism for recovery.

### Complete Data Purge

THE system SHALL ensure all data associated with the deleted account is permanently removed.
THE system SHALL not retain copies of deleted user data in backups or archives.

### Deletion Confirmation

THE system SHALL provide confirmation that account deletion is complete.
THE system SHALL remove all user-facing references to the deleted account.

### Password Change

### Password Change Request

WHEN a member requests to change their password, THE system SHALL:
1. Verify the user's current identity through authentication
2. Accept the new password and confirm it matches
3. Update the stored password securely

IF the new passwords do not match, THE system SHALL reject the change request.
IF the current authentication is invalid, THE system SHALL reject the change request.

### Password Validation

WHEN a new password is provided, THE system SHALL validate that it meets complexity requirements.
THE system SHALL reject passwords that do not meet minimum complexity standards.

### Secure Storage

THE system SHALL store all passwords in encrypted hash format.
THE system SHALL never store passwords in plain text.

### Password Change Confirmation

UPON successful password change, THE system SHALL inform the user that the password has been updated.
THE system SHALL require re-authentication with the new password for subsequent sessions.

### Password History

THE system SHALL prevent users from reusing their most recent passwords.
THE system SHALL reject new passwords that match any previously used password.

### Display Name Management

### Display Name Retrieval

WHEN a member accesses their profile, THE system SHALL display the user's current display name.
THE display name SHALL be shown for all user-facing operations.

### Display Name Update

WHEN a member updates their display name, THE system SHALL:
1. Validate the new display name meets length and content requirements
2. Update the stored display name in the user profile
3. Apply the updated display name to all user-facing operations

IF the new display name violates content requirements, THE system SHALL reject the update.
IF the display name exceeds maximum length, THE system SHALL reject the update.

### Display Name Privacy

DISPLAY NAMES ARE VISIBLE ONLY TO THE ACCOUNT OWNER.
THE system SHALL NOT display one user's display name to other users.

### Default Display Name

UPON account creation, THE system SHALL assign a default display name if none is provided.
THE user SHALL be able to modify the default display name at any time.

### Display Name Uniqueness

DISPLAY NAMES DO NOT NEED TO BE UNIQUE across different user accounts.
THE system SHALL allow multiple users to share the same display name.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Creation and Management

WHEN a user successfully logs in, THE system SHALL create a new session for the user.

WHEN a user logs out, THE system SHALL terminate the user's active session.

IF a user attempts to access a protected resource without an active session, THE system SHALL reject the request.

IF a session token is invalid or expired, THE system SHALL reject the request and require re-authentication.

THE system SHALL allow only one active session per user account at any given time.

IF a new login attempt is made while a session is already active, THE system SHALL terminate the existing session and create a new session.

WHEN a session expires due to inactivity, THE system SHALL require the user to re-authenticate to continue.

IF a user's account is deleted, THE system SHALL immediately terminate all active sessions associated with that account.

### Token Policy and JWT

WHEN a user authenticates, THE system SHALL issue a JSON Web Token (JWT) to the user.

THE system SHALL include the user identifier in the JWT payload.

THE system SHALL sign all JWTs using a secure algorithm.

IF a JWT verification fails due to signature mismatch, THE system SHALL reject the request.

IF a JWT contains an expired timestamp, THE system SHALL reject the request.

IF a JWT has been tampered with or modified after issuance, THE system SHALL reject the request.

THE system SHALL NOT store sensitive user credentials (such as passwords) in JWT payloads.

WHEN a user successfully authenticates, THE system SHALL issue a fresh JWT with appropriate expiration time.

### Token Refresh

WHEN a JWT expires, THE system SHALL allow the user to refresh the token using a refresh mechanism.

THE system SHALL issue a refresh token alongside the primary JWT.

IF the refresh token is valid, THE system SHALL issue a new JWT with an updated expiration time.

IF the refresh token is expired, THE system SHALL reject the refresh request and require re-authentication.

IF the refresh token has been tampered with, THE system SHALL reject the refresh request.

WHEN a user's session is terminated (logout or account deletion), THE system SHALL invalidate all refresh tokens associated with that session.

IF a refresh token is used from a different device or location than the original authentication, THE system SHALL reject the refresh request and require re-authentication.

THE system SHALL limit the number of token refresh attempts to prevent abuse.

IF the maximum refresh attempts are exceeded, THE system SHALL require full re-authentication.

### Session Expiration Policy

THE system SHALL define a maximum session lifetime for active sessions.

WHEN a session reaches its maximum lifetime, THE system SHALL require the user to re-authenticate.

THE system SHALL enforce session expiration based on inactivity timeout.

IF a user's session expires due to inactivity, THE system SHALL NOT automatically log the user out of other devices (if allowed by security policy).

WHEN a session is about to expire, THE system MAY notify the user of the impending expiration.

THE system SHALL provide clear error messages when session expiration prevents access to resources.

IF a user attempts to perform an action on an expired session, THE system SHALL redirect the user to the login page.

THE system SHALL NOT allow sessions to extend beyond the maximum configured lifetime, regardless of activity.

### Security and Token Validation

THE system SHALL validate the issuer and audience claims in all JWTs.

IF the JWT issuer does not match the expected issuer, THE system SHALL reject the request.

IF the JWT audience does not match the expected audience, THE system SHALL reject the request.

THE system SHALL enforce time-based validation of JWT expiration.

IF the current time is beyond the JWT expiration time, THE system SHALL reject the request.

THE system SHALL rotate JWT signing keys periodically to maintain security.

WHEN a JWT signing key is rotated, THE system SHALL gracefully handle validation of tokens issued by the previous key.

THE system SHALL maintain an audit log of all authentication and token validation failures.

IF suspicious token usage patterns are detected, THE system SHALL flag the account for security review.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL support the following account states:

1. **Active**: Account is functional and user can access all features
2. **Deleted**: Account has been permanently removed by the user

WHEN a new user registers, THE system SHALL create the account in Active state.

WHEN a user successfully logs in, THE system SHALL ensure the account is in Active state.

IF an account is in Deleted state, THE system SHALL reject all authentication requests.

IF an account is in Deleted state, THE system SHALL not allow any data access operations including viewing todos or edit history.

THE system SHALL maintain accounts in Active state by default from creation until user-initiated deletion.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
1. Display a confirmation dialog warning of permanent data loss
2. Require explicit user confirmation
3. Permanently delete the user account
4. Permanently delete all user's todos including those in trash
5. Permanently delete all edit history associated with user's todos

IF the user cancels the deletion request, THE system SHALL maintain the account in Active state.

IF the user confirms deletion, THE system SHALL immediately transition the account to Deleted state.

IF deletion is confirmed, THE system SHALL not allow any data recovery after the operation completes.

THE system SHALL record the deletion timestamp for audit purposes.

THE system SHALL permanently remove all user data from the system within 24 hours of deletion confirmation.

IF a deleted user attempts to access the application, THE system SHALL reject the request with an appropriate error message.

### Registration and Initial Account State

WHEN a user completes registration with email and password, THE system SHALL:
1. Create a new user account in Active state
2. Set default display name based on email or user input
3. Initialize the account with empty todo list

IF the email is already registered, THE system SHALL reject the registration.

IF the password does not meet security requirements, THE system SHALL reject the registration.

IF registration succeeds, THE system SHALL automatically authenticate the user and establish a session.

IF the display name is not provided during registration, THE system SHALL generate a default name.

THE system SHALL store the account creation timestamp for each new account.

### Authentication and Session Management

WHEN a user attempts to log in with email and password, THE system SHALL:
1. Validate the email format
2. Validate the account exists and is in Active state
3. Verify the password hash matches
4. Create a session if credentials are valid

IF the email format is invalid, THE system SHALL reject the login request.

IF the account does not exist, THE system SHALL reject the login request.

IF the account is in Deleted state, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request without revealing whether the email exists.

IF authentication succeeds, THE system SHALL allow the user to access all features for Active accounts.

IF a session expires, THE system SHALL require the user to re-authenticate to continue.

### Password Management

WHEN a user requests to change their password, THE system SHALL:
1. Require current password verification
2. Validate new password meets security requirements
3. Update the password hash in the database
4. Invalidate all existing sessions

IF the current password is incorrect, THE system SHALL reject the password change request.

IF the new password does not meet requirements, THE system SHALL reject the password change request.

IF password change succeeds, THE system SHALL allow the user to authenticate with the new password.

IF password change succeeds, THE system SHALL notify the user of the change.

THE system SHALL prevent users from setting their current password as the new password.

THE system SHALL maintain password history to prevent reuse of recent passwords.

### Account Deactivation and Reactivation

THE system SHALL NOT support account deactivation as a reversible state.

THE only terminal state for user accounts is deletion, which is irreversible.

IF a user wants to stop using the service temporarily, THE system SHALL advise the user to simply not log in while preserving the account.

THE system SHALL NOT implement any suspension mechanism for accounts.

IF a user needs to restore account access after inactivity, THE system SHALL require standard login procedures.

THE system SHALL NOT support account freezing or pausing states.

WHEN a user re-registers after account deletion, THE system SHALL treat them as a new user with a new account ID.