# Business Rules for Todo Application

## Introduction & Purpose

This document defines the core business rules, validation requirements, and operational constraints that govern the behavior of the Todo application. These rules ensure data consistency, maintain system integrity, and enforce the business logic that users expect from a reliable todo management system.

Business rules define what the system must validate, what operations are allowed, what state transitions are permitted, and what constraints apply to user actions. Developers must implement every rule specified in this document to ensure the system behaves correctly.

---

## 1. Validation Rules

### 1.1 Todo Item Title Validation

**EARS Rule 1.1: Title Field Requirement**
- WHEN a user attempts to create or update a todo item, THE system SHALL validate that the title field is provided and not empty.
- WHERE the title field is empty or contains only whitespace, THE system SHALL reject the operation and display the error message "Todo title cannot be empty".
- THE system SHALL treat a title consisting of only spaces, tabs, or newline characters as empty.

**EARS Rule 1.2: Title Length Constraint**
- THE system SHALL enforce a maximum length of 255 characters for the todo title.
- WHEN a user submits a title exceeding 255 characters, THE system SHALL reject the submission with error message "Todo title cannot exceed 255 characters".
- WHERE a user provides exactly 255 characters or fewer, THE system SHALL accept the title.

**EARS Rule 1.3: Title Format & Character Validation**
- THE system SHALL accept todo titles containing letters (A-Z, a-z), numbers (0-9), spaces, and common punctuation marks: . , ! ? - : ; ' " ( ) / & @
- WHEN a user submits a title containing characters outside this allowed set (e.g., special symbols like *, ^, ~), THE system SHALL reject the operation.
- THE error message SHALL specify which invalid characters were found or provide guidance on allowed character types.

**EARS Rule 1.4: Title Trimming**
- WHEN a user submits a title with leading or trailing whitespace, THE system SHALL automatically trim the whitespace before storing.
- Example: A user enters "  Buy groceries  " (with spaces before and after) SHALL be stored as "Buy groceries" (trimmed).

### 1.2 Todo Description Validation

**EARS Rule 1.5: Description Optional with Maximum Length**
- WHERE a user provides a description for a todo item, THE system SHALL enforce a maximum length of 2000 characters.
- WHEN a description exceeds 2000 characters, THE system SHALL reject the submission with error message "Todo description cannot exceed 2000 characters".
- WHERE a user does not provide a description, THE system SHALL allow the todo to be created with an empty description field.

**EARS Rule 1.6: Description Format Acceptance**
- THE system SHALL accept descriptions containing any printable characters including letters, numbers, punctuation, and line breaks.
- THE system SHALL preserve line breaks and formatting in the description as entered by the user.

### 1.3 Due Date Validation

**EARS Rule 1.7: Valid Due Date Format**
- WHEN a user provides a due date, THE system SHALL validate that the date is in ISO 8601 format (YYYY-MM-DD).
- IF the date format is not YYYY-MM-DD, THEN THE system SHALL reject the submission with error message "Due date must be in YYYY-MM-DD format (e.g., 2025-12-31)".
- THE system SHALL verify that the date components represent a valid calendar date (e.g., month must be 01-12, day must be 01-31 for most months).

**EARS Rule 1.8: Due Date Not in Past**
- THE system SHALL allow users to set due dates only for today or future dates.
- WHEN a user attempts to set a due date in the past, THE system SHALL reject the operation with error message "Due date cannot be in the past. Please select today's date or a future date".
- WHERE the current date is 2025-10-31 and the user attempts to set due date to 2025-10-30, THE system SHALL reject this as a past date.
- WHERE the user sets due date to 2025-10-31 (today), THE system SHALL accept this as valid.

**EARS Rule 1.9: Due Date Optional**
- WHERE a user does not provide a due date, THE system SHALL allow the todo to be created without one.
- THE system SHALL treat missing due dates as valid (no due date is a legitimate state for a todo).
- WHEN a user updates a todo and removes a previously set due date, THE system SHALL accept this and store the due date field as empty/null.

### 1.4 Priority Validation

