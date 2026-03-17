**multiUserTodoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any person visiting the application without logging in with email and password. Guests can navigate to public pages such as the sign up and login forms to access the application. However, guests cannot access any personal features or data within the todo application. Guests cannot view, create, or modify any todos, regardless of whether the content belongs to themselves or other users. All user-specific functionality including viewing todo lists, editing todos, and managing the trash requires authentication through a registered account. Access to individual profiles, todo lists, and account settings is completely blocked for unauthenticated visitors. The application does not allow any anonymous browsing of content or features beyond the landing and authentication pages.

### Guest Identity

A guest is any person visiting the application without logging in with email and password. Guests can navigate to public pages such as the sign up and login forms to access the application. However, guests cannot access any personal features or data within the todo application.

### Landing Page Access

Guests can access the landing page without requiring an account. No registration or authentication is necessary to view the landing page content. Guests can see general information about the application but cannot view or interact with any todos or user-specific features.

### Authentication Page Access

Guests can access the sign up page to create a new account. Guests can access the login page to sign in with existing email and password credentials. These pages are the only entry points for guests to gain access to personal features. All other content requires authentication.

### Blocked Personal Features

Guests are blocked from accessing all user-specific functionality. Guests cannot view, create, or modify any todos, regardless of ownership. Guests cannot access individual user profiles. Guests cannot view or interact with the trash feature. Guests cannot use any filtering or sorting options for todo lists. All private features require a registered account with successful authentication.

### No Data Access or Operations

Guests cannot view any todos. Guests cannot create new todos with title, description, start date, or due date. Guests cannot edit any todos including title, description, start date, or due date. Guests cannot delete any todos. Guests cannot restore any deleted items from the trash. Guests cannot permanently delete any items from the trash. The application enforces complete data isolation so guests have no visibility into any user's todo content.

## member Actor

A member is a registered user who has created an account with email and password. Members have full access to create, view, and manage their own private todo lists. They can create todos with a required title and optional description, start date, and due date. Members can mark todos as complete or incomplete, edit existing todos, and view the full edit history for each todo. They have the ability to delete todos, which moves them to a trash folder where they can be restored or permanently deleted. Members can filter their todo list by completion status and sort by creation date, start date, or due date. Each member's todos remain completely private and cannot be viewed or accessed by any other user. Members cannot view other users' profiles or any data that belongs to other registered users. All member activities are isolated to their own account with no cross-user visibility.

### Member Definition and Privacy

A member is a registered user who has created an account using an email and password combination. Members have full access to manage their own private todo list within the application. All todos created by a member belong exclusively to that member and remain completely private from all other users. Members cannot view, access, or interact with any todos that belong to other registered users. The application operates as a private todo management system where each user's data is fully isolated from others.

Members can create todos with a required title field and optional fields including description, start date, and due date. Every todo a member creates is automatically associated with their account and marked as incomplete by default. Members have complete ownership of todos they create and can modify, complete, or delete them at their discretion.

Members can view and manage the complete edit history for any todo they own. The edit history records when changes were made and what fields were modified. Members can sort and filter their todo list by completion status, creation date, start date, or due date to organize their tasks according to their preferences.

When a member deletes a todo, it is moved to a trash folder rather than being immediately removed from the system. Members can view todos in trash, restore deleted todos back to their normal todo list, or permanently delete todos from trash. All todos, including those in trash, are permanently deleted when a member deletes their account.

Members are required to authenticate with their email and password to access any personal data. Guest users without an authenticated account cannot view, create, or manage any todos. Members cannot view other users' profiles or any data associated with other registered users under any circumstances. The application enforces strict privacy boundaries where each member's information remains visible only to themselves.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create a new account by providing their email address and a password.

The email address must be valid and unique across all accounts. If an email address is already registered, the registration request is rejected.

The password is required and must be provided during registration.

During registration, users must also provide a display name, which becomes their visible identifier.

If the email address format is invalid, the registration request is rejected.
If the password is not provided, the registration request is rejected.

### User Login

Users can log in to their account by providing their registered email address and password.

The system authenticates the user by verifying the provided credentials against the stored account information.

Upon successful authentication, the user gains access to their private todo data.

If the email address or password is incorrect, the login request is rejected.

If the account does not exist, the login request is rejected.

