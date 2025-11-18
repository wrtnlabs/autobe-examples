# Todo List Application Requirements Analysis

## Service Overview

The Todo List application is a minimal, single-user task management system designed for individuals who need to organize daily tasks without complexity. The system enables users to create, mark as completed, edit, and delete personal to-do items. All data is private and persisted per user account. There are no team features, shared lists, categories, priorities, reminders, or integrations.

## User Actors and Permissions

The system has two user actors:

### Guest
- Can visit the public landing page
- Can initiate registration
- Cannot access any todo functionality
- Cannot view or interact with any data
- Can attempt login with unverified email

### Member
- Has completed email verification
- Can authenticate via email and password
- Can create, read, update, delete personal todo items
- Can toggle completion status of their own items
- Can log out and end session
- Cannot access other users' data
- Cannot perform administrative actions

Access control is enforced at the server level: every request must include a valid, unexpired JWT token containing the user's unique ID. All data queries are filtered by this user ID.

## Functional Requirements

### Todo Item Creation
WHEN a member clicks the "Add Todo" button, THE system SHALL display a text input field with placeholder: "What needs to be done?"

WHEN a member enters at least one non-whitespace character and submits the form, THE system SHALL create a new todo item with the following properties:
- title: string, trimmed and non-empty
- completed: false
- createdAt: ISO 8601 UTC timestamp
- updatedAt: ISO 8601 UTC timestamp
- userId: the authenticated member’s unique ID

IF the submitted title is empty or contains only whitespace, THEN THE system SHALL display an error: "Please enter a task description."

IF the submitted title exceeds 200 characters, THEN THE system SHALL display an error: "Task description cannot exceed 200 characters."

WHEN the todo item is successfully created, THE system SHALL append the new item to the top of the todo list and clear the input field.

### Todo Item Retrieval
WHEN a member accesses their dashboard, THE system SHALL retrieve all undeleted todo items belonging to their authenticated user ID.

WHEN retrieving todo items, THE system SHALL sort them by createdAt timestamp in descending order (newest first).

IF no todo items exist for the member, THE system SHALL display an empty list with message: "You have no tasks. Add one to get started."

### Todo Item Update
WHEN a member double-clicks the title of a todo item, THE system SHALL replace the static display with an editable text field prefilled with the current title.

WHEN a member modifies the title in the edit field and presses Enter or clicks "Save", THE system SHALL submit the updated title for validation.

IF the new title is empty or contains only whitespace, THEN THE system SHALL revert the change, display a notification: "Task cannot be empty.", and remain in edit mode.

IF the new title exceeds 200 characters, THEN THE system SHALL truncate the input to 200 characters and display a notification: "Title was truncated to 200 characters."

WHEN the updated title passes validation, THE system SHALL update the item’s title and updatedAt fields, exit edit mode, and render the new title.

### Todo Item Deletion
WHEN a member clicks the "Delete" button next to a todo item, THE system SHALL display a confirmation dialog: "Are you sure you want to delete this task? This cannot be undone."

WHEN a member confirms deletion, THE system SHALL mark the item as "deleted" by setting a soft-delete flag (`deletedAt`) to the current ISO 8601 UTC timestamp.

WHEN a member cancels deletion, THE system SHALL close the confirmation dialog and preserve the item unchanged.

### Todo Item Status Management
WHEN a member clicks the checkbox next to a todo item, THE system SHALL toggle the item’s `completed` status from true to false, or false to true.

WHEN an item is marked completed, THE system SHALL update the `updatedAt` timestamp and set `completed` to `true`.

WHEN an item is marked uncompleted, THE system SHALL update the `updatedAt` timestamp and set `completed` to `false`.

WHEN a todo item’s status changes, THE system SHALL immediately update the UI without requiring a page refresh.

WHILE a member views their todo list, THE system SHALL display a summary at the top: "X of Y tasks completed" where X is the count of completed items and Y is the total number of items belonging to the member.

### Duplicate Prevention
WHERE a member attempts to create a todo item with the same title and content as an existing active item in their list, THEN THE system SHALL display a notification: "You already have this task in your list."

### Edit Timeout
WHILE a member is in edit mode for more than 3 minutes without saving, THE system SHALL cancel the edit and revert to the original state with a notification: "Edit canceled due to inactivity."

## Authentication Workflow

### Registration
WHEN a guest enters a valid email address and password in the registration form, THE system SHALL validate the input format and submit the registration request.

IF the email address is already registered, THEN THE system SHALL display an error message: "An account with this email already exists. Please log in or use another email."

IF the password does not meet minimum security requirements (at least 8 characters), THEN THE system SHALL display an error message: "Password must be at least 8 characters long."

WHEN the registration request is successfully processed, THE system SHALL send a verification email to the provided address and display a success message: "Check your email to verify your account."

