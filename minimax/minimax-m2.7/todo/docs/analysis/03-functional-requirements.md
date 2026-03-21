**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can register for a new account by providing an email address and a password. Registered users can log in to the system using their email and password credentials. Users can change their password to a new value while logged in. Each user has a profile that stores their display name. Users can update their display name at any time. Users can delete their own account, which permanently removes all their data including todos and trash. Users cannot view or access other users' profiles since this is a private todo application. The system enforces unique email addresses for each account to prevent duplicates.

### User Registration

## User Registration

Users can create a new account by providing their email address and a password. Both the email address and password are required during registration. The system validates that the provided email address is in a valid format. The system enforces that each email address can only be registered once across all users. If a user attempts to register with an email that already exists in the system, the registration is rejected.

### User Login

## User Login

Registered users can log in to the system by providing their email address and password. The system verifies that the email address and password combination matches an existing account. On successful verification, the user gains access to their account and can perform operations available to logged-in users. If the email address or password does not match an existing account, the login attempt is rejected.

### Password Change

## Password Change

Logged-in users can change their password to a new value. The user must provide their current password for verification before setting a new password. The new password must meet any password requirements established by the system. Upon successful change, the user's password is updated and the new password becomes effective immediately.

### Account Deletion

## Account Deletion

Users can permanently delete their own account while logged in. When an account is deleted, all associated data is permanently removed from the system. This includes all todos created by the user, all todos in the user's trash, and all edit history associated with those todos. Deleted accounts and their associated data cannot be recovered.

### Profile Display Name

## Profile Display Name

Each user has a profile that stores a display name. Users can view their own profile at any time. Users can update their display name to any value they choose. The display name change takes effect immediately and is visible on the user's profile.

### Profile Privacy

## Profile Privacy

Each user's profile is completely private and cannot be viewed by other users. Users cannot access, view, or retrieve any information about other users' profiles. This privacy applies regardless of any other relationship between users.

### Email Uniqueness Enforcement

## Email Uniqueness Enforcement

The system ensures that every registered email address is unique across the entire application. No two users can have the same email address. When a user registers or attempts to change their email, the system verifies that the email is not already in use by another account.

## Todo Operations

Users can create a new todo by providing a required title along with optional description, start date, and due date fields. Newly created todos have an incomplete status by default. Users can view a paginated list of their own todos, where each item displays the title, completion status, dates if set, and creation date. Users can view the full details of a single todo including the complete description text. Users can toggle a todo's completion status between complete and incomplete states. Users can edit any field of a todo including title, description, start date, and due date. Each edit to a todo automatically creates a record in the edit history. Users can soft-delete a todo, moving it to trash where it no longer appears in the normal list. Users can view a paginated list of their deleted todos in trash. Users can restore a deleted todo from trash back to the normal todo list. Users can permanently delete a todo from trash, which also removes its complete edit history. Users can filter their todo list by completion status to show all todos, only complete ones, or only incomplete ones. Users can sort their todo list by creation date, start date, or due date in either ascending or descending order. When sorting by start date or due date, todos without those dates appear at the end of the list.

### Todo Creation

## Todo Creation

Users can create a new todo by providing a title, which is required. The title must not be empty or blank. If the title is missing, the system rejects the creation request.

When creating a todo, users may optionally provide:
- A description explaining more details about the todo
- A start date indicating when work on the todo begins
- A due date indicating when the todo should be completed

The due date may be set independently or together with the start date. When both dates are provided, the due date must not be earlier than the start date.

A newly created todo is automatically set to an incomplete state and associated with the creating user. The creation date is recorded automatically.

### Todo Viewing

## Todo Viewing

### Todo List

Users can view a list containing only their own todos. The list is paginated, meaning users see a subset of their todos at a time and can navigate to additional pages.

Each item in the list displays the following information:
- The todo title
- The completion status indicating whether the todo is complete or incomplete
- The start date, shown only when a start date has been set
- The due date, shown only when a due date has been set
- The creation date

