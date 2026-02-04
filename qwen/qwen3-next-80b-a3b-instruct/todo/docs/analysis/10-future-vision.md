# todoApp: Multi-User Todo Application Specification

## User Actor Definition

THE todoApp SHALL have exactly one user actor type: "user".

THE user actor SHALL authenticate with email and password credentials.

THE user actor SHALL be the sole actor in the system with access to the todo application.

WHEN a user attempts to access any feature of the system, THE system SHALL verify that the request originates from an authenticated user account.

THE system SHALL NOT include any other actors such as "admin", "guest", or "moderator".

WHERE a user account is created, THE system SHALL automatically assign the "user" actor type.

WHILE a user account exists, THE system SHALL restrict all functionality to data owned exclusively by that user.

## Authentication Flow Requirements

WHEN a user attempts to register, THE system SHALL require a valid email address and a password of at least 8 characters.

WHEN a user submits a registration request, THE system SHALL verify that the email address is not already registered to another user.

WHEN registration is successful, THE system SHALL create a new user record with the provided email and hashed password.

WHEN a user attempts to log in, THE system SHALL authenticate using the provided email and password combination.

WHEN authentication fails due to invalid credentials, THE system SHALL return an authentication error without revealing whether the email existed.

WHEN a user successfully authenticates, THE system SHALL issue a JWT access token with a 15-minute expiration.

WHEN authentication succeeds, THE system SHALL also issue a refresh token with a 30-day expiration.

WHEN a user logs out, THE system SHALL invalidate the current access token and refresh token.

WHEN a JWT access token expires, THE system SHALL allow the user to exchange a valid refresh token for a new access token.

WHEN a refresh token is used to obtain a new access token, THE system SHALL issue a new refresh token with a 30-day expiration and invalidate the previous refresh token.

WHEN a user changes their password, THE system SHALL immediately revoke all active refresh tokens associated with their account.

WHEN a user deletes their account, THE system SHALL immediately revoke all active tokens associated with that account.

## JWT Token Structure

THE JWT access token SHALL contain the following payload:

- "sub": the user's unique identifier (UUID)
- "email": the user's email address (for identification purposes)
- "actor": the string literal "user"
- "iat": the issue timestamp (UNIX epoch)
- "exp": the expiration timestamp (UNIX epoch, 15 minutes after issue)

THE JWT refresh token SHALL contain the following payload:

- "sub": the user's unique identifier (UUID)
- "email": the user's email address (for identification purposes)
- "actor": the string literal "user"
- "iat": the issue timestamp (UNIX epoch)
- "exp": the expiration timestamp (UNIX epoch, 30 days after issue)

THE system SHALL use HS256 algorithm for token signing with a server-side secret key.

THE system SHALL store refresh tokens in the database with a hashed representation for security.

WHEN a refresh token is presented, THE system SHALL verify its hash against the stored value and validate expiration.

## Permission Matrix

| Action | User |
|--------|------|
| Register new account | ✅ |
| Log in to account | ✅ |
| Log out of account | ✅ |
| Change password | ✅ |
| Delete account | ✅ |
| View own profile | ✅ |
| Edit own display name | ✅ |
| Create todo | ✅ |
| View own todos | ✅ |
| View single own todo | ✅ |
| Mark todo as complete | ✅ |
| Mark todo as incomplete | ✅ |
| Edit own todo | ✅ |
| View edit history of own todo | ✅ |
| Delete own todo | ✅ |
| View trash of own deleted todos | ✅ |
| Restore todo from trash | ✅ |
| Permanently delete todo from trash | ✅ |
| Filter own todo list by completion status | ✅ |
| Sort own todo list by creation date | ✅ |
| Sort own todo list by start date | ✅ |
| Sort own todo list by due date | ✅ |
| View other user's profile | ❌ |
| View other user's todos | ❌ |
| Create todo for other user | ❌ |
| Edit other user's todo | ❌ |
| Delete other user's todo | ❌ |
| Access other user's api endpoint | ❌ |
| Query system for other users | ❌ |

