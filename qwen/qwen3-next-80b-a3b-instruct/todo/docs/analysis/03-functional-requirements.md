# Multi-User Todo Application Requirements Specification

## User Authentication

WHEN a user registers with an email and password, THE system SHALL create a new user account with a unique identifier and store the password as a bcrypt-hashed value.

WHEN a user attempts to log in with email and password, THE system SHALL validate the credentials against the stored hash and issue a signed JWT token with a 7-day expiration and a refresh token with a 30-day expiration.

WHEN a user's access token expires, THE system SHALL reject any protected API request and return HTTP 401 Unauthorized, prompting the user to refresh their token.

WHEN a user requests a password change, THE system SHALL validate the current password, generate a new bcrypt hash for the new password, and update the user record.

WHEN a user requests a password reset, THE system SHALL generate a cryptographically secure 64-character reset token, associate it with the user's account, set its expiration to 2 hours, and send it via email.

WHEN a user submits a valid reset token and new password, THE system SHALL update the password hash, invalidate the reset token, and create a system audit log entry.

IF a user provides invalid credentials during login, THEN THE system SHALL return HTTP 401 Unauthorized with generic message "Invalid email or password" and log the failed attempt for security monitoring.

IF a user tries to register with an email that already exists, THEN THE system SHALL return HTTP 409 Conflict with generic message "Email already registered".

IF a user attempts to reset a password using an invalid, expired, or already-used token, THEN THE system SHALL return HTTP 400 Bad Request with message "Invalid or expired reset token".

WHERE a user's email is not confirmed, THE system SHALL allow login but restrict access to todo management features until email confirmation is completed.

## User Profile Management

WHEN a user updates their display name, THE system SHALL validate that the display name is not empty, does not exceed 50 characters, and contains only alphanumeric characters, spaces, hyphens, and underscores.

WHEN a user updates their display name, THE system SHALL store the new value in the profile record and update the last modified timestamp.

WHEN a user views their own profile, THE system SHALL return the display name, email address, account creation date, and last login timestamp.

IF a user attempts to view another user's profile, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not have permission to view this profile".

IF a user submits a display name that is empty, THEN THE system SHALL reject the update with error code PROFILE_INVALID_NAME.

IF a user submits a display name longer than 50 characters, THEN THE system SHALL reject the update with error code PROFILE_NAME_TOO_LONG.

IF a user submits a display name containing invalid characters (e.g., special symbols), THEN THE system SHALL reject the update with error code PROFILE_INVALID_CHARS.

WHERE a user has not set a display name, THE system SHALL default to their email address prefix (the part before @) for display purposes.

## Todo Creation

WHEN a user creates a todo, THE system SHALL require a title field with minimum length of 1 character and maximum length of 200 characters.

WHEN a user creates a todo, THE system SHALL allow an optional description field with a maximum length of 2,000 characters.

WHEN a user creates a todo, THE system SHALL allow optional start date and due date fields in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).

WHEN a user creates a todo, THE system SHALL set the completion status to false (incomplete) by default.

WHEN a user creates a todo, THE system SHALL record the exact server timestamp (UTC) as the creation date.

WHEN a user submits a todo with an empty title, THEN THE system SHALL reject the creation with error code TODO_MISSING_TITLE and HTTP 400 Bad Request.

WHEN a user submits a todo with a title longer than 200 characters, THEN THE system SHALL reject the creation with error code TODO_TITLE_TOO_LONG and HTTP 400 Bad Request.

WHEN a user submits a start date or due date that is not in valid ISO 8601 format, THEN THE system SHALL reject the creation with error code TODO_INVALID_DATE and HTTP 400 Bad Request.

WHEN a user submits a todo where the start date is after the due date, THEN THE system SHALL accept the creation but record an internal flag " startDateAfterDueDate" in the audit trail (invisible to user).

WHERE a user submits a todo without a description, THE system SHALL store an empty string (not null) as the description.

WHERE a user submits a todo without a start date, THE system SHALL store null for the start date.

WHERE a user submits a todo without a due date, THE system SHALL store null for the due date.

## Todo Viewing

WHEN a user requests their todo list, THE system SHALL return only todos where the owner_id matches the authenticated user's ID.

WHEN a user requests their todo list, THE system SHALL paginate results with a default page size of 20 items and support a page size parameter up to 100.

WHEN a user requests their todo list, THE system SHALL include for each todo: title, completion status, creation date (UTC), start date (if not null), and due date (if not null).

WHEN a user requests a single todo by ID, THE system SHALL return the full details including: title, description, completion status, creation date, start date (if not null), due date (if not null), last updated date (UTC), and the count of edit history entries.

