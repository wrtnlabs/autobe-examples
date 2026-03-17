**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address and password during signup. Users log in to the application using their registered email and password credentials. Once authenticated, users can change their password to maintain account security. Users have the ability to edit their display name which appears in their profile. Each user maintains a private profile that cannot be viewed by other users. Users can delete their entire account when they no longer wish to use the application. When a user deletes their account, all their todos are permanently removed including those in the trash. The system ensures that each user's data remains isolated from other users. Account deletion is irreversible and removes all associated data immediately.

### Account Registration

Users can create an account by signing up with an email address and password. The email address is required and must be unique across all registered users. The password is required and is used to authenticate the user during login. Upon successful registration, the user account is created and the user can immediately log in to the application. The system validates that the email address has not already been registered before creating the account.

### User Authentication

Users can log in to the application using their registered email address and password credentials. The system validates the provided credentials against the stored account information. When the email and password match an existing account, the user is granted access to the application. When the credentials do not match any existing account, the login request is rejected. Only authenticated users can access their own todos and profile information.

### Password Management

Authenticated users can change their password to maintain account security. The password change operation requires the user to provide their current password for verification. When the current password is verified successfully, the user can set a new password. The new password replaces the old password immediately. After a successful password change, the user must use the new password for all subsequent login attempts.

### Profile Management

Each user has a profile containing a display name. Users can edit their own display name at any time after account creation. The display name is required and appears in the user's profile. Users cannot view other users' profiles as this is a private todo application. Each user's profile information is isolated and accessible only to that user. The system ensures that profile data remains private and is not shared with or visible to other users.

### Account Deletion

Users can delete their entire account when they no longer wish to use the application. Account deletion is irreversible and cannot be undone. When a user deletes their account, all their todos are permanently removed from the system. This includes todos in the normal list and todos in the trash. All edit history associated with the user's todos is also permanently deleted. The account deletion process removes all data associated with the user immediately. After account deletion, the user cannot recover any of their data or restore their account. Each user's data remains completely isolated from other users throughout the account lifecycle.

## Todo Operations

Users can create new todos with a required title and optional description, start date, and due date. Newly created todos start in an incomplete state by default. Users can view a paginated list of their own todos showing title, completion status, and relevant dates. Users can view individual todo details including the full description. Users can toggle a todo between complete and incomplete states. Users can edit any todo's title, description, start date, and due date. Users can soft delete todos which removes them from the normal list but keeps them in trash. Users can view a paginated list of their deleted todos in the trash. Users can restore todos from trash back to the normal todo list. Users can permanently delete todos from the trash which removes them completely. Users can filter their todo list by completion status showing all, complete only, or incomplete only. Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Todos without start or due dates appear at the end when sorting by those fields. Each user's todos remain completely private and inaccessible to other users.

### Todo Creation

Users can create a new todo with a title, which is required.
Users can optionally provide a description when creating a todo.
Users can optionally set a start date when creating a todo.
Users can optionally set a due date when creating a todo.
Newly created todos are marked as incomplete by default.
If the title is not provided, the todo creation request is rejected.

### Todo List Viewing

Users can view a paginated list of their own todos.
Each todo in the list displays the title, completion status, start date (if set), due date (if set), and creation date.
Users can filter the todo list to show all todos.
Users can filter the todo list to show only complete todos.
Users can filter the todo list to show only incomplete todos.
Users can sort the todo list by creation date in newest first order.
Users can sort the todo list by creation date in oldest first order.
Users can sort the todo list by start date in earliest first order.
Users can sort the todo list by start date in latest first order.
Users can sort the todo list by due date in earliest first order.
Users can sort the todo list by due date in latest first order.
When sorting by start date, todos without a start date appear at the end of the list.
When sorting by due date, todos without a due date appear at the end of the list.

### Todo Detail Viewing

Users can view a single todo to see all its details.
The detail view displays the full description of the todo.
The detail view displays the title, completion status, start date (if set), due date (if set), and creation date.
Users can view the edit history of any of their todos.
Edit history entries are displayed from most recent to oldest.