## Account Lifecycle

WHEN a user registers, THE system SHALL create a new user record and associate it with an empty profile (display name defaults to email prefix).

WHEN a user changes their display name, THE system SHALL update the profile display_name field.

WHEN a user changes their password, THE system SHALL hash the new password and replace the old one.

WHEN a user initiates account deletion, THE system SHALL begin a soft delete process for all associated todos.

WHEN account deletion is confirmed, THE system SHALL:
- Soft delete all todos owned by the user (set is_deleted = true)
- Soft delete all edit history records associated with those todos
- Mark the user account as "deleted" in the database
- Immediately revoke all active authentication tokens
- Store the deletion timestamp

WHEN a user attempts to log in after account deletion, THE system SHALL return "User account does not exist or has been deleted".

WHEN a user attempts to access any resource after account deletion, THE system SHALL return "Access denied: account has been deleted".

WHEN a user attempts to register with an email previously associated with a deleted account, THE system SHALL allow registration and create a new account (reusing the email address).

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

## Functional Requirements

### User Authentication

WHEN a user registers with email and password, THE system SHALL create a new user account with a unique identifier and store the password as a hashed value.

WHEN a user attempts to log in with email and password, THE system SHALL validate the credentials and issue a JWT token upon successful authentication.

WHEN a user's authentication token expires, THE system SHALL require re-authentication to access protected resources.

WHEN a user changes their password, THE system SHALL validate the current password and replace the stored hash with a new one.

WHEN a user requests password reset, THE system SHALL generate a secure, time-limited reset token and send it via email.

WHEN a user uses a valid reset token to set a new password, THE system SHALL update the password hash and invalidate the token.

IF a user provides invalid credentials during login, THEN THE system SHALL reject the request and return a generic authentication failure.

IF a user tries to register with an email that already exists, THEN THE system SHALL reject the registration and return a generic conflict error.

IF a user attempts to reset a password without a valid token, THEN THE system SHALL reject the request and log the attempt for security monitoring.

### User Profile Management

WHEN a user updates their display name, THE system SHALL validate that the display name is not empty and does not exceed 50 characters.

WHEN a user updates their display name, THE system SHALL store the new value and update the profile record.

WHEN a user views their own profile, THE system SHALL return the display name and account creation date.

IF a user attempts to view another user's profile, THEN THE system SHALL return HTTP 403 Forbidden.

IF a user submits a display name that is empty, THEN THE system SHALL reject the update with error code PROFILE_INVALID_NAME.

IF a user submits a display name exceeding 50 characters, THEN THE system SHALL reject the update with error code PROFILE_NAME_TOO_LONG.

WHERE a user has not set a display name, THE system SHALL default to their email address prefix (before @) for display purposes.

### Todo Creation

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

### Todo Viewing

WHEN a user requests their todo list, THE system SHALL return only todos belonging to that user.

WHEN a user requests their todo list, THE system SHALL paginate results with a default page size of 20 items.

WHEN a user requests their todo list, THE system SHALL include for each todo: title, completion status, creation date, start date (if not null), due date (if not null).

WHEN a user requests a single todo, THE system SHALL return the full details including title, description, completion status, creation date, start date (if not null), due date (if not null), and last updated date.

WHEN a user requests a todo by ID that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user requests a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

### Todo Completion Toggle

WHEN a user marks a todo as complete, THE system SHALL toggle the completion status to true.

WHEN a user marks a todo as incomplete, THE system SHALL toggle the completion status to false.

WHEN a user toggles a todo's completion status, THE system SHALL update the last updated timestamp.

IF a user attempts to toggle a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

IF a user attempts to toggle a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

### Todo Editing

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

### Edit History

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

### Todo Deletion

WHEN a user deletes a todo, THE system SHALL mark the todo as "deleted" without removing it from the database.

WHEN a todo is marked as deleted, THE system SHALL update the last updated timestamp.

WHEN a todo is marked as deleted, THE system SHALL exclude it from the default todo list view.

