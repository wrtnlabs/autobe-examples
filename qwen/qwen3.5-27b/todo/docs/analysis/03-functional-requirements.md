**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users create accounts by providing an email address and password. Each email must be unique among all active user accounts. After registration, users can log in using their email and password credentials. Users can update their password at any time to maintain account security. Each user has a display name that identifies them within the application. Users can edit their display name whenever they choose. User accounts are completely private - users cannot view other users' profiles or information. When a user deletes their account, all their data is permanently removed. This includes all todos in the normal list and trash. Account deletion is irreversible and removes all associated data.

### Account Registration

WHEN a guest registers for an account, THE system SHALL require an email address.
WHEN a guest registers for an account, THE system SHALL require a password.
WHEN a guest provides an email address during registration, THE system SHALL verify that no other active account uses the same email.
IF the provided email address already exists in the system, THEN THE system SHALL reject the registration request.
WHEN a guest successfully registers, THE system SHALL create a new user account.
WHEN a guest successfully registers, THE system SHALL associate the account with the provided email address.
WHEN a guest successfully registers, THE system SHALL store the provided password securely.
WHEN registration is complete, THE system SHALL transition the user from guest to member status.
IF the provided email address is invalid, THEN THE system SHALL reject the registration request.
IF the provided password does not meet security requirements, THEN THE system SHALL reject the registration request.

### User Authentication

WHEN a member logs in, THE system SHALL require an email address.
WHEN a member logs in, THE system SHALL require a password.
WHEN a member provides credentials, THE system SHALL verify the email address exists in the system.
WHEN a member provides credentials, THE system SHALL verify the password matches the stored credential.
IF the email address does not exist, THEN THE system SHALL reject the login request.
IF the password does not match, THEN THE system SHALL reject the login request.
WHEN login is successful, THE system SHALL establish an authenticated session for the member.
WHEN a member requests to change their password, THE system SHALL require their current password.
WHEN a member requests to change their password, THE system SHALL require a new password.
WHEN a member successfully changes their password, THE system SHALL update the stored credential.
WHEN a member changes their password, THE system SHALL require subsequent logins to use the new password.
IF a member provides an incorrect current password, THEN THE system SHALL reject the password change request.

### Profile Management

WHEN a member creates an account, THE system SHALL require a display name.
WHEN a member views their profile, THE system SHALL display their current display name.
WHEN a member requests to update their display name, THE system SHALL accept the new display name.
WHEN a member updates their display name, THE system SHALL replace the previous display name.
WHEN a member updates their display name, THE system SHALL make the new display name immediately visible in their profile.
WHEN a member attempts to view another user's profile, THE system SHALL prevent access to that profile.
WHEN a member searches for another user, THE system SHALL not return other users' information.
IF a member tries to access another user's data, THEN THE system SHALL deny the request.
WHEN a member views their own data, THE system SHALL display their own display name as the identifier.
THE system SHALL ensure each user can only access their own profile information.

### Account Termination

WHEN a member requests to delete their account, THE system SHALL require confirmation of the deletion.
WHEN a member confirms account deletion, THE system SHALL permanently remove all todos from the normal list.
WHEN a member confirms account deletion, THE system SHALL permanently remove all todos from the trash.
WHEN a member confirms account deletion, THE system SHALL permanently remove all edit history entries.
WHEN a member confirms account deletion, THE system SHALL permanently remove the user account.
WHEN a member confirms account deletion, THE system SHALL permanently remove all associated data.
IF a member attempts to recover a deleted account, THEN THE system SHALL reject the recovery request.
WHEN an account is deleted, THE system SHALL ensure no data can be restored.
WHEN an account is deleted, THE system SHALL ensure the email address is no longer associated with any active account.
THE system SHALL ensure account deletion is irreversible and complete.

## Todo Operations

Users create todos with a required title and optional description. Start date and due date fields are optional and can be left empty. Newly created todos are marked as incomplete by default. Users can view a paginated list of all their todos. Each todo in the list displays title, completion status, dates, and creation date. Users can view full details of individual todos including complete descriptions. Users toggle todos between complete and incomplete states. Users can edit any field of their todos including title, description, and dates. Deleted todos are soft-deleted and move to the trash. The trash shows a paginated list of deleted todos. Users can restore deleted todos back to the normal list. Users can permanently delete todos from the trash. Permanently deleted todos and their history are removed forever. Users filter todos by completion status: all, complete, or incomplete. Users sort todos by creation date, start date, or due date. Todos without dates appear at the end when sorting by that date field.

### Todo Creation

WHEN a member creates a todo, THE system SHALL require a title.

WHEN a member creates a todo, THE system SHALL allow an optional description that can be left empty.

WHEN a member creates a todo, THE system SHALL allow an optional start date that can be left empty.

WHEN a member creates a todo, THE system SHALL allow an optional due date that can be left empty.

WHEN a member creates a todo, THE system SHALL mark the todo as incomplete by default.

WHEN a member creates a todo, THE system SHALL associate the todo with the creating member.

IF the title is missing or empty, THEN THE system SHALL reject the todo creation request.

IF the start date is earlier than the current date, THEN THE system SHALL allow the todo creation with the past start date.

IF the due date is earlier than the start date, THEN THE system SHALL allow the todo creation with the date configuration.

### Completion Toggle

WHEN a member toggles a todo's completion status, THE system SHALL change the status between complete and incomplete.

WHEN a member marks a todo as complete, THE system SHALL update the todo's completion status to complete.

WHEN a member marks a todo as incomplete, THE system SHALL update the todo's completion status to incomplete.

WHEN a member toggles completion status, THE system SHALL record the change in the todo's edit history.

IF the member does not own the todo, THEN THE system SHALL reject the completion toggle request.

### Todo Viewing and Listing

WHEN a member views their todo list, THE system SHALL display a paginated list of todos.

WHEN a member views a todo in the list, THE system SHALL show the title, completion status, start date (if set), due date (if set), and creation date.

WHEN a member views a single todo detail, THE system SHALL display all todo information including the full description.

WHEN a member requests a page of todos, THE system SHALL return todos for that page number.

IF the requested page number exceeds available pages, THEN THE system SHALL return an empty list.

IF the member requests todos they do not own, THEN THE system SHALL reject the viewing request.

### Todo Editing

WHEN a member edits a todo, THE system SHALL allow changes to the title, description, start date, and due date.

WHEN a member edits a todo, THE system SHALL create a new edit history entry for each edit operation.

WHEN a member edits the title, THE system SHALL record the new title in the edit history.

WHEN a member edits the description, THE system SHALL record the new description in the edit history.

WHEN a member edits the start date, THE system SHALL record the new start date in the edit history.

WHEN a member edits the due date, THE system SHALL record the new due date in the edit history.

IF the member does not own the todo, THEN THE system SHALL reject the edit request.

### Todo Soft Delete

WHEN a member deletes a todo, THE system SHALL soft delete the todo rather than permanently removing it.

WHEN a member soft deletes a todo, THE system SHALL move the todo to the trash.

WHEN a member soft deletes a todo, THE system SHALL remove the todo from the normal todo list.

