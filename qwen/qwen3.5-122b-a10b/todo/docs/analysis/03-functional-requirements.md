**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users create accounts by providing a valid email address and password. The email must be unique among all active accounts to prevent duplicate registrations. Users log in with their registered email and password to access the system. Each user maintains a profile with a display name that identifies them within the application. Users can update their display name at any time to reflect their preferred identity. Password changes require the user to verify their current password before setting a new one. Users can permanently delete their accounts, which removes all associated data including todos and trash contents. Account deletion is irreversible and cannot be undone once confirmed. Users cannot view or access other users' profiles or data since this is a private todo application.

### Account Registration

WHEN a user registers for a new account, THE system SHALL require a valid email address.
WHEN a user registers for a new account, THE system SHALL require a password.
THE system SHALL ensure email addresses are unique among all active accounts.
THE system SHALL create a new user account upon successful registration.
THE system SHALL record the account creation timestamp.
IF the email address is already registered, THE system SHALL reject the registration request.
IF the email address format is invalid, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.

**Error Conditions**
THE system SHALL reject the request when the email address is already registered.
THE system SHALL reject the request when the email address format is invalid.
THE system SHALL reject the request when the password is missing or empty.

### User Login Authentication

WHEN a user attempts to log in, THE system SHALL verify the email and password combination.
THE system SHALL grant access when the credentials match the registered account.
THE system SHALL create an authenticated session upon successful login.
THE system SHALL maintain the session until the user logs out or the session expires.
IF the email does not match a registered account, THE system SHALL deny access.
IF the password does not match the registered account, THE system SHALL deny access.
IF the account has been deleted, THE system SHALL deny access.

**Error Conditions**
THE system SHALL reject the login request when the email is not registered.
THE system SHALL reject the login request when the password is incorrect.
THE system SHALL reject the login request when the account has been deleted.

### Display Name Management

WHEN a user updates their display name, THE system SHALL accept the new value.
THE system SHALL ensure the display name is between 1 and 100 characters.
THE system SHALL update the user's profile with the new display name.
THE system SHALL persist the display name change.
IF the display name exceeds the maximum length, THE system SHALL reject the update.
IF the display name is empty, THE system SHALL reject the update.

**Error Conditions**
THE system SHALL reject the update when the display name exceeds 100 characters.
THE system SHALL reject the update when the display name is empty or contains only whitespace.

### Password Change Workflow

WHEN a user requests to change their password, THE system SHALL verify the current password.
WHEN a user requests to change their password, THE system SHALL require a new password.
THE system SHALL update the password upon successful verification of the current password.
THE system SHALL require the new password to meet security requirements.
IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.
IF the new password is the same as the current password, THE system SHALL reject the password change request.

**Error Conditions**
THE system SHALL reject the password change when the current password is incorrect.
THE system SHALL reject the password change when the new password does not meet security requirements.
THE system SHALL reject the password change when the new password matches the current password.

### Account Deletion Process

WHEN a user requests to delete their account, THE system SHALL permanently remove the account.
WHEN a user deletes their account, THE system SHALL delete all associated todos.
WHEN a user deletes their account, THE system SHALL delete all todos in the trash.
WHEN a user deletes their account, THE system SHALL delete all edit history associated with their todos.
THE system SHALL mark the account as deleted to prevent further access.
THE system SHALL make account deletion irreversible once confirmed.
IF the account has already been deleted, THE system SHALL reject the deletion request.

**Error Conditions**
THE system SHALL reject the deletion request when the account has already been deleted.
THE system SHALL permanently remove all user data including todos, trash contents, and edit history.

### Profile Privacy Boundaries

THE system SHALL restrict profile access to the account owner only.
THE system SHALL prevent users from viewing other users' profiles.
THE system SHALL maintain data isolation between all user accounts.
THE system SHALL ensure each user can only access their own todos.
THE system SHALL ensure each user can only access their own edit history.
THE system SHALL ensure each user can only access their own trash.

**Error Conditions**
THE system SHALL reject requests to access another user's profile.
THE system SHALL reject requests to access another user's todos.
THE system SHALL reject requests to access another user's edit history.
THE system SHALL reject requests to access another user's trash.

### Data Ownership

THE system SHALL associate each todo with the user who created it.
THE system SHALL associate each edit history entry with the todo it belongs to.
THE system SHALL ensure only the todo owner can modify their todos.
THE system SHALL ensure only the todo owner can delete their todos.
THE system SHALL ensure only the todo owner can view their edit history.
THE system SHALL ensure only the account owner can delete their account.
THE system SHALL ensure account deletion removes all owned data.

**Error Conditions**
THE system SHALL reject modification requests from users who do not own the todo.
THE system SHALL reject deletion requests from users who do not own the todo.
THE system SHALL reject history viewing requests from users who do not own the todo.

## Todo Operations

Users create todos with a required title and optional description field. Start date and due date can be set optionally to track task timing. Newly created todos start in an incomplete state by default. Users view their personal todo list through a paginated interface showing title, completion status, and date information. Each todo displays its creation date for tracking when it was added. Users can view individual todos to see complete details including the full description text. Todo completion is a simple toggle between complete and incomplete states. Users can edit any todo's title, description, start date, and due date at any time. Deleted todos are moved to trash rather than permanently removed immediately. Users can filter their todo list by completion status to focus on specific task states. Sorting options allow users to organize todos by creation date, start date, or due date in ascending or descending order. Todos without start or due dates appear at the end when sorting by those fields. Only the todo owner can view, edit, or delete their todos due to privacy requirements.

### Todo Creation

WHEN a user creates a todo, THE system SHALL require a title field to be provided.
WHEN a user creates a todo, THE system SHALL allow an optional description field that can be left empty.
WHEN a user creates a todo, THE system SHALL allow optional start date assignment.
WHEN a user creates a todo, THE system SHALL allow optional due date scheduling.
WHEN a user creates a todo, THE system SHALL set the todo to incomplete state by default.

IF the title is missing or empty, THE system SHALL reject the creation request.
IF the start date is provided and is invalid, THE system SHALL reject the creation request.
IF the due date is provided and is invalid, THE system SHALL reject the creation request.

### Todo Viewing and Listing

WHEN a user requests to view their todo list, THE system SHALL return a paginated list of their todos.
WHEN a user views a single todo, THE system SHALL display all its details including the full description text.
THE system SHALL ensure each todo in the list shows the title, completion status, start date (if set), due date (if set), and creation date.

THE system SHALL restrict todo visibility so users can only view their own todos.
THE system SHALL prevent users from viewing, accessing, or sharing another user's todos.

### Todo Completion Toggle

WHEN a user toggles a todo's completion status, THE system SHALL switch between complete and incomplete states.
THE system SHALL allow users to mark a todo as complete.
THE system SHALL allow users to mark a todo as incomplete.

THE system SHALL treat completion status as a simple two-state toggle without intermediate states.

### Todo Editing

WHEN a user edits a todo, THE system SHALL allow updating the title, description, start date, and due date fields.
WHEN a user edits a todo, THE system SHALL record the edit in the todo's history (see TodoHistory Operations).

IF the user does not own the todo, THE system SHALL reject the edit request.
IF the updated title is missing or empty, THE system SHALL reject the edit request.

