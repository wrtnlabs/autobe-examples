# Business Rules and Constraints

## Introduction

This document defines the business rules, validation logic, and operational constraints that govern the Todo list application. These rules ensure data integrity, maintain system performance, protect user data, and enforce the core business logic of todo management.

The rules documented here apply to all system operations and must be enforced by the backend application in all scenarios, including edge cases and error conditions. Every constraint specified here has business justification and enables the system to operate reliably, securely, and predictably.

**Important Note**: This document specifies WHAT business rules and constraints exist and WHY they are necessary. The HOW of implementing these rules (technical architecture, database design, validation frameworks) is entirely at the discretion of the development team.

---

## Data Validation Rules

### Overview of Validation Strategy

THE system SHALL validate all user input before processing any request. THE system SHALL apply validation rules consistently across all operations - whether performed through the frontend UI or directly via API. THE system SHALL provide clear, specific feedback when validation fails, indicating exactly which field failed and why.

### Todo Item Input Validation

#### Title Field Validation

WHEN a user creates or updates a todo, THE system SHALL validate the title field according to these specific rules:

- THE title field is **required** - THE system SHALL NOT accept empty title values
- THE title field **minimum length** is 1 character - THE system SHALL reject titles with zero characters
- THE title field **maximum length** is 255 characters - THE system SHALL reject titles exceeding 255 characters
- THE title field **whitespace handling** - THE system SHALL trim leading and trailing whitespace from the title before validating length
- THE title field **whitespace-only rejection** - IF a title consists only of whitespace characters (spaces, tabs, newlines), THEN THE system SHALL reject the title even after trimming
- THE title field **character content** - THE title MAY contain any Unicode character including letters, numbers, spaces, punctuation, and special characters except for null characters
- THE title field **injection prevention** - THE system SHALL sanitize the title to prevent code injection attacks

WHEN validation fails for the title field, THE system SHALL return error message: **"Title is required and must be between 1 and 255 characters."**

#### Description Field Validation

WHEN a user creates or updates a todo, THE system SHALL validate the description field according to these specific rules:

- THE description field is **optional** - THE system SHALL accept requests that do not include a description
- THE description field **maximum length** is 2000 characters - THE system SHALL reject descriptions exceeding 2000 characters
- THE description field **whitespace handling** - THE system SHALL trim leading and trailing whitespace from descriptions
- THE description field **empty values** - IF a user provides an empty string or whitespace-only string as description, THE system SHALL treat it as null/no description
- THE description field **character content** - THE description MAY contain any Unicode character including letters, numbers, spaces, punctuation, and special characters
- THE description field **injection prevention** - THE system SHALL sanitize the description to prevent code injection attacks

WHEN validation fails for the description field, THE system SHALL return error message: **"Description must not exceed 2000 characters. Current length: [X] characters."**

### User Input Validation

#### Email Address Validation

WHEN a user registers or updates their account, THE system SHALL validate the email address according to these specific rules:

- THE email field is **required** - THE system SHALL NOT accept empty email values
- THE email field **format validation** - THE system SHALL validate that the email follows standard email format: `localpart@domain.extension`
- THE email field **uniqueness** - THE system SHALL verify the email address is not already registered in the system by another account
- THE email field **case handling** - THE system SHALL treat email addresses as case-insensitive for storage and comparison purposes
- THE email field **length constraint** - THE system SHALL enforce that email addresses do not exceed 254 characters (RFC 5321 standard)
- THE email field **special characters** - THE system SHALL reject email addresses containing invalid characters for email format

WHEN validation fails for email format, THE system SHALL return error message: **"Please enter a valid email address (e.g., user@example.com)."**

WHEN validation fails because email is already registered, THE system SHALL return error message: **"This email address is already registered. Please use a different email or log in if you have an existing account."**

#### Password Validation

WHEN a user creates or updates their password, THE system SHALL enforce the following minimum requirements:

- THE password **minimum length** is 8 characters - THE system SHALL reject passwords shorter than 8 characters
- THE password **maximum length** is 128 characters - THE system SHALL reject passwords longer than 128 characters
- THE password **uppercase requirement** - THE password SHALL contain at least one uppercase letter (A-Z)
- THE password **lowercase requirement** - THE password SHALL contain at least one lowercase letter (a-z)
- THE password **numeric requirement** - THE password SHALL contain at least one numeric digit (0-9)
- THE password **special character requirement** - THE password SHALL contain at least one special character from: !@#$%^&*-_=+
- THE password **email exclusion** - THE password SHALL NOT contain the user's email address or username
- THE password **common password rejection** - THE system MAY reject passwords that appear in common password lists (optional enhancement)

WHEN a user submits a password that does not meet requirements, THE system SHALL reject the password and return detailed feedback:

**Error Message Format**: **"Password does not meet requirements. Your password must:"**
- **"- Be at least 8 characters long"** (if too short)
- **"- Contain at least one uppercase letter (A-Z)"** (if missing)
- **"- Contain at least one lowercase letter (a-z)"** (if missing)
- **"- Contain at least one number (0-9)"** (if missing)
- **"- Contain at least one special character (!@#$%^&*-_=+)"** (if missing)