**EARS Rule 1.10: Priority Level Values**
- THE system SHALL accept only three priority levels for todos: "low", "medium", "high" (case-insensitive for user input, normalized to lowercase for storage).
- WHEN a user submits a priority value other than these three options (e.g., "urgent", "normal", "1"), THE system SHALL reject with error message "Priority must be 'low', 'medium', or 'high'".
- THE system SHALL treat priority values as case-insensitive input (e.g., "LOW", "Low", "low" all map to "low").

**EARS Rule 1.11: Priority Default Value**
- WHERE a user does not specify a priority level, THE system SHALL automatically assign the priority as "medium".
- WHERE a user explicitly sets priority to null or empty during update, THE system SHALL set priority to "medium" (not allow null priority).

**EARS Rule 1.12: Priority Immutability During Operations**
- WHEN a todo is marked as complete, THE system SHALL preserve the priority level (do not change or reset priority).
- WHEN a todo is marked as incomplete again, THE system SHALL preserve the original priority level.

### 1.5 Status Validation

**EARS Rule 1.13: Valid Status Values**
- THE system SHALL recognize only two status values for todos: "active" and "completed" (case-insensitive input, normalized to lowercase).
- WHEN a user attempts to set a status other than these two values (e.g., "pending", "in-progress", "archived"), THE system SHALL reject the operation.
- THE system SHALL normalize status values: "ACTIVE" → "active", "Completed" → "completed", etc.

**EARS Rule 1.14: Status Default on Creation**
- WHEN a user creates a new todo item, THE system SHALL automatically set the initial status to "active".
- THE system SHALL not allow users to specify a different initial status during creation; all new todos start as "active".

**EARS Rule 1.15: Status-Timestamp Consistency**
- WHEN a todo's status changes from "active" to "completed", THE system SHALL record the exact timestamp of completion (UTC timezone).
- WHEN a todo's status changes from "completed" back to "active", THE system SHALL clear/remove the completion timestamp.
- THE system SHALL never have a todo with status "active" AND a populated completion timestamp simultaneously.

### 1.6 User Data Validation

**EARS Rule 1.16: Email Format Validation**
- WHEN a user registers or updates their email address, THE system SHALL validate that the email follows RFC 5322 standard email format (simplified: localpart@domain.extension).
- THE system SHALL require at least one character before @, a domain name, and a valid extension (.com, .org, etc.).
- IF the email format is invalid (e.g., "notanemail", "user@", "@domain.com"), THEN THE system SHALL reject with error message "Invalid email format. Please enter a valid email address".

**EARS Rule 1.17: Email Uniqueness**
- THE system SHALL ensure that no two user accounts can have the same email address across the entire system.
- WHEN a user attempts to register with an email that already exists in the system, THE system SHALL reject with error message "This email is already registered. Please use a different email or log in".
- WHEN a user attempts to update their email to one already used by another account, THE system SHALL reject the update.
- WHERE an email belongs to a deleted user account, THE system SHALL treat that email as available for new registration after a 30-day grace period.

**EARS Rule 1.18: Email Case Normalization**
- THE system SHALL normalize email addresses to lowercase for storage and comparison purposes.
- WHERE a user enters "John@Example.COM", THE system SHALL store and treat it as "john@example.com".

**EARS Rule 1.19: Password Requirements**
- WHEN a user sets a password during registration or password change, THE system SHALL enforce minimum 8 characters in length.
- THE system SHALL reject passwords shorter than 8 characters with error message "Password must be at least 8 characters long".
- THE system SHALL accept passwords up to 256 characters in length.
- THE system SHALL not impose character complexity requirements (letters, numbers, special characters) for MVP simplicity; any 8+ character password is acceptable.

**EARS Rule 1.20: Password Hashing**
- THE system SHALL never store passwords in plaintext.
- WHEN a password is set, THE system SHALL hash it using bcrypt, Argon2, or equivalent secure hashing algorithm before storage.
- THE system SHALL use a unique salt for each password hash.
- THE system SHALL verify incoming passwords against the stored hash, never comparing plaintext passwords.

---

## 2. Business Logic & Constraints

### 2.1 Todo Creation Rules

