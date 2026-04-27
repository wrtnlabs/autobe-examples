**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up with an email address and a password. The email address must be unique across all accounts — no two users can register with the same email. The password is required at sign-up. When logging in, the system verifies that the email and password match before allowing access. Users can change their password by first providing their current password for verification, then setting a new password. Users can delete their own account, which permanently removes the account along with all associated todos and edit history. Each user has a display name that can be modified after account creation. The display name is optional, but if provided it cannot be empty or consist only of whitespace. Users cannot browse or access other users' profiles since every account is private.

### Email Uniqueness Constraint

Each user signs up with an email address. The system SHALL verify that the provided email address is not already in use by another account. If another account already uses the same email address, the registration request SHALL be rejected.

### Password Verification Rules

When a user logs in, the system SHALL verify that the provided email address matches an existing account and that the provided password matches the password stored for that account. If the email does not exist or the password does not match, the login attempt SHALL be rejected.

When a user changes their password, the system SHALL require the current password for verification before accepting the new password. If the current password does not match, the password change request SHALL be rejected.

### Display Name Validation

A display name is optional at account creation. If provided, it MUST contain at least one non-whitespace character. A display name consisting only of whitespace characters SHALL be rejected. When a user edits their display name, they may change it to any valid display name, but setting it to whitespace-only content SHALL be rejected.

### Account Deletion Consequences

When a user deletes their account, the system SHALL permanently remove the account along with all associated data including:
- The user's profile and authentication credentials
- All todos owned by the user (including those in the trash)
- All edit history entries for those todos

Account deletion is irreversible — once processed, the user cannot recover their account, todos, or any related data.

### Account Privacy Restriction

All user profiles are private. The system SHALL NOT provide any mechanism for a user to browse, search for, access, or view another user's profile information — including their email address and display name. When a user is logged in, the system SHALL only present data belonging to that user. Any request to access another user's personal data SHALL be rejected.

## Todo Rules

A todo must have a title, and the title cannot be empty or consist only of whitespace. The description, start date, and due date are optional and can be left unset when creating or editing a todo. When a new todo is created, it starts in an incomplete state by default. Users can freely toggle a todo between complete and incomplete with no restrictions on how many times this can be done. When editing a todo, the title remains required — it cannot be cleared. Start dates and due dates represent calendar dates without time components. When sorting todos by start date, todos that have no start date appear at the end of the list. Similarly, when sorting by due date, todos without a due date appear at the end. Users can filter their todo list to show all todos, only complete todos, or only incomplete todos. Deleting a todo performs a soft delete — it moves to the trash instead of being permanently removed. From the trash, users can restore a todo back to the normal list, or permanently delete it, which also removes its edit history.

### Title Validation

A todo shall have a title, and the title cannot be empty or consist only of whitespace characters. WHEN a user creates a todo, THE system SHALL require a non-empty, non-whitespace title. WHEN a user edits a todo, THE system SHALL require the title to remain non-empty and non-whitespace. IF a user attempts to create or edit a todo with a missing, empty, or whitespace-only title, THEN THE system SHALL reject the request.

### Optional Field Constraints

The description, start date, and due date of a todo are optional. WHEN a user creates or edits a todo, THE system SHALL allow the description, start date, and due date to be left unset. WHEN a user edits a todo, THE system SHALL allow clearing a previously set description, start date, or due date by providing an empty value for that field. A description with no value is treated as unset.

### Default Incomplete State

WHEN a new todo is created, THE system SHALL set its completion status to incomplete by default. WHERE a user attempts to create a todo, THE system SHALL NOT accept the creation if the completion status is set to complete. All newly created todos start in the incomplete state.

### Completion Status Toggle

A user may toggle a todo between the complete and incomplete states freely. THERE SHALL BE no restriction on the number of times a todo can be toggled between complete and incomplete. WHILE a todo is in the complete state, THE system SHALL allow the user to change it to incomplete. WHILE a todo is in the incomplete state, THE system SHALL allow the user to change it to complete. Toggling the completion status SHALL NOT create an edit history entry, as it is separate from editing the todo's title, description, start date, or due date.

### Edit Validation

