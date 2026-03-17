**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address and password. Users log in to the system using their registered email and password. Users can change their password at any time after logging in. Each user has a profile that includes a display name. Users can edit their display name to update how they appear in the system. Users can delete their account, which permanently removes all their data including todos in the trash. Users cannot view other users' profiles as this is a private todo application. Account operations are completely isolated so each user only accesses their own information.

### User Account Registration

Users can create a new account by providing an email address and password. The email address must be unique across all registered users. Both email and password are required fields for account creation. Upon successful registration, a new user account is created and the user is automatically logged in to the system.

### User Login and Authentication

Users can log in to the system using their registered email address and password. The system validates the provided credentials against stored account information. When valid credentials are provided, the user is granted access to their account. When invalid credentials are provided, login is rejected and the user remains unauthenticated.

### Password Change Operation

Logged-in users can change their account password at any time. The user must provide their current password for verification before setting a new password. The new password replaces the existing password for future login attempts. Password change is only available to authenticated users who have successfully verified their current password.

### User Profile Management

Each user has a profile that includes a display name. Users can view their own profile information. Users can edit their display name to update how they appear in the system. Display name changes take effect immediately after being saved. Users cannot view other users' profiles as this is a private todo application.

### Account Deletion

Users can delete their own account from the system. When an account is deleted, all todos belonging to that user are permanently removed, including todos in the trash. All edit history entries for the user's todos are also permanently deleted. Account deletion is irreversible and all associated data is permanently removed from the system.

### User Data Privacy and Isolation

Each user's data is completely isolated from other users. Users can only access their own account information, profile, and todos. Users cannot view, access, or share another user's profiles or data. Profile access is restricted so users cannot view other users' profile information. This isolation applies to all user data including account details, todos, and edit history.

## Todo Operations

Users can create a new todo with a required title and optional description. Users can optionally set a start date and due date when creating a todo. Newly created todos are incomplete by default. Users can view a paginated list of their own todos showing title, completion status, start date, due date, and creation date. Users can view a single todo to see all details including the full description. Users can mark a todo as complete or incomplete as a simple toggle between two states. Users can edit their todo's title, description, start date, and due date. Users can delete their own todos which moves them to trash instead of permanent removal. Users can view their deleted todos in the trash with pagination. Users can restore a deleted todo from trash back to the normal list. Users can permanently delete a todo from trash. Users can filter their todo list by completion status including all, complete, or incomplete todos. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without dates appear at the end when sorting by those fields. Each user can only see their own todos and cannot access another user's todos.

### Todo Creation

Users can create a new todo with a title (required) and an optional description. Users may optionally set a start date and due date when creating a todo. Newly created todos are incomplete by default. If the title is missing or empty, the creation request is rejected.

### Todo Viewing

Users can view a paginated list of their own todos. The list displays each todo's title, completion status, start date (if set), due date (if set), and creation date. Users can view a single todo to see all its details including the full description.

### Todo Completion

Users can mark a todo as complete. Users can mark a todo as incomplete. This is a simple toggle between the two states.

### Todo Editing

Users can edit their todo's title, description, start date, and due date. Every edit is recorded in the todo's edit history. If the title is empty after editing, the edit request is rejected.

### Todo Deletion and Trash

Users can delete their own todos, which moves them to trash instead of permanent removal. Users can view their deleted todos in the trash with pagination. Users can restore a deleted todo from trash back to the normal list. Users can permanently delete a todo from trash, which also deletes its edit history.

### Todo Filtering and Sorting

Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Users can sort their todo list by creation date (newest or oldest first), start date (earliest or latest first), or due date (earliest or latest first). Todos without a start date appear at the end when sorting by start date. Todos without a due date appear at the end when sorting by due date.

### Todo Privacy

Each user's todos are completely private. Users can only see their own todos. There is no way to view, access, or share another user's todos.

## TodoHistory Operations

