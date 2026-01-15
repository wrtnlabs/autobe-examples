# Functional Requirements

This document defines the core capabilities of the Todo list application from the user's perspective. These requirements describe what the system must do to be considered complete, without including technical implementation details.

## Core Functionality

The Todo list application must enable users to create, manage, and organize personal tasks. All interactions occur within the context of the authenticated user.

### Todo Item Creation

WHEN a user initiates the creation of a new Todo item, THE system SHALL allow them to provide a title and optional description, due date, priority level, and tags.

WHEN the user submits the creation request, THE system SHALL validate all provided fields according to the business rules before creating the item.

IF validation passes, THE system SHALL create a new Todo item with the provided details and assign the authenticated user as the owner.

IF validation fails, THE system SHALL return a user-friendly error message describing the specific validation failure(s).

### Todo Item Reading

WHEN a user requests to view their Todo list, THE system SHALL return all Todo items owned by the authenticated user, regardless of status.

WHEN a user requests a specific Todo item, THE system SHALL return that item only if it is owned by the authenticated user.

IF the requested item is not found or belongs to another user, THE system SHALL return a NotFound response.

### Todo Item Update

WHEN a user modifies the title, description, due date, priority, status, or tags of a Todo item, THE system SHALL validate each changed field against the business rules.

WHEN multiple fields are changed simultaneously, THE system SHALL validate all changes together and apply them atomically.

IF validation passes and the item belongs to the authenticated user, THE system SHALL update the item and increment its version number.

IF validation fails, THE system SHALL return a user-friendly error message indicating which field(s) failed validation.

IF the item belongs to another user, THE system SHALL reject the update and return a Forbidden response.

IF the item's version number has changed since the user retrieved it, THE system SHALL reject the update and return a Conflict response with the current version.

### Todo Item Deletion

WHEN a user requests to delete a Todo item, THE system SHALL verify that the item belongs to the authenticated user.

IF ownership is verified, THE system SHALL immediately and permanently remove the item from the database.

IF the item does not belong to the authenticated user, THE system SHALL return a Forbidden response.

THE system SHALL return a 204 No Content response upon successful deletion.

### Status Transition

WHEN a user changes the status of a Todo item, THE system SHALL only allow transitions between the following states: "pending" → "completed", "pending" → "archived", "completed" → "pending", "completed" → "archived".

WHEN a user changes status from "completed" to "pending", THE system SHALL remove any completion timestamp that was previously recorded.

WHEN a user changes status to "archived", THE system SHALL prevent any future status changes to the item.

IF an invalid status transition is attempted, THE system SHALL reject the request and return a BadRequest response with a message indicating the valid transitions.

### Tag Management

WHEN a user adds a tag to a Todo item, THE system SHALL ensure the tag is unique within the item's tag list.

WHEN a user removes a tag from a Todo item, THE system SHALL remove only that specific tag from the item's tag list.

WHEN a user modifies a tag by removing it and adding a new one, THE system SHALL treat it as two separate operations: removal followed by addition.

IF a user attempts to add a tag with zero-length string, THE system SHALL reject the operation.

IF a user attempts to add a tag exceeding 50 characters, THE system SHALL reject the operation.

IF a user attempts to add a tag containing Unicode control characters, THE system SHALL reject the operation.

## Data Management

### Todo Item Data Structure

Each Todo item must have the following properties:

- title (required, string)
- description (optional, string)
- status (required, enum: "pending", "completed", "archived")
- dueDate (optional, ISO 8601 date string)
- priority (optional, enum: "low", "medium", "high")
- tags (optional, array of strings)
- createdAt (required, timestamp, UTC)
- updatedAt (required, timestamp, UTC)
- version (required, integer)
- ownerId (required, UUID)
- completedAt (optional, timestamp, UTC)

### Data Persistence

WHEN a Todo item is created, THE system SHALL store all its properties persistently with full data integrity.

WHEN a Todo item is updated, THE system SHALL ensure the entire object is stored atomically.

WHEN a Todo item is deleted, THE system SHALL permanently and irreversibly remove all data associated with the item.

THE system SHALL not use soft deletion for any Todo items.

