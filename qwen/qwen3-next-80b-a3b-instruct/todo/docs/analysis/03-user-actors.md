# Todo List Application - Business Requirements Specification

## Service Vision

The Todo List Application is a privacy-first, multi-user personal task manager designed for individuals who need a simple, secure, and reliable way to track personal tasks. The system enforces strict data isolation where every user's todo items are completely inaccessible to all other users. There are no collaborative features, shared lists, or group functionality—the application is intentionally minimal and focused on individual privacy.

Success is measured by:
- 100% data isolation between users
- Zero data breaches or cross-user information leaks
- Fast and reliable authentication and todo operations
- High user satisfaction with simplicity and privacy

The system targets individuals who value their personal data privacy and want a no-frills, secure tool for managing daily tasks.

## Business Model

### Why This Service Exists

Many personal task management apps claim to be private but fail to enforce strict data separation at the architecture level. Users often have concerns about whether their task data is truly isolated from others, especially on shared devices or when using cloud-based services. This application solves this problem by designing data isolation as a core architectural principle from the ground up, not as an afterthought.

It provides a trusted solution for users who need to manage sensitive personal tasks (e.g., medical appointments, financial tasks, confidential personal goals) without worrying about data leakage or access by others.

### Revenue Strategy

The application follows a freemium model:
- **Free Tier**: Unlimited personal todo items, basic CRUD functionality, email-based authentication
- **Future Premium Tier**: Additional features may include:
  - Custom tags/categories
  - Todo categorization (Work, Personal, Health)
  - Advanced search and filtering
  - Sync across multiple devices (optional enhanced sync)
  - Import/export functionality
  - Dark mode and custom themes

There are no ads, no tracking, and no data monetization—revenue will only come from optional premium upgrades that enhance the user experience without compromising privacy.

### Success Metrics

Metrics for success include:
- User retention rate over 90 days
- Number of registered users with confirmed email addresses
- Zero reported security incidents
- Average response time for todo operations < 200ms
- User satisfaction score (via in-app feedback) > 4.7/5.0
- Number of support tickets related to data privacy = 0

### Growth Plan

Growth will be driven by:
- Word-of-mouth from privacy-conscious users
- Features focused on security (e.g., end-to-end encryption announcement)
- Content marketing around "why privacy matters in personal task apps"
- Integration with privacy-focused platforms and ecosystems

## User Actors and Authentication

### Actor Hierarchy and Permissions

The system defines exactly two user actors: `guest` (unauthenticated) and `user` (authenticated).

### Guest (Unauthenticated)

- A guest is any user who has not logged in or registered.
- A guest SHALL NOT be able to view, create, update, or delete any todo items.
- A guest SHALL NOT be able to access any user-specific data.
- A guest SHALL be able to view public landing pages and initiate registration/login workflows.
- THE system SHALL redirect guests to the login page if they attempt to access protected routes.

### User (Authenticated)

- A user is an individual who has successfully registered and verified their email address.
- A user SHALL be able to create personal todo items that are visible only to themselves.
- A user SHALL be able to read all their own todo items.
- A user SHALL be able to update their own todo items.
- A user SHALL be able to delete their own todo items.
- A user SHALL be able to view their own profile and account settings.
- A user SHALL NOT be able to access, view, modify, or delete any todo items belonging to another user.
- A user SHALL NOT be able to register for multiple accounts with the same email.
- A user SHALL NOT be able to log in as another user.
- A user SHALL NOT be able to access administrative functions.

### Identity Isolation Guarantee

THE system SHALL ensure complete data isolation between users. Every todo item shall have a `userId` field that is set at creation time and cannot be modified. All queries for todo items SHALL automatically filter by the authenticated user's `userId` and SHALL NEVER include `userId` as a query parameter from client input. This isolation SHALL be enforced at the API layer and database access layer.

### Permission Matrix

