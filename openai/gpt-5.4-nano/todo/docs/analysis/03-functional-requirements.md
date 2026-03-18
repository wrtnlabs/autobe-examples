**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can sign up to create an account using their email and password, establishing ownership of their future todos. Users can log in with the same email and password to access their private todo list and related features. Users can update their password to keep their account secure, and the system must reject password changes for accounts that are not properly authenticated as the acting user. Users can delete their account, which removes all of their associated todos permanently, including those in trash. After an account deletion, the user can no longer access the app with that account credentials and should not be able to view any prior private data. The system should treat each user as the only rightful owner of their account data and prevent access to other users’ accounts. User profile privacy is enforced so users cannot view other users’ profiles while performing these user operations. If a request references an account that does not exist or credentials are incorrect, the system must deny the operation and keep all private data unchanged.

### User Account Creation Flow

#### User sign-up and account creation
When a guest submits a request to create an account using an email and password, the system shall create a new user account owned by that email identity.

The account creation process shall accept an email and password as provided by the user and shall associate subsequent todo ownership with the newly created account.

If the request is missing either the email or the password, the system shall reject the request and shall not create an account.

If a request uses an email that is already registered to an existing user account, the system shall reject the request and shall not create a duplicate account.

#### Post-sign-up access
After a successful account creation, the system shall allow the new user to log in using the same email and password as part of normal account access.

#### Unauthorized operation rejection
If a guest attempts an account operation that requires an existing, authenticated account (such as operations that apply to an already-created account), the system shall reject the operation because the user is not authenticated as an account owner.

#### Account data privacy on creation failure
If the system rejects an account creation request due to missing or invalid inputs, the system shall keep all existing users’ private data unchanged and inaccessible.

### Email and Password Login Behavior

#### Login using email and password
When a user submits a login request with an email and password, the system shall authenticate the user for that email identity.

If the email and password are correct for an existing account, the system shall grant the user access to their private todo-related capabilities.

#### Missing or unknown credentials handling
If the login request is missing the email or the password, the system shall reject the login attempt.

If the login request references an email that does not correspond to any user account, the system shall reject the login attempt.

If the login request provides an email that exists but the password is incorrect, the system shall reject the login attempt.

#### Incorrect credentials do not affect user data
When a login attempt is rejected due to missing, unknown, or incorrect credentials, the system shall not modify any existing user data.

#### Private ownership enforcement after login
After a user is successfully authenticated, the system shall treat the user as the only rightful owner of their private account data and todos, and all subsequent viewing and modification of private data shall be limited to that account.

### Password Change Business Rule (Authenticated Owner Only)

#### Password change requires authentication
When a user requests a password change, the system shall require that the request is made by the currently authenticated account owner.

#### Current password verification
If the user requests a password change and the provided current password is incorrect for the authenticated account, the system shall reject the password change.

If the current password is correct, the system shall update the account password for the authenticated account.

#### Missing inputs handling
If the user requests a password change but omits the current password or the new password, the system shall reject the password change.

#### Rejected changes keep account data unchanged
If a password change request is rejected (because of missing inputs or incorrect current password), the system shall keep the account password and all private todo data unchanged.

#### Unauthorized operation rejection
If an unauthenticated guest attempts to change a password, the system shall reject the request because the acting user is not an authenticated account owner.

### Account Deletion Permanently Removes Todos (Including Trash)

#### Account deletion permanently removes all associated todos
When a user requests account deletion, the system shall permanently delete all todos owned by that user.

This permanent deletion shall include todos that are currently in trash.

#### Post-deletion access denial
After account deletion completes, the user shall no longer be able to access the application using the deleted account credentials.

#### No continued access to prior private data
After account deletion, the system shall prevent the former account owner from viewing any private data that belonged to the deleted account, including todo details and edit history.

#### Unauthorized operation rejection
If a guest attempts to delete an account that does not exist or is not owned by the authenticated acting user, the system shall reject the request and shall not delete any account data.

#### Deletion request targeting non-existent account
If a deletion request references an account that does not exist, the system shall reject the operation and shall not alter any other users’ private data.

#### Account deletion business flow
Account deletion shall follow this business flow: a user requests account deletion; the system deletes all owned todos, including those in trash; the system removes all associated edit history; the account is deleted; and access is denied using the deleted credentials.

### Private Ownership and Preventing Access to Other Users

#### User data is private to the owning account
All user data that the app exposes for viewing or editing (including profile information and todos) shall be private and accessible only to the owning account.

#### No cross-user visibility
Users shall not be able to view, access, or operate on any data belonging to other users.

#### Access denial when acting user is not the owner
If a request targets a todo or account resource that is not owned by the acting user, the system shall deny the operation.

#### Unauthorized operation is rejected
If the acting user is not authenticated as an account owner, the system shall reject operations that require an account owner context.

#### Missing or incorrect credentials handling for protected actions
If a request for a protected operation is made with missing or incorrect credentials such that the system cannot verify the acting user, the system shall reject the operation and shall keep all private data unchanged.

### Unified Error Handling for Unauthorized and Credential Issues

#### Rejection behavior for protected operations
If a request references an account that does not exist, the system shall reject the operation.

If the provided credentials do not match the acting account, the system shall reject the operation.

#### No side effects on rejection
For any rejected account operation (whether due to missing inputs, incorrect credentials, or unauthorized access), the system shall not create, update, or delete user data.

