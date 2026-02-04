# TodoApp Requirements Specification

## Service Overview

THE todoApp SHALL be a private, multi-user task management system where users can create, view, edit, complete, and delete personal todos. All user data is strictly isolated and cannot be accessed by any other user under any circumstance. THE system SHALL be designed for individual productivity with no sharing, collaboration, or administrator functionality.

THE system SHALL have exactly one actor type: "user". THE system SHALL NOT include any other actors such as "admin", "guest", or "moderator".

WHEN the system starts, THE system SHALL be ready to accept user registration and authentication requests.

WHEN a user is authenticated, THE system SHALL provide access to all personal todo management features.

WHEN a user is not authenticated, THE system SHALL reject all requests except registration and login.

## User Actor Definition

THE todoApp SHALL have exactly one user actor type: "user".

THE user actor SHALL authenticate with email and password credentials.

THE user actor SHALL be the sole actor in the system with access to the todo application.

WHEN a user attempts to access any feature of the system, THE system SHALL verify that the request originates from an authenticated user account.

THE system SHALL NOT include any other actors such as "admin", "guest", or "moderator".

WHERE a user account is created, THE system SHALL automatically assign the "user" actor type.

WHILE a user account exists, THE system SHALL restrict all functionality to data owned exclusively by that user.

## Authentication Flow

WHEN a user registers with email and password, THE system SHALL create a new user account with a unique identifier and store the password as a hashed value.

WHEN a user attempts to log in with email and password, THE system SHALL validate the credentials and issue a JWT token upon successful authentication.

WHEN a user's authentication token expires, THE system SHALL require re-authentication to access protected resources.

WHEN a user changes their password, THE system SHALL validate the current password and replace the stored hash with a new one.

WHEN a user requests password reset, THE system SHALL generate a secure, time-limited reset token and send it via email.

WHEN a user uses a valid reset token to set a new password, THE system SHALL update the password hash and invalidate the token.

IF a user provides invalid credentials during login, THEN THE system SHALL reject the request and return a generic authentication failure.

IF a user tries to register with an email that already exists, THEN THE system SHALL reject the registration and return a generic conflict error.

IF a user attempts to reset a password without a valid token, THEN THE system SHALL reject the request and log the attempt for security monitoring.

## Todo Creation

WHEN a user creates a todo, THE system SHALL require a title field with at least 1 character and no more than 200 characters.

WHEN a user creates a todo, THE system SHALL allow an optional description field with a maximum of 2,000 characters.

WHEN a user creates a todo, THE system SHALL allow optional start date and due date fields in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).

WHEN a user creates a todo, THE system SHALL set completion status to false (incomplete).

WHEN a user creates a todo, THE system SHALL record the creation timestamp as the exact time of submission.

WHEN a user creates a todo with an empty title, THEN THE system SHALL reject the request with error code TODO_MISSING_TITLE.

WHEN a user creates a todo with a title longer than 200 characters, THEN THE system SHALL reject the request with error code TODO_TITLE_TOO_LONG.

WHEN a user creates a todo with an invalid date format in start date or due date, THEN THE system SHALL reject the request with error code TODO_INVALID_DATE.

WHEN a user creates a todo with a start date after the due date, THEN THE system SHALL allow it but flag it as logically inconsistent in edit history (none-user-visible).

WHERE a user submits a todo without a description, THE system SHALL store an empty string as the description.

WHERE a user submits a todo without a start date, THE system SHALL store null for the start date.

WHERE a user submits a todo without a due date, THE system SHALL store null for the due date.

## Todo Viewing

WHEN a user requests their todo list, THE system SHALL return only todos belonging to that user.

WHEN a user requests their todo list, THE system SHALL paginate results with a default page size of 20 items.

WHEN a user requests their todo list, THE system SHALL include for each todo: title, completion status, creation date, start date (if not null), due date (if not null).

WHEN a user requests a single todo, THE system SHALL return the full details including title, description, completion status, creation date, start date (if not null), due date (if not null), and last updated date.

WHEN a user requests a todo by ID that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user requests a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

## Todo Completion Toggle

WHEN a user marks a todo as complete, THE system SHALL toggle the completion status to true.

WHEN a user marks a todo as incomplete, THE system SHALL toggle the completion status to false.

WHEN a user toggles a todo's completion status, THE system SHALL update the last updated timestamp.

IF a user attempts to toggle a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

IF a user attempts to toggle a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