| Action | Guest | User |
|--------|-------|------|
| Access login page | ✅ | ✅ |
| Access registration page | ✅ | ✅ |
| Register new account | ✅ | ❌ |
| Log in | ✅ | ✅ |
| Log out | ❌ | ✅ |
| Reset password | ✅ | ✅ |
| Change password | ❌ | ✅ |
| Revoke all sessions | ❌ | ✅ |
| View todo list | ❌ | ✅ |
| Create todo item | ❌ | ✅ |
| Read todo item | ❌ | ✅ |
| Update todo item | ❌ | ✅ |
| Delete todo item | ❌ | ✅ |
| View other users' todos | ❌ | ❌ |
| Access user profile | ❌ | ✅ |
| Manage account settings | ❌ | ✅ |

### Authentication Requirements

#### Core Authentication Functions

- THE system SHALL allow guests to register for a new account using a valid email address and a password of at least 8 characters.
- THE system SHALL allow authenticated users to log in to their account using their registered email and password.
- THE system SHALL securely store user passwords using industry-standard hashing algorithms (e.g., bcrypt).
- THE system SHALL generate and return a JWT access token upon successful login.
- THE system SHALL allow users to log out, invalidating their current session token.
- THE system SHALL allow users to reset their forgotten password via a secure, time-limited email link.
- THE system SHALL allow users to change their existing password after authenticating with their current password.
- THE system SHALL allow users to revoke access from all active devices simultaneously.
- THE system SHALL send a verification email to new users upon registration, requiring email confirmation before account activation.
- THE system SHALL deny registration attempts with duplicate email addresses.
- THE system SHALL enforce strong password policies: minimum 8 characters, at least one number, and one uppercase letter.
- THE system SHALL lock accounts temporarily after 5 consecutive failed login attempts.
- THE system SHALL immediately invalidate all existing tokens when a user changes their password.
- THE system SHALL expire all session tokens after 30 days of inactivity.

#### Authentication Flow

WHEN a guest enters a valid email and password in the login form, THE system SHALL:

- Verify the email is registered in the system.
- Compare the provided password against the stored hash using a secure comparison function.
- IF the credentials are valid, THEN THE system SHALL generate a JWT access token with the following payload:
  - `userId`: the user's unique identifier
  - `role`: "user"
  - `permissions`: ["create_todo", "read_todo", "update_todo", "delete_todo"]
  - `iat`: current timestamp
  - `exp`: timestamp 15 minutes in the future
- THE system SHALL set the access token as an httpOnly, Secure, SameSite=Strict cookie.
- THE system SHALL return HTTP 200 with a success message.

WHEN a guest attempts to register with a new email and password, THE system SHALL:

- Validate the email format and ensure it is not already in use.
- Validate the password meets complexity requirements (minimum 8 characters, contains one number and one uppercase letter).
- Hash the password using bcrypt with a cost of 12.
- Create a new user record in the database with status "unverified".
- Generate a unique verification token with 2-hour expiration.
- Send a verification email containing a secure link with the verification token.
- Return HTTP 201 with a message indicating verification email has been sent.

WHEN a user clicks the verification link in their email, THE system SHALL:

- Validate the verification token is present and not expired.
- Verify the token corresponds to a valid, unverified user account.
- Update the user's status to "verified".
- Return HTTP 200 with a success message and redirect to login page.
- Delete the used verification token from storage.

WHEN a user requests a password reset, THE system SHALL:

- Validate the provided email address exists in the database.
- Generate a unique password reset token with 1-hour expiration.
- Store the token securely with user ID and expiration timestamp.
- Send an email to the user containing a link to the reset page with the token.
- Return HTTP 200 with a message indicating reset instructions have been sent.

WHEN a user submits a new password via the reset page, THE system SHALL:

- Validate the reset token is valid and not expired.
- Verify the token matches the user ID.
- Hash the new password using bcrypt with a cost of 12.
- Update the user's password hash in the database.
- Invalidate the used reset token.
- Send a confirmation email to the user.
- Return HTTP 200 with success message and redirect to login.

WHEN a user attempts to change their password, THE system SHALL:

- Require the user to authenticate with current password.
- Validate the new password meets complexity requirements (minimum 8 characters, contains one number and one uppercase letter).
- Verify the new password is different from the old one.
- Hash the new password using bcrypt with a cost of 12.
- Update the password hash in the database.
- Invalidate all existing session tokens for this user.
- Return HTTP 200 with success message.

WHEN a user revokes access from all devices, THE system SHALL:

