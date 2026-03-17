**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

A user account is uniquely identified by email address, meaning no two accounts may share the same email. Email is a required field and must be provided at sign-up. Password is also required at sign-up and is stored in a hashed form — the plain-text password is never retained. When a user changes their password, the new password replaces the old credential entirely. Deleting a user account triggers the permanent removal of all associated todos, including any todos currently in the trash and their associated edit histories. There is no grace period or recovery option once an account is deleted. Each user account is independently owned — there is no concept of account sharing or delegation in this application.

### Email Uniqueness and Registration Requirements

Every user account is uniquely identified by its email address. No two accounts in the system may share the same email address. If a sign-up request is submitted with an email address that already belongs to an existing account, the request is rejected.

Email is a required field at sign-up. If a sign-up request is submitted without an email address, the request is rejected.

Password is also a required field at sign-up. If a sign-up request is submitted without a password, the request is rejected.

### Password Change

A member may change their password at any time. When a password change is submitted, the new password completely replaces the previously stored credential. The old password is no longer valid for authentication once the change is applied.

The new password must be provided in the change request. If the new password is absent, the request is rejected.

### Account Deletion and Cascading Removal

When a user deletes their account, all data associated with that account is permanently and immediately removed from the system. This cascading removal includes:

- Every todo owned by the user, regardless of its current state (active or in the trash)
- Every edit history entry associated with any of those todos

There is no partial deletion — if the account is deleted, all of the above is deleted entirely and unconditionally.

There is no grace period before the deletion takes effect. Once a user confirms account deletion, the removal is permanent and immediate.

There is no recovery option after an account has been deleted. The system does not retain any of the deleted data, and neither the user nor any other party can restore the account or its associated todos and history entries.

Account deletion does not affect any other user's data. Only the data belonging to the deleted account is removed.

## UserProfile Rules

Every user has exactly one profile, and that profile is created automatically when the user account is created. The profile contains a display name, which is the only editable profile field available to users. Display name is a user-chosen visible name that represents the user within the application. Users may update their display name at any time. No user may view or access another user's profile, as the application is entirely private. There is no public profile page or any mechanism for sharing profile information between users.

### Profile Creation and Uniqueness

WHEN a new user account is created, THE system SHALL automatically create exactly one profile associated with that account.

THE system SHALL ensure that every user account has exactly one profile — no more, no fewer.

IF a user account already has a profile, THEN THE system SHALL reject any attempt to create a second profile for the same account.

IF a user account is created without a profile being generated, THEN THE system SHALL treat this as an error state and block all profile-dependent operations until the profile exists.

WHEN a user account is permanently deleted, THE system SHALL also permanently delete the associated profile.

### Display Name Rules

THE system SHALL recognize display name as the only user-editable field on a profile.

THE system SHALL require that a display name be present on every profile; a profile without a display name is not valid.

WHEN a user submits a request to update their display name, THE system SHALL replace the existing display name with the new value.

IF a user submits a display name update with an empty or blank value, THEN THE system SHALL reject the request.

THE system SHALL allow a user to change their display name at any time while their account is active.

THE system SHALL NOT impose any constraint that makes display names unique across users; two users may share the same display name.

### Profile Privacy and Access

THE system SHALL restrict profile access so that each user may only view and edit their own profile.

IF a user attempts to read, access, or modify another user's profile, THEN THE system SHALL deny the request.

THE system SHALL NOT expose any public profile page or public-facing view of a user's profile information.

THE system SHALL NOT provide any mechanism for a user to share their profile information with another user.

THE system SHALL NOT allow any user to look up another user by display name, email, or any other profile attribute.

WHILE a user is authenticated, THE system SHALL only return that user's own profile data in response to any profile query.

## Todo Rules

A todo must have a title, which is a required field; a todo cannot be created or saved without a title. The description field is optional and may be left empty. Start date and due date are both optional fields that may be omitted or left blank. When a todo is first created, its completion status is always set to incomplete by default — no todo starts as complete. A todo belongs to exactly one user and cannot be transferred to another user. Soft-deleted todos are hidden from the normal todo list but remain in the system until permanently deleted. Permanently deleting a todo also removes all of its associated edit history entries. Every time a todo's title, description, start date, or due date is edited, a new history entry must be recorded to capture the change.

### Todo Field Validation Rules

THE system SHALL require a title when creating or saving a todo.

IF a todo creation or update request does not include a title, THEN THE system SHALL reject the request.

THE system SHALL permit the description field to be empty or omitted on creation and on any subsequent edit.

THE system SHALL permit the start date field to be empty or omitted on creation and on any subsequent edit.

THE system SHALL permit the due date field to be empty or omitted on creation and on any subsequent edit.

WHEN a start date and a due date are both provided on a todo, THE system SHALL not impose any ordering constraint between them unless explicitly stated elsewhere in this specification.

