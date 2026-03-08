**todoApp — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Data Ownership Semantics

### Ownership Principles

THE system SHALL associate every todo with exactly one user as its owner.

THE system SHALL associate every todo history entry with the todo to which it belongs.

THE system SHALL establish user ownership at the moment of creation for todos and todo history entries.

THE system SHALL maintain the same owner throughout the entire lifecycle of a todo, from creation through deletion and restoration.

### Ownership Transfer Restriction

THE system SHALL NOT allow ownership of todos to be transferred between users.

THE system SHALL NOT allow ownership of todo history entries to be changed.

### Derived Ownership

WHEN a todo history entry is created, THE system SHALL implicitly assign ownership to the owner of the associated todo.

THE system SHALL NOT create todo history entries for todos owned by other users.

### User Account Ownership

THE system SHALL associate each user account with exactly one email address as the account identifier.

THE system SHALL allow each user to own exactly one profile containing their display name.

THE system SHALL consider the user as the sole owner of their authentication credentials (password).

### User Data Isolation

### Fundamental Isolation Principle

THE system SHALL maintain complete data isolation between user accounts in a multi-user environment.

THE system SHALL ensure that each user's data exists in a separate, isolated scope from all other users.

THE system SHALL prevent any data sharing or visibility between user accounts.

### Todo Isolation

WHEN a user views their todo list, THE system SHALL return only todos owned by that user.

WHEN a user views the trash, THE system SHALL return only deleted todos owned by that user.

WHEN a user views a single todo, THE system SHALL verify ownership before displaying any details.

WHEN a user views todo history, THE system SHALL return only history entries for todos owned by that user.

### Profile Isolation

THE system SHALL restrict profile visibility to the profile owner only.

WHEN a user attempts to view another user's profile, THE system SHALL reject the request.

THE system SHALL NOT provide any mechanism to browse, search, or discover other user profiles.

### Query Scope Isolation

THE system SHALL apply user ownership filtering to all todo queries, including filtering, sorting, and pagination operations.

THE system SHALL apply user ownership filtering to all trash list queries.

THE system SHALL apply user ownership filtering to all todo history queries.

### Cross-User Access Prevention

### Access Boundary Enforcement

IF a user attempts to access a todo they do not own, THE system SHALL reject the request with an access denied response.

IF a user attempts to edit a todo they do not own, THE system SHALL reject the request with an access denied response.

IF a user attempts to delete a todo they do not own, THE system SHALL reject the request with an access denied response.

IF a user attempts to restore a todo they do not own, THE system SHALL reject the request with an access denied response.

IF a user attempts to permanently delete a todo they do not own, THE system SHALL reject the request with an access denied response.

IF a user attempts to mark a todo as complete or incomplete and does not own the todo, THE system SHALL reject the request with an access denied response.

### History Access Prevention

IF a user attempts to view the history of a todo they do not own, THE system SHALL reject the request with an access denied response.

### No Enumeration Protection

THE system SHALL NOT reveal whether a specific todo exists when a user attempts to access a todo they do not own.

THE system SHALL treat non-existent todos and todos owned by other users identically from the requesting user's perspective.

### No Shared Access Mechanisms

THE system SHALL NOT provide any feature to share todos between users.

THE system SHALL NOT provide any feature to assign todos to other users.

THE system SHALL NOT provide any feature to make todos publicly visible.

THE system SHALL NOT provide any feature to collaborate on todos with other users.

### Account Deletion Data Scope

### Deletion Scope

WHEN a user deletes their account, THE system SHALL permanently delete all todos owned by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all todo history entries for todos owned by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all todos in the trash owned by that user.

WHEN a user deletes their account, THE system SHALL permanently delete the user's profile.

WHEN a user deletes their account, THE system SHALL permanently delete the user's authentication credentials.

### Cascading Deletion Order

WHEN a user deletes their account, THE system SHALL delete todo history entries before deleting the associated todos.

WHEN a user deletes their account, THE system SHALL ensure no orphaned data remains in the system.

### No Cross-User Impact

WHEN a user deletes their account, THE system SHALL NOT affect any data owned by other users.

THE system SHALL ensure that account deletion operations are scoped exclusively to the deleting user's data.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users register with an email address and password, and the email must be unique across all active accounts. Each user has a display name that is required and can be updated at any time. Password changes are allowed, and the user must authenticate with their current password before setting a new one. Users can delete their own account, which permanently removes all associated data including todos and their edit history. This is a private application where users cannot view other users' profiles or access any data belonging to other users. Account deletion is irreversible and cascades to all user-owned content. Display names have no uniqueness requirement, allowing multiple users to share the same display name. Email addresses serve as the unique identifier for authentication purposes.

### Email Uniqueness and Authentication Identity

### Email Uniqueness

THE system SHALL ensure each email address is associated with at most one active user account.

IF a user attempts to register with an email address already in use, THE system SHALL reject the registration request.

THE system SHALL use the email address as the unique identifier for user authentication.