### Todo Deletion and Trash Management

WHEN a user deletes a todo, THE system SHALL move it to trash using soft delete.
WHEN a user deletes a todo, THE system SHALL remove it from the normal todo list view.

WHEN a user views their trash, THE system SHALL return a paginated list of deleted todos.
WHEN a user restores a todo from trash, THE system SHALL return it to the normal todo list with its previous state.
WHEN a user permanently deletes a todo from trash, THE system SHALL remove the todo and all its edit history.

IF the user does not own the todo, THE system SHALL reject the delete or restore request.
IF the todo does not exist in trash, THE system SHALL reject the restore or permanent delete request.

### Todo Filtering and Sorting

WHEN a user filters their todo list by completion status, THE system SHALL show all todos, only complete todos, or only incomplete todos based on the filter selection.
WHEN a user sorts their todo list by creation date, THE system SHALL support ordering from newest first or oldest first.
WHEN a user sorts their todo list by start date, THE system SHALL support ordering from earliest first or latest first.
WHEN a user sorts their todo list by due date, THE system SHALL support ordering from earliest first or latest first.

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list.
WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list.

## TodoHistory Operations

Every time a user edits a todo, the system automatically creates a history entry. Each history entry records the exact timestamp when the edit occurred. History entries capture what changed in the title if it was modified. Description changes are recorded in the history when the description is updated. Start date modifications are tracked in history entries. Due date changes are also captured in the history log. Users can view the complete edit history for any of their todos. History entries display in reverse chronological order with the most recent edits first. This allows users to track how a todo has evolved over time. The history provides an audit trail of all modifications made to a todo. When a todo is permanently deleted from trash, its entire edit history is also permanently removed. History entries cannot be edited or deleted independently of their parent todo.

### Automatic History Creation

WHEN a user edits any field of their todo, THE system SHALL automatically create a new history entry.

WHEN a todo is created, THE system SHALL NOT create a history entry (initial creation is not tracked as an edit).

THE system SHALL create history entries without requiring explicit user action.

THE system SHALL ensure history entry creation is atomic with the todo edit operation.

IF the todo edit is rejected for any reason, THE system SHALL NOT create a history entry.

THE system SHALL record history entries for all subsequent edits after the initial creation.

### Edit Field Tracking

WHEN a history entry is created, THE system SHALL record the exact timestamp when the edit occurred.

WHEN the todo title is changed, THE system SHALL record the new title value in the history entry.

WHEN the todo description is changed, THE system SHALL record the new description value in the history entry.

WHEN the todo start date is changed, THE system SHALL record the new start date value in the history entry.

WHEN the todo due date is changed, THE system SHALL record the new due date value in the history entry.

IF a field is not modified during an edit, THE system SHALL NOT include that field in the history entry.

THE system SHALL track partial field changes (e.g., only title changed, or title and due date changed together).

THE system SHALL capture only the new value of changed fields, not the previous values.

### Edit History Viewing

WHEN a user requests to view the edit history of a todo, THE system SHALL display all history entries for that todo.

THE system SHALL only allow users to view the history of their own todos.

THE system SHALL reject history viewing requests for todos the user does not own.

THE system SHALL display the timestamp for each history entry.

THE system SHALL display which fields were changed in each history entry.

THE system SHALL display the new values of changed fields in each history entry.

THE system SHALL show an empty history view when no edits have been made to the todo.

THE system SHALL indicate when a history entry represents the most recent edit.

### Chronological History Sorting

WHEN displaying history entries, THE system SHALL sort them in chronological order.

THE system SHALL display the most recent history entry first.

THE system SHALL display the oldest history entry last.

THE system SHALL maintain consistent ordering when new history entries are added.

THE system SHALL ensure the chronological order reflects the actual edit timestamps.

WHEN a new history entry is created, THE system SHALL display it at the top of the history list.

### History Audit Trail and Deletion

THE history entries SHALL provide an audit trail showing how a todo has evolved over time.

THE system SHALL enable users to track all modifications made to their todos.

THE system SHALL preserve the complete edit history for as long as the todo exists.

WHEN a todo is permanently deleted from the trash, THE system SHALL also permanently delete all associated history entries.

THE system SHALL ensure history entries cannot be edited or deleted independently of their parent todo.

THE system SHALL ensure history entries are automatically removed when the parent todo is permanently deleted.

THE system SHALL NOT allow users to manually delete individual history entries.

THE system SHALL ensure history deletion is irreversible once a todo is permanently deleted.

# Business Actions and Workflows

Business actions and workflows beyond basic CRUD.

## User Actions

Users create new accounts by providing email and password during sign up. Email addresses must be unique across all active user accounts. Users authenticate to the system by logging in with their registered email and password. Once logged in, users can modify their account password for security purposes. Users maintain a personal profile that includes a display name for identification. Users can update their display name at any time to reflect their preferred identity. Users have the option to delete their account entirely from the system. Account deletion is a permanent action that removes all user data from the platform. When an account is deleted, all todos belonging to that user are permanently removed including items in the trash. Account deletion also removes all edit history associated with the user's todos. The system enforces privacy by ensuring users cannot access or view other users' profiles or data.

### Account Registration

WHEN a new user registers for an account, THE system SHALL:
1. Require a valid email address
2. Require a password
3. Create a new user account with the provided credentials
4. Mark the account as active

WHEN a user attempts to register with an email address, THE system SHALL:
1. Validate the email format is correct
2. Check if the email already exists in the system

IF the email address is already registered, THE system SHALL reject the registration request and inform the user.
IF the email format is invalid, THE system SHALL reject the registration request and inform the user.
IF the password does not meet security requirements, THE system SHALL reject the registration request and inform the user.

THE system SHALL ensure each email address is unique across all active user accounts.
THE system SHALL prevent duplicate registrations from the same email address.

### User Authentication

WHEN a registered user attempts to log in, THE system SHALL:
1. Accept the user's email address and password
2. Verify the credentials match the stored account
3. Create an authenticated session upon successful verification

WHEN a user provides incorrect credentials, THE system SHALL:
1. Reject the login attempt
2. Not reveal whether the email exists in the system
3. Allow the user to retry authentication

IF the email address does not exist, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.
IF the account has been deleted, THE system SHALL reject the login attempt.

THE system SHALL maintain session state for authenticated users.
THE system SHALL require re-authentication when the session expires.

### Password Change

WHEN an authenticated user requests to change their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Update the password upon successful verification

WHEN a user submits a new password, THE system SHALL:
1. Validate the new password meets security requirements
2. Ensure the new password is different from the current password
3. Update the password in the system

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.
IF the new password matches the current password, THE system SHALL reject the password change request.

THE system SHALL invalidate existing sessions when the password is changed.
THE system SHALL require the user to log in again with the new password.

### Profile Management

WHEN a user accesses their profile, THE system SHALL:
1. Display the user's display name
2. Allow the user to edit their display name
3. Save the updated display name upon confirmation

WHEN a user updates their display name, THE system SHALL:
1. Validate the display name meets length requirements
2. Update the display name in the user's profile

IF the display name exceeds the maximum length, THE system SHALL reject the update and inform the user.
IF the display name is empty, THE system SHALL reject the update and inform the user.