#### Consistent privacy on errors
When a request is rejected due to unauthorized access or credential problems, the system shall not reveal information that would allow a user to infer details about other users’ accounts or private todo data.

#### What “rejected” means for the user
When an operation is rejected due to missing or incorrect credentials, the system shall respond with failure and shall leave the user’s private data in its previous state.

## Todo Operations

Users can create todos by providing a required title and optional details such as description, start date, and due date. When a todo is created, it starts in an incomplete state by default. Users can view a paginated list of their own todos, where each list item shows the title, completion status, optional start and due dates when set, and the todo’s creation date. Users can open a single todo to see all its details, including the full description. Users can update a todo’s title, description, start date, and due date, and these changes apply only to their own todos. Users can mark a todo as complete or incomplete, using a simple toggle between the two states. Users can delete a todo, which moves it out of the normal todo list via soft deletion rather than permanent removal. Users can restore deleted todos from trash back to the normal list, ensuring the todo returns with its prior content and status. Users can also filter their todo list by completion status and sort it by creation date, start date, or due date, with items missing start or due dates appearing at the end for those sorts.

### Todo Creation (Title, Optional Details, Initial State)

Users can create a todo by providing a title (required).
Users can optionally provide a description for the todo; if left empty, the description is stored as empty.
Users can optionally provide a start date for the todo; if left empty, the todo has no start date.
Users can optionally provide a due date for the todo; if left empty, the todo has no due date.
When a new todo is created, it starts as incomplete by default.
If a user attempts to create a todo without a title, the system rejects the request.
If a user attempts to create a todo with a due date earlier than its start date, the system rejects the request.
When a todo is successfully created, it is associated with the creating user only and is not accessible to other users.

### View Own Todos (Paginated List)

Users can view a list of their own todos.
The todo list is paginated.
Each item in the list displays the todo title.
Each item in the list displays the todo completion status.
If a todo has a start date, the item displays the start date; otherwise, no start date value is shown.
If a todo has a due date, the item displays the due date; otherwise, no due date value is shown.
Each item in the list displays the todo creation date.
A user cannot view another user’s todos; attempts to view a different user’s todo list are rejected or result in no access.

### View a Single Todo (Full Details)

Users can open a single todo to view all its details.
The detailed view includes the full description.
The detailed view includes the todo title.
The detailed view includes the todo completion status.
The detailed view includes the start date if a start date was set; otherwise, the start date is shown as not set.
The detailed view includes the due date if a due date was set; otherwise, the due date is shown as not set.
The detailed view includes the todo creation date.
If a user tries to open a todo that does not belong to them, access is denied.

### Edit a Todo (Title, Description, Start Date, Due Date)

Users can edit the title, description, start date, and due date of their own todos.
Edits apply only to the user’s own todo.
If the title is changed, the system records the new title in the todo’s edit history.
If the description is changed, the system records the new description in the todo’s edit history.
If the start date is changed, the system records the new start date in the todo’s edit history.
If the due date is changed, the system records the new due date in the todo’s edit history.
Users can submit edits even when optional fields are left empty; the system updates the todo so the corresponding fields are treated as not set (for dates) or empty (for description).
If a user attempts to set a due date that is earlier than the start date, the system rejects the update.
If an edit is rejected, the todo’s content and edit history are not updated.

### Completion Toggle (Complete / Incomplete)

Users can mark a todo as complete.
Users can mark a todo as incomplete.
Completion behavior is a simple toggle between the two states (complete and incomplete).
The system updates the todo completion status so it is reflected consistently in both the single-todo view and the todo list.
If a user attempts to toggle completion for a todo that does not belong to them, the system denies the operation.

### Delete, Restore, and Permanent Delete (Trash Workflow)

Users can delete their own todos.
Deleting a todo moves it out of the normal todo list via soft deletion (the todo is placed in trash rather than being permanently removed).
Users can view a list of their deleted todos in trash.
The trash list is paginated.
Users can restore a deleted todo from trash back to the normal todo list.
When a todo is restored, it returns to the normal todo list rather than remaining only in trash.
Users can permanently delete a todo from the trash.
When a todo is permanently deleted, its edit history is also deleted.
If a user tries to delete a todo that does not belong to them, the system denies the operation.

### Filter Todos by Completion Status

Users can filter their todo list by completion status.
The filter options include: all todos, only complete todos, and only incomplete todos.
Applying a completion-status filter affects which todos are shown in the normal todo list.
Filter selection is applied per viewing request and determines the set of todos displayed.
A user can only filter and view their own todos.

### Sort Todos by Creation, Start, and Due Dates (Handling Missing Dates)

Users can sort their todo list by creation date.
Users can choose creation date order from newest first or oldest first.
Users can sort their todo list by start date.
Users can choose start date order from earliest first or latest first.
When sorting by start date, todos without a start date appear at the end of the list.
Users can sort their todo list by due date.
Users can choose due date order from earliest first or latest first.
When sorting by due date, todos without a due date appear at the end of the list.
Sorting applies to the normal todo list view and affects the order of items shown to the user.

## TodoEditHistoryEntry Operations

