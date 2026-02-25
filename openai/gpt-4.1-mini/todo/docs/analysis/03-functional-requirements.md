# Multi-User Todo Application Requirements Specification

## User Account

Users SHALL be able to register with a valid and unique email and password securely stored in hashed form. Users SHALL be able to log in using their email and password to initiate an authenticated session. Sessions SHALL expire after a configurable timeout or when the user logs out. Users SHALL have the ability to change their password after proper authentication. Users SHALL be able to delete their account, which SHALL result in permanent removal of all associated todos including those in trash.

## User Profile

Each user SHALL have a private profile containing a display name. Users SHALL be able to update their display name. Users SHALL NOT be able to view other users' profiles or display names, ensuring profile privacy.

## Creating Todos

WHEN a user initiates the creation of a todo item, THE system SHALL require a non-empty title. THE system SHALL optionally accept a description, start date, and due date. Newly created todos SHALL default to an incomplete status. Each todo SHALL be uniquely associated with the creating user.

## Viewing Todos

WHEN a user retrieves their todo list, THE system SHALL return only the todos owned by that user. The todo list SHALL be paginated with user-configurable page size. Each todo in the list SHALL include the title, completion status, start date (if set), due date (if set), and creation date. WHEN a user requests a single todo detail, THE system SHALL return full details including title, description, start date, due date, completion status, and creation date. Todos marked as deleted SHALL be excluded from the normal lists.

## Completing Todos

WHEN a user toggles a todo completion status, THE system SHALL update the status accordingly to either complete or incomplete.

## Editing Todos

WHEN a user edits a todo, THE system SHALL allow changing the title, description, start date, and due date. THE system SHALL create an edit history entry for each change, recording the time of edit and all altered fields. The edit history SHALL be sorted from most recent to oldest and accessible by the owner user.

## Edit History

Each todo SHALL maintain an edit history list. Each history entry SHALL record the timestamp of the edit and all changed fields with their new values. The history SHALL be ordered newest first and viewable by the user.

## Deleting Todos

WHEN a user deletes a todo, THE system SHALL perform a soft delete. Soft-deleted todos SHALL be excluded from the normal todo list and visible in the trash list. The trash list SHALL be paginated. WHEN a user restores a todo from trash, THE system SHALL reinstate it back into the active list. WHEN a user permanently deletes a todo from trash, THE system SHALL permanently remove the todo and all associated edit history.

## Trash Management

Users SHALL be able to view their soft deleted todos in a paginated trash list. Users SHALL be able to restore todos from trash to active lists or permanently delete them with complete removal of edit histories.

## Filtering Todos

Users SHALL be able to filter their active todo list by completion status: all, complete only, or incomplete only.

## Sorting Todos

Users SHALL be able to sort their active todo list by creation date (newest or oldest first), start date (earliest or latest first, with todos lacking a start date last), or due date (earliest or latest first, with todos lacking a due date last).

## Privacy

The system SHALL enforce strict user data privacy. Users SHALL only access their own todos and profiles. No cross-user visibility shall be permitted.

## Authentication and Authorization

The system SHALL implement secure authentication via email and password. User sessions SHALL be properly managed including expiration and logout. All operations SHALL enforce authorization, restricting actions to resources owned by the authenticated user.

## Error Handling

THE system SHALL return clear and actionable error messages for invalid inputs, authentication failures, authorization violations, and other error states.

## Performance

THE system SHALL support efficient pagination, filtering, and sorting operations for scalability and responsiveness.


---

No Mermaid diagrams are used in this document.