# TodoApp Functional Requirements Specification

## Introduction

TodoApp is a private, single-user-per-account task management application designed with absolute data isolation and privacy as its foundational principles. This specification document provides comprehensive, implementation-ready requirements for developing the backend application with strict adherence to the business requirement that no user can access, view, or even detect the existence of another user's data under any circumstances.

All development must ensure complete logical and technical segregation of user data. The system is not designed for collaboration, sharing, or any form of cross-user interaction. Every feature has been architected to enforce individual user data sovereignty.

## User Authentication

### User Registration

WHEN a user submits an email and password to register an account, THE system SHALL validate that:

- The email address follows standard email format (local-part@domain)
- The password is at least 8 characters in length
- The email address is not already registered in the system

IF the email address is already registered, THEN THE system SHALL return a generic error message: "Invalid email or password" without indicating whether the issue was with the email or password.

WHEN validation passes, THE system SHALL create a new user account with:
- A unique identifier (UUID)
- The provided email address in encrypted form
- The password stored as a bcrypt-hashed value
- A default display name set to the email address prefix (text before @)
- The account creation timestamp
- All data tied exclusively to the new user's UUID

### User Login

WHEN a user submits an email and password to log in, THE system SHALL validate that:

- The email address corresponds to an existing, active user account
- The provided password matches the stored bcrypt hash

IF authentication fails, THEN THE system SHALL return the same generic error message regardless of whether the email doesn't exist or the password is incorrect: "Invalid email or password."

WHEN authentication succeeds, THE system SHALL issue:
- A JWT access token with expiration of 15 minutes
- A refresh token stored as a hashed value in the database with 30-day expiration

THE JWT access token SHALL contain the following payload:
-"sub": the user's unique UUID identifier
-"email": the user's email address (for identification)
-"actor": the string literal "user"
-"iat": issuance timestamp
-"exp": expiration timestamp (15 minutes after issuance)

WHEN a user successfully logs in, THE system SHALL redirect them to their todos dashboard.

### Password Change

WHEN a user requests to change their password, THE system SHALL require:

- The current password
- The new password (minimum 8 characters)
- Confirmation of the new password

WHEN the current password is validated, THE system SHALL compare the new password with the confirmation field.
IF the passwords do not match, THEN THE system SHALL return "Passwords do not match."

WHEN passwords match and are valid, THE system SHALL:

- Hash the new password using bcrypt
- Replace the old password hash with the new one in the database
- Immediately invalidate all active refresh tokens associated with the account
- Reissue a fresh refresh token upon successful change

IF a user attempts to change their password while logged out, THEN THE system SHALL require them to re-authenticate before proceeding with password change.

### Account Deletion

WHEN a user initiates account deletion, THE system SHALL require explicit confirmation of this irreversible action.

WHEN confirmation is received, THE system SHALL:

- Mark the user account as "deleted" with a timestamp
- Immediately invalidate all active authentication tokens (both access and refresh) for this user
- Initiate a full soft-deletion cascade of all user data:
  - Soft-delete all todos (set is_deleted = true and deleted_at = current timestamp)
  - Permanently delete all edit history records associated with the user's todos
  - Delete the user profile data

WHEN a user attempts to log in after account deletion, THE system SHALL return: "User account does not exist or has been deleted."

WHEN a user attempts to register with an email previously associated with a deleted account, THE system SHALL allow new registration and create a fresh account.

## User Profile Management

### Display Name Definition

WHEN a user has not set a custom display name, THE system SHALL generate a default display name using the email address prefix (everything before @).

FOR EXAMPLE: User with email "john.doe@example.com" shall have default display name "john.doe".

### Display Name Update

WHEN a user updates their display name, THE system SHALL validate that:

- The display name is not empty or whitespace only
- The display name does not exceed 50 characters
- The display name does not contain any control characters or HTML/JS injection sequences

IF the display name is empty, whitespace, or exceeds 50 characters, THEN THE system SHALL reject the update and return an appropriate error: "Display name must be 1-50 non-whitespace characters."

WHEN validation passes, THE system SHALL:

- Replace the existing display_name field with the new value
- Update the updated_at timestamp
- Return the updated profile data to the client

### Profile Access

WHEN a user requests their own profile information, THE system SHALL return:

- The display name
- The account creation date
- The email address (for display purposes)
- The last login timestamp

IF a user attempts to access another user's profile, THEN THE system SHALL return HTTP 404 Not Found with message "User not found."

## Todo Creation

### Todo Entity Requirements

WHEN a user creates a todo, THE system SHALL require:

- A non-empty title with 1-200 characters

WHEN a user creates a todo, THE system SHALL permit:

- A description field with maximum 2,000 characters (can be empty)
- A start date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) (can be null)
- A due date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) (can be null)

WHEN a todo is created, THE system SHALL automatically set:

- completion_status = false (incomplete)
- created_at = timestamp of creation
- updated_at = timestamp of creation
- is_deleted = false
- user_id = authenticated user's UUID

### Validation Rules

WHEN a todo title is submitted with 0 characters, THEN THE system SHALL reject the request with code "TODO_MISSING_TITLE."

