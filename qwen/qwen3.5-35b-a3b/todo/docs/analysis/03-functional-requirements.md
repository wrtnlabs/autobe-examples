**multiUserTodo — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can sign up for the application using an email address and password combination. Once registered, users log in with their email and password to access their account. Users have the ability to change their password when needed for security purposes. Users can update their display name to personalize their account identity. Each user's profile remains private—users cannot view other users' profiles since this is a private todo application. When a user decides to delete their account, all their todos are permanently removed, including those currently in the trash. The system ensures that account deletion is a complete removal with no recovery option once confirmed.

### User Sign-Up Process

Users can create a new account by providing their email address and password.
The email address must be provided in a valid format containing an @ symbol and a domain.
The email address must not already be associated with an existing user account.
The password must be provided and meet minimum security requirements for account protection.
Upon successful registration, a user account is created and the user is automatically logged in.
After sign-up, users can immediately begin creating todos with the title and optional fields.
If the email address format is invalid, the sign-up request is rejected with an appropriate message.
If the email address is already registered, the sign-up request is rejected and the user is notified.
If the password does not meet security requirements, the sign-up request is rejected.
If any required field is missing during sign-up, the request is rejected.

### User Login Process

Users can log in to their account using their registered email address and password.
The system validates the provided credentials against the stored account information.
Upon successful validation, the user is granted access to their private account and all associated data.
Users can access their todo list, create new todos, edit existing todos, and manage account settings.
If the email address does not exist in the system, the login request is rejected.
If the password is incorrect, the login request is rejected.
If both credentials are valid, the user gains full access to their private todo list and all account features.
Logged-in users can access all features available to members of the application.
Users who are not logged in cannot view or interact with any todo items.

### Password Change Functionality

Users can change their password from within their account settings.
Users must provide their current password to verify their identity before setting a new password.
The new password must meet the same security requirements as during initial registration.
Once the password is successfully changed, it becomes effective immediately for all future login attempts.
An incorrect current password prevents the password change from being processed.
After a successful password change, users must use the new password for subsequent logins.
Password changes are applied immediately and cannot be undone through the application.
Users can change their password as many times as needed without any restriction on frequency.
The system ensures the new password is different from previous passwords when possible.

### Display Name Update

Users can set or update their display name from within their account settings.
The display name is used to identify the user within the application interface and on user-generated content.
Users can choose any valid display name that is appropriate for the application.
The display name must be provided when updating and cannot be left empty.
Users can update their display name at any time without affecting account security.
The display name change takes effect immediately and is reflected throughout the application.
Users cannot view or edit other users' display names since all profiles are private.
The system accepts display names of reasonable length appropriate for display purposes.
Users retain their ability to update their display name after any account operation.

### Private User Profiles

Each user's profile is completely private and cannot be viewed by other users.
This is a private todo application where users only have access to their own data.
Users cannot browse, search, or discover other user accounts or profiles.
The privacy model ensures that all user information remains confidential and inaccessible to others.
Users have no ability to view other users' todos or account information.
Profile privacy is enforced at all levels of the application.
There is no mechanism for users to share or expose their profile information.
Each user sees only their own profile and account information when accessing the application.
Users cannot request access to view another user's profile even with permission.

### Account Deletion and Removal

Users can permanently delete their account from within their account settings.
Account deletion is a destructive operation that requires explicit user confirmation before proceeding.
When a user account is deleted, all associated data is permanently removed including all todos.
Todos in the trash are also permanently deleted as part of account deletion.
The deletion process removes all records of the user's activity from the application.
Once confirmed, account deletion is irreversible with no recovery option available.
Users must be warned that all their data will be permanently lost upon deletion.
The email address becomes available for use by a new account after deletion.
All edit history entries associated with the user's todos are permanently deleted.
The system ensures no recoverable copy of deleted account data remains.

### Email Address Identity

Each user's email address serves as the unique identifier for their account.
The email address cannot be changed once the account is created.
The email address is used as the primary method for user authentication and login.
Users manage their account identity through their email address and display name.
The email address provides the foundation for all account operations and access control.
User identity is verified through password authentication using the registered email.
Email addresses are case-insensitive when used for login purposes.
The system maintains the original email format as provided during registration.

### Password Security Requirements

