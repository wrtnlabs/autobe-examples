# Business Rules and Validation Requirements

## Document Overview

This document defines comprehensive business rules, validation logic, and data constraints that govern the Todo list application's operations. These rules ensure data integrity, consistent system behavior, and proper handling of user input across all todo management operations.

All validation rules and business constraints specified in this document must be enforced consistently throughout the system to maintain data quality and provide users with clear, immediate feedback when their input does not meet requirements.

## Todo Item Validation Rules

### Title Validation

**Title Required Rule**
WHEN a user creates a new todo item, THE system SHALL require a title to be provided.

**Title Length Constraint**
THE todo item title SHALL be between 1 and 200 characters in length.

**Title Empty String Prevention**
IF a user provides a title containing only whitespace characters, THEN THE system SHALL reject the input and return validation error "Title cannot be empty or contain only spaces".

**Title Character Validation**
THE todo item title SHALL accept all Unicode characters including letters, numbers, punctuation, and emoji.

**Title Trimming Rule**
WHEN a user provides a todo title with leading or trailing whitespace, THE system SHALL automatically trim the whitespace before storage.

### Description Validation

**Description Optional Rule**
THE todo item description SHALL be optional and may be null or empty.

**Description Length Constraint**
WHEN a description is provided, THE system SHALL enforce a maximum length of 2000 characters.

**Description Character Validation**
THE todo item description SHALL accept all Unicode characters including multi-line text, letters, numbers, punctuation, and emoji.

**Description Formatting Preservation**
THE system SHALL preserve line breaks and whitespace formatting within todo item descriptions.

### Due Date Validation

**Due Date Optional Rule**
THE todo item due date SHALL be optional and may be null.

**Due Date Format Requirement**
WHEN a user provides a due date, THE system SHALL accept dates in ISO 8601 format (YYYY-MM-DD or full datetime with timezone).

**Past Due Date Acceptance**
THE system SHALL accept due dates in the past, allowing users to record tasks that were already overdue when created.

**Future Due Date Acceptance**
THE system SHALL accept due dates up to 10 years in the future from the current date.

**Due Date Time Component**
WHEN a due date includes a time component, THE system SHALL store the complete datetime with timezone information.

**Due Date Without Time**
WHEN a due date is provided without a time component, THE system SHALL treat the task as due at the end of day (23:59:59) in the user's timezone.

### Priority Validation

**Priority Optional Rule**
THE todo item priority SHALL be optional and default to "medium" when not specified.

**Priority Enumeration Constraint**
THE todo item priority SHALL accept only the following values: "low", "medium", "high".

**Priority Case Sensitivity**
IF a user provides a priority value with different casing, THEN THE system SHALL normalize the value to lowercase before validation.

**Invalid Priority Rejection**
IF a user provides a priority value not in the accepted enumeration, THEN THE system SHALL reject the input and return validation error "Priority must be one of: low, medium, high".

### Status Validation

**Status Required Rule**
THE todo item status SHALL always have a defined value and cannot be null.

**Initial Status Rule**
WHEN a user creates a new todo item, THE system SHALL set the initial status to "pending" unless explicitly specified otherwise.

**Status Enumeration Constraint**
THE todo item status SHALL accept only the following values: "pending", "in_progress", "completed", "cancelled".

**Invalid Status Rejection**
IF a user attempts to set a status value not in the accepted enumeration, THEN THE system SHALL reject the input and return validation error "Status must be one of: pending, in_progress, completed, cancelled".

### Timestamps Validation

**Creation Timestamp Rule**
WHEN a todo item is created, THE system SHALL automatically set the creation timestamp to the current server time.

**Creation Timestamp Immutability**
THE todo item creation timestamp SHALL be immutable and cannot be modified after creation.

**Update Timestamp Rule**
WHEN a todo item is modified, THE system SHALL automatically update the modification timestamp to the current server time.

**Completion Timestamp Rule**
WHEN a todo item status changes to "completed", THE system SHALL set the completion timestamp to the current server time.

**Completion Timestamp Clearing**
WHEN a todo item status changes from "completed" to any other status, THE system SHALL clear the completion timestamp (set to null).

## User Input Constraints

### Text Field Length Limits

