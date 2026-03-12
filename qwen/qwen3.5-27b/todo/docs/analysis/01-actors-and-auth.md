**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

A guest is any visitor to the application who has not yet authenticated. Guests can access the application landing page and view available registration options. They can initiate the registration process to create a new account. They can also access the login page to authenticate with existing credentials. Guests cannot view any todo items, as all todos are private to authenticated users. They cannot access any user profile information or personal data. Guests have no ability to create, modify, or delete any data in the system. Their role is limited to authentication entry points only. Once a guest completes registration or login, they transition to member status with full capabilities. The system treats all unauthenticated users identically as guests regardless of whether they have an existing account.

### Guest Actor Definition

THE system SHALL recognize any unauthenticated visitor as a guest actor.

THE system SHALL treat all unauthenticated users identically as guests regardless of whether they have an existing account.

WHEN a guest completes registration, THE system SHALL transition them to member status with full capabilities.

WHEN a guest completes login with valid credentials, THE system SHALL transition them to member status with full capabilities.

THE system SHALL maintain guest status until successful authentication occurs.

WHILE a user is in guest status, THE system SHALL restrict access to authentication entry points only.

### Guest Authentication Entry Points

THE system SHALL provide a landing page accessible to all guests.

THE system SHALL allow guests to initiate the registration process from the landing page.

THE system SHALL provide a login page accessible to all guests.

THE system SHALL allow guests to access the login page from the landing page.

THE system SHALL present registration options on the landing page for guests.

THE system SHALL allow guests to navigate between the landing page and login page without authentication.

WHEN a guest accesses the landing page, THE system SHALL display available authentication options.

WHEN a guest initiates registration, THE system SHALL present the registration form.

WHEN a guest accesses the login page, THE system SHALL present the login form.

### Guest Access Restrictions

THE system SHALL prevent guests from viewing any todo items.

THE system SHALL prevent guests from accessing any user profile information.

THE system SHALL prevent guests from viewing other users' profiles.

THE system SHALL prevent guests from creating any data in the system.

THE system SHALL prevent guests from modifying any data in the system.

THE system SHALL prevent guests from deleting any data in the system.

THE system SHALL prevent guests from accessing personal data belonging to any user.

IF a guest attempts to access a todo item, THE system SHALL reject the request.

IF a guest attempts to access a user profile, THE system SHALL reject the request.

IF a guest attempts to create, modify, or delete any data, THE system SHALL reject the request.

THE system SHALL limit guest capabilities to authentication entry points only.

## member Actor

A member is an authenticated user with a registered account in the system. Members can create new todo items with titles and optional descriptions. They can view their own todo list with pagination support. Members can mark their todos as complete or incomplete at any time. They can edit todo details including title, description, start date, and due date. Members can delete their own todos, which moves items to trash rather than permanent deletion. They can view and manage their trash to restore or permanently delete items. Members can filter their todo list by completion status. They can sort todos by creation date, start date, or due date. Members can view the edit history of their own todos. They can update their display name in their profile. Members can change their password for security purposes. They can request account deletion which removes all their data permanently. Members can only access their own todos and cannot view other users' data. Each member's todo collection is completely private and isolated from other users.

### Member Authentication and Access

THE system SHALL recognize a member as an authenticated user with a registered account.

THE system SHALL require authentication before allowing a member to access their todo collection.

THE system SHALL associate all todo operations with the authenticated member's account.

WHEN a member is authenticated, THE system SHALL grant access to their own todos only.

WHEN a member's authentication session expires, THE system SHALL require re-authentication for todo access.

### Todo Creation

WHEN a member creates a todo, THE system SHALL require a title.

WHEN a member creates a todo, THE system SHALL allow an optional description.

WHEN a member creates a todo, THE system SHALL allow an optional start date.

WHEN a member creates a todo, THE system SHALL allow an optional due date.

