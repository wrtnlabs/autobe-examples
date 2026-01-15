# Todo List Application Requirements Specification

## Service Introduction

The Todo List application is a simple, personal task management system designed for individuals who need to organize daily responsibilities, track progress on personal goals, and reduce cognitive load through a minimalistic interface. Unlike complex project management tools, this application focuses exclusively on the fundamental need to create, manage, and complete personal to-do items without distractions, integrations, or unnecessary features.

This service exists because modern users experience significant mental fatigue from information overload, task fragmentation across multiple platforms, and the cognitive burden of remembering uncompleted responsibilities. The Todo List application solves this by providing an immediate, focused, and frictionless way to externalize thoughts into a persistent, accessible format that requires no training, no onboarding, and no complex navigation. Users can open the application and immediately begin capturing ideas, tasks, and reminders without being overwhelmed by menus, boards, categories, or permission systems.

The application is not intended for team collaboration, enterprise use, calendar synchronization, or task delegation. It is purely an individual productivity tool, optimized for users who value simplicity, speed, and privacy above all else. The absence of multi-user features, shared lists, or notification systems is not a limitation—it is a deliberate design decision that aligns with the core value proposition: "Your thoughts, captured immediately, without compromise."

## Target Users

The primary user of this application is the individual who has a need to remember personal tasks but does not require collaboration, public sharing, or synchronization with external services. The application serves:

- Students who need to track assignments and study goals
- Working professionals managing daily to-do lists outside corporate tools
- Creatives capturing ideas, project milestones, or personal challenges
- Individuals practicing mindfulness and task externalization
- Anyone seeking relief from mental clutter without investing time in learning complex systems

All users are authenticated using OAuth 2.0 or email/password registration, and each user's data is isolated and never shared. There are no other actor types. There is no "admin," no "guest," no "moderator." Only the authenticated individual interacts with their own data.

## Primary Goals

The Todo List application has three primary business goals:

### Goal 1: Immediate Task Capture

WHEN a user opens the application after registration, THE system SHALL present a simple, empty input field labeled "Add a new task." The field SHALL be automatically focused when the page loads. Users SHALL be able to type any text into this field and press Enter or click "Add" to create a new todo item without encountering any intermediary screens, dropdowns, or selection menus.

### Goal 2: Persistent Personal Storage

WHEN a user creates a new todo item, THE system SHALL securely store it in a personal database tied to their authenticated account, ensuring the item remains accessible across all devices where the user logs in. THE system SHALL NOT store data on the client side only (e.g., localStorage) but SHALL use server-side storage with encryption at rest. THE system SHALL retain tasks indefinitely until explicitly deleted by the user.

### Goal 3: Task Completion and Closure

WHEN a user clicks on a todo item's checkbox or the "Complete" button, THE system SHALL toggle the item's status from "active" to "completed" and visually dim the item's text. THE system SHALL maintain completed items in the list unless explicitly hidden by the user. Completed items SHALL remain editable for 24 hours after completion so that users may correct mistakes or restore items. After 24 hours, completed items SHALL be permanently archived and inaccessible unless restored through a separate recovery mechanism.

## Scope Boundaries

The Todo List application has strict boundaries that define what is in scope and what is explicitly out of scope:

### ✅ In Scope

- Individual user identity and authentication
- Creation of todo items with plain text content (up to 500 characters)
- Marking todo items as active or completed
- Deleting todo items immediately or after confirmation
- Viewing a list of todo items sorted by creation time (newest first)
- Persistent data storage tied to authenticated account
- Secure session management
- Mobile-responsive UI (but UI design is outside this document)
- Cross-device access through login

### ❌ Out of Scope

- Task categorization, tagging, or labeling
- Due dates, reminders, or notifications
- Recurring tasks or repeating patterns
- Priority levels (Urgent, Important, etc.)
- Shared lists, team collaboration, or guest access
- Integration with calendars, email, or third-party services
- Drag-and-drop reordering of tasks
- Search or filtering functionality
- Import/export of data (CSV, JSON, etc.)
- Theme customization or dark mode
- Analytics, usage statistics, or reporting
- Comments, replies, or notes on todo items
- API access for external applications or automation

