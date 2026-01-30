# Todo List Application Requirements Specification

## Service Overview

This is a minimalist, privacy-focused Todo list application designed for individual users. Each user maintains a completely isolated personal task list. No information, tasks, or data is ever shared between users. The system prioritizes data security, user ownership, and simplicity over feature richness. All user interactions occur through a secure web interface with mandatory authentication.

## Business Model

This service exists to provide individuals with a simple, private way to manage personal tasks without exposing their data to other users or third parties. The business model is based on zero advertising, zero data monetization, and zero third-party integrations. Success is measured by user retention, system reliability, and compliance with data privacy regulations. Revenue generation is not part of this version—this is a non-commercial, open-source privacy-first application.

## User Actors and Authentication

### Actors

- **Guest**: Unauthenticated users. Can only access the public login/registration pages. Cannot view or modify any todo items.
- **User**: Authenticated individuals who can create, read, update, and delete their own todo items. Cannot access any data belonging to other users.
- **Admin**: System administrator with access to aggregate statistics (total users, total todo items, completion rates), but never to individual user data.

### Authentication Requirements

WHEN a user attempts to access any todo-related feature, THE system SHALL require a valid authentication token.
WHEN a user attempts to register, THE system SHALL require a valid email address, a password with minimum 8 characters, and acknowledgment of the privacy policy.
WHEN a user logs in, THE system SHALL verify credentials against the user account database and issue a signed JWT token containing the user's unique ID.
WHEN a user accesses any protected endpoint, THE system SHALL extract the user ID from the JWT token, not from any request body or parameter.
WHEN a user's JWT token expires, THE system SHALL require re-authentication before allowing further operations.
WHEN a user's authentication token is tampered with, THE system SHALL immediately invalidate it and reject the request with error code AUTH_INVALID_TOKEN.

### Authorization Requirements

WHEN a user requests a todo item, THE system SHALL compare the user ID in the JWT token with the owner ID of the requested item.
WHEN a user attempts to update or delete a todo item, THE system SHALL verify the user ID from the JWT token matches the item's owner ID.
WHEN a user attempts to access a todo item owned by another user, THE system SHALL return a 403 Forbidden error with error code ACCESS_DENIED.
THE system SHALL NEVER allow a user to modify, view, or delete any todo item they did not create.
THE system SHALL ignore any user ID provided in request payloads, headers, or query parameters.

### Token Management

JWT tokens shall include:
- `sub`: user ID (UUID v4)
- `exp`: expiration time (24 hours)
- `iat`: issued at timestamp

Tokens shall be stored securely in HTTP-only, SameSite=Strict, Secure cookies. They shall never appear in URLs, localStorage, or session storage.

### Permission Matrix

| Feature | Guest | User | Admin |
|--------|-------|------|-------|
| Register | ✅ | ❌ | ❌ |
| Login | ✅ | ❌ | ❌ |
| View own todo list | ❌ | ✅ | ❌ |
| Create todo item | ❌ | ✅ | ❌ |
| Update own todo item | ❌ | ✅ | ❌ |
| Delete own todo item | ❌ | ✅ | ❌ |
| View any other user's todo items | ❌ | ❌ | ❌ |
| View aggregated statistics | ❌ | ❌ | ✅ |

## Core Todo Functionality

### Todo Item Creation

WHEN a user creates a new todo item, THE system SHALL require a non-empty title with a minimum length of 1 character and a maximum length of 255 characters.
WHEN a user creates a new todo item, THE system SHALL assign a default status of "pending" if no status is provided.
WHEN a user creates a new todo item, THE system SHALL automatically set the creation timestamp to the current server time in ISO 8601 format.
WHEN a user creates a new todo item, THE system SHALL automatically assign a unique identifier (UUID v4) to the todo item.
WHEN a user creates a new todo item, THE system SHALL reject the request if the title contains only whitespace characters.

### Todo Item Update

