**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest represents any unauthenticated visitor to the application. Guests have no access to todo data or user-specific features. They can only view public pages such as the sign-up and login screens. Guests cannot create, view, edit, or delete any todos. They cannot access any user profiles or account settings. The system treats all guest requests without user identity context. Guests must authenticate to transition to a member role with full permissions.

### Guest Identity

A guest represents any unauthenticated visitor to the todo application. Guests have not yet created an account and are not logged in. The system does not associate any user identity with guest requests. All guest interactions occur without user context or personalization.

### Public Page Access

Guests can access public-facing pages of the application. This includes the sign-up screen where new users can create an account, and the login screen where existing users can authenticate. No other application features are available to guests.

### No Todo Access

Guests cannot create, view, edit, or delete any todos. They have no access to todo lists, individual todo details, or the trash. All todo-related operations require authentication as a member.

### No Account or Profile Access

Guests cannot access any account features or settings. They cannot view or edit user profiles, change passwords, or manage account information. Profile viewing is restricted to authenticated members viewing their own profile only.

### Authentication Requirement

To gain access to todo functionality, guests must authenticate by signing up for a new account or logging in with existing credentials. Upon successful authentication, the guest transitions to a member role with full permissions for their own data.

## member Actor

A member is an authenticated user who has completed the sign-up process with email and password. Members have full access to their own todo list and profile. They can create todos with title, description, start date, and due date. Members can view, edit, complete, and delete their own todos. They can manage their account by changing password or deleting their account entirely. Members can view their todo edit history and restore items from trash. Members cannot view, access, or share another user's todos due to privacy boundaries. Each member's data is completely isolated from all other members.

### Member Actor Definition

A member is an authenticated user who has completed the sign-up process with email and password. Members have full access to their own todo list and profile. Members cannot view, access, or share another user's todos. Each member's data is completely isolated from all other members.

### Member Todo Operations

Members can create todos with a title (required), description (optional), start date (optional), and due date (optional). Newly created todos are incomplete by default. Members can view a list of their own todos with pagination support. Members can view a single todo to see all its details including full description. Members can mark a todo as complete or incomplete (simple toggle between two states). Members can edit their todo's title, description, start date, and due date. Members can delete their own todos (soft delete, moved to trash). Members can view a list of their deleted todos in the trash with pagination support. Members can restore a deleted todo from the trash. Members can permanently delete a todo from the trash (including its edit history).

### Member List Filtering and Sorting

Members can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Members can sort their todo list by creation date (newest or oldest first), start date (earliest or latest first), or due date (earliest or latest first). Todos without a start date appear at the end when sorting by start date. Todos without a due date appear at the end when sorting by due date.

### Member Edit History Access

Members can view the full edit history of any of their todos. Each history entry records when the edit was made and what fields were changed (title, description, start date, due date). History entries are sorted from most recent to oldest. Permanently deleting a todo from the trash also deletes its edit history.

### Member Account Management

Members can change their password using their current password and a new password. Members can delete their account entirely. When a member deletes their account, all their todos (including those in trash) are permanently deleted. Account deletion is irreversible.

### Privacy and Data Isolation

Each member's todos are completely private. Members can only see their own todos. There is no way to view, access, or share another user's todos. Members cannot view other users' profiles. This is a private todo app with strict data isolation between members.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

New users can create an account by providing an email address and password.

The email address serves as the user's unique identifier for login purposes.

The password must be provided during registration and will be used for future authentication.

Upon successful registration, the user is automatically authenticated and granted access to their private todo list.

If the email address is already in use, the registration is rejected and the user is informed that the email is taken.

If the email or password is missing during registration, the request is rejected.

### User Login

Existing users can log in by providing their registered email address and password.

Upon successful authentication, the user receives a session that grants access to their private todo list.

The user can access all their todo operations including viewing, creating, editing, and deleting todos.

If the email address is not registered, the login is rejected.

If the password does not match the registered account, the login is rejected.

Users cannot view or access any other user's todos or profile information.

### Authentication Requirements

Authentication is required to access any todo-related features.

Guest users (unauthenticated visitors) cannot view, create, edit, or delete any todos.

Guest users can only access public pages such as the registration and login screens.

Once authenticated, a user's session remains active until they explicitly log out or the session expires.

All todo operations are restricted to the authenticated user's own data only.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, users maintain an authenticated session that allows access to their private todo data.

WHEN a user logs in successfully, THE system SHALL establish a session for that user.

WHILE the session is active, THE system SHALL allow the user to access their own todos and perform todo operations.

Users can end their session at any time by logging out.

WHEN a user logs out, THE system SHALL terminate the session and require re-authentication for subsequent access.

WHEN a user logs out, THE system SHALL clear all session data and prevent access to protected resources.

### Logout Behavior

Users can log out from the application at any time during their session.

WHEN a user initiates logout, THE system SHALL end the current session immediately.

After logout, users must log in again with their credentials to access their todos.

WHEN a user logs out, THE system SHALL prevent any further access to protected resources until re-authentication.

WHEN a user logs out, THE system SHALL clear session data from the system.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

New users can create an account by providing an email address and a password.

The email address must be unique across all user accounts.

Upon successful registration, the user is authenticated and gains access to the system as a member.

If the email is already registered, account creation is rejected.

### Account Deletion

Users can delete their own account at any time.

When an account is deleted, all associated data is permanently removed, including:
- All todos owned by the user
- All todos in the user's trash
- All edit history records for the user's todos

This deletion is irreversible. Once deleted, the account and all its data cannot be recovered.

After account deletion, the user's email address becomes available for new account registration.

### Password Management

Authenticated users can change their password at any time.

To change a password, the user must provide their current password for verification.

The new password must be confirmed by entering it twice to prevent typos.

If the current password is incorrect, the password change is rejected.

If the password confirmation does not match the new password, the password change is rejected.

### Display Name Management

Each user has a display name associated with their profile.

Users can edit their display name at any time.

The display name is visible only to the user themselves, as this is a private todo application.

Users cannot view the display names or profiles of other users.