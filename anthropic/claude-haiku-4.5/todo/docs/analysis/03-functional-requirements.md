# Functional Requirements for Todo List Application

## Functional Requirements Overview

The Todo List Application is a minimal, focused productivity tool that allows users to create, manage, and organize their personal tasks. This document specifies all functional capabilities that the system must provide, focusing exclusively on the minimum viable feature set required for a working todo management application.

The application supports two primary user journeys: users must first register and authenticate to access the system, then they can perform complete lifecycle management of their todos. All todos belong exclusively to the authenticated user who created them, ensuring data privacy and isolation.

This document uses the EARS (Easy Approach to Requirements Syntax) format to specify requirements with precision, removing ambiguity for the development team. Each requirement clearly specifies conditions (WHEN), actions (THE system SHALL), and outcomes, making them directly implementable and testable.

## User Registration and Authentication Functions

### User Registration Requirements

**WHEN** a guest user accesses the application and chooses to create an account, **THE** system **SHALL** allow them to register with the following required information:
- Email address (must be unique, must follow valid email format with local@domain.extension pattern)
- Password (minimum 8 characters, must include at least one uppercase letter and at least one lowercase letter)
- Display name or username (required, between 2-50 characters)

**WHEN** a new user submits registration data, **THE** system **SHALL** validate all fields before creating the account. **IF** validation fails, **THEN** **THE** system **SHALL** return specific error messages identifying which fields failed validation and why (e.g., "Email must be valid", "Password must contain uppercase letter", "Username must be 2-50 characters").

**WHEN** the email address provided during registration already exists in the system, **THE** system **SHALL** reject the registration with an error indicating the email is already in use.

**WHEN** registration validation passes successfully, **THE** system **SHALL** hash the password using a secure algorithm (bcrypt or equivalent) before storing it in the database, ensuring passwords are never stored in plain text.

**WHEN** a new user account is successfully created, **THE** system **SHALL** automatically authenticate the user and provide them with a valid JWT token, allowing them to proceed directly to viewing their (empty) todo list without requiring a separate login step.

**WHEN** registration completes, **THE** system **SHALL** return the user's profile information (ID, email, username, creation timestamp) along with the authentication token.

### User Login Requirements

**WHEN** a registered user provides their email address and password at the login endpoint, **THE** system **SHALL** validate the credentials against stored user data. **THE** system **SHALL** complete this validation within 2 seconds for optimal user experience.

**WHEN** the email address provided is not found in the system database, **THEN** **THE** system **SHALL** return an error message stating "Invalid email or password" (generic message for security, without revealing whether the email exists).

**WHEN** the email address exists but the provided password does not match the securely stored password hash, **THEN** **THE** system **SHALL** return the same generic error message "Invalid email or password" to prevent account enumeration attacks.

**WHEN** credentials are valid and match a user account, **THE** system **SHALL** generate a new JWT token containing the user's ID and email as claims, set an appropriate expiration time (recommended 24 hours or configurable), and return the token to the user.

**WHEN** a user logs in successfully, **THE** system **SHALL** return the token and user profile information. The user can then use this token for all subsequent authenticated requests.

**THE** system **SHALL** support case-insensitive email addresses for login (user@Example.com and user@example.com are treated as the same account).

### User Logout Requirements

**WHEN** an authenticated user chooses to log out, **THE** system **SHALL** invalidate the user's current session. The system **MAY** maintain a token blacklist or rely on the client to discard the token.

**WHEN** a user logs out, **THE** system **SHALL** return a success confirmation. The user must log in again using valid credentials to obtain a new token.

**WHEN** a user attempts to use an old token after logging out, **THE** system **SHALL** reject the request with an authentication error, requiring the user to log in again.

### Authentication Token Management

**EVERY** authenticated request to the system **SHALL** include a valid JWT token in the Authorization header (format: "Bearer <token>").

**WHEN** a request includes an invalid, expired, or missing JWT token, **THE** system **SHALL** reject the request with an authentication error (HTTP 401 Unauthorized).

