**multiUserTodoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address and password. Once registered, users log in to the application using their email and password credentials. Users have the ability to change their password to maintain security. Users can view and edit their display name in their profile settings. Users have the option to delete their entire account, which permanently removes all their todos including any items currently in trash. Users cannot view or access other users' profiles as this is a private todo application. Each user's account is independent and their data remains completely private. The system enforces that all todos belong exclusively to the account owner with no sharing capabilities. Password changes require the user to authenticate their identity before updating credentials. Account deletion is irreversible and affects all user data across all views. Users must be authenticated to perform any of these operations. The application maintains separate accounts for each user with no visibility between them.

### User Registration

Users can create a new account by providing an email address and password.

The email address must be unique across all registered users.
If a user attempts to register with an email that already exists, the registration request is rejected.

The password must be provided during registration and is stored securely by the system.
Users cannot register without providing both an email and a password.

Upon successful registration, the user's account is immediately active and the user is logged in.
A user cannot register if they already have an active account.

### User Login

Registered users can log in to the application using their email and password credentials.

The system validates the provided credentials against the registered account.
If the email is not found or the password is incorrect, the login request is rejected.

Users can remain logged in across multiple sessions until they explicitly log out or their account is deleted.
Logged-out users cannot perform any authenticated operations.

### Password Change

Logged-in users can change their account password.

To change the password, users must first provide their current password to verify their identity.
The system validates the current password before allowing the new password to be set.

If the current password is incorrect, the password change request is rejected.
Users cannot change their password without verifying their current password.

Once the new password is set, users must use the new password for subsequent logins.
Old passwords cannot be used after a password change.

### Profile Display Name Management

Each user has a profile that includes a display name that identifies them to the system.

Users can view their own display name in their profile settings.
Users can edit their display name by providing a new name.

The display name can be updated at any time by the account owner.
There is no validation requirement for the display name beyond being provided.

### User Account Deletion

Users can permanently delete their own account.

Account deletion requires explicit confirmation from the user.
The deletion process removes all user data from the system.

When an account is deleted, all of the user's todos are permanently removed, including any todos in the trash.
The edit history associated with all deleted todos is also permanently removed.

Account deletion is irreversible. Once deleted, the account and all associated data cannot be recovered.
After account deletion, the email used for registration becomes available for new account registration.
Users must be logged in to initiate account deletion.

### Private User Data Isolation

Each user's data is completely isolated from other users in the system.

Users can only view, access, and modify their own todos. There is no ability to view another user's todos.
Users cannot share or transfer their todos to other users.

Users cannot view other users' profiles. Profile information is private and visible only to the account owner.
Cross-user data access is not supported and all requests are rejected.

All operations performed by users are automatically associated with their account. There is no way to perform operations on behalf of another user.

### Authenticated Operation Requirements

All user operations require the user to be logged in.

Guest users cannot create accounts, view any todos, or perform any operations within the application.
Authenticated users must provide valid credentials to maintain their session.

User identity is maintained throughout the session. All operations are automatically attributed to the logged-in user.
Operations that require ownership verification are automatically enforced based on the logged-in user's account.

## Todo Operations

Users can create a todo item with a required title and optional description, start date, and due date. Newly created todos start in an incomplete state by default. Users can view a paginated list of their own todos showing title, completion status, start date, due date, and creation date. Users can view individual todo details including the full description text. Users can toggle a todo between complete and incomplete states. Users can edit their todo's title, description, start date, and due date fields. Every time a todo is edited, the system records the change in edit history. Users can delete their own todos which moves them to the trash instead of permanent deletion. Deleted todos no longer appear in the normal todo list view. Users can view a separate paginated list of todos in the trash. Users can restore a todo from trash back to the normal todo list. Users can permanently delete a todo from the trash which also removes its edit history. Users can filter their todo list by completion status showing all, only complete, or only incomplete todos. Users can sort their todo list by creation date, start date, or due date with newest first or earliest first options. Todos without dates appear at the end when sorting by those date fields. All todo operations are restricted to the owner's own data with no cross-user visibility.

