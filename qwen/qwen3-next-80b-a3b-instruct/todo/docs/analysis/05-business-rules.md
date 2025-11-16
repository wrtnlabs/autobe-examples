## Business Rules

Business rules define the operational constraints that govern data integrity, user behavior, and system response. These are not functional requirements—they are the implicit laws of the system that ensure consistency, security, and correctness. Every backend developer must implement these rules verbatim. Failure to implement any of these rules constitutes a functional defect.

### Data Validation Rules

The system imposes strict validation on todo item text content to ensure data integrity and prevent system degradation.

- WHEN a user creates or updates a todo item, THE system SHALL reject the operation if the todo text is empty (zero characters).
- WHEN a user creates or updates a todo item, THE system SHALL reject the operation if the todo text contains only whitespace characters (spaces, tabs, newlines).
- WHEN a user creates or updates a todo item, THE system SHALL reject the operation if the todo text exceeds 255 characters in length.
- WHEN a user creates or updates a todo item, THE system SHALL accept the operation only if the todo text is between 1 and 255 non-whitespace characters inclusive.
- WHERE a todo item is submitted with invalid text content, THE system SHALL return a 400 Bad Request error with a human-readable message specifying the exact validation failure.

These rules are non-negotiable and must be enforced at the API entry point before any database interaction. No sanitization, trimming, or automatic correction of user input is permitted.

### Status Transition Rules

The completion status of a todo item is a binary state with strict transition rules.

- WHILE a todo item exists, THE system SHALL permit only two valid states: "incomplete" (default) and "completed".
- WHEN a user marks a todo item as complete, THE system SHALL set its status to "completed" and record the timestamp.
- WHEN a user marks a completed todo item as incomplete, THE system SHALL reset its status to "incomplete" and clear the completion timestamp.
- IF a todo item has an unknown or invalid status value (e.g., "pending", "archived"), THEN THE system SHALL treat it as "incomplete" and return a non-critical warning to logs (user-facing behavior remains unchanged).
- WHERE a todo item is returned in a list, THE system SHALL never expose internal status codes (e.g., 0/1); only the human-readable strings "incomplete" and "completed" are permitted.

There are no intermediate, pending, or deprecated states. No status transitions may occur other than the two defined above.

### Ownership Enforcement

Every todo item is exclusively owned by the authenticated user who created it. Cross-user data access is a critical security violation.

- WHEN a user attempts to read, update, or delete a todo item, THE system SHALL verify that the item’s owner ID matches the authenticated user’s ID.
- IF the requesting user’s ID does not match the todo item’s owner ID, THEN THE system SHALL reject the request with a 403 Forbidden response.
- WHEN a user creates a todo item, THE system SHALL automatically assign the item’s owner field to the authenticated user’s ID.
- THE system SHALL never expose to any user the existence of a todo item owned by another user, even if a direct ID is guessed or brute-forced.
- WHERE a request is made without authentication (missing or invalid JWT), THE system SHALL return 401 Unauthorized and abort all processing.

Ownership validation must occur on every write operation and every read operation. No exceptions. No bypasses.

### Concurrency Rules

The system assumes no concurrent modifications to the same todo item. Simultaneous edits are not handled with locking or versioning.

- WHEN two requests modify the same todo item simultaneously, THE system SHALL process the last request that reaches the database and overwrite the previous state without notification.
- IF a user refreshes a todo list and sees an unexpected change, THE system SHALL not display an error or conflict warning.
- WHERE multiple clients edit the same item concurrently, THE system SHALL not implement optimistic locking, check-then-update, or version fields.
- THE system SHALL not maintain any audit trail of changes (e.g., modified_at, modified_by, version_number).
- No conflict resolution UI, prompts, or data merge logic is required or permitted.

This is intentional. The minimal design prioritizes simplicity over collision handling. Developers must not add concurrency controls.

### Data Persistence Guarantees

The system has minimal persistence guarantees aligned with a personal, ephemeral productivity tool.

- WHEN a todo item is successfully created, THE system SHALL persist it to the database and return a confirmation immediately.
- WHEN a todo item is successfully marked as complete or incomplete, THE system SHALL persist the updated status and timestamp to the database.
- WHEN a todo item is successfully deleted, THE system SHALL permanently remove it from persistent storage with no recovery mechanism.
- WHERE a user logs out, THE system SHALL NOT persist any client-side cache or local storage state.
- THE system SHALL not synchronize data across devices or sessions.
- IF the database fails to persist a write, THEN THE system SHALL return a 500 Internal Server Error and log the failure for monitoring.
- THE system SHALL never automatically back up or archive data.

Persistence is linear, atomic, and irreversible. No version history. No recovery. No incremental sync.

### Error Handling Rules

All errors must return user-friendly, actionable feedback without exposing technical system details.

- IF authentication fails (invalid JWT, expired token, missing token), THEN THE system SHALL return a 401 Unauthorized status with message: "Please log in to access your to-do list."
- IF a todo item’s text fails validation (empty, whitespace-only, or exceeds 255 characters), THEN THE system SHALL return a 400 Bad Request status with message: "Todo text must be 1-255 characters and cannot be empty or only whitespace."
- IF a user attempts to access a todo item not owned by them, THEN THE system SHALL return a 403 Forbidden status with message: "You do not have permission to access this item."
- IF the database fails to respond or encounters an internal error during a read or write, THEN THE system SHALL return a 500 Internal Server Error status with message: "Server error. Please try again later."
- IF any endpoint receives malformed JSON (invalid request body), THEN THE system SHALL return a 400 Bad Request status with message: "Invalid request format. Please ensure your request body is valid JSON."
- THE system SHALL never return stack traces, SQL queries, file paths, environment variables, or any technical debugging information to the user or client.
- THE system SHALL never expose enumeration of todo items belonging to other users, even with high-privilege system credentials.

Error messages are a user-facing contract. They must be consistent, helpful, and never alarming.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*