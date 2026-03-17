**privateTodoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide an email address and password to create an account. The email address must be unique across all users in the system, ensuring no two accounts share the same email. Passwords are required for both account creation and login. Users can change their password at any time after logging in. Each user has a display name that can be optionally set or left empty. Users can edit their display name whenever they choose. When a user deletes their account, all their todos including those in the trash are permanently removed. Users cannot view other users' profiles as this is a private todo application.

### Email Validation Rules

THE system SHALL require an email address for account creation.

THE system SHALL require the email address to be unique across all registered users.

IF a user attempts to create an account with an email address already registered to another user, THEN THE system SHALL reject the account creation request.

THE system SHALL use the email address to identify users during login.

### Password Rules

THE system SHALL require a password for account creation.

THE system SHALL require a password for user login.

WHEN a logged-in user requests to change their password, THE system SHALL allow the password to be updated.

IF a login attempt is made without a password, THEN THE system SHALL reject the login request.

### Display Name Rules

WHERE a display name is provided during account creation, THE system SHALL store the display name for the user.

THE system SHALL NOT require a display name to be set.

WHEN a user edits their display name, THE system SHALL update the stored display name.

THE system SHALL allow the display name to be left empty or unset at any time.

### Account Deletion Rules

WHEN a user deletes their account, THE system SHALL permanently remove all of the user's todos.

WHEN a user deletes their account, THE system SHALL permanently remove all todos from the user's trash.

WHEN a user deletes their account, THE system SHALL remove all edit history associated with the user's todos.

THE system SHALL perform account deletion as an irreversible operation.

### Profile Privacy Rules

THE system SHALL restrict profile visibility to the profile owner only.

THE system SHALL prevent users from viewing other users' profiles.

THE system SHALL NOT provide any mechanism to share profiles between users.

IF a user attempts to access another user's profile, THEN THE system SHALL deny access to the profile.

## Todo Rules

Every todo must have a title, which is the only required field when creating a todo. The description, start date, and due date are all optional fields that can be left empty. Newly created todos are always in the incomplete state by default. Users can toggle a todo between complete and incomplete states as many times as needed. Users can edit the title, description, start date, and due date of their todos at any time. Each todo belongs exclusively to the user who created it. When a todo is deleted, it is not permanently removed but instead moved to a soft-deleted state. Permanently deleting a todo from the trash removes it along with its entire edit history.

### Todo Creation Validation

Every todo must have a title, which is the only required field when creating a todo.

The description field is optional and can be left empty when creating a todo.

The start date is optional and can be left empty when creating a todo.

The due date is optional and can be left empty when creating a todo.

Newly created todos are always in the incomplete state by default.

### Completion Status Behavior

A todo can be marked as complete from the incomplete state.

A todo can be marked as incomplete from the complete state.

The completion status can be toggled between complete and incomplete as many times as needed.

### Todo Ownership and Privacy

Each todo belongs exclusively to the user who created it.

Todo ownership cannot be transferred to another user.

A todo is only visible to its owner.

There is no mechanism to share a todo with another user.

### Deletion and Permanent Removal

When a todo is deleted, it is not permanently removed but instead moved to a soft-deleted state.

A soft-deleted todo no longer appears in the normal todo list.

Permanently deleting a todo from the trash removes the todo along with its complete edit history.

Once a todo is permanently deleted, it cannot be recovered.

## EditHistory Rules

Every edit to a todo automatically creates a history entry recording the changes made. Each history entry captures when the edit occurred and which fields were modified. If the title was changed, the new title value is recorded. If the description was changed, the new description value is recorded. Similarly, changes to start date and due date are captured when those fields are modified. Fields that were not changed during an edit are not recorded in that history entry. History entries are displayed in reverse chronological order, with the most recent edits appearing first. When a todo is permanently deleted from the trash, all its history entries are also deleted. Users can view the complete edit history for any of their todos.

### History Entry Creation

When a user edits a todo, the system SHALL create a new history entry automatically. Each edit action SHALL produce exactly one history entry, regardless of how many fields were changed during that edit. If a user saves multiple field changes at once, this counts as a single edit and creates a single history entry.

### Field Change Recording

Each history entry SHALL record the date and time when the edit was made. If the title was changed during an edit, the new title value SHALL be recorded in the history entry. If the description was changed during an edit, the new description value SHALL be recorded in the history entry. If the start date was changed during an edit, the new start date value SHALL be recorded in the history entry. If the due date was changed during an edit, the new due date value SHALL be recorded in the history entry. Fields that were not modified during an edit SHALL NOT be recorded in the history entry for that edit.

