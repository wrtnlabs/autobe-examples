## User Scenarios for Todo App

This document details the complete end-to-end user journeys for both regular users and administrators of the Todo App. Each scenario describes the sequence of actions, system responses, and expected outcomes from the user's perspective, ensuring backend developers understand the intended behavior of the system in real-world usage.

All scenarios are written in natural language and adhere strictly to the business model of a single-user, no-collaboration, minimalist task management application. No user interface elements (buttons, forms, layouts) are referenced, as this document focuses solely on system behavior and data flow.

---

### User Registration and Login Flow

WHEN a new user visits the Todo App for the first time, THE system SHALL redirect them to a registration page.

WHEN the user submits a valid email address and a password of at least 8 characters, THE system SHALL create a new user account with a unique identifier and store the password using bcrypt hashing.

WHEN the user completes registration, THE system SHALL send a verification email to the provided email address containing a one-time token.

WHEN the user clicks the verification link in the email, THE system SHALL activate the account and grant a session token.

WHEN the user returns to the Todo App and enters their email and password, THE system SHALL validate the credentials against the stored hash.

WHEN the credentials are valid, THE system SHALL issue a JWT access token with a 15-minute expiration and a refresh token with a 30-day expiration.

WHEN the user attempts to log in with an incorrect password, THE system SHALL deny access without revealing whether the email exists.

WHILE the user is logged in, THE system SHALL validate all subsequent requests using the access token in the Authorization header.

---

### User Creating a New Todo Item

WHEN a logged-in user enters a non-empty title for a new todo item and submits it, THE system SHALL create a new task record associated with the authenticated user's ID.

WHERE the title exceeds 256 characters, THE system SHALL reject the creation and return an appropriate error message.

WHERE the title is empty or contains only whitespace, THE system SHALL reject the creation and return an appropriate error message.

WHEN the task is successfully created, THE system SHALL assign a unique ID, set the completion status to false, and record the creation timestamp in UTC.

WHEN the task is created, THE system SHALL return the created task object to the user with its unique ID, title, completion status, creation timestamp, and update timestamp.

---

### User Viewing All Todo Items

WHEN a logged-in user requests their todo list, THE system SHALL retrieve all task records where the user ID matches the authenticated user.

WHEN no todo items exist for the user, THE system SHALL return an empty array.

WHEN task items exist, THE system SHALL return them sorted by creation timestamp in descending order (newest first).

WHEN the user's request includes no filtering parameters, THE system SHALL return all items regardless of completion status.

WHERE the user's access token is expired or invalid, THE system SHALL deny the request and indicate the user must log in again.

---

### User Marking a Todo as Complete

WHEN a logged-in user toggles the completion status of a specific todo item by its ID, THE system SHALL update that item's completion flag.

IF the item's current status is false, THEN THE system SHALL set it to true.

IF the item's current status is true, THEN THE system SHALL set it to false.

WHEN the status update is successful, THE system SHALL return the updated task object with the new completion status and an updated timestamp.

WHERE the requested todo item ID does not exist or does not belong to the authenticated user, THE system SHALL return an error and not update any data.

---

### User Editing a Todo Item

WHEN a logged-in user submits a new title for an existing todo item they own, THE system SHALL update the item's title field.

WHERE the new title is empty or contains only whitespace, THE system SHALL reject the update and return an error.

WHERE the new title exceeds 256 characters, THE system SHALL reject the update and return an error.

WHEN the update is accepted, THE system SHALL set the update timestamp to the current UTC time and return the modified task object.

IF the item's completion status was true, THE system SHALL leave it unchanged.

IF the item's completion status was false, THE system SHALL leave it unchanged.

WHERE the user attempts to edit a todo item belonging to another user, THE system SHALL deny the update and return unauthorized access error.

---

### User Deleting a Todo Item

WHEN a logged-in user initiates deletion of a specific todo item by its ID, THE system SHALL permanently remove the task record from persistent storage.

WHEN a deletion request is received for a non-existent ID, THE system SHALL return a success response as if the item were deleted (to prevent enumeration attacks).

WHEN the deletion request targets an item not owned by the authenticated user, THE system SHALL deny the request and return unauthorized access error.

WHEN the item is successfully deleted, THE system SHALL return a success confirmation without returning the item data.

WHEN multiple deletion requests are received for the same item, THE system SHALL treat every subsequent request as successful after the first deletion.

---

### Admin Viewing All Users and Their Todos

WHEN an authenticated admin user accesses the user management dashboard, THE system SHALL retrieve a list of all registered users with their email addresses and account creation timestamps.

WHEN an admin selects a specific user, THE system SHALL retrieve all todo items associated with that user's ID and display them in descending order by creation date.

WHEN the admin request is authenticated with a valid admin-level JWT, THE system SHALL return the requested data.

WHEN the admin access token lacks administrative permissions, THE system SHALL deny the request and return unauthorized access error.

WHEN a user's account has been deleted by an admin, THE system SHALL no longer return the user or their todo items in any listing.

WHILE the admin view is active, THE system SHALL maintain access logs recording which user account was accessed and when.

---

### Admin Deleting a User Account

WHEN an authenticated admin selects a specific user account for deletion, THE system SHALL permanently remove the user record and all associated todo items from storage.

WHEN the delete action is confirmed by the admin, THE system SHALL revoke all active session tokens for that user.

WHEN the deletion is complete, THE system SHALL return a success response and include a log entry of the action for audit purposes.

WHERE the admin attempts to delete the account that created the system (super admin), THE system SHALL deny the request and return error message "Cannot delete super administrator account."

WHEN the account to be deleted contains no todo items, THE system SHALL still perform the deletion and log the event.

---

### Admin Viewing System Logs

WHEN an authenticated admin requests system activity logs, THE system SHALL retrieve all audit events related to user and todo item modifications with timestamps and IP addresses.

WHEN events older than 90 days are requested, THE system SHALL return only logs from the last 90 days.

WHERE the admin does not have sufficient privileges, THE system SHALL deny the request and return unauthorized access error.

THE system SHALL store logs in encrypted format and restrict access exclusively to the admin actor.

WHEN the system detects 5 consecutive failed login attempts from the same IP address within 10 minutes, THE system SHALL log this as a potential brute-force attack and optionally trigger an alert.

---

### Login Failure Scenario

IF a user submits incorrect authentication credentials three times in a row, THEN THE system SHALL log the event with the IP address and current timestamp.

IF a user submits incorrect authentication credentials five times within a 5-minute window from the same IP address, THEN THE system SHALL lock the account temporarily for 15 minutes and notify the user via email that their account has been locked due to suspicious activity.

WHEN a user's session expires due to inactivity beyond 30 days, THE system SHALL require re-authentication.

WHEN a user attempts to refresh an expired refresh token, THE system SHALL deny the refresh request and require full login.

WHEN a user tries to access a protected endpoint without a valid token, THE system SHALL return response "Authentication required. Log in to continue."

WHEN a user provides a token that has been revoked by admin, THE system SHALL return "Token has been invalidated. Please log in again."

---

### Empty Todo List Scenario

WHEN a newly registered user has not created any todo items, THE system SHALL display an empty list with a prompt message.

WHILE the todo list is empty, THE system SHALL still persist session state and allow the user to create items immediately upon request.

WHERE the user refreshes the page with an active session but no todo items, THE system SHALL return an empty array, not an error.

WHEN the user clicks "New Todo" with an empty list, THE system SHALL open the creation interface as expected.

THE system SHALL not trigger any notifications, alerts, or suggestions when the list is empty.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.