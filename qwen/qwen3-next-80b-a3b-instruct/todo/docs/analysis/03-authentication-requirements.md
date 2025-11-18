# Todo List Application Requirements Specification

## Service Overview

The Todo List application is a personal task management tool designed for individuals seeking a simple, focused way to track daily responsibilities. The service exists to solve the ubiquitous problem of information overload and forgotten tasks by providing a streamlined, distraction-free interface that enables users to capture, organize, and complete tasks with minimal friction.

The target user is a tech-savvy individual aged 18-45 who uses digital tools for organization but rejects complex task management systems. This user values simplicity, speed, and reliability over feature proliferation. They manage personal productivity, household chores, study schedules, or small work projects, and require a solution that works instantly without learning curves.

Success is measured by daily active users, task completion rate (number of tasks marked complete divided by number created), user retention after 30 days, and average daily tasks created per user. The application achieves success when users consistently return to it as their primary task management system.

## Business Model

This application exists because modern life demands a simple, reliable personal organization tool that works everywhere without requiring subscriptions, advertisements, or complex workflows. Competing applications have become bloated with productivity hacks, team collaboration features, and gamification that distracts from core task management.

The core value proposition is: **Complete, distraction-free task management in under 5 seconds per action.** Users can create, view, complete, or delete tasks with a single click or keystroke, with no menus, no settings, and no onboarding.

Revenue strategy is based on a premium feature: optional cloud sync across devices using the same email account. The free tier supports local storage on the device only, while the premium tier ($1.99/month or $19.99/year) enables synchronized task lists across all user devices. This model ensures the base product remains free and accessible while generating sustainable revenue from users who need cross-device access.

Growth is achieved through organic discovery through word-of-mouth, minimalist marketing emphasizing simplicity, and visibility on app stores with a compelling one-sentence description: "Your thoughts. Your tasks. Zero clutter."

Success metrics include:
- 15% conversion rate from free to premium users
- 40% daily active users among registered users
- Less than 1% churn rate after 90 days
- Average session duration over 2 minutes

## User Actors

### User
- **Description**: The primary and only actor in the system. This is an individual person who creates, views, completes, and deletes their own personal tasks.
- **Permissions**: Can perform all CRUD operations (Create, Read, Update, Delete) on their own tasks. Cannot view, edit, or delete any other user's tasks. Cannot access administrative functions or system settings.
- **Authentication**: Uses email and password to establish identity. Session is represented by a JWT stored in localStorage on user's device.
- **Scope**: Exclusively limited to their personal task data. No sharing, collaboration, or multi-account functionality.

## Functional Requirements

### Task Creation Requirements

WHEN a user clicks the "Add Task" button, THE system SHALL display a text input field with placeholder text: "What needs to be done?"

WHEN a user types text into the task input field and presses Enter, THE system SHALL create a new task with the following properties:
- description: The exact text entered by the user (trimmed of leading/trailing whitespace)
- completed: false (initial state)
- createdAt: Timestamp in ISO 8601 format (e.g., "2025-11-18T08:44:04.104Z")
- updatedAt: Same as createdAt (initial value)

WHEN a user submits an empty task description (only whitespace), THE system SHALL NOT create a task and SHALL display: "Your task can't be empty. Write something first."

WHEN a user submits a task description exceeding 500 characters, THE system SHALL NOT create a task and SHALL display: "Tasks must be 500 characters or fewer."

WHEN a user successfully creates a task, THE system SHALL add the new task to the top of the task list and clear the input field.

WHEN the user is offline and attempts to create a task, THE system SHALL store the task in local cache and display: "Task saved locally. Will sync when back online."

WHEN the application syncs to the server after reconnection, THE system SHALL attempt to create the task on the server. If server rejects due to authentication error, THE system SHALL display: "Unable to sync task. Please log in again."

### Task Display Requirements

WHEN a user successfully logs in, THE system SHALL fetch all tasks belonging to the authenticated user from the server and display them in a list.

THE default order of tasks SHALL be: newest tasks at the top, oldest at the bottom, sorted by createdAt timestamp descending.

