**privateTodoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users create accounts by signing up with their email address and a password. After registration, users log in using their email and password credentials to access their personal workspace. Each user has a profile containing a display name that they can edit at any time. Users can change their password when needed to maintain account security. Account deletion is available, and when a user deletes their account, all their todos including those in trash are permanently removed from the system. This is a completely private application where users cannot view other users' profiles or access anyone else's todos. Each user operates in isolation, with full privacy over their own data and no sharing capabilities.

### Account Registration

Guests can create a new user account by providing an email address and a password.

THE SYSTEM SHALL create a new user account when a guest provides an email address and password during registration.

THE SYSTEM SHALL require both an email address and a password to complete registration.

THE SYSTEM SHALL associate a new user profile with each newly created account.

THE SYSTEM SHALL reject a registration attempt if the email address is already registered to an existing account.

Upon successful registration, THE SYSTEM SHALL enable the user to log in with their registered email and password.

### User Authentication

Users can log in to access their personal workspace using their registered email and password.

THE SYSTEM SHALL authenticate a user when they provide their registered email address and correct password.

THE SYSTEM SHALL reject a login attempt if the email address is not registered.

THE SYSTEM SHALL reject a login attempt if the provided password does not match the registered email address.

Upon successful authentication, THE SYSTEM SHALL grant the user access to their personal todo workspace and profile.

### Password Change

Users can change their account password to maintain account security.

THE SYSTEM SHALL allow authenticated users to change their password.

THE SYSTEM SHALL require the user to provide their current password when changing to a new password.

THE SYSTEM SHALL reject a password change if the provided current password is incorrect.

THE SYSTEM SHALL update the user's password upon successful validation of the current password.

### Account Deletion

Users can permanently delete their account, which removes all their data from the system.

THE SYSTEM SHALL allow authenticated users to delete their account.

When a user deletes their account, THE SYSTEM SHALL permanently remove all of the user's todos, including those currently in the trash.

When a user deletes their account, THE SYSTEM SHALL permanently remove all edit history associated with the user's todos.

Account deletion is permanent and irreversible; THE SYSTEM SHALL NOT provide any means to recover a deleted account or its associated data.

THE SYSTEM SHALL complete the account deletion process and remove all user data from the system.

### User Profile and Privacy

Each user has a private profile containing a display name, and users cannot access other users' profiles.

THE SYSTEM SHALL maintain a profile for each user containing a display name.

THE SYSTEM SHALL allow authenticated users to edit their own display name.

THE SYSTEM SHALL NOT allow users to view other users' profiles.

THE SYSTEM SHALL NOT provide any mechanism for users to access, view, or share other users' profile information.

User data is completely isolated; THE SYSTEM SHALL ensure each user can only access their own todos, profile, and related data.

## Todo Operations

Users create todos with a required title and optional description, start date, and due date. Newly created todos start in an incomplete state by default. Users view their todos in a paginated list showing title, completion status, start date if set, due date if set, and creation date. Users can open a single todo to view all its details including the full description. Completion status can be toggled between complete and incomplete at any time. Users edit todo properties including title, description, start date, and due date, with every edit automatically recorded. Deleting a todo moves it to trash without permanent removal. The trash view shows deleted todos paginated, where users can restore items back to the main list or permanently delete them. Permanent deletion also removes the todo's edit history. Users filter their todo list by completion status to show all, only complete, or only incomplete items. Sorting options include creation date, start date, and due date in ascending or descending order, with todos missing dates appearing at the end of sorted lists.

### Todo Creation

THE SYSTEM SHALL allow users to create a new todo with a title, which is required.

THE SYSTEM SHALL allow users to optionally provide a description when creating a todo, which may be left empty.

THE SYSTEM SHALL allow users to optionally set a start date when creating a todo, which may be left empty.

THE SYSTEM SHALL allow users to optionally set a due date when creating a todo, which may be left empty.

WHEN a new todo is created, THE SYSTEM SHALL set its completion status to incomplete by default.

THE SYSTEM SHALL associate each newly created todo with the user who created it.

