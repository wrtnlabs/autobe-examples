**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is anyone visiting the application without being signed in. Guests cannot view any todo items, profiles, or account settings. All todo content remains completely private and inaccessible to guests. The application redirects guests to the sign-up or sign-in page when they try to access protected areas. Guest sessions do not retain any application state or personal information. The system treats all guests the same regardless of who they are. There is no guest account creation or temporary registration. Access is restricted until authentication is completed. Guests have zero permissions within the todo application. Any attempt to view or modify data is blocked and redirected to the authentication pages.

### Guest Identity and Access

An unauthenticated user is anyone visiting the application without having signed in. This person is considered a guest with zero permissions within the todo application.

A guest is a temporary visitor whose session does not retain any application state or personal information. The system treats all guests the same regardless of who they are. There is no guest account creation or temporary registration available.

Guests have no access to view any todo items, user profiles, or account settings. All todo content remains completely private and inaccessible to guests.

### Authentication Requirements

Guests cannot access protected areas of the application without first completing authentication. The application redirects guests to the sign-up or sign-in page when they attempt to access protected areas.

To view any todo items, users must complete sign-up with an email and password. To access their account, users must complete sign-in with their registered email and password.

Access restriction applies before login completion. The system blocks all data access attempts until proper authentication is completed.

### Access Control and Privacy

Guest access is blocked for all todo operations. Any attempt by a guest to view or modify data is blocked and redirected to the authentication pages.

Privacy protection ensures users' todos are completely private and cannot be accessed by guests or any unauthenticated visitor.

Guests have no account state retained in the system. Each session is independent and contains no persistent personal information from previous visits.

## member Actor

A member is an authenticated user who has successfully logged in with their credentials. Members have exclusive access to their own todo items and profile information. All todo items created by a member remain completely private and are invisible to other members. Members can create, view, complete, edit, and delete their own todos. Members cannot view or interact with another member's data. Profile editing allows members to update their display name. Members can change their password at any time. Members have full control over their account lifecycle. Members cannot view other users' accounts or profiles. The application enforces complete data isolation between all members. Members' todo lists are segregated and only visible to their owner. Members can permanently delete their account which removes all their data.

### Member Identity and Authentication

A member is an authenticated user who has successfully logged in with their credentials. Authentication requires a valid email address and password combination that the system recognizes.

Guests are unauthenticated users who cannot view any todo items or access member-only features. When a guest attempts to access member-only functionality, the system redirects them to the registration or login page.

Each member has a unique identity within the application. Members cannot view, access, or interact with another member's data. This restriction applies to todos, profile information, and any other user-specific content. The application enforces complete data isolation between all members.

### Permission Matrix

Members have exclusive access to create, view, edit, complete, and delete their own todo items. Every permission is scoped to the member's own data only.

Members can view their own todo list and individual todo items. This includes all todos regardless of completion status. Members can filter their todos by completion status and sort by creation date, start date, or due date.

Members can create new todo items with a title, description, start date, and due date. Every todo is automatically associated with the creating member.

Members can edit their todo's title, description, start date, and due date. The system records every edit in the todo's edit history.

Members can mark their todos as complete or incomplete, toggling between the two states.

Members can delete their todos, moving them to the trash. Deleted todos remain in the trash until restored or permanently deleted.

Members can view the edit history of their todos, showing all changes from most recent to oldest.

### Profile and Password Management

Members can view and edit their own profile information. Each member's profile includes a display name.

Members can update their display name at any time. The updated display name applies to their profile immediately.

Members can change their password at any time. The password change requires authentication with the current password. Once changed, the new password becomes effective immediately.

Members cannot view other members' profiles or profile information. Profile data is completely private and not visible to other users.

### Account Lifecycle and Deletion

Members have full control over their account lifecycle, including the ability to permanently delete their account.

When a member deletes their account, all their data is permanently removed from the application. This includes all their todos, todos in the trash, edit history entries, and profile information.

Account deletion is irreversible. Once an account is deleted, all data owned by that member is permanently lost and cannot be recovered.

Members can log out of the application at any time, ending their current session. Logging out does not delete the account or any data.

### Data Isolation and Privacy

The application maintains strict data isolation between all members. Each member's todos are completely private and only visible to that member.

