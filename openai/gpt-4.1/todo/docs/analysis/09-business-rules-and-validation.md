# Business Rules and Validation for Todo Management

## Introduction
This document specifies all business rules and data validation requirements for managing todo items in the todoList application. Its purpose is to ensure that developers enforce consistent, high-quality data and behavior at the business logic level, as experienced by authenticated users (todoUser). All rules must be applied regardless of implementation technology, supporting the minimum, production-grade Todo list functionalities.

## Required Fields

All todo items SHALL include the following required fields:

| Field            | Required | Data Type   | Description                                                                |
|------------------|----------|-------------|----------------------------------------------------------------------------|
| id               | Yes      | UUID        | Unique identifier for the todo item (system-assigned)                      |
| ownerId          | Yes      | UUID        | Reference to the user (todoUser) who created the todo                      |
| title            | Yes      | string      | Short, clear description of the todo task                                  |
| isCompleted      | Yes      | boolean     | Whether the task has been completed                                        |
| createdAt        | Yes      | datetime    | Timestamp for when the todo was created (system-assigned)                  |
| updatedAt        | Yes      | datetime    | Timestamp for last modification (system-assigned)                          |
| completedAt      | No       | datetime    | Timestamp for when the task is completed                                   |
| description      | No       | string      | Optional detailed explanation or notes                                     |

### EARS Requirements (Required Fields)
- THE system SHALL reject creation of a todo item WHEN any required field is missing.
- WHEN a new todo is created, THE system SHALL automatically assign unique id, createdAt, updatedAt, and set isCompleted to false.
- WHEN a todo item is updated, THE system SHALL update updatedAt to current timestamp.
- WHERE a field is marked not required, THE system SHALL allow it to be omitted.

## Value Constraints

### Title
- Type: string
- Minimum Length: 1 character
- Maximum Length: 100 characters
- MUST NOT be empty or consist only of whitespace
- MUST allow any visible Unicode character
- EARS: WHEN a todo item is created or updated, THE system SHALL reject the request IF title is missing, empty, exceeds 100 characters, or is whitespace only.

### Description (Optional)
- Type: string
- Maximum Length: 500 characters
- May be empty
- EARS: WHERE description field is provided, THE system SHALL reject the request IF description exceeds 500 characters.

### isCompleted
- Type: boolean
- Only accepted values: true or false
- EARS: THE system SHALL accept only boolean values for isCompleted field.

### completedAt
- Type: datetime; nullable
- WHEN isCompleted is true, completedAt MUST be present and a valid ISO 8601 timestamp
- WHEN isCompleted is false, completedAt MUST be null or absent
- EARS: WHEN a todo is marked as completed, THE system SHALL require a valid completedAt value.
- EARS: WHEN a todo is not completed, THE system SHALL require completedAt to be null or omitted.

### ownerId
- Type: UUID
- MUST match the authenticated user's id (todoUser)
- EARS: WHEN a todo is created, THE system SHALL set ownerId to the authenticated user's id. THE system SHALL prohibit assignment of ownerId to a different user.

### id
- Type: UUID
- System-assigned; unique per todo item
- EARS: WHEN a todo is created, THE system SHALL assign a new, unique id to the todo.

### createdAt, updatedAt
- Type: datetime ISO 8601
- System-assigned
- EARS: WHEN a todo is created, THE system SHALL set createdAt and updatedAt to the current timestamp.
- WHEN a todo is modified, THE system SHALL update updatedAt to the current timestamp.

## Uniqueness Rules

- Each todo item SHALL have a unique id across the entire system.
- THE system SHALL allow multiple todos with identical titles/descriptions as long as their ids and ownerIds are different.
- EARS: THE system SHALL enforce id uniqueness for every todo item.
- WHERE two todos have the same title, THE system SHALL permit this as long as their id values differ.

## Completion Criteria

### Marking as Completed
- WHEN a todoUser marks a todo as completed, THE system SHALL set isCompleted to true AND completedAt to the current timestamp.
- A todo cannot transition to isCompleted = true multiple times; attempting to mark an already-completed todo as completed again SHALL produce no effect.

### Marking as Not Completed
- WHEN a todoUser marks a todo as not completed, THE system SHALL set isCompleted to false and completedAt to null.
- EARS: WHEN a todo is uncompleted, THE system SHALL ensure completedAt is null.

## Business Rule Enforcement Scenarios (EARS)

- WHEN a todoUser creates a todo, THE system SHALL verify all required fields and value constraints, and SHALL reject the creation IF any rule is violated.
- WHEN a todoUser updates a todo, THE system SHALL verify that only the owner can modify their todo and SHALL reject update attempts by other users.
- WHEN a todo is deleted, THE system SHALL allow only the owner to perform the deletion; attempting to delete another user's todo SHALL be rejected.
- WHEN a todo is marked as completed, THE system SHALL update isCompleted and completedAt accordingly.
- WHEN a todo is marked as not completed, THE system SHALL update isCompleted to false and completedAt to null.

## Examples and Non-examples

### Example: Valid Todo Creation
- title: "Buy groceries"
- description: "Milk, eggs, cereal"
- isCompleted: false
- completedAt: null
- System assigns id, ownerId, createdAt, updatedAt

### Non-example: Rejected Due to Missing Required Field
- title omitted → REJECTED

### Non-example: Rejected Due to Invalid Title
- title: "    " (whitespace only) → REJECTED

### Example: Valid Completion
- original isCompleted: false, completedAt: null
- user action: mark as completed
- new isCompleted: true, completedAt: [timestamp]

### Example: Valid Uncomplete
- original isCompleted: true, completedAt: [timestamp]
- user action: uncomplete
- new isCompleted: false, completedAt: null

## Summary
These business rules and validation requirements must be enforced by the backend for all todo operations. Adhering to these rules will ensure user data consistency, prevent errors, and provide a seamless experience for todoUsers by upholding data integrity throughout the application's lifecycle.