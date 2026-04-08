**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can sign up for the application using their email address and a password. After signing up, users log in with their email and password to access their account. Users can change their password at any time to maintain account security. Users can edit their display name to personalize their profile. Users can delete their account, which permanently removes all their todos including those in the trash. Each user's profile and todos are completely private, meaning users cannot view other users' profiles or access their todos. The system ensures that account deletion is irreversible and removes all associated data.

### User Registration

THE system SHALL allow users to sign up with an email address and password.

WHEN a user provides an email address and password, THE system SHALL create a new user account.

THE system SHALL uniquely identify each user account by their email address.

WHEN registration is successful, THE system SHALL allow the user to log in with their credentials.

THE system SHALL associate all user data with their registered account.

### User Login

THE system SHALL allow users to log in with their email address and password.

WHEN a user provides their email and password, THE system SHALL authenticate the user against stored account information.

WHEN authentication is successful, THE system SHALL grant the user access to their personal todo list and profile.

THE system SHALL maintain the user's authenticated session.

WHILE authenticated, THE system SHALL allow users to access only their own data.

### Password Change

THE system SHALL allow authenticated users to change their password.

WHEN a user requests to change their password, THE system SHALL update the user's account credentials.

WHEN password change is successful, THE system SHALL protect the account with the updated password.

THE system SHALL allow users to log in with their new password after the change.

### Profile Editing

THE system SHALL allow users to edit their display name.

THE system SHALL allow users to update their display name at any time.

THE system SHALL allow users to view their own profile information including their display name.

WHEN a user updates their profile, THE system SHALL save the changes.

THE system SHALL prevent users from viewing other users' profile information.

### Account Deletion

THE system SHALL allow users to delete their account.

WHEN a user deletes their account, THE system SHALL permanently remove all their todos including those in trash.

WHEN a user deletes their account, THE system SHALL permanently delete all edit history associated with their todos.

WHEN account deletion is performed, THE system SHALL make it irreversible.

WHEN an account is deleted, THE system SHALL prevent the user from logging in or accessing the application.

WHEN an account is deleted, THE system SHALL invalidate the email address for authentication.

### User Data Privacy

THE system SHALL keep each user's data completely private and isolated from other users.

THE system SHALL allow users to view and access only their own todos and profile information.

THE system SHALL prevent users from viewing, accessing, or sharing another user's todos.

THE system SHALL prevent users from searching for or discovering other users' accounts.

THE system SHALL enforce strict data isolation between all user accounts.

## Todo Operations

Users can create a new todo with a required title and optional description, start date, and due date. Newly created todos are marked as incomplete by default. Users can view a paginated list of their todos showing title, completion status, dates, and creation date. Users can view a single todo to see all details including the full description. Users can toggle a todo between complete and incomplete states. Users can edit their todo's title, description, start date, and due date at any time. Users can delete their own todos, which moves them to trash instead of permanent removal. Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without start dates appear at the end when sorting by start date. Todos without due dates appear at the end when sorting by due date. All todos are private to the user who created them.

### Todo Creation

THE system SHALL allow users to create a new todo with a title (required), description (optional), start date (optional), and due date (optional).

WHEN a user creates a todo, THE system SHALL mark it as incomplete by default.

THE system SHALL associate each newly created todo with the user who created it.

THE system SHALL reject todo creation if the title is missing.

### Todo List Viewing

THE system SHALL provide users with a paginated list view of their todos.

THE system SHALL display the following information for each todo in the list: title, completion status, start date (if set), due date (if set), and creation date.

THE system SHALL only show todos that belong to the viewing user.

### Single Todo Detail View

THE system SHALL allow users to view a single todo with all its details.

THE system SHALL display the full description when viewing a single todo.

THE system SHALL show all todo attributes including title, description, start date, due date, completion status, and creation date.

### Completion Status Toggle

THE system SHALL allow users to mark a todo as complete.

THE system SHALL allow users to mark a todo as incomplete.

THE system SHALL treat completion status as a simple toggle between two states: complete and incomplete.

THE system SHALL only allow users to toggle the completion status of their own todos.

### Todo Editing

THE system SHALL allow users to edit their todo's title.

THE system SHALL allow users to edit their todo's description.

THE system SHALL allow users to edit their todo's start date.

THE system SHALL allow users to edit their todo's due date.

THE system SHALL only allow users to edit their own todos.

### Todo Deletion

THE system SHALL allow users to delete their own todos.

THE system SHALL perform soft delete when a user deletes a todo.

THE system SHALL move deleted todos to trash instead of permanently removing them.

