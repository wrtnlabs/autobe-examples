**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address and password during signup. Users log in to the application using their registered email and password combination. Each user has a profile containing a display name that can be edited at any time. Users cannot view other users' profiles as this is a private todo application. Users can change their password through the account settings. Users can delete their entire account, which permanently removes all their todos including those in the trash. Account deletion is irreversible and removes all user data from the system. The system requires valid email and password credentials for authentication. Users must be authenticated to perform any todo operations. Profile information remains private and inaccessible to other users.

### User Account Creation

Users can create an account by providing an email address and password during signup. The system requires both email and password to complete account creation. The email address serves as the user's primary credential for authentication. The password is stored securely and used for login verification. Upon successful account creation, the user is automatically authenticated and can begin using the application. If the email address is already registered, the account creation request is rejected. If the email format is invalid, the account creation request is rejected. If the password does not meet security requirements, the account creation request is rejected. Account creation is the first step in the user onboarding flow. New users must complete account creation before accessing any todo functionality.

### User Authentication

Users log in to the application using their registered email and password combination. The system validates the provided credentials against stored account information. Successful authentication grants the user access to their personal todo list and account settings. Failed authentication prevents access to the system. Users must be authenticated to perform any todo operations including creating, viewing, editing, or deleting todos. If the email address does not exist in the system, the login request is rejected. If the password does not match the stored credentials, the login request is rejected. If the user attempts to access todo operations without authentication, the request is rejected. Authentication is required for all user-specific operations. The system maintains the user's authenticated session until logout or session expiration.

### Profile Management

Each user has a profile containing a display name. Users can edit their display name at any time through their account settings. The display name is used to identify the user within their own account context. Users cannot view other users' profiles as this is a private todo application. Profile information remains private and inaccessible to other users. There is no way to view, access, or share another user's profile information. If a user attempts to view another user's profile, the request is rejected. Profile visibility restrictions enforce complete privacy between users. The display name can be updated without affecting the user's todos or account credentials. Profile edits are saved immediately upon submission.

### Password Management

Users can change their password through the account settings. Password changes require the user to be authenticated. The system validates the new password meets security requirements before accepting the change. If the user is not authenticated, the password change request is rejected. If the new password does not meet security requirements, the password change request is rejected. If the current password verification fails, the password change request is rejected. Password changes take effect immediately upon successful completion. Users must use their new password for subsequent login attempts. The password change operation does not affect the user's todos or profile information. Password management is accessible only to authenticated users.

### Account Deletion

Users can delete their entire account through the account settings. Account deletion permanently removes all user data from the system. All todos owned by the user are permanently deleted, including those in the trash. All edit history associated with the user's todos is permanently deleted. The user's profile information is permanently removed. Account deletion is irreversible and cannot be undone. If the user is not authenticated, the account deletion request is rejected. If the account deletion is not confirmed, the request is rejected. Once account deletion is completed, the user cannot recover any data. The email address becomes available for new account registration after deletion. Account deletion cascades to all user-owned resources including todos and edit history.

## Todo Operations

Users can create todos with a required title and optional description, start date, and due date. Newly created todos are marked as incomplete by default. Users can view a paginated list of their own todos showing title, completion status, dates, and creation date. Users can view a single todo to see all details including the full description. Users can toggle a todo between complete and incomplete states. Users can edit their todo's title, description, start date, and due date at any time. Users can delete their todos, which moves them to trash rather than permanently removing them. Users can filter their todo list by completion status showing all, complete only, or incomplete only. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without start or due dates appear at the end when sorting by those fields. Each user can only see and access their own todos with no sharing capability. The system enforces complete privacy between users' todo collections.

### Todo Creation

Users can create a todo with a title, which is required and cannot be left empty. Users may optionally provide a description, a start date, and a due date when creating a todo. Any of these optional fields can be left empty. Newly created todos are marked as incomplete by default. The todo is automatically associated with the user who created it.

### Viewing Todo List