**THE** system **SHALL** extract the user ID from the JWT token and use this to identify the current user for all data access operations, ensuring proper data isolation.

**THE** system **SHALL** validate the JWT token signature to ensure it has not been tampered with and was issued by the system.

## Todo Creation Requirements

### Create New Todo

**WHEN** an authenticated user chooses to create a new todo, **THE** system **SHALL** accept the following information:
- Title (required, 1-200 characters, non-empty after trimming whitespace)
- Description (optional, 0-1000 characters, can be null or empty string)
- Due date (optional, must be a valid ISO 8601 date format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ if provided)
- Priority level (optional, must be one of exactly: "low", "medium", "high", defaults to "medium" if not provided)

**WHEN** a user submits a new todo creation request, **THE** system **SHALL** validate all provided fields before persisting the todo. **IF** validation fails, **THEN** **THE** system **SHALL** reject the creation and return specific error messages for each invalid field.

**WHEN** validating the title, **THE** system **SHALL** reject todos with:
- Empty title after trimming whitespace
- Titles longer than 200 characters
- Titles that are only whitespace characters

**WHEN** validating the description, **THE** system **SHALL** reject descriptions exceeding 1000 characters but **SHALL** accept empty descriptions or null values.

**WHEN** a due date is provided, **THE** system **SHALL** validate it is in a supported ISO 8601 format and **SHALL** reject dates that are invalid (e.g., February 30th).

**WHEN** a priority level is provided, **THE** system **SHALL** validate it is exactly one of: "low", "medium", or "high" (case-sensitive). **IF** the priority is invalid, **THEN** **THE** system **SHALL** reject the creation.

**WHEN** validation is successful, **THE** system **SHALL** create the todo with the following automatically-set values:
- Completion status: false (newly created todos are incomplete by default)
- Created timestamp: current system time in UTC (users cannot override this)
- Owner: the authenticated user's ID making the request
- Updated timestamp: same as created timestamp (no modifications yet)
- Generated unique todo ID using secure random generation

**WHEN** a todo is successfully created, **THE** system **SHALL** store it in the database and return the complete todo object to the user, including the generated unique todo ID so the user can reference this todo for future operations.

**THE** system **SHALL** establish a clear ownership relationship where only the user who created the todo can view, modify, or delete it. All database queries **SHALL** verify this ownership relationship.

## Todo Retrieval and Display Requirements

### Retrieve All Todos for Authenticated User

**WHEN** an authenticated user requests their complete todo list, **THE** system **SHALL** retrieve all todos owned by that user from the database.

**THE** system **SHALL** return todos in a paginated response with the following characteristics:
- Default page size: 20 todos per page (for reasonable performance)
- Maximum allowed page size: 100 todos per page (to prevent excessive data transfer)
- Default sort order: by creation date in descending order (newest todos first)
- Response **SHALL** include the total count of all todos for the user
- Response **SHALL** include current page number and total number of pages

**WHEN** a user requests their todos without specifying a page number, **THE** system **SHALL** return the first page (page 1) of results.

**WHEN** a user requests a page number that is beyond the total number of available pages, **THE** system **SHALL** return an empty array for that page (not an error condition), along with pagination metadata indicating there are no results.

**WHEN** a user has zero todos, **THE** system **SHALL** return an empty array with a total count of 0 and indicate that there are 0 pages of results.

**THE** system **SHALL** include the following information for each todo in the retrieval response:
- Unique todo ID (the identifier for referencing this todo)
- Title (the main text of the todo)
- Description (if provided, otherwise null or omitted)
- Due date (if set, in ISO 8601 format, otherwise null or omitted)
- Priority level ("low", "medium", or "high")
- Completion status (true or false)
- Created timestamp (ISO 8601 UTC format, e.g., 2024-01-15T10:30:45Z)
- Updated timestamp (ISO 8601 UTC format)
- Owner user ID (confirming ownership)

**THE** system **SHALL** complete the todo retrieval operation and return paginated results to the user within 1 second for users with typical todo counts (under 1000 todos). This ensures responsive user interface interactions.

### Retrieve Single Todo Details