WHEN a user updates an existing todo item, THE system SHALL validate that the title, if provided, has a minimum length of 1 character and a maximum length of 255 characters.
WHEN a user updates an existing todo item, THE system SHALL allow the status to be changed between "pending", "in-progress", and "completed".
WHEN a user updates an existing todo item, THE system SHALL validate that the status value is one of the permitted values: "pending", "in-progress", "completed".
WHEN a user updates an existing todo item, THE system SHALL update the last-modified timestamp to the current server time in ISO 8601 format whenever any field is modified.
WHEN a user updates an existing todo item, THE system SHALL reject the request if the todo item ID does not correspond to any item owned by the authenticated user.

### Todo Item Deletion

WHEN a user deletes a todo item, THE system SHALL verify that the todo item exists and is owned by the authenticated user.
WHEN a user deletes a todo item, THE system SHALL permanently remove the todo item from the database.
WHEN a user deletes a todo item, THE system SHALL return a success confirmation regardless of whether the todo item was previously marked as completed or pending.

### Data Validation

IF a todo item title is provided and contains only whitespace characters, THEN THE system SHALL reject the request with error code TITLE_INVALID_FORMAT.
IF a todo item title exceeds 255 characters, THEN THE system SHALL reject the request with error code TITLE_TOO_LONG.
IF a todo item status is provided and is not one of "pending", "in-progress", or "completed", THEN THE system SHALL reject the request with error code INVALID_STATUS.
IF a todo item is requested with an ID that does not correspond to any item in the system, THEN THE system SHALL reject the request with error code TODO_NOT_FOUND.

## User Scenarios and Workflows

### Primary User Journey: Registration to Todo Creation

1. User navigates to the website homepage
2. User clicks "Sign Up"
3. User enters valid email and password (8+ characters)
4. System validates email format and password requirements
5. System creates new user account with UUID and encrypted password
6. System sends confirmation email (not required for operation)
7. User logs in with email and password
8. System validates credentials, generates JWT token with user ID
9. User is redirected to Todo dashboard
10. User enters a task title (string, 1–255 chars)
11. User clicks "Add Task"
12. System creates todo item with status "pending", UUID, creation timestamp
13. System associates item with the authenticated user ID from JWT
14. System returns updated todo list in response

### Secondary User Journey: Task Update and Completion

1. User views their list of todo items
2. User clicks "Edit" on a "pending" task
3. User changes the task title to "Buy groceries"
4. User clicks "Save"
5. System validates new title length (1–255 chars)
6. System updates title and sets last-modified timestamp
7. User clicks "Mark as Done"
8. System changes status from "pending" to "completed"
9. System updates last-modified timestamp
10. System returns updated list with revised status

### Special Scenario: Password Reset

1. User navigates to login page
2. User clicks "Forgot Password"
3. System displays email input field
4. User enters registered email address
5. System validates email exists in database
6. System generates temporary reset token (60-minute expiry)
7. System sends reset link via email
8. User clicks reset link
9. System validates token validity and expiration
10. User enters new password (8+ min length)
11. System updates password hash in database
12. System invalidates all existing JWT tokens for this user
13. System prompts user to log in again with new password

### Special Scenario: Account Deletion

1. User navigates to account settings
2. User selects "Delete Account"
3. System displays confirmation dialog with warning
4. User enters password to confirm deletion
5. System validates password against stored hash
6. System initiates deletion process:
   - Invalidates all active JWT tokens for this user
   - Marks account as "deletion in progress"
   - Schedules soft-delete of all todo items (24-hour hold)
   - Records deletion timestamp for audit
7. After 24 hours, system permanently deletes:
   - User record
   - All associated todo items
   - All audit logs related to this user (except deletion event)
8. System notifies user that account is permanently removed

## Exception Handling

### Authentication Errors

WHEN a request has no authorization header, THE system SHALL return 401 Unauthorized with error code AUTH_REQUIRED.
WHEN a JWT token is malformed, THE system SHALL return 401 Unauthorized with error code AUTH_INVALID_TOKEN.
WHEN a JWT token has expired, THE system SHALL return 401 Unauthorized with error code AUTH_EXPIRED.
WHEN a JWT token contains no user ID, THE system SHALL return 401 Unauthorized with error code AUTH_REQUIRED.
WHEN a request contains an invalid signature on the JWT token, THE system SHALL return 401 Unauthorized with error code AUTH_INVALID_TOKEN.

### Authorization Errors

