# Todo List Service

## Overview

The Todo List service is a simple personal productivity application that allows users to create, view, update, and delete personal task items. The system is designed around strict data ownership — each user can only access their own todos. There are no administrative functions, no shared lists, and no collaboration features. This is a minimal viable product designed to be used by a single user.

The system enforces two actor roles: guest and member. A guest is an unauthenticated visitor, while a member is a registered, authenticated user. All functionality for managing todos is exclusive to members. There is no public sharing mechanism, and no data persists for guests beyond the current session.

The system does not implement soft deletes, bulk operations, search, filtering, tags, categories, reminders, or integrations. It focuses exclusively on the core CRUD operations on a user’s personal todo list.

## Functional Requirements

### Authentication States

- THE system SHALL recognize two distinct actor states: guest and member.
- IF a user is not authenticated, THEN THE system SHALL treat them as a guest.
- IF a user has successfully completed registration and login via email and password, THEN THE system SHALL recognize them as a member.
- WHEN a member logs out, THEN THE system SHALL downgrade their state to guest, invalidating any active session token.
- WHILE a user is a guest, THE system SHALL NOT store any identifying information beyond current browser session.
- WHILE a user is a member, THE system SHALL maintain an authenticated session using a cryptographically signed JWT token.

### Todo Item Creation

- WHEN a member submits a new todo item with a non-empty title, THEN THE system SHALL create a new todo record linked to the member's user ID.
- WHEN a member submits a new todo item with an empty title, THEN THE system SHALL reject the request with HTTP 400 Bad Request and respond with: "Todo title cannot be empty."
- WHEN a member submits a new todo item with a title longer than 200 characters, THEN THE system SHALL reject the request with HTTP 400 Bad Request and respond with: "Title exceeds maximum length of 200 characters."
- WHEN a member submits a new todo item, THE system SHALL assign the status "incomplete" by default.
- WHEN a member submits a new todo item, THE system SHALL automatically set the creation timestamp to the current time in UTC.
- IF a guest attempts to create a todo item, THEN THE system SHALL respond with HTTP 401 Unauthorized and return no data.

### Todo Item Retrieval

- WHEN a member requests their list of todo items, THEN THE system SHALL return only those items where the owner ID matches the authenticated member's user ID.
- WHEN a member requests their list of todo items, THEN THE system SHALL return the following fields for each item: id, title, status, createdAt, and updatedAt.
- WHEN a member requests their list of todo items, THE system SHALL return items in descending order by creation timestamp (newest first).
- WHEN a member requests their todo list, THE system SHALL return an empty array if no todos exist under their account.
- IF a guest requests any todo item, THEN THE system SHALL respond with HTTP 401 Unauthorized and return no data.
- IF a member attempts to retrieve a specific todo item by ID that does not belong to them, THEN THE system SHALL respond with HTTP 403 Forbidden and return no data.

### Todo Item Updates

- WHEN a member updates the title of their own todo item, THEN THE system SHALL accept the change and update the 'updatedAt' timestamp.
- WHEN a member updates the status of their own todo item to "completed", THEN THE system SHALL set the status field to "completed" and record the completion timestamp.
- WHEN a member updates the status of their own todo item to "incomplete", THEN THE system SHALL set the status field to "incomplete" and clear the completion timestamp.
- WHEN a member updates the title of their own todo item to an empty string, THEN THE system SHALL reject the update with HTTP 400 Bad Request and respond with: "Todo title cannot be empty."
- WHEN a member updates the title of their own todo item to longer than 200 characters, THEN THE system SHALL reject the update with HTTP 400 Bad Request and respond with: "Title exceeds maximum length of 200 characters."
- IF a member attempts to update a todo item that does not belong to them, THEN THE system SHALL respond with HTTP 403 Forbidden and return no data.
- IF a guest attempts to update any todo item, THEN THE system SHALL respond with HTTP 401 Unauthorized and return no data.

### Todo Item Deletion

- WHEN a member deletes their own todo item, THEN THE system SHALL mark the item as 'deleted' (soft delete) and hide it from all future read responses.
- WHEN a member deletes their own todo item, THE system SHALL retain the item in the database with a 'deletedAt' timestamp, but exclude it from list queries.
- WHEN a member attempts to delete a todo item, THE system SHALL NOT permit bulk deletion of more than 100 items in a single request.
- IF a member attempts to delete more than 100 items in a single request, THEN THE system SHALL reject the request with HTTP 400 Bad Request and respond with: "Bulk deletion limited to 100 items at once for performance and safety."
- IF a guest attempts to delete a todo item, THEN THE system SHALL respond with HTTP 401 Unauthorized and return no data.
- IF a member attempts to delete a todo item that does not belong to them, THEN THE system SHALL respond with HTTP 403 Forbidden and return no data.

### Todo Status Management

- THE system SHALL recognize only two valid statuses: "incomplete" and "completed".
- WHEN a todo item is first created, THE system SHALL set its status to "incomplete".
- WHEN a member marks a todo item as completed, THE system SHALL set its status to "completed" and record the completion time in a dedicated timestamp field.
- WHEN a member marks a completed todo item as incomplete, THE system SHALL set its status to "incomplete" and erase the completion timestamp.
- IF a request includes a status value other than "incomplete" or "completed", THEN THE system SHALL reject it with HTTP 400 Bad Request and respond with: "Invalid status value. Use 'incomplete' or 'completed'."

## User Scenarios

### Scenario 1: Guest Visit to Application

- WHEN a guest visits the Todo List application:
  - THE system SHALL display a public landing page describing the service.
  - THE system SHALL NOT display any user data, lists, or forms.
  - THE system SHALL offer a clear button to "Create Account".
  - THE system SHALL allow the guest to navigate to the registration page.

