**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address and password when creating an account. The email and password combination must be unique across the system. Users can set a display name for their profile, which can be updated at any time. When users choose to delete their account, all associated data including todos and edit history is permanently removed. Password changes require the current password for verification. The system enforces that each user maintains exactly one account. Email addresses must be in a valid format for account creation. Users cannot share or transfer their account to another person.

### Email Validation and Uniqueness

WHEN a user creates an account, THE system SHALL validate that the email address is in a valid format.

IF the email address does not contain an @ symbol and a domain, THEN THE system SHALL reject the account creation request.

WHEN a user attempts to register, THE system SHALL verify that the email address is unique across all existing accounts.

IF an email address is already associated with an existing account, THEN THE system SHALL reject the new account creation request.

THE system SHALL enforce that each email address can be associated with exactly one user account.

THE system SHALL prevent the creation of a duplicate account with the same email address.

### Password Requirements

WHEN a user creates an account, THE system SHALL require a password to be provided.

WHEN a user attempts to log in, THE system SHALL require the correct password associated with the email address.

IF the provided password does not match the stored password for the email, THEN THE system SHALL reject the login request.

WHEN a user requests to change their password, THE system SHALL require a new password to be provided.

THE system SHALL update the password for all future login attempts after a successful password change.

### Display Name Rules

WHEN a user creates an account, THE system SHALL allow the user to optionally set a display name.

WHEN a user updates their profile, THE system SHALL allow the display name to be changed at any time.

THE system SHALL permit the display name to be left empty if the user chooses not to provide one.

IF a user provides a display name, THEN THE system SHALL store it as part of the user's profile.

THE system SHALL allow the display name to be updated independently of other profile information.

### Account Deletion Impact

WHEN a user deletes their account, THE system SHALL permanently remove all todos owned by that user.

WHEN a user deletes their account, THE system SHALL permanently remove all todos in the trash associated with that user.

WHEN a user deletes their account, THE system SHALL permanently remove all edit history entries for all their todos.

IF a user deletes their account, THEN THE system SHALL not allow the user to recover their account or any associated data.

THE system SHALL ensure that account deletion is irreversible and all user data is permanently removed.

### Single Account Constraint

THE system SHALL enforce that each user maintains exactly one account.

IF an email address is already registered, THEN THE system SHALL prevent the creation of a duplicate account with the same email.

THE system SHALL not allow a single email address to be associated with multiple user accounts.

WHEN a user attempts to create a second account with an existing email, THEN THE system SHALL reject the request.

THE system SHALL ensure email uniqueness as the primary mechanism for enforcing single account per user.

Users cannot share or transfer their account to another person.

## Todo Rules

Todos must have a title that cannot be empty or left blank. Description, start date, and due date are optional fields that users may include or omit. When a todo is created, it automatically begins in an incomplete state. Users can modify the title at any time, and the system records these changes in edit history. Start dates and due dates must follow valid date formats when provided. If both start date and due date are set, the start date should not be after the due date. Users can toggle completion status between complete and incomplete freely. The system maintains the original creation date even when other fields are edited.

### Title Validation

A todo must have a title that cannot be empty or left blank. The title is the only required field when creating a todo. If a title is missing or contains only whitespace, the todo creation request is rejected. Users can modify the title at any time, but the title cannot be changed to an empty value or a value containing only whitespace. Every title change is recorded in the todo's edit history.

### Optional Fields

The description field is optional and may be left empty when creating a todo. Users can add a description to provide additional context or details about the todo. The start date field is optional and may be left unset. The due date field is optional and may be left unset. Users may include or omit any combination of these optional fields when creating or editing a todo. Leaving an optional field empty is valid and does not cause the request to be rejected.

### Initial Completion State

When a todo is created, it automatically begins in an incomplete state. The system does not allow users to specify the completion status during creation. A newly created todo is always marked as incomplete regardless of any other fields provided. Users can only change the completion status after the todo has been created.