WHEN a member creates a todo, THE system SHALL initialize the completion status as incomplete.

WHEN a member creates a todo, THE system SHALL associate the todo with the creating member's account.

IF the title is missing during todo creation, THE system SHALL reject the creation request.

IF the due date is earlier than the start date, THE system SHALL reject the creation request.

### Todo List Viewing

WHEN a member views their todo list, THE system SHALL display only the member's own todos.

WHEN a member views their todo list, THE system SHALL present todos in paginated format.

WHEN a member views a todo in the list, THE system SHALL display the title, completion status, start date (if set), due date (if set), and creation date.

WHEN a member views a single todo, THE system SHALL display all details including the full description.

IF a member requests to view another member's todo, THE system SHALL reject the request.

### Todo Completion Toggle

WHEN a member marks a todo as complete, THE system SHALL update the completion status to complete.

WHEN a member marks a todo as incomplete, THE system SHALL update the completion status to incomplete.

WHEN a member toggles completion status, THE system SHALL switch between complete and incomplete states.

IF a member attempts to toggle completion on another member's todo, THE system SHALL reject the request.

### Todo Editing

WHEN a member edits a todo, THE system SHALL allow changes to title, description, start date, and due date.

WHEN a member edits a todo, THE system SHALL create a new edit history entry.

WHEN a member edits a todo, THE system SHALL record the edit timestamp in the history entry.

WHEN a member edits a todo's title, THE system SHALL record the new title value in the history entry.

WHEN a member edits a todo's description, THE system SHALL record the new description value in the history entry.

WHEN a member edits a todo's start date, THE system SHALL record the new start date value in the history entry.

WHEN a member edits a todo's due date, THE system SHALL record the new due date value in the history entry.

IF a member attempts to edit another member's todo, THE system SHALL reject the request.

### Soft Delete Capability

WHEN a member deletes a todo, THE system SHALL move the todo to trash rather than permanently removing it.

WHEN a member deletes a todo, THE system SHALL remove the todo from the normal todo list.

WHEN a member deletes a todo, THE system SHALL preserve the todo's edit history.

IF a member attempts to delete another member's todo, THE system SHALL reject the request.

### Trash Management

WHEN a member views their trash, THE system SHALL display only the member's own deleted todos.

WHEN a member views their trash, THE system SHALL present deleted todos in paginated format.

WHEN a member restores a todo from trash, THE system SHALL return the todo to the normal todo list.

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo and its edit history permanently.

IF a member attempts to access another member's trash, THE system SHALL reject the request.

### Filtering by Status

WHEN a member filters their todo list, THE system SHALL allow filtering by completion status.

WHEN a member selects the all todos filter, THE system SHALL display both complete and incomplete todos.

WHEN a member selects the complete todos filter, THE system SHALL display only completed todos.

WHEN a member selects the incomplete todos filter, THE system SHALL display only incomplete todos.

### Sorting Options

WHEN a member sorts their todo list, THE system SHALL allow sorting by creation date, start date, or due date.

WHEN a member sorts by creation date, THE system SHALL allow ordering by newest first or oldest first.

WHEN a member sorts by start date, THE system SHALL allow ordering by earliest first or latest first.

WHEN a member sorts by due date, THE system SHALL allow ordering by earliest first or latest first.

WHEN a member sorts by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN a member sorts by due date, THE system SHALL place todos without a due date at the end of the list.

### Edit History Viewing

WHEN a member views edit history, THE system SHALL display the full history of their own todo edits.

WHEN a member views edit history, THE system SHALL sort entries from most recent to oldest.

WHEN a member views edit history, THE system SHALL show the edit timestamp for each entry.

WHEN a member views edit history, THE system SHALL show what each field was changed to (if changed).

IF a member attempts to view another member's todo edit history, THE system SHALL reject the request.

### Profile and Account Management

WHEN a member manages their profile, THE system SHALL allow updating their display name.

