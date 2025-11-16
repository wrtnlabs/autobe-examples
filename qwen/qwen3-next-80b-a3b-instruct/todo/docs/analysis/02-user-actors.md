## User Actor Definition

### Primary Actor: User (Member)

The system supports exactly one user actor: **user** (classified as a "member"). This actor represents an authenticated individual who interacts with the Todo List application solely for personal task management. There are no guest, public, admin, or other roles permitted in this system. All functionality and data access are exclusively scoped to this single actor type.

This minimalist approach ensures security, simplicity, and privacy by design. There is no concept of shared lists, team collaboration, group access, or centralized administration. All data belongs to and is controlled by the individual user.

### Authentication Requirements

The system mandates authenticated access for all operations involving todo items. Unauthenticated access is explicitly prohibited. All interactions with the Todo List service require immediate and successful authentication prior to executing any action.

WHEN a user attempts to access, create, update, or delete a todo item, THE system SHALL require a valid authentication token.

WHEN authentication is not provided or is invalid, THE system SHALL reject the request with HTTP 401 Unauthorized status and return a clear error message indicating authentication is required.

The system SHALL NOT permit any CRUD operation on todo items unless the user has been successfully authenticated.

### Permission Scope

The user actor has complete ownership and control over their own todo items. The system grants the following permissions:

- THE user SHALL be able to create new todo items.
- THE user SHALL be able to view their own list of todo items.
- THE user SHALL be able to update the text and completion status of their own todo items.
- THE user SHALL be able to delete their own todo items.
- THE user SHALL be able to log out and end their session.

No permissions beyond these four core CRUD operations are granted. The user SHALL NOT be able to: view other users’ todo items, search or filter their list, sort items, assign priorities to items, set due dates, share items with others, or access any administrative controls.

### Access Restrictions

Access control is strictly enforced on a per-user basis. Data isolation is non-negotiable and absolute.

IF a user attempts to update or delete a todo item that does not belong to them, THEN THE system SHALL reject the action with HTTP 403 Forbidden status and return the error message: "You are not authorized to modify this item."

IF a user attempts to view a todo item that does not belong to them, THEN THE system SHALL return an empty result set or 404 Not Found, as if the item does not exist.

THE system SHALL enforce ownership automatically by binding every todo item to the authenticated user's unique identifier at creation time.

No user SHALL ever have visibility into, or access to, data belonging to another user, even if they somehow obtain an identifier or reference to that data.

### User Session Expectations

User sessions are managed through JSON Web Tokens (JWT). A valid token must be presented in the Authorization header for every request.

WHEN a user successfully authenticates, THE system SHALL generate and return a short-lived access token valid for a maximum of 15 minutes.

WHEN an access token expires, THE system SHALL automatically reject subsequent requests until the user re-authenticates.

THE system SHALL NOT issue refresh tokens. A user must re-enter their credentials to obtain a new access token after expiration.

WHILE a user is authenticated, THE system SHALL maintain their session state only via the token and SHALL NOT store session data server-side. The system is stateless.

### JWT Payload Requirements

All authentication tokens issued by the system shall contain a JWT payload with the following mandatory claims:

- "userId": a unique, immutable, non-reassignable, system-generated identifier for the user (format: UUID v4).
- "role": the string "user", indicating the actor type.
- "permissions": an array containing exactly one string element: "todo:crud".

THE system SHALL validate the userId in the JWT against the target todo item’s owner ID during every access attempt.

THE system SHALL reject any token lacking the "userId" claim, the "role" claim, or the "permissions" array with the required permission.

THE system SHALL treat any token containing a role other than "user" as invalid, even if issued by the system in error.

### Authentication Flow Summary

The complete user authentication and authorization flow is as follows:

1. The user opens the application and is presented with a login or registration interface.
2. The user provides their email and password.
3. THE system SHALL receive the credentials and validate them against the stored user record.
4. IF the credentials are valid, THEN THE system SHALL generate a JWT with the required payload (userId, role, permissions) and return it to the user.
5. IF the credentials are invalid, THEN THE system SHALL return HTTP 401 with a message: "Invalid credentials. Please try again."
6. The user's client stores the token (e.g., in localStorage) and includes it in the Authorization header for all subsequent requests.
7. For every request to a todo endpoint, THE system SHALL:
   a. Extract the token from the Authorization header.
   b. Validate the token’s signature and expiration.
   c. Decode the payload.
   d. Verify that the role is "user" and permissions array contains "todo:crud".
   e. Match the userId in the token with the todo item’s owner reference.
   f. If all validations pass, execute the requested operation.
   g. If any validation fails, return appropriate HTTP error (401 or 403).
8. When the user chooses to log out, THE client SHALL delete the token from storage. The server shall not maintain session state.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.