THE system SHALL store the display name for user identification purposes.
THE system SHALL make the display name visible only to the owning user.

Users cannot view other users' profiles in this private todo application.

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL:
1. Require confirmation of the deletion action
2. Permanently remove all user data from the system
3. Remove all todos belonging to the user
4. Remove all todos in the user's trash
5. Remove all edit history associated with the user's todos

WHEN an account is deleted, THE system SHALL:
1. Mark the user account as deleted
2. Permanently delete all associated todos
3. Permanently delete all todo history entries
4. Prevent the user from logging in again

IF the user does not confirm the deletion, THE system SHALL cancel the deletion request.

THE system SHALL ensure account deletion is irreversible.
THE system SHALL inform the user that all data will be permanently lost.

Account deletion removes all data including items in the trash and all edit history.

### Privacy Enforcement

WHEN a user accesses the system, THE system SHALL:
1. Verify the user's authentication status
2. Ensure the user can only access their own data
3. Prevent access to other users' data

WHEN a user attempts to access another user's data, THE system SHALL:
1. Reject the access request
2. Return an authorization error

IF a user attempts to view another user's todos, THE system SHALL deny access.
IF a user attempts to view another user's profile, THE system SHALL deny access.
IF a user attempts to view another user's todo history, THE system SHALL deny access.

THE system SHALL enforce data isolation between all users.
THE system SHALL prevent any cross-user data access.

Users can only see their own todos and profile information.
There is no mechanism to view, access, or share another user's todos.

## Todo Actions

Users create todos by providing a required title and optional description. Start date and due date can be specified when creating a todo but are not mandatory. All newly created todos start in an incomplete state by default. Users can view their complete list of todos with pagination support for large collections. The todo list displays title, completion status, start date, due date, and creation date for each item. Users can open a single todo to view its full description and all associated details. Users toggle todos between complete and incomplete states with a simple action. Users can edit any field of their todos including title, description, start date, and due date. Every modification to a todo is automatically recorded in the edit history. Users can soft delete todos which removes them from the normal view but keeps them recoverable. Deleted todos are moved to the trash where they remain accessible to the user. Users can restore deleted todos from the trash to return them to the active todo list. Users can permanently delete todos from the trash which removes them and their history forever. Users can filter their todo list by completion status showing all, only complete, or only incomplete items. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without start or due dates appear at the end when sorting by those fields. All todo operations are restricted to the owning user only with no cross-user access.

### Todo Creation

WHEN a user creates a todo, THE system SHALL require a title field.
WHEN a user creates a todo, THE system SHALL allow an optional description field that can be left empty.
WHEN a user creates a todo, THE system SHALL allow an optional start date to be specified.
WHEN a user creates a todo, THE system SHALL allow an optional due date to be specified.
WHEN a user creates a todo, THE system SHALL set the completion status to incomplete by default.
IF the title is not provided when creating a todo, THE system SHALL reject the creation request.
IF the start date is provided but is invalid, THE system SHALL reject the creation request.
IF the due date is provided but is invalid, THE system SHALL reject the creation request.

### Todo Viewing

WHEN a user requests to view their todo list, THE system SHALL return a paginated list of todos.
WHEN a user views the todo list, THE system SHALL display the title, completion status, start date (if set), due date (if set), and creation date for each todo.
WHEN a user requests to view a single todo, THE system SHALL display all details including the full description.
IF the requested todo does not belong to the user, THE system SHALL reject the view request.
IF the requested todo has been permanently deleted, THE system SHALL reject the view request.

### Todo Completion Toggle

WHEN a user marks a todo as complete, THE system SHALL update the completion status to complete.
WHEN a user marks a todo as incomplete, THE system SHALL update the completion status to incomplete.
WHEN a user toggles the completion status of a todo, THE system SHALL switch between complete and incomplete states.
IF the user does not own the todo, THE system SHALL reject the completion toggle request.
IF the todo has been permanently deleted, THE system SHALL reject the completion toggle request.

### Todo Field Editing

WHEN a user edits a todo, THE system SHALL allow changes to the title field.
WHEN a user edits a todo, THE system SHALL allow changes to the description field.
WHEN a user edits a todo, THE system SHALL allow changes to the start date field.
WHEN a user edits a todo, THE system SHALL allow changes to the due date field.
WHEN a user edits a todo, THE system SHALL create a history entry recording the timestamp and all changed fields.
IF the user does not own the todo, THE system SHALL reject the edit request.
IF the todo has been permanently deleted, THE system SHALL reject the edit request.
IF the new title is empty, THE system SHALL reject the edit request.

### Todo Deletion and Trash Management

WHEN a user deletes a todo, THE system SHALL perform a soft delete and move it to the trash.
WHEN a user views their trash, THE system SHALL display a paginated list of deleted todos.
WHEN a user restores a todo from the trash, THE system SHALL return it to the active todo list.
WHEN a user permanently deletes a todo from the trash, THE system SHALL remove the todo and all its edit history.
IF the user does not own the todo, THE system SHALL reject the delete or restore request.
IF the todo is not in the trash, THE system SHALL reject the restore request.
Permanent deletion of a todo is irreversible and the system SHALL NOT allow recovery.

### Todo Filtering and Sorting

WHEN a user filters their todo list, THE system SHALL allow filtering by completion status.
WHEN filtering by completion status, THE system SHALL support three options: all todos, only complete todos, and only incomplete todos.
WHEN a user sorts their todo list, THE system SHALL allow sorting by creation date in ascending or descending order.
WHEN a user sorts their todo list, THE system SHALL allow sorting by start date in ascending or descending order.
WHEN a user sorts their todo list, THE system SHALL allow sorting by due date in ascending or descending order.
WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list.
WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list.

### User Ownership Enforcement

WHEN a user accesses any todo, THE system SHALL verify that the user owns the todo.
WHEN a user accesses any todo, THE system SHALL reject requests for todos belonging to other users.
WHEN a user views their todo list, THE system SHALL return only todos owned by the requesting user.
WHEN a user views their trash, THE system SHALL return only deleted todos owned by the requesting user.
WHEN a user views edit history for a todo, THE system SHALL verify the user owns the todo.
There SHALL be no mechanism for users to view, access, or share another user's todos.

## TodoHistory Actions

Every time a user edits a todo, the system automatically creates a new history entry. History entries capture the exact timestamp when the edit occurred. Each history entry records which fields were changed and their new values. If the title was modified, the new title value is stored in the history entry. If the description was modified, the new description value is stored in the history entry. If the start date was modified, the new start date value is stored in the history entry. If the due date was modified, the new due date value is stored in the history entry. Users can view the complete edit history for any of their todos. History entries are displayed in reverse chronological order with the most recent edits appearing first. The history provides a complete audit trail of all modifications made to a todo. Users can review past changes to understand how a todo evolved over time. Permanently deleting a todo from the trash also removes all associated history entries. History is private to each user and cannot be accessed by other users. The history feature enables accountability and transparency for todo modifications.

### Automatic History Creation

WHEN a user edits a todo, THE system SHALL automatically create a new history entry.

THE system SHALL record the exact timestamp when the edit occurred in each history entry.