Whenever a user edits a todo, the system records an edit history entry capturing when the change was made. Each history entry records what changed, including the previous and new values for the title, description, start date, and due date when those specific parts were modified. Users can view the full edit history for a todo they own, with entries ordered from most recent to oldest to make changes easy to follow. History is created automatically as part of the editing experience, so users can trust that every modification is traceable. The system should not expose other users’ todo edit histories, preserving privacy in a multi-user environment. If a user attempts to access edit history for a todo they do not own, the operation must be denied and no details should be revealed. When a user permanently deletes a todo from trash, the system must also permanently delete its edit history. If an edit attempt occurs with invalid or unauthorized context, the history should not record a change that did not actually take effect.

### Edit History Entry Creation on Todo Edits

Whenever a user successfully edits one of their own todos, the system must create an edit history entry for that todo as part of the editing outcome.

Each edit history entry must represent the edit that actually took effect; if an edit attempt does not result in a change, the system must not create a history entry.

The edit history entry must include the time when the edit was made.

For each editable field (title, description, start date, due date), the history entry must record the before-and-after values only for the fields that were actually modified by the edit.

If a particular editable field was not changed as part of the edit, the history entry must not record a before-and-after change for that field.

If the edit changes multiple fields, the history entry must reflect each changed field with its corresponding before-and-after values.

For edits that include only permissible changes and are accepted, the system must ensure the created history entry is consistent with the resulting todo details shown to the user.

### Viewing a Todo’s Full Edit History

Users can view the full edit history for a todo they own.

The system must show history entries for the selected todo, including each entry’s time when the edit occurred.

The system must include the recorded changed values for title, description, start date, and due date for each entry, but only for the fields that were modified in that edit.

History entries must be ordered from most recent to oldest when displayed to the user.

### Edit History Privacy and Access Control

The system must not expose any edit history for a todo to users who do not own that todo.

If a user attempts to access the edit history of a todo they do not own, the request must be denied.

When access is denied for edit history, the system must not reveal any details about the existence of the todo’s history or the contents of history entries.

### Permanent Deletion from Trash Removes Edit History

When a user permanently deletes a todo from their trash, the system must also permanently delete all edit history entries associated with that todo.

After permanent deletion from trash, the system must not make the deleted todo’s edit history available to the user.

The system must ensure that permanently deleted edit history entries do not appear in any subsequent attempt to view edit history for that todo.

### Most-Recent-First History Ordering

When presenting edit history entries for a todo, the system must order entries with the newest edit first.

If multiple edits exist, earlier (older) history entries must appear after later (more recent) ones.

## UserProfile Operations

Each user has a profile that includes a display name. Users can edit their own display name to reflect how they want to appear within their private space. The system must ensure users can read their own profile information as part of account use, but cannot view other users’ profiles at all. User profile privacy is essential in this private todo app, so profile visibility must never extend beyond the acting user. If a user requests a profile change while not authenticated as the correct account owner, the system must deny the update and leave the existing display name unchanged. When a user deletes their account, their profile data is also effectively removed as part of permanently deleting all of the user’s associated data. There is no requirement for listing profiles across users, since profiles are private; the system should not provide any way to browse or discover other users. Any error while updating the display name should be handled gracefully without affecting todo access or other user features.

### User Display Name Profile Overview

THE system SHALL provide each user with a private profile that includes a display name.
THE system SHALL treat the display name as profile information that is shown only within the acting user’s own private context.
THE system SHALL allow the acting user to view their own profile information as part of using the application.
IF a request is made to view another user’s profile information, THEN the system SHALL deny access.

### Edit Own Display Name Behavior

WHEN a user requests to change their own display name, THE system SHALL update the user’s profile display name.
THE system SHALL record the new display name only when the user’s change request is accepted.
WHEN a user successfully saves a display name change, THE system SHALL ensure subsequent views of the user’s profile show the updated display name.
IF the user submits a display name change request while not authenticated as the correct account owner, THEN the system SHALL deny the update and leave the existing display name unchanged.
IF the user submits an update request with a blank display name, THEN the system SHALL reject the change and leave the existing display name unchanged.

### Private Profile Visibility Rules

THE system SHALL restrict profile visibility so that a user can only view their own profile display name.
IF a user attempts to view any other user’s profile display name, THEN the system SHALL deny access.
THE system SHALL provide no browsing, discovery, or listing capability that would enable users to find other users’ profiles.
IF a user navigates to a profile view intended for another user, THEN the system SHALL prevent viewing other users’ profile information.

### Account Deletion Removes Associated Profile Data

WHEN a user deletes their account, THE system SHALL permanently delete the user’s associated data, including the user’s todos (including those in trash) and the user’s profile information.
IF the user account deletion is completed, THEN the system SHALL ensure the user’s profile information is no longer available.
WHEN a user deletes their account, THE system SHALL not leave the profile information accessible to any actor after completion.

### Error Handling Preserves Current Display Name