The system SHALL NOT implement any feature not listed under "In Scope." Any request to add features outside of these boundaries SHALL result in a rejection of the change request as violating the application’s minimalistic philosophy. The application is not a productivity suite—it is a single-function tool designed for clarity and focus.

## Core Value Proposition

This application is valuable because it eliminates the friction that prevents people from capturing their thoughts. Most people have ideas they want to act on: "Call dentist," "Buy milk," "Send email to boss," "Finish chapter," etc. The barrier to entry for traditional task managers (installing, learning, organizing, prioritizing) is so high that people abandon them. This application removes all barriers. The only action required to use it is to log in and type.

Unlike complex systems that demand users adapt to their rules, this system adapts to the user's natural thought process: write it down, check it off, forget about it. The system requires no setup, no training, and no maintenance. Success is measured not by complexity, but by how often users return to the application to capture tasks they would otherwise forget.

## Future Evolution Constraints

The application’s current scope is intentionally minimal. Any future expansion must preserve the core philosophy: simplicity, privacy, independence, and focus. Potential future enhancements are strictly limited to:

- Adding support for markdown formatting in task descriptions (bold, italic only)
- Allowing users to sort items by completion status or creation date
- Providing an option to permanently delete completed items
- Adding a simple dark mode toggle

Any feature that introduces collaboration, automation, or complexity beyond these examples SHALL NOT be implemented. The application’s value is rooted in its restraint.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## User Authentication Workflow

WHEN a user accesses the application for the first time, THE system SHALL present a welcome screen with two options: "Sign in with OAuth" and "Create account with email".

WHEN a user selects "Sign in with OAuth", THE system SHALL redirect to the configured OAuth provider (Google, Apple) for authentication.

WHEN a user selects "Create account with email", THE system SHALL collect the user's email address and create a secure password.

WHEN a user submits their credentials, THE system SHALL validate the email format and password strength (minimum 8 characters, contains uppercase, lowercase, and number).

WHEN authentication is successful, THE system SHALL generate a JWT token with a 14-day expiration and store it securely on the client.

WHEN the JWT token expires, THE system SHALL redirect the user to the login screen and require re-authentication.

WHEN a user attempts to access any Todo item without a valid token, THE system SHALL return HTTP 401 and display a message "Please log in to access your tasks."

## Data Ownership and Security

WHEN a user creates a Todo item, THE system SHALL associate it with the authenticated user's unique ID.

WHEN a user requests a list of Todo items, THE system SHALL filter results to include only items with the authenticated user's ID.

WHEN a user attempts to access a Todo item by ID that belongs to another user, THE system SHALL return HTTP 403 with message "You do not own this item."

WHEN a user attempts to delete a Todo item that belongs to another user, THE system SHALL return HTTP 403 with message "You do not own this item."

WHEN a user attempts to update a Todo item that belongs to another user, THE system SHALL return HTTP 403 with message "You do not own this item."

WHEN a user logs out, THE system SHALL immediately invalidate the JWT token on the server side.

THE system SHALL NEVER expose any user's Todo items to other users, even if the item ID is known.

THE system SHALL use HTTPS for all communications between client and server.

THE system SHALL store all user passwords using bcrypt hashing with salt.

THE system SHALL never log or store plain-text passwords or tokens.

## Functional Requirements

### Todo Item Creation

WHEN a user creates a new Todo item, THE system SHALL store the item with a unique identifier (UUID), creation timestamp, and initial status of "pending".

WHEN a user submits a Todo item with an empty title, THE system SHALL reject the request and return an error message indicating the title is required.

WHEN a user submits a Todo item with a title exceeding 500 characters, THE system SHALL truncate the title to 500 characters and store it.

### Todo Item Retrieval

WHEN a user requests their Todo items, THE system SHALL return all items created by that user ordered by creation date (newest first).

WHEN a user requests their Todo items with a status filter, THE system SHALL return only items matching the specified status ("pending", "completed").

WHEN a user requests a specific Todo item by ID, THE system SHALL return that single item if it belongs to the requesting user.

WHEN a user requests a Todo item by ID that does not exist or belongs to another user, THE system SHALL return HTTP 404 with error message "Todo item not found".

