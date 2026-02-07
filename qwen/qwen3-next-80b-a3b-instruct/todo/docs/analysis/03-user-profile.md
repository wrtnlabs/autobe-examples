# Multi-User Todo Application Requirements

## User Account Management

### Account Registration

WHEN a user submits an email and password for registration, THE system SHALL create a new user account.

WHEN the submitted email is already registered, THE system SHALL reject the registration request and return HTTP 409 Conflict with error code ACCOUNT_EXISTS.

WHEN the submitted email does not conform to a valid email format, THE system SHALL reject the registration request and return HTTP 400 Bad Request with error code INVALID_EMAIL.

WHEN the submitted password is less than 8 characters, THE system SHALL reject the registration request and return HTTP 400 Bad Request with error code WEAK_PASSWORD.

WHEN the registration is successful, THE system SHALL generate a unique user ID and create a default user profile with the display name initialized to the local part of the email address (before the @ symbol).

WHEN a new account is created, THE system SHALL send an email verification notification to the provided email address.

### Account Authentication

WHEN a user submits login credentials (email and password), THE system SHALL authenticate the user.

WHEN the email is not registered, THE system SHALL reject the authentication attempt and return HTTP 401 Unauthorized with error code INVALID_CREDENTIALS.

WHEN the password does not match the stored hash, THE system SHALL reject the authentication attempt and return HTTP 401 Unauthorized with error code INVALID_CREDENTIALS.

WHEN authentication succeeds, THE system SHALL return a JWT access token with a 15-minute expiration and a refresh token with a 7-day expiration.

WHEN a user attempts to access any protected endpoint without a valid JWT, THE system SHALL return HTTP 401 Unauthorized with error code MISSING_TOKEN.

WHEN a JWT token has expired, THE system SHALL return HTTP 401 Unauthorized with error code TOKEN_EXPIRED.

WHEN a user attempts to refresh an expired refresh token, THE system SHALL return HTTP 401 Unauthorized with error code REFRESH_TOKEN_EXPIRED.

### Password Change

WHEN a user requests a password change, THE system SHALL validate the current password.

WHEN the current password is incorrect, THE system SHALL reject the request and return HTTP 401 Unauthorized with error code WRONG_CURRENT_PASSWORD.

WHEN the new password is less than 8 characters, THE system SHALL reject the request and return HTTP 400 Bad Request with error code WEAK_PASSWORD.

WHEN the new password matches the current password, THE system SHALL reject the request and return HTTP 400 Bad Request with error code PASSWORD_SAME_AS_CURRENT.

WHEN the password change is successful, THE system SHALL invalidate all existing sessions for that user.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL require re-authentication with the current password.

WHEN the re-authentication fails, THE system SHALL reject the deletion request and return HTTP 401 Unauthorized with error code INVALID_CREDENTIALS.

WHEN account deletion is confirmed, THE system SHALL perform a cascading deletion of all data associated with the user:
- All todos (including those marked complete or incomplete)
- All edit history entries for those todos
- All trash items belonging to the user
- The user profile itself

WHEN the deletion process is complete, THE system SHALL immediately invalidate all active sessions for the user.

WHEN the account is deleted, THE system SHALL return HTTP 204 No Content and make no further data accessible for that user ID.

## User Profile Management

### Profile Creation

WHEN a user successfully registers with email and password, THE system SHALL create a default profile with:
- A display name initialized to the user's email address (before the @ symbol)
- No additional profile fields populated
- Creation timestamp recorded
- No profile data shared with other users

WHILE a profile exists, THE system SHALL ensure the user's display name is never automatically overwritten unless explicitly edited by the user.

### Display Name Edit

WHEN a user submits a new display name, THE system SHALL update the profile display name.

THE user SHALL be allowed to edit their display name at any time after account creation.

IF the submitted display name is empty, THE system SHALL reject the update and return validation error with error code PROFILE_INVALID_DISPLAY_NAME.

IF the submitted display name exceeds 100 characters, THE system SHALL reject the update and return validation error with error code PROFILE_INVALID_DISPLAY_NAME.