WHEN a user requests a todo by ID that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user requests a todo by ID that does not exist, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

## Todo Completion Toggle

WHEN a user marks a todo as complete, THE system SHALL set the completion status to true and update the last updated timestamp.

WHEN a user marks a todo as incomplete, THE system SHALL set the completion status to false and update the last updated timestamp.

WHEN a user toggles a todo's completion status, THE system SHALL create an audit log entry indicating the status change.

IF a user attempts to toggle a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

IF a user attempts to toggle a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

## Todo Editing

WHEN a user edits a todo's title, THE system SHALL validate the new title is between 1 and 200 characters.

WHEN a user edits a todo's description, THE system SHALL validate the new description is no longer than 2,000 characters.

WHEN a user edits a todo's start date, THE system SHALL validate the date is in ISO 8601 format.

WHEN a user edits a todo's due date, THE system SHALL validate the date is in ISO 8601 format.

WHEN a user edits any field of a todo, THE system SHALL create a new history entry recording the previous values of all changed fields.

WHEN a user attempts to edit a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user attempts to edit a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

WHEN a user submits an empty title during edit, THEN THE system SHALL reject the edit with error code TODO_MISSING_TITLE and HTTP 400 Bad Request.

WHEN a user submits a title longer than 200 characters during edit, THEN THE system SHALL reject the edit with error code TODO_TITLE_TOO_LONG and HTTP 400 Bad Request.

WHEN a user submits an invalid date format during edit, THEN THE system SHALL reject the edit with error code TODO_INVALID_DATE and HTTP 400 Bad Request.

## Edit History

WHEN a todo is edited, THE system SHALL create a new history entry in the edit_history table.

WHEN a history entry is created, THE system SHALL record the exact timestamp (UTC) of the edit operation.

WHEN a history entry is created, THE system SHALL record the previous title value if and only if the title was changed.

WHEN a history entry is created, THE system SHALL record the previous description value if and only if the description was changed.

WHEN a history entry is created, THE system SHALL record the previous start date value if and only if the start date was changed.

WHEN a history entry is created, THE system SHALL record the previous due date value if and only if the due date was changed.

WHEN a user requests the edit history of a todo, THE system SHALL return only history entries for that specific todo ID.

WHEN a user requests the edit history of a todo, THE system SHALL sort the entries from most recent to oldest by timestamp.

WHEN a user requests the edit history of a todo they do not own, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user requests the edit history of a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

## Todo Deletion

WHEN a user deletes a todo, THE system SHALL set the is_deleted flag to true and update the last updated timestamp.

WHEN a todo is marked as deleted, THE system SHALL exclude it from all default todo list queries.

WHEN a todo is marked as deleted, THE system SHALL preserve all associated edit history records.

WHEN a user attempts to delete a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user attempts to delete a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

## Trash Management

WHEN a user requests the trash list, THE system SHALL return only todos where is_deleted = true and owner_id matches the authenticated user's ID.

WHEN a user requests the trash list, THE system SHALL paginate results with a default page size of 20 items and support a page size parameter up to 100.

WHEN a user restores a todo from trash, THE system SHALL set is_deleted to false and update the last updated timestamp.

WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo record and all associated edit history records from the database in a single atomic transaction.

WHEN a user attempts to restore a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user attempts to permanently delete a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with message "Access denied: You do not own this todo".

WHEN a user attempts to restore or permanently delete a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found with message "Todo not found".

WHERE a user restores a todo that had a due date before deletion, THE system SHALL restore the original due date value without modification.

WHERE a user permanently deletes a todo from trash, THE system SHALL guarantee the deletion is irreversible and unrecoverable, even by database recovery tools.

## Filtering

WHEN a user applies a filter for "all todos", THE system SHALL return todos regardless of completion status.

WHEN a user applies a filter for "complete todos", THE system SHALL return only todos where completion_status is true.

WHEN a user applies a filter for "incomplete todos", THE system SHALL return only todos where completion_status is false.

WHEN a user applies a filter, THE system SHALL return only todos where owner_id matches the authenticated user's ID.

IF a user submits an invalid filter parameter (e.g., "active" instead of "incomplete"), THEN THE system SHALL default to "all todos".

## Sorting

WHEN a user sorts by creation date (newest first), THE system SHALL order todos by created_at timestamp in descending order.

WHEN a user sorts by creation date (oldest first), THE system SHALL order todos by created_at timestamp in ascending order.

WHEN a user sorts by start date (earliest first), THE system SHALL order todos by start_date ascending, with null values appearing last.

WHEN a user sorts by start date (latest first), THE system SHALL order todos by start_date descending, with null values appearing last.

WHEN a user sorts by due date (earliest first), THE system SHALL order todos by due_date ascending, with null values appearing last.

