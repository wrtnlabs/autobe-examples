**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can sign up for an account by providing an email address and a password. The system creates a new user account with a default display name based on the email address. Users then log in using their email and password to access the application. Once authenticated, users can view and edit their own profile display name. Users can change their password at any time by providing their current password and a new password. Users can also delete their account entirely. When an account is deleted, all todos owned by that user — including those in the trash — are permanently removed from the system. Users cannot view other users' profiles or any of their data, as this is a private todo application with no sharing or social features. Failed login attempts due to incorrect email or password result in an authentication error and the user remains unauthenticated. Attempting to sign up with an email that is already registered results in a duplicate account error.

### User Registration

THE system SHALL allow a visitor to register as a member by providing an email address and a password.

THE system SHALL create a new user account upon successful registration.

THE system SHALL set the user's initial display name to the local part of the email address (the portion before the "@" symbol) upon account creation.

WHEN a visitor submits registration with an email address already associated with an existing account, THE system SHALL reject the registration and return a duplicate email error.

AFTER successful registration, THE system SHALL establish an authenticated session for the new user.

### User Authentication

THE system SHALL authenticate a user by verifying the submitted email address and password combination.

WHEN the submitted email address and password match a registered account, THE system SHALL establish an authenticated session for that user.

IF the submitted email address does not match any registered account, THEN THE system SHALL reject the login attempt and return an invalid credentials error without revealing whether the email or password was incorrect.

IF the submitted password does not match the registered account's password, THEN THE system SHALL reject the login attempt and return an invalid credentials error without revealing whether the email or password was incorrect.

WHILE a user is authenticated, THE system SHALL identify that user as the active member for all subsequent operations within the session.

### Password Management

WHILE authenticated, THE system SHALL allow a user to change their password by providing their current password and a new password.

IF the current password provided does not match the user's current password, THEN THE system SHALL reject the password change and return an error.

AFTER a successful password change, THE system SHALL update the account to use the new password for future authentication attempts.

### Profile Management

WHILE authenticated, THE system SHALL allow a user to view their own display name.

WHILE authenticated, THE system SHALL allow a user to update their own display name.

AFTER a user updates their display name, THE system SHALL save and reflect the new display name immediately.

### Account Deletion

WHILE authenticated, THE system SHALL allow a user to request deletion of their own account.

WHEN a user deletes their account, THE system SHALL permanently remove all todos owned by that user, including todos already in the trash.

WHEN a user deletes their account, THE system SHALL permanently remove all edit history entries associated with the user's todos.

WHEN a user deletes their account, THE system SHALL permanently remove the user's profile data including display name and email address.

AFTER account deletion, THE system SHALL end the authenticated session for that user.

### Profile Privacy

THE system SHALL ensure that authenticated users cannot view other users' profiles.

THE system SHALL ensure that authenticated users cannot access or search for other users by email address or display name.

THE system SHALL ensure that there is no sharing, social, or public visibility feature for any user data in the application.

## Todo Operations

Users can create a new todo by providing a required title and optionally a description, a start date, and a due date. Newly created todos are always set to an incomplete state by default. Users can view a paginated list of all their active (non-deleted) todos. Each todo in the list displays its title, completion status, start date (if set), due date (if set), and creation date. Users can view a single todo in detail, including the full description. Users can toggle a todo between complete and incomplete states with a simple action. Users can edit the title, description, start date, or due date of any of their todos. When a todo is edited, the changes are recorded in the todo's edit history. Users can delete their own todos, which moves them to the trash rather than permanently removing them. Deleted todos no longer appear in the normal todo list. Users can view a paginated list of their deleted todos in the trash. From the trash, users can restore a deleted todo back to the normal todo list, or permanently delete it along with its edit history. Users can filter their todo list by completion status to view all todos, only complete todos, or only incomplete todos. Users can sort their todo list by creation date, start date, or due date, each in ascending or descending order. When sorting by start date or due date, todos without those dates appear at the end of the list. Attempting to create a todo without a title results in a validation error. Attempting to view, edit, or delete a todo that belongs to another user results in an access denied error.

### Todo Creation

THE system SHALL allow a user to create a new todo by providing a title.