Passwords must meet minimum security requirements to protect user accounts.
Password changes are validated against the same security requirements as initial registration.
The current password must be verified before any password modification is allowed.
Password storage and handling follows security best practices for protecting user credentials.
Successful password changes immediately invalidate previous password sessions.
Password security is essential for maintaining account integrity and user privacy.
The system validates password strength during both registration and password change operations.
Password requirements include minimum length and complexity standards for account protection.

### Account Access Control

Only authenticated users can access their own account and associated data.
Guest users cannot view, create, edit, or delete any todo items.
Logged-in users have access to their private todo list and account management features.
Users cannot access other users' todos regardless of their relationship or permissions.
Account access is controlled through the login system and credential validation.
Sessions maintain user access until explicitly logged out or the session expires.
Users are automatically logged out when their account is deleted.
Unauthorized access attempts to another user's data are denied by the system.

### Multi-User Privacy Model

Each user operates in complete isolation from other users in the system.
Users have no visibility into other users' accounts, profiles, or todo items.
The application enforces strict separation between user data at all levels.
Users cannot inadvertently or intentionally access information belonging to other users.
The privacy model applies to todos, edit history, and all account-related information.
Data sharing between users is not supported by the application design.
Users are responsible for their own account security and password management.
The system ensures that user data boundaries are maintained throughout all operations.

### Account Recovery and Limits

Deleted accounts cannot be recovered once the deletion process is completed.
Email addresses freed by account deletion can be registered by a new user.
There are no limits on the number of times a user can create a new account.
Users can register again with the same email address if previously deleted.
The system does not impose waiting periods between account deletion and new registration.
There is no grace period for recovering deleted account data.
Users who delete their account lose all access to their previous todos and edit history.
New accounts start with empty todo lists and no history.

### Account Status Transitions

Accounts transition from inactive (not registered) to active (registered and logged in) states.
Active accounts remain accessible until the user logs out or the session expires.
Accounts transition to deleted state upon confirmed account deletion.
Deleted accounts cannot be restored or reactivated.
Users can transition between logged in and logged out states multiple times.
Password changes occur instantaneously without affecting account status.
Display name updates do not affect account state or access permissions.
Account deletion is a one-way transition with no return path.

## Todo Operations

Users can create new todos with a required title and optional description, start date, and due date fields. All newly created todos start as incomplete by default. Users can view a paginated list showing their todos with title, completion status, dates, and creation date. Each todo displays full details including the complete description when viewed individually. Users can toggle todo completion status between complete and incomplete. Users can edit todo fields including title, description, start date, and due date at any time. Deleted todos move to the trash instead of being permanently removed immediately. Users can access their trash to view all deleted todos in a paginated list. Users can restore deleted todos from trash back to the normal todo list. Users can permanently delete todos from the trash for final removal. Users can filter their todo list by completion status showing all, only complete, or only incomplete todos. Users can sort their todo list by creation date, start date, or due date in ascending or descending order.

### Todo Creation

Users can create a new todo with a title, which is required. Users may optionally provide a description, which can be left empty. Users may optionally set a start date, which can be left empty. Users may optionally set a due date, which can be left empty. All newly created todos are marked as incomplete by default. If the title is not provided when creating a todo, the request is rejected and the todo is not created.

### Viewing Todos List

Users can view a paginated list of their own todos. Each todo in the list displays: title, completion status, start date (if set), due date (if set), and creation date. Only the user who owns a todo can view it in their list. Users cannot view other users' todos, as this is a private todo application.

### Viewing Individual Todo Details

Users can view the full details of a single todo that they own. The individual view shows: title, complete description, start date (if set), due date (if set), creation date, and completion status. Users can only access todos that belong to their own account.

### Completing and Incomplete Toggle

Users can mark a todo as complete. Users can mark a todo as incomplete. These actions toggle between the two states. A todo that is complete can be marked as incomplete again. A todo that is incomplete can be marked as complete again. This toggle applies only to todos that the user owns.

### Editing Todos

Users can edit their todo's title. Users can edit their todo's description. Users can edit their todo's start date. Users can edit their todo's due date. Every time a todo is edited, an edit history entry is automatically created to record the change. Users can only edit todos that belong to their own account.

### Soft Todo Deletion