**Title Minimum Length**
THE system SHALL reject todo titles shorter than 1 character with error message "Title must be at least 1 character long".

**Title Maximum Length**
THE system SHALL reject todo titles longer than 200 characters with error message "Title cannot exceed 200 characters (current: X characters)" where X is the actual length.

**Description Maximum Length**
THE system SHALL reject todo descriptions longer than 2000 characters with error message "Description cannot exceed 2000 characters (current: X characters)" where X is the actual length.

### Character Restrictions

**Null Character Rejection**
THE system SHALL reject any text input containing null characters (Unicode U+0000) with error message "Input contains invalid null characters".

**Control Character Handling**
THE system SHALL accept standard control characters (tab, newline, carriage return) but reject other control characters below Unicode U+0020 except in descriptions where they are preserved.

### Required vs Optional Fields

**Mandatory Todo Creation Fields**
WHEN creating a todo item, THE system SHALL require only the title field; all other fields are optional.

**Mandatory Todo Update Fields**
WHEN updating a todo item, THE system SHALL require the todo item identifier; all other fields are optional and only provided fields will be updated.

**User Ownership Field**
THE system SHALL automatically assign the authenticated user as the owner of newly created todo items and this field cannot be specified or modified by users.

### Format Requirements

**Date Format Standardization**
WHEN a user provides a date value, THE system SHALL accept ISO 8601 format and reject other date formats with error message "Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)".

**Identifier Format**
THE system SHALL use UUID version 4 format for all todo item identifiers.

**Boolean Field Format**
WHEN accepting boolean values, THE system SHALL accept true/false (case-insensitive) and reject other values with error message "Field must be true or false".

## Data Integrity Rules

### Unique Constraints

**Todo Identifier Uniqueness**
THE system SHALL ensure each todo item has a globally unique identifier that never duplicates across all users and all time.

**User Email Uniqueness**
THE system SHALL ensure each user email address is unique across the entire system, preventing duplicate account registrations.

### Referential Integrity

**User Reference Integrity**
THE system SHALL ensure every todo item references a valid, existing user account as its owner.

**Orphaned Todo Prevention**
WHEN a user account is deleted, THE system SHALL either delete all associated todo items or prevent user deletion if todos exist, based on system configuration.

### Data Consistency Rules

**Status and Completion Timestamp Consistency**
THE system SHALL ensure that only todo items with status "completed" have a non-null completion timestamp.

**Modification Timestamp Consistency**
THE system SHALL ensure the modification timestamp is always greater than or equal to the creation timestamp.

**Completion Timestamp Consistency**
WHEN a completion timestamp exists, THE system SHALL ensure it is greater than or equal to the creation timestamp.

### Cascade Operations

**User Deletion Cascade Rule**
IF the system is configured for cascade deletion, WHEN a user account is deleted, THEN THE system SHALL automatically delete all todo items owned by that user.

**Soft Delete Support**
WHERE the system implements soft deletion, THE system SHALL mark deleted todo items as deleted rather than removing them from the database, preserving them for potential recovery.

## Business Logic Constraints

### Todo Creation Rules

**Authenticated User Requirement**
WHEN a user attempts to create a todo item, THE system SHALL require the user to be authenticated with a valid JWT token.

**Automatic Ownership Assignment**
WHEN a todo item is created, THE system SHALL automatically assign ownership to the authenticated user who created it.

**Default Value Application**
WHEN optional fields are not provided during creation, THE system SHALL apply default values: status="pending", priority="medium", completed_at=null, description=null, due_date=null.

**Creation Timestamp Assignment**
WHEN a todo item is created, THE system SHALL set created_at and updated_at to the current server timestamp.

### Todo Modification Rules

**Owner-Only Modification**
WHEN a user attempts to update a todo item, THE system SHALL verify the user owns the todo item before allowing modifications.

**Admin Override Restriction**
THE system SHALL NOT allow admin users to modify other users' todo items unless explicitly implementing a support feature requiring admin intervention.

**Partial Update Support**
WHEN a user updates a todo item, THE system SHALL allow partial updates where only provided fields are modified and unprovided fields remain unchanged.

**Ownership Transfer Prohibition**
THE system SHALL NOT allow transferring todo item ownership from one user to another; ownership is permanently assigned at creation.

