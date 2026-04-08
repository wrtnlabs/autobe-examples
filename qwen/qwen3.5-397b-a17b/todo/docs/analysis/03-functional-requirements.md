**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address and password during sign up. Users log in to the application using their registered email and password credentials. Once authenticated, users can change their password to maintain account security. Users can edit their display name which appears on their profile. Each user has a private profile that cannot be viewed by other users in the system. Users can delete their entire account, which permanently removes all their todos including those in the trash. Account deletion is irreversible and removes all associated data. Users cannot access or view other users' profiles or todos as the application maintains complete privacy between users. All user operations are scoped to the individual user's own data only.

### User Account Sign Up

WHEN a prospective user provides an email address and password, THE system SHALL create a new user account.

The email address serves as the unique identifier for the account.
The password is used for authentication during login.
Upon successful registration, the user account is created and ready for use.

### User Login

WHEN a registered user provides their email address and password, THE system SHALL authenticate the user and grant access to the application.

Upon successful authentication, the user gains access to perform todo operations.
The user can access their private todo data after successful login.

### Password Change Operation

WHEN an authenticated user requests a password change, THE system SHALL update the user's password.

The password change operation requires the user to provide their current password for verification.
Upon successful verification, the new password replaces the old password.
Password changes do not affect the user's existing todos or profile data.

### Display Name Edit

WHEN an authenticated user requests to edit their display name, THE system SHALL update the display name on the user's profile.

The display name is optional and can be updated at any time by the authenticated user.
The display name edit operation replaces the existing display name with the new value.
Each user maintains a private profile that stores their display name.

### Account Deletion with All Todos

WHEN a user requests account deletion, THE system SHALL permanently remove the user account and all associated data.

Account deletion permanently removes all todos owned by the user, including todos in the trash.
Account deletion permanently removes all edit history associated with the user's todos.
Account deletion permanently removes the user's profile information including display name.
Account deletion is irreversible and cannot be undone.
Once an account is deleted, the email address becomes available for new registration.

## Todo Operations

Users can create a new todo with a required title and optional description, start date, and due date. Newly created todos are marked as incomplete by default. Users can view a paginated list of their own todos showing title, completion status, start date if set, due date if set, and creation date. Users can view a single todo to see all details including the full description. Users can toggle a todo between complete and incomplete states. Users can edit their todo's title, description, start date, and due date at any time. Users can delete their own todos which moves them to trash rather than permanent removal. Deleted todos no longer appear in the normal todo list but can be viewed in the trash list. Users can restore a deleted todo from trash to return it to the normal todo list. Users can permanently delete a todo from trash which removes it completely. Users can filter their todo list by completion status showing all, only complete, or only incomplete todos. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without a start date or due date appear at the end when sorting by those fields. Each user can only see and access their own todos with no ability to view other users' todos.

### Todo Creation

Users can create a new todo with a title. Users can optionally provide a description when creating a todo. Users can optionally set a start date when creating a todo. Users can optionally set a due date when creating a todo. Newly created todos are marked as incomplete by default.

### Todo Viewing

Users can view a list of their own todos. Users can view a single todo to see all its details. The single todo view displays the full description. The single todo view displays all dates associated with the todo.

### Todo Completion Toggle

Users can mark a todo as complete. Users can mark a todo as incomplete. The completion status toggles between two states: complete and incomplete. Users can change the completion status at any time.

### Todo Editing

Users can edit their todo's title. Users can edit their todo's description. Users can edit their todo's start date. Users can edit their todo's due date. Every edit to a todo is recorded in the todo's edit history. Edit history entries are displayed in descending order by timestamp.

### Todo Deletion and Trash Management

Users can delete their own todos. Deleted todos are moved to trash. Deleted todos no longer appear in the normal todo list. Users can view a list of their deleted todos in the trash. Users can restore a deleted todo from the trash. When restored, the todo returns to the normal todo list. Users can permanently delete a todo from the trash. Permanently deleting a todo removes it completely along with its edit history.

## TodoEditHistory Operations

Every time a user edits a todo, the system automatically creates a history entry recording the change. Each history entry captures when the edit was made and what values were changed. The history records the new title if the title was changed during the edit. The history records the new description if the description was changed during the edit. The history records the new start date if the start date was changed during the edit. The history records the new due date if the due date was changed during the edit. Users can view the full edit history of any of their todos to see all past changes. History entries are displayed sorted from most recent to oldest for easy review. When a user permanently deletes a todo from trash, its entire edit history is also permanently deleted. Edit history cannot be manually modified or deleted by users outside of permanent todo deletion. History tracking is automatic and requires no user action beyond editing the todo.

