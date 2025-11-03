# Business Rules and Validation

## Introduction

This document defines all business rules, validation constraints, and data integrity requirements for the todoList application. These rules ensure consistent behavior, data quality, and proper enforcement of business logic throughout the system. All validation must occur at the business logic layer before data persistence.

**Developer Note**: This document describes business requirements and validation rules in natural language. Technical implementation decisions (database constraints, validation frameworks, error response formats) are at the discretion of the development team.

The rules defined here apply to all operations involving user accounts and todo items. Backend developers must implement these validations to maintain data integrity and provide clear feedback when validation fails.

## Todo Item Validation Rules

### Title Validation

**TR-001: Title Required**
THE todo item SHALL have a title.

**TR-002: Title Length Minimum**
WHEN a user creates or updates a todo item, THE system SHALL require the title to contain at least 1 character.

**TR-003: Title Length Maximum**
WHEN a user creates or updates a todo item, THE system SHALL limit the title to a maximum of 200 characters.

**TR-004: Title Whitespace Handling**
WHEN a user submits a todo title, THE system SHALL trim leading and trailing whitespace before validation.

**TR-005: Empty Title After Trimming**
IF a todo title contains only whitespace characters, THEN THE system SHALL reject the todo item as invalid.

### Description Validation

**TD-001: Description Optional**
THE todo item description SHALL be optional.

**TD-002: Description Length Maximum**
WHEN a user provides a todo description, THE system SHALL limit the description to a maximum of 2000 characters.

**TD-003: Description Can Be Empty**
THE system SHALL accept empty or null values for todo item descriptions.

### Status Validation

**TS-001: Status Required**
THE todo item SHALL have a status.

**TS-002: Valid Status Values**
THE system SHALL accept only two status values for todo items: "incomplete" and "complete".

**TS-003: Default Status**
WHEN a user creates a new todo item without specifying status, THE system SHALL set the status to "incomplete".

**TS-004: Status Change Validation**
WHEN a user updates a todo status, THE system SHALL validate that the new status is one of the allowed values: "incomplete" or "complete".

### Priority Validation

**TP-001: Priority Optional**
THE todo item priority SHALL be optional.

**TP-002: Valid Priority Values**
WHERE a todo item includes priority, THE system SHALL accept only these values: "low", "medium", "high".

**TP-003: Priority Can Be Null**
THE system SHALL accept null or unspecified priority values for todo items.

### Timestamp Validation

**TT-001: Creation Timestamp Required**
WHEN a todo item is created, THE system SHALL automatically set the creation timestamp to the current date and time.

**TT-002: Creation Timestamp Immutable**
THE system SHALL not allow modification of the creation timestamp after the todo item is created.

**TT-003: Update Timestamp Automatic**
WHEN a todo item is modified, THE system SHALL automatically update the last modified timestamp to the current date and time.

**TT-004: Update Timestamp on Status Change**
WHEN a todo item status changes from incomplete to complete or vice versa, THE system SHALL update the last modified timestamp.

### Ownership Validation

**TO-001: Owner Required**
THE todo item SHALL have an owner (user ID reference).

**TO-002: Owner Immutable**
THE system SHALL not allow modification of the todo item owner after creation.

**TO-003: Valid Owner Reference**
WHEN a todo item is created, THE system SHALL validate that the owner user ID references an existing, active user account.

## User Account Rules

### Email Validation

**UE-001: Email Required**
THE user account SHALL have an email address.

**UE-002: Email Format**
WHEN a user registers or updates their email, THE system SHALL validate that the email follows standard email format (contains @ symbol, valid domain structure).

**UE-003: Email Uniqueness**
THE system SHALL ensure that each email address is associated with only one user account.

**UE-004: Email Case Insensitivity**
WHEN validating email uniqueness, THE system SHALL treat email addresses as case-insensitive (user@example.com equals USER@EXAMPLE.COM).

**UE-005: Email Length Maximum**
WHEN a user provides an email address, THE system SHALL limit the email to a maximum of 255 characters.

**UE-006: Email Whitespace**
WHEN a user submits an email address, THE system SHALL trim leading and trailing whitespace before validation.

### Password Validation

**UP-001: Password Required**
THE user account SHALL have a password.

**UP-002: Password Minimum Length**
WHEN a user sets a password, THE system SHALL require the password to contain at least 8 characters.