**Concurrent Update Handling**
WHEN multiple update requests occur simultaneously for the same todo item, THE system SHALL process them sequentially and update the modification timestamp for each successful update.

### Todo Deletion Rules

**Owner-Only Deletion**
WHEN a user attempts to delete a todo item, THE system SHALL verify the user owns the todo item before allowing deletion.

**Permanent Deletion**
WHEN a todo item is deleted, THE system SHALL permanently remove it from the database (unless soft-delete is implemented).

**Deletion Confirmation**
THE system SHALL execute todo deletion immediately without requiring additional confirmation, as deletion requests are considered intentional user actions.

**No Cascade on Todo Deletion**
WHEN a todo item is deleted, THE system SHALL NOT cascade delete any related entities as todo items do not have dependent child entities.

### Status Transition Rules

**Valid Status Transitions**
THE system SHALL allow the following status transitions:
- From "pending" to "in_progress", "completed", or "cancelled"
- From "in_progress" to "completed", "pending", or "cancelled"
- From "completed" to "pending" or "in_progress" (task reopening)
- From "cancelled" to "pending" or "in_progress" (task reactivation)

**Status Transition Validation**
WHEN a user changes a todo status, THE system SHALL validate the transition is logical and update related fields accordingly.

**Completion Timestamp Management**
WHEN status changes to "completed", THE system SHALL set completion timestamp; WHEN status changes from "completed" to any other status, THE system SHALL clear the completion timestamp.

## Ownership and Access Rules

### User Ownership Validation

**Creation Ownership Rule**
WHEN a todo item is created, THE system SHALL set the owner_id to the authenticated user's ID from the JWT token.

**Ownership Immutability**
THE todo item owner SHALL be immutable and cannot be changed after creation.

**Owner Verification for Operations**
WHEN a user performs any operation (read, update, delete) on a todo item, THE system SHALL verify the todo's owner_id matches the authenticated user's ID.

### Access Control Enforcement

**Read Access Rule**
WHEN a user requests to view a todo item, THE system SHALL verify the user is the owner before returning the todo data.

**List Access Rule**
WHEN a user requests a list of todos, THE system SHALL return only todos where the user is the owner.

**Update Access Rule**
WHEN a user attempts to update a todo item, THE system SHALL reject the request with error "Unauthorized: You can only update your own todos" if the user is not the owner.

**Delete Access Rule**
WHEN a user attempts to delete a todo item, THE system SHALL reject the request with error "Unauthorized: You can only delete your own todos" if the user is not the owner.

### Cross-User Access Prevention

**User Isolation Rule**
THE system SHALL ensure users cannot access, view, modify, or delete todo items owned by other users.

**Query Filtering Rule**
WHEN executing database queries for todos, THE system SHALL automatically filter results to include only todos owned by the authenticated user.

**Direct Access Prevention**
IF a user attempts to access a todo item by ID that they do not own, THEN THE system SHALL return error "Not found" rather than "Unauthorized" to prevent information disclosure about other users' todos.

### Admin Access Rules

**Admin User Isolation**
THE system SHALL apply the same ownership rules to admin users as regular users for todo operations.

**Admin Cannot Access User Todos**
THE system SHALL NOT grant admin users automatic access to other users' todo items in normal operation.

**Admin Support Access**
WHERE admin support features are implemented, THE system SHALL require explicit admin action and logging before accessing any user's private todo data.

**Admin Audit Trail**
WHEN an admin accesses another user's todo data for support purposes, THE system SHALL log the access with admin ID, user ID, todo ID, timestamp, and reason.

## State Transition Rules

### Todo Lifecycle States

**Initial State Definition**
WHEN a todo item is created, THE system SHALL place it in the "pending" state unless the user explicitly specifies a different initial state.

**Active States**
THE system SHALL recognize "pending" and "in_progress" as active states where the todo requires user attention.

**Terminal States**
THE system SHALL recognize "completed" and "cancelled" as terminal states, though these states can be reversed by user action.

### Valid State Transitions

**Pending to In Progress**
WHEN a user changes a todo status from "pending" to "in_progress", THE system SHALL accept the transition and update the modification timestamp.