## Todo Editing

WHEN a user edits a todo's title, THE system SHALL validate the new title is between 1 and 200 characters.

WHEN a user edits a todo's description, THE system SHALL validate the new description is no longer than 2,000 characters.

WHEN a user edits a todo's start date, THE system SHALL validate the date is in ISO 8601 format.

WHEN a user edits a todo's due date, THE system SHALL validate the date is in ISO 8601 format.

WHEN a user edits any field of a todo, THE system SHALL create a new history entry.

WHEN a user attempts to edit a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to edit a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

WHEN a user submits an empty title during edit, THEN THE system SHALL reject the edit with error code TODO_MISSING_TITLE.

WHEN a user submits a title longer than 200 characters during edit, THEN THE system SHALL reject the edit with error code TODO_TITLE_TOO_LONG.

WHEN a user submits an invalid date format during edit, THEN THE system SHALL reject the edit with error code TODO_INVALID_DATE.

## Edit History

WHEN a todo is edited, THE system SHALL create a new history entry.

WHEN a history entry is created, THE system SHALL record the exact timestamp of the edit.

WHEN a history entry is created, THE system SHALL record the previous title value if the title was changed.

WHEN a history entry is created, THE system SHALL record the previous description value if the description was changed.

WHEN a history entry is created, THE system SHALL record the previous start date value if the start date was changed.

WHEN a history entry is created, THE system SHALL record the previous due date value if the due date was changed.

WHEN a user requests the edit history of a todo, THE system SHALL return only history entries for that todo.

WHEN a user requests the edit history of a todo, THE system SHALL sort the entries from most recent to oldest.

WHEN a user requests the edit history of a todo they do not own, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user requests the edit history of a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found.

## Todo Deletion

WHEN a user deletes a todo, THE system SHALL mark the todo as "deleted" without removing it from the database.

WHEN a todo is marked as deleted, THE system SHALL update the last updated timestamp.

WHEN a todo is marked as deleted, THE system SHALL exclude it from the default todo list view.

WHEN a user attempts to delete a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to delete a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

## Trash Management

WHEN a user requests the trash list, THE system SHALL return only todos marked as deleted that belong to that user.

WHEN a user requests the trash list, THE system SHALL paginate results with a default page size of 20 items.

WHEN a user restores a todo from trash, THE system SHALL remove the "deleted" flag.

WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo and all associated edit history records from the database permanently.

WHEN a user attempts to restore a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to permanently delete a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to restore or permanently delete a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found.

WHERE a user restores a todo that had a due date before deletion, THE system SHALL restore the original due date value.

WHERE a user permanently deletes a todo from trash, THE system SHALL guarantee the deletion is irreversible and unrecoverable.

## Filtering

WHEN a user applies a filter for "all todos", THE system SHALL return todos regardless of completion status.

WHEN a user applies a filter for "complete todos", THE system SHALL return only todos where completion status is true.

WHEN a user applies a filter for "incomplete todos", THE system SHALL return only todos where completion status is false.

WHEN a user applies a filter, THE system SHALL return only todos belonging to that user.

IF a user submits an invalid filter parameter, THEN THE system SHALL default to "all todos".

## Sorting

WHEN a user sorts by creation date (newest first), THE system SHALL order todos by creation timestamp descending.

WHEN a user sorts by creation date (oldest first), THE system SHALL order todos by creation timestamp ascending.

WHEN a user sorts by start date (earliest first), THE system SHALL order todos by start date ascending, with null values appearing last.

WHEN a user sorts by start date (latest first), THE system SHALL order todos by start date descending, with null values appearing last.

WHEN a user sorts by due date (earliest first), THE system SHALL order todos by due date ascending, with null values appearing last.

WHEN a user sorts by due date (latest first), THE system SHALL order todos by due date descending, with null values appearing last.

WHEN a user applies a sort order, THE system SHALL return only todos belonging to that user.

IF a user submits an invalid sort parameter, THEN THE system SHALL default to sorting by creation date (newest first).

## Privacy Enforcement

THE system SHALL verify that every database query includes a WHERE clause filtering by the authenticated user's ID.

WHEN a user makes any request to list, read, update, or delete a todo, THE system SHALL validate that the todo belongs to the authenticated user.

IF a user attempts to access a todo by ID that does not belong to them, THEN THE system SHALL return HTTP 404 Not Found.

IF a user attempts to make any API request that does not include a valid authentication token, THEN THE system SHALL return HTTP 401 Unauthorized.

