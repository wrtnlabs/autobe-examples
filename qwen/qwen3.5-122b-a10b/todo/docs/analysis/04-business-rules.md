**todoApp — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Ownership and Isolation Rules

### User Data Ownership

THE system SHALL associate each todo with exactly one user as its owner.
THE system SHALL record the creating user as the todo owner at creation time.
THE system SHALL prevent reassignment of todo ownership to another user.
THE system SHALL transfer all todo ownership to the new user when a user account is deleted (if applicable).

WHEN a user creates a todo, THE system SHALL:
1. Associate the todo with the creating user
2. Record the ownership relationship
3. Prevent other users from accessing the todo

WHEN a user deletes their account, THE system SHALL:
1. Permanently delete all todos owned by the user
2. Permanently delete all trash items owned by the user
3. Permanently delete all edit history for the user's todos

### Data Isolation Rules

WHEN a user requests to view their todo list, THE system SHALL return only todos owned by that user.
WHEN a user requests to view a specific todo, THE system SHALL verify ownership before returning the todo.
WHEN a user requests to edit a todo, THE system SHALL verify ownership before allowing the edit.
WHEN a user requests to delete a todo, THE system SHALL verify ownership before allowing the deletion.
WHEN a user requests to view edit history, THE system SHALL verify ownership of the todo before returning history.

THE system SHALL enforce isolation at the user level for all data operations.
THE system SHALL prevent direct access to todos through IDs without ownership verification.
THE system SHALL isolate trash contents to the owning user only.

### Multi-User Access Controls

THE system SHALL treat each user as an isolated tenant for data purposes.
THE system SHALL prevent any cross-user data access regardless of authentication method.
THE system SHALL enforce privacy boundaries between all users in the system.

WHEN multiple users access the system simultaneously, THE system SHALL maintain complete data isolation between their respective todos.

### Data Access Restrictions

GUESTS SHALL NOT access any user's todos or profile information.
MEMBERS SHALL access only their own todos and profile information.
THE system SHALL reject any request that attempts to access another user's data.

IF a user attempts to access a todo they do not own, THE system SHALL reject the request.
IF a user attempts to access another user's profile, THE system SHALL reject the request.
IF a user attempts to access another user's edit history, THE system SHALL reject the request.
IF a user attempts to access another user's trash items, THE system SHALL reject the request.

### Privacy and Access Error Conditions

### Privacy Enforcement

THE system SHALL ensure each user's todos are completely private.
THE system SHALL provide no mechanism for users to share todos with other users.
THE system SHALL provide no mechanism for users to view other users' profiles.
THE system SHALL provide no mechanism for users to search or discover other users' todos.

WHEN a user accesses the system, THE system SHALL present only data belonging to that user.

### Error Conditions for Data Access

THE system SHALL reject the request when the requested todo does not exist.
THE system SHALL reject the request when the user does not have access to the todo.
THE system SHALL reject the request when the user attempts to access another user's data.
THE system SHALL reject the request when the user attempts to access deleted todos outside their trash.
THE system SHALL reject the request when the user attempts to access a user profile that does not exist.
THE system SHALL reject the request when the user is not authenticated.
THE system SHALL reject the request when the user session has expired.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users register with email and password to create new accounts. Email addresses must be unique among active accounts to prevent duplicate registrations. Passwords must meet security requirements including complexity and minimum length. Users can log in with their registered email and password credentials. Each user maintains a profile with a display name that they can edit at any time. Users cannot view or access other users' profiles since this is a private todo application. When a user deletes their account, all their todos including those in trash are permanently removed from the system. Account deletion is irreversible and cascades to all associated data. Login attempts may be rate-limited to prevent brute force attacks. Password changes require the user to authenticate with their current password before setting a new one.

### Email Uniqueness and Registration Rules

WHEN a user attempts to register with an email address, THE system SHALL verify that no active account exists with that email.

WHEN the email address is already registered to an active account, THE system SHALL reject the registration request.

WHEN the email address is registered to a deleted (soft-deleted) account, THE system SHALL allow the new registration.

THE system SHALL treat email addresses as case-insensitive for uniqueness comparison.

