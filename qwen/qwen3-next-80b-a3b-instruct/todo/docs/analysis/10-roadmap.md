# Todo List Application - Requirements Specification

## Service Overview

The Todo List application is a minimalist, privacy-focused task management system designed for individual personal use. The core value proposition is to provide users with a secure, private space to manage their personal tasks without any risk of data exposure to others.

### Problem Statement

Individuals need a simple way to track their personal tasks and responsibilities, but existing solutions often compromise privacy by enabling sharing, synchronization across users, or storing data in ways that expose information to providers or third parties. Users need assurance that their private thoughts, to-dos, and life plans remain completely confidential and isolated from all other users.

### Core Value Proposition

1. **Absolute Privacy**: Each user's todo list is completely isolated—no user can access, view, or even acknowledge the existence of another user's tasks
2. **Minimal Complexity**: Only essential functionality is implemented—no features beyond basic item creation, status toggling, and deletion
3. **Secure Authentication**: Full user registration and login system with industry-standard JWT tokens
4. **Reliable Persistence**: Tasks are saved securely and restored on every login
5. **User Control**: Users have complete ownership and control over their data, including the ability to permanently delete items and their account

### Business Model

The Todo List application operates as a freemium service with zero advertising and no data monetization. The service is funded by a small subscription fee for premium features in future versions (version 1.0 is completely free). No user data is collected, analyzed, sold, or shared with third parties. The business model is explicitly designed around user privacy rather than data exploitation.

## User Actors

The system defines three distinct user actors, each with specific authentication and access rights:

### User (Primary Actor)
- **Definition**: An authenticated individual who has completed the registration and email verification process
- **Purpose**: Manage their personal todo list with complete privacy
- **Authentication Requirements**: Must register with email/password, verify email, and log in with valid credentials
- **Authorization Scope**: Can perform all CRUD operations (create, read, update, delete) on their own todo items only
- **Access Restrictions**: Cannot view, modify, or even detect the existence of any other user's todo items
- **Session Management**: Receives JWT access token (15-minute expiration) upon successful login

### Guest (Unauthenticated User)
- **Definition**: An individual who has not logged in or registered
- **Purpose**: Explore the application interface and initiate registration
- **Authentication Requirements**: Cannot authenticate; all authentication endpoints return 401 response
- **Authorization Scope**: Limited to viewing public landing page and registration/login forms
- **Access Restrictions**: Has zero access to any todo list functionality or private user data
- **Transition Path**: Can progress to "User" actor status by completing registration and email verification process

### Admin (System Administrator)
- **Definition**: A trusted individual responsible for system maintenance and oversight
- **Purpose**: Monitor user accounts, handle support requests, and ensure system integrity
- **Authentication Requirements**: Must log in with special credentials separate from regular user registration
- **Authorization Scope**: Can view user account metadata (email addresses, registration date, status) but cannot view any user's todo items
- **Access Restrictions**: Cannot create, modify, or delete any user's todo items. Cannot access any task data.
- **Access Control Principle**: Administrative access is implemented through separate, system-controlled credentials not related to user account data
- **Account Security**: Admin accounts require multi-factor authentication

## Authentication and Authorization

### Authentication System Design

The application implements a stateless authentication system using JSON Web Tokens (JWT) with strict security controls.

#### Registration Flow

WHEN a guest submits a registration form with an email address and password, THE system SHALL:

- Validate the email format according to RFC 5322 standards
- Ensure the password is at least 12 characters long
- Require the password to contain at least one uppercase letter, one lowercase letter, one digit, and one special character
- Check that the email address is not already registered
- Hash the password using bcrypt with a cost factor of 12
- Create a user account with status "unverified"
- Generate a unique, cryptographically secure verification token
- Send an email to the provided address containing the verification link
- Redirect the guest to the login page with message: "Please verify your email to complete registration."

WHEN a guest attempts to register with an already registered email address, THE system SHALL:

- Return error code: REGISTRATION_EMAIL_EXISTS
- Display user message: "This email address is already in use. Have you verified it?"
- Retain the existing unverified account
- Send a new verification email with a new token

WHEN a guest attempts to register with a password that doesn't meet complexity requirements, THE system SHALL:

- Return error code: PASSWORD_INSUFFICIENT_COMPLEXITY
- Display user message: "Password must be at least 12 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
- Prevent account creation

WHEN a guest attempts to register with an invalid email format, THE system SHALL:

- Return error code: EMAIL_INVALID_FORMAT
- Display user message: "Please enter a valid email address (e.g., user@example.com)"
- Prevent account creation

#### Login Flow

WHEN a user attempts to log in with their email and password, THE system SHALL:

- Look up the user by email address in the database
- Check if the account status is "active"
- If the account is "unverified", return error code: AUTH_EMAIL_NOT_VERIFIED
- If the account is "deactivated", return error code: AUTH_ACCOUNT_DEACTIVATED
- If no account exists for the email, return error code: AUTH_INVALID_CREDENTIALS
- Verify the provided password against the stored bcrypt hash
- If verification fails, return error code: AUTH_INVALID_CREDENTIALS
- If verification succeeds, generate a JWT access token with the following payload:

```
{
  "sub": "<unique-user-uuid>",
  "email": "<verified-email-address>",
  "role": "user",
  "iat": <current-timestamp>,
  "exp": <current-timestamp-plus-15-minutes>
}
```

- Generate a refresh token with 14-day expiration
- Store the refresh token in an httpOnly, Secure, SameSite=Strict cookie
- Return the access token in the response headers
- Redirect the user to their todo list

