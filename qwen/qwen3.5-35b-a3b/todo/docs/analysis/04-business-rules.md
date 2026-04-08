**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide both an email address and password to create an account. The system requires users to provide their email and password for authentication when logging in. Users can update their display name, but it must be present in their profile. Users have the ability to change their password at any time. Each user maintains a private workspace where their todos remain completely confidential and inaccessible to other users. When a user deletes their account, the system permanently removes all their todos including any items in trash, along with their entire edit history associated with those todos.

### Account Creation Requirements

WHEN a user initiates account creation, THE system SHALL require both an email address and a password. THE email address and password are required fields.

WHERE the email address is already registered in the system, THE account creation request SHALL be rejected.

WHEN an email or password field is missing, THE account creation request SHALL be rejected.

### Login Authentication

WHEN a user attempts to log in, THE system SHALL require both an email address and a password. THE email address and password are required fields.

WHERE the provided email does not exist in the system, THE login request SHALL be rejected.

WHERE the email exists but the provided password does not match the stored password, THE login request SHALL be rejected.

WHEN an email or password field is missing, THE login request SHALL be rejected.

### Display Name Update Requirements

WHEN a user updates their profile, THE system SHALL require a display name to be present. THE display name is a required field.

WHERE the display name is empty or missing, THE profile update request SHALL be rejected.

WHEN the display name update succeeds, THE system SHALL immediately replace the previous display name with the new display name in the user profile.

### Password Change Operation

WHEN a user requests to change their password, THE system SHALL require both the current password and a new password. THE current password and new password are required fields.

WHERE the provided current password does not match the user's actual password, THE password change request SHALL be rejected.

WHERE the new password field is empty or missing, THE password change request SHALL be rejected.

### Private User Workspace

THE system SHALL ensure each user's workspace is completely private and accessible only to that user.

WHEN a user views their todo list, THE system SHALL display only the todos belonging to that user. TODOS belonging to other users SHALL NEVER be displayed.

THE system SHALL prevent any user from viewing, accessing, or modifying another user's todos.

### Account Deletion Consequences

WHEN a user deletes their account, THE system SHALL soft delete all data associated with that account.

THE system SHALL soft delete all todos owned by the user, including todos that have been moved to trash.

THE system SHALL soft delete the user's entire edit history associated with their todos.

THIS DELETION CAN BE RESTORED WITHIN THE RETENTION PERIOD.

### Complete Data Removal

WHEN a user account is soft deleted, THE system SHALL perform data archival across all data categories.

THE system SHALL retain all todo items in a deleted state, including active todos, completed todos, and todos in trash.

THE system SHALL retain all edit history entries for the user's todos in the archived state.

WHERE the deleted user had no other accounts, THE system SHALL make the user's email address available for registration of a new account after the retention period expires.

### Authentication Requirements

THE system SHALL require authentication for all account-related operations.

WHEN a user attempts to create, view, edit, or delete todos, THE system SHALL reject the request if the user is not authenticated.

WHERE the user is not authenticated, THE system SHALL reject requests for access to the user's todo list and account-specific functionality.

## Todo Rules

Every todo must have a title when created, but description, start date, and due date fields are optional and may be left empty. All new todos are created with an incomplete status by default. Users can toggle a todo between complete and incomplete states with a simple two-state operation. When viewing todos in a list, each entry displays the title, completion status, and any set dates (start date, due date, creation date). Users can edit a todo's title, description, start date, or due date at any time. Deleting a todo moves it to trash rather than permanently removing it immediately. In the trash, users can either restore a todo back to the normal list or permanently delete it. When filtering, users can view all todos, only complete todos, or only incomplete todos. Sorting by creation date shows newest first or oldest first. Sorting by start date or due date places todos without those dates at the end of the list.

### ### Todo Creation and Title Requirement

Every todo must have a title when created. The title is a required field and cannot be empty.

If a user attempts to create a todo without providing a title, the request is rejected and the todo is not created.

### ### Optional Description Field

The description field is optional when creating a todo. Users may leave the description empty or provide any text content.

Users can also edit a todo's description at any time, including setting it to empty.

### ### Optional Start Date Field

The start date field is optional when creating a todo. Users may leave it empty or provide a date.

Users can edit a todo's start date at any time, including clearing it to be empty.

### ### Optional Due Date Field

The due date field is optional when creating a todo. Users may leave it empty or provide a date.

Users can edit a todo's due date at any time, including clearing it to be empty.