THE system SHALL capture all field changes in the history entry, including which fields were modified and their new values.

THE system SHALL create a history entry for every edit operation, regardless of how many fields were changed.

THE system SHALL ensure history creation happens as part of the edit operation, not as a separate action.

IF no fields are changed during an edit attempt, THE system SHALL NOT create a history entry.

WHEN a history entry is created, THE system SHALL associate it with the todo being edited.

THE system SHALL prevent users from manually creating or deleting history entries outside of todo edits.

### Field Change Recording

WHEN a todo's title is changed, THE system SHALL record the new title value in the history entry.

WHEN a todo's description is changed, THE system SHALL record the new description value in the history entry.

WHEN a todo's start date is changed, THE system SHALL record the new start date value in the history entry.

WHEN a todo's due date is changed, THE system SHALL record the new due date value in the history entry.

THE system SHALL only record fields that were actually modified in each history entry.

IF a field is not changed during an edit, THE system SHALL omit that field from the history entry.

THE system SHALL preserve the exact values of changed fields at the time of the edit.

WHEN multiple fields are changed in a single edit, THE system SHALL record all changed fields in one history entry.

### History Viewing and Display

WHEN a user views a todo's history, THE system SHALL display the complete edit history for that todo.

THE system SHALL display history entries in reverse chronological order with the most recent edits appearing first.

THE system SHALL show the timestamp of each edit in the history display.

THE system SHALL indicate which fields were changed in each history entry.

THE system SHALL display the new values for each changed field in the history entry.

IF a todo has no edit history, THE system SHALL display an empty history state.

THE system SHALL allow users to review the full history of any todo they own.

THE system SHALL provide a clear view of how a todo evolved over time through its history entries.

### Edit Audit Trail

THE system SHALL provide an audit trail of all modifications made to each todo.

THE system SHALL enable users to understand how a todo changed from creation to its current state.

WHEN reviewing history, THE system SHALL show the sequence of all edits in chronological order.

THE system SHALL support accountability by recording who made each change through the todo ownership.

THE system SHALL ensure the history provides transparency for todo modifications.

THE system SHALL maintain a complete record of all field changes throughout the todo's lifetime.

### History on Permanent Deletion

WHEN a user permanently deletes a todo from the trash, THE system SHALL also delete all associated history entries.

THE system SHALL ensure history entries are removed when their parent todo is permanently deleted.

THE system SHALL prevent orphaned history entries from remaining after todo deletion.

THE system SHALL make permanent deletion of history irreversible once the todo is removed from trash.

### History Privacy Enforcement

THE system SHALL ensure history entries are private to each user.

THE system SHALL prevent users from viewing another user's todo history.

THE system SHALL enforce history ownership through the todo ownership relationship.

THE system SHALL block any attempt to access history entries for todos the user does not own.

THE system SHALL maintain the same privacy level for history as for the todo itself.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When users attempt to register with an email already associated with an active account, the system prevents duplicate registration and prompts them to use a different email or log in instead. Users who enter incorrect passwords during login receive immediate feedback without revealing whether the email exists in the system. Email verification links that expire before use require users to request a new verification link through the login flow. Password changes require the current password to be verified first, and new passwords must differ from the current one to maintain security. Users attempting to change their display name to an empty string or exceeding the character limit receive validation feedback without saving the invalid value. Account deletion requires explicit confirmation through a secondary dialog to prevent accidental data loss. Users who delete their accounts cannot immediately re-register with the same email, as the email remains reserved to prevent identity confusion. Login sessions expire after periods of inactivity, requiring users to re-authenticate to access protected features.

### Account Registration and Verification Errors

### Duplicate Email Registration

WHEN a user attempts to register with an email address, THE system SHALL verify that the email is not already associated with an active account.

WHEN the email is already registered, THE system SHALL reject the registration request.

WHEN the email is already registered, THE system SHALL provide feedback indicating the email is in use without revealing whether the account is active or deleted.

IF a user attempts to register with an email that was previously used for a deleted account, THE system SHALL prevent the registration.

IF a user attempts to register with an email that was previously used for a deleted account, THE system SHALL inform them that the email cannot be reused.

THE system SHALL treat deleted and active accounts equally when checking email uniqueness.

### Incorrect Password Handling

WHEN a user logs in with incorrect credentials, THE system SHALL reject the authentication request.

WHEN a user enters an incorrect password, THE system SHALL provide generic feedback that does not reveal whether the email exists in the system.

WHEN a user enters an incorrect password, THE system SHALL NOT indicate if the email address is registered or unregistered.

WHEN a user enters multiple consecutive incorrect passwords, THE system SHALL continue to provide the same generic error message.

THE system SHALL NOT expose account existence information through error messages during login attempts.

### Expired Verification Links

WHEN a user clicks an expired email verification link, THE system SHALL reject the verification request.

WHEN a verification link has expired, THE system SHALL inform the user that the link is no longer valid.

WHEN a verification link has expired, THE system SHALL provide an option to request a new verification link.

WHEN a user requests a new verification link, THE system SHALL send a fresh verification email to the registered address.

WHEN a user clicks a verification link that has already been used, THE system SHALL inform them that the email has already been verified.

IF a user attempts to access protected features before verifying their email, THE system SHALL redirect them to complete verification first.

### Password and Profile Management Errors

### Password Change Validation

WHEN a user requests to change their password, THE system SHALL require verification of the current password.

IF the current password provided does not match the stored password, THE system SHALL reject the password change request.

IF the current password provided does not match the stored password, THE system SHALL provide generic error feedback without revealing password details.

WHEN a user attempts to set a new password that matches their current password, THE system SHALL reject the change.

WHEN a user attempts to set a new password that matches their current password, THE system SHALL inform them that the new password must differ from the current one.

WHEN a user successfully changes their password, THE system SHALL invalidate all existing login sessions.

WHEN existing sessions are invalidated, THE system SHALL require users to re-authenticate with the new password.

### Display Name Validation

WHEN a user updates their display name, THE system SHALL validate that the value is not empty.

IF the display name is submitted as an empty string, THE system SHALL reject the update request.

IF the display name exceeds the maximum allowed length, THE system SHALL reject the update request.

WHEN the display name update is rejected, THE system SHALL provide feedback indicating the validation failure.

WHEN the display name update is rejected, THE system SHALL preserve the existing display name without modification.

THE system SHALL NOT save partial or invalid display name values.

### Account Deletion and Session Errors

### Account Deletion Confirmation

WHEN a user requests to delete their account, THE system SHALL require explicit confirmation through a secondary dialog.

IF the user does not confirm the deletion request, THE system SHALL NOT proceed with account deletion.

WHEN the user confirms account deletion, THE system SHALL permanently delete all associated todos.

WHEN the system deletes todos during account deletion, THE system SHALL also delete todos in the trash.

WHEN the system deletes todos during account deletion, THE system SHALL also delete all associated TodoHistory entries.

WHEN account deletion completes, THE system SHALL remove all user data from the system.

### Email Reservation After Deletion

WHEN a user deletes their account, THE system SHALL reserve the associated email address.

WHEN an email is reserved after account deletion, THE system SHALL prevent immediate re-registration with that email.

