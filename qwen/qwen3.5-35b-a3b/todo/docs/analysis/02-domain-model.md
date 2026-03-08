**todoApp — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means to users and why it exists.

## User Concept

Users are individuals who create and manage their own private todo lists. Each user creates an account using their email address and a password. Once registered, users can log in to access their personal todo data. Users have a profile that includes a display name which identifies them within the application. The display name can be updated at any time by the user through profile settings. Users have the ability to change their password when needed for security purposes. Users can delete their entire account, which permanently removes all their todos including those in trash. All user data remains completely private and inaccessible to other users in the system. There is no way to view, access, or share another user's account or todo data. User accounts are completely isolated from one another for privacy protection. Email addresses must be unique across all active accounts in the system. New accounts require email verification before full access is granted. Passwords must meet security requirements to protect account integrity.

### User Account Creation

WHEN a user creates an account, THE system SHALL:
1. Accept an email address and password
2. Verify that the email address is not already registered
3. Create a new user account with the provided credentials
4. Mark the account as requiring email verification

IF the email address is already registered, THE system SHALL reject the account creation request.
IF the email format is invalid, THE system SHALL reject the account creation request.

THE system SHALL display an error message when the email address is already in use.

WHEN a new account is created, THE system SHALL require email verification before the user can access their todo list.

THE system SHALL send a verification email to the address provided during account creation.

THE system SHALL mark the account as active only after the user verifies their email address through the provided link.

IF email verification fails or the verification link expires, THE system SHALL allow the user to request a new verification email.

THE system SHALL prevent access to todo creation features until email verification is complete.

IF the password does not meet security requirements, THE system SHALL reject the account creation request with a clear error message.

WHEN a user successfully verifies their email, THE system SHALL notify the user that their account is now active and they can access all features.

### Email and Password Authentication

WHEN a user logs in, THE system SHALL accept their email address and password.

WHEN credentials are provided, THE system SHALL validate the email address and password against stored account data.

IF the email address is not found in the system, THE system SHALL display a generic authentication error message.

IF the password does not match the stored password hash, THE system SHALL display a generic authentication error message.

THE system SHALL allow a user to log in only if their account has verified email.

IF the user has not verified their email, THE system SHALL prevent login and display a message to verify their email address first.

WHEN a user successfully authenticates, THE system SHALL create an authenticated session for the user.

THE system SHALL maintain the user's session for the duration specified in the session policy.

IF the session expires, THE system SHALL require the user to re-authenticate to access their account.

THE system SHALL display an appropriate error message when authentication fails due to incorrect credentials.

THE system SHALL track unsuccessful login attempts and display an account lockout warning if too many attempts occur in succession.

WHEN a user logs out, THE system SHALL terminate the active session immediately.

### Profile Management and Display Name

WHEN a user views their profile, THE system SHALL display their current display name and email address.

WHEN a user edits their profile, THE system SHALL allow them to update their display name.

THE system SHALL accept display name updates that are non-empty strings.

IF the display name is empty or contains only whitespace, THE system SHALL reject the update request.

IF the display name exceeds the maximum allowed length, THE system SHALL reject the update request with an error message.

WHEN a user successfully updates their display name, THE system SHALL save the change immediately and display a confirmation message.

THE system SHALL validate that the display name does not contain prohibited characters.

IF the display name contains prohibited characters, THE system SHALL reject the update and display an error indicating which characters are not allowed.

THE system SHALL display the updated display name across all user-facing features after it is changed.

WHEN a user views their profile, THE system SHALL show their current email address even if the user cannot edit it.

THE system SHALL prevent users from changing their email address through the profile management interface.

IF a user needs to change their email address, THE system SHALL direct them to contact customer support.

### Password Change

WHEN a user requests to change their password, THE system SHALL require the user to be authenticated.

WHEN changing a password, THE system SHALL require the user to provide their current password and their new password.

THE system SHALL validate that the new password meets all security requirements.

IF the current password provided is incorrect, THE system SHALL reject the password change request.

IF the new password is identical to the current password, THE system SHALL reject the change request with an error message.

IF the new password does not meet security requirements, THE system SHALL display specific guidance on what requirements are not met.

WHEN a password is successfully changed, THE system SHALL update the stored password hash immediately.

THE system SHALL log out all active sessions for the user after a password change to enforce re-authentication.

THE system SHALL notify the user that their password has been successfully changed.

IF the user cancels the password change process, THE system SHALL retain their original password.

