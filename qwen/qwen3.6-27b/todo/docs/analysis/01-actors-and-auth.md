**todoApp — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unregistered visitor interacting with the application without any authentication credentials. Because the entire todo system is private, guests possess zero permissions to access, view, or interact with any internal data. Guests cannot browse user profiles, todo lists, application settings, or any protected features without first creating an account. The only permitted action for a guest is to initiate the registration process to establish a new identity within the system. Until sign-up is fully completed, guests remain restricted to the public-facing registration interface with no entry into the private application environment.

### Guest Identity and Authentication Status

A guest is an unregistered visitor who has not yet created a user account within the application.
Guests do not possess any authentication credentials, such as an email address or password.
Without credentials, guests have no established identity within the application.
Guests exist outside the authenticated user ecosystem and are not associated with any user account.

### Guest Permissions and Access Boundaries

Guests have zero permissions within the application.
Guests cannot access, view, or interact with any todo items, user profiles, or application features.
The only action available to guests is to initiate the registration process to create a new account.
Guests are restricted exclusively to the public-facing sign-up interface.
Until a guest completes sign-up, they cannot proceed into the private application environment.

### Guest Data Visibility

Guests cannot view any application data under any circumstances.
No todo information, user profiles, or system content is visible to guests.
The private system boundary ensures complete data isolation for all registered user data.
Guests must sign up and authenticate as a member before any application data becomes accessible.

## member Actor

A member is a registered user who has successfully created an account using a valid email and password. Members possess comprehensive access to manage their personal todo items, including creating tasks, updating details, switching completion states, viewing edit histories, and managing items in the trash. They can apply sorting and filtering tools to organize their personal task lists according to their preferences. Members can manage their own user profile by editing their display name and control their account settings, such as changing their password or permanently deleting their account. Every member operates within strict privacy boundaries that completely prevent them from viewing, accessing, or modifying another user's todos, profiles, or data. All personal information remains exclusively accessible to the owning member without exception.

### #### Registered User Identity and Exclusive Data Ownership

A member is a registered user authenticated via a registered email address and password.

The system SHALL identify each member by their unique account linked to a registered email address.
The system SHALL maintain each member's registered email as their primary identifier.
Members hold exclusive ownership of all todos, edit histories, and personal data they create within the application.
Members retain ownership of their data even when todos are moved to trash.

### #### Personal Profile Editing

Members can manage their personal profile information, specifically their display name.

Members SHALL be able to edit their display name at any time.
Members are restricted to viewing only their own profile information.
Members SHALL not have the ability to view the profiles or personal information of other users.

### #### Complete Todo Lifecycle Control

Members have complete control over their own todos throughout the entire lifecycle, from creation through final deletion.

Members SHALL be able to create new todos with a title (required), description (optional), start date (optional), and due date (optional).
Newly created todos SHALL default to an incomplete status.
Members SHALL be able to toggle the completion status of their own todos between complete and incomplete.
Members SHALL be able to edit the title, description, start date, and due date of their own todos.
Every edit to a todo SHALL record a history entry detailing the timestamp and which fields were changed.
Members SHALL be able to view the full edit history of any of their todos, sorted from most recent to oldest.
Members SHALL be able to view their todo list, which is paginated and displays title, completion status, start date (if set), due date (if set), and creation date.
Members SHALL be able to view a single todo to see all its details including the full description.
Members SHALL be able to filter their todo list to show all todos, only complete todos, or only incomplete todos.
Members SHALL be able to sort their todo list by creation date, start date, or due date.
Todos without a start date SHALL appear at the end when sorting by start date.
Todos without a due date SHALL appear at the end when sorting by due date.
Members SHALL be able to delete their own todos, which moves them to trash (soft delete) and removes them from the normal todo list.
Members SHALL be able to view their trash list, which is paginated.
Members SHALL be able to restore deleted todos from trash back to their active list.
Members SHALL be able to permanently delete todos from trash, which also permanently deletes their edit history.

### #### Account Configuration Access

Members have access to manage their own account settings and control.

Members SHALL be able to change their password.
Members SHALL be able to permanently delete their own account, which also permanently deletes all their associated todos and data, including any items in trash.

### #### Isolated User Environment with Strict Privacy Boundaries

The system enforces strict privacy boundaries to ensure complete data isolation between members. Each member operates in their own private space with no cross-user access.

Members SHALL be restricted to viewing only their own todos and related data.
Members SHALL not have the ability to view, edit, or delete todos belonging to other users.
There SHALL be no mechanism for members to share their todos with other users.
The system SHALL ensure complete separation between the data of different members.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

Unregistered visitors can create a new account by providing an email address and a password.

When registration information is valid and complete, the system creates a new user account.

If the email address provided during registration is already associated with an existing account, the system rejects the registration request.

If the registration request contains missing or invalid information, the system rejects it and indicates the issue to the visitor.

After successful registration, the user can log in with the email and password used during registration.

### Login

Registered users can log in by providing their email address and password.

When login credentials are valid, the system authenticates the user and grants access to their personal account.

When the login request is denied, the system displays a generic error message that does not indicate whether the email or password was incorrect.

Unauthenticated visitors cannot access personal account features and are restricted to public-facing content such as the registration flow.

## Session and Logout

Define session behavior and logout from a user perspective.

### Active Session

WHEN a user successfully logs in with their email and password, THE system SHALL establish an active session for that user.

WHILE an active session exists, THE system SHALL grant the user access to view, create, edit, complete, and delete their todos; view their edit history; manage their trash; edit their profile; and access account management features.

Guests without an active session cannot access any user-specific features, including todo lists, profiles, or account management.

Each active session is associated with exactly one user account and provides access only to that user's data.

### Logout

A user with an active session can log out of the application.

WHEN a user logs out, THE system SHALL terminate their active session.

AFTER a user logs out, THE system SHALL deny access to all user-specific features until the user logs in again.

Logging out does not modify, delete, or affect any of the user's data including todos, edit history, or profile information.

### Account Security

Access to all user-specific features requires an active session established through email and password authentication.

If a user attempts to access features that require authentication without an active session, THE system SHALL deny the request.

Each user's todos and profile are accessible only through an active session tied to that user's account.

Account deletion (managed through account management features) permanently removes all user data and terminates any associated session.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

A guest can create a new account by providing an email address and a password. The email address must be unique within the system; if the email address is already associated with an existing account, the account creation is rejected. Upon successful account creation, the user is assigned a display name and an account creation date is automatically recorded. After account creation, the user transitions from a guest to a member with full personal todo management permissions. Each user profile is private and cannot be viewed by other users.

### Account Deletion

A member can delete their own account at any time. When an account is deleted, all todos owned by the user are permanently removed from the system, including todos currently stored in trash. All edit history entries associated with the user's todos are also permanently deleted as part of the account deletion process. Account deletion is irreversible and cannot be undone by any user or system process.

### Password Change

A member can change their password at any time. The user must authenticate with their current password before setting a new password. The new password must not be identical to the current password. After a successful password change, the new password immediately becomes the credential for future logins. The current password becomes invalid upon successful password change.