THE system SHALL prevent duplicate registrations from succeeding, even when multiple registration requests occur simultaneously.

IF the email address format is invalid, THE system SHALL reject the registration request.

IF the registration request lacks required fields (email, password), THE system SHALL reject the request.

THE system SHALL require a unique email address for each active user account.

### Authentication and Login Rules

WHEN a user attempts to log in, THE system SHALL verify the email address and password match the registered credentials.

WHEN the credentials are incorrect, THE system SHALL reject the login attempt.

WHEN multiple failed login attempts occur within a short time period, THE system SHALL apply rate limiting to prevent brute force attacks.

WHEN rate limiting is active, THE system SHALL temporarily block further login attempts from the same source.

WHEN a user successfully authenticates, THE system SHALL establish a session for the user.

WHILE the user session is active, THE system SHALL maintain the authenticated state.

WHEN the session expires, THE system SHALL require the user to re-authenticate.

THE system SHALL NOT reveal whether an email address is registered when login fails (to prevent email enumeration).

### Password Management Rules

WHEN a user changes their password, THE system SHALL require authentication with the current password.

WHEN the current password is incorrect, THE system SHALL reject the password change request.

WHEN the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN the password change is successful, THE system SHALL invalidate all existing sessions and require re-authentication.

THE system SHALL enforce password complexity requirements including minimum length and character diversity.

THE system SHALL store passwords using secure hashing (never in plain text).

IF a user forgets their password, THE system SHALL require account recovery through email verification (defined in authentication flow).

### Profile Privacy and Access Rules

WHEN a user views their profile, THE system SHALL display their display name and account information.

WHEN a user updates their display name, THE system SHALL save the change to their profile.

THE system SHALL allow display names to contain 1 to 100 characters.

WHEN a user attempts to view another user's profile, THE system SHALL deny access.

THE system SHALL enforce complete privacy isolation between user accounts.

THE system SHALL NOT expose any user information (including email or display name) to other users.

WHEN listing todos, THE system SHALL NOT include the owner's profile information in the response.

THE system SHALL ensure that no API or interface allows discovery of other users' identities.

### Account Deletion and Data Cascade Rules

WHEN a user requests account deletion, THE system SHALL permanently remove the user account.

WHEN the account is deleted, THE system SHALL cascade deletion to all associated todos including those in trash.

WHEN todos are cascade-deleted, THE system SHALL also permanently remove all associated edit history entries.

THE system SHALL NOT allow account deletion to be undone (deletion is irreversible).

WHEN a user is deleted, THE system SHALL release the email address for future registration.

IF the user has no todos, THE system SHALL still allow account deletion.

WHEN cascading deletion occurs, THE system SHALL ensure all related data is removed in a single transaction.

THE system SHALL require explicit confirmation before processing account deletion to prevent accidental data loss.

## Todo Rules

Users create todos with a required title and optional description, start date, and due date. New todos are automatically set to incomplete status upon creation. Users can toggle todo completion status between complete and incomplete states. Users can edit all todo fields including title, description, start date, and due date. Every edit to a todo creates a corresponding history entry for audit purposes. Users can delete their own todos which moves them to trash rather than permanent removal. Deleted todos no longer appear in the normal todo list view. Todos are completely private to their owner with no sharing or cross-user access. Users can only view, edit, and delete their own todos. Permanently deleting a todo from trash removes it and its history irreversibly. Start dates and due dates can be set or cleared independently. The title field is mandatory and cannot be empty when creating or updating a todo.

### Todo Creation Requirements

WHEN a user creates a todo, THE system SHALL:
1. Require a title to be provided
2. Allow an optional description to be included
3. Allow an optional start date to be set
4. Allow an optional due date to be set
5. Automatically set the completion status to incomplete
6. Associate the todo with the creating user
7. Record the creation timestamp

IF the title is not provided, THE system SHALL reject the todo creation request.

A newly created todo SHALL remain in the incomplete state until explicitly toggled by the user.

### Completion Toggle Behavior