- Delete all active session tokens associated with the user ID.
- Immediately terminate all existing user sessions.
- Return HTTP 200 with success message.
- Send a security notification email to the user.

WHILE the user is logged in, THE system SHALL maintain an active session with the JWT access token stored in an httpOnly cookie.

WHEN a user attempts to perform an action with an expired token, THE system SHALL:

- Detect the expired token in the cookie or authorization header.
- Return HTTP 401 with error code "TOKEN_EXPIRED".
- Clear the expired token from the client's cookie.

WHEN a user attempts to access a resource with an invalid or malformed token, THE system SHALL:

- Detect the unparseable or invalid signature.
- Return HTTP 401 with error code "TOKEN_INVALID".
- Clear the invalid token from the client's cookie.

### Token Management

#### Token Type and Implementation

- THE system SHALL use JWT (JSON Web Tokens) for all authentication sessions.
- Access tokens SHALL be short-lived, with an expiration of 15 minutes.
- Refresh tokens SHALL NOT be implemented—session will be maintained via auto-login via cookie.
- Access tokens SHALL be stored exclusively in an httpOnly, Secure, SameSite=Strict cookie.
- Access tokens SHALL NOT be stored in localStorage, sessionStorage, or any client-side JavaScript-accessible storage.

#### JWT Token Structure

The JWT payload SHALL contain the following fields:

- `userId`: UUID string identifying the authenticated user (e.g., "b243a1cf-68f6-4a35-9d18-7e05d5b2e365")
- `role`: string literal "user"
- `permissions`: array of strings containing exact values ["create_todo", "read_todo", "update_todo", "delete_todo"]
- `iat`: number representing Unix timestamp of token issuance
- `exp`: number representing Unix timestamp of token expiration (15 minutes after `iat`)

#### Token Generation and Validation

- THE system SHALL generate JWT tokens using HS256 algorithm and a cryptographically secure secret key stored in environment variables.
- THE system SHALL validate JWT signatures on every protected request using the same secret key.
- THE system SHALL reject any token with invalid signature, malformed structure, or missing required fields.
- THE system SHALL immediately invalidate tokens when a user logs out, changes password, or revokes sessions.

#### Token Refresh Policy

- THE system SHALL NOT use refresh tokens.
- When the access token expires, THE system SHALL automatically attempt to re-authenticate the user if a valid session cookie exists and has not been revoked.
- IF the user has been inactive for 30 days, THEN THE system SHALL require re-login with credentials.

#### Cookie Configuration

- Name: "todo_session"
- Domain: Auto-detected from host
- Path: "/"
- HttpOnly: true
- Secure: true
- SameSite: Strict
- Max-Age: 1296000 (15 days, synchronized with session persistence)
- Expires: 15 days after last activity

## Core Todo Functionality

### Core Features

The todo application provides minimal but complete functionality for managing personal task lists. The system enforces strict user data isolation where every user can only access their own todos. No cross-user data visibility exists.

### User-Centric Todo Operations

WHEN a user is logged in, THE system SHALL allow the creation of new todo items.

WHEN a user creates a new todo item, THE system SHALL assign a unique identifier to the item.

WHEN a user creates a new todo item, THE system SHALL associate the item with the authenticated user's account.

WHEN a user creates a new todo item, THE system SHALL set the initial status to "pending".

WHEN a user creates a new todo item, THE system SHALL set the creation timestamp to the current system time in UTC.

WHEN a user attempts to create a todo item while not authenticated, THE system SHALL deny the request and return an appropriate error message.

WHEN a user is logged in, THE system SHALL allow viewing of all their own todo items.

WHEN a user requests their todo items, THE system SHALL return only items associated with their authenticated user ID.

WHEN a user requests their todo items, THE system SHALL sort items by creation timestamp in descending order (newest first).

WHEN a user requests their todo items, THE system SHALL return a list of todos with id, title, description, status, createdAt, and updatedAt fields.

WHEN a user is logged in, THE system SHALL allow updating of any of their own todo items.

WHEN a user updates a todo item, THE system SHALL validate that the item belongs to the authenticated user.

WHEN a user updates a todo item, THE system SHALL update the item's updatedAt timestamp to the current system time in UTC.