THE system SHALL display a maximum of 15 tasks at a time. Tasks beyond the first 15 are hidden but accessible via "Load More" button.

WHEN a task is marked as completed, THE system SHALL visually indicate completion by:
- Strikethrough of the task text
- Graying the text color to #999
- Adding a checkbox icon to the left of the task (✅)

WHEN a task has no description (should not occur due to validation), THE system SHALL display: "[Empty task]" as a placeholder.

THE system SHALL display a counter at the top of the task list showing: "X tasks | Y completed" where X is total tasks and Y is completed tasks.

THE system SHALL update this counter in real-time as tasks are added, completed, or deleted.

### Task Completion Requirements

WHEN a user clicks on a task that is not completed, THE system SHALL toggle the task's "completed" field to true.

WHEN a task is marked as completed, THE system SHALL update the updatedAt field to the current timestamp in ISO 8601 format.

WHEN a task is marked as completed, THE system SHALL immediately update the visual appearance as described in "Task Display Requirements" (strikethrough, color change, checkbox icon).

WHEN the user clicks a completed task, THE system SHALL toggle the task's "completed" field to false, removing the visual indicators of completion.

WHEN a task is changed from incomplete to complete or vice versa, THE system SHALL immediately send a PATCH request to the server to update the task.

WHEN the user is offline and toggles task completion state, THE system SHALL cache the change locally and display: "Status updated locally. Will sync when back online."

WHEN the application syncs to the server after reconnection, THE system SHALL send the updated task state. If server rejects due to authentication error, THE system SHALL display: "Unable to sync task status. Please log in again."

### Task Deletion Requirements

WHEN a user hovers over a task, THE system SHALL display a small "×" (delete) button on the right side of the task item.

WHEN a user clicks the delete button on a task, THE system SHALL display a confirmation dialog with the message: "Are you sure you want to delete this task permanently? This cannot be undone."

WHEN a user clicks "Cancel" on the confirmation dialog, THE system SHALL do nothing and close the dialog.

WHEN a user clicks "Delete" on the confirmation dialog, THE system SHALL immediately remove the task from the UI and send a DELETE request to the server.

WHEN the task deletion request succeeds on the server, THE system SHALL permanently remove the task from local state and再也没有恢复方式.

WHEN the task deletion request fails on the server (e.g., network error, authentication error), THE system SHALL reinstate the task in the UI with its previous state and display: "Failed to delete task. Please try again."

WHEN the user is offline and deletes a task, THE system SHALL remove the task from the local display and cache the delete operation. THE system SHALL display: "Task marked for deletion. Will sync when back online."

WHEN the application syncs to the server after reconnection, THE system SHALL send the delete operation. If server rejects (e.g., user not authenticated), THE system SHALL reinstate the task in local display and show: "Unable to delete task. Please log in again."

WHEN a task is deleted, THE system SHALL immediately update the task counter at the top of the list.

## Authentication Requirements

### Core Authentication Functions

WHEN a user accesses the Todo List application for the first time, THE system SHALL require the user to register with a valid email address and a password of at least 8 characters.

WHEN a user attempts to log in, THE system SHALL accept only an email address and password combination that matches a registered account.

WHEN a user successfully authenticates, THE system SHALL generate a JSON Web Token (JWT) containing the user's unique identifier and role in the payload.

WHEN a user successfully logs in, THE system SHALL store the access token in the browser's localStorage and include it in the Authorization header of all subsequent API requests.

WHEN a user visits the application and an access token exists in localStorage, THE system SHALL send that token to the backend to validate the session.

WHEN the backend validates a JWT access token, THE system SHALL allow the user to proceed to the task list interface.

WHEN a user intentionally logs out, THE system SHALL remove the access token from localStorage and terminate the active session.

WHEN the access token expires (after 15 minutes of inactivity), THE system SHALL redirect the user to the login screen and require re-authentication.

WHEN a user forgets their password, THE system SHALL allow them to initiate a password reset by entering their registered email address.