IF a user attempts to access an endpoint with a valid token but for a different user's data, THEN THE system SHALL return HTTP 404 Not Found (never HTTP 403).

WHILE the system is processing any request, THE system SHALL NOT include any user information from a different account in the response.

THE system SHALL ensure that SQL queries are parameterized and scope-bound to the authenticated user's user_id.

THE system SHALL NEVER allow direct user_id input from client requests for data access.

WHEN a user deletes a todo from the trash, THE system SHALL permanently remove the todo and its history from the database, with no possibility of recovery.

THE system SHALL NOT allow administrators or any other actors to access user data, as no such actors exist.

THE system SHALL log all access attempts for auditing purposes, but only store user ID and timestamp — never content or personal identifiers outside of the user's own data.

## Performance Expectations

### Response Time Targets

- WHEN a user retrieves their todo list with minimal filtering, THE system SHALL return results in under 500 milliseconds for 95% of requests.
- WHEN a user opens a single todo to view details, THE system SHALL load and display information in under 300 milliseconds.
- WHEN a user toggles a todo's completion status, THE system SHALL update and return acknowledgment in under 200 milliseconds.
- WHEN a user creates a new todo, THE system SHALL respond with confirmation within 500 milliseconds.
- WHEN a user filters their todo list by completion status, THE system SHALL respond in under 500 milliseconds.
- WHEN a user sorts their todo list by any field, THE system SHALL respond in under 1 second even with 1,000 todos.
- WHEN a user permanently deletes a todo from trash, THE system SHALL complete the deletion and return confirmation in under 1 second.
- WHEN a user restores a todo from trash, THE system SHALL complete the restoration and return confirmation in under 500 milliseconds.
- WHILE a user views edit history for a todo with 50+ entries, THE system SHALL return pagination of 20 entries per request with response time under 800 milliseconds.

### System Performance Boundaries

- WHEN a user performs any write operation (creation, edit, deletion, completion toggle), THE system SHALL respond with a success or error response within 2 seconds under normal load.
- WHERE a user attempts to access another user's data, THE system SHALL respond with HTTP 403 Forbidden within 200 milliseconds, independent of whether the resource exists.
- IF the database connection is temporarily unavailable, THE system SHALL return HTTP 503 Service Unavailable within 1 second after request receipt.
- WHILE the system is in maintenance mode, THE system SHALL respond to all requests with HTTP 503 Service Unavailable within 100 milliseconds.

## User Profile Management

WHEN a user updates their display name, THE system SHALL validate that the display name is not empty and does not exceed 50 characters.

WHEN a user updates their display name, THE system SHALL store the new value and update the profile record.

WHEN a user views their own profile, THE system SHALL return the display name and account creation date.

IF a user attempts to view another user's profile, THEN THE system SHALL return HTTP 403 Forbidden.

IF a user submits a display name that is empty, THEN THE system SHALL reject the update with error code PROFILE_INVALID_NAME.

IF a user submits a display name exceeding 50 characters, THEN THE system SHALL reject the update with error code PROFILE_NAME_TOO_LONG.

WHERE a user has not set a display name, THE system SHALL default to their email address prefix (before @) for display purposes.

## Business Rules

### Profile Validation Rules

- WHEN a user sets their display name, THE system SHALL accept any non-empty string with a maximum length of 50 characters.
- WHEN a user attempts to set their display name to an empty string, THE system SHALL reject the change and return an validation error.
- WHEN a user attempts to set their display name to null or undefined, THE system SHALL retain the existing display name.
- WHERE a user has not set a display name, THE system SHALL default to their email address prefix (text before @).
- IF a user's display name contains only whitespace characters, THEN THE system SHALL treat it as empty and reject the update.
- IF a user attempts to set a display name that exceeds 50 characters, THEN THE system SHALL truncate and store only the first 50 characters, but SHALL notify the user with a warning.

### Todo Validation Rules

- WHEN a user creates a todo, THE system SHALL require a title with at least 1 character.
- WHEN a user creates a todo with an empty or null title, THEN THE system SHALL reject the creation and return a validation error.
- WHEN a user creates a todo, THE system SHALL permit the description field to be empty, null, or undefined.
- WHERE a todo has no description, THE system SHALL store it as an empty string in the database.
- WHERE a todo has no start date, THE system SHALL store it as null.
- WHERE a todo has no due date, THE system SHALL store it as null.
- IF a user attempts to create a todo with a title consisting only of whitespace, THEN THE system SHALL reject it as invalid.

