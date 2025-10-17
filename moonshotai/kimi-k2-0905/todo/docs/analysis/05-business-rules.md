# Todo List Application - Business Rules and Validation Requirements

## Overview

This document establishes the fundamental business rules, validation requirements, and operational constraints that govern todo item management within the minimal Todo List application. These rules ensure data integrity, user experience consistency, and system reliability while maintaining the simplicity essential for a basic todo application.

The business rules specified here must be implemented to create a robust yet simple todo management system that prevents invalid data entry, maintains consistent state, and provides clear feedback to users. All rules are designed for immediate implementation by backend developers without requiring additional specification interpretation.

---

## Todo Validation Rules

### Text Content Validation

**THE system SHALL enforce** the following text constraints on todo items:

**WHEN a user creates or updates a todo item, THE system SHALL validate** that:
- Title field contains between 1 and 200 characters
- Description field (if provided) contains between 0 and 1,000 characters
- Text content does not contain malicious code or SQL injection patterns
- Leading and trailing whitespace is automatically trimmed

**THE system SHALL automatically** sanitize input text by removing dangerous characters while preserving user content intent.

### Completion Status Rules

**THE system SHALL manage** todo completion status according to these business rules:

**WHEN a todo item is created, THE system SHALL set** completion status to "incomplete" by default.

**WHEN a todo item's completion status is changed, THE system SHALL record** the timestamp of the status change.

**THE system SHALL prevent** users from creating todo items that are already marked as complete during initial creation.

**THE system SHALL allow** users to toggle completion status between complete and incomplete unlimited times.

### Priority Level Constraints

**THE system SHALL support** three priority levels: "high", "medium", and "low".

**WHEN no priority is specified, THE system SHALL default** to "medium" priority.

**THE system SHALL validate** that priority values are limited to the predefined set of acceptable priorities.

---

## User Constraints

### Guest User Limitations

**THE system SHALL restrict** guest users to read-only access without persistent todo management capabilities.

**THE system SHALL prevent** guest users from creating, editing, or deleting todo items.

**THE system SHALL allow** guest users to view demonstration todo items to understand application functionality.

### Member User Capabilities

**THE system SHALL enable** member users to create up to 10,000 active todo items per account.

**THE system SHALL allow** members to organize todos with categories and custom groupings.

**THE system SHALL constrain** members to modifying only their own todo items and associated data.

**THE system SHALL enforce** session timeouts after 30 days of inactivity, requiring re-authentication.

---

## Data Integrity Rules

### Todo ID Management

**THE system SHALL assign** unique identifiers using UUID v4 format for each todo item.

**THE system SHALL guarantee** that todo IDs are globally unique across all system operations.

**THE system SHALL preserve** todo IDs as immutable identifiers throughout the item lifecycle.

### Timestamp Requirements

**THE system SHALL automatically record** three timestamps for each todo item:
- Created timestamp (set once, never modified)
- Last modified timestamp (updated on each change)
- Completed timestamp (set/updated when completion status changes to complete)

**THE system SHALL ensure** all timestamps reflect the user's local timezone based on browser settings.

### Data Consistency Checks

**THE system SHALL validate** that no two todo items share the same title within a single user's account.

**THE system SHALL prevent** deletion of todo items that are currently referenced by active user workflows.

**THE system SHALL maintain** referential integrity between todo items and their associated metadata.

---

## Access Control Rules

### Authentication Requirements

**THE system SHALL require** valid JWT token authentication for all write operations (create, update, delete).

**THE system SHALL validate** JWT tokens on every authenticated request.

**THE system SHALL reject** requests with expired, invalid, or forged authentication tokens.

### Permission Model

**THE system SHALL implement** role-based access control with the following hierarchy:

**WHEN a member attempts to modify a todo item, THE system SHALL verify** that the authenticated user owns the item.

**IF a member attempts to access a todo item they do not own, THEN THE system SHALL deny** access and return appropriate error response.

**THE system SHALL allow** multiple todos with identical titles owned by different users independently.

---

## Error Handling Requirements

### Validation Error Responses

**THE system SHALL return** specific error messages for validation failures:
- Invalid title length: "Todo title must be between 1 and 200 characters"
- Invalid description length: "Todo description cannot exceed 1,000 characters"
- Invalid priority level: "Priority must be high, medium, or low"
- Malicious content detected: "Input contains invalid characters"

### Business Logic Errors

**WHEN business rule violations occur, THE system SHALL respond** with clear error messages:
- Unauthorized access attempt: "Insufficient permissions to access this todo"
- Duplicate title detection: "You already have a todo with this title"
- Todo not found: "The specified todo item could not be found"

### System Error Recovery

**WHEN database operation failures occur, THE system SHALL**:
- Log detailed error information for debugging
- Return user-friendly error message: "Unable to save todo item. Please try again."
- Maintain data consistency by rolling back incomplete operations
- Limit retry attempts to prevent infinite loops

---

## Performance Constraints

### Response Time Requirements

**THE system SHALL respond** to user actions within the following time limits:
- Todo creation: Complete within 2 seconds
- Todo update: Complete within 2 seconds
- Todo deletion: Complete within 1 second
- Todo retrieval: Complete within 1 second

### Data Limits

**THE system SHALL enforce** the following data volume constraints:
- Maximum 10,000 active todo items per member account
- Maximum 1MB total data per member account
- Maximum 100 simultaneous active API requests per account

### Concurrent User Support

**THE system SHALL support** at least 10,000 concurrent active users.

**THE system SHALL maintain** responsive performance regardless of total registered user count.

---

## Additional Operational Rules

### Cleanup and Maintenance

**THE system SHALL automatically archive** completed todo items older than 90 days.

**THE system SHALL notify** users before archiving their completed todos with option to extend.

**THE system SHALL permanently delete** archived items after 365 days of retention.

### Compliance Requirements

**THE system SHALL comply** with data protection regulations by allowing user data export and deletion.

**The system SHALL maintain** audit logs for all data modifications for 30 days.

**THE system SHALL provide** users with complete control over their personal data storage and retention preferences.

---

## Implementation Guidelines

These business rules serve as the foundation for backend developers to implement validation logic, access control, and error handling. Each rule is written to be immediately actionable and testable, ensuring consistent behavior across the application while maintaining the simplicity appropriate for a minimal todo application.

The rules are designed to be extensible without breaking existing functionality, allowing future enhancements while preserving the core user experience of quick, simple todo management.