THE system SHALL encrypt all password changes during transmission to protect user credentials.

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL require the user to re-enter their password for confirmation.

WHEN account deletion is confirmed, THE system SHALL permanently delete the user account.

IF the user does not confirm the deletion by re-entering their password, THE system SHALL not proceed with account deletion.

WHEN an account is deleted, THE system SHALL permanently delete all todos associated with that user.

IF the user has todos in the trash, THE system SHALL permanently delete those todos as well.

THE system SHALL permanently delete all edit history entries associated with the user's deleted todos.

WHEN account deletion is complete, THE system SHALL terminate all active sessions for that user.

THE system SHALL display a confirmation message after successful account deletion.

IF the account deletion process encounters an error, THE system SHALL cancel the deletion and display an appropriate error message.

WHEN a user deletes their account, THE system SHALL remove all user-provided data from active storage.

THE system SHALL provide a warning message before account deletion that explains all data will be permanently lost.

AFTER account deletion, THE system SHALL not allow the user to log in with the deleted account credentials.

IF a user attempts to register with an email that was previously used for a deleted account, THE system SHALL allow new account creation with that email.

### Privacy and User Isolation

THE system SHALL ensure that each user can only view their own todos.

WHEN a user accesses their todo list, THE system SHALL display only todos owned by that user.

IF a user attempts to access another user's todo by ID or other identifier, THE system SHALL deny access and display an access denied message.

THE system SHALL not provide any functionality to view, access, or share another user's todo data.

IF a user's session expires or is invalidated, THE system SHALL not allow them to access any todo data.

WHEN a user logs in with their credentials, THE system SHALL only expose data belonging to that user's account.

THE system SHALL ensure that user data cannot be accessed through any indirect means such as URL manipulation or API parameter tampering.

IF a request is made with authentication tokens belonging to a different user, THE system SHALL reject the request.

THE system SHALL not display any information about other users to a logged-in user.

WHEN a user deletes their account, THE system SHALL ensure no other user can access their previously created todos.

THE system SHALL implement access control checks on every request to ensure data isolation between users.

IF the system detects any attempt to access data belonging to another user, THE system SHALL log the access attempt for security review.

## Todo Concept

Todos represent individual tasks or action items that users create and manage. Each todo requires a title while the description, start date, and due date are optional fields. Newly created todos are marked as incomplete by default and can be toggled to complete status at any time. Users can view their todos in a paginated list showing title, completion status, and relevant dates. Single todo view displays all details including the full description. Users can edit todo title, description, start date, and due date with each edit recorded in history. Deleted todos are softly removed from the normal list and moved to trash for potential recovery. Users can permanently delete todos from trash, which also removes associated edit history. Todos are filtered by completion status showing all, complete only, or incomplete only options. Sorting by creation date, start date, or due date allows different views of the todo list. Todos without start or due dates appear at the end when sorting by those criteria. All todos remain completely private to their owner with no sharing capability.

### Todo Creation

WHEN a user creates a todo, THE system SHALL:
1. Require a title field
2. Allow an optional description field
3. Allow an optional start date field
4. Allow an optional due date field
5. Mark the todo as incomplete by default

IF the title is missing, THE system SHALL reject the creation request.
IF the title is empty, THE system SHALL reject the creation request.

### Todo Viewing

WHEN a user views their todo list, THE system SHALL:
1. Display todos in paginated format
2. Show each todo's title, completion status, start date (if set), due date (if set), and creation date
3. Allow the user to select a specific todo to view its full details including complete description

IF the user requests a todo that does not exist, THE system SHALL reject the request.
IF the user requests a todo owned by another user, THE system SHALL reject the request.

### Completion Status Toggle

WHILE a todo is in incomplete status, THE system SHALL allow the user to mark it as complete.

WHILE a todo is in complete status, THE system SHALL allow the user to mark it as incomplete.

WHEN a user toggles the completion status of a todo, THE system SHALL immediately update the todo's state.

IF the todo does not exist, THE system SHALL reject the status toggle request.

### Todo Editing

WHEN a user edits a todo's title, THE system SHALL accept the new title value.

WHEN a user edits a todo's description, THE system SHALL accept the new description value.

WHEN a user edits a todo's start date, THE system SHALL accept the new start date value.

WHEN a user edits a todo's due date, THE system SHALL accept the new due date value.

IF the user attempts to edit a todo they do not own, THE system SHALL reject the edit request.
IF the todo being edited does not exist, THE system SHALL reject the edit request.

### Edit History Recording

