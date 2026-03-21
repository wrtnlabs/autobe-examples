**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated user who visits the application without logging in. Guests can create a new account by providing an email address and password during registration. After registration, guests become authenticated members with full access to the system. Guests can initiate the login process using their email and password credentials. Guests cannot access any personal features, view other users' data, or perform any todo-related operations. The guest role serves as the entry point for new users to establish their identity within the system. Access to sensitive operations is restricted until the guest successfully authenticates.

### Guest Identity

A guest is an unauthenticated user who accesses the application without having logged in. The guest has no established identity within the system and cannot be identified across sessions. When a guest visits the application, the system treats them as a temporary, unidentified user with no access to personal features or data.

### Guest Role Definition

The guest role represents the entry point for all users before they create an account or log in. This role exists to facilitate new user onboarding and provide unauthenticated users with the ability to register or log in. The guest role has strictly limited permissions and cannot access any personal data or todo operations.

### Registration with Email and Password

Guests can create a new account by providing an email address and a password. The email address must be valid and not already associated with an existing account. The password must meet any security criteria defined by the system. Upon successful registration, the guest transitions to an authenticated member and gains full access to the system.

### Account Creation Flow

The account creation process begins when a guest submits their email address and password. The system validates that the email address is not already in use and that the password meets requirements. If validation passes, the system creates a new user account associated with the provided email. The newly created account is immediately active, and the guest becomes an authenticated member who can start using all features of the system.

### Login Initiation

Guests can initiate the login process by entering their registered email address and password. The system validates the credentials and, if successful, establishes an authenticated session for the guest, transitioning them to a member. If the credentials are invalid, the login attempt is rejected and the user remains a guest.

### Guest Access Boundaries

Guests cannot access, view, modify, or delete any personal data stored in the system. Guests cannot view other users' information, access todo lists, or perform any operations that require authentication. All todo-related features, profile management, and account settings are inaccessible to guests. The system returns an appropriate error if a guest attempts to access restricted resources.

### Restricted Operations for Guests

Guests are restricted from performing any operations beyond registration and login initiation. Guests cannot create todos, view existing todos, edit content, delete items, or access trash. Guest users cannot change their password because they have no established account. Guest users cannot modify their profile because they do not have one. All attempts to access protected operations are denied.

### New User Onboarding

The guest role serves as the gateway for new users to establish their identity. Upon visiting the application, a guest can immediately proceed to register a new account using their email and password. After successful account creation, the new member can begin creating and managing their personal todos without any further onboarding steps. The transition from guest to member is seamless and grants immediate access to all features.

## member Actor

A member is an authenticated user who has successfully logged into the application using their email and password credentials. Members have a personal profile containing a display name that represents their identity within the system. Each member operates within a completely private workspace where all their todos and data are isolated from other users. Members can manage their own account, including changing their password and deleting their account entirely. The member role grants full access to create, view, edit, complete, and delete todos within the member's personal workspace. Members can access their trash to view deleted items and can permanently delete items from the trash. All operations performed by a member are scoped exclusively to that member's own data, ensuring complete data privacy from other users.

### Member Identity

A member is an authenticated user who has successfully completed the login process using their registered email address and password. The member's identity is established upon successful credential verification and remains active for the duration of their session. When a member interacts with the system, their authenticated identity is used to scope all operations to their personal data.

### Member Role Definition

The member role is assigned to any user who has successfully created an account and logged into the application. This role grants the user full access to manage their own todos, profile, and account settings. The member role does not provide any access to other users' data or system administration functions. A user transitions from guest to member status by completing the registration process and maintaining an active authenticated session.

### Personal Profile Ownership

Each member possesses a personal profile containing their display name. This profile is owned exclusively by the member and cannot be viewed, edited, or accessed by any other user. The member can update their display name at any time through account settings. Profile information is private and isolated within the member's personal workspace.

### Display Name Association

The member's display name is the identifier shown within the system when the member creates or edits todos. This display name is stored in their profile and can be modified by the member at any time. The display name serves as a personal identifier for the member's activities within their private workspace but is not visible to other users since all data remains private.

### Private Workspace Access

Each member operates within a completely private workspace that contains all their todos, edit history, and profile information. This workspace is isolated from all other users' data. The member can access, organize, and manage all items within their workspace without interference or visibility from others. No mechanism exists for members to view, access, or share data with other users.

### Account Management Permissions

Members have full permissions to manage their own account. This includes the ability to change their password at any time and delete their account entirely. When a member deletes their account, all associated data including todos in the normal list and trash are permanently removed. Account management actions are scoped to the authenticated member performing them.

### Member Access Boundaries

Member access is strictly limited to their own data. A member cannot view, modify, or interact with any todos, profiles, or information belonging to other users. The system enforces data isolation by scoping every operation to the authenticated member's identity. Access attempts to resources outside the member's ownership are rejected.

### Personal Data Ownership