IF the submitted display name contains only whitespace characters, THE system SHALL reject the update and return validation error with error code PROFILE_INVALID_DISPLAY_NAME.

WHEN a display name is successfully updated, THE system SHALL record the edit in the user's audit log with:
- Timestamp of change
- Original display name value
- New display name value

WHILE a profile is active, THE system SHALL prevent any automatic or system-generated display name changes unless initiated by the user themselves.

### Privacy Enforcement

THE TodoApp SHALL ensure that user profile information, including display name, is never visible to any other user.

WHEN any endpoint is accessed, THE system SHALL enforce strict data isolation such that:
- No profile data from one user can be retrieved by another user
- No API response includes profile information belonging to users other than the authenticated requester
- No search, filter, or listing function returns profile information beyond the requester's own data

IF any request attempts to access another user's profile data, THE system SHALL return HTTP 403 Forbidden without revealing that the requested resource exists.

WHERE profile data is stored, THE system SHALL ensure that data isolation is enforced at the database query layer, not merely at the application layer.

### Data Accessibility

WHEN a user requests their own profile, THE system SHALL return a response containing:
- User ID (internal, immutable)
- Display name (editable)
- Account creation timestamp
- Last profile update timestamp

THE user SHALL be able to view their profile information at any time through their account settings interface.

WHEN a profile is requested, THE system SHALL NOT return email address, password hash, or any authentication credentials.

THE system SHALL return profile data only to the authenticated user matching the requested user ID.

### Input Validation Rules

WHEN a display name is submitted for update, THE system SHALL validate:
- The input is not null
- The input is a non-empty string
- The input contains at least one non-whitespace character
- The input length is between 1 and 100 characters inclusive
- The input does not contain forbidden characters: <, >, &, ", ', \, /, *, ?, |, :, 

IF validation fails, THE system SHALL return HTTP 400 Bad Request with error code PROFILE_INVALID_DISPLAY_NAME and a user-friendly message that does not reveal system implementation details.

THE system SHALL NOT allow the display name to ever be set to an empty string, null, or default value that matches another user's display name.

WHEN a display name is submitted, THE system SHALL trim leading and trailing whitespace before validation.

THE system SHALL maintain case sensitivity in display names to preserve user intent.

## Todo Creation

### Todo Creation Process

WHEN a user creates a new todo, THE system SHALL accept:
- Title (required field, minimum 1 character, maximum 255 characters)
- Description (optional field, maximum 5,000 characters)
- Start date (optional field, ISO 8601 date format)
- Due date (optional field, ISO 8601 date format)

WHEN the title is empty or contains only whitespace, THE system SHALL reject the creation request and return HTTP 400 Bad Request with error code TODO_INVALID_TITLE.

WHEN the title exceeds 255 characters, THE system SHALL reject the creation request and return HTTP 400 Bad Request with error code TODO_INVALID_TITLE.

WHEN the description exceeds 5,000 characters, THE system SHALL reject the creation request and return HTTP 400 Bad Request with error code TODO_INVALID_DESCRIPTION.

WHEN the start date is provided but is not a valid ISO 8601 date format, THE system SHALL reject the request and return HTTP 400 Bad Request with error code TODO_INVALID_START_DATE.

WHEN the due date is provided but is not a valid ISO 8601 date format, THE system SHALL reject the request and return HTTP 400 Bad Request with error code TODO_INVALID_DUE_DATE.

WHEN the due date is provided and is earlier than the start date, THE system SHALL reject the request and return HTTP 400 Bad Request with error code TODO_DUE_BEFORE_START.

WHEN todo creation succeeds, THE system SHALL:
- Assign a unique todo ID
- Set completion status to false (incomplete by default)
- Set creation timestamp to current time
- Set last updated timestamp to current time
- Create an initial edit history entry recording the creation
- Return HTTP 201 Created with the created todo object

## Todo Viewing

### List Retrieval Process

WHEN a user requests their todo list, THE system SHALL retrieve only todos belonging to the authenticated user.

THE system SHALL support pagination with:
- page: integer (default 1, minimum 1)
- pageSize: integer (default 10, minimum 1, maximum 50)

