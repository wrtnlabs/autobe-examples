# 05 - Data Model Concepts

## Introduction & Overview

The Todo application stores and manages information about users and their todo items. This document describes the conceptual data entities that the system maintains, what properties each entity has, how they relate to each other, and the business rules that govern this data.

Unlike technical database documentation, this document explains the **business meaning** of the data from a user and business perspective, not the technical implementation details.

---

## Core Data Entities

The Todo application maintains two fundamental data entities that represent the core business concepts of the system.

### Entity 1: User Entity

**Business Purpose**: Users are the people who interact with the Todo application. Each user maintains their own independent todo list and personal data. The system tracks user information to enable login functionality, maintain separation of data between different users, and manage user accounts throughout their lifecycle.

**Core Responsibility**: A User entity represents an authenticated person with credentials, account information, and ownership rights over their personal todos. Users are the central entity in the system; all todos belong to and are managed by users.

**Typical User**: An individual who registers for an account, maintains a personal task list, and manages their productivity through the application.

### Entity 2: Todo Item Entity

**Business Purpose**: A Todo item is a single task, action item, or piece of work that a user wants to track. Each todo item belongs to exactly one user and represents something the user wants to accomplish or remember. Todos are the primary reason users engage with the application.

**Core Responsibility**: A Todo entity represents a single work item with its own lifecycle, status, properties, and metadata. Todos enable users to capture, organize, and track their work.

**Typical Todo**: A user might create todos like "Buy groceries," "Prepare presentation slides," "Call client," or "Review project documentation" - each representing a discrete piece of work to manage.

---

## User Entity - Complete Properties & Data

Each user maintains the following information in the system:

### Required User Properties

**User ID (Unique Identifier)**
- **Business Purpose**: Uniquely identifies each user in the system
- **Why It Matters**: Enables the system to distinguish one user from another, track ownership of todos, and maintain user-specific data
- **Constraints**: 
  - System-generated, never manually assigned
  - Immutable - never changes after creation
  - Unique across all users
  - Used internally by the system for all data relationships
- **Example**: `user-12345` or similar unique identifier

**Email Address (Authentication Identity)**
- **Business Purpose**: User's unique login identifier and primary communication channel
- **Why It Matters**: Email is how users authenticate into the system and receive password reset instructions and notifications
- **Constraints**:
  - Must be unique across all users (no two users can have the same email)
  - Must follow valid email format (e.g., user@example.com)
  - Validated during registration
  - Cannot be empty or blank
  - Case-insensitive (jane@example.com and JANE@EXAMPLE.COM are the same)
- **Example**: `john.smith@example.com`

**Password (Secure Authentication Credential)**
- **Business Purpose**: Proves the user's identity when they log in
- **Why It Matters**: Only the legitimate user knows their password, ensuring account security and data privacy
- **Constraints**:
  - Never stored in plaintext - always securely hashed using bcrypt or equivalent
  - Minimum 8 characters required
  - Should contain letters and numbers for security
  - User can reset if forgotten
  - Hashes are never revealed to users or displayed anywhere
- **Example**: Stored as hashed value like `$2b$10$3xK...` not as `myPassword123`

**Account Status (Current Account State)**
- **Business Purpose**: Determines whether the user can currently access the system
- **Why It Matters**: Allows system to enable accounts, temporarily suspend, or permanently disable accounts
- **Constraints**:
  - Only valid values: "active" or "inactive"
  - Default value on registration: "active"
  - Admin can change to "inactive" to suspend access
  - When inactive: user cannot log in, todos are preserved
- **Example**: "active" means user can log in; "inactive" means user cannot access the system

**Created Date (Account Registration Timestamp)**
- **Business Purpose**: Records when the user created their account
- **Why It Matters**: Tracks account age, helps with auditing, shows when user started using the service
- **Constraints**:
  - Automatically set by the system when user registers
  - Never changes after creation (immutable)
  - Stored in UTC timezone
  - In ISO 8601 format with timezone: `2024-01-15T14:30:00Z`
- **Example**: `2024-01-15T14:30:00Z` = January 15, 2024 at 2:30 PM UTC

