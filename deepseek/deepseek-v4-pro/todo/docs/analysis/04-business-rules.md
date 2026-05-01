**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must register with a valid email address and a password. The email serves as the unique identifier for login and must not already be associated with an existing account. A password is required for both registration and login, and users can change it at any time. Each user has a profile with a display name that can be edited freely. Deleting a user account is permanent and cascading: all of the user's todos, including those in the trash, are permanently erased along with their associated edit histories. Users cannot access or view any other user's profile or data, as the application enforces strict privacy between accounts. The system rejects registration attempts with an email that is already in use, and login attempts with incorrect credentials are denied with no indication of whether the email or password was wrong.

### Email Validation and Uniqueness

IF the email address provided during registration does not conform to a valid email format, THEN THE system SHALL reject the registration attempt.

THE system SHALL enforce that each email address is associated with at most one user account. IF a registration attempt uses an email address already associated with an existing account, THEN THE system SHALL reject the registration.

### Password Rules

THE system SHALL require a password for user registration.

THE system SHALL require a password for user login.

THE system SHALL allow an authenticated user to change their password at any time.

### Display Name Rules

THE system SHALL associate a display name with each user account.

THE system SHALL allow the authenticated user to edit their own display name at any time.

### Account Deletion Cascading

WHEN a user deletes their account, THE system SHALL permanently delete all todos owned by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all todos in the trash owned by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all edit history entries associated with the user's todos.

### Credential Verification

IF the credentials provided during login do not match any existing account, THEN THE system SHALL deny access.

THE system SHALL NOT disclose whether the email address or the password was incorrect when a login attempt fails.

### Privacy Between Accounts

THE system SHALL prevent any user from viewing, accessing, or interacting with another user's data. This includes all todos, trash entries, edit history records, and profile information belonging to other users.

## Todo Rules

Every todo must have a title, which is required and cannot be empty. The description is optional and may be left blank. Both a start date and a due date are optional fields that can be omitted independently. When a start date is provided, it represents when work on the todo should begin; when a due date is provided, it represents the deadline. A newly created todo is always incomplete by default. The completion status is a simple toggle: a user can mark an incomplete todo as complete and a complete todo back to incomplete. Deleted todos are not permanently removed immediately but are moved to the trash, where they remain restorable or can be permanently deleted. Todos in the trash do not appear in the normal todo list. When sorting by start date, todos without a start date are placed at the end of the list. Similarly, when sorting by due date, todos without a due date appear at the end. The todo list supports pagination and can be filtered by completion status — showing all todos, only complete ones, or only incomplete ones. Sorting options include creation date (newest first or oldest first), start date (earliest first or latest first), and due date (earliest first or latest first).

### Title Validation

### Title Is Required

IF the title is missing or consists only of whitespace when a todo is created or edited, THEN the system SHALL reject the request.

A todo cannot exist without a non-empty title.


### Optional Field Rules

### Description Is Optional

WHERE a user creates or edits a todo, the system SHALL accept a description that is missing or left blank without rejection.

### Start Date Is Optional

WHERE a user creates or edits a todo, the system SHALL accept a missing start date without rejection. The start date may be omitted independently of other fields.

### Due Date Is Optional

WHERE a user creates or edits a todo, the system SHALL accept a missing due date without rejection. The due date may be omitted independently of other fields.


### Completion Status Rules

### Default State on Creation

WHEN a todo is created, the system SHALL set its completion status to incomplete.

### Toggle Between States

WHEN a user marks an incomplete todo as complete, the system SHALL change its completion status to complete.

WHEN a user marks a complete todo as incomplete, the system SHALL change its completion status to incomplete.

The completion status is a simple toggle: only the two states — complete and incomplete — are valid.


### Soft Delete and Trash Rules

### Move to Trash on Deletion

WHEN a user deletes a todo, the system SHALL move it to the trash rather than permanently removing it. The todo is not destroyed; it remains in the system in a deleted state.

### Exclusion from Normal List

WHILE a todo is in the trash, the system SHALL exclude it from the normal todo list. Trashed todos are only visible through the trash view.


### Sorting Rules

### Sort Order for Missing Dates

WHEN sorting by start date, the system SHALL place todos without a start date at the end of the results, regardless of whether the sort direction is earliest-first or latest-first.

WHEN sorting by due date, the system SHALL place todos without a due date at the end of the results, regardless of whether the sort direction is earliest-first or latest-first.

