# Multi-User Todo Application Requirements Specification

## 1. User Account Management

### 1.1 User Registration
- WHEN a new user registers, THE system SHALL require an email address and password.
- THE system SHALL validate that the email is unique and properly formatted.
- THE system SHALL store the user's credentials securely.

### 1.2 User Authentication
- WHEN a user attempts to log in, THE system SHALL verify the provided email and password.
- THE system SHALL deny access with an appropriate error message if the credentials are invalid.
- THE system SHALL create a secure session or issue a token upon successful authentication.

### 1.3 Password Management
- WHEN a logged-in user requests to change their password, THE system SHALL require the current password for verification.
- THE system SHALL enforce password strength requirements.
- THE system SHALL update the password securely if verification passes.

### 1.4 Account Deletion
- WHEN a user requests to delete their account, THE system SHALL delete the user profile and permanently remove all associated todos, including todos in trash.
- THE system SHALL confirm the deletion action with the user to prevent accidental deletion.

## 2. User Profile

### 2.1 Profile Information
- EACH user SHALL have a profile with a display name.
- WHEN a user updates their display name, THE system SHALL validate and save the new value.

### 2.2 Privacy
- USERS SHALL NOT be able to view or edit other users' profiles.
- THE system SHALL enforce access controls to restrict profile information visibility to the owning user only.

## 3. Todo Management

### 3.1 Creating Todos
- WHEN a user creates a todo, THE system SHALL require a title.
- THE system SHALL allow optional description, start date, and due date fields.
- THE system SHALL set the completion status of new todos to incomplete by default.

### 3.2 Viewing Todos
- USERS SHALL be able to view a paginated list of their own todos.
- EACH todo entry in the list SHALL include title, completion status, start date (if set), due date (if set), and creation date.
- USERS SHALL be able to view the full details of a single todo, including the full description.

### 3.3 Completing Todos
- USERS SHALL be able to toggle a todo between complete and incomplete states.

### 3.4 Editing Todos
- USERS SHALL be able to edit the title, description, start date, and due date of their todos.
- WHEN a todo is edited, THE system SHALL create an edit history entry recording the timestamp and any field changes.

### 3.5 Edit History
- EACH todo SHALL maintain an edit history with entries recording:
  - Edit timestamp
  - Changes to title, description, start date, and due date if any
- USERS SHALL be able to view the full edit history for any todo they own.
- HISTORY entries SHALL be sorted from most recent to oldest.

### 3.6 Deleting Todos
- USERS SHALL be able to delete their todos.
- DELETION SHALL be a soft delete; deleted todos SHALL NOT appear in the standard todo list.

## 4. Trash Management

### 4.1 Viewing Trash
- USERS SHALL be able to view a paginated list of their deleted todos in trash.

### 4.2 Restoring Todos
- USERS SHALL be able to restore deleted todos from the trash, returning them to the normal todo list.

### 4.3 Permanent Deletion
- USERS SHALL be able to permanently delete todos from the trash.
- PERMANENT deletion SHALL remove the todo and all associated edit history entries.

## 5. Filtering and Sorting Todos

### 5.1 Filtering
- USERS SHALL be able to filter their todo list by completion status with options:
  - All todos
  - Only completed todos
  - Only incomplete todos

### 5.2 Sorting
- USERS SHALL be able to sort their todo list by:
  - Creation date (newest first or oldest first)
  - Start date (earliest first or latest first)
  - Due date (earliest first or latest first)
- TODOS without start date SHALL appear at the end of the list when sorting by start date.
- TODOS without due date SHALL appear at the end of the list when sorting by due date.

## 6. Privacy and Security

### 6.1 Data Privacy
- USERS SHALL only be able to access their own todos and profile information.
- THE system SHALL enforce strict access control ensuring no user can view or manipulate another user's data.

### 6.2 Authentication and Authorization
- THE system SHALL require users to authenticate before accessing any todo management features.
- ACCESS permissions SHALL be granted based on user ownership of todos.

---

This specification provides comprehensive requirements for a multi-user todo application, including account management, secure profile privacy, todo lifecycle and edit history tracking, trash management with soft and permanent deletion, and filtering/sorting functionality, all governed by strict privacy and access control rules to ensure data security and user isolation.