WHEN a member changes their password, THE system SHALL update the password for their account.

WHEN a member requests account deletion, THE system SHALL permanently delete all their todos including those in trash.

WHEN a member requests account deletion, THE system SHALL permanently delete all their edit history entries.

WHEN a member requests account deletion, THE system SHALL permanently delete their user account.

### Data Privacy and Isolation

THE system SHALL ensure each member's todo collection is completely private.

THE system SHALL allow members to access only their own todos.

THE system SHALL prevent members from viewing other members' profiles.

THE system SHALL prevent members from accessing other members' todos.

THE system SHALL prevent members from accessing other members' trash.

THE system SHALL prevent members from accessing other members' edit history.

THE system SHALL enforce data isolation between all member accounts.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration (Signup)

WHEN a guest initiates registration, THE system SHALL require an email address and password.

WHEN a guest submits registration information, THE system SHALL validate that the email address is not already registered.

WHEN a guest submits registration information, THE system SHALL validate that the password meets minimum security requirements.

WHEN a guest successfully completes registration, THE system SHALL create a new user account.

WHEN a guest successfully completes registration, THE system SHALL automatically authenticate the user and establish a session.

IF the email address is already registered, THE system SHALL reject the registration request.

IF the password does not meet minimum security requirements, THE system SHALL reject the registration request.

IF the email address is invalid or malformed, THE system SHALL reject the registration request.

WHEN a user completes registration, THE system SHALL initialize the user with an empty todo list.

WHEN a user completes registration, THE system SHALL set the account state to active.

### User Login (Signin)

WHEN a guest attempts to login, THE system SHALL require an email address and password.

WHEN a user submits login credentials, THE system SHALL verify the email address exists in the system.

WHEN a user submits login credentials, THE system SHALL verify the password matches the stored credential.

WHEN a user successfully authenticates, THE system SHALL establish a new session.

WHEN a user successfully authenticates, THE system SHALL grant the member actor permissions.

IF the email address does not exist, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request.

IF the account is in a suspended state, THE system SHALL reject the login request.

IF the account has been deleted, THE system SHALL reject the login request.

WHEN a user logs in, THE system SHALL invalidate any previous active sessions for that user.

### Authentication Requirements

THE system SHALL require authentication for all member-only operations.

THE system SHALL maintain user authentication state throughout the session.

THE system SHALL verify authentication credentials before granting access to protected resources.

WHEN an unauthenticated guest accesses a protected resource, THE system SHALL redirect to the login page.

WHEN an authenticated user accesses a protected resource, THE system SHALL verify the user's authentication is still valid.

THE system SHALL allow guests to access the registration page without authentication.

THE system SHALL allow guests to access the login page without authentication.

THE system SHALL prevent guests from viewing any todo data.

THE system SHALL prevent guests from creating, editing, or deleting any todos.

WHEN authentication expires, THE system SHALL require the user to re-authenticate before accessing protected resources.

### Registration and Login Error Handling

IF registration fails due to email already in use, THE system SHALL inform the user that the email is already registered.

IF registration fails due to password requirements, THE system SHALL inform the user of the password requirements.

IF login fails due to invalid credentials, THE system SHALL inform the user that the credentials are incorrect.

IF login fails due to account suspension, THE system SHALL inform the user that the account is suspended.

IF login fails due to account deletion, THE system SHALL inform the user that the account no longer exists.

WHEN authentication fails, THE system SHALL not reveal whether the email exists or the password is incorrect.

WHEN registration or login encounters a system error, THE system SHALL inform the user of a temporary issue.

THE system SHALL log all authentication failures for security monitoring.

THE system SHALL not store plaintext passwords in any accessible format.

WHEN a user attempts multiple failed login attempts, THE system SHALL implement security measures to prevent brute force attacks.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Support for Members

THE system SHALL support authenticated sessions for member actors.

THE system SHALL maintain session state for authenticated members.