**Last Login Date (Most Recent Authentication Timestamp)**
- **Business Purpose**: Tracks when the user most recently logged in
- **Why It Matters**: Identifies active users, detects inactive accounts, helps with security monitoring
- **Constraints**:
  - Automatically updated each time user successfully logs in
  - Initially null/empty (no value) until first login
  - Stored in UTC timezone
  - Updated on every login, not on every page view
- **Example**: `2024-01-20T10:15:00Z` = User last logged in January 20, 2024

### Optional User Properties

**Full Name (Display/Personal Information)**
- **Business Purpose**: User's human-readable name for personalization and display
- **Why It Matters**: Makes the application feel personal; can be displayed in emails or notifications
- **Constraints**:
  - Optional - user does not need to provide
  - If provided, maximum 100 characters
  - Can contain letters, spaces, and common punctuation (-, ', etc.)
  - User can update anytime
- **Example**: "John Smith" or "María García-López"

**Timezone (User's Geographic/Time Location)**
- **Business Purpose**: Understands user's local time for scheduling and display purposes
- **Why It Matters**: Shows due dates and times in user's local timezone instead of UTC
- **Constraints**:
  - Optional - defaults to UTC if not provided
  - Must be valid timezone identifier (e.g., "America/New_York", "Europe/London")
  - User can update to match their location
- **Example**: "America/New_York" or "Asia/Tokyo"

---

## Todo Item Entity - Complete Properties & Data

Each todo item contains the following information:

### Required Todo Properties

**Todo ID (Unique Identifier)**
- **Business Purpose**: Uniquely identifies each todo item in the system
- **Why It Matters**: Enables users and system to reference specific todos, distinguish between todos, and track changes
- **Constraints**:
  - System-generated, never manually assigned
  - Immutable - never changes after creation
  - Unique across all todos in the system
  - Cannot be reused even after todo is deleted
- **Example**: `todo-99876` or similar unique identifier

**User ID (Ownership Link)**
- **Business Purpose**: Establishes which user owns this todo
- **Why It Matters**: Creates the fundamental relationship that ensures todos belong to specific users and enforces data isolation
- **Constraints**:
  - Links this todo to exactly one user
  - Set at creation time and never changes
  - Cannot be reassigned to another user
  - Enables permission checking: only the owner can view/edit/delete
  - Used to prevent users from accessing other users' todos
- **Example**: `user-12345` (links to a specific user's account)

**Title (Primary Description)**
- **Business Purpose**: The main, concise description of the todo that identifies what needs to be done
- **Why It Matters**: Users read the title to understand what the todo is about; this is the most visible property
- **Constraints**:
  - Required field - cannot be empty or blank
  - Maximum 255 characters
  - Must contain meaningful text (not just spaces or special characters)
  - Can contain letters, numbers, spaces, and common punctuation (., -, !, ?, etc.)
  - Cannot be null/empty at any time after creation
  - User can edit anytime
- **Example**: "Buy groceries", "Prepare presentation slides", "Schedule team meeting"

**Status (Current State of Todo)**
- **Business Purpose**: Indicates whether the todo is incomplete, in-progress, or completed
- **Why It Matters**: Helps users track progress and understand which tasks still need work
- **Constraints**:
  - Only three valid values: "new", "in-progress", "completed"
  - Default value on creation: "new"
  - User can change between any of the three states
  - Determines whether todo appears in active or completed views
  - Cannot be null/empty - always has a value
- **Valid Values**:
  - `"new"` = Todo was created but work hasn't started
  - `"in-progress"` = User is actively working on this todo
  - `"completed"` = Todo is finished and done
- **Example**: User creates todo with status "new", changes to "in-progress" while working, finally changes to "completed" when finished

**Created Date (Todo Creation Timestamp)**
- **Business Purpose**: Records exactly when the user created this todo
- **Why It Matters**: Provides history of when work was captured, enables sorting by creation date, supports audit trails
- **Constraints**:
  - Automatically set by the system when todo is created
  - Never changes after creation (immutable)
  - Stored in UTC timezone
  - In ISO 8601 format: `2024-01-15T10:30:00Z`
  - Cannot be manually set by user
- **Example**: `2024-01-15T10:30:00Z` = Todo was created January 15, 2024 at 10:30 AM UTC

**Last Modified Date (Most Recent Update Timestamp)**
- **Business Purpose**: Tracks when the todo was last changed
- **Why It Matters**: Shows which todos have been recently updated, helps identify stale todos, enables sorting by recency
- **Constraints**:
  - Initially equal to created date when todo is first created
  - Automatically updated whenever ANY property of the todo changes (title, status, due date, priority, etc.)
  - Stored in UTC timezone
  - In ISO 8601 format: `2024-01-20T14:45:00Z`
  - Cannot be manually set by user
- **Example**: If todo created on Jan 15 and edited on Jan 20, last modified would be Jan 20 timestamp

### Optional Todo Properties

**Description (Detailed Information)**
- **Business Purpose**: Provides additional context and details beyond what fits in the title
- **Why It Matters**: Allows users to capture detailed notes, requirements, or instructions for complex todos
- **Constraints**:
  - Optional - user may or may not provide
  - Maximum 2000 characters
  - Can contain formatted text if system supports it
  - User can edit anytime
  - Can be empty even after creation
- **Example**: "Get milk, eggs, bread, and cheese from the store. Budget is $30. Store closes at 9pm."

**Priority Level (Importance Ranking)**
- **Business Purpose**: Indicates how important or urgent this todo is compared to others
- **Why It Matters**: Helps users understand which tasks should be done first
- **Constraints**:
  - Optional - user may leave unset
  - Only three valid values: "low", "medium", "high"
  - Default value if not specified: "medium"
  - User can change priority anytime as circumstances change
  - Cannot have invalid values like "urgent" or "critical"
- **Valid Values**:
  - `"low"` = Nice to do but not time-sensitive
  - `"medium"` = Important but not immediately urgent (default)
  - `"high"` = Very important or time-sensitive
- **Example**: "Fix critical login bug" = high priority; "Reorganize office shelves" = low priority

**Due Date (Target Completion Date)**
- **Business Purpose**: Specifies when the user wants to complete this todo
- **Why It Matters**: Helps users manage deadlines and prioritize work based on urgency
- **Constraints**:
  - Optional - user may leave unset (no due date)
  - Must be a valid calendar date if provided
  - Format: ISO 8601 date format `YYYY-MM-DD` (e.g., 2024-01-20)
  - Cannot be in the past when creating or updating (future dates only)
  - Can be any future date including today
  - User can change or remove due date anytime
  - Cannot be null/blank unless intentionally unset
- **Example**: `2024-01-25` = Todo should be completed by January 25, 2024

**Completion Date (When Todo Was Marked Complete)**
- **Business Purpose**: Records the exact moment when user marked the todo as completed
- **Why It Matters**: Provides history of accomplishment, enables tracking of productivity over time
- **Constraints**:
  - Initially empty/null (no value) when todo is created
  - Automatically set with current timestamp when user changes status to "completed"
  - Stored in UTC timezone with time component: `2024-01-20T15:30:00Z`
  - Automatically cleared if user changes status back from "completed" to "new" or "in-progress"
  - Cannot be manually set by user (system generates automatically)
  - Only has a value when status is "completed"
- **Example**: If user marks todo complete on Jan 20 at 3:30 PM, completion date would be `2024-01-20T15:30:00Z`

---

## Data Relationships

### User-to-Todo Relationship (One-to-Many)

**Relationship Type**: One-to-Many relationship

**Description**: Each user can have zero, one, or many todo items. However, each todo item belongs to exactly one user and only that user.

**Business Meaning**: Users own their todos exclusively. The relationship establishes ownership and controls who can access each todo.

**Examples**:
- Alice registers and creates 15 todos = Alice owns 15 todos
- Bob registers and creates 3 todos = Bob owns 3 todos  
- Carol registers and creates 0 todos = Carol has no todos yet
- Each of Alice's todos is ONLY visible and manageable by Alice (Bob cannot see, edit, or delete Alice's todos)

**Impact on System Behavior**:

WHEN a user requests their todo list, THE system SHALL retrieve ONLY the todos that belong to that user.

WHEN a user attempts to view, edit, or delete a todo belonging to another user, THE system SHALL deny the request with permission error.

WHEN a user is deleted from the system, THE system SHALL also delete all todos belonging to that user (cascade delete).

WHEN an admin accesses the system, THE admin CAN view todos for audit purposes but CANNOT modify user todos directly.

---

## Data Lifecycle & States

### User Lifecycle States

Users progress through the following states during their lifetime in the system:

| State | Description | What It Means | Transitions To |
|-------|-------------|---------------|----------------|
| **Active** | User account is functioning normally and user can log in | User has full access to the system and their todos | Inactive (by admin action) |
| **Inactive** | User account is disabled or suspended by admin action | User cannot log in; todos are preserved but inaccessible to user; admin can reactivate | Active (by admin action) |

**State Transition Rules**:

WHEN a new user registers, THE user's account SHALL automatically be set to "active" state.

WHEN an admin suspends a user account, THE user's status SHALL change from "active" to "inactive".

WHEN an admin reactivates a user, THE user's status SHALL change from "inactive" back to "active".

WHILE a user is in "inactive" state, THE system SHALL prevent login and access to that user's todos.

### Todo Lifecycle States

Todo items progress through the following states during their lifetime:

| State | Description | What It Means | Transitions To |
|-------|-------------|---------------|----------------|
| **New** | Todo was just created, not yet started | User has captured the task but work has not begun | In-Progress, Deleted |
| **In-Progress** | User is currently working on this todo | Work is actively underway on the task | Completed, New (pause/restart), Deleted |
| **Completed** | User has finished the todo | Task is done; removed from active work list but history preserved | New (if reopened), Deleted |
| **Deleted** | Todo is permanently removed by user | Todo no longer appears in user's view; data may be archived | (Cannot transition back - deletion is permanent) |

**State Transition Rules**:

WHEN a user creates a new todo, THE todo SHALL be in "new" state.

WHEN a user marks a todo as in progress, THE todo's state SHALL change from "new" to "in-progress".

WHEN a user marks a todo as completed, THE todo's state SHALL change to "completed" and THE completion date SHALL be recorded.

WHEN a user deletes a todo, THE todo SHALL be removed from the user's view permanently.

WHEN a user marks a completed todo as incomplete, THE todo's state SHALL change back to "new" or "in-progress" and THE completion date SHALL be cleared.

### Lifecycle Events & Timestamps

Each entity has important events marked by timestamps:

**User Lifecycle Events**:
- **Created**: When the user first registers (creation_date timestamp recorded in UTC)
- **First Login**: When the user successfully logs in for the first time (last_login_date updated)
- **Subsequent Logins**: Each time user logs in (last_login_date updated)
- **Status Changed**: When admin changes user active/inactive status
- **Account Deleted**: When admin or user deletes the account

**Todo Lifecycle Events**:
- **Created**: When the user first creates the todo (created_date timestamp recorded)
- **Modified**: When user changes any property (modified_date timestamp updated)
- **Completed**: When user marks todo as completed (completion_date timestamp recorded)
- **Reopened**: If user marks completed todo as incomplete (completion_date timestamp cleared)
- **Deleted**: When user permanently removes the todo (permanent deletion)

---

## Data Constraints & Rules

### Required vs Optional Data

**Always Required - Must Always Have Values**:
- User ID (for user entity)
- Email (for user entity)
- Password (hashed, for user entity)
- Account Status (for user entity, defaults to "active")
- Todo ID (for todo entity)
- User ID (for todo entity - establishes ownership)
- Title (for todo entity)
- Status (for todo entity, defaults to "new")
- Created Date (for both entities)
- Last Modified Date (for both entities, initially equals created date)

**Optional But Important - Can Be Empty Initially**:
- Full Name (for user)
- Timezone (for user)
- Description (for todo)
- Priority (for todo, defaults to "medium")
- Due Date (for todo)
- Completion Date (for todo, only populated when completed)

**Business Implication**: If a required field is missing, the record is invalid and cannot be created. Optional fields provide additional information when the user chooses to provide them.

### Data Uniqueness Constraints

**User Email Uniqueness**:

THE system SHALL ensure that each email address in the system is unique.

WHEN a new user registers, THE system SHALL check that the email address has not been used before.

THE system SHALL NOT allow two users to register with the same email address.

**Business Impact**: Email is how users uniquely identify themselves; emails cannot be duplicated to prevent confusion about account ownership.

**Todo ID Uniqueness**:

THE system SHALL ensure that each todo item has a unique ID.

THE system SHALL NOT allow two todos to have the same ID even after a todo is deleted.

**Business Impact**: Todo IDs are used to reference specific todos; uniqueness ensures no confusion about which todo is being referenced.

### Data Format Constraints

**Email Address Format**:

WHEN a user provides an email address, THE system SHALL validate it follows standard email format: `localpart@domain.extension`

VALID EMAIL EXAMPLES**: `john@example.com`, `jane.smith@company.co.uk`, `user+tag@domain.org`

INVALID EMAIL EXAMPLES**: `johnexample`, `john@`, `@example.com`, `john @example.com`

**Password Constraints**:

WHEN a user creates a password, THE password SHALL be at least 8 characters long.

THE system SHALL reject passwords shorter than 8 characters.

**Business Reason**: Longer passwords are more secure and resistant to brute force attacks.

**Date/Timestamp Format**:

ALL system-generated dates (created date, last modified) SHALL be in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

EXAMPLE**: `2024-01-15T14:30:00Z` = January 15, 2024 at 14:30 (2:30 PM) UTC

ALL due dates (user-provided) SHALL be in ISO 8601 date format: `YYYY-MM-DD`

EXAMPLE**: `2024-01-25` = January 25, 2024 (without time component)

**Todo Title Format**:

WHEN a user provides a todo title, THE title SHALL be between 1 and 255 characters.

THE system SHALL NOT allow empty titles or titles containing only spaces.

VALID TITLE EXAMPLES**: "Buy groceries", "Prepare Q1 report", "Schedule meeting with team"

INVALID TITLE EXAMPLES**: "" (empty), "   " (only spaces), titles over 255 characters

**Priority Level Format**:

WHEN a user specifies priority, THE system SHALL only accept: "low", "medium", or "high"

THE system SHALL reject any other priority values like "urgent", "critical", "normal"

CASE SENSITIVITY**: Priority values are case-sensitive; "Low" and "LOW" are not valid (must be lowercase "low")

### Data Consistency Rules

**Completed Date Consistency**:

IF a todo's status is "completed", THEN the completed_date field SHALL contain a valid timestamp.

IF a todo's status is "new" or "in-progress", THEN the completed_date field SHALL be null or empty.

**Business Impact**: The system can trust that if a todo has a completion date, it definitely is marked as completed.

**Owner Verification Consistency**:

WHILE a todo exists, THE user_id field associated with that todo SHALL remain unchanged.

THE system SHALL NOT reassign a todo from one user to another user.

**Business Impact**: Ownership is permanent; a todo cannot change owners even if users collaborate.

**Status Consistency**:

EVERY todo SHALL have a status value; status SHALL never be null or undefined.

THE status field SHALL only contain one of three values: "new", "in-progress", or "completed".

**Business Impact**: The system can always determine what state a todo is in; no ambiguous states exist.

**Last Modified Tracking Consistency**:

WHENEVER any property of a todo is modified (title, status, due date, priority, description), THE last_modified_date SHALL be automatically updated to the current timestamp.

WHENEVER a user's property changes, THE corresponding timestamp (e.g., last_login_date) SHALL be updated.

THE creation timestamp SHALL NEVER be updated after initial creation.

**Business Impact**: Historical accuracy is maintained; the system always knows when things last changed.

---

## Data Integrity & Validation

### User Data Validation Rules

**Email Validation**:

WHEN a user registers or updates their email, THE system SHALL verify the email format is valid.

WHEN a user registers with an email, THE system SHALL check that no other user has that same email.

IF the email is already in use, THE system SHALL reject registration with error "Email is already registered"

**Password Requirements**:

WHEN a user creates a password, THE system SHALL validate minimum 8 characters.

WHEN a user sets a password, THE system SHALL hash it using bcrypt or equivalent before storage.

THE system SHALL NOT store passwords in plaintext under any circumstances.

**Account Status Validation**:

THE system SHALL only allow "active" or "inactive" as valid account status values.

WHEN an admin attempts to set an invalid status, THE system SHALL reject the change.

### Todo Data Validation Rules

**Title Validation**:

WHEN a user creates or updates a todo title, THE title SHALL not be empty or contain only whitespace.

WHEN a user saves a todo, THE title SHALL be between 1 and 255 characters.

IF the title is empty, THE system SHALL reject with error "Todo title cannot be empty"

IF the title exceeds 255 characters, THE system SHALL reject with error "Todo title cannot exceed 255 characters"

**Status Validation**:

THE system SHALL only allow "new", "in-progress", or "completed" as valid status values.

WHEN a user attempts to set an invalid status, THE system SHALL reject the operation.

**Priority Validation**:

WHERE priority is provided, THE system SHALL only accept "low", "medium", or "high".

IF a user submits an invalid priority, THE system SHALL reject with error "Priority must be 'low', 'medium', or 'high'"

IF priority is not specified, THE system SHALL default to "medium"

**Due Date Validation**:

WHERE a due date is specified, THE system SHALL accept only ISO 8601 date format (YYYY-MM-DD).

THE system SHALL NOT allow due dates in the past when creating or updating todos.

IF a user attempts to set a past due date, THE system SHALL reject with error "Due date cannot be in the past"

**Ownership Validation**:

BEFORE allowing any user to view, edit, or delete a todo, THE system SHALL verify the user owns that todo.

IF the user does not own the todo, THE system SHALL deny the operation with error "You do not have permission to access this todo"

---

## Data Lifecycle Management

### Data Creation Process

**New User Registration**:

WHEN a new user registers, THE system SHALL create a new user entity with:
- Unique user ID (system-generated)
- Email address (provided by user)
- Hashed password (derived from user input)
- Account status set to "active"
- Created date set to current UTC timestamp
- Last login date set to null (no logins yet)
- Empty full name and timezone initially

**New Todo Creation**:

WHEN a user creates a new todo, THE system SHALL:
- Generate a unique todo ID
- Link the todo to the user's ID (set ownership)
- Set status to "new"
- Set created date to current UTC timestamp
- Set last modified date to current UTC timestamp (initially equals created date)
- Populate title from user input
- Set priority to "medium" if not specified
- Leave optional fields (description, due date, completion date) empty until user provides values

### Data Modification Process

**Todo Updates**:

WHENEVER a user modifies any property of a todo, THE system SHALL:
- Update the specific property being changed
- Update the last modified date to current timestamp
- Preserve the created date (never change it)
- Maintain the user ownership (never reassign)

**Password Changes**:

WHEN a user changes their password, THE system SHALL:
- Hash the new password securely
- Replace the old hashed password
- Not maintain history of previous passwords
- Invalidate all existing sessions for that user

### Data Deletion & Archival

**Soft Delete Approach** (if implemented):

WHEN a user deletes a todo, THE system SHALL set the "is deleted" flag to true.

WHILE a todo is marked as deleted, THE system SHALL not display it in normal todo lists.

WHERE an admin needs to audit data, THE system SHALL be able to view deleted todos.

**Permanent Data Removal**:

IF a user requests account deletion, THE system SHALL:
- Mark the account as deleted
- Preserve audit logs
- Delete or archive all associated todos after retention period

---

## Summary of Core Data Concepts

The Todo application maintains a simple yet comprehensive data model:

1. **Users** own todo items exclusively; ownership is permanent and cannot be transferred
2. **Todo items** are the core business objects representing work to be tracked
3. **Ownership relationship** ensures data isolation; each todo belongs to one user only
4. **Status progression** enables users to track work from creation through completion
5. **Audit trails** (timestamps) track the history and changes to all data
6. **Validation rules** ensure data quality and system integrity
7. **State machines** govern valid transitions between todo states
8. **Constraints** prevent invalid data and maintain consistency

This conceptual data model provides the foundation for understanding how the Todo application stores and manages information from a business perspective, focusing on what data is stored and why, rather than technical implementation details.

---

> *Developer Note: This document describes the conceptual data entities and business rules. All technical implementation decisions (database schema, data storage technology, indexing strategies, etc.) are at the discretion of the development team.*