WHEN a user initiates a password reset request, THE system SHALL send a one-time reset link to the registered email address with a 1-hour expiration.

WHEN a user clicks a valid password reset link, THE system SHALL present a form to set a new password of at least 8 characters.

WHERE the user has a valid JWT access token, THE system SHALL allow access to all task management operations (create, view, update, delete).

WHILE a user is authenticated, THE system SHALL maintain their session and allow uninterrupted access to their personal todo items.

IF a user tries to access the Todo List interface without a valid token, THEN THE system SHALL redirect them to the login page with a message: "You must be logged in to view your tasks."

IF a user enters an incorrect email or password, THEN THE system SHALL display: "Invalid email or password. Please try again."

IF a user tries to register with an email address already in use, THEN THE system SHALL display: "An account with this email already exists. Please log in or use a different email."

IF a user submits an empty email field, THEN THE system SHALL display: "Email is required."

IF a user submits a password less than 8 characters, THEN THE system SHALL display: "Password must be at least 8 characters long."

IF the server fails to issue a token due to technical error, THEN THE system SHALL display: "Unable to authenticate at this time. Please try again later."

IF a password reset link is expired, THEN THE system SHALL display: "This password reset link has expired. Please request a new one."

IF a password reset link is invalid or malformed, THEN THE system SHALL display: "This reset link is not valid. Please request a new one."

IF a user tries to access their tasks after 30 days of inactivity, THEN THE system SHALL require them to log in again (even if access token is still in localStorage).

### User Session Management

THE system SHALL use JSON Web Tokens (JWT) as the sole authentication mechanism for all user sessions.

THE access token SHALL have an expiration of exactly 15 minutes from issuance.

THE refresh token SHALL NOT be implemented; authentication SHALL be re-established through email and password upon token expiration.

The JWT payload SHALL include exactly two fields: "userId" (string) and "role" (string with value "user").

THE secret key for JWT signing SHALL be securely stored in the backend environment variables.

THE system SHALL reject all tokens that are malformed, expired, or signed with an invalid secret.

THE system SHALL not store tokens on the server-side — all session state SHALL be contained within the signed JWT.

WHEN a user logs in successfully, THE system SHALL NOT set any HTTP-only cookies — authentication SHALL be handled exclusively by localStorage-based JWT.

WHEN the user closes the browser or tab, THE system SHALL NOT automatically log them out — the token in localStorage SHALL persist until expiration or manual logout.

WHILE the user is logged in, THE system SHALL allow access to all personal todo items regardless of device or browser, provided the same email address is used.

### Authentication Errors and Recovery

WHEN the user attempts to authenticate with a valid email but invalid password, THE system SHALL respond with HTTP 401 Unauthorized and display the message: "Invalid email or password. Please try again."

WHEN the user attempts to authenticate with an email that does not exist in the system, THE system SHALL respond with HTTP 401 Unauthorized and display the message: "Invalid email or password. Please try again."

WHEN the email field is submitted in an invalid format (e.g., missing @, no domain), THE system SHALL display: "Please enter a valid email address."

WHEN the password field is empty during login or registration, THE system SHALL display: "Password cannot be empty."

WHEN the server returns a 500 error during authentication (e.g., database failure), THE system SHALL display: "Authentication service is temporarily unavailable. Please try again later."

WHEN the password reset email cannot be delivered due to an invalid email format, THE system SHALL display: "We cannot send a reset link to this email address. Please check the address and try again."

WHEN a user submits a password reset request but their email does not exist in the system, THE system SHALL display: "We cannot find an account with that email address. Please check the address and try again."

WHEN the browser refuses to save the token to localStorage (e.g., in private mode or blocked by extension), THE system SHALL display: "We are unable to store your login information. Please disable strict privacy mode or ad blockers and try again."

IF the user enters a new password during reset that does not meet the 8-character minimum, THEN THE system SHALL display: "New password must be at least 8 characters long."

IF the user submits two mismatched passwords during a new password creation, THEN THE system SHALL display: "New passwords do not match. Please try again."