**EARS Rule 2.1: User-Owned Todo Creation**
- WHEN an authenticated user creates a new todo item, THE system SHALL associate that todo exclusively with the authenticated user's ID.
- THE system SHALL store the user ID that owns this todo and enforce ownership checks on all subsequent operations.
- WHERE a todo is created, THE system SHALL establish an immutable owner relationship; the owner cannot be changed after creation.

**EARS Rule 2.2: Minimum Required Fields**
- WHEN a user creates a todo, THE system SHALL require only the title field.
- WHERE a user provides only a title, THE system SHALL populate the following default values:
  - Status: "active"
  - Priority: "medium"
  - Due date: null (empty)
  - Description: null (empty)
  - Created date: current UTC timestamp
  - Modified date: current UTC timestamp

**EARS Rule 2.3: Todo Creation Timestamp**
- WHEN a todo is created, THE system SHALL automatically record the creation timestamp in UTC format (ISO 8601).
- THE system SHALL never allow users to manually set or modify the creation timestamp.
- WHERE the system creates a todo, THE created_date SHALL be immutable and never change for the lifetime of the todo.

**EARS Rule 2.4: Unique Todo Identification**
- WHEN a todo is created, THE system SHALL assign a unique identifier (UUID or similar).
- THE system SHALL ensure no two todos in the system share the same ID, even if one is deleted.

### 2.2 Todo Modification Rules

**EARS Rule 2.5: User-Specific Edit Access**
- WHEN a user attempts to modify a todo item, THE system SHALL verify that the user owns the todo OR is an admin user.
- IF the user does not own the todo AND is not an admin, THEN THE system SHALL deny the modification with HTTP 403 Forbidden status.
- THE error response SHALL include message "You do not have permission to edit this todo".

**EARS Rule 2.6: Partial Updates Allowed**
- WHEN a user updates a todo, THE system SHALL allow updating any subset of modifiable fields (title, description, priority, due date, status).
- THE system SHALL preserve existing values for fields not included in the update request.
- Example: IF a user updates only the title, THE priority, due date, status, and description remain unchanged.

**EARS Rule 2.7: Modification Timestamp Update**
- WHEN any field of a todo item is modified, THE system SHALL automatically update the last_modified_date timestamp to current UTC time.
- THE system SHALL update modified_date even when only status changes, due date changes, or any other modification occurs.
- THE system SHALL never allow users to manually set the modification timestamp.

**EARS Rule 2.8: Status Change Timestamp Recording**
- WHEN a user changes a todo status from "active" to "completed", THE system SHALL record the exact completion timestamp in a completion_date field.
- WHEN a user changes a todo status from "completed" back to "active", THE system SHALL clear/remove the completion_date field (set to null).
- WHERE a todo with status "active" is queried, THE system SHALL ensure completion_date is null or empty.
- WHERE a todo with status "completed" is queried, THE system SHALL ensure completion_date contains a valid timestamp.

**EARS Rule 2.9: Creation Date Immutability**
- THE system SHALL NEVER modify or allow modification of a todo's creation_date after the todo is created.
- WHERE a todo's other fields are updated, THE creation_date SHALL remain unchanged.

### 2.3 Todo Deletion Rules

**EARS Rule 2.10: User-Specific Deletion Access**
- WHEN a user attempts to delete a todo item, THE system SHALL verify that the user owns the todo OR is an admin user.
- IF the user does not own the todo AND is not an admin, THEN THE system SHALL deny deletion with HTTP 403 Forbidden status.
- THE error response SHALL include message "You do not have permission to delete this todo".

**EARS Rule 2.11: Permanent Deletion**
- WHEN a user deletes a todo, THE system SHALL permanently remove it from the database.
- THE system SHALL not use soft delete; deleted todos are completely removed and cannot be recovered by any user.
- WHEN a user deletes a todo, THE system SHALL immediately remove it from all queries and views.

**EARS Rule 2.12: Cascade Deletion on User Removal**
- WHEN a user account is deleted (by admin), THE system SHALL automatically delete all todos associated with that user.
- WHERE cascade deletion occurs, THE system SHALL log the bulk deletion action in audit trail with the admin ID and timestamp.