WHEN a user creates a todo, THE system SHALL also accept an optional description, an optional start date, and an optional due date.

THE system SHALL set the completion status of a newly created todo to "incomplete" by default.

WHEN a user attempts to create a todo without a title, THE system SHALL reject the request. The detailed validation rules for missing titles are defined in [04-business-rules.md](./04-business-rules.md).

### Viewing the Todo List

THE system SHALL display a paginated list of all active (non-deleted) todos belonging to the current user.

Each todo in the list SHALL show its title, completion status, start date (if set), due date (if set), and creation date.

THE system SHALL allow the user to filter the todo list by completion status. The user SHALL be able to view:
- All todos
- Only complete todos
- Only incomplete todos

The detailed filtering and pagination rules are defined in [04-business-rules.md](./04-business-rules.md).

THE system SHALL allow the user to sort the todo list by:
- Creation date (newest first or oldest first)
- Start date (earliest first or latest first)
- Due date (earliest first or latest first)

WHEN sorting by start date, todos without a start date SHALL appear at the end of the list.

WHEN sorting by due date, todos without a due date SHALL appear at the end of the list.

### Viewing a Single Todo

THE system SHALL allow a user to view the full details of a single todo, including its title, description, completion status, start date (if set), due date (if set), and creation date.

WHEN a user attempts to view a todo that belongs to another user, THE system SHALL deny access. The detailed access rules are defined in [01-actors-and-auth.md](./01-actors-and-auth.md).

### Completing and Uncompleting Todos

THE system SHALL allow a user to mark one of their own todos as complete.

THE system SHALL allow a user to mark one of their own todos as incomplete.

This operation SHALL be a simple toggle between the "complete" and "incomplete" states.

### Editing Todos

THE system SHALL allow a user to edit the title, description, start date, or due date of any of their own todos.

WHEN a todo is edited, THE system SHALL automatically create a history entry recording the changes. The edit history mechanism is defined in [Module 1 > EditHistory Operations](./03-functional-requirements.md).

WHEN a user edits a todo, THE system SHALL only record the fields that were actually changed in the history entry.

### Deleting a Todo

THE system SHALL allow a user to delete their own todo.

WHEN a todo is deleted, THE system SHALL perform a soft delete — the todo SHALL NOT be permanently removed from the system.

WHEN a todo is deleted, THE system SHALL remove it from the normal todo list so it no longer appears in the user's active todo view.

THE system SHALL move the deleted todo to the user's trash.

### Viewing the Trash

THE system SHALL display a paginated list of all deleted (trashed) todos belonging to the current user. The detailed pagination rules are defined in [04-business-rules.md](./04-business-rules.md).

### Restoring a Todo from Trash

THE system SHALL allow a user to restore a deleted todo from their trash.

WHEN a todo is restored, THE system SHALL return it to the user's normal active todo list.

WHEN a todo is restored, its edit history SHALL be preserved.

### Permanently Deleting a Todo from Trash

THE system SHALL allow a user to permanently delete a todo from their trash.

WHEN a todo is permanently deleted from the trash, THE system SHALL also permanently delete its associated edit history.

WHEN a todo is permanently deleted, it SHALL NOT be recoverable.

## EditHistory Operations

Each time a user edits a todo, a new edit history entry is automatically created. Each history entry records the timestamp of when the edit was made, along with the previous values of any fields that were changed: title, description, start date, and due date. Only changed fields are recorded; fields that were not modified in the edit are not included in the history entry. Users can view the complete edit history of any of their own todos. The history entries are displayed sorted from most recent to oldest, so users can see the latest changes first. Edit history is read-only — users cannot create, edit, or delete individual history entries manually. When a todo is permanently deleted from the trash, all of its associated edit history entries are also permanently removed. Attempting to view the edit history of a todo that belongs to another user results in an access denied error. The edit history provides full auditability of all changes made to a todo throughout its lifecycle.

### Automatic Edit History Creation

WHEN a member edits any editable field of a todo they own, THE system SHALL automatically create a new edit history entry for that todo.

WHEN a member submits an edit that results in no field changes (all submitted values are identical to current values), THE system SHALL NOT create a new edit history entry.

### History Entry Data Recording