THE system SHALL remove deleted todos from the normal todo list.

THE system SHALL only allow users to delete their own todos.

### Todo Filtering

THE system SHALL allow users to filter their todo list by completion status.

THE system SHALL provide a filter option to show all todos regardless of completion status.

THE system SHALL provide a filter option to show only complete todos.

THE system SHALL provide a filter option to show only incomplete todos.

### Todo Sorting

THE system SHALL allow users to sort their todo list by creation date.

THE system SHALL allow users to sort their todo list by start date.

THE system SHALL allow users to sort their todo list by due date.

THE system SHALL allow sorting in ascending order (oldest first or earliest first).

THE system SHALL allow sorting in descending order (newest first or latest first).

THE system SHALL place todos without a start date at the end when sorting by start date.

THE system SHALL place todos without a due date at the end when sorting by due date.

### Todo Privacy

THE system SHALL keep each user's todos completely private.

THE system SHALL only allow users to view their own todos.

THE system SHALL prevent users from viewing, accessing, or sharing another user's todos.

## EditHistory Operations

Every time a user edits a todo, the system automatically creates a history entry recording the change. Each history entry captures when the edit was made and what specific fields were changed including title, description, start date, and due date. Users can view the complete edit history of any of their todos to track all modifications over time. History entries are displayed from most recent to oldest, allowing users to see the latest changes first. When a user permanently deletes a todo from the trash, all associated edit history is also permanently removed. The edit history provides a complete audit trail of all modifications made to a todo throughout its lifecycle. Users can only access the edit history of their own todos, maintaining data privacy.

### Automatic History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a new edit history entry.

THE system SHALL create a history entry every time any field of a todo is modified.

THE system SHALL not require manual action from the user to record edit history.

IF a todo is edited multiple times, THEN THE system SHALL create a separate history entry for each edit.

### Edit Timestamp Recording

WHEN a history entry is created, THE system SHALL record the date and time when the edit was made.

THE system SHALL capture the exact moment of each edit operation in the history entry.

THE edit timestamp is automatically generated by the system and cannot be modified by the user.

### Field Change Tracking

WHEN a todo's title is changed, THE system SHALL record the new title value in the history entry.

WHEN a todo's description is changed, THE system SHALL record the new description value in the history entry.

WHEN a todo's start date is changed, THE system SHALL record the new start date value in the history entry.

WHEN a todo's due date is changed, THE system SHALL record the new due date value in the history entry.

THE system SHALL record all fields that were modified in a single edit operation.

IF a field is not changed during an edit, THEN THE system SHALL not record that field in the history entry.

### Complete Edit History View

A user can view the complete edit history of any of their own todos.

THE system SHALL display all history entries associated with a todo when the user requests to view edit history.

THE system SHALL show the edit timestamp for each history entry.

THE system SHALL display all field changes recorded in each history entry.

A user can only access the edit history of todos they own.

IF a user attempts to view the edit history of another user's todo, THEN THE system SHALL deny access.

### Most Recent First Sorting

THE system SHALL display edit history entries sorted from most recent to oldest.

THE most recently created history entry SHALL appear first in the list.

THE oldest history entry SHALL appear last in the list.

THE sorting order is automatic and cannot be changed by the user.

### Permanent Deletion with History Removal

WHEN a user permanently deletes a todo from the trash, THE system SHALL also permanently delete all associated edit history entries.

THE system SHALL remove the entire edit history when the parent todo is permanently deleted.

IF a todo is permanently deleted, THEN its edit history SHALL no longer be accessible.

THE edit history SHALL be permanently removed along with the todo and cannot be recovered.

### Modification Audit Trail

THE system SHALL maintain a complete audit trail of all modifications made to a todo throughout its lifecycle.

THE edit history SHALL provide a chronological record of every change made to a todo.

THE system SHALL track the complete lifecycle of a todo from creation through all edits.

THE edit history SHALL remain private and only accessible to the todo's owner.

THE system SHALL preserve all edit history entries until the todo is permanently deleted.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When users sign up, the system rejects requests with duplicate emails already in use. Invalid email formats are not accepted during registration. Password requirements must be met or the signup fails. During login, incorrect email or password combinations prevent access. Users cannot log in with a deleted account. When changing passwords, the system validates the current password before accepting a new one. Weak passwords that don't meet requirements are rejected. Account deletion requires confirmation and permanently removes all user data. Users cannot view or access other users' profiles in this private application. Profile updates with empty display names may be rejected depending on validation rules.

### Registration Error Handling