Users can delete their own todos. When a todo is deleted, it is moved to the trash rather than being permanently removed immediately. Deleted todos no longer appear in the normal todo list. Users can access deleted todos through the trash view. Only the user who owns a todo can delete it.

### Trash Todo List

Users can view a paginated list of their deleted todos in the trash. Each todo in the trash list shows: title, completion status, original due date (if set), and the deletion date. The trash contains only todos that the user has deleted. Users cannot view other users' deleted todos in the trash, as this is a private todo application.

### Restoring Todos from Trash

Users can restore a deleted todo from the trash. When restored, the todo returns to the normal todo list and is no longer in the trash. The todo retains its original properties including title, description, dates, and completion status after restoration. Users can only restore todos that they previously deleted and that exist in their trash.

### Permanent Todo Deletion

Users can permanently delete a todo from the trash. When permanently deleted, the todo is completely removed from the system and cannot be recovered. Permanent deletion also removes all edit history associated with that todo. Once permanently deleted, the todo cannot be restored. Users can only permanently delete todos that belong to their own account.

### Completion Status Filtering

Users can filter their todo list by completion status. Users can view all todos regardless of completion status. Users can filter to show only complete todos. Users can filter to show only incomplete todos. The filter applies to the user's own todos and is combined with any other active filters or sorting options.

### Sorting by Creation Date

Users can sort their todo list by creation date. Users can sort from newest first. Users can sort from oldest first. When sorting by creation date, todos are ordered by the date they were originally created. This sorting can be combined with completion status filtering.

### Sorting by Start Date

Users can sort their todo list by start date. Users can sort from earliest start date first. Users can sort from latest start date first. Todos without a start date appear at the end when sorting by start date, regardless of sort direction. This sorting can be combined with completion status filtering.

### Sorting by Due Date

Users can sort their todo list by due date. Users can sort from earliest due date first. Users can sort from latest due date first. Todos without a due date appear at the end when sorting by due date, regardless of sort direction. This sorting can be combined with completion status filtering.

## EditHistory Operations

Every time a user edits any field of a todo, the system automatically creates a new history entry. Each history entry captures the timestamp when the edit occurred. The history records what the title was changed to if the title was modified. The history records what the description was changed to if the description was modified. The history records what the start date was changed to if the start date was modified. The history records what the due date was changed to if the due date was modified. Users can access and view the complete edit history for any of their todos. History entries display in reverse chronological order with the most recent edit appearing first. When a user permanently deletes a todo from the trash, all of that todo's edit history is also permanently deleted along with it. The edit history system ensures full accountability for todo changes without exposing sensitive information to other users.

### Automatic Edit History Creation

Every time a user edits any field of a todo, the system automatically creates a new edit history entry for that todo.

This automatic creation happens immediately when the edit is submitted and saved.

No manual action is required by the user to create an edit history entry — it occurs whenever the todo's title, description, start date, or due date is modified.

If an edit is submitted but fails validation (for example, a due date is set before the start date), no edit history entry is created because the edit was not successfully applied.

### Edit Timestamp Recording

Each edit history entry records the exact date and time when the edit was made.

The timestamp reflects when the user submitted the edit to the system.

This timestamp allows users to see when changes occurred to their todos.

The timestamp is recorded automatically by the system and cannot be manually set by users.

### Title Change Tracking

When a user edits a todo's title, the edit history entry records the new title value.

If the title is unchanged during an edit, the history entry does not include a title change record.

The history entry shows what the title was changed to when a modification occurs.

Users can view the new title value in the history entry to see how the title has evolved over time.

### Description Change Tracking

When a user edits a todo's description, the edit history entry records the new description value.

If the description is unchanged during an edit, the history entry does not include a description change record.

The history entry shows what the description was changed to when a modification occurs.

Users can view the new description value in the history entry to see how the description has evolved over time.

### Start Date Change Tracking

When a user edits a todo's start date, the edit history entry records the new start date value.

If the start date is unchanged during an edit, the history entry does not include a start date change record.

If a start date is being removed (changed from a date to empty), the history entry records this change.

The history entry shows what the start date was changed to when a modification occurs.

### Due Date Change Tracking

When a user edits a todo's due date, the edit history entry records the new due date value.

If the due date is unchanged during an edit, the history entry does not include a due date change record.

