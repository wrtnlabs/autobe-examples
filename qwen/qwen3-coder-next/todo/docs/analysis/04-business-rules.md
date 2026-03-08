**todoApp — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### User Ownership of Todos

WHEN a user creates a todo, THE system SHALL assign that todo to the creating user as its owner.

THE system SHALL ensure that every todo is owned by exactly one user.

WHILE a todo exists, THE system SHALL maintain its association with its owner user.

IF a user deletes their account, THE system SHALL permanently remove all todos owned by that user, including those in trash.

THE system SHALL prevent any user from accessing, viewing, editing, or deleting todos owned by another user.

### Data Isolation Across Users

WHEN a user queries their todo list, THE system SHALL filter results to include only todos owned by that user.

THE system SHALL isolate all todo-related data (including edit history and trash entries) at the user level.

IF a user attempts to access another user's todo data, THE system SHALL reject the request.

THE system SHALL ensure that deleted todos cannot be accessed by any user other than their original owner.

WHILE processing any request involving todos, THE system SHALL automatically enforce user-level data isolation.

### Tenant-Level Scope Definition

In this system, each user constitutes a separate tenant.

THE system SHALL enforce strict tenant boundaries where no tenant can access data belonging to another tenant.

WHEN a user signs up, THE system SHALL create a new tenant namespace for that user.

ALL todo operations (create, view, edit, delete) SHALL be scoped to the user's own tenant namespace.

THE system SHALL treat tenant separation as a fundamental security requirement, not an implementation detail.

### Multi-User Access Control

GUESTS cannot view any todos, even their own, because they must first authenticate.

MEMBERS can only view, create, edit, and delete their own todos.

NO member can access another member's todos under any circumstances.

THE system SHALL prevent cross-user data enumeration through error handling—responding with generic errors when accessing non-owned resources.

Admin roles do not exist in this system; all users are isolated peers.

### Data Access Constraints

WHEN a user views their todo list, THE system SHALL apply user-level filtering to return only that user's todos.

THE system SHALL apply user-level isolation to all edit history queries, ensuring users can only see history for their own todos.

WHEN restoring a todo from trash, THE system SHALL verify that the todo belongs to the requesting user before performing the operation.

IF a user attempts to permanently delete a todo from trash, THE system SHALL confirm ownership before deletion.

All data access operations SHALL include automatic user context validation before processing.

### Error Conditions for Violations

THE system SHALL reject requests when a user attempts to access a todo not owned by them.

THE system SHALL reject requests when a user attempts to view another user's profile.

THE system SHALL reject requests when a user attempts to edit or delete a todo not owned by them.

THE system SHALL reject requests when a user attempts to view edit history for a todo not owned by them.

When data access violations occur, THE system SHALL return generic error responses that do not reveal the existence of the requested resource.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users register with a unique email address and a secure password. Once registered, users must verify their email before accessing the system. Users can change their password at any time by providing their current password. Account deletion is permanent and irreversible—deleted accounts cannot be restored. Only one active account exists per email address; duplicate registrations are blocked. Users cannot log in until their email is verified. Password recovery is available for lost credentials. Users can cancel their account at any time, triggering an immediate irreversible deletion process.

### User Registration Rules

WHEN a new user registers, THE system SHALL require a unique email address.

WHEN a user attempts to register with an email that already exists, THE system SHALL reject the registration.

IF the email format is invalid, THE system SHALL reject the registration.

IF the password does not meet complexity requirements, THE system SHALL reject the registration.

WHEN a user registers, THE system SHALL send a verification email.

WHILE a user's email is unverified, THE system SHALL prevent login.

WHEN a user clicks the verification link, THE system SHALL mark the email as verified.

### User Account Management Rules

WHEN a user requests a password change, THE system SHALL require authentication with the current password.

WHEN a user requests account deletion, THE system SHALL permanently delete the account and all associated data.