### Todo Creation

Users can create a todo with a title (required) and an optional description. A start date and due date may be set, or left empty. Newly created todos are incomplete by default.

If the title is missing when creating a todo, the request is rejected.

A todo is automatically associated with the creating user and cannot be viewed by other users.

### Todo List Viewing

Users can view a paginated list of their own todos. Each todo in the list shows: title, completion status, start date (if set), due date (if set), and creation date.

The list is paginated to allow efficient browsing of large numbers of todos.

### Individual Todo Viewing

Users can view a single todo to see all its details including the full description.

Users can only view their own todos; todos created by other users are not accessible.

### Todo Completion Toggle

Users can mark a todo as complete or incomplete. This is a simple toggle between two states.

A complete todo can be marked as incomplete, and an incomplete todo can be marked as complete.

Completion status is tracked and displayed in todo lists.

### Todo Editing

Users can edit their todo's title, description, start date, and due date.

Users can modify any combination of these fields when editing a todo.

Every edit is recorded in the todo's edit history.

### Edit History Recording

Each todo has an edit history that records every modification.

Each history entry records:
- When the edit was made
- What the title was changed to (if changed)
- What the description was changed to (if changed)
- What the start date was changed to (if changed)
- What the due date was changed to (if changed)

Users can view the full edit history of any of their todos.
History entries are sorted from most recent to oldest.

### Todo Deletion

Users can delete their own todos. Deleted todos are moved to the trash instead of being permanently removed.

Deleted todos no longer appear in the normal todo list view.

Users can only delete their own todos; todos owned by other users are not deletable by other users.

### Trash Viewing

Users can view a list of their deleted todos (trash). The trash list is paginated.

The trash view shows todos that have been deleted but not permanently removed.

Users can only see their own deleted todos; other users' deleted todos are not accessible.

### Trash Restoration

Users can restore a deleted todo from the trash. Restored todos return to the normal todo list.

Once restored, the todo is treated as a normal todo and continues to accumulate edit history.

Users can only restore their own deleted todos.

### Trash Permanent Deletion

Users can permanently delete a todo from the trash.

Permanently deleting a todo also deletes its edit history.

Once permanently deleted, a todo cannot be recovered.

Users can only permanently delete their own todos from the trash.

### Todo Filtering

Users can filter their todo list by completion status. Available filter options are:
- All todos
- Only complete todos
- Only incomplete todos

When filtered, the list shows only todos matching the selected completion status.

### Todo Sorting

Users can sort their todo list by:
- Creation date (newest first or oldest first)
- Start date (earliest first or latest first)
- Due date (earliest first or latest first)

Todos without a start date appear at the end when sorting by start date.
Todos without a due date appear at the end when sorting by due date.

## EditHistoryEntry Operations

Every time a user edits a todo, the system automatically creates an edit history entry recording the change. Each history entry captures the timestamp when the edit was made. History entries record what the title changed to if the title was modified. History entries record what the description changed to if the description was modified. History entries record what the start date changed to if the start date was modified. History entries record what the due date changed to if the due date was modified. Users can view the complete edit history for any of their todos. History entries are displayed from most recent to oldest in chronological order. When a todo is permanently deleted from trash, its entire edit history is also deleted. Users can only view edit history for todos they own. The system maintains a complete audit trail of all todo modifications. Edit history provides visibility into how todos have changed over time. Each history entry preserves the state of modified fields at the time of editing. Users benefit from understanding the evolution of their todo items through edit records.

### Automatic Edit History Creation

The system automatically creates an edit history entry every time a user modifies a todo. This occurs when the user edits any of the following fields: title, description, start date, or due date. The edit history entry is created immediately at the time the modification is saved. Users do not need to manually trigger history creation—this process happens automatically with each todo modification.

Every modification to a todo creates its own separate history entry. If a user makes multiple changes to the same todo, each change generates a distinct history entry. This ensures a complete record of all modifications made to the todo over time.