If a due date is being removed (changed from a date to empty), the history entry records this change.

The history entry shows what the due date was changed to when a modification occurs.

### Edit History Viewing

Users can view the complete edit history for any todo that they own.

Users cannot view the edit history of todos they do not own — todos are completely private.

The edit history view displays all history entries for the todo in a list format.

Each history entry shows the edit timestamp and which fields were modified during that edit.

### Chronological History Display

Edit history entries are displayed in chronological order when viewing history.

The history shows the sequence of all edits that have been made to the todo over time.

This chronological display allows users to see how the todo has evolved from creation to the present.

### Reverse Chronological Sorting

Edit history entries are sorted in reverse chronological order.

The most recent edit appears at the top of the history list.

The oldest edit appears at the bottom of the history list.

This reverse chronological ordering ensures that users can quickly see the latest changes to their todo.

### Todo Edit Accountability

The edit history system ensures full accountability for all changes made to todos.

Every edit creates a permanent record of what changed and when it changed.

This accountability allows users to track the evolution of their todos over time.

Edit history provides transparency for all modifications to todo content.

### Permanent Delete History Removal

When a user permanently deletes a todo from the trash, all of that todo's edit history is also permanently deleted.

The edit history is deleted along with the todo — it does not persist after permanent deletion.

This cleanup ensures that no orphaned edit history remains after a todo is permanently removed.

Once permanently deleted, neither the todo nor its edit history can be recovered.

### Edit History Per Todo

Each todo maintains its own separate edit history.

Edit history entries are associated with the specific todo they relate to.

One todo's edit history is never mixed with another todo's edit history.

The edit history is an intrinsic part of each todo and exists only for that todo.

### Field Modification Logging

Each edit history entry logs which fields were modified during that edit.

If multiple fields are changed in a single edit, all changes are recorded in the same history entry.

Fields that were not modified during an edit do not appear in that history entry.

This selective logging ensures that each history entry accurately reflects only the changes that actually occurred.

### Privacy Edit Visibility

Edit history is completely private and tied to each user's own todos.

Users can only view the edit history of todos they own.

No one else can view a user's edit history for their todos.

Edit history entries are never exposed or shared with other users.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users may encounter several error scenarios during account operations. When signing up, the system rejects attempts to register with an email address that is already associated with an existing account. Users receive feedback when providing an invalid email format or leaving the password field empty. During login, the system denies access when users enter incorrect email-password combinations or attempt to log in with an account that has been deleted. For password changes, the system prevents updates when the current password verification fails or when the new password is identical to the existing password. Account deletion presents a critical edge case: users must understand that deleting their account permanently removes all todos and edit history, including items in the trash. This irreversible action cannot be undone once confirmed. Profile editing may fail if users provide invalid display name formats or if the system temporarily cannot save changes. Users receive clear error messages explaining why their account operation failed and what steps to take next.

### Account Creation Error Handling

When a user attempts to sign up with an email address that is already associated with an existing account, the system rejects the registration request. The user receives a clear message indicating that the email address is already in use. If the user provides an email address with invalid format, the system rejects the registration and displays an error explaining the required format. Users must enter a password during account creation; if the password field is left empty, the system prevents account creation and prompts the user to provide a password.

### Login and Deleted Account Handling

When users attempt to log in with incorrect email-password combinations, the system denies access and displays a generic error message without revealing whether the email address exists or whether the password is incorrect. When users attempt to log in with an account that has been permanently deleted, the system treats this as an invalid login attempt and denies access with the same generic message. This approach maintains security by not exposing information about account deletion status.

### Password Change Error Conditions

When users attempt to change their password, the system verifies the current password before allowing any update. If the verification fails, the system rejects the change request and displays an appropriate error. The system also prevents users from setting a new password that is identical to their existing password; this request is rejected with a message indicating that the new password must differ from the current one.

### Profile Management Errors

When users attempt to update their display name, the system validates the input and rejects updates if the display name format is invalid. The system also encounters temporary failures when saving profile changes; in such cases, the system displays an error message indicating that the update could not be completed. Users receive clear feedback when their profile update fails, including guidance on what action to take next.

### Account Deletion Confirmation and Warnings