WHEN a member soft deletes a todo, THE system SHALL preserve the todo's edit history.

IF the member does not own the todo, THEN THE system SHALL reject the delete request.

### Trash Management

WHEN a member views the trash, THE system SHALL display a paginated list of deleted todos.

WHEN a member views a todo in the trash list, THE system SHALL show the title, completion status, start date (if set), due date (if set), and deletion date.

WHEN a member requests a page of trash items, THE system SHALL return deleted todos for that page number.

IF the requested trash page number exceeds available pages, THEN THE system SHALL return an empty list.

IF the member requests trash items they do not own, THEN THE system SHALL reject the viewing request.

### Todo Restoration

WHEN a member restores a todo from trash, THE system SHALL move the todo back to the normal todo list.

WHEN a member restores a todo, THE system SHALL preserve the todo's edit history.

WHEN a member restores a todo, THE system SHALL maintain the todo's current completion status.

WHEN a member restores a todo, THE system SHALL maintain the todo's title, description, start date, and due date.

IF the member does not own the todo, THEN THE system SHALL reject the restoration request.

IF the todo has been permanently deleted, THEN THE system SHALL reject the restoration request.

### Permanent Deletion

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo forever.

WHEN a member permanently deletes a todo, THE system SHALL also delete all associated edit history entries.

WHEN a member permanently deletes a todo, THE system SHALL make the todo unrecoverable.

WHEN a member permanently deletes a todo, THE system SHALL remove the todo from the trash list.

IF the member does not own the todo, THEN THE system SHALL reject the permanent deletion request.

### Completion Filtering

WHEN a member filters todos by completion status, THE system SHALL support three filter options: all, complete, and incomplete.

WHEN a member selects the 'all' filter, THE system SHALL display all todos regardless of completion status.

WHEN a member selects the 'complete' filter, THE system SHALL display only completed todos.

WHEN a member selects the 'incomplete' filter, THE system SHALL display only incomplete todos.

WHEN a member applies a completion filter, THE system SHALL apply the filter to the current view context (normal list or trash).

### Date Sorting

WHEN a member sorts todos by creation date, THE system SHALL support newest first or oldest first ordering.

WHEN a member sorts todos by start date, THE system SHALL support earliest first or latest first ordering.

WHEN a member sorts todos by due date, THE system SHALL support earliest first or latest first ordering.

WHEN a member sorts by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN a member sorts by due date, THE system SHALL place todos without a due date at the end of the list.

WHEN a member applies sorting, THE system SHALL maintain the sort order across pagination.

### Pagination

WHEN a member requests todos, THE system SHALL return results in pages with a consistent page size.

WHEN a member navigates to the next page, THE system SHALL return the next set of todos.

WHEN a member navigates to the previous page, THE system SHALL return the previous set of todos.

WHEN a member reaches the last page, THE system SHALL indicate no more pages are available.

WHEN a member applies filters or sorting, THE system SHALL reset pagination to the first page.

### Todo Privacy

WHEN a member accesses the todo system, THE system SHALL only show todos owned by that member.

WHEN a member attempts to view another member's todo, THE system SHALL reject the request.

WHEN a member attempts to edit another member's todo, THE system SHALL reject the request.

WHEN a member attempts to delete another member's todo, THE system SHALL reject the request.

WHEN a member attempts to restore another member's todo from trash, THE system SHALL reject the request.

WHEN a member attempts to permanently delete another member's todo, THE system SHALL reject the request.

THE system SHALL not provide any mechanism for members to view, access, or share another member's todos.

## EditHistory Operations

Every edit to a todo automatically creates a history entry. History entries record the exact timestamp of when the edit occurred. Each entry captures what fields were changed and their new values. Title changes, description changes, and date changes are all recorded. Users can view the complete edit history of any of their todos. History entries are displayed from most recent to oldest. When a todo is permanently deleted from trash, its history is also removed. History entries provide a complete audit trail of all modifications. Users cannot edit or delete individual history entries. History is automatically generated and cannot be disabled.

### Automatic History Creation

WHEN a user creates a new todo, THE system SHALL automatically create an initial EditHistory entry.

WHEN a user edits any field of an existing todo, THE system SHALL automatically create a new EditHistory entry.

WHEN a user marks a todo as complete or incomplete, THE system SHALL automatically create a new EditHistory entry.

WHEN a user restores a todo from trash, THE system SHALL automatically create a new EditHistory entry.

THE system SHALL record the exact timestamp of when each edit occurred.

THE system SHALL capture all field changes in a single history entry when multiple fields are edited simultaneously.

IF a user attempts to manually create or modify history entries, THE system SHALL prevent this action.

IF a user attempts to delete an individual history entry, THE system SHALL prevent this action.

THE system SHALL maintain an unbroken chain of history entries for audit purposes.

WHEN a todo is permanently deleted from trash, THE system SHALL also delete all associated history entries.

### Field-Level Change Capture

WHEN the title field is changed, THE system SHALL record the new title value in the history entry.

WHEN the description field is changed, THE system SHALL record the new description value in the history entry.

WHEN the start date field is changed, THE system SHALL record the new start date value in the history entry.

WHEN the due date field is changed, THE system SHALL record the new due date value in the history entry.

IF a user edits a todo without changing any field values, THE system SHALL NOT create a new history entry.

THE system SHALL capture only the fields that were actually modified in each edit operation.

THE system SHALL associate each history entry with the exact timestamp of the edit.

THE system SHALL preserve the chronological order of all history entries.

THE system SHALL allow users to view all previous versions of each modified field.

IF a field was not changed in a particular edit, THE system SHALL NOT record a change for that field in the history entry.

### History Viewing and Ordering

WHEN a user requests to view a todo's edit history, THE system SHALL display all history entries for that todo.

WHEN displaying history, THE system SHALL sort entries from most recent to oldest.

THE system SHALL display the timestamp for each history entry.

THE system SHALL display which fields were changed in each history entry.

THE system SHALL display the new values for each changed field in each history entry.

WHEN no edits have been made to a newly created todo, THE system SHALL show an empty history list.

THE system SHALL allow users to view the complete chronological timeline of all modifications.

THE system SHALL prevent users from viewing history entries for todos they do not own.

THE system SHALL display a clear audit trail of all modifications to the todo.

### History Deletion Policy

WHEN a user permanently deletes a todo from trash, THE system SHALL also delete all associated history entries.

IF a user attempts to restore a permanently deleted todo, THE system SHALL reject the request because the history is gone.

THE system SHALL NOT allow selective deletion of individual history entries.

THE system SHALL maintain all history entries for the lifetime of the todo.

WHEN a user restores a todo from trash, THE system SHALL preserve all existing history entries.

THE system SHALL treat the combination of todo deletion and history deletion as an atomic operation.

IF a todo is soft-deleted but not yet permanently removed, THE system SHALL retain all history entries.

THE system SHALL use history deletion as a security measure to prevent recovery of sensitive information.

### Audit Trail Integrity

THE system SHALL maintain an unbroken chain of edit history for compliance and auditing.

THE system SHALL record the exact timestamp to the second for each edit operation.

