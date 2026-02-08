# Multi-User Todo Application Requirements Specification

## 1. User Account Management

### 1.1 User Registration
WHEN a new user provides a unique email address and a password,
THE system SHALL create a new user account.

THE system SHALL validate that the email is unique and properly formatted.

THE system SHALL securely store the user's password using strong hashing.

### 1.2 User Login
WHEN an existing user submits a valid email and password,
THE system SHALL authenticate the user and establish a session.

THE system SHALL deny access when credentials are invalid.

### 1.3 Password Change
WHEN a logged-in user requests to change their password,
THE system SHALL verify the current password and then update to the new password securely.

### 1.4 Account Deletion
WHEN a logged-in user requests account deletion,
THE system SHALL permanently delete the user account and ALL associated data,
INCLUDING todos and their histories, even those in trash.

THE system SHALL notify the user upon successful account deletion.


## 2. User Profile Management

### 2.1 Profile Data
Each user SHALL have a private profile consisting of a display name.

### 2.2 Profile Edit
WHEN a user requests to update their display name,
THE system SHALL validate and save the new display name.

### 2.3 Profile Privacy
Users SHALL NOT be able to view or access other users' profiles.


## 3. Todo Creation

WHEN a logged-in user submits a create todo request with a title,
THE system SHALL create a new todo item owned by the user.

The title is REQUIRED; description, start date, and due date are optional.

New todos SHALL be marked incomplete by default.

The optional dates (start and due) SHALL accept ISO 8601 format or null if not set.


## 4. Viewing Todos

### 4.1 Todo List
WHEN a user requests their todo list,
THE system SHALL provide a paginated list of todos owned by that user.

### 4.2 List Item Details
Each todo in the list SHALL show title, completion status, start date (if set), due date (if set), and creation date.

### 4.3 Single Todo Details
WHEN a user requests a single todo by ID,
THE system SHALL return full details including the description.


## 5. Completing Todos

WHEN a user toggles a todo's completion status,
THE system SHALL update the todo to complete or incomplete accordingly.

This toggling SHALL be binary and instantaneous.


## 6. Editing Todos

WHEN a user submits edits to their todo's title, description, start date, or due date,
THE system SHALL validate and save the changes.

THE system SHALL record every edit as a distinct history entry with timestamp and changed fields.


## 7. Edit History Management

### 7.1 History Entries
WHEN a todo is edited, THE system SHALL create a history entry.

Each history entry SHALL record the timestamp of the edit.

The entry SHALL include the new value for title, description, start date, and due date ONLY if those were changed.

### 7.2 History Viewing
WHEN a user requests the edit history of a todo,
THE system SHALL return a list of history entries sorted from most recent to oldest.


## 8. Deleting Todos

WHEN a user deletes a todo,
THE system SHALL perform a soft delete by marking the todo as deleted.

Soft deleted todos SHALL NOT appear in the normal todo list.


## 9. Trash Management

### 9.1 Trash Listing
WHEN a user views their trash,
THE system SHALL provide a paginated list of soft deleted todos owned by the user.

Each trash todo SHALL show title, completion status, start date, due date, creation date, and deletion date.

### 9.2 Restoring Todos
WHEN a user restores a todo from trash,
THE system SHALL mark it as active and include it back in the normal todo list.

THE system SHALL retain the full edit history upon restore.

### 9.3 Permanent Deletion
WHEN a user permanently deletes a todo from trash,
THE system SHALL irreversibly remove the todo and its edit history from the system.

### 9.4 Trash Access Control
THE system SHALL enforce strict ownership access controls on trash items.

Users SHALL NOT view or modify other users' trash.


## 10. Filtering Todos

Users SHALL be able to filter their todo list by completion status:
- All todos
- Only complete todos
- Only incomplete todos


## 11. Sorting Todos

Users SHALL be able to sort their todos by:
- Creation date (newest first or oldest first)
- Start date (earliest first or latest first), placing todos without start date last
- Due date (earliest first or latest first), placing todos without due date last


## 12. Privacy and Security

### 12.1 Todo Privacy
Each user's todos SHALL be entirely private.

Users SHALL NOT access or view other users' todos.

### 12.2 Access Control
THE system SHALL verify that all todo operations are performed only by the owner.

### 12.3 Authentication
User authentication SHALL protect access to all endpoints.

Sessions SHALL be managed securely with JWT or equivalent.


---

## Mermaid Diagram: Todo Lifecycle

```mermaid
graph LR
  "User Creates Todo" --> "System Saves Todo as Incomplete"
  "User Views Todo List" --> "System Returns Paginated List"
  "User Views Single Todo" --> "System Returns Todo Details"
  "User Edits Todo" --> "System Records Edit History Entry"
  "User Deletes Todo" --> "System Marks Todo as Deleted (Soft Delete)"
  "Deleted Todo" --> "Does Not Appear in Normal List"
  "Deleted Todo" --> "Appears in Trash List"
  "User Restores Todo" --> "System Marks Todo as Active"
  "User Permanently Deletes Todo" --> "System Removes Todo and Edit History"
  "User Toggles Completion" --> "System Updates Completion Status"

  "User Views Trash" --> "System Returns Paginated Trash List"

```