**UP-003: Password Maximum Length**
WHEN a user sets a password, THE system SHALL limit the password to a maximum of 100 characters.

**UP-004: Password Complexity**
WHEN a user creates or changes a password, THE system SHALL require the password to contain at least one letter and one number.

**UP-005: Password Storage Security**
THE system SHALL never store passwords in plain text format.

**UP-006: Password Hashing**
WHEN a user sets a password, THE system SHALL hash the password using industry-standard secure hashing before storage.

### Account Status Rules

**UA-001: Account Status Required**
THE user account SHALL have a status.

**UA-002: Valid Account Status Values**
THE system SHALL support these account status values: "active", "suspended", "deleted".

**UA-003: Default Account Status**
WHEN a new user account is created, THE system SHALL set the account status to "active".

**UA-004: Suspended Account Login**
WHEN a user with suspended status attempts to log in, THE system SHALL deny access and return an appropriate error.

**UA-005: Deleted Account Login**
WHEN a user with deleted status attempts to log in, THE system SHALL deny access and return an appropriate error.

### Account Creation Validation

**UC-001: Registration Fields Required**
WHEN a user registers, THE system SHALL require email and password fields.

**UC-002: Duplicate Email Prevention**
WHEN a user attempts to register with an existing email, THE system SHALL reject the registration and inform the user that the email is already in use.

**UC-003: Account Creation Timestamp**
WHEN a user account is created, THE system SHALL automatically set the account creation timestamp to the current date and time.

## Data Constraints

### Field-Level Constraints

**FC-001: Text Field Null Handling**
THE system SHALL clearly distinguish between null values and empty strings for optional text fields.

**FC-002: Numeric Field Validation**
WHERE numeric fields are used, THE system SHALL validate that values are within acceptable ranges.

**FC-003: Boolean Field Validation**
WHERE boolean fields are used, THE system SHALL accept only true or false values.

### Entity-Level Constraints

**EC-001: User Account Completeness**
THE system SHALL ensure every user account has all required fields: email, password hash, status, creation timestamp.

**EC-002: Todo Item Completeness**
THE system SHALL ensure every todo item has all required fields: title, status, owner ID, creation timestamp, last modified timestamp.

**EC-003: Referential Integrity**
THE system SHALL ensure that all todo items reference valid, existing user accounts as owners.

### Relationship Constraints

**RC-001: User-Todo Relationship**
THE system SHALL maintain the relationship that one user can own zero or many todo items.

**RC-002: Todo Ownership Exclusivity**
THE system SHALL ensure that each todo item is owned by exactly one user.

**RC-003: Orphaned Todo Prevention**
THE system SHALL not allow todo items to exist without a valid user owner.

### Uniqueness Requirements

**UR-001: User Email Uniqueness**
THE system SHALL enforce that no two active user accounts can have the same email address.

**UR-002: Todo Item Uniqueness**
THE system SHALL allow multiple todo items with identical titles if they belong to different users or the same user.

### Required vs Optional Fields

**Required Fields for User Account:**
- Email address
- Password hash
- Account status
- Account creation timestamp

**Optional Fields for User Account:**
- Display name
- Profile information
- Last login timestamp

**Required Fields for Todo Item:**
- Title
- Status
- Owner user ID
- Creation timestamp
- Last modified timestamp

**Optional Fields for Todo Item:**
- Description
- Priority
- Due date
- Completion timestamp

## Business Logic Rules

### Todo Ownership Rules

**BL-001: User Access to Own Todos**
WHEN a user requests todo items, THE system SHALL return only todo items owned by that user.

**BL-002: Cross-User Access Prevention**
WHEN a user attempts to access a todo item owned by another user, THE system SHALL deny access.

**BL-003: Todo Creation Ownership**
WHEN a user creates a todo item, THE system SHALL automatically set the owner to the authenticated user.

**BL-004: Ownership Transfer Prohibited**
THE system SHALL not allow transferring todo item ownership from one user to another.

### Todo Completion Logic

**BL-005: Mark as Complete**
WHEN a user marks a todo item as complete, THE system SHALL change the status from "incomplete" to "complete" and update the last modified timestamp.

**BL-006: Mark as Incomplete**
WHEN a user marks a todo item as incomplete, THE system SHALL change the status from "complete" to "incomplete" and update the last modified timestamp.

**BL-007: Completion Timestamp**
WHEN a todo item status changes to complete, THE system SHALL record the completion timestamp.