WHEN a user's account is deleted, THE system SHALL remove all todos associated with the account.

WHEN a user's account is deleted, THE system SHALL permanently delete the user's edit history.

THE system SHALL NOT restore deleted accounts under any circumstances.

WHEN a user forgets their password, THE system SHALL provide a password recovery mechanism.

WHEN a password recovery link is used, THE system SHALL allow the user to set a new password.

## Profile Rules

Each active user has exactly one profile containing their display name. Display names must be between 1 and 100 characters and can be updated at any time. Profiles are private—users cannot view other users' profiles. Profile data is deleted when the associated user account is deleted. Display names cannot be empty or consist solely of whitespace. Only the profile's owner can view or edit profile information. Profile updates are not recorded in history. Profile is automatically created during account registration.

### Profile Creation and Ownership

THE system SHALL ensure each user has exactly one profile.

WHEN a user account is created, THE system SHALL automatically create a profile for that user.

WHEN a user account is deleted, THE system SHALL automatically delete the associated profile.

IF a user attempts to create a second profile, THE system SHALL reject the request.

### Profile Privacy

WHEN a user attempts to view another user's profile, THE system SHALL reject the request.

THE system SHALL ensure profiles are completely private and never visible to other users.

WHILE the application is in private mode, THE system SHALL prevent any cross-user profile access.

### Display Name editing and Format Requirements

WHEN a user edits their display name, THE system SHALL:
1. Require the new display name to be between 1 and 100 characters
2. Reject empty strings
3. Reject strings consisting solely of whitespace
4. Update the profile with the new value

IF the display name does not meet the format requirements, THE system SHALL reject the request.

### Profile Edit Rights and Access Control

WHEN a user attempts to edit their display name, THE system SHALL:
1. Verify the user owns the profile being edited
2. Allow the edit if ownership is confirmed
3. Reject the request if ownership cannot be verified

WHEN a user attempts to view profile information, THE system SHALL:
1. Verify the user owns the profile being viewed
2. Return the profile data if ownership is confirmed
3. Reject the request if ownership cannot be verified

## Todo Rules

Todos are created with a required title between 1 and 500 characters. Descriptions are optional and may be left empty. Start dates and due dates are both optional and independent of each other. New todos are always created in an incomplete state. Users can only create todos for themselves—cross-user creation is not allowed. Todos cannot be created with a due date earlier than the start date when both are provided. Each todo belongs to exactly one user and inherits privacy from the user account. Todos remain owned by the user who created them even after all other data is cleared.

### Required Title with Length Limit

WHEN a user creates or edits a todo, THE system SHALL:
1. Require a title with length between 1 and 500 characters inclusive
2. Reject the request when the title is missing or empty
3. Reject the request when the title exceeds 500 characters
4. Reject the request when the title contains only whitespace characters

IF the title does not meet length requirements, THE system SHALL reject the request with a validation error.

### Optional Description Handling

WHEN a user creates or edits a todo, THE system SHALL:
1. Accept a description that is optionally provided
2. Allow the description to be explicitly set to null or an empty string
3. Store the description exactly as provided without modification
4. Preserve the existing description when not included in an edit request

WHERE the description is provided, THE system SHALL allow up to 5000 characters.

### Independent Optional Dates

WHEN a user creates or edits a todo, THE system SHALL:
1. Accept start date as an optional field
2. Accept due date as an optional field
3. Treat start date and due date as independent of each other
4. Allow either date to be set while leaving the other unset
5. Store dates exactly as provided without modification

WHERE both start date and due date are provided, THE system SHALL apply date validity validation (defined in Date Validity Validation).

### Initial Incomplete Status

WHEN a user creates a new todo, THE system SHALL:
1. Set the completion status to incomplete by default
2. Ensure isComplete is explicitly false at creation time
3. Prevent automatic completion regardless of date values
4. Allow the user to change completion status only through explicit toggle operations