### Single Todo Details

Users can view the full details of a single todo they own. The detail view shows all fields including:
- The complete title
- The full description text (which may be empty if not provided)
- The start date (if set)
- The due date (if set)
- The completion status
- The creation date

### Todo Completion

## Todo Completion

Users can change the completion status of any todo they own. The completion status is a simple toggle between two states: complete and incomplete.

When a user marks a todo as complete, the system records that the todo is now complete. When a user marks a todo as incomplete, the system records that the todo is now incomplete.

Users can perform this action regardless of whether the todo has a start date or due date. Completing a todo does not affect other fields or the edit history.

### Todo Editing

## Todo Editing

Users can edit any editable field of a todo they own. The editable fields are:
- The title
- The description
- The start date
- The due date

Users may change any combination of fields in a single edit operation. Each edit operation records the current values of all fields at the time of the edit in the todo's edit history.

### Todo Deletion and Trash

## Todo Deletion and Trash

### Soft Deletion

Users can delete any todo they own. When a todo is deleted, it is not permanently removed from the system. Instead, it is moved to a trash state where it is no longer visible in the normal todo list. This is called a soft deletion.

### Viewing Trash

Users can view a list of their deleted todos, referred to as the trash. The trash list is paginated, allowing users to navigate through all their deleted todos.

### Todo Restoration

Users can restore a deleted todo from the trash. When restored, the todo returns to the normal todo list with all its original data intact, including its completion status and all edit history entries.

### Permanent Deletion

Users can permanently delete a todo from the trash. This action removes the todo and all its associated edit history from the system completely. Permanent deletion cannot be undone.

### Todo Filtering and Sorting

## Todo Filtering and Sorting

### Filtering by Completion Status

Users can filter their todo list to show only todos matching a specific completion status. The available filters are:
- All todos, showing both complete and incomplete items
- Only complete todos
- Only incomplete todos

### Sorting Options

Users can sort their todo list by one of the following criteria:
- Creation date, in either newest first or oldest first order
- Start date, in either earliest first or latest first order
- Due date, in either earliest first or latest first order

### Sorting Behavior for Missing Dates

When sorting by start date, todos that do not have a start date appear at the end of the list regardless of the sort order.

When sorting by due date, todos that do not have a due date appear at the end of the list regardless of the sort order.

### Todo Ownership Enforcement

## Todo Ownership Enforcement

Every todo in the system is owned by exactly one user. Users can only view, edit, complete, or delete todos that they own.

The system enforces ownership by ensuring that users never see other users' todos in their lists. When a user attempts to perform any operation on a todo, the system verifies that the todo belongs to the requesting user before allowing the operation to proceed.

## TodoEditHistory Operations

Every time a user edits a todo, the system automatically creates a history entry recording the change. Each history entry captures when the edit occurred and what the new values are for title, description, start date, and due date if those fields were changed. Fields that were not modified during an edit are recorded as null in the history entry. Users can view the complete edit history of any of their todos to see all past changes. History entries are displayed in reverse chronological order with the most recent edit appearing first. When a todo is permanently deleted from trash, the system also permanently deletes all associated history entries for that todo. Users can only view history for todos they own, maintaining privacy across the application.

### Automatic History Entry Creation

### Automatic History Entry Creation

Every time a user edits a todo, the system shall automatically create a new history entry to record that edit. This history creation happens as a direct result of the edit operation and does not require any additional action from the user. The system shall create exactly one history entry per edit operation, ensuring that all changes are captured chronologically.

### Recording Changed Fields

Each history entry shall record the new values of any fields that were modified during the edit. When a user changes the title of a todo, the history entry shall record what the title was changed to. When a user changes the description, the history entry shall record the new description value. When a user changes the start date or due date, the history entry shall record the new date values for those respective fields.

### Recording Unchanged Fields

For any field that was not modified during an edit, the history entry shall record a null value for that field. If a user edits only the title but leaves the description unchanged, the history entry shall record the new title value while recording null for the description. This approach allows users to distinguish between fields that were changed versus fields that remained the same.