**BL-008: Reverting Completion**
WHEN a todo item status changes from complete to incomplete, THE system SHALL clear the completion timestamp.

### Todo Modification Rules

**BL-009: Owner Can Modify**
WHEN a user attempts to update their own todo item, THE system SHALL allow the modification.

**BL-010: Non-Owner Cannot Modify**
WHEN a user attempts to update a todo item they do not own, THE system SHALL deny the modification.

**BL-011: Modification Timestamp Update**
WHEN any field of a todo item is modified, THE system SHALL update the last modified timestamp.

**BL-012: Partial Updates Allowed**
THE system SHALL allow users to update individual fields of a todo item without requiring all fields to be provided.

### User Data Isolation

**BL-013: Data Privacy Enforcement**
THE system SHALL ensure that users can only view, create, update, and delete their own todo items.

**BL-014: Query Filtering**
WHEN a user requests a list of todo items, THE system SHALL automatically filter results to include only items owned by the requesting user.

**BL-015: User Statistics Privacy**
THE system SHALL calculate user statistics (total todos, completed todos, etc.) based only on that user's own data.

### Admin Access Rules

**BL-016: Admin View All Users**
WHERE the requesting user is an admin, THE system SHALL allow viewing all user accounts for administrative purposes.

**BL-017: Admin System Statistics**
WHERE the requesting user is an admin, THE system SHALL provide access to system-wide statistics (total users, total todos, system health).

**BL-018: Admin User Management**
WHERE the requesting user is an admin, THE system SHALL allow managing user account status (suspending, deleting accounts).

**BL-019: Admin Data Access Logging**
WHEN an admin accesses user data, THE system SHALL log the access for audit purposes.

**BL-020: Admin Cannot Modify User Todos**
THE system SHALL not allow admins to create, update, or delete todo items belonging to other users.

## Authorization Rules

### User Access Control

**AR-001: Authentication Required**
WHEN a user attempts to access any todo functionality, THE system SHALL require valid authentication.

**AR-002: Session Validation**
WHEN a user makes a request, THE system SHALL validate that the authentication token is valid and not expired.

**AR-003: Unauthenticated Access Denial**
WHEN an unauthenticated user attempts to access protected resources, THE system SHALL deny access.

### Admin Permissions

**AR-004: Admin Role Identification**
THE system SHALL identify admin users based on their role designation in their user account.

**AR-005: Admin-Only Endpoints**
WHEN a non-admin user attempts to access admin-only functionality, THE system SHALL deny access.

**AR-006: Admin User Management Rights**
WHERE the requesting user is an admin, THE system SHALL allow user account management operations.

### Resource Ownership Verification

**AR-007: Ownership Check on Read**
WHEN a user requests a specific todo item, THE system SHALL verify the user owns that item before returning it.

**AR-008: Ownership Check on Update**
WHEN a user attempts to update a todo item, THE system SHALL verify the user owns that item before allowing modification.

**AR-009: Ownership Check on Delete**
WHEN a user attempts to delete a todo item, THE system SHALL verify the user owns that item before allowing deletion.

**AR-010: Ownership Automatic on Create**
WHEN a user creates a todo item, THE system SHALL automatically assign ownership to the authenticated user without requiring explicit specification.

### Cross-User Access Prevention

**AR-011: Todo Item ID Guessing Protection**
WHEN a user provides a todo item ID they do not own, THE system SHALL respond as if the item does not exist.

**AR-012: User Enumeration Prevention**
THE system SHALL not reveal whether a todo item exists if the requesting user does not have permission to access it.

**AR-013: List Filtering Enforcement**
WHEN a user requests a list of todos, THE system SHALL enforce filtering to show only their own items regardless of query parameters.

## Data Lifecycle Rules

### Todo Creation Rules

**DL-001: Creation Validation**
WHEN a user creates a todo item, THE system SHALL validate all required fields before persisting the data.

**DL-002: Creation Defaults**
WHEN a user creates a todo item, THE system SHALL apply default values for optional fields not provided (status defaults to "incomplete").

**DL-003: Creation Timestamp Automatic**
WHEN a user creates a todo item, THE system SHALL automatically set creation and last modified timestamps without user input.

**DL-004: Creation Authorization**
WHEN a user creates a todo item, THE system SHALL verify the user is authenticated before allowing creation.

### Todo Update Rules