WHEN a user attempts to re-register with a previously deleted account's email, THE system SHALL reject the registration.

WHEN a user attempts to re-register with a previously deleted account's email, THE system SHALL inform them that the email cannot be reused.

THE system SHALL maintain the email reservation to prevent identity confusion.

### Session Expiration Behavior

WHEN a login session expires due to inactivity, THE system SHALL require the user to re-authenticate.

WHEN a user attempts to access protected features with an expired session, THE system SHALL redirect them to the login page.

WHEN a user is redirected due to session expiration, THE system SHALL preserve their intended destination for return after re-authentication.

WHEN a user's session expires, THE system SHALL invalidate all session tokens associated with that session.

WHEN a user re-authenticates after session expiration, THE system SHALL create a new session with fresh credentials.

THE system SHALL apply session expiration consistently across all protected features.

## Todo Error Scenarios

Users cannot create todos without providing a title, as this field is required for all todo entries. When setting both start and due dates, the system allows the start date to be equal to or before the due date, but prevents invalid date combinations where start date occurs after due date. Users attempting to edit or delete todos that do not belong to them receive access denied feedback without revealing whether the todo exists. Soft deleted todos remain in the system but disappear from the normal todo list, appearing only in the trash view. Users cannot restore todos that have been permanently deleted from the trash, as this action removes all associated data irreversibly. Pagination limits ensure users see manageable result sets when viewing large todo collections. Filtering by completion status returns empty results when no todos match the selected criteria. Sorting by date fields places todos without those dates at the end of the list to maintain consistent ordering. Users cannot share or transfer todos to other users, maintaining strict privacy boundaries.

### Required Title Validation

WHEN a user creates a todo, THE system SHALL require a title to be provided.

IF the title is missing or empty, THE system SHALL reject the creation request and inform the user that a title is required.

WHEN a user provides a title, THE system SHALL accept the todo creation with the title as the primary identifying field.

THE system SHALL NOT allow todo creation without a valid title, as this is a mandatory business requirement for all todo entries.

IF a user attempts to create a todo with only whitespace in the title field, THE system SHALL treat this as an empty title and reject the request.

### Date Range Validation

WHEN a user sets both a start date and a due date for a todo, THE system SHALL validate that the start date is not after the due date.

IF the start date is later than the due date, THE system SHALL reject the request and inform the user that the start date must be on or before the due date.

WHEN a user sets only a start date without a due date, THE system SHALL accept the configuration without date range validation.

WHEN a user sets only a due date without a start date, THE system SHALL accept the configuration without date range validation.

WHEN a user sets both dates to the same value, THE system SHALL accept this as a valid configuration where the task starts and is due on the same day.

IF a user updates an existing todo with new dates that violate the range rule, THE system SHALL reject the update and preserve the original date values.

### Todo Ownership Verification

WHEN a user attempts to view, edit, complete, or delete a todo, THE system SHALL verify that the todo belongs to that user.

IF the todo does not belong to the requesting user, THE system SHALL reject the operation and return an access denied response.

THE system SHALL NOT reveal whether a todo exists when the user does not own it, to prevent information leakage about other users' data.

WHEN a user attempts to access another user's todo through direct reference, THE system SHALL treat this as an unauthorized access attempt and deny the request.

THE system SHALL enforce privacy boundaries at all todo access points, ensuring users can only interact with their own todos.

IF a guest attempts to access any todo without authentication, THE system SHALL reject the request and require login first.

### Soft Delete Visibility

WHEN a user deletes a todo, THE system SHALL mark it as soft deleted and remove it from the normal todo list.

THE system SHALL make soft deleted todos invisible in the standard todo listing view.

WHEN a user views their trash, THE system SHALL display all soft deleted todos associated with their account.

IF a user attempts to access a soft deleted todo directly outside of the trash view, THE system SHALL reject the request.

THE system SHALL maintain all todo data including edit history while the todo remains in soft deleted state.

WHEN a user restores a soft deleted todo from trash, THE system SHALL make it visible in the normal todo list again.

### Permanent Deletion Irreversibility

WHEN a user permanently deletes a todo from the trash, THE system SHALL irreversibly remove the todo and all associated data.

THE system SHALL permanently delete all edit history entries associated with the todo when permanent deletion occurs.

IF a user attempts to restore a permanently deleted todo, THE system SHALL reject the request as the data no longer exists.

THE system SHALL provide no recovery mechanism for permanently deleted todos, as this action is final and irreversible.

WHEN permanent deletion occurs, THE system SHALL ensure all traces of the todo are removed from the system.

IF a user deletes their account, THE system SHALL permanently delete all their todos including those in trash along with all associated history.

### Pagination Empty Results

WHEN a user views their todo list with pagination, THE system SHALL return paginated results based on the requested page and page size.

IF the requested page contains no todos, THE system SHALL return an empty result set without error.

THE system SHALL ensure pagination limits are enforced to return manageable result sets for each request.

WHEN pagination parameters exceed available data, THE system SHALL return the available results up to the requested page.

IF a user requests a page number beyond the available data, THE system SHALL return an empty list for that page.

THE system SHALL apply the same pagination rules to both the normal todo list and the trash view.

### Filter Empty Results

WHEN a user filters their todo list by completion status, THE system SHALL return todos matching the selected filter criteria.

IF no todos match the selected filter criteria, THE system SHALL return an empty result set without error.

WHEN a user filters for only complete todos and has no complete todos, THE system SHALL return an empty list.

WHEN a user filters for only incomplete todos and has no incomplete todos, THE system SHALL return an empty list.

WHEN a user selects "all todos" filter, THE system SHALL return todos regardless of completion status.

THE system SHALL apply filter criteria before pagination to ensure accurate result sets.

### Date Sorting Null Handling

WHEN a user sorts their todo list by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN a user sorts their todo list by due date, THE system SHALL place todos without a due date at the end of the list.

THE system SHALL maintain consistent ordering when todos have null values for date fields being sorted.

WHEN sorting by creation date, THE system SHALL order todos regardless of whether other date fields are set.

IF a user sorts by start date in ascending order, THE system SHALL show todos with earliest start dates first, with null dates last.

IF a user sorts by due date in descending order, THE system SHALL show todos with latest due dates first, with null dates last.

### Privacy Boundary Enforcement

WHEN a user accesses the todo system, THE system SHALL enforce that users can only view and manage their own todos.

THE system SHALL NOT provide any mechanism for users to share, transfer, or view another user's todos.

IF a user attempts to access a todo through any means that does not verify ownership, THE system SHALL deny the request.

THE system SHALL maintain strict privacy boundaries across all todo operations including creation, viewing, editing, and deletion.

WHEN a user queries for todos, THE system SHALL automatically filter results to include only todos owned by that user.

IF a user attempts to bypass privacy controls through direct API access or other means, THE system SHALL validate ownership at every access point.

## TodoHistory Error Scenarios

