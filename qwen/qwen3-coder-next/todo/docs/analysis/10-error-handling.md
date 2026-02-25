# Functional Requirements

## Introduction

This document defines the complete functional requirements for the Multi-User Todo Application. It specifies all user-perceivable functionalities including account management, todo operations, edit history tracking, trash management, filtering and sorting capabilities, and privacy controls. All requirements are expressed in natural language to ensure clarity for backend developers implementing the system.

## Account Management

### User Registration

WHEN a user submits a registration request with an email address and password, THE system SHALL create a new user account if the email is not already registered and the password meets minimum security requirements (at least 8 characters with alphanumeric characters).

WHEN the system receives a registration request, THE system SHALL validate the email format and password strength before creating the account.

WHEN a user successfully registers, THE system SHALL create a user profile with the provided email address and set the display name to the email address before the '@' symbol by default.

WHEN a user attempts to register with an email that is already in use, THE system SHALL return a clear error message indicating the email is already registered.

### User Login

WHEN a user submits login credentials with an email address and password, THE system SHALL verify the credentials against stored user data.

WHEN login credentials are valid, THE system SHALL establish a authenticated session for the user and return appropriate session tokens.

WHEN a user attempts to log in with an email that does not exist, THE system SHALL return a generic error message that does not reveal whether the email exists in the system.

WHEN a user attempts to log in with an incorrect password, THE system SHALL return a generic error message that does not reveal whether the email exists in the system.

### Password Management

WHEN a user requests to change their password, THE system SHALL require the user to provide their current password and a new password.

WHEN the current password provided does not match the stored password, THE system SHALL return an error message indicating the current password is incorrect.

WHEN the new password does not meet security requirements (less than 8 characters or no alphanumeric characters), THE system SHALL return an error message indicating the password requirements.

WHEN a password change is successfully processed, THE system SHALL immediately invalidate all existing sessions for that user.

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL permanently remove the user account and all associated data.

WHEN account deletion is initiated, THE system SHALL permanently delete all todos owned by the user, including todos in the trash and todos with edit history entries.

WHEN account deletion is completed, THE system SHALL terminate all active sessions for that user.

### Profile Management

WHEN a user requests to view their profile, THE system SHALL return the user's display name and email address.

WHEN a user requests to edit their profile, THE system SHALL allow the user to update their display name.

WHEN a user attempts to edit another user's profile, THE system SHALL return a "403 Forbidden" error.

WHEN a user attempts to view another user's profile, THE system SHALL return a "403 Forbidden" error.

## Todo CRUD Operations

### Todo Creation

WHEN a user creates a new todo, THE system SHALL accept the following fields:
- `title` (required): A non-empty string up to 255 characters
- `description` (optional): A string up to 10,000 characters
- `start_date` (optional): A valid date in ISO 8601 format
- `due_date` (optional): A valid date in ISO 8601 format

WHEN a user creates a todo, THE system SHALL automatically set the completion status to "incomplete" by default.

WHEN a todo is created, THE system SHALL record the creation timestamp.

WHEN a user attempts to create a todo without a title, THE system SHALL return a validation error.

WHEN a user attempts to create a todo with a title exceeding 255 characters, THE system SHALL return a validation error.

WHEN a user attempts to create a todo with a start date after the due date, THE system SHALL return a validation error.

### Todo List Retrieval

WHEN a user requests their todo list, THE system SHALL return todos owned by that user only.

WHEN a user requests a paginated todo list, THE system SHALL return the requested page based on page number and page size parameters.

WHEN a user requests a todo list, THE system SHALL include the following fields for each todo:
- `id`: The unique identifier
- `title`: The todo title
- `description`: The todo description (if set)
- `is_complete`: The completion status
- `start_date`: The start date (if set)
- `due_date`: The due date (if set)
- `created_at`: The creation timestamp
- `updated_at`: The last update timestamp

WHEN a user attempts to view another user's todo list, THE system SHALL return a "403 Forbidden" error.

### Single Todo Retrieval

WHEN a user requests a specific todo by ID, THE system SHALL return the complete todo details including the full description.

WHEN a user requests a todo that does not exist, THE system SHALL return a "404 Not Found" error.