WHEN a user edits a todo, THE system SHALL enforce the title validation rules defined in Title Validation. WHERE a user edits a todo, THE system SHALL allow modifying any combination of title, description, start date, and due date in a single edit operation. For each modified field, THE system SHALL record the previous value in the edit history before applying the change. Clearing an optional field (description, start date, or due date) is a valid edit operation.

### Date-Only Values

Start dates and due dates represent calendar dates without a time component. WHEN comparing or sorting two dates, THE system SHALL consider only the date value — two todos with the same date SHALL be treated as equal regardless of any time-of-day values. Start dates and due dates are not associated with any timezone, hour, or minute. A date value corresponds to the calendar date only.

### Sort Order for Unset Start Dates

WHEN sorting the todo list by start date, THE system SHALL place todos that have no start date at the end of the sorted list. This rule applies regardless of the sort direction — both earliest-first and latest-first sorting SHALL place unset start date todos at the end. (The full sorting behavior, including user interface controls, is defined in List Browsing Expectations.)

### Sort Order for Unset Due Dates

WHEN sorting the todo list by due date, THE system SHALL place todos that have no due date at the end of the sorted list. This rule applies regardless of the sort direction — both earliest-first and latest-first sorting SHALL place unset due date todos at the end. (The full sorting behavior, including user interface controls, is defined in List Browsing Expectations.)

### Completion Status Filtering

A user may filter the todo list by completion status using three options: all todos, only complete todos, or only incomplete todos. WHEN a user applies a filter, THE system SHALL only display todos matching the selected completion status. WHERE the filter is set to all, THE system SHALL display all active (non-deleted) todos regardless of completion status. (The full filtering behavior, including pagination and user interface, is defined in List Browsing Expectations.)

### Soft Delete Behavior

WHEN a user deletes a todo, THE system SHALL move the todo to a trash state instead of permanently removing it. WHILE a todo is in the trash, THE system SHALL exclude it from the normal todo list view, and it SHALL NOT appear in filtered or sorted views of active todos. A soft-deleted todo SHALL retain all its data — title, description, start date, due date, completion status, and edit history.

### Restore from Trash

WHEN a user restores a deleted todo from the trash, THE system SHALL return the todo to the active todo list. UPON restoration, THE system SHALL preserve all the todo's existing data — title, description, start date, due date, completion status, and edit history — without modification. A restored todo SHALL retain the completion status it had at the time of deletion. Restoring a todo SHALL NOT generate an edit history entry.

### Permanent Delete from Trash

WHEN a user permanently deletes a todo from the trash, THE system SHALL remove the todo and all associated data from the system permanently. This includes the complete edit history of the todo. A permanently deleted todo SHALL NOT be recoverable by any means.

## EditHistory Rules

Every time a user edits a todo, the system automatically creates an edit history entry. Each history entry records the timestamp of when the edit occurred. For fields that were changed, the entry stores only the new value — the title, description, start date, and due date each record what they were changed to. If a field was not modified during an edit, that field is not recorded in the history entry. The edit history is preserved even while the todo is in the trash and is only removed when the todo is permanently deleted. Users can view the complete edit history for any of their todos, with entries sorted from most recent to oldest. The history is read-only — users cannot manually create, modify, or delete individual history entries. Each history entry is permanently associated with its parent todo and cannot be moved or reassigned to a different todo.

### Section 1: Automatic History Entry Creation

WHEN a user edits any field of a todo, THE system SHALL automatically create a new edit history entry for that todo.

WHEN a todo is restored from trash, THE system SHALL NOT create an edit history entry for the restoration action.

WHEN a todo's completion status is toggled (complete/incomplete), THE system SHALL NOT create an edit history entry — only field edits trigger history entries.

### Section 2: Changed Fields Recording

WHEN an edit history entry is created, THE system SHALL record only the fields that were changed during the edit.

IF a field was not modified, THEN THE system SHALL NOT include that field in the history entry.

WHEN the title was changed, THE system SHALL store the previous title value in the history entry.

WHEN the description was changed, THE system SHALL store the previous description value in the history entry.

WHEN the start date was changed, THE system SHALL store the previous start date value in the history entry.