### Email as Identity

WHEN a user authenticates, THE system SHALL identify the user by their registered email address.

THE system SHALL NOT allow two different accounts to share the same email address at any time.

IF an email address is changed, THE system SHALL verify the new email address is not already registered to another account.

### Display Name Ownership

### Display Name Non-Uniqueness

THE system SHALL NOT enforce uniqueness constraints on display names.

THE system SHALL allow multiple users to have identical display names.

### Display Name Ownership

WHEN a user updates their display name, THE system SHALL associate the new display name with that user only.

THE system SHALL NOT notify other users when a display name is changed.

THE system SHALL NOT track or record historical display name changes.

THE system SHALL require a display name for every user account.

### Password Change Authorization

### Authentication Before Password Change

WHEN a user requests to change their password, THE system SHALL require authentication with the current password.

IF the current password provided does not match the stored credentials, THE system SHALL reject the password change request.

### Password Change Process

WHEN a user successfully changes their password, THE system SHALL immediately use the new password for all subsequent authentications.

THE system SHALL NOT retain the previous password after a successful password change.

THE system SHALL allow users to change their password at any time without restrictions on frequency.

### Account Deletion Cascade

### Account Deletion Behavior

WHEN a user deletes their account, THE system SHALL permanently remove all data associated with that user.

THE system SHALL cascade the deletion to include:
1. All todos owned by the user
2. All todos in the trash owned by the user
3. All edit history entries for those todos
4. The user's profile information
5. The user's authentication credentials

### Irreversibility

THE system SHALL NOT provide any mechanism to recover a deleted account.

THE system SHALL NOT provide any mechanism to restore deleted todos or edit history after account deletion.

IF an account deletion is initiated, THE system SHALL treat the action as permanent and irreversible.

### Cascade Scope

WHEN account deletion occurs, THE system SHALL ensure no orphaned data remains in the system.

THE system SHALL NOT allow account deletion to affect data belonging to other users.

### Private Profile Restriction

### Profile Visibility

THE system SHALL NOT allow users to view other users' profiles.

THE system SHALL NOT provide any mechanism to search for or discover other users.

THE system SHALL NOT expose user profile information through any interface to other users.

### Private Application Design

THE system SHALL be designed as a private todo application where each user's data is completely isolated.

THE system SHALL NOT include features for sharing, following, or viewing other users' content.

IF a user attempts to access another user's profile or data, THE system SHALL deny the request.

### User Data Isolation Guarantee

### Data Access Isolation

THE system SHALL ensure each user can only access their own todos, edit history, and profile.

THE system SHALL enforce data isolation at all access points including viewing, editing, deleting, and restoring.

### Cross-User Access Prevention

IF a user attempts to access a todo belonging to another user, THE system SHALL reject the request.

IF a user attempts to access edit history belonging to another user's todo, THE system SHALL reject the request.

THE system SHALL NOT provide any shared or collaborative features between users.

### Query Isolation

WHEN a user queries for todos, THE system SHALL return only todos owned by that user.

WHEN a user views the trash, THE system SHALL show only deleted todos owned by that user.

WHEN a user views edit history, THE system SHALL show only history for todos owned by that user.

### User-Owned Content Scope

### Content Ownership Definition

THE system SHALL consider all todos created by a user as owned by that user.

THE system SHALL consider all edit history entries for a user's todos as owned by that user.

THE system SHALL associate each todo with exactly one user who is the owner.

### Ownership Transfer

THE system SHALL NOT provide any mechanism to transfer ownership of todos to another user.

THE system SHALL NOT provide any mechanism to share todos with other users.

### Content Lifecycle

WHEN a user creates a todo, THE system SHALL associate that todo with the creating user as the owner.

THE system SHALL maintain the ownership relationship throughout the entire lifecycle of the todo including editing, completion, deletion, and restoration.

WHEN a todo is permanently deleted, THE system SHALL remove the ownership association along with the todo.

## Todo Rules

Each todo must have a title, while description, start date, and due date are optional fields that can be left empty. Newly created todos are marked as incomplete by default and remain so until explicitly marked complete by the owner. Users can toggle a todo between complete and incomplete states at any time. Only the todo owner can view, edit, or delete their todos, and there is no sharing or collaboration feature. Deletion is a soft delete operation that moves todos to trash rather than permanently removing them. Todos in trash can be restored to the active list or permanently deleted by the owner. When sorting by start date or due date, todos without those dates appear at the end of the sorted list. Each edit to a todo creates a permanent record in the edit history, capturing what changed and when.

### Title Requirement

### Title Requirement

THE system SHALL require a title for every todo.

WHEN a user creates a todo, THE system SHALL ensure a title is provided.

IF a todo creation request lacks a title, THE system SHALL reject the request.

THE system SHALL treat the title as a mandatory field for all todo operations including creation and editing.

### Optional Date Fields

### Optional Date Fields

THE system SHALL allow todos to be created without a start date.

THE system SHALL allow todos to be created without a due date.