WHEN a user toggles a todo's completion status, THE system SHALL:
1. Change the status from incomplete to complete, or from complete to incomplete
2. Preserve all other todo fields (title, description, start date, due date)
3. Record the completion status change in the todo's edit history
4. Update the todo's last modified timestamp

A todo SHALL exist in exactly one of two states: complete or incomplete.

WHEN a todo is created, THE system SHALL set its initial state to incomplete.

### Todo Editing Rules

WHEN a user edits a todo, THE system SHALL:
1. Allow updates to the title field
2. Allow updates to the description field
3. Allow updates to the start date field
4. Allow updates to the due date field
5. Create a new history entry for each edit operation
6. Preserve unmodified fields in their current state
7. Update the todo's last modified timestamp

A user SHALL be able to clear optional fields (description, start date, due date) by setting them to empty.

A user SHALL NOT be able to modify the completion status through the edit operation (use the toggle operation instead).

Every edit to a todo SHALL result in exactly one history entry being created.

### Soft Delete Mechanism

WHEN a user deletes a todo, THE system SHALL:
1. Mark the todo as deleted (soft delete) rather than permanently removing it
2. Remove the todo from the normal todo list view
3. Move the todo to the user's trash collection
4. Preserve all todo data including edit history
5. Record the deletion timestamp

A soft-deleted todo SHALL remain accessible in the trash until permanently deleted. User account deletion SHALL cascade-delete all associated todos including those in trash.

WHILE a todo is in the trash, THE system SHALL exclude it from normal list queries but include it in trash list queries.

### Trash Workflow

WHEN a user views the trash, THE system SHALL:
1. Display all soft-deleted todos belonging to the user
2. Show each deleted todo's title, deletion date, and original creation date
3. Support pagination for the trash list
4. Allow filtering by completion status (all, complete, incomplete)
5. Allow sorting by deletion date, creation date, or title

WHEN a user restores a deleted todo, THE system SHALL:
1. Remove the deletion marker from the todo
2. Return the todo to the normal todo list
3. Preserve all original todo data and edit history
4. Clear the deletion timestamp

WHEN a user permanently deletes a todo from the trash, THE system SHALL:
1. Remove the todo and all its associated edit history records
2. Perform the deletion irreversibly
3. Not include the todo in any future list queries

### Permanent Deletion Cascade

WHEN a user permanently deletes a todo from the trash, THE system SHALL:
1. Remove the todo record from the system
2. Remove all associated TodoHistory records for that todo
3. Perform the deletion immediately and irreversibly
4. Not allow recovery of the todo or its history after permanent deletion

A permanent deletion SHALL cascade to all related TodoHistory entries, ensuring no orphaned history records remain.

PERMANENT DELETION IS IRREVERSIBLE: once a todo is permanently deleted from the trash, neither the todo nor its edit history can be recovered.

### Todo Ownership and Privacy

THE system SHALL enforce that each todo belongs to exactly one user.

THE system SHALL prevent users from viewing, editing, or deleting todos that belong to other users.

THE system SHALL NOT provide any mechanism for users to share todos with other users.

THE system SHALL NOT provide any mechanism for users to view another user's profile or access their data.

A user SHALL only have access to:
1. Their own todos (active and in trash)
2. Their own profile information

Cross-user access to todo data SHALL be blocked at all query and operation levels.

THE system SHALL treat each user's todo data as completely isolated from all other users.

### Field Edit Permissions

WHEN a user updates a todo, THE system SHALL:
1. Allow the user to modify their own todo's title
2. Allow the user to modify their own todo's description
3. Allow the user to modify their own todo's start date
4. Allow the user to modify their own todo's due date
5. Create a history entry recording all field changes

A user SHALL NOT be able to edit todos that belong to other users.

A user SHALL NOT be able to edit todos that have been permanently deleted.

A user MAY edit todos that are in the trash (soft-deleted state), and such edits SHALL create history entries.

Every field modification SHALL be recorded in the history with the new value and timestamp.

## TodoHistory Rules