### Supported Sort Criteria

WHEN sorting by creation date, the system SHALL order todos from newest to oldest or from oldest to newest as specified by the user.

WHEN sorting by start date, the system SHALL order todos from earliest to latest or from latest to earliest as specified by the user. Todos without a start date SHALL be placed at the end.

WHEN sorting by due date, the system SHALL order todos from earliest to latest or from latest to earliest as specified by the user. Todos without a due date SHALL be placed at the end.


### Filtering Rules

### Completion Status Filter

WHEN a user applies a completion status filter to their todo list, the system SHALL return only the todos matching the selected filter.

The system SHALL support exactly three filter options:

- **All todos**: no filtering by completion status
- **Complete only**: only todos marked as complete
- **Incomplete only**: only todos marked as incomplete

IF an invalid filter value is provided, THEN the system SHALL reject the request.


### Pagination Rules

THE system SHALL divide the todo list into pages. Each page SHALL contain a fixed number of todos.

WHEN a user requests a specific page, the system SHALL return only the todos belonging to that page.


### Edit History Recording Rules

### Only Changed Fields Are Recorded

WHEN a user edits a todo and saves the changes, the system SHALL record only the fields that were actually modified in the edit history entry. Fields that remain unchanged SHALL NOT be recorded.

For each edit, the system determines which of the following fields differ from their previous values and records snapshots for only those fields:

- Title
- Description
- Start date
- Due date

If none of the editable fields changed, no edit history entry SHALL be created.


## EditHistory Rules

Every time a todo is edited, a history entry is automatically created. Each entry records the exact moment the edit was made. The entry captures a snapshot of what each field was changed to, but only for fields that actually changed during that edit. The title snapshot records the new title if the title was modified; the description snapshot records the new description if the description was modified; the start date snapshot records the new start date if the start date was modified; and the due date snapshot records the new due date if the due date was modified. Fields that were not altered in a given edit are not recorded in that history entry. All history entries for a todo are ordered from most recent to oldest, so the latest edit always appears first. When a todo is permanently deleted from the trash, all of its edit history entries are also permanently erased. Edit history is read-only from the user's perspective — users can view the full history of any of their todos but cannot modify or delete individual history entries.

### Automatic History Entry Creation

WHEN a user edits any field of a todo, THE todoApp SHALL automatically create an edit history entry for that edit.

THE todoApp SHALL record the exact date and time the edit was made in each history entry.

### Field Value Recording Rules

THE todoApp SHALL record the new value of the title field in each edit history entry whenever a todo is edited.

THE todoApp SHALL record the new value of the description field in each edit history entry whenever a todo is edited.

THE todoApp SHALL record the new value of the start date field in each edit history entry whenever a todo is edited.

THE todoApp SHALL record the new value of the due date field in each edit history entry whenever a todo is edited.

Each history entry SHALL contain the complete set of field values as they exist immediately after the edit, regardless of which specific fields were changed.

A history entry SHALL still be created when a user submits an edit without altering any values, recording the unchanged field values alongside the edit timestamp.

### History Entry Ordering

THE todoApp SHALL sort edit history entries from most recent to oldest (most recent first).

The most recent edit SHALL always appear first when viewing a todo's edit history.

### Cascade Deletion on Permanent Todo Removal

WHEN a todo is permanently deleted from the trash, THE todoApp SHALL permanently delete all edit history entries associated with that todo.

IF a todo has been soft-deleted and resides in the trash, THEN its edit history entries SHALL be preserved until the todo is permanently deleted.

### Edit History Access

Users SHALL be able to view the full edit history of any todo they own.

THE todoApp SHALL NOT allow users to modify any edit history entry.

THE todoApp SHALL NOT allow users to individually delete any edit history entry.

Edit history entries SHALL be read-only from the user's perspective.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering by Completion Status

THE system SHALL support filtering the todo list by completion status with exactly three options: all todos, only complete todos, and only incomplete todos.

WHEN a user applies a completion status filter, THE system SHALL return only the todos matching the selected filter from the user's own todo list.

IF no filter is specified by the user, THEN THE system SHALL default to showing all todos.

Filtering by completion status applies only to the active todo list, not to the trash list.


### Sorting Rules

THE system SHALL support sorting the todo list by the following fields: creation date, start date, and due date.

WHEN sorting by creation date, THE system SHALL support two orderings: newest first and oldest first.

