
# Business Rules and Validation Requirements

## Business Rules Overview

This document defines the comprehensive business rules, validation requirements, and operational constraints that govern the Todo list application. These rules ensure data integrity, security, and consistent user experience while maintaining the simplicity philosophy of the minimal Todo list system.

### Business Rules Philosophy

The business rules for this Todo list application are designed to:
- **Protect user data** by enforcing strict ownership and access controls
- **Ensure data quality** through comprehensive validation
- **Maintain simplicity** by avoiding overly complex rule structures
- **Provide clear feedback** when business rules are violated
- **Support scalability** through consistent constraint enforcement

All business rules are written to be specific, measurable, and testable, enabling developers to implement validation logic with confidence and clarity.

## Todo Validation Rules

### Todo Title Requirements

**TR-001: Title Presence**
THE system SHALL require every todo to have a title.

**TR-002: Title Length - Minimum**
WHEN a user creates or updates a todo, THE system SHALL reject titles with fewer than 1 character.

**TR-003: Title Length - Maximum**
WHEN a user creates or updates a todo, THE system SHALL reject titles exceeding 200 characters.

**TR-004: Title Content Validation**
WHEN a user submits a todo title, THE system SHALL trim leading and trailing whitespace before validation.

**TR-005: Empty Title Prevention**
WHEN a user submits a todo title containing only whitespace characters, THE system SHALL reject the submission and return error code TODO_TITLE_EMPTY.

**TR-006: Title Character Encoding**
THE system SHALL accept todo titles containing UTF-8 encoded characters including letters, numbers, symbols, and emoji.

### Todo Description Requirements

**TR-007: Description Optional**
THE system SHALL allow todos to exist without a description (description may be null or empty).

**TR-008: Description Length - Maximum**
WHEN a user provides a todo description, THE system SHALL reject descriptions exceeding 2000 characters.

**TR-009: Description Content Validation**
WHEN a user submits a todo description, THE system SHALL trim leading and trailing whitespace before storage.

### Todo Completion Status Rules

**TR-010: Default Completion Status**
WHEN a user creates a new todo without specifying completion status, THE system SHALL set the completion status to incomplete (false).

**TR-011: Completion Status Values**
THE system SHALL accept only two completion status values: complete (true) or incomplete (false).

**TR-012: Completion Status Toggle**
WHEN a user updates a todo's completion status, THE system SHALL allow toggling between complete and incomplete states without restriction.

### Todo Ownership and Access Rules

**TR-013: Todo Owner Assignment**
WHEN a user creates a todo, THE system SHALL automatically assign the creating user as the owner of that todo.

**TR-014: Owner Immutability**
THE system SHALL prevent modification of a todo's owner after creation.

**TR-015: Single Owner Constraint**
THE system SHALL assign exactly one owner to each todo (no shared or multiple ownership).

## User Data Validation Rules

### Email Validation Requirements

**UV-001: Email Presence**
WHEN a user registers, THE system SHALL require an email address.

**UV-002: Email Format Validation**
WHEN a user provides an email address, THE system SHALL validate that it follows standard email format (contains @ symbol, valid domain structure).

**UV-003: Email Length - Maximum**
WHEN a user provides an email address, THE system SHALL reject emails exceeding 255 characters.

**UV-004: Email Uniqueness**
WHEN a user registers with an email address, THE system SHALL reject registration if another user account already exists with the same email address (case-insensitive comparison).

**UV-005: Email Case Normalization**
WHEN a user provides an email address, THE system SHALL convert it to lowercase before storage and comparison.

**UV-006: Email Whitespace Handling**
WHEN a user submits an email address, THE system SHALL trim leading and trailing whitespace before validation.

### Password Requirements

**UV-007: Password Presence**
WHEN a user registers or changes their password, THE system SHALL require a password.

**UV-008: Password Length - Minimum**
WHEN a user provides a password, THE system SHALL reject passwords with fewer than 8 characters.

**UV-009: Password Length - Maximum**
WHEN a user provides a password, THE system SHALL reject passwords exceeding 128 characters.

**UV-010: Password Complexity**
WHEN a user provides a password, THE system SHALL require the password to contain at least one letter and one number.

**UV-011: Password Storage**
THE system SHALL never store passwords in plain text (must be hashed before storage).

**UV-012: Password Confirmation**
WHEN a user registers or changes their password, THE system SHALL require password confirmation and verify both entries match before proceeding.

### Username Validation Rules

**UV-013: Username Optional for Registration**
THE system SHALL allow users to register without providing a username (email serves as primary identifier).

**UV-014: Username Length - Minimum**
IF a user provides a username, THEN THE system SHALL reject usernames with fewer than 3 characters.

