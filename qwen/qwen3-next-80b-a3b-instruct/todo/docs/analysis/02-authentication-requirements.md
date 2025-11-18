# Functional Requirements for Todo List Application

## Todo Item Creation

WHEN a member submits a new todo item with a title, THE system SHALL accept the request and create a new todo item with the following default state:

- status: "pending"
- createdAt: current timestamp (UTC)
- updatedAt: current timestamp (UTC)
- userId: ID of authenticated member

WHEN a member submits a new todo item with an empty title, THE system SHALL reject the request and return error: "Todo title cannot be empty."

WHEN a member submits a new todo item with a title longer than 200 characters, THE system SHALL reject the request and return error: "Todo title cannot exceed 200 characters."

WHEN a member creates a todo item, THE system SHALL NOT automatically set any completion or due date.

WHEN a member creates a todo item, THE system SHALL store the item permanently in the database.

WHEN a member creates a todo item, THE system SHALL return the newly created item with a unique identifier in the response.

## Todo Item Retrieval

WHEN a member requests their todo list, THE system SHALL return all todo items created by that member.

WHEN a member requests their todo list, THE system SHALL return items sorted by createdAt in ascending order (oldest first).

WHEN a member requests their todo list, THE system SHALL return a maximum of 100 items per request.

WHEN a member requests their todo list, THE system SHALL NOT return any todo items created by other members.

WHEN a member requests their todo list, THE system SHALL return the status, title, createdAt, and updatedAt fields for each item.

WHEN a member requests a todo item by ID, THE system SHALL return the specific item if it belongs to the authenticated member.

WHEN a member requests a todo item by ID that does not exist, THE system SHALL return HTTP 404 Not Found.

WHEN a member requests a todo item by ID that belongs to another member, THE system SHALL return HTTP 403 Forbidden.

## Todo Item Updates

WHEN a member updates a todo item's title, THE system SHALL validate the new title and update the item only if:
- title is not empty
- title does not exceed 200 characters

WHEN a member updates a todo item's title successfully, THE system SHALL update the updatedAt timestamp to the current time.

WHEN a member updates a todo item's status to "completed", THE system SHALL set status to "completed" and update updatedAt to current time.

WHEN a member updates a todo item's status to "pending", THE system SHALL set status to "pending" and update updatedAt to current time.

WHEN a member attempts to update a todo item's status to any value other than "completed" or "pending", THE system SHALL reject the update and return error: "Invalid status value. Must be 'completed' or 'pending'."

WHEN a member attempts to update a todo item that does not belong to them, THE system SHALL return HTTP 403 Forbidden with message: "You do not have permission to modify this item."

WHEN a member updates an existing todo item, THE system SHALL NOT change the createdAt timestamp.

WHEN a member updates a todo item, THE system SHALL return the updated item in the response.

## Todo Item Deletion

WHEN a member deletes a todo item, THE system SHALL remove the item from the database permanently.

WHEN a member deletes a todo item that belongs to them, THE system SHALL return HTTP 204 No Content.

WHEN a member attempts to delete a todo item that does not belong to them, THE system SHALL return HTTP 403 Forbidden with message: "You do not have permission to delete this item."

WHEN a member attempts to delete a todo item that does not exist, THE system SHALL return HTTP 404 Not Found.

WHEN a todo item is deleted, THE system SHALL NOT perform any soft delete or archival operations.

## Todo Item Status Management

WHEN a todo item is created, THE system SHALL set status to "pending".

WHEN a todo item has status "pending", THE system SHALL allow transitioning to "completed".

WHEN a todo item has status "completed", THE system SHALL allow transitioning back to "pending".

WHEN a todo item has status "pending", THE system SHALL NOT allow any other status changes.

WHEN a todo item has status "completed", THE system SHALL NOT allow any other status changes.

WHEN a member attempts to change a todo item's status directly to "archived" or any other non-standard value, THE system SHALL reject the change with HTTP 400 Bad Request.

WHEN a todo item's status is "completed", THE system SHALL display visual indication to the user (emphasized by UI, but this is not specified in backend requirements).

WHEN a todo item's status is "pending", THE system SHALL display normal visual appearance (emphasized by UI, but this is not specified in backend requirements).

## Bulk Operations

WHEN a member has more than 100 todo items, THE system SHALL require pagination to retrieve all items.

WHEN a member performs bulk actions (delete multiple items), THE system SHALL process each item individually and return a summary of successes and failures, but this feature is not required for minimum viable product and SHALL NOT be implemented.

WHEN a member requests to delete all completed items, THE system SHALL NOT support this feature in minimum viable product and SHALL return HTTP 405 Method Not Allowed.

WHEN a member requests to mark all pending items as completed, THE system SHALL NOT support this feature in minimum viable product and SHALL return HTTP 405 Method Not Allowed.

## Data Persistence

WHEN a todo item is created, THE system SHALL persist the item permanently in the database.

WHEN a todo item is updated, THE system SHALL persist the changes permanently in the database.

WHEN a todo item is deleted, THE system SHALL remove the item permanently from the database.

WHEN the application restarts, THE system SHALL restore all persisted todo items.

WHEN the system experiences a failure during write operations, THE system SHALL return HTTP 500 Internal Server Error with message: "System temporary unavailable. Please try again later."

WHEN the system has insufficient storage space, THE system SHALL return HTTP 507 Insufficient Storage with message: "Server storage is full. Please try again later."

WHEN the system cannot connect to the database, THE system SHALL return HTTP 503 Service Unavailable with message: "Database connection failed. Please try again later."

## State Transitions

{code:"flowchart TD\nA["Pending"] --> B["Completed"]\nB["Completed"] --> A["Pending"]\nA["Pending"] --> A["Pending"]\nB["Completed"] --> B["Completed"]"}



## Valid Status Transitions

The only allowed state transitions are:
- pending → completed
- completed → pending

No other state transitions are permitted.

## Business Rules

- Todo items are owned exclusively by the user who created them.
- No shared todos are permitted.
- Every todo item must belong to exactly one member.
- There are no categories, priorities, or tags allowed.
- There are no due dates, reminders, or repeating schedules.
- There are no comments or attachments.
- There are no team or sharing features.
- Only authenticated members can create, view, update, or delete their own todo items.
- Guests have no access to any todo list functionality.
- Maximum todo title length is 200 characters.
- Title must not be empty.
- Status must be either "pending" or "completed".
- Status transitions are strictly controlled as defined above.
- All operations are logged for audit purposes (not part of API, but system must log).
- Data is retained permanently unless deleted by user.

## Authentication Requirements

Refer to 02-authentication-requirements.md for complete authentication and authorization requirements.

Note: Authentication is required for all protected routes. Guests cannot access any todo functionality.