### Completion Status Management

Users can mark a todo as complete.
Users can mark a todo as incomplete.
The completion status toggles between complete and incomplete states.
Users can change the completion status of any of their own todos.

### Todo Editing

Users can edit the title of their own todos.
Users can edit the description of their own todos.
Users can edit the start date of their own todos.
Users can edit the due date of their own todos.
Every edit to a todo creates a history entry automatically.
Each history entry records when the edit was made.
Each history entry records what the title was changed to, if the title was changed.
Each history entry records what the description was changed to, if the description was changed.
Each history entry records what the start date was changed to, if the start date was changed.
Each history entry records what the due date was changed to, if the due date was changed.

### Todo Deletion and Trash Management

Users can delete their own todos.
Deleted todos are soft deleted and not permanently removed immediately.
Deleted todos no longer appear in the normal todo list.
Deleted todos appear in the trash.
Users can view a paginated list of their deleted todos in the trash.
Users can restore a deleted todo from the trash.
Restored todos return to the normal todo list.
Users can permanently delete a todo from the trash.
Permanently deleting a todo also deletes its edit history.
Once permanently deleted, a todo cannot be recovered.

### Todo Privacy

Each user's todos are completely private.
Users can only see their own todos.
Users cannot view another user's todos.
Users cannot access another user's todos in any way.
Users cannot share their todos with other users.
There is no functionality to view, access, or share another user's todos.

## EditHistory Operations

Every edit made to a todo creates a new history entry automatically. Each history entry records the timestamp of when the edit occurred. History entries capture what the title was changed to if the title was modified. History entries capture what the description was changed to if the description was modified. History entries capture what the start date was changed to if the start date was modified. History entries capture what the due date was changed to if the due date was modified. Users can view the complete edit history for any of their todos. History entries display in order from most recent to oldest. When a todo is permanently deleted from trash its edit history is also removed. Edit history provides a complete audit trail of all changes made to a todo.

### Automatic History Entry Creation

When a user edits a todo, a history entry is automatically created without any manual action required. Each history entry records the timestamp of when the edit was made. Each history entry records what the title was changed to if the title was modified during the edit. Each history entry records what the description was changed to if the description was modified during the edit. Each history entry records what the start date was changed to if the start date was modified during the edit. Each history entry records what the due date was changed to if the due date was modified during the edit. Only fields that were actually changed are recorded in the history entry. This automatic recording provides a complete change audit trail for every todo.

### Edit History Viewing

Users can view the full edit history of any of their todos. The edit history displays all recorded changes made to the todo since its creation. History entries are displayed in order from most recent to oldest, with the latest edit appearing first. Each history entry shows the timestamp and the values that were changed during that edit.

### History Deletion on Permanent Todo Delete

When a user permanently deletes a todo from the trash, the todo's edit history is also permanently deleted. The history deletion occurs automatically as part of the permanent deletion process. Once a todo and its history are permanently deleted, they cannot be recovered.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email address that is already registered receive an error indicating the account already exists. Login attempts fail when users provide incorrect email or password combinations. Users cannot change their password without first being properly authenticated. When users delete their account, the system permanently removes all associated todos including those in the trash, and this action cannot be undone. Users cannot view other users' profiles as the application maintains strict privacy between accounts. Editing a display name requires the user to be logged in and authenticated. Account deletion is blocked if the system cannot verify the user's identity. Users cannot access profile information for accounts that do not exist. The system rejects signup attempts where required fields like email or password are missing. Password changes require the user to provide their current password for verification.

### Account Registration Errors

When users attempt to sign up with an email address that is already registered to an existing account, the system rejects the registration and displays an error indicating the email is already in use. Signup attempts are rejected when required fields such as email or password are missing or empty. The system validates that both email and password are provided before processing any registration request. If either field is absent, the request fails with an appropriate error message.

### Authentication Errors

