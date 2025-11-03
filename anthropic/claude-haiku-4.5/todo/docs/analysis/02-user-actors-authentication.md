# User Actors, Authentication & Access Control

## User Actor Architecture

### Overview
The Todo application implements two distinct user actor types: regular Users and Administrators. Each actor has clearly defined permissions and capabilities that govern their interaction with the system.

### User Actors

#### 1. User (Member Actor)
**Purpose**: Regular authenticated user who manages their personal todo items.

**Capabilities**:
- Register for a new account
- Authenticate and log in to the system
- Create, view, update, and delete their own todo items
- Manage their account settings and preferences
- Log out from the system
- Reset forgotten passwords
- Manage their own personal todo list

**Scope**: Users have access only to their own todo data and cannot view, modify, or access other users' todos.

**Primary Use Case**: Individual managing their personal task list independently.

**Account Lifecycle**:
- Created upon self-registration
- Active until user requests deletion or admin suspends account
- Can reactivate suspended accounts by resetting password

#### 2. Admin (Administrator Actor)
**Purpose**: System administrator with elevated permissions for operational oversight and user management.

**Capabilities**:
- All User capabilities (can also manage personal todos)
- View all system users and their information
- View aggregated system statistics and metrics
- Delete user accounts and manage account status
- Monitor system health and usage
- Perform administrative maintenance tasks
- Access audit logs and security events
- View all todos in the system for compliance purposes

**Scope**: Administrators have access to all user data and system-wide information for management and monitoring purposes.

**Primary Use Case**: System operator ensuring platform stability and managing users.

**Account Lifecycle**:
- Assigned during system initialization
- Can be created by other admins
- Subject to more restrictive session policies than regular users

---

## Authentication Requirements

### User Registration Flow

#### Registration Process

WHEN a prospective user accesses the registration interface, THE system SHALL allow them to create a new account by providing the following information:
- Email address (required)
- Password (required)
- Password confirmation (required for verification)
- Full name (optional)

WHEN a user submits registration information, THE system SHALL:
1. Validate that the email address is in valid email format (RFC 5322 standard, e.g., user@example.com)
2. Validate that the email is not already registered in the system
3. Validate that the password meets minimum requirements (minimum 8 characters)
4. Validate that both password fields match exactly
5. Create the user account with the provided information
6. Store the password in a secure hashed manner (using bcrypt or Argon2, never plaintext)
7. Set account status to "active"
8. Automatically log the user in upon successful registration
9. Create an empty personal todo list for the new user
10. Generate and issue a JWT access token with 30-minute expiration

IF a user attempts to register with an email address that already exists, THEN THE system SHALL return error code AUTH_EMAIL_ALREADY_EXISTS with message "An account with this email already exists. Please log in or use a different email."

IF a user provides a password shorter than 8 characters, THEN THE system SHALL reject the registration and display message "Password must be at least 8 characters long."

IF passwords provided do not match, THEN THE system SHALL display message "Passwords do not match. Please re-enter your password."

IF email format is invalid, THEN THE system SHALL display message "Please enter a valid email address (e.g., user@example.com)."

#### Registration Success Response

Upon successful registration, THE user SHALL receive:
- Confirmation message indicating account creation
- JWT access token for subsequent authenticated requests
- User ID and email confirmation
- Token expiration time (30 minutes from issuance)
- Immediate redirect to their personal todo dashboard

### User Login Flow

#### Login Process

WHEN an authenticated user attempts to log in, THE system SHALL:
1. Request email address and password from the user
2. Validate that both email and password fields are provided
3. Verify the email exists in the system database
4. Retrieve the hashed password associated with the email
5. Verify the provided password matches the stored hashed password using constant-time comparison
6. Upon successful verification, create a user session
7. Generate a JWT access token containing user information
8. Return authentication success response with the token
9. Set secure cookies (HttpOnly, Secure flags) if using cookie-based session storage

IF a user provides an email address that does not exist, THEN THE system SHALL deny access and return error code AUTH_USER_NOT_FOUND with message "We couldn't find an account with that email address."

