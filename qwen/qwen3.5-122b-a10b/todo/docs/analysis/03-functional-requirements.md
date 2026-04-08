**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by signing up with an email address and password. Existing users log in to the system using their email and password credentials. Users have the ability to change their password at any time for security purposes. Each user maintains a profile containing a display name that can be edited. When a user deletes their account, all their todos including items in the trash are permanently removed from the system. Users cannot view or access other users' profiles since this is a private todo application. Profile information remains visible only to the account owner.

### Account Registration

Users can create a new account by providing an email address and password. The system validates the email format and ensures the email is not already registered. Upon successful registration, the user is automatically logged in and gains access to their private todo list.

### User Login

Users can log in to the system using their registered email address and password. The system verifies the credentials and grants access to the user's private todo list and profile information upon successful authentication.

### Password Change

Users can change their password by providing their current password and a new password. The system verifies the current password before updating it to the new password. This operation is available at any time after login.

### Profile Management

Users can view their own profile information including their display name. Users can edit their display name at any time. Users cannot view or access other users' profiles. Each user can only see their own profile information since this is a private todo application.

### Account Deletion

Users can delete their account. When an account is deleted, all todos belonging to that user are permanently removed from the system, including todos in the trash. The edit history for all deleted todos is also permanently removed. Account deletion is irreversible.

### Account Management Operations

Users can access account management operations after logging in. These operations include viewing and editing their profile, changing their password, and deleting their account. All account management operations require the user to be authenticated.

## Todo Operations

Users can create a todo with a required title and optional description, start date, and due date. New todos are incomplete by default when first created. Users view a paginated list of their own todos showing title, completion status, start date, due date, and creation date. Individual todo details including the full description can be viewed separately. Users toggle a todo between complete and incomplete states. All todo fields including title, description, start date, and due date can be edited. Deleted todos are soft deleted and moved to the trash instead of being permanently removed. Users filter their todo list by completion status showing all, only complete, or only incomplete todos. Sorting options include creation date, start date, and due date in ascending or descending order. Todos without a start or due date appear at the end when sorting by those fields. Users can view a paginated list of their deleted todos in the trash. Users can restore a deleted todo from the trash to return it to the normal todo list. Users can permanently delete a todo from the trash which removes it and its edit history forever. Users can only see their own todos due to privacy isolation rules.

### Todo Creation

Users can create a new todo by providing a title and optional additional information.

- The title is required and must be provided when creating a todo
- A description can be added but is optional and may be left empty
- A start date may be set but is optional and may be left empty
- A due date may be set but is optional and may be left empty
- When first created, the todo is automatically marked as incomplete
- The newly created todo is automatically associated with the creating user

If the title is not provided, the creation request is rejected.

### Todo Viewing

Users can view their todos in a list format or view individual todo details.

- Users can view a paginated list of their own todos
- The todo list displays: title, completion status, start date (if set), due date (if set), and creation date
- Users can view a single todo to see all its details including the full description

Users can only access todos that belong to them. Access to another user's todos is denied.

### Todo Completion

Users can change the completion status of their todos.

- Users can mark a todo as complete
- Users can mark a todo as incomplete
- The completion status is a simple toggle between two states: complete and incomplete

Users can only toggle the completion status of their own todos.

### Todo Editing

Users can modify the details of their existing todos.

- Users can edit the todo's title
- Users can edit the todo's description
- Users can edit the todo's start date
- Users can edit the todo's due date
- Every edit is automatically recorded in the todo's edit history

Users can only edit their own todos. Edit history is defined in the TodoHistory Operations section.

### Todo Soft Deletion

Users can remove todos from their active list without permanent deletion.

- Users can delete their own todos
- Deleted todos are soft deleted, meaning they are not permanently removed from the system
- Deleted todos are moved to the trash
- Deleted todos no longer appear in the normal active todo list

Soft deletion preserves the todo and its edit history for potential recovery. Permanent deletion is handled in the Trash Management section.

### Trash Management

Users can manage their deleted todos through the trash feature.