IF a display name update fails for any reason, THEN the system SHALL keep the existing display name unchanged.
WHEN a user attempts to save a display name change, THEN the system SHALL not partially update the profile such that the display name becomes inconsistent.
IF the user’s update request is rejected, THEN the system SHALL preserve the current display name and allow the user to continue using their todos without interruption.
IF the system denies the update due to lack of account ownership, THEN the system SHALL leave the existing display name unchanged.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When signing up, a user must provide an email and a password; if either is missing or blank, the system should show a clear message and refuse to create the account. If the same email is already registered, the system should prevent duplicate accounts and prompt the user to log in instead. During login, the system should reject attempts when the email does not exist or the password is incorrect, without revealing which part was wrong. If a user tries to change their password using credentials or a current password that does not match what the account expects, the system should deny the change and keep the existing password intact. Password changes should also be rejected when required inputs are missing. When a user deletes their account, the system must treat the user’s todos as part of the same operation, removing them from the user’s access path immediately. Deleting an account should be handled consistently across normal lists and trash views, so that deleted users can no longer restore anything related to their account. If a user attempts to view or modify a profile in a way that would expose another user’s information, the system should block the request and return an access-denied style response rather than showing data. Edge cases such as repeated delete attempts after an account is already deleted should be treated as idempotent, with the system returning a safe response rather than failing unpredictably. Wherever possible, the system should keep the user informed of what went wrong and what action to take next (for example, try again, log in, or re-enter required fields).

### User Signup Input Validation and Error Messaging

WHEN a guest or member attempts to sign up while required signup inputs are missing or blank, THE system SHALL reject the signup request.
WHEN the system rejects the signup request, THE system SHALL present a clear message describing what input is missing and what the user should do next (for example, re-enter required fields and try again).
IF a signup request is rejected due to missing or blank required inputs, THEN the system SHALL not create a user account.

### Duplicate Email Registration Prevention During Signup

WHEN a user attempts to sign up with an email that is already registered, THE system SHALL prevent creation of a duplicate account.
WHEN preventing duplicate registration, THE system SHALL prompt the user to log in instead of creating another account.

### Login Failure Behavior for Unknown Email or Wrong Password

WHEN a member or guest attempts to log in with an email that does not exist, THE system SHALL reject the login request.
WHEN a member or guest attempts to log in with an email that exists but the password is incorrect, THE system SHALL reject the login request.
IF login is rejected because the email is unknown or the password is wrong, THEN THE system SHALL not reveal which of the two was incorrect.
WHEN login is rejected, THE system SHALL provide user guidance for the next action (for example, try again or re-enter credentials).

### Password Change Denial When Current Password Is Incorrect

WHEN a member attempts to change their password and the current password provided does not match what the account expects, THE system SHALL deny the password change.
WHEN the password change is denied due to an incorrect current password, THE system SHALL keep the existing password intact.
IF the system denies the password change, THEN THE system SHALL show a clear message and guide the user to retry with the correct current password.

### Password Change Input Completeness Checks

WHEN a member attempts to change their password while required password-change inputs are missing or blank, THE system SHALL reject the password change request.
WHEN rejecting the password change request due to missing required inputs, THE system SHALL keep the existing password intact.
WHEN rejecting the password change request, THE system SHALL provide user guidance describing what is needed next (for example, re-enter required fields and try again).

### Account Deletion Removes All Todos Including Trash

WHEN a member deletes their account, THE system SHALL treat the deletion of the user’s account and the removal of all that user’s todos (including todos that are in trash) as part of the same overall operation.
WHEN the account is deleted, THE system SHALL remove the user’s todos from the user’s access path immediately.
WHEN the user’s account is deleted, THE system SHALL ensure that deleted users can no longer restore anything related to their account, including items previously shown in trash.

### No Access to Other Users' Profiles

WHEN a member attempts to view or access another user’s profile information, THE system SHALL block the request.
IF the system blocks access to a profile because it is not the requesting user’s profile, THEN THE system SHALL return an access-denied style response rather than showing the other user’s profile data.

### Access Denied for Other Users' Profiles

WHEN a member requests to view a profile that does not belong to them, THE system SHALL not display any profile details for that other user.
IF the requested profile does not belong to the authenticated user, THEN THE system SHALL respond with an access-denied outcome.

### Idempotent Account Deletion for Repeated Attempts

WHEN a member attempts to delete an account that has already been deleted, THE system SHALL handle the repeated deletion attempt safely.
IF the account is already deleted, THEN THE system SHALL return a safe response and SHALL NOT fail unpredictably.
WHEN repeated deletion is attempted, THE system SHALL not reintroduce access to any previously removed todos or trash items.

### Consistent User Guidance After Failures

WHEN an account, login, password change, or profile access action fails, THE system SHALL keep the user informed of what went wrong.
WHEN an action fails, THE system SHALL provide guidance for the next action the user can take (for example, try again, log in again, or re-enter required fields).
IF multiple actions are possible after failure, THEN THE system SHALL choose guidance that matches the user’s attempted operation.

## Todo Error Scenarios

When creating a todo, the title is required; if a user submits a blank title, the system should reject the creation and ask the user to provide a valid title. Description, start date, and due date are optional, so leaving them empty should be allowed without blocking creation. Newly created todos should begin in an incomplete state; attempts to create a todo with an implied completed state should still result in an incomplete todo. If a user tries to view a todo that they do not own, the system should not reveal any details and should deny access. If a user tries to edit or delete a todo that they do not own, the system should similarly deny the action. Deleting a todo should be a soft delete, meaning it should disappear from the normal todo list immediately and move into the user’s trash. If a user tries to delete a todo that is already soft-deleted, the system should handle it safely (for example, by keeping it in trash) rather than causing a broken state. Restoring from trash should move the todo back into the normal list, and failure cases should occur only when the todo cannot be restored for ownership or missing-resource reasons. When permanently deleting from trash, the system should permanently remove the todo and ensure it no longer appears in either the normal list or trash afterward. For list views, pagination should behave consistently: requesting pages should not expose other users’ todos and should not return confusing duplicates or missing items within the user’s own dataset. Sorting and filtering should still work even when optional dates are not set, placing undated items at the end for the relevant sorting modes. Overall, error handling should emphasize privacy and ownership boundaries while providing guidance like “check your inputs” or “the todo is not available.”

