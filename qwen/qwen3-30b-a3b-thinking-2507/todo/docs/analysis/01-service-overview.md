# Multi-User Todo Application Requirements

## 1. User Account Management

### 1.1 Sign Up Process
WHEN a user wants to create a new account, THE system SHALL provide an email address and password field for registration.
IF the email address is already registered in the system, THEN THE system SHALL display an error message "This email is already associated with an existing account".
WHEN a user submits a valid email and password combination, THE system SHALL create a new user account and send a verification email to confirm the email address.

### 1.2 Login Process
WHEN a user accesses the login page, THE system SHALL display fields for email address and password.
IF a user submits invalid credentials, THEN THE system SHALL display an error message "Invalid email or password" and prevent access.
WHEN a user successfully logs in, THE system SHALL generate a secure session token and redirect the user to their todo dashboard.

### 1.3 Password Management
WHEN a user requests to change their password, THE system SHALL prompt for their current password, the new password, and confirmation of the new password.
IF the new password does not meet the minimum complexity requirements (8 characters, including special characters, uppercase, lowercase), THEN THE system SHALL display an error message "Password must be at least 8 characters long and contain special characters and uppercase letters".
WHEN a user successfully changes their password, THE system SHALL invalidate all existing session tokens associated with that account.

### 1.4 Account Deletion
WHEN a user requests to delete their account, THE system SHALL display a confirmation dialog asking "Are you sure you want to delete your account? This cannot be undone."
IF the user confirms the deletion, THEN THE system SHALL permanently delete all associated data including todos, edit history, and user profile.
WHEN a user's account is deleted, THE system SHALL automatically log the user out of all sessions and remove their account from all system records.

## 2. User Profile Management

### 2.1 Profile Information
WHEN a user accesses their profile settings, THE system SHALL display their current display name.
IF a user changes their display name, THEN THE system SHALL validate that it meets the minimum length requirement (2 characters) and does not contain prohibited characters.
WHEN a user successfully updates their display name, THE system SHALL update their profile information and display a confirmation message "Display name updated successfully".

### 2.2 Profile Privacy
THE system SHALL ensure that a user's profile information (display name) is visible only to themselves; NO other user shall be able to view another user's profile.
WHEN a user attempts to view another user's profile, THEN THE system SHALL display an error message "You cannot view other users' profiles in this private todo application".

## 3. Todo Creation

### 3.1 Core Requirements
WHEN a user creates a new todo item, THE system SHALL require a title field.
IF the user leaves the title field empty, THEN THE system SHALL display an error message "Todo title is required" and prevent creation.
WHEN a user creates a new todo, THE system SHALL automatically set the completion status to "incomplete".

### 3.2 Optional Fields
WHEN a user provides a description for a todo item, THE system SHALL store the description and display it when viewing the full todo details.
IF the description exceeds 10,000 characters, THEN THE system SHALL truncate it to 10,000 characters and display a warning "Description has been shortened to 10,000 characters".

### 3.3 Date Constraints
WHEN a user specifies a start date for a todo item, THE system SHALL allow the date to be entered in ISO 8601 format (YYYY-MM-DD).
IF the user specifies a start date that is after the due date, THEN THE system SHALL display an error message "Start date cannot be after the due date" and prevent saving.

## 4. Todo Viewing

### 4.1 List View
WHEN a user views their todos, THE system SHALL display a paginated list with a maximum of 20 todos per page.
EACH todo in the list SHALL show: title, completion status, start date (if set), due date (if set), and creation date.
WHEN a user filters the todo list to show only incomplete todos, THE system SHALL hide all complete todos from the visible list.

### 4.2 Single Todo View
WHEN a user selects a todo to view in detail, THE system SHALL display the full description, all date fields (start, due), and creation date.
THE system SHALL display an edit button that allows the user to modify the todo content.
WHEN a user views a completed todo, THE system SHALL display a visual indicator (such as a checkmark) to show its completed status.

## 5. Todo Completion

### 5.1 Status Toggle
WHEN a user toggles a todo item's completion status, THE system SHALL update the status between complete and incomplete.
IF a user marks a todo as complete, THEN THE system SHALL update the completion status immediately and display a confirmation message "Todo marked as complete".
IF a user marks a todo as incomplete, THEN THE system SHALL update the status immediately and display a confirmation message "Todo marked as incomplete".

## 6. Todo Editing

### 6.1 Edit Process
WHEN a user edits any field of a todo item, THE system SHALL save the changes to the todo and create an entry in the edit history.
WHEN a user saves an edit to a todo, THE system SHALL display a confirmation message "Todo updated successfully".

### 6.2 History Tracking
WHEN a todo is edited, THE system SHALL record the timestamp of the edit in UTC format.
THE system SHALL document the previous value and new value for each field that changed during the edit.

## 7. Edit History

### 7.1 History Display
WHEN a user views the edit history of a todo, THE system SHALL display history entries ordered from most recent to oldest.
EACH history entry SHALL show the timestamp, the changed fields, and the old and new values for those fields.
IF a field wasn't changed during an edit, THE system SHALL omit that field from the history entry.

### 7.2 History Completeness
THE system SHALL record every edit made to a todo item, including changes to title, description, start date, and due date.
THE system SHALL not record history entries for no changes (e.g., when the user opens and closes the edit form without making changes).

## 8. Todo Deletion

### 8.1 Soft Deletion
WHEN a user deletes a todo item, THE system SHALL move it to the trash (soft delete) rather than permanently removing it from the database.
THE system SHALL remove the todo from the main todo list but keep it accessible in the trash.

### 8.2 Trash Management
WHEN a user views the trash, THE system SHALL display deleted todos with a visual indicator (trash icon).
WHEN a user restores a todo from the trash, THE system SHALL move it back to the main todo list.
WHEN a user permanently deletes a todo from the trash, THE system SHALL remove it and all its history from the database.

## 9. Filtering and Sorting

### 9.1 Filtering Requirements
WHEN a user applies the "all todos" filter, THE system SHALL display all todos regardless of completion status.
WHEN a user applies the "only complete todos" filter, THE system SHALL display only todos with completion status set to "complete".
WHEN a user applies the "only incomplete todos" filter, THE system SHALL display only todos with completion status set to "incomplete".

### 9.2 Sorting Requirements
WHEN a user sorts by due date with "earliest first" option, THE system SHALL display todos with the earliest due dates first.
WHEN a user sorts by due date with "latest first" option, THE system SHALL display todos with the latest due dates first.
IF a todo does not have a due date, THEN THE system SHALL display it at the end of the sorted list.

## 10. Privacy Requirements

### 10.1 Data Isolation
WHEN a user accesses their todos, THE system SHALL ensure they see only their own todos.
IF a user attempts to access another user's todos, THEN THE system SHALL display an error message "You cannot access other users' todos" and prevent access.

### 10.2 Session Management
WHILE a user is authenticated, THE system SHALL verify that every todo operation is performed on the user's own todos.
IF a user attempts to edit another user's todo, THE system SHALL prevent the operation and display an error message "You cannot edit another user's todos".

## 11. Authentication Requirements

### 11.1 Session Management
WHEN a user remains inactive for 30 minutes, THE system SHALL automatically log them out of the application.
WHEN a user logs out, THE system SHALL invalidate their session token and redirect them to the login page.

### 11.2 Security Measures
THE system SHALL store all passwords using secure hashing algorithms with salt.
THE system SHALL implement a cooldown period of 15 seconds after failed login attempts to prevent brute force attacks.

> *All requirements in this document have been validated against the business context and follow EARS format for testable, measurable requirements.*