Login attempts fail when users provide incorrect email or password combinations. The system does not reveal whether the email exists or the password is wrong, returning a generic authentication failure message instead. Users cannot access their account or perform any authenticated operations until they successfully log in with valid credentials. Failed login attempts do not lock the account or impose delays unless explicitly configured.

### Password Change Errors

Users cannot change their password without first being properly authenticated and logged in. Password change requests require the user to provide their current password for verification. If the current password is incorrect or missing, the password change request is rejected. The system validates the user's identity before allowing any password modification to prevent unauthorized account access.

### Profile Editing Errors

Editing a display name requires the user to be logged in and authenticated. Users cannot update their display name to an empty value; the system rejects requests where the display name is blank or contains only whitespace. Profile editing operations are blocked if the user's session has expired or if identity cannot be verified. All profile modifications require active authentication to ensure account security.

### Account Deletion Errors

Account deletion is blocked if the system cannot verify the user's identity. Users cannot delete their account without being properly authenticated. When users delete their account, the system permanently removes all associated todos including those in the trash, and this action cannot be undone. The cascade deletion includes all edit histories associated with the user's todos. Account deletion requires successful identity verification before proceeding.

### Privacy and Access Control Errors

Users cannot view other users' profiles as the application maintains strict privacy between accounts. Any attempt to access another user's profile information is rejected with an error indicating the profile is not accessible. Users cannot access profile information for accounts that do not exist; the system returns an error indicating the profile cannot be found. Privacy boundaries are enforced at all times, preventing any cross-user data access. Profile privacy violations are blocked by the system, ensuring each user's data remains completely private.

## Todo Error Scenarios

Users cannot create todos without providing a title, as this field is required. Attempting to edit or delete a todo that belongs to another user results in an access denied error. Users cannot restore todos from the trash that do not belong to them. Permanently deleting a todo removes both the todo and its entire edit history. Users cannot view todos that belong to other users due to privacy restrictions. Creating a todo with an empty description is allowed since this field is optional. Setting start or due dates in the past is permitted by the system. Toggling a todo's completion status works regardless of its current state. Users cannot access todos that have been permanently deleted from the trash. Filtering and sorting operations only apply to todos the user owns.

### Todo Creation Validation

Users cannot create a todo without providing a title, as this field is required. The request is rejected if the title is missing or empty.

Users can create a todo with an empty description, as this field is optional. Leaving the description blank is permitted.

Users can set start dates and due dates in the past. The system does not prevent assigning past dates to either field.

Users can create a todo with only a title, leaving description, start date, and due date all empty. All optional fields may be omitted during creation.

### Todo Access and Ownership

Users can only view their own todos. Attempting to view a todo that belongs to another user results in an access denied error.

Users can only edit their own todos. Attempting to edit a todo that belongs to another user results in an access denied error.

Users can only delete their own todos. Attempting to delete a todo that belongs to another user results in an access denied error.

All todo operations validate ownership before proceeding. The system enforces that users can only access todos they own.

Each user's todos are completely isolated from other users. There is no way to view, access, or interact with another user's todos through any operation.

### Todo Deletion and Trash Operations

When a user deletes a todo, it is soft deleted and no longer appears in the normal todo list. The todo remains accessible in the trash.

Users can only restore todos from the trash that belong to them. Attempting to restore a todo that belongs to another user results in an access denied error.

When a user permanently deletes a todo from the trash, the todo and its entire edit history are removed. The history entries are deleted along with the todo.

Users cannot access todos that have been permanently deleted from the trash. Once permanently deleted, the todo and all its data are unrecoverable.

The trash list is paginated, showing only the deleted todos that belong to the viewing user.

When a todo is permanently deleted, its edit history entries are also removed to prevent orphaned history records. No history entries remain after permanent deletion.

### Todo Completion and List Operations

Users can toggle a todo's completion status between complete and incomplete. The toggle works regardless of the todo's current state.

Filtering operations only apply to todos the user owns. Users cannot filter or view todos belonging to other users.

Sorting operations only apply to todos the user owns. Users cannot sort or arrange todos belonging to other users.

Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos. Filtering is restricted to the user's own todos.

