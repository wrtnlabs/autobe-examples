# Multi-User Todo Application

## 1. User Account

The user account system supports account lifecycle management including signup, authentication, password management, and account deletion.

- WHEN a user signs up with an email and password, THE system SHALL validate the uniqueness of the email and create a new user account with securely hashed password credentials.
- WHEN a user attempts to log in with email and password, THE system SHALL authenticate by verifying credentials, and if valid, create an authenticated user session with a JWT token.
- WHEN a user requests a password change, THE system SHALL verify the current password, validate the new password against security policies, and update the stored credentials securely.
- WHEN a user deletes their account, THE system SHALL permanently remove the user account and all associated todos, including those in the trash, from the system.
- THE system SHALL prevent registration or login attempts with invalid or malformed email addresses.
- THE system SHALL enforce password complexity requirements, such as minimum length and character variety.

## 2. User Profile

Users have private profiles containing display names.

- WHEN a user views their profile, THE system SHALL return the display name information.
- WHEN a user updates their display name, THE system SHALL validate the input to prevent invalid characters or excessively long strings and update the profile.
- THE system SHALL forbid users from viewing others' profiles to maintain privacy.

## 3. Creating Todos

Users can create new todos with required and optional data fields.

- WHEN a user creates a todo, THE system SHALL require a non-empty title.
- THE description, start date, and due date fields are optional; WHEN omitted, they SHALL be stored as null.
- NEW todos SHALL have a default completion status of incomplete.
- THE system SHALL validate date fields for proper format and logical consistency (e.g., start date not after due date).

## 4. Viewing Todos

Users can retrieve their own todos with pagination and detailed views.

- WHEN a user requests a todo list, THE system SHALL return a paginated list of todos filtered to that user's ownership.
- EACH todo in the list SHALL contain: title, completion status, start date (if set), due date (if set), and creation date.
- WHEN a user requests a single todo, THE system SHALL return all details including full description.

## 5. Completing Todos

Todos can be toggled between complete and incomplete states.

- WHEN a user toggles the completion status of a todo, THE system SHALL update the todo's status accordingly.
- THE system SHALL only allow the owner of a todo to change its completion status.

## 6. Editing Todos

Users may update title, description, start date, and due date of their todos.

- WHEN a user edits a todo's fields, THE system SHALL apply changes and validate inputs.
- EACH successful edit SHALL create an edit history entry documenting the timestamp and values changed.
- THE system SHALL maintain an immutable edit history that cannot be modified by users.

## 7. Edit History

Todos maintain a history of edits with detailed change information.

- EACH edit history entry SHALL record: time of edit, new title (if changed), new description (if changed), new start date (if changed), and new due date (if changed).
- WHEN a user views a todo's edit history, THE system SHALL return history entries sorted from most recent to oldest.
- THE system SHALL ensure only the todo owner can access the edit history.

## 8. Deleting Todos

Soft delete functionality is implemented for todo removal.

- WHEN a user deletes a todo, THE system SHALL mark it as deleted (soft delete) so it is excluded from the normal todo list.
- THE system SHALL prevent non-owners from deleting todos.

## 9. Trash

A trash system manages deleted todos with restoration and permanent deletion.

- WHEN a user views the trash, THE system SHALL return a paginated list of their deleted todos.
- WHEN a user restores a todo from trash, THE system SHALL mark it as active to reappear in the todo list.
- WHEN a user permanently deletes a todo from the trash, THE system SHALL erase the todo and all associated edit history permanently.
- THE system SHALL only allow these trash management actions for the owner of the todo.

## 10. Filtering Todos

Users can filter their todo lists by completion status.

- THE system SHALL provide filters for: all todos, only complete todos, and only incomplete todos.
- Filtering SHALL apply only to the user's own todos.

## 11. Sorting Todos

Users can sort their todos by creation, start, or due dates.

- THE system SHALL support sorting by creation date (newest/oldest first), start date (earliest/latest first), and due date (earliest/latest first).
- TODOS missing start date SHALL be shown at the end when sorting by start date.
- TODOS missing due date SHALL be shown at the end when sorting by due date.

## 12. Privacy

Strict privacy controls ensure data isolation.

- USERS SHALL only have access to their own todos and profile information.
- THE system SHALL enforce access control preventing any user from viewing or manipulating another user's data.
- ALL user data SHALL be isolated in storage and access layers.

## Authentication and Authorization

- THE system SHALL use JWT tokens for authenticated sessions.
- USERS SHALL be required to authenticate before performing any CRUD operations on todos or profile.
- ACTIONS SHALL be authorized based on user ownership of resources.

## Error Handling

- THE system SHALL return meaningful error messages when operations fail due to invalid input, unauthorized access, or other errors.
- ERROR responses SHALL include clear descriptions to guide users in corrective actions.

## Performance Considerations

- THE system SHALL implement efficient pagination to support large todo lists.
- THE system SHALL have appropriate response time goals to ensure good user experience.


This specification provides a comprehensive, detailed foundation for developers to implement the multi-user todo application backend with robust authentication, privacy, and complete feature coverage.