Edit history entries are automatically created whenever a user modifies any editable field on their todo, ensuring complete audit trails. Users attempting to view edit history for todos they do not own receive access denied feedback without revealing whether the todo exists. When a todo is permanently deleted from the trash, all associated edit history entries are also permanently removed and cannot be recovered. History entries display only the fields that were actually changed during each edit, leaving unchanged fields unrecorded to reduce noise. Users viewing history for todos with no edits see an empty history list rather than an error message. Multiple edits made in quick succession each generate separate history entries with distinct timestamps. The system prevents users from manually creating or modifying history entries directly, as these are managed automatically. History entries remain accessible even after a todo is soft deleted, allowing users to review changes before restoring from trash.

### Automatic History Creation

WHEN a user edits any field on their todo, THE system SHALL automatically create a new history entry.

WHEN a user updates the title of a todo, THE system SHALL create a history entry recording the new title value.

WHEN a user updates the description of a todo, THE system SHALL create a history entry recording the new description value.

WHEN a user updates the start date of a todo, THE system SHALL create a history entry recording the new start date value.

WHEN a user updates the due date of a todo, THE system SHALL create a history entry recording the new due date value.

WHEN a user marks a todo as complete or incomplete, THE system SHALL NOT create a history entry (completion status changes are not tracked in history).

WHEN a user creates a new todo, THE system SHALL NOT create a history entry (initial creation is not considered an edit).

IF a user attempts to edit a todo they do not own, THE system SHALL NOT create a history entry and SHALL reject the edit request.

IF the edit operation fails for any reason, THE system SHALL NOT create a history entry.

### History Ownership Verification

WHEN a user requests to view the edit history of a todo, THE system SHALL verify that the user owns the todo before returning history entries.

WHEN a guest attempts to view the edit history of any todo, THE system SHALL deny access without revealing whether the todo exists.

WHEN a member attempts to view the edit history of a todo owned by another user, THE system SHALL deny access without revealing whether the todo exists.

IF a user attempts to view history for a non-existent todo, THE system SHALL return an access denied response without distinguishing between ownership failure and non-existence.

IF a user attempts to view history for a permanently deleted todo, THE system SHALL return an access denied response.

IF a user attempts to view history for a soft-deleted todo they own, THE system SHALL allow access and return the history entries.

### History Deletion with Permanent Todo Deletion

WHEN a user permanently deletes a todo from the trash, THE system SHALL permanently delete all associated history entries.

WHEN a user permanently deletes a todo from the trash, THE system SHALL ensure all history entries are removed in the same operation.

IF a user permanently deletes a todo, THE system SHALL make the history entries unrecoverable.

IF a user restores a todo from the trash, THE system SHALL NOT restore the associated history entries (they remain permanently deleted).

WHEN a user deletes their entire account, THE system SHALL permanently delete all todos and all associated history entries for that user.

IF a permanent deletion operation is interrupted, THE system SHALL ensure history entries are either all deleted or none are deleted (atomic operation).

### Partial Field Recording

WHEN a user edits a todo, THE system SHALL record only the fields that were actually changed in the history entry.

WHEN a user updates only the title of a todo, THE system SHALL create a history entry containing only the new title value (other fields omitted).

WHEN a user updates only the description of a todo, THE system SHALL create a history entry containing only the new description value (other fields omitted).

WHEN a user updates only the start date of a todo, THE system SHALL create a history entry containing only the new start date value (other fields omitted).

WHEN a user updates only the due date of a todo, THE system SHALL create a history entry containing only the new due date value (other fields omitted).

WHEN a user updates multiple fields in a single edit operation, THE system SHALL record all changed fields in a single history entry.

IF a user submits an edit with no field changes, THE system SHALL NOT create a history entry.

### Empty History Display

WHEN a user views the edit history of a todo that has never been edited, THE system SHALL display an empty history list.

WHEN a user views the edit history of a newly created todo, THE system SHALL display an empty history list.

IF a user views history for a todo with no edits, THE system SHALL NOT display an error message.

IF a user views history for a todo with no edits, THE system SHALL indicate that no edit history is available.

WHEN the system returns an empty history list, THE system SHALL maintain the same response structure as a non-empty history list (for consistent client handling).

### Rapid Edit Handling

WHEN a user makes multiple edits to a todo in quick succession, THE system SHALL create a separate history entry for each edit.

WHEN a user makes multiple edits to a todo in quick succession, THE system SHALL assign distinct timestamps to each history entry.

IF two edits are made within the same second, THE system SHALL ensure each history entry has a unique timestamp.

WHEN a user makes five edits to a todo within one minute, THE system SHALL create five separate history entries.

IF the system experiences high load during rapid edits, THE system SHALL ensure all history entries are created in the correct order.

IF rapid edits cause a performance issue, THE system SHALL queue edits sequentially to maintain history entry order integrity.

### History Immutability

WHEN a history entry is created, THE system SHALL prevent any user from modifying that history entry.

WHEN a history entry is created, THE system SHALL prevent any user from deleting that history entry individually.

IF a user attempts to modify a history entry, THE system SHALL reject the modification request.

IF a user attempts to delete a history entry, THE system SHALL reject the deletion request.

WHEN a user edits a todo, THE system SHALL create a new history entry rather than modifying an existing history entry.

IF an error occurs during history entry creation, THE system SHALL NOT allow partial or corrupted history entries to be stored.

### History Visibility After Soft Delete

WHEN a user soft deletes a todo, THE system SHALL keep the associated history entries accessible.

WHEN a user views the edit history of a soft-deleted todo they own, THE system SHALL return all history entries.

WHEN a user restores a todo from the trash, THE system SHALL maintain access to the existing history entries.

IF a user soft deletes a todo and then views its history before restoration, THE system SHALL display all history entries.

IF a user soft deletes a todo and restores it, THE system SHALL NOT create duplicate history entries for the restore operation.

WHEN a user views history for a soft-deleted todo, THE system SHALL indicate the todo's deleted status in the response.

# End-to-End User Scenarios

Cross-domain user scenarios, multi-step business flows, and end-to-end use cases.

## User User Scenarios

New users begin by creating an account using their email address and a secure password. The system verifies that the email is unique among active accounts before allowing registration. After registration, users receive an email verification link to confirm their account ownership. Verified users can then log in to the application using their registered email and password. Once logged in, users can customize their profile by setting or updating their display name. Users have the ability to change their password at any time for security purposes. When users decide to leave the platform, they can delete their account, which permanently removes all their todos and associated data. Account deletion is irreversible and affects todos in both the active list and trash. Users cannot view other users' profiles or access any information about other accounts. The system maintains complete privacy by isolating each user's data from all other users. Users must be logged in to access any application features. Session management ensures users remain authenticated while actively using the application.

### Account Registration and Email Verification

WHEN a new user wants to register an account, THE system SHALL:
1. Require the user to provide a valid email address
2. Require the user to provide a password
3. Verify that the email address is unique among active accounts
4. Create a new user account with the provided credentials
5. Mark the account as unverified until email confirmation is completed

WHEN the system creates a new account, THE system SHALL:
1. Send an email verification link to the provided email address
2. Generate a unique verification token for the account
3. Set an expiration time for the verification token

WHEN a user clicks the email verification link, THE system SHALL:
1. Validate the verification token
2. Mark the account as verified if the token is valid and not expired
3. Allow the user to log in after successful verification
4. Reject the verification if the token is invalid or expired