**WHEN** an authenticated user requests a specific todo by providing its unique ID, **THE** system **SHALL** first verify that the todo exists in the database.

**IF** the todo does not exist, **THEN** **THE** system **SHALL** return a "not found" error (HTTP 404) indicating that the requested todo cannot be accessed.

**AFTER** verifying existence, **THE** system **SHALL** verify that the requesting user is the owner of that todo by comparing the requesting user's ID with the stored owner ID.

**IF** the requesting user does not own the todo (i.e., it belongs to another user), **THEN** **THE** system **SHALL** return an authorization error (HTTP 403 Forbidden), preventing unauthorized access to other users' data.

**WHEN** the user owns the todo and it exists, **THE** system **SHALL** return the complete todo object with all fields as described in the retrieval requirements above.

### Handling Missing or Inaccessible Todos

**WHEN** a user attempts to access a todo that does not exist (never created or was deleted), **THE** system **SHALL** return HTTP 404 Not Found.

**WHEN** a user attempts to access a todo owned by another user, **THE** system **SHALL** return HTTP 403 Forbidden without revealing whether the todo exists or belongs to another user (preventing information leakage).

**THE** system **SHALL** never return a list containing todos that do not belong to the requesting user, even if the requesting user could theoretically know a valid todo ID.

## Todo Update Requirements

### Update Todo Title and Description

**WHEN** an authenticated user chooses to edit a todo's title or description, **THE** system **SHALL** accept updated string values for these fields in the update request.

**THE** system **SHALL** validate the updated values according to the same rules as todo creation:
- Title must be 1-200 characters and not empty after trimming
- Description must be 0-1000 characters (or null/empty for no description)

**WHEN** an update request is received, **THE** system **SHALL** first verify the requesting user owns the requested todo by comparing user IDs.

**IF** the requesting user does not own the todo, **THEN** **THE** system **SHALL** deny the update with an authorization error (HTTP 403 Forbidden).

**IF** validation of the new values fails (e.g., title is too long), **THEN** **THE** system **SHALL** reject the update and return specific validation error messages.

**WHEN** validation passes and ownership is verified, **THE** system **SHALL** update the todo with the new values and set the updated timestamp to the current system time, recording when the todo was last modified.

**WHEN** an update is successful, **THE** system **SHALL** return the complete updated todo object to the user, reflecting all current values.

### Update Todo Completion Status

**WHEN** an authenticated user marks a todo as complete, **THE** system **SHALL** change the completion status from false to true in the database.

**WHEN** an authenticated user marks a previously completed todo as incomplete, **THE** system **SHALL** change the completion status from true back to false.

**BEFORE** allowing any completion status change, **THE** system **SHALL** verify the requesting user owns the todo. **IF** ownership verification fails, **THEN** **THE** system **SHALL** deny the change with an authorization error.

**WHEN** the completion status is successfully changed, **THE** system **SHALL** update the todo's updated timestamp to the current time, recording when the completion status was last modified.

**THE** system **SHALL** return the complete updated todo object showing the new completion status.

**THE** system **SHALL** allow users to toggle completion status back and forth unlimited times (completed → incomplete → completed).

### Update Other Todo Fields

**WHEN** an authenticated user updates a todo's due date, **THE** system **SHALL** validate that the provided date is in a valid ISO 8601 format (if a date is provided).

**THE** system **SHALL** allow users to set a due date on a todo that previously had no due date, or remove a due date by sending null or empty value.

**THE** system **SHALL** reject invalid date values (e.g., "2024-13-45") with a validation error.

**WHEN** an authenticated user updates a todo's priority level, **THE** system **SHALL** validate that the new priority is exactly one of the allowed values: "low", "medium", or "high".

**THE** system **SHALL** reject invalid priority values (e.g., "urgent", "important") with a validation error.

**BEFORE** applying any field update (description, due date, priority), **THE** system **SHALL** verify the requesting user owns the todo.

**FOR** all modifications to any todo field, **THE** system **SHALL** update the updated timestamp to the current system time, ensuring the timestamp accurately reflects the most recent modification.