WHEN a user logs in from a new device or location, THE system SHALL:

- Record the device fingerprint (user agent, device type)
- Send an additional verification email to the registered email address
- Require the user to click a verification link in the email before completing login

#### Session Management

WHEN a user successfully authenticates, THE system SHALL:

- Store the access token in browser localStorage
- Store the refresh token in an httpOnly, Secure, SameSite=Strict cookie
- Set all HTTP response headers to include Cache-Control: no-store, Pragma: no-cache

WHEN a user makes a request to a protected resource:

- THE system SHALL extract the JWT from the Authorization header
- THE system SHALL validate the token signature using the secret key
- THE system SHALL verify the token is not expired (exp > current timestamp)
- THE system SHALL extract the "sub" claim to identify the user
- THE system SHALL validate that the user exists and is active
- THE system SHALL use the "sub" value for all subsequent data queries

WHEN an access token expires:

- THE system SHALL return HTTP 401 Unauthorized
- THE system SHALL provide a refresh token endpoint
- THE system SHALL verify the refresh token from the httpOnly cookie
- THE system SHALL validate that the refresh token is not expired (14-day expiration)
- THE system SHALL verify the refresh token has not been revoked
- THE system SHALL generate a new access token and refresh token
- THE system SHALL update the httpOnly cookie with the new refresh token
- THE system SHALL return the new access token in headers

WHEN a user logs out:

- THE system SHALL delete the access token from localStorage
- THE system SHALL delete the refresh token from the httpOnly cookie
- THE system SHALL redirect the user to the landing page
- THE system SHALL display message: "You have been logged out."

WHEN a user's session expires due to inactivity:

- THE system SHALL clear both tokens
- THE system SHALL redirect to login page
- THE system SHALL display message: "Your session has expired. Please log in again."

WHEN a user's device is compromised, THE system SHALL:

- Allow the user to revoke all active sessions through security settings
- When revoked, invalidate all refresh tokens for that user
- Require full re-authentication for all devices
- Log the revocation event in audit trail

### Authorization and Data Isolation

The system enforces strict user data isolation at all levels of the application.

#### Access Control Rules

WHEN a user attempts to access their todo list, THE system SHALL:

- Extract the "sub" claim from the JWT token
- Query the database for "todos" with "user_id" equal to the extracted "sub" value
- Return only the todo items belonging to that specific user

IF a user attempts to access another user's todo list:

- THE system SHALL ignore any user ID provided in request parameters or body
- THE system SHALL use only the "sub" claim from the JWT token
- THE system SHALL return empty list
- THE system SHALL log security event: ACCESS_ATTEMPT_MISDIRECTED
- THE system SHALL return HTTP 403 Forbidden with error code: ACCESS_DENIED

WHEN a user attempts to create a new todo item:

- THE system SHALL extract the "sub" claim from the JWT token
- THE system SHALL assign this "sub" value as the "user_id" in the new todo item
- THE system SHALL ignore any "user_id" provided in the request body
- ANY attempt to override the user_id in the request body SHALL be rejected

WHEN a user attempts to update or delete a todo item:

- THE system SHALL extract the item ID from the request URL
- THE system SHALL query the database for the item
- THE system SHALL compare the item's "user_id" with the "sub" claim from the JWT
- IF they do not match, THE system SHALL return HTTP 403 Forbidden
- IF they match, THE system SHALL proceed with the operation

#### Permission Matrix

| Action | User | Guest | Admin |
|--------|------|-------|-------|
| View public landing page | ✅ | ✅ | ✅ |
| Register new account | ✅ | ✅ | ❌ |
| Login to account | ✅ | ❌ | ✅ |
| View own todo lists | ✅ | ❌ | ✅ |
| Create new todo list | ✅ | ❌ | ✅ |
| Edit own todo items | ✅ | ❌ | ✅ |
| Delete own todo items | ✅ | ❌ | ✅ |
| Mark todo items as complete | ✅ | ❌ | ✅ |
| View other users' todo lists | ❌ | ❌ | ❌ |
| Manage user accounts | ❌ | ❌ | ✅ |
| View system logs | ❌ | ❌ | ✅ |
| Logout from account | ✅ | ❌ | ✅ |
| Request password reset | ✅ | ✅ | ✅ |
| Change own password | ✅ | ❌ | ✅ |
| Revoke all active sessions | ✅ | ❌ | ✅ |
| Delete own account | ✅ | ❌ | ✅ |
| Access admin interface | ❌ | ❌ | ✅ |

## Core Functionality Requirements

### Todo List Management

Every authenticated user is automatically granted one private todo list upon successful login. This list is entirely personal and inaccessible to any other user.

### List Structure

- Each user has exactly one todo list
- The list has no name, title, or identifier beyond the owner's user ID
- Items in the list have no hierarchical structure (no subtasks or categories)
- Items are ordered chronologically by creation timestamp (oldest first)
- No grouping, tags, or sorting beyond creation time is implemented

### List Access Rules

WHEN an authenticated user accesses their todo list page:

- THE system SHALL retrieve all todo items where "user_id" equals the authenticated user's ID
- THE system SHALL return a 403 Forbidden error if the user is not logged in
- THE system SHALL return an empty list if the user has no todo items
- THE system SHALL display message: "You have no tasks yet. Create your first task above!" when the list is empty
- THE system SHALL never return more than one list per user regardless of the number of requests

WHEN a user attempts to access another user's todo list by manipulating URL parameters:

- THE system SHALL ignore the parameter
- THE system SHALL use only the JWT token's "sub" claim for data queries
- THE system SHALL return HTTP 403 Forbidden with error code: ACCESS_DENIED
- THE system SHALL log the attempted intrusion