Every time a user edits a todo, the system automatically creates a history entry. Each history entry records when the edit was made. Each history entry records what the title was changed to if it was modified. Each history entry records what the description was changed to if it was modified. Each history entry records what the start date was changed to if it was modified. Each history entry records what the due date was changed to if it was modified. Users can view the full edit history of any of their todos. History entries are sorted from most recent to oldest. When a user permanently deletes a todo from trash, its edit history is also permanently deleted. History entries only record actual changes to fields, not every view or access.

### Automatic History Entry Creation

WHEN a user edits a todo's title, description, start date, or due date, THE system SHALL automatically create a history entry for that todo.

THE history entry creation SHALL occur immediately after the edit is successfully saved.

THE system SHALL create a history entry only when actual field values change, not when a user views or accesses a todo without making modifications.

THE system SHALL NOT create history entries for todo creation, completion status changes, or deletion operations—only for edits to title, description, start date, or due date.

### History Entry Content

THE system SHALL record the timestamp of when each edit was made in every history entry.

THE system SHALL record the new title value in a history entry when the title field is modified.

THE system SHALL record the new description value in a history entry when the description field is modified.

THE system SHALL record the new start date value in a history entry when the start date field is modified.

THE system SHALL record the new due date value in a history entry when the due date field is modified.

THE system SHALL record only the fields that were actually changed in each history entry. Fields that were not modified in a particular edit SHALL NOT appear in that history entry.

### Viewing Edit History

Users SHALL be able to view the complete edit history of any todo they own.

THE system SHALL display history entries sorted from most recent to oldest, with the latest edit appearing first.

Users SHALL be able to view the edit history of todos that are in the normal list as well as todos that are in the trash.

THE edit history SHALL be visible only to the owner of the todo. Other users SHALL NOT be able to view another user's todo history.

### History Deletion on Permanent Delete

WHEN a user permanently deletes a todo from the trash, THE system SHALL also permanently delete all associated history entries for that todo.

THE system SHALL ensure that history entries cannot be accessed or viewed after the todo has been permanently deleted.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email already registered receive an error indicating the account exists. Login fails when the password does not match the stored credentials for that email address. Password changes are rejected if the current password provided does not match what is on file. Account deletion is blocked if the user still has todos in the trash that have not been permanently deleted first. Display name edits require a non-empty value, and attempts to save with blank names are rejected. Users cannot view or access other users' profiles, and any attempt to do so returns an access denied response. Session expiration during user operations requires re-authentication before actions can be completed.

### Account Registration Errors

When a user attempts to sign up with an email address that is already registered in the system, THE system SHALL reject the registration request and indicate that the email address is already in use. The user must choose a different email address to complete registration.

When a user submits a registration request that does not meet the password requirements, THE system SHALL reject the registration and indicate which requirements were not met. The user must provide a password that satisfies all requirements before the account can be created.

### Authentication Errors

When a user attempts to log in with an email and password combination where the password does not match the stored credentials for that email address, THE system SHALL reject the login attempt and indicate that the credentials are invalid. The user may retry with the correct password.

When a user provides an invalid authentication token to access protected resources, THE system SHALL reject the request and indicate that the token is invalid or expired. The user must obtain a valid authentication token to continue.

When a user's session expires during an operation, THE system SHALL reject the pending request and require the user to re-authenticate before any further actions can be completed. Any unsaved changes from the interrupted operation are lost.

### Profile Management Errors

When a user attempts to change their password and the current password provided does not match the password on file, THE system SHALL reject the password change request and indicate that the current password is incorrect. The user must provide the correct current password to proceed.

When a user attempts to update their display name with an empty or blank value, THE system SHALL reject the update and indicate that the display name cannot be empty. The user must provide a non-empty display name to save the changes.

### Cross-User Access Errors

When a user attempts to access another user's profile, THE system SHALL deny access and return an access denied response. Users cannot view, access, or retrieve any information about other users' profiles.

When a system operation references a user that does not exist, THE system SHALL reject the request and indicate that the user was not found. This applies to operations that require a valid user reference.