IF a user provides an incorrect password, THEN THE system SHALL deny access and return error code AUTH_INVALID_CREDENTIALS with message "Your password is incorrect. Please try again."

IF either email or password fields are empty, THEN THE system SHALL return error code AUTH_MISSING_CREDENTIALS with message "Please provide both email and password."

IF a user attempts login multiple times with incorrect password (more than 5 failed attempts within 15 minutes), THEN THE system SHALL temporarily lock the account for 30 minutes and return message "Too many failed login attempts. Your account is temporarily locked. Please try again later."

#### Login Response

Upon successful login, THE user SHALL receive:
- JWT access token for subsequent authenticated requests
- Refresh token (valid for 7 days) for obtaining new access tokens
- Token expiration time (30 minutes for access token)
- User ID, email, and role information
- Redirect to their personal todo dashboard
- Any preferences or settings associated with their account

### Session Establishment

WHEN a user successfully authenticates, THE system SHALL create a session that:
- Associates the user's identity with their authenticated state
- Maintains the user's login status across multiple requests
- Persists for the duration specified by token expiration
- Stores session metadata (login timestamp, IP address, user agent)
- Provides ability to terminate the session on logout

---

## User Permissions & Access Control

### Permission Scope

#### User Permissions (Member Actor)

THE regular User actor SHALL have permission to:
- Create new todo items in their personal todo list
- View all their own todo items (active and completed)
- View individual todo item details
- Update and modify their own todo items (title, description, status, priority, due date)
- Delete their own todo items permanently
- Update their own account information (email, full name, password)
- View their own account details and preferences
- Log out from their session
- Request password reset if forgotten
- Change their password while authenticated

THE regular User actor SHALL NOT have permission to:
- View other users' todo items under any circumstances
- Modify other users' todo items
- Delete other users' todo items
- Access administrative functions or dashboards
- View system statistics or metrics
- Delete other user accounts
- Access other users' account information
- Change other users' passwords
- Perform bulk operations on system data
- Access audit logs

#### Admin Permissions (Administrator Actor)

THE Admin actor SHALL have permission to:
- All User permissions (manage their own todos and account)
- View a complete list of all registered users in the system
- View detailed information about any user account (email, registration date, status, login history)
- Change status of any user account (active, suspended, deleted)
- Delete any user account and associated data from the system
- View system-wide statistics (total users, active users, total todos, completion rates)
- Monitor system health and performance metrics
- Access audit logs showing all administrative actions
- View activity logs of user logins and operations
- Perform system maintenance operations
- Modify system configuration settings
- Export user data and reports

THE Admin actor SHALL NOT have permission to:
- Modify other users' todo items (even as an admin, todos belong to users)
- Delete other users' todo items individually (deletion only through account deletion)
- Access sensitive user data not required for administration (like stored passwords)
- Modify other users' passwords directly (users must use password reset flow)
- Disable security features or authentication mechanisms

### Permission Enforcement

WHEN a user attempts to access or modify a todo item, THE system SHALL verify that the user is either:
- The owner of the todo item (if User actor), OR
- An Admin actor with administrative privileges

IF the user is not the owner and is not an Admin, THEN THE system SHALL deny the action and return error code PERMISSION_DENIED with message "You do not have permission to access this resource."

WHEN a user attempts to access administrative functions, THE system SHALL verify that the user has Admin role assigned in their authentication token.

IF the user does not have Admin role, THEN THE system SHALL deny access and return error code ADMIN_ONLY_OPERATION with message "This operation is restricted to administrators. Please contact your system administrator."

WHEN an admin accesses another user's todo data, THE system SHALL:
- Log the access action with timestamp and admin ID
- Record the purpose or context if available
- Maintain audit trail for security and compliance purposes
- Restrict the admin view (read-only, cannot modify user todos)

---

## Permission Matrix