IF the user refreshes the page during password reset after entering the new password but before submission, THEN THE system SHALL invalidate the reset token and require the user to request a new reset link.

THE system SHALL always validate the user's identity through JWT token on every request to any task-related endpoint.

THE system SHALL never allow a user to view, edit, or delete another user's tasks—even if someone manipulates the JWT payload manually.

WHEN a user is present and actively using the system, THE system SHALL not terminate their session before 15 minutes of inactivity.

WHEN a user is inactive for 15 minutes and returns to the application, THE system SHALL automatically log them out and redirect to the login screen with the message: "Your session has expired. Please log in to continue."

WHEN a user attempts to register, log in, or reset password on a slow network connection, THE system SHALL still respond within 2 seconds with either success or validation error—never timeout or hang.

WHEN the backend receives a request with an invalid or malformed JWT, THE system SHALL immediately reject it with HTTP 401 and no additional details to prevent token probing attacks.

THE system SHALL NOT store or log the raw password in any form — only hashed representations shall be persisted.

THE system SHALL NOT support email-only login, social login, or third-party authentication—email and password are the only supported methods.

WHERE a user has no active session, THE system SHALL only allow access to the login and registration pages.

WHILE a password reset email is pending delivery, THE system SHALL show: "We've sent a reset link to your email. Please check your inbox (and spam folder) and click the link within an hour."

WHEN a user successfully completes a password reset, THE system SHALL automatically authenticate them and redirect to the task list.

WHEN a user successfully logs out, THE system SHALL display: "You have been logged out successfully."

WHEN a user successfully registers a new account, THE system SHALL automatically log them in and redirect to the task list with the message: "Welcome! Your account has been created."

WHEN a user first logs in, THE system SHALL require them to complete the entire login flow—no automatic account recovery or guest access is permitted.

## User Flow

### User Journey Overview

The complete user interaction flow begins at the login screen and ends with task management. The lifecycle includes authentication, task creation, viewing, completion, deletion, and logout.

### Step 1: User Accesses the Application

WHEN a user opens the application URL in their browser, THE system SHALL check for a valid JWT token in localStorage.

If a valid token exists:
- THE system SHALL attempt to validate it with the server
- If validation succeeds, THE system SHALL proceed to the task list screen
- If validation fails (expired, invalid, revoked), THE system SHALL redirect to login screen with message: "Your session has expired. Please log in again."

If no token exists:
- THE system SHALL display the login screen with email and password fields

### Step 2: Viewing the Todo List

WHEN a user is authenticated and redirects to the task list:
- THE system SHALL display the task counter at the top: "X tasks | Y completed"
- THE system SHALL display a list of tasks with the newest at the top
- THE system SHALL display a "Add Task" button below the task list
- THE system SHALL display a text input with placeholder: "What needs to be done?"

As the user views tasks:
- Hovering over a task SHALL display the "×" delete button on the right
- DOM scroll interaction SHALL load additional tasks via "Load More" button if more than 15 exist

### Step 3: Creating a New Task

WHEN a user clicks into the task input field:
- THE keyboard SHALL open if on mobile
- THE placeholder text SHALL disappear

WHEN a user types their task description and presses Enter:
- THE system SHALL validate input length (≤500 characters, not empty)
- IF validation fails, THE system SHALL display an error message and focus remains on the input
- IF validation passes, THE system SHALL create the task, add it to the top of the list, and clear the input field

### Step 4: Marking a Task as Completed

WHEN a user clicks on an incomplete task:
- THE system SHALL toggle the task's completed state to true
- THE system SHALL update visually: strikethrough, gray text color, ✅ icon
- THE system SHALL send an API PATCH request to update server state
- IF offline, THE change SHALL be cached and a sync message shown

WHEN a user clicks on a completed task:
- THE system SHALL toggle the task's completed state to false
- THE system SHALL remove the visual completion indicators
- THE system SHALL send an API PATCH request to update server state
- IF offline, THE change SHALL be cached and a sync message shown