IF the title is not provided when creating a todo, THE SYSTEM SHALL reject the creation request.

### Viewing Todo List

THE SYSTEM SHALL allow users to view a list of their own todos.

THE SYSTEM SHALL display each todo in the list with its title, completion status, start date (if set), due date (if set), and creation date.

THE SYSTEM SHALL paginate the todo list.

THE SYSTEM SHALL only show todos belonging to the current user in the todo list.

THE SYSTEM SHALL not show deleted todos in the main todo list.

### Viewing Single Todo

THE SYSTEM SHALL allow users to view the details of a single todo.

THE SYSTEM SHALL display all todo details including the title, description, start date (if set), due date (if set), completion status, and creation date.

IF a user attempts to view a todo that does not belong to them, THE SYSTEM SHALL reject the request.

IF the requested todo does not exist, THE SYSTEM SHALL reject the request.

### Todo Completion

THE SYSTEM SHALL allow users to mark a todo as complete.

THE SYSTEM SHALL allow users to mark a todo as incomplete.

THE SYSTEM SHALL allow users to toggle the completion status of a todo between complete and incomplete at any time.

IF a user attempts to change the completion status of a todo that does not belong to them, THE SYSTEM SHALL reject the request.

IF the requested todo does not exist, THE SYSTEM SHALL reject the request.

### Editing Todos

THE SYSTEM SHALL allow users to edit the title of their todos.

THE SYSTEM SHALL allow users to edit the description of their todos.

THE SYSTEM SHALL allow users to edit the start date of their todos.

THE SYSTEM SHALL allow users to edit the due date of their todos.

WHEN a todo is edited, THE SYSTEM SHALL record the edit in the todo's history.

IF a user attempts to edit a todo that does not belong to them, THE SYSTEM SHALL reject the request.

IF the requested todo does not exist, THE SYSTEM SHALL reject the request.

### Deleting Todos

THE SYSTEM SHALL allow users to delete their own todos.

WHEN a todo is deleted, THE SYSTEM SHALL move it to the trash without permanently removing it.

THE SYSTEM SHALL not display deleted todos in the main todo list.

IF a user attempts to delete a todo that does not belong to them, THE SYSTEM SHALL reject the request.

IF the requested todo does not exist, THE SYSTEM SHALL reject the request.

### Trash Management

THE SYSTEM SHALL allow users to view a list of their deleted todos in the trash.

THE SYSTEM SHALL paginate the trash list.

THE SYSTEM SHALL only show deleted todos belonging to the current user in the trash.

THE SYSTEM SHALL allow users to restore a deleted todo from the trash back to the main todo list.

THE SYSTEM SHALL allow users to permanently delete a todo from the trash.

WHEN a todo is permanently deleted, THE SYSTEM SHALL also delete all of its edit history.

IF a user attempts to restore or permanently delete a todo that does not belong to them, THE SYSTEM SHALL reject the request.

IF the requested todo does not exist in the trash, THE SYSTEM SHALL reject the request.

### Filtering Todos

THE SYSTEM SHALL allow users to filter their todo list by completion status.

THE SYSTEM SHALL provide an option to show all todos regardless of completion status.

THE SYSTEM SHALL provide an option to show only complete todos.

THE SYSTEM SHALL provide an option to show only incomplete todos.

THE SYSTEM SHALL apply the selected filter to the user's own todos only.

### Sorting Todos

THE SYSTEM SHALL allow users to sort their todo list by creation date.

THE SYSTEM SHALL allow users to sort their todo list by start date.

THE SYSTEM SHALL allow users to sort their todo list by due date.

THE SYSTEM SHALL allow users to choose the sort order as either newest/earliest first or oldest/latest first.

WHEN sorting by start date, THE SYSTEM SHALL place todos without a start date at the end of the list.

WHEN sorting by due date, THE SYSTEM SHALL place todos without a due date at the end of the list.

## EditHistory Operations