### Automatic History Entry Creation

WHEN a user edits any field of their todo, THE system SHALL automatically create a new history entry.

The history entry is created without any user action beyond the edit itself. Users do not need to manually trigger history tracking.

The system creates one history entry per edit operation, regardless of how many fields are changed in that edit.

The automatic history creation applies to all edit operations on todos owned by the user.

### History Entry Contents

Each history entry SHALL record the timestamp when the edit was made.

Each history entry SHALL record the new title value if the title was changed during the edit.

Each history entry SHALL record the new description value if the description was changed during the edit.

Each history entry SHALL record the new start date value if the start date was changed during the edit.

Each history entry SHALL record the new due date value if the due date was changed during the edit.

IF a field was not changed during an edit, THEN the history entry SHALL not record any value for that field.

The history entry captures only the new values after the change, not the previous values before the change.

### View Edit History

Users can view the full edit history of any todo they own.

The edit history displays all history entries for the todo, showing every change made since the todo was created.

History entries SHALL be displayed sorted in descending order by timestamp.

The edit history view shows the timestamp and changed values for each history entry.

Edit history is private to each user. Users can only view edit history for their own todos.

### History Deletion on Permanent Todo Deletion

WHEN a user permanently deletes a todo from trash, THE system SHALL also permanently delete all edit history entries associated with that todo.

The edit history is deleted at the same time as the todo is permanently deleted.

IF a todo is soft deleted (moved to trash), THEN its edit history SHALL remain accessible until permanent deletion.

Restoring a todo from trash does not affect its edit history, which remains intact.

### History Modification Restrictions

Users cannot manually modify or delete individual history entries.

The edit history is read-only from the user perspective.

The only way to remove edit history entries is through permanent deletion of the associated todo.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up must provide both email and password; the system rejects incomplete registration attempts. Login failures occur when users provide incorrect email or password combinations. Password changes require valid authentication; unauthorized attempts are denied. When users delete their account, all their todos including those in trash are permanently removed without recovery option. Display name edits must be submitted by the authenticated user; the system rejects attempts to modify another user's profile. Users cannot access or view other users' profiles as the application enforces strict privacy boundaries. Account deletion is irreversible and cascades to remove all associated data including todos and edit histories. The system prevents profile access violations by ensuring users can only interact with their own account data.

### Registration and Authentication Failures

### Incomplete Registration Rejected

IF the email is not provided during sign up, THEN THE system SHALL reject the registration request.

IF the password is not provided during sign up, THEN THE system SHALL reject the registration request.

### Login Failure with Incorrect Credentials

IF the email provided during login does not match any registered account, THEN THE system SHALL deny access.

IF the password provided during login does not match the stored credentials, THEN THE system SHALL deny access.

### Password Change Authentication Required

IF the user attempts to change their password without valid authentication, THEN THE system SHALL reject the request.

WHEN the user provides valid authentication, THE system SHALL allow the password change operation.

### Account Deletion Cascades and Irreversibility

### Account Deletion Cascades to Todos

WHEN the user deletes their account, THE system SHALL permanently delete all todos owned by that user.

WHEN the user deletes their account, THE system SHALL permanently delete all todos in the trash owned by that user.

WHEN the user deletes their account, THE system SHALL permanently delete all edit histories associated with that user's todos.

### Irreversible Account Deletion

WHEN the account deletion is confirmed, THE system SHALL not provide any recovery mechanism for the deleted account.

WHEN the account deletion is confirmed, THE system SHALL not provide any recovery mechanism for the deleted todos.

### Complete Deletion Enforcement

THE system SHALL ensure account deletion completes fully before confirming the operation to the user.

THE system SHALL not allow partial account deletions.

### Profile Access and Privacy Enforcement

### Display Name Edit by Authenticated User

WHEN the authenticated user edits their display name, THE system SHALL allow the modification.

IF the user attempts to edit another user's display name, THEN THE system SHALL reject the request as unauthorized.

### Cannot View Other Users Profiles

IF the user attempts to view another user's profile, THEN THE system SHALL reject the request.

THE system SHALL not allow any access to another user's profile information.

