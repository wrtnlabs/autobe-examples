**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who has not yet created an account or logged in. Guests can access the registration page to sign up with email and password. Guests can access the login page to authenticate with existing credentials. Guests cannot view any todo lists or todo details. Guests cannot access user profiles or any private data. Guests have no permissions to create, edit, or delete todos. All todo content and user profiles remain completely inaccessible to guests. The guest role represents the most restricted access level in the system. Guests must authenticate to become members before accessing any application features. This separation ensures that private todo data is never exposed to unauthenticated users.

### Guest Identity and Access Boundaries

A guest is an unauthenticated visitor who has not created an account or logged in. Guests represent the most restricted access level in the system. Guests cannot view any todo lists or todo details. Guests cannot access user profiles or any private data. All todo content and user profiles remain completely inaccessible to guests. Private data is never exposed to unauthenticated users. Guests must authenticate to become members before accessing any application features. This separation ensures that private todo data is protected from unauthorized access.

### Guest Authentication Access

Guests can access the registration page to sign up with email and password. Guests can access the login page to authenticate with existing credentials. Guests must authenticate to access any application features beyond registration and login. After successful authentication, guests become members and gain access to their own todos and profile. Authentication is the only path for guests to transition from restricted to full access.

### Guest Permission Restrictions

Guests have no permissions to create, edit, or delete todos. Guests cannot view todo lists in any form. Guests cannot access user profiles, including their own profile before authentication. Guests cannot filter, sort, or search todos. Guests cannot access the trash or view deleted todos. Guests cannot perform any operations that require user identity. All todo-related actions require member authentication. All profile-related actions require member authentication.

## member Actor

A member is an authenticated user who has successfully logged in with email and password. Members have full access to their own todo lists and can manage all their personal todos. Members can view and edit their own profile including display name. Members can manage their account settings including password changes and account deletion. Members cannot view other users' profiles as this is a private todo application. Members cannot access or view any todos belonging to other users. Each member's data is completely isolated from all other members. The member role represents the standard authenticated user with full personal workspace access. Members maintain exclusive ownership of all todos they create. This privacy model ensures that no member can ever access another member's data.

### Member Identity

A member is an authenticated user who has successfully logged in with email and password. The member role represents the standard authenticated user with full personal workspace access. Members are distinguished from guests by their authenticated status and ability to access personal todo data. Upon successful authentication, a user transitions from guest status to member status. Members maintain their identity throughout their session until logout or session expiration.

### Member Permissions and Todo Access

Members have full access to their own todo lists and can manage all their personal todos. Members can create, view, edit, complete, and delete their own todos. Members maintain exclusive ownership of all todos they create. Each member has private workspace access to their personal todo collection. Members can filter their todo list by completion status (all, complete only, or incomplete only). Members can sort their todo list by creation date, start date, or due date in newest_first or oldest_first order. Members can view their todo list with pagination. Members can view individual todo details including full description. Members can mark todos as complete or incomplete. Members can edit todo title, description, start date, and due date. Members can view the edit history of their todos. Members can delete todos which moves them to trash. Members can view their trash list with pagination. Members can restore todos from trash. Members can hard delete todos from trash.

### Profile Management

Members can view their own profile which displays their display name. Members can edit their display name at any time. The display name is part of the member's profile and can be updated through the account settings. Profile changes are saved immediately upon submission. Members must be authenticated to access their profile settings.

### Privacy and Data Isolation

Members cannot view other users' profiles as this is a private todo application. Members cannot access or view any todos belonging to other users. Each member's data is completely isolated from all other members. This privacy model ensures that no member can ever access another member's data. There is no way to view, access, or share another user's todos. All todo operations are restricted to the member's own data only. When a member requests any todo or profile data, the system ensures the data belongs to that member before granting access. If a member attempts to access another member's data, the request is rejected.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address and a password.

The email address must be unique across all user accounts.
If the email address is already registered, the registration request is rejected.

The password must be provided during registration.
If the password is missing or empty, the registration request is rejected.

Upon successful registration, the user account is created and the user is authenticated.
A newly registered user has a profile with a display name that can be edited later.

Each user can only have one account per email address.
If the registration fails for any reason, no account is created.

### User Login

Users can log in to their account by providing their registered email address and password.

The system verifies the email address and password combination.
If the email address is not registered, the login request is rejected.
If the password does not match the registered password, the login request is rejected.

Upon successful login, the user is authenticated and gains access to their todos and profile.
A logged-in user can perform all actions available to members.

If the login fails, the user remains unauthenticated and retains guest access only.
Users must be logged in to view or manage their todos.

### Authentication

Authentication is the process of verifying a user's identity using their email and password.

WHEN a user provides credentials, THE system SHALL verify the email and password match a registered account.
WHEN authentication succeeds, THE system SHALL grant the user member access.
WHEN authentication fails, THE system SHALL deny access and maintain guest status.

Only authenticated users can access their own todos and profile.
Unauthenticated users (guests) cannot view any todo lists or user profiles.

Authentication is required before any todo operations can be performed.
Each user's authentication is tied to their unique email address.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user successfully logs in with their email and password, a session is created.
The session allows the user to access their todos and profile without re-entering credentials.
The session remains active until the user explicitly logs out or deletes their account.
Each user's session is private and cannot be accessed by other users.
If the login credentials are invalid, no session is created.
If the session is no longer valid, the user is treated as a guest and cannot access their todos.

### Logout

Users can log out from their account at any time.
When a user logs out, their session is terminated.
After logout, the user becomes a guest and loses access to their todos and profile.
After logout, the user can access the registration page and login page.
If the user attempts to view their todo list after logout, the request is rejected.
If the user attempts to view their profile after logout, the request is rejected.

### Account Security

When a user changes their password, the change takes effect immediately.
When a user performs a hard delete on their account, all active sessions for that account are terminated.
When a user performs a hard delete on their account, the user can no longer log in with the deleted credentials.
Each user's session data is private and cannot be viewed by other users.
If a user attempts to access another user's session, the request is rejected.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email and a password.
The email must be unique across all accounts in the system.
Upon successful account creation, the user becomes a member with full access to their own todos.
If the email is already in use by another account, the request is rejected.
If the email format is invalid, the request is rejected.
If the password does not meet security requirements, the request is rejected.

### Account Deletion

Users can delete their own account.
When an account is deleted, all todos owned by the user are hard deleted, including those in the trash.
When an account is deleted, all edit history entries associated with the user's todos are hard deleted.
Account deletion is irreversible and cannot be undone.
If the user does not own the account, the request is rejected.
If the user has no account, the request is rejected.

### Password Change

Users can change their password.
The user must be authenticated to change their password.
After a successful password change, the user's new password is used for all future authentication attempts.
If the user is not authenticated, the request is rejected.
If the current password provided does not match the stored password, the request is rejected.
If the new password does not meet security requirements, the request is rejected.