WHEN a user updates a todo item title, THE system SHALL validate that the title is not empty.

WHEN a user updates a todo item title, THE system SHALL limit the title to 255 characters.

WHEN a user updates a todo item description, THE system SHALL allow up to 10,000 characters.

WHEN a user updates a todo item status, THE system SHALL only accept "pending", "completed", or "archived" as valid values.

WHEN a user attempts to update a todo item that does not belong to them, THE system SHALL deny the request and return an appropriate error message.

WHEN a user is logged in, THE system SHALL allow deletion of any of their own todo items.

WHEN a user deletes a todo item, THE system SHALL verify that the item belongs to the authenticated user.

WHEN a user deletes a todo item, THE system SHALL permanently remove the item from the database.

WHEN a user attempts to delete a todo item that does not belong to them, THE system SHALL deny the request and return an appropriate error message.

WHEN a user attempts to access any todo item without being authenticated, THE system SHALL deny access and return an appropriate error message.

### Data Model Concepts

The todo data model is designed to ensure absolute user data isolation through strict access control and ownership verification.

#### Todo Item Structure

THE system SHALL represent each todo item with the following attributes:

- An auto-generated unique identifier (UUID)
- A title field (required, minimum 1 character, maximum 255 characters)
- A description field (optional, maximum 10,000 characters)
- A status field (required, restricted to "pending", "completed", or "archived")
- A createdAt field (required, timestamp in UTC)
- A updatedAt field (required, timestamp in UTC)
- A userId field (required, foreign key linking to the authenticated user)

#### Data Ownership Enforcement

WHEN any todo item is created, THE system SHALL associate it with the authenticated user's unique identifier.

WHEN any todo item is queried, THE system SHALL filter results exclusively by the authenticated user's unique identifier.

WHEN any todo item is updated, THE system SHALL verify that the authenticated user's identifier matches the todo item's userId field.

WHEN any todo item is deleted, THE system SHALL verify that the authenticated user's identifier matches the todo item's userId field.

THE system SHALL NEVER store or expose any reference to other users' todo items in response to any API request.

THE system SHALL NEVER allow search, filter, or list operations that could expose items from multiple users.

### User Interactions

#### Primary Workflow: Creating and Managing Personal Todo Lists

WHEN a user logs in, THE system SHALL display their personal todo list.

WHEN a user clicks "Add New Task", THE system SHALL display a form with title and description fields.

WHEN a user fills the title field and clicks "Save", THE system SHALL create a new todo item with status "pending".

WHEN a user fills the description field, THE system SHALL include it in the todo item (if provided).

WHEN a user clicks on a todo item, THE system SHALL allow editing the item's title and description.

WHEN a user clicks the "Toggle Status" button on a todo item, THE system SHALL change the status between "pending" and "completed".

WHEN a user clicks the "Archive" button on a completed todo item, THE system SHALL change the status to "archived".

WHEN a user clicks "Delete" on any todo item, THE system SHALL prompt for confirmation and then permanently delete the item.

WHEN a user navigates to different pages of the application, THE system SHALL preserve their login state and continue to show only their personal todo items.

### Validation Rules

#### Todo Item Validation

WHEN a user attempts to create a todo item with an empty title, THE system SHALL reject the request and return an error message.

WHEN a user attempts to create a todo item with a title longer than 255 characters, THE system SHALL truncate the title to 255 characters and save it.

WHEN a user attempts to create a todo item with a description longer than 10,000 characters, THE system SHALL reject the request and return an error message.

WHEN a user attempts to update a todo item status to an invalid value (anything other than "pending", "completed", or "archived"), THE system SHALL reject the request and return an error message.

WHEN a user attempts to update a todo item with no changes to any fields, THE system SHALL not update the updatedAt timestamp.

#### User Context Validation

WHEN a user attempts to access any todo functionality without being authenticated, THE system SHALL return HTTP 401 Unauthorized.

WHEN a guest user attempts to view any existing todo items, THE system SHALL return an empty list (not an error).

WHEN a user attempts to access a todo item by its ID that belongs to another user, THE system SHALL return HTTP 404 Not Found (not HTTP 403 Forbidden) to prevent information disclosure.