### Timestamp Recording

Every history entry shall record the date and time when the edit was made. This timestamp shall reflect when the edit operation was completed and shall be stored as part of the history entry. The timestamp enables users to understand when each change occurred.

### Viewing Edit History

Users can view the complete edit history of any of their todos. When viewing the history, users shall see all history entries associated with that todo, displaying the timestamp of each edit along with the field values that were changed. Users shall be able to see both which fields were modified and what the new values are for those modified fields.

### History Entry Ordering

History entries shall be displayed in reverse chronological order, with the most recent edit appearing first. When a user views the edit history of a todo, the newest changes shall appear at the top of the list and older changes shall appear below. This ordering allows users to quickly see the most recent modifications to a todo.

### Cascading Deletion on Permanent Todo Deletion

When a user permanently deletes a todo from the trash, the system shall also permanently delete all associated history entries for that todo. This deletion is automatic and encompasses every history record that was created from previous edits. There shall be no remaining history entries after a todo is permanently deleted.

### Access Control for History

Users can only view the edit history of todos they own. The system shall restrict access so that users cannot view the edit history of any todo belonging to another user. This restriction ensures that the edit history remains private and is only accessible to the owner of the todo.

### History Entry Content

### History Entry Data Structure

Each history entry shall capture the following information from an edit operation:

- The timestamp indicating when the edit occurred
- The new title value if the title was changed, or null if the title was not changed
- The new description value if the description was changed, or null if the description was not changed
- The new start date value if the start date was changed, or null if the start date was not changed
- The new due date value if the due date was changed, or null if the due date was not changed

This structure allows users to reconstruct what changes were made during each edit by examining which fields contain values versus which contain null.

### Field Change Indication

The presence of a non-null value in a history entry field indicates that the corresponding todo field was modified during that edit. The presence of a null value indicates that the corresponding todo field was not modified during that edit. Users can therefore determine exactly which fields were changed by looking for non-null values in the history entry.

### Complete History Retrieval

When a user requests the edit history of a todo, the system shall return all history entries for that todo in the correct order. Each history entry shall include all recorded information for that edit, allowing the user to understand the full context of each modification.

### Viewing Edit History

### Viewing Todo Edit History

Users can view the complete edit history of any todo they own. To view the history, the user selects the specific todo whose history they want to see. The system shall display all history entries for that todo, showing each entry with its timestamp and the details of what was changed.

### History Entry Display Format

Each history entry displayed to the user shall include the timestamp of when the edit occurred and a list of all fields that were modified during that edit. Fields that were not modified shall not be shown in the display to avoid cluttering the view with unchanged information.

### Navigation Through History

Users can scroll through the history entries to see all past edits. The most recent edit shall appear first, allowing users to quickly see the latest changes. Older entries shall be shown in descending order of time, so users can follow the evolution of the todo from its creation through all subsequent modifications.

### History Entry Ordering

### History List Ordering

When a user views the edit history of a todo, the system shall sort the history entries so that the most recently created entry appears first in the list. The oldest entry shall appear last. This descending order by timestamp allows users to immediately see the most recent changes without needing to scroll through the entire history.

### Chronological Precision

The ordering shall be based on the timestamp recorded with each history entry at the time of edit. Edits that occurred later in time shall appear before edits that occurred earlier. If multiple edits occurred at exactly the same moment, the order of those edits shall be determined by the order in which the system processed them.

### Cascading History Deletion

### Permanent Deletion Cascade

When a user chooses to permanently delete a todo from the trash, the system shall identify all history entries associated with that todo and delete them along with the todo itself. This deletion shall be automatic and shall encompass every history entry regardless of how many edits were made to the todo.

### Confirmation of Complete Removal

After the permanent deletion operation completes, there shall be no remaining record of either the todo or its edit history in the system. The user shall not be able to recover any information about the todo or its previous edits after this operation is performed.

### Partial Deletion Prevention