WHEN a user attempts to delete a todo that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to delete a todo that does not exist, THEN THE system SHALL return HTTP 404 Not Found.

### Trash Management

WHEN a user requests the trash list, THE system SHALL return only todos marked as deleted that belong to that user.

WHEN a user requests the trash list, THE system SHALL paginate results with a default page size of 20 items.

WHEN a user restores a todo from trash, THE system SHALL remove the "deleted" flag.

WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo and all associated edit history records from the database permanently.

WHEN a user attempts to restore a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to permanently delete a todo from trash that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to restore or permanently delete a non-existent todo, THEN THE system SHALL return HTTP 404 Not Found.

WHERE a user restores a todo that had a due date before deletion, THE system SHALL restore the original due date value.

WHERE a user permanently deletes a todo from trash, THE system SHALL guarantee the deletion is irreversible and unrecoverable.

### Filtering

WHEN a user applies a filter for "all todos", THE system SHALL return todos regardless of completion status.

WHEN a user applies a filter for "complete todos", THE system SHALL return only todos where completion status is true.

WHEN a user applies a filter for "incomplete todos", THE system SHALL return only todos where completion status is false.

WHEN a user applies a filter, THE system SHALL return only todos belonging to that user.

IF a user submits an invalid filter parameter, THEN THE system SHALL default to "all todos".

### Sorting

WHEN a user sorts by creation date (newest first), THE system SHALL order todos by creation timestamp descending.

WHEN a user sorts by creation date (oldest first), THE system SHALL order todos by creation timestamp ascending.

WHEN a user sorts by start date (earliest first), THE system SHALL order todos by start date ascending, with null values appearing last.

WHEN a user sorts by start date (latest first), THE system SHALL order todos by start date descending, with null values appearing last.

WHEN a user sorts by due date (earliest first), THE system SHALL order todos by due date ascending, with null values appearing last.

WHEN a user sorts by due date (latest first), THE system SHALL order todos by due date descending, with null values appearing last.

WHEN a user applies a sort order, THE system SHALL return only todos belonging to that user.

IF a user submits an invalid sort parameter, THEN THE system SHALL default to sorting by creation date (newest first).

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
- WHEN a user empties their trash or permanently deletes a todo from trash, THE system SHALL remove the todo and all associated edit history records from the database entirely.
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

### Performance Expectations

- WHEN a user retrieves their todo list with minimal filtering, THE system SHALL return results in under 500 milliseconds for 95% of requests.
- WHEN a user opens a single todo to view details, THE system SHALL load and display information in under 300 milliseconds.
- WHEN a user toggles a todo's completion status, THE system SHALL update and return acknowledgment in under 200 milliseconds.
- WHEN a user creates a new todo, THE system SHALL respond with confirmation within 500 milliseconds.
- WHEN a user filters their todo list by completion status, THE system SHALL respond in under 500 milliseconds.
- WHEN a user sorts their todo list by any field, THE system SHALL respond in under 1 second even with 1,000 todos.
- WHEN a user permanently deletes a todo from trash, THE system SHALL complete the deletion and return confirmation in under 1 second.
- WHEN a user restores a todo from trash, THE system SHALL complete the restoration and return confirmation in under 500 milliseconds.
- WHILE a user views edit history for a todo with 50+ entries, THE system SHALL return pagination of 20 entries per request with response time under 800 milliseconds.

## User Flows

### User Registration and Login Flow

WHEN a new user visits the application, THE system SHALL display a registration form with fields for email and password.

WHEN the user submits a registration form, THE system SHALL validate:
- The email is provided and contains a valid format
- The password is at least 8 characters long
- The email is not already registered in the system

IF the validation fails, THEN THE system SHALL display a clear error message indicating which field failed validation.

WHEN validation passes, THE system SHALL create a new user account with a unique identifier, store the email and hashed password, and send a confirmation email to the provided email address.

WHEN the user receives the confirmation email, THE system SHALL allow the user to activate their account by clicking the unique activation link.