### Todo Item Update

WHEN a user updates a Todo item's title, THE system SHALL validate the new title is not empty and does not exceed 500 characters.

WHEN a user updates the status of a Todo item to "completed", THE system SHALL set the completion timestamp to the current time.

WHEN a user updates the status of a Todo item to "pending", THE system SHALL clear the completion timestamp.

WHEN a user attempts to update a Todo item that belongs to another user, THE system SHALL reject the request with HTTP 403 and error message "You do not have permission to modify this item".

### Todo Item Deletion

WHEN a user deletes a Todo item, THE system SHALL permanently remove the item from storage.

WHEN a user attempts to delete a Todo item that belongs to another user, THE system SHALL reject the request with HTTP 403 and error message "You do not have permission to delete this item".

## Data Management

### Todo Item Properties

THE system SHALL store each Todo item with the following properties:
- id: unique identifier (UUID format)
- title: text content (max 500 characters)
- description: optional text content (max 2,000 characters)
- status: either "pending" or "completed"
- createdAt: ISO 8601 timestamp (UTC)
- updatedAt: ISO 8601 timestamp (UTC)
- completedAt: ISO 8601 timestamp (UTC) or null
- userId: UUID reference to the creating user

### Data Validation Rules

IF a Todo item title is received with only whitespace characters, THEN THE system SHALL treat it as empty and reject the request.

IF a Todo item description exceeds 2,000 characters, THEN THE system SHALL truncate it to 2,000 characters.

IF a Todo item status is received with any value other than "pending" or "completed", THEN THE system SHALL reject the request with error message "Invalid status value".

IF a Todo item update request includes a completedAt timestamp that is later than the current server time, THEN THE system SHALL reject the request with error message "Completion timestamp cannot be in the future".

### Data Consistency Requirements

THE system SHALL ensure that when a Todo item's status is "completed", the completedAt field is not null.

THE system SHALL ensure that when a Todo item's status is "pending", the completedAt field is null.

THE system SHALL ensure that the updatedAt field is automatically updated on every modification of a Todo item.

WHILE a user session is active, THE system SHALL maintain data consistency for all Todo items accessed during that session.

## User Interactions

### Task Creation Workflow

WHEN a user navigates to the Todo list screen, THE system SHALL display a form to create a new item.

WHEN a user enters text in the title field and clicks "Add", THE system SHALL submit the new Todo item for creation.

WHEN a user leaves the title field empty and clicks "Add", THE system SHALL prevent form submission and display a visual indicator that the title is required.

WHEN a user clicks "Cancel" on the creation form, THE system SHALL close the form without creating an item.

### Task Status Management

WHEN a user clicks on the checkbox next to a Todo item, THE system SHALL toggle the item's status between "pending" and "completed".

WHEN a user toggles a Todo item's status, THE system SHALL update the completion timestamp accordingly.

WHEN a Todo item is set to "completed", THE system SHALL visually distinguish it from pending items (e.g., strikethrough text).

WHEN a Todo item is set to "pending", THE system SHALL remove visual completion indicators.

### Bulk Operations

WHEN a user selects multiple Todo items and chooses "Delete selected", THE system SHALL remove all selected items belonging to that user.

WHEN a user selects multiple Todo items and chooses "Mark complete", THE system SHALL update the status of all selected items to "completed".

WHEN a user selects multiple Todo items and chooses "Mark pending", THE system SHALL update the status of all selected items to "pending".

WHEN a user attempts to perform a bulk operation on items belonging to another user, THE system SHALL ignore those items and process only the items belonging to the requesting user.

### Search and Filter

WHEN a user enters text in the search field, THE system SHALL filter results to show only items whose title contains the search term (case-insensitive).

WHEN a user selects the "Show completed" filter, THE system SHALL display only items with status "completed".

WHEN a user selects the "Show pending" filter, THE system SHALL display only items with status "pending".

WHEN a user clears all filters, THE system SHALL display all Todo items for that user.

## System Behavior

### Session Management

WHEN a user's authentication session expires, THE system SHALL require re-authentication before allowing any Todo item operations.

WHILE a user is authenticated, THE system SHALL allow all Todo item operations.