WHERE a todo is created from trash restoration, THE system SHALL:
1. Preserve the original completion status from before deletion

### User-Only Ownership

WHEN a user creates a todo, THE system SHALL:
1. Automatically associate the todo with the creating user
2. Reject any attempt to specify a different user as owner
3. Prevent cross-user todo creation
4. Ensure the todo is permanently tied to the creating user

WHERE a user attempts to create a todo for another user, THE system SHALL reject the request.

WHERE a user attempts to modify the ownership of an existing todo, THE system SHALL reject the request.

### Date Validity Validation

WHEN a user creates or edits a todo with both start date and due date provided, THE system SHALL:
1. Validate that the due date is not earlier than the start date
2. Reject the request when due date precedes start date
3. Allow the request when dates are equal or due date follows start date
4. Allow requests where only one date is provided without validation

WHERE only start date is provided without due date, THE system SHALL accept the request.
WHERE only due date is provided without start date, THE system SHALL accept the request.
WHERE neither date is provided, THE system SHALL accept the request.

### Private Todo Isolation

WHEN a user performs any operation on todos, THE system SHALL:
1. Restrict access to only the user's own todos
2. Filter all todo queries to exclude todos belonging to other users
3. Prevent direct access to todos created by other users
4. Maintain complete data isolation between users

WHERE a user attempts to view, edit, or delete another user's todo, THE system SHALL reject the request.

WHERE a user attempts to query todos with filters that might expose other users' data, THE system SHALL automatically apply user-based isolation filtering.

### Creation-Time Ownership

WHEN a todo is created, THE system SHALL:
1. Bind the ownership permanently to the creating user at creation time
2. Ensure ownership cannot be modified after creation
3. Preserve ownership through all lifecycle operations (editing, completing, deleting)
4. Maintain ownership even if the user's account status changes

WHERE the creating user deletes their account, THE system SHALL:
1. Permanently delete all todos owned by that user
2. Include edit history entries in the cascade deletion
3. Not transfer ownership to any other user

WHERE a user's account is deactivated or suspended, THE system SHALL:
1. Maintain the original ownership bindings
2. Prevent any other user from accessing the todos

## EditHistory Rules

Edit history entries are created automatically whenever a todo's title, description, start date, or due date is modified. Each history record captures the exact timestamp of the edit and the values before and after the change. Users can view the complete edit history for any of their todos. History entries are always ordered from most recent to oldest. When a todo is permanently deleted from trash, its entire edit history is also removed. History is only maintained for todos that exist in the trash or active lists. Users cannot manually create, edit, or delete history entries. Only changes to tracked fields generate new history entries.

### Automatic History Creation

WHEN a todo's title, description, start date, or due date is modified, THE system SHALL automatically create an edit history entry.

THE system SHALL NOT create a history entry if none of these tracked fields have changed during an update.

WHEN a todo is created, THE system SHALL NOT create an edit history entry.

IF a user attempts to manually create, edit, or delete an edit history entry, THE system SHALL reject the request.

### Timestamped Edit Records

WHEN an edit history entry is created, THE system SHALL record the exact timestamp of the edit.

THE timestamp SHALL be in chronological order relative to other edits on the same todo.

WHEN viewing edit history, THE system SHALL display timestamps in a human-readable format.

IF a user queries history entries, THE system SHALL return timestamps in the same format regardless of query parameters.

### Change Value Capture

WHEN an edit history entry is created for a title change, THE system SHALL record both the previous title and new title.

WHEN an edit history entry is created for a description change, THE system SHALL record both the previous description and new description.

WHEN an edit history entry is created for a start date change, THE system SHALL record both the previous start date and new start date.

WHEN an edit history entry is created for a due date change, THE system SHALL record both the previous due date and new due date.

IF no change occurred for a field during an update, THE system SHALL NOT record that field in the history entry.

### Most-Recent-First Ordering