- Users can view a paginated list of their deleted todos in the trash
- Users can restore a deleted todo from the trash, which returns it to the normal todo list
- Users can permanently delete a todo from the trash
- When a todo is permanently deleted from the trash, its edit history is also permanently deleted

Users can only access and manage their own deleted todos in the trash.

### Todo Filtering and Sorting

Users can organize their todo list using filtering and sorting options.

- Users can filter their todo list by completion status:
  - All todos
  - Only complete todos
  - Only incomplete todos
- Users can sort their todo list by:
  - Creation date (newest first or oldest first)
  - Start date (earliest first or latest first)
  - Due date (earliest first or latest first)
- When sorting by start date, todos without a start date appear at the end
- When sorting by due date, todos without a due date appear at the end

Filtering and sorting apply only to the user's own todos.

### Privacy and Access Control

The system enforces privacy isolation to ensure users can only access their own data.

- Each user's todos are completely private
- Users can only see their own todos
- Users cannot view, access, or share another user's todos
- Privacy isolation applies to all todo operations including viewing, editing, deleting, and history access

This privacy isolation is a fundamental constraint across all todo operations.

## TodoHistory Operations

Every time a user edits a todo, a history entry is automatically created to record the change. Each history entry captures when the edit was made and what specific fields were changed. The history tracks changes to title, description, start date, and due date separately. Users can view the complete edit history for any of their todos. History entries are displayed from most recent to oldest. When a todo is permanently deleted from the trash, its entire edit history is also permanently removed. History entries are private and only accessible to the todo owner.

### Edit History Creation

WHEN a user edits any field of their todo, THE system SHALL automatically create a new edit history entry.

WHEN a user edits the title of a todo, THE system SHALL record the new title value in the history entry.

WHEN a user edits the description of a todo, THE system SHALL record the new description value in the history entry.

WHEN a user edits the start date of a todo, THE system SHALL record the new start date value in the history entry.

WHEN a user edits the due date of a todo, THE system SHALL record the new due date value in the history entry.

WHEN a user edits multiple fields in a single edit action, THE system SHALL record all changed fields in one history entry.

THE system SHALL create the history entry immediately upon saving the edit.

### History Entry Content

Each history entry SHALL record the timestamp of when the edit was made.

Each history entry SHALL record the new title value if the title was changed in that edit.

Each history entry SHALL record the new description value if the description was changed in that edit.

Each history entry SHALL record the new start date value if the start date was changed in that edit.

Each history entry SHALL record the new due date value if the due date was changed in that edit.

If a field was not changed in an edit, THAT field SHALL NOT appear in the history entry for that edit.

### View Edit History

Users SHALL be able to view the complete edit history of any of their todos.

Users CANNOT view the edit history of todos owned by other users.

History entries SHALL be displayed sorted from most recent to oldest.

The history view SHALL show all recorded changes including timestamp and what fields were changed.

### History Deletion Cascade

WHEN a user permanently deletes a todo from the trash, THE system SHALL permanently delete all associated edit history entries.

THE history deletion SHALL occur automatically as part of the permanent todo deletion.

Once permanently deleted, the edit history CANNOT be recovered.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users must provide a valid email address during sign up. The system rejects duplicate email addresses already registered in the system. Login fails when users enter incorrect email or password combinations. Password changes require the user to provide their current password for verification. Users cannot delete their account while logged in from multiple sessions simultaneously. Account deletion permanently removes all todos including those in trash without recovery options. Profile editing is restricted to the current user only. Users cannot view or access other users' profiles or any information about them. The system enforces session expiration after periods of inactivity. Email format validation occurs before accepting any user registration or login attempts.

### Email Registration Validation

The system validates email format during user registration before accepting the sign-up request. If the provided email address does not follow a valid email format, the registration is rejected.

The system checks for email uniqueness during registration. If an email address is already registered in the system, the sign-up request is rejected and the user is informed that the email is already in use.

These validation checks occur before any user account is created.

### Login Authentication Failures

When a user attempts to log in, the system verifies the provided email and password combination. If the email does not exist in the system or the password does not match the stored credentials, the login attempt fails.

The system does not disclose whether the email exists or the password is incorrect when login fails, to prevent enumeration attacks.