THE system SHALL allow todos to be created without a description.

WHEN a todo is created with empty optional fields, THE system SHALL accept the todo as valid.

WHEN a user edits a todo, THE system SHALL allow any optional field to remain empty or be cleared.

### Incomplete Default State

### Incomplete Default State

WHEN a new todo is created, THE system SHALL set its completion status to incomplete.

THE system SHALL NOT allow todos to be created with a pre-set complete status.

THE system SHALL default the completed field to false for all newly created todos.

### Completion Toggle Logic

### Completion Toggle Logic

WHEN a user marks a todo as complete, THE system SHALL change its completion status from incomplete to complete.

WHEN a user marks a todo as incomplete, THE system SHALL change its completion status from complete to incomplete.

THE system SHALL allow users to toggle a todo between complete and incomplete states any number of times.

THE system SHALL NOT restrict the number of times a todo's completion status can be changed.

### Owner-Only Access

### Owner-Only Access

THE system SHALL restrict todo access to its owner only.

WHEN a user attempts to view a todo, THE system SHALL verify that the user is the owner of that todo.

WHEN a user attempts to edit a todo, THE system SHALL verify that the user is the owner of that todo.

WHEN a user attempts to delete a todo, THE system SHALL verify that the user is the owner of that todo.

IF a user attempts to access a todo they do not own, THE system SHALL reject the request.

THE system SHALL NOT provide any mechanism for users to view, edit, or delete todos belonging to other users.

### Soft Delete Behavior

### Soft Delete Behavior

WHEN a user deletes a todo, THE system SHALL mark the todo as deleted without permanently removing it.

THE system SHALL retain all todo data including title, description, dates, completion status, and edit history after deletion.

WHEN a todo is deleted, THE system SHALL exclude it from the normal todo list.

WHEN a todo is deleted, THE system SHALL make it available in the trash list for the owner.

### Trash Restoration Capability

### Trash Restoration Capability

WHEN a user restores a deleted todo from trash, THE system SHALL return the todo to the normal todo list.

WHEN a todo is restored, THE system SHALL preserve all original todo data including edit history.

WHEN a todo is restored, THE system SHALL remove the deleted status from the todo.

THE system SHALL allow multiple restore operations on the same todo if it is deleted again.

### Permanent Deletion Option

### Permanent Deletion Option

WHEN a user permanently deletes a todo from trash, THE system SHALL irreversibly remove the todo and all its data.

WHEN a user permanently deletes a todo, THE system SHALL also delete all associated edit history entries.

THE system SHALL NOT allow recovery of a permanently deleted todo.

THE system SHALL NOT allow recovery of edit history for a permanently deleted todo.

### Date-Less Sorting Position

### Date-Less Sorting Position

WHEN the todo list is sorted by start date, THE system SHALL place todos without a start date at the end of the list.

WHEN the todo list is sorted by due date, THE system SHALL place todos without a due date at the end of the list.

THE system SHALL apply this positioning rule regardless of whether the sort order is ascending or descending.

### Edit History Creation

### Edit History Creation

WHEN a user edits a todo's title, THE system SHALL create an edit history entry recording the title change.

WHEN a user edits a todo's description, THE system SHALL create an edit history entry recording the description change.

WHEN a user edits a todo's start date, THE system SHALL create an edit history entry recording the start date change.

WHEN a user edits a todo's due date, THE system SHALL create an edit history entry recording the due date change.

THE system SHALL create a single history entry for each edit operation, even when multiple fields are changed simultaneously.

THE system SHALL record the timestamp of each edit in the history entry.

### Private Todo Isolation

### Private Todo Isolation

THE system SHALL isolate each user's todos from all other users.

WHEN a user views their todo list, THE system SHALL display only todos owned by that user.

WHEN a user views their trash list, THE system SHALL display only deleted todos owned by that user.

THE system SHALL NOT provide any feature to share todos between users.

THE system SHALL NOT allow any user to access another user's todos through any means.

THE system SHALL enforce this isolation across all operations including view, edit, delete, and restore.

### Todo Ownership Boundary

### Todo Ownership Boundary

THE system SHALL associate every todo with exactly one user as its owner.

THE system SHALL assign ownership at the time of todo creation to the user who created it.

THE system SHALL NOT allow ownership transfer of a todo to another user.

THE system SHALL NOT allow todos to have multiple owners.

WHEN a user account is deleted, THE system SHALL permanently delete all todos owned by that user including those in trash.

THE system SHALL maintain the ownership relationship throughout the todo's lifecycle from creation through deletion and restoration.

## TodoHistory Rules

An edit history entry is automatically created whenever any editable field of a todo is modified. Each history entry records the timestamp of when the edit occurred and captures only the fields that were actually changed. Changes to title, description, start date, and due date are each recorded separately within a single history entry if multiple fields were modified in one edit. History entries cannot be modified or deleted independently, and they exist only as a record of past changes. When viewing history, entries are presented in reverse chronological order with the most recent edits appearing first. History entries belong to the todo and are permanently deleted when the parent todo is permanently deleted from trash. Temporary deletion of a todo does not affect its history, and restoration preserves all historical records.