WHEN the account is activated, THE system SHALL update the user's status to "active" and allow login.

WHEN a registered user attempts to log in, THE system SHALL require email and password.

WHEN the user submits login credentials, THE system SHALL validate:
- The email exists in the system
- The provided password matches the stored hash

IF the email is not found, THEN THE system SHALL display "Invalid email or password."
IF the password is incorrect, THEN THE system SHALL display "Invalid email or password."

WHEN credentials are valid, THE system SHALL generate a JWT access token with userId and role ("user") in payload, store a refresh token in httpOnly cookie, and redirect the user to their dashboard.

WHILE a user is logged in, THE system SHALL maintain their authenticated session using the JWT and refresh token mechanism.

IF the JWT access token expires, THEN THE system SHALL automatically use the refresh token to obtain a new access token without requiring user re-login.
IF the refresh token is invalid or expired, THEN THE system SHALL log the user out and redirect to the login page with message "Session expired. Please log in again."

### Todo Creation Flow

WHEN a user is logged in and views their dashboard, THE system SHALL display a "New Todo" button.

WHEN the user clicks the "New Todo" button, THE system SHALL display a modal form with fields for title (required), description (optional), start date (optional), and due date (optional).

WHEN the user submits the form, THE system SHALL validate:
- Title field is not empty
- If start date is provided, it is a valid ISO 8601 date
- If due date is provided, it is a valid ISO 8601 date
- If both start and due dates are provided, due date is not earlier than start date

IF the title is empty, THEN THE system SHALL display "Title is required."
IF the start date is invalid, THEN THE system SHALL display "Start date must be a valid date."
IF the due date is invalid, THEN THE system SHALL display "Due date must be a valid date."
IF the due date is earlier than start date, THEN THE system SHALL display "Due date cannot be earlier than start date."

WHEN all validation passes, THE system SHALL create a new todo item with:
- A unique identifier
- The provided title, description, start date, and due date
- A status of "incomplete"
- Creation timestamp
- User ID linked to the currently authenticated user

WHEN the todo is successfully created, THE system SHALL add it to the top of the todo list and clear the form.

### Todo Edit Flow

WHEN a user views their todo list, THE system SHALL display an "Edit" button for each todo.

WHEN the user clicks the "Edit" button, THE system SHALL display the same modal form as in Todo Creation Flow, pre-filled with the todo's current values.

WHEN the user modifies any field and submits, THE system SHALL validate:
- Title field is not empty
- If start date is provided, it is a valid ISO 8601 date
- If due date is provided, it is a valid ISO 8601 date
- If both start and due dates are provided, due date is not earlier than start date

IF validation fails, THEN THE system SHALL display the appropriate error message as described in Todo Creation Flow.

WHEN validation passes, THE system SHALL:
- Update the todo with the new values
- Create a new entry in the edit history with:
  - Timestamp of the edit
  - The previous title (if changed)
  - The previous description (if changed)
  - The previous start date (if changed)
  - The previous due date (if changed)

WHEN the edit is successfully saved, THE system SHALL update the todo display with new values and hide the edit form.

### Todo Deletion and Restore Flow

WHEN a user views their todo list, THE system SHALL display a "Delete" button for each todo.

WHEN the user clicks "Delete" and confirms the action, THE system SHALL:
- NOT permanently delete the todo from the database
- Update the todo's status to "deleted"
- Hide the todo from the normal todo list view
- Preserve all details including edit history

WHEN the user navigates to the Trash section, THE system SHALL retrieve all todos with status "deleted" that belong to the authenticated user.

WHEN the user selects a todo in Trash and clicks "Restore", THE system SHALL:
- Update the todo's status to "incomplete"
- Display the todo back in the normal todo list
- Keep the edit history intact

### Trash Management Flow

WHEN a user navigates to the Trash section, THE system SHALL display a paginated list of recently deleted todos with:
- Title
- Original creation date
- Date of deletion
- Action buttons: Restore and Permanent Delete