WHEN a user views edit history for a todo, THE system SHALL return entries sorted from most recent to oldest.

IF two or more history entries share the same timestamp, THE system SHALL sort them by their internal creation ID in descending order.

THE system SHALL maintain this ordering when pagination is applied to edit history results.

### History Deletion with Todo

WHEN a user permanently deletes a todo from trash, THE system SHALL also delete all associated edit history entries.

THE system SHALL NOT delete edit history entries when a todo is moved to trash (soft delete).

IF a user restores a todo from trash, THE system SHALL restore all associated edit history entries.

THE system SHALL preserve edit history entries during todo completion toggles, title changes, and other edits while in active or trash state.

### User-Only History Access

A user SHALL ONLY view edit history for todos they own.

IF a user attempts to view edit history for a todo belonging to another user, THE system SHALL reject the request.

Guest users SHALL NOT be able to access any edit history entries.

WHEN a user account is deleted, THE system SHALL permanently delete all associated todo edit history entries.

### Immutable History Records

WHEN an edit history entry is created, THE system SHALL prevent any modification to its contents.

IF a user or system process attempts to update, delete, or alter a history entry, THE system SHALL reject the request.

THE system SHALL maintain history entries exactly as recorded at the time of creation, preserving all field values including timestamps.

### Field-Change Triggering

WHEN a todo's title is changed, THE system SHALL trigger creation of an edit history entry.

WHEN a todo's description is changed, THE system SHALL trigger creation of an edit history entry.

WHEN a todo's start date is changed, THE system SHALL trigger creation of an edit history entry.

WHEN a todo's due date is changed, THE system SHALL trigger creation of an edit history entry.

IF a user updates a todo without changing any of these four tracked fields, THE system SHALL NOT trigger creation of an edit history entry.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users register with an email address that must be unique among active accounts. Duplicate or already-deleted emails are rejected during registration. Email addresses must follow standard format rules (local-part@domain.tld). Passwords must meet minimum security requirements including length, character diversity, and complexity. Password change attempts preserve account status while updating credentials. Account deletion permanently removes all associated data including todos and edit history.

### Email Format Validation

WHEN a user provides an email address for registration or profile update, THE system SHALL validate that the email follows the standard format: local-part@domain.tld.

IF the email does not contain an '@' symbol, THE system SHALL reject the request.
IF the email has an '@' symbol but lacks a valid domain part after it, THE system SHALL reject the request.
IF the email contains invalid characters (outside alphanumeric, '.', '_', '-', '@'), THE system SHALL reject the request.

### Email Uniqueness Check

WHEN a user registers with an email address, THE system SHALL verify that no active account exists with the same email.

IF the email is already associated with another active account, THE system SHALL reject the registration request.

A deleted account's email MAY be reused for new registration after account deletion is complete.

### Password Complexity Requirements

WHEN a user sets or changes their password, THE system SHALL enforce the following requirements:

1. Minimum length of 8 characters
2. Must contain at least one uppercase letter (A-Z)
3. Must contain at least one lowercase letter (a-z)
4. Must contain at least one numeric digit (0-9)
5. Must contain at least one special character from the set: !@#$%^&*()_+-=[]{}|;:'",.<>?/~`

IF any requirement is not met, THE system SHALL reject the password update request and provide specific feedback about which requirement failed.

### Duplicate Email Handling

THE system SHALL reject registration requests when the provided email matches an existing active account.

WHEN an account is deleted, THE system SHALL mark the email as available for reuse.

IF a user attempts to register with an email previously used by a deleted account, THE system SHALL allow the registration and create a new account.

WHEN duplicate email detection fails due to concurrent registration attempts, THE system SHALL resolve the conflict by keeping the first successful registration and rejecting the second with a clear message.

### Password Security Policy

THE system SHALL hash all passwords using a strong cryptographic algorithm before storage.

WHEN a user changes their password, THE system SHALL verify their current password before accepting the new one.