### Automatic History Creation

WHEN a user edits a todo's title, THE system SHALL create a TodoHistory entry recording the change.

WHEN a user edits a todo's description, THE system SHALL create a TodoHistory entry recording the change.

WHEN a user edits a todo's start date, THE system SHALL create a TodoHistory entry recording the change.

WHEN a user edits a todo's due date, THE system SHALL create a TodoHistory entry recording the change.

WHEN a user edits multiple fields of a todo in a single operation, THE system SHALL create ONE TodoHistory entry containing all field changes.

WHEN a user marks a todo as complete or incomplete, THE system SHALL NOT create a TodoHistory entry.

THE system SHALL create history entries only for modifications to the title, description, start date, or due date fields.

THE system SHALL create history entries automatically without user action or confirmation.

### History Entry Structure

THE system SHALL record the exact timestamp when each edit occurred in the editedAt field.

IF the title was changed during an edit, THE system SHALL store the new title value in the titleChange field.

IF the title was not changed during an edit, THE system SHALL leave the titleChange field empty.

IF the description was changed during an edit, THE system SHALL store the new description value in the descriptionChange field.

IF the description was not changed during an edit, THE system SHALL leave the descriptionChange field empty.

IF the start date was changed during an edit, THE system SHALL store the new start date value in the startDateChange field.

IF the start date was not changed during an edit, THE system SHALL leave the startDateChange field empty.

IF the due date was changed during an edit, THE system SHALL store the new due date value in the dueDateChange field.

IF the due date was not changed during an edit, THE system SHALL leave the dueDateChange field empty.

THE system SHALL store only the new value for each changed field, not the previous value.

THE system SHALL associate each history entry with its parent todo through the todoId reference.

### Partial and Multi-Field Change Tracking

IF only one field is modified during an edit, THE system SHALL create a history entry with exactly one non-empty change field.

IF two fields are modified during an edit, THE system SHALL create a history entry with exactly two non-empty change fields.

IF three fields are modified during an edit, THE system SHALL create a history entry with exactly three non-empty change fields.

IF all four editable fields are modified during an edit, THE system SHALL create a history entry with all four change fields populated.

THE system SHALL support history entries where any combination of change fields may be populated or empty.

THE system SHALL NOT create separate history entries for each field changed in a single edit operation.

### Immutable History Entries

THE system SHALL prevent modification of any TodoHistory entry after creation.

THE system SHALL prevent deletion of individual TodoHistory entries.

THE system SHALL NOT provide any operation to update a history entry's recorded values.

THE system SHALL NOT provide any operation to correct or amend a history entry.

THE system SHALL preserve history entries as a permanent audit trail of all edits.

IF a user attempts to modify a history entry, THE system SHALL reject the request.

IF a user attempts to delete a history entry independently, THE system SHALL reject the request.

### Reverse Chronological Ordering

WHEN a user views the edit history of a todo, THE system SHALL present history entries sorted by editedAt timestamp in descending order.

THE system SHALL display the most recently created history entry first.

THE system SHALL display older history entries after more recent ones.

THE system SHALL apply this ordering consistently across all history views.

THE system SHALL NOT allow users to change the sort order of history entries.

### History-Todo Lifecycle Binding

THE system SHALL maintain a one-to-many relationship where each todo can have zero or more history entries.

THE system SHALL associate every history entry with exactly one parent todo.

WHEN a todo is moved to trash (soft delete), THE system SHALL preserve all associated history entries.

WHEN a todo is restored from trash, THE system SHALL restore the todo with all its history entries intact.

WHEN a todo is permanently deleted from trash, THE system SHALL permanently delete all associated history entries.

THE system SHALL NOT allow history entries to exist without a parent todo.

THE system SHALL NOT allow history entries to be transferred to a different todo.

WHEN a user permanently deletes a todo from trash, THE system SHALL delete the complete change audit trail without separate user confirmation.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users must provide a valid email address when signing up. The email address must be unique across all accounts in the system. If a user attempts to register with an email that already exists, the system rejects the registration. Passwords must meet minimum security requirements to protect user accounts. The display name is required and cannot be left empty. Display names should contain only printable characters and cannot consist solely of whitespace. Email addresses must follow standard email format conventions. Password changes require the user to provide their current password for verification. Account deletion requires confirmation to prevent accidental data loss. All user inputs are sanitized to prevent injection of malicious content.

### Email Format Validation

### Email Format Requirements

WHEN a user provides an email address during registration or profile update, THE system SHALL validate that the email follows standard email format conventions.

THE system SHALL require the email address to contain exactly one "@" symbol separating the local part from the domain part.

THE system SHALL require the domain part to contain at least one "." character.

THE system SHALL reject email addresses that contain leading or trailing whitespace.