### Own Account Data Only

WHEN the user accesses account data, THE system SHALL restrict access to only the authenticated user's own data.

IF the user attempts to access another user's todos, THEN THE system SHALL reject the request.

IF the user attempts to access another user's edit histories, THEN THE system SHALL reject the request.

### Privacy Boundary Enforcement

THE system SHALL enforce privacy boundaries on all profile-related operations.

THE system SHALL ensure users can only interact with their own profile information.

### Profile Access Violation Prevention

THE system SHALL prevent all attempts to access or modify another user's account data.

## Todo Error Scenarios

Creating a todo requires a title; the system rejects todo creation attempts without a title. Users can only view, edit, or delete their own todos; attempts to access another user's todos are denied. Deleted todos move to trash and no longer appear in the normal todo list. Restoring a todo from trash returns it to the normal todo list; permanent deletion removes the todo and its edit history forever. Pagination applies to both todo lists and trash lists; empty pages return no results. Filtering by completion status shows all, only complete, or only incomplete todos based on user selection. Sorting by start date or due date places todos without those dates at the end of the list. Toggle completion status switches between complete and incomplete states; invalid state transitions are rejected. Users cannot share or grant access to their todos as the application maintains complete privacy.

### Todo Creation Errors

WHEN a user attempts to create a todo without providing a title, THE system SHALL reject the creation request.
The system SHALL require a title for every todo creation.
Newly created todos SHALL have an incomplete completion status by default.
IF the creation request is rejected, THEN the todo SHALL not be created.

### Access Denied Scenarios

IF a user attempts to view another user's todo, THEN the system SHALL deny the request.
IF a user attempts to edit another user's todo, THEN the system SHALL deny the request.
IF a user attempts to delete another user's todo, THEN the system SHALL deny the request.
Users SHALL only access their own todos.
The system SHALL maintain complete privacy by preventing all access to another user's todos.
Users SHALL not share their todos with other users.

### Trash and Deletion Behaviors

WHEN a user deletes a todo, THE system SHALL move the todo to the trash.
WHILE a todo is in the trash, THE system SHALL hide the todo from the normal todo list.
WHEN a user restores a todo from the trash, THE system SHALL return the todo to the normal todo list.
WHEN a user permanently deletes a todo from the trash, THE system SHALL remove the todo and its edit history forever.
Edit history entries SHALL be maintained in descending order by timestamp.
Both the normal todo list and the trash list SHALL support pagination.
IF a page contains no results, THEN the system SHALL return an empty page.

### Completion Toggle Errors

Users SHALL toggle a todo's completion status between complete and incomplete states.
WHEN a user marks a todo as complete, THE system SHALL update the completion status to complete.
WHEN a user marks a todo as incomplete, THE system SHALL update the completion status to incomplete.
IF an invalid state transition is requested, THEN the system SHALL reject the request.

## TodoEditHistory Error Scenarios

Every todo edit creates a history entry recording what changed; edits without any changes may not generate history entries. History entries are sorted from most recent to oldest; users view the full edit history of their own todos only. Attempting to view edit history for another user's todo is denied due to privacy constraints. When a todo is permanently deleted from trash, its entire edit history is also permanently deleted. History entries record timestamp and changed fields including title, description, start date, and due date modifications. Users cannot modify or delete individual history entries; history is immutable and system-managed. Accessing history for a non-existent or already permanently deleted todo returns no results. Edit history visibility follows the same privacy rules as the parent todo.

### History Entry Creation and Recording

WHEN a user edits a todo, THE system SHALL automatically create a history entry.

WHEN a history entry is created, THE system SHALL record the timestamp of when the edit was made.

WHERE the title is changed during an edit, THE system SHALL record the new title value in the history entry.

WHERE the description is changed during an edit, THE system SHALL record the new description value in the history entry.

WHERE the start date is changed during an edit, THE system SHALL record the new start date value in the history entry.

WHERE the due date is changed during an edit, THE system SHALL record the new due date value in the history entry.

THE system SHALL capture only the fields that were actually modified during each edit operation.

IF an edit does not change any field values, THEN THE system MAY skip creating a history entry.

### History Access and Privacy

WHEN a user requests to view the edit history of a todo, THE system SHALL verify that the user owns that todo.

THE system SHALL allow users to view the full edit history of their own todos only.

IF a user attempts to view the edit history of another user's todo, THEN THE system SHALL deny the request due to privacy constraints.