The system shall not allow a todo to be permanently deleted while any of its history entries remain. The deletion operation shall be atomic, ensuring that both the todo and all its associated history entries are removed together or not at all.

### History Access Control

### Owner-Only History Access

The system shall ensure that users can only view the edit history of todos they own. When a user requests to view the history of a particular todo, the system shall verify that the requesting user is the owner of that todo before returning any history information.

### Unauthorized Access Prevention

If a user attempts to view the history of a todo they do not own, the system shall reject the request. The user shall not receive any information about the existence of the todo or its edit history. This restriction maintains complete privacy of user data across the application.

### Private History by Default

Edit history inherits the privacy of its parent todo. Since todos are private to their owners, all associated history entries are also private. There is no mechanism for sharing history access with other users.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Account creation requires both email and password to be provided; the system rejects sign-up attempts that omit either field. The email address must be unique across the system, and when a user attempts to register with an email that already exists, the system returns an error and prompts the user to either log in or use a different email. Account login fails when the provided email and password combination does not match any existing user, and the system informs the user that the credentials are invalid without revealing whether the email exists. Password change operations require the user to provide their current password along with the new password, and the operation fails if the current password is incorrect. When a user deletes their account, the system permanently removes the user record along with all their todos including items in the trash, and this deletion is irreversible. Attempts to access other users' profiles or data are rejected, as each user's information is completely private and isolated.

### Missing Credentials During Sign-Up

When a guest attempts to sign up without providing an email address, the system SHALL reject the request and display an error indicating that email is required.

When a guest attempts to sign up without providing a password, the system SHALL reject the request and display an error indicating that password is required.

When a guest attempts to sign up with neither email nor password provided, the system SHALL reject the request and display errors for both missing fields.

### Duplicate Email Registration

When a guest attempts to register with an email address that already exists in the system, the system SHALL reject the registration and inform the user that the email is already in use.

The system SHALL allow the user to either log in with the existing account or use a different email address to complete registration.

The error message SHALL NOT reveal whether any other account information is associated with the submitted email.

### Invalid Login Credentials

When a user attempts to log in with an email address that does not exist in the system, the system SHALL reject the login and display a generic error message indicating that the credentials are invalid.

When a user attempts to log in with an email that exists but with an incorrect password, the system SHALL reject the login and display the same generic error message used for non-existent accounts.

The system SHALL NOT indicate whether the failure was due to a non-existent email or an incorrect password.

### Incorrect Current Password on Change

When a user attempts to change their password without providing their current password, the system SHALL reject the request and display an error indicating that the current password is required.

When a user attempts to change their password with an incorrect current password, the system SHALL reject the request and display an error indicating that the current password is incorrect.

The system SHALL NOT update the password when the current password verification fails.

### Account Deletion Cascades to All User Data

When a user deletes their account, the system SHALL permanently remove the user record from the system.

When a user deletes their account, the system SHALL permanently delete all todos owned by that user, including those currently in the trash.

When a user deletes their account, the system SHALL permanently delete all edit history associated with the user's todos.

This deletion operation SHALL be irreversible and the user SHALL NOT be able to recover any of their data after account deletion.

### Unauthorized Access to Other Users

When a user attempts to view another user's profile, the system SHALL reject the request and display an error indicating that the profile does not exist or is not accessible.

When a user attempts to access another user's todos through any means, the system SHALL reject the request and indicate that the data is not accessible.

Users SHALL NOT be able to view, modify, or delete any data belonging to another user, regardless of the method or endpoint used to attempt access.

### Password Change Validation

When a user attempts to change their password, the system SHALL validate that the new password meets any required criteria.

The password change operation SHALL require the user to confirm their identity by providing the current password before the new password is accepted.

The new password SHALL replace the current password in the user's credentials, and subsequent login attempts SHALL require the new password.

### Email Uniqueness Enforcement

The system SHALL enforce uniqueness on email addresses across all user accounts.

When a new user registration is submitted, the system SHALL check whether the provided email address already exists in the system.