WHEN a user requests a todo they do not own, THE system SHALL return a "403 Forbidden" error.

### Todo Completion/Uncompletion

WHEN a user requests to complete a todo, THE system SHALL mark the todo as complete and record the completion timestamp.

WHEN a user requests to mark a todo as incomplete, THE system SHALL mark the todo as incomplete and clear the completion timestamp.

WHEN a user attempts to toggle completion status for a todo they do not own, THE system SHALL return a "403 Forbidden" error.

WHEN a user attempts to toggle completion status for a todo that does not exist, THE system SHALL return a "404 Not Found" error.

### Todo Editing

WHEN a user requests to edit a todo, THE system SHALL accept any combination of the following fields:
- `title`: A non-empty string up to 255 characters (optional)
- `description`: A string up to 10,000 characters (optional)
- `start_date`: A valid date in ISO 8601 format (optional)
- `due_date`: A valid date in ISO 8601 format (optional)

WHEN a user attempts to edit a todo without providing at least one field to update, THE system SHALL return a validation error.

WHEN a user attempts to edit a todo with a start date after the due date, THE system SHALL return a validation error.

WHEN a user attempts to edit a todo that does not exist, THE system SHALL return a "404 Not Found" error.

WHEN a user attempts to edit a todo they do not own, THE system SHALL return a "403 Forbidden" error.

### Todo Deletion (Soft Delete)

WHEN a user requests to delete a todo, THE system SHALL mark the todo as deleted (soft delete) rather than permanently removing it.

WHEN a todo is soft deleted, THE system SHALL store the deletion timestamp and maintain the todo in the database for potential restoration.

WHEN a todo is soft deleted, THE system SHALL remove it from the normal todo list view.

WHEN a user attempts to delete a todo that does not exist, THE system SHALL return a "404 Not Found" error.

WHEN a user attempts to delete a todo they do not own, THE system SHALL return a "403 Forbidden" error.

## Edit History Tracking

### History Entry Creation

WHEN a user edits a todo and any of the following fields change, THE system SHALL create a history entry:
- `title`
- `description`
- `start_date`
- `due_date`

WHEN a history entry is created, THE system SHALL record:
- The timestamp of the edit
- The previous value of each changed field (if any)
- The new value of each changed field
- The user ID of the user who made the edit

WHEN a todo is edited, THE system SHALL update the todo's `updated_at` timestamp.

WHEN an edit occurs that does not change any tracked fields, THE system SHALL NOT create a history entry but SHALL still update the `updated_at` timestamp.

### History Retrieval

WHEN a user requests the edit history for a specific todo, THE system SHALL return all history entries for that todo.

WHEN a user requests edit history, THE system SHALL sort the history entries from most recent to oldest.

WHEN a user requests edit history for a todo they do not own, THE system SHALL return a "403 Forbidden" error.

WHEN a user requests edit history for a todo that does not exist, THE system SHALL return a "404 Not Found" error.

## Trash Management

### Trash List Retrieval

WHEN a user requests their trash list, THE system SHALL return all todos that have been soft deleted by that user.

WHEN a user requests a paginated trash list, THE system SHALL return the requested page based on page number and page size parameters.

WHEN a user requests a trash list, THE system SHALL include the following fields for each todo:
- `id`: The unique identifier
- `title`: The todo title
- `description`: The todo description (if set)
- `is_complete`: The completion status
- `start_date`: The start date (if set)
- `due_date`: The due date (if set)
- `created_at`: The creation timestamp
- `deleted_at`: The deletion timestamp

WHEN a user attempts to view another user's trash list, THE system SHALL return a "403 Forbidden" error.

### Todo Restoration

WHEN a user requests to restore a todo from trash, THE system SHALL mark the todo as not deleted.

WHEN a todo is restored, THE system SHALL remove it from the trash and return it to the normal todo list.

WHEN a user attempts to restore a todo that does not exist, THE system SHALL return a "404 Not Found" error.

WHEN a user attempts to restore a todo they do not own, THE system SHALL return a "403 Forbidden" error.

WHEN a user attempts to restore a todo that is not in the trash, THE system SHALL return a validation error.

### Permanent Deletion

WHEN a user requests to permanently delete a todo from trash, THE system SHALL remove the todo record entirely from the database.