WHEN page or pageSize are invalid (non-integer, below minimum, above maximum), THE system SHALL use defaults and return HTTP 400 Bad Request with warning in response header.

THE system SHALL return the total count of todos matching the user's filters in the response header X-Total-Count.

### Response Structure

WHEN the todo list is returned, each todo shall include:
- id: unique identifier
- title: string
- completed: boolean
- startDate: ISO 8601 date string or null
- dueDate: ISO 8601 date string or null
- createdAt: ISO 8601 datetime string
- updatedAt: ISO 8601 datetime string

### Single Todo Retrieval

WHEN a user requests a specific todo by ID, THE system SHALL verify that the todo belongs to the authenticated user.

WHEN the todo does not exist or does not belong to the user, THE system SHALL return HTTP 404 Not Found without distinguishing between "not found" and "access denied."

WHEN the todo is found, THE system SHALL return all its properties including:
- id
- title
- description
- completed
- startDate
- dueDate
- createdAt
- updatedAt
- deleted (boolean - indicates status for soft delete)

## Todo Completion Status

### Toggle Mechanism

WHEN a user toggles a todo's completion status, THE system SHALL:
- Flip the completed field from true to false or false to true
- Update the updatedAt timestamp
- Record an entry in the edit history for this change

WHEN a todo is toggled to complete, THE system SHALL NOT automatically set or modify startDate or dueDate.

WHEN a todo is toggled to incomplete, THE system SHALL NOT automatically reset any dates.

THE system SHALL ensure the toggle operation is atomic and not subject to race conditions.

WHEN a user attempts to toggle a todo they do not own, THE system SHALL return HTTP 404 Not Found.

### Edit History - Completion Toggle

WHEN a todo is toggled, THE system SHALL create an edit history entry containing:
- timestamp: ISO 8601 datetime
- fieldChanges: object with:
  - completed: object with:
    - old: previous value (true/false)
    - new: new value (true/false)

## Todo Editing

### Editable Fields

WHEN a user edits a todo, THE system SHALL allow modification of:
- title
- description
- startDate
- dueDate

THE system SHALL NOT permit modification of:
- id
- createdAt
- deleted
- completed (use toggle endpoint instead)

### Edit Submission Process

WHEN a user submits an edit, THE system SHALL validate:
- Title constraints (1-255 characters)
- Description constraints (maximum 5,000 characters)
- Date format validity (ISO 8601)
- Due date after or equal to start date

WHEN any validation fails, THE system SHALL return the appropriate HTTP 400 error code.

WHEN the edit is valid, THE system SHALL:
- Update the todo with new values
- Increment the updatedAt timestamp
- Create a new edit history entry
- Return HTTP 200 OK with the updated todo

### History Entry Creation

WHEN any field is successfully edited, THE system SHALL create a new edit history entry with:
- timestamp: ISO 8601 date-time of the edit
- fieldChanges: object containing:
  - title: {old: "string", new: "string"} (if changed)
  - description: {old: "string", new: "string"} (if changed)
  - startDate: {old: "date or null", new: "date or null"} (if changed)
  - dueDate: {old: "date or null", new: "date or null"} (if changed)

WHEN a field was not changed in the update, THE system SHALL NOT include it in the fieldChanges object.

WHEN a field was changed from null to a value, THE system SHALL record {old: null, new: "value"}.

WHEN a field was changed from a value to null, THE system SHALL record {old: "value", new: null}.

### Field Change Detection

THE system SHALL compare the submitted values against the current database state to determine which fields have changed.

THE system SHALL NOT create history entries for unchanged fields, even if included in the update request.

THE system SHALL handle null values in submitted data as explicit clearing of the field.

### History Versioning

THE system SHALL store a complete snapshot of each edit as a separate history record.

The edit history SHALL be ordered chronologically, with the most recent edit at the beginning of the list.

### History Access Control

WHEN a user attempts to view edit history for a todo, THE system SHALL verify that the todo belongs to the authenticated user.

WHEN the todo does not belong to the requester, THE system SHALL return HTTP 404 Not Found.

## Edit History

### History Data Structure

