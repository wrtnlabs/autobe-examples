# Functional Requirements Specification

## TodoApp Multi-User Todo List Application

This document defines the complete functional requirements for a multi-user Todo list application. The system enables individual users to create and manage private todo lists with complete data isolation between users.

---

## Table of Contents

1. [Core Todo Functionality](#core-todo-functionality)
2. [User Registration Requirements](#user-registration-requirements)
3. [User Login Requirements](#user-login-requirements)
4. [Todo Creation Requirements](#todo-creation-requirements)
5. [Todo Management Requirements](#todo-management-requirements)
6. [Account Management Requirements](#account-management-requirements)
7. [Error Handling Requirements](#error-handling-requirements)
8. [Business Rules Summary](#business-rules-summary)
9. [Non-Functional Requirements from User Perspective](#non-functional-requirements-from-user-perspective)

---

## Core Todo Functionality

### Overview

The TodoApp provides essential todo list management functionality with a focus on simplicity and privacy. Each user maintains a completely isolated todo list that is inaccessible to other users. The system supports the fundamental operations of creating, reading, updating, and deleting todo items.

### Essential Todo Attributes

WHEN a todo item is created in the system, THE todo item SHALL have the following attributes:

- **Title**: A brief description of the task (required field)
- **Description**: Optional detailed information about the task
- **Completion Status**: Boolean value indicating whether the task is completed or not
- **Created Timestamp**: Automatic timestamp when the todo was created
- **Updated Timestamp**: Automatic timestamp when the todo was last modified
- **Due Date**: Optional date by which the task should be completed
- **Priority**: Optional priority level with values Low, Medium, or High

THE system SHALL automatically set the Created Timestamp to the current UTC time when a todo is created.

THE system SHALL automatically update the Updated Timestamp to the current UTC time whenever a todo is modified.

### Data Privacy and Isolation Requirements

THE system SHALL enforce strict data isolation between users.

WHEN a user attempts to access a todo item, THE system SHALL verify that the requesting user is the owner of that todo.

IF a user attempts to access another user's todo item, THEN THE system SHALL deny access and return an authorization error without revealing whether the todo exists.

THE system SHALL ensure that users can only view, modify, or delete todo items that they have created.

WHEN a user queries for their todo list, THE system SHALL return only todo items where the authenticated user is the owner.

THE system SHALL NOT expose todo counts, titles, or any metadata of one user to another user.

---

## User Registration Requirements

### Registration Process

WHEN a guest provides registration information including email and password, THE system SHALL create a new user account.

THE system SHALL require the following mandatory information for registration:
- Email address that serves as the unique user identifier
- Password meeting security requirements
- Confirmation of password entered a second time

THE system SHALL validate all registration inputs before creating the account.

### Email Validation Requirements

WHEN a user submits an email address during registration, THE system SHALL validate that the provided email address conforms to RFC 5322 email format standards.

THE system SHALL verify that the email address is not already registered for an existing active account in the system.

IF a user attempts to register with an email address that is already in use, THEN THE system SHALL reject the registration request and display a message stating that the email address is already registered.

THE system SHALL perform email format validation before checking for uniqueness.

### Password Requirements

WHEN a password is provided during registration, THE system SHALL enforce the following minimum password requirements:
- Minimum length of 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one numeric digit (0-9)
- At least one special character from the set: !@#$%^&*()_+-=[]{}|;:,.<>?

IF a provided password does not meet any of these requirements, THEN THE system SHALL reject the registration and display a specific error message indicating which requirement was not met.

### Password Confirmation

WHEN a user registers for an account, THE system SHALL require the user to enter their password twice in separate fields labeled "Password" and "Confirm Password".

IF the password entered in the "Password" field does not exactly match the password entered in the "Confirm Password" field, THEN THE system SHALL reject the registration and display an error message stating that the passwords do not match.

THE system SHALL clear both password fields when a mismatch is detected to prompt the user to re-enter both passwords.

### Email Verification Process

WHEN a new account is successfully registered, THE system SHALL send a verification email to the provided email address.

THE system SHALL generate a unique, cryptographically secure verification token.

THE system SHALL include the verification token in a clickable link within the verification email.

THE verification email SHALL contain clear instructions for the user to click the link to verify their email address.

THE system SHALL mark the account status as "pending verification" until the email verification is completed.

WHEN a user clicks the verification link with a valid token, THE system SHALL verify the token and activate the account by changing the status to "active".

IF the verification token is invalid, expired, or has already been used, THEN THE system SHALL display an error message informing the user that the verification link is invalid and provide an option to request a new verification email.

THE verification token SHALL expire after 24 hours from the time of generation.

THE system SHALL allow users to resend the verification email with a rate limit of one email per 5-minute interval to prevent abuse.

---

## User Login Requirements

### Authentication Process

WHEN a guest provides email and password credentials, THE system SHALL authenticate the user by validating the credentials against stored account data.

THE system SHALL validate that the email address exists in the system before checking the password.

IF the provided email address does not exist in the system, THEN THE system SHALL return a generic authentication failure message that does not specify whether the email or password was incorrect.

THE system SHALL validate that the provided password matches the stored hashed password for the account using secure comparison methods resistant to timing attacks.

IF the provided password does not match the stored password, THEN THE system SHALL return a generic authentication failure message that does not specify which credential was incorrect.

### Account Status Verification

BEFORE completing authentication, THE system SHALL verify that the user account is in an active status.

IF the account email has not been verified, THEN THE system SHALL deny login and display a message informing the user that email verification is required, along with an option to resend the verification email.

IF the account has been suspended, deactivated, or marked for deletion, THEN THE system SHALL deny access and display a message stating that the account is not active without providing specific details about the account status.

### Session Management

UPON successful authentication, THE system SHALL generate an access token and refresh token pair for the user's session.

THE access token SHALL be a JSON Web Token (JWT) containing the user's unique identifier and session metadata.

THE access token SHALL expire after 30 minutes from the time of issuance.

THE refresh token SHALL expire after 7 days of inactivity or upon explicit logout.

THE system SHALL support token refresh functionality that accepts a valid refresh token and issues a new access token pair without requiring the user to re-enter credentials.

WHEN a user explicitly logs out, THE system SHALL immediately invalidate all session tokens associated with that user.

### Login Attempt Limiting

THE system SHALL implement rate limiting on login attempts to prevent brute force attacks.

THE system SHALL track failed login attempts on a per-email-address basis.

IF a user exceeds 5 failed login attempts for the same email address within a 15-minute window, THEN THE system SHALL temporarily lock the account for 30 minutes and require additional verification (such as CAPTCHA or email verification) before any further login attempts are allowed.

THE system SHALL reset the failed attempt counter after a successful login.

---

## Todo Creation Requirements

### Creating Todo Items

WHEN an authenticated member submits a request to create a new todo item, THE system SHALL create the todo with the provided information.

THE system SHALL automatically associate the todo item with the currently authenticated user as the owner.

THE system SHALL automatically set the creation timestamp to the current UTC time at the moment of creation.

THE system SHALL set the initial completion status to "not completed" (false) for all newly created todos.

### Title Requirements

WHEN a todo is created, THE system SHALL require a non-empty title for the todo item.

THE title SHALL have a minimum length of 1 character.

THE title SHALL have a maximum length of 200 characters.

IF a user attempts to create a todo without providing a title, THEN THE system SHALL reject the request and return a validation error indicating that the title is required.

IF a title exceeds the maximum length of 200 characters, THEN THE system SHALL reject the request and return a validation error stating that the title exceeds the maximum allowed length.

### Description Requirements

THE description field is OPTIONAL for todo items.

WHEN a description is provided, THE system SHALL accept text content for the description field.

THE description SHALL have a maximum length of 2000 characters.

IF a description exceeds 2000 characters, THEN THE system SHALL reject the request and return a validation error.

THE system SHALL accept an empty string or null value for the description field.

### Due Date Requirements

THE due date field is OPTIONAL for todo items.

WHEN a due date is provided, THE system SHALL validate that it is a valid date in ISO 8601 format.

IF a due date is provided that is in the past (earlier than the current date), THEN THE system SHALL accept the due date but may display a warning to the user that the date is in the past.

THE system SHALL store due dates in UTC format.

### Priority Requirements

THE priority field is OPTIONAL for todo items.

THE system SHALL support the following priority levels:
- **Low**: Tasks of lower importance or urgency
- **Medium**: Default priority for tasks
- **High**: Tasks requiring immediate attention

IF no priority is specified during todo creation, THEN THE system SHALL default to "Medium" priority.

THE system SHALL reject any priority value other than Low, Medium, or High.

---

## Todo Management Requirements

### Viewing Todo Items

WHEN an authenticated member requests their todo list, THE system SHALL return all todo items where the authenticated user is the owner.

THE system SHALL support filtering todo items by completion status with the following options:
- All todos (no filter applied)
- Completed todos only
- Not completed (active) todos only

THE system SHALL support sorting todo items by the following criteria:
- Creation date in ascending or descending order
- Due date in ascending or descending order
- Priority level (High to Low or Low to High)
- Title in alphabetical order (A-Z or Z-A)

THE system SHALL default to sorting by creation date with the most recently created todos displayed first.

THE system SHALL support pagination for displaying todo items with configurable page sizes.

THE system SHALL default to displaying 20 items per page.

THE system SHALL allow users to request page sizes of 10, 20, 50, or 100 items per page.

### Viewing Individual Todo Items

WHEN a member requests a specific todo item by its unique identifier, THE system SHALL return the complete todo details only IF the requesting user is the owner of that todo.

IF the requested todo identifier does not exist in the system, THEN THE system SHALL return a "not found" error response.

IF the requested todo exists but belongs to a different user, THEN THE system SHALL return a "not found" error response to prevent information disclosure about the existence of the resource.

### Updating Todo Items

WHEN an authenticated member submits an update request for a todo item, THE system SHALL modify the todo with the provided changes only IF the requesting user is the owner of the todo.

THE system SHALL automatically update the "updated timestamp" field to the current UTC time whenever any modification is made to a todo.

THE system SHALL support updates to the following fields:
- Title (must meet the same requirements as during creation)
- Description (must meet the same requirements as during creation)
- Due date (must be a valid date or null)
- Priority (must be Low, Medium, or High)
- Completion status (true or false)

IF the user attempts to update a todo that does not exist or does not belong to them, THEN THE system SHALL return a "not found" error response.

### Partial Updates

THE system SHALL support partial update operations, allowing users to modify only specific fields without providing all todo data fields.

WHEN a field is not included in the update request, THE system SHALL retain the existing value for that field unchanged.

THE system SHALL validate only the fields that are provided in the update request.

### Completion Status Updates

WHEN a user marks a todo as completed, THE system SHALL update the completion status to true (completed).

WHEN a user marks a completed todo as not completed, THE system SHALL update the completion status to false (not completed).

THE system SHALL record the timestamp when a todo was first marked as completed.

IF a todo is toggled from completed back to not completed, THE system SHALL retain the completion timestamp until the todo is completed again.

### Deleting Todo Items

WHEN an authenticated member deletes a todo item, THE system SHALL permanently remove the todo from the system only IF the requesting user is the owner.

IF the todo to be deleted does not exist, THEN THE system SHALL return a "not found" error response.

IF the todo to be deleted belongs to another user, THEN THE system SHALL return a "not found" error response to prevent information disclosure.

THE system SHALL require password confirmation or explicit confirmation before permanently deleting a todo item when initiated from certain interfaces.

THE system SHALL return a success response indicating the todo item has been deleted.

### Bulk Operations

THE system SHALL support bulk completion of multiple todo items in a single operation.

THE system SHALL support bulk deletion of multiple todo items in a single operation.

WHEN performing bulk operations, THE system SHALL only affect todo items owned by the requesting user.

IF a bulk operation includes todo identifiers that do not exist or belong to other users, THEN THE system SHALL skip those items and process only the valid items.

THE system SHALL provide feedback indicating the number of items successfully processed and the number of items skipped in bulk operations.

---

## Account Management Requirements

### Password Change

WHEN an authenticated member requests to change their password, THE system SHALL validate the current password before allowing any changes.

THE system SHALL require the user to enter their current password for verification.

THE system SHALL require the new password to meet the same requirements as registration passwords (8+ characters, mixed case, numbers, special characters).

THE system SHALL require the user to confirm the new password by entering it twice.

IF the current password provided is incorrect, THEN THE system SHALL reject the password change request and return an error indicating the current password is incorrect.

IF the new password and confirmation password do not match, THEN THE system SHALL reject the request and return an error stating the passwords do not match.

IF the new password is identical to the current password, THEN THE system SHALL reject the request and inform the user that the new password must be different from the current password.

WHEN a password is successfully changed, THE system SHALL invalidate all existing refresh tokens for the user and require re-authentication on all devices.

### Password Reset

WHEN a user requests a password reset, THE system SHALL verify that the email address exists in the system.

IF the email address does not exist, THEN THE system SHALL return a generic success message to the user to prevent user enumeration attacks, but SHALL NOT send any email.

IF the email address exists, THEN THE system SHALL generate a unique, cryptographically secure reset token and send a password reset email to the registered email address.

THE reset token SHALL expire after 1 hour from the time of generation.

THE password reset email SHALL contain a secure link with the reset token embedded.

WHEN a user clicks the reset link with a valid, unexpired token, THE system SHALL display a form allowing the user to set a new password.

IF the reset token is invalid, expired, or has already been used, THEN THE system SHALL display an error message and provide an option to request a new password reset.

AFTER a successful password reset, THE system SHALL invalidate all existing sessions and tokens for that user account.

THE system SHALL require the user to log in with the new password after resetting.

### Email Address Update

WHEN an authenticated member requests to change their email address, THE system SHALL require the user to provide their current password for verification.

THE system SHALL validate that the new email address is not already registered to another account.

IF the new email address is already registered, THEN THE system SHALL reject the change request.

THE system SHALL send a verification email to the new email address before completing the change.

THE system SHALL maintain the old email address as the primary contact until the new email address is verified.

IF the verification is not completed within 24 hours, THEN THE system SHALL cancel the pending email change and notify the user at the old email address.

WHEN the new email is verified, THE system SHALL update the primary email address and send a notification to the old email address about the change.

### Account Deletion

WHEN an authenticated member requests to delete their account, THE system SHALL require the user to provide their current password for verification.

THE system SHALL display a clear warning explaining that account deletion is permanent and cannot be undone.

THE system SHALL require explicit confirmation from the user before proceeding with account deletion.

THE confirmation step SHALL require the user to type a specific phrase (such as "DELETE") to confirm the deletion.

WHEN an account is deleted, THE system SHALL permanently delete all todo items associated with that user account.

THE system SHALL delete all personal information associated with the user account except for data required for legal compliance or audit purposes (such as transaction records if applicable).

AFTER account deletion, THE system SHALL immediately invalidate all active sessions and tokens for that user.

THE deleted email address SHALL be held in a quarantine state for 30 days before becoming available for new registrations.

### Session Management

THE system SHALL allow authenticated users to view a list of their active sessions across all devices.

THE list of active sessions SHALL display information such as:
- Device or browser type (if available)
- Approximate location (if available)
- Last activity timestamp
- Session creation timestamp

THE system SHALL allow users to terminate specific sessions remotely from another device.

THE system SHALL allow users to terminate all sessions except the current one.

WHEN a session is terminated remotely, THE system SHALL immediately invalidate all tokens associated with that session.

THE system SHALL send a notification email to the user when a session is terminated remotely (if email notifications are enabled).

---

## Error Handling Requirements

### Input Validation Errors

IF a user submits invalid data, THEN THE system SHALL return specific validation error messages.

THE validation error response SHALL include:
- The field name that failed validation
- A clear description of why the validation failed
- The validation constraint that was violated (if applicable)

THE system SHALL validate all input data before processing any request.

THE system SHALL sanitize all user inputs to prevent injection attacks.

THE system SHALL reject requests containing potentially malicious characters or patterns.

### Authentication Errors

IF a user attempts to access protected resources without valid authentication, THEN THE system SHALL return an HTTP 401 Unauthorized response.

THE authentication error response SHALL include a message indicating that authentication is required.

IF an access token has expired, THEN THE system SHALL return an HTTP 401 response with information indicating that the token has expired.

THE system SHALL distinguish between missing authentication and expired authentication tokens.

### Authorization Errors

IF an authenticated user attempts to access or modify resources they do not own, THEN THE system SHALL return a "not found" or HTTP 403 Forbidden response.

THE system SHALL use "not found" responses for resources that exist but belong to other users to prevent information disclosure.

THE authorization error SHALL NOT reveal whether the requested resource exists.

### System Errors

IF a system error occurs during processing, THEN THE system SHALL return a generic error message to the user without exposing internal system details, stack traces, or database information.

THE system SHALL log all system errors with sufficient detail for administrative review and debugging.

THE system error response SHALL include a unique error identifier that the user can reference when reporting the issue.

---

## Business Rules Summary

1. **User Isolation**: Each user's todo list is completely private and isolated from other users. No user has any visibility into another user's todos.

2. **Data Ownership**: Users can only access, modify, or delete todo items they have created. Any attempt to access other users' data results in a "not found" error.

3. **Email Uniqueness**: Each email address can only be associated with one active user account. Duplicate email registrations are rejected.

4. **Password Security**: All passwords must meet minimum complexity requirements including length, character variety, and special characters.

5. **Email Verification**: Users must verify their email address before accessing the full functionality of the application.

6. **Session Security**: Access tokens expire after 30 minutes of inactivity. Refresh tokens expire after 7 days.

7. **Rate Limiting**: Login attempts are rate-limited to 5 failures per 15-minute window to prevent brute force attacks.

8. **Data Integrity**: All todos must have a title and an associated owner. Missing required fields result in validation errors.

9. **Audit Trail**: The system maintains creation timestamps and modification timestamps for all todos to support accountability.

10. **Permanent Deletion**: Deleted todos and accounts cannot be recovered. Users must confirm deletion actions multiple times.

11. **Privacy by Default**: No user information is shared between users. Default priority is Medium. Default completion status is Not Completed.

12. **Token Invalidation**: Password changes and password resets invalidate all existing sessions for security.

---

## Non-Functional Requirements from User Perspective

### Simplicity

THE system SHALL maintain a minimal feature set focused on core todo functionality without unnecessary complexity.

THE user interface flows SHALL be streamlined and intuitive, guiding users through common tasks with minimal steps.

THE system SHALL avoid feature bloat and maintain focus on the essential todo list management capabilities.

### Responsiveness

WHEN a user performs an action, THE system SHALL respond within 2 seconds under normal operating conditions.

THE system SHALL provide immediate visual feedback for user actions such as button clicks and form submissions.

THE system SHALL display loading indicators for operations that may take longer than 1 second.

THE user interface SHALL feel fluid and responsive during normal usage patterns.

### Reliability

THE system SHALL maintain data integrity and SHALL NOT lose user data under any circumstances.

THE system SHALL validate and save data before confirming success to the user.

THE system SHALL be available for use during normal operating hours (target 99.9% uptime).

THE system SHALL handle errors gracefully without crashing or losing user input.

WHEN an error occurs, THE system SHALL allow the user to recover their work without re-entering all data.

THE system SHALL implement automatic data saving for forms to prevent data loss in case of unexpected interruptions.
