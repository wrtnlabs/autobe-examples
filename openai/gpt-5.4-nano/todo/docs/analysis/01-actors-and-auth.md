**multiUserTodo — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest actor represents a person who has not authenticated with the application yet. This actor has no verified user identity inside the system, so they are treated as not belonging to any particular account. The guest actor’s permissions are limited to entry-point actions that allow someone to start using the service, such as creating a new account or signing in. When the guest actor tries to use actions meant for authenticated users, the application should block those requests and require authentication first. The guest actor must not be able to view any of a user’s private information, including any personal todo content. The guest actor is expected to receive clear guidance that authentication is needed rather than detailed personal data. Overall, the guest experience is about onboarding and gaining access, with all account-scoped features protected from unauthenticated use.

### Guest identity and lack of verified user identity

A visitor who has not signed in is treated as a guest actor with no verified user identity inside the system.

While a visitor remains a guest, the system must not treat them as belonging to any specific user account.

Any action that assumes an authenticated user context must be considered protected and therefore unavailable to the guest until the visitor signs in.

### Access-limited guest permissions for onboarding

The guest actor is allowed to use entry-point actions that enable onboarding, specifically:
- creating an account (sign up)
- signing in (log in)

When a guest attempts to access actions intended for signed-in users, the system must block the request and require the visitor to sign in first.

The guest experience must provide clear guidance that authentication is needed, rather than exposing any personal todo content.

### No viewing of private todo content

The guest actor must not be able to view any private todo content.

The guest actor must not be able to access or view personal details that belong to a specific user account.

If a guest attempts to access a specific user’s todo details or edit history, the system must deny access and require the visitor to sign in.

### Request blocking until signed in

When the guest actor submits a request for any protected action, the system must reject the request and prevent it from taking effect.

The system must ensure that even if the guest knows or provides identifiers for a todo or an account, the guest still cannot access that information without signing in.

After the visitor signs in, subsequent requests may be allowed according to the signed-in actor’s permissions; until then, protected requests remain blocked.

## member Actor

A member actor represents an authenticated user who has successfully signed in and is recognized as an account holder. This actor has a specific identity associated with their session, enabling access to account-scoped capabilities. The member actor is permitted to manage their own account and content within the application, based on the rules that apply to the authenticated user role. The member actor must be restricted from accessing anything that belongs to other users, even if they know about it indirectly. Their permissions should cover actions related to their own profile, todos, and related history while remaining unavailable to others. If a member actor attempts to perform an action that requires a different state (for example, an unauthenticated context), the application should respond by requiring the proper authentication status rather than performing the action. In short, the member actor is the authorized role for using all authenticated, account-bound features, with access boundaries that prevent cross-user access.

### Member Actor Identity and Authentication State Boundary

A member actor represents a user who has successfully signed in and is recognized as an account holder within an active session.

When an unauthenticated visitor attempts to access any capability reserved for signed-in users, the system must require the visitor to be properly authenticated instead of performing the requested action.

A member actor’s identity must be unambiguously tied to the user who owns the currently active session, so that all account-scoped behavior is applied to the correct user.

If the system cannot establish a member identity for the current session, the system must treat the actor as not eligible for member-only capabilities and must not expose account-scoped data.

The system must not infer or grant member privileges based on any indirect knowledge of another user’s information (for example, if a member knows details about another account), and must instead rely on the member actor identity established by authentication.

### Member Role Permissions: Allowed Access Scope

A member actor must be permitted to manage and view only account-scoped content that belongs to the member’s own user account.

A member actor must be permitted to access and edit the member’s own profile (including viewing and updating the display name).

A member actor must be permitted to create, view, edit, mark completion status, and delete todos that belong to the member’s own user account.

A member actor must be permitted to view and manage the edit history for todos that belong to the member’s own user account.

A member actor must be permitted to view deleted todos in the member’s trash and to restore or permanently delete items from that trash.

A member actor must be permitted to filter and sort the list of the member’s own todos as part of viewing the account’s todo list.

A member actor must be permitted to permanently delete a todo from the trash such that the todo’s edit history is also removed from the account’s permanently deleted content.

### Account-Scoped Access and Own Profile Access

A member actor must be restricted to accessing the member’s own profile only.

A member actor must not be able to view other users’ profiles, even if the member attempts to access them indirectly.

The member actor’s view of profile information must always correspond to the member’s authenticated user identity.

Any request that would require reading or modifying profile information that does not belong to the member must be blocked.

When a member actor attempts an action that would affect another user’s profile, the system must prevent the action and must not reveal information that would indicate the existence or details of other users’ profiles.

### Own Todo Management Capability

A member actor must be able to view a paginated list of the member’s own todos.

Each todo shown in the member’s todo list must reflect the member’s own account data and must include the todo’s title, completion status, and any applicable start date and due date, along with its creation date.

A member actor must be able to view the full details of a single todo that belongs to the member’s own account, including the full description.

A member actor must be able to toggle a todo between incomplete and complete within the member’s own account.

A member actor must be able to edit the member’s own todo fields, including title, description, start date, and due date.

A member actor must be able to view the member’s own todo edit history, with entries ordered from most recent to oldest.

A member actor must be able to delete a todo that belongs to the member’s own account, such that it no longer appears in the normal todo list and becomes available in the member’s trash.

### No Access to Other Users’ Data and Blocked Cross-User Access Attempts

A member actor must not have access to any data that belongs to other users.

This restriction includes, but is not limited to, viewing other users’ todos, viewing other users’ trash, viewing other users’ todo details, and viewing other users’ todo edit history.