THE system SHALL prevent any modification or deletion of historical records.

WHEN generating audit reports, THE system SHALL include all field changes in chronological order.

THE system SHALL ensure that no two history entries have identical timestamps for the same todo.

THE system SHALL preserve the sequence of all edits for forensic analysis.

IF a system error occurs during history creation, THE system SHALL log the error and alert administrators.

THE system SHALL ensure that audit trail data remains immutable once created.

THE system SHALL allow authorized users to export or view the complete audit trail for compliance purposes.

# Business Actions and Workflows

Business actions and workflows beyond basic CRUD.

## User Actions

Users can create an account with a unique email and secure password. New accounts start unverified until email confirmation is completed. Users can log in with their registered email and password to access their private workspace. If users forget their password, they can request a password reset link to regain account access. Users can update their display name in their profile at any time. When users choose to delete their account, all their todos including those in trash are permanently removed from the system.

### Account Creation

WHEN a guest creates an account, THE system SHALL require an email address and password.

THE system SHALL ensure each email address is unique across all registered users.

THE system SHALL create a new user account with the provided email and password.

THE system SHALL set the new account status to unverified upon creation.

THE system SHALL generate and send an email verification link to the registered email address.

IF the email address is already registered, THEN THE system SHALL reject the account creation request.

IF the password does not meet security requirements, THEN THE system SHALL reject the account creation request.

IF the email address format is invalid, THEN THE system SHALL reject the account creation request.

### Email Verification

WHEN a user account is created, THE system SHALL send a verification email to the registered email address.

THE system SHALL include a unique verification link in the verification email.

THE system SHALL maintain the account in unverified status until the verification link is clicked.

WHEN a user clicks the verification link, THE system SHALL verify the link is valid and not expired.

WHEN a user clicks a valid verification link, THE system SHALL update the account status to verified.

IF the verification link has expired, THEN THE system SHALL reject the verification attempt.

IF the verification link has already been used, THEN THE system SHALL reject the verification attempt.

IF the verification link is invalid, THEN THE system SHALL reject the verification attempt.

### Login Authentication

WHEN a member logs in, THE system SHALL require email address and password.

WHEN a member provides valid credentials, THE system SHALL authenticate the user and create a session.

THE system SHALL verify the account is verified before allowing login.

THE system SHALL generate a unique session token upon successful authentication.

WHEN a member provides invalid credentials, THE system SHALL reject the login attempt.

IF the account is not verified, THEN THE system SHALL reject the login attempt.

IF the account has been deleted, THEN THE system SHALL reject the login attempt.

### Password Reset

WHEN a member requests a password reset, THE system SHALL require the registered email address.

THE system SHALL generate a unique password reset link for the request.

THE system SHALL send the password reset link to the registered email address.

WHEN a member clicks the password reset link, THE system SHALL verify the link is valid and not expired.

WHEN a member provides a new password through the reset link, THE system SHALL update the account password.

WHEN a member successfully resets their password, THE system SHALL invalidate the reset link.

IF the password reset link has expired, THEN THE system SHALL reject the password reset attempt.

IF the password reset link has already been used, THEN THE system SHALL reject the password reset attempt.

IF the email address is not registered, THEN THE system SHALL not reveal whether an account exists.

### Profile Management

WHEN a member updates their display name, THE system SHALL validate the new display name.

THE system SHALL update the user profile with the new display name.

THE system SHALL allow members to update their display name at any time.

IF the display name is empty, THEN THE system SHALL reject the update request.

IF the display name exceeds the maximum length, THEN THE system SHALL reject the update request.

### Account Deletion

WHEN a member requests account deletion, THE system SHALL require authentication.

WHEN a member confirms account deletion, THE system SHALL permanently delete the user account.

THE system SHALL permanently delete all todos owned by the user, including those in trash.

THE system SHALL permanently delete all edit history entries associated with the user's todos.

THE system SHALL invalidate all active sessions for the deleted account.

IF the user is not authenticated, THEN THE system SHALL reject the account deletion request.

IF the account does not exist, THEN THE system SHALL reject the account deletion request.

### Session Management

WHEN a member successfully logs in, THE system SHALL create a new session.

THE system SHALL assign a unique session identifier to each active session.

WHEN a member logs out, THE system SHALL invalidate the current session.

THE system SHALL automatically expire sessions after a period of inactivity.

WHEN a member changes their password, THE system SHALL invalidate all existing sessions for that account.

WHEN a member's account is deleted, THE system SHALL terminate all sessions associated with that account.

IF a session is expired, THEN THE system SHALL require re-authentication.

## Todo Actions

Users can create new todos with a required title and optional description, start date, and due date. Newly created todos are marked as incomplete by default. Users can toggle the completion status of any todo between complete and incomplete states. When users edit a todo, they can modify the title, description, start date, and due date. Users can view their active todos in a paginated list showing key details. Deleted todos move to trash but remain recoverable. Users can restore deleted items from trash or permanently remove them. Permanent deletion removes all edit history associated with that todo.

### Todo Creation Workflow

WHEN a member creates a new todo, THE system SHALL require a title.

WHEN a member creates a new todo, THE system SHALL allow an optional description.

WHEN a member creates a new todo, THE system SHALL allow an optional start date.

WHEN a member creates a new todo, THE system SHALL allow an optional due date.

WHEN a member creates a new todo, THE system SHALL mark the todo as incomplete by default.

WHEN a member creates a new todo, THE system SHALL associate the todo with the creating member.

WHEN a member creates a new todo, THE system SHALL record the creation timestamp.

IF the title is missing during todo creation, THE system SHALL reject the creation request.

IF the title is empty during todo creation, THE system SHALL reject the creation request.

### Completion Toggle Workflow

WHEN a member toggles a todo's completion status, THE system SHALL change the status between complete and incomplete.

WHEN a member marks a todo as complete, THE system SHALL record the completion timestamp.

WHEN a member marks a todo as incomplete, THE system SHALL update the completion status.

WHEN a member toggles completion status, THE system SHALL maintain the todo in the active list.

IF the todo does not exist, THE system SHALL reject the completion toggle request.

IF the todo belongs to another member, THE system SHALL reject the completion toggle request.

IF the todo has been permanently deleted, THE system SHALL reject the completion toggle request.

### Todo Editing Workflow

WHEN a member edits a todo, THE system SHALL allow modification of the title.

WHEN a member edits a todo, THE system SHALL allow modification of the description.

WHEN a member edits a todo, THE system SHALL allow modification of the start date.

WHEN a member edits a todo, THE system SHALL allow modification of the due date.

WHEN a member edits a todo, THE system SHALL create a new edit history entry.

WHEN a member edits a todo, THE system SHALL record the edit timestamp in the history entry.

WHEN a member edits a todo, THE system SHALL capture which fields were changed in the history entry.

WHEN a member edits a todo, THE system SHALL preserve unchanged fields.

IF the edited title is empty, THE system SHALL reject the edit request.

IF the todo does not exist, THE system SHALL reject the edit request.

IF the todo belongs to another member, THE system SHALL reject the edit request.