WHEN a todo is edited, THE system SHALL automatically create a history entry.

WHEN a history entry is created, THE system SHALL record the timestamp of when the edit was made.

IF the title was changed during the edit, THE system SHALL record the previous title and new title in the history entry.

IF the description was changed during the edit, THE system SHALL record the previous description and new description in the history entry.

IF the start date was changed during the edit, THE system SHALL record the previous start date and new start date in the history entry.

IF the due date was changed during the edit, THE system SHALL record the previous due date and new due date in the history entry.

IF the user does not have access to the todo, THE system SHALL not create a history entry.

### Edit History Viewing

WHEN a user requests to view the edit history of a todo, THE system SHALL display all history entries for that todo.

WHEN history entries are displayed, THE system SHALL sort them from most recent to oldest.

IF the todo has no edit history, THE system SHALL display an empty list.
IF the user does not own the todo, THE system SHALL reject the history view request.

### Soft Delete to Trash

WHEN a user deletes a todo, THE system SHALL perform a soft delete and move the todo to the trash.

WHEN a todo is moved to trash, THE system SHALL remove it from the normal todo list.

WHEN a todo is in trash, THE system SHALL preserve all its data including edit history.

IF the todo does not exist, THE system SHALL reject the delete request.
IF the user does not own the todo, THE system SHALL reject the delete request.

### Restore from Trash

WHEN a user requests to restore a todo from trash, THE system SHALL move it back to the normal todo list.

WHEN a todo is restored from trash, THE system SHALL preserve its original data including completion status, dates, and edit history.

IF the todo in trash does not exist, THE system SHALL reject the restore request.
IF the user does not own the todo in trash, THE system SHALL reject the restore request.

### Permanent Deletion

WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo from the system.

WHEN a todo is permanently deleted, THE system SHALL also delete its associated edit history.

IF the todo is not in trash, THE system SHALL reject the permanent deletion request.
IF the user does not own the todo, THE system SHALL reject the permanent deletion request.

### Trash Management

WHEN a user views their trash, THE system SHALL display a paginated list of deleted todos.

WHEN viewing trash, THE system SHALL show the same fields as the normal todo list.

WHEN a todo is restored from trash, THE system SHALL remove it from the trash list.

WHEN a todo is permanently deleted from trash, THE system SHALL remove it from the trash list.

IF the user requests trash with no deleted todos, THE system SHALL display an empty list.

### Completion Status Filtering

WHEN a user filters their todo list by completion status, THE system SHALL display only todos matching the filter criteria.

IF the filter is set to "all todos", THE system SHALL display all todos including complete and incomplete.

IF the filter is set to "only complete todos", THE system SHALL display only todos marked as complete.

IF the filter is set to "only incomplete todos", THE system SHALL display only todos marked as incomplete.

IF the filter criteria is invalid, THE system SHALL reject the request.

### Creation Date Sorting

WHEN a user sorts their todo list by creation date, THE system SHALL order todos by their creation timestamp.

IF the sort order is "newest first", THE system SHALL display the most recently created todos first.

IF the sort order is "oldest first", THE system SHALL display the oldest created todos first.

IF the user does not have todos, THE system SHALL display an empty list.

### Start Date Sorting

WHEN a user sorts their todo list by start date, THE system SHALL order todos by their start date value.

IF a todo does not have a start date, THE system SHALL place it at the end of the sorted list.

IF the sort order is "earliest first", THE system SHALL display todos with earlier start dates first.

IF the sort order is "latest first", THE system SHALL display todos with later start dates first.

### Due Date Sorting

WHEN a user sorts their todo list by due date, THE system SHALL order todos by their due date value.

IF a todo does not have a due date, THE system SHALL place it at the end of the sorted list.

IF the sort order is "earliest first", THE system SHALL display todos with earlier due dates first.

IF the sort order is "latest first", THE system SHALL display todos with later due dates first.

### Privacy Isolation

WHEN any user accesses the todo list, THE system SHALL display only todos owned by that user.

WHEN any user requests to view a specific todo, THE system SHALL verify ownership before displaying.

WHEN any user attempts to access another user's todo, THE system SHALL reject the access request.

WHEN any user attempts to edit another user's todo, THE system SHALL reject the edit request.

WHEN any user attempts to delete another user's todo, THE system SHALL reject the delete request.

WHEN any user attempts to view another user's edit history, THE system SHALL reject the history view request.

## EditHistory Concept