THE system SHALL record the following data for each edit history entry:

- The timestamp of when the edit was made
- The previous value of the title (if the title was changed)
- The previous value of the description (if the description was changed)
- The previous value of the start date (if the start date was changed)
- The previous value of the due date (if the due date was changed)

WHEN a field had no previous value (e.g., an optional field was empty before the edit started), THE system SHALL record that the previous value was empty or unset.

### Changed-Only Field Recording

THE system SHALL record the previous values of only the fields that were actually changed during the edit.

WHEN a member edits a todo and changes only the title, THE system SHALL create a history entry containing the timestamp and the previous title value, but SHALL NOT include previous description, previous start date, or previous due date.

WHEN a member edits a todo and changes multiple fields simultaneously, THE system SHALL create a single history entry containing the previous values for all changed fields.

### Full Edit History View

THE member SHALL be able to view the complete edit history of any todo they own.

The history view SHALL display every history entry associated with that todo, showing for each entry:

- The timestamp of the edit
- Which fields were changed
- The previous value of each changed field

### Most Recent First Sorting

THE system SHALL display edit history entries sorted from most recent first by their recorded timestamp.

THE most recent edit SHALL appear first in the history view.

THE oldest edit SHALL appear last in the history view.

### Read-Only History Entries

THE system SHALL NOT allow a member to create, modify, or delete individual edit history entries directly.

Edit history entries SHALL be created only automatically when a member edits a todo (as described in [Automatic Edit History Creation]).

Edit history entries SHALL be deleted only automatically when a member permanently deletes a todo from the trash (as described in [History Deletion on Permanent Todo Removal]).

### Cross-User History Access Denied

WHEN a member attempts to view the edit history of a todo owned by another member, THE system SHALL deny the request.

WHEN a member attempts to view the edit history of a todo they do not own, THE system SHALL not reveal whether the todo exists or any information about it.

### History Deletion on Permanent Todo Removal

WHEN a member permanently deletes a todo from the trash, THE system SHALL permanently delete all edit history entries associated with that todo.

WHEN a member restores a todo from the trash, THE system SHALL preserve all edit history entries associated with that todo, keeping them accessible in the history view.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempt to sign up with an email address that is already registered. The system rejects the duplicate registration and notifies the user that the email is already in use. Users attempt to log in with an incorrect email or password combination. The system denies access without revealing whether the email or password was wrong, to prevent credential guessing. Users attempt to change their password but provide an incorrect current password. The system rejects the password change and prompts the user to re-enter their current password correctly. Users attempt to delete their account while in the middle of another operation, such as editing a todo. The system processes the account deletion only after the current operation completes or cancels gracefully, then permanently removes all todos and trash contents. A user who is not logged in attempts to access any user profile or account management features. The system redirects to the login page. A user attempts to view another user's profile — the system denies this since all profiles are private. Users attempt to sign up without providing an email or password, or with an improperly formatted email address. The system validates the input and rejects incomplete or malformed submissions.

### Duplicate Email Registration

THE system SHALL reject a signup attempt when the email address is already registered to an existing user account.

WHEN a user attempts to sign up with an email address that is already in use, THE system SHALL deny the registration and notify the user that the email address is already associated with an existing account.

### Incorrect Login Credential Handling

WHEN a user provides an incorrect email or password combination during login, THE system SHALL deny access.

THE system SHALL return a generic error message indicating the login credentials are invalid, without revealing whether the email address or the password was incorrect, to prevent credential guessing attacks.

### Wrong Current Password on Change

WHEN a user attempts to change their password but provides an incorrect current password, THE system SHALL reject the password change request.

THE system SHALL prompt the user to re-enter their current password correctly before proceeding with the password change.

THE system SHALL NOT reveal whether the current password was incorrect or whether any other issue occurred.

### Account Deletion During Active Operation

WHEN a user requests account deletion while another operation (such as editing a todo, changing password, or viewing a todo detail) is in progress, THE system SHALL wait for the current operation to complete or be cancelled gracefully before processing the account deletion.

After the outstanding operation completes or is cancelled, THE system SHALL proceed with account deletion, which permanently removes all todos, edit history entries, and trash contents belonging to the user.