WHEN a todo title exceeds 200 characters, THEN THE system SHALL reject the request with code "TODO_TITLE_TOO_LONG."

WHEN a start date or due date is submitted in invalid ISO 8601 format, THEN THE system SHALL reject the request with code "TODO_INVALID_DATE."

WHEN a due date is provided and is before the start date, THE system SHALL accept the todo but SHALL record this inconsistency in the edit history (user-visible).

WHEN a todo is created with an empty description, THE system SHALL store an empty string.

WHEN a todo is created without a start date, THE system SHALL store null.

WHEN a todo is created without a due date, THE system SHALL store null.

### Todo Storage

EVERY todo created SHALL belong exclusively to the authenticated user.

WHEN a todo is created, THE system SHALL not store any reference to other users.

WHEN a todo is created, THE system SHALL not include any metadata, tags, or context that could link it to other users.

## Todo Viewing

### Todo List Retrieval

WHEN a user requests their todo list, THE system SHALL return:

- Only todos where user_id = authenticated user's UUID
- Each todo shall include: title, completion_status, created_at, start_date (if not null), due_date (if not null)

WHEN the user requests pagination, THE system SHALL:

- Default to 20 todos per page
- Accept page parameter as a positive integer
- Return total count for pagination controls

WHEN the user requests more than 100 todos per page, THE system SHALL default to 20 todos per page and log the anomalous request.

### Single Todo Retrieval

WHEN a user requests a single todo by ID, THE system SHALL:

- Return the full detail: title, description, completion_status, created_at, updated_at, start_date (if not null), due_date (if not null)

IF the requested todo_id does not exist, THEN THE system SHALL return HTTP 404 Not Found.

IF the todo_id exists but belongs to another user, THEN THE system SHALL return HTTP 404 Not Found.

## Todo Completion Toggle

### Completion Status Update

WHEN a user marks a todo as complete, THE system SHALL:

- Set completion_status = true
- Update the updated_at timestamp

WHEN a user marks a todo as incomplete, THE system SHALL:

- Set completion_status = false
- Update the updated_at timestamp

WHEN a todo is toggled, THE system SHALL create an edit history entry.

IF the todo_id provided does not exist, THEN THE system SHALL return HTTP 404 Not Found.

IF the todo_id belongs to another user, THEN THE system SHALL return HTTP 404 Not Found.

## Todo Editing

### Editable Fields

WHEN a user edits a todo, THE system SHALL allow modification of:

- Title (1-200 characters)
- Description (≤ 2,000 characters)
- Start date (ISO 8601 or null)
- Due date (ISO 8601 or null)

### Edit Validation

WHEN a user submits an edit with an empty title, THEN THE system SHALL return code "TODO_MISSING_TITLE."

WHEN a user submits an edit with a title > 200 characters, THEN THE system SHALL return code "TODO_TITLE_TOO_LONG."

WHEN a user submits an edit with invalid date format, THEN THE system SHALL return code "TODO_INVALID_DATE."

WHEN a user attempts to change a field to the same value, THE system SHALL still create an edit history entry recording "no change."

### Edit History Trigger

WHEN any field of a todo is modified, THE system SHALL create a new entry in the edit history table with:

- The timestamp of the edit
- The previous value of the title (if changed) or "no change"
- The previous value of the description (if changed) or "no change"
- The previous value of the start date (if changed) or "no change"
- The previous value of the due date (if changed) or "no change"

WHEN a todo is edited, THE system SHALL update the updated_at field to the current timestamp.

IF a user attempts to edit a todo that belongs to another user, THEN THE system SHALL return HTTP 404 Not Found.

## Edit History

### History Record Structure

EVERY edit history entry SHALL contain:

- history_id (UUID)
- todo_id (foreign key to todos table)
- edited_at (timestamp)
- previous_title (string or null)
- previous_description (string or null)
- previous_start_date (timestamp or null)
- previous_due_date (timestamp or null)
- edited_by (user_id)

### Access Control

WHEN a user requests the edit history for a todo, THE system SHALL:

- Return only history entries where todo_id belongs to the authenticated user
- Sort results by edited_at descending (most recent first)

IF a user attempts to access edit history for a todo they do not own, THEN THE system SHALL return HTTP 404 Not Found.

IF a user attempts to access edit history for a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found.

### History Persistence

WHEN a todo is deleted (soft delete), ALL corresponding edit history records SHALL be retained.

WHEN a todo is permanently deleted, ALL edit history records for that todo SHALL be permanently removed.

WHEN a user account is deleted, ALL edit history records for that user's todos SHALL be permanently removed.

## Todo Deletion

### Soft Deletion Process

WHEN a user deletes a todo, THE system SHALL:

- Set is_deleted = true
- Set deleted_at = current timestamp
- Preserve all other todo data including description and dates
- Move the todo out of the regular todo list view
- Preserve all edit history records
- Update the updated_at timestamp

WHEN a todo is soft-deleted, THE system SHALL NOT create an edit history entry for the deletion itself.

WHEN a todo is soft-deleted, THE system SHALL still allow it to be restored.

### Access Control

