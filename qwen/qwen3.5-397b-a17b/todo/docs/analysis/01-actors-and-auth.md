**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who has not yet created an account or logged into the application. Guests can access the public landing page and navigate to the registration or login screens. They cannot view any todo lists or individual todo items. Guests cannot create, edit, or delete todos. They cannot access the trash feature or view edit histories. To gain access to todo functionality, a guest must register for an account by providing an email and password. After successful registration, the guest becomes a member with full access to their own todos. Guests have no visibility into other users' data or profiles. The system maintains complete privacy by restricting all todo operations to authenticated members only. Guests exist in a read-only state limited to authentication-related pages.

### Guest Identity and Access Scope

A guest is an unauthenticated visitor who has not created an account or logged into the application. Guests can access the public landing page and navigate to authentication-related pages only. All other pages and features are restricted to authenticated members. Guests exist in a read-only state with no ability to interact with todo data or application features beyond viewing the landing page and accessing registration or login screens. The system enforces complete privacy by preventing guests from accessing any user data or todo functionality.

### Guest Authentication Path

Guests can access the registration screen to create a new account by providing an email and password. Guests can access the login screen to authenticate with existing credentials. Account registration is required to gain access to any todo functionality. Upon successful registration with email and password, the guest transitions to member status with full access to their own todos. Until registration or login is completed, the user remains in guest status with no access to personal data or todo features.

### Guest Permission Boundaries

Guests have no permissions to view any todo lists or individual todo items. Guests cannot create, edit, or delete todos. Guests cannot access the trash feature to view or manage deleted todos. Guests cannot view edit histories for any todos. Guests have zero visibility into any user data, including their own data before authentication. The system enforces complete privacy by restricting all todo operations, data viewing, and feature access to authenticated members only. No guest can access, view, or interact with any todo-related content or user profiles.

## member Actor

A member is an authenticated user who has registered with an email and password and logged into the application. Members have full access to create, view, edit, and delete their own todos. They can mark todos as complete or incomplete with a simple toggle. Members can organize their todos using filters by completion status and sort by creation date, start date, or due date. They can view the complete edit history of any todo they own. Members can move todos to trash and either restore them or permanently delete them. Each member has a profile with a display name that they can edit at any time. Members can change their password through the account settings. The system enforces strict privacy rules where members cannot view, access, or share another user's todos. Members cannot view other users' profiles or any information about other accounts. All todo data is completely isolated per member with no cross-user visibility. When a member deletes their account, all their todos including those in trash are permanently removed.

### Member Identity

A member is an authenticated user who has registered with an email and password and successfully logged into the application. Members are identified by their email address used during registration. Once authenticated, members have access to all todo management features and account settings. Members remain authenticated until they explicitly log out or their session expires.

### Todo Creation and Management

Members can create todos with a required title and an optional description that may be left empty. Members can optionally set a start date and due date when creating a todo, or leave both fields empty. Newly created todos are marked as incomplete by default. Members can edit their todo's title, description, start date, and due date at any time. Members can mark a todo as complete or mark it as incomplete using a simple toggle between the two states. Members can delete their own todos, which moves them to the trash rather than permanently removing them.

### Todo Organization

Members can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Members can sort their todo list by creation date in either newest first or oldest first order. Members can sort their todo list by start date in either earliest first or latest first order, with todos that have no start date appearing at the end of the list. Members can sort their todo list by due date in either earliest first or latest first order, with todos that have no due date appearing at the end of the list.

### Edit History

Members can view the full edit history of any todo they own. Each time a todo is edited, a history entry is automatically created. Each history entry records when the edit was made and what changes were applied to the title, description, start date, or due date if any of these fields were modified. History entries are displayed sorted from most recent to oldest. Members can see what the title was changed to, what the description was changed to, what the start date was changed to, and what the due date was changed to for each edit in the history.

### Trash Management

Members can view a list of their deleted todos in the trash, which is paginated. Members can restore a deleted todo from the trash, which returns it to the normal todo list. Members can permanently delete a todo from the trash, which removes it and its edit history forever. When a todo is deleted by a member, it is soft deleted and no longer appears in the normal todo list but remains accessible in the trash until permanently deleted or until the member's account is deleted.

### Profile and Account Management

Each member has a profile with a display name that can be edited at any time. Members can change their password through the account settings. Members can delete their account, which permanently deletes all their todos including those in the trash along with all associated edit history. Account deletion is irreversible and removes all data owned by the member from the system.

### Privacy and Data Isolation

Each member's todos are completely private and isolated from all other users. Members can only see their own todos and cannot view, access, or share another user's todos in any way. Members cannot view other users' profiles or any information about other accounts. The system enforces strict data isolation where no cross-user todo access is possible. All todo data is scoped exclusively to the owning member with no exceptions for viewing or interaction.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address and a password. The email address must be unique across all accounts. Upon successful registration, the user becomes authenticated and can access the todo application features. If the email address is already in use, the registration is rejected. If the email format is invalid, the registration is rejected. If the password does not meet requirements, the registration is rejected.

### User Login

Users can log in to their account by providing their registered email address and password. Upon successful login, the user gains authenticated access to their private todo list. If the email address is not registered, the login is rejected. If the password is incorrect, the login is rejected. After successful login, the user can perform all member operations including creating, viewing, editing, and deleting their own todos.

### Authentication

Authentication is required to access todo features. Only authenticated users can create, view, edit, and delete todos. Unauthenticated visitors cannot access any todo functionality. Unauthenticated visitors can only navigate to the registration and login screens. Each user's todos are completely private and accessible only to that authenticated user. There is no way for any user to view, access, or share another user's todos.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

After successful login, users maintain an authenticated session that allows access to their todos and account features. The session persists until the user explicitly logs out or deletes their account. All todo operations and profile changes require an active authenticated session.

### Logout

Users can log out to end their authenticated session. After logging out, users become guests and can no longer access their todos or account features. Users must log in again to regain access to their private todo list and profile settings.

### Account Security

Users can change their password to maintain account security. When changing password, the user must provide their current password and a new password. After a successful password change, the user remains logged in with the updated credentials. This ensures users can update their security credentials without interrupting their session.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address and a password.
The email address must be unique across all user accounts.
The password is required and must be provided during account creation.
Upon successful account creation, the user becomes a member of the application.
The account is created with a profile that includes a display name.
The display name can be set or edited after account creation.
If the email address is already registered, the account creation request is rejected.
If the email address is missing, the account creation request is rejected.
If the password is missing, the account creation request is rejected.

### Account Deletion

Users can delete their own account at any time.
When a user deletes their account, all of their todos are permanently deleted.
This includes todos in the normal list and todos in the trash.
The edit history of all todos is also permanently deleted when the account is deleted.
Account deletion is irreversible and cannot be undone.
Once an account is deleted, the user can no longer log in with that account.
The email address from a deleted account becomes available for new account registration.
If the user has no todos, the account can still be deleted.
If the user has todos in any state (complete, incomplete, or in trash), they are all deleted along with the account.

### Password Change

Users can change their password after creating their account.
The user must provide their current password to change it.
The user must provide a new password to replace the current one.
The new password becomes effective immediately after the change is successful.
After changing the password, the user can log in with the new password.
The old password can no longer be used to log in after the change.
If the current password provided is incorrect, the password change request is rejected.
If the new password is missing, the password change request is rejected.
If the user is not logged in, they cannot change their password.