### Scenario 2: Member Registration

- WHEN a guest enters a valid email and password on the registration page:
  - THE system SHALL create a new user account with a unique user ID.
  - THE system SHALL send an activation confirmation email.
  - THE system SHALL automatically log the user in and redirect them to their todo list.
- WHEN a guest enters an email already registered:
  - THE system SHALL display: "An account with this email already exists. Please log in or reset your password."
- WHEN a guest enters an invalid email format:
  - THE system SHALL display: "Please enter a valid email address."
- WHEN a guest enters a password shorter than 8 characters:
  - THE system SHALL display: "Password must be at least 8 characters long."

### Scenario 3: Member Login

- WHEN a member enters correct credentials on the login page:
  - THE system SHALL validate the email and password.
  - THE system SHALL issue a signed JWT access token.
  - THE system SHALL redirect to the member’s todo list.
- WHEN a member enters incorrect credentials:
  - THE system SHALL display: "Invalid email or password. Please try again."
- WHEN a member enters an email not registered:
  - THE system SHALL display: "Invalid email or password. Please try again."

### Scenario 4: Creating a Todo Item

- WHEN a member is on their todo list:
  - THE system SHALL display an input field and a "Add Todo" button.
- WHEN a member enters "Buy groceries" and clicks "Add Todo":
  - THE system SHALL create a new todo item with title "Buy groceries", status "incomplete", and current timestamp.
  - THE system SHALL display the new item in the list.
- WHEN a member clicks "Add Todo" with an empty input:
  - THE system SHALL show an error message: "Todo title cannot be empty."
  - THE system SHALL NOT create any item.

### Scenario 5: Completing a Todo Item

- WHEN a member clicks the "Mark as completed" button on a todo item:
  - THE system SHALL set the status to "completed".
  - THE system SHALL display a checkmark icon next to the item.
  - THE system SHALL record the time of completion.
- WHEN a member later clicks the "Mark as incomplete" button:
  - THE system SHALL set the status to "incomplete".
  - THE system SHALL remove the checkmark icon.
  - THE system SHALL clear the completion timestamp.

### Scenario 6: Editing a Todo Item

- WHEN a member clicks "Edit" on their todo item:
  - THE system SHALL display a pre-populated text field with the existing title.
- WHEN a member changes "Buy groceries" to "Buy groceries and toilet paper" and clicks "Save":
  - THE system SHALL update the title in the database.
  - THE system SHALL update the 'updatedAt' timestamp.
  - THE system SHALL display the updated title.
- WHEN a member attempts to edit the title to be empty:
  - THE system SHALL show an error: "Todo title cannot be empty."
  - THE system SHALL NOT update the item.
- WHEN a member attempts to edit the title to longer than 200 characters:
  - THE system SHALL show an error: "Title exceeds maximum length of 200 characters."
  - THE system SHALL NOT update the item.

### Scenario 7: Deleting a Todo Item

- WHEN a member clicks "Delete" on a todo item:
  - THE system SHALL mark the item as deleted (soft delete).
  - THE system SHALL immediately remove the item from the visible list.
  - THE system SHALL retain the item in the database with a deletedAt timestamp.
- WHEN a member attempts to delete 150 items in one click:
  - THE system SHALL display: "Bulk deletion limited to 100 items at once for performance and safety."
  - THE system SHALL NOT delete any items.

### Scenario 8: Logging Out

- WHEN a member clicks "Log Out":
  - THE system SHALL invalidate the JWT access token.
  - THE system SHALL clear the authentication cookie from the browser.
  - THE system SHALL redirect to the public landing page.
  - THE system SHALL return the user to guest state.

## Error Handling

- IF the database connection fails:
  - THE system SHALL respond with HTTP 503 Service Unavailable.
  - THE system SHALL show user message: "Service temporarily unavailable. Please try again later."
- IF invalid JWT token presented:
  - THE system SHALL respond with HTTP 401 Unauthorized.
  - THE system SHALL clear client session and redirect to login.
- IF malformed JSON in request body:
  - THE system SHALL respond with HTTP 400 Bad Request.
  - THE system SHALL show: "Invalid request format. Expected JSON."
- IF authentication token expired:
  - THE system SHALL respond with HTTP 401 Unauthorized.
  - THE system SHALL redirect guest to login.

## Performance Expectations

- THE system SHALL respond to login requests within 500ms under normal load.
- THE system SHALL return a member’s todo list (up to 100 items) within 300ms.
- THE system SHALL create, update, or delete a single todo item within 200ms.
- THE system SHALL support up to 500 concurrent users.
- THE system SHALL return a response within 1 second even under peak load.

## Security and Compliance

- THE system SHALL store all passwords as bcrypt-hashed values with salt.
- THE system SHALL use HTTPS for all communication between client and server.
- THE system SHALL set JWT tokens with 24-hour expiration.
- THE system SHALL NOT store any personal data beyond email and hashed password.
- THE system SHALL NOT share user data with any third parties.
- THE system SHALL allow users to permanently delete their account — this will trigger hard deletion of all associated todo items.
- THE system SHALL record all authentication failures in log files for security auditing purposes.

## Future Considerations

- Support for markdown in todo item descriptions
- Due dates and reminders
- Categories or tags for organization
- Dark mode toggle
- Export/import functionality
- Mobile application

## References

- [09-actor-responsibilities.md]: Details on guest and member permissions
- [03-functional-requirements.md]: Original functional spec — superseded by this document
- [04-user-journey.md]: Original user journey mapping — superseded by this document
- [05-error-handling.md]: Original error responses — superseded by this document