IF the email address does not meet format requirements, THE system SHALL reject the request with an appropriate error message.

### Empty Email Rejection

WHEN a user attempts to register or update their profile, THE system SHALL require the email field to contain a non-empty value.

IF the email field is empty or contains only whitespace, THE system SHALL reject the request.

### Email Uniqueness

### Unique Email Requirement

THE system SHALL ensure that each email address is associated with exactly one user account.

WHEN a user attempts to register with an email address, THE system SHALL check whether the email is already registered in the system.

IF a user attempts to register with an email address that already exists in the system, THE system SHALL reject the registration request.

THE system SHALL NOT reveal whether an email address is already registered when a registration fails due to duplicate email.

THE system SHALL allow a user to log in using their registered email address.

### Password Security Requirements

### Password Complexity

WHEN a user creates or changes their password, THE system SHALL require the password to meet minimum security requirements.

THE system SHALL require passwords to be at least 8 characters in length.

THE system SHALL require passwords to contain at least one character from each of the following categories:
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Digit (0-9)

THE system SHALL allow passwords to contain special characters.

IF a password does not meet the complexity requirements, THE system SHALL reject the request with an appropriate error message.

### Password Change Verification

WHEN a user requests to change their password, THE system SHALL require the user to provide their current password for verification.

IF the provided current password does not match the stored password, THE system SHALL reject the password change request.

THE system SHALL NOT allow a password change without current password verification.

### Empty Password Rejection

WHEN a user creates or changes their password, THE system SHALL require the password field to contain a non-empty value.

IF the password field is empty or contains only whitespace, THE system SHALL reject the request.

### Display Name Constraints

### Display Name Requirements

WHEN a user creates or updates their display name, THE system SHALL require the display name to be non-empty.

THE system SHALL reject display names that consist solely of whitespace.

THE system SHALL allow display names to contain letters, digits, spaces, and common punctuation characters.

THE system SHALL reject display names containing control characters or other non-printable characters.

IF the display name does not meet validation requirements, THE system SHALL reject the request with an appropriate error message.

### Whitespace Handling

WHEN processing user input for display name, THE system SHALL trim leading and trailing whitespace from the value before validation.

IF a display name consists only of whitespace after trimming, THE system SHALL reject the request as if the field were empty.

### Account Deletion Confirmation

### Deletion Confirmation Requirement

WHEN a user requests to delete their account, THE system SHALL require explicit confirmation before proceeding with the deletion.

THE system SHALL NOT allow account deletion to proceed without user confirmation.

THE system SHALL inform the user that account deletion is permanent and will result in the loss of all their data including all todos and todo history.

IF the user does not provide confirmation, THE system SHALL NOT delete the account.

### Cascade Deletion

WHEN an account deletion is confirmed, THE system SHALL permanently remove all user data including:
- All todos owned by the user
- All todo history entries associated with those todos
- The user profile and account information

THE system SHALL NOT retain any recoverable user data after account deletion.

### Input Sanitization

### Sanitization Requirements

WHEN a user submits any input to the system, THE system SHALL sanitize the input to prevent injection of malicious content.

THE system SHALL sanitize all text fields including email, password, display name, todo title, todo description, and all other user-provided content.

THE system SHALL preserve the user's intended content while removing or neutralizing potentially harmful content.

THE system SHALL NOT execute or render user input as code or commands.

### Whitespace Normalization

WHEN processing text input, THE system SHALL preserve internal whitespace (spaces between words) as entered by the user.

THE system SHALL normalize multiple consecutive whitespace characters in internal text to a single space when appropriate.

THE system SHALL NOT remove or modify whitespace that is significant to the meaning of the user's content.

## Todo Validation Rules

Every todo must have a title, which is the only required field when creating a todo. The title cannot be empty or contain only whitespace characters. The description field is optional and may be left empty by the user. Start date and due date are both optional fields that users can choose to set or leave empty. When both start date and due date are provided, the start date should logically precede or equal the due date. Dates must be valid calendar dates that the system can parse and store. The completion status can only be one of two values: complete or incomplete. Users cannot set invalid dates that do not exist on the calendar. Empty descriptions are valid and treated as having no content. Todo titles should be meaningful but have reasonable length limits to ensure readability.

### Title Validation

WHEN a user creates or edits a todo, THE system SHALL require a title field.

THE system SHALL reject the request when the title is empty.

THE system SHALL reject the request when the title contains only whitespace characters.

THE system SHALL reject the request when the title consists entirely of spaces, tabs, or other whitespace characters.

IF the title length exceeds the maximum allowed limit, THEN THE system SHALL reject the request.

THE system SHALL enforce a maximum length limit on todo titles.

IF the title exceeds the defined length limit, THEN THE system SHALL reject the request with an appropriate error message.

THE system SHALL strip leading and trailing whitespace from the title before validation.

IF the stripped title is empty, THEN THE system SHALL reject the request.

THE system SHALL preserve the original title formatting, including internal whitespace, when the title is valid.

### Description Field Handling