WHEN the user clicks "Permanent Delete", THE system SHALL:
- Remove the todo from the database entirely
- Delete all associated edit history entries
- Display confirmation message: "Todo and its history have been permanently deleted."

WHEN the user clicks "Restore", THE system SHALL perform the same action as described in Todo Deletion and Restore Flow.

WHEN the trash list is empty, THE system SHALL display message: "Your trash is empty. All deleted todos have been restored or permanently deleted."

WHILE the user is viewing Trash, THE system SHALL allow filtering by completion status (all deleted todos are considered "deleted" regardless of original state) and sorting by deletion date (newest first by default).

### Logout and Account Deletion Flow

WHEN a user clicks "Logout", THE system SHALL:
- Clear the JWT access token
- Expire the refresh token
- Redirect to the login page with message: "You have been logged out."

WHEN a user clicks "Delete Account", THE system SHALL display a confirmation modal stating:
"Are you sure you want to delete your account? This will permanently remove all your todos, edit history, and account information. This action cannot be undone."

WHEN the user confirms account deletion, THE system SHALL:
- Delete the user record and its unique identifier
- Remove all associated todos from the database
- Permanently delete all edit history records related to the user's todos
- Expire any existing tokens
- Redirect to the registration page with message: "Your account has been permanently deleted. Thank you for using TodoApp."

WHEN an account deletion request is processed, THE system SHALL ensure no data remains in the system tied to that user ID.

NOTE: During any of the above flows, if the system encounters an internal error, THE system SHALL display a generic message: "An unexpected error occurred. Please try again."

NOTE: All flow state transitions are scoped to the authenticated user only. No user can influence or observe any system state belonging to another user.

NOTE: No user can access, view, edit, delete, or even detect the existence of another user's data. All queries are automatically scoped by authenticated user ID.

NOTE: All edit histories are immutable after creation. Once a history entry is written, it cannot be modified or deleted without removing the entire todo item.

## Privacy Architecture

### Data Isolation Model

THE todoApp SHALL implement strict user data isolation where every user's todos, edit histories, and trash contents are completely separated from all other users. WHEN any data is stored, THE system SHALL automatically associate it with the authenticated user's unique identifier. WHERE a user attempts to access data, THE system SHALL never return data associated with a different user identifier under any circumstance. IF a user attempts to access a resource (todo, edit history, or trash item) that does not belong to their account, THE system SHALL return a 404 Not Found response to prevent information leakage about the existence of such data. WHILE the system operates, THE system SHALL ensure that no cross-user data queries can be executed, even through malicious or malformed requests.

### Authentication Token Isolation

WHEN a user logs in, THE system SHALL issue a JWT token that contains only the authenticated user's unique ID and role. THE token SHALL not contain any data from other users or shared context. THE token SHALL have no claims that could be used to infer or represent another user's identity. WHERE a token is presented to any endpoint, THE system SHALL validate only the contained user ID and SHALL discard all other context. IF a token is presented for a user ID that does not exist or has been deleted, THE system SHALL reject the request immediately. WHILE the token is valid, THE system SHALL ensure that the user's identity cannot be impersonated, tampered with, or swapped.

### Query Scope Enforcement

WHEN any query is executed against the database (including read, update, or delete operations), THE system SHALL automatically inject a WHERE clause that restricts results to the authenticated user's ID. THE system SHALL NOT allow any query to omit this user ID filter, even if explicitly requested by application code. WHILE a request is being processed, THE system SHALL validate that all database queries contain an explicit user ID condition matching the authenticated user. IF a database query is detected without an active user ID filter, THE system SHALL block the request and log a security violation. WHERE a user attempts to access data by direct ID (e.g., /todos/:id), THE system SHALL verify that the requested ID belongs to the authenticated user before returning any results.

### Auditability Requirements