### Creation Validation for Required Title

When a user attempts to create a todo, the system shall reject the creation if the title is blank or missing and shall prompt the user to provide a valid title.
- The system shall allow creation when the description is left empty.
- The system shall allow creation when the start date is left empty.
- The system shall allow creation when the due date is left empty.
- When the user submits a todo creation request without a provided title, the system shall not create a todo in any list (normal list or trash).
- If the user includes an optional completion-related intent implicitly through the provided values, the system shall still create the todo as incomplete by default rather than honoring any implied completed state.

### Acceptance of Optional Description and Dates

When a user provides a description value during todo creation, the system shall accept it even if it is empty.
- When a user provides a start date value during todo creation, the system shall accept it if it is present; if the start date is not provided, the system shall treat it as not set.
- When a user provides a due date value during todo creation, the system shall accept it if it is present; if the due date is not provided, the system shall treat it as not set.
- When optional dates are not set for a newly created todo, the system shall still allow the todo to be viewed in the user’s own todo lists.
- If a user edits optional fields later by clearing start date or due date, the system shall handle the cleared value as “not set,” rather than rejecting the edit.

### Access Denial When Viewing a Todo (Non-Owner)

When a user requests to view a single todo that they do not own, the system shall deny access.
- When access is denied for a non-owned todo, the system shall not reveal the todo’s details (including title, completion status, dates, description, or edit history).
- When a todo is soft-deleted and the user attempts to view it through a non-trash viewing path, the system shall still deny access if the user does not own it.
- If the requested todo cannot be accessed because it is missing or not available to the user, the system shall treat the situation consistently as “the todo is not available” rather than revealing which state it is in.

### Access Denial for Editing and Deleting a Todo (Non-Owner)

When a user attempts to edit or delete a todo that they do not own, the system shall apply the same access-denial behavior as in "Access Denial When Viewing a Todo (Non-Owner)".
- When an edit is denied due to lack of ownership, the system shall not change any fields on the todo.
- When a user attempts to delete a todo they do not own, the system shall deny the delete.
- When a delete is denied due to lack of ownership, the system shall not move the todo into the user’s trash.
- When a user attempts to permanently delete a todo from trash that they do not own, the system shall deny the permanent deletion.

### Soft Delete and Trash Consistency

When a user deletes one of their todos from the normal todo list, the system shall perform a soft delete such that the todo no longer appears in the normal todo list.
- After a soft delete, the system shall place the todo into the user’s trash.
- When a user deletes a todo that is already in trash, the system shall handle the request safely without breaking the user’s todo lists (for example, by keeping the todo in trash and not duplicating it).
- When a todo is soft-deleted, its edit history shall remain available through the appropriate history views until the todo is permanently deleted.
- The system shall ensure that a soft-deleted todo appears in the trash view and does not appear in the normal list view at the same time.

### Restore From Trash Back to Normal List

When a user restores a deleted todo from their trash, the system shall move the todo back into the normal todo list.
- After restoration, the todo shall no longer appear in the trash view.
- If a user attempts to restore a todo that is not available for them to restore (for example, because it no longer exists or ownership cannot be established), the system shall reject the restore and shall not create a duplicate normal todo entry.
- Restoring a todo shall not remove or alter its previously recorded edit history.

### Permanent Deletion From Trash Removes Todo and History

When a user permanently deletes a todo from their trash, the system shall permanently remove the todo from the application.
- After permanent deletion, the todo shall not appear in either the normal todo list or the trash list.
- Permanent deletion shall also remove the todo’s edit history so that history for that deleted todo is no longer available.
- If a user attempts to permanently delete a todo that has already been permanently deleted or is otherwise unavailable, the system shall handle it safely by rejecting the request as “the todo is not available,” without creating new records.
- After permanent deletion, attempts to view the todo details shall be denied or treated as not available, with no exposure of prior details.

### Pagination Privacy Boundaries for Todo Lists and Trash

For the normal todo list, pagination shall apply only to the user’s own todos.
- For the trash todo list, pagination shall apply only to the user’s own deleted todos.
- When a user requests paginated results, the system shall not include todos owned by other users under any pagination condition.
- The system shall ensure that pagination does not expose duplicates that appear to be the same todo multiple times within the same user’s dataset.
- The system shall ensure that pagination does not omit todos in a way that causes confusion within the user’s own dataset (for example, the same todo should not “disappear” and “reappear” solely due to page boundaries in a stable dataset).
- If the requested page cannot be produced because the user’s dataset changed, the system shall still preserve privacy and shall return only the user’s own todos.

### Sorting With Missing Start or Due Dates

When sorting the normal todo list by start date, todos without a start date shall be placed at the end of the list.
- When sorting the normal todo list by due date, todos without a due date shall be placed at the end of the list.
- When sorting by creation date, todos without start date or due date shall still be ordered correctly among themselves according to creation date rules.
- If a user edits a todo to clear its start date or due date, the system shall reflect the change by repositioning the todo to the end for the relevant sorting mode(s) that depend on that date.
- Sorting shall continue to work correctly for both normal and trash lists.