When users initiate account deletion, the system presents a confirmation dialog that explicitly warns about the permanent nature of this action. The warning message clearly states that deleting the account will permanently remove the user's profile information. Users must explicitly confirm this deletion after reading the warning.

The system emphasizes that this action is irreversible and cannot be undone once confirmed. Users who are uncertain about proceeding can cancel the operation without any data loss. This confirmation process ensures that users fully understand the consequences before taking this irreversible action.

Note: Account deletion only removes the user account itself, not the todos previously created by that user. Todo deletion follows a separate process using soft delete, which allows users to recover deleted todos within a retention period.

## Todo Error Scenarios

Todo operations have multiple error scenarios that users must encounter. When creating a new todo, the system rejects the request if the title field is left empty, as titles are required for every todo. Users attempting to view other users' todos receive access denied errors, since each user's todos are completely private and cannot be shared or viewed by others. During completion toggling, users may attempt to mark a todo that doesn't exist or belongs to another account, triggering validation errors. Editing operations fail when users try to modify a todo that has been permanently deleted or is not accessible to them. Deletion operations have edge cases: soft deletion removes todos from the normal list but keeps them in trash, while permanent deletion from trash removes the todo and its entire edit history simultaneously. Users may attempt to restore a todo that has already been permanently deleted, which the system must reject. Filtering and sorting operations produce edge cases when todos lack start dates or due dates—these items appear at the end of sorted lists. Invalid filter selections or sorting combinations that produce no results display an empty list with appropriate messaging rather than errors.

### Todo Creation Title Validation

Users can create a todo with a title, description, start date, and due date. The title field is required for every todo.

If the user attempts to create a todo without providing a title, the system rejects the request and does not create the todo. The user receives feedback that the title field cannot be left empty.

If the user provides a title, the todo is created with the provided title and saved to their todo list. The todo is marked as incomplete by default.

### Private Todo Access and Modification

Each user's todos are completely private. Users can only view, edit, complete, or delete their own todos.

If a user attempts to view a todo that belongs to another user, the system rejects the request and denies access. The user receives a message indicating they do not have permission to view that todo.

If a user attempts to modify a todo that they do not own (including editing, completing, or deleting), the system rejects the request. Users can only modify their own todos.

If a user attempts to view or modify a todo that does not exist, the system rejects the request. The todo may have been permanently deleted or the request contains an invalid todo.

### Soft Delete to Normal List Transition

Users can delete their own todos. When deleted, todos are moved to the trash rather than being permanently removed.

After deletion, the todo no longer appears in the normal todo list. Users cannot see the deleted todo when viewing their regular todo list.

Users can view a list of their deleted todos in the trash. The trash list is paginated, allowing users to browse their deleted todos in pages.

Users can restore a deleted todo from the trash. When restored, the todo returns to the normal todo list with all its original data intact.

### Permanent Deletion from Trash

Users can permanently delete a todo from the trash. This action removes the todo from the system entirely.

When a todo is permanently deleted from the trash, all associated edit history entries are also permanently deleted. The edit history cannot be recovered after permanent deletion.

The system requires explicit confirmation before permanently deleting a todo from the trash. Users must confirm they want to permanently delete the todo, as this action cannot be undone.

Once permanently deleted, the todo no longer appears anywhere in the system and cannot be restored.

### Already Deleted Todo Restoration Attempt

Users can restore a deleted todo from the trash back to their normal todo list.

If a user attempts to restore a todo that has already been permanently deleted from the trash, the system rejects the request. The todo no longer exists and cannot be restored.

If a user attempts to restore a todo from the trash that they do not own, the system rejects the request. Users can only restore their own deleted todos.

Successfully restored todos return to the normal todo list with their previous completion status and all other attributes preserved.

### Sorting with Missing Start Date

Users can sort their todo list by creation date, start date, or due date.

When sorting by start date, todos that do not have a start date set are displayed at the end of the list, after todos with start dates.

Sorting supports both ascending order (earliest first) and descending order (latest first) when sorting by start date.

The sort position for todos without start dates remains consistent regardless of ascending or descending order—they always appear at the end.

### Sorting with Missing Due Date

When sorting by due date, todos that do not have a due date set are displayed at the end of the list, after todos with due dates.

Sorting supports both ascending order (earliest first) and descending order (latest first) when sorting by due date.

