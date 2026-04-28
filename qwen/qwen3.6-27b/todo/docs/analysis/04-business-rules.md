**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with an email and a password, both of which are required for account creation. Users log in using the same email and password combination. Users can update their display name to personalize their profile. Users have the ability to change their password to enhance security. When a user decides to delete their account, the action permanently removes the user record. This deletion cascade permanently removes all associated todos, including those currently in the trash.

### Account Creation Validation

WHEN a user signs up, THE system SHALL require both an email address and a password.

IF the email address is missing or empty during account creation, THEN THE system SHALL reject the request.

IF the password is missing or empty during account creation, THEN THE system SHALL reject the request.

WHEN a user signs up with a unique email address, THE system SHALL create a new user account and associate it with that email.

IF the provided email address already belongs to an existing user account, THEN THE system SHALL reject the account creation request.

### Authentication Rules

WHEN a user logs in, THE system SHALL authenticate using the registered email address and password.

IF the provided email address does not match any registered user account, THEN THE system SHALL reject the login attempt.

IF the provided password does not match the registered password for the given email, THEN THE system SHALL reject the login attempt.

WHEN authentication is successful, THE system SHALL grant access to the user's account.

### Display Name Rules

WHERE a user wishes to personalize their profile, THE system SHALL allow editing of the display name.

WHEN a user updates their display name, THE system SHALL store the new display name as part of the user's profile.

THE updated display name SHALL persist across sessions and be reflected wherever the user's profile information is shown.

### Password Change Rules

WHEN an authenticated user requests to change their password, THE system SHALL process the password update request.

WHEN the password change is successful, THE system SHALL replace the existing password with the new password.

THE new password SHALL be used for all subsequent login attempts for that account.

### Account Deletion Rules

WHEN a user requests to delete their account, THE system SHALL permanently remove the user's account record.

WHEN a user's account is deleted, THE system SHALL permanently delete all todos owned by that user, including todos currently in the trash.

IF a user's account has been deleted, THEN THE system SHALL reject any login attempt using that user's credentials.

AFTER account deletion, THE system SHALL permanently delete all edit history associated with the user's todos.

## Todo Rules

Each todo must have a title, which is the only mandatory field for creation. Todos can optionally include a description, a start date, and a due date. Newly created todos are automatically set to an incomplete status. Users can toggle the completion status of a todo between complete and incomplete at any time. Editing a todo involves updating fields such as title, description, start date, or due date. When deleted, todos are soft-deleted, meaning they move to a trash state rather than being immediately destroyed. Todos can be restored from trash to their active state, or permanently removed.

### Title Validation

Every todo requires a title as the only mandatory field at creation. A todo cannot be created if the title is missing. If a user attempts to create a todo without providing a title, the request is rejected. Editing operations must also ensure the title remains present; removing the title during an edit is not allowed.

### Optional Fields

A todo may include a description, start date, and due date, but none of these fields are required. Any of these optional fields can be left empty at creation or during editing. The system accepts todos with only a title and no additional fields.

### Default Completion Status

When a todo is created, it is automatically assigned an incomplete status. The user does not need to set the completion status during creation; the system defaults to incomplete for all new todos.

### Completion Status Toggle

The completion status of a todo can be toggled between complete and incomplete at any time. A user can mark an incomplete todo as complete, and a complete todo as incomplete. This is a simple two-state toggle with no intermediate states.

### Soft Deletion Rules

When a user deletes a todo, it is not permanently removed but instead moves to a trash state. The todo no longer appears in the normal todo list but remains accessible through the trash view. A deleted todo can be restored, returning it to the normal todo list with all original fields and edit history intact. Alternatively, a todo can be permanently deleted from the trash. Permanent deletion removes the todo and its associated edit history entirely, and this action cannot be undone.

## EditHistory Rules

The edit history automatically tracks every change made to a todo. Each edit generates a new history entry recording the specific modifications. History entries capture the timestamp of when the edit was made. They only record changes for fields that were actually modified, such as title, description, start date, or due date. History is preserved entirely when a todo is moved to trash and restored. Permanently deleting a todo from the trash also removes all associated edit history entries. The system sorts history entries from most recent to oldest for review.

### Automated Edit Tracking and Timestamps

WHEN a todo is edited by its owner, THE system SHALL create a new edit history entry for that todo.

WHEN the system creates an edit history entry, THE system SHALL record the timestamp of when the edit occurred.

IF edit history entries exist for a todo, THEN THE system SHALL maintain an association between each entry and the corresponding todo.

### Conditional Change Recording

WHEN a todo is edited, THE system SHALL record only the fields that were modified during that edit.

IF the title is modified in an edit, THEN THE system SHALL record the new title value in the history entry.

IF the description is modified in an edit, THEN THE system SHALL record the new description value in the history entry.

IF the start date is modified in an edit, THEN THE system SHALL record the new start date value in the history entry.