WHEN a user attempts to access a todo item they do not own, THE system SHALL return 403 Forbidden with error code ACCESS_DENIED.
WHEN a user attempts to modify another user's todo item, THE system SHALL return 403 Forbidden with error code ACCESS_DENIED.
WHEN an admin attempts to view individual user todo items, THE system SHALL return 403 Forbidden with error code ACCESS_DENIED.

### Input Validation Failures

WHEN a todo item title is empty or contains only whitespace, THE system SHALL return 400 Bad Request with error code TITLE_INVALID_FORMAT.
WHEN a todo item title exceeds 255 characters, THE system SHALL return 400 Bad Request with error code TITLE_TOO_LONG.
WHEN a todo item status is not "pending", "in-progress", or "completed", THE system SHALL return 400 Bad Request with error code INVALID_STATUS.
WHEN a todo item ID is not a valid UUID, THE system SHALL return 400 Bad Request with error code INVALID_ID_FORMAT.

### System Failures

WHEN the database connection fails, THE system SHALL return 503 Service Unavailable.
WHEN the JWT signing key is unavailable, THE system SHALL return 500 Internal Server Error.
WHEN an internal server error occurs during todo item creation, THE system SHALL log the error and return 500 Internal Server Error.
WHEN the authentication service is down, THE system SHALL return 503 Service Unavailable with error code AUTH_SERVICE_DOWN.

## Performance Expectations

### Response Time Requirements

WHEN a user retrieves their todo list with fewer than 100 items, THE system SHALL respond within 100 milliseconds under normal load.
WHEN a user creates a new todo item, THE system SHALL respond within 150 milliseconds under normal load.
WHEN a user updates or deletes a todo item, THE system SHALL respond within 120 milliseconds under normal load.
WHEN a user authenticates or generates a new JWT token, THE system SHALL respond within 80 milliseconds under normal load.

### Scalability Expectations

THE system SHALL support up to 100,000 concurrently authenticated users.
THE system SHALL handle up to 1,000 Todo CRUD operations per second during peak traffic.
THE system SHALL scale horizontally by adding application server instances.
THE system SHALL use connection pooling for database operations to avoid connection exhaustion.
THE system SHALL cache authentication tokens at the proxy level for 1 minute to reduce JWT verification load.

### System Availability

THE system SHALL maintain 99.9% monthly uptime.
THE system SHALL have automatic failover for database and authentication services.
THE system SHALL include redundancy at the application server level.
THE system SHALL perform health checks every 10 seconds to detect and auto-recover from failures.

## Security and Compliance

### Data Privacy

THE system SHALL treat all todo items as personal data belonging exclusively to the individual user.
THE system SHALL not store any sensitive information beyond email, encrypted password, and todo item metadata.
THE system SHALL not log or track user behavior beyond authentication logs.
THE system SHALL comply with GDPR and CCPA regulations:
- Right to access personal data (own todo items)
- Right to delete personal data (account deletion)
- Right to rectify data (edit todo items)
- Right to data portability (export own todo items)

### Authentication Security

THE system SHALL use industry-standard bcrypt for password hashing with cost factor 12.
THE system SHALL validate all inputs to prevent SQL injection and XSS attacks.
THE system SHALL use Content Security Policy (CSP) to prevent inline scripts.
THE system SHALL set HTTP headers to disable caching of sensitive pages.
THE system SHALL validate the Origin header for all API requests to prevent CSRF.

### Access Control Enforcement

THE system SHALL enforce data isolation at the database query level, not only at the application level.
All database queries for todo items SHALL include a WHERE clause filtering by user ID from JWT token.
THE system SHALL never join todo items with user data in a way that could cause data leakage.
THE system SHALL prohibit SQL queries that omit the user ID filter.

### Regulatory Compliance

THE system SHALL store user data in the United States or European Union regions.
THE system SHALL support data export in JSON format upon request.
THE system SHALL notify users in writing of any data breach within 72 hours.
THE system SHALL retain security logs for 12 months for audit purposes.

## Business Rules

### Todo Item Validation

### Todo Item Creation Requirements

