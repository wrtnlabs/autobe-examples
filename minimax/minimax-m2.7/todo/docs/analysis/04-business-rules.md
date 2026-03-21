**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address and a password when signing up. Both email and password are required fields and cannot be empty. Each email address must be unique across the system to prevent duplicate accounts. Users can change their password at any time after logging in. Each user profile requires a display name, which is a required text field. Display names can be updated by the user at any time. When a user deletes their account, all associated data including todos and trash items are permanently removed from the system. The system does not allow email addresses to be changed after account creation.

### Email Uniqueness Constraint

When a user attempts to sign up, the system must verify that the provided email address is not already registered in the system. If the email address matches an existing account, the signup request must be rejected with an appropriate error message indicating that the email is already in use.

### Password Requirement at Signup

THE system SHALL require both an email address and a password when a user signs up for an account. The email field must not be empty, and the password field must not be empty. If either field is missing or blank, the signup request must be rejected.

### Display Name Requirement

THE system SHALL require each user to provide a display name when creating their profile. The display name must not be empty. Users may update their display name at any time after account creation, but the display name can never be left blank.

### Account Deletion Cascade

THE system SHALL permanently delete all associated data when a user deletes their account. This deletion must include all todos created by the user, including todos currently in the trash. The deletion must also include all edit history entries associated with those todos. There must be no way to recover any of this data after account deletion is confirmed.

### Email Immutability

THE system SHALL prevent users from changing their email address after account creation. Once an account is created with an email address, that email address is permanent and immutable. Any attempt to modify the email field must be rejected.

### Password Change Operation

THE system SHALL allow a logged-in user to change their password at any time. The user must provide their current password for verification before a new password can be set. Both the current password and the new password must be non-empty values.

### User Account Validation Summary

User account validation rules define the constraints for user data integrity.

- Email addresses must be provided during signup and must be unique across the system
- Passwords must be provided during signup and must be non-empty
- Display names must be provided and must be non-empty
- Email addresses cannot be modified after account creation
- Password changes require verification of the current password
- Account deletion results in permanent removal of all associated data

## Todo Rules

Todo items require a title field that cannot be empty when creating or updating. The description field is optional and may be left blank. Start date and due date are both optional date fields that can be set or cleared. When a todo is first created, its completion status defaults to incomplete. The title must contain actual text content; whitespace-only titles are not valid. Todos without a start date are treated as having no start date, which affects sorting behavior. Todos without a due date are treated as having no due date, which affects sorting behavior. Every todo belongs to exactly one user and cannot exist without an owner.

### Todo Title Requirement

THE system SHALL require that every todo has a non-empty title.

Whitespace-only titles are not valid. A title consisting only of spaces, tabs, or other whitespace characters shall be rejected as invalid.

When validating a title, the system SHALL trim leading and trailing whitespace before checking whether content exists.

If a user attempts to create or update a todo without providing a valid title, the system SHALL reject the request and report that a title is required.

### Description Field Optionality

THE system SHALL treat the description field as optional.

Users MAY provide a description when creating or editing a todo. Users MAY also leave the description empty or blank.

An empty description is a valid state and shall be stored without error.

When viewing a todo with an empty description, the system SHALL display an empty description area rather than indicating an error.

### Start Date Optionality

THE system SHALL treat the start date field as optional.

Users MAY provide a start date when creating or editing a todo. Users MAY also leave the start date unset.

When the start date is not set, the system SHALL treat the todo as having no start date.

If a user clears an existing start date, the system SHALL accept this change and the todo shall have no start date thereafter.

### Due Date Optionality

THE system SHALL treat the due date field as optional.

Users MAY provide a due date when creating or editing a todo. Users MAY also leave the due date unset.

When the due date is not set, the system SHALL treat the todo as having no due date.

If a user clears an existing due date, the system SHALL accept this change and the todo shall have no due date thereafter.

### Default Completion Status

THE system SHALL set the completion status to incomplete when a todo is first created.

A newly created todo shall always start in the incomplete state, regardless of what other fields are set.

The completion status can be changed later through explicit complete or incomplete actions initiated by the user.

### Todo Ownership Requirement

THE system SHALL require that every todo has an owner.

A todo cannot exist without being associated with a user account. The owner is set automatically when the todo is created and cannot be changed afterwards.

Users can only create todos that belong to their own account. A user cannot create a todo on behalf of another user.

When a user account is deleted, all todos owned by that user are permanently deleted as well.

### Sorting Behavior for Todos Without Start Date

WHEN sorting todos by start date in ascending order, THE system SHALL place todos without a start date after all todos that have a start date.

WHEN sorting todos by start date in descending order, THE system SHALL place todos without a start date after all todos that have a start date.