| Action | Regular User | Admin |
|--------|------|----------|
| Create own todo | ✅ Yes | ✅ Yes |
| View own todos | ✅ Yes | ✅ Yes |
| Update own todo | ✅ Yes | ✅ Yes |
| Delete own todo | ✅ Yes | ✅ Yes |
| View other users' todos | ❌ No | ✅ Yes (read-only) |
| Modify other users' todos | ❌ No | ❌ No |
| Delete other users' todos (individually) | ❌ No | ❌ No |
| View all users list | ❌ No | ✅ Yes |
| View user account details | ❌ No | ✅ Yes |
| Delete user accounts | ❌ No | ✅ Yes |
| View system statistics | ❌ No | ✅ Yes |
| Access audit logs | ❌ No | ✅ Yes |
| View activity logs | ❌ No | ✅ Yes |
| Modify system settings | ❌ No | ✅ Yes |
| Update own profile | ✅ Yes | ✅ Yes |
| Change own password | ✅ Yes | ✅ Yes |
| Reset own password | ✅ Yes | ✅ Yes |
| Access admin panel | ❌ No | ✅ Yes |
| Create admin accounts | ❌ No | ✅ Yes (limited) |

---

## Session Management

### JWT Token Structure

#### Token Type

THE system SHALL use JWT (JSON Web Tokens) as the primary authentication mechanism for all API interactions.

WHEN a user authenticates, THE system SHALL generate and issue a JWT token with the following characteristics:
- Algorithm: HS256 (HMAC with SHA-256) or RS256 (RSA with SHA-256)
- Format: Three base64-encoded segments separated by periods (header.payload.signature)
- Digital signature ensuring token integrity and authenticity
- Expiration enforced both in token claim and server-side validation

#### Token Payload Requirements

THE JWT token SHALL contain the following claims in its payload:

**Required Claims:**
- **userId**: Unique identifier of the authenticated user (string, e.g., "usr-12345abc")
- **email**: Email address of the user (string, e.g., "john@example.com")
- **role**: User's actor type/role ("user" or "admin")
- **permissions**: Array of permission codes the user possesses (array of strings)
- **iat**: Issued-at timestamp (Unix epoch, when token was created)
- **exp**: Expiration timestamp (Unix epoch, when token becomes invalid)

**Optional Claims:**
- **accountStatus**: Current account status ("active", "suspended", "deleted")
- **loginTime**: Timestamp when user logged in
- **sessionId**: Unique session identifier for tracking

#### Example JWT Payload

```json
{
  "userId": "usr-12345abc",
  "email": "john@example.com",
  "role": "user",
  "permissions": ["create_todo", "read_todo", "update_own_todo", "delete_own_todo"],
  "accountStatus": "active",
  "iat": 1704067200,
  "exp": 1704070800
}
```

#### Admin Token Example

```json
{
  "userId": "admin-67890def",
  "email": "admin@example.com",
  "role": "admin",
  "permissions": ["create_todo", "read_todo", "update_own_todo", "delete_own_todo", "view_users", "delete_users", "view_audit_logs", "modify_system_settings"],
  "accountStatus": "active",
  "iat": 1704067200,
  "exp": 1704070800
}
```

### Token Expiration & Lifetime

#### Access Token Expiration

THE access token issued upon login SHALL expire after 30 minutes of the token's issuance time (not based on inactivity).

WHEN a user receives an access token, THE token SHALL contain an expiration time set to 30 minutes after the current UTC timestamp.

THE expiration time is absolute, not sliding; each token has a fixed lifetime regardless of activity.

#### Refresh Token Mechanism

THE system SHALL also issue a refresh token alongside the access token with extended expiration (7 days).

WHEN an access token expires, THE user SHALL use the refresh token to request a new access token without re-entering credentials.

WHEN a user submits a refresh token request, THE system SHALL:
1. Validate the refresh token is not expired
2. Validate the refresh token belongs to an active user account
3. Issue a new access token (30-minute expiration)
4. Optionally issue a new refresh token (extending the refresh cycle)

IF the refresh token has expired (older than 7 days), THEN THE system SHALL deny the request and require the user to re-authenticate with email and password.

#### Token Refresh Flow

WHEN a user's access token expires and they attempt an API request, THE system SHALL:
1. Detect the expired token
2. Return error code AUTH_TOKEN_EXPIRED with HTTP 401 status
3. Include a message instructing the user to refresh their session
4. Allow the client application to use the refresh token to obtain a new access token