### Data Persistence

User data must be securely stored using the following practices:

#### Storage Requirements

- ALL user authentication data (email, password hash, verification status) SHALL be stored in a relational database
- ALL todo items SHALL be stored in a relational database with row-level security
- ALL personal data SHALL be encrypted at rest using AES-256-GCM encryption
- EACH user SHALL have their own encryption key derived from their password hash using HKDF-SHA256
- Encryption keys SHALL be stored in a dedicated key management service separate from database
- ALL database records SHALL be encrypted before storage
- ALL communication SHALL use TLS 1.3 encryption
- TLS SHALL be enforced with HSTS header (max-age: 31536000)

#### Database Schema (Implementation Note)

*Note: This is for developer understanding only. Do not include in API or interface documentation.*

```
users (table)
- id (UUID, primary key)
- email (string, unique, encrypted at rest)
- password_hash (string, stored as bcrypt hash)
- email_verified (boolean)
- account_status (enum: "active", "unverified", "deactivated")
- created_at (timestamp)
- updated_at (timestamp)
- last_login_at (timestamp)
- is_admin (boolean)

"todos" (table)
- id (UUID, primary key)
- user_id (UUID, foreign key to users.id)
- title (string, encrypted at rest)
- completed (boolean)
- created_at (timestamp)
- completed_at (timestamp)
```

#### Data Retention

- User data SHALL be retained indefinitely while the account is active
- Todo items SHALL be retained indefinitely unless explicitly deleted
- When a user deletes their account, THE system SHALL:
  - Immediately mark account status as "deleted"
  - Begin immediate deletion process
  - Remove all todo items associated with the user
  - Erase all personal data from database
  - Permanently delete encryption keys from key management service
- When a user requests data export, THE system SHALL:
  - Generate a JSON file containing: email, creation date, and all todo items
  - Send the file to the user via email
  - Delete the temporary file immediately after delivery
  - Log the export event in audit trail

### Item Creation

The system allows users to create new tasks to track items they need to complete.

#### Creation Process

WHEN a user submits a new todo item via POST /api/todos:

- THE system SHALL validate that the request body contains a "title" property
- THE system SHALL validate that the "title" property is not null, undefined, or empty
- THE system SHALL validate that the "title" property contains at least 1 non-whitespace character
- THE system SHALL validate that the "title" property does not exceed 500 characters
- THE system SHALL validate that the "title" property contains no HTML tags (sanitize input)
- THE system SHALL validate that the "title" property matches Unicode character standards
- IF validation fails, THE system SHALL return HTTP 400 Bad Request with error code: VALIDATION_TITLE_REQUIRED
- IF all validation passes, THE system SHALL:
  - Extract the "sub" claim from the JWT token
  - Create a new todo item with:
    - "id": auto-generated UUID v4
    - "user_id": extracted from JWT
    - "title": submitted text (encrypted)
    - "completed": false
    - "created_at": current server timestamp (ISO 8601)
    - "completed_at": null
  - Store the item in database using encrypted column mapping
  - Return HTTP 201 Created with the newly created item

#### Creation Constraints

- IF the "title" is empty or contains only whitespace, THE system SHALL return error code: VALIDATION_TITLE_EMPTY
- IF the "title" exceeds 500 characters, THE system SHALL return error code: VALIDATION_TITLE_TOO_LONG
- IF the "title" contains HTML tags, THE system SHALL return error code: VALIDATION_TITLE_HTML
- IF the "title" contains unpermitted Unicode characters, THE system SHALL return error code: VALIDATION_TITLE_INVALID_CHARS
- IF the JWT token is invalid or missing, THE system SHALL return error code: AUTH_TOKEN_MISSING

### Item Status Management

Each todo item has a binary state: incomplete or complete. Users may toggle between these states.

#### Status Change Process

WHEN a user updates a todo item's status via PATCH /api/todos/{id}:

- THE system SHALL extract the "sub" claim from JWT token
- THE system SHALL validate that a "completed" boolean value is provided in request body
- THE system SHALL validate that the "completed" value is strictly true or false (not string, number, or null)
- THE system SHALL retrieve the todo item with provided ID from database
- THE system SHALL verify that the item's "user_id" matches the "sub" claim
- IF item is not found, THE system SHALL return HTTP 404 Not Found with error code: ITEM_NOT_FOUND
- IF item belongs to another user, THE system SHALL return HTTP 403 Forbidden with error code: ACCESS_DENIED
- IF status matches existing value, THE system SHALL return HTTP 200 OK (no change)
- IF status changes from incomplete to complete:
  - Update "completed" to true
  - Set "completed_at" to current timestamp
  - Leave "created_at" unchanged
- IF status changes from complete to incomplete:
  - Update "completed" to false
  - Set "completed_at" to null
  - Leave "created_at" unchanged
- Update "updated_at" to current timestamp
- Return HTTP 200 OK with updated item

#### Status Change Constraints

- IF the "completed" value is not boolean, THE system SHALL return error code: VALIDATION_COMPLETED_INVALID
- IF the "id" parameter is not a valid UUID, THE system SHALL return error code: VALIDATION_ID_INVALID
- IF the "id" points to non-existent item, THE system SHALL return error code: ITEM_NOT_FOUND
- IF the "id" points to item owned by another user, THE system SHALL return error code: ACCESS_DENIED
- IF the JWT token is invalid, THE system SHALL return error code: AUTH_TOKEN_MISSING

### Item Deletion

Users may permanently remove todo items from their list.

#### Deletion Process