THE system SHALL list only the specific requirements that were not met, making it clear to the user exactly what must be fixed.

### Field Format Requirements

THE system SHALL enforce the following format requirements for all data:

#### Email Format
WHEN storing or retrieving email addresses, THE system SHALL use standard email format validation. THE system SHALL accept emails matching the pattern: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` (simplified RFC 5322 validation).

#### Timestamp Format
WHEN recording any timestamp (creation time, modification time, completion time), THE system SHALL use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.sssZ` in UTC timezone. WHEN displaying timestamps to users, THE system MAY convert to user's local timezone for readability.

#### Unique Identifiers
WHEN assigning unique identifiers to resources (users, todos), THE system SHALL use one of:
- **UUID v4 format**: 36 characters including hyphens (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Sequential integer IDs**: Positive integers (1, 2, 3, ...)

THE choice of ID format is at the development team's discretion, but MUST be applied consistently across all resources.

#### Boolean Values
WHEN storing completion status or other boolean fields, THE system SHALL use a true/false or 0/1 representation. WHEN returning boolean values in API responses, THE system SHALL use JSON boolean format (`true` or `false`).

### Input Sanitization Requirements

WHEN processing any user input, THE system SHALL sanitize the input to prevent injection attacks:

- THE system SHALL remove or escape any characters that could be interpreted as code (HTML, JavaScript, SQL)
- THE system SHALL preserve the intended user content while removing malicious code
- THE system SHALL not corrupt Unicode characters or special characters during sanitization
- THE system SHALL apply sanitization after validation but before storage

---

## Todo Item Constraints

### Title and Content Requirements

#### Title Constraints

WHEN a user creates a todo item, THE system SHALL enforce that:

- THE todo title is **required and non-empty** - THE system SHALL NOT allow todos with empty or whitespace-only titles
- THE todo title **minimum content** is 1 character
- THE todo title **maximum content** is 255 characters
- THE todo title **preservation** - THE system SHALL preserve the title exactly as the user entered it (after trimming and sanitization), including capitalization and punctuation

WHEN a user updates a todo item, THE system SHALL apply the same title constraints as creation. THE system SHALL reject any update that would result in an empty title.

**Business Justification**: The 255-character limit accommodates typical todo descriptions (most todos are 20-100 characters) while preventing excessively long entries that degrade user experience.

#### Description Constraints

WHEN a user creates or updates a todo item, THE system SHALL enforce that:

- THE todo description is **optional** - THE system SHALL accept todos without descriptions
- THE todo description **maximum content** is 2000 characters
- THE todo description **nullable** - IF the user provides an empty string or does not provide a description, THE system SHALL store it as null/empty
- THE todo description **preservation** - THE system SHALL preserve the description exactly as the user entered it (after trimming), including formatting and special characters

**Business Justification**: The 2000-character limit allows for substantial context and notes while maintaining reasonable database efficiency. Users needing more space can create multiple todos or use bullet-pointed descriptions within the 2000-character limit.

### Todo Completion Status Rules

#### Completion Status States

EVERY todo item has exactly one of two completion statuses:

- **"incomplete"** - The todo has not yet been marked as complete; the task is pending
- **"complete"** - The todo has been marked as complete; the task is finished

THE system SHALL NOT allow any other completion status values. THE system SHALL validate that completion status is always one of these two exact values.

#### Default Completion Status

WHEN a user creates a new todo, THE system SHALL automatically set the completion status to **"incomplete"**. THE user cannot override this during creation - all new todos start as incomplete.

#### Completion Timestamp Management

WHEN a user marks a todo as complete, THE system SHALL:
- Change the completion status to **"complete"**
- Set the completion timestamp to the **current UTC date and time**
- Update the todo's last-modified timestamp to the **current UTC date and time**

WHEN a user marks a completed todo as incomplete, THE system SHALL:
- Change the completion status to **"incomplete"**
- **Clear the completion timestamp** to null (set to empty/no value)
- Update the todo's last-modified timestamp to the **current UTC date and time**

WHEN a user marks a todo as complete multiple times (create → complete → incomplete → complete), THE system SHALL update the completion timestamp each time, recording the most recent completion time.

**Business Justification**: Allowing users to toggle completion status enables them to reopen tasks if needed. Recording the most recent completion time provides accurate tracking of when the user actually finished the task.

#### Preventing Status Changes on Deleted Todos

WHEN a user attempts to mark a deleted todo as complete or incomplete, THE system SHALL deny the request and return an appropriate error message (see Error Handling section).

### Todo Item Lifecycle and Deletion

#### Todo Creation

WHEN a user creates a new todo, THE system SHALL:
- Assign a unique Todo ID that has never been used before and will never be reused (even if the todo is later deleted)
- Set the created timestamp to the current UTC date and time
- Set the last-modified timestamp to the current UTC date and time
- Set the completion timestamp to null (empty)
- Associate the todo with the authenticated user who created it
- Set the completion status to incomplete
- Store the todo in persistent storage

AFTER successful creation, THE system SHALL return the newly created todo with all these values to the user.

#### Todo Active Lifecycle

WHILE a todo exists and has not been deleted, the user who owns that todo SHALL be able to:
- **View** the todo (retrieve its information)
- **Edit** the todo (update title or description)
- **Update status** (mark as complete or incomplete)
- **Delete** the todo (permanently remove it)

THE user SHALL NOT be able to change the creation timestamp or the owner of a todo. THE user SHALL NOT be able to directly set the completion timestamp - it updates only via the mark-complete operation.

#### Todo Deletion and Permanence

WHEN a user deletes a todo, THE system SHALL:
- **Immediately remove** the todo from the user's active todo list
- **Permanently delete** the todo from the database
- **Prevent recovery** - THE deleted todo cannot be recovered or accessed by any means
- **Log the deletion** in audit logs (for admin review if needed)

THE system SHALL NOT implement a "trash" or "archive" feature for minimum viable functionality. Deletion is immediate and permanent.

**Business Justification**: Permanent deletion keeps the system simple. A trash feature can be added in future versions if user demand warrants it.

#### Soft Delete Option (Future Enhancement)

*Note: The following is a placeholder for potential future implementation and is NOT part of minimum viable functionality.*

IF the system is enhanced to support account deletion or data archival, THE system MAY implement soft deletion (marking as deleted but retaining data) instead of permanent deletion. IF soft deletion is implemented:
- THEN THE system SHALL retain soft-deleted todos for 30 days
- THEN THE system SHALL permanently delete todos after 30 days
- THEN THE system SHALL prevent users from accessing soft-deleted todos while they await permanent deletion

### Editing Windows and Modification Permissions

#### Editing Permissions

WHEN a user attempts to edit a todo, THE system SHALL verify that:
- The user is authenticated
- The user owns the todo (user ID matches the todo's owner)
- The todo has not been deleted

IF all verifications pass, THE system SHALL allow the edit. IF any verification fails, THE system SHALL deny the edit with an appropriate error message.

#### Modifiable Fields

THE following todo fields MAY be edited by the owner at any time:
- **Title** - THE system SHALL allow updating the title, applying the same validation rules as creation
- **Description** - THE system SHALL allow updating the description, applying the same validation rules as creation

THE following todo fields SHALL NOT be directly edited by users:
- **Todo ID** - Immutable, assigned at creation
- **Owner User ID** - Immutable, assigned at creation, cannot be transferred
- **Created timestamp** - Immutable, recorded at creation
- **Completion timestamp** - Managed by mark-complete operation, not directly editable
- **Completion status** - Updated only through the dedicated mark-complete/mark-incomplete operation, not editable as a direct field

#### Timestamp Updates on Edit

WHEN a user updates a todo (changes title or description), THE system SHALL:
- Update the **last-modified timestamp** to the current UTC date and time
- **Preserve the created timestamp** unchanged
- **Preserve the completion status** unchanged (unless the user is marking complete/incomplete)
- **Preserve the completion timestamp** unchanged (unless the user is marking complete/incomplete)

WHEN a user marks a todo as complete or incomplete, THE system SHALL:
- Update the **last-modified timestamp** to the current UTC date and time
- Update the **completion status** appropriately
- Update the **completion timestamp** (set if marking complete, clear if marking incomplete)
- **Preserve the title, description, and creation timestamp** unchanged

**Business Justification**: Tracking modification times enables sorting/filtering by recently updated todos and provides audit trail information. Preserving creation times and original content enables users to understand their task history.

#### Unlimited Edits

THE system SHALL allow users to edit a todo item an unlimited number of times. THE system SHALL not impose any limit on how many times a single todo can be updated.

---

## User Account Rules

### User Identification and Uniqueness

#### Email as Unique Identifier

EACH user account SHALL be uniquely identified by email address. THE system SHALL enforce that:
- No two user accounts can exist with the same email address
- Email addresses are treated as case-insensitive for uniqueness checking (user@example.com and User@Example.com are the same account)
- WHEN a user registers with an email address, THE system SHALL verify the email is not already in use
- IF an email is already registered, THE system SHALL reject registration and display appropriate error message

#### Unique User ID Assignment

IN addition to email uniqueness, EACH user account SHALL be assigned a unique **User ID** upon creation. THE system SHALL:
- Generate a unique User ID that has never been used and will never be reused
- Use this User ID as the internal identifier for all system operations
- Link all of the user's todos to their User ID for ownership tracking
- Never change a user's User ID for the lifetime of their account

THE User ID format (UUID, sequential integer, or other) is at the development team's discretion, but SHALL be unique and immutable.

#### Username vs Email

FOR minimum viable functionality, THE system uses **email address** as the login identifier and user identifier. THE system SHALL NOT implement a separate "username" field.

### User Data Ownership

#### Fundamental Ownership Rule

EVERY piece of user data (account information, todos, settings) SHALL be owned by exactly one user. THE system SHALL enforce that:
- Each user can only access and modify their own data
- Users CANNOT access other users' data under any circumstances
- Users CANNOT transfer ownership of their data to other users
- Admins may view user data for support purposes, but cannot modify user todos

#### Owner Verification

BEFORE processing any request that accesses user data, THE system SHALL:
1. Verify the request is from an authenticated user
2. Verify the authenticated user owns the requested resource
3. IF ownership verification fails, THE system SHALL deny the request with HTTP 403 Forbidden

THE system SHALL perform this verification on EVERY request, without exception, before returning any data.

### Account Status and States

#### Account Status Values

EACH user account can be in one of the following states:

| Status | Meaning | Login Allowed? | Data Accessible? | Can Create Todos? |
|--------|---------|---------------|-------------------|------------------|
| **Active** | Normal, functioning account | ✅ Yes | ✅ Yes | ✅ Yes |
| **Inactive** | Account disabled but data preserved | ❌ No | ❌ No (on login) | ❌ No |
| **Suspended** | Account temporarily disabled for policy/security reason | ❌ No | ❌ No (on login) | ❌ No |
| **Pending Deletion** | Account marked for deletion, awaiting 30-day window | ❌ No | Partially | ❌ No |
| **Deleted** | Account permanently removed (soft delete) | ❌ No | ❌ No | ❌ No |

#### Default Status for New Accounts

WHEN a user successfully registers a new account, THE account status SHALL be automatically set to **"Active"**. THE user can immediately log in and begin creating todos.

#### Status Transitions

THE following status transitions are allowed:

```
Active ←→ Inactive (by admin)
Active ←→ Suspended (by admin)
Active → Pending Deletion (by user request or admin action)
Pending Deletion → Active (if user recovers account within 30 days)
Pending Deletion → Deleted (after 30 days automatically)
```

NO other transitions are permitted. For example:
- An Inactive account CANNOT transition directly to Suspended
- A Deleted account CANNOT be reactivated
- A Suspended account CANNOT transition directly to Deleted

#### Login and Inactive Status

WHEN an Inactive user attempts to log in, THE system SHALL:
- Reject the login attempt
- Display message: **"Your account is currently inactive. Please contact support to reactivate your account."**
- NOT reveal whether the email is registered (for security)

#### Login and Suspended Status

WHEN a Suspended user attempts to log in, THE system SHALL:
- Reject the login attempt
- Display message: **"Your account has been suspended. Please contact support for more information."**
- Log the login attempt in audit logs for security review

---

## Business Logic Rules

### Todo Ownership and Ownership Transfer Prevention

#### Ownership Requirement

EVERY todo item MUST have exactly one owner - THE user who created it. THE system SHALL:
- Automatically assign ownership to the creating user when a todo is created
- Enforce that only the owner can view, edit, or delete the todo
- Prevent ownership transfer between users (no operation can change the owner)
- Prevent orphaned todos (todos without an owner)

#### Prevention of Unauthorized Access

WHEN a user attempts to access a todo, THE system SHALL verify ownership. IF the requesting user is not the owner, THE system SHALL:
- Deny the request
- Return HTTP 403 Forbidden status
- NOT reveal whether the todo exists (to prevent user enumeration attacks)
- Display message: **"You don't have permission to access this todo."**
- Log the unauthorized access attempt in audit logs

**Business Justification**: Preventing ownership transfer keeps data isolation simple and prevents users from losing track of their data or experiencing surprise transfers. Secure denial messages prevent attackers from discovering which todos exist.

### Timestamp Management

#### Creation Timestamp

WHEN a todo is created, THE system SHALL record the creation timestamp:
- **Immutable** - THE creation timestamp never changes for the life of the todo
- **Set automatically** - THE system sets this value; users cannot specify it
- **Server time** - THE system uses server-side time (UTC), not client-provided time
- **Format** - ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.sssZ`

THE creation timestamp indicates when the user first created the task and serves as a permanent record of task age.

#### Last Modified Timestamp

WHEN a todo is created, THE system SHALL initialize the last-modified timestamp to the same value as the creation timestamp.

WHENEVER a todo is modified (title, description, or completion status changes), THE system SHALL update the last-modified timestamp to the current UTC date and time.

THE last-modified timestamp indicates when the todo was most recently changed and enables users to sort by recently updated todos.

#### Completion Timestamp

WHEN a todo is created, THE system SHALL initialize the completion timestamp to **null** (empty/no value).

WHEN a user marks a todo as complete, THE system SHALL set the completion timestamp to the current UTC date and time.

WHEN a user marks a completed todo back as incomplete, THE system SHALL clear the completion timestamp, setting it to **null** (empty/no value).

WHEN a user marks a todo as complete multiple times, THE system SHALL update the completion timestamp each time, recording the most recent completion.

THE completion timestamp indicates when the user actually finished the task and enables tracking of task completion dates.

#### Timestamp Consistency

ACROSS the entire system, THE system SHALL:
- Use UTC (Coordinated Universal Time) for all internal timestamp storage
- Use ISO 8601 format (`YYYY-MM-DDTHH:MM:SS.sssZ`) for all timestamp representation
- Convert to user's local timezone only for display purposes
- Never store timestamps in local time or ambiguous formats
- Maintain timestamp accuracy to at least second precision

**Business Justification**: Using UTC and ISO 8601 format ensures timestamps are unambiguous and comparable across timezones and system boundaries. Users see times in their local timezone for convenience, but underlying data remains consistent.

### Default Values for New Todos

WHEN a user creates a new todo, THE system SHALL initialize the following values automatically:

| Field | Default Value | User Override? |
|-------|---------------|----------------|
| **Completion Status** | `"incomplete"` | ❌ No (always starts incomplete) |
| **Title** | *User-provided value* | ✅ Yes (required, user provides) |
| **Description** | *User-provided value (optional)* | ✅ Yes (optional) |
| **Created Timestamp** | Current UTC date/time | ❌ No (system-managed) |
| **Last Modified Timestamp** | Current UTC date/time | ❌ No (system-managed) |
| **Completion Timestamp** | `null` (empty) | ❌ No (set only by mark-complete) |
| **Owner User ID** | Authenticated user's ID | ❌ No (always authenticated user) |
| **Todo ID** | Auto-generated unique ID | ❌ No (system-managed) |

THE system SHALL NOT allow users to override the default values for system-managed fields.

### Batch Operations and Atomicity

#### Multiple Operations in Single Request

WHERE supported, WHEN a user performs multiple operations in a single request (e.g., marking multiple todos complete), THE system SHALL:
- Process each operation independently and atomically
- Either fully complete each operation or fully fail it (no partial updates)
- Return status for each operation indicating success or failure
- NOT create inconsistent state if one operation fails

#### Transaction Management

WHEN multiple database operations are involved in a user's request, THE system SHALL:
- Execute all operations as a transaction
- Ensure all operations complete successfully, or all are rolled back
- Prevent partial updates that leave data in inconsistent state
- Log any transaction failures for debugging

---

## Data Ownership and Privacy

### Complete Data Isolation

#### User-Specific Data Access

WHEN a user requests their todo list, THE system SHALL:
- Retrieve ONLY todos owned by that user
- Return todos in consistent order (by default: newest first by creation date)
- Include complete information for each todo
- Never return todos owned by any other user

WHEN a user requests a specific todo by ID, THE system SHALL:
- Verify the todo exists
- Verify the requesting user owns that todo
- IF verified, return the todo information
- IF not verified, return HTTP 403 Forbidden without revealing whether todo exists

#### Filtering at Database Level

THE data isolation requirement SHALL be enforced at the database query level, not just in application code. EVERY database query that retrieves user data SHALL:
- Include a filter clause restricting results to the authenticated user
- Use the User ID from the authenticated session/JWT token
- Return empty results rather than error if user has no matching data

EXAMPLE: A query to retrieve todos SHALL include `WHERE user_id = :authenticated_user_id` at the database level.

**Business Justification**: Database-level filtering prevents data leakage due to application code errors and provides defense-in-depth security.

### Cross-User Data Protection

#### No User-to-User Data Access

THE system SHALL ensure that NO operation allows one user to access another user's data. Specifically:

- User A CANNOT view user B's todos
- User A CANNOT modify user B's todos
- User A CANNOT delete user B's todos
- User A CANNOT view user B's account information (email, registration date, etc.)
- User A CANNOT see whether user B has an account or not

THE only exception is admins, who may view user information for administrative purposes (see Admin Features document).

#### Email Address Privacy

WHEN user information is displayed in API responses or logs, THE system SHALL NOT expose other users' email addresses. Email addresses SHALL be visible only to:
- The user who owns the account
- Admins viewing user details for administrative purposes

#### Todo List Privacy

EACH user's todo list is completely private. THE system SHALL NOT:
- Display one user's todos to another user
- Show counts or statistics about one user's todos to another user
- Reveal existence of specific todos through error messages or response codes
- Allow searching or filtering across other users' todos

### Admin Access Exceptions

WHEN an admin user accesses system features, THE system SHALL allow:
- Viewing all user accounts and basic information
- Viewing detailed user data for support purposes
- Viewing audit logs showing user activity
- Resetting user passwords on behalf of users

HOWEVER, THE system SHALL NOT allow admins to:
- View or modify user todos (admins may view read-only for troubleshooting, but cannot edit)
- Transfer data between users
- Permanently delete user data without explicit authorization and audit trail

**Business Justification**: Admins need visibility into system operation for support, but cannot modify user data to maintain user trust and data integrity.

---

## Operational Constraints

### Maximum Todos Per User

#### Hard Limit on Todo Count

EACH user SHALL be able to create a maximum of **10,000 todo items**. THE system SHALL enforce this limit by:
- Tracking the count of todos for each user
- Rejecting any attempt to create a todo that would exceed the limit
- Providing clear error message when limit is reached

WHEN a user approaches the limit, THE system MAY display warning when user has 9,000+ todos:
**"You have [X] todos. You can create up to 10,000 todos per account."**

WHEN a user reaches the limit, THE system SHALL display error message:
**"You have reached the maximum number of todos (10,000). Please delete some todos before creating new ones."**

#### Justification for Limit

THE 10,000 todo limit ensures:
- System performance remains acceptable even for power users
- Database queries don't become unwieldy for very large lists
- User experience doesn't degrade with massive todo lists
- Users with 10,000+ items likely need a more complex project management tool

**Business Justification**: 10,000 todos represents approximately 8-10 years of active daily task creation. Most users will never approach this limit.

#### Recovery from Limit

IF a user reaches the limit, they can:
- Delete some todos to reduce count below limit
- Create new todos after deleting existing ones
- Export or archive their todos (if future features implemented)

### Pagination and List Retrieval

#### Default Page Size

WHEN a user retrieves their todo list, THE system SHALL return results in pages by default:
- **Default page size**: 20 todos per page
- **Customizable page size**: Allow user to request different page sizes (minimum 1, maximum 100 items per page)
- **Pagination format**: Return results with page number, total count, and navigation links

#### Example Pagination Response

THE system SHALL return pagination information like:
```
{
  "todos": [...],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalCount": 157,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Sorting Options

THE system SHALL support sorting todo lists by:
- **Creation date** (ascending or descending) - default is descending (newest first)
- **Modification date** (ascending or descending)
- **Completion status** (incomplete first, then completed)
- **Title** (alphabetical ascending or descending)

THE default sort order SHALL be creation date descending (newest first).

#### Search and Filtering

WHERE search functionality is provided, THE system SHALL:
- Search todo titles and descriptions for keywords
- Return matching results paginated
- Complete search within 2 seconds for typical list sizes
- Support filtering by completion status (all, incomplete only, completed only)

### Concurrent Operation Handling

#### Optimistic Locking Strategy

WHEN multiple requests attempt to modify the same todo simultaneously, THE system SHALL use optimistic locking:
- Assign a version number to each todo
- When updating, verify the version hasn't changed since the user loaded it
- IF version has changed (someone else modified it), reject the update with HTTP 409 Conflict
- Return error message: **"This todo was modified by another request. Please refresh to see the latest changes and try again."**

EXAMPLE: User A loads todo (version 2), User B loads same todo (version 2). User B updates title (todo becomes version 3). User A attempts update with stale version 2 → rejected.

**Business Justification**: Optimistic locking prevents silent data loss when concurrent edits occur. Users are notified and can retry with fresh data.

#### Concurrent Reads

THE system SHALL allow unlimited concurrent read operations. Multiple users can view their own todos simultaneously without conflict.

#### Concurrent Deletions

WHEN a user deletes a todo while another request is attempting to update it:
- THE delete operation succeeds first, removing the todo
- THE update operation receives HTTP 404 Not Found (todo no longer exists)
- Error message: **"This todo has been deleted. Your changes could not be saved."**

### Batch Operation Limits

#### Batch Deletion Limit

WHEN a user deletes multiple todos in a single batch request, THE system SHALL enforce:
- Maximum 100 todos can be deleted in a single batch request
- IF user attempts to delete more than 100, THE system SHALL reject the batch
- Error message: **"You can delete a maximum of 100 todos per request. Please batch your deletions."**

#### Batch Completion Limit

WHEN a user marks multiple todos complete in a single batch request, THE system SHALL enforce:
- Maximum 100 todos can be marked complete in a single batch request
- IF user attempts to mark more than 100 complete, THE system SHALL reject the batch
- Error message: **"You can update a maximum of 100 todos per request."**

#### Batch Creation Limit

WHEN a user creates multiple todos in a single batch request (if supported), THE system SHALL enforce:
- Maximum 50 todos can be created in a single batch request
- IF user attempts to create more than 50, THE system SHALL reject the batch
- Error message: **"You can create a maximum of 50 todos per request."**

**Business Justification**: Batch limits prevent users from overwhelming the system with single requests. These limits are high enough for legitimate bulk operations but prevent abuse.

---

## Rate Limiting and Performance Considerations

### API Request Rate Limiting

#### Per-User Rate Limit

WHILE a user makes API requests, THE system SHALL enforce rate limiting:
- **Maximum requests per minute**: 100 requests per authenticated user per minute
- **Rate limit window**: Rolling 60-second window
- **Counting method**: Count all API requests including reads, writes, and deletes

WHEN a user exceeds 100 requests per minute, THE system SHALL:
- Return HTTP 429 Too Many Requests status
- Include `Retry-After` header indicating seconds until next request allowed
- Display error message: **"You're making too many requests. Please wait before making another request."**
- Continue tracking requests to determine when limit resets

#### Per-IP Rate Limit for Authentication

FOR authentication endpoints specifically (login, registration, password reset), THE system SHALL enforce stricter rate limiting:
- **Maximum requests per IP address**: 10 requests per 15-minute window
- **Scope**: Per-IP address (not per user, since user isn't authenticated yet)
- **Purpose**: Prevent brute-force attacks on authentication

WHEN an IP address exceeds 10 authentication attempts in 15 minutes, THE system SHALL:
- Temporarily reject further authentication requests from that IP
- Return HTTP 429 Too Many Requests status
- Display message: **"Too many login attempts from your location. Please try again in 15 minutes."**
- Log the rate limit violation for security review

**Business Justification**: Per-user rate limiting prevents API abuse while allowing normal usage. Per-IP authentication limiting prevents automated attacks.

### Throttling for Expensive Operations

#### Data Export Throttling

WHEN a user exports their todos (if implemented), THE system SHALL limit exports:
- **Maximum exports per hour**: 10 per user per hour
- **Purpose**: Prevent users from repeatedly exporting large datasets

IF limit exceeded, error message: **"You can export your data maximum 10 times per hour. Please wait before exporting again."**

#### Bulk Operation Throttling

WHEN a user performs bulk operations (batch create, batch delete, batch update), THE system SHALL:
- Process operations sequentially, not in parallel
- Add slight delays between operations to prevent database overload
- Never process more than 50 operations concurrently from a single user

### Response Time Expectations

#### Single Record Operations

THE system SHALL maintain the following response times for individual todo operations:

| Operation | Response Time SLA | Measurement |
|-----------|------------------|-------------|
| **Create Todo** | < 500 ms | Time from request receipt to response return |
| **Retrieve Todo** | < 300 ms | Time to fetch and return single todo |
| **Update Todo** | < 500 ms | Time to update and return modified todo |
| **Delete Todo** | < 500 ms | Time to delete and return confirmation |
| **Mark Complete** | < 300 ms | Time to toggle completion status |

#### List Operations

| Operation | Response Time SLA | Conditions |
|-----------|------------------|------------|
| **Retrieve Todo List** | < 1000 ms | For first 20 todos (one page) |
| **Search Todos** | < 800 ms | Search in 500-todo list |
| **Filter Todos** | < 500 ms | Filter existing list view |
| **Sort Todo List** | < 500 ms | Re-sort displayed list |

#### Authentication Operations

| Operation | Response Time SLA | Measurement |
|-----------|------------------|-------------|
| **User Login** | < 1500 ms | Credential verification + token generation |
| **User Registration** | < 2000 ms | Input validation + account creation |
| **Password Reset** | < 2000 ms | Token generation + email sending |

**Note**: Response time SLAs are targets, not guarantees. System may exceed these times under extreme load, but should regularly achieve these times during normal operation.

### Data Handling Capacity

#### Typical Per-User Storage

FOR typical user with 500 todos, assuming average 500 bytes per todo item:
- **Todo data storage**: 250 KB
- **Metadata and overhead**: 50 KB
- **Total per-user storage**: ~300 KB

FOR user database infrastructure planning:
- **Per-active-user storage**: ~1 MB (including user account, settings, indexes, redundancy)
- **Expected user count for 1 GB storage**: ~1,000 active users

**Business Justification**: These storage estimates help with infrastructure planning and cost calculation.

#### System Capacity Planning

THE system development team SHALL plan for:
- **Minimum concurrent users**: 10 simultaneous authenticated users
- **Peak load target**: 50 concurrent authenticated users
- **Expected data growth**: Plan for 2-3x growth in first year

IF the system is anticipated to exceed these numbers:
- Implement horizontal scaling (multiple server instances)
- Implement database replication or partitioning
- Implement caching layers for frequently accessed data

---

## Validation Error Responses

### Error Response Format

WHEN validation fails, THE system SHALL return HTTP 400 Bad Request status with error details including:
- **HTTP Status Code**: 400 (Bad Request)
- **Error Code**: Specific machine-readable error code (e.g., "VALIDATION_ERROR", "INVALID_INPUT")
- **Error Message**: User-friendly description of what failed
- **Field Name**: Which field failed validation (if applicable)
- **Constraint Details**: What constraint was violated (e.g., "maximum length: 255 characters")

### Specific Validation Error Scenarios

#### Empty Title Error

WHEN a user submits a todo with empty or whitespace-only title:

```
HTTP 400 Bad Request
{
  "errorCode": "INVALID_TITLE",
  "errorMessage": "Title is required. Please enter a task description.",
  "field": "title",
  "constraint": "required, minimum 1 character"
}
```

#### Title Too Long Error

WHEN a user submits a todo with title exceeding 255 characters:

```
HTTP 400 Bad Request
{
  "errorCode": "TITLE_TOO_LONG",
  "errorMessage": "Title is too long. Please keep it under 255 characters. (Current: 287 characters)",
  "field": "title",
  "constraint": "maximum 255 characters",
  "currentLength": 287,
  "maximumLength": 255
}
```

#### Description Too Long Error

WHEN a user submits a description exceeding 2000 characters:

```
HTTP 400 Bad Request
{
  "errorCode": "DESCRIPTION_TOO_LONG",
  "errorMessage": "Description is too long. Please keep it under 2000 characters. (Current: 2150 characters)",
  "field": "description",
  "constraint": "maximum 2000 characters",
  "currentLength": 2150,
  "maximumLength": 2000
}
```

#### Invalid Email Error

WHEN a user submits an invalid email format:

```
HTTP 400 Bad Request
{
  "errorCode": "INVALID_EMAIL",
  "errorMessage": "Please enter a valid email address (e.g., user@example.com).",
  "field": "email",
  "constraint": "valid email format"
}
```

#### Email Already Registered Error

WHEN a user attempts to register with an email already in use:

```
HTTP 400 Bad Request
{
  "errorCode": "EMAIL_ALREADY_REGISTERED",
  "errorMessage": "This email address is already registered. Please log in if you have an existing account or use a different email.",
  "field": "email",
  "constraint": "unique email address"
}
```

#### Weak Password Error

WHEN a user submits a password that doesn't meet requirements:

```
HTTP 400 Bad Request
{
  "errorCode": "PASSWORD_TOO_WEAK",
  "errorMessage": "Password does not meet requirements. Your password must:",
  "requirements": [
    "- Be at least 8 characters long",
    "- Contain at least one uppercase letter (A-Z)",
    "- Contain at least one lowercase letter (a-z)",
    "- Contain at least one number (0-9)",
    "- Contain at least one special character (!@#$%^&*-_=+)"
  ]
}
```

---

## Business Rule Violation Handling

### Ownership Violation

WHEN a user attempts to access or modify a todo they don't own:

```
HTTP 403 Forbidden
{
  "errorCode": "ACCESS_DENIED",
  "errorMessage": "You don't have permission to access this todo.",
  "reason": "insufficient_permissions"
}
```

### Todo Not Found After Ownership Check

WHEN a user requests a todo that doesn't exist or was deleted:

```
HTTP 404 Not Found
{
  "errorCode": "TODO_NOT_FOUND",
  "errorMessage": "The todo you're looking for does not exist or has been deleted.",
  "reason": "resource_not_found"
}
```

### Concurrent Update Conflict

WHEN a user attempts to update a todo that has been modified by another request:

```
HTTP 409 Conflict
{
  "errorCode": "CONCURRENT_MODIFICATION",
  "errorMessage": "This todo was modified by another request. Please refresh to see the latest changes and try again.",
  "reason": "version_mismatch",
  "currentVersion": 3,
  "submittedVersion": 2
}
```

### Maximum Todos Reached

WHEN a user attempts to create a todo after reaching the 10,000-todo limit:

```
HTTP 400 Bad Request
{
  "errorCode": "TODO_LIMIT_EXCEEDED",
  "errorMessage": "You have reached the maximum number of todos (10,000). Please delete some todos before creating new ones.",
  "currentCount": 10000,
  "maximumAllowed": 10000
}
```

### Rate Limit Exceeded

WHEN a user exceeds their API rate limit:

```
HTTP 429 Too Many Requests
{
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "errorMessage": "You're making too many requests. Please wait before making another request.",
  "retryAfter": 15,
  "requestsUsed": 100,
  "requestLimit": 100,
  "windowSizeSeconds": 60
}
```

### General Data Violation

WHEN a user attempts a prohibited operation:

```
HTTP 403 Forbidden
{
  "errorCode": "OPERATION_NOT_ALLOWED",
  "errorMessage": "This operation is not allowed. Please check your request and try again.",
  "reason": "business_rule_violation"
}
```

---

## Summary of Core Constraints

This table provides a quick reference for all major business constraints in the system:

| Constraint | Value | Purpose |
|-----------|-------|---------|
| **Todo Title Min Length** | 1 character | Allow concise task names |
| **Todo Title Max Length** | 255 characters | Prevent excessively long entries |
| **Todo Description Max** | 2,000 characters | Allow substantial context/notes |
| **Password Min Length** | 8 characters | Security requirement |
| **Password Max Length** | 128 characters | Practical limit |
| **Email Max Length** | 254 characters | RFC 5321 compliance |
| **Todos Per User Limit** | 10,000 | Prevent system overload |
| **API Requests Per Minute** | 100 per user | Prevent abuse |
| **Auth Attempts Per 15min** | 10 per IP address | Prevent brute force |
| **Batch Delete Max** | 100 items | Prevent huge operations |
| **Batch Create Max** | 50 items | Prevent huge operations |
| **Default Page Size** | 20 items | Reasonable list display |
| **Max Page Size** | 100 items | Prevent huge exports |
| **Session Timeout** | 30 minutes | Balance security/convenience |
| **Refresh Token Duration** | 7 days | Long-lived access |
| **Access Token Duration** | 15-30 minutes | Short-lived security |
| **Password Hash Cost** | ≥ 12 (bcrypt) | Security strength |

---

## Conclusion

These business rules and constraints form the operational backbone of the Todo list application. They ensure:

- **Data Integrity**: Validation rules maintain data quality throughout the system
- **Security**: Ownership and permission rules prevent unauthorized access
- **Performance**: Operational limits and rate limiting prevent system overload
- **User Experience**: Error messages and constraints guide users toward successful operations
- **Scalability**: Capacity constraints enable predictable system growth

EVERY constraint documented here has been designed with consideration for user needs, system reliability, and business objectives. The development team should implement these constraints consistently across all application components.

---

> *Developer Note: This document specifies WHAT business rules and constraints must be enforced and WHY. The HOW of technical implementation (frameworks, validation libraries, database design, monitoring tools) remains entirely at the discretion of the development team.*