### Token Usage & Validation

#### Token Presentation

WHEN making authenticated requests, THE user SHALL include their JWT token in the HTTP Authorization header using the format: `Authorization: Bearer [token]`

The token SHALL appear exactly after the word "Bearer" with a single space separator.

IF the Authorization header is present but malformed, THEN THE system SHALL reject the request and return error code AUTH_INVALID_HEADER.

#### Token Validation

WHEN the system receives an authenticated request, THE system SHALL:
1. Extract the JWT token from the Authorization header
2. Verify the token's digital signature using the secret key
3. Verify the token has not expired by comparing exp claim to current UTC time
4. Extract and validate the user information from the token (userId, email, role)
5. Verify the user account is still active (not suspended or deleted)
6. Proceed with the request if all validations pass

IF the token is missing from an authenticated request, THEN THE system SHALL return error code AUTH_TOKEN_MISSING with HTTP 401 status.

IF the token signature is invalid or has been tampered with, THEN THE system SHALL return error code AUTH_INVALID_TOKEN with HTTP 401 status.

IF the token has expired, THEN THE system SHALL return error code AUTH_TOKEN_EXPIRED with HTTP 401 status and include instruction to refresh token.

IF the user's account is suspended or deleted, THEN THE system SHALL return error code AUTH_USER_INACTIVE with HTTP 401 status.

### Logout & Session Termination

#### Logout Process

WHEN a user initiates logout, THE system SHALL:
1. Receive the logout request with the user's current access token
2. Invalidate the user's current session
3. Mark the user as logged out in session storage
4. Clear any cached session data
5. Return success confirmation

THE system MAY optionally maintain a token blacklist of revoked tokens to prevent reuse of old tokens.

WHEN a user attempts to use a token after logging out, THE system SHALL return error code AUTH_SESSION_ENDED with message "Your session has ended. Please log in again."

#### Multiple Session Handling

WHEN a user logs in from a different device or browser window, THE system SHALL:
- Create a new session for the new login
- Allow the previous session to remain active (concurrent sessions allowed)
- OR terminate the previous session if single-session-per-user policy is enforced

THE behavior is configurable per security policy; the default is to allow multiple concurrent sessions.

#### Session Termination by Admin

WHEN an admin terminates a user's session, THE system SHALL:
1. Invalidate all active tokens for that user
2. Terminate any active sessions
3. Log the action in audit trail with admin ID and timestamp
4. Notify the user of forced logout (optional, via email or notification)

---

## Password & Security Requirements

### Password Policy

#### Password Complexity

THE system SHALL enforce the following password requirements:
- Minimum length: 8 characters
- Must contain at least one uppercase letter (A-Z)
- Must contain at least one lowercase letter (a-z)
- Must contain at least one number (0-9)
- May contain special characters for additional security

#### Password Validation Examples

**Valid passwords:**
- "MyPassword123" - meets all requirements
- "SecurePass456" - meets all requirements
- "Test@1234" - meets all requirements with special character

**Invalid passwords:**
- "password" - no uppercase, no number
- "PASSWORD" - no lowercase, no number
- "Pass123" - too short (7 characters)
- "12345678" - no letters

#### Password Storage

THE system SHALL:
- Never store passwords in plaintext
- Hash all passwords using a secure hashing algorithm (bcrypt with cost factor ≥ 12, or Argon2)
- Use unique salt for each password hash (at least 16 bytes of random data)
- Never expose password hashes to user-facing responses or logs
- Implement constant-time comparison to prevent timing attacks

WHEN verifying a password during login, THE system SHALL use constant-time comparison to prevent attackers from determining correct password through timing analysis.

### Password Reset Flow

#### Password Reset Initiation