Users can view a paginated list of their own todos. Each todo in the list displays the title, completion status, start date if set, due date if set, and creation date. Users can filter the todo list by completion status, choosing to view all todos, only complete todos, or only incomplete todos. Users can sort the todo list by creation date in newest first or oldest first order. Users can sort the todo list by start date in earliest first or latest first order. Users can sort the todo list by due date in earliest first or latest first order. When sorting by start date or due date, todos without the respective date appear at the end of the list.

### Viewing Single Todo Details

Users can view a single todo to see all its details. The single todo view includes the full description, which may not be fully visible in the list view. All other todo attributes are also visible in the single todo view.

### Todo Completion Toggle

Users can mark a todo as complete. Users can mark a todo as incomplete. This is a simple toggle between two states: complete and incomplete. Users can change the completion status of a todo at any time.

### Todo Editing

Users can edit their todo's title at any time. Users can edit their todo's description at any time. Users can edit their todo's start date at any time. Users can edit their todo's due date at any time. Every edit to a todo is recorded in the todo's edit history. The edit history captures what fields were changed and when the edit was made.

### Todo Deletion and Trash

Users can delete their own todos. When a todo is deleted, it is not permanently removed from the system. Deleted todos are moved to the trash. Deleted todos no longer appear in the normal todo list. Users can view their trash to see all deleted todos. Users can restore a deleted todo from the trash, which returns it to the normal todo list. Users can permanently delete a todo from the trash, which removes it and its edit history completely.

### Todo Privacy and Ownership

Each user's todos are completely private. Users can only see their own todos. Users cannot view, access, or share another user's todos. There is no capability to share todos with other users. The system enforces complete privacy between users' todo collections.

## EditHistory Operations

Every time a user edits a todo, the system automatically creates a history entry. Each history entry records when the edit was made and what fields were changed. History entries capture changes to title, description, start date, and due date if modified. Users can view the full edit history of any of their todos. History entries are displayed sorted from most recent to oldest. When a todo is permanently deleted from trash, its edit history is also permanently removed. Soft deleted todos retain their edit history while in trash. The edit history provides a complete audit trail of all modifications made to a todo. Users cannot manually edit or delete individual history entries. History creation is automatic and cannot be disabled by users.

### Automatic History Entry Creation

When a user edits any of their todos, the system automatically creates a history entry. This history generation cannot be disabled or bypassed by users.

Each history entry records the following information:
- When the edit was made (timestamp)
- What the title was changed to, if the title was modified
- What the description was changed to, if the description was modified
- What the start date was changed to, if the start date was modified
- What the due date was changed to, if the due date was modified

If a field was not changed during the edit, that field is not recorded in the history entry. Only actual changes are captured.

Users cannot manually create, edit, or delete individual history entries. History creation is fully automatic and triggered only by todo edit operations. If an edit operation fails, no history entry is created.

This automatic tracking provides a complete modification audit trail for every todo, allowing users to see all changes made over time.

### Edit History Viewing

Users can view the full edit history of any todo they own. The history displays all recorded changes from the todo's creation to the present.

History entries are displayed sorted from most recent to oldest, with the latest edit appearing first.

Users can only access the edit history of their own todos. Access to another user's todo history is not permitted. If a user attempts to view the history of a todo they do not own, the request is rejected.

### Edit History and Todo Deletion

When a user soft deletes a todo (moves it to trash), the todo's edit history is retained. The history remains accessible while the todo is in the trash.

When a user permanently deletes a todo from the trash, the todo's edit history is also permanently deleted. The history cannot be recovered after permanent deletion.

When a user restores a todo from the trash, the edit history is restored along with the todo and remains accessible.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email address that is already registered receive an error indicating the email is already in use. Login attempts with incorrect email or password combinations are rejected without revealing which credential was wrong. When users try to change their password, the system requires the current password to be provided correctly first. Account deletion is only permitted when the user is authenticated, and the system confirms that all associated todos will be permanently removed. Users cannot edit their display name to an empty value, as a display name must be provided. Attempts to view another user's profile are blocked, as the application enforces strict privacy where users can only access their own information. If a user tries to delete their account while having todos in their trash, those todos are permanently deleted along with the account. The system rejects registration attempts where the email format is invalid or the password does not meet minimum requirements.