WHEN a user attempts to update a todo item that has been deleted, THE system SHALL return HTTP 404 Not Found.

WHEN a user attempts to delete a todo item that has been deleted, THE system SHALL return HTTP 404 Not Found.

#### Authentication-Related Validation

WHEN a user logs in, THE system SHALL verify their credentials before granting access.

WHEN a user logs in, THE system SHALL generate a JWT access token with expiration of 15 minutes.

WHEN a user logs in, THE system SHALL include their unique userId in the JWT payload.

WHEN a user uses an expired JWT access token, THE system SHALL return HTTP 401 Unauthorized.

WHEN a user uses a JWT token with invalid signature, THE system SHALL return HTTP 401 Unauthorized.

WHEN a user refreshes their access token, THE system SHALL validate the refresh token and issue a new access token with a 15-minute expiration.

WHEN a user logs out, THE system SHALL invalidate the current session.

WHEN a user changes their password, THE system SHALL invalidate all existing sessions for that user.

WHEN a user revokes access from all devices, THE system SHALL invalidate all refresh tokens for that user.

WHEN a user signs up, THE system SHALL create a new user account with the provided email and encrypted password.

WHEN a user signs up, THE system SHALL immediately log them in and issue an access token.

WHEN a user attempts to register with an email that already exists, THE system SHALL return an error message indicating the email is already registered.

WHEN a user attempts to reset their password with an invalid token, THE system SHALL return an error message.

WHEN a user attempts to reset their password with an expired token, THE system SHALL return an error message.

## User Scenarios and Workflows

### Primary User Journey: Registration to Todo Creation

WHEN a guest visits the application homepage:
- THE system SHALL display the login form and registration option.

WHEN a guest clicks "Create Account":
- THE system SHALL display an email and password input form.

WHEN a guest enters a valid email and password:
- THE system SHALL validate the input.
- THE system SHALL create a new unverified user account.
- THE system SHALL generate a verification token.
- THE system SHALL send a verification email to the provided email address.
- THE system SHALL display a success message: "Verification email sent. Please check your inbox."

WHEN the guest checks their email:
- THEY SHALL receive an email with subject: "Verify your Todo List Account"
- THEY SHALL find a secure link in the email containing a token (e.g., `https://todo.example.com/verify?token=abc123`)

WHEN the guest clicks the verification link:
- THE system SHALL validate the token and confirm it is not expired.
- THE system SHALL update the user's status to "verified".
- THE system SHALL display "Account verified successfully! Please log in."
- THE system SHALL redirect to the login page.

WHEN the user logs in:
- THEY SHALL enter their email and password.
- THE system SHALL authenticate the user and generate a JWT access token.
- THE system SHALL set the token in an httpOnly cookie.
- THE system SHALL redirect to the todo list dashboard.

WHEN the user views their dashboard for the first time:
- THEY SHALL see an empty list with a button labeled "Add New Task".

WHEN the user clicks "Add New Task":
- THE system SHALL display a form with title input and optional description.

WHEN the user enters a title "Buy groceries" and clicks "Save":
- THE system SHALL create the todo item with status "pending" and a unique UUID.
- THE system SHALL assign the todo's userId to the authenticated user.
- THE system SHALL display the new todo item in the list.

### Secondary User Journey: Task Update and Completion

WHEN the user clicks on the todo item "Buy groceries":
- THE system SHALL display an edit form with the existing title and description.
- THE system SHALL show a toggle for status ("pending" → "completed").

WHEN the user changes the title to "Buy organic groceries" and clicks "Update":
- THE system SHALL validate the new title length (≤255 characters).
- THE system SHALL update the title and set updatedAt to current UTC timestamp.
- THE system SHALL display the updated item.

WHEN the user toggles the status to "completed":
- THE system SHALL update the item's status to "completed".
- THE system SHALL apply a visual strike-through to indicate completion.

WHEN the user clicks a button labeled "Archive":
- THE system SHALL change the status from "completed" to "archived".
- THE system SHALL move the item to an archived section (optional UI treatment).

WHEN the user refreshes the page:
- THE system SHALL retain the updated state (title, status, updated time).

### Special Scenario: Password Reset

