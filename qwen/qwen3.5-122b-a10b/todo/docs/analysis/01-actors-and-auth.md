**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not yet registered or logged in to the system. Guests can access the sign-up page to create a new user account with an email address and password. They can also access the login page to authenticate if they already have an account. Guests cannot view any todo items or access private user data. They cannot create, edit, or delete todos. Guests cannot view other users' profiles or any information about other users. The guest role represents the entry point before authentication occurs. Once a guest completes registration, they transition to a member actor. The guest role has no access to the core todo management functionality. All todo operations require authentication as a member.

### Guest Actor Identity

A guest is an unauthenticated user who has not yet registered or logged in to the system. The guest role represents the entry point to the system before authentication occurs.

Guests have no access to todo management functionality. All core operations require authentication as a member.

Guests cannot view any todo items, including other users' todos or their own (if they had an account). Guests cannot access private user data or view other users' profiles.

Once a guest completes registration with an email and password, they transition to the member actor role and gain full access to the todo management features.

### Public Page Access

Guests can access the sign-up page to create a new user account. The sign-up page allows guests to register with an email address and password.

Guests can access the login page to authenticate if they already have a user account. The login page allows guests to enter their email and password to gain access to the system.

These are the only pages and features accessible to unauthenticated users. All other system functionality requires member authentication.

### Restricted Operations

Guests cannot create, edit, or delete any todo items. Todo operations are restricted to authenticated members only.

Guests cannot view any todo items in the system. This includes both their own todos (if they had an account) and other users' todos.

Guests cannot view other users' profiles. Each user's profile information is private and accessible only to the profile owner after authentication.

Guests have no access to the todo list, trash, or edit history features. These operations require the user to be authenticated as a member.

### Registration Transition

When a guest completes the registration process by providing a valid email address and password, they transition from the guest actor to the member actor.

After successful registration, the newly created account becomes a member with full access to todo management features including creating, viewing, editing, and deleting todos.

The registration process is the only way for a guest to become a member. There is no alternative path to member status.

Once registered as a member, the user can log in with their email and password to access their private todo data.

## member Actor

A member is an authenticated user who has registered with an email and password and logged into the system. Members can create new todo items with a title, optional description, and optional dates. They can view their own list of todos with filtering and sorting capabilities. Members can mark todos as complete or incomplete, and edit todo details including title, description, and dates. They can soft delete todos which move them to trash, and restore deleted todos from the trash. Members can permanently delete todos from trash along with their edit history. They can view the edit history of their todos showing all changes made. Members can edit their display name in their profile. They can change their password for account security. Members can delete their account which permanently removes all their todos and history. Each member can only access their own todos and profile, never other users' data. The member role has full access to todo management within their private workspace.

### Member Actor Identity

A member is an authenticated user who has successfully registered with an email and password and logged into the system. Members have full access to create, view, edit, and manage their own todo items within their private workspace. Members can only access their own data and cannot view, access, or share another user's todos or profile information. Members can manage their account by editing their display name, changing their password, or deleting their account entirely.

### Todo Creation and Viewing Permissions

Members can create new todo items with a required title and optional description, start date, and due date. Newly created todos are incomplete by default. Members can view a paginated list of their own todos showing title, completion status, start date (if set), due date (if set), and creation date. Members can view a single todo to see all its details including the full description. Members can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Members can sort their todo list by creation date (newest or oldest first), start date (earliest or latest first), or due date (earliest or latest first). When sorting by start date or due date, todos without those dates appear at the end of the list.

### Todo Completion and Editing Permissions

Members can mark a todo as complete or incomplete through a simple toggle between the two states. Members can edit their todo's title, description, start date, and due date. Every edit made by a member is recorded in the todo's edit history. Members can view the full edit history of any of their todos, with history entries sorted from most recent to oldest. Each history entry shows when the edit was made and what values were changed for title, description, start date, and due date.

### Todo Deletion and Recovery Permissions