### Batch Update Limitations

**THE** system **SHALL** support updating all fields of a todo in a single request (e.g., title, description, priority, due date, and completion status all in one update).

**THE** system **SHALL** validate and update all fields atomically, meaning either all changes are applied or none are applied (no partial updates).

## Todo Deletion Requirements

### Delete Individual Todo

**WHEN** an authenticated user chooses to delete a todo, **THE** system **SHALL** first locate the todo in the database by its ID.

**IF** the todo does not exist, **THEN** **THE** system **SHALL** return a "not found" error (HTTP 404).

**WHEN** the todo exists, **THE** system **SHALL** verify that the requesting user owns the todo before proceeding with deletion.

**IF** the requesting user does not own the todo, **THEN** **THE** system **SHALL** deny the deletion with an authorization error (HTTP 403 Forbidden).

**WHEN** ownership is verified, **THE** system **SHALL** permanently delete the todo from the database. This deletion is irreversible; the todo cannot be recovered after deletion.

**WHEN** a todo is successfully deleted, **THE** system **SHALL** return a success confirmation to the user (HTTP 200 or 204 No Content).

### Deletion Permanence and Recovery

**THE** system **SHALL NOT** implement soft deletes, tombstones, or recovery mechanisms in the minimum viable version. Once a todo is deleted, it is permanently removed.

**THE** system **SHALL NOT** maintain an audit log or "trash" feature for this minimum viable version.

### Cascading Behavior

**THE** system does not need to support cascading deletes, as todos have no dependent child objects or relationships in this minimal application. Each todo is an independent entity owned by a single user.

**WHEN** a user account is deleted or suspended (future enhancement), all todos owned by that user **MAY** be deleted as part of account cleanup, but this is not required for the minimum viable version.

## List Management Requirements

### Single Unified Todo List

**THE** system **SHALL** maintain a single, unified todo list per user. There are no todo list categories, folders, lists, or projects in the minimum viable version.

**WHEN** a user requests their todos, **THE** system **SHALL** return all of their todos in a single collection, optionally filtered and sorted according to user preferences.

**THE** system **SHALL** enforce strict data isolation such that each user can only see and manage todos they own. No user can access, view, modify, or delete another user's todos under any circumstance.

**THE** system **SHALL** prevent information leakage by not revealing whether requested todos exist or belong to other users. All unauthorized access attempts **SHALL** return the same error response.

### User-Specific Data Isolation

**EVERY** database query for todos **SHALL** include a mandatory filter for the authenticated user's ID in the WHERE clause, ensuring only that user's todos are queried.

**THE** system **SHALL** verify the requesting user's identity from the JWT token for every operation and use this authenticated identity for all data access control decisions.

**THE** system **SHALL** never return a todo list, individual todo, or modification capability to any user except the owner of that todo.

**IF** a database query somehow returns todos not owned by the requesting user, **THE** system **SHALL** filter them out before returning results to the user (defense in depth).

### No Sharing or Collaboration

**THE** minimum viable version **SHALL NOT** support sharing todos with other users, collaborative editing, or permission management.

**EACH** todo belongs exclusively to the user who created it. Ownership cannot be transferred to another user in the minimum viable version.

## Data Validation Requirements

### Required and Optional Field Definitions

**THE** todo title **SHALL** be required for all todos. Titles cannot be empty, null, or contain only whitespace characters.

**THE** todo description **SHALL** be optional. When not provided by the user, the description **SHALL** be stored as null or an empty string in the database.

**THE** due date **SHALL** be optional. When not provided, it **SHALL** be stored as null. When provided, it **SHALL** be a valid ISO 8601 date or date-time string.

**THE** priority level **SHALL** default to "medium" if not specified during todo creation. If provided, it **SHALL** be exactly one of: "low", "medium", or "high" (case-sensitive).

**THE** completion status **SHALL** always have a value. It **SHALL** default to false (incomplete) for newly created todos and can be toggled to true (completed) by the user.

### Field Length Constraints