Every todo maintains an edit history that automatically records changes. When users modify a todo's title, description, start date, or due date, the system creates a history entry documenting what changed. Each history entry captures when the edit occurred and which specific fields were modified with their new values. Users can view the complete edit history for any of their todos to track how the todo evolved over time. History entries are displayed from most recent to oldest, making it easy to see the latest changes first. The edit history provides an audit trail of all modifications made to a todo. When a todo is permanently deleted from trash, its entire edit history is also permanently removed from the system.

### Automatic History Recording

WHEN a user edits a todo's title, description, start date, or due date, THE system SHALL create a new history entry documenting the changes.

THE system SHALL automatically record every edit to a todo without requiring any user action to enable history tracking.

THE system SHALL maintain a complete audit trail of all modifications made to each todo throughout its lifecycle.

WHEN a todo is newly created, THE system SHALL NOT create an initial history entry as no edits have occurred yet.

WHEN a user views a todo, THE system SHALL provide access to the complete edit history showing how the todo has evolved over time.

### Field Change Tracking

WHEN a todo's title is modified, THE system SHALL record the new title value in the history entry.

WHEN a todo's description is modified, THE system SHALL record the new description value in the history entry.

WHEN a todo's start date is modified, THE system SHALL record the new start date value in the history entry.

WHEN a todo's due date is modified, THE system SHALL record the new due date value in the history entry.

WHEN multiple fields are modified in a single edit operation, THE system SHALL record all changed fields in a single history entry.

WHEN a field is not changed during an edit, THE system SHALL not record that field in the history entry for that modification.

THE system SHALL only track changes to title, description, start date, and due date, not other todo properties such as completion status.

### Viewing Edit History

THE system SHALL allow users to view the complete edit history for any of their todos.

WHEN a user views the edit history of a todo, THE system SHALL display all history entries sorted from most recent to oldest.

THE system SHALL display the timestamp of when each edit was made for every history entry.

WHEN a history entry is displayed, THE system SHALL show which specific fields were changed and their new values.

WHEN a user attempts to view the edit history of a todo belonging to another user, THE system SHALL deny access to maintain privacy.

THE system SHALL display history entries in chronological order by edit time, with the newest edits appearing first in the list.

### History Lifecycle

WHEN a todo is moved to trash via soft delete, THE system SHALL preserve all edit history entries for that todo.

WHEN a todo is restored from trash, THE system SHALL retain all existing edit history entries.

WHEN a todo is permanently deleted from trash, THE system SHALL permanently remove all edit history entries associated with that todo.

THE system SHALL not provide a way to restore edit history once it has been permanently deleted along with its parent todo.

THE system SHALL not allow users to modify or delete individual history entries, preserving the integrity of the audit trail.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When a user attempts to sign up with an email address that is already registered, the system rejects the registration and notifies the user that the email is already in use. Users cannot sign up without providing both an email and a password, as these are required fields for account creation. Login attempts with an unregistered email or incorrect password are rejected with an appropriate error message. When changing a password, if the current password provided does not match the stored password, the change is rejected and the user is asked to try again. Deleting an account permanently removes all of the user's todos, including those in the trash, and this action cannot be undone. Users cannot view other users' profiles in any circumstance, as this is a private todo application with strict privacy boundaries.

### Sign Up Error Scenarios

IF a guest attempts to sign up with an email address that is already registered, THE system SHALL reject the registration request and notify the user that the email is already in use.

IF a guest attempts to sign up without providing an email address, THE system SHALL reject the registration request and indicate that email is a required field.

IF a guest attempts to sign up without providing a password, THE system SHALL reject the registration request and indicate that password is a required field.

IF a guest attempts to sign up with both email and password missing, THE system SHALL reject the registration request and indicate that both fields are required.

THE system SHALL prevent duplicate email registration across all sign up attempts.

IF a registration is rejected due to an existing email, THE system SHALL NOT reveal any information about the existing account holder.

### Login Error Scenarios

IF a user attempts to log in with an email address that is not registered in the system, THE system SHALL reject the login attempt with an appropriate error message.

IF a user attempts to log in with a password that does not match the stored password for the provided email, THE system SHALL reject the login attempt with an appropriate error message.

IF a login attempt fails, THE system SHALL NOT indicate whether the email or password was incorrect, to prevent account enumeration attacks.