WHEN a user clicks "Forgot Password" or requests a password reset, THE system SHALL:
1. Request the user's email address
2. Verify the email exists in the system
3. Generate a secure password reset token (at least 32 bytes of random data)
4. Set the reset token expiration time to 1 hour from generation
5. Send the reset token to the user's email address (or store it for retrieval)
6. Return a generic confirmation message (for security, don't reveal if email was found)

IF the email address is not found, THE system SHALL still return a confirmation message (to prevent email enumeration).

#### Password Reset Link Validity

THE password reset token SHALL:
- Be valid for exactly 1 hour from generation
- Be single-use (invalidated after one successful password reset)
- Be unique across all reset requests
- Be transmitted through secure means (email link, not SMS or other insecure channels)

#### Password Reset Completion

WHEN a user clicks the password reset link and arrives at the reset form, THE system SHALL:
1. Extract the reset token from the URL
2. Validate the reset token exists in the system
3. Validate the reset token has not expired
4. Display the password reset form

WHEN a user submits a new password, THE system SHALL:
1. Validate the reset token again
2. Validate the new password meets password requirements
3. Hash the new password using secure algorithm
4. Update the user's password in the database
5. Invalidate all existing access tokens for that user (force re-login)
6. Invalidate the reset token
7. Return success message and redirect to login

IF the reset token has expired, THEN THE system SHALL return error code PASSWORD_RESET_TOKEN_EXPIRED with message "Your password reset link has expired. Please request a new password reset."

IF the reset token is invalid or does not exist, THEN THE system SHALL return error code PASSWORD_RESET_INVALID_TOKEN with message "The password reset link is invalid or has already been used."

IF the user provides an invalid password, THEN THE system SHALL display specific error messages about which requirements are not met.

### Account Security

#### Password Change (While Authenticated)

WHEN an authenticated user changes their password, THE system SHALL:
1. Request the user's current password for verification
2. Verify the current password is correct using constant-time comparison
3. Validate the new password meets all requirements
4. Validate the new password is different from the old password
5. Hash the new password
6. Update the password in the database
7. Invalidate all existing access tokens for that user
8. Return success message

IF the user provides an incorrect current password, THEN THE system SHALL deny the password change and return error code PASSWORD_CHANGE_FAILED with message "Your current password is incorrect. Please try again."

IF the new password is the same as the old password, THEN THE system SHALL display message "Your new password must be different from your current password."

#### Account Lockout (Security Feature)

WHEN a user fails to login 5 times with incorrect password within 15 minutes, THE system SHALL:
1. Temporarily lock the account
2. Prevent any further login attempts for 30 minutes
3. Display message "Your account has been temporarily locked due to multiple failed login attempts. Please try again later or reset your password."
4. Allow password reset during lockout

WHEN the 30-minute lockout period expires, THE system SHALL:
- Automatically unlock the account
- Reset the failed login counter to zero
- Allow normal login attempts again

---

## Authentication Error Scenarios

### Error Codes & Responses

THE system SHALL return the following error codes for authentication failures:

| Error Code | Scenario | HTTP Status | User Message |
|-----------|----------|-------------|--------------|
| AUTH_USER_NOT_FOUND | Email does not exist in system | 401 | "We couldn't find an account with that email address." |
| AUTH_INVALID_CREDENTIALS | Password is incorrect | 401 | "Your password is incorrect. Please try again." |
| AUTH_MISSING_CREDENTIALS | Email or password not provided | 400 | "Please provide both email and password." |
| AUTH_TOKEN_EXPIRED | JWT token has expired | 401 | "Your session has expired. Please log in again." |
| AUTH_TOKEN_MISSING | No token provided in header | 401 | "Authentication required. Please log in." |
| AUTH_INVALID_TOKEN | Token signature is invalid or tampered with | 401 | "Your session is invalid. Please log in again." |
| AUTH_SESSION_ENDED | User logged out; token is no longer valid | 401 | "Your session has ended. Please log in again." |
| AUTH_EMAIL_ALREADY_EXISTS | Email already registered | 400 | "An account with this email already exists. Please log in or use a different email." |
| AUTH_WEAK_PASSWORD | Password does not meet requirements | 400 | "Password must be at least 8 characters and contain uppercase, lowercase, and numbers." |
| AUTH_PASSWORD_MISMATCH | Password confirmation doesn't match | 400 | "Passwords do not match. Please re-enter your password." |
| AUTH_INVALID_EMAIL_FORMAT | Email format is invalid | 400 | "Please enter a valid email address (e.g., user@example.com)." |
| AUTH_UNAUTHORIZED | User lacks permission for action | 403 | "You do not have permission to perform this action." |
| ADMIN_ONLY_OPERATION | Operation requires admin role | 403 | "This operation is restricted to administrators." |
| PERMISSION_DENIED | User does not have permission for action | 403 | "You do not have permission to access this resource." |
| AUTH_ACCOUNT_LOCKED | Account locked after failed attempts | 429 | "Your account is temporarily locked. Please try again later or reset your password." |
| AUTH_ACCOUNT_SUSPENDED | Admin suspended the account | 403 | "Your account has been suspended. Please contact support." |
| AUTH_ACCOUNT_DELETED | User account was deleted | 403 | "This account no longer exists." |
| PASSWORD_RESET_TOKEN_EXPIRED | Password reset token expired | 400 | "Your password reset link has expired. Please request a new one." |
| PASSWORD_RESET_INVALID_TOKEN | Reset token is invalid or already used | 400 | "The password reset link is invalid or has already been used." |
| PASSWORD_CHANGE_FAILED | Current password incorrect during change | 400 | "Your current password is incorrect." |

### User-Facing Error Responses

WHEN an authentication error occurs, THE system SHALL return a response containing:
- Clear, user-friendly error message explaining what went wrong
- Guidance for recovery (e.g., "Please check your email" or "Please try again")
- Never expose sensitive system information (user IDs, database details, etc.)
- HTTP status code appropriate to the error type

**Example Error Response:**
```json
{
  "error": "AUTH_INVALID_CREDENTIALS",
  "message": "Your password is incorrect. Please try again or reset your password.",
  "statusCode": 401,
  "recoveryAction": "try_reset_password"
}
```

---

## Actor Transition & Role Changes

### Role Assignment

THE system SHALL assign roles during account creation:
- Self-registered user accounts are assigned "user" role automatically
- Admin accounts are assigned "admin" role during initial system setup or by other admins

WHEN a new user account is created through self-registration, THE account SHALL be automatically assigned "user" role with corresponding permissions.

WHEN an admin creates a new admin account, THE new account SHALL be assigned "admin" role and the creating admin SHALL be recorded in audit logs.

### Role Modification

THE current system design does NOT support self-service role changes.

IF a user role needs to be modified (e.g., promoting user to admin), THEN:
- Another admin must perform the change through administrative interface
- The change must be logged in audit trail with timestamp and performing admin ID
- The affected user must log out and log in again to receive updated token with new permissions

### Admin Account Creation

WHEN an admin creates a new admin account, THE system SHALL:
1. Require the admin to provide email and initial password (temporary)
2. Create the admin account with "admin" role
3. Send credentials to the new admin through secure means
4. Require the new admin to change password on first login
5. Log the admin account creation with timestamp and creating admin ID

---

## Security Considerations for Backend Implementation

While this document focuses on business requirements rather than technical implementation, the following security principles MUST be observed by the development team:

**Password Security:**
- All passwords must be securely hashed using bcrypt (cost ≥ 12) or Argon2; never store plaintext
- Implement constant-time password comparison to prevent timing attacks
- Use unique random salt (≥16 bytes) for each password

**JWT Token Security:**
- Sign JWT tokens with a strong secret key (≥256 bits)
- Use HS256 or RS256 algorithm for signing
- Implement token expiration validation on every request
- Store token secret securely, never expose in code or logs
- Rotate token signing keys periodically (annual minimum)

**Communication Security:**
- All authentication endpoints must use HTTPS/TLS encryption
- Implement HSTS (HTTP Strict Transport Security) headers
- Use secure, HttpOnly, SameSite cookies for session storage (if applicable)

**Access Control:**
- Validate user permissions on every protected resource request
- Implement role-based access control (RBAC) consistently
- Log all admin actions for audit trail
- Implement principle of least privilege

**Account Security:**
- Implement account lockout after multiple failed login attempts
- Monitor for suspicious authentication patterns
- Support secure password reset with time-limited tokens
- Implement session termination on password change

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, authentication libraries, token signing mechanisms, cryptography specifics, etc.) are at the discretion of the development team.*