The system SHALL reject any registration attempt that uses an email address currently associated with another user account.

Email uniqueness SHALL be maintained regardless of case sensitivity or formatting variations.

## Todo Error Scenarios

Todo creation requires a title to be provided, and the system rejects any attempt to create a todo without one; description, start date, and due date are optional. When a user attempts to view a todo that does not exist or belongs to another user, the system returns an access denied error since each user's todos are private. Completing or uncompleting a todo that is already in the desired state is handled gracefully as the operation is idempotent. Editing a todo with identical values to the current state may or may not create a history entry depending on whether any actual change occurred. Soft-deleted todos do not appear in the normal todo list, and attempting to edit a deleted todo returns an error indicating the item is in trash. Empty todo lists and empty trash displays are handled as valid states with appropriate empty state messaging. Filtering by completion status with no matching results shows an empty list rather than an error. Sorting todos by start date places items without a start date at the end of the results, and similarly sorting by due date places items without a due date at the end.

### Todo Creation Validation Errors

### Missing Title on Todo Creation

When a user attempts to create a todo without providing a title, the system MUST reject the request and return an error message indicating that the title is required. The description, start date, and due date are optional fields and may be left empty without causing an error. The user must provide a valid title before the todo can be created.

### Accessing Nonexistent or Other Users Todos

When a user attempts to view, edit, complete, or delete a todo that does not exist in the system, the system MUST return an access denied error. Since each user's todos are completely private, attempting to access a todo that belongs to another user also results in an access denied error. The system does not reveal whether a todo does not exist or belongs to another user for security reasons.

### Idempotent Completion Toggling

When a user marks a todo as complete that is already in the complete state, the system MUST handle this gracefully without returning an error. Similarly, when a user marks a todo as incomplete that is already in the incomplete state, the system MUST handle this gracefully without returning an error. The operation is idempotent and the final state remains correct.

### Editing with No Actual Changes

When a user edits a todo but submits values identical to the current values for all fields, the system MAY choose whether to create a history entry. If any field value differs from the current value, the system MUST create a history entry recording the changed fields. Fields that remain unchanged SHOULD be recorded as null in the history entry to indicate no modification occurred for that field.

### Operations on Soft-Deleted Todos

When a user attempts to edit, complete, uncomplete, or view a todo that has been moved to the trash, the system MUST return an error indicating that the item is in the trash. Soft-deleted todos do not appear in the normal todo list and cannot be modified until they are restored. Users must restore a deleted todo from the trash before they can perform any operations on it.

### Empty Todo List Display

When a user views their todo list and has not created any todos, the system MUST display an appropriate empty state message indicating that no todos exist. This is a valid state and not an error condition. The empty state message should guide users on how to create their first todo.

### Filtering with No Matching Results

When a user applies a filter to their todo list (such as showing only complete todos or only incomplete todos) but no todos match the filter criteria, the system MUST display an empty list rather than an error. The empty filtered results are a valid outcome and should be communicated with an appropriate message.

### Sorting Todos with Null Dates

When a user sorts their todo list by start date and some todos do not have a start date set, those todos without a start date MUST appear at the end of the results regardless of sort direction. Similarly, when sorting by due date, todos without a due date MUST appear at the end of the results regardless of sort direction. This ensures that todos with actual dates are prioritized in the sorted order.

### Soft-Delete Visibility Rules

### Soft-Delete Visibility Rules

Deleted todos are not visible in the normal todo list. Users must access the trash to view their soft-deleted todos. Any direct attempt to access a deleted todo through standard operations returns an error indicating the item is in trash.

### Trash Operations

Users can view a paginated list of their deleted todos in the trash. From the trash, users can restore a deleted todo, which returns it to the normal todo list. Users can also permanently delete a todo from the trash, which removes both the todo and all its edit history from the system.

### Date-Based Sorting Rules

### Start Date Sort Behavior