Every time a todo is edited, a new history entry is automatically created to record the change. Each history entry captures the timestamp when the edit occurred. History entries record which fields were changed and their new values. Users can view the complete edit history for any of their todos. History entries are displayed in reverse chronological order with most recent first. The history shows changes to title, description, start date, and due date fields. If a field was not changed in an edit, it is not recorded in that history entry. History entries are tied to the todo and cannot be viewed independently. When a todo is permanently deleted from trash, all its history entries are also permanently removed. Users cannot modify or delete individual history entries. History provides an audit trail for all modifications to a todo over time. Multiple edits to the same todo create multiple sequential history entries.

### Automatic History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a new history entry.

WHEN a todo is edited multiple times, THE system SHALL create sequential history entries for each edit.

THE system SHALL record the timestamp when each edit was made in the history entry.

THE system SHALL ensure history entries are created automatically without user intervention.

IF a todo has no edits, THE system SHALL have no history entries for that todo.

### Field Change Tracking

WHEN a history entry is created, THE system SHALL capture which fields were changed in that edit.

THE system SHALL record the new value for each field that was changed.

IF a field was not changed in an edit, THE system SHALL NOT record that field in the history entry.

THE system SHALL track changes to the title field.

THE system SHALL track changes to the description field.

THE system SHALL track changes to the start date field.

THE system SHALL track changes to the due date field.

THE system SHALL capture the exact value each changed field was updated to.

### History Viewing and Ordering

WHEN a user views a todo's edit history, THE system SHALL display all history entries for that todo.

THE system SHALL sort history entries in reverse chronological order.

THE system SHALL display the most recent history entry first.

THE system SHALL show the timestamp of each history entry.

THE system SHALL display the field-level changes captured in each history entry.

Users SHALL be able to view the complete edit history for any of their todos.

### History Integrity and Immutability

THE system SHALL tie each history entry to its parent todo.

History entries SHALL NOT be viewable independently of their parent todo.

Users SHALL NOT modify any history entry.

Users SHALL NOT delete individual history entries.

THE system SHALL maintain history as an immutable audit trail of all todo modifications.

THE system SHALL preserve the chronological sequence of all edits.

### History Deletion Cascade

WHEN a todo is permanently deleted from trash, THE system SHALL also permanently delete all its history entries.

THE system SHALL ensure no history entries remain after permanent deletion of their parent todo.

IF a todo is restored from trash, THE system SHALL restore its associated history entries.

THE system SHALL maintain the relationship between todo and history entries during restore operations.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

User accounts require a valid email address in standard email format with username and domain separated by an at symbol. Email addresses must be unique across all active user accounts to prevent duplicate registrations. Users must create passwords that meet minimum security requirements including length and character diversity. Passwords are stored securely and cannot be viewed by users or administrators after creation. Display names are required for all users and identify them within the application. Display names must contain at least one character and cannot exceed one hundred characters in length. Users can update their display names at any time without restrictions. Email addresses cannot be changed after account creation to maintain account security and integrity. Account deletion permanently removes all user data including todos and edit history.

### Email Validation Rules

WHEN a user registers with an email address, THE system SHALL validate the email format.

THE system SHALL require email addresses to follow standard email format with a username portion, at symbol (@), and domain portion.

WHEN a user attempts to register with an email address that already exists in an active account, THE system SHALL reject the registration request.

THE system SHALL ensure email addresses are unique across all active user accounts to prevent duplicate registrations.

THE system SHALL validate email format before accepting any user registration or account-related operations.

### Password Security Rules

WHEN a user creates a password during registration, THE system SHALL enforce minimum security requirements.

THE system SHALL require passwords to meet length and character diversity requirements.

THE system SHALL store passwords securely using encryption after creation.

THE system SHALL prevent users from viewing their stored password after creation.

THE system SHALL prevent administrators from viewing stored passwords.

WHEN a user changes their password, THE system SHALL require the current password for verification.

WHEN a user changes their password, THE system SHALL securely update the stored password hash.

THE system SHALL require users to create a new password when logging in after account recovery.

### Display Name Rules

THE system SHALL require all users to have a display name associated with their account.

THE system SHALL enforce a minimum of one character for display names.

THE system SHALL limit display names to a maximum of one hundred characters.

WHEN a user updates their display name, THE system SHALL accept the change without restrictions.