WHEN a user sends a DELETE request to /api/todos/{id}:

- THE system SHALL validate that the "id" parameter is a valid UUID v4 format
- THE system SHALL extract the "sub" claim from JWT token
- THE system SHALL retrieve the todo item from database using provided ID
- THE system SHALL verify that the item's "user_id" matches the "sub" claim
- IF the item is found and belongs to user:
  - Delete the item from database
  - Return HTTP 204 No Content
- IF the item is not found:
  - Return HTTP 404 Not Found with error code: ITEM_NOT_FOUND
- IF the item belongs to another user:
  - Return HTTP 403 Forbidden with error code: ACCESS_DENIED
- IF the JWT token is invalid:
  - Return HTTP 401 Unauthorized with error code: AUTH_TOKEN_MISSING
- IF the ID format is invalid:
  - Return HTTP 400 Bad Request with error code: VALIDATION_ID_INVALID

#### Deletion Constraints

- THIS IS A HARD DELETE: The item is permanently removed with no possibility of recovery
- NO soft delete, recycle bin, or version history is implemented
- NO batch deletion is supported—each item must be deleted individually
- NO confirmation dialogs or undo functions are implemented (client handles UI confirmation)

### Data Integrity

The system maintains data integrity through the following mechanisms:

- ALL database operations SHALL enforce foreign key relationships between users and todos
- WHEN a user is deleted, ALL their todo items SHALL be cascade-deleted automatically
- ALL updates to todo status SHALL update the "updated_at" timestamp
- ALL creation SHALL set both "created_at" and "updated_at" to current timestamp
- THE system SHALL validate all timestamps are in ISO 8601 format before storage
- THE system SHALL prevent timestamp manipulation from client requests
- ALL encryption SHALL be applied consistently to all personally identifiable information
- THE system SHALL implement database constraints to prevent:
  - NULL values in "user_id" column
  - NULL or zero-length values in "title" column
  - Non-boolean values in "completed" column

## User Workflows

### User Registration Flow

The registration flow enables guests to create a new user account with secure authentication credentials.

#### Registration Process

WHEN a guest visits the application homepage, THE system SHALL display a registration form with:
- Email input field
- Password input field
- Password confirmation field
- "Register" button
- Link to terms of service and privacy policy

WHEN a guest submits a registration form:

- THE system SHALL validate the email format
- THE system SHALL validate the password meets complexity requirements (12+ characters, mixed case, number, special character)
- THE system SHALL validate that the password and confirmation match
- THE system SHALL check that the email is not already registered
- IF all validations pass:
  - THE system SHALL create an unverified user account
  - THE system SHALL generate a cryptographic verification token
  - THE system SHALL send an email to the provided address with verification link
  - THE system SHALL display message: "Please check your email to verify your account."
  - THE system SHALL redirect to login page
- IF validation fails:
  - THE system SHALL display appropriate error message
  - THE system SHALL retain valid entries
  - THE system SHALL NOT create an account

WHEN a guest attempts to register with an already registered email:

- THE system SHALL display message: "This email is already registered. Have you verified it?"
- THE system SHALL send a new verification email
- THE system SHALL display "Resend verification email" button

WHEN the verification email is received:

- THE system SHALL include a URL: https://app.todolist.com/verify?token=<token>
- WHEN clicked, THE system SHALL:
  - Validate the token against the database
  - Verify the token has not expired (7-day expiry)
  - Update the account status from "unverified" to "active"
  - Clear the verification token from the database
  - Redirect to login page with message: "Your account has been verified. You can now log in."

WHEN the verification link expires:

- THE system SHALL display error: "This verification link has expired."
- THE system SHALL provide "Resend verification email" option
- THE system SHALL allow re-registration with same email

### User Login Flow

The login flow authenticates registered users and establishes a secure session.

#### Authentication Process

WHEN a guest navigates to the login page:

- THE system SHALL display email and password input fields
- THE system SHALL display "Login" button
- THE system SHALL display "Forgot password?" link
- THE system SHALL display "Don't have an account? Register" link

WHEN a user submits login credentials:

- THE system SHALL validate that both email and password are provided
- THE system SHALL validate email format
- THE system SHALL look up the user by email address
- IF account is found:
  - Compare provided password with stored bcrypt hash
  - IF match:
    - IF account status is "active":
      - Generate JWT access token with 15-minute expiration
      - Generate refresh token with 14-day expiration
      - Store refresh token in httpOnly, Secure, SameSite=Strict cookie
      - Return access token in response headers
      - Redirect to todo list
    - IF account status is "unverified":
      - Return error code: AUTH_EMAIL_NOT_VERIFIED
      - Display message: "Please verify your email before logging in."
    - IF account status is "deactivated":
      - Return error code: AUTH_ACCOUNT_DEACTIVATED
      - Display message: "Your account has been deactivated. Contact support."
  - IF password doesn't match:
    - Return error code: AUTH_INVALID_CREDENTIALS
    - Display generic message: "Invalid email or password."
- IF account not found:
  - Return error code: AUTH_INVALID_CREDENTIALS
  - Display generic message: "Invalid email or password."

#### Session Management

WHEN a user successfully logs in:

- THE system SHALL:
  - Store the access token in localStorage
  - Store the refresh token in httpOnly cookie
  - Set HTTP cache headers to prevent caching: Cache-Control: no-cache, Pragma: no-cache
  - Redirect to todo list with 200 status

WHEN the access token expires:

- THE system SHALL return 401 Unauthorized status
- THE system SHALL attempt automatic token renewal using refresh token
- IF refresh token valid:
  - Generate new access and refresh tokens
  - Update httpOnly cookie
  - Refresh the page