### Registration Validation Errors

When a user attempts to sign up with an email address that is already registered, the system rejects the registration and indicates the email is already in use.

When a user attempts to sign up with an invalid email format, the system rejects the registration and indicates the email format is invalid.

The system does not reveal whether an email is already registered during the registration process to prevent information disclosure.

### Login Authentication Failures

When a user attempts to log in with an incorrect email or password combination, the system rejects the login attempt.

The system does not reveal whether the email or the password was incorrect when login fails, to prevent information disclosure about which credential was wrong.

Users must provide both email and password to attempt login. Missing either credential results in rejection of the login attempt.

### Password Change Authentication Failures

When a user attempts to change their password without providing the current password correctly, the system rejects the password change request.

The system requires the current password to be verified before allowing a password change.

If the current password provided does not match the user's actual password, the password change is rejected without revealing specific details about the mismatch.

### Account Deletion Scenarios

When a user requests account deletion, the system requires confirmation that all associated todos will be permanently removed.

Account deletion is only permitted when the user is authenticated.

When an account is deleted, all todos belonging to that user are permanently deleted, including todos in the trash.

The edit history of all todos is also permanently deleted when the account is deleted.

Once account deletion is confirmed and executed, the action cannot be undone and all user data is permanently removed.

### Display Name Validation Errors

When a user attempts to edit their display name to an empty value, the system rejects the update.

A display name must be provided and cannot be left empty.

The system validates that the display name contains at least one character before accepting the update.

### Profile Access Restrictions

When a user attempts to view another user's profile, the system blocks the access.

Users can only access their own profile information.

The application enforces strict privacy where there is no way to view, access, or retrieve another user's profile.

Any attempt to access profile information without proper ownership results in access denial.

## Todo Error Scenarios

Creating a todo without a title is rejected, as the title is a required field for every todo. Users cannot edit or delete todos that belong to other users, as each user's todos are completely private. When marking a todo as complete or incomplete, the system verifies the user owns the todo before allowing the toggle. Attempting to restore a todo from trash fails if the todo does not exist in the user's trash or if the user is not the owner. Permanently deleting a todo from trash is only allowed for todos that are currently in the trash state. Filtering todos by completion status rejects invalid filter values that are not all, complete, or incomplete. Sorting by start date or due date places todos without those dates at the end of the list, regardless of sort direction. Pagination requests with invalid page numbers return an error or default to the first page. Users cannot view todo details for todos they do not own, enforcing the privacy boundary.

### Todo Creation Validation

### Missing Required Title Rejection

When creating a todo, the title field is required and must be provided.

IF the title is missing or empty, THEN the system SHALL reject the todo creation request.

The system SHALL validate that a title is present before creating a new todo.

A todo cannot be created without a title, as the title is a mandatory field for every todo.

The system SHALL not allow blank or whitespace-only titles during todo creation.

Users SHALL receive an error indication when attempting to create a todo without providing a title.

### Todo Edit Authorization

### Cross-User Edit Denial

Users can only edit their own todos.

IF a user attempts to edit a todo that belongs to another user, THEN the system SHALL reject the edit request.

The system SHALL verify todo ownership before allowing any edit operation.

Each user's todos are completely private, and there is no way to modify another user's todos.

The system SHALL prevent users from editing todos they do not own.

### Ownership Verification Failure

WHEN a user attempts to edit a todo, the system SHALL verify that the user owns the todo.

IF the ownership verification fails, THEN the system SHALL reject the edit request.

The system SHALL check that the requesting user is the owner of the todo before processing any edit.

Users cannot edit todos that belong to other users, as each user's todos are completely private.

IF a todo does not exist or the user is not the owner, THEN the edit request SHALL be rejected.

### Trash Operations Validation

### Invalid Trash Restore Attempt