THE system SHALL allow any previously set start date or due date to be cleared (removed) by an edit, treating the cleared value as absent.

### Todo Creation Defaults and Ownership

WHEN a new todo is created, THE system SHALL set its completion status to incomplete regardless of any other input.

IF a creation request attempts to set a newly created todo as complete, THEN THE system SHALL ignore that input and create the todo as incomplete.

THE system SHALL associate every todo with exactly one user — the user who created it.

THE system SHALL NOT permit a todo to be transferred to a different user after creation.

THE system SHALL NOT permit a todo to exist without an owning user.

### Soft Deletion and Permanent Deletion

WHEN a user deletes a todo, THE system SHALL mark it as deleted without removing it from storage (soft delete).

WHILE a todo is soft-deleted, THE system SHALL exclude it from the user's normal todo list.

WHILE a todo is soft-deleted, THE system SHALL include it in the user's trash list.

WHEN a user permanently deletes a todo from the trash, THE system SHALL remove the todo and all of its associated edit history entries from the system.

IF a todo is permanently deleted, THEN THE system SHALL ensure no edit history entries for that todo remain.

WHEN a user restores a todo from the trash, THE system SHALL remove the deleted status from the todo so that it reappears in the normal todo list and no longer appears in the trash.

### Edit History Recording Obligation

WHEN a user edits any of a todo's fields — title, description, start date, or due date — THE system SHALL automatically create a new edit history entry capturing the change.

THE system SHALL record the timestamp of the edit in every history entry.

THE system SHALL record the new value of the title in the history entry IF the title was changed as part of that edit.

THE system SHALL record the new value of the description in the history entry IF the description was changed as part of that edit.

THE system SHALL record the new value of the start date in the history entry IF the start date was changed as part of that edit.

THE system SHALL record the new value of the due date in the history entry IF the due date was changed as part of that edit.

THE system SHALL NOT create an edit history entry when a user only toggles the completion status of a todo without changing any of the above fields.

THE system SHALL NOT allow users to manually create, modify, or delete edit history entries — history entries are system-managed exclusively.

## TodoEditHistory Rules

A history entry is automatically created each time a todo is edited; users cannot manually create, modify, or delete individual history entries. Each history entry captures the timestamp of when the edit was made. A history entry records only the fields that were actually changed: the new title if the title was changed, the new description if the description was changed, the new start date if the start date was changed, and the new due date if the due date was changed. Fields that were not changed in a given edit are not recorded in that history entry. History entries are immutable once created — no editing or retroactive correction of history is allowed. When a todo is permanently deleted, all of its history entries are also permanently deleted. History entries are associated with exactly one todo and cannot be shared across todos.

### Automatic History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a new history entry associated with that todo.

THE system SHALL record the exact timestamp of when the edit was made in every history entry.

WHEN a history entry is created, THE system SHALL ensure it is linked to exactly one todo and cannot be associated with any other todo.

THE system SHALL NOT provide any mechanism for users to manually create a history entry.

THE system SHALL NOT allow users to delete individual history entries.

IF a user attempts to directly create or delete a history entry, THEN THE system SHALL reject the request.

### Selective Field Recording in History Entries

WHEN a todo is edited, THE system SHALL record only the fields that were actually changed in the resulting history entry.

IF the title was changed during an edit, THEN THE system SHALL record the new title value in the history entry.

IF the description was changed during an edit, THEN THE system SHALL record the new description value in the history entry.

IF the start date was changed during an edit, THEN THE system SHALL record the new start date value in the history entry.

IF the due date was changed during an edit, THEN THE system SHALL record the new due date value in the history entry.

IF a field was not changed during an edit, THEN THE system SHALL NOT record that field in the resulting history entry.

THE system SHALL allow a history entry to contain changes for one or more fields, depending on which fields the user modified in a single edit operation.

### Immutability and Lifecycle of History Entries

THE system SHALL treat all history entries as immutable once they have been created — no user or system process may alter the content of an existing history entry.

THE system SHALL NOT allow retroactive correction or modification of any history entry after it has been saved.

WHEN a todo is permanently deleted, THE system SHALL also permanently delete all history entries that belong to that todo.

IF a todo is soft-deleted (moved to trash) but not yet permanently deleted, THEN THE system SHALL retain all of its history entries.

WHEN a soft-deleted todo is restored from the trash, THE system SHALL preserve all of its previously recorded history entries intact.

IF a todo is permanently deleted from the trash, THEN THE system SHALL delete its history entries as part of the same operation, leaving no orphaned history records.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

THE system SHALL allow members to filter their todo list by completion status.

THE system SHALL support three filter modes for the todo list:
- All todos (no filter applied)
- Only completed todos
- Only incomplete todos

WHEN a member applies a completion status filter, THE system SHALL return only the todos matching the selected status.

WHEN no filter is specified, THE system SHALL return all todos regardless of completion status.

