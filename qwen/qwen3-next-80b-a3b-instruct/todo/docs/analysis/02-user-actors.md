# Todo List Application: User Actors and Authentication Requirements

## User Actor Overview

The Todo List application defines three distinct user actors, each with specific roles and permissions that determine their access to system functionality.

### User

- **Primary actor** for the system
- Individual who registers and manages their personal todo lists
- Has complete control over their own data
- Cannot access or modify any data belonging to other users
- Must authenticate to use any application features
- After registration, user has immediate access to create, read, update, and delete their own todo items

### Guest

- **Unauthenticated visitor** to the application
- Can view public landing page and application information
- Has no access to any private functionality including todo list management
- Must authenticate to access application features
- Cannot view, create, edit, delete or interact with any todo items
- Cannot view any user data, even publicly
- All guest interactions are limited to the landing page and authentication portals

### Admin

- **System administrator** with elevated privileges
- Cannot create or manage personal todo lists
- Has access to user management and system monitoring capabilities
- Responsible for maintaining system integrity and user account health
- Can view user account metadata for diagnostic and compliance purposes
- Cannot view, create, edit, or delete any todo items owned by users
- Account management actions are logged for audit trail purposes

## Authentication Requirements

### Core Authentication Functions

WHEN a guest attempts to access any protected resource, THE system SHALL redirect them to the authentication endpoint.

THE system SHALL allow users to register with a valid email address and secure password that meets minimum complexity requirements (at least 12 characters, including uppercase, lowercase, number, and special character).

WHEN a user submits valid registration credentials, THE system SHALL create a new user account with an active status and send a verification email.

THE system SHALL require users to verify their email address before completing registration. Registration is not complete until the verification link is clicked.

WHEN a user attempts to log in with valid credentials, THE system SHALL authenticate the user and establish a secure session.

THE system SHALL reject login attempts with invalid credentials and return a standardized error response containing no information about whether the email or password was incorrect.

WHEN a user successfully authenticates, THE system SHALL generate a JSON Web Token (JWT) containing essential user information.

THE system SHALL allow users to log out, which immediately invalidates their current session token.

WHEN a user attempts to log in from a new device or location, THE system SHALL require email verification confirmation via a one-time code sent to their registered email.

WHEN a user enters an incorrect password five times consecutively, THE system SHALL temporarily lock the account for 15 minutes.

WHEN a user requests a password reset, THE system SHALL send a time-limited reset link to their verified email address.

## Authorization Model

### Access Control Rules

WHEN a user attempts to access a todo list, THE system SHALL verify that the user's ID matches the owner ID of the requested list.

IF a user attempts to access another user's todo list, THEN THE system SHALL return HTTP 403 Forbidden status with error code ACCESS_DENIED and no information about whether the requested list exists.

THE system SHALL enforce strict isolation between user data at the database and application layer.

WHERE a user has authenticated, THE system SHALL grant access to all personal todo list functionality including create, read, update, and delete operations.

THE admin actor SHALL have read-only access to user account metadata (email, registration date, last login, account status) for system monitoring purposes.

WHEN an admin attempts to view user data, THE system SHALL log the action in the audit trail with timestamp, admin ID, and accessed user ID.

WHEN a user's account is deactivated, THE system SHALL immediately revoke all active sessions and deny all authentication requests for that account.

WHEN a user's email is changed, THE system SHALL invalidate all existing session tokens and require re-authentication.

## Session Management

WHILE a user is actively using the application, THE system SHALL maintain their authentication session.

WHEN a user has been inactive for 30 minutes, THE system SHALL automatically expire their session.

THE system SHALL allow users to manually terminate sessions from all devices through a security settings interface.

WHEN a session expires, THE system SHALL require re-authentication before allowing further access.

THE system SHALL use stateless session management with JWT tokens to ensure scalability.

WHEN a user logs in from a new device, THE system SHALL display a notification on their previously active devices listing the new login location and timestamp.

THE system SHALL allow users to review and disconnect all currently active sessions.

## JWT Configuration

THE system SHALL use JWT tokens for all authentication and authorization purposes.

THE JWT payload SHALL contain the following mandatory claims:

| Claim | Type | Description |
|-------|------|-------------|
| sub | string | User ID (UUID format) |
| email | string | User's verified email address |
| role | string | Actor role ("user", "admin") |
| exp | number | Expiration timestamp (UNIX epoch) |
| iat | number | Issued at timestamp (UNIX epoch) |

THE access token SHALL expire after 15 minutes of inactivity.

THE system SHALL issue a refresh token with a 14-day expiration for use in token renewal cycles.

THE refresh token SHALL be stored in an httpOnly, Secure, SameSite=Strict cookie.

THE access token SHALL not be stored persistently on the client-side (no localStorage/IndexedDB).

WHEN an access token expires, THE system SHALL require use of the refresh token to obtain a new access token.

IF a refresh token is invalid, expired, or tampered with, THEN THE system SHALL require full re-authentication.

THE system SHALL use HMAC-SHA256 algorithm with a cryptographically secure secret key to sign all JWT tokens.

THE system SHALL implement token rotation: every successful token refresh generates a new refresh token and invalidates the previous one.

## Permission Matrix

| Action | User | Guest | Admin |
|--------|------|-------|-------|
| View public landing page | ✅ | ✅ | ✅ |
| Register new account | ✅ | ✅ | ❌ |
| Login to account | ✅ | ❌ | ✅ |
| View own todo lists | ✅ | ❌ | ✅ |
| Create new todo list | ✅ | ❌ | ✅ |
| Edit own todo items | ✅ | ❌ | ✅ |
| Delete own todo items | ✅ | ❌ | ✅ |
| Mark todo items as complete | ✅ | ❌ | ✅ |
| View other users' todo lists | ❌ | ❌ | ✅ |
| Manage user accounts | ❌ | ❌ | ✅ |
| View system logs | ❌ | ❌ | ✅ |
| Logout from account | ✅ | ❌ | ✅ |
| Request password reset | ✅ | ✅ | ✅ |
| Change own password | ✅ | ❌ | ✅ |
| Revoke all active sessions | ✅ | ❌ | ✅ |

### Access Control Implementation Notes

1. User identification is based on the "sub" claim from JWT token, which maps to the database user ID
2. Data isolation is enforced at the database query layer using explicit user ID filtering
3. All API endpoints validate JWT signatures and extract user identity from claims
4. Admin privileges are determined by the "role" claim in the JWT token
5. The application has no endpoint that accepts user ID parameters from request body or URL without JWT validation
6. All authentication and authorization decisions are made at the application service layer
7. Authentication and authorization logic is centralized and reused across all endpoints
8. Unauthorized access attempts are logged for security monitoring
9. User session tokens are immediately invalidated upon logout, password change, or account deactivation

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team. The application shall ensure complete user data isolation between actors under all circumstances. All authentication flows must be implemented with industry-standard security practices, including protection against timing attacks, CSRF, and credential stuffing.