All todos created by a member, including their titles, descriptions, dates, completion status, and edit history, are owned exclusively by that member. The member has full control over their personal data including creating new todos, editing existing ones, and managing deleted items in trash. Data ownership is established at creation time and persists throughout the data lifecycle.

### Member Authentication Status

The member's authentication status is active from the moment they successfully log in until they either log out or their session expires. An active authentication status allows the member to perform all permitted operations within their private workspace. The system validates the member's authenticated status before processing any request.

### Complete Access to Own Todos

Members have complete access to manage all aspects of their own todos. This includes creating new todos with title, description, start date, and due date; viewing todos in list or detail form; toggling completion status between complete and incomplete; editing todo properties with automatic history tracking; deleting todos to move them to trash; and permanently deleting items from trash. All todo operations are available to the member for their own data only.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

### User Registration

Guests can create a new account by providing their email address and a password.

The email address must be provided and must be in a valid format. The password must be provided and meet minimum security requirements.

If the email address is already registered to an existing account, the registration request is rejected and the guest is informed that an account with that email already exists.

Upon successful registration, a new user account is created with the provided email and password. The user becomes a member and can access the system.

### User Login

Members can log in to the system using their email address and password.

The email address and password must both be provided. The system validates the credentials against stored account information.

If the email address does not match any existing account, the login request is rejected.

If the password does not match the password stored for that email address, the login request is rejected.

Upon successful validation, the member is granted access to their private workspace.

### Authentication Requirements

THE system SHALL verify that the provided email address matches an existing account before checking the password.

THE system SHALL not reveal whether an email address is registered when login fails, to prevent enumeration of valid accounts.

THE system SHALL create a session upon successful login so that the member remains authenticated across multiple requests.

THE system SHALL require valid authentication for any operation that accesses or modifies the member's private data.

### Login Validation and Session

### Login Credential Validation

When a member attempts to log in, the system SHALL validate the email address format before checking account existence.

When the email address format is invalid, the system SHALL reject the login request.

When the email address format is valid but no account exists with that email, the system SHALL reject the login request with a generic error message indicating invalid credentials.

When the email address is valid and an account exists, but the password does not match, the system SHALL reject the login request with a generic error message indicating invalid credentials.

### Session Management

Upon successful login, the system SHALL establish an authenticated session for the member.

The session allows the member to access their private todos, profile, and perform authorized operations without re-authenticating for each request.

The session persists until the member logs out or the session expires due to inactivity.

### Authentication Error Conditions

### Registration Error Handling

If the email address is missing from the registration request, the system SHALL reject the request.

If the email address format is invalid, the system SHALL reject the request.

If the password is missing from the registration request, the system SHALL reject the request.

If the email address is already registered to an existing account, the system SHALL reject the request and inform the guest that an account with that email already exists.

### Login Error Handling

If the email address is missing from the login request, the system SHALL reject the request.

If the password is missing from the login request, the system SHALL reject the request.

If the credentials do not match any existing account, the system SHALL reject the request with a generic message indicating invalid credentials.

The system SHALL use the same error message for invalid email and invalid password to prevent attackers from determining which part of the credentials is incorrect.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Lifecycle

A session begins when a user successfully logs in with their email and password. The session represents the authenticated state of the user within the application. While a session is active, the user has access to their private todo list and can perform all member operations. The session persists until the user explicitly ends it or the session expires.

### Logout Operation

When a user chooses to log out, the session is terminated immediately. After logging out, the user becomes a guest and loses access to member-only features. The user must log in again to access their todos.

### Password Change

Users can change their password at any time while logged in. The system requires the user to provide their current password before setting a new one. A successful password change does not terminate the current session.

### Account Deletion

Users can delete their account at any time. When an account is deleted, all associated data including todos and edit history are permanently removed. This action cannot be undone. After deletion, the user's session is terminated immediately.

### Session Isolation

Users cannot view, access, or interact with other users' data. Each user's session is isolated and private. There is no shared access mechanism or way to view another user's todos.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create a new account by providing a valid email address and a password.

The email address serves as the unique identifier for the account and must not already be registered in the system.

The password must meet any security requirements defined for the application. Users are required to confirm their password by entering it twice during registration to ensure accuracy.

Upon successful account creation, the user is automatically logged into the system as a member and can begin using all features immediately.

### Account Deletion

Users can permanently delete their own account at any time.

When an account is deleted, all associated data is removed from the system. This includes the user's profile information and all todos created by that user.

All todos, including those that have been moved to trash, are permanently deleted. The user will no longer have access to any of their previous data.

This action is irreversible. Once an account is deleted, there is no way to recover the account or its associated data.

### Password Change

Users can change the password associated with their account at any time.

To change the password, the user must provide their current password for verification purposes. This ensures that only the account owner can modify the password.

The user then provides a new password that meets the application's password requirements. The new password must be entered twice to confirm accuracy.

Upon successful password change, the user's session remains active and they continue to be logged in without interruption.