### Edit Timestamp Recording

Each edit history entry records the exact date and time when the modification was made. The timestamp captures both the date and the time of the edit event. This modification date and time recording is automatic and cannot be overridden or modified by users.

The timestamp serves as the primary chronological marker for organizing history entries. It enables users to track when changes occurred and understand the timeline of todo evolution.

### Field Change Tracking

Edit history entries capture details about what changed during each modification. When the user updates the title, the history entry records the new title value that was set. When the user updates the description, the history entry records the new description value that was set. When the user updates the start date, the history entry records the new start date that was set. When the user updates the due date, the history entry records the new due date that was set.

Each history entry only records the fields that were actually modified in that edit. Fields that were not changed during a particular edit are not included in that history entry. This provides clear visibility into exactly what changed during each modification event.

### Complete Edit History Viewing

Users can view the complete edit history for any todo they own. The complete edit history includes all history entries from the moment the todo was first created to the most recent modification. This provides a full audit trail of every change made to the todo throughout its lifetime.

Each history entry displays the modification date and time along with the specific fields that were changed and their new values. Users can review this history to understand the complete evolution of their todo item over time.

### History Entry Sorting and Ordering

Edit history entries are displayed in chronological order from newest to oldest. The most recent modification appears first in the list, followed by progressively older modifications. This newest-to-oldest ordering helps users quickly see the most recent changes without scrolling through the entire history.

The chronological ordering is based on the modification date and time recorded for each entry. This ensures consistent and predictable presentation of the edit history to users.

### Edit History Access and Deletion

Users can only view edit history for todos they own. There is no way to access, view, or browse the edit history of another user's todo. This owner-only edit history access ensures privacy and prevents users from seeing modifications made to other people's items.

When a todo is permanently deleted from trash, its entire edit history is also permanently deleted. This includes all history entries associated with that todo. Once a todo is permanently deleted, the edit history cannot be recovered or accessed. This complete deletion ensures that no record of the todo's modifications remains in the system after permanent deletion.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email address that is already registered receive an error and cannot complete registration. Login attempts fail when users provide incorrect email or password credentials. The system requires users to verify their current password when changing it, rejecting requests where the current password is wrong. Users can only delete their own account, and deletion permanently removes all todos including those in trash with no recovery option. Users cannot view other users' profiles since the application is designed as a private todo app. Attempting to access another user's data results in access denied errors that enforce privacy boundaries. Profile updates fail when display name is empty or contains only whitespace characters. Account deletion requires explicit user confirmation to prevent accidental loss of data. The system validates email format during registration and login processes. Users who delete their account lose all associated data immediately without any grace period or recovery mechanism.

### Account Registration Conflicts

Users attempting to register with an email address that is already in the system receive an error message and are prevented from completing the registration.
The registration process requires a unique email address for each account.
Duplicate registration attempts are rejected with a clear indication that the email is already in use.

### Login Authentication Failures

Users who provide incorrect email or password credentials during login are denied access to the system.
The login attempt fails silently, showing a generic authentication failure message without revealing whether the email or password was incorrect.
Invalid login attempts do not create error states that persist across sessions.

### Password Change Validation

Users changing their password must provide their current password for verification.
If the current password provided does not match the user's existing password, the change is rejected.
New password entries must meet minimum length and complexity requirements defined by the system.
Password changes require both the new password and confirmation password to match exactly.
If the new password matches the current password, the change is rejected to prevent no actual change.

### Profile Update Restrictions

Users cannot update their display name to an empty value or a value containing only whitespace.
Profile update attempts with blank or whitespace-only display names are rejected with an error message.
Users can only view and edit their own profile; attempts to access another user's profile are blocked.
Display name changes are immediately reflected in the user's profile and all associated todo entries.

### Account Deletion Confirmation

Users must provide explicit confirmation before their account can be deleted.
Account deletion requires a deliberate action, such as checking a confirmation checkbox or typing the account email.
The confirmation requirement prevents accidental account deletion.
Without explicit confirmation, the account deletion request is not processed.