IF the todo has been permanently deleted, THE system SHALL reject the edit request.

### Trash Management Workflow

WHEN a member deletes a todo, THE system SHALL move the todo to trash.

WHEN a member deletes a todo, THE system SHALL remove the todo from the active todo list.

WHEN a member deletes a todo, THE system SHALL preserve the todo's edit history.

WHEN a member deletes a todo, THE system SHALL record the deletion timestamp.

WHEN a member views their trash, THE system SHALL display deleted todos in a paginated list.

WHEN a member views their trash, THE system SHALL show the todo title and deletion date.

IF the todo does not exist, THE system SHALL reject the delete request.

IF the todo belongs to another member, THE system SHALL reject the delete request.

IF the todo has already been permanently deleted, THE system SHALL reject the delete request.

### Item Restoration Workflow

WHEN a member restores a todo from trash, THE system SHALL return the todo to the active list.

WHEN a member restores a todo from trash, THE system SHALL preserve the todo's edit history.

WHEN a member restores a todo from trash, THE system SHALL maintain the original completion status.

WHEN a member restores a todo from trash, THE system SHALL update the restoration timestamp.

IF the todo does not exist in trash, THE system SHALL reject the restoration request.

IF the todo belongs to another member, THE system SHALL reject the restoration request.

IF the todo has been permanently deleted, THE system SHALL reject the restoration request.

### Permanent Deletion Workflow

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo permanently.

WHEN a member permanently deletes a todo from trash, THE system SHALL delete all associated edit history.

WHEN a member permanently deletes a todo from trash, THE system SHALL make the deletion irreversible.

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo from all views.

IF the todo does not exist in trash, THE system SHALL reject the permanent deletion request.

IF the todo belongs to another member, THE system SHALL reject the permanent deletion request.

IF the todo has already been permanently deleted, THE system SHALL reject the permanent deletion request.

### Edit Tracking Workflow

WHEN a member edits a todo, THE system SHALL automatically track the edit.

WHEN a member edits a todo, THE system SHALL create a chronological history entry.

WHEN a member edits a todo, THE system SHALL record the exact time of the edit.

WHEN a member edits a todo, THE system SHALL capture the new title value if changed.

WHEN a member edits a todo, THE system SHALL capture the new description value if changed.

WHEN a member edits a todo, THE system SHALL capture the new start date value if changed.

WHEN a member edits a todo, THE system SHALL capture the new due date value if changed.

WHEN a member views edit history, THE system SHALL display history entries from most recent to oldest.

WHEN a member views edit history, THE system SHALL show all field changes for each edit.

IF the todo has no edits, THE system SHALL display an empty history.

IF the todo belongs to another member, THE system SHALL reject the history view request.

IF the todo has been permanently deleted, THE system SHALL reject the history view request.

## EditHistory Actions

Every time a user edits a todo, the system automatically creates a history entry recording the change. History entries capture exactly what changed and when the edit occurred. Users can view the complete edit history for any of their todos. The history displays changes in reverse chronological order with most recent edits appearing first. Each entry shows what specific fields were modified during that edit session. Edit history is permanently removed if the associated todo is permanently deleted.

### Change Tracking

WHEN a user edits a todo, THE system SHALL automatically create a history entry.

WHEN a todo is modified, THE system SHALL record the edit timestamp.

WHEN a user changes a todo's title, THE system SHALL capture the new title value in the history entry.

WHEN a user changes a todo's description, THE system SHALL capture the new description value in the history entry.

WHEN a user changes a todo's start date, THE system SHALL capture the new start date value in the history entry.

WHEN a user changes a todo's due date, THE system SHALL capture the new due date value in the history entry.

IF a field is not changed during an edit, THE system SHALL not record a value change for that field in the history entry.

WHEN a todo is edited, THE system SHALL associate the history entry with the todo.

WHEN a user edits their own todo, THE system SHALL create a history entry linked to the user.

THE system SHALL create exactly one history entry per edit operation.

### Edit Logging

WHEN a todo is edited, THE system SHALL automatically log the edit without requiring user action.

WHEN an edit occurs, THE system SHALL create a history entry immediately.

THE system SHALL record the exact time when each edit was made.

WHEN multiple edits are made to the same todo, THE system SHALL create separate history entries for each edit.

THE system SHALL maintain all history entries for a todo until the todo is permanently deleted.

WHEN a user edits a todo, THE system SHALL log the edit even if only one field changes.

THE system SHALL not create history entries for operations other than editing (e.g., marking complete, deleting).

WHEN an edit is performed, THE system SHALL record which specific fields were modified.

### Version History

THE system SHALL maintain a chronological record of all edits for each todo.

WHEN a todo has multiple edits, THE system SHALL preserve the complete version history.

THE system SHALL store each edit as a distinct version in the history.

WHEN viewing version history, THE system SHALL display all edits from creation to present.

THE system SHALL retain version history entries in the order they were created.

WHEN a todo is edited multiple times, THE system SHALL maintain each version independently.

THE system SHALL not overwrite previous version history entries when new edits are made.

WHEN a user views version history, THE system SHALL show the progression of changes over time.

### Modification Audit

WHEN a todo is edited, THE system SHALL create an audit record of the modification.

THE system SHALL capture what changed during each edit operation.

WHEN a field is modified, THE system SHALL record the new value in the audit entry.

THE system SHALL record the timestamp for each modification audit entry.

WHEN multiple fields are changed in one edit, THE system SHALL record all changes in a single audit entry.

THE system SHALL maintain modification audit records for the lifetime of the todo.

WHEN a user views edit history, THE system SHALL display the modification audit information.

THE system SHALL not allow modification of existing audit entries.

### Edit Timeline

WHEN a user views edit history, THE system SHALL display entries in reverse chronological order.

THE system SHALL show the most recent edit first in the timeline.

THE system SHALL order history entries from newest to oldest.

WHEN multiple edits exist, THE system SHALL present them in the order they occurred, with the latest first.

THE system SHALL display the edit timestamp for each entry in the timeline.

WHEN viewing the edit timeline, THE system SHALL show all edits from most recent to earliest.

THE system SHALL not reorder history entries after they are created.

### Field Change Detection

WHEN a todo is edited, THE system SHALL detect which fields were modified.

THE system SHALL identify title changes when the title is updated.

THE system SHALL identify description changes when the description is updated.

THE system SHALL identify start date changes when the start date is updated.

THE system SHALL identify due date changes when the due date is updated.

WHEN a field value remains the same, THE system SHALL not record it as a change.

THE system SHALL capture the new value for each field that was modified.

WHEN multiple fields change, THE system SHALL detect and record each field change separately.

THE system SHALL distinguish between fields that changed and fields that did not change.

### History Viewing

WHEN a user requests to view edit history, THE system SHALL display all history entries for that todo.

THE system SHALL show the edit timestamp for each history entry.

WHEN viewing history, THE system SHALL display what title was changed to, if the title was modified.

WHEN viewing history, THE system SHALL display what description was changed to, if the description was modified.

WHEN viewing history, THE system SHALL display what start date was changed to, if the start date was modified.

WHEN viewing history, THE system SHALL display what due date was changed to, if the due date was modified.