THE system SHALL require both email and password fields to be provided for any login attempt.

IF either email or password is missing from a login request, THE system SHALL reject the request and indicate that both fields are required.

### Password Change Error Scenarios

IF a user attempts to change their password and the provided current password does not match the stored password, THE system SHALL reject the change request.

IF the current password is incorrect, THE system SHALL notify the user that the current password does not match and ask them to try again.

IF a password change is rejected due to incorrect current password, THE system SHALL NOT change the stored password.

THE system SHALL require the user to provide their current password before allowing any password change.

IF a user submits an empty current password when requesting a password change, THE system SHALL reject the request.

### Account Deletion Error Scenarios

IF a user requests account deletion, THE system SHALL permanently delete all of the user's todos, including those currently in the trash.

IF an account is deleted, THE system SHALL NOT retain any of the user's todo data.

THE system SHALL NOT provide any mechanism to recover a deleted account or its associated data.

IF a user deletes their account, THE system SHALL ensure the action is irreversible.

THE system SHALL warn users that account deletion is permanent and cannot be undone before processing the deletion.

IF account deletion is initiated, THE system SHALL remove the user's profile information along with all associated data.

### Profile Privacy Enforcement

IF a user attempts to view another user's profile, THE system SHALL block the request and prevent access.

THE system SHALL NOT provide any mechanism for users to view, access, or retrieve information about other users' profiles.

IF an unauthorized profile access attempt is made, THE system SHALL reject the request without revealing whether the target profile exists.

THE system SHALL enforce strict privacy boundaries that prevent any cross-user profile visibility.

IF a user's own profile is accessed, THE system SHALL allow the user to view only their own display name.

THE system SHALL ensure that profile privacy is maintained across all operations, with no exceptions.

## Todo Error Scenarios

Creating a todo without a title is not allowed, as the title is a required field that must be provided. Users cannot create, edit, delete, or view todos belonging to other users, and any attempt to do so is blocked with an access denied message. When sorting todos by start date or due date, todos without these dates are consistently placed at the end of the list rather than being excluded. Restoring a todo from the trash is only possible if the todo has not been permanently deleted; attempting to restore a non-existent todo results in an error. Permanently deleting a todo from the trash also removes its entire edit history, and this action cannot be reversed. When viewing a single todo that does not exist or belongs to another user, the user receives a not found or access denied response.

### Todo Creation Errors

### Required Title Validation

THE system SHALL reject any attempt to create a todo without a title.

When a user attempts to create a todo with an empty or missing title, THE system SHALL reject the request and display an error message indicating that the title is required.

THE system SHALL NOT create a todo when the title field is empty or not provided.

### Creation Request Handling

THE system SHALL process todo creation requests only when all required fields are provided.

When a valid todo creation request is submitted, THE system SHALL create the todo and associate it with the requesting user.

THE system SHALL NOT create a todo belonging to any user other than the requesting user.

### Todo Access and Authorization Errors

### Cross-User Access Prevention

THE system SHALL prevent users from accessing todos belonging to other users.

When a user attempts to view, edit, delete, or perform any operation on a todo they do not own, THE system SHALL reject the request with an access denied response.

THE system SHALL NOT reveal whether a todo exists for another user when access is denied.

### Privacy Enforcement

THE system SHALL enforce complete privacy of each user's todos.

When any todo operation is attempted by a user who is not the owner, THE system SHALL block the operation.

THE system SHALL treat any unauthorized access attempt as a privacy violation and reject it.

### Non-Existent Todo Handling

When a user attempts to view, edit, or delete a todo that does not exist, THE system SHALL respond with a not found message.

When a user attempts to access a todo that has been permanently deleted, THE system SHALL respond as if the todo never existed.

THE system SHALL NOT differentiate in error responses between todos that never existed and todos that were permanently deleted.

### Unauthorized Operation Blocking

THE system SHALL block any todo operation attempted by unauthorized users.

When an unauthenticated user attempts any todo operation, THE system SHALL reject the request and require authentication.

When a user attempts to perform an operation on another user's todo, THE system SHALL reject the request with an access denied message.