### Account Ownership Verification

Users can only delete their own account; attempting to delete another user's account is rejected.
The system verifies account ownership before processing any account deletion request.
Users who are not the account owner receive an unauthorized access error when attempting deletion.

### Unauthorized Access Prevention

Users cannot access another user's profile, todos, or any other data belonging to another account.
Any attempt to access unauthorized data results in an access denied error.
The system enforces strict privacy boundaries to prevent cross-user data visibility.

### Permanent Account Deletion Consequences

Account deletion permanently removes all user data including todos and edit history.
Deleted data cannot be recovered after account deletion.
Both active todos and todos in trash are permanently removed upon account deletion.
Edit history entries associated with the deleted account are also permanently removed.

### Email Format Validation

During registration, the system validates the email format before processing the registration.
Invalid email formats are rejected with a clear error message indicating the format is incorrect.
During login, the system validates the email format provided by the user.
Email validation follows standard email format rules (local-part@domain format).

## Todo Error Scenarios

Creating a todo without providing a title is rejected because the title is a required field. Users can only view, edit, or modify todos that belong to their own account. Marking a todo as complete or incomplete requires the todo to exist in the user's list. Deleted todos are soft-deleted and removed from the normal todo list but remain accessible in the trash section. Users can restore any deleted todo from trash back to the normal todo list. Permanently deleting a todo from trash also removes all associated edit history for that todo. Filtering by completion status works with valid options but rejects invalid filter values. Sorting by creation date, start date, or due date respects the rule that todos without dates appear at the end. Attempting to access a non-existent todo results in an access denied error. Users cannot share or export another user's todos since privacy is enforced throughout the system. Todos without start dates or due dates sort to the end when using those sort options. Soft deletion hides todos from normal view while permanently deleting removes them from trash entirely.

### Todo Creation Validation

Users can create a todo only by providing a title. The title field is required and cannot be empty or contain only whitespace characters. If a user attempts to create a todo without a title, the system rejects the request and does not create the todo. Users receive an error message indicating that a title is required before they can proceed with todo creation.

### Non-Existent Todo Operations

Users can only edit todos that exist in their todo list. If a user attempts to edit a todo that does not exist, the system rejects the request. Users can only mark todos as complete or incomplete if those todos exist in their list. Attempting to mark a non-existent todo as complete or incomplete is rejected by the system. Before any todo operation, the system validates that the todo exists in the user's account.

### Privacy and Ownership Enforcement

Users can only view, edit, or delete todos that belong to their own account. Users cannot access, view, or modify another user's todos under any circumstances. The system verifies ownership for every todo operation by checking that the todo is associated with the current user's account. Privacy boundaries are strictly enforced throughout all todo interactions. There is no mechanism for users to share, access, or view another user's todos.

### Permanent Deletion Consequences

When a user permanently deletes a todo from the trash, all associated edit history for that todo is also permanently deleted. Once a todo has been permanently deleted from the trash, it cannot be restored or recovered. Users can only restore todos from the trash if they have not been permanently deleted. After permanent deletion, no record of the todo or its edit history remains accessible to the user.

### Trash Management Rules

Users can permanently delete todos from the trash section. When a todo is permanently deleted from the trash, all associated data including edit history is removed from the system. Soft-deleted todos are hidden from the normal todo list but remain visible and accessible in the trash section. Users can view the complete trash list separately from their normal todo list.

### Invalid Filter Handling

Users can filter their todo list by completion status using valid options only: all todos, complete todos, or incomplete todos. If a user attempts to apply an invalid filter option that is not one of the three valid choices, the system rejects the filter request. The system does not accept or apply any filter values outside of the predefined completion status options.

### Invalid Sort Handling

Users can sort their todo list by creation date, start date, or due date using valid sort options only. If a user attempts to apply an invalid sort option that is not one of the supported sorting criteria, the system rejects the sort request. The system does not accept or apply any sort values outside of the predefined sorting options.

### Sorting with Missing Dates