THE system SHALL display history entries sorted from most recent to oldest.

WHEN a todo has no edits, THE system SHALL display an empty history.

THE system SHALL only allow users to view history for their own todos.

WHEN a user views history, THE system SHALL show the complete edit history without pagination.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users encounter errors when attempting to register with an email that already exists in the system. Registration fails if the password does not meet minimum security requirements. Users cannot log in with incorrect email or password combinations. Multiple failed login attempts may temporarily lock the account for security. Users cannot change their password without first authenticating with their current password. Account deletion requires confirmation to prevent accidental data loss. Once an account is deleted, all associated todos are permanently removed and cannot be recovered. Users cannot access their profile or todos after account deletion. The system prevents users from registering with invalid email formats. Display name changes are rejected if the name is empty or contains only whitespace.

### Registration Validation Errors

IF a user attempts to register with an email address that already exists in the system, THEN THE system SHALL reject the registration request.

IF a user provides an email address that does not conform to standard email format, THEN THE system SHALL reject the registration request.

IF a user's password does not meet minimum security requirements, THEN THE system SHALL reject the registration request.

WHEN a registration is rejected due to duplicate email, THE system SHALL indicate that the email is already in use.

WHEN a registration is rejected due to invalid email format, THE system SHALL indicate that the email format is invalid.

WHEN a registration is rejected due to password requirements, THE system SHALL indicate that the password does not meet security requirements.

### Authentication Failure Scenarios

IF a user attempts to log in with an incorrect email address, THEN THE system SHALL deny access.

IF a user attempts to log in with an incorrect password, THEN THE system SHALL deny access.

IF a user exceeds the maximum number of failed login attempts within a specified time period, THEN THE system SHALL temporarily lock the account.

WHEN an account is locked due to multiple failed login attempts, THE system SHALL prevent further login attempts for a defined duration.

WHEN a user attempts to change their password without authenticating with their current password, THEN THE system SHALL reject the password change request.

WHEN a password change is rejected due to lack of authentication, THE system SHALL require the user to authenticate with their current password first.

### Account Deletion and Data Loss

IF a user attempts to delete their account, THEN THE system SHALL require explicit confirmation before proceeding.

IF a user does not confirm account deletion when prompted, THEN THE system SHALL cancel the deletion request.

WHEN an account is deleted, THE system SHALL permanently remove all associated todos including those in trash.

WHEN an account is deleted, THE system SHALL permanently remove all edit history associated with the user's todos.

IF a deleted user attempts to access their profile, THEN THE system SHALL deny access.

IF a deleted user attempts to access their todos, THEN THE system SHALL deny access.

IF a deleted user attempts to log in, THEN THE system SHALL deny access.

WHEN a user is informed about account deletion, THE system SHALL warn that all data will be permanently lost and cannot be recovered.

### Profile Update Validation Errors

IF a user attempts to save an empty display name, THEN THE system SHALL reject the update.

IF a user attempts to save a display name containing only whitespace, THEN THE system SHALL reject the update.

WHEN a display name update is rejected, THE system SHALL indicate that the display name cannot be empty.

## Todo Error Scenarios

Users cannot create a todo without providing a title, as it is a required field. The system rejects todos where the due date is before the start date. Users cannot view or edit todos that belong to other users due to privacy restrictions. Attempting to restore a todo that was permanently deleted from trash fails with an appropriate message. Users cannot mark a todo as complete if it has already been permanently deleted. Editing a todo that does not exist returns an error to the user. Deleting a todo that is already in trash produces no effect and shows a notification. Users cannot filter or sort an empty todo list, but the interface displays a helpful message. Todos without start dates appear at the end when sorting by start date. Todos without due dates appear at the end when sorting by due date. Users cannot create todos with future start dates before the current date if business rules prohibit it.

### Missing Required Title Validation

WHEN a user creates a todo, THE system SHALL require a title to be provided.

IF the title is empty or not provided, THEN THE system SHALL reject the todo creation request.

IF the title contains only whitespace characters, THEN THE system SHALL reject the todo creation request.

WHEN a todo creation is rejected due to missing title, THE system SHALL display an error message indicating that a title is required.

IF a user attempts to create multiple todos without titles, THEN THE system SHALL reject each request independently with the same error message.

### Invalid Date Range Validation

WHEN a user creates or edits a todo with both start date and due date, THE system SHALL validate that the due date is not earlier than the start date.

IF the due date is before the start date, THEN THE system SHALL reject the todo creation or edit request.

IF the due date is the same as the start date, THEN THE system SHALL accept the todo (same day tasks are allowed).

WHEN a todo date validation fails, THE system SHALL display an error message indicating that the due date cannot be before the start date.

IF a user attempts to edit a todo to set an invalid date range, THEN THE system SHALL reject the edit and retain the previous valid values.

### Cross-User Access Prevention

WHEN a user attempts to view another user's todo, THE system SHALL deny access and display an error message.

WHEN a user attempts to edit another user's todo, THE system SHALL deny access and display an error message.

WHEN a user attempts to delete another user's todo, THE system SHALL deny access and display an error message.

WHEN a user attempts to mark another user's todo as complete, THE system SHALL deny access and display an error message.

WHEN a user attempts to view another user's trash, THE system SHALL deny access and display an error message.

IF a user tries to access a todo using an invalid or tampered identifier, THEN THE system SHALL deny access and display an error message.

WHEN cross-user access is denied, THE system SHALL NOT reveal whether the todo exists or belongs to another user (to prevent enumeration attacks).

### Permanent Deletion Recovery

WHEN a user attempts to restore a todo that was permanently deleted from trash, THE system SHALL deny the request and display an error message.

IF a user attempts to permanently delete a todo that is already permanently deleted, THEN THE system SHALL display a message indicating the todo no longer exists.

WHEN a todo is permanently deleted, THE system SHALL also permanently delete all associated edit history entries.

IF a user attempts to view edit history for a permanently deleted todo, THEN THE system SHALL display an error message indicating the todo no longer exists.

WHEN a user's account is deleted, THE system SHALL permanently delete all their todos including those in trash, and this action cannot be reversed.

### Non-Existent Todo Operations

WHEN a user attempts to view a todo that does not exist, THE system SHALL display an error message indicating the todo was not found.

WHEN a user attempts to edit a todo that does not exist, THE system SHALL display an error message indicating the todo was not found.

WHEN a user attempts to delete a todo that does not exist, THE system SHALL display an error message indicating the todo was not found.

WHEN a user attempts to mark a non-existent todo as complete, THE system SHALL display an error message indicating the todo was not found.

IF a user attempts to restore a todo from trash that does not exist, THEN THE system SHALL display an error message indicating the todo was not found.

WHEN a user attempts to view edit history for a non-existent todo, THE system SHALL display an error message indicating the todo was not found.

### Duplicate Trash Operations

WHEN a user attempts to delete a todo that is already in trash, THE system SHALL display a message indicating the todo is already deleted.

IF a user attempts to restore a todo that is not in trash, THEN THE system SHALL display a message indicating the todo cannot be restored.

