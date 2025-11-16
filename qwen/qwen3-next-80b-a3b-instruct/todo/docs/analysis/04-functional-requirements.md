# Functional Requirements

This document defines all functional requirements for the Todo List application using EARS (Easy Approach to Requirements Syntax). These requirements are written in natural language for backend developers to implement unambiguously. All requirements are scoped to individual users only. No sharing, collaboration, or administrative features are included.

## Authentication Requirements

WHEN a user registers with an email and password, THE system SHALL create a new user account with a unique identifier and store only a bcrypt hash of the password.

WHEN a user attempts to log in with valid credentials, THE system SHALL validate the password hash and issue a JSON Web Token (JWT) with a 15-minute expiration time.

WHEN a user provides invalid credentials during login, THE system SHALL return HTTP 401 Unauthorized with the error code "AUTH_INVALID_CREDENTIALS".

WHEN a user attempts to access any protected endpoint without a valid JWT, THE system SHALL return HTTP 401 Unauthorized with the error code "AUTH_MISSING_TOKEN".

WHEN a user’s JWT has expired, THE system SHALL return HTTP 401 Unauthorized with the error code "AUTH_TOKEN_EXPIRED".

WHEN a user logs out, THE system SHALL invalidate the current JWT session and clear session state on the server.

## Todo Item Management Requirements

WHEN a user creates a new todo item, THE system SHALL accept a text field containing 1 to 255 non-whitespace characters and store it as an uncompleted task with a unique identifier and timestamp of creation.

WHEN a user submits a todo item with text shorter than 1 character, THE system SHALL reject the request and return HTTP 400 Bad Request with the error code "TODO_INVALID_LENGTH".

WHEN a user submits a todo item with text longer than 255 characters, THE system SHALL reject the request and return HTTP 400 Bad Request with the error code "TODO_INVALID_LENGTH".

WHEN a user submits a todo item with only whitespace characters, THE system SHALL reject the request and return HTTP 400 Bad Request with the error code "TODO_INVALID_CONTENT".

WHEN a user requests their todo list, THE system SHALL return an array of all todo items owned by the authenticated user, ordered by creation timestamp ascending, with each item containing: id, text, completed status, and createdAt timestamp.

WHEN a user requests a specific todo item by ID, THE system SHALL return the item if it exists and is owned by the authenticated user.

WHEN a user requests a todo item that does not exist, THE system SHALL return HTTP 404 Not Found with the error code "TODO_NOT_FOUND".

WHEN a user requests a todo item owned by another user, THE system SHALL return HTTP 404 Not Found with the error code "TODO_NOT_FOUND".

WHEN a user marks a todo item as completed, THE system SHALL update the completed field to true and preserve the createdAt and updatedAt timestamps.

WHEN a user marks a todo item as incomplete, THE system SHALL update the completed field to false and preserve the createdAt and updatedAt timestamps.

WHEN a user updates a todo item’s text, THE system SHALL replace the existing text provided the new value is between 1 and 255 characters.

WHEN a user attempts to update a todo item with text shorter than 1 character or longer than 255 characters, THE system SHALL reject the update and return HTTP 400 Bad Request with the error code "TODO_INVALID_LENGTH".

WHEN a user attempts to update a todo item not owned by them, THE system SHALL return HTTP 404 Not Found with the error code "TODO_NOT_FOUND".

WHEN a user deletes a todo item, THE system SHALL permanently remove the item from storage.

WHEN a user attempts to delete a todo item not owned by them, THE system SHALL return HTTP 404 Not Found with the error code "TODO_NOT_FOUND".

WHERE a todo item exists, THE system SHALL allow its status to be toggled between completed and incomplete only.

## Data Persistence Requirements

THE system SHALL persist all todo items in a durable, atomic storage layer.

THE system SHALL guarantee that each todo item is permanently associated with exactly one user via the authenticated user ID.

WHEN a todo item is deleted, THE system SHALL ensure the data is permanently removed and unrecoverable.

## Return Format Requirements

WHEN returning a single todo item, THE system SHALL use the following JSON structure:
{
  "id": "string",
  "text": "string",
  "completed": "boolean",
  "createdAt": "ISO 8601 datetime string"
}

WHEN returning a list of todo items, THE system SHALL use the following JSON structure:
[
  {
    "id": "string",
    "text": "string",
    "completed": "boolean",
    "createdAt": "ISO 8601 datetime string"
  }
]

WHEN returning an error response, THE system SHALL use the following JSON structure:
{
  "error": "string",
  "code": "string",
  "message": "string"
}

## User Session Requirements

THE system SHALL require JWT-based authentication for all requests except registration.

THE system SHALL embed the user ID and role in the JWT payload as follows:
{
  "userId": "string",
  "role": "user"
}

WHEN a JWT is issued, THE system SHALL set its expiration time to 15 minutes.

WHILE a user maintains a valid JWT, THE system SHALL allow full access to their todo items.

IF a user is inactive for 30 days, THE system SHALL retain their data but SHALL NOT automatically delete it.

IF a user deletes their account, THE system SHALL permanently delete all associated todo items and user records.