**EARS Rule 2.13: Deletion Confirmation**
- WHERE the system accepts a deletion request, THE system SHALL confirm the deletion was successful before responding to user.
- THE confirmation response SHALL include the ID of the deleted todo.

### 2.4 User Data Isolation

**EARS Rule 2.14: No Cross-User Data Access**
- THE system SHALL ensure that each authenticated user can only view, modify, or delete their own todos.
- WHEN a user queries for todos, THE system SHALL filter results to return ONLY todos where the user_id matches the authenticated user's ID.
- WHERE a user attempts to directly access another user's todo (e.g., by ID), THE system SHALL deny access with HTTP 403 Forbidden.

**EARS Rule 2.15: Error Handling for Unauthorized Access**
- WHEN a user attempts to access another user's todo, THE system SHALL not reveal whether the todo exists or not.
- INSTEAD, THE system SHALL return generic error message "Todo not found" or "Access denied" to prevent information leakage.

**EARS Rule 2.16: Admin Data Access Exception**
- WHERE an admin user accesses the system, THE system SHALL allow the admin to view and manage user accounts and their todos for administrative purposes.
- WHEN an admin accesses user data, THE system SHALL log the access attempt with timestamp, admin ID, and specific data accessed.
- THE admin SHALL still not be able to modify user todos (view-only for auditing purposes).

### 2.5 Time-Based Constraints

**EARS Rule 2.17: Overdue Todo Detection**
- THE system SHALL identify todos where ALL of the following are true:
  - Status is "active" (incomplete)
  - Due date is set and is earlier than the current date
- WHERE these conditions are met, THE system SHALL mark the todo as "overdue" in displays.

**EARS Rule 2.18: Future Todo Identification**
- THE system SHALL identify todos where due date is in the future (after today).
- WHEN a user views their todo list, THE system SHALL allow filtering or sorting by due date to separate upcoming todos.

---

## 3. Data Consistency Rules

### 3.1 User Account Consistency

**EARS Rule 3.1: Single Session Invalidation**
- WHEN a user changes their password, THE system SHALL invalidate all existing session tokens for that user.
- AFTER password change, THE user SHALL be required to log in again with the new password.
- WHERE a user has sessions on multiple devices, ALL sessions SHALL be terminated upon password change.

**EARS Rule 3.2: User Record Integrity**
- THE system SHALL maintain data integrity such that user email addresses remain unique throughout the system lifetime.
- WHEN a user is deleted, THE system SHALL cascade-delete all associated data (todos, sessions, preferences).
- WHERE a user account is marked as deleted, THE system SHALL prevent login attempts with that account.

**EARS Rule 3.3: Account Status Consistency**
- THE system SHALL only allow two account status values: "active" and "deleted".
- WHERE a user account is "deleted", THE system SHALL prevent all login and data access attempts.
- WHEN an admin restores a deleted account (if supported), THE system SHALL validate the restore operation before allowing access.

### 3.2 Todo Data Consistency

**EARS Rule 3.4: Todo Record Completeness**
- EVERY todo record in the system SHALL have at minimum the following fields populated:
  - todo_id (unique identifier)
  - user_id (owner)
  - title (non-empty string)
  - status ("active" or "completed")
  - priority ("low", "medium", or "high")
  - created_date (UTC timestamp)
  - modified_date (UTC timestamp)
- THE system SHALL never store incomplete todo records missing these core fields.

**EARS Rule 3.5: Optional Field Consistency**
- WHERE a todo has optional fields (description, due_date, completion_date):
  - IF the field is not set, it SHALL be null/empty (not an empty string or placeholder value)
  - IF the field is set, it SHALL contain valid data
- THE system SHALL distinguish between "field not set" (null) and "field set to empty value" (empty string).

**EARS Rule 3.6: Status-Timestamp Consistency**
- WHERE a todo has status "completed", THE system SHALL maintain a valid completion_date timestamp.
- WHERE a todo has status "active", THE system SHALL ensure completion_date is null/empty.
- THE system SHALL never allow a situation where status is "active" AND completion_date is populated, or vice versa.

