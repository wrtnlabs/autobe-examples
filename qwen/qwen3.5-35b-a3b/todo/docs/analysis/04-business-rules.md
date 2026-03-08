**todoApp — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Ownership Validation

WHEN a user accesses a todo, THE system SHALL verify that the todo belongs to that user.

THE system SHALL reject the request when the user attempts to access a todo owned by another user.

THE system SHALL ensure that all todos returned to a user are owned exclusively by that user.

IF a todo is requested by a user who does not own it, THE system SHALL reject the request and deny access.

THE system SHALL enforce data ownership boundaries across all operations: creation, viewing, editing, completion, and deletion.

### Data Isolation

THE system SHALL ensure that users can never view another user's todos under any circumstances.

THE system SHALL prevent any data sharing or visibility between different user accounts.

WHEN a user requests a todo list, THE system SHALL return only todos owned by that user.

THE system SHALL enforce complete privacy boundaries - users have no mechanism to view, access, or share another user's data.

IF a user attempts to reference another user's todo ID, THE system SHALL reject the request regardless of whether the todo ID exists.

### Completion Status Filtering

WHEN a user requests a todo list, THE system SHALL allow filtering by completion status.

Users can request to see all todos regardless of completion status.

Users can request to see only complete todos.

Users can request to see only incomplete todos.

WHEN a completion status filter is applied, THE system SHALL return todos matching only that status.

IF no completion status is specified, THE system SHALL return all todos by default.

### Sorting Rules

WHEN a user requests a todo list, THE system SHALL allow sorting by creation date (newest first or oldest first).

THE system SHALL allow sorting by start date (earliest first or latest first).

THE system SHALL allow sorting by due date (earliest first or latest first).

WHEN sorting by start date, todos without a start date shall appear at the end of the list.

WHEN sorting by due date, todos without a due date shall appear at the end of the list.

IF sorting by creation date with newest first is selected, THE system SHALL display the most recently created todos first.

IF sorting by creation date with oldest first is selected, THE system SHALL display the oldest created todos first.

### Pagination Rules

WHEN a user requests a todo list, THE system SHALL paginate the results.

THE system SHALL paginate the trash list separately from the normal todo list.

Each page SHALL show a consistent number of todos per page.

THE system SHALL not return todos from other users' accounts in any paginated result.

WHEN pagination is applied with a filter, THE system SHALL apply the filter before paginating.

### Data Access Rejection

THE system SHALL reject the request when the requested todo does not exist.

THE system SHALL reject the request when the user does not have access to the requested todo.

THE system SHALL reject the request when a user attempts to modify a todo that does not belong to them.

THE system SHALL reject the request when a user attempts to delete a todo that does not belong to them.

THE system SHALL reject the request when restoring a todo from trash that does not belong to the requesting user.

### Edit History Access

WHEN a user views edit history for a todo, THE system SHALL show only edit history entries for that specific todo.

THE system SHALL allow users to view the complete edit history of todos they own.

WHEN a todo is permanently deleted, THE system SHALL also delete its edit history.

THE system SHALL ensure users cannot view edit history for todos owned by other users.

History entries SHALL be sorted from most recent to oldest when displayed to the user.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts using an email address and password combination. Each email address must be unique across all active user accounts. When users log in, they authenticate with their registered email and password. Users may update their password when they choose to change their account credentials. Users have a display name that appears on their account profile. Users can modify their display name at any time through their account settings. Users have the ability to permanently delete their entire account. When an account is deleted, all associated todos are also permanently removed, including any todos that may be in the trash. Users cannot view or access other users' profiles since this is a private todo application.

### Account Creation and Email Validation

WHEN a user creates an account, THE system SHALL require a valid email address and password.

WHEN a user creates an account, THE system SHALL validate that the email address follows a standard email format (contains @ and domain).

WHEN a user creates an account, THE system SHALL verify that the email address is unique across all active user accounts.

IF an email address already exists in the system, THE system SHALL reject the account creation request.

IF the email format is invalid, THE system SHALL reject the account creation request with an error message indicating the email format is incorrect.

WHEN a user creates an account, THE system SHALL store the password securely as a hash, never storing the plaintext password.

IF the password does not meet minimum security requirements, THE system SHALL reject the account creation request.

WHEN an account is successfully created, THE system SHALL allow the user to immediately log in with their email and password.

### Email and Password Authentication

WHEN a user logs in with their email and password, THE system SHALL verify the credentials against the stored password hash.

WHEN a user provides correct email and password, THE system SHALL authenticate the user and establish a session.

IF the email does not exist in the system, THE system SHALL reject the login attempt with a generic authentication failure message.

IF the password does not match the stored hash, THE system SHALL reject the login attempt with a generic authentication failure message.

IF the account has been deleted, THE system SHALL reject the login attempt indicating the account no longer exists.

WHEN a user successfully authenticates, THE system SHALL create a session token that remains valid until the user logs out or the session expires.

IF a user attempts to access the system without an active session, THE system SHALL redirect them to the login screen.

### Password Change Process

WHEN an authenticated user changes their password, THE system SHALL require the current password for verification.

WHEN a user changes their password, THE system SHALL require them to specify a new password that meets security requirements.