Edit history tracks every modification made to a todo by its owner. Each time a todo is edited, a new history entry is created automatically. History entries record the timestamp when the edit occurred and who made the change. The history captures previous values for title, description, start date, and due date that were changed. Users can view the complete edit history of any of their todos. History entries are displayed in chronological order with most recent changes appearing first. Each history entry shows which fields were modified and what their new values became. Users can trace the evolution of any todo through its complete edit history. Edit history is permanently deleted when a todo is permanently removed from trash. The history system provides transparency about todo changes over time. Users cannot modify or delete individual history entries once created. Edit history helps users track progress and maintain accountability for changes.

### Edit History Tracking

WHEN a todo is edited, THE system SHALL automatically create a new edit history entry.

WHEN an edit history entry is created, THE system SHALL record the timestamp of when the edit occurred.

WHEN any field of a todo is modified, THE system SHALL record the field name and the new value in the history entry.

THE system SHALL record which user made each edit in the history entry.

WHERE multiple fields are changed in a single edit, THE system SHALL create a single history entry containing all changed fields.

IF a todo field is unchanged during an edit, THE system SHALL NOT record that field in the history entry.

### Edit History Visibility

THE system SHALL display the complete edit history of any todo owned by the current user.

THE system SHALL display history entries in chronological order with the most recent entries first.

THE system SHALL NOT allow users to view edit history of todos they do not own.

THE system SHALL show the previous value of each modified field in the history entry.

THE system SHALL show the new value of each modified field in the history entry.

THE system SHALL indicate which fields were modified in each history entry.

### Automatic Entry Creation

WHEN a user creates a new todo, THE system SHALL create the initial todo without any edit history entries.

WHEN a user edits a todo, THE system SHALL create a new history entry before applying the changes.

THE system SHALL create an edit history entry for every single edit operation on a todo.

THE system SHALL NOT allow users to create edit history entries manually.

### History Deletion Rules

WHEN a user permanently deletes a todo from trash, THE system SHALL permanently delete all associated edit history entries.

WHEN a todo is restored from trash, THE system SHALL preserve its complete edit history.

THE system SHALL NOT allow users to delete individual edit history entries.

WHEN a todo is deleted (moved to trash), THE system SHALL NOT delete its edit history entries.

### Immutable History Records

WHEN an edit history entry is created, THE system SHALL make it immutable.

THE system SHALL NOT allow any user to modify existing edit history entries.

THE system SHALL NOT allow any user to delete individual edit history entries.

THE system SHALL preserve the original timestamp for each history entry.

THE system SHALL ensure that edit history entries cannot be altered after creation.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### User-Todo Ownership

THE system SHALL enforce that each todo belongs to exactly one user.
THE system SHALL enforce that each user can own multiple todos (has-many relationship).
THE system SHALL enforce that users can only access their own todos.
THE system SHALL NOT allow any todo to be shared between multiple users.
THE system SHALL permanently associate todos with their owning user at creation.
IF a user account is deleted, THE system SHALL also delete all associated todos.

### Todo-EditHistory Association

WHEN a todo is edited, THE system SHALL create an edit history entry.
THE system SHALL record the timestamp of every edit made to a todo.
THE system SHALL record the previous and new values for any changed field (title, description, start date, due date).
THE system SHALL maintain edit history entries sorted by most recent to oldest.
THE system SHALL associate each edit history entry with the specific todo it describes.
THE system SHALL associate each edit history entry with the user who made the edit.
IF a todo is permanently deleted, THE system SHALL also delete its edit history.
THE system SHALL NOT restore edit history when a todo is restored from trash.

### Privacy and Data Isolation

WHEN a user views their todo list, THE system SHALL only display that user's own todos.
THE system SHALL NOT provide any mechanism for users to access another user's todos.
THE system SHALL NOT display any identifying information about other users in todo records.
THE system SHALL enforce complete data isolation between all user accounts.
IF a user attempts to access another user's todo, THE system SHALL reject the request.
THE system SHALL treat each user's todo list as a private collection.

### Todo State and Lifecycle

WHEN a todo is created, THE system SHALL mark it as incomplete by default.
THE system SHALL allow users to toggle todo completion status between complete and incomplete.
THE system SHALL allow users to filter todo views by completion status.
THE system SHALL provide filter options: all todos, only complete todos, only incomplete todos.
THE system SHALL persist the completion state across sessions.
THE system SHALL allow users to sort todos by completion status.
WHEN a todo is restored from trash, THE system SHALL preserve its completion status.

## Lifecycle and Retention

Describe business rules for concept lifecycle and data retention from a user perspective.

