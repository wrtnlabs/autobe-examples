**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents any person who visits the application without being signed in. A guest has no user account and no stored identity within the system. Guests have the most restricted access level in the application. The only actions available to a guest are creating a new account by signing up and authenticating with existing credentials to log in. A guest cannot view, create, edit, complete, or delete any todos. The guest cannot access the trash, edit history, or any user profile — including their own, since they do not have one. When a guest attempts to access any member-only area, the system denies access and directs them to the login page. Guests cannot filter, sort, or paginate any todo lists because they have no todos to begin with. The guest role exists solely as the entry point into the application, and a guest transitions to the member role upon successful authentication.

### Guest Identity

A guest is any person who visits the application without being signed in. The guest has no user account and no stored identity within the system — the application does not retain any information about a guest between visits. The guest role exists solely as the entry point into the application, providing access only to the authentication functions that allow a person to either create a new account or sign in with existing credentials. Every person arriving at the application for the first time enters as a guest until they authenticate.

### Guest Permissions

The guest holds the most restricted access level in the application. A guest is permitted to perform exactly two actions: sign up to create a new user account, and log in with an existing email and password. These are the only operations the application makes available to an unauthenticated visitor. A guest has no access to any other feature or data within the application — no todos, no trash, no edit history, no user profiles. A guest cannot filter, sort, or paginate any data because no data is associated with an unauthenticated visitor.

### Access Restrictions

The guest is explicitly denied access to all member-only areas of the application:

- **Todos**: A guest cannot view, create, edit, complete, or delete any todo. The guest has no todo list and cannot see any other user's todos.
- **Trash**: A guest cannot access the trash. There is no trash to view because no todos have been deleted by a guest.
- **Edit History**: A guest cannot view any edit history. No todo editing is possible for a guest, and edit histories belong to member-owned todos.
- **User Profiles**: A guest cannot view any user profile — including their own, since they do not have one. The application is a private todo space where profile viewing is reserved for the profile's owner.

### Access Denial and Role Transition

When a guest attempts to access any member-only area — such as the todo list, trash, edit history, or a profile page — the system denies the request and directs the guest to the login page. This redirection ensures the guest is presented with the opportunity to authenticate and gain the appropriate access level.

The guest transitions to the member role upon successful authentication through either login (with existing credentials) or sign-up (which creates a new account and authenticates the user in a single flow). Once authenticated, the former guest becomes a member and gains the full set of member permissions (defined in the member Actor section).

There is no path from guest to any other role — only the member role is reachable through authentication.

## member Actor

The member actor represents an authenticated user who has successfully signed up and logged into the application. A member possesses a registered user account with an email, password, and display name. Members have full ownership and control over their own todos. They can create, view, edit, complete, and delete their todos without restriction. Members can access their personal trash to review, restore, or permanently delete previously removed todos. They can view the complete edit history for any of their own todos. Members can manage their profile by updating their display name and can change their account password. A member can also choose to delete their own account, which permanently removes all their data including todos, trash entries, and edit histories. The defining access boundary for the member role is strict privacy isolation: a member can never view, access, modify, or interact with any other user's todos, profile, trash, or edit history. There is no sharing, collaboration, or cross-user visibility of any kind within the application.

### Member Definition and Identity

A member is an authenticated user who holds a registered account in the todoApp system. A member possesses a unique email address, a password credential, and a display name. The member role is the only role with access to the application's todo management features. Membership is established through successful registration and is maintained through authenticated login sessions.

### Permission Overview

Members have full ownership and control over their own data. The following matrix summarizes member permissions across all resources:

| Resource | Create | View Own | Edit | Delete / Remove | View Others' |
|----------|--------|----------|------|-----------------|-------------|
| Todo | Yes | Yes | Yes | Yes (soft delete) | No |
| Trash | N/A | Yes | N/A | Yes (permanent delete and restore) | No |
| Edit History | N/A | Yes | No | N/A | No |
| Profile (Own) | N/A | Yes | Yes (display name) | Yes (full account deletion) | No |

All permissions are scoped exclusively to the member's own data. Cross-user access does not exist in any form.

### Todo Permissions

Members have unrestricted ownership of their own todos. Specifically, a member can:

- Create a new todo with a title (required) and an optional description, start date, and due date. Newly created todos are incomplete by default.
- View a paginated list of their own todos, with optional filtering by completion status and sorting by creation date, start date, or due date.
- View the full details of any single todo they own, including its complete description.
- Edit any of their todo's title, description, start date, and due date fields. Each edit is recorded in the todo's edit history.
- Toggle any of their todos between complete and incomplete states.
- Delete any of their own todos, which moves them to a soft-deleted state in the trash rather than permanently removing them.

Members cannot create, view, edit, toggle, or delete any todo belonging to another user.

### Trash and Edit History Access