### Password Change Verification

When a user requests to change their password, the system requires verification of the current password before accepting the new password.

If the current password provided does not match the stored password, the password change request is rejected and no changes are made to the account.

### Account Deletion Restrictions

Users must confirm their intention before permanently deleting their account. The system requires explicit confirmation to proceed with account deletion.

When an account is deleted, all todos belonging to the user are permanently removed, including todos in the trash. This deletion is irreversible and all associated edit history is also permanently deleted.

If the user is logged in from multiple sessions simultaneously, the system blocks the account deletion request until all sessions are terminated.

### Profile Access Control

Users can only access and edit their own profile information. The system does not allow users to view other users' profiles or any information about them.

When a user attempts to access another user's profile, the system denies the request and returns an access denied response.

### Session Management

The system enforces session expiration after periods of user inactivity. When a session expires due to inactivity, the user is logged out and must re-authenticate to access the system.

Expired sessions cannot be used to perform any operations, including viewing todos or accessing profile information.

## Todo Error Scenarios

Todo title is required when creating a new todo. The system rejects todo creation requests without a title. Start date and due date can be left empty but cannot be set to invalid date values. When sorting by start date or due date, todos without those dates appear at the end of the list. Users can only view, edit, complete, or delete their own todos. Attempts to access another user's todos are denied. Soft deleted todos no longer appear in the normal todo list but remain in trash. Restoring a deleted todo returns it to the normal list with all its original properties. Permanent deletion from trash removes the todo and its edit history forever. Pagination boundaries are enforced when viewing todo lists or trash. Filtering by completion status returns only matching todos or an empty list if none match.

### Todo Creation Validation

When a user creates a new todo, the system SHALL require a title. If the title is missing or empty, the system SHALL reject the creation request.

When a user creates a new todo, the system SHALL accept optional start date and due date values. If these fields are not provided, the system SHALL create the todo without them.

When a user provides a start date or due date, the system SHALL validate that the date value is a valid calendar date. If an invalid date format or value is provided, the system SHALL reject the creation request.

### Todo Access Control

When a user attempts to view a todo, the system SHALL verify that the todo belongs to the requesting user. If the todo belongs to another user, the system SHALL deny the request.

When a user attempts to edit a todo, the system SHALL verify that the todo belongs to the requesting user. If the todo belongs to another user, the system SHALL deny the request.

When a user attempts to delete a todo, the system SHALL verify that the todo belongs to the requesting user. If the todo belongs to another user, the system SHALL deny the request.

When a user attempts to view the edit history of a todo, the system SHALL verify that the todo belongs to the requesting user. If the todo belongs to another user, the system SHALL deny the request.

### Todo Deletion and Restoration

When a user deletes a todo, the system SHALL mark it as deleted and remove it from the normal todo list view. The deleted todo SHALL remain accessible in the trash.

When a user restores a deleted todo from the trash, the system SHALL return the todo to the normal todo list with all its original properties intact, including title, description, dates, completion status, and edit history.

When a user permanently deletes a todo from the trash, the system SHALL remove the todo and all associated edit history entries. This deletion is irreversible.

### List Operation Edge Cases

When a user views their todo list with sorting by start date or due date, the system SHALL place todos without a start date or due date at the end of the sorted list respectively.

When a user filters their todo list by completion status and no todos match the filter criteria, the system SHALL return an empty list.

When a user views their todo list or trash list with pagination, the system SHALL enforce pagination boundaries. Users SHALL only see the todos within the requested page range.

## TodoHistory Error Scenarios

Every todo edit creates a new history entry recording the timestamp and changed fields. History entries are sorted from most recent to oldest by default. Users can only view the edit history of their own todos. Attempts to view another user's todo history are denied. When a todo is permanently deleted from trash, all its history entries are also permanently removed. History entries only record fields that actually changed during an edit. Empty edit submissions do not create new history entries. The system handles concurrent edits by recording each change as a separate history entry. History viewing does not expose any information about other users. History entries display only the changed values, not the previous values before the edit.

### History Entry Creation