WHEN a user attempts to permanently delete a todo that is not in trash, THE system SHALL display a message indicating the todo must first be moved to trash.

IF a user attempts to delete a todo multiple times in succession, THEN THE system SHALL process only the first deletion and display appropriate feedback for subsequent attempts.

WHEN a todo is in trash, THE system SHALL prevent all editing operations on that todo.

### Empty List Filtering Behavior

WHEN a user filters an empty todo list, THE system SHALL display an empty list with a helpful message indicating no todos match the criteria.

IF a user applies multiple filters to an empty todo list, THEN THE system SHALL continue to display the empty list with the appropriate message.

WHEN a user switches between filter options (all, complete, incomplete) on an empty list, THE system SHALL display the empty list with a context-appropriate message.

IF a user attempts to sort an empty todo list, THEN THE system SHALL display the empty list without error.

WHEN filtering results in an empty list, THE system SHALL NOT display pagination controls.

### Null Date Sorting Behavior

WHEN a user sorts todos by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN a user sorts todos by due date, THE system SHALL place todos without a due date at the end of the list.

IF multiple todos have no start date, THEN THE system SHALL order them by creation date (newest first) when sorting by start date.

IF multiple todos have no due date, THEN THE system SHALL order them by creation date (newest first) when sorting by due date.

WHEN sorting by start date in ascending order, THE system SHALL show todos with start dates first (earliest to latest), followed by todos without start dates.

WHEN sorting by start date in descending order, THE system SHALL show todos with start dates first (latest to earliest), followed by todos without start dates.

WHEN sorting by due date in ascending order, THE system SHALL show todos with due dates first (earliest to latest), followed by todos without due dates.

WHEN sorting by due date in descending order, THE system SHALL show todos with due dates first (latest to earliest), followed by todos without due dates.

### Invalid Date Order Rejection

WHEN a user creates a todo with a due date before the start date, THE system SHALL reject the creation and display an error message.

WHEN a user edits a todo to set a due date before the start date, THE system SHALL reject the edit and display an error message.

IF a user changes the start date to be after the due date, THEN THE system SHALL reject the edit and display an error message.

IF a user changes the due date to be before the start date, THEN THE system SHALL reject the edit and display an error message.

WHEN date order validation fails, THE system SHALL retain the previous valid date values and not apply any changes.

IF a user removes the start date after setting both dates, THEN THE system SHALL accept the change (no validation needed with only due date).

IF a user removes the due date after setting both dates, THEN THE system SHALL accept the change (no validation needed with only start date).

### Privacy Boundary Enforcement

WHEN a logged-in user accesses the todo list, THE system SHALL display only that user's todos.

WHEN a user attempts to access another user's todo list, THE system SHALL deny access and display an error message.

WHEN a guest (unauthenticated user) attempts to view any todos, THE system SHALL deny access and prompt for authentication.

WHEN a user's session expires, THE system SHALL deny access to todos and prompt for re-authentication.

IF a user attempts to share a todo link with another user, THEN THE system SHALL not provide sharing functionality (todos are private by design).

WHEN privacy boundary is enforced, THE system SHALL NOT provide any mechanism to discover or access another user's todos.

WHEN a user deletes their account, THE system SHALL permanently delete all their todos and prevent any future access to them.

## EditHistory Error Scenarios

Users cannot view edit history for todos that do not belong to them. Attempting to view edit history for a permanently deleted todo fails because the history is also deleted. Users cannot view edit history for a todo that has never been edited, as no history entries exist. The system does not allow users to modify or delete individual history entries manually. History entries are automatically created only when actual changes occur during todo editing. Viewing history for a todo that was just created shows an empty history list. Users cannot access edit history after the associated todo is permanently deleted from trash. The system prevents viewing history for todos that have been restored from trash without prior edits. History entries are sorted from most recent to oldest, and empty histories display a clear message. Users cannot see what values were changed to if no changes occurred in a particular edit operation.

### Cross-User History Access Prevention

WHEN a user attempts to view edit history for a todo that does not belong to them, THE system SHALL deny access.

IF a user requests edit history for another user's todo, THE system SHALL reject the request.

THE system SHALL prevent members from viewing edit history of todos owned by other members.

WHEN a user tries to access edit history through direct URL manipulation for unauthorized todos, THE system SHALL deny access.

IF a user's todo ownership cannot be verified, THE system SHALL block edit history access.

THE system SHALL ensure edit history visibility is restricted to the todo owner only.

### Permanently Deleted Todo History Handling

WHEN a todo is permanently deleted from trash, THE system SHALL delete all associated edit history entries.

IF a user attempts to view edit history for a permanently deleted todo, THE system SHALL indicate the history is unavailable.

THE system SHALL permanently remove edit history when the associated todo is permanently deleted.

WHEN a user's account is deleted, THE system SHALL permanently delete all edit history entries for their todos.

IF a todo is restored from trash, THE system SHALL retain the edit history that existed before deletion.

THE system SHALL not allow recovery of edit history after permanent todo deletion.

### Empty History for New Todos

WHEN a user views edit history for a newly created todo, THE system SHALL display an empty history list.

IF a todo has never been edited, THE system SHALL show no history entries.

THE system SHALL display a clear message when no edit history exists for a todo.

WHEN a user creates a todo without any edits, THE system SHALL create no history entries.

IF a todo exists with zero edit history, THE system SHALL present an appropriate empty state.

THE system SHALL not create history entries for todo creation itself, only for subsequent edits.

### Manual History Modification Restrictions

THE system SHALL prevent users from manually modifying edit history entries.

IF a user attempts to edit a history entry, THE system SHALL reject the request.

THE system SHALL prevent users from deleting individual history entries.

WHEN a user tries to alter historical change records, THE system SHALL block the action.

THE system SHALL ensure edit history entries are read-only after creation.

IF a user requests to modify the timestamp of a history entry, THE system SHALL deny the request.

### History Creation on Actual Changes

WHEN a user edits a todo, THE system SHALL create a history entry only if actual changes occur.

IF a user submits edits with no field changes, THE system SHALL not create a history entry.

THE system SHALL create history entries only when at least one field value is modified.

WHEN a user saves a todo with identical values, THE system SHALL skip history creation.

IF no changes are detected during an edit operation, THE system SHALL not record a history entry.

THE system SHALL track only meaningful modifications to todo fields.

### Restored Todo History Visibility

WHEN a todo is restored from trash, THE system SHALL make the edit history visible again.

IF a todo was edited before deletion, THE system SHALL preserve and restore the history upon restoration.

THE system SHALL maintain edit history integrity when todos are restored from trash.

WHEN a user views a restored todo's history, THE system SHALL display all historical edits.

IF a todo is restored without prior edits, THE system SHALL show an empty history.

THE system SHALL ensure restored todos retain their complete edit history.

### Post-Deletion History Unavailability

WHEN a todo is permanently deleted, THE system SHALL make its edit history inaccessible.

IF a user attempts to access history after permanent deletion, THE system SHALL deny access.

THE system SHALL prevent viewing edit history for todos that no longer exist.

WHEN a todo is removed from trash permanently, THE system SHALL remove all history access.