### Todo Lifecycle States

WHEN a todo is created, THE system SHALL set its state to active.

WHEN a todo is deleted, THE system SHALL move it to trash.

WHEN a todo is in trash, THE system SHALL prevent it from appearing in the normal todo list.

WHEN a todo is restored from trash, THE system SHALL move it back to active state.

WHEN a todo is permanently deleted from trash, THE system SHALL remove it from the system.

IF a todo is restored from trash, THE system SHALL ensure all its edit history is preserved.

THE system SHALL NOT allow an active todo to be moved directly to permanent deletion.
THE system SHALL NOT allow a permanently deleted todo to be recovered.

WHILE a todo is in trash, THE system SHALL allow it to be restored.
WHILE a todo is in trash, THE system SHALL allow it to be permanently deleted.

### Edit History Retention

WHEN a todo is edited, THE system SHALL create an edit history entry.

EACH edit history entry SHALL record when the edit was made.
EACH edit history entry SHALL record what the title was changed to (if changed).
EACH edit history entry SHALL record what the description was changed to (if changed).
EACH edit history entry SHALL record what the start date was changed to (if changed).
EACH edit history entry SHALL record what the due date was changed to (if changed).

WHEN a todo is in active state, THE system SHALL preserve all its edit history.
WHEN a todo is in trash, THE system SHALL preserve all its edit history.

IF a todo is permanently deleted from trash, THE system SHALL also permanently delete its edit history.
THE system SHALL NOT delete edit history when a todo is moved to trash.

EDIT HISTORY entries SHALL be sorted from most recent to oldest when viewed by the user.

### Trash and Archival

WHEN a user deletes a todo, THE system SHALL move it to trash.

WHEN a user views trash, THE system SHALL show only their deleted todos.

A user can view a list of their trash todos.

WHEN a todo is in trash, THE system SHALL allow it to be restored.
WHEN a todo is in trash, THE system SHALL allow it to be permanently deleted.

A user can restore a deleted todo from trash.
A user can permanently delete a todo from trash.

WHEN a todo is restored from trash, THE system SHALL return it to the normal todo list.
WHEN a todo is permanently deleted from trash, THE system SHALL remove it from the system.

THE system SHALL NOT allow viewing another user's trash.
THE system SHALL NOT allow viewing another user's todos.

### Deletion Policies

IF a user deletes their account, THE system SHALL permanently delete all their todos, including those in trash.

IF a user deletes their account, THE system SHALL permanently delete all their edit history.

IF a user permanently deletes a todo from trash, THE system SHALL delete the todo and its edit history.

WHEN a todo is permanently deleted, THE system SHALL ensure it cannot be recovered.

IF a user's account is deleted, THE system SHALL delete the account's todos, trash, and edit history.

THE system SHALL distinguish between moving to trash and permanent deletion.

IF a user is a guest, THE system SHALL NOT provide deletion functionality.
IF a user is a member, THE system SHALL provide deletion functionality for their todos.

### Recovery Options

A user can recover a deleted todo by restoring it from trash.

WHEN a todo is restored from trash, THE system SHALL ensure it appears in the normal todo list.

WHEN a todo is restored from trash, THE system SHALL preserve all its edit history.

IF a todo is permanently deleted from trash, THE system SHALL NOT allow recovery.

A user can recover their account todos by preventing account deletion.

WHEN a user deletes their account, THE system SHALL NOT provide recovery options for the deleted data.

THE system SHALL provide a deletion path from trash to permanent deletion.
THE system SHALL provide a recovery path from trash to active state.

# Enums and State Machines

Enum type definitions and state transitions.

## Enum Definitions

Define all enum types with their allowed values and descriptions.

### Todo Status Enumeration

### Completion Status Values

THE system SHALL support exactly two completion status values for todos:
- "complete" - the todo has been finished
- "incomplete" - the todo has not been finished (default state)

WHEN a new todo is created, THE system SHALL assign it the status value "incomplete" by default.

WHEN a user marks a todo as complete, THE system SHALL change its status to "complete".

WHEN a user marks a todo as incomplete, THE system SHALL change its status to "incomplete".

### Status Toggle Behavior

WHEN a todo has status "complete", THE system SHALL allow the user to toggle it to "incomplete".

WHEN a todo has status "incomplete", THE system SHALL allow the user to toggle it to "complete".

This toggle operation SHALL be the only way to change a todo's completion status.

### Status Display

