# Multi-User Todo Application Requirements Specification

## User Account

### Account Creation
WHERE a new user initiates registration, THE system SHALL request a valid email address and a password with minimum 8 characters including one uppercase letter and one special character.

WHEN a valid email address is provided, THE system SHALL send a verification email with a 15-minute expiration time.

IF the email verification link expires, THE system SHALL automatically generate a new verification link when the user requests it.

### Authentication
WHEN a user submits email and password for login, THE system SHALL authenticate credentials against the user store.

IF authentication fails after 5 attempts, THE system SHALL lock the account for 30 minutes.

AFTER successful authentication, THE system SHALL return a JWT token with a 2-hour lifespan.

### Password Management
WHEN a user submits a new password request, THE system SHALL require the current password for verification.

IF the current password is invalid, THE system SHALL return a 'Current password incorrect' error.

AFTER password update, THE system SHALL invalidate all active sessions.

### Account Deletion
WHEN a user requests account deletion, THE system SHALL require confirmation through an email verification link.

IF deletion is confirmed, THE system SHALL permanently remove all user data including todos, history, and associated metadata.

THE system SHALL send a confirmation email after deletion completion.

## User Profile

### Profile Information
WHEN a user accesses profile settings, THE system SHALL display current display name.

A user SHALL modify their display name by submitting a new name.

THE system SHALL enforce a 20-character maximum for display names.

### Privacy Enforcement
THE system SHALL ensure users cannot view other users' profiles.

IF a user attempts to access another user's profile, THE system SHALL return a 403 Forbidden response.

## Creating Todos

### Todo Creation Requirements
WHEN a user submits a new todo, THE system SHALL require a title (minimum 1 character).

OPTIONAL: Description, start date, due date MAY be provided.

IF no due date is provided, THE system SHALL set default due date to 'No due date'.

AFTER creation, THE system SHALL mark the todo as incomplete by default.

### Data Validation
WHEN a todo title is blank, THE system SHALL return a 'Title is required' error.

WHEN end date precedes start date, THE system SHALL return a 'Due date cannot precede start date' error.

## Viewing Todos

### Todo List Display
WHEN a user views their todo list, THE system SHALL display paginated results (10 items per page by default).

FOR EACH todo, THE system SHALL display: title, completion status, start date (if set), due date (if set), and creation date.

THE system SHALL order todos by creation date descending by default.

### Single Todo View
WHEN a user views a specific todo, THE system SHALL display full details including title, description, start date, due date, creation date, and modification dates.

## Completing Todos

### Toggle Completion
WHEN a user toggles a todo's completion status, THE system SHALL update the status between complete and incomplete.

AFTER a toggle, THE system SHALL record the timestamp of the update in the todo's history.

## Editing Todos

### Edit Process
WHEN a user edits a todo field, THE system SHALL capture the previous value and new value.

THE system SHALL validate all input against the rules for each field.

AFTER saving changes, THE system SHALL create a new history entry.

## Edit History

### History Storage
WHEN a todo is edited, THE system SHALL record: timestamp, previous title, new title, previous description, new description, previous start date, new start date, previous due date, new due date.

THE system SHALL ensure no history entry contains null values for edited fields.

### History Display
WHEN a user views a todo's history, THE system SHALL display entries from most recent to oldest.

THE system SHALL provide a clear indication of what changes were made for each entry.

## Deleting Todos

### Soft Delete Process
WHEN a user deletes a todo, THE system SHALL mark it as deleted without immediate physical removal.

THE system SHALL ensure deleted todos are excluded from the main todo list.

### Trash Management
WHEN a user views trash, THE system SHALL list only deleted todos with restore and permanent delete options.

IF a user selects 'Restore from trash', THE system SHALL move the todo back to the active todo list.

IF a user selects 'Permanent delete from trash', THE system SHALL remove the todo and all associated history entries.

## Filtering Todos

### Filter Implementation
WHEN a user selects 'All todos', THE system SHALL display all todos regardless of completion status.

WHEN a user selects 'Only complete todos', THE system SHALL filter to show only completed todos.

WHEN a user selects 'Only incomplete todos', THE system SHALL filter to show only incomplete todos.

## Sorting Todos

### Sort by Creation Date
WHEN a user sorts by creation date, THE system SHALL order todos from newest to oldest when 'Newest first' is selected.

WHEN 'Oldest first' is selected, THE system SHALL order from oldest to newest.

### Sort by Start Date
WHEN sorting by start date with 'Earliest first', THE system SHALL place todos with start dates first.

IF a todo has no start date, THE system SHALL place it at the end of the sorted list.

### Sort by Due Date
WHEN sorting by due date with 'Earliest first', THE system SHALL place todos with due dates first.

IF a todo has no due date, THE system SHALL place it at the end of the sorted list.

## Privacy

### Data Isolation
THE system SHALL enforce strict data isolation between users.

NO user SHALL access another user's todos under any circumstances.

IF a user attempts to access another user's data through API, THE system SHALL return a 403 Forbidden response.

## Security Requirements

### Data Storage
THE system SHALL store passwords using bcrypt with a work factor of 12.

THE system SHALL implement HTTPS for all communications.

### Session Management
AFTER a session expires, THE system SHALL invalidate the tokens.

THE system SHALL implement token rotation for every login.

## Performance Requirements

### Response Times
THE system SHALL load user's todo list within 1.5 seconds for up to 500 todos.

THE system SHALL handle up to 100 concurrent users without response time exceeding 2 seconds.

## Error Handling

### Standard Responses
WHEN a user request contains invalid data, THE system SHALL return a 400 Bad Request with detailed validation errors.

WHEN a requested resource does not exist, THE system SHALL return a 404 Not Found.

WHEN a user lacks necessary permissions, THE system SHALL return a 403 Forbidden.