**Pending to Completed**
WHEN a user changes a todo status from "pending" to "completed", THE system SHALL accept the transition, set the completion timestamp, and update the modification timestamp.

**Pending to Cancelled**
WHEN a user changes a todo status from "pending" to "cancelled", THE system SHALL accept the transition and update the modification timestamp.

**In Progress to Completed**
WHEN a user changes a todo status from "in_progress" to "completed", THE system SHALL accept the transition, set the completion timestamp, and update the modification timestamp.

**In Progress to Pending**
WHEN a user changes a todo status from "in_progress" to "pending", THE system SHALL accept the transition and update the modification timestamp.

**In Progress to Cancelled**
WHEN a user changes a todo status from "in_progress" to "cancelled", THE system SHALL accept the transition and update the modification timestamp.

**Completed to Pending (Reopen)**
WHEN a user changes a todo status from "completed" to "pending", THE system SHALL accept the transition, clear the completion timestamp, and update the modification timestamp.

**Completed to In Progress (Reopen)**
WHEN a user changes a todo status from "completed" to "in_progress", THE system SHALL accept the transition, clear the completion timestamp, and update the modification timestamp.

**Cancelled to Pending (Reactivate)**
WHEN a user changes a todo status from "cancelled" to "pending", THE system SHALL accept the transition and update the modification timestamp.

**Cancelled to In Progress (Reactivate)**
WHEN a user changes a todo status from "cancelled" to "in_progress", THE system SHALL accept the transition and update the modification timestamp.

### State Change Validations

**Status Field Presence Validation**
WHEN a user updates a todo item status, THE system SHALL validate the new status value against the allowed enumeration before accepting the change.

**Completion Timestamp Synchronization**
WHEN a todo status transitions to "completed", THE system SHALL set completion_at to the current timestamp; WHEN transitioning away from "completed", THE system SHALL set completion_at to null.

**Modification Tracking**
WHEN any state transition occurs, THE system SHALL update the updated_at timestamp to reflect the change.

**State Transition Atomicity**
THE system SHALL ensure state transitions and related field updates (completion timestamp, modification timestamp) occur atomically without partial updates.

## Validation Error Messages

### Error Message Standards

**Clarity Requirement**
THE system SHALL provide clear, specific error messages that explain what went wrong and how to fix it.

**User-Friendly Language**
THE system SHALL use plain language in error messages, avoiding technical jargon when communicating validation failures to users.

**Actionable Guidance**
WHEN validation fails, THE system SHALL include guidance on what valid input looks like or what action the user should take.

**Error Message Structure**
THE system SHALL structure validation error messages with: field name, problem description, and expected format or constraint.

### Title Validation Errors

**Missing Title Error**
WHEN a user creates a todo without a title, THE system SHALL return error message "Title is required and cannot be empty".

**Title Too Long Error**
WHEN a user provides a title exceeding 200 characters, THE system SHALL return error message "Title cannot exceed 200 characters (current length: X)" where X is the actual character count.

**Title Whitespace Only Error**
WHEN a user provides a title containing only whitespace, THE system SHALL return error message "Title cannot be empty or contain only spaces".

### Description Validation Errors

**Description Too Long Error**
WHEN a user provides a description exceeding 2000 characters, THE system SHALL return error message "Description cannot exceed 2000 characters (current length: X)" where X is the actual character count.

### Due Date Validation Errors

**Invalid Date Format Error**
WHEN a user provides a due date not in ISO 8601 format, THE system SHALL return error message "Due date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ). Example: 2024-12-31 or 2024-12-31T23:59:59Z".

**Date Too Far Future Error**
WHEN a user provides a due date more than 10 years in the future, THE system SHALL return error message "Due date cannot be more than 10 years in the future".

### Priority Validation Errors

**Invalid Priority Error**
WHEN a user provides an invalid priority value, THE system SHALL return error message "Priority must be one of: low, medium, high. Received: X" where X is the provided value.

### Status Validation Errors

**Invalid Status Error**
WHEN a user provides an invalid status value, THE system SHALL return error message "Status must be one of: pending, in_progress, completed, cancelled. Received: X" where X is the provided value.

**Missing Status Error**
WHEN a required status field is missing during operations that require it, THE system SHALL return error message "Status is required".