THE system SHALL use the display name to identify users within the application.

WHEN a user views their own profile, THE system SHALL display their current display name.

THE system SHALL validate display name length before accepting any updates.

### Account Management Rules

THE system SHALL prevent users from changing their email address after account creation to maintain account security and integrity.

WHEN a user deletes their account, THE system SHALL permanently remove all associated data.

THE system SHALL delete all todos belonging to the user when the account is deleted.

THE system SHALL delete all todos in the trash belonging to the user when the account is deleted.

THE system SHALL delete all edit history entries when the account is deleted.

THE system SHALL make account deletion irreversible once confirmed.

WHEN a user initiates account deletion, THE system SHALL require explicit confirmation before proceeding.

THE system SHALL ensure no data recovery is possible after account deletion is completed.

## Todo Validation Rules

Todos require a title that contains at least one character and cannot exceed five hundred characters. The title is the only mandatory field when creating a new todo item. Descriptions are optional and can be left empty or contain up to two thousand characters of text. Start dates and due dates are optional fields that users may choose to set for time tracking. When both start date and due date are provided, the start date must occur before or on the same day as the due date. Dates must be in valid datetime format with year, month, day, and time components. Todos without a due date are still valid and can be completed normally. Users cannot create todos with titles that are only whitespace characters. Editing a todo preserves the original creation date while updating the modification timestamp.

### Title Validation Rules

WHEN a user creates a todo, THE system SHALL require a title field.

WHEN a user provides a title, THE system SHALL require at least one non-whitespace character.

WHEN a user provides a title, THE system SHALL enforce a maximum of 500 characters.

IF a title contains only whitespace characters, THE system SHALL reject the request.

IF a title is empty or missing, THE system SHALL reject the request.

IF a title exceeds 500 characters, THE system SHALL reject the request.

### Description Validation Rules

WHEN a user creates a todo, THE system SHALL allow an optional description field.

WHEN a user provides a description, THE system SHALL allow up to 2000 characters.

WHEN a user leaves the description empty, THE system SHALL accept the request.

IF a description exceeds 2000 characters, THE system SHALL reject the request.

WHEN a user edits a todo, THE system SHALL allow clearing the description.

WHEN a user edits a todo, THE system SHALL preserve the description if not modified.

### Date Field Validation Rules

WHEN a user provides a start date, THE system SHALL validate it as a valid datetime.

WHEN a user provides a due date, THE system SHALL validate it as a valid datetime.

WHEN a user provides a date, THE system SHALL accept dates in the past, present, or future.

IF a date is in an invalid format, THE system SHALL reject the request.

WHEN a date field is left empty, THE system SHALL accept the request.

WHEN a user updates a date field, THE system SHALL accept null to clear the date.

### Date Relationship Constraint Rules

WHEN both start date and due date are provided, THE system SHALL ensure start date is on or before due date.

IF the start date is after the due date, THE system SHALL reject the request.

WHEN only a start date is provided, THE system SHALL accept the request.

WHEN only a due date is provided, THE system SHALL accept the request.

WHEN a user updates dates such that start date would be after due date, THE system SHALL reject the request.

WHEN a user clears the start date while due date is set, THE system SHALL accept the request.

### Creation Date Preservation Rules

WHEN a todo is created, THE system SHALL record the creation date.

WHEN a todo is edited, THE system SHALL preserve the original creation date.

WHEN a todo is edited, THE system SHALL record the modification timestamp.

WHEN viewing a todo, THE system SHALL display both creation date and last modification date.

WHEN a todo is restored from trash, THE system SHALL preserve the original creation date.

WHEN a todo is permanently deleted, THE system SHALL remove all associated history entries.

## TodoHistory Validation Rules

Every edit to a todo creates a new history entry with a timestamp recording when the change occurred. History entries are automatically generated whenever a user modifies title, description, start date, or due date fields. The timestamp must be a valid datetime value representing the exact moment of the edit. History entries capture only the fields that were actually changed during that specific edit session. If a user edits only the title, the history entry records only the title change with other fields marked as unchanged. History entries cannot be manually created, edited, or deleted by users. When a todo is permanently deleted from trash, all associated history entries are also permanently removed. History entries are stored in chronological order with the most recent edit appearing first when viewed. Multiple rapid edits create separate history entries for each modification event.

