**privateTodoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who has not yet signed in to the application. Guests have very limited permissions and can only access the sign up and login screens. They cannot view any todos, access any profiles, or perform any actions within the application. Guests must complete the sign up process to create an account or successfully log in with existing credentials to become a member. Until authentication is successful, the system treats the visitor as a guest with no access to member features. The guest state is temporary and serves as the entry point for new users joining the private todo application.

### Guest Identity

A guest is an unauthenticated visitor who has not yet signed in to the application.

The guest state represents a pre-authentication state where the visitor has not provided valid credentials to the system.

The guest state is temporary and serves as the entry point for new users joining the private todo application.

A visitor remains a guest until they successfully complete the sign up process to create an account or successfully log in with existing credentials.

Once authentication is successful, the guest transitions to a member with full access to their personal todo features.

### Guest Permissions

Guests have very limited permissions and can only access the sign up and login screens.

Guests can attempt to sign up for a new account by providing an email address and password.

Guests can attempt to log in with an existing email and password combination.

The system provides the registration entry point for guests to become members.

Guests cannot perform any other actions within the application until authentication is successful.

### Guest Restrictions

Guests cannot view any todos.

Guests cannot access any user profiles.

Guests cannot view, create, edit, complete, or delete any todos.

Guests cannot access the trash or restore any deleted todos.

Guests cannot view any edit history.

Authentication is required before any todo-related or profile-related actions become available.

The system enforces these restrictions by treating the visitor as a guest with no access to member features until authentication is confirmed.

## member Actor

A member is an authenticated user who has successfully logged in with their email and password. Members have full access to their own todos and can create, view, edit, complete, and delete them as needed. They can manage their trash by viewing deleted todos, restoring them, or permanently removing them. Members can view the edit history of any of their todos to track changes over time. Each member can update their display name and change their password at any time. Members can also delete their account, which permanently removes all their todos including those in the trash. A critical boundary for members is that they can only access their own data - they cannot view, access, or share any other member's todos or profile information. This strict privacy boundary ensures that each member's todo list remains completely private within the application.

### Member Identity

A member is an authenticated user who has successfully logged in with their email and password.

Members are identified by their authenticated session state. The transition from guest to member occurs when a user provides valid email and password credentials during login.

A member remains authenticated until they log out or their session expires. While authenticated, they have access to all member-level features and their personal data.

The member role is the primary authenticated actor in the system. All data access and operations are scoped to the individual member's identity.

### Data Access Boundary

Members have full access to their own todos, including the ability to create, view, edit, complete, and delete them.

Each member can only access todos they created. There is no mechanism to view, access, edit, or share another member's todos.

Members cannot view other members' profiles. Profile information is private to each individual member.

This strict privacy boundary ensures that each member's todo list and profile remain completely private within the application. No cross-user data access is permitted under any circumstances.

If a member attempts to access a todo that does not belong to them, the request is rejected.

### Self-Service Permissions

Members can manage their own profile and account settings.

Profile management permissions include:
- Viewing their own profile
- Editing their display name

Account management permissions include:
- Changing their password
- Deleting their account

When a member deletes their account, all their todos are permanently deleted, including those currently in the trash.

These self-service actions apply only to the member's own data. A member cannot modify any other member's profile or account.

### Trash and History Permissions

Members have access to their deleted todos through the trash view.

Trash management permissions include:
- Viewing a list of their deleted todos
- Restoring a deleted todo to return it to the normal todo list
- Permanently deleting a todo from the trash

Members can view the edit history of any of their todos. Each history entry shows when the edit was made and what changes were applied.

When a todo is permanently deleted from the trash, its edit history is also deleted.

Trash and history access is limited to the member's own todos only. A member cannot view or manage another member's trash or edit history.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

Guests can register to become members by providing an email address and password.

The email address is required and must be unique across all users. If a guest attempts to register with an email that is already in use, the registration is rejected.

The password is required. Both email and password must be provided to complete registration.

Upon successful registration, the guest becomes a member and gains access to member capabilities including creating, viewing, editing, and managing their own todos.

If registration fails due to a duplicate email, the guest is informed that the email is already registered.

If registration fails due to missing required fields, the guest is informed which fields are required.

### Login

Members can log in to access their account using their registered email address and password.

The login process validates the provided email and password against the stored credentials.

If the email and password match, the user is authenticated and gains access to their todos and profile.

If the email does not correspond to a registered account, the login is rejected.

If the email exists but the password is incorrect, the login is rejected.

Upon successful login, the member can perform all member operations including viewing their todos, creating new todos, editing existing todos, and managing their profile.

Guests who attempt to access member features without logging in are redirected to authenticate.

### Authentication

Authentication is the process by which the system verifies a user's identity using their email and password credentials.

Unauthenticated users are treated as guests with limited capabilities: they can only access registration and login.

Authenticated users are recognized as members with full access to their personal todo lists and profile.

The system distinguishes between guests and members based on authentication status. Guests have no access to any user's todos or profiles. Members have access only to their own todos and profile.

Each member's todos and profile remain completely private. There is no mechanism for one member to view another member's data.

Authentication persists across interactions until the user logs out or the session ends.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session State

After a user successfully logs in with their email and password, they are considered authenticated and have an active session.

A session represents the user's authenticated state within the application.

While a session is active, the user can access all features available to a member, including viewing, creating, editing, and managing their todos.

The user remains logged in until they explicitly log out.

A member can only be logged in to their own account and can only access their own data.

### Logout

A member can log out of the application at any time.

Logging out ends the user's current session.

After logging out, the user is no longer authenticated and becomes a guest.

A guest cannot access member-only features such as viewing todos, editing profile, or managing their account.

A guest must log in again with their email and password to regain access to member features.

### Password Management

A member can change their password while logged in.

To change the password, the member must provide their current password and a new password.

If the current password provided does not match the member's actual password, the change is rejected.

If the password change is successful, the new password becomes effective immediately.

The member can continue using the application after changing their password without needing to log in again.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Account creation establishes a new user in the system with email and password credentials.

A new account consists of:
- An email address, which must be unique across all users
- A password, which is stored securely
- A display name, which is initially empty and can be set later
- The date and time the account was created

Guests can create accounts through the sign-up process. Upon successful account creation, the guest becomes a member with full access to the system.

If the email address is already registered to another user, the account creation is rejected.
If required fields are missing or invalid, the account creation is rejected.

Account creation does not require any prior authentication or authorization.

### Account Deletion

Members can delete their own accounts. Account deletion is permanent and irreversible.

When an account is deleted:
- All todos owned by the user are permanently deleted
- All todos in the user's trash are permanently deleted
- All edit history entries for those todos are permanently deleted
- The user's profile information is deleted
- The user can no longer access the system

Account deletion requires the user to be authenticated as the account owner. A member cannot delete another member's account.

After account deletion, the email address associated with the deleted account may be available for new account registration.

If an unauthenticated user attempts to delete an account, the request is rejected.
If the account does not exist, the request is rejected.

### Password Change

Members can change their own password to maintain account security.

The password change process requires:
- The user to be authenticated
- A new password that meets the system's password requirements

Upon successful password change, the new password becomes active immediately. The user does not need to log in again after changing their password.

If an unauthenticated user attempts to change a password, the request is rejected.
If the new password does not meet the system's requirements, the request is rejected.