### Email Verification
WHILE a guest has not verified their email, THE system SHALL prevent access to any todo functionality and display a persistent banner: "Your account is pending email verification. Please check your inbox."

### Login
WHEN a member enters their registered email and password in the login form, THE system SHALL authenticate the credentials against the stored records.

IF the email is not found, THEN THE system SHALL display an error message: "No account found with this email. Please register or check your input."

IF the password does not match the stored hash, THEN THE system SHALL display an error message: "Incorrect password. Please try again or reset your password."

WHEN authentication succeeds, THE system SHALL generate a short-lived JWT access token with the payload structure: {"userId": "string", "role": "member"} and set it in an httpOnly, secure cookie.

WHEN a member successfully logs in, THE system SHALL redirect them to the dashboard view of their todo list.

### Session Management
WHILE a member is actively using the system, THE system SHALL silently refresh the access token every 10 minutes if no other activity has occurred during that period.

### Logout
WHEN a member clicks the "Log Out" button, THE system SHALL destroy the active session, clear the JWT cookie, and redirect to the public landing page.

### Session Expiration
WHILE a member’s access token has expired (after 15 minutes of inactivity), THE system SHALL automatically redirect them to the login page and display a message: "Your session expired. Please log in again."

### Concurrent Session Restriction
WHERE a member logs in from a second device, THE system SHALL invalidate the first device’s session token and display a notification on the first device: "You have been logged out because you signed in elsewhere."

### Abandoned Registration
WHILE a guest has initiated registration but has not completed email verification for more than 7 days, THE system SHALL automatically delete the unverified account and discard all associated data.

### Logout Error
IF the logout request fails due to server error, THEN THE system SHALL retain the active session, display an error banner: "Failed to log out. Please try again later.", and provide a retry button.

## Error Handling

### Validation Errors
WHEN a client submits invalid data (empty title, password too short, etc.), THE system SHALL return a 400 Bad Request with a clear human-readable error message in the response body.

### Authentication Failure
WHEN a request is made without a valid token, or with an expired token, THE system SHALL return a 401 Unauthorized response.

### Resource Not Found
WHEN a member attempts to update or delete a todo item that does not belong to them, THE system SHALL return a 404 Not Found response.

### Duplicate Creation
WHEN a member attempts to create a duplicate todo item, THE system SHALL return a 409 Conflict response with message: "You already have this task in your list."

### Server Error
WHEN an internal server error occurs, THE system SHALL return a 500 Internal Server Error with generic message: "An unexpected error occurred. Please try again."

## Business Rules

### Todo Item Validation
- Title must be between 1 and 200 characters
- Title must contain at least one non-whitespace character
- Created items must have a valid userId
- Item cannot be created with duplicate title

### Status Transitions
- Items can be toggled between completed and uncompleted states
- Only members can change item status
- Status changes trigger a timestamp update

### Soft Delete
- Deleting an item sets `deletedAt` timestamp instead of permanent removal
- Items with `deletedAt` older than 30 minutes are permanently purged
- Items with `deletedAt` within 30 minutes can be restored

### Data Retention
- Unverified accounts are automatically deleted after 7 days
- Soft-deleted items are permanently removed after 30 days
- User data is retained indefinitely while account is active

### Session Policies
- Access tokens expire after 15 minutes of inactivity
- Session refresh triggers every 10 minutes of inactivity
- Concurrent sessions invalidate previous sessions
- Sessions are destroyed on explicit logout

## Performance Expectations

### Response Times
- Login: < 1 second
- Todo list retrieval: < 1 second (for up to 100 items)
- Todo creation: < 1 second
- Todo update: < 1 second
- Todo deletion: < 1 second

### Scalability
- System must support 100,000 concurrent active users
- Database queries must use indexed lookups by userId
- No full-table scans permitted

## Security and Compliance

### Data Protection
- User passwords must be hashed with bcrypt (cost 12)
- Authentication tokens must be signed with HS256 algorithm
- Token must contain only userId and role
- JWT must be stored in httpOnly, secure, same-site=strict cookie
- All data is stored encrypted at rest

### Privacy
- No personal data is shared with third parties
- No external tracking or analytics are implemented
- Users can delete their account and all associated data

### Compliance
- System complies with GDPR standards for user data handling
- Email addresses are stored in a separate encrypted field
- User consent is implied by registration
- No child data is collected (users must be 13+)

## Conclusion

This document defines the complete business requirements for a minimalist Todo List application. All functionality is scoped to the core use case: create, manage, and complete personal tasks. Authentication is simple and secure, with clear session management policies. Data persistence follows a soft-delete pattern to allow recovery while preserving storage efficiency.

No UI components, API endpoint definitions, or database schema designs are included here — those belong in later pipeline phases. This document provides the complete business context and requirements for a backend developer to build the system.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*