**UV-015: Username Length - Maximum**
IF a user provides a username, THEN THE system SHALL reject usernames exceeding 30 characters.

**UV-016: Username Character Restrictions**
IF a user provides a username, THEN THE system SHALL accept only alphanumeric characters, underscores, and hyphens.

**UV-017: Username Uniqueness**
IF a user provides a username, THEN THE system SHALL reject registration if another user account already exists with the same username (case-insensitive comparison).

**UV-018: Username Case Normalization**
IF a user provides a username, THEN THE system SHALL convert it to lowercase before storage and comparison.

## Authorization Rules

### User Ownership Verification

**AR-001: Todo Access Verification**
WHEN a user attempts to view a todo, THE system SHALL verify the user is the owner of that todo.

**AR-002: Todo Modification Authorization**
WHEN a user attempts to edit a todo, THE system SHALL verify the user is the owner of that todo before allowing modification.

**AR-003: Todo Deletion Authorization**
WHEN a user attempts to delete a todo, THE system SHALL verify the user is the owner of that todo before allowing deletion.

**AR-004: Todo Completion Authorization**
WHEN a user attempts to mark a todo as complete or incomplete, THE system SHALL verify the user is the owner of that todo.

### Access Control Rules

**AR-005: Guest User Restrictions**
WHEN a guest (unauthenticated user) attempts to create, view, edit, or delete todos, THE system SHALL deny access and return error code AUTH_REQUIRED.

**AR-006: Authenticated User Todo List Access**
WHEN an authenticated user requests their todo list, THE system SHALL return only todos owned by that user.

**AR-007: Cross-User Data Protection**
THE system SHALL prevent any user from viewing, editing, or deleting todos owned by other users.

**AR-008: Authentication Token Validation**
WHEN a user makes any authenticated request, THE system SHALL validate the authentication token before processing the request.

**AR-009: Expired Token Handling**
WHEN a user makes a request with an expired authentication token, THE system SHALL reject the request and return error code TOKEN_EXPIRED.

### Role-Based Access Rules

**AR-010: Guest Registration Access**
WHEN a guest user accesses the registration endpoint, THE system SHALL allow the request without authentication.

**AR-011: Guest Login Access**
WHEN a guest user accesses the login endpoint, THE system SHALL allow the request without authentication.

**AR-012: User Role Todo Operations**
WHEN an authenticated user with role "user" attempts todo operations on their own todos, THE system SHALL allow all create, read, update, and delete operations.

## Data Integrity Rules

### Referential Integrity

**DI-001: Todo User Reference**
THE system SHALL maintain a valid reference from each todo to its owner user account.

**DI-002: Orphaned Todo Prevention**
THE system SHALL prevent creation of todos without a valid user owner reference.

**DI-003: Invalid User Reference Rejection**
WHEN a todo creation or update attempts to reference a non-existent user, THE system SHALL reject the operation and return error code USER_NOT_FOUND.

### Cascade Deletion Rules

**DI-004: User Account Deletion - Todo Cascade**
WHEN a user account is deleted, THE system SHALL also delete all todos owned by that user.

**DI-005: Cascade Deletion Completeness**
WHEN cascading deletion occurs, THE system SHALL ensure all related todos are deleted before confirming user account deletion.

### Data Consistency Rules

**DI-006: Completion Status Consistency**
THE system SHALL ensure every todo has exactly one completion status value (never null or undefined).

**DI-007: Owner Reference Consistency**
THE system SHALL ensure every todo has exactly one owner reference (never null or multiple owners).

**DI-008: Timestamp Consistency**
THE system SHALL ensure every todo has a creation timestamp and an updated timestamp.

**DI-009: Creation Timestamp Immutability**
THE system SHALL prevent modification of a todo's creation timestamp after initial creation.

**DI-010: Update Timestamp Automation**
WHEN a todo is modified, THE system SHALL automatically update the updated timestamp to the current time.

## Business Constraints

### System-Wide Limitations

**BC-001: User Todo Limit**
WHEN a user attempts to create a new todo, THE system SHALL reject the request if the user already has 10,000 or more todos, returning error code TODO_LIMIT_EXCEEDED.

**BC-002: Account Creation Rate Limiting**
WHEN registration requests are received from the same IP address, THE system SHALL allow a maximum of 5 account creations per hour.

**BC-003: Login Attempt Rate Limiting**
WHEN login attempts are received for the same email address, THE system SHALL allow a maximum of 10 failed attempts per 15 minutes before temporarily blocking login for that account.

**BC-004: API Request Rate Limiting**
WHEN API requests are received from an authenticated user, THE system SHALL allow a maximum of 100 requests per minute per user.