WHEN a todo is permanently deleted, THE system SHALL also delete all edit history entries associated with that todo.

WHEN a user attempts to permanently delete a todo that does not exist, THE system SHALL return a "404 Not Found" error.

WHEN a user attempts to permanently delete a todo they do not own, THE system SHALL return a "403 Forbidden" error.

WHEN a user attempts to permanently delete a todo that is not in the trash, THE system SHALL return a validation error.

## Filtering & Sorting

### Completion Status Filtering

WHEN a user requests a filtered todo list by completion status, THE system SHALL support the following filter values:
- `all`: Include both complete and incomplete todos
- `complete`: Include only complete todos
- `incomplete`: Include only incomplete todos

WHEN no filter is specified, THE system SHALL default to showing all todos.

WHEN a user attempts to filter todos they do not own, THE system SHALL return a "403 Forbidden" error.

### Creation Date Sorting

WHEN a user requests sorting by creation date, THE system SHALL support the following order values:
- `newest_first`: Sort by creation timestamp in descending order (most recent first)
- `oldest_first`: Sort by creation timestamp in ascending order (oldest first)

WHEN no sort order is specified, THE system SHALL default to `newest_first`.

WHEN todos have identical creation timestamps, THE system SHALL use the todo ID as a secondary sort criterion to ensure consistent ordering.

### Start Date Sorting

WHEN a user requests sorting by start date, THE system SHALL support the following order values:
- `earliest_first`: Sort by start date in ascending order (earliest first)
- `latest_first`: Sort by start date in descending order (latest first)

WHEN a todo does not have a start date set, THE system SHALL place it at the end of the list regardless of sort order.

WHEN todos have identical start dates or no start date, THE system SHALL use the todo ID as a secondary sort criterion.

### Due Date Sorting

WHEN a user requests sorting by due date, THE system SHALL support the following order values:
- `earliest_first`: Sort by due date in ascending order (earliest first)
- `latest_first`: Sort by due date in descending order (latest first)

WHEN a todo does not have a due date set, THE system SHALL place it at the end of the list regardless of sort order.

WHEN todos have identical due dates or no due date, THE system SHALL use the todo ID as a secondary sort criterion.

### Combined Filtering and Sorting

WHEN a user requests both filtering and sorting, THE system SHALL apply the filter first, then apply the sorting to the filtered results.

WHEN multiple sort criteria are requested, THE system SHALL apply them in the order specified, using the todo ID as the final tiebreaker.

## Privacy Controls

### User Data Isolation

WHEN a user performs any operation on todos, THE system SHALL ensure the user can only access todos they own.

WHEN a user attempts to access, edit, delete, or perform any operation on a todo belonging to another user, THE system SHALL return a "403 Forbidden" error.

WHEN a user requests a list of todos, THE system SHALL automatically filter the results to include only todos owned by that user.

### Profile Privacy

WHEN a user attempts to view another user's profile information, THE system SHALL return a "403 Forbidden" error.

WHEN a user attempts to edit another user's profile information, THE system SHALL return a "403 Forbidden" error.

WHEN a user requests their own profile, THE system SHALL return only the user's display name and email address.

### Authentication Enforcement

WHEN a user attempts to perform any operation without valid authentication credentials, THE system SHALL return a "401 Unauthorized" error.

WHEN a user's authentication token expires during an operation, THE system SHALL terminate the operation and return an authentication error.

WHEN a user's session is invalidated (e.g., due to password change or account deletion), THE system SHALL immediately reject any subsequent requests using the old credentials.

### Complete Data Isolation

THE system SHALL ensure that user data is completely isolated at the database level.

THE system SHALL use user ID-based filtering on all data access operations to prevent cross-user data leakage.

THE system SHALL implement additional validation layers to ensure user ID enforcement cannot be bypassed through manipulation.

## Success Criteria

- All user operations are properly authenticated and authorized
- Users can only access and modify their own data
- Edit history is automatically maintained for all field changes
- Trash functionality works correctly with soft deletion and restoration
- Filtering and sorting work independently and in combination
- All error scenarios provide clear, actionable feedback
- Data integrity is maintained across all operations
- Performance remains acceptable under normal usage patterns
