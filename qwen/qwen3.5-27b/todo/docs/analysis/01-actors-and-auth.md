**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who has not signed in to the application. Guests have no access to any todo items or user data in the system. They can only access the sign-up and login pages to become authenticated. Guests cannot view, create, or interact with any todos in the application. The guest state is the default state before any authentication occurs. Guests must complete the registration process to gain access to todo functionality. Once a guest registers and logs in, they transition to member status. Guests have no persistent identity in the system until they create an account. The application treats all guests identically with no differentiation between them. Guest access is intentionally limited to protect user privacy and data security.

### Guest Definition

A guest is an unauthenticated user who has not signed in to the application. The guest state is the default state before any authentication occurs. Guests have no persistent identity in the system until they create an account. The application treats all guests identically with no differentiation between them. Guests exist only during their browser session and leave no trace in the system.

### Guest Access Restrictions

Guests have no access to any todo items or user data in the system. Guests cannot view any todos, including their own if they were previously created. Guests cannot create new todos. Guests cannot edit existing todos. Guests cannot delete todos. Guests cannot access any user profiles, including their own. These restrictions protect user privacy and ensure data security. Guests cannot view the trash or restore deleted todos. Guests cannot view edit history of any todos. All todo-related functionality requires authentication.

### Guest Authentication Pathways

Guests can only access the sign-up page to create a new account. Guests can only access the login page to sign in with existing credentials. Guests must complete the registration process to gain access to todo functionality. Guests must provide valid email and password to authenticate. Once a guest successfully logs in, they transition to member status. Authentication is required for all todo operations. The application does not support guest browsing of any todo content.

## member Actor

A member is an authenticated user who has successfully registered and logged in to the application. Members have full access to create and manage their own todo items. Each member owns a private collection of todos that other users cannot access. Members can view their own profile and edit their display name. Members can change their password to maintain account security. Members can permanently delete their account along with all associated todos. Members cannot view or access another user's todos or profile information. Each member's data is completely isolated from other members. Members can perform all todo operations including create, read, update, and delete. The member role grants full functionality within the user's own data boundaries.

### Member Identity

A member is an authenticated user who has successfully registered with an email and password and is currently logged in to the application. Members are the only actor type with access to todo functionality. Each member has a unique identity associated with their registered email address. Members maintain a profile containing a display name that can be viewed and edited by the member. The member role grants full access to create, view, edit, complete, and delete todo items within the user's own data boundaries.

### Member Todo Permissions

Members can create new todo items with a title, optional description, optional start date, and optional due date. Members can view their own todos in a paginated list showing title, completion status, dates, and creation date. Members can view the full details of any individual todo including the complete description. Members can mark their own todos as complete or incomplete, toggling between these two states. Members can edit their own todo's title, description, start date, and due date. Members can delete their own todos, which moves them to trash rather than permanently removing them. Members can restore deleted todos from trash back to the normal todo list. Members can permanently delete todos from trash, which also removes the todo's edit history. Members own all todos they create and have exclusive access to manage them.

### Member Profile Access

Members can view their own profile information including their display name. Members can edit their own display name. Members cannot view other members' profiles. The application is designed as a private todo application where each user's profile and data remain inaccessible to other users. Profile information is only accessible to the profile owner.

### Data Privacy and Isolation

Each member's todos are completely private and isolated from other members. Members can only access their own todos and cannot view, access, or interact with another user's todos. There is no sharing mechanism or feature that allows todo visibility across user boundaries. Each member's profile, todos, edit history, and trash contents are inaccessible to all other users. The private application design ensures complete data isolation between all members. Members cannot discover the existence of other users or their todo items through any means.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Guests can register for an account by providing an email address and password.

The email address must be unique and not already associated with an existing account.

The password must be provided during registration and cannot be empty.

Upon successful registration, the user is authenticated and becomes a member.

If the email address is already in use, the registration request is rejected.

If the password is missing or empty, the registration request is rejected.

### User Login

Guests can log in to the system by providing their email address and password.

The email address must match an existing account in the system.

The password must match the password associated with the email address.

Upon successful login, the user is authenticated and becomes a member.

The user can access their private todos and profile after successful authentication.

If the email address does not exist in the system, the login request is rejected.

If the password does not match the email address, the login request is rejected.

### Authentication State

Users are either unauthenticated (guests) or authenticated (members).

Guests have no access to view, create, edit, or delete todos.

Guests can only access registration and login functionality.

Members have full access to their own private todos and profile.

Members can view, create, edit, complete, and delete their own todos.

Members can view their own profile and edit their display name.

Members cannot view or access any other user's todos or profile information.

Authentication is required for all todo operations and profile access.

The system maintains the authentication state for the duration of the user's session.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user successfully logs in, the system creates a session for that user.

A session remains active until the user logs out or deletes their account.

The system associates all authenticated requests with the user's active session.

Each user's session is isolated from all other users.

The system uses the session to determine which user is making a request.

When a user's session is active, they can access their todos and profile.

When a user's session is not active, they cannot access their todos or profile.

### Logout Functionality

Users can log out from their account at any time.

When a user logs out, their current session is terminated immediately.

After logging out, users can no longer access their todos or profile.

Logging out returns the user to the guest state with no authentication.

Users must log in again to regain access to their todos and profile after logging out.

The logout function is available to all authenticated users.

When a user logs out, the system confirms logout completion to the user.

### Account Security

The system requires authentication for all access to user todos and profiles.

Guest users cannot access any user's todos or profile information.

Each user's session is isolated from all other users.

The system prevents unauthorized access to user data through session validation.

If a user attempts to access another user's todo, the system rejects the request.

The system validates session credentials on every authenticated request.

Invalid or expired sessions are rejected immediately.

The system does not share session information between different users.

Account deletion terminates all active sessions for that account immediately.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Guests can create an account by providing an email address and password. The system associates the newly created account with all todos created by that user. If the email address is already registered, the system rejects account creation. If the email or password is missing, the system rejects account creation.

### Account Deletion

Members can delete their account by requesting account deletion. When a member deletes their account, the system permanently removes the account and all associated data. The system permanently deletes all todos owned by the user, including todos in the trash. The system permanently deletes all edit history associated with the user's todos. If the user is not authenticated, the system rejects account deletion. After account deletion is confirmed, the user cannot access the application with that account.

### Password Change

Members can change their password. The system requires the member to be authenticated before allowing password changes. If the new password is missing, the system rejects the password change.