WHEN a user creates a new todo item, THE system SHALL require a non-empty title with a minimum length of 1 character and a maximum length of 255 characters.
WHEN a user creates a new todo item, THE system SHALL assign a default status of "pending" if no status is provided.
WHEN a user creates a new todo item, THE system SHALL automatically set the creation timestamp to the current server time in ISO 8601 format.
WHEN a user creates a new todo item, THE system SHALL automatically assign a unique identifier (UUID v4) to the todo item.
WHEN a user creates a new todo item, THE system SHALL reject the request if the title contains only whitespace characters.

### Todo Item Update Requirements

WHEN a user updates an existing todo item, THE system SHALL validate that the title, if provided, has a minimum length of 1 character and a maximum length of 255 characters.
WHEN a user updates an existing todo item, THE system SHALL allow the status to be changed between "pending", "in-progress", and "completed".
WHEN a user updates an existing todo item, THE system SHALL validate that the status value is one of the permitted values: "pending", "in-progress", "completed".
WHEN a user updates an existing todo item, THE system SHALL update the last-modified timestamp to the current server time in ISO 8601 format whenever any field is modified.
WHEN a user updates an existing todo item, THE system SHALL reject the request if the todo item ID does not correspond to any item owned by the authenticated user.

### Todo Item Deletion Requirements

WHEN a user deletes a todo item, THE system SHALL verify that the todo item exists and is owned by the authenticated user.
WHEN a user deletes a todo item, THE system SHALL permanently remove the todo item from the database.
WHEN a user deletes a todo item, THE system SHALL return a success confirmation regardless of whether the todo item was previously marked as completed or pending.

### Data Validation Rules

IF a todo item title is provided and contains only whitespace characters, THEN THE system SHALL reject the request with error code TITLE_INVALID_FORMAT.
IF a todo item title exceeds 255 characters, THEN THE system SHALL reject the request with error code TITLE_TOO_LONG.
IF a todo item status is provided and is not one of "pending", "in-progress", or "completed", THEN THE system SHALL reject the request with error code INVALID_STATUS.
IF a todo item is requested with an ID that does not correspond to any item in the system, THEN THE system SHALL reject the request with error code TODO_NOT_FOUND.

### User Data Ownership

### Data Isolation Requirements

THE system SHALL ensure that each todo item is permanently and irreversibly associated with the user who created it.
THE system SHALL never display any todo item to a user who did not create it.
THE system SHALL never allow a user to view, modify, or delete a todo item that belongs to another user.
WHILE a user is authenticated, THE system SHALL only return todo items that match the user's unique identifier in the authentication token.
THE system SHALL treat all todo data as strictly private and never share it between users under any circumstances.

### Ownership Verification Requirements

WHEN a user requests any todo item, THE system SHALL validate that the user's authentication token contains a user ID that matches the owner ID of the requested item.
WHEN a user requests to modify any todo item, THE system SHALL validate that the user's authentication token contains a user ID that matches the owner ID of the requested item.
WHEN a user requests to delete any todo item, THE system SHALL validate that the user's authentication token contains a user ID that matches the owner ID of the requested item.
WHEN a user performs any operation on todo items, THE system SHALL use the user ID from the JWT token, not any user ID provided in the request payload.

### Access Control Enforcement

THE system SHALL never accept user ID values from request parameters, headers, or JSON payloads to determine ownership.
THE system SHALL exclusively use the user ID from the authenticated JWT token to enforce data ownership.
THE system SHALL reject any request that attempts to specify a different user ID than the one in the authentication token.
WHERE a user is not authenticated, THE system SHALL reject all todo-related operations with error code AUTH_REQUIRED.

### Concurrency Rules

### Concurrent Modification

WHEN two users attempt to modify the same todo item simultaneously, THE system SHALL handle both requests independently as they operate on different user data.
WHILE a user is editing a todo item, THE system SHALL NOT prevent other users from viewing or editing their own todo items.
THE system SHALL permit concurrent updates to different todo items without any restrictions.
THE system SHALL not implement any locking mechanisms for todo items since each user's data is completely isolated.

### No Overwrite Conflicts

WHEN a user updates a todo item, THE system SHALL apply changes to the item owned by that user, regardless of whether other users have modified their own items.
WHEN a user updates a todo item, THE system SHALL not check for concurrent modifications from other users since it's impossible for other users to modify the same item.
THE system SHALL not implement optimistic or pessimistic locking for todo items because data isolation eliminates the possibility of cross-user conflicts.