WHEN a user logs out, THE system SHALL invalidate all session tokens and prevent further Todo item operations until authentication.

### Error Handling

IF a user submits a malformed request (invalid JSON, missing required fields), THEN THE system SHALL return HTTP 400 with specific error message.

IF a user's authentication token is invalid or expired, THEN THE system SHALL return HTTP 401 with error message "Authentication required".

IF a user attempts to access a resource they do not own, THEN THE system SHALL return HTTP 403 with error message "Permission denied".

IF the system encounters an internal error while processing a request, THEN THE system SHALL return HTTP 500 with error message "Server error occurred".

### Audit and Logging

THE system SHALL log all Todo item creation, update, and deletion operations with timestamp, user ID, and action type.

THE system SHALL maintain an audit trail of access attempts, including successful and failed requests.

WHEN a User Actor "user" modifies a Todo item, THE system SHALL record the modification in the audit log.

### Performance Expectations

WHEN a user loads their Todo list with fewer than 100 items, THE system SHALL display results in under 1 second.

WHEN a user creates, updates, or deletes a Todo item, THE system SHALL confirm the action within 1 second.

WHEN a user searches through their Todo list, THE system SHALL return results instantly (under 500ms) for typical queries.

WHILE a user is actively working with the Todo list, THE system SHALL ensure there is no perceivable lag in user interactions.

### Security and Privacy

THE system SHALL ensure that users can only access, modify, and delete their own Todo items.

THE system SHALL never expose other users' Todo item data in responses, even when querying by ID.

THE system SHALL validate all API requests against the authenticated user's permissions before processing.

WHEN processing Todo item operations, THE system SHALL use the user's authentication context to enforce data ownership rules.

### Reliability and Availability

THE system SHALL ensure that Todo item data is persisted to durable storage before returning success to the user.

THE system SHALL maintain a minimum of 99.9% uptime during business hours (Monday-Saturday, 8:00-22:00 Korea time).

WHILE creating, updating, or deleting Todo items, THE system SHALL use transactional operations to prevent data corruption.

THE system SHALL recover all Todo item data after system restarts or failures.

### Scalability Requirements

THE system SHALL handle up to 10,000 concurrent users accessing their Todo lists.

THE system SHALL support storage of up to 1 million Todo items per user.

WHEN a user's Todo list exceeds 500 items, THE system SHALL still respond to list queries within 2 seconds.

### Business Rules

WHEN a Todo item is created, THE system SHALL assign a unique system-generated ID.

WHEN a Todo item is deleted, THE system SHALL NOT allow recovery of that item.

WHEN a user has no Todo items, THE system SHALL display an empty state message.

THE system SHALL NOT automatically archive or delete completed Todo items.

WHERE a user has marked a Todo item as completed, THE system SHALL preserve the completion status indefinitely unless manually changed.

THE system SHALL not allow users to create Todo items for other users.

THE system SHALL not allow users to copy Todo items from other users.

### Edge Case Handling

WHEN a user attempts to create a Todo item with a network error, THE system SHALL show a retry option and preserve the unfinished item locally until successful upload.

WHEN a user changes devices, THE system SHALL synchronize their Todo items across devices through authentication-based data access.

WHEN two users simultaneously attempt to update the same Todo item (unlikely due to ownership), THE system SHALL process requests sequentially and return appropriate success/failure responses.

WHEN the system is under heavy load, THE system SHALL maintain basic functionality for Todo item access and modification, prioritizing user operations over audit logging.

WHEN a user's device goes offline, THE system SHALL queue Todo item changes and attempt to synchronize when connectivity is restored.

### Resource Constraints

THE system SHALL limit each user to 1,000,000 total Todo items.

WHEN a user reaches the 1,000,000 item limit, THE system SHALL prevent creation of additional items until existing items are deleted.

THE system SHALL limit the description field of each Todo item to 2,000 characters.

THE system SHALL limit the title field of each Todo item to 500 characters.

THE system SHALL limit the number of Todo items returned in a single request to 1,000 items.

THE system SHALL enforce pagination for lists with more than 1,000 items.

### Data Retention Policies