THE system SHALL treat the description field as optional.

WHEN a user creates a todo without providing a description, THE system SHALL store the todo with an empty description.

WHEN a user edits a todo without changing the description, THE system SHALL preserve the existing description.

IF a user provides a description, THE system SHALL store it exactly as provided.

THE system SHALL accept an empty description as valid input.

IF the description length exceeds the maximum allowed limit, THEN THE system SHALL reject the request.

THE system SHALL not require any specific format for the description content.

WHEN a user clears the description field, THE system SHALL store an empty description.

### Start Date Validation

THE system SHALL treat the start date field as optional.

IF a user provides a start date, THE system SHALL validate that it represents a valid calendar date.

THE system SHALL reject the request when the start date does not represent a valid calendar date.

IF the start date is provided in an unrecognizable format, THEN THE system SHALL reject the request.

THE system SHALL accept any valid calendar date for the start date, including past dates and future dates.

WHEN no start date is provided, THE system SHALL store the todo without a start date value.

IF the user clears an existing start date, THE system SHALL remove the start date from the todo.

### Due Date Validation

THE system SHALL treat the due date field as optional.

IF a user provides a due date, THE system SHALL validate that it represents a valid calendar date.

THE system SHALL reject the request when the due date does not represent a valid calendar date.

IF the due date is provided in an unrecognizable format, THEN THE system SHALL reject the request.

THE system SHALL accept any valid calendar date for the due date, including past dates and future dates.

WHEN no due date is provided, THE system SHALL store the todo without a due date value.

IF the user clears an existing due date, THE system SHALL remove the due date from the todo.

### Date Logical Ordering

IF both a start date and a due date are provided, THEN THE system SHALL validate that the start date is equal to or earlier than the due date.

THE system SHALL reject the request when the start date is later than the due date.

IF the start date equals the due date, THE system SHALL accept the request.

WHEN only one of the dates is provided, THE system SHALL skip the date ordering validation.

IF both dates are empty, THE system SHALL accept the request without ordering validation.

THE system SHALL apply the date ordering rule during both todo creation and todo editing.

IF a user edits a todo and the updated start date becomes later than the existing due date, THEN THE system SHALL reject the request.

IF a user edits a todo and the updated due date becomes earlier than the existing start date, THEN THE system SHALL reject the request.

### Completion Status Validation

THE system SHALL accept only two values for completion status: complete or incomplete.

THE system SHALL reject the request when an invalid completion status value is provided.

WHEN a user creates a new todo, THE system SHALL set the completion status to incomplete by default.

IF no completion status is specified during creation, THE system SHALL default to incomplete.

WHEN a user marks a todo as complete, THE system SHALL change the status from incomplete to complete.

WHEN a user marks a todo as incomplete, THE system SHALL change the status from complete to incomplete.

IF an unrecognized status value is provided, THE system SHALL reject the request.

## TodoHistory Validation Rules

Edit history entries are automatically created whenever a user modifies a todo's title, description, start date, or due date. Each history entry records the timestamp of when the edit occurred. The timestamp must be a valid datetime value that accurately reflects when the change was made. History entries capture only the fields that were actually changed during an edit operation. If a field was not modified, no change value is recorded for that field in the history entry. Users cannot directly create or modify history entries; the system generates them automatically. History entries cannot be deleted individually by users; they are removed only when the parent todo is permanently deleted from trash. History entries are immutable once created and cannot be edited after creation. The edit timestamp must accurately reflect the chronological order of changes.

### Automatic History Creation

WHEN a user edits a todo's title, description, start date, or due date, THE system SHALL automatically create a history entry recording the change.

THE system SHALL create exactly one history entry per edit operation, regardless of how many fields were changed in that operation.

WHEN an edit operation completes, THE system SHALL record the edit timestamp in the history entry.

THE system SHALL NOT allow users to manually create history entries.

THE system SHALL NOT allow users to modify existing history entries.

WHEN a todo is created, THE system SHALL NOT create an initial history entry for the creation operation itself.

### Timestamp Validation

THE system SHALL record the timestamp of each edit operation as a valid datetime value.

WHEN recording an edit, THE system SHALL ensure the timestamp accurately reflects when the edit occurred.

THE system SHALL maintain timestamps in chronological order for each todo's edit history.

WHEN displaying history entries, THE system SHALL sort them from most recent to oldest based on their recorded timestamps.

THE system SHALL NOT allow history entry timestamps to be modified after creation.

IF two or more edits occur within the same time resolution, THE system SHALL preserve their actual chronological order of occurrence.

### Change Field Tracking

WHEN an edit operation modifies a field, THE system SHALL record the new value of that field in the history entry.

WHEN a field is not modified during an edit operation, THE system SHALL NOT record any value for that field in the history entry.

THE system SHALL track changes independently for each of the following fields: title, description, start date, and due date.

WHEN multiple fields are modified in a single edit operation, THE system SHALL record all changed fields in the same history entry.