IF the current password provided is incorrect, THE system SHALL reject the password change request.

IF the new password does not meet security requirements, THE system SHALL reject the password change request.

IF the new password is the same as the current password, THE system SHALL reject the password change request.

WHEN a password change is successful, THE system SHALL immediately invalidate all existing session tokens for that user, requiring re-authentication on all devices.

WHEN a password change is successful, THE system SHALL NOT log the new password or store it in plaintext form.

### Account Deletion and Data Removal

WHEN a user requests to delete their account, THE system SHALL confirm the deletion action with the user before proceeding.

WHEN an account is deleted, THE system SHALL permanently delete all todos associated with that account, including todos currently in the trash.

WHEN an account is deleted, THE system SHALL permanently delete all edit history entries associated with the user's todos.

WHEN an account is deleted, THE system SHALL permanently delete the user profile including the display name.

WHEN an account is deleted, THE system SHALL remove all session tokens associated with that account immediately.

IF the user is currently logged in, THE system SHALL terminate all active sessions upon account deletion.

ACCOUNT DELETION IS PERMANENT: THERE IS NO WAY TO RECOVER AN ACCOUNT ONCE IT HAS BEEN DELETED.

THE system SHALL NOT allow account deletion for guest users (guests do not have accounts to delete).

WHEN an account is deleted, THE system SHALL immediately log the deletion event with timestamp and reason if provided.

### Display Name Management and Privacy

WHEN a user creates an account, THE system SHALL allow them to set a display name.

WHEN a user wishes to update their display name, THE system SHALL allow them to edit their display name through account settings.

IF a user attempts to change their display name to an empty value, THE system SHALL reject the change and require a non-empty display name.

WHEN a user successfully updates their display name, THE change SHALL be reflected immediately across all views where their name appears.

WHEN a user views their own profile, THE system SHALL display their current display name.

THE system SHALL prevent users from viewing other users' profiles or accessing profile information of other users.

IF a user attempts to access another user's profile through any means, THE system SHALL reject the request and display a privacy error.

THE system SHALL enforce that all todos remain private to their owner and cannot be shared or accessed by other users.

WHEN a user deletes their account, THE system SHALL ensure their display name is permanently removed from the system.

## Todo Rules

Users create new todos with a title that is required for every todo. Users may optionally include a description, which can be left empty if they prefer. Users may set a start date to indicate when they intend to begin work on the todo. Users may set a due date to establish when they want the todo to be completed. Todos are created in an incomplete state by default. Users can toggle todo completion status between complete and incomplete states. Users can edit the title, description, start date, and due date of any todo they own. Users can view a list of their todos with pagination support. Each todo entry displays its title, completion status, start date, due date, and creation date. Users can view individual todos to see full details including the complete description. Todos belong exclusively to the user who created them and remain private.

### Todo Creation

WHEN a user creates a new todo, THE system SHALL:
1. Require a title for the todo
2. Allow an optional description that can be left empty
3. Allow an optional start date that can be left empty
4. Allow an optional due date that can be left empty
5. Set the todo to incomplete status by default
6. Associate the todo with the creating user

IF the title is missing or empty, THE system SHALL reject the todo creation request.

IF the due date is set earlier than the start date, THE system SHALL reject the todo creation request.

IF the user is not authenticated, THE system SHALL reject the todo creation request.

THE system SHALL record the creation timestamp when a todo is created.

### Todo Completion Status

WHEN a user marks a todo as complete, THE system SHALL change the todo status from incomplete to complete.

WHEN a user marks a todo as incomplete, THE system SHALL change the todo status from complete to incomplete.

IF a user attempts to toggle the completion status of a todo they do not own, THE system SHALL reject the request.

IF a user attempts to toggle the completion status of a todo that does not exist, THE system SHALL reject the request.

WHEN a todo's completion status changes, THE system SHALL record this change in the todo's edit history.

THE system SHALL maintain only two completion states: complete and incomplete.

### Todo Field Editing

WHEN a user edits a todo, THE system SHALL allow updating the title field.

WHEN a user edits a todo, THE system SHALL allow updating the description field.

WHEN a user edits a todo, THE system SHALL allow updating the start date field.

WHEN a user edits a todo, THE system SHALL allow updating the due date field.

WHEN a user edits a todo, THE system SHALL create a new edit history entry recording all changes.

IF a user attempts to edit a todo they do not own, THE system SHALL reject the edit request.

IF a user attempts to edit a todo that does not exist, THE system SHALL reject the edit request.

IF the new title is missing or empty during an edit, THE system SHALL reject the edit request.

THE system SHALL record the timestamp of when each edit was made.

THE system SHALL record which user performed each edit in the edit history.

### Todo List Display

WHEN a user requests a list of their todos, THE system SHALL paginate the results.

WHEN a user requests a list of their todos, THE system SHALL display: title, completion status, start date (if set), due date (if set), and creation date.

IF a user attempts to view another user's todos, THE system SHALL reject the request.

WHEN filtering by completion status, THE system SHALL show only todos matching the selected filter.

WHEN no filter is applied, THE system SHALL show all todos for the user.

THE system SHALL ensure that todos are sorted according to the user's selection when sorting is applied.