### History Ordering

When a user views the edit history for a todo, the history entries SHALL be displayed in reverse chronological order. The most recent edits SHALL appear first in the list, with older edits appearing later.

### History Access

Users SHALL be able to view the complete edit history for any of their own todos. If a user attempts to view the edit history of a todo they do not own, the request SHALL be rejected.

### Permanent Deletion Behavior

When a todo is permanently deleted from the trash, all of its history entries SHALL be permanently deleted as well. Restoring a todo from the trash SHALL preserve its complete edit history.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

Users can filter their todo list by completion status.

When viewing the todo list, THE SYSTEM SHALL allow the user to select one of three filter options: all todos, only complete todos, or only incomplete todos.

When "all todos" is selected, THE SYSTEM SHALL display both complete and incomplete todos.

When "only complete todos" is selected, THE SYSTEM SHALL display only todos marked as complete.

When "only incomplete todos" is selected, THE SYSTEM SHALL display only todos marked as incomplete.

The filter selection does not affect the trash list; the trash list shows all deleted todos regardless of completion status.

### Sorting Rules

Users can sort their todo list by creation date, start date, or due date.

When sorting by creation date, THE SYSTEM SHALL allow ordering by newest first or oldest first.

When sorting by start date, THE SYSTEM SHALL allow ordering by earliest first or latest first.

When sorting by due date, THE SYSTEM SHALL allow ordering by earliest first or latest first.

When sorting by start date and one or more todos do not have a start date set, THE SYSTEM SHALL display those todos at the end of the list.

When sorting by due date and one or more todos do not have a due date set, THE SYSTEM SHALL display those todos at the end of the list.

The sorting selection does not affect the trash list.

### Pagination Rules

The todo list and trash list are paginated to allow users to browse large numbers of todos.

When the user views their todo list, THE SYSTEM SHALL display the todos across multiple pages rather than in a single unbounded list.

When the user views their trash list, THE SYSTEM SHALL display the deleted todos across multiple pages rather than in a single unbounded list.

Pagination applies to both the filtered and unfiltered todo list views.

Pagination applies to all sorting configurations of the todo list.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

IF a guest attempts to sign up with an email that is already registered, THE system SHALL reject the request and indicate that the email is already in use.

IF a guest attempts to sign up without providing an email, THE system SHALL reject the request and indicate that email is required.

IF a guest attempts to sign up without providing a password, THE system SHALL reject the request and indicate that password is required.

IF a member attempts to log in with an email that is not registered, THE system SHALL reject the request and indicate that the credentials are invalid.

IF a member attempts to log in with an incorrect password, THE system SHALL reject the request and indicate that the credentials are invalid.

IF a member attempts to log in without providing an email, THE system SHALL reject the request and indicate that email is required.

IF a member attempts to log in without providing a password, THE system SHALL reject the request and indicate that password is required.

### Todo Access Errors

IF a member attempts to view a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to view a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

IF a member attempts to edit a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to edit a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

IF a member attempts to delete a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to delete a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

IF a member attempts to mark a todo as complete or incomplete and the todo does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to mark a todo as complete or incomplete and the todo belongs to another user, THE system SHALL reject the request and indicate that access is denied.

### Todo Validation Errors

IF a member attempts to create a todo without providing a title, THE system SHALL reject the request and indicate that title is required.

IF a member attempts to edit a todo and removes the title without providing a new one, THE system SHALL reject the request and indicate that title is required.

IF a member attempts to view the edit history of a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to view the edit history of a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

### Trash Operation Errors

IF a member attempts to view a deleted todo in the trash that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to restore a todo that does not exist in the trash, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to restore a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

IF a member attempts to permanently delete a todo that does not exist in the trash, THE system SHALL reject the request and indicate that the todo was not found.

IF a member attempts to permanently delete a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

IF a member attempts to restore a todo that has not been deleted (is not in trash), THE system SHALL reject the request and indicate that the todo cannot be restored.

### Account Management Errors

IF a member attempts to change their password and provides an incorrect current password, THE system SHALL reject the request and indicate that the current password is invalid.

IF a member attempts to change their password without providing the current password, THE system SHALL reject the request and indicate that the current password is required.

IF a member attempts to change their password without providing a new password, THE system SHALL reject the request and indicate that a new password is required.

IF a member attempts to delete their account while not authenticated, THE system SHALL reject the request and indicate that authentication is required.