**EARS Rule 3.7: Owner-Todo Relationship Integrity**
- EVERY todo SHALL have exactly one owner (the user_id who created it).
- THE system SHALL never allow ownership of a todo to transfer to another user after creation.
- WHERE a user is deleted, THE system SHALL handle their todos according to cascade deletion policy (delete all their todos).

**EARS Rule 3.8: Modified Date Greater Than or Equal To Created Date**
- WHERE a todo is queried, THE system SHALL ensure modified_date >= created_date (modified date is always after or equal to creation).
- WHERE a todo is first created, modified_date SHALL equal created_date.
- WHEN a todo is modified, modified_date SHALL be updated to current timestamp (which is later than creation).

### 3.3 Referential Integrity

**EARS Rule 3.9: User Reference Validation**
- EVERY todo's user_id field SHALL reference an existing user account that has not been deleted.
- WHERE a user is deleted, THE system SHALL immediately handle cascade deletion of todos or mark todos as orphaned (implementation choice).

---

## 4. State Management Rules

### 4.1 Todo Lifecycle States

**EARS Rule 4.1: Active State Definition & Behavior**
- WHILE a todo has status "active", THE system SHALL include it in the user's active todo list by default.
- WHILE status is "active", THE system SHALL allow the user to modify any modifiable field (title, description, priority, due date, status).
- WHEN displaying todos to users, todos with status "active" SHALL be displayed before "completed" todos in default view.

**EARS Rule 4.2: Completed State Definition & Behavior**
- WHILE a todo has status "completed", THE system SHALL:
  - Record and maintain the completion_date timestamp
  - Still allow modification of modifiable fields (title, description, priority, due date)
  - Allow the status to be reverted back to "active"
  - Exclude from "active todos only" views
- WHERE a user views "completed todos", THE system SHALL display all todos with status "completed".

**EARS Rule 4.3: Valid State Transitions**
- THE system SHALL allow only the following state transitions for todos:
  - "active" → "completed" (mark as done)
  - "completed" → "active" (mark as not done)
  - "active" → "deleted" (delete incomplete todo)
  - "completed" → "deleted" (delete completed todo)
- THE system SHALL NOT allow any other state transitions.
- WHEN a user attempts an invalid state transition, THE system SHALL reject the request.

**EARS Rule 4.4: No Intermediate States**
- THE system SHALL NOT support or create intermediate states like "in-progress", "pending", "archived", etc.
- THE system SHALL only work with the two defined states: "active" and "completed".

### 4.2 User Authentication States

**EARS Rule 4.5: Unauthenticated User State & Access**
- WHILE a user is unauthenticated (no valid session token), THE system SHALL deny access to all todo operations.
- WHILE unauthenticated, THE system SHALL allow only:
  - Registration (creating new account)
  - Login (authentication)
  - Password reset
- WHERE an unauthenticated user attempts to access user-specific endpoints, THE system SHALL return HTTP 401 Unauthorized.

**EARS Rule 4.6: Authenticated User State & Access**
- WHILE a user has a valid authentication token and session, THE system SHALL allow full access to all user's own todo operations.
- WHEN a user's session expires or token is revoked, THE system SHALL transition the user to unauthenticated state.
- WHERE an authenticated user attempts to use an expired token, THE system SHALL return HTTP 401 Unauthorized and require re-authentication.

**EARS Rule 4.7: Session Expiration**
- THE system SHALL automatically expire user sessions after 24 hours of total session time.
- THE system SHALL automatically expire user sessions after 30 minutes of inactivity (no requests made).
- WHEN a session expires, THE system SHALL require the user to log in again to continue.
- WHEN a user logs out, THE system SHALL immediately invalidate their session token.

---

## 5. User Action Constraints

### 5.1 Rate Limiting & Practical Constraints

**EARS Rule 5.1: Todo Creation Limits**
- THE system SHALL allow users to create unlimited todos (no artificial quota on number of todos).
- WHILE a user creates todos, THE system MAY implement performance safeguards if needed (e.g., if user attempts to create 1000 todos in 1 second, the system MAY queue them or rate-limit).
- WHERE practical limits are encountered, THE system SHALL inform the user of the limit rather than silently failing.