### Account Deletion Errors

When a user attempts to delete their account while there are todos in the trash that have not been permanently deleted, THE system SHALL block the account deletion and indicate that all trash items must be permanently deleted first. The user must empty their trash before the account can be deleted.

## Todo Error Scenarios

Creating a todo without a title is rejected since the title field is required. Editing a todo's title to an empty value fails validation and the original title is preserved. Users cannot delete todos that belong to other users, and such attempts return an access denied error. Restoring a todo from trash fails if that todo was already permanently deleted. Sorting operations with invalid date field parameters default to creation date sorting. Filtering by completion status with invalid status values shows all todos instead of returning an error. Todos without start or due dates appear at the end when sorting by those respective fields. Accessing a single todo that does not belong to the current user returns an access denied response. Soft deleted todos in trash cannot be edited until restored to the active todo list.

### Todo Creation Validation

When a user attempts to create a todo without providing a title, the system rejects the creation request. The user receives an error indicating that the title is required. No todo record is created in the system. The user must provide a non-empty title to successfully create a todo.

### Todo Title Edit Validation

When a user attempts to edit a todo and set the title to an empty value, the system rejects the edit request. The original title is preserved and no changes are applied to the todo. The user receives an error indicating that the title cannot be empty. Only edits with a non-empty title are accepted and recorded in the edit history.

### Cross-User Access Control

When a user attempts to delete a todo that belongs to another user, the system blocks the deletion operation. The user receives an access denied error. The todo remains unchanged and accessible only to its owner. Users can only delete todos that they own. When a user attempts to access a single todo that belongs to another user, the system denies access. The user receives an access denied response. No todo details are revealed to the requesting user. Users can only view todos that belong to them.

### Trash Operation Restrictions

When a user attempts to restore a todo from trash that was already permanently deleted, the restoration fails. The system indicates that the todo no longer exists. No todo record is restored to the active list. Users can only restore todos that are currently in the trash and have not been permanently deleted. When a user attempts to edit a todo that is in the trash, the system blocks the edit operation. The user receives an error indicating that the todo must be restored first. No changes are recorded in the edit history. Users must restore a deleted todo to the active list before editing its title, description, start date, or due date.

### Deletion and Permanent Removal

When a user attempts to permanently delete a todo from the trash, the system removes the todo and all its associated edit history. The todo cannot be recovered after permanent deletion. Soft deleted todos in the trash remain in a recoverable state until the user chooses permanent deletion. When a user deletes a todo, it is soft deleted and moved to the trash rather than being permanently removed. The todo no longer appears in the normal todo list but remains accessible in the trash view.

### Sorting and Filtering Behavior

When a user requests to sort their todo list by an invalid sort field, the system defaults to sorting by creation date. The user receives no error but the list is sorted by creation date instead. When a user requests to filter their todo list by an invalid completion status value, the system shows all todos without filtering. The user receives no error but all todos are displayed regardless of completion status. When sorting todos by start date, todos without a start date appear at the end of the list. When sorting todos by due date, todos without a due date appear at the end of the list. This behavior applies regardless of whether the sort order is earliest first or latest first.

### Todo Not Found Scenarios

When a user attempts to view a todo that does not exist in the system, the system returns a not found response. No todo details are revealed. When a user attempts to view a todo that exists but belongs to another user, the system returns an access denied response. No todo details are revealed. When a user attempts to perform an operation on a todo that has been permanently deleted, the system returns a not found response. The user cannot access or operate on the todo.

### Pagination Edge Cases

When a user requests a page of todos that exceeds the available results, the system returns the last available page or an empty list. No error is returned. The user receives whatever todos are available up to the requested page size. When pagination parameters request results beyond what exists, the system gracefully handles the request without failure.

## TodoHistory Error Scenarios