IF sorting by start date is applied, THE system SHALL display todos without a start date at the end of the list.

IF sorting by due date is applied, THE system SHALL display todos without a due date at the end of the list.

IF the user is not authenticated, THE system SHALL reject the todo list request.

### Todo Individual View

WHEN a user requests to view a single todo, THE system SHALL display all todo details including full description.

WHEN a user requests to view a single todo, THE system SHALL verify the user owns the todo.

IF a user attempts to view a todo they do not own, THE system SHALL reject the request.

IF a user attempts to view a todo that does not exist, THE system SHALL reject the request.

IF the user is not authenticated, THE system SHALL reject the todo view request.

THE system SHALL only display todos belonging to the requesting user.

### Todo Ownership and Privacy

EACH user's todos are completely private and isolated from other users.

WHEN any operation is performed on a todo, THE system SHALL verify the user owns that todo.

IF a user attempts to access any todo that does not belong to them, THE system SHALL reject the access request.

THERE IS NO WAY to view, access, or share another user's todos.

WHEN a todo is created, THE system SHALL associate it exclusively with the creating user.

IF a user is deleted from the system, ALL of their todos are permanently deleted including those in trash.

IF a todo is deleted, it is soft deleted and removed from the normal todo list but remains in the trash.

THE system SHALL enforce strict data isolation between all users at all times.

## EditHistory Rules

Every time a todo is edited, a new history entry is automatically created. Each history entry records when the edit was made with a timestamp. History entries capture the title before and after any title changes. History entries capture the description before and after any description changes. History entries capture the start date before and after any start date changes. History entries capture the due date before and after any due date changes. Only changes that actually occurred are recorded in the history. Users can view the complete edit history for any todo they own. History entries are displayed with the most recent edits at the top. When a todo is permanently deleted from the trash, its entire edit history is also removed. Users can access edit history for all their todos. The history provides a complete record of all modifications made to a todo.

### Automatic Edit History Creation

WHEN a todo is edited, THE system SHALL automatically create a new edit history entry for that todo.

IF a todo is created, THE system SHALL NOT create an initial history entry (history is only created for edits).
IF no changes are made to a todo, THE system SHALL NOT create a history entry.

THE system SHALL record the timestamp when each edit history entry is created.
THE system SHALL record which user made the edit in each history entry.

WHEN a user owns a todo, THE system SHALL create history entries attributed to that user when they edit it.

### Title Change Tracking

WHEN a todo's title is changed, THE system SHALL record both the previous title and the new title in the history entry.

IF the title is not changed during an edit, THE system SHALL record null for the title change fields.
IF the title is changed from one value to another, THE system SHALL record the previous value.

WHEN a history entry is created for a title change, THE system SHALL record what the title was before the change.
WHEN a history entry is created for a title change, THE system SHALL record what the title is after the change.

THE system SHALL preserve title changes for the entire lifetime of the todo.

### Description Change Logging

WHEN a todo's description is changed, THE system SHALL record both the previous description and the new description in the history entry.

IF the description is not changed during an edit, THE system SHALL record null for the description change fields.
IF the description is changed from one value to another, THE system SHALL record the previous value.

WHEN the description is updated, THE system SHALL capture what the description was before the update.
WHEN the description is updated, THE system SHALL capture what the description is after the update.

THE system SHALL preserve description changes in history even if the description is later changed again.

### Date Field Modification Records

WHEN a todo's start date is changed, THE system SHALL record both the previous start date and the new start date in the history entry.

IF a start date is set for the first time, THE system SHALL record null for the previous start date.
IF a start date is removed, THE system SHALL record the previous start date value.
IF a start date is not changed during an edit, THE system SHALL record null for the start date change fields.

WHEN a todo's due date is changed, THE system SHALL record both the previous due date and the new due date in the history entry.

IF a due date is set for the first time, THE system SHALL record null for the previous due date.
IF a due date is removed, THE system SHALL record the previous due date value.
IF a due date is not changed during an edit, THE system SHALL record null for the due date change fields.

WHEN any date field is modified, THE system SHALL record the date before and after the modification.

### History Entry Viewing and Access

WHEN a user views their own todo, THE system SHALL display the complete edit history for that todo.

IF a user does not own a todo, THE system SHALL reject access to that todo's edit history.
IF a todo belongs to another user, THE system SHALL reject access to its edit history.

WHEN viewing todo history, THE system SHALL show all history entries that exist for that todo.

THE system SHALL ensure that users can only access edit history for todos they own.
THE system SHALL ensure that users cannot view edit history for todos owned by other users.

### History Entry Sorting and Display

WHEN displaying edit history, THE system SHALL show entries sorted from most recent to oldest.

THE system SHALL display the timestamp of when each history entry was created.
THE system SHALL display the user who made each edit in the history.

WHEN history entries are displayed, THE system SHALL show only the fields that were actually changed in each entry.
THE system SHALL use null values for fields that were not changed in a specific history entry.

THE system SHALL sort history entries so that the most recent edits appear at the top of the list.

### Permanent Deletion and History Removal

WHEN a todo is permanently deleted from the trash, THE system SHALL delete all edit history entries associated with that todo.