THE system SHALL allow members to establish a session through successful authentication.

THE system SHALL allow members to terminate their session through logout.

THE system SHALL manage session expiration for security purposes.

### Token-Based Authentication

THE system SHALL use tokens for member authentication.

THE system SHALL issue tokens upon successful member authentication.

THE system SHALL validate tokens for protected resource access.

THE system SHALL support token expiration for security purposes.

THE system SHALL invalidate tokens upon member logout.

### Token Refresh Capability

THE system SHALL support token refresh for authenticated members.

THE system SHALL allow members to obtain new tokens without re-authentication.

THE system SHALL validate refresh tokens before issuing new tokens.

THE system SHALL invalidate refresh tokens upon member logout.

### Token Expiration Management

THE system SHALL enforce token expiration policies.

THE system SHALL require re-authentication when tokens expire.

THE system SHALL expire all tokens when a member's account is deleted.

THE system SHALL enforce different expiration periods for different token types.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account State Definitions

THE system SHALL support three account states: active, suspended, and deleted.

THE system SHALL maintain the current state for each user account.

THE system SHALL default newly created accounts to the active state.

WHILE an account is in the active state, THE system SHALL allow the user to access all features.

WHILE an account is in the suspended state, THE system SHALL prevent the user from logging in.

WHILE an account is in the suspended state, THE system SHALL preserve all user data including todos and edit history.

WHILE an account is in the deleted state, THE system SHALL prevent any access to the account.

WHILE an account is in the deleted state, THE system SHALL permanently remove all associated todos and edit history.

THE system SHALL record the timestamp when an account transitions to a new state.

### State Transition Rules

WHEN an account transitions from active to suspended, THE system SHALL invalidate all active sessions for that account.

WHEN an account transitions from suspended to active, THE system SHALL require the user to log in again.

WHEN an account transitions from active to deleted, THE system SHALL permanently delete all todos owned by the user.

WHEN an account transitions from active to deleted, THE system SHALL permanently delete all edit history entries for the user's todos.

WHEN an account transitions from active to deleted, THE system SHALL permanently delete all todos in the user's trash.

WHEN an account transitions from suspended to deleted, THE system SHALL permanently delete all todos owned by the user.

WHEN an account transitions from suspended to deleted, THE system SHALL permanently delete all edit history entries for the user's todos.

THE system SHALL NOT allow an account to transition from deleted to any other state.

THE system SHALL NOT allow an account to transition directly from suspended to active without explicit reactivation.

THE system SHALL NOT allow an account to transition from active to deleted if the account has pending operations.

### Valid State Transitions

THE system SHALL allow an account to transition from active to suspended.

THE system SHALL allow an account to transition from suspended to active.

THE system SHALL allow an account to transition from active to deleted.

THE system SHALL allow an account to transition from suspended to deleted.

THE system SHALL NOT allow an account to transition from deleted to active.

THE system SHALL NOT allow an account to transition from deleted to suspended.

THE system SHALL NOT allow an account to transition from suspended to deleted and then restore the account.

THE system SHALL require explicit confirmation before transitioning an account from active to deleted.

THE system SHALL record the reason for account suspension in the account history.

THE system SHALL notify the user when their account transitions to suspended state.

### Account Lifecycle Management

THE system SHALL maintain a complete lifecycle history for each account.

THE system SHALL record the creation timestamp for each account.

THE system SHALL record the deletion timestamp for each account.

THE system SHALL track the total number of state transitions for each account.

THE system SHALL preserve account lifecycle history for audit purposes.

WHEN an account is deleted, THE system SHALL archive the lifecycle history.

THE system SHALL NOT allow restoration of an account after deletion.

THE system SHALL ensure all associated data is deleted when an account reaches the deleted state.

THE system SHALL validate that no active sessions exist before transitioning an account to deleted state.

THE system SHALL ensure data consistency during account lifecycle transitions.