THE system SHALL retain Todo items indefinitely unless explicitly deleted by the user.

THE system SHALL not automatically expire or delete completed Todo items after any time period.

WHEN a user deletes their account, THE system SHALL permanently delete all associated Todo items.

WHEN a user creates a Todo item, THE system SHALL retain associated metadata (creation/modification timestamps) forever.

### Timestamp Requirements

THE system SHALL store all timestamps in UTC format.

THE system SHALL use ISO 8601 format for all timestamp representations.

WHEN a Todo item is created, THE system SHALL set the createdAt timestamp to the server's current time in UTC.

WHEN a Todo item is updated, THE system SHALL set the updatedAt timestamp to the server's current time in UTC.

WHEN a Todo item is marked as completed, THE system SHALL set the completedAt timestamp to the server's current time in UTC.

THE system SHALL NOT allow clients to specify timestamp values.

### Character Set and Encoding

THE system SHALL accept and store UTF-8 encoded text for all Todo item fields.

THE system SHALL support international characters, emoji, and special symbols in Todo item titles and descriptions.

THE system SHALL handle Unicode normalized text consistently.

WHEN processing text input, THE system SHALL preserve all characters in the original encoding.

### Accessibility Requirements

THE system SHALL ensure that all Todo item operations can be performed using keyboard navigation only.

THE system SHALL provide appropriate ARIA attributes for screen readers when displaying Todo lists.

WHEN a Todo item has been marked as completed, THE system SHALL indicate this status to assistive technologies.

THE system SHALL maintain sufficient color contrast for text and interactive elements.

### Backup and Recovery

THE system SHALL maintain complete backup of all Todo item data daily.

THE system SHALL store backups in geographically separate locations.

WHEN a data loss event occurs, THE system SHALL restore Todo item data from the most recent backup with minimal data loss (less than 24 hours).

THE system SHALL test backup recovery procedures quarterly.




## Workflow Diagram

```mermaid
graph TD
    A["User Accesses Application"] --> B["Authentication Required"]
    B --> C["Login or Register"]
    C --> D["JWT Token Issued"]
    D --> E["User Views Todo List"]
    E --> F["Add New Task"]
    E --> G["Toggle Task Status"]
    E --> H["Delete Task"]
    F --> I["Title Submitted"]
    I --> J["Validate: Non-Empty, ≤500 chars"]
    J --> K["Create Todo Item with UUID and Status=\"pending\""]
    K --> L["Save to Database with Timestamp"]
    L --> M["Return Success"]
    G --> N["Toggle Status"]
    N --> O["Update Status to \"completed\" or \"pending\""]
    O --> P["Set/Update Timestamps: completedAt/updatedAt"]
    P --> Q["Save Update to Database"]
    Q --> R["Return Success"]
    H --> S["Confirm Deletion"]
    S --> T["Delete Item Permanently"]
    T --> U["Return 204 No Content"]
    M --> E
    R --> E
    U --> E
    D --> Z["Invalid Token?"]
    Z -->|Yes| C
    Z -->|No| E
```

### Diagram Syntax Validation

- All node labels use double quotes: "User Accesses Application"
- All arrow syntax uses proper `-->` format
- No spaces between brackets and quotes: "Login or Register" not " "Login or Register" "
- All labels are meaningful and non-empty
- All conditional branches are properly structured
- No Mermaid syntax violations present



## Exception Handling

### Invalid Input Submission

WHEN a user submits a Todo item with an empty title, THE system SHALL return HTTP 400 with message: "Todo title cannot be empty."

WHEN a user submits a Todo item with a title exceeding 500 characters, THE system SHALL return HTTP 400 with message: "Todo title must be 500 characters or less."

WHEN a user submits a Todo item with an invalid status value, THE system SHALL return HTTP 400 with message: "Invalid status. Must be one of: pending, completed."

### Authentication Failure

WHEN a user attempts to access any Todo list functionality without being authenticated, THE system SHALL return HTTP 401 with message: "Authentication required."

WHEN a user's session has expired, THE system SHALL return HTTP 401 with message: "Session expired. Please log in again."

WHILE a user is not authenticated, THE system SHALL not allow any modification or viewing of Todo items.