IF a password change request lacks verification of the current password, THE system SHALL reject the request.

THE system SHALL NOT store passwords in plain text or in a reversibly encrypted format.

## Profile Validation Rules

Display names must be between 1 and 100 characters long. Empty or whitespace-only display names are rejected during profile creation. Display names cannot contain markup or special control characters. Users can update their display name at any time, but changes must pass the same validation rules. Profile records are created automatically when users register and cannot be manually deleted.

### Display Name Length and Format Validation

WHEN a user creates or updates their profile, THE system SHALL:
1. Require a display name between 1 and 100 characters long
2. Reject requests where the display name is exactly 0 characters
3. Reject requests where the display name exceeds 100 characters

WHILE a display name contains only whitespace characters, THE system SHALL reject the request.

IF the display name contains markup (e.g., HTML or XML tags) or control characters, THE system SHALL reject the request.

IF the display name contains characters outside the allowed Unicode printable range, THE system SHALL reject the request.

WHERE profile creation is automatic during user registration, THE system SHALL apply the same validation rules as manual updates.

IF the display name does not meet validation criteria, THE system SHALL prevent the profile from being saved and return an appropriate error.

## Todo Validation Rules

Todo titles must contain between 1 and 500 characters. Empty titles are not allowed and are rejected at creation time. Description fields are optional and can be left empty without error. Start dates must be valid calendar dates and cannot be set to future dates beyond system limits. Due dates must be valid calendar dates and cannot precede the start date when both are set. Dates without values are treated as null during validation.

### Todo Title Validation

WHEN a user creates or edits a todo, THE system SHALL:
1. Require the title to contain between 1 and 500 characters
2. Reject requests where the title is empty or contains only whitespace
3. Reject requests where the title exceeds 500 characters
4. Trim leading and trailing whitespace from the title before validation

IF the title is missing, THE system SHALL reject the request with an error.
IF the title is empty (0 characters) or contains only whitespace characters, THE system SHALL reject the request.
IF the title exceeds 500 characters, THE system SHALL reject the request.

### Todo Description Validation

WHEN a user creates or edits a todo, THE system SHALL:
1. Accept descriptions that are empty or omitted without error
2. Allow descriptions up to the maximum text length (defined in domain model)
3. Preserve null or empty description values without conversion

WHERE the description field is omitted, THE system SHALL store the value as null or empty.
IF the description exceeds the maximum allowed length, THE system SHALL reject the request.

### Todo Start Date Validation

WHEN a user sets or updates a todo's start date, THE system SHALL:
1. Accept empty or omitted start dates without error
2. Validate the start date as a valid calendar date when provided
3. Reject start dates that are in the future beyond the system's allowable time window

WHERE the start date is omitted, THE system SHALL store the value as null.
IF the start date is not a valid calendar date, THE system SHALL reject the request.
IF the start date is set to a future time exceeding system limits, THE system SHALL reject the request.

### Todo Due Date Relative to Start Date Validation

WHEN a user creates or edits a todo with both start date and due date, THE system SHALL:
1. Ensure the due date is not earlier than the start date
2. Accept todos where only the due date is set (without start date)
3. Accept todos where neither date is set

IF both start date and due date are provided and the due date precedes the start date, THE system SHALL reject the request.
IF only the due date is provided (start date is null), THE system SHALL accept the request.
IF neither date is provided, THE system SHALL accept the request.

## EditHistory Validation Rules

Each edit history entry records the exact timestamp when the edit occurred. History entries store the previous and new values only when those fields were actually changed during an edit operation. Fields that remain unchanged during an edit are not stored in the history entry. History entries cannot be manually created or modified—only triggered by valid todo edits. Edit timestamps are stored with full precision and sorted chronologically from newest to oldest.

### History Entry Timestamping

WHEN a todo is edited, THE system SHALL record the exact timestamp when the edit operation completes.