Every time a user edits a todo, the system creates a new history entry to record the change. A history entry is created only when at least one field (title, description, start date, or due date) is actually changed. If a user submits an edit without changing any fields, no history entry is created. Each history entry records the timestamp of when the edit was made. The history entry tracks which specific fields were changed during that edit. If the title was changed, the new title value is recorded. If the description was changed, the new description value is recorded. If the start date was changed, the new start date value is recorded. If the due date was changed, the new due date value is recorded. Fields that were not changed during an edit are not recorded in that history entry. History entries display only the new values for changed fields, not the previous values before the edit.

### History Viewing and Access

When a user views the edit history of a todo, the history entries are displayed sorted from most recent to oldest. The most recently created history entry appears first in the list. The oldest history entry appears last in the list. Users can only view the edit history of todos that belong to them. If a user attempts to view the history of another user's todo, the request is denied. The system enforces privacy so that no user can access or view another user's todo history. History viewing does not expose any information about other users. History entries only contain the changed field values and timestamps, with no reference to other users.

### History Permanent Removal

When a user permanently deletes a todo from the trash, all history entries associated with that todo are also permanently deleted. The permanent deletion of a todo cascades to remove all its edit history. Once a todo is permanently deleted from trash, its history entries cannot be recovered. The history entries are removed at the same time as the todo itself. This permanent removal applies to all history entries created for that todo throughout its lifetime.

### Concurrent Edit Handling

When multiple edits are made to the same todo, each edit is recorded as a separate history entry. If two users attempt to edit the same todo at the same time, each edit creates its own history entry. The system records concurrent edits as individual history entries in the order they are processed. Each history entry captures the changes from one edit operation. Concurrent edits do not prevent history entry creation. All edits, whether sequential or concurrent, result in separate history entries being recorded.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Complete User Journey

This scenario describes the complete end-to-end journey a user takes from account creation through todo management to account deletion.

**Registration and Authentication**
A new user signs up by providing an email address and password. The system creates a user account. The user logs in with their email and password to access the application. The user can log out at any time.

**Profile Management**
The user views their profile, which displays their display name. The user edits their display name to update it. The user changes their password by providing the current password and a new password.

**Todo Operations**
The user creates todos with a title (required) and optionally a description, start date, and due date. Todos are created incomplete by default. The user views their todo list with pagination support, filtering by completion status (all, complete, incomplete), and sorting by creation date, start date, or due date. The user marks todos complete or incomplete through a simple toggle. The user edits todo details, and each edit is recorded in the todo's history.

**History and Trash**
The user views the edit history for any todo, with entries sorted from most recent to oldest. The user deletes todos, which move to the trash and are removed from the normal list. The user views the trash list with pagination. The user restores deleted todos or permanently deletes them (which also removes edit history).

**Account Deletion**
The user deletes their account. The system permanently removes the user account along with all associated todos (including those in trash) and all edit histories. This action cannot be undone.

### Todo Management Workflow

This scenario describes the complete workflow of managing todos from creation through deletion.

**Creating Todos**
The user creates a new todo by entering a title (required) and optionally providing a description, start date, and due date. The todo is automatically associated with the creating user and set to incomplete status.

**Viewing Todos**
The user views their todo list, which shows title, completion status, start date (if set), due date (if set), and creation date for each todo. The list supports pagination. The user filters the list by completion status (all, complete, incomplete). The user sorts the list by creation date (newest or oldest first), start date (earliest or latest first), or due date (earliest or latest first). Todos without a start date appear at the end when sorting by start date. Todos without a due date appear at the end when sorting by due date.

**Completing and Editing**
The user marks a todo as complete or incomplete through a simple toggle. The user edits the todo's title, description, start date, or due date. Each modification creates a history entry recording when the change was made and what values were changed.

**Reviewing History**
The user views the edit history for any of their todos. History entries are displayed from most recent to oldest. Each entry shows the timestamp and which fields were changed along with their new values.

**Deletion and Restoration**
The user deletes a todo, which moves it to the trash and removes it from the normal todo list. The user views the trash (paginated list of deleted todos). The user restores a deleted todo, returning it to the normal list. The user permanently deletes a todo from the trash, which also removes its edit history.