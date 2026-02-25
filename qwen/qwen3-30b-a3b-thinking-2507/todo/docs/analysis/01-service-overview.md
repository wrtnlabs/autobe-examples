# Multi-User Todo Application Requirements Specification

## 1. User Account Management

**WHEN** a user registers with email and password, **THE** system **SHALL** require a valid email format and password with minimum 8 characters, **AND** send a verification email to the provided address.

**IF** a user attempts to register with an existing email, **THE** system **SHALL** display a clear error message: "An account with this email already exists. Please use a different email or recover your existing account."

**WHEN** a user submits credentials for login, **THE** system **SHALL** validate the email/password combination and generate a JWT token for session management.

**IF** a login attempt exceeds 5 failed attempts within 15 minutes, **THE** system **SHALL** lock the account for 30 minutes and notify the user via email.

**WHEN** a user submits a password change request, **THE** system **SHALL** verify the current password before allowing a new password to be set.

**WHEN** a user deletes their account, **THE** system **SHALL** permanently remove all associated data including todos, edit history, and profile information with no possibility of recovery.

**WHEN** a user confirms account deletion through the double verification process, **THE** system **SHALL** immediately delete all records in the database.

## 2. User Profile Management

**THE** user profile **SHALL** include only the display name field, visible only to the authenticated user.

**WHEN** a user edits their display name, **THE** system **SHALL** validate the new name to be 2-30 characters, alphanumeric with spaces, **AND** allow the update without requiring password confirmation.

**IF** a user attempts to view another user's profile, **THE** system **SHALL** block the request and return an HTTP 403 Forbidden response with the message: "User profile access is restricted to authenticated owners only."

**THE** system **SHALL** never expose user profile information in error messages or API responses beyond the current authenticated user.

## 3. Todo Creation

**WHEN** a user creates a new todo, **THE** system **SHALL** require a title (minimum 1 character), **AND** allow optional description, start date, and due date fields.

**IF** no completion status is specified, **THE** system **SHALL** default to incomplete (status: false).

**WHEN** a new todo is created, **THE** system **SHALL** generate a unique ID and timestamp for the creation date.

**WHEN** a user submits a todo with only a title, **THE** system **SHALL** accept the submission with all other fields (description, start date, due date) set to null.

## 4. Todo Viewing

**WHEN** a user requests their todo list, **THE** system **SHALL** return paginated results (default 10 items per page, maximum 100 per page).

**THE** todo list **SHALL** display for each entry: title, completion status (✓ or ✗), creation date, start date (if set), and due date (if set).

**WHEN** a user requests a single todo detail, **THE** system **SHALL** return the complete contents including full description, history, and creation/modification timestamps.

**THE** api **SHALL** sort todos by creation date (newest first) by default, with options to change sort order.

## 5. Todo Completion

**WHEN** a user marks a todo as complete, **THE** system **SHALL** toggle the completion status (true), **AND** record the change in the edit history.

**WHEN** a user marks a todo as incomplete, **THE** system **SHALL** toggle the completion status (false), **AND** record the change in the edit history.

**THE** system **SHALL** not allow marking a todo as complete if it's already marked complete, and vice versa.

## 6. Todo Editing

**WHEN** a user edits any field of a todo, **THE** system **SHALL** validate the new value before saving:
- Title: 1-100 characters
- Description: 0-5000 characters
- Start date: valid date in future or past
- Due date: valid date in future or past

**WHEN** an edit occurs, **THE** system **SHALL** create a new entry in the edit history with all modified fields.

**THE** system **SHALL** allow editing of any todo while it's in the trash.

## 7. Edit History

**THE** edit history **SHALL** contain a chronological record of all modifications made to a todo.

**WHEN** a user views edit history, **THE** system **SHALL** show entries from most recent to oldest.

**EACH** history entry **SHALL** include:
- Timestamp of change
- Title change (if any)
- Description change (if any)
- Start date change (if any)
- Due date change (if any)

**WHEN** a todo is permanently deleted, **THE** system **SHALL** delete its entire edit history with no trace remaining in storage.

## 8. Todo Deletion

**WHEN** a user deletes a todo, **THE** system **SHALL** mark it as soft-deleted (is_deleted=true) **AND** remove it from the main list.

**THE** system **SHALL** not prevent a user from deleting any todo they own.

## 9. Trash Management

**WHEN** a user requests the trash, **THE** system **SHALL** return a paginated list of soft-deleted todos.

**WHEN** a user restores a todo from trash, **THE** system **SHALL** mark it as active (is_deleted=false) **AND** return it to the main todo list.

**WHEN** a user permanently deletes a todo from trash, **THE** system **SHALL** remove all records including related edit history.

**THE** system **SHALL** retain trash items for 30 days before automatically purging them.

## 10. Filtering and Sorting

**WHEN** a user applies filtering by completion status, **THE** system **SHALL** support three options:
- All Todos
- Only Complete Todos
- Only Incomplete Todos

**WHEN** sorting by any date field (creation, start, due), **THE** system **SHALL** sort according to user selection (newest first or oldest first).

**IF** a todo has no start date, **THE** system **SHALL** position it at the end of the list when sorted by start date.

**IF** a todo has no due date, **THE** system **SHALL** position it at the end of the list when sorted by due date.

**THE** system **SHALL** allow filtering and sorting combinations with no data conflicts.

## 11. Privacy Requirements

**THE** system **SHALL** guarantee complete data isolation between users, with no possible data leakage between accounts.

**WHEN** a user is authenticated, **THE** system **SHALL** limit all data access to that user's own records only.

**IF** any operation attempts to access another user's data, **THE** system **SHALL** return HTTP 403 Forbidden with message: "Access denied - user data is private and not accessible to other accounts."

**THE** system **SHALL** ensure that no shared resources, APIs, or endpoints inadvertently expose data across user accounts.

**THE** system **SHALL** not log any actions that could potentially leak user data, including user IDs or email addresses in error messages or audit logs.