When sorting by start date in ascending order (earliest first), todos with a start date are sorted from the earliest date to the latest. Todos without a start date are placed at the end of the results. When sorting by start date in descending order (latest first), todos with a start date are sorted from the latest date to the earliest, with todos without a start date still placed at the end.

### Due Date Sort Behavior

When sorting by due date in ascending order (earliest first), todos with a due date are sorted from the earliest date to the latest. Todos without a due date are placed at the end of the results. When sorting by due date in descending order (latest first), todos with a due date are sorted from the latest date to the earliest, with todos without a due date still placed at the end.

### Creation Date Sort Behavior

When sorting by creation date, todos are ordered chronologically. For newest first sorting, the most recently created todos appear at the top. For oldest first sorting, the earliest created todos appear at the top. Todos without a creation date do not exist as this field is automatically set upon creation.

## TodoEditHistory Error Scenarios

Viewing the edit history of a todo that does not exist or does not belong to the current user returns an access denied error. Each history entry records only the fields that were actually changed during that edit, leaving unchanged fields as empty rather than duplicating current values. History entries are sorted from most recent to oldest, and when a todo is permanently deleted, its entire edit history is also permanently deleted. Attempting to view history for a todo that has been moved to trash returns an error since only active todos have viewable histories. When there are no edits recorded for a todo, the history view displays an empty list rather than an error. The history system captures the state of all editable fields after each modification, including title, description, start date, and due date, but does not track completion status changes.

### Viewing History of Nonexistent Todos

## Access Control for Edit History

Users can only view the edit history of todos that belong to them.

When a user requests to view the edit history of a todo that does not exist in the system, the system shall reject the request and return an access denied error.

When a user requests to view the edit history of a todo that belongs to another user, the system shall reject the request and return an access denied error.

The system shall not reveal whether a todo exists if the requesting user does not own it.

### Viewing History of Other Users Todos

## Access Control for Edit History

Users can only view the edit history of todos that belong to them.

When a user requests to view the edit history of a todo that does not exist in the system, the system shall reject the request and return an access denied error.

When a user requests to view the edit history of a todo that belongs to another user, the system shall reject the request and return an access denied error.

The system shall not reveal whether a todo exists if the requesting user does not own it.

### History Records Only Changed Fields

## Field-Level Change Tracking

Each edit history entry records only the fields that were actually changed during that specific edit operation.

When a todo title is changed during an edit, the history entry shall record the new title value.

When a todo description is changed during an edit, the history entry shall record the new description value.

When a todo start date is changed during an edit, the history entry shall record the new start date value.

When a todo due date is changed during an edit, the history entry shall record the new due date value.

When a field is not modified during an edit, the history entry shall leave that field empty rather than duplicating the current field value.

The completion status of a todo is not tracked in the edit history.

### History Ordering Most Recent First

## History Entry Display Order

When a user views the edit history of their todo, the system shall display history entries sorted from most recent to oldest.

The most recent edit shall appear first in the list.

The oldest edit shall appear last in the list.

Users can scroll through the history to see all past edits in chronological reverse order.

### History Deletion with Permanent Todo Deletion

## Cascading Deletion of Edit History

When a user permanently deletes a todo from their trash, the system shall permanently delete all associated edit history entries.

There is no intermediate or recoverable state for edit history after permanent deletion.

The system shall not allow restoration of individual history entries without restoring the entire todo.

### History of Trashed Todos

## Edit History for Soft-Deleted Todos

Edit history is only available for active todos that appear in the normal todo list.

When a user requests to view the edit history of a todo that has been moved to trash, the system shall return an error indicating that the history is not available.

Users can still view edit history after restoring a todo from trash, as the todo returns to active status.

### Empty History Display

## Empty Edit History

When a user views the edit history of a todo that has never been edited, the system shall display an empty list of history entries.

The system shall not return an error when a todo has no edit history.

An empty history view clearly communicates that no edits have been recorded for that todo.

### Editable Fields Tracked in History

## Tracked Editable Fields

The edit history system captures the state of all editable fields after each modification.