Todos without a start date shall always appear at the end of the sorted list, regardless of sort direction.

### Sorting Behavior for Todos Without Due Date

WHEN sorting todos by due date in ascending order, THE system SHALL place todos without a due date after all todos that have a due date.

WHEN sorting todos by due date in descending order, THE system SHALL place todos without a due date after all todos that have a due date.

Todos without a due date shall always appear at the end of the sorted list, regardless of sort direction.

## TodoEditHistory Rules

Edit history entries are created automatically whenever a todo is modified by its owner. Each history entry records the timestamp when the edit occurred. A history entry may contain a title value if the title was changed during that edit; if the title was not changed, the title field in the history entry is not recorded. Similarly, description changes are recorded only when the description value differs from its previous state. Start date changes are captured in history only when the start date was modified. Due date changes are captured in history only when the due date was modified. History entries are immutable once created and cannot be modified or deleted by users. When a todo is permanently deleted from trash, all associated history entries are also permanently deleted.

### History Entry Creation

WHEN a user edits a todo that they own, THEN the system SHALL automatically create a history entry to record the edit.

WHEN a user saves changes to a todo title, description, start date, or due date, THEN a history entry SHALL be created capturing the state of those fields at the time of the edit.

WHEN a user edits a todo but makes no actual changes to any field, THEN no history entry SHALL be created.

WHEN a todo is created, THEN no initial history entry SHALL be created.

### Timestamp Recording

EACH history entry SHALL record the exact date and time when the edit was made.

The timestamp SHALL represent when the user saved the edit, not when the edit began.

History entries SHALL be sortable by their timestamp in descending order (most recent first).

### Title Change Recording

IF the todo title was changed during an edit, THEN the history entry SHALL record the new title value.

IF the todo title was not changed during an edit, THEN the history entry SHALL NOT record a title value for that field.

WHEN a title change is recorded, the history entry SHALL store the complete title as it existed after the edit was saved.

### Description Change Recording

IF the todo description was changed during an edit, THEN the history entry SHALL record the new description value.

IF the todo description was not changed during an edit, THEN the history entry SHALL NOT record a description value for that field.

IF the user cleared a description that previously had content, this SHALL be treated as a change and SHALL be recorded.

### Start Date Change Recording

IF the todo start date was changed during an edit, THEN the history entry SHALL record the new start date value.

IF the todo start date was not changed during an edit, THEN the history entry SHALL NOT record a start date value for that field.

IF the user removed a start date that was previously set, this SHALL be treated as a change and SHALL be recorded.

IF the user set a start date where none was previously set, this SHALL be treated as a change and SHALL be recorded.

### Due Date Change Recording

IF the todo due date was changed during an edit, THEN the history entry SHALL record the new due date value.

IF the todo due date was not changed during an edit, THEN the history entry SHALL NOT record a due date value for that field.

IF the user removed a due date that was previously set, this SHALL be treated as a change and SHALL be recorded.

IF the user set a due date where none was previously set, this SHALL be treated as a change and SHALL be recorded.

### History Entry Immutability

ONCE a history entry is created, it SHALL be immutable and SHALL NOT be modified.

Users SHALL NOT be able to edit, delete, or otherwise modify any history entry.

System administrators SHALL NOT be able to manually alter history entries.

The immutability of history entries ensures the integrity of the edit audit trail.

### History Deletion on Permanent Todo Deletion

WHEN a todo is permanently deleted from the trash, THEN all associated history entries for that todo SHALL be permanently deleted.

The deletion of history entries SHALL occur atomically with the todo deletion.

There SHALL be no ability to restore history entries after a permanent deletion.

IF a todo is restored from trash, its history entries SHALL also be restored with it.

### History Access and Visibility

USERS SHALL be able to view the full edit history of any todo they own.

USERS SHALL NOT be able to view the edit history of todos owned by other users.

The edit history SHALL display entries sorted from most recent to oldest.

Each history entry SHALL clearly show which fields were changed in that edit.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering by Completion Status

Users can apply filters to their todo list to narrow down displayed results based on specific criteria.

When a user selects a completion status filter, the system displays only todos matching that filter. The available filter options are:

- All todos: displays every todo belonging to the user
- Only complete todos: displays todos that have been marked as complete
- Only incomplete todos: displays todos that have not been marked as complete

The filter applies to the current view (either the normal todo list or the trash view). When the user changes the filter, the list updates to show only todos matching the selected criteria.

The current filter selection persists until the user changes it or logs out.

### Sorting Options

Users can change the order in which their todos are displayed by selecting a sorting option.

The available sorting options are:

- Creation date, newest first: todos appear with the most recently created at the top
- Creation date, oldest first: todos appear with the earliest created at the top
- Start date, earliest first: todos appear with the earliest start date at the top
- Start date, latest first: todos appear with the most recent start date at the top
- Due date, earliest first: todos appear with the soonest due date at the top
- Due date, latest first: todos appear with the furthest due date at the top

When sorting by start date, todos that do not have a start date assigned appear at the end of the list regardless of sort direction.

When sorting by due date, todos that do not have a due date assigned appear at the end of the list regardless of sort direction.

The current sort selection persists until the user changes it or logs out.

### Pagination of Lists

The system presents todo lists in segments to avoid overwhelming users with large amounts of data.

When viewing the todo list or the trash list, the system displays a subset of todos along with navigation controls to access additional segments.

Users can navigate between segments using previous and next controls when available. The system indicates the current position within the total set of todos.

Pagination applies independently to the normal todo list and the trash list. Changing pages in one view does not affect the other.

When filters or sorting options are changed, the list returns to the first segment.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Todo Not Found Error

When a user attempts to perform an operation on a todo that does not exist, the system must reject the request and return an appropriate error message indicating the todo could not be found.

**Examples of this error scenario:**
- Attempting to view details of a todo using an identifier that does not correspond to any existing todo
- Attempting to edit a todo that has been permanently deleted
- Attempting to complete or delete a todo that was never created

The system must not reveal whether the identifier format is valid or if the todo existed before, to prevent enumeration attacks.

### Unauthorized Todo Access Error

When a user attempts to access, view, modify, or delete a todo that belongs to another user, the system must reject the request and return an error message indicating access is denied.

**Examples of this error scenario:**
- Attempting to view the details of another user's todo
- Attempting to edit the title, description, or dates of another user's todo
- Attempting to mark another user's todo as complete or incomplete
- Attempting to delete another user's todo
- Attempting to view the edit history of another user's todo
- Attempting to restore or permanently delete another user's todo from the trash

The system must not provide any indication that the requested todo exists or belonged to another user.

### Unauthenticated Access Error

When a user attempts to perform an operation that requires authentication while being unauthenticated, the system must reject the request and return an error message indicating authentication is required.

**Examples of this error scenario:**
- Attempting to create a todo without being logged in
- Attempting to view the todo list without being logged in
- Attempting to edit a todo without being logged in
- Attempting to delete a todo without being logged in
- Attempting to access the trash without being logged in
- Attempting to restore a todo without being logged in

### Missing Todo Title Error

When a user attempts to create a new todo without providing a title, the system must reject the request and return an error message indicating that a title is required.

**This error applies only to todo creation.** Edits to existing todos do not require any specific field to be provided.

### Invalid Date Range Error

When a user attempts to set a due date on a todo that is earlier than the start date, the system must reject the request and return an error message indicating that the due date cannot be earlier than the start date.

**Examples of this error scenario:**
- Setting a due date to yesterday while the start date is today
- Setting a start date to next week while the due date is this week

This validation applies to both creating a new todo and editing an existing todo.

### Permanently Deleted Todo Error

When a user attempts to access, modify, or delete a todo that has been permanently deleted from the trash, the system must reject the request and return an error message indicating the todo could not be found.

**Examples of this error scenario:**
- Attempting to view the details of a permanently deleted todo
- Attempting to edit a permanently deleted todo
- Attempting to complete or uncomplete a permanently deleted todo
- Attempting to view the edit history of a permanently deleted todo

Permanently deleted todos and their associated edit history are removed from the system and cannot be recovered or accessed.

### Todo Not Found in Trash Error

When a user attempts to restore a todo from the trash that has already been permanently deleted, the system must reject the request and return an error message indicating the todo could not be found in the trash.

**This error scenario is distinct from the general "todo not found" error** because it specifically relates to the trash view where users expect to find their deleted items.

### Invalid Operation for Current State Error

When a user attempts to perform an operation that is not valid for a todo in its current state, the system must reject the request and return an appropriate error message.

**Examples of this error scenario:**
- Attempting to restore a todo that is not currently in the trash (it has already been restored or was never deleted)
- Attempting to move a todo to the trash when it is already in the trash

The system must validate state transitions before executing any operation.

### System Failure Handling

When the system encounters an unexpected error while processing a user request, it must handle the situation gracefully and return a generic error message to the user without exposing internal details.

**Examples of this failure case:**
- Database connection failure during a save operation
- Unexpected data corruption detected during retrieval
- System resource exhaustion during processing

The system must log detailed error information for debugging purposes while presenting users with a user-friendly message indicating something went wrong and suggesting they try again later.