After login, users can access all their personal data including todos.

### Authentication Session

When users successfully log in, an active session is established.

The session remains active until the user explicitly logs out or the session expires.

While authenticated, users can perform member-only operations.

The system maintains session state to recognize authenticated users across requests.

Guest users (unauthenticated visitors) cannot access any personal data.

Only authenticated members can view their own todos and perform todo operations.

### Guest Access

Guest visitors can access the registration and login pages.

Guest visitors can view public information about the application.

Guest visitors cannot view, create, edit, or delete any todos.

Guest visitors cannot access any private user data.

Guest visitors must register or log in to access member features.

### Member Authentication

Authenticated members can view their own todos.

Authenticated members can create new todos.

Authenticated members can edit their own todos.

Authenticated members can delete their own todos.

Authenticated members can only access their own data, not other users' data.

Authenticated members can change their password.

Authenticated members can delete their account, which permanently removes all their todos and edit history.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

Upon successful login, an active session is established for the user.
The session allows the user to access their private todo data without re-entering credentials for each action.
The session remains active until the user logs out or the session expires.

While a session is active, the user can perform any action authorized for member accounts.
The user's todos remain private and accessible only during the active session.

The session automatically ends when the user chooses to log out.
The session also ends if the user signs out from all devices simultaneously.

If a session is lost or expires, the user must log in again to regain access.
Attempting to access private data without an active session results in the request being rejected.

Multiple active sessions from different devices are supported for the same account.
Each session operates independently and can be terminated separately.

### Account Logout

Users can log out from their account to end their active session.
Logging out terminates the current session and removes access to private todo data.
After logging out, the user must log in again to access their account.

Users can log out from any page within the application.
Logging out is available to all authenticated members at any time.

When logging out, the session is immediately terminated.
All references to private todo data are cleared from the active session.

Users can log out from all devices simultaneously to end all active sessions.
This is useful when users want to ensure no other devices have access to their account.

If a user attempts to perform an action while already logged out, the request is rejected and the user is redirected to the login page.

### Account Security

User accounts are protected by email and password authentication.
The email and password combination is required to establish a new session.
Passwords are stored securely and are not displayed after initial creation.

Users can change their password at any time to maintain account security.
Changing the password requires entering the current password and the new password.
The password change takes effect immediately.

Changing a password invalidates all existing sessions for that account.
The user must log in again with the new password to establish a new session.

Guest users cannot access account security features.
Only authenticated members can change their password or manage their account.

Account information including email is private and accessible only by the account owner.
Users cannot view or access another user's account information or credentials.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

Guests can access the sign-up page from the login page.

Users can create a new account by providing an email address and password.

The email address is required and must be unique across all accounts.

The password is required and must meet minimum complexity requirements.

Upon successful registration, the user is automatically logged in and directed to the todo list.

If the email address is already registered, the registration request is rejected with an error message.

If the password does not meet complexity requirements, the registration request is rejected with an error message.

The system records the account creation timestamp.

After registration, the user's profile is created with a default display name derived from the email address.

The user can immediately create, view, and manage their todos after registration.

### Account Deletion

Registered users can delete their account from the account settings page.

Before deletion, users must confirm their intention to delete the account.

Upon account deletion, all user data is permanently removed from the system.

All todos owned by the user are permanently deleted, including those in the trash.

All edit history entries for the user's todos are permanently deleted.

The user's profile information is permanently removed.

The user's authentication credentials are permanently removed.

After account deletion, the user can no longer log in with the deleted credentials.

Account deletion is irreversible; there is no recovery mechanism for deleted accounts.

If the user is logged in when the account is deleted, all active sessions are terminated immediately.

If a user attempts to log in with deleted credentials, the login request is rejected.

### Password Change

Registered users can change their account password from the account settings page.

Users must provide their current password to verify their identity before changing to a new password.

The new password must meet the same minimum complexity requirements as during registration.

The new password must be different from the current password.

If the current password is incorrect, the password change request is rejected.

If the new password does not meet complexity requirements, the password change request is rejected.

If the new password matches the current password, the password change request is rejected.

After successful password change, the user's authentication credentials are updated immediately.

All active sessions for the user are maintained after the password change.

The user may optionally be prompted to log in again with the new password after the change.

Password change history is recorded for security audit purposes.