THE system SHALL maintain internal audit logs for all security-sensitive operations. WHEN a user deletes an account, THE system SHALL log the event with timestamp, user ID, and IP address. WHEN a hard delete occurs on a todo or its history from the trash, THE system SHALL log the deletion event with the todo ID and user ID. WHILE audit logs are retained, THE system SHALL ensure that logs are never accessible via any public or internal API endpoint. IF an audit log is requested via any user-facing interface, THE system SHALL return a 404 Not Found response. THE audit logs SHALL not contain any user data beyond minimal security metadata and shall be stored exclusively for internal security monitoring.

### Deletion Enforcement

WHEN a user deletes a todo, THE system SHALL mark it as deleted in the database and remove it from the active todo list, but SHALL retain the record for potential restoration. WHEN a user permanently deletes a todo from the trash, THE system SHALL remove both the todo and all associated edit history records from the database in a single atomic transaction. IF a todo's deletion is interrupted by system failure, THE system SHALL roll back the operation to preserve data integrity. WHERE a user deletes their entire account, THE system SHALL permanently delete all todos, edit histories, and trash entries associated with that user ID in a single atomic transaction. WHILE any deletion occurs, THE system SHALL not allow partial deletions - either all data tied to the user ID is removed, or none is.

### Backup and Recovery Restrictions

WHEN the system performs automated backups of the database, THE system SHALL ensure that all backup files are encrypted at rest and contain no human-readable user data identifiers. THE system SHALL NOT include user email addresses, display names, or any personally identifying information in backup snapshots. WHEN a backup is restored during disaster recovery, THE system SHALL ensure that restored data is never accessible to any user other than the original owner. IF a restore operation occurs, THE system SHALL require manual intervention and verification to confirm that the rollback scope is limited to the affected user's data. WHILE backups exist, THE system SHALL prohibit any ability to query, export, or access data from backups via any API or interface. THE system SHALL ensure that no user can access data from a backup file, even with direct access to the storage system.

## Non-Functional Requirements

### Response Time Expectations

#### User Interface Responsiveness
- WHEN a user loads their todo list, THE system SHALL render the first page of results within 500 milliseconds after network response is received.
- WHEN a user toggles a todo's completion status, THE system SHALL update the visual state immediately (within 100 milliseconds) and confirm the change with the server within 1 second.
- WHEN a user searches for todos using the filter interface, THE system SHALL display filtered results instantly (under 200 milliseconds) without requiring page reload.
- WHEN a user edits a todo's title or description, THE system SHALL save changes and confirm success within 1 second.
- WHEN a user opens the edit history of a todo, THE system SHALL display the complete history list within 1 second.
- WHEN a user loads their trash list, THE system SHALL render the first page of deleted todos within 1 second.
- WHEN a user restores a todo from trash, THE system SHALL update the list view and confirm restoration within 1 second.
- WHEN a user permanently deletes a todo from trash, THE system SHALL confirm permanent deletion within 1 second.

#### System Performance Boundaries
- WHEN a user performs any write operation (creation, edit, deletion, completion toggle), THE system SHALL respond with a success or error response within 2 seconds under normal load.
- WHERE a user attempts to access another user's data, THE system SHALL respond with HTTP 403 Forbidden within 200 milliseconds, independent of whether the resource exists.
- IF the database connection is temporarily unavailable, THE system SHALL return HTTP 503 Service Unavailable within 1 second after request receipt.
- WHILE the system is in maintenance mode, THE system SHALL respond to all requests with HTTP 503 Service Unavailable within 100 milliseconds.

### Throughput Requirements

#### Concurrent User Capacity
- THE system SHALL support 500 concurrent active users with full functionality (create, edit, delete, view todos, manage trash) without degradation in response time targets.
- THE system SHALL handle 3,000 requests per minute from authenticated users with 95% of requests completing within the defined response time targets.
- WHILE a single user performs bulk operations (e.g., deleting 100+ todos in sequence), THE system SHALL maintain individual operation response times under 2 seconds.
- WHERE a user attempts concurrent requests to the same todo (e.g., editing while simultaneously toggling completion), THE system SHALL process all operations sequentially with no data corruption and respond to each with its respective success/failure status.