The sort position for todos without due dates remains consistent regardless of ascending or descending order—they always appear at the end.

Todos without a due date can still be sorted by creation date and will appear in the appropriate position based on when they were created.

### Empty Filter Results Display

Users can filter their todo list by completion status: all todos, only complete todos, or only incomplete todos.

If a filter selection results in no matching todos, the system displays an empty list with a message indicating no todos match the current filter.

If sorting and filtering combined result in no matching todos, the system displays an empty list with a message rather than showing an error.

Users can clear filters to return to viewing all their todos. The system transitions smoothly between filtered and unfiltered views without errors.

## EditHistory Error Scenarios

Edit history operations have specific error scenarios that users may encounter. When viewing edit history, users may attempt to access history for a todo that doesn't exist or is not accessible to them, resulting in access denied errors. The system maintains edit history entries sorted from most recent to oldest, and users may navigate through paginated history entries. A critical edge case occurs when permanently deleting a todo from trash—the entire edit history associated with that todo is also permanently deleted and cannot be recovered. Users may try to view edit history for a todo that was never edited, resulting in an empty history display. If an edit operation fails due to validation errors, no edit history entry is created for that failed attempt. Users may attempt to view edit history after the todo has been deleted (soft delete or permanent delete), and the system must handle these cases appropriately by either showing accessible history or denying access based on the todo's current state. Paginated history views may show zero entries or handle boundary cases when history spans multiple pages.

### Viewing Edit History

Users can view the edit history of any todo they own.
Each history entry shows when the edit was made and what fields were changed.
The history is sorted in reverse chronological order, with the newest changes displayed first.
History entries are paginated when there are many edits on a single todo.
Users can navigate through multiple pages of history entries using pagination controls.
The system displays zero history entries when a todo has never been edited after its creation.

### Non-Existent Todo History Access

If a user requests edit history for a todo that does not exist, the request is rejected.
The system returns an error indicating that the todo cannot be found.
No history is displayed when the todo reference is invalid or has been permanently removed.

### Inaccessible Todo History Denial

Users can only view edit history for todos they own.
If a user attempts to view history for a todo they do not own, the request is rejected.
The system denies access and does not reveal any information about the todo or its history.
This ensures private todo data remains inaccessible to other users.
Users receive an access denied message when attempting to view another user's todo history.

### Permanent Todo Deletion and History Cleanup

When a user permanently deletes a todo from trash, all associated edit history is also permanently removed.
The history cleanup occurs automatically as part of the permanent deletion process.
Once permanently deleted, neither the todo nor its edit history can be recovered.
Users are warned that permanent deletion will remove all historical records of changes made to the todo.

### Untouched Todo Empty History

Todos that have never been edited after creation display an empty edit history.
The system shows no history entries when a todo's title, description, start date, and due date have never changed from their original values.
Users can still view the empty history section, which confirms the todo exists and is accessible.
An empty history does not indicate an error—it simply means no edits have been made.

### Failed Edit and No History Creation

When an edit operation fails due to validation errors, no history entry is created for that attempt.
The system only records successful edits that are committed to the todo.
If a user submits an invalid edit (such as a missing required field), the history remains unchanged.
This ensures the edit history reflects only valid, completed changes to the todo.

### Soft-Deleted Todo History Access

Soft-deleted todos (moved to trash) remain accessible for edit history viewing.
Users can still view the history of todos that are in their trash folder.
However, if a todo is permanently deleted from trash, its history is also permanently deleted.
After permanent deletion, no history can be accessed or recovered for that todo.

### Paginated History Navigation

When a todo has many edits, history entries are displayed in paginated groups.
Each page shows a fixed number of history entries, sorted in reverse chronological order.
Navigation controls allow users to move between pages of history entries.
The first page always displays the most recent edit history entries.
Boundary cases include pages with zero entries when history ends mid-navigation, and pages showing the oldest entries on the final page.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Account Setup and Onboarding

A new user starts their journey by creating an account. The user provides their email address and a password to sign up. Once the account is created, the user can log in using the same email and password. After successful login, the user is presented with an empty todo list and can begin creating their first todo.

If the user attempts to sign up with an email that is already in use, the signup request is rejected with an appropriate message. If the email format is invalid or the password is missing, the signup request is rejected. After account creation, the user must log in before they can access any todo features.