### Step 5: Deleting a Task

WHEN a user hovers over a task:
- THE delete button (×) SHALL appear on the right side

WHEN a user clicks the delete button:
- THE system SHALL display a confirmation dialog with message: "Are you sure you want to delete this task permanently? This cannot be undone."
- The dialog SHALL have two buttons: "Cancel" and "Delete"

WHEN a user clicks "Cancel":
- THE dialog SHALL close and task remains unchanged

WHEN a user clicks "Delete":
- THE system SHALL remove the task from the visible list immediately
- THE system SHALL send a DELETE API request to the server
- IF the request succeeds, THE task SHALL be permanently deleted
- IF the request fails, THE task SHALL be restored to the list and an error message shown
- IF offline, THE deletion SHALL be cached and a sync message shown

### Step 6: Logging Out

WHEN a user clicks the "Log out" button:
- THE system SHALL remove the JWT token from localStorage
- THE system SHALL clear the user's task list from the UI
- THE system SHALL display a confirmation message: "You have been logged out successfully."
- THE system SHALL redirect the user to the login screen

## Error Handling Requirements

### Input Validation Errors

TASK CREATION:

WHEN task description is blank:
- ERROR: "Your task can't be empty. Write something first."

WHEN task description exceeds 500 characters:
- ERROR: "Tasks must be 500 characters or fewer."

REGISTER:

WHEN email field is empty:
- ERROR: "Email is required."

WHEN email is invalid format:
- ERROR: "Please enter a valid email address."

WHEN password is empty:
- ERROR: "Password cannot be empty."

WHEN password is less than 8 characters:
- ERROR: "Password must be at least 8 characters long."

WHEN email is already registered:
- ERROR: "An account with this email already exists. Please log in or use a different email."

PASSWORD RESET:

WHEN form submitted with invalid email:
- ERROR: "We cannot find an account with that email address. Please check the address and try again."

WHEN new password is less than 8 characters:
- ERROR: "New password must be at least 8 characters long."

WHEN confirm password does not match new password:
- ERROR: "New passwords do not match. Please try again."

LOGIN:

WHEN user inputs email/password that doesn't match any account:
- ERROR: "Invalid email or password. Please try again."

WHEN user tries to access tasks without valid token:
- ERROR: "You must be logged in to view your tasks."

### Authentication Errors

WHEN token is expired (15 minutes inactivity):
- ERROR: "Your session has expired. Please log in to continue."

WHEN server rejects JWT as invalid or tampered:
- ERROR: "Authentication failed. Please log in again."

WHEN user is logged out from another device:
- ERROR: "Your session has been terminated on another device. Please log in again."

WHEN user tries to perform action while offline:
- ERROR: "Internet connection lost. Action will sync when online."

### System-Level Errors

WHEN server is unreachable:
- ERROR: "No internet connection. Please check your network and try again."

WHEN server returns 500 error:
- ERROR: "The server is experiencing an issue. Please try again later."

WHEN server returns 502 or 503 error:
- ERROR: "Service temporarily unavailable. Please try again later."

WHEN localStorage is full or blocked:
- ERROR: "We are unable to store your login information. Please disable strict privacy mode or ad blockers and try again."

WHEN JWT generation fails on server:
- ERROR: "Unable to authenticate at this time. Please try again later."

WHEN password reset email fails to send:
- ERROR: "We were unable to send a password reset link. Please try again later."

### User-Facing Error Messages

All error messages displayed to the user SHALL:
- Be written in plain, natural language
- Include no technical terms (e.g., "401 Unauthorized")
- Provide clear action to resolve the issue
- Be displayed prominently in a standardized alert UI component
- Disappear automatically after 5 seconds unless the user interacts with another element
- Appear in red text with a warning icon
- Not include the actual error code or technical details from the backend

## Performance Expectations

### Task Creation Response Time

WHEN a user submits a new task:
- THE system SHALL display a visual indicator (loading spinner) immediately
- THE system SHALL complete the operation and update the UI within 500ms on good network conditions
- THE system SHALL respond with error or success within 2 seconds even on slow networks
- Response times are calculated from user input to UI update, not server response time