WHEN a user sorts by due date (latest first), THE system SHALL order todos by due_date descending, with null values appearing last.

WHEN a user applies a sort order, THE system SHALL return only todos where owner_id matches the authenticated user's ID.

IF a user submits an invalid sort parameter (e.g., "random"), THEN THE system SHALL default to sorting by creation date (newest first).

## Privacy Architecture

WHAT: Each user's data is completely isolated from other users.

HOW: All database queries include an explicit WHERE owner_id = :current_user_id clause.

WHY: To ensure total data privacy and compliance with user expectations.

NO EXCEPTIONS: There is no administrative override, no backend access, no API endpoint that returns other users' data.

AUDIT LOGS: All access attempts to foreign user data are logged with user ID, timestamp, and endpoint.

PERMISSION ENFORCEMENT: Every read, write, update, and delete operation validates ownership before execution.

DATA STORAGE: User IDs are never exposed in URLs. Todos are accessed only by internal IDs bound to authenticated sessions.

DELETION: When a user deletes their account, all associated todos and edit history are permanently purged from the database.

ETERNAL ISOLATION: No cross-user queries, no aggregation, no shared views, no implications for other users.

## Authentication and Authorization Workflow

The system implements JWT token authentication with refresh token rotation using the following sequence:

1. **Registration**: User submits email and password → system stores hashed password → returns 201 Created
2. **Login**: User submits email and password → system validates hash → issues access token (7d) and refresh token (30d) → stores refresh token in Redis with user ID
3. **API Access**: All protected routes require Authorization: Bearer <access_token> header
4. **Token Expiration**: Access token expires → user must use refresh token to obtain new access token
5. **Refresh Token**: User sends refresh token → system validates it against Redis → returns new access and refresh token → invalidates old refresh token
6. **Logout**: User sends logout request → system removes refresh token from Redis
7. **Account Deletion**: User deletes account → system immediately removes all tokens and data
8. **Password Change**: User changes password → system invalidates all refresh tokens

The system enforces role-based access where every user is "member" and has no administrative privileges.

## Business Rules Summary

### Todo Validation Rules
- Title: 1-200 characters
- Description: 0-2000 characters
- Dates: ISO 8601 format
- Start date may be after due date (accepted but flagged internally)
- Null values permitted for description, start date, due date

### Edit History Rules
- History entries created only for actual field changes
- Only previous values are recorded, not new values
- History entries include timestamp only, not user ID (non-reversible, non-attributable)
- History entries are immutable once created

### Trash Management Rules
- Deleted todos remain in database with is_deleted flag
- Trash view shows only is_deleted=true items
- Restore sets is_deleted=false
- Permanent delete removes todo and all related history
- No user can access another user's trash

### Privacy Rules
- Zero cross-user data access
- No shared identifiers
- All queries scoped to authenticated user
- User ID never exposed in URL parameters
- Server-side enforced ownership checks on every operation

### Performance Expectations
- Todo list response time: < 200ms for 1000 todos
- Todo detail response time: < 150ms
- Create/edit/delete operations: < 100ms
- Pagination with 100 items: < 150ms
- Full history load (100 entries): < 250ms

## Security and Compliance

The system ensures:
- Passwords are hashed with bcrypt and salt (cost factor 12)
- JWT signatures are verified with RS256 private/public key pair
- Refresh tokens are stored in Redis with TTL and access tracking
- All API endpoints are protected by authentication middleware
- Database queries use parameterized placeholders to prevent SQL injection
- Input validation occurs at the application level before reaching the database
- All timestamps use UTC to avoid timezone inconsistencies
- Error messages are generic to prevent information disclosure
- Audit logs are generated for all security-relevant events
- Account deletion is immediate and irreversible
- Data backups, if any, exclude personal user data

## Future Vision

In future versions, the system may support:
- Todo categorization and tagging
- Recurring tasks with pattern rules
- Shared task lists with explicit permissions
- Mobile applications with offline sync
- Data export in CSV/JSON format
- Integration with calendar systems
- Voice commands for todo management
- Dark mode interface
- Accessibility compliance

All future features will preserve the core privacy model: complete data isolation between users.

## System Constraints

The system shall not:
- Allow users to view, search, or access any data belonging to other users
- Include any API endpoints or database views that expose cross-user data
- Permit administrative access to other users' data
- Store user passwords in plain text
- Allow email addresses to be changed after registration
- Permit duplicate email addresses across user accounts
- Allow soft-deleted todos to be recovered via backup restoration

This document represents the authoritative requirements specification. All implementation phases (Database, Interface, Test, Realize) must derive their outputs strictly from this document.