The user can change their password at any time from their account settings. If the new password does not meet requirements or the current password is incorrect, the password change request is rejected. The user can also update their display name, which appears throughout the application when the user creates or edits todos.

Users cannot view other users' profiles in this private todo application. Each user's data and todos remain completely private and isolated from other users.

### Todo Creation and Initial Viewing

A user creates their first todo as part of their initial workflow. The user provides a title (required), an optional description, and optional start and due dates. The todo is automatically marked as incomplete upon creation and is associated with the creating user.

If the title is missing, the todo creation request is rejected. The user can then view the newly created todo in their todo list, which displays the title, completion status, start date (if set), due date (if set), and the creation date.

The user can view the todo list, which is paginated to show a subset of todos at a time. Within the list view, the user can filter todos by completion status to see all todos, only complete todos, or only incomplete todos. The user can also sort the todo list by creation date (newest first or oldest first), start date (earliest first or latest first), or due date (earliest first or latest first). Todos without start or due dates appear at the end when sorting by those fields.

When the user selects a specific todo from the list, they can view its complete details including the full description. The user can also see the todo's current completion status and all dates that have been set.

### Todo Editing and Completion Workflow

A user who has existing todos can go through a complete edit and completion workflow. The user edits a todo's title, description, start date, or due date. Every time the user edits a todo, the system automatically records an edit history entry for that todo.

Each edit history entry records when the edit was made, what fields were modified, and what the values were before and after the edit. The user can view the complete edit history of any todo, with history entries sorted in reverse chronological order.

The user can toggle a todo's completion status between complete and incomplete. When marking a todo complete, the user can later mark it incomplete again if their plans change. This toggle operates as a simple two-state transition.

If the user attempts to edit a todo that does not exist, the edit request is rejected. If the user tries to edit a todo they do not own (which cannot occur in this private application), the request is rejected.

### Todo Deletion and Trash Management

A user who wants to remove a todo initiates the deletion process. The user can delete any of their own todos from the normal todo list. When deleted, the todo is moved to the trash rather than being permanently removed. The todo no longer appears in the normal todo list but remains accessible in the trash.

The user can view their trash, which shows all deleted todos. The trash list is paginated and displays each todo's title, completion status, start date (if set), due date (if set), and deletion date.

From the trash, the user can restore a todo back to the normal todo list. When restored, the todo reappears in the normal todo list with all its original properties intact. Alternatively, the user can permanently delete a todo from the trash.

When a todo is permanently deleted from the trash, the todo and its entire edit history are permanently removed from the system. If the user attempts to permanently delete a todo that is not in the trash, the request is rejected.

### Complete User Lifecycle Journey

A complete user journey involves the full lifecycle of a todo from creation to eventual removal. The user signs up with email and password, logs in, and creates their first todo with a title and optional details. The user can then view the todo in their list, edit its properties, and mark it as complete or incomplete as needed.

When the todo is no longer needed, the user can delete it to move it to the trash. At any point, the user can view the todo's edit history to see all changes that have been made. From the trash, the user can either restore the todo back to the normal list or permanently delete it along with its history.

Throughout this entire journey, the user can apply filters and sorting to their todo list to find specific todos. The user can also update their profile display name and change their password as needed.

At any point, if the user decides to delete their account, all their todos (including those in the trash) and their complete edit history are permanently deleted from the system. This account deletion is a one-time action that cannot be undone.

### List Filtering and Sorting

A user explores the filtering and sorting capabilities available for their todo list. The user can filter todos by completion status to view all todos, only completed todos, or only incomplete todos. This filtering applies across the entire todo list regardless of pagination.

The user can sort todos by creation date, with options to show newest first or oldest first. When sorting by start date, todos without a start date appear at the end of the list. When sorting by due date, todos without a due date appear at the end of the list.

The user can combine filtering and sorting to find specific todos. For example, the user can view only incomplete todos and sort them by due date (earliest first) to prioritize upcoming tasks. The filtering and sorting options are available on both the normal todo list view and the trash list view.

If the user applies a filter that results in no matching todos (such as viewing only complete todos when all todos are incomplete), the system displays an empty list rather than an error message. The pagination continues to function normally, showing zero todos per page.