WHEN sorting by start date, THE system SHALL support two orderings: earliest first and latest first. Todos without a start date SHALL appear at the end of the results, regardless of the selected sort direction.

WHEN sorting by due date, THE system SHALL support two orderings: earliest first and latest first. Todos without a due date SHALL appear at the end of the results, regardless of the selected sort direction.

IF no sort option is specified by the user, THEN THE system SHALL apply a default sort of creation date, newest first.

Sorting rules apply only to the active todo list, not to the trash list.


### Pagination Rules

THE system SHALL paginate the todo list so that users can browse a large number of todos in manageable portions.

THE system SHALL paginate the trash list so that users can browse a large number of deleted todos in manageable portions.

IF the user requests a page number that exceeds the total number of available pages, THEN THE system SHALL return an empty list rather than an error.

Pagination SHALL be applied after any active filtering and sorting, so that each page respects the user's current filter and sort selections.


# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Error Scenarios

If a user attempts to log in with an email address that is not associated with any registered account, the system shall reject the login attempt. The user receives a message indicating that the credentials are invalid. The system does not disclose whether the email or the password was incorrect.

If a user provides a valid email address but an incorrect password, the system shall reject the login attempt. The user receives a message indicating that the credentials are invalid.

If a guest attempts to access any feature that requires authentication, the system shall reject the request. The guest must register or log in before proceeding.

### Registration Error Scenarios

If a guest attempts to sign up with an email address that is already registered, the system shall reject the registration. The user receives a message indicating that the email is already in use.

If a guest attempts to sign up without providing an email address, a password, or both, the system shall reject the registration. The user receives a message indicating which required fields are missing.

If a guest provides a password that is empty or otherwise invalid according to the password rules defined in User Rules, the system shall reject the registration and inform the user.

### Todo Access Error Scenarios

If a member requests a single todo that does not exist, the system shall reject the request. The user receives a message indicating that the todo was not found.

If a member requests a single todo that belongs to a different user, the system shall reject the request as if the todo does not exist. The user receives a message indicating that the todo was not found. The system does not disclose the existence of another user's todos.

If a member requests their todo list and they have no todos, the system returns an empty list with pagination metadata indicating zero total items. This is not an error condition — it is a valid empty result.

### Todo Operation Error Scenarios

If a member attempts to edit a todo that does not exist, the system shall reject the request. The user receives a message indicating that the todo was not found.

If a member attempts to edit a todo that belongs to a different user, the system shall reject the request. The user receives a message indicating that the todo was not found.

If a member attempts to edit a todo and provides an empty title, the system shall reject the edit. The user receives a message indicating that the title is required and cannot be empty.

If a member attempts to set a due date that is earlier than the start date on the same todo, the system shall reject the operation. The user receives a message indicating that the due date must not precede the start date.

When a member successfully edits a todo, only the fields that were actually changed are recorded in the edit history. Fields that remain unchanged are not recorded.

If a member attempts to mark a todo as complete that is already complete, the system shall accept the request without error — the todo remains complete (idempotent operation).

If a member attempts to mark a todo as incomplete that is already incomplete, the system shall accept the request without error — the todo remains incomplete (idempotent operation).

If a member attempts to complete, uncomplete, or edit a todo that is currently in the trash (soft-deleted), the system shall reject the request. The user receives a message indicating that the todo does not exist or is not available for modification.

If a member attempts to delete a todo that does not exist, the system shall reject the request. The user receives a message indicating that the todo was not found.

If a member attempts to delete a todo that belongs to a different user, the system shall reject the request. The user receives a message indicating that the todo was not found.

If a member attempts to restore a todo from the trash that does not exist or is not in the trash, the system shall reject the request. The user receives a message indicating that the todo was not found in the trash.

If a member attempts to permanently delete a todo from the trash that does not exist or is not in the trash, the system shall reject the request. The user receives a message indicating that the todo was not found in the trash.

### Account Management Error Scenarios

If a member attempts to change their password and provides an incorrect current password, the system shall reject the change. The user receives a message indicating that the current password is incorrect.

If a member attempts to delete their account while still authenticated, the system shall process the deletion. All todos belonging to the user — including those in the trash — are permanently deleted along with their edit histories. After successful deletion, the user is logged out and can no longer access the system.

If a guest who is not authenticated attempts to access the password change or account deletion features, the system shall reject the request. The guest must log in first.