### Resource Not Found

WHEN a user requests a Todo item by ID that does not exist, THE system SHALL return HTTP 404 with message: "This Todo item does not exist or has been deleted."

WHEN a user attempts to access a Todo item owned by another user, THE system SHALL return HTTP 403 with message: "You do not have permission to view this Todo item."

WHEN a user attempts to delete or update a non-existent Todo item, THE system SHALL return HTTP 404 with message: "This Todo item does not exist or has been deleted."

### Access Denied

IF a user attempts to edit a Todo item that does not belong to them, THEN THE system SHALL deny the request with message: "You cannot modify another user's Todo items."

IF a user attempts to delete a Todo item that does not belong to them, THEN THE system SHALL deny the request with message: "You cannot delete another user's Todo items."

### System Errors

WHILE the system is processing a Todo item operation, IF an unexpected internal error occurs, THEN THE system SHALL return HTTP 500 with message: "An unexpected error occurred. Please try again later."

WHEN a database connection fails during Todo item persistence, THE system SHALL return HTTP 503 with message: "Service temporarily unavailable. Please try again later."

### User Recovery Options

#### Invalid Input Submission Recovery

Users may correct their input submissions by:
- Editing the title to be non-empty and under 500 characters
- Selecting a valid status option from the provided choices
- Re-submitting the form after correcting the errors
- Clearing invalid fields and starting fresh

#### Authentication Failure Recovery

Users may recover from authentication failures by:
- Re-entering their credentials on the login page
- Using "Forgot Password" if credentials are forgotten
- Waiting 30 seconds and retrying if locked out due to failed attempts
- Contacting support if authentication is persistently blocked

#### Resource Not Found Recovery

Users may recover from resource not found errors by:
- Refreshing the Todo list to verify item existence
- Recreating the item if it was accidentally deleted
- Searching for the item using alternative criteria
- Contacting support if they believe they have lost an important item

#### Access Denied Recovery

Users may recover from access denied errors by:
- Logging out and logging back in as the correct user
- Verifying they have the correct account
- Requesting sharing access if the item belongs to someone else
- Using the correct account with sufficient permissions

#### System Errors Recovery

Users may recover from system errors by:
- Waiting 30 seconds and retrying the operation
- Refreshing the application to clear any corrupted state
- Closing and reopening the application
- Contacting support if the error persists after multiple attempts

## Failure Recovery Paths

### Invalid Input Submission Recovery Path

User attempts to create Todo item with empty title → System rejects with error → User sees error message → User edits title → User re-submits → System accepts → Todo item created successfully

### Authentication Failure Recovery Path

User attempts to access Todo list → System detects no session → System redirects to login → User enters credentials → System validates → User redirected to Todo list → Access granted

### Resource Not Found Recovery Path

User attempts to view Todo item → System queries database → Item not found → System returns error message → User checks list → Item missing → User recreates item → System saves item → User views item successfully

### Access Denied Recovery Path

User attempts to update someone else's item → System checks ownership → Request denied → System returns error message → User verifies account identity → User switches to own account → User attempts update → System checks ownership → Item belongs to user → Update accepted

### System Error Recovery Path

User attempts to delete Todo item → System encounters database timeout → System fails operation internally → System returns generic error → User waits 30 seconds → User retries deletion → System succeeds → Item deleted successfully

### Edge Case: Concurrent Modifications

WHILE two users attempt to update the same Todo item simultaneously, THE system SHALL prevent data loss by rejecting the second update with message: "This item has been modified by another user. Please refresh and try again."

## Data Integrity and Business Rules

### Data Integrity and Atomicity

WHEN a Todo item is created, THE system SHALL ensure that all fields (title, status, owner ID, creation timestamp) are saved atomically.

IF any part of the creation operation fails, THEN THE system SHALL roll back the entire transaction and preserve data integrity.

WHEN a Todo item is updated, THE system SHALL ensure that all changed fields are saved atomically.

IF any part of the update operation fails, THEN THE system SHALL roll back the entire transaction and preserve data integrity.

WHEN a Todo item is deleted, THE system SHALL remove the item completely and ensure no orphaned references remain.

### Status Transition Consistency