WHEN the due date was changed, THE system SHALL store the previous due date value in the history entry.

IF all four fields (title, description, start date, due date) remain unchanged, THEN THE system SHALL NOT create any history entry.

### Section 3: Timestamp Recording

WHEN an edit history entry is created, THE system SHALL record the timestamp of when the edit occurred.

The timestamp SHALL reflect the exact moment the edit was saved, not when the user began editing.

### Section 4: History Sorting

WHEN a user views the edit history of a todo, THE system SHALL display history entries sorted from most recent first.

The sort order SHALL be based on the recorded timestamp of each entry.

### Section 5: Read-Only History Entries

THE system SHALL treat all edit history entries as read-only.

Users SHALL NOT be able to manually create, modify, or delete individual edit history entries.

The system SHALL reject any attempt to alter a history entry after it has been created.

### Section 6: History Persistence in Trash and Permanent Deletion

WHILE a todo is in the trash, THE system SHALL preserve its complete edit history.

WHEN a todo is permanently deleted from the trash, THE system SHALL also permanently delete all associated edit history entries.

WHEN a user deletes their account, all edit history entries associated with that user's todos SHALL be permanently deleted alongside the todos.

### Section 7: Permanent Association with Parent Todo

Each edit history entry SHALL be permanently associated with the todo that was edited.

History entries SHALL NOT be moved, reassigned, or transferred to a different todo.

IF the parent todo is restored from trash, its history entries SHALL remain associated and accessible.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

THE system SHALL allow users to filter their todo list by completion status.

WHEN a user applies a filter, THE system SHALL display only the todos matching the selected filter.

THE system SHALL support the following filter options:
- "All todos": displays every todo belonging to the user, regardless of completion status
- "Only complete todos": displays only todos marked as complete
- "Only incomplete todos": displays only todos not yet marked as complete

WHEN the user does not select any filter, THE system SHALL default to showing all todos.

WHEN the user switches between filter options, THE system SHALL re-apply pagination starting from the first page.

IF the filter returns no matching todos, THEN THE system SHALL display an empty list to the user.

### Sorting Rules

THE system SHALL allow users to sort their todo list by available sort criteria.

The system SHALL support sorting by the following criteria:
- Creation date (newest first OR oldest first)
- Start date (earliest first OR latest first)
- Due date (earliest first OR latest first)

WHEN the user does not select any sort option, THE system SHALL default to sorting by creation date, newest first.

WHEN sorting by start date:
- Todos that have a start date set SHALL appear before todos without a start date
- Todos without a start date SHALL appear at the end of the sorted list
- Among todos with start dates, they SHALL be ordered according to the selected direction (earliest first or latest first)

WHEN sorting by due date:
- Todos that have a due date set SHALL appear before todos without a due date
- Todos without a due date SHALL appear at the end of the sorted list
- Among todos with due dates, they SHALL be ordered according to the selected direction (earliest first or latest first)

WHEN sorting by creation date, all todos SHALL be included in the sort order since every todo has a creation date.

WHEN the user switches between sort options, THE system SHALL re-apply pagination starting from the first page.

### Pagination Rules

THE system SHALL present paginated lists when the user views their todo list and their trash list.

THE system SHALL display a fixed number of items per page.

WHEN the total number of items exceeds the page size, THE system SHALL split the list across multiple pages.

THE user SHALL be able to navigate between pages to view all items.

WHEN the user is on the first page, navigation to a previous page SHALL not be available.

WHEN the user is on the last page, navigation to the next page SHALL not be available.

IF the user requests a page that does not exist (e.g., page number beyond the last page), THEN THE system SHALL display the last available page.

IF the user requests a page with a non-positive number (zero or negative), THEN THE request SHALL be treated as a request for the first page.

WHEN the user applies a filter or changes the sort order, THE system SHALL reset the pagination to the first page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Authentication Errors

**Duplicate Email Registration**

WHEN a guest attempts to sign up with an email address that is already registered to an existing user, THEN THE system SHALL reject the registration request.

**Invalid Credentials During Login**

WHEN a user attempts to log in with an email address that does not exist in the system, OR with a password that does not match the stored password for the given email, THEN THE system SHALL reject the login request.