IF the email address is already registered to an active account, THE system SHALL reject the registration request.
IF the verification token has expired, THE system SHALL require the user to request a new verification email.

### User Login and Session Authentication

WHEN a user wants to log in to the application, THE system SHALL:
1. Require the user to provide their registered email address
2. Require the user to provide their password
3. Validate the email address format
4. Verify the password matches the stored credentials
5. Create an authenticated session upon successful validation

WHEN the user provides incorrect credentials, THE system SHALL:
1. Reject the login attempt
2. Not reveal whether the email address exists in the system
3. Allow the user to retry with correct credentials

WHEN a user successfully logs in, THE system SHALL:
1. Create an active session for the user
2. Maintain the session while the user actively uses the application
3. Require re-authentication after session expiration

WHILE the user has an active session, THE system SHALL:
1. Allow access to all application features
2. Maintain session state across page requests
3. Automatically extend the session with user activity

### Display Name and Profile Customization

WHEN a user wants to customize their profile, THE system SHALL:
1. Allow the user to set or update their display name
2. Require the display name to be between 1 and 100 characters
3. Save the display name change immediately
4. Display the updated name throughout the application

WHEN a user views their profile, THE system SHALL:
1. Show their current display name
2. Show their account creation date
3. Not show any sensitive information like email or password

IF the display name is empty or exceeds 100 characters, THE system SHALL reject the profile update request.

WHEN a user edits their display name, THE system SHALL:
1. Update the display name in the user profile
2. Reflect the change immediately in all user-facing displays

### Password Change Workflow

WHEN a user wants to change their password, THE system SHALL:
1. Require the user to provide their current password for verification
2. Require the user to provide a new password
3. Require the user to confirm the new password by entering it twice
4. Verify the new password meets security requirements
5. Update the password only if all validations pass

WHEN the user provides an incorrect current password, THE system SHALL:
1. Reject the password change request
2. Not reveal whether the account exists
3. Allow the user to retry

WHEN the new password does not match the confirmation, THE system SHALL:
1. Reject the password change request
2. Require the user to re-enter both passwords

IF the new password does not meet security requirements, THE system SHALL reject the password change request and inform the user of the requirements.

WHEN the password is successfully changed, THE system SHALL:
1. Update the password in the user account
2. Invalidate all existing sessions
3. Require the user to log in again with the new password

### Account Deletion and Permanent Data Removal

WHEN a user wants to delete their account, THE system SHALL:
1. Require the user to confirm the account deletion action
2. Require the user to provide their password for verification
3. Permanently delete all the user's todos (including those in trash)
4. Permanently delete all edit history associated with the user's todos
5. Mark the user account as deleted
6. Invalidate all active sessions for the user

WHEN the account is deleted, THE system SHALL:
1. Remove all todos from the active list
2. Remove all todos from the trash
3. Remove all TodoHistory entries associated with the user's todos
4. Make the account unrecoverable

IF the user cancels the deletion confirmation, THE system SHALL retain all data and keep the account active.

WHEN the user attempts to log in after account deletion, THE system SHALL:
1. Reject the login attempt
2. Inform the user that the account no longer exists

### User Privacy and Cross-User Access Prevention

WHEN a user accesses the application, THE system SHALL:
1. Ensure the user can only view their own todos
2. Prevent access to any other user's data
3. Isolate all data by user account

WHEN a user requests a todo, THE system SHALL:
1. Verify the todo belongs to the requesting user
2. Return the todo only if ownership is confirmed
3. Reject the request if the todo belongs to another user

WHEN a user views their todo list, THE system SHALL:
1. Display only todos owned by the requesting user
2. Never display todos from other users
3. Apply user-specific filtering and sorting

WHEN a user views the trash, THE system SHALL:
1. Display only deleted todos owned by the requesting user
2. Never display deleted todos from other users

IF a user attempts to access another user's todo by ID, THE system SHALL reject the request and not reveal whether the todo exists.

THE system SHALL maintain complete data isolation between all user accounts.
THE system SHALL not provide any mechanism to view, access, or share another user's todos.

## Todo User Scenarios

Users create new todos by providing a required title and optional description, start date, and due date. Newly created todos automatically start in an incomplete state. Users can view their complete todo list with pagination to manage large numbers of items. Each todo in the list displays title, completion status, dates, and creation date for quick reference. Users can toggle todos between complete and incomplete states as their work progresses. Users can filter their todo list to show all todos, only completed items, or only incomplete items. Users can sort their todos by creation date, start date, or due date in ascending or descending order. When sorting by dates, todos without those dates appear at the end of the list. Users can edit any of their todos to update title, description, start date, or due date. Users can delete their own todos, which moves them to the trash instead of permanent removal. Users can view their trash to see all deleted todos with pagination support. Users can restore deleted todos from the trash to return them to the active todo list. Users can permanently delete todos from the trash, removing them and their history forever. Users can only see and manage their own todos due to privacy restrictions. Users can view full details of individual todos including complete descriptions.

### Todo Creation Workflow

WHEN a user creates a new todo, THE system SHALL:
1. Require a title to be provided
2. Accept an optional description
3. Accept optional start date and due date
4. Set the todo as incomplete by default
5. Associate the todo with the creating user
6. Record the creation timestamp
7. Create an initial history entry documenting the todo creation

IF the title is not provided, THE system SHALL reject the todo creation request.

IF the start date is provided after the due date, THE system SHALL reject the todo creation request.

A newly created todo automatically enters the active todo list and is immediately visible to the user.

### Todo List Viewing and Detail Access

WHEN a user views their todo list, THE system SHALL:
1. Display todos in paginated batches
2. Show each todo's title, completion status, start date (if set), due date (if set), and creation date
3. Exclude deleted todos from the normal list view
4. Display only todos owned by the viewing user

WHEN a user views a single todo's details, THE system SHALL:
1. Display the complete title and description
2. Show all date fields (start date, due date, creation date)
3. Display the current completion status
4. Indicate the todo owner
5. Provide access to view the edit history

IF the requested todo does not exist, THE system SHALL indicate that the todo cannot be found.
IF the user does not own the requested todo, THE system SHALL deny access to the todo details.

### Todo Completion Toggle

WHEN a user toggles a todo's completion status, THE system SHALL:
1. Switch the todo between complete and incomplete states
2. Record the completion status change in the todo's history
3. Update the completion timestamp
4. Preserve all other todo fields during the toggle

A todo marked as complete remains visible in the todo list with its completed status indicated.
A todo marked as incomplete returns to the active incomplete state.

THE system SHALL allow toggling completion status on any todo owned by the user, regardless of its current state.

### Todo Filtering by Status

WHEN a user filters their todo list by completion status, THE system SHALL:
1. Support filtering to show all todos
2. Support filtering to show only completed todos
3. Support filtering to show only incomplete todos
4. Apply the filter to the current paginated view
5. Maintain filter state across pagination navigation

WHEN filtering is applied, THE system SHALL:
1. Only display todos matching the selected completion status
2. Preserve the current sort order
3. Reset pagination to the first page

THE system SHALL apply filters after sorting, ensuring consistent result ordering within each filter selection.

### Todo Sorting Options

