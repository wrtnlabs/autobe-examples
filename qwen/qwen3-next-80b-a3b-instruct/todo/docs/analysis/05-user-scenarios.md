# User Scenarios and Workflows

## Primary User Journey: Registration to Todo Creation

THE system SHALL allow a guest to register for a new account using email and password.

WHEN a guest clicks the "Register" button on the authentication page, THE system SHALL collect the user's email address and password.

WHEN the system receives a registration request, THE system SHALL validate the email format.

IF the email address is not in valid email format, THEN THE system SHALL display an error message: "Please enter a valid email address."

IF the password is less than 8 characters, THEN THE system SHALL display an error message: "Password must be at least 8 characters long."

IF the email address is already registered in the system, THEN THE system SHALL display an error message: "An account with this email address already exists."

WHEN all validation rules pass successfully, THE system SHALL create a new user account with the provided credentials.

THE system SHALL generate a unique userId for the new user.

THE system SHALL send a welcome email to the user with the subject: "Welcome to TodoApp - Your account has been created!"

WHEN the account creation is complete, THE system SHALL automatically log the user in and redirect them to the dashboard.

WHILE the user is logged in, THE system SHALL display the user's personal todo list.

WHEN the user clicks the "New Task" button, THE system SHALL display a form to create a new todo item.

WHEN the user submits a new todo item, THE system SHALL validate that the task description is not empty.

IF the task description is empty, THEN THE system SHALL display an error message: "Please enter a task description."

IF the task description exceeds 500 characters, THEN THE system SHALL display an error message: "Task description cannot exceed 500 characters."

WHEN all validations pass, THE system SHALL create the todo item and assign it to the currently authenticated user.

THE system SHALL store the todo item with the following attributes: taskId, userId, title, createdAt, status (pending), and completedAt (null).

WHEN the todo item is successfully created, THE system SHALL add it to the top of the user's todo list and display a success message: "Task created successfully!"

## Secondary User Journey: Task Update and Completion

WHEN a user clicks on a todo item in their list, THE system SHALL display the task details.

WHEN a user clicks the "Edit" button on a todo item, THE system SHALL display an editable form with the current task details.

WHEN the user submits edited task details, THE system SHALL validate the updated task description.

IF the updated task description is empty, THEN THE system SHALL display an error message: "Task description cannot be empty."

IF the updated task description exceeds 500 characters, THEN THE system SHALL display an error message: "Task description cannot exceed 500 characters."

WHEN validation passes, THE system SHALL update the task with the new description and timestamp the update.

WHEN the user clicks the "Complete" checkbox on a todo item, THE system SHALL toggle the task status.

WHEN the status changes to "completed", THE system SHALL set the completedAt field to the current timestamp.

WHEN the status changes to "pending", THE system SHALL set the completedAt field to null.

THE system SHALL preserve the original createdAt timestamp regardless of status changes.

WHEN a task is marked as completed, THE system SHALL visually dim the task item and add a strikethrough to the text.

WHEN a task is marked as pending, THE system SHALL restore the original visual appearance.

WHILE a task is pending, THE system SHALL display it in the active tasks section.

WHILE a task is completed, THE system SHALL display it in the completed tasks section.

## Special Scenario: Password Reset

WHEN a user clicks "Forgot Password?" on the login page, THE system SHALL display a password reset form.

WHEN the user enters their email address and submits the reset request, THE system SHALL validate the email address.

IF the email address is not registered in the system, THEN THE system SHALL display an error message: "No account found with this email address."

WHEN the email address is valid, THE system SHALL generate a unique, time-limited reset token.

THE system SHALL store the reset token in memory with expiration timestamp (20 minutes from generation).

THE system SHALL send an email to the user with subject: "Password Reset Request for TodoApp" and a link containing the reset token.

WHEN the user clicks the reset link in the email, THE system SHALL validate the token.

IF the token has expired (older than 20 minutes), THEN THE system SHALL display an error message: "Password reset link has expired. Please request a new one."

IF the token is invalid or does not exist, THEN THE system SHALL display an error message: "Invalid password reset link."

WHEN the token is valid and active, THE system SHALL display a password reset form.

WHEN the user submits a new password, THE system SHALL validate it meets requirements.

IF the new password is less than 8 characters, THEN THE system SHALL display an error message: "Password must be at least 8 characters long."

WHEN the password meets requirements, THE system SHALL update the user's password hash in the database.

THE system SHALL immediately invalidate the reset token after successful password change.

THE system SHALL display a success message: "Your password has been updated successfully. You may now log in with your new password."

WHEN password reset is complete, THE system SHALL automatically log the user in.

## Special Scenario: Account Deletion

WHEN a user clicks "Delete Account" in their profile settings, THE system SHALL display a confirmation dialog.

THE system SHALL warn the user: "This action cannot be undone. All your todo items and account data will be permanently deleted."

WHEN the user confirms deletion by clicking "I understand, delete my account", THE system SHALL validate that the password entered matches the user's current password.

IF the entered password does not match the stored password, THEN THE system SHALL display an error message: "Incorrect password. Please try again."

WHEN password validation passes, THE system SHALL delete all todo items associated with the user's userId.

THE system SHALL delete the user account record from the database.

THE system SHALL invalidate all active sessions for the user.

THE system SHALL send a final email to the user with subject: "Your TodoApp account has been permanently deleted."

WHEN the account deletion process is complete, THE system SHALL log the user out and redirect them to the homepage.

THE system SHALL display a final message: "Your account has been permanently deleted. Thank you for using TodoApp."

## Data Isolation Principle

THE system SHALL ensure that each user's todo items are completely isolated from other users.

WHERE a user attempts to access another user's todo items, THE system SHALL deny access and return an unauthorized error.

WHEN any API request is made to retrieve, update, or delete todo items, THE system SHALL verify that the userId in the authentication token matches the userId associated with the requested todo item.

IF the userId in the token does not match the requested todo item's userId, THEN THE system SHALL return HTTP 403 Forbidden with error code: "ACCESS_DENIED_USER_MISMATCH".

THE system SHALL never expose any user identifiers, todo items, or metadata that belong to another user.

WHILE handling any todo-related request, THE system SHALL implicitly filter data to only items belonging to the authenticated user.

## Performance Expectations

WHEN a user logs in, THE system SHALL respond with authentication completion within 1 second.

WHEN a user loads their todo list, THE system SHALL display results within 0.5 seconds for up to 1000 items.

WHEN a user creates, updates, or deletes a todo item, THE system SHALL provide visual feedback of completion within 1 second.

WHEN a password reset request is generated, THE system SHALL send email notification within 2 seconds.

WHEN a user initiates account deletion, THE system SHALL complete cleanup and respond within 5 seconds.

## Security Requirements

WHEN a user logs in, THE system SHALL authenticate credentials securely using salted bcrypt hashing.

THE system SHALL store all passwords exclusively in encrypted hashed form.

THE system SHALL enforce HTTPS for all communications.

WHEN generating authentication tokens, THE system SHALL use JWT with RS256 signing algorithm.

THE system SHALL include userId and role in JWT payload for authorization.

THE system SHALL implement CSRF protection on all state-changing operations.

THE system SHALL enforce rate limiting on authentication endpoints (5 attempts per minute).