### Filtering by Completion Status With Edge Data

When the user selects the “All todos” filter, the system shall include both complete and incomplete todos from the relevant list (normal list).
- When the user selects the “Only complete todos” filter, the system shall include only todos marked complete in the relevant list.
- When the user selects the “Only incomplete todos” filter, the system shall include only todos marked incomplete in the relevant list.
- Filtering shall work correctly even when optional dates are not set; the absence of start date or due date shall not affect whether a todo matches completion status.
- The system shall ensure that trash listings respect completion-status filtering in the same way as the normal list when the user is viewing their deleted todos.

### Safe Handling of Actions on Already Deleted Todos

If a user attempts to restore a todo that is already in the normal todo list, the system shall handle the request safely without creating duplicate entries.
- If a user attempts to restore a todo that is permanently deleted, the system shall reject the restore as “the todo is not available.”
- If a user attempts to delete a todo that is already permanently deleted, the system shall reject the request as “the todo is not available.”
- If a user attempts to delete a todo already soft-deleted, the system shall keep the todo in trash without duplicating it.
- If a user attempts to view, edit, or permanently delete a todo that is unavailable due to its deletion state, the system shall deny access or treat it as not available without exposing any additional information.

## TodoEditHistoryEntry Error Scenarios

Users can view a todo’s edit history, which is built from prior edits; if a user requests history for a todo they do not own, the system should deny access and not show any history content. If a user requests a todo history entry that no longer exists because the todo was permanently deleted, the system should respond that the history is unavailable rather than returning stale details. History entries should be sorted from most recent to oldest, and the system should maintain that ordering even when multiple edits occur in a short time. For edits that change only some fields, the history entry should record only the fields that were actually changed, and it should not pretend that unchanged values were modified. If a user attempts to edit a todo in a way that violates business rules (for example, submitting an invalid title for a required field), the corresponding operation should be rejected and no misleading history entry should be added. Similarly, if the user edits description, start date, or due date while leaving title untouched, the history should reflect those specific changes while keeping title history accurate. When a todo is permanently deleted from trash, all its edit history should be permanently removed; afterward, any attempt to view the edit history should fail safely. Edge cases like restoring a deleted todo from trash should not retroactively create history that didn’t happen; it should only make the existing todo and its prior history visible again if it still exists. Users should receive clear feedback when they cannot access history due to ownership or because the todo was deleted permanently. The system should ensure that history viewing never leaks information across users, even through error messages or empty states.

### Access denied when viewing edit history for non-owner

When a user requests to view the edit history for a todo, the system shall show edit history only if the todo belongs to that user. If the todo does not belong to the requesting user, the system shall deny access to the edit history. In the non-owner access case, the system shall not reveal any details about the todo’s edit history, including whether the todo exists or what edits it contains. The system shall return a clear message indicating that the history cannot be accessed for this todo, without indicating other users’ information.

### History unavailable after permanent deletion

When a user permanently deletes a todo from trash, the system shall permanently remove the todo’s edit history. After a todo is permanently deleted, any attempt by a user to view that todo’s edit history shall result in the system indicating that the history is unavailable. If the history is unavailable, the system shall not display stale or previously known history details. The system shall ensure that deleted-history viewing fails safely and does not expose any portion of the removed edit history.

### Most recent to oldest ordering of history entries

When viewing edit history for a todo, the system shall present history entries sorted from the most recent edit to the oldest edit. The system shall maintain this ordering even when multiple edits occur close together. The system shall ensure that the ordering is consistent across paginated or sequential views of the same todo’s history, so that newer edits appear before older edits.

### History entries record only changed fields

Each time a user edits a todo, the system shall create a history entry for that edit. The history entry shall record only the specific fields that were actually changed by the edit. If the user submits an edit that does not change certain fields, the corresponding parts of the history entry shall not pretend those fields were changed. The system shall include the edit timestamp in each history entry.

### No history entry is added when an edit is rejected

If a user attempts to edit a todo and the edit is rejected due to validation or other business constraints, the system shall not create any new edit history entry. In the rejected-edit case, the system shall ensure that no misleading history is added that implies an edit occurred when it was not accepted. The system shall provide clear feedback that the edit was not applied, and the edit history shall remain unchanged.

### Accurate history for partial field edits

When a user edits only some of the todo’s fields (for example, editing the description while leaving the title unchanged), the system shall record changes only for the fields that were actually changed. If the user leaves the title unchanged, the history entry shall not record a title change. If the user changes the description, start date, and/or due date while leaving other fields unchanged, the history entry shall record only those changed items. The system shall ensure the history entry accurately reflects what changed during that accepted edit, without modifying the history for fields that were not part of the change.

### Restoring from trash does not invent history

When a user restores a deleted todo from the trash, the system shall make the restored todo available in the normal todo list. Restoring a todo shall not create new edit history entries. The system shall not invent history entries for actions that did not occur; restored visibility shall reveal only the existing edit history that was preserved prior to the deletion. If the todo still exists and is eligible for restore, the history shown after restore shall reflect the same history that existed before it was deleted from normal views.

### Permanent delete removes edit history too