Members can access their personal trash, which contains all of their soft-deleted todos. Within the trash, a member can:

- View a paginated list of their deleted todos.
- Restore a deleted todo, which returns it to the active todo list in its prior state.
- Permanently delete a todo from the trash. Permanent deletion removes both the todo and all of its associated edit history entries.

Members can view the complete edit history of any of their own todos. The edit history is presented as a chronological list, sorted from most recent to oldest. Each history entry records the date and time of the edit along with the new values for any fields that were changed (title, description, start date, due date). Individual edit history entries cannot be modified or deleted except through permanent deletion of the parent todo. Members cannot view the edit history of another user's todos.

### Profile and Account Management

Members can manage their own profile and account settings. Specifically, a member can:

- Edit their display name at any time.
- Change their account password.
- Delete their entire account.

When a member deletes their account, every piece of data associated with that account is permanently and irreversibly removed. This includes all todos (both active and soft-deleted), all trash entries, and all edit history records belonging to that member. Account deletion cannot be undone.

### Privacy and Isolation Boundaries

The defining characteristic of the member role is strict privacy isolation. Every piece of data a member creates — todos, trash entries, and edit history — is accessible only to that member and to no other user. The system enforces the following absolute boundaries:

- A member cannot view another user's profile, including their display name.
- A member cannot view, access, or interact with another user's todos in any way.
- A member cannot see another user's trash entries or edit history.
- No sharing or collaboration features exist within the application. There is no mechanism for one member to grant another member access to their data.

These boundaries are absolute. There are no exceptions, no administrative overrides, and no pathways for cross-user visibility of any kind.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

A guest may register for an account by providing an email address and a password.

Both email and password are required. If either field is missing, the registration request is rejected.

The email address must be unique across all users. If the provided email is already associated with an existing account, the registration request is rejected.

Upon successful registration, a new user account is created. The guest becomes a member and is immediately recognized as authenticated.

The user's display name is initially empty after registration. The user may set a display name later through their profile.

### Login

A guest or member may log in by providing a registered email address and its corresponding password.

Both email and password are required. If either field is missing, the login request is rejected.

If the provided email does not match any registered account, the login request is rejected.

If the provided password does not match the password on record for the given email, the login request is rejected.

Upon successful login, the user is recognized as authenticated. A member who is already logged in and logs in again is still recognized as authenticated under their identity.

### Authentication

Authentication establishes the user's identity for the duration of their interaction with the application.

A user who has not completed registration or login is a guest. A guest has no authenticated identity.

A user who has successfully completed registration or login is a member. The system recognizes the member and associates all subsequent actions with that member's account.

Authentication is required for all actions beyond registration and login. The system rejects any request that requires an authenticated identity when none is present.

Authentication persists until the user explicitly logs out. Logout behavior is described in the Session and Logout section.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

A session is established when a member successfully logs in. The session represents the authenticated state that allows the member to access their private todos and perform all actions available to the member actor.

A session persists until one of the following occurs:

- The member explicitly logs out.
- The member changes their password (see Account Security and Sessions).
- The member deletes their account (see Account Security and Sessions).

Only one actor is associated with a session at any time. Sessions are private to the member who established them. A guest — being unauthenticated by definition — does not have a session.

### Logout

A member can log out at any time while authenticated. Logging out ends the current session immediately.

After logging out:

- The user is no longer authenticated and returns to the guest state.
- Any subsequent request that requires authentication is rejected.
- The user must log in again to regain access to their todos.

Logout does not affect the member's data — todos, edit history, and trash contents are preserved and remain accessible after the member logs back in.

### Account Security and Sessions

Certain account-level changes affect all active sessions for that account.

**Password Change**

When a member changes their password, all existing sessions for that account are ended immediately. The member must log in again using the new password.

**Account Deletion**

When a member deletes their account, all existing sessions for that account are ended immediately and permanently. Since the account and all associated data are permanently removed, logging back in is no longer possible.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

When a guest completes the sign-up process, a member account is created. The account consists of an email address and a password, which serve as the member's credentials for future logins. A user profile is also created and associated with the account, initialized with an empty display name.

Once the account exists, the guest becomes a member and gains access to all member capabilities — creating and managing todos, viewing the personal todo list and trash, and managing the account itself.

### Password Change

An authenticated member can change their password at any time. To do so, the member must supply their current password and a new password. If the current password is incorrect, the change is rejected. If the current password is correct, the account's password is updated to the new password, and the member can use the new password for subsequent logins.

### Account Deletion

An authenticated member can delete their own account. Account deletion is irreversible and has the following consequences:

- All todos belonging to the member are permanently deleted, including todos currently in the trash.
- All edit history entries associated with those todos are permanently deleted.
- The member's profile is permanently deleted.
- The member's account credentials are permanently deleted.

After account deletion, the former member can no longer log in, and no data associated with the account remains in the system.