Users can sort their todo list by creation date, start date, or due date in ascending or descending order. Sorting is restricted to the user's own todos.

## EditHistory Error Scenarios

Users cannot view edit history for todos that belong to other users. Attempting to access edit history for a permanently deleted todo fails because the history is removed along with the todo. Viewing edit history for a todo with no edits shows an empty history list. Edit history entries are automatically created for every todo modification. Users cannot manually delete or modify individual edit history entries. The system records all field changes including title, description, start date, and due date modifications. Edit history is sorted with the most recent entries appearing first. Accessing edit history requires the todo to exist and belong to the requesting user. History entries capture what changed and when the change occurred.

### Edit History Access Control

Users can only view the edit history of their own todos. Attempting to access the edit history of a todo that belongs to another user is rejected. The system validates that the todo exists before allowing access to its edit history. If the requested todo does not exist, the request to view edit history fails. Each user's edit history is completely isolated from other users, ensuring privacy. Users cannot bypass ownership checks to view another user's todo edit history.

### Edit History Deletion Behavior

When a todo is soft deleted and moved to trash, its edit history is retained and remains accessible to the user. When a todo is permanently deleted from the trash, its edit history is also permanently deleted and cannot be recovered. Permanent deletion of a todo triggers a cascade that removes both the todo and all associated edit history entries. Soft deleted todos maintain their complete edit history until permanent deletion occurs.

### Edit History Creation and Immutability

Edit history entries are automatically created every time a todo is modified. Users cannot manually create, delete, or modify individual edit history entries. Each edit history entry is immutable once created and cannot be altered. If a todo has never been edited, viewing its edit history displays an empty list. The system automatically tracks all modifications without requiring user action to enable edit history.

### Edit History Change Recording

Each edit history entry records all fields that were changed during the modification. The system captures the new value for each modified field including title, description, start date, and due date. If a field was not changed during an edit, that field is not recorded in the history entry. Each history entry includes a timestamp indicating when the edit was made. The edit history provides a complete record of all modifications made to the todo.

### Edit History Viewing and Sorting

Edit history entries are displayed in reverse chronological order with the most recent edits appearing first. Users can view the full edit history of their todos with pagination support. The pagination applies to the edit history list when a todo has many edit entries. Users can navigate through paginated edit history to view all past modifications.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### Complete Todo Lifecycle

Users can create a todo with a required title and optional description, start date, and due date. Newly created todos are incomplete by default.

Users can edit their todo's title, description, start date, and due date at any time. Every edit is automatically recorded in the todo's edit history with the timestamp and the new values.

Users can mark a todo as complete or mark a complete todo as incomplete. This is a simple toggle between two states.

Users can delete their own todos. Deleted todos are moved to trash and no longer appear in the normal todo list.

Users can view their trash to see all deleted todos. The trash list is paginated.

Users can restore a deleted todo from the trash. Restored todos return to the normal todo list.

Users can permanently delete a todo from the trash. Permanently deleting a todo also deletes its edit history.

When users delete their account, all their todos including those in trash are permanently deleted along with their edit histories.

### Account Management Journey

Users can sign up for an account by providing an email address and password.

Users can log in to their account using their email address and password.

Users can view and edit their own profile, which includes their display name. Users cannot view other users' profiles.

Users can change their password while logged in.

Users can delete their account. Account deletion permanently removes the user's account, all their todos (including those in trash), and all edit histories.

Each user's todos are completely private. Users can only see and access their own todos. There is no way to view, access, or share another user's todos.

### Todo Organization Workflow

Users can view a paginated list of their own todos. Each todo in the list shows the title, completion status, start date (if set), due date (if set), and creation date.

Users can view a single todo to see all its details including the full description.

Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos.

Users can sort their todo list by creation date (newest first or oldest first), start date (earliest first or latest first), or due date (earliest first or latest first).

When sorting by start date, todos without a start date appear at the end of the list.

When sorting by due date, todos without a due date appear at the end of the list.

Users can view the full edit history of any of their todos. History entries are sorted from most recent to oldest.