### Todo Sorting Edge Cases

### Missing Date Handling in Sorting

When sorting todos by start date, THE system SHALL place todos without a start date at the end of the sorted list.

When sorting todos by due date, THE system SHALL place todos without a due date at the end of the sorted list.

THE system SHALL consistently apply this placement rule regardless of whether sorting in ascending or descending order.

When multiple todos lack the date field being sorted, THE system SHALL order them by their creation date.

THE system SHALL NOT exclude todos from the list when they are missing the date field used for sorting.

### Trash Operation Errors

### Restore Operation Errors

When a user attempts to restore a todo from the trash that has already been permanently deleted, THE system SHALL respond with a not found message.

When a user attempts to restore a todo that was never deleted, THE system SHALL reject the request.

THE system SHALL NOT allow restoration of todos belonging to other users.

### Permanent Deletion Consequences

When a todo is permanently deleted from the trash, THE system SHALL delete all associated edit history entries.

When a user permanently deletes a todo, THE system SHALL NOT retain any record of the todo's history.

THE system SHALL NOT allow recovery of edit history after permanent deletion.

### Duplicate Deletion Handling

When a user attempts to delete a todo that is already in the trash, THE system SHALL respond with an appropriate message indicating the todo is already deleted.

When a user attempts to permanently delete a todo that has already been permanently deleted, THE system SHALL respond with a not found message.

THE system SHALL prevent duplicate soft deletion of the same todo.

### Trash Access Authorization

THE system SHALL restrict trash access to only the owning user.

When a user attempts to view or operate on another user's trash items, THE system SHALL reject the request with an access denied message.

## EditHistory Error Scenarios

Edit history entries are automatically created and cannot be manually modified or deleted by users, ensuring an accurate record of all changes. When a todo is permanently deleted from the trash, its entire edit history is also removed and cannot be recovered. Users cannot view the edit history of todos belonging to other users, as this would violate the privacy requirements of the application. A newly created todo has no edit history until it is edited for the first time. When viewing edit history, entries are always displayed in order from most recent to oldest, with no option to reorder them. If a todo has never been edited after creation, attempting to view its edit history shows an empty history list.

### Read-Only History Records

Edit history entries are always displayed in order from most recent to oldest. Users cannot change this sort order or reorder the history entries. If a user attempts to request a different sort order for history entries, the system ignores the request and returns entries in the default reverse chronological order. This fixed ordering ensures a consistent and predictable view of how a todo has evolved over time.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Registration and First Todo Creation

A guest user can sign up with their email and password to create a member account. Upon successful registration, the user can log in with the same credentials. After logging in, the user can create their first todo by providing a title (required), with optional description, start date, and due date. The newly created todo appears in their todo list immediately. This end-to-end journey transforms an unauthenticated visitor into an active user with their first todo item.

### Complete Todo Lifecycle Management

A logged-in user can create a todo with all available fields. The user can then edit the todo's title, description, start date, or due date, with each change automatically recorded in the todo's edit history. The user can mark the todo as complete when finished. If the user decides the todo is no longer needed, they can delete it, which moves it to the trash. From the trash, the user can either restore the todo back to the normal list or permanently delete it, which also removes all associated edit history entries.

### Todo Organization and Discovery Workflow

A logged-in user with multiple todos can organize and discover their tasks through filtering and sorting. The user can view their paginated todo list and filter it to show all todos, only complete todos, or only incomplete todos. The user can sort the list by creation date, start date, or due date in ascending or descending order. When sorting by start date or due date, todos without those dates appear at the end of the list. The user can click on any todo in the list to view its full details including the complete description. This multi-step workflow allows users to efficiently manage and locate specific todos within their collection.

### Account Lifecycle with Data Cleanup

A logged-in user can manage their account throughout its lifecycle. The user can update their display name in their profile at any time. The user can change their password by providing their current password and new password. When the user decides to leave the application, they can delete their account. Account deletion permanently removes all user data, including all todos (both active and those in trash) and all associated edit history entries. This end-to-end journey ensures complete data cleanup when a user exits the system.