- IF refresh token invalid:
  - Clear both tokens
  - Redirect to login page
  - Display message: "Your session expired. Please log in again."

WHEN a user manually logs out:

- THE system SHALL:
  - Remove access token from localStorage
  - Delete refresh token from httpOnly cookie
  - Redirect to landing page
  - Display: "You have been logged out."

WHEN a user attempts to access todo list while logged out:

- THE system SHALL:
  - Redirect to login page
  - Display: "Please log in to access your tasks."
  - Preserve the intended destination for redirect after login

### Todo List Access Flow

The todo list access flow ensures that each user can only access their own private todo items.

### Access Authorization

WHEN a logged-in user navigates to the todo list page:

- THE system SHALL:
  - Extract "sub" claim from JWT token
  - Query database for todos where user_id = "sub" value
  - Sort results by created_at ascending (oldest first)
  - Return array of todo items in JSON format
  - Return HTTP 200 OK

WHEN a user has no todo items:

- THE system SHALL return empty array
- THE system SHALL display message: "You have no tasks yet. Create your first task above!"

WHEN a user attempts to access another user's todo list:

- THE system SHALL:
  - Ignore any user_id provided in URL or request body
  - Use only "sub" from JWT token
  - Query database with correct user_id
  - Return empty array
  - Return HTTP 200 OK
- THE system SHALL log: "Unauthorized access attempt detected from user XYZ to list ABC"

WHEN database is unreachable during todo retrieval:

- THE system SHALL:
  - Return HTTP 503 Service Unavailable
  - Display message: "Could not load tasks. Please check your connection and try again."
  - Attempt automatic retry after 5 seconds
  - After 3 failed attempts, display: "We're having technical issues. Please try again later."

### Todo Item Creation Flow

The todo item creation workflow allows users to add new tasks to their personal list.

#### Task Creation Process

WHEN a user clicks the "Add Task" button:

- THE system SHALL display a modal or inline input field with placeholder: "What needs to be done?"
- THE system SHALL enable the "Save" button

WHEN a user enters text in the input field:

- THE system SHALL count characters (maximum 500)
- THE system SHALL disable "Save" button if text is empty or contains only whitespace
- THE system SHALL display character count: "123/500"

WHEN a user clicks "Save":

- THE system SHALL:
  - Validate text is not blank
  - Validate text is 500 characters or less
  - Sanitize text (remove HTML tags)
  - Send POST /api/todos with body {"title": "entered text"}

WHEN the API request succeeds:

- THE system SHALL:
  - Add new item to top of list
  - Clear input field
  - Display success message: "Task created!"
  - Animate item appearance

WHEN the API request fails:

- THE system SHALL:
  - Keep the input text
  - Display specific error message:
    - "Task title cannot be empty" → for blank input
    - "Task title cannot exceed 500 characters" → for over-length
    - "Failed to create task. Please try again." → for server error

WHEN a user uses keyboard to create a task:

- WHEN user types Enter in the input field:
  - THE system SHALL behave identically to clicking "Save"
  - THE system SHALL not insert line breaks

WHEN a user enters special characters, emoji, or non-Latin scripts:

- THE system SHALL: 
  - Accept and store all characters as-is
  - Preserve formatting and Unicode
  - Not apply encoding transformations

### Todo Item Completion Flow

The completion workflow allows users to mark tasks as finished, providing a sense of accomplishment.

#### Status Management

WHEN a user clicks the checkbox next to a todo item:

- THE system SHALL:
  - Toggle the "completed" property of that item
  - Send PATCH request to /api/todos/{id} with body {"completed": true/false}
  - Display small loading spinner next to checkbox
  - Disable the checkbox during update

WHEN the API response succeeds:

- THE system SHALL:
  - Update item's "completed" status in UI
  - Show strikethrough on completed items
  - Change text color to #888
  - Enable checkbox
  - Remove spinner

WHEN the API response fails:

- THE system SHALL:
  - Revert checkbox to previous state
  - Show error message: "Could not update task status. Please try again."
  - Enable checkbox
  - Remove spinner

WHEN a user refreshes the page:

- THE system SHALL:
  - Reload todo list from server
  - Restore exact completion status for all items
  - Preserve original creation timestamps

WHEN a user logs in from another device:

- THE system SHALL:
  - Sync todo completion status immediately after login
  - Display same completion state across all devices

### Todo Item Deletion Flow

The delete workflow removes unwanted tasks from a user's personal list.

#### Deletion Process

WHEN a user clicks the "Delete" button next to a todo item:

- THE system SHALL display a confirmation dialog with:
  - Message: "Are you sure you want to delete this task? This action cannot be undone."
  - "Delete" button
  - "Cancel" button

WHEN the user clicks "Delete":

- THE system SHALL send DELETE /api/todos/{id} request
- IF request succeeds:
  - Remove the item from the UI immediately
  - Show confirmation animation
  - Display success message: "Task deleted."
- IF request fails:
  - Display error: "Failed to delete task. Please try again."
  - Keep item in list

WHEN a user clicks "Cancel":

- THE system SHALL close the dialog
- THE system SHALL do nothing

WHEN a user attempts to delete a todo item that doesn't belong to them:

- THE system SHALL receive HTTP 403 response
- THE system SHALL log security event
- THE system SHALL display generic error: "Something went wrong. Please try again."

### User Logout Flow

The logout flow terminates the user's authenticated session and returns them to the anonymous guest state.

#### Session Termination

WHEN a user clicks the "Logout" button in the navigation menu:

- THE system SHALL:
  - Remove access token from localStorage
  - Delete refresh token from httpOnly cookie
  - Send GET /api/logout request (optional for server-side session cleanup)
  - Redirect to landing page
  - Display message: "You have been logged out."

WHEN a user refreshes the page after logout:

- THE system SHALL:
  - Detect no active session
  - Redirect to landing page
  - Hide all todo list functionality
  - Show only public content

WHEN a user navigates directly to todo list URL after logout:

- THE system SHALL:
  - Redirect to login page immediately
  - Store the attempted URL
  - Redirect to original URL upon successful login

WHEN the logout request fails due to connectivity issues:

- THE system SHALL:
  - Display message: "Could not log out. Please refresh the page."
  - Retain login session
  - Allow user to try logout again

## Business Rules and Security

### Data Validation Rules

- WHEN a user attempts to create a new todo item, THE system SHALL validate that the title field exists and contains non-whitespace characters
- WHEN a user attempts to create a new todo item, THE system SHALL validate that the title field contains at most 500 characters
- WHEN a user attempts to update a todo item, THE system SHALL validate the "completed" field is strictly boolean
- WHEN a user attempts to delete a todo item, THE system SHALL validate the ID parameter is a valid UUID v4 format
- WHEN a user attempts to register, THE system SHALL validate that the password is at least 12 characters and meets complexity requirements
- WHEN a user attempts to log in, THE system SHALL validate that both email and password are provided
- IF a todo item title contains only whitespace, THE system SHALL reject it with validation error
- IF a todo item ID format is malformed or not a valid UUID, THE system SHALL reject the request
- WHERE a todo item has an empty title, THE system SHALL prevent persistence

### Access Control Rules

- WHEN any user attempts to access a todo item, THE system SHALL verify the item's userId matches the authenticated user's userId
- WHILE a user is authenticated, THE system SHALL allow access only to todo items created by that specific user
- IF a user attempts to access a todo item belonging to another user, THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED
- IF a user attempts to update a todo item belonging to another user, THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED
- IF a user attempts to delete a todo item belonging to another user, THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED
- IF a user attempts to mark a todo item as complete belonging to another user, THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED
- WHILE a user is not authenticated, THE system SHALL block all access to todo list functionality and redirect to authentication page
- THE system SHALL never expose any todo item metadata (creation date, modification date, status) to users not owner of the item
- WHERE a user logs in, THE system SHALL return only the todo items belonging to that user
- WHERE a user performs any operation on a todo item, THE system SHALL ensure the operation is performed only on items where userId equals the authenticated user's userId

### Concurrent Access Rules

- WHILE multiple users access the system simultaneously, THE system SHALL ensure operations on todo items are isolated per user
- WHEN two users attempt to perform operations on the same todo item simultaneously, THE system SHALL ensure no interaction occurs because items belong exclusively to individual users
- WHILE a user modifies a todo item, THE system SHALL use database-level locking to prevent race conditions for that item's update
- WHEN a user updates a todo item, THE system SHALL use optimistic concurrency control by checking the item's version number against the stored version
- IF two users attempt to update the same todo item with the same version number, THE system SHALL reject the second update with error code CONCURRENT_UPDATE
- WHERE updates to todo items occur, THE system SHALL increment the item's version number after each successful modification
- IF a user refreshes their todo list, THE system SHALL always return the most recent version of each item as stored in the database

### Data Integrity Rules

- WHEN a user creates a new todo item, THE system SHALL automatically assign the item's userId to match the authenticated user's userId
- WHEN a user creates a new todo item, THE system SHALL set the createdAt timestamp to the current server time in ISO 8601 format
- WHEN a user updates a todo item, THE system SHALL update the updatedAt timestamp to the current server time in ISO 8601 format
- WHEN a user marks a todo item as complete, THE system SHALL set the completedAt timestamp to the current server time in ISO 8601 format
- WHEN a user marks a todo item as incomplete, THE system SHALL clear the completedAt timestamp
- IF a todo item is deleted, THE system SHALL permanently remove the item from the database with no possibility of recovery
- IF a user account is deleted, THE system SHALL cascade delete all todo items associated with that user
- WHERE a todo item exists, THE system SHALL guarantee that the userId field always references a valid existing user
- WHERE a todo item exists, THE system SHALL guarantee that the title field is never null or undefined
- WHERE a todo item exists, THE system SHALL guarantee that the isCompleted field is always a boolean value
- WHERE a todo item exists, THE system SHALL guarantee that the createdAt and updatedAt fields are valid ISO 8601 timestamps

### Error Handling Rules

- IF validation of a todo item title fails, THE system SHALL respond with HTTP 400 Bad Request and error code VALIDATION_TITLE_REQUIRED
- IF validation of a todo item ID fails, THE system SHALL respond with HTTP 400 Bad Request and error code VALIDATION_ID_INVALID
- IF authentication token is missing or malformed, THE system SHALL respond with HTTP 401 Unauthorized and error code AUTH_TOKEN_MISSING
- IF authentication token has expired, THE system SHALL respond with HTTP 401 Unauthorized and error code AUTH_TOKEN_EXPIRED
- IF a user attempts to access a non-existent todo item, THE system SHALL respond with HTTP 404 Not Found and error code ITEM_NOT_FOUND
- IF a user attempts an unauthorized operation on another user's todo item, THE system SHALL respond with HTTP 403 Forbidden and error code ACCESS_DENIED
- IF a user attempts a concurrent update on a todo item, THE system SHALL respond with HTTP 409 Conflict and error code CONCURRENT_UPDATE
- IF the database fails to connect or responds with error, THE system SHALL respond with HTTP 500 Internal Server Error and error code DATABASE_ERROR
- IF the system encounters an unexpected internal error, THE system SHALL respond with HTTP 500 Internal Server Error and error code SYSTEM_ERROR
- IF a user's authentication session is terminated by the system, THE system SHALL respond with HTTP 401 Unauthorized and error code SESSION_TERMINATED
- IF a request exceeds the rate limit of 100 requests per minute from a single IP, THE system SHALL respond with HTTP 429 Too Many Requests and error code RATE_LIMIT_EXCEEDED