IF a todo is in the trash, THE system SHALL NOT permanently delete it without user confirmation.

WHEN a todo is permanently deleted, THE system SHALL remove all history entries created during the todo's existence.
THE system SHALL ensure that permanently deleted todos and their history cannot be recovered.

IF a todo is restored from the trash, THE system SHALL restore its edit history along with it.

THE system SHALL maintain audit integrity by ensuring all history is removed when the parent todo is permanently deleted.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users must provide a valid email address when creating an account. Email addresses follow standard format with local part and domain separated by @. Each email address must be unique among all active user accounts. Duplicate email registrations are rejected with a clear error message. Passwords must meet minimum security requirements including character variety. Users can update their password at any time through account settings. When changing passwords, the new password must also meet security requirements. Display names are required for user accounts and have character limits. Display names can only contain alphanumeric characters and basic punctuation. Users cannot change their display name more than once per day to prevent abuse. The display name is used to identify users in the application interface. Email addresses are case-insensitive for login purposes but stored in lowercase.

### Email Format Validation

WHEN a user creates an account, THE system SHALL validate the email address format.

THE email address SHALL contain a local part followed by the @ symbol followed by a domain part.

THE email address SHALL match the standard email format pattern with valid characters in the local and domain parts.

IF the email format is invalid, THE system SHALL reject the account creation request with a clear error message.

THE system SHALL require a valid email format before any account operation is accepted.

### Email Validation Examples

Valid email formats:
- user@example.com
- john.doe@company.org
- test+tag@domain.net

Invalid email formats:
- missing-at-symbol
- no-domain-part@
- two-at-signs@@domain.com

### Duplicate Email Rejection

WHEN a user attempts to register with an email address, THE system SHALL check if that email already exists.

IF the email address is already registered, THE system SHALL reject the registration request.

THE system SHALL display a clear error message indicating the email is already in use.

THE system SHALL NOT allow multiple accounts with the same email address.

IF the registration fails due to duplicate email, THE system SHALL NOT create a partial account record.

### Duplicate Email Handling

When duplicate registration is detected:
- Registration is completely rejected
- No user account is created
- User receives clear error message
- No account deletion or rollback needed

### Password Security Requirements

WHEN a user creates a new account, THE system SHALL validate the password meets security requirements.

WHEN a user changes their password, THE system SHALL validate the new password meets security requirements.

THE password SHALL have a minimum length of 8 characters.

THE password SHALL contain at least one uppercase letter.

THE password SHALL contain at least one lowercase letter.

THE password SHALL contain at least one numeric digit.

THE password SHALL contain at least one special character from the set: !@#$%^&*()_+-=[]{}|;:,.<>?

IF the password fails any security requirement, THE system SHALL reject the request and list all unmet requirements.

THE system SHALL NOT store the password in plain text format.

### Password Change Policy

WHEN a logged-in user requests to change their password, THE system SHALL allow the operation.

WHEN a user changes their password, THE system SHALL invalidate any existing active sessions.

THE user SHALL be required to log in again with the new password after password change.

WHEN changing passwords, THE system SHALL require the user to provide their current password for verification.

IF the current password is incorrect, THE system SHALL reject the password change request.

WHEN a password change is successful, THE system SHALL log the change with timestamp and user identification.

THE system SHALL NOT allow the new password to match the previous password.

THE system SHALL require the new password to meet all security requirements before acceptance.

### Display Name Character Restrictions

WHEN a user sets or updates their display name, THE system SHALL validate the characters used.

THE display name SHALL contain only alphanumeric characters (A-Z, a-z, 0-9).

