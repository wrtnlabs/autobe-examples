## Core Functionality

THE system SHALL allow a single authenticated user to manage a personal collection of todo items. Each todo item SHALL represent a discrete task requiring completion. The system SHALL NOT support collaboration, sharing, task delegation, or multi-user access.

## User Interactions

WHEN a user creates a new todo item, THE system SHALL store it with a unique identifier, current timestamp, and initial status of 'pending'.

WHEN a user lists their todo items, THE system SHALL return all items owned by the authenticated user, sorted by creation timestamp in descending order (newest first).

WHEN a user marks a todo item as complete, THE system SHALL update its status to 'completed' and record the completion timestamp.

WHEN a user deletes a todo item, THE system SHALL permanently remove it from storage.

WHEN a user updates the text of a todo item, THE system SHALL replace the existing content with the new text while retaining all other properties (identifier, timestamps, status).

## Business Rules

THE user SHALL be able to create, read, update, and delete todo items (CRUD operations) only for items they own.

THE system SHALL require a valid authenticated session to perform any todo item operation.

WHERE a todo item has been marked as completed, THE system SHALL NOT allow its status to be reverted to 'pending'.

THE system SHALL store todo item text with a maximum length of 500 characters.

THE user SHALL NOT be able to create todo items with empty or whitespace-only content.

## Error Handling

IF a user attempts to create a todo item with empty or blank text, THEN THE system SHALL return an error with code 'TODO_INVALID_TEXT' and a human-readable message: 'Todo text cannot be empty or contain only whitespace'.

IF a user attempts to update or delete a todo item that does not exist, THEN THE system SHALL return an error with code 'TODO_NOT_FOUND' and a human-readable message: 'The requested todo item could not be found'.

IF a user attempts to update or delete a todo item that belongs to another user, THEN THE system SHALL return an error with code 'TODO_ACCESS_DENIED' and a human-readable message: 'You do not have permission to modify this todo item'.

IF a user attempts to mark a todo item as complete that is already completed, THEN THE system SHALL return an error with code 'TODO_ALREADY_COMPLETED' and a human-readable message: 'This todo item is already marked as completed'.

IF the authentication token is invalid, expired, or missing, THEN THE system SHALL return an error with code 'AUTH_INVALID_TOKEN' and a human-readable message: 'Authentication required'.

## Performance Requirements

WHEN a user loads their list of todo items, THE system SHALL display results within 1 second for up to 1,000 items.

WHEN a user creates, updates, or deletes a todo item, THE system SHALL complete the operation and acknowledge success within 500 milliseconds.

THE system SHALL remain responsive during concurrent user interactions, with no noticeable delay under typical usage patterns (up to 10 operations per minute).