THE system SHALL use server-generated timestamps with full precision (including milliseconds).

IF multiple edits occur within the same millisecond, THE system SHALL ensure each history entry receives a unique, incrementing sequence number for ordering purposes.

THE timestamp SHALL be stored in UTC format and converted to local timezone only for display purposes.

THE system SHALL NOT accept client-provided timestamps for edit history entries.

### Change Detection Logic

WHEN a todo is edited, THE system SHALL compare the new values against the current values of all editable fields.

THE system SHALL create a history entry ONLY when at least one field's value has actually changed.

IF no fields have changed during an edit operation, THE system SHALL NOT create a history entry.

THE system SHALL detect changes by comparing the previous value to the new value for title, description, start date, and due date fields.

A field change is detected when the previous value differs from the new value according to type-specific comparison rules (string comparison for text, datetime comparison for dates).

### Unchanged Field Exclusion

WHEN creating a history entry after an edit, THE system SHALL include a field's previous and new values ONLY if that field was actually changed.

IF a field's value was not changed during an edit operation, THE system SHALL set that field's previous and new values to null in the history entry.

The system SHALL track the following fields for change detection: title, description, start date, and due date.

For example, if only the description was changed, the history entry SHALL include previousDescription and newDescription with actual values, while previousTitle, newTitle, previousStartDate, newStartDate, previousDueDate, and newDueDate SHALL be set to null.

### History Entry Immutability

WHEN a history entry is created, THE system SHALL make it permanently immutable—no updates or deletions are allowed after creation.

THE system SHALL reject any request to manually create, update, or delete history entries.

History entries SHALL only be created automatically as a direct result of valid todo edit operations.

IF a user attempts to directly manipulate history entries through any interface, THE system SHALL return an error.

THE system SHALL prevent all direct database modifications to the edit history table through any means other than the controlled edit process.

### Timestamp Sorting Order

WHEN displaying edit history for a todo, THE system SHALL sort entries from most recent to oldest.

Sorting SHALL be based first on the edit timestamp in descending order.

WHEN timestamps are identical, sorting SHALL use the sequence number in descending order to ensure deterministic ordering.

THE system SHALL always display the most recently created history entry at the top of the list.

The chronological order SHALL be preserved across all interfaces that display edit history, including the full edit history view and summary displays.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Todo List Filtering

WHEN a user requests their todo list, THE system SHALL support filtering by completion status.

THE system SHALL support the following filter options:
1. All todos (default filter)
2. Only complete todos
3. Only incomplete todos

WHEN a filter is applied, THE system SHALL exclude todos that do not match the selected filter criteria.

WHEN filtering is applied, THE system SHALL return only todos owned by the requesting user.

THE system SHALL apply filters regardless of whether todos are in the trash (deleted todos remain excluded from the active list).

IF an invalid filter value is provided, THE system SHALL reject the request and return an appropriate error.

### Todo List Sorting

WHEN a user requests their todo list, THE system SHALL support sorting by creation date, start date, and due date.

THE system SHALL support both ascending and descending sort order for each field.

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the list regardless of sort order.

WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the list regardless of sort order.

WHEN sorting by creation date, THE system SHALL sort todos by their creation timestamp in the specified order.

THE system SHALL apply sorting after filtering and before pagination.

WHEN no sort order is specified, THE system SHALL sort by creation date in descending order (newest first).

### Pagination Requirements

WHEN a user requests their todo list, THE system SHALL support pagination to return results in manageable chunks.

THE system SHALL support two pagination parameters: page number and page size.

THE system SHALL default to page 1 and a page size of 20 items if not specified.

WHEN the requested page number is greater than the total available pages, THE system SHALL return an empty result set.

WHEN the requested page size exceeds 100 items, THE system SHALL limit the result to 100 items and return an error.

THE system SHALL provide total count information in the response to enable pagination UI.