If a member actor attempts to access or modify a todo (or any related details such as description or edit history) that belongs to another user, the system must block the attempt.

The system must not disclose whether the target todo exists when the request is blocked due to cross-user access boundaries.

If a member actor attempts to restore or permanently delete a deleted todo that belongs to another user, the system must prevent the action under the no-access-to-other-users rule.

For any blocked cross-user attempt, the system must ensure that no other user’s data is returned to the member actor as part of the response.

### Member Permissions Bound to Authentication State (Member-Only Capabilities)

Member-only capabilities must require the member actor to be authenticated and recognized as an account holder.

If a session is not authenticated as a member, the system must not allow actions that create or modify account content (including profile edits and todo creation or edits).

If a member actor’s authenticated identity is no longer valid for the current session, the system must stop treating the actor as a member and must require the proper authentication status before member-only access resumes.

The system must ensure the authentication-state boundary is enforced consistently across: profile access, todo list access, individual todo access, completion toggling, editing, deletion/trash operations, and viewing edit history.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration (Email and Password)

Users can create an account by providing an email address and a password.

The system must associate any newly created account with the provided email address.

If the email address is already in use, the system must reject the registration request.

If the password is missing, the system must reject the registration request.

If the registration request is missing the required email address, the system must reject the registration request.

After a successful registration, the user is able to log in using the same email address and password.

### Login (Email and Password)

Users can sign in by providing an email address and a password.

The system must authenticate the user based on the provided email address and password.

If the email address does not correspond to an existing account, the system must reject the login request.

If the password provided does not match the password for the account associated with the provided email address, the system must reject the login request.

After a successful login, the system must treat the user as authenticated so that they can access protected actions.

If a login attempt fails, the system must not grant authenticated access for that attempt.

### Authentication Requirement for Protected Access

The system must ensure that todo and profile features are only available to authenticated users.

Unauthenticated visitors (guests) must not be able to create, view, edit, complete, or delete any todos.

Unauthenticated visitors (guests) must not be able to view or edit any user profile information.

Only authenticated users can access account-scoped todo lists, individual todo details, and todo deletion and restoration actions.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Scope and Persistence

Each authenticated member interacts with the system through their own session.

While a session is active, the system treats the member as authenticated for member-only actions.

The system must associate all todo and profile actions with the session’s authenticated member, so a member can only manage their own data.

If a member attempts to access member-only actions without an active session, the system denies the action and requires the member to log in.

A new login for the same member results in a valid session for that member and allows member-only actions.

A member remains able to view their own session-protected resources during the period when the session is active.

A member’s session does not grant access to any other user’s todos or profile, even if the member knows identifiers for other users’ records.

If the system can no longer confirm an active session (for example, after it is no longer valid), the member is treated as unauthenticated for protected actions and must log in again.

### Logout Behavior

When a member logs out, the system ends the member’s current session.

After logout, the member must no longer be able to perform member-only actions until they log in again.

After logout, the system must not treat the member as authenticated based on any previous session.

Logging out must not delete the member’s account or affect the member’s existing todos; the only data deletion that occurs is the account deletion action described elsewhere.

If a member tries to log out while already logged out (no active session), the system treats the request as a successful no-op and does not create a new session.

A member who logs out and then logs back in again must receive an authenticated session appropriate for their account.

### Account-Security Boundaries for Protected Actions

Account security ensures that only authenticated members can manage their own account and data.

The system must restrict access to all todo operations (including viewing, creating, editing, completing, deleting, restoring, and permanently deleting from trash) to the authenticated member who owns the todo.

The system must restrict access to the profile’s display name viewing and editing to the authenticated member only.

The system must not provide any way to view, access, or share another user’s todos or profiles.

When an unauthenticated visitor attempts a protected action, the system denies the action.

When an authenticated member attempts an action on another member’s todo or profile, the system denies the action.

If a member’s account has been deleted, the system must treat that account as unavailable for authentication and must not allow the deleted member to log in.

Logout must always be sufficient to remove access for subsequent protected actions without requiring any additional action by the member.

### Session-to-Access Flow (Business View)

flowchart LR
    A["Unauthenticated visitor"] -->|"Requests a protected todo or profile action"| B["System checks session"]
    B -->|"No active session"| C["Action denied; member must log in"]
    B -->|"Active session for member"| D["Action allowed; member can manage only their own data"]

    D -->|"Member chooses to log out"| E["Session ends"]
    E --> A

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account using an email address and a password.

The system must create a new user identity when a sign-up is submitted with an email address and password.

Users can log in using their email address and password.

If an email and password combination does not correspond to an existing account, the login attempt is rejected.

Account creation establishes ownership of the user’s private todo data: each todo created by the user belongs to that user.

Newly created accounts are able to manage their own profile and todos after successful registration and login.

Accounts are scoped to the user: users can only access their own data, not other users’ data.

### Password Change

Users can change their password.

A password change applies only to the currently signed-in user.

If a user requests a password change while not signed in, the request is rejected.

The system must update the user’s credentials so that the new password can be used for subsequent logins.

The system must reject a password change request if required password inputs are missing.

The system must ensure that users remain able to continue using the application after successfully changing their password.

### Account Deletion

Users can delete their account.

When a user deletes their account, all todos owned by that user are permanently deleted, including todos that are currently in trash.

After account deletion, the user can no longer access their personal profile or any todos.

If a user attempts to delete an account while not signed in, the request is rejected.

Account deletion removes the user’s profile information from the application’s accessible user data.

Deleting an account is definitive: the system must not allow the deleted user’s account to be restored.