**EARS Rule 5.2: Concurrent Modification Protection**
- WHEN multiple simultaneous requests attempt to modify the same todo, THE system SHALL process them sequentially using appropriate locking mechanisms.
- THE system SHALL ensure the last valid modification wins (last-write-wins strategy) or implement optimistic locking with version numbers.
- THE system SHALL prevent data corruption due to race conditions.

**EARS Rule 5.3: Batch Operation Limits**
- WHERE a user performs bulk operations (if supported), THE system SHALL enforce reasonable limits (e.g., maximum 100 todos per batch operation).
- WHEN batch operations are performed, THE system SHALL apply the same validation and permission rules to each item.

### 5.2 Permission Constraints for Authenticated Regular Users

**EARS Rule 5.4: User Operation Permissions - Allowed**
- AUTHENTICATED REGULAR USERS CAN perform the following operations:
  - Create new todos
  - View their own todos and get details
  - Modify their own todos (title, description, priority, due date, status)
  - Delete their own todos
  - Update their own account information (email, name, password)
  - Change their own password
  - Log out from their session
  - Filter and search their own todos

**EARS Rule 5.5: User Operation Permissions - Denied**
- AUTHENTICATED REGULAR USERS CANNOT perform the following operations:
  - View other users' todos (even if they know the ID)
  - Modify other users' todos
  - Delete other users' todos
  - Access admin dashboard or features
  - View system statistics or aggregate data
  - Manage other user accounts
  - Access audit logs
  - Perform administrative operations

**EARS Rule 5.6: Permission Enforcement**
- BEFORE processing any user-initiated operation, THE system SHALL verify the user has the required permission.
- WHEN a user attempts an operation they don't have permission for, THE system SHALL return HTTP 403 Forbidden with appropriate error message.
- THE system SHALL log all permission denial attempts for security purposes.

### 5.3 Permission Constraints for Admin Users

**EARS Rule 5.7: Admin Operation Permissions - Allowed**
- ADMIN USERS CAN perform all regular user operations (manage their own todos).
- ADMIN USERS CAN ALSO perform the following admin-specific operations:
  - View list of all user accounts
  - View detailed information about any user account
  - View system-wide statistics and metrics
  - Delete user accounts
  - Access system audit logs and activity records
  - View all todos in the system (read-only)
  - Perform system maintenance operations

**EARS Rule 5.8: Admin Operation Permissions - Denied**
- ADMIN USERS CANNOT modify other users' todos directly.
- ADMIN USERS CANNOT delete individual todos on behalf of users (only via user account deletion which cascades).
- ADMIN USERS CANNOT change other users' passwords (they can reset accounts if needed).

**EARS Rule 5.9: Admin Action Logging & Audit**
- WHEN an admin performs sensitive operations (user deletion, account status change, viewing user data), THE system SHALL log these actions with:
  - Timestamp (UTC)
  - Admin user ID performing the action
  - Action type (e.g., "DELETE_USER", "VIEW_USER_DATA")
  - Target resource ID or affected user
  - Success or failure status
- THE system SHALL maintain immutable audit logs for all admin actions.

---

## 6. Input Validation & Constraint Matrix

| Field | Required | Format/Values | Constraints | Error Message |
|-------|----------|--------------|-------------|----------------|
| Todo Title | Yes | String | Max 255 chars, non-empty | "Todo title cannot be empty" or "Title exceeds 255 characters" |
| Todo Description | No | String | Max 2000 chars | "Description exceeds 2000 characters" |
| Due Date | No | YYYY-MM-DD | Not in past | "Due date cannot be in the past" |
| Priority | No | low/medium/high | One of three values | "Priority must be low, medium, or high" |
| Status | Yes* | active/completed | One of two values | "Invalid status value" |
| Email | Yes | user@domain.ext | Unique, valid format | "Invalid email" or "Email already registered" |
| Password | Yes | String | Min 8 chars, max 256 | "Password must be at least 8 characters" |
| User ID | Yes* | UUID | Existing user | N/A (system-generated) |
| Todo ID | Yes* | UUID | Unique | N/A (system-generated) |