THE system SHALL NOT create separate history entries for each field changed within a single edit operation.

IF a field value is changed and then changed back to its original value in the same edit operation, THE system SHALL NOT record that field as changed.

### Immutable History Entries

THE system SHALL prevent any modification to history entries after they have been created.

THE system SHALL NOT provide any interface for users to edit history entry content.

THE system SHALL preserve all history entries unchanged for as long as the parent todo exists.

IF a user attempts to modify a history entry, THE system SHALL reject the request.

THE system SHALL NOT allow history entries to be deleted individually by users.

History entries SHALL remain permanently associated with their parent todo until the todo is permanently deleted from trash.

### History Deletion Cascade

WHEN a todo is permanently deleted from trash, THE system SHALL delete all associated history entries.

WHEN a todo is moved to trash (soft delete), THE system SHALL preserve all associated history entries.

WHEN a todo is restored from trash, THE system SHALL restore access to all its history entries.

THE system SHALL NOT allow partial deletion of history entries for a given todo.

THE system SHALL NOT allow history entries to exist without their associated todo.

WHEN permanent deletion of a todo is initiated, THE system SHALL ensure complete removal of all history entries before confirming the deletion.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Completion Status Filtering

### Filter Options

WHEN a user queries their todo list, THE system SHALL support filtering by completion status with the following options:
1. All todos (no filter applied)
2. Only complete todos
3. Only incomplete todos

### Default Filter Behavior

WHEN a user requests their todo list without specifying a filter, THE system SHALL return all todos regardless of completion status.

### Filter Application

WHEN a user applies a completion status filter, THE system SHALL return only todos matching the specified completion status.

### Combined Query Operations

WHEN a user applies both a completion status filter and a sort order, THE system SHALL first filter the todos by completion status, then sort the filtered results according to the specified sort criteria.

### Trash List Filtering

WHEN a user views their trash list, THE system SHALL NOT apply completion status filtering to deleted todos.

### Sorting Options

### Available Sort Fields

WHEN a user queries their todo list, THE system SHALL support sorting by the following fields:
1. Creation date
2. Start date
3. Due date

### Sort Direction

WHEN a user sorts by any field, THE system SHALL support both ascending and descending order:
1. Creation date: newest first (descending) or oldest first (ascending)
2. Start date: earliest first (ascending) or latest first (descending)
3. Due date: earliest first (ascending) or latest first (descending)

### Default Sort Order

WHEN a user requests their todo list without specifying a sort order, THE system SHALL sort by creation date with newest first (descending order).

### Single Sort Field

WHEN a user specifies a sort field, THE system SHALL apply only that single sort criterion to the results.

### Secondary Sort Stability

WHEN multiple todos have the same value for the sort field, THE system SHALL maintain consistent ordering using creation date as a secondary sort criterion.

### Trash List Sorting

WHEN a user views their trash list, THE system SHALL support the same sorting options as the active todo list.

### Null Date Handling in Sorting

### Start Date Null Handling

WHEN a user sorts by start date, THE system SHALL place todos without a start date at the end of the sorted list, regardless of sort direction.

### Due Date Null Handling

WHEN a user sorts by due date, THE system SHALL place todos without a due date at the end of the sorted list, regardless of sort direction.

### Null Date Grouping

WHEN multiple todos have null values for the sort field, THE system SHALL order these todos among themselves by creation date (newest first).

### Mixed Null and Non-Null Results

WHEN a user sorts by a date field, THE system SHALL return all todos with non-null dates first (according to the specified direction), followed by all todos with null dates.

### Creation Date Non-Null Guarantee

WHEN a user sorts by creation date, THE system SHALL NOT need null handling because creation date is required for all todos.

### Pagination

### Paginated Results

WHEN a user queries any list (active todos or trash), THE system SHALL return results in paginated form.

### Cursor-Based Pagination

WHEN a user requests a page of results, THE system SHALL use a cursor to identify the position within the result set.

### Cursor Encoding

WHEN the system generates a pagination cursor, THE cursor SHALL uniquely identify the last item of the current page within the sorted result set.

### Next Page Request

WHEN a user requests the next page of results, THE system SHALL provide a cursor value that identifies where to resume the query.

### Previous Page Request

WHEN a user requests the previous page of results, THE system SHALL provide a cursor value that identifies where to begin the backward query.

### First Page Query

WHEN a user queries a list without providing a cursor, THE system SHALL return the first page of results.

### Cursor Validity

WHEN a user provides an invalid or expired cursor, THE system SHALL return an error indicating the cursor is invalid.

### Empty Results

WHEN a user queries a list that contains no items matching the filter criteria, THE system SHALL return an empty result set with no error.

### Query Consistency

### Filter and Sort Combination

WHEN a user applies both filtering and sorting to a list query, THE system SHALL apply the filter first, then sort the filtered results.

### Pagination with Filter and Sort

WHEN a user paginates through filtered and sorted results, THE system SHALL maintain consistent ordering and filtering across all pages.

