**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address and password when creating an account. The email serves as the unique identifier for login and authentication purposes. Users can update their display name at any time through their profile settings. Password changes require the current password for verification before accepting a new one. When a user deletes their account, the system permanently removes all associated data including todos and trash items. Users cannot access or view other users' profiles or data in this private todo application. Email format must be valid for account registration and login. The display name is optional during account creation but can be added or modified later.

### Email Validation and Uniqueness

Users must provide a valid email address when creating an account. The email address serves as the unique identifier for the user and cannot be duplicated across the system.

When a user attempts to register with an email that already exists in the system, the registration request is rejected.

The email address must be in a valid email format. If the format is invalid, the registration request is rejected.

The same email validation applies during login. Users must provide the exact email address they used during registration.

If a user provides an email address that does not exist in the system during login, the login request is rejected.

Users cannot change their email address after account creation. The email remains the permanent identifier for the account.

### Password Management Rules

Users must provide a password when creating an account. The password is required for account authentication.

When logging in, users must provide both their email address and password. If either credential is missing or incorrect, the login request is rejected.

Users can change their password at any time after logging in. To change the password, the user must provide their current password for verification.

If the current password provided during a password change request is incorrect, the password change is rejected and the existing password remains unchanged.

If the new password is missing or invalid, the password change request is rejected.

### Display Name Editing Rules

Each user has a display name associated with their profile. The display name is optional during account creation.

Users can edit their display name at any time after account creation.

The display name can be changed to any text value, including an empty value to remove it.

Display name changes take effect immediately and are reflected across the user's profile.

### Account Deletion and Data Cascade

Users can delete their own account at any time. Account deletion is a permanent action that cannot be undone.

When a user deletes their account, all data associated with that user is permanently removed. This includes:
- All todos created by the user (including todos in the trash)
- All edit history records for the user's todos (which store the new values of changed fields)
- The user's profile information

The cascade deletion occurs immediately and cannot be reversed. Users should be aware that account deletion results in complete and permanent data loss.

After account deletion, the user's email address becomes available for reuse by new account registrations.

### Profile Privacy and Isolation

This is a private todo application. Users cannot view or access other users' profiles.

Each user's data is completely isolated from all other users. There is no mechanism to view, access, or share another user's todos or profile information.

Users can only see and manage their own data. Any attempt to access another user's data is rejected by the system.

Profile information (display name) is private to each user and is not visible to other users.

## Todo Rules

Every todo requires a title while description, start date, and due date remain optional fields that can be empty. When created, todos default to incomplete status. Users can toggle between complete and incomplete states for any todo they own. All edits to title, description, start date, or due date are tracked in the edit history. Soft deletion removes todos from the normal list but preserves them in the trash. Only the todo owner can view, edit, or delete their todos. Date fields accept any valid date value when provided. The owner relationship is immutable after todo creation and cannot be transferred to another user.

### Todo Title Requirements

WHEN a user creates a todo, THE system SHALL require a title value.

WHEN a user edits a todo, THE system SHALL require that the title remains non-empty.

THE system SHALL reject any todo creation request where the title is missing or empty.

THE system SHALL reject any todo update request where the title is set to empty or whitespace only.

### Optional Todo Fields

THE system SHALL allow users to create todos without a description value.

THE system SHALL allow users to create todos without a start date value.

THE system SHALL allow users to create todos without a due date value.

WHEN a user edits a todo, THE system SHALL allow clearing the description, start date, or due date fields.

THE system SHALL accept empty string values for the description field.

### Todo Completion States

WHEN a todo is created, THE system SHALL set its completion status to incomplete.

WHEN a user marks a todo as complete, THE system SHALL change its completion status from incomplete to complete.

WHEN a user marks a todo as incomplete, THE system SHALL change its completion status from complete to incomplete.

THE system SHALL support only two completion status values: complete and incomplete.

THE system SHALL reject any request to set a completion status to any value other than complete or incomplete.

### Todo Edit History

WHEN a user modifies the title of a todo, THE system SHALL create a new edit history entry.

WHEN a user modifies the description of a todo, THE system SHALL create a new edit history entry.