When sorting by start date, todos without a start date are automatically placed at the end of the sorted list, after all todos that have a start date. When sorting by due date, todos without a due date are automatically placed at the end of the sorted list, after all todos that have a due date. This sorting behavior applies regardless of whether the user selects ascending or descending order.

### Soft Delete Visibility

When a todo is soft-deleted by the user, it is immediately hidden from the normal todo list and no longer appears in the standard view. Soft-deleted todos remain visible and accessible only in the trash section. Users can restore a soft-deleted todo from the trash to bring it back to the normal todo list. Once restored, the todo becomes visible in the normal todo list again.

## EditHistoryEntry Error Scenarios

Each todo maintains an edit history that records every change made to its fields. Users can view the full edit history of any todo that they own. Edit history entries are sorted from most recent to oldest by default. When a todo is permanently deleted from trash, its entire edit history is also permanently removed. New todos without any edits have an empty edit history that users can view without errors. Accessing edit history for another user's todo is blocked by privacy restrictions. Attempting to view edit history for a non-existent todo results in an error. Edit history cannot be restored or recovered once the parent todo is permanently deleted. Large edit histories may be paginated to ensure performance and usability. Users attempting to modify edit history directly cannot do so as it is automatically generated. Edit history deletion is tied to the todo's deletion lifecycle and cannot be managed independently. The system preserves edit history as long as the todo exists in the user's normal list or trash.

### Edit History Viewing

Users can view the edit history of any todo that they own. The system verifies that the user requesting to view the edit history is the same user who owns the todo before displaying any history entries. Users cannot view the edit history of todos owned by other users; this access is blocked by privacy restrictions. Attempting to view edit history for a todo that no longer exists results in an error message.

Users viewing edit history without ownership of the todo receive an access denied response. The system checks ownership before returning any history data. If the todo referenced does not exist in the system, viewing the edit history fails with an appropriate error.

### New Todo Edit History

New todos that have not been modified yet have an empty edit history. Users can view the edit history of a newly created todo without errors; the system simply returns an empty list. This empty state is normal and does not indicate a system problem. The edit history will only contain entries once the todo has been edited at least once.

### Edit History Automatic Generation

Edit history entries are automatically created every time a todo is modified. Users cannot manually add, edit, or delete edit history entries. The system generates each history entry internally when changes are made to a todo's title, description, start date, or due date. Manual modification of edit history is not permitted to preserve the integrity of the audit trail.

### Edit History Sorting

Edit history entries are sorted from most recent to oldest by default. When users view the edit history, the latest changes appear first in the list. This sorting helps users quickly identify the most recent modifications made to their todos.

### Edit History Deletion

When a todo is permanently deleted from trash, its entire edit history is also permanently removed. The deletion of edit history is automatically triggered by the permanent deletion of the parent todo. Edit history cannot be deleted independently of the todo; its lifecycle is tied to the todo's existence. Once a todo and its history are permanently deleted, they cannot be restored or recovered.

### Edit History Pagination

Large edit histories may be paginated to ensure performance and usability. When a todo has many edit history entries, the system displays them in pages rather than all at once. This allows users to navigate through the history efficiently without performance degradation.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Registration and Login Journey

A new user begins their journey by creating an account with an email address and password. After successful registration, the user can immediately log in with those credentials. Upon first login, the user sets their display name which identifies them within the todo list. The user then creates their first todo with a title and optional details. This initial journey establishes the user's presence in the system and their ability to begin managing tasks.

THE USER SHALL provide an email address and password when creating an account.

THE USER SHALL be able to log in using their registered email and password after account creation.

WHERE the user logs in for the first time, THE USER SHALL set a display name that identifies them within the todo list.

AFTER the user has a display name set, THE USER SHALL be able to create their first todo with a title.

THE SYSTEM SHALL prevent account creation if the email address is already registered by another user.

### Todo Creation and Management Journey