**THE** todo title **SHALL** be between 1 and 200 characters in length. Titles with fewer than 1 character or more than 200 characters **SHALL** be rejected.

**THE** todo description **SHALL** not exceed 1000 characters in length when provided. Descriptions longer than 1000 characters **SHALL** be rejected.

**THE** username **SHALL** be between 2 and 50 characters in length. Usernames outside this range **SHALL** be rejected during registration.

**THE** email address **SHALL** follow standard email validation rules (local-part@domain.extension format) and be unique across all users in the system.

**THE** password **SHALL** be at least 8 characters in length, contain at least one uppercase letter (A-Z), and contain at least one lowercase letter (a-z).

### Character and Content Restrictions

**THE** system **SHALL** accept all UTF-8 characters in todo titles, descriptions, and usernames, including letters, numbers, punctuation, spaces, and emojis.

**THE** system **SHALL** trim (remove) leading and trailing whitespace from all text fields before validation and storage. However, internal whitespace within fields **SHALL** be preserved.

**THE** system **SHALL** reject titles that contain only whitespace characters (spaces, tabs, newlines) after trimming, treating them as empty.

**THE** system **SHALL** normalize email addresses to lowercase before storage and comparison, ensuring case-insensitive email handling.

### Password Security Requirements

**WHEN** a user creates an account during registration, **THE** password **SHALL** be at least 8 characters in length. Shorter passwords **SHALL** be rejected.

**WHEN** validating a password during registration, **THE** password **SHALL** contain at least one uppercase letter (A-Z) and at least one lowercase letter (a-z). Passwords without mixed case **SHALL** be rejected.

**THE** password **SHALL** never be stored in plain text in the database. **THE** system **SHALL** hash passwords using a secure, industry-standard algorithm (bcrypt, scrypt, or Argon2) before storage.

**THE** system **SHALL** use a salt when hashing passwords to prevent rainbow table attacks.

**THE** system **SHALL** never return the password or password hash to the user in any response.

### Duplicate and Uniqueness Rules

**THE** email address **SHALL** be unique across all users in the system. **THE** system **SHALL** reject registration attempts when an email address is already associated with an existing user account.

**THE** system **SHALL** perform case-insensitive email comparison for uniqueness validation (user@Example.com and user@example.com are considered the same email and both cannot exist).

**THE** todo ID **SHALL** be unique within the entire system. Each todo generated by the system **SHALL** have a unique, non-repeating identifier that cannot conflict with any other todo ever created.

**THE** user ID **SHALL** be unique across all users. Each user account **SHALL** have a unique identifier used for ownership tracking and authentication.

**THE** username (display name) **SHALL NOT** be required to be unique in the minimum viable version. Multiple users can have the same display name.

## Search and Filtering Requirements

### Filter Todos by Completion Status

**WHEN** a user provides a completion status filter parameter, **THE** system **SHALL** support filtering for:
- Completed todos only (completed = true)
- Incomplete todos only (completed = false)  
- All todos regardless of completion status (no filter)

**THE** system **SHALL** apply completion filters in addition to pagination and sorting, returning filtered results in paginated format.

**IF** a user requests "completed" filter, **THEN** **THE** system **SHALL** return only todos where completion status is true.

**IF** a user requests "incomplete" filter, **THEN** **THE** system **SHALL** return only todos where completion status is false.

**IF** a user requests "all" or no filter parameter, **THEN** **THE** system **SHALL** return all of the user's todos regardless of completion status.

### Search Todo Titles and Descriptions

**WHEN** a user provides a search query text, **THE** system **SHALL** search for matching todos by searching within todo titles (case-insensitive substring matching).

**THE** search **SHALL** find all todos where the title contains the search query as a substring, regardless of uppercase/lowercase variation.

**THE** system **SHALL** support searching both title and description fields when a search query is provided.

**THE** system **SHALL** return search results in the same paginated format as regular todo retrieval, allowing users to navigate through search results.

**WHEN** a search query returns no matching todos, **THE** system **SHALL** return an empty array with pagination metadata indicating zero results.

### Sort and Order Todos