### Date Ordering Constraint

When both start date and due date are set for a todo, the start date must not be after the due date. If a user attempts to set a start date that is later than the due date, the edit request is rejected. If a user attempts to set a due date that is earlier than the start date, the edit request is rejected. This constraint applies only when both dates are provided; if only one date is set, no ordering validation occurs. Users can clear either date independently without triggering this constraint.

### Completion Status Toggle

Users can toggle the completion status of a todo between complete and incomplete at any time. This is a simple two-state toggle with no intermediate states. A todo that is incomplete can be marked as complete. A todo that is complete can be marked as incomplete. There are no restrictions on how many times a user can toggle the completion status. Changing the completion status does not create an edit history entry.

### Edit Tracking Rules

Every time a todo is edited, a history entry is created to record the changes. Edit history is created when the title, description, start date, or due date is modified. Each history entry captures the timestamp of when the edit was made. Each history entry records which fields were changed and what their new values are. If a field is not changed during an edit, it is not recorded in that history entry. The original creation date of the todo is preserved and never modified by subsequent edits. Edit history entries are sorted from most recent to oldest when displayed to the user.

## EditHistory Rules

Every modification to a todo automatically generates a corresponding history entry documenting the change. Each history entry captures when the edit was made and what fields were changed including title, description, start date, and due date. History entries are displayed in reverse chronological order with the most recent changes appearing first. When a todo is permanently deleted from trash, its entire edit history is also removed. History entries cannot be modified or deleted individually once created. Users can view the complete edit history for any todo they own. The system only records changes to fields that were actually modified in each edit operation.

### Automatic History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a history entry documenting the change.

A history entry is created for every edit operation regardless of which fields are modified.

The system creates history entries only for edit operations, not for other actions such as marking a todo as complete or deleting a todo.

### Change Recording Rules

Each history entry records when the edit was made.

Each history entry records what the title was changed to, if the title was modified in that edit.

Each history entry records what the description was changed to, if the description was modified in that edit.

Each history entry records what the start date was changed to, if the start date was modified in that edit.

Each history entry records what the due date was changed to, if the due date was modified in that edit.

The system only records field values that were actually changed in each edit operation.

Fields that were not modified in an edit do not appear in the corresponding history entry.

### History Display Ordering

History entries are displayed in reverse chronological order with the most recent changes appearing first.

When viewing edit history, the oldest entries appear at the bottom of the list.

The ordering is based on when each edit was made.

### History Entry Immutability

History entries cannot be modified after they are created.

History entries cannot be deleted individually by the user.

Once a history entry is created, it remains unchanged until the todo is permanently deleted.

### History Access Rules

Users can view the complete edit history for any todo they own.

Users cannot view the edit history of todos belonging to other users.

Users can access the full history without restrictions on how far back they can view.

### History Deletion Rules

When a todo is permanently deleted from trash, its entire edit history is also removed.

Deleting a todo (moving to trash) does not delete its edit history.

Restoring a todo from trash preserves all its edit history.

The system does not provide any option to delete history entries separately from the todo.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering by Completion Status

Users can filter their todo list by completion status.

WHEN viewing the todo list, THE system SHALL allow filtering by:
- All todos (both complete and incomplete)
- Only complete todos
- Only incomplete todos

WHEN a filter is applied, THE system SHALL display only todos matching the selected filter criteria.

WHEN no filter is applied, THE system SHALL display all todos by default.

### Sorting by Date

Users can sort their todo list by different date criteria.

WHEN viewing the todo list, THE system SHALL allow sorting by:
- Creation date (newest first or oldest first)
- Start date (earliest first or latest first)
- Due date (earliest first or latest first)

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list.

WHEN sorting by creation date, THE system SHALL include all todos since every todo has a creation date.

WHEN no sort order is specified, THE system SHALL use a default sort order.

### Pagination of Lists

Users can view paginated lists of todos and deleted todos.