A user manages todos through a complete lifecycle from creation to completion. The user creates a todo with a title and optional description, start date, and due date. The todo is initially incomplete. The user can then view the todo in their list, mark it as complete when finished, and view it again with updated completion status. The user can also edit the todo's title, description, or dates at any time before completion.

THE USER SHALL create a todo with a required title and optional description, start date, and due date.

NEW TODOS SHALL be created in an incomplete state by default.

THE USER SHALL view a paginated list of their todos showing title, completion status, dates, and creation date.

THE USER SHALL be able to mark a todo as complete when the task is finished.

THE USER SHALL be able to mark a completed todo as incomplete if the work needs to continue.

THE USER SHALL be able to edit a todo's title, description, start date, and due date at any time.

EVERY EDIT SHALL be recorded in the todo's edit history with the timestamp and changed fields.

### Todo Editing and History Tracking Journey

When a user edits a todo, the system automatically tracks all changes in edit history. The user can view the complete history showing when edits were made, what fields were changed, and the new values. This history provides transparency into the todo's evolution over time. The user can view the history alongside the current todo details to understand how requirements or dates have changed.

THE SYSTEM SHALL automatically create an edit history entry whenever a todo is modified.

EACH EDIT HISTORY ENTRY SHALL record the timestamp of when the edit was made.

EACH EDIT HISTORY ENTRY SHALL record what fields were changed and their new values.

THE USER SHALL view the complete edit history for any of their todos.

EDIT HISTORY ENTRIES SHALL be sorted from most recent to oldest.

THE USER SHALL be able to view current todo details and edit history together.

### Todo Deletion and Trash Recovery Journey

Users manage their todo lifecycle through deletion and recovery. When a user deletes a todo, it is not permanently removed but moved to trash where it no longer appears in the normal list. The user can view all deleted todos in the trash, restore any to the normal list, or permanently delete them. Permanent deletion also removes the todo's edit history. This two-phase approach protects against accidental deletions while allowing eventual cleanup.

THE USER SHALL delete their own todos which moves them to trash.

DELETED TODOS SHALL no longer appear in the normal todo list.

THE USER SHALL view a paginated list of deleted todos in trash.

THE USER SHALL be able to restore a deleted todo from trash back to the normal list.

THE USER SHALL be able to permanently delete a todo from trash.

PERMANENT DELETION SHALL also delete all edit history associated with the todo.

WHEN the user permanently deletes a todo, THE SYSTEM SHALL not allow recovery.

### Multi-Step Filtering and Sorting Workflow

Users refine their todo view through filtering and sorting to focus on specific tasks. Users can filter by completion status to see all todos, only complete ones, or only incomplete ones. Users can sort by creation date, start date, or due date in ascending or descending order. When sorting by date fields, todos without those dates appear at the end. Users can combine filtering and sorting to get exactly the view they need.

THE USER SHALL filter their todo list by completion status: all todos, only complete todos, or only incomplete todos.

THE USER SHALL sort their todo list by creation date, start date, or due date.

SORTING BY DATE SHALL support earliest first or latest first ordering.

WHEN sorting by start date or due date, TODOS WITHOUT THOSE DATES SHALL appear at the end.

THE USER SHALL be able to apply filters and sorting simultaneously.

THE SYSTEM SHALL return paginated results after applying filters and sorting.

### Complete End-to-End User Journey

A complete user journey spans registration through active todo management. A new user registers, logs in, sets their display name, creates their first todo, edits it to update details, marks it complete when done, and views it in their filtered list. Along the way, the system tracks all edits, and the user can recover any deleted todos from trash if needed. This end-to-end journey demonstrates all major features working together.

THE SYSTEM SHALL support a complete user journey from account creation through active todo management.

THE USER SHALL experience seamless transitions between registration, login, and todo creation.

ALL EDIT HISTORY SHALL be maintained throughout the todo's lifecycle.

THE USER SHALL be able to recover deleted todos within the trash.

PERMANENT DELETION SHALL be irreversible for both todos and their edit history.

THE SYSTEM SHALL maintain privacy ensuring users only see their own todos throughout the journey.