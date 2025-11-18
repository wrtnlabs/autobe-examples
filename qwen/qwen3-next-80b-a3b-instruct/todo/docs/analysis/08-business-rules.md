## Business Rules for Todo List System

This document defines the core business rules that govern the behavior, validation, lifecycle, and access control of todo items within the Todo List service. These rules are written in natural language and use EARS format to ensure clarity, testability, and implementation readiness for backend developers. All rules are derived from the defined user actors (guest and member) and the overall system scope. Technical implementation details such as database schemas, API endpoints, or code structures are intentionally excluded.

### Todo Item Validation Rules

Todo items must adhere to strict input constraints to ensure data integrity and prevent malformed entries.

WHEN a user submits a new todo item, THE system SHALL validate that the title property is not empty or consists only of whitespace characters.

WHEN a user submits a new todo item, THE system SHALL validate that the title property contains no more than 200 characters.

WHEN a user submits a new todo item, THE system SHALL validate that the description property, if provided, contains no more than 1000 characters.

WHEN a user submits a new todo item, THE system SHALL validate that the title property is not null.

WHEN a user submits a new todo item, THE system SHALL validate that the completed property, if provided, is a boolean value.

WHILE a todo item is being updated, THE system SHALL re-apply all validation rules defined above.

### Duplicate Item Prevention

The system must prevent identical todo items from being created multiple times by the same user to avoid clutter and confusion.

IF a user attempts to create a todo item with a title and description that exactly matches an existing todo item owned by the same user, THEN THE system SHALL reject the request and return a user-friendly message indicating that a duplicate item already exists.

WHERE a user has submitted a todo item with the same title as another item, but a different description, THE system SHALL accept the new item as a distinct entry.

WHERE a user has submitted a todo item with the same title and description as an already deleted item, THE system SHALL allow the creation of the new item, as deletion resets the uniqueness constraint.

### Access Control Rules

Access to todo items is strictly limited to the user who created them. No cross-user access or visibility is permitted.

WHEN a user attempts to retrieve a todo item, THE system SHALL only return items where the owner ID matches the authenticated user's ID.

WHEN a user attempts to update a todo item, THE system SHALL verify that the todo item's owner ID matches the authenticated user's ID; if not, THE system SHALL deny the request.

WHEN a user attempts to delete a todo item, THE system SHALL verify that the todo item's owner ID matches the authenticated user's ID; if not, THE system SHALL deny the request.

IF a user attempts to access a todo item by ID that was created by another user, THEN THE system SHALL return HTTP 404 (Not Found) as though the item does not exist.

IF a guest (unauthenticated user) attempts to create, update, or delete a todo item, THEN THE system SHALL deny the request and return HTTP 401 (Unauthorized).

### Status Transition Rules

Todo items have a lifecycle defined by their completion status. Transitions between states are strictly controlled.

WHEN a todo item is created, THE system SHALL set its completed status to false by default.

WHEN a user marks a todo item as completed, THE system SHALL update the completed property to true and record the timestamp of the change.

WHEN a user unmarks a completed todo item, THE system SHALL update the completed property to false and record the timestamp of the change.

WHILE a todo item is marked as completed, THE system SHALL allow the user to toggle its status back to incomplete at any time.

WHILE a todo item is marked as incomplete, THE system SHALL allow the user to toggle its status to completed at any time.

IF a user attempts to set the completed property to a value other than true or false, THEN THE system SHALL ignore the invalid value and retain the existing status.

### Soft Delete Logic

Deletion of todo items is implemented as a soft delete to preserve data integrity and enable potential recovery.

WHEN a user deletes a todo item, THE system SHALL set the deletedAt property to the current timestamp and mark the item as logically deleted.

WHILE a todo item has a non-null deletedAt value, THE system SHALL exclude it from all list responses and detail retrievals.

WHILE a todo item is logically deleted, THE system SHALL prevent any update or reactivation attempts except for permanent deletion.

IF a user attempts to restore a deleted todo item by setting deletedAt to null, THEN THE system SHALL reject the request and return a message indicating that restoration is not supported.

IF a user attempts to create a new todo item with the same title and description as a logically deleted item owned by the same user, THEN THE system SHALL permit the creation, as the deleted item does not count against duplicate prevention.

### Default Behavior Rules

The system defines consistent, intuitive behaviors for edge cases and unprovided inputs.

WHEN a user creates a todo item without providing a description, THE system SHALL store the description as an empty string.

WHEN a user creates a todo item without providing the completed flag, THE system SHALL treat it as false.

WHEN a user updates a todo item without including the description field, THE system SHALL retain the existing description value.

WHEN a user updates a todo item without including the completed field, THE system SHALL retain the existing completed status.

WHEN a user views their todo list and no items exist, THE system SHALL return an empty list without error.

WHERE a user has no todo items, THE system SHALL display an empty list state with a message indicating that no tasks are pending.

WHEN a user logs in for the first time, THE system SHALL display an empty todo list initialized with no items.

IF a user's session expires and they attempt to perform any action on a todo item, THEN THE system SHALL redirect them to the login page and preserve their intended destination for post-authentication redirection.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*