IF the due date is modified in an edit, THEN THE system SHALL record the new due date value in the history entry.

IF a field is not modified during an edit, THEN THE system SHALL NOT record that field in the history entry.

### History Lifecycle with Trash Operations

WHEN a todo is moved to trash by its owner, THE system SHALL preserve all existing edit history entries for that todo.

WHEN a todo is restored from trash, THE system SHALL retain all edit history entries associated with that todo.

IF a todo is permanently deleted from trash by its owner, THEN THE system SHALL delete all edit history entries for that todo.

IF a user account is deleted, THEN THE system SHALL delete all edit history entries for every todo owned by that user.

### Edit History Ordering

WHEN edit history entries exist for a todo, THE system SHALL maintain them in order from most recent to oldest.

IF multiple edit history entries exist for the same todo, THEN THE system SHALL order them by timestamp in descending order.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Expectations

Users can filter their todo list by completion status.
The available filter options are: All todos, Only complete todos, and Only incomplete todos.
When a filter is applied, the visible list contains only the todos matching the selected status.
Switching to a different filter updates the list to reflect that status.
Clearing the filter or selecting All todos restores the complete set of todos subject to other browsing criteria.

### Sorting Expectations

Users can sort their todo list by Creation date, Start date, or Due date.
When sorting by Creation date, users can choose to order todos from newest first to oldest first, or oldest first to newest first.
When sorting by Start date, users can choose to order todos from earliest first to latest first, or latest first to earliest first.
When sorting by Due date, users can choose to order todos from earliest first to latest first, or latest first to earliest first.
When sorting by Start date, todos without a start date appear at the end of the list.
When sorting by Due date, todos without a due date appear at the end of the list.

### Pagination Expectations

The main todo list is paginated to display a manageable number of todos per view.
The trash list of deleted todos is also paginated.
Users can navigate forward and backward through pages to browse all todos matching the current filters and sorting preferences.
Applying a new filter or changing the sort order resets the view to the first page of the updated results.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Error Scenarios

WHEN a user attempts to log in with an email address that does not exist in the system, THE system SHALL reject the login and indicate the credentials are invalid.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login and indicate the credentials are invalid.

WHEN a user attempts to sign up with an email address already associated with an existing account, THE system SHALL reject the registration and indicate the email is already in use.

WHEN a user attempts to change their password and provides an incorrect current password, THE system SHALL reject the password change and indicate the current password is incorrect.

### Access Control Failures

IF a guest attempts to perform any action that requires authentication, THEN THE system SHALL reject the request and require the user to log in.

IF a user attempts to view another user's todo, THEN THE system SHALL reject the request and indicate the todo is not accessible.

IF a user attempts to edit another user's todo, THEN THE system SHALL reject the request and indicate the todo cannot be modified.

IF a user attempts to delete another user's todo, THEN THE system SHALL reject the request and indicate the todo cannot be deleted.

IF a user attempts to view another user's profile, THEN THE system SHALL reject the request and indicate the profile cannot be viewed.

IF a user attempts to view another user's trash list, THEN THE system SHALL reject the request and indicate the trash list is not accessible.

### Todo Creation and Editing Rejections

IF a user attempts to create a todo without providing a title, THEN THE system SHALL reject the request and indicate the title is required.

IF a user attempts to update a todo's title to an empty value, THEN THE system SHALL reject the request and indicate the title cannot be empty.

### Todo Operation Failure Cases

IF a user attempts to view a todo that does not exist, THEN THE system SHALL reject the request and indicate the todo cannot be found.

IF a user attempts to edit a todo that does not exist, THEN THE system SHALL reject the request and indicate the todo cannot be found.

IF a user attempts to mark a todo as complete or incomplete that does not exist, THEN THE system SHALL reject the request and indicate the todo cannot be found.

IF a user attempts to delete a todo that does not exist, THEN THE system SHALL reject the request and indicate the todo cannot be found.

IF a user attempts to view the edit history of a todo that does not exist, THEN THE system SHALL reject the request and indicate the todo cannot be found.

### Trash Operation Exceptions

IF a user attempts to restore a todo from trash that does not exist, THEN THE system SHALL reject the request and indicate the deleted todo cannot be found.

IF a user attempts to permanently delete a todo from trash that does not exist, THEN THE system SHALL reject the request and indicate the deleted todo cannot be found.

IF a user attempts to permanently delete a todo from trash that does not belong to them, THEN THE system SHALL reject the request and indicate the deleted todo is not accessible.

WHEN a user permanently deletes a todo from trash, THE system SHALL also delete the associated edit history entries for that todo.

### Account Deletion Error Scenarios

IF a user attempts to delete their account and the request cannot be processed, THEN THE system SHALL reject the request and indicate the account deletion failed.

WHEN a user successfully deletes their account, THE system SHALL permanently delete all associated todos including those in trash, along with all edit history entries.