WHEN a user forgets their password:
- THEY SHALL click "Forgot Password?" on the login page.
- THE system SHALL display a form requesting the user's email address.

WHEN the user enters their registered email and clicks "Send Reset Link":
- THE system SHALL validate the email is registered.
- THE system SHALL generate a time-limited password reset token (1-hour expiry).
- THE system SHALL store the token securely with the user ID.
- THE system SHALL email a reset link to the user.
- THE system SHALL display: "Password reset instructions have been sent to your email."

WHEN the user receives the email:
- THEY SHALL find a link with format: `https://todo.example.com/reset-password?token=def456`

WHEN the user clicks the link:
- THE system SHALL validate the token in the URL.
- THE system SHALL confirm the token is not expired.
- THE system SHALL display a password reset form.

WHEN the user enters a new password and confirms it:
- THE system SHALL validate password strength (min 8 chars, 1 number, 1 uppercase).
- THE system SHALL hash the new password with bcrypt.
- THE system SHALL update the user's password in the database.
- THE system SHALL invalidate all existing sessions for that user.
- THE system SHALL send a confirmation email: "Your password has been successfully changed."
- THE system SHALL redirect to login page.

### Special Scenario: Account Deletion

WHEN a user decides to delete their account:
- THEY SHALL navigate to "Account Settings" and click "Delete Account".
- THE system SHALL display a confirmation dialog: "This will permanently delete all your todos and account data. This action cannot be undone."

WHEN the user confirms deletion:
- THE system SHALL delete all associated todo items.
- THE system SHALL delete the user record from the database.
- THE system SHALL invalidate the user's session token.
- THE system SHALL redirect to the homepage.

WHEN the same email is used to register again:
- THE system SHALL create a completely new account with no association to the previous data.

## Exception Handling

### Authentication Errors

WHEN a user enters an incorrect email:
- THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS"

WHEN a user enters an incorrect password:
- THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS"

WHEN a user attempts to register with an existing email:
- THE system SHALL return HTTP 409 with error code "AUTH_EMAIL_IN_USE"

WHEN a user attempts to authenticate with an unverified account:
- THE system SHALL return HTTP 403 with error code "AUTH_ACCOUNT_NOT_VERIFIED"

WHEN a user supplies an expired token:
- THE system SHALL return HTTP 401 with error code "TOKEN_EXPIRED"
- THE system SHALL clear the expired token from the cookie

WHEN a user supplies a malformed token:
- THE system SHALL return HTTP 401 with error code "TOKEN_INVALID"
- THE system SHALL clear the invalid token from the cookie

WHEN the JWT secret key is missing or invalid:
- THE system SHALL log an internal system error
- THE system SHALL return HTTP 500 Internal Server Error

### Authorization Errors

WHEN a user attempts to update a todo item belonging to another user:
- THE system SHALL return HTTP 404 (Not Found) rather than HTTP 403 (Forbidden) to prevent information disclosure
- THE system SHALL NOT reveal that the item exists but belongs to someone else

WHEN a user attempts to delete a todo item belonging to another user:
- THE system SHALL return HTTP 404 (Not Found) for the same reason

WHEN a user requests a todo item by ID that doesn't exist:
- THE system SHALL return HTTP 404 with error code "TODO_NOT_FOUND"

### Input Validation Failures

WHEN a todo item title is empty on creation:
- THE system SHALL return HTTP 400 with error code "VALIDATION_TITLE_REQUIRED"

WHEN a todo item title exceeds 255 characters:
- THE system SHALL return HTTP 400 with error code "VALIDATION_TITLE_TOO_LONG"

WHEN a todo item description exceeds 10,000 characters:
- THE system SHALL return HTTP 400 with error code "VALIDATION_DESCRIPTION_TOO_LONG"

WHEN a todo item status is not "pending", "completed", or "archived":
- THE system SHALL return HTTP 400 with error code "VALIDATION_INVALID_STATUS"

WHEN a password is too short (<8 characters):
- THE system SHALL return HTTP 400 with error code "VALIDATION_PASSWORD_TOO_SHORT"

WHEN a password lacks a number or uppercase letter:
- THE system SHALL return HTTP 400 with error code "VALIDATION_PASSWORD_WEAK"