### Automatic History Entry Creation

WHEN a user edits a todo, THE system SHALL automatically create a new history entry for that todo.

THE system SHALL create a history entry for every modification to a todo's title, description, start date, or due date.

THE system SHALL NOT allow users to manually create history entries.

THE system SHALL NOT allow history entries to be created without an associated todo edit.

IF a user attempts to manually create a history entry, THE system SHALL reject the request.

IF no fields are changed during an edit attempt, THE system SHALL NOT create a history entry.

### Edit Timestamp Recording

WHEN a history entry is created, THE system SHALL record a timestamp representing the exact moment the edit occurred.

THE system SHALL use a valid datetime value for the history entry timestamp.

THE system SHALL record the timestamp in the user's timezone context.

IF the timestamp cannot be determined, THE system SHALL reject the edit and not create a history entry.

THE timestamp SHALL be immutable once recorded.

### Changed Field Tracking

WHEN a todo is edited, THE system SHALL track which specific fields were changed in the history entry.

THE system SHALL record the new value for each field that was modified.

IF only the title is changed, THE system SHALL record only the title change in the history entry.

IF only the description is changed, THE system SHALL record only the description change in the history entry.

IF only the start date is changed, THE system SHALL record only the start date change in the history entry.

IF only the due date is changed, THE system SHALL record only the due date change in the history entry.

IF multiple fields are changed in a single edit, THE system SHALL record all changed fields in one history entry.

THE system SHALL NOT record unchanged fields in the history entry.

### History Immutability

THE system SHALL NOT allow users to edit existing history entries.

THE system SHALL NOT allow users to delete individual history entries.

THE system SHALL NOT allow users to modify the timestamp of a history entry.

THE system SHALL NOT allow users to modify the recorded field values in a history entry.

IF a user attempts to modify a history entry, THE system SHALL reject the request.

History entries SHALL remain permanent once created, except when the parent todo is permanently deleted.

### History Deletion on Permanent Remove

WHEN a todo is permanently deleted from trash, THE system SHALL also permanently delete all associated history entries.

THE system SHALL NOT allow permanent deletion of a todo without deleting its history entries.

THE system SHALL NOT allow history entries to remain after their parent todo is permanently deleted.

IF a user attempts to permanently delete a todo, THE system SHALL cascade the deletion to all history entries.

THE system SHALL NOT provide an option to preserve history entries when permanently deleting a todo.

### Chronological Ordering

WHEN a user views a todo's history, THE system SHALL display history entries in reverse chronological order.

THE most recent history entry SHALL appear first in the history list.

THE oldest history entry SHALL appear last in the history list.

THE system SHALL sort history entries by their timestamp in descending order.

IF two history entries have the same timestamp, THE system SHALL maintain their creation order.

### Multiple Edit Handling

WHEN a user makes multiple edits to a todo, THE system SHALL create a separate history entry for each edit.

THE system SHALL NOT merge multiple edits into a single history entry.

THE system SHALL NOT batch multiple rapid edits into one history entry.

EACH edit event SHALL result in exactly one history entry.

IF a user makes five edits in quick succession, THE system SHALL create five separate history entries.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Completion Status Filtering

### Completion Status Filtering

WHEN a user filters their todo list by completion status, THE system SHALL:
1. Support filtering by three status options: all todos, only complete todos, and only incomplete todos
2. Return todos matching the selected completion status
3. Apply the filter before pagination

WHEN a user selects "all todos", THE system SHALL return todos regardless of completion status.

WHEN a user selects "only complete todos", THE system SHALL return only todos where completed is true.

WHEN a user selects "only incomplete todos", THE system SHALL return only todos where completed is false.

IF the completion status filter is not specified, THE system SHALL default to returning all todos.

### Date-Based Filtering

WHEN a user filters todos by date range, THE system SHALL:
1. Support filtering by start date range (start date on or after a specified date)
2. Support filtering by due date range (due date on or before a specified date)
3. Support filtering by creation date range