### Unauthenticated Access to Account Features

WHEN a user who is not logged in attempts to access any account management feature (such as password change, display name editing, or account deletion), THE system SHALL deny the request.

THE system SHALL redirect the unauthenticated user to the login page so they can authenticate before accessing account features.

### Access Denied to Other User Profiles

WHEN a user attempts to view another user's profile, THE system SHALL deny access.

THE system SHALL treat all user profiles as private, with no mechanism to view, search, or discover other users' profiles or account information.

### Incomplete or Invalid Signup Submissions

WHEN a user attempts to sign up without providing an email address, THE system SHALL reject the registration and indicate that an email address is required.

WHEN a user attempts to sign up without providing a password, THE system SHALL reject the registration and indicate that a password is required.

WHEN a user attempts to sign up without providing a display name, THE system SHALL reject the registration and indicate that a display name is required.

WHEN a user provides an improperly formatted email address (such as missing the "@" symbol or domain portion), THE system SHALL reject the registration and notify the user that the email format is invalid.

WHEN a user submits an incomplete signup form with multiple missing required fields (email, password, and/or display name), THE system SHALL reject the registration and notify the user of all missing required fields simultaneously.

## Todo Error Scenarios

Users attempt to create a todo without providing a title. The system rejects the creation and requires a non-empty title before proceeding. Users attempt to edit a todo that has been deleted and is now in the trash. The system rejects the edit since the todo must be restored first. Users attempt to edit a todo that belongs to another user. The system denies access as todos are private. Users attempt to mark a todo as complete or incomplete when the todo is in the trash. The system rejects the completion toggle since the todo must be restored first. Users attempt to permanently delete a todo from the trash that is already permanently deleted. The system returns a not-found error. Users attempt to view a single todo that does not exist or belongs to another user. The system returns a not-found error without revealing whether the todo exists. Users attempt to access a paginated todo list with an invalid page number, such as zero or a negative number. The system defaults to the first page or returns an empty result. Users filter the todo list by completion status but no todos match the selected filter. The system returns an empty list. Users sort the todo list by a start date or due date and all todos lack those dates. The system returns the list ordered by creation date as a fallback. Users attempt to restore a todo that was already restored. The system treats this as a no-operation or returns the already-active todo.

### Missing Title on Todo Creation

WHEN a user attempts to create a todo without providing a title, THE system SHALL reject the creation.

WHEN a user attempts to create a todo with an empty title (whitespace-only), THE system SHALL reject the creation.

This requirement defines the validation boundary for a required title field.

### Editing a Trashed Todo Denied

WHEN a user attempts to edit a todo that has been deleted and resides in the trash, THE system SHALL reject the edit and inform the user that the todo must be restored before it can be edited.

WHEN a user attempts to edit a todo that has been permanently deleted, THE system SHALL reject the edit and return a not-found error.

### Completion Toggle on Trashed Todo

WHEN a user attempts to mark a trashed todo as complete, THE system SHALL reject the operation.

WHEN a user attempts to mark a trashed todo as incomplete, THE system SHALL reject the operation.

WHEN a trashed todo is restored to the active list, its completion status SHALL be preserved as it was at the time of deletion.

### Permanent Deletion of Non-Existent Todo

WHEN a user attempts to permanently delete a todo from the trash that has already been permanently deleted, THE system SHALL return a not-found error.

WHEN a user attempts to permanently delete a todo from the trash using an identifier that does not correspond to any todo owned by that user, THE system SHALL return a not-found error without revealing whether the identifier ever existed.

### Viewing Non-Existent or Unauthorized Todo

WHEN a user attempts to view a single todo that does not exist, THE system SHALL return a not-found error.

WHEN a user attempts to view a single todo that belongs to another user, THE system SHALL return a not-found error without revealing whether the todo exists.

The system SHALL NOT distinguish between non-existent todos and todos owned by another user in any error response.

### Invalid Page Number in Paginated List

WHEN a user requests a paginated todo list with a page number of zero, THE system SHALL default to the first page.

WHEN a user requests a paginated todo list with a negative page number, THE system SHALL default to the first page.

WHEN a user requests a paginated todo list with a page number exceeding the total number of available pages, THE system SHALL return an empty list.