### System Failures

WHEN the database is unreachable:
- THE system SHALL return HTTP 503 Service Unavailable
- THE system SHALL include a retry header
- THE system SHALL log the error for monitoring

WHEN the email service fails during verification:
- THE system SHALL return HTTP 503 for registration with error code "EMAIL_SERVICE_UNAVAILABLE"
- THE system SHALL retain the user's account in unverified state
- THE system SHALL retry email delivery in background job

WHEN the JWT signing fails:
- THE system SHALL return HTTP 500 with error code "TOKEN_GENERATION_FAILED"
- THE system SHALL log the system error

WHEN a user action exceeds the rate limit (10 login attempts per minute):
- THE system SHALL return HTTP 429 Too Many Requests
- THE system SHALL respond with a retry-after header
- THE system SHALL log the IP address of the request

## Performance Expectations

### Response Time Requirements

- Authentication requests (login, registration) SHALL complete within 500ms in 95% of cases
- Getting todo lists SHALL complete within 200ms for up to 100 todo items
- Creating, updating, or deleting a todo item SHALL complete within 150ms
- Password reset token validation SHALL complete within 200ms
- Email sending SHALL be asynchronous and not block API responses

### Scalability Expectations

- The system SHALL support at least 10,000 concurrent authenticated users
- The system SHALL support 500 requests per second under normal load
- The system SHALL maintain performance as the number of todo items per user grows to 10,000
- The database indexing strategy SHALL be optimized for userId-based queries

### System Availability

- The system SHALL have a target uptime of 99.9% over a 30-day period
- The system SHALL have automated failover and redundancy for the database and authentication services
- The system SHALL notify the operations team of any downtime via email and SMS alerts

## Security and Compliance

### Data Privacy

- THE system SHALL NOT collect or store any personally identifiable information beyond email, password hash, and UUID
- THE system SHALL NOT use cookies for tracking purposes beyond authentication
- THE system SHALL NOT share user data with third parties
- THE system SHALL NOT analyze user behavior for advertising
- THE system SHALL comply with GDPR, CCPA, and other applicable privacy regulations

### Authentication Security

- THE system SHALL use bcrypt for password hashing with cost = 12
- THE system SHALL use JWT with HS256 algorithm and cryptographically secure secret keys
- THE system SHALL rotate JWT signing keys every 90 days with a key rotation strategy
- THE system SHALL use HTTP-only, Secure, SameSite=Strict cookies for session tokens
- THE system SHALL NEVER expose user IDs, session tokens, or passwords in API responses
- THE system SHALL use HTTPS for all connections (HSTS enforced)

### Access Control Enforcement

- THE system SHALL enforce data isolation at both the API and database layers
- THE system SHALL reject any client-provided userId parameter in todo item requests
- THE system SHALL always use the userId from the authenticated token
- THE system SHALL return HTTP 404 even when the item exists but belongs to another user
- THE system SHALL not leak any information about user existence through timing or status codes

### Regulatory Compliance

- THE system SHALL encrypt sensitive data at rest when stored in the database
- THE system SHALL audit all sensitive actions (password changes, account deletions)
- THE system SHALL delete user data upon request within 30 days
- THE system SHALL maintain a publicly available privacy policy

## Business Rules

### Todo Item Validation

WHEN a user attempts to create a todo item with empty title, THE system SHALL reject it with error code "VALIDATION_TITLE_REQUIRED".

WHEN a user attempts to update a todo item with an empty title, THE system SHALL reject it.

WHEN a user attempts to set a title longer than 255 characters, THE system SHALL truncate it to 255 characters.

WHEN a user attempts to set a description longer than 10,000 characters, THE system SHALL reject it.

WHEN a user attempts to set a status to any value other than "pending", "completed", or "archived", THE system SHALL reject it.

### User Data Ownership

WHEN any todo item is queried, THE system SHALL only return items with userId equal to the authenticated user's ID.

WHEN any todo item is updated, THE system SHALL only update if the userId in the database matches the authenticated user's ID.

WHEN any todo item is deleted, THE system SHALL only delete if the userId matches the authenticated user's ID.

### Concurrency Rules