THE display name SHALL allow basic punctuation marks: hyphen (-), apostrophe ('), and period (.).

IF the display name contains invalid characters, THE system SHALL reject the update.

THE display name SHALL be required during account creation.

THE display name SHALL have a minimum length of 2 characters.

THE display name SHALL have a maximum length of 50 characters.

IF the display name validation fails, THE system SHALL display the allowed character set to the user.

### Daily Display Name Change Limit

WHEN a user attempts to change their display name, THE system SHALL check if a change was made within the last 24 hours.

IF the user has changed their display name within the last 24 hours, THE system SHALL reject the new change request.

THE system SHALL reset the change allowance at 00:00 UTC each day.

THE system SHALL display a clear message indicating how long until the next display name change is allowed.

THE display name change limit applies to all users equally without exceptions.

IF a display name change is rejected due to the daily limit, THE system SHALL record the reason in audit logs.

### Case-Insensitive Email Handling

WHEN a user logs in, THE system SHALL accept the email address in any case variation.

THE system SHALL store all email addresses in lowercase format internally.

WHEN comparing email addresses for uniqueness, THE system SHALL perform case-insensitive comparison.

THE system SHALL display the email address to users exactly as originally entered during account creation.

IF a user enters "User@Example.com" during registration, THE system SHALL store it as "user@example.com".

WHEN users attempt to log in with "USER@EXAMPLE.COM", THE system SHALL match it to "user@example.com".

THE system SHALL NOT allow two accounts that differ only in email case to exist.

### Account Creation Validation

WHEN a new user submits registration information, THE system SHALL validate all required fields.

THE system SHALL require a valid email address in correct format.

THE system SHALL require a password meeting all security requirements.

THE system SHALL require a display name with valid characters.

IF any validation fails, THE system SHALL reject the account creation and display all errors.

THE system SHALL allow the user to correct validation errors and resubmit.

WHEN account creation succeeds, THE system SHALL create a new user account with all provided data.

THE system SHALL NOT create a partial account if any field fails validation.

### Email Uniqueness Constraint

THE system SHALL enforce email uniqueness across all active user accounts.

WHEN validating a new registration, THE system SHALL check the entire user database for the email.

IF the email exists in any active account, THE registration SHALL be rejected.

THE uniqueness constraint applies even if the existing account is inactive or pending.

WHEN an account is deleted, THE email becomes available for new registrations.

THE system SHALL enforce uniqueness at the database level as well as the application layer.

IF a race condition occurs, THE system SHALL ensure only one account with that email is created.

### Password Complexity Rules

WHEN validating a password, THE system SHALL check all complexity rules comprehensively.

THE password complexity SHALL be evaluated in a single validation pass.

IF the password fails multiple complexity rules, THE system SHALL report all failures in a single error response.

THE system SHALL provide specific guidance on which characters need to be added or modified.

THE password SHALL NOT be a common or easily guessable password from a known list.

THE password SHALL NOT contain the user's email address as a substring.

THE password SHALL NOT contain the user's display name as a substring.

WHEN password complexity rules change, THE system SHALL enforce the new rules on all subsequent password changes.

## Todo Validation Rules

Every todo requires a title that identifies its purpose and content. Titles must contain at least one character and cannot be empty strings. There is a maximum length limit on todo titles to ensure readability. Descriptions are optional and can be left empty or contain any text content. Descriptions have a maximum character limit to prevent excessively long entries. Start dates are optional and when provided must be valid calendar dates. Start dates cannot be set to future dates relative to the creation date. Due dates are optional and when provided must be valid calendar dates. Due dates can be set to past dates for completed tasks. Start dates and due dates must follow consistent calendar date formatting. Users cannot set a due date earlier than the start date for logical consistency. Empty strings are rejected for required fields with appropriate error messages. Special characters in titles and descriptions are preserved and displayed correctly.

### Todo Title Validation

WHEN a user creates or edits a todo, THE system SHALL validate the title field.

THE system SHALL reject the request if the title field is missing.
THE system SHALL reject the request if the title field contains only whitespace.
THE system SHALL reject the request if the title exceeds 500 characters.
THE system SHALL accept titles with a minimum of 1 character.

WHEN a user provides a title with special characters, THE system SHALL preserve all characters exactly as entered.
THE system SHALL display special characters in titles correctly without modification or escaping.

IF the title validation fails, THE system SHALL return a business error message indicating the title is invalid.

### Todo Description Validation

WHEN a user creates or edits a todo, THE system SHALL process the description field.

THE system SHALL accept an empty string for the description field.
THE system SHALL accept a null value for the description field.
THE system SHALL reject the request if the description exceeds 10,000 characters.

WHEN a user provides a description with special characters, THE system SHALL preserve all characters exactly as entered.
THE system SHALL display special characters in descriptions correctly without modification.

IF the description validation fails, THE system SHALL return a business error message indicating the description is invalid.

### Start Date Validation

WHEN a user sets a start date on a todo, THE system SHALL validate the date value.

THE system SHALL accept null or empty values for the start date field.
THE system SHALL reject the request if the start date is not a valid calendar date.
THE system SHALL reject the request if the start date is in the future relative to the current date.

WHEN the start date is provided, THE system SHALL store it in consistent calendar date format.
THE system SHALL format all start dates consistently throughout the application.

IF the start date validation fails, THE system SHALL return a business error message indicating the date is invalid.

### Due Date Validation

WHEN a user sets a due date on a todo, THE system SHALL validate the date value.

THE system SHALL accept null or empty values for the due date field.
THE system SHALL reject the request if the due date is not a valid calendar date.
THE system SHALL accept due dates in the past, present, and future.

WHEN the due date is provided, THE system SHALL store it in consistent calendar date format.
THE system SHALL format all due dates consistently throughout the application.

IF the due date validation fails, THE system SHALL return a business error message indicating the date is invalid.

### Start and Due Date Relationship

WHEN a user sets both a start date and a due date on a todo, THE system SHALL validate their relationship.

IF the start date is provided and the due date is provided, THEN THE system SHALL reject the request if the due date is earlier than the start date.

WHEN the date relationship validation fails, THE system SHALL return a business error message indicating the due date must be on or after the start date.

IF only the start date is provided, THE system SHALL accept the todo without requiring a due date.
IF only the due date is provided, THE system SHALL accept the todo without requiring a start date.

### Empty String Rejection

WHEN a user provides input with only whitespace characters, THE system SHALL treat it as an empty string.

THE system SHALL reject the request if the title field contains only whitespace characters.
THE system SHALL treat empty strings as valid input for optional fields.

IF the system detects an empty or whitespace-only string for a required field, THE system SHALL return a business error message indicating the field cannot be empty.

THE system SHALL preserve empty strings for optional fields without generating validation errors.

## EditHistory Validation Rules

Every todo edit automatically generates a corresponding history entry. History entries are created immediately when users save changes to a todo. Each history record includes a timestamp of when the edit occurred. The timestamp uses precise datetime format including date and time components. History entries always reference the user who made the edit. Previous values for each modified field are captured before the change. If a field was unchanged during an edit, its previous value is null. Start date changes are validated to ensure logical date ordering. Due date changes are validated against the start date when both exist. History entries cannot be manually created by users through the interface. All history entries for a todo are accessible to the todo owner. History retention policy preserves all edits for the lifetime of the todo.

### Automatic History Generation on Todo Edit

WHEN a user edits any field of a todo, THE system SHALL automatically create an edit history entry.

IF a todo is modified by any user, THE system SHALL generate a corresponding history entry without requiring explicit user action.

IF the title field is changed during an edit, THE system SHALL record the previous title value in the history entry.

IF the description field is changed during an edit, THE system SHALL record the previous description value in the history entry.

IF the start date field is changed during an edit, THE system SHALL record the previous start date value in the history entry.

IF the due date field is changed during an edit, THE system SHALL record the previous due date value in the history entry.

### Edit Timestamp Precision and Recording

THE system SHALL record the timestamp of each edit with datetime precision including both date and time components.

WHEN an edit history entry is created, THE system SHALL capture the precise moment of the edit in the format YYYY-MM-DD HH:MM:SS.

THE system SHALL use the server time zone to record all edit timestamps consistently.

IF multiple edits occur to the same todo within the same second, THE system SHALL assign distinct timestamps to each history entry.

### User Edit Attribution

WHEN a todo is edited, THE system SHALL record the identity of the user who made the edit.

IF a todo belongs to User A but is edited by User B, THE system SHALL reject the edit unless User B has permission to edit User A's todos.

THE system SHALL associate each history entry with the user reference of the editor (editedBy).

IF a todo is deleted, THE system SHALL NOT allow the edit history to be modified by any user.

### Previous Value Recording for Modified Fields

WHEN an edit changes a field value, THE system SHALL capture and store the value that existed before the modification.

THE system SHALL record the title value that existed immediately before the edit in previousTitle.

THE system SHALL record the description value that existed immediately before the edit in previousDescription.

THE system SHALL record the start date value that existed immediately before the edit in previousStartDate.

THE system SHALL record the due date value that existed immediately before the edit in previousDueDate.

### Handling Unchanged Fields in History

WHEN a field is not changed during an edit, THE system SHALL set the corresponding previous value field to null in the history entry.

IF the title was not modified during an edit, THE system SHALL set previousTitle to null in the history entry.

IF the description was not modified during an edit, THE system SHALL set previousDescription to null in the history entry.

IF the start date was not modified during an edit, THE system SHALL set previousStartDate to null in the history entry.

IF the due date was not modified during an edit, THE system SHALL set previousDueDate to null in the history entry.

### Date Ordering Validation for Edits

WHEN a start date is modified, THE system SHALL validate that the new start date is not later than the due date (if a due date exists).

IF a due date is modified and a start date exists, THE system SHALL validate that the new due date is not earlier than the start date.

IF a start date is modified to a date that is after the existing due date, THE system SHALL reject the edit request.

IF a due date is modified to a date that is before the existing start date, THE system SHALL reject the edit request.

### History Entry Creation Timing

WHEN a user saves changes to a todo, THE system SHALL create history entries immediately before persisting the changes.

IF a todo edit is rejected by any validation, THE system SHALL NOT create a history entry.

IF a user successfully updates a todo, THE system SHALL create a history entry within the same transaction as the todo update.

THE system SHALL ensure that history entry creation cannot be manually triggered by users through the interface.

### Todo Owner Access to Edit History

THE system SHALL allow the owner of a todo to view the complete edit history of that todo.

IF a user views a todo that they own, THE system SHALL display all history entries for that todo.

IF a user does not own a todo, THE system SHALL NOT display the edit history of that todo to the user.

THE system SHALL sort history entries from most recent to oldest when displaying them to users.

### History Retention Policy

WHEN a todo is permanently deleted from trash, THE system SHALL permanently delete all edit history entries associated with that todo.

THE system SHALL preserve all edit history entries for the lifetime of the todo.

IF a todo is restored from trash, THE system SHALL restore all associated edit history entries.

IF a todo is archived or moved, THE system SHALL retain all edit history entries unchanged.

### Edit Field Capture Requirements

WHEN an edit is recorded, THE system SHALL capture the complete set of fields that were modified during the edit.

THE system SHALL record the timestamp when each edit was made in each history entry.

IF multiple fields are modified in a single edit operation, THE system SHALL create a single history entry containing all previous values.

THE system SHALL ensure that the edit history entry includes the editedBy user reference identifying who made the changes.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Filtering by Completion Status

WHEN a user views their todo list, THE system SHALL display todos filtered by completion status according to the user's selection.

WHEN a user selects "All todos" as the filter, THE system SHALL display all todos regardless of completion status.

WHEN a user selects "Only complete todos" as the filter, THE system SHALL display only todos with isComplete set to true.

WHEN a user selects "Only incomplete todos" as the filter, THE system SHALL display only todos with isComplete set to false.

IF a user requests a completion status filter that does not exist, THE system SHALL reject the request and display an error message.

IF the filter parameter is missing from the query, THE system SHALL default to showing all todos.

IF a user tries to filter by a completion status while viewing the trash, THE system SHALL apply the filter to deleted todos that match the status before deletion.

### Sorting by Creation Date

WHEN a user requests sorting by creation date, THE system SHALL return todos ordered by their creation timestamp.

WHEN a user requests "Newest first" sorting by creation date, THE system SHALL display todos with the most recently created items at the top of the list.

WHEN a user requests "Oldest first" sorting by creation date, THE system SHALL display todos with the least recently created items at the top of the list.

IF a user requests sorting by creation date with an invalid direction parameter, THE system SHALL reject the request and display an error message.

IF sorting is requested without a valid direction, THE system SHALL default to "Newest first".

WHEN a user applies sorting to the trash list, THE system SHALL sort deleted todos by their creation date according to the user's selection.

### Sorting by Start Date

WHEN a user requests sorting by start date, THE system SHALL return todos ordered by their startDate field.

WHEN a user requests "Earliest first" sorting by start date, THE system SHALL display todos with the earliest start dates at the top of the list.

WHEN a user requests "Latest first" sorting by start date, THE system SHALL display todos with the latest start dates at the top of the list.

WHEN sorting by start date, THE system SHALL display todos without a start date at the end of the list.

IF a user requests sorting by start date with an invalid direction parameter, THE system SHALL reject the request and display an error message.

IF todos are sorted by start date, THE system SHALL ensure todos with null start dates are consistently placed after todos with valid start dates.

### Sorting by Due Date

WHEN a user requests sorting by due date, THE system SHALL return todos ordered by their dueDate field.

WHEN a user requests "Earliest first" sorting by due date, THE system SHALL display todos with the earliest due dates at the top of the list.

WHEN a user requests "Latest first" sorting by due date, THE system SHALL display todos with the latest due dates at the top of the list.

WHEN sorting by due date, THE system SHALL display todos without a due date at the end of the list.

IF a user requests sorting by due date with an invalid direction parameter, THE system SHALL reject the request and display an error message.

IF todos are sorted by due date, THE system SHALL ensure todos with null due dates are consistently placed after todos with valid due dates.

IF a user sorts by due date and requests the trash list, THE system SHALL sort deleted todos by their original due date.

### Cursor-Based Pagination

WHEN a user requests their todo list, THE system SHALL return results using cursor-based pagination.

WHEN the system returns paginated results, THE system SHALL include a nextCursor value that allows the user to retrieve the next page of results.

WHEN the system returns paginated results, THE system SHALL include a previousCursor value that allows the user to retrieve the previous page of results.

IF there are no more results after the current page, THE system SHALL set nextCursor to null.

IF there are no more results before the current page, THE system SHALL set previousCursor to null.

IF a user provides an invalid or expired cursor, THE system SHALL reject the request and display an error message.

IF a user provides a cursor that does not belong to their account, THE system SHALL reject the request and display an error message.

IF a user requests pagination without specifying a cursor, THE system SHALL return the first page of results.

### Query Validation and Error Handling

IF a user provides a filter parameter that is not a valid completion status, THE system SHALL reject the request and display an error message.

IF a user provides a sort direction that is not a valid direction, THE system SHALL reject the request and display an error message.

IF a user provides a cursor that has been tampered with or modified, THE system SHALL reject the request and display an error message.

IF a user's query combines filters that result in no matching todos, THE system SHALL return an empty list rather than an error.

IF a user's query returns more results than the maximum allowed per page, THE system SHALL return only the maximum allowed number of results.

IF a user requests sorting with a field that is not supported, THE system SHALL reject the request and display an error message.

IF a user's request includes both a filter and pagination, THE system SHALL apply the filter first, then paginate the filtered results.

IF a user attempts to query todos from a different user's account, THE system SHALL reject the request and display an access denied error.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Todo Creation Validation

### Todo Creation Error Scenarios

WHEN a user creates a todo, THE system SHALL:
1. Validate that the title field is provided and not empty
2. Validate that any dates provided are valid calendar dates
3. Ensure the due date is not earlier than the start date if both are provided

IF the title is missing or empty, THE system SHALL reject the todo creation request.
IF the start date precedes the due date when both are specified, THE system SHALL reject the request.
IF a date field contains an invalid date format, THE system SHALL reject the request.

### Edit Operation Failures

WHEN a user edits a todo, THE system SHALL:
1. Verify the user owns the todo before applying any changes
2. Create an edit history entry before any modification is applied
3. Record all field changes including unchanged fields with null values

IF the user does not own the todo, THE system SHALL reject the edit request.
IF the todo has already been permanently deleted, THE system SHALL reject the edit request.
WHILE editing a todo, THE system SHALL preserve the original edit history before applying new changes.

### Edit History Access Constraints

WHEN a user requests edit history for a todo, THE system SHALL:
1. Verify the requesting user owns the todo
2. Return all history entries sorted from most recent to oldest
3. Include all change details: timestamp, previous values, and new values

IF the user does not own the todo, THE system SHALL reject the history access request.
IF the todo has been permanently deleted, THE system SHALL indicate that edit history is no longer available.
IF the todo has no edit history, THE system SHALL return an empty history list.

### Todo Access Violations

### Privacy and Ownership Enforcement

WHEN a user attempts to view any todo, THE system SHALL:
1. Verify the user owns the todo before returning any data
2. Reject the request if the todo belongs to another user
3. Never disclose that another user's todo exists

IF the user does not own the todo, THE system SHALL reject the request.
IF a user attempts to query todos they do not own, THE system SHALL exclude those todos from results.
WHEN listing todos, THE system SHALL only return todos owned by the requesting user.

### Permission-Based Rejection

WHEN a user attempts any todo operation, THE system SHALL:
1. Check if the user has appropriate ownership or permissions
2. Allow guests to only view public todos (none in this private app)
3. Require member status for all todo operations

IF the user is a guest, THE system SHALL reject all todo operations.
IF the user is not authenticated, THE system SHALL reject the request.
IF the user attempts to modify another user's todo, THE system SHALL reject the operation.

### User Authentication Failures

### Login Validation Errors

WHEN a user attempts to log in, THE system SHALL:
1. Validate email format if provided
2. Check that the email exists in the system
3. Verify the password matches the stored hash

IF the email format is invalid, THE system SHALL reject the login request.
IF the email does not exist, THE system SHALL indicate authentication failure without revealing existence.
IF the password does not match, THE system SHALL indicate authentication failure.

### Password Change Error Scenarios

WHEN a user attempts to change their password, THE system SHALL:
1. Verify the current password is correct before accepting a new one
2. Validate that the new password meets security requirements
3. Reject the change if the new password equals the current password

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the request.
WHILE changing password, THE system SHALL preserve the user account status until completion.

### Account Deletion Failures

WHEN a user requests account deletion, THE system SHALL:
1. Verify the account exists
2. Confirm all associated todos (including trash) will be permanently deleted
3. Execute the deletion atomically

IF the account does not exist, THE system SHALL reject the deletion request.
IF deletion cannot be completed, THE system SHALL preserve the account in its current state.
WHEN account deletion succeeds, THE system SHALL permanently remove all associated data.

### Deletion Error Scenarios

### Soft Delete Constraints

WHEN a user soft-deletes a todo, THE system SHALL:
1. Mark the todo as deleted without removing it from storage
2. Remove the todo from normal todo list views
3. Preserve all todo data including edit history
4. Add the todo to the user's trash folder

IF the user does not own the todo, THE system SHALL reject the soft delete request.
IF the todo is already in trash, THE system SHALL reject the soft delete request.
IF the todo has already been permanently deleted, THE system SHALL reject the soft delete request.

### Trash and Permanent Delete Failures

WHEN a user attempts to permanently delete from trash, THE system SHALL:
1. Verify the user owns the todo being deleted
2. Confirm the todo exists in the trash folder
3. Delete both the todo and its edit history permanently
4. Make recovery impossible after permanent deletion

IF the todo is not in the trash folder, THE system SHALL reject permanent deletion.
IF the user does not own the todo, THE system SHALL reject the permanent delete request.
WHEN permanent deletion completes, THE system SHALL irreversibly remove the todo and all associated data.

### Restore Operations

WHEN a user restores a todo from trash, THE system SHALL:
1. Verify the todo exists in the trash folder
2. Confirm the user owns the todo
3. Restore the todo to the normal todo list
4. Preserve all todo data including edit history

IF the todo does not exist in trash, THE system SHALL reject the restore request.
IF the user does not own the todo, THE system SHALL reject the restore request.
WHEN restoration succeeds, THE system SHALL make the todo visible in the normal todo list.

### Filtering and Sorting Validation

### Filtering Error Scenarios

WHEN a user applies filters to their todo list, THE system SHALL:
1. Accept only valid filter values: all, complete, or incomplete
2. Apply the filter to todos owned by the requesting user
3. Ignore filter requests from non-authenticated users

IF the filter value is not one of: all, complete, incomplete, THE system SHALL reject the filter request.
IF the user is not authenticated, THE system SHALL ignore filter parameters.
WHEN filtering applies, THE system SHALL return only todos matching the filter criteria.

### Sorting Validation Errors

WHEN a user requests sorting of todo list, THE system SHALL:
1. Accept only valid sort fields: creation date, start date, due date
2. Accept only valid sort directions: newest, oldest, earliest, latest
3. Handle todos without dates by placing them at the end

IF the sort field is invalid, THE system SHALL reject the sort request.
IF the sort direction is invalid, THE system SHALL reject the sort request.
IF sorting by start date, THE system SHALL place todos without start dates at the end.
IF sorting by due date, THE system SHALL place todos without due dates at the end.

### Pagination Constraints

WHEN a user requests paginated todo list, THE system SHALL:
1. Return todos one page at a time
2. Include metadata about total count and current page
3. Reject requests with invalid page numbers

IF the page number is less than 1, THE system SHALL reject the request.
IF the page size is invalid, THE system SHALL use the default page size.
WHEN pagination applies, THE system SHALL return only the requested page of results.