---

## 7. Complete Business Rules Summary Matrix

| Rule ID | Rule Type | Rule Description | Applies To | Enforcement | Severity |
|---------|-----------|-----------------|-----------|--------------|----------|
| 1.1 | Validation | Title must be provided and non-empty | Todo Creation | Required | Critical |
| 1.2 | Validation | Title max 255 characters | Todo Creation/Update | Required | Critical |
| 1.3 | Validation | Title allows specific characters | Todo Creation/Update | Required | High |
| 1.4 | Validation | Trim title whitespace | Todo Creation/Update | Required | Medium |
| 1.5 | Validation | Description max 2000 characters | Todo Creation/Update | Optional | Medium |
| 1.6 | Validation | Description format acceptance | Todo Creation/Update | Optional | Low |
| 1.7 | Validation | Due date must be ISO 8601 format | Todo Creation/Update | Optional | High |
| 1.8 | Validation | Due date cannot be in past | Todo Creation/Update | Optional | Critical |
| 1.9 | Validation | Due date is optional | Todo Creation/Update | Optional | Medium |
| 1.10 | Validation | Priority must be low/medium/high | Todo Creation/Update | Optional | High |
| 1.11 | Validation | Priority defaults to medium | Todo Creation | Default | Medium |
| 1.12 | Validation | Priority preserved during status changes | Todo Operations | Required | Medium |
| 1.13 | Validation | Status must be active or completed | Todo Operations | Required | Critical |
| 1.14 | Validation | New todos default to active status | Todo Creation | Default | Critical |
| 1.15 | Validation | Status-timestamp consistency | Todo Update | Required | Critical |
| 1.16 | Validation | Email must be valid format | User Registration | Required | Critical |
| 1.17 | Validation | Email must be unique across system | User Registration/Update | Required | Critical |
| 1.18 | Validation | Email normalized to lowercase | User Registration | Required | High |
| 1.19 | Validation | Password minimum 8 characters | User Registration/Update | Required | Critical |
| 1.20 | Validation | Password must be hashed | User Registration/Update | Required | Critical |
| 2.1 | Business Logic | Todos are user-owned | Todo Creation | Required | Critical |
| 2.2 | Business Logic | Only title required for creation | Todo Creation | Required | High |
| 2.3 | Business Logic | System auto-records creation timestamp | Todo Creation | System | Critical |
| 2.4 | Business Logic | Todos have unique identifiers | Todo Creation | System | Critical |
| 2.5 | Business Logic | User can only modify own todos | Todo Update | Required | Critical |
| 2.6 | Business Logic | Partial updates allowed | Todo Update | Required | High |
| 2.7 | Business Logic | System auto-records modification timestamp | Todo Update | System | Critical |
| 2.8 | Business Logic | Status changes record completion time | Todo Update | System | Critical |
| 2.9 | Business Logic | Creation date is immutable | Todo Operations | Required | Critical |
| 2.10 | Business Logic | User can only delete own todos | Todo Deletion | Required | Critical |
| 2.11 | Business Logic | Deletion is permanent | Todo Deletion | Required | Critical |
| 2.12 | Business Logic | Cascade delete todos when user deleted | User Deletion | Required | Critical |
| 2.13 | Business Logic | Deletion must be confirmed successful | Todo Deletion | Required | High |
| 2.14 | Constraint | Users cannot access other users' todos | All Operations | Required | Critical |
| 2.15 | Constraint | Error handling for unauthorized access | All Operations | Required | High |
| 2.16 | Constraint | Admins can access user data (logged) | Admin Operations | Required | Medium |
| 2.17 | Business Logic | Overdue todo detection | Display Logic | System | Low |
| 2.18 | Business Logic | Future todo identification | Display Logic | System | Low |
| 3.1 | Consistency | Session invalidation on password change | Authentication | Required | Critical |
| 3.2 | Consistency | User record integrity maintained | User Management | Required | Critical |
| 3.3 | Consistency | Account status consistency | User Management | Required | High |
| 3.4 | Consistency | All todos have complete core fields | Data Storage | Required | Critical |
| 3.5 | Consistency | Optional fields consistency | Data Storage | Required | High |
| 3.6 | Consistency | Status-timestamp consistency | Todo Status | Required | Critical |
| 3.7 | Consistency | Each todo has exactly one owner | Data Integrity | Required | Critical |
| 3.8 | Consistency | Modified date >= created date | Data Integrity | System | High |
| 3.9 | Consistency | User reference validation | Referential Integrity | Required | Critical |
| 4.1 | State | Active todos shown in user's list | Todo Status | Required | High |
| 4.2 | State | Completed todos can be modified/reverted | Todo Status | Required | Medium |
| 4.3 | State | Only allowed state transitions | Todo Status | Required | Critical |
| 4.4 | State | No intermediate states | Todo Status | Required | High |
| 4.5 | State | Unauthenticated user access restrictions | Authentication | Required | Critical |
| 4.6 | State | Authenticated user access permissions | Authentication | Required | Critical |
| 4.7 | State | Session expiration (24h or 30min inactivity) | Session Management | Required | Critical |
| 5.1 | Constraint | No artificial todo creation quotas | User Actions | Optional | Low |
| 5.2 | Constraint | Concurrent modifications handled sequentially | System Operations | Required | Critical |
| 5.3 | Constraint | Batch operation limits | System Operations | Optional | Medium |
| 5.4 | Constraint | User permissions for standard operations | Access Control | Required | Critical |
| 5.5 | Constraint | User permissions denied for admin operations | Access Control | Required | Critical |
| 5.6 | Constraint | Permission enforcement on all operations | Access Control | Required | Critical |
| 5.7 | Constraint | Admin permissions for elevated operations | Access Control | Required | Critical |
| 5.8 | Constraint | Admin limitations (cannot modify user todos) | Access Control | Required | Critical |
| 5.9 | Constraint | Admin actions logged for audit trail | Audit | Required | Critical |