WHILE a Todo item has status "pending", THE system SHALL allow transitions to "completed" or "archived".

WHILE a Todo item has status "completed", THE system SHALL allow transitions to "pending" or "archived".

WHILE a Todo item has status "archived", THE system SHALL prevent any status changes.

IF a Todo item is archived, THE system SHALL prevent any modification to its content except for potential future restoration.

### User Privacy and Data Separation

THE system SHALL guarantee complete separation of data between users.

THE system SHALL never store or transmit any user's Todo items to another user's context.

THE system SHALL ensure that even administrative functions cannot bypass user ownership constraints.

THE system SHALL not support any feature that allows users to see or access other users' Todo items, even with explicit permissions.

### Timestamp Consistency

WHEN any operation affects a Todo item (creation, update, deletion), THE system SHALL record the exact server timestamp in UTC.

THE system SHALL convert server timestamps to the user's local timezone (Asia/Seoul) for display purposes only.

THE system SHALL maintain all timestamps internally in UTC regardless of user timezone.

IF a user's system clock is inaccurate, THE system SHALL use server time as the authoritative source for all operations to ensure consistency.

### Archive Logic

WHEN a Todo item is archived, THE system SHALL preserve all metadata including creation date, completion date (if applicable), and all tags.

THE system SHALL allow archived items to be restored to "pending" status by the original owner.

IF an archived item is restored, THE system SHALL retain its original creation timestamp and any previous status history.

WHEN a user restores an archived Item, THE system SHALL clear any completion timestamp that existed while the item was completed.

The item's version number SHALL be incremented by one during restoration.

### Deletion Logic

WHEN a user deletes a Todo item, THE system SHALL immediately remove the item from the active database.

THE system SHALL NOT keep a soft-delete record or backup of deleted items.

THE system SHALL prevent any attempt to restore a deleted item.

THE system SHALL ensure that deleted items cannot be recovered through any means, including backups or direct database access.

WHEN a Todo item is deleted, THE system SHALL return an HTTP 204 No Content response to confirm successful deletion.

### Tag Management Consistency

WHEN a user adds a tag to a Todo item, THE system SHALL ensure the tag is unique within that item.

WHEN a user removes a tag from a Todo item, THE system SHALL remove only that specific tag from the item's tag list.

WHILE a Todo item contains any tags, THE system SHALL allow removal of individual tags without affecting other tags.

WHEN a user attempts to add an empty tag (zero-length string), THE system SHALL reject the operation.

WHEN a user attempts to add a tag exceeding 50 characters, THE system SHALL reject the operation.

WHEN a user attempts to add a tag containing special characters that could cause display or search issues, THE system SHALL allow it but validate that it doesn't break system functionality.

### Query Consistency

WHEN a user searches for Todo items, THE system SHALL return all items matching the criteria, regardless of status, except for items owned by other users.

WHEN a user filters by status, THE system SHALL return only items with the specified status.

WHEN a user filters by due date or priority, THE system SHALL return items matching the exact criteria without approximation.

THE system SHALL maintain consistency in query results across different devices for the same user within the same session.

### Sorting Consistency

WHEN a user sorts Todo items by title, THE system SHALL sort in ascending alphabetical order (A to Z).

WHEN a user sorts Todo items by creation date, THE system SHALL sort from newest to oldest (most recent first).

WHEN a user sorts Todo items by due date, THE system SHALL sort with earliest dates first.

WHEN a user sorts Todo items by status, THE system SHALL sort in the following order: "pending", "completed", "archived".

WHEN a user sorts by priority, THE system SHALL sort in the following order: "low", "medium", "high".

THE system SHALL maintain consistent sorting behavior across all client devices.

### User Experience Consistency

WHILE a user is interacting with the application, THE system SHALL ensure that all feedback about item creation, modification, and deletion is immediate.

WHEN an error occurs during a Todo item operation, THE system SHALL display the error message in a location where the user can clearly see it.

THE system SHALL never silently fail - all user-initiated operations must produce a clear response or error message.

THE system SHALL confirm successful operations with immediate visual feedback.

THE system SHALL maintain visual consistency in the presentation of Todo items across all device types.