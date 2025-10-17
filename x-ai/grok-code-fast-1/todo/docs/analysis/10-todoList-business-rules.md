# Todo List Application Business Rules

## Task Validation Rules

WHEN a user attempts to create a new task, THE system SHALL validate that the task title is not empty and does not exceed 100 characters.

WHEN a user submits a task creation request, THE system SHALL require the user to be authenticated and validate that the task belongs to the current user.

IF a task creation violates any validation rules, THEN THE system SHALL reject the request and provide specific error messages explaining the violations.

WHEN a user attempts to update a task status, THE system SHALL validate that the user is authenticated and is the owner of the task.

WHILE updating task information, THE system SHALL enforce that only the task owner can modify their tasks.

WHEN deleting a task, THE system SHALL confirm that the authenticating user owns the task before proceeding with deletion.

THE system SHALL not allow tasks to be created, updated, or deleted by unauthenticated users.

## Business Logic

WHEN a user marks a task as complete, THE system SHALL update the completion status and record the completion timestamp, but maintain the task in the list for reference.

WHEN a user creates a task, THE system SHALL assign a unique identifier and set the creation timestamp automatically.

WHILE displaying task lists, THE system SHALL order tasks by creation date with newest first.

WHEN a user views their tasks, THE system SHALL only display tasks owned by that user, ensuring data privacy.

IF a user has no tasks, THEN THE system SHALL display a clear empty state message encouraging task creation.

WHILE managing tasks, THE system SHALL ensure that all operations (create, read, update, delete) can only be performed by the task owner.

THE system SHALL automatically associate new tasks with the authenticated user who created them.

## Data Constraints

EACH task SHALL have a title with minimum 1 character and maximum 100 characters.

TASK descriptions SHALL be optional and limited to 500 characters if provided.

EACH task SHALL have a unique identifier assigned automatically by the system.

ALL tasks SHALL include creation timestamps for proper ordering.

TASK completion status SHALL be a binary value: either incomplete or complete.

USERS SHALL be limited to 1,000 active tasks to prevent abuse and maintain performance.

EACH task SHALL belong to exactly one user and cannot be shared or transferred.

TASK data SHALL be stored securely with user authentication required for all access.

## Operational Boundaries

THE system SHALL focus exclusively on task management: creation, viewing, status updates, and deletion.

THE system SHALL not include features like task sharing, comments, attachments, or advanced categorization.

ALL operations SHALL require user authentication with JWT token validation.

THE system SHALL respond to all API requests within 2 seconds under normal conditions.

THE system SHALL support 1,000 concurrent users with maintained performance.

BACKEND architecture decisions (database schema, API design, etc.) SHALL be determined by development team.

THE system SHALL ensure 99.9% uptime for core task management functionality.

REVIEWS and requirements SHALL be business-focused, not technical implementation details.