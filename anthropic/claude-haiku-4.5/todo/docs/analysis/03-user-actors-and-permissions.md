# User Actors and Permissions for Todo List Application

## 1. Actor Definitions and Roles

### Actor: User
A **user** is an individual who registers for the Todo List application using a valid email address and password. The user is the only actor in the system. No guest, administrator, or third-party actors exist in this application. Focus is placed on user privacy and self-service.

- WHEN a person desires to manage personal tasks, THE system SHALL allow them to create a user account by completing registration.
- WHEN a user account exists, THE system SHALL recognize the user as the sole actor and grant access strictly to self-owned resources.
- THERE SHALL NOT be any administrative functions, roles, or special actors in this application. All interactions are as an authenticated user.
- THE system SHALL ensure no user has visibility or control over another user's data at any time.

#### Business Role Summary
- Only registered, authenticated users, referenced as 'user' in requirements, interact with the application.
- User privilege is limited to CRUD operations on self-owned todos; cross-user interaction is forbidden.

## 2. Authentication Requirements

### Registration
- WHEN a user initiates registration, THE system SHALL require both a valid email address and a password that meets minimum security criteria.
- WHEN all registration fields are valid and submitted, THE system SHALL create a user account and issue an authentication token.
- IF a duplicate email is provided, or the password is too weak, THEN THE system SHALL return a clear error specifying the exact registration failure.
- WHEN registration is complete, THE system SHALL NOT expose the user’s email or any details to any party other than that user themselves.

### Login & Session
- WHEN a user submits valid credentials, THE system SHALL authenticate the user, establish a session, and issue both an access token and a refresh token.
- IF a user provides incorrect credentials, THEN THE system SHALL return a specific error indicating failure to authenticate, without revealing which field was wrong.
- WHEN a user logs out, THE system SHALL invalidate both access and refresh tokens, terminating all sessions across devices immediately.

### Password Reset
- WHEN a user requests a password reset, THE system SHALL initiate a secure reset protocol via email (never transmitting the reset link or code to any other user or context).
- IF the user’s reset request cannot be verified, THEN THE system SHALL refuse the request and provide a clear, actionable error.

### Unauthenticated Access
- WHEN an API call is made without authentication, THE system SHALL deny the request and return an error stating that authentication is required.

### Data Ownership
- WHEN a user is authenticated, THE system SHALL ensure that the user can only operate (CRUD) upon their own todo items and no others.
- IF a user attempts to access, modify, or delete another user's todo item, THEN THE system SHALL return a permission error, denying the action and logging the attempt.

## 3. Permission Matrix

| Feature                      | user |
|------------------------------|------|
| Register account             | ✅    |
| Login                        | ✅    |
| Logout                       | ✅    |
| Create todo item             | ✅    |
| View own todo items          | ✅    |
| Update own todo items        | ✅    |
| Delete own todo items        | ✅    |
| View others' todo items      | ❌    |
| Edit others' todo items      | ❌    |
| Delete others' todo items    | ❌    |
| Access admin features        | ❌    |

- WHEN a user accesses any feature, THE system SHALL check permissions prior to operation and respond according to the matrix above.
- IF a user attempts an unauthorized action, THEN THE system SHALL deny access and return a business-specific error message with no sensitive internal details.

## 4. Session and Token Rules

- THE system SHALL use JSON Web Token (JWT) for all authentication processes.
- WHEN a user authenticates, THE system SHALL issue:
  - An **access token** valid for 30 minutes of inactivity
  - A **refresh token** valid for 14 days
- WHEN a refresh token is presented to renew the session, THE system SHALL fully validate and rotate the token, issuing new tokens if valid.
- IF a token (either access or refresh) is expired, malformed, or invalid, THEN THE system SHALL refuse access and prompt the user to log in again.
- WHEN a user logs out, THE system SHALL revoke both access and refresh tokens, terminating all sessions immediately.
- THE JWT payload SHALL contain only the userId, the 'user' role, and permitted actions related to self-owned todos.
- THE system SHALL recommend httpOnly cookie storage for all tokens and SHALL NOT allow refresh tokens to be accessed by client-side scripts.
- WHEN a user deletes their account, THE system SHALL automatically revoke all persistent sessions and erase user data as soon as feasible.
- THE system SHALL enforce permission checks for every backend endpoint that acts upon todo items, regardless of request method or operation type.

## 5. Security Principles and Audit Logging

### Security Expectations
- THE system SHALL never expose any user’s email address or personal information to any other user, neither intentionally nor through indirect means such as error messages or logs.
- THE system SHALL implement permission validation consistently for all API endpoints that read, write, update, or delete todo items.
- WHEN any forbidden or unauthorized action is attempted, THE system SHALL return a clear and specific error for the business context and NEVER expose internal technical information.

### Audit and Logging
- WHEN a permission error or security event occurs, THE system SHALL log the incident including userId (if known), event type, and timestamp for audit and review.
- THE system SHALL support audit review for all permission-denied, authentication-failed, and account-deletion events, in business event terms (not technical stack traces).

## 6. Mermaid Diagram: User Authentication and Permission Flow

```mermaid
graph LR
  UA["Unauthenticated User"] --> R["Register"]
  UA --> L["Login"]
  R --> AU["Authenticated User"]
  L --> AU
  AU --> C["Create Todo Item"]
  AU --> V["View Own Todos"]
  AU --> U["Update Own Todo"]
  AU --> D["Delete Own Todo"]
  AU -.-> O["Attempt Access to Others' Todos"]
  O -.-> X{"Permission Denied"}
  X -->("Error Response") AU
  C --> AU
  V --> AU
  U --> AU
  D --> AU
```

## 7. Edge Cases and Error Scenarios

- IF a user loses authentication due to token expiry, error messages SHALL prompt for re-authentication, never leaking sensitive data.
- IF a session hijacking attempt is detected (e.g., token reuse from a different device or IP), THEN THE system SHALL revoke all tokens for that user, log the event, and require password reset upon the next login attempt.
- IF a user attempts to modify or delete a todo while not authenticated, THEN THE action SHALL be denied and the event logged for review.
- WHEN a user attempts to register with a previously deleted email, THE system SHALL treat this as a new registration and SHALL NOT restore any deleted todos or user data unless otherwise required by law.

---

This specification defines the minimum viable, production-ready business requirements for all authentication, actor management, and permission scenarios in a minimalist Todo List application. It is written in implementation-free, EARS-compliant natural language and is suitable for use as a baseline for backend development and subsequent technical documentation.