WHEN a user attempts to sign up with an email address that is already registered, THE system SHALL reject the registration request.

WHEN a user provides an email address in an invalid format during registration, THE system SHALL reject the signup request.

WHEN a user's password does not meet the required strength criteria during registration, THE system SHALL reject the signup request.

WHEN a registration request contains a duplicate email, THE system SHALL inform the user that the email is already in use.

WHEN a registration request contains an invalid email format, THE system SHALL inform the user that the email format is incorrect.

WHEN a registration request contains a weak password, THE system SHALL inform the user that the password does not meet requirements.

### Login Error Handling

WHEN a user attempts to log in with an incorrect email address, THE system SHALL reject the login request.

WHEN a user attempts to log in with an incorrect password, THE system SHALL reject the login request.

WHEN a user attempts to log in with an email address that does not exist in the system, THE system SHALL reject the login request.

WHEN a user attempts to log in with a deleted account, THE system SHALL reject the login request.

WHEN a login request contains invalid credentials, THE system SHALL inform the user that the email or password is incorrect.

WHEN a login request is made with a deleted account, THE system SHALL inform the user that the account no longer exists.

### Password Change Error Handling

WHEN a user attempts to change their password without providing the current password, THE system SHALL reject the password change request.

WHEN a user provides an incorrect current password during a password change, THE system SHALL reject the password change request.

WHEN a user's new password does not meet the required strength criteria, THE system SHALL reject the password change request.

WHEN a password change request contains an incorrect current password, THE system SHALL inform the user that the current password is wrong.

WHEN a password change request contains a weak new password, THE system SHALL inform the user that the new password does not meet requirements.

### Account Deletion Error Handling

WHEN a user confirms account deletion, THE system SHALL permanently remove the user account and all associated data.

WHEN a user deletes their account, THE system SHALL permanently delete all their todos including those in trash.

WHEN a user deletes their account, THE system SHALL permanently delete all edit history for their todos.

WHEN an account is deleted, THE system SHALL prevent any future login attempts with that account.

WHEN a user attempts to log in after account deletion, THE system SHALL reject the login request.

### Profile Access Error Handling

WHEN a user attempts to view another user's profile, THE system SHALL reject the request.

WHEN a user attempts to access another user's profile information, THE system SHALL inform the user that access is denied.

WHEN a user attempts to update their display name to an empty value, THE system SHALL reject the update request.

WHEN a display name update contains an empty value, THE system SHALL inform the user that the display name cannot be empty.

WHEN a user attempts to view any other user's profile in this private application, THE system SHALL deny access.

## Todo Error Scenarios

Creating a todo without a title is not allowed and will be rejected. Users cannot view, edit, or delete another user's todos due to privacy restrictions. Attempting to mark a non-existent todo as complete fails. Editing a todo that doesn't belong to the current user is blocked. Restoring a todo that is not in trash produces an error. Permanently deleting a todo that isn't in trash is not permitted. When sorting by start date, todos without dates appear at the end. When sorting by due date, todos without dates appear at the end. Filtering by completion status on an empty list returns no results. Viewing a single todo that has been deleted from the normal list requires accessing trash. Users cannot create todos with invalid date combinations where start date is after due date if that validation exists.

### Todo Creation Validation Errors

When a user attempts to create a todo without providing a title, the system rejects the request and displays an error message indicating that a title is required.

When a user attempts to create a todo with a start date that is after the due date, the system rejects the request and displays an error message indicating that the start date cannot be after the due date.

### Todo Access Permission Errors

When a user attempts to view a todo that belongs to another user, the system blocks access and displays an error message indicating that the user does not have permission to view this todo.

When a user attempts to edit a todo that does not belong to them, the system blocks the edit and displays an error message indicating that the user does not have permission to edit this todo.

When a user attempts to delete a todo that does not belong to them, the system blocks the deletion and displays an error message indicating that the user does not have permission to delete this todo.

### Todo State Operation Errors

When a user attempts to mark a todo as complete that does not exist, the system rejects the request and displays an error message indicating that the todo was not found.

When a user attempts to mark a todo as incomplete that does not exist, the system rejects the request and displays an error message indicating that the todo was not found.

When a user attempts to view the details of a todo that does not exist, the system displays an error message indicating that the todo was not found.

### Trash Operation Errors

When a user attempts to restore a todo that is not in the trash (i.e., it is in the normal todo list), the system rejects the request and displays an error message indicating that the todo cannot be restored because it is not in the trash.