## Security Requirements

### Authentication Security

#### Core Authentication Mechanism

- THE system SHALL use JWT (JSON Web Tokens) for all authenticated session management
- THE system SHALL reject all requests without valid authentication tokens
- THE system SHALL validate JWT signature, expiration, and issuer for every protected request
- THE system SHALL store JWT secret keys in environment variables with key rotation enabled

#### Token Structure

- THE system SHALL include the following claims in all JWT tokens:
  - "sub": the unique identifier of the authenticated user (UUID format)
  - "email": the verified email address of the user
  - "role": the actor type ("user", "admin")
  - "iat": issuance timestamp in seconds
  - "exp": expiration timestamp in seconds (15 minutes from issuance)
- THE system SHALL encode JWT claims using HS256 algorithm
- THE system SHALL never include sensitive user data (passwords, emails) in JWT payload

#### Login and Session Management

- WHEN a user submits valid credentials, THE system SHALL generate a JWT access token with 15-minute expiration and return it in HTTP response headers
- WHEN a user logs out, THE system SHALL invalidate the current session by removing the token from client storage
- WHEN a token expires, THE system SHALL return HTTP 401 Unauthorized status
- WHEN a user attempts to access protected resources with an invalid token, THE system SHALL return HTTP 401 Unauthorized status
- WHEN a user attempts to access protected resources with an expired token, THE system SHALL return HTTP 401 Unauthorized status
- WHEN system detects a compromised token signature, THE system SHALL invalidate all sessions for that user and return HTTP 401 Unauthorized status
- THE system SHALL NOT implement token refresh mechanism in version 1.0 (implemented via refresh token cookie)

#### Password Security

- WHEN a user registers with a password, THE system SHALL hash the password using bcrypt with cost factor of 12
- WHEN a user resets a password, THE system SHALL verify the current password or validate password reset token
- THE system SHALL require passwords to be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character
- THE system SHALL prevent password reuse by storing the last 5 hashed passwords and rejecting matches
- IF a user submits a password under 12 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_TOO_SHORT
- IF a user submits a password that doesn't meet complexity requirements, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_INVALID_COMPLEXITY

### Data Protection

#### Data Encryption

- WHEN user data is stored in the database, THE system SHALL encrypt all todo items, titles, and descriptions using AES-256-GCM encryption
- THE system SHALL use per-user encryption keys derived from user's password hash with HKDF-SHA256
- THE system SHALL store encryption keys separately from the encrypted data, in a dedicated key management service
- WHEN data is transmitted over networks, THE system SHALL use TLS 1.3 encryption for all communication
- THE system SHALL require HTTPS for all API endpoints with HSTS header enforcement

#### Data Isolation

- WHEN a user requests their todo list, THE system SHALL query the database using the authenticated user's ID as a filter condition
- IF a user attempts to access a todo list belonging to another user, THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED
- THE system SHALL implement row-level security in the database to prevent cross-user data access
- THE system SHALL validate all database queries for proper user context before execution
- THE system SHALL NOT allow any SQL queries that do not include user context filtering

#### API Security

- THE system SHALL apply rate limiting to all authentication endpoints (5 attempts per minute per IP)
- THE system SHALL implement CSRF protection for all state-changing operations
- THE system SHALL log all failed authentication attempts with timestamp, IP address, and user ID (if available)
- THE system SHALL never return detailed error messages that reveal system internals (e.g., "Invalid username" vs "Invalid credentials")
- WHEN an API endpoint receives malformed JSON payload, THE system SHALL return HTTP 400 Bad Request without exposing parsing details
- WHEN an API endpoint receives unsupported HTTP method, THE system SHALL return HTTP 405 Method Not Allowed

#### Secure Storage

- THE system SHALL store all user data in encrypted form at rest in the database
- THE system SHALL store sensitive configuration values (API keys, database credentials) in environment variables, never in code
- THE system SHALL avoid logging any PII (Personally Identifiable Information) or sensitive data
- THE system SHALL encrypt all backup files and rotate encryption keys periodically
- THE system SHALL implement secure deletion of any temporary files created during file uploads or processing

### Privacy Requirements

#### Data Minimization

- THE system SHALL collect only the minimum user data required for authentication and todo management: email, password hash, and todo list items
- THE system SHALL NOT collect any additional user metadata (location, device info, IP address for profiling)
- THE system SHALL NOT track user behavior or usage patterns beyond security logging
- THE system SHALL NOT use user data for advertising or third-party marketing purposes
- THE system SHALL provide users with a way to view and export their data upon request

#### User Rights

- WHEN a user requests deletion of their account, THE system SHALL permanently erase all personal data and todo items within 72 hours
- WHEN a user requests access to their data, THE system SHALL provide a downloadable JSON file containing all their todo items and account information
- WHEN a user requests correction of their data, THE system SHALL allow updates to their email and username (if verified)
- THE system SHALL inform users of their data rights in the privacy policy
- WHERE a user has requested data deletion, THE system SHALL confirm deletion completion via email

