# Multi-User Todo Application Requirements Specification

## User Account

WHEN a new user attempts to register, THE system SHALL require a valid email address and a password that meets minimum security criteria.

WHEN an existing user attempts to log in, THE system SHALL validate the presented email and password against stored credentials, and SHALL issue a secure authentication token if credentials are valid.

WHEN a user requests to change their password, THE system SHALL verify the current password before accepting a new one, and SHALL enforce minimum complexity requirements on the new password.

WHEN a user permanently deletes their account, THE system SHALL immediately revoke all active sessions, clear authentication tokens, and permanently remove all associated todo items, edit history, and trash entries.

No user shall be permitted to register or log in with credentials from any other user's account. Account creation and authentication are completely isolated per user.

## User Profile

WHEN a user registers, THE system SHALL automatically create a profile record with a display name initialized to the local portion of their email address (e.g., "john.doe" for "john.doe@example.com").

WHEN a user updates their display name, THE system SHALL validate that the new display name is non-empty, contains at least one non-whitespace character, and does not exceed 100 characters.

WHEN a user requests to view their profile, THE system SHALL return only the user’s own display name and creation timestamp.

WHEN a user attempts to access another user's profile, THE system SHALL return HTTP 404 NOT FOUND without confirming whether the resource exists — preserving privacy through obscurity.

No display name or profile information may be accessible via any API endpoint by any user other than the profile owner.

## Creating Todos

WHEN a user submits a new todo, THE system SHALL require a non-empty title with a minimum length of 1 character and a maximum length of 255 characters.

WHEN a description is provided, THE system SHALL store it as an optional field with a maximum length of 10,000 characters.

WHEN a start date is submitted, THE system SHALL validate it is in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ).

WHEN a due date is submitted, THE system SHALL validate it is in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ).

WHEN both a start date and due date are provided, THE system SHALL validate that the due date is not earlier than the start date.

WHEN a new todo is created, THE system SHALL set the completion status to "incomplete" by default, regardless of any value provided in the request.

WHEN a todo creation request includes fields outside of title, description, startDate, and dueDate, THE system SHALL reject the request with HTTP 400 Bad Request.

All todos are owned exclusively by the authenticated user. No todo may be created with a userId different from the one in the authentication token.

## Viewing Todos

WHEN a user requests their list of todos, THE system SHALL return only todos owned by the authenticated user.

THE system SHALL support pagination with a default page size of 20 items and a maximum page size of 100 items.

THE system SHALL return for each todo: title, completion status, start date (if set), due date (if set), creation date, and update date.

WHEN a user requests a single todo by ID, THE system SHALL return all fields including the full description, and SHALL return HTTP 404 if the todo does not exist or belongs to another user.

All returned data fields shall be rendered in Asia/Seoul (KST) timezone.

## Completing Todos

WHEN a user requests to toggle a todo's completion status, THE system SHALL reverse its current state from complete to incomplete, or incomplete to complete.

WHEN a toggle request is received, THE system SHALL perform the operation atomically: read, invert, update — all within a single transaction.

WHEN a todo is toggled, THE system SHALL preserve the original creation timestamp and SHALL NOT modify it.

WHEN a todo is toggled, THE system SHALL record an audit event with timestamp, user ID, todo ID, previous state, and new state — separate from edit history.

No other methods of setting or overriding completion status are permitted. Only the toggle operation may change it.

## Editing Todos

WHEN a user edits a todo, THE system SHALL permit updating: title, description, start date, and due date.

WHEN any field is changed, THE system SHALL create a new edit history entry containing the previous value of each field.

WHEN a field is unchanged from its current value, THE system SHALL NOT record a change for that field in history.

WHEN a start or due date is submitted as null, THE system SHALL clear the existing date value.

WHEN a title is submitted that is empty, null, or contains only whitespace, THE system SHALL reject the edit.

WHEN a submitted description exceeds 10,000 characters, THE system SHALL reject the edit.

WHEN a start date or due date is submitted in invalid format, THE system SHALL reject the edit.

WHEN a due date is submitted that precedes the start date, THE system SHALL reject the edit.

All edits are permitted on todos regardless of completion status.

## Edit History

WHEN a todo is edited, THE system SHALL create and store a history entry with:
- Timestamp of the edit
- Previous title value (if changed)
- Previous description value (if changed)
- Previous start date value (if changed)
- Previous due date value (if changed)
- Editor's user ID

WHEN a user fetches a todo's edit history, THE system SHALL return all entries in reverse chronological order: most recent first.

WHEN a todo is permanently deleted from the trash, THE system SHALL recursively delete all associated edit history entries.

No history entry shall be accessible except by the owner of the todo.

## Deleting Todos

WHEN a user deletes a todo, THE system SHALL apply a soft delete: set isDeleted flag to true, but retain all data in the database.

WHEN a todo is soft-deleted, THE system SHALL remove it from the visible todo list.

WHEN a todo is soft-deleted, THE system SHALL preserve all edit history entries and associated metadata.

NO todo shall be physically removed from the database during soft deletion.

The deletion event shall be recorded with a timestamp, and the todo shall become accessible only via the trash interface.

## Trash

WHEN a user accesses the trash, THE system SHALL return all todos where isDeleted is true and belongs to the authenticated user.

THE trash interface SHALL be paginated with a default page size of 20 items and maximum page size of 100 items.

WHEN viewing trash, THE system SHALL display: title, completion status at time of deletion, deletion timestamp, start date (if set), and due date (if set).

WHEN sorting trash, THE system SHALL support sorting only by deletion date — either newest first or oldest first.

WHEN a user restores a todo from trash, THE system SHALL set isDeleted to false, unset the deletion timestamp, and move the todo back to the main list.