**THE** system **SHALL** support sorting todos by the following fields:
- Creation date (ascending from oldest first, or descending from newest first)
- Updated date (ascending or descending)
- Due date (ascending with null/missing dates at the end, or descending)
- Priority level (when sorted, ascending order as: "low", "medium", "high", or reverse order: "high", "medium", "low")
- Title (alphabetical ascending A-Z, or reverse alphabetical Z-A)

**THE** default sort order **SHALL** be by creation date in descending order (newest todos appear first in the list).

**WHEN** a user specifies a sort order, **THE** system **SHALL** apply that sort order to the results. **THE** system **SHALL** maintain the specified sort order when filtering or searching is applied.

**WHEN** sorting by due date with null values present, **THE** system **SHALL** place todos without due dates at the end of the list (after todos with due dates), not at the beginning.

**WHEN** sorting by priority with ascending order, **THE** system **SHALL** order as: "low" < "medium" < "high" (low priority first).

## Cross-Cutting Functional Requirements

### Timestamp Management

**THE** system **SHALL** automatically record creation timestamps for all new todos at the moment of creation in UTC format. Users **CANNOT** manually override or set the created timestamp.

**THE** system **SHALL** automatically record and update the updated timestamp whenever a todo is modified (any field changed). Users **CANNOT** manually override the updated timestamp.

**THE** system **SHALL** store timestamps in ISO 8601 format (e.g., 2024-01-15T10:30:45Z or 2024-01-15T10:30:45.123Z) for consistency across all clients and services.

**WHEN** a todo is retrieved from the system, **THE** response **SHALL** include both created timestamp and updated timestamp in ISO 8601 format.

**THE** system **SHALL** use server-side time (not client-provided time) for all timestamp generation, preventing clients from manipulating timestamps.

### User Session Persistence

**WHEN** an authenticated user remains active and their JWT token has not expired, **THE** system **SHALL** maintain their authenticated session and allow continued access to their todos.

**WHEN** a user's JWT token expires (based on the token's expiration claim), **THE** system **SHALL** require them to log in again with valid credentials to obtain a new token.

**AFTER** a user logs out or their token expires, their todos **SHALL** remain stored and unchanged in the database. The user's data is not affected by session termination.

**THE** system **SHALL** support concurrent sessions for the same user, allowing a user to be logged in from multiple devices or browsers simultaneously, each with their own valid token.

**WHEN** a user logs in from a new device while still logged in on another device, **THE** system **SHALL** allow both sessions to coexist. The user can have multiple valid tokens active at the same time.

### Concurrent Modification Handling

**IF** two separate authenticated sessions (could be the same user on different devices, or edge case of system malfunction) attempt to modify the same todo simultaneously, **THE** system **SHALL** ensure data consistency through database-level locking or atomic operations.

**WHEN** a user attempts to modify a todo that has been deleted in another session, **THE** system **SHALL** return a "not found" error, preventing modification of non-existent todos.

**WHEN** a user retrieves a todo, modifies it, and attempts to save changes, and another session has modified the same todo in the meantime, **THE** system **SHALL** prevent lost updates by ensuring all modifications are atomic database operations.

**THE** system **SHALL** NOT implement optimistic locking, version numbers, or conflict resolution in the minimum viable version. Last write wins (later update overwrites earlier update).

**IF** concurrent modifications occur, **THE** system **SHALL** ensure database integrity by applying updates in sequence (first write succeeds, any concurrent writes that arrive during processing are handled gracefully).

### Error Response Format

**WHEN** the system detects an error condition, **THE** system **SHALL** return an HTTP status code appropriate to the error type:
- 400 Bad Request for validation errors
- 401 Unauthorized for authentication failures
- 403 Forbidden for authorization failures
- 404 Not Found for missing resources
- 500 Internal Server Error for unexpected system errors

**THE** system **SHALL** include error details in the response body describing what went wrong in a way that is helpful to the user or developer.

---

*This document defines all business requirements for the Todo List application in EARS format. All requirements are implementable and testable, providing clear guidance for the development team.*