#### Anonymization

- THE system SHALL anonymize user data in analytics and monitoring systems by using pseudonymous identifiers
- THE system SHALL NOT associate server logs with individual users except for security investigations
- THE system SHALL ensure that error reporting does not include user identifiers unless specifically requested by the user
- THE system SHALL remove user identifiers from any data shared with external debugging or monitoring services

### Compliance Standards

#### Regulatory Requirements

- THE system SHALL comply with the General Data Protection Regulation (GDPR) for users in the European Union
- THE system SHALL comply with the California Consumer Privacy Act (CCPA) for users in California
- THE system SHALL comply with the Children's Online Privacy Protection Act (COPPA) by not collecting data from users under 13
- THE system SHALL implement data protection impact assessments for any new processing activities
- THE system SHALL designate a Data Protection Officer as required by GDPR

#### Security Frameworks

- THE system SHALL follow OWASP Top 10 security practices for web applications
- THE system SHALL implement NIST Cybersecurity Framework controls for authentication and data protection
- THE system SHALL conduct quarterly security audits of code and infrastructure
- THE system SHALL use only approved libraries and dependencies with known secure versions
- THE system SHALL require 2-factor authentication for admin account access

#### Audit and Monitoring

- THE system SHALL maintain an audit log of all security-relevant events: login attempts, password changes, data exports, account deletions
- THE system SHALL retain audit logs for at least 90 days
- THE system SHALL alert administrators of suspicious activity patterns (e.g., multiple failed logins from different locations)
- THE system SHALL support export of audit logs for regulatory compliance requests
- THE system SHALL implement intrusion detection monitoring on all backend services

### Data Retention Policy

#### Todo List Data

- WHEN a user account is active, THE system SHALL retain all todo list data indefinitely
- WHEN a user account is deleted, THE system SHALL permanently delete all associated todo lists and items immediately
- THE system SHALL NOT archive or backup deleted user data under any circumstances
- IF a user temporarily disables their account, THE system SHALL preserve all data for up to 180 days before permanent deletion
- WHERE a user reactivates a disabled account, THE system SHALL restore all previously saved todo lists and items

#### Authentication Data

- THE system SHALL store user account information (email, hashed password) for as long as the account exists
- THE system SHALL erase authentication data immediately upon account deletion
- THE system SHALL retain email verification tokens for 24 hours and then delete them
- THE system SHALL retain password reset tokens for 1 hour and then delete them

#### System Logs

- THE system SHALL retain server access logs for 90 days
- THE system SHALL retain security audit logs for 180 days
- THE system SHALL retain application error logs for 30 days
- THE system SHALL automatically purge logs older than retention periods without manual intervention

#### Data Backup Retention

- THE system SHALL create daily encrypted backups of database content
- THE system SHALL retain daily backups for 30 days
- THE system SHALL retain weekly backups for 12 weeks
- THE system SHALL retain monthly backups for 12 months
- THE system SHALL store all backup files in encrypted form in geographically separate locations

#### Data Deletion Procedures

- WHEN a user requests data deletion, THE system SHALL:
  1. Mark account for deletion
  2. Schedule deletion for within 72 hours
  3. Notify user of scheduled deletion
  4. Execute complete deletion of all data including backups
  5. Send confirmation email of completion
- WHEN system performs automatic data purging, THE system SHALL:
  1. Verify data age meets retention policy
  2. Validate encryption status of data
  3. Perform secure erasure using NIST 800-88 standards
  4. Log deletion event for audit purposes
  5. Update storage metrics accordingly

## System Context

### System Boundaries

The Todo List application has clearly defined boundaries to maintain focus and security:

- **Internal Components**:
  - User registration/login system
  - JWT authentication engine
  - Encrypted database storage
  - API endpoints for todo list CRUD operations
  - Email verification service

- **External Dependencies**:
  - Email service provider (for verification emails)
  - Cloud storage for backups (encrypted)
  - Security monitoring tools (for audit logs)
  - CDN for static assets (CSS, JS, images)

- **External Exclusions**:
  - No social sharing
  - No email notifications (except verification)
  - No calendar integration
  - No task collaboration
  - No tagging or categorization
  - No search or filtering beyond simple list view

### Architecture Assumptions

- **Technology Stack**:
  - Frontend: React.js with TypeScript
  - Backend: NestJS with TypeScript
  - Database: PostgreSQL with row-level security
  - Encryption: AES-256-GCM for data at rest, TLS 1.3 for data in transit
  - Authentication: JWT with refresh token in httpOnly cookie
  - Deployment: Docker containers on Kubernetes cluster
  - Security: AWS KMS for key management, Cloudflare for DDoS protection

- **Scalability**: The system is designed to support 10,000 concurrent users with response times under 500ms for all operations

- **Availability**: Target uptime of 99.9% with automatic failover between data centers

- **Disaster Recovery**: Daily encrypted backups retained for 30 days, with geo-redundant storage

### Deployment Scenarios

- **Primary Deployment**: Production environment on secure cloud infrastructure
- **Developer Environment**: Local Docker containers with sample test data
- **Staging Environment**: Mirror of production with restricted data access
- **CI/CD Pipeline**: Automated testing and deployment triggered by Git commits

### Regulatory Implications

- As a privacy-focused service collecting minimal user data, the application is designed to minimize regulatory burden
- The system complies with GDPR's data minimization principle
- Explicit consent is obtained through registration
- Data subjects have clear rights to access, correct, and delete their data
- No profiling or automated decision-making is implemented
- Data transfers outside EU/EEA use appropriate safeguards

> *This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*