### Access Control Validation Errors

**Unauthorized Update Error**
WHEN a user attempts to update a todo they don't own, THE system SHALL return error message "Unauthorized: You can only update your own todos".

**Unauthorized Delete Error**
WHEN a user attempts to delete a todo they don't own, THE system SHALL return error message "Unauthorized: You can only delete your own todos".

**Todo Not Found Error**
WHEN a user requests a todo that doesn't exist or they don't own, THE system SHALL return error message "Todo not found" without revealing whether the todo exists for another user.

**Authentication Required Error**
WHEN an unauthenticated user attempts any todo operation, THE system SHALL return error message "Authentication required. Please log in to manage todos".

### General Validation Errors

**Invalid Field Type Error**
WHEN a user provides a field value of incorrect type, THE system SHALL return error message "Field 'X' must be of type Y. Received: Z" where X is field name, Y is expected type, Z is actual value.

**Unknown Field Error**
WHEN a user provides fields not defined in the todo schema, THE system SHALL return error message "Unknown field: X. Valid fields are: title, description, due_date, priority, status" where X is the unknown field name.

**Required Field Missing Error**
WHEN a required field is missing, THE system SHALL return error message "Required field missing: X" where X is the field name.

## Data Consistency Requirements

### Concurrent Operation Handling

**Last Write Wins Strategy**
WHEN multiple users or processes update the same todo item simultaneously, THE system SHALL apply the last write wins strategy where the most recent update overwrites previous changes.

**Timestamp Accuracy**
THE system SHALL ensure modification timestamps accurately reflect the order of updates even under concurrent access.

**Race Condition Prevention**
THE system SHALL use database-level locking or transactions to prevent race conditions when updating todo items.

### Data Synchronization Rules

**Atomic Updates**
THE system SHALL ensure all field updates within a single todo modification request occur atomically (all succeed or all fail).

**Timestamp Consistency**
THE system SHALL ensure created_at, updated_at, and completed_at timestamps maintain logical consistency where updated_at >= created_at and (if set) completed_at >= created_at.

**Status and Timestamp Synchronization**
THE system SHALL ensure status changes and completion timestamp updates occur in the same atomic transaction.

### Conflict Resolution

**Optimistic Concurrency Control**
WHERE the system implements optimistic concurrency control, THE system SHALL use version numbers or timestamps to detect conflicts and reject outdated updates.

**Conflict Detection**
WHEN a conflict is detected during concurrent updates, THE system SHALL reject the conflicting update with error message "Conflict: This todo was modified by another request. Please refresh and try again".

**User Notification on Conflict**
WHEN an update fails due to concurrent modification, THE system SHALL inform the user to retrieve the latest version of the todo before retrying their update.

### Data Validation on Retrieval

**Consistency Validation**
WHEN retrieving todo items from the database, THE system SHALL validate that data consistency rules are maintained and log any inconsistencies found.

**Completion Status Validation**
WHEN retrieving todos, THE system SHALL verify that todos with status "completed" have a completion timestamp and vice versa.

**Ownership Validation**
WHEN retrieving todos for a user, THE system SHALL verify all returned todos belong to the requesting user.

### Referential Integrity Maintenance

**User Existence Validation**
WHEN creating or retrieving todos, THE system SHALL ensure the referenced user (owner) exists in the user database.

**Orphaned Todo Detection**
THE system SHALL prevent creation of todos with owner IDs that don't reference valid user accounts.

**Cascade Integrity**
WHERE cascade deletion is enabled, THE system SHALL ensure all todos are deleted atomically when their owner account is deleted.

### Transaction Management

**Multi-Field Update Atomicity**
WHEN updating multiple fields of a todo item, THE system SHALL execute all updates within a single database transaction.

**Rollback on Validation Failure**
IF any validation fails during a multi-field update, THEN THE system SHALL rollback all changes and return the validation error without partial updates.

**Transaction Isolation**
THE system SHALL use appropriate database transaction isolation levels to prevent dirty reads, non-repeatable reads, and phantom reads during todo operations.

---

> *This document defines business rules and validation requirements only. All technical implementation decisions (database constraints, ORM validations, middleware implementation, etc.) are at the discretion of the development team.*