### State Transitions

### Valid Status Transitions

WHEN a todo item is in "pending" status, THE system SHALL allow transitions to "in-progress" or "completed".
WHEN a todo item is in "in-progress" status, THE system SHALL allow transitions to "pending" or "completed".
WHEN a todo item is in "completed" status, THE system SHALL allow transitions to "pending".
WHEN a todo item is in "completed" status, THE system SHALL NOT allow direct transitions to "in-progress" if the item was not previously "pending".

### State Transition Validation

IF a user attempts to change a todo item's status from "completed" to "pending", THEN THE system SHALL allow the transition.
IF a user attempts to change a todo item's status from "pending" to "completed", THEN THE system SHALL allow the transition.
IF a user attempts to change a todo item's status from "in-progress" to "pending", THEN THE system SHALL allow the transition.
IF a user attempts to change a todo item's status to any value other than "pending", "in-progress", or "completed", THEN THE system SHALL reject the request with error code INVALID_STATUS_TRANSITION.

### State Change Auditing

WHEN a todo item's status changes, THE system SHALL log the change as part of the item's audit trail.
WHEN a todo item's status changes, THE system SHALL preserve the previous status value in the item's metadata.
WHEN a todo item's status changes, THE system SHALL update the last-modified timestamp to reflect the time of the state transition.
THE system SHALL not implement any complex state machines for todo items; transitions are simple and directly supported by validation rules.

### Automated State Changes

WHEN a user marks a todo item as "completed", THE system SHALL NOT automatically update any other todo items belonging to the same user.
WHEN a user creates a new todo item, THE system SHALL NOT automatically modify the status of any existing todo items.
THE system SHALL treat all task status transitions as explicit user actions only, with no automatic state changes based on other items' status.

### Edge Case Handling

WHEN a user attempts to update a todo item with an invalid status, THE system SHALL return a 400 Bad Request response with error code INVALID_STATUS.
WHEN a user attempts to transition a todo item to an invalid state, THE system SHALL return a 400 Bad Request response with error code INVALID_STATUS_TRANSITION.
WHEN a user attempts to modify a todo item owned by another user, THE system SHALL return a 403 Forbidden response with error code ACCESS_DENIED.
WHEN a user attempts to delete a todo item that does not exist, THE system SHALL return a 404 Not Found response with error code TODO_NOT_FOUND.

### Data Integrity Requirements

### Referential Integrity

THE system SHALL ensure that every todo item has a valid owner ID linked to a registered user.
THE system SHALL NEVER allow a todo item to exist without a validated owner ID.
THE system SHALL remove all todo items associated with a user when that user account is deleted.
WHEN a user account is deleted, THE system SHALL permanently remove all associated todo items.
WHEN a todo item is created, THE system SHALL validate that the user ID in the JWT token corresponds to an active user account.

### Data Consistency

THE system SHALL maintain consistency between user authentication status and todo item access.
THE system SHALL ensure that caching layers do not expose todo items to unauthorized users.
WHILE a user session is active, THE system SHALL retrieve todo items directly from the data store, not from any shared cache that could expose other users' data.
THE system SHALL use per-user data isolation at the database query level, not at the application level only.

### Backup and Recovery

THE system SHALL maintain backups of todo data that preserve data ownership relationships.
THE system SHALL ensure that restored data maintains the original ownership and access restrictions.
WHEN data is restored from backup, THE system SHALL validate that all todo items have valid owner IDs corresponding to existing users.
WHERE a user account is missing from the restored data, THE system SHALL not restore any todo items associated with that account.

### Sharing and Collaboration Restrictions

### Strict Privacy Enforcement

THE system SHALL implement zero sharing capabilities; no user may see, edit, or share any todo item belonging to another user.
WHILE a user is authenticated, THE system SHALL NOT provide search, filter, or list functions that return todo items from other users.
THE system SHALL NOT implement any "team" or "shared list" features, even as future enhancements.
THE system SHALL NOT expose any API endpoints or UI elements that suggest cross-user collaboration.

### No Public Content