WHEN a user requests a paginated todo list with a non-integer value for the page number, THE system SHALL default to the first page.

### Empty Filtered Results by Completion Status

WHEN a user filters their todo list by completion status and no todos match the selected filter, THE system SHALL return an empty list.

WHEN a user filters their todo list by completion status using an unrecognized filter value, THE system SHALL apply the default filter of showing all todos.

### Sorting with Missing Date Fields

WHEN a user sorts their todo list by start date and some todos lack a start date, THE system SHALL place todos without a start date at the end of the sorted list.

WHEN a user sorts their todo list by due date and some todos lack a due date, THE system SHALL place todos without a due date at the end of the sorted list.

WHEN a user sorts their todo list by start date or due date and all todos lack the selected date field, THE system SHALL fall back to sorting by creation date (newest first).

### Restoring Already Restored Todo

WHEN a user attempts to restore a todo that is already in the active list and not in the trash, THE system SHALL return the todo in its current state as a successful no-operation outcome.

The system SHALL NOT create an edit history entry for a restoration of an already-active todo.

### Access Denied to Another User's Todo

WHEN a user attempts to perform any operation (view, edit, complete, delete, restore, or view edit history) on a todo owned by another user, THE system SHALL deny access.

For view and detail operations on another user's todo, THE system SHALL return a not-found error without distinguishing between non-existent and inaccessible todos.

For mutation operations on another user's todo, THE system SHALL reject the operation with an access-denied error.

## EditHistory Error Scenarios

Users attempt to view the edit history of a todo that does not exist. The system returns a not-found error. Users attempt to view the edit history of a todo that belongs to another user. The system denies access since all todos are private. Users attempt to view the edit history of a todo that has been permanently deleted. The system returns a not-found error since the history is also permanently deleted along with the todo. Users attempt to view the edit history of a todo that has never been edited. The system returns an empty history list rather than an error, since the history simply has no entries yet. Users attempt to view the edit history of a todo that is in the trash. The system displays the history as normal, since the requirements do not restrict history access for soft-deleted todos. A user views a todo's edit history with no changes recorded in a given edit entry — for example, an edit where the user submitted the same values as before. The system only creates a history entry when at least one field actually changes, avoiding empty or redundant entries. Users attempt to access an edit history for a todo they can see but the history contains entries from before a session change. The system still returns the full history since the history is tied to the todo, not to the current session.

### Viewing History of a Non-Existent Todo

WHEN a member attempts to view the edit history of a todo that does not exist, THE system SHALL return a not-found response and SHALL NOT process any further history retrieval logic.

WHEN a member attempts to view the edit history of a todo that has been permanently deleted (both the todo and its history have been removed), THE system SHALL return a not-found response.

### Denying Access to Another User's Edit History

WHEN a member attempts to view the edit history of a todo owned by a different user, THE system SHALL deny access and SHALL NOT reveal any information about the todo's existence, its history, or its owner.

WHEN a member attempts to view the edit history of a todo they previously had access to but no longer do (e.g., after account transfer scenarios not supported by the system), THE system SHALL deny access.

### History Deletion on Permanent Todo Deletion

WHEN a member permanently deletes a todo from the trash, THE system SHALL also permanently delete all associated edit history entries for that todo.

WHEN a member's account is deleted, THE system SHALL permanently delete all todos and their associated edit history entries for that user.

IF a member attempts to view the edit history of a todo after the todo has been permanently deleted, THEN THE system SHALL return a not-found response, since both the todo and its history no longer exist.

### Empty History for Never-Edited Todos

WHEN a member views the edit history of a todo that has never been edited since creation, THE system SHALL return an empty history list.

The system SHALL NOT treat an empty history as an error condition. An empty list SHALL be the normal response for todos that have never been modified.

### Viewing Edit History of Trashed Todos

WHEN a member views the edit history of a todo that is currently in the trash (soft-deleted), THE system SHALL display the full edit history as normal.

The system SHALL NOT restrict access to the edit history of a todo solely because it has been soft-deleted. The history SHALL remain accessible until the todo is permanently deleted.

### Preventing Unchanged Edit Submissions