### ### Default Incomplete Status

All new todos are created with an incomplete status by default.

The status is automatically set to incomplete upon todo creation.

### ### Complete Incomplete Toggle

Users can toggle a todo's completion status between complete and incomplete.

Marking a todo as complete changes its status from incomplete to complete.
Marking a todo as incomplete changes its status from complete to incomplete.

This is a simple two-state toggle operation.

### ### Todo List Display Fields

When viewing todos in a list, each todo entry displays the following fields:
- Title
- Completion status
- Start date (if set)
- Due date (if set)
- Creation date

Todos that have an empty start date or due date show no value for those fields.

### ### Todo Editing Permissions

Users can edit any of their own todos.

Users can modify the title, description, start date, and due date of a todo they own.

Users cannot edit todos that do not belong to them.

### ### Soft Delete to Trash

When a user deletes a todo, it is soft deleted and moved to the trash.

The todo no longer appears in the normal todo list after soft deletion.

Todos in the trash retain all their data and edit history.

### ### Restore from Trash

Users can restore a todo from the trash.

When restored, the todo returns to the normal todo list with all its original data intact.

The todo's completion status, dates, and edit history are preserved during restoration.

### ### Permanent Deletion from Trash

Users can permanently delete a todo from the trash.

When permanently deleted, the todo and all its associated edit history entries are removed and cannot be recovered.

Permanent deletion is irreversible.

### ### Filter by Completion Status

Users can filter their todo list by completion status using three options:
- All todos: Shows todos with any completion status
- Complete todos: Shows only todos marked as complete
- Incomplete todos: Shows only todos marked as incomplete

### ### Sort by Creation Date

Users can sort their todo list by creation date with two ordering options:
- Newest first: Shows the most recently created todos at the top
- Oldest first: Shows the oldest created todos at the bottom

### ### Sort by Start Date

Users can sort their todo list by start date with two ordering options:
- Earliest first: Shows todos with the earliest start dates at the top
- Latest first: Shows todos with the latest start dates at the bottom

Todos that do not have a start date are shown at the end when sorting by start date, regardless of the sort direction.

### ### Sort by Due Date

Users can sort their todo list by due date with two ordering options:
- Earliest first: Shows todos with the earliest due dates at the top
- Latest first: Shows todos with the latest due dates at the bottom

Todos that do not have a due date are shown at the end when sorting by due date, regardless of the sort direction.

## EditHistory Rules

Every time a todo undergoes any edit, the system automatically creates a history entry recording the change. Each history entry captures the timestamp of when the edit was made. The history entry records what the new title is if the title was changed. The history entry records what the new description is if the description was changed. The history entry records what the new start date is if the start date was changed. The history entry records what the new due date is if the due date was changed. Users can view the complete edit history for any of their todos. History entries are displayed sorted from most recent edit to oldest edit. When a todo is permanently deleted, its entire edit history is also permanently removed together with it.

### Automatic History Entry Creation

When any field of a todo is edited, the system automatically creates a history entry to record the change.
No manual action is required to create history entries.
History entries are created for all edits including changes to title, description, start date, and due date.
A new history entry is created for every edit regardless of whether other fields also changed in the same edit.

### Edit Timestamp Recording

Each history entry records the exact time when the edit was made.
The timestamp is recorded at the moment of editing, not when the history is viewed or accessed.
Every history entry has a timestamp even if only one field changed during that edit.

### Field Change Recording

Each history entry records which specific fields were modified during that edit.
If the title was changed, the new title value is recorded.
If the description was changed, the new description value is recorded.
If the start date was changed, the new start date value is recorded.
If the due date was changed, the new due date value is recorded.
Fields that were not changed during an edit are not included in the history entry.
Only the changed fields and their new values appear in each history entry.

### History Visibility Rules

Users can only view the edit history for todos they own.
Users cannot access or view the edit history of todos owned by other users.
History entries are always sorted from most recent edit to oldest edit.
The newest history entry appears first in the list.
History entries are displayed in the order they were created, from newest to oldest.
When sorting history entries, null timestamps are positioned at the end of the list.

### Permanent Deletion Removes History

When a todo is permanently deleted from the trash, its entire edit history is also permanently removed.
The edit history cannot be restored after the todo is permanently deleted.
All history entries for the todo are deleted together with the todo itself.

### Empty History State

A newly created todo has no edit history entries initially.
The first history entry is created when the todo is first edited.
If a todo has never been edited, the edit history view shows an empty list.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering by Completion Status