**DL-005: Update Validation**
WHEN a user updates a todo item, THE system SHALL validate all provided fields before persisting changes.

**DL-006: Update Authorization**
WHEN a user updates a todo item, THE system SHALL verify the user owns the item before allowing updates.

**DL-007: Update Timestamp Automatic**
WHEN a user updates a todo item, THE system SHALL automatically update the last modified timestamp.

**DL-008: Partial Update Support**
THE system SHALL allow users to update specific fields without requiring all fields to be provided.

**DL-009: Immutable Field Protection**
WHEN a user attempts to update immutable fields (creation timestamp, owner ID), THE system SHALL ignore those fields or reject the update.

### Todo Deletion Rules

**DL-010: Deletion Authorization**
WHEN a user deletes a todo item, THE system SHALL verify the user owns the item before allowing deletion.

**DL-011: Deletion Permanence**
WHEN a user deletes a todo item, THE system SHALL permanently remove the item from the database (hard delete).

**DL-012: Deletion Confirmation**
WHEN a user successfully deletes a todo item, THE system SHALL confirm the deletion.

**DL-013: Deleted Item Inaccessibility**
WHEN a user attempts to access a deleted todo item, THE system SHALL respond as if the item does not exist.

### User Account Deletion

**DL-014: User Account Deletion Options**
THE system SHALL support marking user accounts as deleted (soft delete) for data retention purposes.

**DL-015: User Todo Cleanup**
WHEN a user account is deleted, THE system SHALL define behavior for associated todo items (delete all todos or mark as orphaned for retention period).

**DL-016: Deleted User Login Prevention**
WHEN a user account is marked as deleted, THE system SHALL prevent login attempts.

**DL-017: Email Reuse After Deletion**
THE system SHALL define policy for email address reuse after account deletion (allow or prevent).

### Data Retention Policies

**DL-018: Active User Data**
THE system SHALL retain all data for active user accounts indefinitely until the user deletes their account.

**DL-019: Completed Todo Retention**
THE system SHALL retain completed todo items until explicitly deleted by the user.

**DL-020: Deleted Account Data**
WHERE a user account is marked deleted, THE system SHALL define retention period before permanent data removal (if applicable).

## Validation Error Handling

### Validation Failure Responses

**VE-001: Clear Error Messages**
WHEN validation fails, THE system SHALL provide clear, specific error messages indicating which field failed validation and why.

**VE-002: User-Friendly Language**
WHEN validation fails, THE system SHALL use user-friendly language in error messages without exposing technical implementation details.

**VE-003: Field-Specific Errors**
WHEN validation fails, THE system SHALL associate error messages with the specific fields that failed validation.

### Multiple Validation Error Handling

**VE-004: All Errors Reported**
WHEN multiple fields fail validation, THE system SHALL report all validation errors together rather than stopping at the first error.

**VE-005: Error Collection**
WHEN processing a request with multiple validation failures, THE system SHALL collect all errors before responding.

### Validation Error Format

**VE-006: Consistent Error Structure**
THE system SHALL use consistent error response structure across all validation failures.

**VE-007: Error Code Identification**
WHEN validation fails, THE system SHALL include error codes that identify the specific validation rule that failed.

**VE-008: Helpful Guidance**
WHERE appropriate, validation error messages SHALL include guidance on how to correct the error (e.g., "Password must be at least 8 characters").

## Business Rule Priority

When multiple business rules apply to a single operation, the system SHALL enforce them in this priority order:

1. **Authentication and Authorization** - Verify user identity and permissions first
2. **Required Field Validation** - Ensure all required fields are present
3. **Format and Type Validation** - Validate data types and formats
4. **Business Logic Constraints** - Apply business rules and constraints
5. **Data Integrity Rules** - Ensure referential integrity and relationships
6. **Default Value Application** - Apply defaults for optional fields

## Rule Enforcement

All business rules defined in this document are **mandatory** and must be enforced at the business logic layer before data persistence. Developers must implement validation logic that checks these rules and provides appropriate feedback when rules are violated.

The rules are written to be technology-agnostic. Implementation teams have full discretion over:
- Which validation frameworks or libraries to use
- Whether to implement validation at multiple layers (API, business logic, database)
- Specific error response formats and HTTP status codes
- Logging and monitoring approaches for rule violations

However, the **behavior** defined by these rules must be consistently enforced regardless of implementation approach.