Each edit history record SHALL contain:
- id: unique identifier for the history entry
- todoId: reference to the todo this edit belongs to
- timestamp: ISO 8601 datetime string
- fieldChanges: object with optional fields (title, description, startDate, dueDate)
- fieldChanges.title: {old: string, new: string} (if changed)
- fieldChanges.description: {old: string, new: string} (if changed)
- fieldChanges.startDate: {old: string or null, new: string or null} (if changed)
- fieldChanges.dueDate: {old: string or null, new: string or null} (if changed)

### History Viewing

WHEN a user requests the edit history of their todo, THE system SHALL return the complete history ordered from most recent to oldest.

THE system SHALL support pagination of edit history with:
- page: integer (default 1)
- pageSize: integer (default 20, maximum 50)

THE system SHALL return total count of history entries in X-Total-Count header.

WHEN a user requests history for a todo they do not own, THE system SHALL return HTTP 404 Not Found.

## Todo Deletion

### Soft Delete Process

WHEN a user deletes a todo, THE system SHALL not remove it from the database.

WHEN a todo is deleted, THE system SHALL:
- Set the deleted flag to true
- Update the updatedAt timestamp
- Record an edit history entry of type "deleted" with fieldChanges set to {deleted: {old: false, new: true}}
- Remove the todo from appearing in the normal todo list

WHEN a todo is deleted, THE system SHALL maintain all associated edit history entries.

WHEN a user attempts to delete a todo they do not own, THE system SHALL return HTTP 404 Not Found.

## Trash Management

### Trash View Interface

WHEN a user views their trash, THE system SHALL retrieve all todos where deleted = true and todo.ownerId = authenticatedUserId.

THE system SHALL support pagination with page and pageSize parameters as in normal todo list.

THE system SHALL return the same todo structure as the normal list, but with deleted: true.

### Restoration Process

WHEN a user requests to restore a todo from trash, THE system SHALL:
- Set the deleted flag to false
- Update the updatedAt timestamp
- Record an edit history entry with {deleted: {old: true, new: false}}

WHEN restoration succeeds, THE system SHALL return HTTP 200 OK with the restored todo object.

WHEN the todo already exists in the main list (deleted=false), THE system SHALL still allow restoration and the todo will be moved back to the normal list.

### Permanent Deletion

WHEN a user requests to permanently delete a todo from trash, THE system SHALL:
- Delete the todo record entirely
- Delete all associated edit history records
- Return HTTP 204 No Content

WHEN a todo is permanently deleted, it SHALL be unrecoverable.

WHEN a user attempts to permanently delete a todo they do not own, THE system SHALL return HTTP 404 Not Found.

### Purge Requirements

THE system SHALL allow the user to purge all trash items in a single operation.

WHEN a purge is requested, THE system SHALL:
- Delete all todos where deleted = true AND ownerId = authenticatedUserId
- Delete all associated edit history records for those todos
- Return HTTP 204 No Content

## Filtering

### Status Filters

WHEN a user applies a completion status filter, THE system SHALL modify the query to include one of the following WHERE conditions:

- All todos: no filter applied
- Only complete: completed = true
- Only incomplete: completed = false

WHEN the filter parameter value is invalid (not "all", "complete", or "incomplete"), THE system SHALL default to "all" and return HTTP 400 Bad Request with warning.

## Sorting

### Sorting Fields

THE system SHALL support sorting by:
- createdAt: creation timestamp
- startDate: start date
- dueDate: due date

Each field SHALL allow ascending (asc) or descending (desc) order.

### Default Sort Order

WHEN no sort parameter is specified, THE system SHALL default to sorting by createdAt in descending order (newest first).

### Missing Date Handling

WHEN sorting by startDate:
- Todos with startDate = null SHALL appear after todos with startDate not null
- Among todos with null startDate, SHALL be sorted by createdAt descending

WHEN sorting by dueDate:
- Todos with dueDate = null SHALL appear after todos with dueDate not null
- Among todos with null dueDate, SHALL be sorted by createdAt descending

### Sort Priority

WHEN multiple sort fields are provided (comma-delimited), THE system SHALL apply them in order of precedence:

Example: sort=startDate,createdAt (sort by startDate first, then by createdAt as tiebreaker)

### Combined Filters