THE system SHALL display the current completion status value when viewing a todo list.
THE system SHALL display the completion status value when viewing a single todo's details.

### Deletion State Enumeration

### Deletion Status Values

THE system SHALL support exactly two deletion state values for todos:
- "active" - the todo is visible in the normal todo list
- "deleted" - the todo has been soft-deleted and is only visible in trash

WHEN a todo is created, THE system SHALL assign it the deletion state "active" by default.

WHEN a user deletes a todo, THE system SHALL change its deletion state to "deleted".

### Soft Delete Behavior

WHEN a todo's deletion state is "deleted", THE system SHALL hide it from the normal todo list view.

WHEN a todo's deletion state is "deleted", THE system SHALL show it in the trash list view.

WHEN a user restores a todo from trash, THE system SHALL change its deletion state back to "active".

WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo and its edit history from the system.

### Permanent Deletion Consequences

IF a todo is permanently deleted from trash, THEN ALL of its edit history entries SHALL also be permanently deleted.

IF a todo is permanently deleted from trash, THEN the todo SHALL no longer exist in the system and CANNOT be recovered.

### Filter Type Enumeration

### Filter Value Options

THE system SHALL support exactly three filter type values for todo lists:
- "all" - display todos regardless of completion status
- "complete" - display only todos with status "complete"
- "incomplete" - display only todos with status "incomplete"

WHEN no filter is explicitly selected, THE system SHALL apply the "all" filter by default.

WHEN a user selects a filter, THE system SHALL apply that filter to the todo list query.

### Filter Application

WHEN a todo's completion status changes, THE system SHALL ensure the todo appears in the correct filter results.

IF a todo has status "complete", THEN it SHALL appear in the "all" and "complete" filters, but NOT in the "incomplete" filter.

IF a todo has status "incomplete", THEN it SHALL appear in the "all" and "incomplete" filters, but NOT in the "complete" filter.

### Sort Direction Enumeration

### Direction Value Options

THE system SHALL support exactly two sort direction values for todo lists:
- "ascending" - oldest first, earliest dates first
- "descending" - newest first, latest dates first

WHEN sorting by creation date, THE system SHALL sort by ascending order by default (oldest first).

WHEN sorting by date fields (start date, due date), THE system SHALL sort by ascending order by default (earliest first).

### Sorting with Missing Values

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list.

### Direction Change

WHEN a user changes the sort direction, THE system SHALL reorder the todo list according to the new direction.

WHEN the sort direction changes, THE system SHALL maintain the current sort field (creation date, start date, or due date).

## State Transitions

Define valid state transition paths for stateful concepts.

### Todo Completion State

**Todo Completion State Transition**

A todo has two completion states: incomplete and complete.

WHEN a user marks a todo as complete, THE todo SHALL transition from "incomplete" to "complete" state.
WHEN a user marks a todo as incomplete, THE todo SHALL transition from "complete" to "incomplete" state.

A todo can toggle between these two states at any time.

THE system SHALL reflect the updated completion status to the user upon their action.

IF a todo is already in the target state, THE system SHALL acknowledge the request without changing the state.

### Todo Deletion Lifecycle

**Todo Lifecycle and Trash Management**

A todo exists in one of three lifecycle states: active, in trash, or permanently deleted.

WHEN a user deletes a todo, THE todo SHALL transition from "active" to "in trash" state.
WHEN a todo is in trash, THE system SHALL provide the option to restore it to active status.
WHEN a user restores a todo from trash, THE todo SHALL transition from "in trash" to "active" state.
WHEN a user permanently deletes a todo from trash, THE todo SHALL transition to "permanently deleted" state.

A todo in "permanent deletion" state SHALL be irrecoverable.
A todo in "active" state can transition to trash.
A todo in "trash" state can transition to either active (restore) or permanently deleted.

THE system SHALL inform users when a todo enters the trash state.
THE system SHALL inform users when a todo is permanently deleted.

### Edit History Recording

**Edit History State Recording**

Every todo maintains an edit history that records all modifications.

WHEN a user edits any field of a todo (title, description, start date, or due date), THE system SHALL create a new edit history entry.

Each edit history entry SHALL record the user action and the changes made.

IF a field is unchanged during an edit, THE system SHALL track that no change was made to that field.

THE system SHALL maintain edit history entries in chronological order.

WHEN a todo is permanently deleted, THE system SHALL also permanently delete all associated edit history entries.

THE system SHALL allow users to view the complete edit history of any active or trashed todo.

IF a todo is restored from trash, THE edit history SHALL remain accessible.