IF a todo's permanent deletion is confirmed, THE system SHALL block all history retrieval attempts.

THE system SHALL ensure no history data persists after permanent todo deletion.

### Empty History Display Behavior

WHEN a user views a todo with no edit history, THE system SHALL display an empty state message.

IF no history entries exist, THE system SHALL show a clear indication of empty history.

THE system SHALL present a user-friendly message when history is empty.

WHEN a todo has never been edited, THE system SHALL display appropriate empty state UI.

IF a user navigates to history view for a new todo, THE system SHALL show empty history indicator.

THE system SHALL not display error messages for empty history states.

### Null Change History Entries

WHEN a history entry is created, THE system SHALL record only fields that were actually changed.

IF a field value remains unchanged during an edit, THE system SHALL not record it in the history entry.

THE system SHALL omit null or unchanged field values from history entries.

WHEN a user changes only the title, THE system SHALL record only the title change in history.

IF multiple fields are unchanged, THE system SHALL exclude them from the history entry.

THE system SHALL not create history entries with all null field changes.

### History Sorting Order Enforcement

WHEN a user views edit history, THE system SHALL display entries from most recent to oldest.

IF multiple history entries exist, THE system SHALL sort them by edit timestamp in descending order.

THE system SHALL maintain consistent chronological order for all history displays.

WHEN history entries are retrieved, THE system SHALL order them by edit date descending.

IF new history entries are created, THE system SHALL place them at the top of the list.

THE system SHALL ensure edit history always appears in reverse chronological order.

# End-to-End User Scenarios

Cross-domain user scenarios, multi-step business flows, and end-to-end use cases.

## User User Scenarios

New users register with a unique email and strong password to create their account. After registration, users must verify their email address within a specified time frame. Users log in with their registered email and password to access their private todo workspace. If users forget their password, they can request a password reset link via email. Users can update their display name in their profile settings at any time. When users decide to leave, they can permanently delete their account. Account deletion removes all associated todos and edit history immediately. Users cannot access or view other users' profiles or todos at any time.

### User Registration Flow

WHEN a new user registers for the application, THE system SHALL:
1. Require a unique email address that has not been registered by another user
2. Require a password that meets security requirements
3. Create a new user account with the provided email and password
4. Associate the new user with the "member" actor role
5. Prevent the user from accessing any todos until email verification is complete

WHEN a user completes the registration process successfully, THE system SHALL:
1. Generate a unique verification token for email confirmation
2. Send an email verification message to the registered email address
3. Mark the user account as pending verification
4. Allow the user to proceed with email verification before full access

### Email Verification Process

WHEN a user receives an email verification message, THE system SHALL:
1. Provide a unique verification link or token in the email
2. Validate the verification token when the user clicks the link
3. Mark the user account as verified upon successful token validation
4. Grant the user full access to create and manage todos after verification

### User Login Authentication

WHEN a verified user attempts to log in, THE system SHALL:
1. Accept the user's registered email address
2. Accept the user's password
3. Validate the credentials against stored user data
4. Create an authenticated session for the user upon successful login
5. Grant the user access to their private todo workspace

WHEN a user logs in successfully, THE system SHALL:
1. Display the user's own todos only
2. Prevent the user from viewing any other user's todos
3. Maintain the user's authentication state for the session duration
4. Allow the user to perform all permitted operations on their own todos

### Password Reset Request

WHEN a user requests a password reset, THE system SHALL:
1. Accept the user's registered email address
2. Generate a unique password reset token
3. Send a password reset email to the registered address
4. Allow the user to set a new password using the reset link

WHEN a user completes the password reset process, THE system SHALL:
1. Validate the password reset token
2. Accept the user's new password
3. Update the user's password in the system
4. Invalidate the password reset token
5. Allow the user to log in with the new password

### Profile Information Update

WHEN a logged-in user updates their profile information, THE system SHALL:
1. Allow the user to change their display name
2. Save the updated display name immediately
3. Reflect the new display name in the user's profile
4. Maintain all other user data unchanged

WHEN a user updates their display name, THE system SHALL:
1. Accept the new display name value
2. Replace the previous display name with the new one
3. Preserve all user todos and edit history
4. Allow the user to view their updated profile immediately

### Account Deletion Confirmation

WHEN a user requests to delete their account, THE system SHALL:
1. Require explicit confirmation from the user before proceeding
2. Inform the user that all their todos will be permanently deleted
3. Inform the user that all edit history will be permanently deleted
4. Require final confirmation before executing the deletion

WHEN a user confirms account deletion, THE system SHALL:
1. Permanently delete all todos owned by the user
2. Permanently delete all edit history entries associated with the user's todos
3. Permanently delete the user account and all credentials
4. Prevent the user from logging in again with the same credentials
5. Release the email address for potential future registration

### Data Privacy Isolation

WHILE a user is authenticated and accessing the system, THE system SHALL:
1. Display only the authenticated user's own todos
2. Prevent the user from viewing any other user's profile information
3. Prevent the user from accessing any other user's todos
4. Isolate all user data from other users completely

WHEN a user attempts to access another user's data, THE system SHALL:
1. Detect that the requested data belongs to a different user
2. Deny access to the requested data
3. Inform the user that they do not have permission to access the data
4. Log the unauthorized access attempt

THE system SHALL:
1. Ensure complete data isolation between all users
2. Prevent any cross-user data visibility or access
3. Maintain privacy of all user information at all times

## Todo User Scenarios

Users create new todos with a required title and optional description. The system allows users to set optional start dates and due dates for better task planning. After creation, users can view their complete todo list with pagination for large numbers of items. Users can mark individual todos as complete or incomplete with a simple toggle action. When users need to modify a todo, they can edit the title, description, start date, and due date. Users can filter their todo list to show all items, only complete items, or only incomplete items. The system allows sorting by creation date, start date, or due date in ascending or descending order. When users want to remove a todo, they can delete it, which moves it to trash rather than permanent deletion. Users can browse their trash folder to see all deleted todos that are recoverable. From the trash, users can restore a todo back to the main list or permanently delete it. Permanently deleting a todo from trash also removes all its edit history.

### Todo Creation Workflow

WHEN a member creates a new todo, THE system SHALL require a title.

WHEN a member creates a new todo, THE system SHALL allow an optional description that can be left empty.

WHEN a member creates a new todo, THE system SHALL allow an optional start date that can be left empty.

WHEN a member creates a new todo, THE system SHALL allow an optional due date that can be left empty.

WHEN a member creates a new todo, THE system SHALL set the completion status to incomplete by default.

WHEN a member creates a new todo, THE system SHALL associate the todo with the creating member.

WHEN a member creates a new todo, THE system SHALL record the creation date and time.

WHEN a member successfully creates a todo, THE system SHALL make the todo immediately visible in the member's todo list.

WHEN a member creates a todo, THE system SHALL initialize an empty edit history for the todo.

### Task Completion Toggle

WHEN a member views a todo, THE system SHALL display the current completion status.

WHEN a member toggles a todo's completion status, THE system SHALL change the status between complete and incomplete.