Users can restore a deleted todo from the trash only if the todo exists in their trash.

IF a user attempts to restore a todo that does not exist in their trash, THEN the system SHALL reject the restore request.

The system SHALL verify that the todo is in the user's trash before allowing restoration.

IF the user is not the owner of the todo, THEN the restore request SHALL be rejected.

A todo can only be restored by its owner from the trash.

The system SHALL not allow restoration of todos that are not in the deleted state.

### Permanent Delete Outside Trash Error

Users can permanently delete a todo only if the todo is currently in the trash.

IF a user attempts to permanently delete a todo that is not in the trash, THEN the system SHALL reject the request.

The system SHALL verify that the todo is in the deleted state before allowing permanent deletion.

Permanently deleting a todo is only allowed for todos that are currently in the trash state.

IF the todo is not owned by the user, THEN the permanent delete request SHALL be rejected.

The system SHALL not allow permanent deletion of todos that are still in the active todo list.

### Todo List Filtering and Sorting

### Invalid Completion Status Filter

Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos.

IF a user provides a filter value that is not all, complete, or incomplete, THEN the system SHALL reject the filter request.

The system SHALL validate that the completion status filter is one of the three allowed values.

Invalid filter values SHALL result in an error or default to showing all todos.

The system SHALL not accept arbitrary or undefined filter values for completion status.

### Null Date Sorting Boundary Condition

When sorting by start date, todos without a start date SHALL appear at the end of the list.

When sorting by due date, todos without a due date SHALL appear at the end of the list.

This behavior applies regardless of whether sorting is earliest first or latest first.

Todos without a start date SHALL always be positioned after todos with a start date when sorting by start date.

Todos without a due date SHALL always be positioned after todos with a due date when sorting by due date.

The system SHALL handle missing start dates and due dates consistently during sorting operations.

### Pagination and Access Control

### Invalid Pagination Page Number

The todo list is paginated, and users can navigate through pages of todos.

IF a user requests a page number that is invalid (negative, zero, or beyond available pages), THEN the system SHALL return an error or default to the first page.

The system SHALL validate pagination parameters before retrieving todo lists.

Invalid page numbers SHALL not cause system errors or expose unintended data.

The system SHALL handle out-of-range page requests gracefully.

### Unauthorized Todo Detail Access

Users can view a single todo to see all its details including full description.

IF a user attempts to view a todo that they do not own, THEN the system SHALL reject the access request.

The system SHALL verify todo ownership before displaying todo details.

Each user's todos are completely private, and there is no way to view another user's todos.

Users cannot view todo details for todos they do not own, enforcing the privacy boundary.

IF the todo does not exist or the user is not the owner, THEN the detail view request SHALL be rejected.

The system SHALL prevent unauthorized access to todo details at all times.

## EditHistory Error Scenarios

Users can only view the edit history of their own todos, and attempts to access another user's todo history are blocked. When a todo is permanently deleted from trash, its entire edit history is also permanently removed and cannot be recovered. Edit history entries are automatically created only when an edit successfully completes, failed edits do not generate history entries. Viewing edit history for a todo that does not exist returns an error indicating the todo cannot be found. The system sorts edit history entries from most recent to oldest, and invalid sort requests are ignored. If a user tries to view history for a todo in their trash, they can still access the history until permanent deletion occurs. History entries record only the fields that were actually changed during each edit operation. When a todo is restored from trash, its edit history remains intact and accessible to the owner.

### Cross-User History Access Denied

Users can only view the edit history of their own todos. When a user attempts to view the edit history of a todo owned by another user, the request is rejected. The system does not reveal whether the todo exists or who owns it when access is denied. This restriction applies regardless of the todo's status (active or in trash). Users cannot bypass this restriction through any means, including direct links or shared references. The system enforces this restriction before checking any other conditions.

### History Cascade Deletion on Permanent Remove