WHEN a user attempts to delete a todo belonging to another user, THE system SHALL return HTTP 404 Not Found.

WHEN a user attempts to delete a non-existent todo, THE system SHALL return HTTP 404 Not Found.

## Trash Management

### Trash List Access

WHEN a user requests their trash, THE system SHALL:

- Return only todos where is_deleted = true AND user_id = authenticated user's UUID
- Return each todo with: title, created_at, deleted_at, completion_status
- Paginate results with default 20 items per page

IF the trash is empty, THE system SHALL return: "Your trash is empty."

### Todo Restoration

WHEN a user restores a todo from trash, THE system SHALL:

- Set is_deleted = false
- Set deleted_at = null
- Update the updated_at timestamp
- Return the todo to the normal todo list

IF the todo being restored does not exist, THE system SHALL return HTTP 404 Not Found.

IF the todo belongs to another user, THE system SHALL return HTTP 404 Not Found.

### Permanent Deletion

WHEN a user permanently deletes a todo from trash, THE system SHALL:

- Remove the todo record from the todos table entirely
- Remove all associated edit history records from the edit_history table
- Return confirmation message: "Todo and its history have been permanently deleted."

WHEN a todo is permanently deleted, THE system SHALL guarantee that NO TRACE of the data remains in the database.

## Filtering

### Completion Status Filters

WHEN a user applies the filter "All", THE system SHALL return todos regardless of completion status.

WHEN a user applies the filter "Complete", THE system SHALL return only todos where completion_status = true.

WHEN a user applies the filter "Incomplete", THE system SHALL return only todos where completion_status = false.

WHEN a user applies an invalid filter parameter, THE system SHALL default to "All".

WHEN a user applies any filter, THE system SHALL ensure that only todos belonging to the authenticated user are returned.

## Sorting

### Sort by Creation Date

WHEN a user sorts by creation_date ascending, THE system SHALL order todos by created_at field ascending.

WHEN a user sorts by creation_date descending, THE system SHALL order todos by created_at field descending.

### Sort by Start Date

WHEN a user sorts by start_date ascending, THE system SHALL:

- Order todos by start_date field ascending
- Place todos with null start_date at the end of the list

WHEN a user sorts by start_date descending, THE system SHALL:

- Order todos by start_date field descending
- Place todos with null start_date at the end of the list

### Sort by Due Date

WHEN a user sorts by due_date ascending, THE system SHALL:

- Order todos by due_date field ascending
- Place todos with null due_date at the end of the list

WHEN a user sorts by due_date descending, THE system SHALL:

- Order todos by due_date field descending
- Place todos with null due_date at the end of the list

### Default Sort Order

WHEN a user does not specify a sort order, THE system SHALL default to sorting by creation_date descending (newest first).

WHEN a user applies an invalid sort parameter, THE system SHALL default to creation_date descending.

## Privacy and Security Architecture

### Data Isolation Enforcement

THE system SHALL guarantee that all database queries include an explicit WHERE clause filtering by user_id = authenticated_user_id.

THE system SHALL never include a user_id or any other identity identifier from another user in any query, response, or log.

WHEN any API endpoint is accessed, THE system SHALL:

- Validate authentication token
- Extract user UUID from token
- Scope every database query to that user UUID
- Reject any request that attempts to inject external user IDs

### Query Scope Enforcement

EVERY SQL query SHALL follow this pattern:

SELECT * FROM todos WHERE user_id = ? AND [other conditions];

THE system SHALL NEVER use queries like:

SELECT * FROM todos WHERE id = ?; // without user_id constraint

IF any database query bypasses user_id filtering, THE system SHALL be considered a critical security failure and trigger an immediate system lockdown.

### Error Message Consistency

WHEN a resource does not belong to the authenticated user, THE system SHALL return HTTP 404 Not Found, NEVER HTTP 403 Forbidden.

WHEN a resource does not exist, THE system SHALL return HTTP 404 Not Found.

WHEN a resource is accessible to the user but requires authentication, THE system SHALL return HTTP 401 Unauthorized.

THE rationale is that by returning 404 instead of 403 for unauthorized access to resources belonging to others, we prevent any data leakage about whether a resource exists for other users.

### Audit Logging

SYSTEM logs SHALL record only:

- Timestamp
- HTTP method and endpoint
- HTTP status code
- User ID (for successful authenticated requests)
- Request length
- Execution time

SYSTEM logs SHALL NEVER record:

- Any todo content (title, description, dates)
- Email addresses or display names
- JWT tokens or refresh tokens
- Personal identifiers beyond user UUID
- The existence of other users

## Conclusion

This document provides a complete, implementation-ready specification for TodoApp, covering all functional requirements in EARS format with explicit business rules, validation constraints, privacy enforcement, and edge case handling.

Every requirement has been designed around the non-negotiable principle that **no user can see, access, or even detect the existence of any data belonging to another user**.

The system is designed for single-user productivity with absolute data isolation as a foundational architectural principle - not an optional layer.

Implementation must be done with 100% compliance to these specifications to ensure security, privacy, and reliability.

All subsequent phases (database design, APIs, testing) must be derived from these requirements without modification.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*