THE system SHALL treat all todo items as strictly private, even for users who have marked their items "public" in the user interface.
WHERE a user attempts to set any todo item to "public" status, THE system SHALL ignore the setting and maintain the item as private.
THE system SHALL NOT provide any mechanism for users to view todo items created by other users.
THE system SHALL NOT implement any "shared with" or "collaborator" permissions.

### Administrative and System Rules

### Developer Access

THE system SHALL allow system administrators to view an aggregate count of user accounts and total todo items.
THE system SHALL allow system administrators to view statistics on todo item completion rates across all users.
THE system SHALL NOT allow system administrators to view any individual user's todo items.
THE system SHALL log all administrative access attempts to system statistics pages.

### Audit and Monitoring

THE system SHALL log all user actions related to todo items for security auditing.
THE system SHALL log all attempts to access unauthorized todo items with the user's IP address and timestamp.
THE system SHALL log all authentication failures and failed authorization attempts.
THE system SHALL revoke sessions that attempt persistent unauthorized access to other users' data.

## Data Flow and Lifecycle

### Data Entry Points

- User registration form (email, password)
- User login form (email, password)
- Todo creation interface (title, status)
- Todo update interface (title, status)
- Todo delete action (by ID)
- Password reset request (email)
- Account deletion request (password confirmation)

### Data Processing Flow

1. User submits registration via HTTPS POST to `/api/auth/register`
2. System validates input, encrypts password, creates user record
3. User logs in via POST to `/api/auth/login`
4. System verifies credentials, issues signed JWT in HTTP-only cookie
5. User requests todo list via GET to `/api/todos` with JWT cookie
6. System verifies JWT signature and extracts user ID
7. System queries database for todos where `ownerId = {user_id}`
8. System returns paginated list of owned todos
9. User creates new todo via POST to `/api/todos` with title
10. System validates title, assigns UUID and timestamp, inserts with user ID
11. System returns newly created todo
12. User updates todo via PUT to `/api/todos/{id}` with partial data
13. System validates ownership, updates record, sets last-modified timestamp
14. User deletes todo via DELETE to `/api/todos/{id}`
15. System validates ownership and deletes record permanently

### Data Storage

- **Users** (Table): `id`, `email` (encrypted), `password_hash`, `created_at`, `deleted_at`
- **Todo Items** (Table): `id`, `title`, `status`, `owner_id`, `created_at`, `last_modified_at`, `deleted_at`

All tables use UUID primary keys.
All password hashes use bcrypt (cost 12).
All timestamps use ISO 8601 UTC format.
All user IDs areimmutable and non-repeatable.

### Data Lifecycle

1. **Creation**: User registers → system creates user record and pending todo items
2. **Active**: User creates/edit/delete todos → system enforces ownership
3. **Deactivation**: User clicks "Delete Account" → system marks account for deletion, begins 24-hour grace period
4. **Deletion**: After 24 hours, system permanently removes user and all associated todos
5. **Recovery**: No recovery allowed
6. **Archival**: No archival of user data; immediate purge upon deletion
7. **Backup**: Daily encrypted backups of entire database
8. **Restore**: Restore from backup preserves ownership relationships

## Future Considerations

### Potential Feature Extensions

- Export Todo List (JSON/CSV)
- Dark Mode Interface
- Mobile App (Separate Project—Data Model Would Not Change)
- Localization (EN/ES/FR Support)

These features, if added, must:
- Not affect the core data isolation model
- Not allow any cross-user data exposure
- Always use the same owner ID enforcement mechanism
- Never introduce shared resources or collaborative structures

### Scalability Considerations

- Database sharding by user ID for 1M+ users
- Separate read replicas for todo list queries
- CDN for static assets to reduce origin load

These scaling measures must preserve strict ownership isolation.

### Integration Opportunities

- OAuth support (Google, Apple login)—would preserve owner ID assertion
- Calendar sync—but no export of other users’ items
- Webhook triggers on todo changes—but no cross-user notification

These integrations must:
- Only expose data belonging to the authenticated user
- Never mediate or enable sharing between users
- Validate all webhook requests with JWT or similar token
- Ensure no data leakage through third-party endpoints

> *Developer Note: All technical implementation details (database schema, API endpoints, NestJS module structure) are left to the development team. This document defines business requirements only.*