**Incorrect Current Password During Password Change**

WHEN a member attempts to change their password but provides a current password that does not match the stored password, THEN THE system SHALL reject the password change request.

**Non-Existent Account Access**

WHEN a guest or member attempts to access any account-related operation (login, password change, account deletion) for an email address that does not exist in the system, THEN THE system SHALL reject the request.

### Todo Creation Errors

**Missing Title**

WHEN a member attempts to create a todo without providing a title, THEN THE system SHALL reject the creation request. The title is a required field and cannot be empty.

**Due Date Precedes Start Date**

WHEN a member creates a todo and both a start date and a due date are provided, and the due date is earlier than the start date, THEN THE system SHALL reject the creation request.

**Invalid Date Format**

WHEN a member provides a start date or due date that is not a valid date, THEN THE system SHALL reject the creation request.

### Todo Access Errors

**Non-Existent Todo**

WHEN a member attempts to view, edit, complete, toggle completion, delete, or restore a todo that does not exist in the system, THEN THE system SHALL reject the request.

**Unauthorized Todo Access**

WHEN a member attempts to view, edit, complete, toggle completion, delete, restore, or permanently delete a todo that belongs to another user, THEN THE system SHALL reject the request. Users can only access their own todos.

**Deleted Todo in Normal List**

WHEN a member attempts to view a deleted todo by accessing it directly outside the trash view, THEN THE system SHALL reject the request. Deleted todos only appear in the trash list.

### Todo Editing and Completion Errors

**Due Date Precedes Start Date on Edit**

WHEN a member edits a todo and sets both a start date and a due date where the due date is earlier than the start date, THEN THE system SHALL reject the edit request.

**Empty Title on Edit**

WHEN a member edits a todo and clears the title or sets it to an empty value, THEN THE system SHALL reject the edit request. The title must always have a value.

**Invalid Date Format on Edit**

WHEN a member edits a todo and provides a start date or due date that is not a valid date, THEN THE system SHALL reject the edit request.

**Completion Toggle on Deleted Todo**

WHEN a member attempts to mark a deleted todo as complete or incomplete, THEN THE system SHALL reject the request. Only active (non-deleted) todos can have their completion status changed.

### Trash Operation Errors

**Restore Non-Existent Deleted Todo**

WHEN a member attempts to restore a deleted todo from the trash that does not exist, THEN THE system SHALL reject the restore request.

**Permanent Delete Non-Existent Todo**

WHEN a member attempts to permanently delete a todo from the trash that does not exist, THEN THE system SHALL reject the permanent deletion request.

**Restore Active Todo**

WHEN a member attempts to restore a todo that is not deleted (active), THEN THE system SHALL reject the restore request.

**Permanent Delete Active Todo**

WHEN a member attempts to permanently delete a todo that is not in the trash, THEN THE system SHALL reject the permanent deletion request.

### List Browsing Errors

**Invalid Pagination Parameters**

WHEN a member provides a page number less than 1, OR a page size less than 1, OR a page size exceeding the maximum allowed limit, THEN THE system SHALL reject the list request.

**Invalid Sort Field**

WHEN a member attempts to sort the todo list by a field that is not supported for sorting (creation date, start date, or due date only), THEN THE system SHALL reject the list request.

**Invalid Sort Direction**

WHEN a member attempts to sort the todo list with a direction that is not recognized (only newest-first, oldest-first, earliest-first, or latest-first are valid), THEN THE system SHALL reject the list request.

**Invalid Filter Value**

WHEN a member provides a filter value for completion status that is not one of the recognized options (all, complete, incomplete), THEN THE system SHALL reject the list request.

**Invalid Filter Combination**

WHEN a member provides a filter parameter that conflicts with itself or is malformed, THEN THE system SHALL reject the list request.

### Account Deletion Errors

**Non-Existent Account Deletion**

WHEN a member attempts to delete an account that does not exist, THEN THE system SHALL reject the deletion request.

**Unauthorized Account Deletion**

WHEN a member attempts to delete another user's account, THEN THE system SHALL reject the deletion request. Users can only delete their own account.