### Task List Loading Time

WHEN a user logs in or refreshes the page:
- THE system SHALL display a loading indicator
- THE system SHALL render the first 15 tasks within 1 second on a 4G connection
- THE system SHALL fetch and display the remaining tasks (if any) as the user scrolls
- Total loading time for first 15 tasks shall not exceed 1.5 seconds on Wi-Fi

### Task Status Update Speed

WHEN a user toggles task completion:
- THE system SHALL update the visual state immediately (client-side optimistic update)
- THE system SHALL send the PATCH request and wait for server confirmation
- THE system SHALL revert the change on server failure
- Time taken from user click to UI update shall be less than 300ms

### Deletion Response Time

WHEN a user clicks delete:
- THE system SHALL show confirmation dialog within 100ms
- THE system SHALL visually remove task immediately upon confirmation
- THE system SHALL send request and show error if failed
- Deletion confirmation to server shall complete in under 1 second

### Overall App Responsiveness

The application SHALL feel "instant" to the user:

- All interactions shall respond within 500ms flat
- No screens shall be blank for more than 1.5 seconds
- All animations and transitions shall be smooth (60fps)
- Keyboard input shall have no perceptible delay
- Navigation between login and task list shall be seamless

The application SHALL continue to function correctly on:
- Mobile devices with 1GB RAM
- Browsers with JavaScript disabled (via fallback) — not applicable
- Network speeds as low as 100kbps
- Offline mode caching

## Document Structure and Cross-References

This document is the authoritative source of requirements for the Todo List application.

It relates to other project documents as follows:

- **00-toc.md**: Table of contents for project documentation
- **01-business-model.md**: Provides context for why this application exists
- **02-primary-user-flow.md**: Describes the high-level user journey (this document provides detailed implementation requirements)
- **03-authentication-requirements.md**: Contains detailed requirements for the authentication system used in this application
- **04-create-task-requirements.md**: Details the task creation logic already included here
- **05-view-tasks-requirements.md**: Details task display logic already included here
- **06-complete-task-requirements.md**: Details task completion logic already included here
- **07-delete-task-requirements.md**: Details task deletion logic already included here
- **08-error-handling-requirements.md**: Lists all user-facing error messages already included here
- **09-performance-expectations.md**: Defines response time requirements already included here

All related documents are fully referenced and integrated. This document is standalone and self-contained — it contains all information required for development.

## Constraints

- **Minimum Viable Product (MVP)**: The application implements ONLY the features described in this document. No collaborative features, no categories, no tags, no reminders, no priorities, no recurring tasks.
- **Technology Restrictions**: The frontend SHALL be built with HTML/CSS/Typescript (no frameworks), with a single-page application architecture. Backend SHALL be TypeScript/NestJS/Prisma. Database SHALL be PostgreSQL.
- **Non-functional Constraints**:
  - Maximum 500 characters per task
  - No dark mode support in MVP
  - No mobile app — only browser-based
  - No API key authentication for external services
  - No data export to CSV or other formats in MVP
  - No integration with calendars (Google, Apple)
  - No keyboard shortcuts beyond Enter to create task
  - Authentication through email/password only (no social login)
  - No password strength meter
  - No "Remember me" option
  - No persistent theme or layout preferences
  - No user profile editing
  - No help tips or onboarding screen
  - No analytics or telemetry
- **Business Constraints**:
  - Premium cloud sync is OPTIONAL and shall be implemented only in a future iteration
  - All user data SHALL remain private and never be shared
  - No advertising of any kind
  - All services SHALL be served over HTTPS
- **Security Constraints**:
  - All passwords SHALL be hashed using bcrypt
  - JWT SHALL have 15-minute expiration
  - No refresh tokens SHALL be implemented
  - No server-side session storage
  - All API endpoints SHALL require JWT authentication
  - No SQL injection or XSS vulnerabilities permitted
  - All user input SHALL be validated and sanitized