IF a user attempts to access the edit history of a todo that does not exist, THEN THE system SHALL return no results.

IF a user attempts to access the edit history of a todo that has been permanently deleted, THEN THE system SHALL return no results.

THE system SHALL apply the same privacy rules to edit history as to the parent todo.

### History Immutability

THE system SHALL ensure that history entries are immutable once created.

IF a user attempts to edit an existing history entry, THEN THE system SHALL reject the request.

IF a user attempts to delete an individual history entry, THEN THE system SHALL reject the request.

THE system SHALL automatically create and maintain history entries without user intervention.

THE system SHALL not allow users to manually create, modify, or remove history entries.

### History Deletion on Permanent Todo Deletion

WHEN a user permanently deletes a todo from the trash, THE system SHALL also permanently delete the entire edit history associated with that todo.

WHEN a todo is permanently deleted, THE system SHALL remove all history entries along with the parent todo.

THE system SHALL not retain any orphaned history entries after a todo is permanently deleted.

### History Sorting

WHEN a user views the edit history of a todo, THE system SHALL sort the history entries in descending chronological order.

THE system SHALL display the history entries sorted by timestamp in descending order.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Registration and First Todo Creation Journey

A guest user provides an email address and password to register for an account. The system creates the user account with the provided credentials. The user logs in using their email and password. The user edits their display name in their profile. The user creates a new todo by providing a required title. The user optionally adds a description, start date, and due date to the todo. The todo is created with incomplete status by default. The user views their todo list and sees the newly created todo displayed with its title, completion status, and any set dates. The user views the single todo detail to see the full description. This end-to-end journey demonstrates the complete flow from account registration through creating and viewing the first todo.

### Todo Completion Toggle and List Filtering Journey

A logged-in user views their paginated todo list showing all todos with titles, completion status, and dates. The user filters the list to show only incomplete todos. The user selects a todo and marks it as complete. The user refreshes the list and the completed todo no longer appears in the incomplete filter view. The user changes the filter to show only complete todos. The completed todo now appears in the filtered view. The user marks the same todo as incomplete again. The user views the list with all todos filter and sees the todo with its updated completion status. This multi-step journey demonstrates toggling between complete and incomplete states and how filtering responds to status changes.

### Todo Editing with History Review Journey

A logged-in user views a todo they created. The user edits the todo's title to a new value. The system automatically creates a history entry recording the timestamp and the new title value. The user edits the description, start date, and due date. Each edit creates a new history entry recording what was changed and when. The user views the edit history for the todo. The history entries are displayed in descending order by timestamp. The user can see each change that was made, including what each field was changed to. The user can trace the complete evolution of the todo from creation through all edits. This user-journey demonstrates how edit history is automatically maintained and how users can review all changes made to their todos.

### Todo Deletion, Trash Management, and Recovery Journey

A logged-in user views their todo list. The user deletes a todo from the list. The deleted todo no longer appears in the normal todo list. The user views their trash list showing all deleted todos in a paginated view. The user selects a deleted todo and restores it. The restored todo returns to the normal todo list and no longer appears in the trash. Alternatively, the user selects a different deleted todo and permanently deletes it. The permanently deleted todo and its entire edit history are removed from the system and cannot be recovered. This end-to-end journey demonstrates the complete deletion lifecycle from soft delete through trash viewing to either recovery or permanent removal.

### Todo List Sorting and Navigation Journey

A logged-in user views their paginated todo list. The user sorts the list by creation date with newest first. The todos are reordered showing the most recently created todos at the top. The user changes the sort to creation date with oldest first. The list reorders showing the earliest created todos at the top. The user sorts by start date with earliest first. Todos without a start date appear at the end of the list. The user sorts by due date with latest first. Todos without a due date appear at the end of the list. The user navigates through multiple pages of the sorted list. This multi-step journey demonstrates all sorting options and how todos without dates are handled in sorted views.

### Account Deletion with Complete Data Cleanup Journey

A logged-in user initiates account deletion. All todos owned by the user are permanently deleted, including any todos currently in the trash. All edit histories associated with the user's todos are permanently deleted. The user's profile information and credentials are removed from the system. The user attempts to log in with the deleted account credentials and cannot access the system. This end-to-end journey demonstrates the complete account deletion process and verifies that all user-owned data is cascaded and permanently removed from the system.