Viewing edit history for a todo that does not exist returns a not found error. Users cannot view the edit history of todos belonging to other users, and such attempts are blocked with access denied. When a todo is permanently deleted from trash, all associated history entries are also permanently removed. Viewing history for a todo currently in trash still returns the history entries since the todo still exists. History entries for todos that were soft deleted remain accessible until permanent deletion occurs. Attempting to access history entries that have been purged due to permanent todo deletion returns an empty result. The system maintains history integrity even when todos are restored from trash, preserving all previous edit records.

### History Access Validation

When a user attempts to view the edit history of a todo that does not exist, the system rejects the request and returns a not found error.

When a user attempts to view the edit history of a todo that belongs to another user, the system rejects the request and returns an access denied error.

Users can only view the edit history of todos that they own.

### History Lifecycle During Deletion and Restoration

When a user permanently deletes a todo from the trash, all edit history entries associated with that todo are also permanently deleted.

After a todo is permanently deleted from the trash, attempts to view its edit history return an empty result.

Soft deleted todos (todos in the trash) retain their edit history. Users can view the full edit history of todos currently in the trash.

When a todo is restored from the trash to the normal todo list, all its edit history entries are preserved and remain accessible.

### History Record Content and Ordering

Each edit history entry records the exact timestamp when the edit was made.

Each edit history entry records what the title was changed to, if the title was modified.

Each edit history entry records what the description was changed to, if the description was modified.

Each edit history entry records what the start date was changed to, if the start date was modified.

Each edit history entry records what the due date was changed to, if the due date was modified.

Edit history entries are sorted from most recent to oldest when displayed to the user.

If a todo has never been edited, viewing its edit history returns an empty list.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Registration and Initial Todo Creation

A new user begins by creating an account with an email address and password. After successful registration, the user is logged in automatically and can immediately start using the application.

The user can set or update their display name in their profile. This display name is visible only to the user and is not shared with other users.

The user can create their first todo by providing a title. The user may optionally add a description, start date, and due date. The todo is created with an incomplete status by default and is associated with the user's account.

This end-to-end user journey establishes the user account and creates the initial todo item, demonstrating the complete onboarding flow from registration to first use.

### Complete Todo Management Workflow

A registered user can manage their todos through a complete workflow that spans creation, viewing, editing, completion, and deletion.

The user creates a todo by providing a title and optionally adding a description, start date, and due date. The todo appears in the user's todo list with its completion status, dates, and creation date.

The user can view their todo list with pagination. The user may filter the list to show all todos, only complete todos, or only incomplete todos. The user may sort the list by creation date, start date, or due date in ascending or descending order.

The user can view a single todo to see all its details including the full description. The user can edit the todo's title, description, start date, or due date. Each edit creates a history entry that records when the change was made and what values were changed.

The user can view the edit history for any of their todos. History entries are sorted from most recent to oldest, showing all changes to title, description, start date, and due date.

The user can mark a todo as complete or incomplete, toggling between these two states. The user can delete a todo, which moves it to the trash and removes it from the normal todo list.

This multi-step user journey demonstrates the complete todo lifecycle from creation through editing, completion, and deletion.

### Trash Management and Permanent Deletion

A user can manage deleted todos through the trash, with options to restore or permanently delete items.

The user can view their trash, which contains all deleted todos. The trash list is paginated. Each deleted todo in the trash shows its title, completion status, dates, and deletion information.

The user can restore a deleted todo from the trash. When restored, the todo returns to the normal todo list with all its data intact, including its edit history.

The user can permanently delete a todo from the trash. When permanently deleted, the todo and all its edit history are removed and cannot be recovered.

This end-to-end user journey demonstrates the trash management workflow, including viewing deleted items, restoring them, or permanently removing them.

### Account Deletion and Data Removal

A user can delete their account, which permanently removes all associated data.

The user can request account deletion. When the account is deleted, all todos owned by the user are permanently removed, including todos in the trash. All edit history associated with the user's todos is also permanently deleted.

This deletion is irreversible. The user cannot recover their account, todos, or history after deletion.

This user journey demonstrates the complete account lifecycle from creation through permanent deletion, including the cascading removal of all user data.