WHEN a user is viewing their trash, THE system SHALL apply the same pagination requirements as the active todo list.

### Cursor and Query Handling

WHEN a user requests filtered, sorted, and paginated todo data, THE system SHALL process the query as a single operation.

THE system SHALL construct the query by applying the specified filters, sort order, and pagination in the correct sequence.

THE system SHALL ensure that all query operations respect user ownership isolation.

WHEN executing a query, THE system SHALL apply all three operations (filter, sort, paginate) atomically.

IF conflicting pagination parameters are provided (e.g., both page number and cursor), THE system SHALL reject the request.

WHEN sorting is applied before pagination, THE system SHALL ensure consistent ordering across pages.

THE system SHALL ensure that queries return only the requesting user's todos, even when complex filtering and sorting are applied.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Errors

THE system SHALL reject account registration when the provided email is already registered.

THE system SHALL reject login attempts when the email does not exist in the system.

THE system SHALL reject login attempts when the provided password does not match the stored password hash.

WHILE deleting an account, THE system SHALL verify that the account exists before proceeding with deletion.

IF the account does not exist during deletion, THE system SHALL return an appropriate error without disclosing whether the email was registered.

### Profile Errors

THE system SHALL reject profile display name updates when the provided display name exceeds 100 characters.

THE system SHALL reject profile display name updates when the display name contains only whitespace.

THE system SHALL reject profile display name updates when the display name is empty or null.

WHILE attempting to view another user's profile, THE system SHALL return an error indicating profile access is restricted.

### Todo Creation Errors

WHEN a user creates a todo, THE system SHALL reject the request if the title is empty or missing.

THE system SHALL reject todo creation when the title exceeds 500 characters.

WHEN a user creates a todo, THE system SHALL reject the request if the start date is provided but the due date is earlier than the start date.

WHERE both start date and due date are provided, THE system SHALL validate that the due date is on or after the start date.

### Todo Access and Ownership Errors

WHEN a user attempts to view a specific todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to view a todo, THE system SHALL reject the request if the todo belongs to a different user.

WHEN a user attempts to view their todo list, THE system SHALL return only todos belonging to the authenticated user.

THE system SHALL ensure that a user cannot view, access, or receive another user's todos through any query or operation.

### Todo Modification Errors

WHEN a user attempts to edit a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to edit a todo, THE system SHALL reject the request if the todo belongs to a different user.

WHEN a user attempts to mark a todo as complete or incomplete, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to mark a todo as complete or incomplete, THE system SHALL reject the request if the todo belongs to a different user.

### Todo Deletion and Trash Errors

WHEN a user attempts to delete a todo, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to delete a todo, THE system SHALL reject the request if the todo belongs to a different user.

WHEN a user attempts to restore a todo from trash, THE system SHALL reject the request if the todo does not exist in their trash.

WHEN a user attempts to permanently delete a todo from trash, THE system SHALL reject the request if the todo does not exist in their trash.

WHEN a user attempts to view their trash, THE system SHALL return only todos that belong to the authenticated user and have been soft-deleted.

### Edit History Access Errors

WHEN a user attempts to view a todo's edit history, THE system SHALL reject the request if the todo does not exist.

WHEN a user attempts to view a todo's edit history, THE system SHALL reject the request if the todo belongs to a different user.

WHEN a user attempts to view a todo's edit history, THE system SHALL return an empty list if no edits have been made to the todo.

### Filtering and Sorting Errors

THE system SHALL reject list queries with invalid completion status filter values (not 'all', 'complete', or 'incomplete').

THE system SHALL reject list queries with invalid sort field values (not 'createdAt', 'startDate', or 'dueDate').

THE system SHALL reject list queries with invalid sort direction values (not 'asc' or 'desc').

THE system SHALL reject pagination requests with invalid page numbers (negative or zero).

THE system SHALL reject cursor-based pagination requests with invalid cursor formats.