When a user permanently deletes a todo from trash, the system shall remove that todo’s edit history permanently. After permanent deletion, the system shall treat the edit history as unavailable for that todo. The system shall not allow any retrieval of prior edit history content after the permanent deletion event.

### Clear user feedback for unavailable history

If a user cannot access a todo’s edit history because the todo does not belong to them, the system shall provide a clear message that the history cannot be accessed. If a user cannot access edit history because the todo was permanently deleted, the system shall provide a clear message that the history is unavailable. The system shall avoid confusing messages that imply the history exists but cannot be shown for technical reasons, and it shall follow the privacy-safe handling rules for access denial and unavailable history described in “Privacy-safe history viewing and anti-leakage error responses.”

### Privacy-safe history viewing and anti-leakage error responses

When users view edit history, the system shall ensure that edit history content is visible only to the owning user. For any access-denied or unavailable-history scenario, the system shall avoid leaking information that would allow inference about other users’ todos or their edit activity. The system shall ensure that error responses for history access do not disclose whether a non-owner’s requested todo exists, nor disclose any part of edit history content. The system shall ensure that empty states or unavailable states do not include hints that could be used to discover other users’ todo edit activity.

## UserProfile Error Scenarios

Each user has a private profile that includes a display name, and the system should ensure users can only view and edit their own display name. If a user attempts to view another user’s profile, the system should block the request and return an access-denied outcome rather than showing any profile data. When editing a display name, the system should reject blank or missing input to prevent an unusable profile experience. If the user submits the same display name they already have, the system should still handle the request gracefully, either treating it as a no-op or saving consistently without creating confusing results. Updates to the display name should take effect for the user’s own profile immediately after a successful edit. If the profile edit fails due to missing required information, the system should keep the existing display name unchanged. Account deletion should remove the user’s ability to access their profile, so any later attempts to view or edit the profile should be treated as unavailable. If a user tries to edit their profile while their account is already deleted, the system should respond safely rather than producing an inconsistent state. Because this is a private todo app, error messages related to profile access should not hint at whether other users exist. The system should guide users toward correcting inputs (such as re-entering a display name) when validation fails.

### Private Profile Access and Access Denial Behavior

Users can view only their own display name profile (the profile data for other users is private).
If a user attempts to view another user’s profile, the system must deny the request.
When access is denied for a profile view attempt, the system must not reveal whether the other user exists.
When access is denied for a profile view attempt, the system must not display any profile data related to the attempted user.

### Display Name Edit Validation (Blank or Missing Input)

When a user edits their own display name, the system must validate the submitted display name.
If the user submits a blank display name, the system must reject the edit.
If the user submits a missing display name value, the system must reject the edit.
When the edit is rejected due to blank or missing display name input, the system must keep the existing display name unchanged.
After a validation failure, the system must guide the user toward correcting the input (for example, prompting the user to re-enter a non-blank display name).
Validation failures related to profile editing must not include hints about whether other users exist.
Privacy and access denial behavior (including avoiding any hint about other users’ existence) must apply consistently whenever the requested profile is not the user’s own.

### Graceful Handling of Unchanged Display Name Saves

When a user submits a display name edit where the new display name is the same as the current display name, the system must handle the request gracefully.
In the unchanged case, the system may treat the save as a no-op or save consistently without creating confusing results.
The user must not observe inconsistent behavior after saving an unchanged display name (for example, the display name must remain correct and visible as before).
Privacy and access denial behavior (including avoiding any hint about other users’ existence) must apply consistently whenever the requested profile is not the user’s own.

### Successful Profile Update Persistence

When a user edits and successfully saves their own display name, the updated display name must persist.
After a successful save, the user must see the new display name reflected for their own profile immediately after the successful edit.
If the profile edit fails validation, the updated display name must not replace the existing display name.
Privacy and access denial behavior (including avoiding any hint about other users’ existence) must apply consistently whenever the requested profile is not the user’s own.

### Account Deletion Makes Profile Unavailable

When a user deletes their account, the user must no longer be able to access their profile.
After account deletion, any attempt to view the profile must be treated as unavailable.
After account deletion, any attempt to edit the profile must be treated as unavailable.
Profile unavailability after account deletion must be handled safely (the system must not produce an inconsistent state for the user’s profile).
After account deletion, the system must respond without hinting about other users’ existence.
When profile unavailability occurs (including after account deletion or when the requested profile is not the user’s own), the system must use the same safe access denial approach: do not reveal whether a different user exists and do not display any profile data related to the attempted user.

### Safe Response When Editing Profile for a Deleted Account

If a user attempts to edit their display name after their account has been deleted, the system must not accept the edit.
In this deleted-account scenario, the system must respond safely rather than producing an inconsistent state.
The user must not observe profile changes resulting from an edit attempt made after account deletion.
The system’s response must not leak whether other users exist.
If the profile cannot be accessed (including when the account has been deleted), the system must deny safely using the same safe access denial approach used for private profile access.

### Profile Access and Edit Error Flow (Business-Level)