### Resource Usage Constraints

**BC-005: Concurrent Todo Operations**
THE system SHALL support at least 100 concurrent users performing todo operations simultaneously.

**BC-006: Batch Operation Limits**
WHEN a user performs bulk todo operations, THE system SHALL limit batch operations to a maximum of 50 todos per request.

**BC-007: Query Result Pagination**
WHEN a user requests their todo list, THE system SHALL return results in pages of 50 todos maximum per page.

### Data Retention Constraints

**BC-008: Deleted Todo Data Retention**
WHEN a user deletes a todo, THE system SHALL permanently remove the todo data within 24 hours (no soft delete retention).

**BC-009: Inactive Account Handling**
WHEN a user account remains inactive (no login) for 2 years, THE system SHALL send notification to the user's email address warning of potential account closure.

**BC-010: Account Closure Confirmation**
WHEN a user initiates account closure, THE system SHALL require email confirmation before permanently deleting the account and all associated todos.

## Operational Rules

### Todo Lifecycle Rules

**OR-001: Todo Creation Workflow**
WHEN a user creates a todo, THE system SHALL follow this sequence: validate title, assign owner, set default completion status to incomplete, set creation timestamp, set updated timestamp, save todo, return todo details.

**OR-002: Todo Update Workflow**
WHEN a user updates a todo, THE system SHALL follow this sequence: verify ownership, validate new data, update modified fields, update updated timestamp, save changes, return updated todo details.

**OR-003: Todo Deletion Workflow**
WHEN a user deletes a todo, THE system SHALL follow this sequence: verify ownership, mark for deletion, remove from database, return success confirmation.

**OR-004: Todo Completion Toggle Workflow**
WHEN a user toggles todo completion status, THE system SHALL follow this sequence: verify ownership, flip completion status, update updated timestamp, save changes, return updated todo.

### User Account Lifecycle Rules

**OR-005: User Registration Workflow**
WHEN a user registers, THE system SHALL follow this sequence: validate email uniqueness, validate password strength, hash password, create user account, generate authentication token, return token and user details.

**OR-006: User Login Workflow**
WHEN a user logs in, THE system SHALL follow this sequence: validate email exists, verify password hash, check account status, generate new authentication token, return token and user details.

**OR-007: User Logout Workflow**
WHEN a user logs out, THE system SHALL invalidate the current authentication token.

**OR-008: Password Change Workflow**
WHEN a user changes their password, THE system SHALL follow this sequence: verify current password, validate new password strength, hash new password, update user record, invalidate all existing tokens, generate new authentication token, return new token.

### Data Modification Rules

**OR-009: Todo Update Frequency**
THE system SHALL allow users to update the same todo without frequency restrictions (no cooldown period).

**OR-010: Simultaneous Edit Handling**
WHEN multiple edit requests for the same todo arrive simultaneously, THE system SHALL process them sequentially based on request timestamp, with the last write winning.

**OR-011: Partial Update Support**
WHEN a user updates a todo, THE system SHALL allow updating individual fields (title, description, completion status) without requiring all fields to be provided.

**OR-012: Field Update Validation**
WHEN a user updates specific todo fields, THE system SHALL validate only the fields being updated, not all fields.

### Deletion and Recovery Rules

**OR-013: No Todo Recovery After Deletion**
WHEN a user deletes a todo, THE system SHALL permanently delete it with no recovery option (no undo functionality).

**OR-014: Deletion Confirmation Not Required**
WHEN a user initiates todo deletion, THE system SHALL delete the todo immediately without requiring additional confirmation (client applications may implement confirmation UI).

**OR-015: Bulk Deletion Support**
WHEN a user requests deletion of multiple todos, THE system SHALL delete all specified todos that the user owns and skip todos the user does not own, returning a list of successfully deleted todo IDs.

**OR-016: Account Deletion Permanence**
WHEN a user account is deleted, THE system SHALL permanently delete the account and all associated data with no recovery option after the 24-hour grace period.

## Error Handling for Business Rule Violations

### Validation Error Responses

**EH-001: Title Validation Failure**
WHEN a todo title fails validation, THE system SHALL return HTTP 400 with error code TODO_TITLE_INVALID and a message describing the specific validation failure.

**EH-002: Email Validation Failure**
WHEN an email address fails validation, THE system SHALL return HTTP 400 with error code EMAIL_INVALID and a message describing the specific validation failure.

**EH-003: Password Validation Failure**
WHEN a password fails validation, THE system SHALL return HTTP 400 with error code PASSWORD_INVALID and a message describing the specific validation failure.

### Authorization Error Responses