### Date Handling Rules

- WHEN a user provides a start date or due date, THE system SHALL accept timestamps in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).
- WHEN a user provides a date string that cannot be parsed as a valid ISO 8601 timestamp, THEN THE system SHALL reject the request with a validation error.
- WHEN a user provides a date in a valid format but outside the range of 1900-2099, THEN THE system SHALL reject it with a validation error.
- WHERE a todo has no start date specified, THE system SHALL treat it as not set and it SHALL NOT affect sorting order (appear at the end).
- WHERE a todo has no due date specified, THE system SHALL treat it as not set and it SHALL NOT affect sorting order (appear at the end).
- IF a user attempts to set a due date that is before the start date, THEN THE system SHALL allow it (no business rule prevents this).
- WHILE a user is editing a todo, THE system SHALL preserve the original date values if unchanged.
- WHILE a user is editing a todo, THE system SHALL update date values only when new valid dates are provided.

### Edit History Rules

- WHEN a user edits a todo's title, description, start date, or due date, THE system SHALL create a new edit history entry.
- WHEN a field is unchanged during an edit, THE system SHALL NOT record a change for that field in the history.
- WHEN a field is changed during an edit, THE system SHALL record both the previous value and the new value.
- WHEN a todo is created, THE system SHALL NOT create an edit history entry.
- WHEN a user deletes a todo, THE system SHALL preserve all existing edit history entries.
- WHEN a user permanently deletes a todo from trash, THE system SHALL delete all associated edit history entries.
- WHILE a user views a todo's edit history, THE system SHALL return entries sorted from most recent to oldest.
- WHERE an edit history entry exists, THE system SHALL ensure it is immutable (no updates or deletions of individual entries allowed).

### Trash Deletion Rules

- WHEN a user deletes a todo, THE system SHALL NOT physically remove it from the database.
- WHEN a todo is marked as deleted, THE system SHALL set its 'deletedAt' field to the current timestamp.
- WHILE a todo's 'deletedAt' field is not null, THE system SHALL exclude it from all normal todo lists.
- WHEN a user restores a todo from trash, THE system SHALL set 'deletedAt' to null, making it visible again.
- WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo and all associated edit history records from the database entirely.
- IF a user attempts to restore a todo that has already been permanently deleted, THEN THE system SHALL return an error indicating the resource no longer exists.
- WHERE a todo's 'deletedAt' field is null, THE system SHALL treat it as active and include it in normal todo lists.

### Privacy Rules

- WHEN any database query is executed, THE system SHALL automatically scope all queries by the authenticated user's ID.
- WHERE a user makes a request to view todos, THE system SHALL only return todos where 'userId' equals the authenticated user's ID.
- WHERE a user attempts to access a todo by ID that belongs to another user, THE system SHALL return a 404 Not Found error (never 403).
- WHILE any user is logged in, THE system SHALL ensure no data from other users is accessible through any API endpoint.
- IF a user attempts to access the edit history of a todo belonging to another user, THEN THE system SHALL return a 404 Not Found error.
- IF a user attempts to permanently delete a todo that belongs to another user, THEN THE system SHALL return a 404 Not Found error.
- IF any system audit log records user activity, THE system SHALL NEVER include user identifiers from other accounts.
- IF any error message is returned, THE system SHALL NOT reveal whether a todo exists for another user under any circumstances.

## Technical Implementation Counter-Requirements

THE system SHALL NOT use a shared database table for todos without user_id scope.

THE system SHALL NOT allow any API endpoint to accept user_id as a parameter for data access.

THE system SHALL NOT expose any API to list users, query user counts, or retrieve user metadata.

THE system SHALL NOT include any service accounts, administrative interfaces, or our-of-band data access mechanisms.

THE system SHALL NOT allow caching of any user-specific data in a way that can be accessed by another user.

THE system SHALL NOT allow direct SQL queries to be executed by user input.

THE system SHALL NOT implement soft deletion via a boolean "active" flag without immutable "deletedAt" timestamp.

THE system SHALL NOT permit restoring trashed todos after they have been permanently deleted.

THE system SHALL NOT implement email verification or account confirmation.

THE system SHALL NOT support email notifications or reminders.

THE system SHALL NOT support file attachments or rich text.

THE system SHALL NOT support collaboration, sharing, or team features.