The title field is tracked in edit history when changed.

The description field is tracked in edit history when changed.

The start date field is tracked in edit history when changed.

The due date field is tracked in edit history when changed.

The completion status field is not tracked in edit history; marking a todo complete or incomplete does not create a history entry.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Journey: Sign-Up to Active Management

This scenario follows a complete lifecycle from account creation to active todo management.

#### Sign-Up and First Todo

A new user visits the application and signs up by providing an email address and password. The system validates the email format and ensures the password meets minimum requirements. Upon successful registration, the user automatically logs in and is presented with an empty todo list.

The user creates their first todo with a title of "Morning Routine" and adds a description detailing specific tasks. They leave the start date empty but set a due date for the following week. The system creates the todo and displays it in the list as incomplete.

#### Managing Todos Over Time

Over several days, the user returns to the application. They create additional todos for work projects and personal errands. Each morning, they mark "Morning Routine" as complete after finishing their tasks. Later, they realize they forgot to include an item, so they edit the description of "Morning Routine" to add the missing task while keeping the todo marked as complete.

The user explores the todo list, applying different filters to view only incomplete items. They sort by due date to prioritize urgent tasks. When a work project is finished, they mark it as complete.

#### Account Deletion

After several months of use, the user decides to delete their account. They navigate to their account settings and initiate the deletion process. The system confirms the action and warns that all todos and edit history will be permanently removed. Upon confirmation, the system deletes the user account along with all associated todos and edit history entries. The user is returned to the public homepage.

### Todo Lifecycle with Edit History Tracking

This scenario traces the complete editing and history tracking workflow.

#### Creating a Todo with Incomplete Information

A user creates a todo titled "Conference Presentation" but leaves the description empty and sets no dates yet. The system accepts this and creates the todo with the required title and all optional fields empty.

#### Iterative Editing Sessions

The user returns later to fill in details. They add a description with talking points and set a start date for when they will begin preparing. The system records this first edit in the todo's edit history, capturing the description and start date values.

The next day, the user realizes the presentation date has been pushed back. They update the due date. The system records another history entry showing the new due date value.

A week later, the user refines their talking points and updates the description again. They also add an attachment reference to the description. The system records this third edit in the history.

#### Reviewing Edit History

The user wants to understand how the todo evolved. They navigate to the edit history view. The system displays entries sorted from most recent to oldest, showing all three edits with their respective timestamps and the values that were set at each edit.

#### Final Revisions and Completion

On the day before the presentation, the user makes one final edit to update the talking points. The system records this as the fourth history entry. The user then marks the todo as complete.

#### Soft Delete and History Removal

After the conference, the user deletes the todo. The system moves it to trash, and the todo disappears from the active list. The edit history remains attached to the soft-deleted todo.

When the user permanently deletes the todo from trash, the system removes both the todo and all four edit history entries together.

### Soft Delete and Trash Recovery Workflow

This scenario follows the soft delete and recovery workflow.

#### Organizing with Deletion

A user has accumulated many completed todos over time. They review their list and identify three todos that are no longer needed: an old grocery list, a completed reading goal, and a finished appointment reminder. The user deletes all three todos one by one. Each deletion moves the todo to trash rather than removing it permanently.

#### Trash Management

The user navigates to the trash view. The three deleted todos appear in the list with their original titles, completion status, and deletion timestamps. The user can see what was deleted without losing it permanently.

#### Recovery Decision

After reviewing the trash, the user decides to restore the reading goal todo since they want to track reading for the next quarter. They select the restore action, and the todo returns to the active list in its original complete state.

#### Permanent Cleanup

The user permanently deletes the grocery list and appointment reminder from trash. They confirm each permanent deletion when prompted. The system removes these todos and their associated edit history permanently. These items can no longer be recovered.

#### Filtering After Restoration

With the reading goal restored, the user applies a filter to show only complete todos. The restored todo appears alongside other complete todos. The user can now work with this todo normally, including editing it or moving it back to trash if needed.