**EH-004: Ownership Violation**
WHEN a user attempts to access a todo they do not own, THE system SHALL return HTTP 403 with error code FORBIDDEN_ACCESS and message "You do not have permission to access this todo."

**EH-005: Authentication Required**
WHEN a guest user attempts to access protected resources, THE system SHALL return HTTP 401 with error code AUTH_REQUIRED and message "Authentication required to access this resource."

**EH-006: Token Expiration**
WHEN an expired token is used, THE system SHALL return HTTP 401 with error code TOKEN_EXPIRED and message "Your session has expired. Please login again."

### Constraint Violation Error Responses

**EH-007: Todo Limit Exceeded**
WHEN a user exceeds the todo limit, THE system SHALL return HTTP 429 with error code TODO_LIMIT_EXCEEDED and message "You have reached the maximum number of todos (10,000). Please delete some todos before creating new ones."

**EH-008: Rate Limit Exceeded**
WHEN a user exceeds rate limits, THE system SHALL return HTTP 429 with error code RATE_LIMIT_EXCEEDED and message "Too many requests. Please try again later."

**EH-009: Duplicate Email**
WHEN a user attempts to register with an existing email, THE system SHALL return HTTP 409 with error code EMAIL_ALREADY_EXISTS and message "An account with this email address already exists."

## Business Rule Priority and Conflict Resolution

### Rule Priority Levels

**Priority Level 1 (Critical - Security and Data Integrity)**
- Authentication and authorization rules (AR-001 through AR-012)
- Data integrity rules (DI-001 through DI-010)
- Password security rules (UV-007 through UV-012)

**Priority Level 2 (High - Data Quality)**
- Todo validation rules (TR-001 through TR-015)
- User data validation rules (UV-001 through UV-006, UV-013 through UV-018)

**Priority Level 3 (Medium - System Constraints)**
- Business constraints (BC-001 through BC-010)
- Rate limiting rules

**Priority Level 4 (Low - Operational Efficiency)**
- Operational workflow rules (OR-001 through OR-016)

### Conflict Resolution Principles

**CR-001: Security Over Convenience**
WHEN business rules conflict, THE system SHALL prioritize security and authorization rules over operational convenience.

**CR-002: Data Integrity Over Performance**
WHEN business rules conflict, THE system SHALL prioritize data integrity and consistency over performance optimization.

**CR-003: Explicit Rules Over Defaults**
WHEN business rules conflict, THE system SHALL prioritize explicitly defined rules over default behaviors.

## Business Rule Testing and Validation

### Rule Testability Requirements

**TEST-001: Measurable Outcomes**
THE system SHALL implement all business rules with clear, measurable pass/fail criteria enabling automated testing.

**TEST-002: Validation Rule Testing**
WHEN testing validation rules, THE system SHALL provide test cases for valid inputs, invalid inputs at boundaries, and invalid inputs beyond boundaries.

**TEST-003: Authorization Rule Testing**
WHEN testing authorization rules, THE system SHALL verify both permitted access scenarios and denied access scenarios.

**TEST-004: Data Integrity Testing**
WHEN testing data integrity rules, THE system SHALL verify constraint enforcement, cascade behaviors, and referential integrity maintenance.

### Comprehensive Test Coverage

**TEST-005: Happy Path Testing**
THE system testing SHALL include scenarios where all business rules are satisfied and operations complete successfully.

**TEST-006: Error Path Testing**
THE system testing SHALL include scenarios where business rules are violated and appropriate errors are returned.

**TEST-007: Edge Case Testing**
THE system testing SHALL include boundary conditions such as maximum lengths, minimum lengths, empty values, null values, and special characters.

**TEST-008: Concurrent Operation Testing**
THE system testing SHALL include scenarios with simultaneous operations to verify business rule enforcement under concurrent access.

## Summary

This document has defined comprehensive business rules covering:

- **Todo validation**: Title, description, and completion status requirements
- **User data validation**: Email, password, and username requirements
- **Authorization**: Ownership verification and access control
- **Data integrity**: Referential integrity and cascade deletion
- **Business constraints**: System-wide limits and rate limiting
- **Operational rules**: Lifecycle workflows and data modification procedures
- **Error handling**: Specific error codes and messages for rule violations
- **Rule priorities**: Conflict resolution and priority levels
- **Testing requirements**: Validation and test coverage expectations

All rules are written in EARS format to ensure specificity, measurability, and testability. These business rules provide backend developers with clear, unambiguous requirements for implementing validation logic, authorization checks, and data integrity safeguards throughout the Todo list application.

The rules maintain the philosophy of simplicity while ensuring robust data protection, security, and user experience quality. Developers have full autonomy to implement these business requirements using appropriate technical solutions, architectures, and database designs.