---

## 8. Implementation Notes for Developers

### Critical Implementation Requirements

1. **Server-Side Validation Mandatory**: All validation rules MUST be enforced on the backend server. Client-side validation is optional for UX but cannot be the sole validation mechanism.

2. **Data Ownership Verification**: Before ANY operation on a todo item (view, modify, delete), verify the authenticated user owns the todo OR is an admin. This check must occur on every single operation.

3. **Timestamp Management**: Use system timestamps (UTC) for all audit and tracking purposes. Never trust client-provided timestamps. All timestamps must be ISO 8601 format.

4. **State Consistency**: Ensure state transitions are validated and only legal transitions (active ↔ completed) are permitted. Reject invalid transitions.

5. **Cascade Operations**: When a user is deleted, automatically delete all associated todos. Log this cascade operation in audit trail.

6. **Immutable Fields**: Creation dates, todo IDs, and user IDs must never change. Implement database constraints to prevent modifications.

7. **Error Handling**: Provide descriptive error messages that help users correct problems, but don't leak sensitive system information. Use generic messages for authorization failures.

8. **Idempotency**: Where possible, make operations idempotent so repeated requests with same parameters have same result without duplicates.

### Testing Considerations

- Test all validation rules with boundary values (empty, exact limit, over limit)
- Test permission enforcement by attempting operations from unauthorized users
- Test state transitions with invalid transitions (should be rejected)
- Test concurrent modifications to same todo (should be serialized)
- Test cascade deletion when removing user accounts
- Test session expiration and re-authentication flows
- Test data isolation (user cannot access other user's todos)
- Test timestamp consistency (modified >= created, completion only when completed)

### Data Integrity Checks

- Verify no todo has both status "active" AND a populated completion_date
- Verify all todos have exactly one owner
- Verify all emails are unique (case-insensitive)
- Verify all passwords are hashed, never stored plaintext
- Verify modification_date is always >= creation_date

---

## Conclusion

These business rules comprehensively define how the Todo application must behave. Every rule is implementable and testable. Developers should reference this document regularly during implementation to ensure all requirements are met. The rules are organized by category for easy reference and form a complete specification of the system's business logic.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*