Members can delete their own todos, which moves them to trash rather than permanently removing them. Deleted todos no longer appear in the normal todo list. Members can view a paginated list of their deleted todos in the trash. Members can restore a deleted todo from the trash, returning it to the normal todo list. Members can permanently delete a todo from the trash, which also deletes its edit history.

### Profile and Account Management Permissions

Members can edit their profile display name at any time. Members can change their password for account security purposes. Members can delete their account, which permanently removes all their todos including those in trash and all associated edit history.

### Private Data Access Boundaries

Each member's todos are completely private. Members can only see their own todos and cannot view, access, or share another user's todos. Members cannot view other users' profiles. Data isolation is enforced so that members have exclusive access to their own workspace with no visibility into other members' data.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

New users can create an account by providing an email address and a password. The email address is required and must be unique across all user accounts. The password is required and must meet the system's security requirements. Upon successful registration, the user becomes a member and can access the application's features. If the email address is already registered, the registration request is rejected. If the email address or password is missing, the registration request is rejected.

### User Login

Registered users can log in to the application using their email address and password. Both the email address and password are required for authentication. When the credentials are valid, the system creates a session and grants the user access to their personal todo list. If the email address is not registered, the login request is rejected. If the password does not match the registered email address, the login request is rejected. After successful login, the user can perform all member actions on their own todos.

### Session and Access Control

After logging in, users maintain an active session that allows them to access the application without re-entering credentials. The session remains active until the user explicitly logs out or the session expires. Users can log out at any time to end their session and secure their account. When logged out, the user becomes a guest and can only access the registration and login pages. Guest users cannot view or access any todo data.

### Actor Definitions and Permissions

The application supports two actor types: guests and members. Guests are unauthenticated users who have not logged in. Guests can only access the registration and login pages. Members are authenticated users who have successfully logged in. Members can create, view, edit, and delete their own todos. Members cannot view, access, or share another user's todos. Each user's todos are completely private and isolated from other users.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user logs in with their email and password, the system creates an authenticated session for that user.

The session remains active while the user continues to interact with the application. During an active session, the user can access all their personal todos and perform operations on them.

If the session expires due to inactivity, the user is automatically logged out and must re-authenticate to continue using the application.

While logged in, users can only access their own data. The system enforces privacy by preventing users from viewing or accessing any todos belonging to other users.

### Logout

Users can log out of their account at any time from within the application.

When a user logs out, their session is terminated immediately. The user is returned to the login or sign-up page.

After logging out, the user must log in again with their email and password to access their todos.

Logging out does not delete any todos or data. All todos, including those in the trash, remain intact and will be accessible when the user logs back in.

### Account Security

Users can change their password at any time while logged into their account. The system requires the user to provide their current password before accepting a new password.

When a user deletes their account, all associated data is permanently removed. This includes all todos (both active and in the trash) and all edit history entries.

Account deletion is irreversible. Once an account is deleted, the user cannot recover their todos or any other data.

The system maintains privacy by ensuring that each user's todos are completely isolated. There is no mechanism for users to share, view, or access another user's todos.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create a new account by providing an email address and a password. The email address must be unique across all existing accounts. The password must meet minimum security requirements defined by the system. Upon successful registration, the user is automatically authenticated and logged into the system. If the email address is already registered, the account creation request is rejected. If the password does not meet security requirements, the account creation request is rejected. If required fields are missing, the account creation request is rejected.

### Password Management

Authenticated users can change their account password at any time. To change the password, the user must provide their current password for verification. The new password must meet the same security requirements as during account creation. If the current password is incorrect, the password change request is rejected. If the new password does not meet security requirements, the password change request is rejected. After a successful password change, the user remains authenticated with the new password. All active sessions may be invalidated to require re-authentication with the new password.

### Account Deletion

Users can delete their own account. When an account is deleted, all todos belonging to that user are permanently deleted, including todos in the trash. The edit history for all deleted todos is also permanently removed. Account deletion is irreversible and cannot be undone. After account deletion, the user can no longer log in with their email address. The email address from the deleted account may become available for future registration. If the user is not authenticated, the account deletion request is rejected.