WHEN filtering by start date, THE system SHALL include todos without a start date only when explicitly requested.

WHEN filtering by due date, THE system SHALL include todos without a due date only when explicitly requested.

### Todo List Sorting

### Sorting by Creation Date

WHEN a user sorts their todo list by creation date, THE system SHALL:
1. Support sorting in ascending order (oldest first)
2. Support sorting in descending order (newest first)
3. Use the creation timestamp as the sort key

WHEN sorting by creation date in descending order, THE system SHALL return the most recently created todos first.

WHEN sorting by creation date in ascending order, THE system SHALL return the oldest created todos first.

### Sorting by Start Date

WHEN a user sorts their todo list by start date, THE system SHALL:
1. Support sorting in ascending order (earliest first)
2. Support sorting in descending order (latest first)
3. Place todos without a start date at the end of the sorted list

WHEN sorting by start date in ascending order, THE system SHALL return todos with earliest start dates first, followed by todos without start dates.

WHEN sorting by start date in descending order, THE system SHALL return todos with latest start dates first, followed by todos without start dates.

### Sorting by Due Date

WHEN a user sorts their todo list by due date, THE system SHALL:
1. Support sorting in ascending order (earliest first)
2. Support sorting in descending order (latest first)
3. Place todos without a due date at the end of the sorted list

WHEN sorting by due date in ascending order, THE system SHALL return todos with earliest due dates first, followed by todos without due dates.

WHEN sorting by due date in descending order, THE system SHALL return todos with latest due dates first, followed by todos without due dates.

### Sorting Combination Rules

WHEN multiple sort criteria are specified, THE system SHALL apply them in the following priority order:
1. Primary sort: user-selected date field (creation, start, or due date)
2. Secondary sort: creation date (to ensure consistent ordering)

IF no sort criteria is specified, THE system SHALL default to sorting by creation date in descending order (newest first).

### Todo List Pagination

### Pagination Structure

WHEN a user requests a paginated list of todos, THE system SHALL:
1. Return a maximum of 50 todos per page
2. Include metadata about the total number of available todos
3. Include metadata about the current page number and total pages
4. Include flags indicating whether previous and next pages exist

WHEN a user requests page 1, THE system SHALL return the first set of todos.

WHEN a user requests a page number beyond the available pages, THE system SHALL return an empty list with appropriate metadata.

### Cursor-Based Pagination

WHEN a user uses cursor-based pagination, THE system SHALL:
1. Accept a cursor parameter representing the position in the result set
2. Return the next set of results after the cursor position
3. Return a new cursor for the next page if more results exist
4. Return null for the next cursor when no more results exist

WHEN a cursor is invalid or expired, THE system SHALL return an error indicating the cursor is not valid.

WHEN no cursor is provided for the initial request, THE system SHALL return the first page of results.

### Pagination Consistency

WHILE a user is paginating through results, THE system SHALL:
1. Maintain consistent ordering based on the selected sort criteria
2. Ensure no duplicates appear across pages
3. Ensure no todos are skipped between pages

IF todos are modified during pagination, THE system SHALL reflect the current state of todos in the results.

### Query Parameter Validation

### Query Parameter Validation

WHEN a user submits a query with pagination parameters, THE system SHALL:
1. Validate that page numbers are positive integers
2. Validate that page size does not exceed the maximum allowed (50)
3. Validate that cursor values are properly formatted
4. Validate that filter values are within allowed options

IF the page number is less than 1, THE system SHALL reject the request with an appropriate error.

IF the page size exceeds 50, THE system SHALL either cap the value at 50 or reject the request.

IF the cursor is malformed, THE system SHALL reject the request with an invalid cursor error.

### Query Result Limits

WHEN returning query results, THE system SHALL:
1. Never return more than 50 todos per request
2. Never expose internal identifiers or system metadata
3. Include only the fields specified for list view (title, completion status, start date, due date, creation date)

WHEN a user requests the full details of a single todo, THE system SHALL return all fields including the description.

### Privacy in Query Results