WHEN a user modifies the start date of a todo, THE system SHALL create a new edit history entry.

WHEN a user modifies the due date of a todo, THE system SHALL create a new edit history entry.

WHEN a user changes the completion status of a todo, THE system SHALL NOT create an edit history entry.

THE system SHALL record the timestamp of each edit in the history entry.

THE system SHALL store the new value for each field that was modified.

### Todo Soft Delete

WHEN a user deletes a todo, THE system SHALL mark it as soft deleted rather than permanently removing it.

THE system SHALL hide soft deleted todos from the normal todo list view.

THE system SHALL preserve all todo data including title, description, dates, and edit history after soft deletion.

WHEN a user restores a soft deleted todo from the trash, THE system SHALL return it to the normal todo list.

WHEN a user permanently deletes a todo from the trash, THE system SHALL remove the todo and all its edit history entries.

### Todo Ownership Rules

THE system SHALL assign the creating user as the owner of each todo at creation time.

THE system SHALL restrict todo viewing to the todo owner only.

THE system SHALL restrict todo editing to the todo owner only.

THE system SHALL restrict todo deletion to the todo owner only.

THE system SHALL NOT allow transfer of todo ownership to another user.

WHEN a user account is deleted, THE system SHALL permanently delete all todos owned by that user.

### Date Field Rules

THE system SHALL accept any valid calendar date for the start date field.

THE system SHALL accept any valid calendar date for the due date field.

THE system SHALL enforce that the due date must be on or after the start date when both values are provided.

THE system SHALL allow past dates, future dates, and current dates for both start date and due date.

WHEN a user sorts todos by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN a user sorts todos by due date, THE system SHALL place todos without a due date at the end of the list.

### Todo Creation Date

WHEN a todo is created, THE system SHALL automatically record its creation date.

THE system SHALL NOT allow users to modify the creation date of a todo.

THE system SHALL include the creation date when displaying todo information in lists and detail views.

### Todo Privacy Rules

THE system SHALL ensure each user can only view their own todos.

THE system SHALL prevent any user from accessing another user's todos.

THE system SHALL NOT provide any mechanism to share todos between users.

THE system SHALL NOT provide any mechanism to view other users' profiles.

### Todo Field Validation

THE system SHALL reject todo creation requests where the title is missing.

THE system SHALL reject todo creation requests where the title is empty or contains only whitespace.

THE system SHALL reject todo update requests where the title is set to empty or whitespace only.

THE system SHALL accept any text value for the description field including empty strings.

THE system SHALL accept any valid calendar date for start date and due date fields.

THE system SHALL accept empty values for start date and due date fields.

## TodoHistory Rules

Every modification to a todo generates a new history entry with timestamp. History entries capture which fields changed and their new values. Users can view the complete edit history for any of their todos. History entries display from most recent to oldest. When a todo is permanently deleted from trash, all associated history entries are also removed. History entries cannot be edited or deleted independently. Each history entry is linked to exactly one todo. The system maintains history for todos in both active and trash states. History entries record title, description, start date, and due date changes separately.

### Edit History Creation

Every modification to a todo creates a new history entry. This includes changes to the title, description, start date, or due date. Creating a todo does not generate a history entry; history begins with the first edit. Each edit, regardless of how many fields are changed, creates exactly one history entry.

### History Entry Structure

Each history entry records the timestamp when the edit was made. The entry captures which fields were changed and their new values after the edit. If a field was not changed in that edit, it is not recorded in that history entry. The system tracks changes to the title, description, start date, and due date as separate recorded values within each entry.

### History Viewing and Sorting

Users can view the complete edit history for any of their todos. Each history entry displays the timestamp of the edit. For each field that was changed, the entry shows what the new value became. Fields that were not changed in a particular edit are not shown for that entry. History entries are displayed in order from most recent to oldest.

### History-Todo Relationship and Cascade Deletion

Each history entry is linked to exactly one todo. A history entry cannot exist without being associated with a todo. When a todo is permanently deleted from the trash, all history entries associated with that todo are also permanently deleted. This deletion is automatic and cannot be undone.

### History Entry Immutability and Retention