#### Batch Processing Performance
- WHEN a user permanently deletes 25 todos from trash in a single operation, THE system SHALL process the request and confirm completion within 2 seconds.
- WHEN a user restores 25 todos from trash in a single operation, THE system SHALL process the request and confirm completion within 2 seconds.
- WHEN an automated cleanup process runs to archive historical edit entries older than 180 days, THE system SHALL complete processing of 10,000 records within 30 seconds.

### System Availability

#### Uptime Requirements
- THE system SHALL provide 99.9% uptime over any 30-day period, excluding scheduled maintenance windows.
- WHERE scheduled maintenance is required, THE system SHALL notify users at least 24 hours in advance through the application dashboard, and SHALL display a maintenance banner during the maintenance window.
- WHILE the system is in maintenance mode, users SHALL still be able to log in and view their todos (read-only mode) with the latest cached data.
- IF a regional server outage occurs, THE system SHALL automatically route traffic to a healthy region with less than 15-second failover time.

#### Recovery Time Objectives
- AFTER a system failure, THE system SHALL restart all services and be fully operational within 5 minutes.
- AFTER a database corruption event, THE system SHALL restore data from backup and be fully operational within 30 minutes.
- WHEN a service instance fails, THE system SHALL detect the failure and restart the instance with automatic health checks within 90 seconds.

### Data Durability

#### Storage Protection
- THE system SHALL guarantee data persistence for all todos and edit histories with 99.999% durability over any 12-month period.
- WHEN an edit history entry is created, THE system SHALL write the data to durable storage before returning a success response to the user.
- WHEN a todo is permanently deleted from trash, THE system SHALL remove all associated data from primary storage and confirm completion before returning success.
- WHILE the system is operating normally, THE system SHALL maintain at least 3 geographically distributed replicas of all user data.

#### Backup Strategy
- THE system SHALL perform automated backups of all user data every 15 minutes, with a retention period of 7 days.
- WHERE a user requests support for data recovery, THE system SHALL be able to restore their data to any point within the last 24 hours within 1 hour of request.
- IF a catastrophic data center failure occurs, THE system SHALL be able to restore complete user data from offsite backups within 90 minutes.

### Audit Trail Requirements

#### Operational Logging
- THE system SHALL generate immutable audit logs for all critical user actions, including account creation, account deletion, todo creation, todo editing, todo deletion, trash restoration, and trash permanent deletion.
- WHEN any critical user action occurs, THE system SHALL record the user ID, timestamp, action type, source IP address (if available), and user agent.
- The audit log SHALL be stored in a separate immutable storage system that cannot be modified or deleted by any user, including administrators.
- WHERE a security incident is suspected, THE system SHALL allow authorized support personnel to query audit logs with strict access controls.

#### Compliance and Reporting
- THE system SHALL retain audit logs for a minimum of 180 days.
- THE system SHALL support export of audit logs in standard compressed JSON format for compliance reporting.
- IF a legal request is made for user data or activity logs, THE system SHALL be able to generate a complete report for a specific user account within 4 business days.

### Maintainability

#### Codebase Health
- THE system SHALL be structured so that new features can be added with a maximum of 2 weeks of development time by a senior backend engineer.
- WHEN a bug report is submitted, THE system SHALL be structured to allow developers to identify the root cause and implement a fix within 4 business days.
- WHERE a new developer joins the team, THE system SHALL support onboarding with all necessary documentation and local development environment setup within 1 day.

#### Deployment and Monitoring
- THE system SHALL support automated deployment from source control to production with a rollback capability in under 10 minutes.
- THE system SHALL expose health endpoints that return 200 OK when all core services are operational and 503 when any critical service is degraded.
- THE system SHALL integrate with monitoring tools to automatically alert the operations team when error rates exceed 1% of total requests over a 5-minute period.
- THE system SHALL have sufficient logging at DEBUG level for all operations, with error level logs generated for any API endpoint that returns HTTP 4xx or 5xx status codes.