WHEN two users attempt to update the same todo item ID simultaneously, THE system SHALL allow both to succeed as long as both are the owner of their respective items.

WHEN two requests from the same user update the same todo item within milliseconds, THE system SHALL accept both if they are valid, and the last update shall win (last-write-wins).

### State Transitions

WHEN a todo item is created, THE system SHALL assign status "pending".

WHEN a user toggles a "pending" item, THE system SHALL change status to "completed".

WHEN a user toggles a "completed" item, THE system SHALL change status to "pending".

WHEN a user clicks "Archive" on a "completed" item, THE system SHALL change status to "archived".

WHEN a user attempts to "Archive" a "pending" item, THE system SHALL ignore the archive action and keep status "pending".

WHEN a user attempts to archive an "archived" item, THE system SHALL ignore the action.

## Data Flow and Lifecycle

### Data Entry Points

- User registration form → Creates new user account
- Login form → Generates JWT token
- Todo create form → Creates new todo item
- Todo edit form → Updates existing todo item
- Password reset form → Updates user password

### Data Processing Flow

1. User provides input on frontend (email, password, todo title)
2. Frontend sends request to backend API with HTTP headers (including auth cookie)
3. Backend validates signature and extracts userId from JWT token
4. Backend validates input per business rules
5. Backend queries or updates database with userId filter
6. Backend returns appropriate JSON response with status code
7. Frontend displays response to user

### Data Storage

- Users: Stored in `users` table with fields: id, email, password_hash, status, createdAt, updatedAt
- Todo items: Stored in `todos` table with fields: id, userId, title, description, status, createdAt, updatedAt
- Verification tokens: Stored in `verification_tokens` table with fields: id, userId, token, expiresAt, used
- Password reset tokens: Stored in `password_reset_tokens` table with fields: id, userId, token, expiresAt, used
- Sessions: Managed via JWT cookie; no server-side session storage

### Data Lifecycle

- User accounts: Persist indefinitely unless deleted by user
- Todo items: Persist indefinitely unless deleted by user
- Verification tokens: Automatically deleted after 2 hours or when used
- Password reset tokens: Automatically deleted after 1 hour or when used
- Session tokens: Expire after 15 minutes; client-side cookie refreshes automatically
- Inactive users: Automatically marked for deletion after 1 year of inactivity (optional future enhancement)

## Future Considerations

### Potential Feature Extensions

The following features may be considered for future development:

- Todo categorization tags (e.g., Work, Personal, Health)
- Recurring todo tasks (e.g., "Pay rent every 1st")
- Due dates with notifications
- Todo sharing via encrypted link (with explicit user consent)
- Integration with calendar apps
- Dark mode and theme customization
- Import/export in JSON or CSV format

### Scalability Considerations

As user base grows:

- The `todos` table will require partitioning by userId for performance
- Authentication rate limits may need global rate limiting
- Email service may require queueing for high volume
- Database backup strategy should include encryption and off-site storage
- Monitoring system should alert on authentication failure spikes

### Integration Opportunities

The system may integrate with:

- Privacy-focused email providers for improved delivery reliability
- OAuth2 providers (Google, Apple) as alternative login methods (future)
- Browser extension for quick add from any webpage
- Mobile apps via REST API

All future features SHALL maintain the core principle of data isolation and privacy. No feature shall allow data sharing between users unless explicitly designed with end-to-end encryption and explicit user-to-user permissioning—not built into the base system.

## Summary

The Todo List Application is a minimal, privacy-focused personal task manager designed with absolute user data isolation as its foundational principle. Every feature has been designed around the non-negotiable requirement: "No user can ever access another user's data."

The application has comprehensive, specification-grade business requirements covering:
- Authentication and token management
- Full CRUD operations for todo items
- Detailed user workflows and error handling
- Performance targets and scalability expectations
- Security and compliance principles

All requirements are expressed in EARS format (WHEN, THE, SHALL, IF) to ensure they are testable, unambiguous, and implementable.

The system is intentionally minimal and excludes collaboration features, shared lists, reminders, or categories to maintain focus on core privacy requirements.

This document is complete and ready for implementation by the Database, Interface, Test, and Realize agents.