WHEN a member submits an edit to a todo where none of the editable fields (title, description, start date, due date) have changed from their current values, THE system SHALL reject the edit and SHALL NOT create a history entry.

THE system SHALL compare each submitted field value against the current stored value before creating a history entry. Only edits where at least one field differs from the current value SHALL be accepted and recorded in the history.

### Edit History Access Across Session Boundaries

WHEN a member logs out of their current session and logs back in, THE system SHALL still provide access to the full edit history of their todos.

The edit history SHALL be permanently associated with the todo itself, not with any particular user session. A session change SHALL NOT affect the availability or completeness of the edit history.

### Handling Missing or Null Fields in History Entries

WHEN the system creates a history entry for an edit where only a subset of fields changed, THE system SHALL record only the fields that were changed along with their new values.

WHEN a member views an edit history entry, THE system SHALL display only the fields that changed in that particular edit. Fields that were not modified SHALL NOT appear in that history entry.

WHEN a field is changed from a value to null (e.g., removing a previously set start date), THE system SHALL record the change showing the previous value and the new null value in the history entry.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding and First Todo Creation

WHEN a guest user submits a valid registration request with email, password, and display name, THE system SHALL create a new member account and establish a session.

WHEN a newly registered member accesses the application, THE system SHALL display an empty todo list with the option to create a todo.

WHEN a member creates their first todo by providing a title, THE system SHALL save the todo, associate it with the member, set its completion status to incomplete, and record the creation timestamp.

WHEN a member views their todo list after creation, THE system SHALL display the newly created todo showing its title, completion status, and creation date.

### Complete Todo Lifecycle Journey

WHEN a member creates a todo with a title, optional description, optional start date, and optional due date, THE system SHALL save the todo with an incomplete completion status.

WHEN a member edits a todo's title, THE system SHALL update the todo and automatically create an edit history entry recording the previous title and the current timestamp.

WHEN a member edits a todo's description, THE system SHALL update the todo and automatically create an edit history entry recording the previous description and the current timestamp.

WHEN a member marks a todo as complete, THE system SHALL update the todo's completion status to complete.

WHEN a member marks a completed todo as incomplete, THE system SHALL update the todo's completion status to incomplete.

After any completion status change, the toggle remains available: a complete todo can be marked incomplete and vice versa.

WHEN a member deletes a todo, THE system SHALL soft-delete the todo so that it no longer appears in the normal todo list.

WHEN a member views their trash, THE system SHALL display the soft-deleted todo.

WHEN a member restores a soft-deleted todo from the trash, THE system SHALL return it to the normal todo list.

WHEN a member permanently deletes a todo from the trash, THE system SHALL permanently remove the todo and all its associated edit history entries.

### Daily Todo Management Journey

WHEN a member accesses their todo list, THE system SHALL display a paginated list of the member's non-deleted todos.

WHEN a member applies a completion status filter, THE system SHALL display only the subset of todos matching the selected status: all todos, only complete todos, or only incomplete todos.

WHEN a member selects a sort order by creation date, THE system SHALL display todos sorted with newest first or oldest first as chosen.

WHEN a member selects a sort order by start date, THE system SHALL display todos sorted with earliest first or latest first, with todos that have no start date appearing at the end of the list.

WHEN a member selects a sort order by due date, THE system SHALL display todos sorted with earliest first or latest first, with todos that have no due date appearing at the end of the list.

WHEN a member selects a specific todo from the list, THE system SHALL display the full todo detail view including its title, description, start date, due date, completion status, and creation date.

WHEN a member views a todo's edit history, THE system SHALL display all history entries for that todo sorted with the most recent first, showing the timestamp and the previous values of any fields that were changed.

### Account Deletion with Full Data Cleanup

WHEN a member initiates account deletion, THE system SHALL permanently delete the member's account along with all associated data.

As part of account deletion, all active todos owned by the member SHALL be permanently deleted.

As part of account deletion, all todos in the member's trash SHALL be permanently deleted.

As part of account deletion, all edit history entries associated with the member's todos SHALL be permanently deleted.

After account deletion is complete, the former member SHALL no longer be able to log in or access any of their previously owned data.

No further recovery of the deleted account or its data SHALL be possible after the deletion process completes.