When a user attempts to permanently delete a todo that is not in the trash, the system blocks the operation and displays an error message indicating that the todo cannot be permanently deleted because it is not in the trash.

When a user attempts to restore a todo that does not exist, the system displays an error message indicating that the todo was not found.

When a user attempts to permanently delete a todo that does not exist, the system displays an error message indicating that the todo was not found.

### Todo List Display Edge Cases

When a user sorts todos by start date, todos without a start date appear at the end of the sorted list.

When a user sorts todos by due date, todos without a due date appear at the end of the sorted list.

When a user filters the todo list by completion status and there are no todos matching the filter criteria, the system displays an empty list with no results.

When a user requests a page of todos beyond the available results, the system displays an empty page or indicates that there are no more results.

When a user attempts to view a single todo that has been deleted from the normal list, the system indicates that the todo is not available in the normal list and must be accessed from the trash.

## EditHistory Error Scenarios

Users cannot view edit history for todos they do not own. Viewing edit history for a permanently deleted todo is impossible since history is deleted with it. Attempting to view history for a todo that doesn't exist fails. Edit history entries are automatically created on each edit, so manual history creation is not supported. Users cannot modify or delete individual history entries. History entries are read-only after creation. Viewing history for a todo in trash is still possible until permanent deletion. Empty edit history is returned for newly created todos with no edits. History entries sorted from most recent to oldest may show no entries for unedited todos. Users cannot restore deleted history entries after permanent todo deletion.

### Unauthorized Edit History Access

WHEN a user attempts to view edit history of another user's todo, THE system SHALL block the access. IF a user tries to access edit history for a todo they do not own, THEN THE system SHALL deny the request. THE system SHALL prevent any form of cross-user edit history access. Unauthorized attempts to access edit history are rejected without revealing whether the todo exists.

### Permanently Deleted Todo History

WHEN a todo is permanently deleted from trash, THE system SHALL delete its edit history. Users cannot view edit history for permanently deleted todos. Deleted edit history entries cannot be restored after permanent todo deletion. Edit history is tied to the todo lifecycle and ceases to exist when the todo is permanently removed. Attempting to access history for a permanently deleted todo fails.

### Non-Existent Todo History Access

WHEN a user attempts to view edit history for a todo that does not exist, THE system SHALL reject the request. Users cannot view edit history for todos that do not exist. The system rejects requests to access history for invalid todo identifiers. Attempting to view history for a todo that was never created fails. The system prevents access to edit history for any todo that cannot be found.

### Edit History Modification Prevention

Users cannot manually create edit history entries. History entries are read-only after creation. Users cannot modify existing history entries. Users cannot delete individual history entries. The system prevents any modification to edit history once it is created.

### Trash and Empty History Scenarios

Users can view edit history for todos currently in trash. Edit history remains accessible until the todo is permanently deleted. Newly created todos have empty edit history with no entries. Users viewing history for unedited todos see no history entries. History entries are displayed sorted from most recent to oldest. Empty history displays show no entries for todos with no edits.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding Journey

A new user can complete the following end-to-end journey to start using the application:

1. Sign up with email and password to create an account
2. Log in with the same email and password
3. Edit their display name to personalize their profile
4. Create their first todo with a title (required) and optional description, start date, and due date
5. View their todo list to see the newly created todo
6. Mark the todo as complete when finished

This multi-step journey allows a new user to register, authenticate, personalize their account, and begin managing tasks from start to finish.

### Todo Lifecycle Management Journey

A user can manage a todo through its complete lifecycle with the following end-to-end journey:

1. Create a todo with title and optional fields (description, start date, due date)
2. View the todo in their paginated todo list
3. Edit the todo's title, description, start date, or due date as needed (each edit creates a history entry)
4. Toggle the completion status between complete and incomplete
5. Delete the todo when no longer needed (moves to trash, no longer appears in normal list)
6. View the todo in their trash list
7. Restore the todo from trash to return it to the normal list, or permanently delete it
8. View the edit history to see all changes made to the todo over time

This complete journey demonstrates how a todo progresses from creation through editing, completion, deletion, and potential restoration or permanent removal.

### Account Management and Cleanup Journey

A user can manage their account and data through the following end-to-end journey:

1. Log in with their email and password
2. Change their password if needed for security
3. Update their display name to reflect current preferences
4. Review their todos and edit history as needed
5. Permanently delete todos from trash when they are no longer needed
6. Delete their account when finished with the application

When a user deletes their account, all their todos (including those in trash) are permanently deleted along with all edit history. This multi-step journey ensures users have full control over their data from account creation through complete removal.