## User Interactions

### Primary Workflow

The typical user workflow for managing Todo items is:

1. User logs into the application
2. User sees their list of pending Todo items
3. User creates a new Todo item by entering a title
4. User optionally adds a description, due date, priority, and tags
5. User clicks "Save" to create the item
6. User sees the new item appear in their pending list
7. User finds a completed item in their list
8. User clicks "Mark as Pending" to reopen it
9. User finds an item they no longer need
10. User clicks "Delete" to remove it permanently

### Secondary Workflows

### Bulk Operations

WHEN a user attempts to perform bulk operations on Todo items (e.g., "Delete all completed"), THE system SHALL process each item individually according to the individual item rules.

WHEN a bulk operation fails on any item, THE system SHALL rollback all changes to the failed item and maintain the state of remaining items.

WHEN a bulk operation successfully completes, THE system SHALL return a summary of actions performed and items affected.

### Filtering and Sorting

WHEN a user applies a filter to show only "pending" items, THE system SHALL return items with status equal to "pending".

WHEN a user sorts by due date, THE system SHALL sort items from earliest to latest due date.

WHEN a user sorts by priority, THE system SHALL sort items in the order: "low", "medium", "high".

WHEN a user searches for items by keyword, THE system SHALL search within the title and description fields.

## System Behavior

### Response Times

WHEN a user requests their Todo list, THE system SHALL return the result in less than 500 milliseconds for 95% of requests under normal load.

WHEN a user creates a new Todo item, THE system SHALL return confirmation in less than 300 milliseconds for 95% of requests.

WHEN a user updates an existing Todo item, THE system SHALL return confirmation in less than 350 milliseconds for 95% of requests.

WHEN a user deletes a Todo item, THE system SHALL return confirmation in less than 250 milliseconds for 95% of requests.

### User Feedback

WHEN a user performs an operation, THE system SHALL provide immediate visual feedback.

WHEN an operation succeeds, THE system SHALL display a success confirmation.

WHEN an operation fails, THE system SHALL display a clear, human-readable error message indicating what went wrong.

THE system SHALL never silently fail or provide no feedback to the user.

### Concurrency Handling

WHEN two users (or the same user across devices) attempt to update the same Todo item simultaneously, THE system SHALL use optimistic locking to detect conflicts.

WHEN a conflict is detected, THE system SHALL reject the later update and require the user to refresh their view before retrying.

"""
```mermaid
graph TD
    A["User Opens App"] --> B["Loads Todo List"]
    B --> C{"Show Pending?"}
    C -->|Yes| D["Display Pending Items"]
    C -->|No| E["Display All Items"]
    D --> F["User Can Create Item"]
    E --> F
    F --> G["User Can Mark As Completed"]
    G --> H["User Can Mark As Pending"]
    G --> I["User Can Archive"]
    H --> J["User Can Delete"]
    I --> K["User Can Restore"]
    J --> L["Item Permanently Removed"]
    K --> M["Item Returns to Pending"]
    H --> N["User Can Update Tags"]
    I --> N
    M --> N
    D --> O["User Can Sort by Date"]
    E --> O
    D --> P["User Can Sort by Priority"]
    E --> P
    D --> Q["User Can Filter by Status"]
    E --> Q
    F --> R["User Can Search by Keyword"]
    G --> R
    H --> R
    I --> R
    J --> R
    K --> R
```"""

## Exception Handling

The system must handle the following user errors gracefully:

- Empty title submission
- Title exceeding 255 characters
- Description exceeding 10,000 characters
- Invalid due date format
- Invalid status transition
- Invalid priority value
- Attempting to access another user's item
- Attempting to delete a non-existent item
- Concurrent modification conflicts

In all cases, the system shall prevent data corruption and return a clear, user-friendly message explaining what went wrong and how to resolve it.

## User Experience

The Todo list application must feel immediate, responsive, and intuitive. All user actions must produce clear feedback. The interface must be logically organized, with the most common operations the most accessible.

All Todo items must be clearly differentiated by status, priority, and due date. Visual indicators (icons, colors, positioning) must help users understand the state of each item at a glance.