History entries cannot be edited or deleted independently. Users cannot modify a history entry after it is created. Users cannot delete individual history entries. The only way a history entry is removed is when its associated todo is permanently deleted from the trash. History is maintained for todos in both active and trash states.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Todo List Filtering

WHEN a user views their todo list, THE system SHALL allow filtering by completion status.

WHERE the user selects "All todos", THE system SHALL display all todos belonging to the user regardless of completion status.

WHERE the user selects "Only complete todos", THE system SHALL display only todos with completion status set to complete.

WHERE the user selects "Only incomplete todos", THE system SHALL display only todos with completion status set to incomplete.

THE system SHALL apply the selected filter before returning the todo list to the user.

### Todo List Sorting

WHEN a user views their todo list, THE system SHALL allow sorting by creation date, start date, or due date.

WHERE the user sorts by creation date, THE system SHALL order todos by the date and time they were created, with options for newest first or oldest first.

WHERE the user sorts by start date, THE system SHALL order todos by their start date, with options for earliest first or latest first. Todos without a start date SHALL appear at the end of the list.

WHERE the user sorts by due date, THE system SHALL order todos by their due date, with options for earliest first or latest first. Todos without a due date SHALL appear at the end of the list.

THE system SHALL apply the selected sort order after filtering is applied.

### Todo List Pagination

WHEN a user views their todo list, THE system SHALL present todos in paginated form.

WHEN a user views their trash list of deleted todos, THE system SHALL present deleted todos in paginated form.

THE system SHALL return a subset of todos per page, with navigation controls to view additional pages.

THE system SHALL maintain the current filter and sort settings when navigating between pages.

IF the user changes the filter or sort selection, THE system SHALL reset to the first page of results.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Errors

When a user attempts to sign up with an email that is already registered, the request is rejected. The system informs the user that the email address is already in use.

When a user attempts to log in with incorrect email or password, the request is rejected. The system does not reveal whether the email exists or the password was wrong.

When a user attempts to log in without providing email or password, the request is rejected.

When a user attempts to change their password without providing the current password, the request is rejected.

When a user attempts to change their password with an incorrect current password, the request is rejected.

When a user attempts to delete their account, all their todos (including those in trash) are permanently deleted. This action cannot be undone.

### Todo Validation and Access Errors

When a user attempts to create a todo without a title, the request is rejected. The title is required.

When a user attempts to edit a todo without providing a title, the request is rejected.

When a user attempts to view, edit, complete, or delete a todo that does not exist, the request is rejected.

When a user attempts to view, edit, complete, or delete a todo that belongs to another user, the request is rejected. Users can only access their own todos.

### Edit History Access Errors

When a user attempts to view the edit history of a todo that does not exist, the request is rejected.

When a user attempts to view the edit history of a todo that belongs to another user, the request is rejected. Users can only view the history of their own todos.

When a user attempts to view the edit history of a todo that has been permanently deleted, the request is rejected. Permanently deleted todos and their history are no longer accessible.

Edit history records contain the timestamp and the changed values for title, description, start date, and due date fields. This aligns with the domain model definition of TodoHistory.

### Trash Management Errors

When a user attempts to view their trash list without authorization, the request is rejected.

When a user attempts to restore a deleted todo that does not exist, the request is rejected.

When a user attempts to restore a deleted todo that belongs to another user, the request is rejected. Users can only restore their own deleted todos.

When a user attempts to permanently delete a todo from trash that does not exist, the request is rejected.

When a user attempts to permanently delete a todo from trash that belongs to another user, the request is rejected. Users can only permanently delete their own todos.

When a user attempts to permanently delete a todo from trash, the todo and all its edit history are permanently removed. This action cannot be undone.

### List Browsing Errors

When a user attempts to filter their todo list with an invalid completion status value, the request is rejected. Valid values are: all, complete, and incomplete.

When a user attempts to sort their todo list with an invalid sort field or order, the request is rejected. Valid sort fields are: creation date, start date, and due date. Valid orders are: ascending and descending.

When a user attempts to view a paginated list with an invalid page number or page size, the request is rejected. The system returns an appropriate error indicating the valid range.