## Future Vision

### Scalability Considerations

The TodoApp service has been designed from inception as a single-user, private application with complete data isolation between accounts. This architectural decision ensures maximum privacy and simplicity but also imposes inherent scalability limitations under the current scope. As user count grows, the following considerations will become increasingly important:

WHEN the user base exceeds 100,000 active users, THE system SHALL support horizontal scaling across multiple server instances without data consistency issues. This requires maintaining user-specific data isolation at the database query level, which is already enforced by the current architecture.

WHILE the application handles a growing number of concurrent users, THE system SHALL maintain response times under 500ms for all CRUD operations on todo items. The current database structure, with user-scoped queries and proper indexing, provides a strong foundation for sustaining this performance target.

THE system SHALL support eventual consistency patterns for background operations such as audit logging and analytics collection, allowing non-critical processes to scale independently from the primary user-facing operations.

### Feature Extensions

While the current implementation provides a robust foundation for private todo management, several natural extensions could enhance the user experience without compromising the core privacy principles:

WHEN a user creates more than 500 todos, THE system SHALL offer a "smart grouping" feature that automatically categorizes todos by common keywords in titles or descriptions, without compromising data privacy through cross-user analysis.

WHERE a user frequently edits todos on a recurring schedule, THE system SHALL provide optional recurring todo templates that allow users to define patterns (weekly, monthly, etc.) that automatically generate new tasks with configurable start and due dates based on the original.

WHEN a user has more than 30 todos marked as complete in a single day, THE system SHALL display a summary visualization of daily productivity trends, calculated from the user's own data without sharing across accounts.

### Cross-Platform Possibilities

The single-user privacy model of TodoApp makes it uniquely suited for seamless cross-platform adoption:

WHILE a user operates on a mobile device, THE system SHALL enable background synchronization across their desktop, tablet, and mobile applications using encrypted push notifications to trigger sync updates only when changes have been made.

WHERE a user enables cloud storage backup, THE system SHALL support local encryption of todo data on the device before transmission, with the encryption key managed by the user rather than by the service provider, preserving absolute data ownership.

WHEN a user connects a calendar service (such as Google Calendar or Outlook), THE system SHALL allow automatic creation of calendar events for todos with due dates, with a configurable offset for reminders based on user-defined preferences, while ensuring the calendar service receives only the user's own data.

### Data Export/Import

Users should have full control over their data lifecycle:

IF a user requests data export, THE system SHALL generate a single encrypted JSON file containing all their todos and edit history, with the encryption key derived from the user's account credentials and never stored server-side.

WHEN a user initiates data import, THE system SHALL validate that the imported JSON file is properly encrypted with the same scheme, and SHALL only import items where the creator's user ID matches the current user's user ID, preserving the privacy principle that users cannot import other users' data.

WHEN a user imports data from another source, THE system SHALL allow mapping of external field names (such as "summary" for title, "duedate" for due date) and preserve all timestamps from the original source to maintain historical context for edit history.

### Collapse Feature

The concept of collapsing todo items represents a natural evolution of the interface without requiring structural changes to the backend:

WHILE a user views their todo list, THE system SHALL allow collapsing todo groups by category (complete/incomplete) or by date range (this week, this month, etc.), which is an interface state that does not alter the underlying data model but improves user experience.

IF a user has enabled the collapse feature, THE system SHALL remember their collapsed state preferences per device using localStorage, with the preferences never synced across devices to preserve privacy and prevent data linkage between different user environments.

WHERE a user has a large number of completed todos, THE system SHALL offer a "hide completed" toggle that visually removes these todos from the main view while preserving them in the database and in the trash system, making the active todo list more manageable without data loss.

Note: All "future possibilities" described above are speculative and non-binding. The current TodoApp specification defines a minimal, secure, private todo application with clear boundaries. These extensions represent potential directions for evolution, not commitments or requirements. Implementation of any of these features must be evaluated separately against current business priorities and resource constraints.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*