When a user permanently deletes a todo from the trash, the todo's entire edit history is also permanently deleted. The edit history cannot be recovered once the parent todo is permanently deleted. This deletion happens automatically as part of the permanent deletion operation. Users are not given a separate confirmation for history deletion, as it is included in the permanent deletion warning. If a permanent deletion operation fails, neither the todo nor its history is deleted. Partial deletion where only the todo or only the history is removed cannot occur.

### Failed Edit No History Entry

Edit history entries are created only when an edit operation successfully completes. If an edit operation fails for any reason, no history entry is created. Failed edits include those rejected due to invalid data, insufficient permissions, or system errors. The system does not create partial or incomplete history entries. Users cannot see any record of failed edit attempts in the history. This ensures the history reflects only actual changes made to the todo.

### Nonexistent Todo History Lookup Error

When a user attempts to view the edit history of a todo that does not exist, the request is rejected with an error indicating the todo cannot be found. This applies to todos that were never created, were permanently deleted, or belong to another user. The error message does not distinguish between these cases for security reasons. The system checks todo existence before attempting to retrieve history. Users cannot determine if a todo exists by probing history access errors.

### Invalid History Sort Request Handling

The system sorts edit history entries from most recent to oldest by default. If a user requests an invalid sort order, the request is ignored and the default sort is applied. Invalid sort requests include unsupported sort fields or unrecognized sort directions. The system does not return an error for invalid sort requests, instead falling back to the default behavior. This ensures users always receive history entries in a consistent, usable order. Sort preferences are not persisted between requests.

### Trash Todo History Accessibility

Users can view the edit history of their own todos even when those todos are in the trash. The history remains accessible from the moment the todo is deleted until it is permanently removed. Users can review what changes were made before deletion while the todo is in trash. This accessibility helps users decide whether to restore or permanently delete the todo. Once the todo is permanently deleted, the history becomes inaccessible as described in the cascade deletion rule. Restoring a todo from trash does not affect history accessibility.

### Partial Field Change Recording

Each history entry records only the fields that were actually changed during an edit operation. If a user edits only the title, the history entry records the title change and leaves other field change records empty. If multiple fields are changed in a single edit, all changed fields are recorded in that entry. Fields that were not modified during an edit are not recorded in the history entry. This allows users to see exactly what was modified in each edit. Empty or unchanged field records are not stored in the history entry.

### Restore Preserves History Integrity

When a user restores a todo from the trash, the todo's complete edit history is preserved intact. All history entries created before the todo was deleted remain accessible after restoration. The restoration operation does not create a new history entry or modify existing entries. The history timeline remains continuous, showing edits made before deletion, the deletion event, and any edits made after restoration. Users can view the full history of a restored todo as if it was never deleted. The restoration does not affect the timestamps or content of existing history entries.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Registration and Initial Todo Creation

A new user can register an account by providing an email address and password. After successful registration, the user can immediately create their first todo. The todo requires a title and may include an optional description, start date, and due date. Upon creation, the todo is marked as incomplete by default. The user can then view their todo in the paginated list, which displays the title, completion status, start date if set, due date if set, and creation date. This end-to-end scenario covers the complete journey from account creation to first todo management.

### Todo Editing and Completion Workflow

A user can edit an existing todo's title, description, start date, or due date. Each edit automatically creates a history entry that records when the edit was made and what changes were applied. The user can view the full edit history sorted from most recent to oldest, seeing what the title, description, start date, and due date were changed to for each edit. The user can mark the todo as complete or toggle it back to incomplete. This multi-step workflow allows users to track how their todos evolve over time while managing completion status.

### Todo Deletion and Recovery Journey

A user can delete a todo, which moves it to the trash without permanent removal. The deleted todo no longer appears in the normal todo list. The user can view their trash as a paginated list of deleted todos. From the trash, the user can restore a todo, which returns it to the normal todo list with all its details intact. Alternatively, the user can permanently delete a todo from the trash, which removes the todo and all its edit history permanently. When a user deletes their account, all their todos including those in trash are permanently deleted along with their edit histories. This user-scenario covers the complete deletion and recovery lifecycle.