WHEN a member marks a todo as complete, THE system SHALL update the completion status to complete.

WHEN a member marks a todo as incomplete, THE system SHALL update the completion status to incomplete.

WHEN a member toggles completion status, THE system SHALL immediately reflect the new status in the todo list.

WHEN a member toggles completion status, THE system SHALL record the change in the todo's edit history.

WHEN a member toggles a todo's completion status, THE system SHALL update the display to show the new status.

### Todo List Filtering

WHEN a member views their todo list, THE system SHALL provide filtering options by completion status.

WHEN a member selects the "All" filter, THE system SHALL display all todos regardless of completion status.

WHEN a member selects the "Complete" filter, THE system SHALL display only todos marked as complete.

WHEN a member selects the "Incomplete" filter, THE system SHALL display only todos marked as incomplete.

WHEN a member applies a filter, THE system SHALL immediately update the displayed todo list.

WHEN a member changes the filter, THE system SHALL maintain the current sort order.

WHEN a member changes the filter, THE system SHALL maintain the current pagination position.

WHEN a member toggles a todo's completion status, THE system SHALL automatically update the filtered list if the status change affects filter visibility.

### Custom Sort Order

WHEN a member views their todo list, THE system SHALL provide sorting options by creation date, start date, or due date.

WHEN a member selects creation date sorting, THE system SHALL allow ordering by newest first or oldest first.

WHEN a member selects start date sorting, THE system SHALL allow ordering by earliest first or latest first.

WHEN a member selects due date sorting, THE system SHALL allow ordering by earliest first or latest first.

WHEN a member applies a sort order, THE system SHALL immediately update the displayed todo list.

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list.

WHEN a member changes the sort order, THE system SHALL maintain the current filter settings.

WHEN a member changes the sort order, THE system SHALL reset pagination to the first page.

### Soft Delete to Trash

WHEN a member deletes a todo, THE system SHALL move the todo to trash instead of permanent deletion.

WHEN a member deletes a todo, THE system SHALL remove the todo from the normal todo list.

WHEN a member deletes a todo, THE system SHALL preserve all todo data including title, description, dates, and completion status.

WHEN a member deletes a todo, THE system SHALL preserve the todo's edit history.

WHEN a member deletes a todo, THE system SHALL record the deletion timestamp.

WHEN a member deletes a todo, THE system SHALL make the todo visible in the trash list.

WHEN a member deletes a todo, THE system SHALL allow the todo to be restored from trash.

### Restore from Trash

WHEN a member views the trash, THE system SHALL display all deleted todos.

WHEN a member restores a todo from trash, THE system SHALL move the todo back to the normal todo list.

WHEN a member restores a todo from trash, THE system SHALL preserve all original todo data.

WHEN a member restores a todo from trash, THE system SHALL preserve the todo's edit history.

WHEN a member restores a todo from trash, THE system SHALL remove the todo from the trash list.

WHEN a member restores a todo from trash, THE system SHALL maintain the original completion status.

WHEN a member restores a todo, THE system SHALL make the todo immediately visible in the normal todo list.

### Permanent Deletion Flow

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo permanently.

WHEN a member permanently deletes a todo from trash, THE system SHALL delete all associated edit history.

WHEN a member permanently deletes a todo from trash, THE system SHALL remove the todo from the trash list.

WHEN a member permanently deletes a todo from trash, THE system SHALL prevent any future restoration of the todo.

WHEN a member permanently deletes a todo, THE system SHALL require explicit confirmation before proceeding.

WHEN a member permanently deletes a todo, THE system SHALL make the deletion irreversible.

### Pagination Through Lists

WHEN a member views their todo list, THE system SHALL display todos in paginated pages.

WHEN a member views the trash list, THE system SHALL display deleted todos in paginated pages.

WHEN a member navigates to the next page, THE system SHALL display the next set of todos.

WHEN a member navigates to the previous page, THE system SHALL display the previous set of todos.

WHEN a member applies a filter, THE system SHALL recalculate pagination based on filtered results.

WHEN a member changes the sort order, THE system SHALL reset to the first page.

WHEN a member creates a new todo, THE system SHALL place the new todo on the appropriate page based on current sort order.

WHEN a member deletes a todo, THE system SHALL adjust pagination if the current page becomes empty.

WHEN a member restores a todo from trash, THE system SHALL update the normal todo list pagination.

## EditHistory User Scenarios

Every time a user edits a todo, the system automatically records the change in the edit history. Users can view the complete edit history for any of their todos at any time. The history displays when each edit was made, showing the most recent changes first. Each history entry captures what changed, such as title updates, description edits, or date modifications. Users can review past versions of their todos through the chronological edit log. The system preserves the full audit trail unless the todo is permanently deleted. When a todo is moved to trash, its edit history remains intact and viewable. If a user restores a deleted todo, the full edit history comes back with it. Once a todo is permanently deleted from trash, both the todo and its entire edit history are removed.

### Edit History Tracking During Todo Editing

WHEN a member edits a todo's title, THE system SHALL automatically create an edit history entry.

WHEN a member edits a todo's description, THE system SHALL automatically create an edit history entry.

WHEN a member edits a todo's start date, THE system SHALL automatically create an edit history entry.

WHEN a member edits a todo's due date, THE system SHALL automatically create an edit history entry.

WHEN a member makes multiple edits to the same todo in sequence, THE system SHALL create separate history entries for each edit.

WHEN a member edits a todo, THE system SHALL record the exact timestamp of when the edit occurred.

WHEN a member changes a todo's title, THE system SHALL capture the new title value in the history entry.

WHEN a member changes a todo's description, THE system SHALL capture the new description value in the history entry.

WHEN a member changes a todo's start date, THE system SHALL capture the new start date value in the history entry.

WHEN a member changes a todo's due date, THE system SHALL capture the new due date value in the history entry.

### Edit Log Chronology and Version Comparison

WHEN a member views a todo's edit history, THE system SHALL display all history entries in chronological order.

WHEN a member views a todo's edit history, THE system SHALL show the most recent edit first.

WHEN a member views a todo's edit history, THE system SHALL display the timestamp of each edit.

WHEN a member views a todo's edit history, THE system SHALL show which fields were changed in each edit.

WHEN a member views a todo's edit history, THE system SHALL display the new value for each changed field.

WHEN a member compares two versions of a todo, THE system SHALL show the differences between the current version and any historical version.

WHEN a member views a specific history entry, THE system SHALL display the complete set of changes made at that timestamp.

WHEN a member reviews edit history, THE system SHALL maintain the chronological sequence of all edits.

WHEN a member views edit history, THE system SHALL include the edit timestamp for each entry.

### History Preservation with Trash Operations

WHEN a member moves a todo to trash, THE system SHALL preserve the todo's edit history.

WHEN a member views a deleted todo in trash, THE system SHALL display its complete edit history.

WHEN a member restores a todo from trash, THE system SHALL restore the todo with its full edit history intact.

WHEN a member views a restored todo, THE system SHALL display the edit history including entries from before the deletion.

WHEN a member edits a todo after restoring it from trash, THE system SHALL create new history entries appended to the existing history.