Users can filter their todo list by completion status.

The available filter options are:
- All todos (show todos with any completion status)
- Only complete todos (show todos that are marked as complete)
- Only incomplete todos (show todos that are not marked as complete)

When a filter is applied, the list displays only todos matching the selected criteria.
When no filter is selected, all todos are shown by default.

### Sorting by Date Fields

Users can sort their todo list by date fields.

The available sort options are:
- Creation date: newest first or oldest first
- Start date: earliest first or latest first
- Due date: earliest first or latest first

When sorting by start date or due date, todos without a value for that field appear at the end of the list, after todos with values.
Each sort option includes both ascending and descending order choices.

### Pagination

Todo lists are displayed in paginated format.

Users view a limited number of todos per page with navigation controls to move between pages.
The same pagination applies to the trash list when viewing deleted todos.

The system handles pagination automatically. Users can navigate to previous or next pages as needed to browse through all available todos.

### Error Conditions for List Operations

If the user has no todos that match the current filter criteria, the list displays an empty state message.

If the user has no todos in the trash, the trash list displays an empty state message.

If a user attempts to access a paginated page that does not exist, the system shows the available pages or the nearest valid page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Registration Errors

When creating a new user account, if the email address is missing or invalid, the registration is rejected. If the password is missing or too short, the registration is rejected. If an account already exists with the provided email address, the registration is rejected with an appropriate message.

### Login Errors

When attempting to log in, if the email address does not correspond to any existing account, the login request is rejected. If the password does not match the stored password, the login request is rejected. If no credentials are provided, the login request is rejected.

### Account Deletion

Users can delete their own account at any time. When an account is deleted, all todos owned by the user, including those in the trash, are permanently removed from the system along with their complete edit history. Account deletion cannot be undone.

### Profile Update Errors

When updating a user's display name, if the new display name is missing or empty, the update is rejected. Users can only update their own profile; attempts to view or modify another user's profile are rejected.

### Password Change Errors

When changing a password, if the current password is incorrect, the change is rejected. If the new password is missing or too short, the change is rejected. Users can only change their own password.

### Todo Creation Rejections

When creating a todo, if the title is missing or empty, the request is rejected. If the due date is set earlier than the start date, the request is rejected. New todos are automatically marked as incomplete.

### Todo Viewing Access

Users can only view todos that they own. Attempting to view a todo owned by another user results in the request being rejected. Guests cannot view any todos.

### Todo Completion Errors

Users can only mark their own todos as complete or incomplete. Attempting to change the completion status of a todo owned by another user results in the request being rejected.

### Todo Editing Errors

Users can only edit their own todos. Attempting to edit a todo owned by another user results in the request being rejected. When a todo is edited, an edit history entry is automatically created recording what was changed.

### Todo Deletion Errors

Users can only delete their own todos. Attempting to delete a todo owned by another user results in the request being rejected. Deleted todos are moved to the trash and no longer appear in the normal todo list.

### Trash Viewing

Users can only view their own trash. Attempting to view the trash of another user results in the request being rejected.

### Trash Restoration Errors

Users can only restore their own deleted todos from the trash. Attempting to restore a todo owned by another user results in the request being rejected. Restored todos return to the normal todo list with their original properties intact.

### Trash Permanent Deletion Errors

Users can only permanently delete their own todos from the trash. Attempting to permanently delete a todo owned by another user results in the request being rejected. Permanent deletion removes both the todo and its complete edit history.

### Filtering Validation

When filtering todos by completion status, only the following filter values are accepted: all todos, only complete todos, only incomplete todos. Any other filter value results in the request being rejected.

### Sorting Validation

When sorting todos, only the following sort options are accepted: creation date (newest first or oldest first), start date (earliest first or latest first), due date (earliest first or latest first). Todos without a start date appear at the end of list when sorting by start date. Todos without a due date appear at the end of list when sorting by due date.

### List Pagination

Todo lists and trash lists are paginated. When a page is requested, only the todos within that page are returned. Requesting a page number that does not exist results in an empty list being returned.

### Edit History Access

Users can only view the edit history of their own todos. Attempting to view the edit history of a todo owned by another user results in the request being rejected. Edit history entries are returned sorted from most recent to oldest.

### Missing Todo Reference

When any operation references a specific todo by identifier, if that todo does not exist, the operation is rejected. If the todo exists but was permanently deleted, the operation is rejected.