WHEN a user queries for todos, THE system SHALL:
1. Return only todos owned by the requesting user
2. Never expose todos belonging to other users
3. Never indicate the existence of todos that the user does not have access to

IF a query would return todos from another user, THE system SHALL filter them out before returning results.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Validation Errors

WHEN a user registers with an email, THE system SHALL reject the request if the email format is invalid.

WHEN a user registers with an email, THE system SHALL reject the request if the email is already associated with an existing account.

WHEN a user registers with a password, THE system SHALL reject the request if the password does not meet security requirements.

WHEN a user updates their display name, THE system SHALL reject the request if the display name exceeds the maximum length.

WHEN a user updates their display name, THE system SHALL reject the request if the display name is empty.

WHEN a user changes their password, THE system SHALL reject the request if the current password is incorrect.

WHEN a user changes their password, THE system SHALL reject the request if the new password does not meet security requirements.

### Authentication Errors

WHEN a user attempts to log in, THE system SHALL reject the request if the email is not found in the system.

WHEN a user attempts to log in, THE system SHALL reject the request if the password does not match the stored credentials.

WHEN a user attempts to access a protected resource without authentication, THE system SHALL reject the request.

WHEN a user attempts to perform an action with an expired session, THE system SHALL reject the request and require re-authentication.

WHEN a user attempts to log in with a deleted account, THE system SHALL reject the request and inform the user that the account no longer exists.

### Todo Operation Errors

WHEN a user attempts to create a todo, THE system SHALL reject the request if the title is missing or empty.

WHEN a user attempts to create a todo, THE system SHALL reject the request if the title exceeds the maximum allowed length.

WHEN a user attempts to create a todo, THE system SHALL reject the request if the due date is earlier than the start date.

WHEN a user attempts to view a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to view a todo, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to update a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to update a todo, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to update a todo, THE system SHALL reject the request if the new title exceeds the maximum allowed length.

WHEN a user attempts to update a todo, THE system SHALL reject the request if the new due date is earlier than the new start date.

WHEN a user attempts to complete or mark incomplete a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to complete or mark incomplete a todo, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to delete a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to delete a todo, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to delete a todo, THE system SHALL reject the request if the todo is already in the trash.

### Trash Operation Errors

WHEN a user attempts to view the trash, THE system SHALL return an empty list if no todos have been deleted.

WHEN a user attempts to restore a todo from the trash, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to restore a todo from the trash, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to restore a todo from the trash, THE system SHALL reject the request if the todo has already been permanently deleted.

WHEN a user attempts to permanently delete a todo from the trash, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to permanently delete a todo from the trash, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to permanently delete a todo from the trash, THE system SHALL reject the request if the todo is not in the trash.

### History Access Errors

WHEN a user attempts to view the edit history of a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to view the edit history of a todo, THE system SHALL reject the request if the todo belongs to another user.

WHEN a user attempts to view the edit history of a todo that has been permanently deleted, THE system SHALL reject the request as the history no longer exists.

WHEN a user attempts to view the edit history of a todo with no edit history, THE system SHALL return an empty list.

### Data Isolation Violation Errors

WHEN a user attempts to access another user's todo, THE system SHALL reject the request and not reveal that the todo exists.

WHEN a user attempts to access another user's todo via direct ID reference, THE system SHALL reject the request.

WHEN a user attempts to access another user's edit history, THE system SHALL reject the request and not reveal that the history exists.

WHEN a user attempts to filter or search for todos belonging to another user, THE system SHALL return only the requesting user's todos.

WHEN a user attempts to restore a todo from the trash that belongs to another user, THE system SHALL reject the request.

WHEN a user attempts to permanently delete a todo from the trash that belongs to another user, THE system SHALL reject the request.

### Account Deletion Errors

WHEN a user attempts to delete their account, THE system SHALL reject the request if the user is not authenticated.

WHEN a user attempts to delete their account, THE system SHALL permanently delete all todos including those in the trash.

WHEN a user attempts to delete their account, THE system SHALL permanently delete all edit history associated with their todos.

WHEN a user attempts to perform any operation after account deletion, THE system SHALL reject the request and indicate the account no longer exists.