### Query Parameter Validation

WHEN a user provides invalid filter or sort parameters, THE system SHALL reject the request with an appropriate error.

### Consistent Result Ordering

WHEN a user paginates through results, THE system SHALL ensure each todo appears in exactly one position across all pages.

### Total Count

WHEN a user queries a paginated list, THE system SHALL return the total count of items matching the query criteria.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

### Invalid Login Credentials

WHEN a guest attempts to log in with an email address that does not exist in the system, THE system SHALL reject the request and indicate that the credentials are invalid.

WHEN a guest attempts to log in with an incorrect password for an existing email, THE system SHALL reject the request and indicate that the credentials are invalid.

THE system SHALL NOT reveal whether the email address exists or the password is incorrect, to prevent enumeration attacks.

### Email Already Registered

WHEN a guest attempts to sign up with an email address that is already registered, THE system SHALL reject the request and indicate that the email is already in use.

### Invalid Email Format

WHEN a guest or member provides an email address that does not conform to a valid email format, THE system SHALL reject the request and indicate that the email format is invalid.

### Password Requirements Not Met

WHEN a user provides a password that does not meet security requirements during signup or password change, THE system SHALL reject the request and indicate which requirements were not satisfied.

### Password Change Authorization

WHEN a member attempts to change a password without providing the correct current password, THE system SHALL reject the request and indicate that the current password is incorrect.

### Authorization Errors

### Todo Access Denied

WHEN a member attempts to access, view, edit, complete, or delete a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

THE system SHALL NOT reveal whether the todo exists when denying access, to prevent information leakage.

### Profile Access Denied

WHEN a member attempts to view another user's profile, THE system SHALL reject the request and indicate that profile viewing is not permitted.

### Trash Access Denied

WHEN a member attempts to restore or permanently delete a todo from trash that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

### History Access Denied

WHEN a member attempts to view the edit history of a todo that belongs to another user, THE system SHALL reject the request and indicate that access is denied.

### Unauthenticated Access

WHEN a guest attempts to perform any action that requires authentication, THE system SHALL reject the request and indicate that authentication is required.

### Validation Errors

### Missing Required Title

WHEN a member attempts to create or update a todo without providing a title, THE system SHALL reject the request and indicate that the title is required.

### Empty Title

WHEN a member attempts to create or update a todo with a title that contains only whitespace or is empty, THE system SHALL reject the request and indicate that the title cannot be empty.

### Due Date Before Start Date

WHEN a member attempts to create or update a todo where the due date is earlier than the start date, THE system SHALL reject the request and indicate that the due date cannot be earlier than the start date.

### Invalid Date Format

WHEN a member provides a start date or due date in an invalid format, THE system SHALL reject the request and indicate that the date format is invalid.

### Empty Display Name

WHEN a member attempts to update their display name with an empty value or whitespace only, THE system SHALL reject the request and indicate that the display name cannot be empty.

### Resource Not Found Errors

### Todo Not Found

WHEN a member attempts to access, view, edit, complete, delete, or view history for a todo that does not exist, THE system SHALL reject the request and indicate that the todo was not found.

### Todo in Trash

WHEN a member attempts to access a todo from the normal list that has been moved to trash, THE system SHALL reject the request and indicate that the todo is not available in the active list.

### Todo Not in Trash

WHEN a member attempts to restore or permanently delete a todo that is not in the trash, THE system SHALL reject the request and indicate that the todo is not in the trash.

### User Account Not Found

WHEN the system attempts to perform an operation referencing a user account that does not exist, THE system SHALL reject the request and indicate that the user was not found.

### History Entry Not Found

WHEN a member attempts to access a specific history entry that does not exist, THE system SHALL reject the request and indicate that the history entry was not found.

### Account Lifecycle Errors

### Account Already Deleted

WHEN a member attempts to log in with credentials for an account that has been deleted, THE system SHALL reject the request and indicate that the credentials are invalid.

THE system SHALL NOT reveal that the account was deleted, to prevent information disclosure.

### Account Deletion Consequences

WHEN a member deletes their account, THE system SHALL permanently remove all associated todos, including those in trash, and all associated edit histories.

IF a member attempts to recover deleted account data after deletion, THE system SHALL reject the request as the data no longer exists.

### Error Response Principles

### Error Message Clarity

THE system SHALL provide error messages that are clear and actionable to the user.

THE system SHALL NOT expose internal implementation details, stack traces, or technical error codes in user-facing error messages.

### Privacy in Error Responses

THE system SHALL NOT reveal information about other users' data through error messages.

WHEN denying access to a resource that may or may not exist, THE system SHALL use consistent error messaging that does not allow users to infer the existence of resources belonging to others.

### Error Recovery

WHEN a validation error occurs, THE system SHALL preserve the user's input and allow correction without requiring re-entry of all data.

WHEN an error occurs during todo creation or editing, THE system SHALL preserve the title, description, start date, and due date values submitted, allowing the member to correct the error and resubmit.