WHEN viewing the todo list, THE system SHALL display todos in paginated format.

WHEN viewing the trash list, THE system SHALL display deleted todos in paginated format.

WHEN a page contains fewer items than the page size, THE system SHALL indicate that no more pages are available.

WHEN navigating to the next page, THE system SHALL maintain the current filter and sort settings.

WHEN navigating to a different page, THE system SHALL preserve the user's filter and sort preferences.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Login Errors

WHEN a user attempts to log in with an email that does not exist in the system, THE system SHALL reject the login attempt and indicate that the credentials are invalid.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login attempt and indicate that the credentials are invalid.

WHEN a user attempts to log in with a valid email but blank password, THE system SHALL reject the login attempt and indicate that the password is required.

WHEN a user attempts to log in with a blank email, THE system SHALL reject the login attempt and indicate that the email is required.

WHEN a guest attempts to access any todo-related functionality without logging in, THE system SHALL reject the request and require authentication.

### Todo Access Control Errors

WHEN a user attempts to view another user's todo, THE system SHALL reject the request and indicate that the todo is not accessible.

WHEN a user attempts to edit another user's todo, THE system SHALL reject the request and indicate that the user does not have permission to modify the todo.

WHEN a user attempts to delete another user's todo, THE system SHALL reject the request and indicate that the user does not have permission to delete the todo.

WHEN a user attempts to restore another user's deleted todo from trash, THE system SHALL reject the request and indicate that the user does not have permission to restore the todo.

WHEN a user attempts to permanently delete another user's todo from trash, THE system SHALL reject the request and indicate that the user does not have permission to permanently delete the todo.

WHEN a user attempts to view another user's edit history, THE system SHALL reject the request and indicate that the edit history is not accessible.

WHEN a user attempts to view another user's profile, THE system SHALL reject the request and indicate that the profile is not accessible.

### Todo Operation Errors

WHEN a user attempts to view a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

WHEN a user attempts to edit a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

WHEN a user attempts to delete a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

WHEN a user attempts to mark a todo as complete that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

WHEN a user attempts to mark a todo as incomplete that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

WHEN a user attempts to restore a todo from trash that is not in the trash, THE system SHALL reject the request and indicate that the todo is not in the trash.

WHEN a user attempts to permanently delete a todo from trash that is not in the trash, THE system SHALL reject the request and indicate that the todo is not in the trash.

WHEN a user attempts to restore a todo that has already been permanently deleted, THE system SHALL reject the request and indicate that the todo no longer exists.

WHEN a user attempts to view the edit history of a todo that has been permanently deleted, THE system SHALL reject the request and indicate that the todo no longer exists.

### Account Management Errors

WHEN a user attempts to change their password without providing a current password, THE system SHALL reject the request and indicate that the current password is required.

WHEN a user attempts to change their password with an incorrect current password, THE system SHALL reject the request and indicate that the current password is invalid.

WHEN a user attempts to change their password with a blank new password, THE system SHALL reject the request and indicate that the new password is required.

WHEN a user attempts to delete their account while logged out, THE system SHALL reject the request and require authentication.

WHEN a user attempts to view their own profile without being logged in, THE system SHALL reject the request and require authentication.

WHEN a user attempts to edit their profile without being logged in, THE system SHALL reject the request and require authentication.

### Account Deletion Errors

WHEN a user attempts to view any todo after their account has been deleted, THE system SHALL reject the request and indicate that the account no longer exists.

WHEN a user attempts to create a todo after their account has been deleted, THE system SHALL reject the request and indicate that the account no longer exists.

WHEN a user attempts to edit any todo after their account has been deleted, THE system SHALL reject the request and indicate that the account no longer exists.

WHEN a user attempts to delete any todo after their account has been deleted, THE system SHALL reject the request and indicate that the account no longer exists.

WHEN a user attempts to access their trash after their account has been deleted, THE system SHALL reject the request and indicate that the account no longer exists.