THE system SHALL apply the active filter consistently across all pages when the list is paginated.

IF a member requests a filtered list with no matching todos, THEN THE system SHALL return an empty list rather than an error.

THE system SHALL only apply filtering to the member's own todos; todos belonging to other users SHALL never appear in any filtered result.

THE system SHALL NOT expose a completion filter on the trash list, as the trash list contains only deleted todos regardless of completion status.

### Sorting Rules

THE system SHALL allow members to sort their todo list by the following criteria:
- Creation date, newest first or oldest first
- Start date, earliest first or latest first
- Due date, earliest first or latest first

WHEN a member sorts by start date, THE system SHALL place todos that have no start date at the end of the list, after all todos with a start date.

WHEN a member sorts by due date, THE system SHALL place todos that have no due date at the end of the list, after all todos with a due date.

WHEN no sort order is specified, THE system SHALL apply a default sort order (creation date, newest first).

THE system SHALL apply the active sort order consistently across all pages when the list is paginated.

IF both start date and due date are absent on multiple todos, THEN THE system SHALL maintain a stable relative ordering among those todos at the end of the list.

THE system SHALL apply sorting only to the member's own todo list; the sort criteria SHALL NOT affect the trash list.

### Pagination Rules

THE system SHALL paginate the todo list so that members receive a defined subset of results per page.

THE system SHALL paginate the trash list using the same pagination mechanism as the todo list.

WHEN a member navigates to a page, THE system SHALL return the todos corresponding to that page position within the currently active filter and sort order.

IF a member requests a page number beyond the available range, THEN THE system SHALL return an empty list rather than an error.

THE system SHALL apply active filter and sort settings before determining page contents, so that pagination reflects only the filtered and sorted set of todos.

THE system SHALL return the total number of matching items alongside each paginated response so that members can understand how many pages exist.

WHEN a member deletes a todo while browsing a paginated list, THE system SHALL remove that todo from the active list and it SHALL no longer appear on any page of the normal todo list.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Error Scenarios

IF a guest attempts to sign up with an email address that is already registered to an existing account, THEN THE system SHALL reject the registration request.

IF a guest submits a sign-up request without providing an email address, THEN THE system SHALL reject the registration request.

IF a guest submits a sign-up request without providing a password, THEN THE system SHALL reject the registration request.

IF a guest attempts to log in with an email address that does not match any registered account, THEN THE system SHALL reject the login request.

IF a guest attempts to log in with a correct email address but an incorrect password, THEN THE system SHALL reject the login request.

IF a member attempts to change their password but provides a current password that does not match the one stored on their account, THEN THE system SHALL reject the password change request.

IF a member attempts to change their password without providing a new password, THEN THE system SHALL reject the password change request.

IF a member attempts to delete their account but provides a password that does not match the one stored on their account, THEN THE system SHALL reject the account deletion request.

### Todo Creation and Editing Error Scenarios

IF a member submits a request to create a todo without providing a title, THEN THE system SHALL reject the creation request.

IF a member submits a request to create a todo where the due date is set to a date earlier than the start date, THEN THE system SHALL reject the creation request.

IF a member submits a request to edit a todo without providing a title, THEN THE system SHALL reject the edit request.

IF a member submits a request to edit a todo where the due date is set to a date earlier than the start date, THEN THE system SHALL reject the edit request.

IF a member submits a request to create or edit a todo where only a due date is provided and no start date is given, THEN THE system SHALL accept the request, as a due date without a start date is permitted.

IF a member submits a request to edit a todo but no fields have been changed from their current values, THEN THE system SHALL still record a history entry reflecting the submission.

### Todo Access and Ownership Error Scenarios

IF a member attempts to view, edit, complete, delete, or access the edit history of a todo that does not exist, THEN THE system SHALL reject the request.

IF a member attempts to view, edit, complete, delete, or access the edit history of a todo that belongs to another user, THEN THE system SHALL reject the request as if the todo does not exist.

IF a member attempts to view the todo list, the system SHALL only return todos that belong to that member, regardless of any query parameters supplied.

IF a guest attempts to access any todo resource, THEN THE system SHALL reject the request.

### Trash and Restore Error Scenarios

IF a member attempts to delete a todo that has already been soft-deleted and is currently in the trash, THEN THE system SHALL reject the deletion request.

IF a member attempts to restore a todo that is not currently in the trash, THEN THE system SHALL reject the restore request.

IF a member attempts to permanently delete a todo that is not currently in the trash, THEN THE system SHALL reject the permanent deletion request.

IF a member attempts to access the trash list or perform any trash operation on a todo belonging to another user, THEN THE system SHALL reject the request as if the item does not exist.

IF a member attempts to permanently delete a todo from the trash, THEN THE system SHALL also permanently delete all edit history entries associated with that todo, with no possibility of recovery.