There is no functionality that allows one member to view, access, share, or interact with another member's todos. This privacy constraint applies to all todo operations, including create, view, edit, complete, and delete.

The application enforces this isolation at all times. Members cannot bypass these restrictions through any means, including direct data access attempts.

This is a private todo application. No cross-user access is permitted under any circumstances. The system ensures that member data remains segregated and protected.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Actor Definitions

Two actor types exist in this system: guest and member.

Guest (Unauthenticated)
A guest is any user who has not signed in.

A guest can sign up for a new account.
A guest can sign in to an existing account.
A guest cannot view any todos or access any private data.
A guest is blocked from all private operations.

Member (Authenticated)
A member is a user who has successfully signed in with a valid email and password.

A member can view and access only their own todos.
A member has exclusive access to their own data.
A member cannot view, access, or modify other members' data.
A member can perform all operations on their own todos including create, view, complete, incomplete, edit, delete, and restore from trash.
A member can edit their own user profile including display name.
A member can change their password.
A member can delete their own account.

### User Registration

Users may create an account by signing up.

To register, a user must provide an email address and a password.

The email address is required and must be unique across all accounts.

The password is required and must be provided during registration.

Once registration is successful, the user account is created.

After registration, the user is automatically signed in and gains access to their account.

If the email address is already registered, the registration request is rejected.

If the email address format is invalid, the registration request is rejected.

If the password is missing, the registration request is rejected.

### User Login

Users may sign in to their existing account.

To log in, a user must provide their registered email address and password.

Both the email address and password are required.

The system validates the credentials against the stored account.

If the credentials match a valid account, the user is signed in and gains access to their data.

Upon successful login, the user's session is created.

If the email address or password is incorrect, the login request is rejected.

If the account does not exist, the login request is rejected.

Only authenticated users can access private data or perform user-specific operations.

### Password Management

Registered users may change their password at any time.

Changing a password updates the credentials used for login.

After a password change, the existing session remains valid.

The user must use the new password for subsequent login attempts.

Password changes do not affect the user's todos or other data.

### Session and Access Control

Upon successful login, a session is created for the user.

The session maintains the user's authentication state.

While authenticated, the user can access their private data and perform operations.

The user can only view and access their own todos and data.

The user cannot view, access, or share other users' todos or data.

All private data is isolated by user identity.

Guests are blocked from accessing any private data or performing private operations.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Creation and Management

Upon successful login, the system creates an active session for the user.

The session remains valid as long as the user continues to use the application.

When a user opens the application in a new browser tab or device, the system validates their session credentials.

A valid session allows the user to perform all member-level actions defined in the permission rules.

### User Logout

When a user explicitly chooses to sign out, the system terminates their active session.

After logout, the user is no longer authenticated and must sign in again to access their account.

Logging out does not delete any user data, including todos or account information.

After logout, all session-specific access to the application is revoked.

### Session Validation and Access Control

If a user attempts to access a member-only feature without an active session, access is denied.

If a session expires due to inactivity or other system conditions, the user is notified and must sign in again to continue.

The user cannot perform any member actions while their session is invalid or expired.

The system maintains session state separately for each browser tab or device where the user is signed in.

### Session Termination on Account Deletion

When a user deletes their account, all active sessions for that account are immediately terminated.

After account deletion, any previous session credentials are invalidated and cannot be used to sign in.

Account deletion is permanent and cannot be undone by signing in again.

### Session Security

The system tracks and maintains separate sessions for security purposes.

Each active session has a unique identifier that is used to validate user access.

Session data is protected and cannot be accessed by other users or unauthorized parties.

Session information is automatically cleaned up when the session is no longer needed or valid.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

Guests may register a new account by providing an email address and a password.

The email address must be unique across all accounts.

Users who are already signed in cannot register a new account.

If the email address is already in use, the registration request is rejected.

After registration, the user is automatically signed in.

### Account Deletion

Users may delete their own account.

When an account is deleted, all todos associated with that account are permanently deleted, including todos in the trash.

All edit history associated with the user's todos is also permanently deleted.

Account deletion is irreversible and cannot be undone.

Users must be signed in to delete their account.

### Password Change

Users may change their password while signed in.

The new password must be provided along with the current password for verification.

If the current password is incorrect, the password change request is rejected.

After a successful password change, the user remains signed in.

Guests cannot change passwords as they are not signed in.