WHEN a user sorts their todo list, THE system SHALL:
1. Support sorting by creation date (newest first or oldest first)
2. Support sorting by start date (earliest first or latest first)
3. Support sorting by due date (earliest first or latest first)
4. Display todos without start dates at the end when sorting by start date
5. Display todos without due dates at the end when sorting by due date

WHEN sorting by date fields, THE system SHALL:
1. Order todos with the specified date values first
2. Place todos without the date value at the end of the list
3. Maintain consistent ordering for todos with identical date values

THE system SHALL apply the selected sort order to the current filtered view.

### Todo Editing Workflow

WHEN a user edits a todo, THE system SHALL:
1. Allow updating the title
2. Allow updating the description
3. Allow updating the start date
4. Allow updating the due date
5. Create a new history entry for each edit
6. Record which fields were changed and their new values
7. Record the timestamp of the edit

IF the title is updated to an empty value, THE system SHALL reject the edit request.
IF the start date is updated to a date after the due date, THE system SHALL reject the edit request.

THE system SHALL preserve unchanged fields when partial updates are submitted.

A todo edit creates exactly one history entry, even if multiple fields are modified simultaneously.

### Todo Soft Deletion

WHEN a user deletes a todo, THE system SHALL:
1. Move the todo to the trash instead of permanent removal
2. Mark the todo with a deletion timestamp
3. Remove the todo from the active todo list
4. Preserve all todo data including edit history
5. Make the todo accessible in the trash view

THE system SHALL allow soft deletion on any todo owned by the user.
THE system SHALL prevent soft deletion of todos not owned by the user.

A soft-deleted todo retains all its information and can be restored to the active list.

### Trash Restoration Process

WHEN a user views their trash, THE system SHALL:
1. Display all soft-deleted todos owned by the user
2. Paginate the trash list for large numbers of deleted todos
3. Show each deleted todo's title, deletion timestamp, and original creation date
4. Exclude todos permanently deleted from the trash view

WHEN a user restores a deleted todo from the trash, THE system SHALL:
1. Remove the deletion timestamp
2. Return the todo to the active todo list
3. Preserve all todo data and edit history
4. Make the todo immediately accessible in the normal view

IF the requested todo in trash does not exist, THE system SHALL indicate it cannot be found.
IF the user does not own the requested todo in trash, THE system SHALL deny access.

### Permanent Todo Deletion

WHEN a user permanently deletes a todo from the trash, THE system SHALL:
1. Remove the todo and all its data permanently
2. Delete all associated edit history entries
3. Prevent any possibility of recovery
4. Remove the todo from all views including trash

THE system SHALL require explicit confirmation before permanent deletion.
THE system SHALL prevent permanent deletion of todos not owned by the user.

Permanent deletion is irreversible and all associated data is lost forever.

### Private Todo Access Control

WHEN a user accesses any todo functionality, THE system SHALL:
1. Verify the user owns the requested todo
2. Deny access to todos owned by other users
3. Prevent viewing, editing, or deleting other users' todos
4. Isolate all todo data by user ownership

THE system SHALL enforce privacy restrictions on all todo operations including:
- Creating todos (automatically associates with current user)
- Viewing todo lists (shows only own todos)
- Viewing todo details (verifies ownership)
- Editing todos (verifies ownership)
- Deleting todos (verifies ownership)
- Viewing trash (shows only own deleted todos)
- Restoring todos (verifies ownership)

There is no mechanism to share, transfer, or access another user's todos.

### Todo Edit History Viewing

WHEN a user views a todo's edit history, THE system SHALL:
1. Display all history entries for the todo
2. Sort history entries from most recent to oldest
3. Show the timestamp of each edit
4. Display which fields were changed in each entry
5. Show the new values for changed fields

THE system SHALL display an empty history state when no edits exist beyond the initial creation.
THE system SHALL include the initial creation as a history entry.

A user can view the edit history of any todo they own, regardless of whether the todo is in the active list or trash.

## TodoHistory User Scenarios

Every time a user edits a todo, the system automatically creates a history entry documenting the change. Each history entry records the exact timestamp when the edit occurred. History entries capture which fields were changed and what the new values are. Users can view the complete edit history for any of their todos. History entries are displayed in reverse chronological order with most recent changes first. Users can track how a todo's title has evolved over time through history entries. Users can review description changes to understand how todo details have been modified. Users can see when start dates and due dates were added or changed. Users can audit all modifications made to their todos for personal tracking. When a user permanently deletes a todo from the trash, all associated history entries are also removed. History entries only exist for todos that have been edited at least once. Users can compare current todo state against previous versions through history review. The history feature provides transparency and accountability for todo modifications. Users can verify when specific changes were made to their todos. History entries are private to each user and cannot be accessed by other users.

### History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a history entry for that todo.

WHEN a history entry is created, THE system SHALL record the exact timestamp when the edit occurred.

WHEN a history entry is created, THE system SHALL capture all fields that were changed in the edit.

IF a todo has never been edited, THE system SHALL not create any history entries for it.

IF a user edits a todo multiple times, THE system SHALL create a separate history entry for each edit.

THE system SHALL associate each history entry with the todo that was edited.

THE system SHALL ensure history entries are created immediately after an edit is saved.

### History Viewing Workflow

WHEN a user views a todo's edit history, THE system SHALL display all history entries for that todo.

THE system SHALL display history entries in reverse chronological order with the most recent changes first.

WHEN viewing history, THE system SHALL show the timestamp of each edit.

WHEN viewing history, THE system SHALL display the current value of each field that was changed.

IF a todo has no edit history, THE system SHALL display an empty history view to the user.

THE system SHALL allow users to view the history of any todo they own.

THE system SHALL prevent users from viewing the history of todos they do not own.

### Field Change Documentation

WHEN a user edits a todo's title, THE system SHALL record the new title value in the history entry.

WHEN a user edits a todo's description, THE system SHALL record the new description value in the history entry.

WHEN a user adds or changes a start date, THE system SHALL record the new start date value in the history entry.

WHEN a user adds or changes a due date, THE system SHALL record the new due date value in the history entry.

IF a field is not changed during an edit, THE system SHALL not include that field in the history entry.

THE system SHALL allow users to review how a todo's title has evolved over time through history entries.

THE system SHALL allow users to review description changes to understand how todo details have been modified.

THE system SHALL allow users to see when start dates and due dates were added or changed through history.

### History Permanent Deletion

WHEN a user permanently deletes a todo from the trash, THE system SHALL also permanently delete all associated history entries.

WHEN a todo is permanently deleted, THE system SHALL ensure no history entries remain accessible.

THE system SHALL prevent users from permanently deleting only the history entries while keeping the todo.

THE system SHALL ensure history deletion is irreversible once a todo is permanently deleted from trash.

### Private History Access and Verification

THE system SHALL ensure each user can only view the edit history of their own todos.

THE system SHALL prevent users from accessing another user's todo history through any means.

WHEN a user views history, THE system SHALL verify the user owns the associated todo before displaying entries.

THE system SHALL ensure history entries are private to each user and cannot be accessed by other users.

THE system SHALL allow users to verify when specific changes were made to their own todos.

THE system SHALL allow users to track how their todos have changed over time for personal auditing.

THE system SHALL provide transparency and accountability for all todo modifications through private history access.