When a user requests to view a display name profile, the system must determine whether the requested profile belongs to the same authenticated user.
If the requested profile is not for the same authenticated user, the system must deny access without revealing whether the other user exists.
If the requested profile is for the same authenticated user, the system must show the user’s own display name.
The system must not reveal whether other users exist and must not display any profile data related to an attempted user when access is denied.
When the user requests to edit their display name, the system must validate the submitted display name.
If the submitted display name is blank or missing, the system must reject the edit, keep the existing display name unchanged, and guide the user toward correcting the input.
If the account is deleted, the system must treat the profile as unavailable and reject the edit safely.
If the account is not deleted, the system must save the display name.
If the submitted display name equals the current display name, the system must handle the request gracefully (for example, by treating it as a no-op or by saving consistently) without confusing changes.
If the submitted display name differs from the current display name, the system must update the display name and ensure the user sees the updated value.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Journey: Sign up, log in, and create a first todo

Users follow an end-to-end, multi-step journey to sign up, log in, and create a personal todo.

1) When a user submits sign up with an email and password, the system either creates the user account or rejects the request based on the relevant signup error scenarios (handled in the error scenario files).
2) When an account exists, the user can log in using the same email and password.
3) After successful login, the user can create a new todo.
4) The system requires a non-empty title when creating a todo; if the title is missing, the todo creation is rejected.
5) The user may optionally provide a description; if left empty, the todo is still created.
6) The user may optionally provide a start date; if not provided, the todo has no start date set.
7) The user may optionally provide a due date; if not provided, the todo has no due date set.
8) If both start date and due date are provided, the system rejects the todo creation when the due date is earlier than the start date.
9) After a todo is successfully created, the todo is initially marked as incomplete.
10) The created todo is associated only with the creating user and remains private from other users.
11) The user can view their own paginated todo list and see the newly created todo included in the list.
12) In the todo list view, the system shows the todo’s completion status, and shows start date and due date only when those dates are set (otherwise those values are not shown as set).

### User Journey: View, open, and complete-toggle a todo

Users follow an end-to-end, multi-step user journey to view their todos, open a single todo, and toggle completion status.

1) After login, the user can view a list of their own todos.
2) The system provides the todo list in a paginated format.
3) The system displays, for each todo in the list, the title and completion status.
4) In the list, the system displays start date only if the start date is set, and due date only if the due date is set.
5) The system displays the creation date for each todo in the list.
6) The user can open a single todo from their own list to see all details.
7) The single-todo view includes the full description (even if the description was initially left empty, the system reflects that state in the details view).
8) The user can mark the opened todo as complete.
9) When the user marks the todo as complete, the system updates the completion status so that the todo is shown as complete in the user’s normal todo list.
10) The user can mark the todo as incomplete.
11) When the user marks the todo as incomplete, the system updates the completion status so that the todo is shown as incomplete in the user’s normal todo list.
12) If the user attempts to open or change completion status of a todo that does not belong to them, the request is rejected.

### User Journey: Edit a todo and review its edit history

Users follow an end-to-end, multi-step user journey to edit a todo and then review its edit history.

1) After login, the user can open a single todo they own to view its full details.
2) The user can edit the todo’s title.
3) The user can edit the todo’s description.
4) The user can edit the todo’s start date.
5) The user can edit the todo’s due date.
6) If the user attempts to edit a todo that does not belong to them, the request is rejected.
7) When an edit is successfully made, the system records an edit history entry.
8) The edit history entry records when the edit was made.
9) For each edited field, the history entry records what the title was changed to, what the description was changed to, what the start date was changed to (if changed), and what the due date was changed to (if changed).
10) If a field was not changed in the edit, the history entry does not create a record of before-and-after values for that field.
11) After editing, the user can view the full edit history for that same todo.
12) The system sorts the history entries from most recent to oldest.

### User Journey: Delete a todo, restore it from trash, and permanently delete from trash

Users follow an end-to-end, multi-step user journey using deletion, trash viewing, restoration, and permanent deletion.

1) After login, the user can delete a todo they own.
2) When a todo is deleted, it does not disappear permanently; instead it becomes part of the user’s trash.
3) Deleted todos no longer appear in the normal todo list.
4) The system provides a paginated trash list showing the user’s deleted todos.
5) The user can view a todo from the trash to see its details.
6) The user can restore a deleted todo from the trash.
7) When a todo is restored, it returns to the normal todo list for that user.
8) If the user attempts to restore or permanently delete a todo that does not belong to them, the request is rejected.
9) The user can permanently delete a todo from the trash.
10) When a todo is permanently deleted, it is removed permanently and does not appear in trash.
11) Permanently deleting a todo also deletes its edit history.
12) After permanent deletion, the system does not provide edit history for that deleted todo.

### User Journey: Filter and sort personal todos during an active session

Users follow an end-to-end, multi-step user journey to filter and sort their personal todo list.

1) After login, the user can apply a completion-status filter to their normal todo list.
2) The system supports filtering by: all todos, only complete todos, and only incomplete todos.
3) After the user selects a filter option, the system updates the normal todo list to show only the matching todos.
4) The system supports sorting the normal todo list by creation date.
5) The system supports both directions for creation date sorting: newest first and oldest first.
6) The system supports sorting by start date.
7) The system supports both directions for start date sorting: earliest first and latest first.
8) Todos without a start date appear at the end when sorting by start date.
9) The system supports sorting by due date.
10) The system supports both directions for due date sorting: earliest first and latest first.
11) Todos without a due date appear at the end when sorting by due date.
12) Filtering and sorting apply only to the user’s own todos; other users’ todos remain inaccessible.