WHEN both filtering and sorting are applied, THE system SHALL apply filters first, then perform sorting on the filtered result set.

## Privacy and Data Isolation

### Data Isolation Enforcement

THE entire system SHALL enforce strict ownership-based data isolation.

WHEN any operation is performed (reading, writing, editing, deleting), THE system SHALL verify that:
- Todo.id belongs to authenticated user
- Profile.ownerId matches authenticated user
- EditHistory.todoId belongs to authenticated user

WHEN any request attempts to access a resource that does not belong to the authenticated user, THE system SHALL return HTTP 404 Not Found regardless of whether the resource exists or not.

WHEN an API endpoint receives a resource identifier (e.g., todoId, profileId), THE system SHALL not use it directly in database queries without joining to user ownership tables.

### User Access Control

THE system SHALL implement the following permission matrix:

| Operation | Public Access | Authenticated User | Admin |
|-----------|---------------|-------------------|-------|
| Sign up | Allowed | Not Allowed | Not Allowed |
| Log in | Allowed | Not Allowed | Not Allowed |
| Create todo | Not Allowed | Allowed | Allowed |
| View todo list | Not Allowed | Allowed | Allowed |
| View single todo | Not Allowed | Allowed | Allowed |
| Toggle todo | Not Allowed | Allowed | Allowed |
| Edit todo | Not Allowed | Allowed | Allowed |
| Delete todo | Not Allowed | Allowed | Allowed |
| View trash | Not Allowed | Allowed | Allowed |
| Restore todo | Not Allowed | Allowed | Allowed |
| Permanently delete todo | Not Allowed | Allowed | Allowed |
| Delete account | Not Allowed | Allowed | Allowed |
| View profile | Not Allowed | Allowed | Allowed |
| Edit profile | Not Allowed | Allowed | Allowed |

**Note**: There is no "admin" role implemented - all authenticated users have identical privileges. The admin column is included for consistency.

### Authentication Requirements

WHEN a user accesses any endpoint that modifies or reads user-specific data, THE system SHALL validate:
- Valid and non-expired JWT access token
- User ID in JWT payload matches the requested resource owner

THE system SHALL include user ID in JWT payload as "userId" claim.

THE system SHALL use HMAC-SHA256 algorithm with a secret key of at least 256 bits.

THE system SHALL rotate refresh token on each successful refresh, invalidating the previous one.

THE system SHALL store refresh token hash in database (never plaintext) with expiration.

## System-Wide Data Integrity

WHEN any operation creates, modifies, or deletes data, THE system SHALL ensure referential integrity:
- Edit history records always reference existing todos
- Todo records always reference existing users
- No orphaned records remain after deletions

WHEN a user is deleted, THE system SHALL delete all associated todo records and edit history records in a single transaction.

WHEN a todo is permanently deleted, THE system SHALL delete all associated edit history records in a single transaction.

THE system SHALL use database-level foreign key constraints with ON DELETE CASCADE where applicable.

THE system SHALL ensure that all database operations are wrapped in transactions when they affect multiple tables.

## Error Handling

THE system SHALL return standard HTTP status codes with machine-readable error codes in response body:

- 400 Bad Request: Invalid input format
- 401 Unauthorized: Invalid or missing authentication
- 403 Forbidden: Access denied (never returned - use 404 instead for privacy)
- 404 Not Found: Resource not found or access denied
- 409 Conflict: Duplicate resource
- 500 Internal Server Error: Unexpected system failure

THE system SHALL NEVER return database errors, stack traces, or internal system information to clients.

THE system SHALL return the same "Not Found" response for non-existent resources and unauthorized access attempts.

ALL error responses SHALL be structured as:

{
  "error": "machine-readable code",
  "message": "human-readable explanation"
}

The "error" field shall always be a valid error code from the specification above.

## Implementation Notes

These requirements constitute a complete specification for the backend implementation of the multi-user Todo application.

All business logic, workflows, authentication flows, and data constraints are defined above in natural language using the EARS format.

No database schemas, API endpoints, or DTO structures are specified here - these will be generated in subsequent pipeline phases.

All content is implementation-ready for database modeling and service implementation.