# User Workflows

## Document Overview

This document describes the complete user workflows for the Todo list application, providing step-by-step journeys that illustrate how users interact with the system in real-world scenarios. These workflows are designed to help backend developers understand the complete business context and user experience requirements for implementing the application.

Each workflow describes user interactions, business processes, and system behavior in natural language, focusing on WHAT the system should do from the user's perspective rather than HOW to implement it technically. Backend developers will use these workflows to understand the complete business logic and user journey requirements.

The workflows cover:
- New user onboarding and first todo creation
- Daily task management patterns
- Task completion and organization processes
- Account management operations
- Administrative oversight workflows

## New User Registration and First Todo

### Scenario Context

A new user discovers the Todo list application and wants to start managing their tasks. This workflow covers the complete journey from account creation to creating and managing their first todo item.

### User Registration Process

**Step 1: User Initiates Registration**

THE user SHALL access the registration functionality.

WHEN a user initiates registration, THE system SHALL request the following information:
- Email address (required)
- Password (required)
- Full name (optional)

**Step 2: User Provides Registration Information**

THE user SHALL provide a valid email address and password meeting security requirements.

WHEN the user submits registration information, THE system SHALL validate all provided data:
- Email must be in valid email format
- Email must not already exist in the system
- Password must meet minimum security requirements (minimum length, complexity)

**Step 3: Account Creation**

IF all registration data is valid, THEN THE system SHALL create a new user account with the following properties:
- Unique user identifier
- Stored email address
- Securely hashed password
- Optional full name if provided
- Account creation timestamp
- Account status set to active

WHEN account creation succeeds, THE system SHALL automatically authenticate the user and create an initial session.

**Step 4: Email Verification (if required)**

WHERE email verification is enabled, THE system SHALL send a verification email to the user's provided email address.

WHEN the user clicks the verification link, THE system SHALL mark the email address as verified.

### First Todo Creation

**Step 5: User Navigates to Todo Creation**

WHEN the newly registered user wants to create their first todo, THE system SHALL provide todo creation functionality.

**Step 6: User Provides Todo Information**

THE user SHALL provide the following information for their first todo:
- Title (required) - A brief description of the task
- Description (optional) - Additional details about the task

**Step 7: Todo Validation and Creation**

WHEN the user submits the todo creation request, THE system SHALL validate the provided data:
- Title must not be empty
- Title must meet length requirements (1-200 characters)
- Description, if provided, must meet length requirements (maximum 2,000 characters)

IF validation succeeds, THEN THE system SHALL create the todo item with:
- Unique todo identifier
- User association (linking todo to the creating user)
- Title and description as provided
- Completion status set to incomplete
- Creation timestamp set to current date and time
- Updated timestamp set to current date and time

**Step 8: First Todo Confirmation**

WHEN the todo is successfully created, THE system SHALL provide confirmation to the user and display the newly created todo item in their todo list.

### Error Scenarios in Registration and First Todo

**Registration Errors**

IF the email address is already registered, THEN THE system SHALL reject the registration and inform the user that the email is already in use.

IF the password does not meet security requirements, THEN THE system SHALL reject the registration and specify which requirements are not met.

IF required fields are missing, THEN THE system SHALL indicate which fields must be provided.

**First Todo Creation Errors**

IF the title is empty or too short, THEN THE system SHALL reject the todo creation and inform the user about the title requirements.

IF the user is not authenticated, THEN THE system SHALL deny access to todo creation functionality.

## Daily Todo Management Workflow

### Scenario Context

An established user starts their day and wants to review, create, update, and manage their todo items. This workflow represents typical daily usage patterns.

### Morning Review Workflow

**Step 1: User Authentication**

WHEN a returning user wants to access the Todo list application, THE system SHALL require authentication.

THE user SHALL provide their email address and password.

WHEN authentication credentials are submitted, THE system SHALL validate:
- Email exists in the system
- Password matches the stored hashed password
- Account is active and not suspended

IF authentication succeeds, THEN THE system SHALL create a user session with:
- Session identifier
- User identity information
- Session expiration time
- Access token (JWT) containing user ID and role

**Step 2: Viewing Todo List**

WHEN the authenticated user requests their todo list, THE system SHALL retrieve and display all todo items belonging to that user.

THE system SHALL display todos with the following information:
- Todo title
- Description (if present)
- Completion status
- Creation date
- Updated date

THE system SHALL support filtering and sorting options:
- Filter by completion status (all, incomplete, completed)
- Sort by creation date (newest first or oldest first)
- Sort by updated date (most recently modified first)

**Step 3: Identifying Tasks for the Day**

THE user SHALL review their todo list to identify tasks for the day.

WHEN viewing the list, THE system SHALL clearly indicate:
- Incomplete tasks that need attention
- Recently created tasks
- Tasks by chronological order

### Creating New Todos During the Day

**Step 4: Adding New Tasks**

WHEN the user remembers or receives new tasks during the day, THE system SHALL allow creating additional todo items.

THE user SHALL provide:
- Task title (required)
- Task description (optional, for additional context)

WHEN the user creates a new todo, THE system SHALL add it to their todo list with incomplete status.

### Updating Existing Todos

**Step 5: Modifying Todo Information**

WHEN the user needs to update a todo item, THE system SHALL allow modification of:
- Title
- Description

WHEN the user submits todo updates, THE system SHALL validate:
- The todo exists
- The todo belongs to the requesting user
- Updated data meets validation requirements

IF validation succeeds, THEN THE system SHALL update the todo item with the new information and preserve:
- Original creation timestamp
- Updated modification timestamp set to current time
- User ownership

**Step 6: Handling Update Errors**

IF the user attempts to update a todo that doesn't exist, THEN THE system SHALL inform the user that the todo was not found.

IF the user attempts to update a todo belonging to another user, THEN THE system SHALL deny the request and return an authorization error.

### Real-time Task Management

**Step 7: Working Through Tasks**

WHILE the user works through their day, THE system SHALL support frequent interactions with todo items:
- Viewing todo details
- Updating todo information as tasks evolve
- Marking tasks as complete (covered in next workflow section)
- Creating new todos as new tasks arise

**Step 8: End of Day Review**

WHEN the user completes their work day, THE system SHALL allow reviewing:
- Tasks completed today
- Tasks still incomplete
- Tasks to carry over to the next day

## Completing and Organizing Tasks

### Scenario Context

Users need to mark tasks as complete, manage completed tasks, and organize their todo list to maintain productivity and clarity.

### Marking Tasks as Complete

**Step 1: Task Completion**

WHEN a user completes a task in real life, THE system SHALL allow marking the corresponding todo item as complete.

WHEN the user marks a todo as complete, THE system SHALL:
- Update the todo's completion status to complete
- Update the last modified timestamp to current time
- Preserve all other todo information (title, description, creation date)

THE system SHALL allow viewing completed tasks separately from incomplete tasks through filtering options.

**Step 2: Unmarking Completed Tasks**

IF a user accidentally marks a todo as complete, THEN THE system SHALL allow unmarking it to return it to incomplete status.

WHEN a completed todo is unmarked, THE system SHALL:
- Update the completion status to incomplete
- Update the last modified timestamp to current time
- Return the todo to the incomplete tasks view when filtered

### Managing Completed Tasks

**Step 3: Viewing Task History**

WHEN the user wants to review what they've accomplished, THE system SHALL provide access to completed todos through filtering.

THE system SHALL display completed todos with:
- Original task information
- Completion status clearly indicated
- All timestamp information

**Step 4: Cleaning Up Completed Tasks**

WHEN the user wants to remove completed tasks from their list, THE system SHALL allow deleting completed todos.

WHEN a user deletes a todo item (completed or incomplete), THE system SHALL:
- Verify the todo belongs to the requesting user
- Permanently remove the todo from the system
- Confirm the deletion to the user

IF the user attempts to delete a todo belonging to another user, THEN THE system SHALL deny the request.

### Organizing Tasks

**Step 5: Managing Todo List**

WHEN the user wants to organize their todo list, THE system SHALL provide:
- Filtering by completion status to see only active or completed tasks
- Sorting by creation date to see newest or oldest tasks first
- Sorting by updated date to see recently modified tasks

**Step 6: Reviewing Todo Details**

WHEN the user wants to see full details of a todo item, THE system SHALL display:
- Complete title and description
- Completion status
- Creation timestamp
- Last modified timestamp
- All associated metadata

## Account Management Workflow

### Scenario Context

Users need to manage their account settings, update their profile information, and handle account security.

### Profile Management

**Step 1: Viewing Profile Information**

WHEN an authenticated user wants to view their profile, THE system SHALL display:
- Email address
- Account creation date
- Account status
- Any profile information provided during registration

**Step 2: Updating Profile Information**

WHEN the user wants to update their profile, THE system SHALL allow modifying:
- Email address (with proper validation)

IF the user changes their email address, THEN THE system SHALL:
- Validate the new email is in proper format
- Validate the new email is not already in use by another account
- Update the email address
- Optionally require re-verification of the new email address

### Password Management

**Step 3: Changing Password**

WHEN an authenticated user wants to change their password, THE system SHALL require:
- Current password for verification
- New password meeting security requirements

WHEN the user submits a password change request, THE system SHALL:
- Verify the current password is correct
- Validate the new password meets security requirements (minimum 8 characters, contains letters and numbers)
- Update the stored password hash
- Invalidate existing refresh tokens for security (optional implementation detail)
- Confirm the password change to the user

**Step 4: Password Reset (Forgotten Password)**

WHEN a user forgets their password, THE system SHALL provide a password reset mechanism.

THE user SHALL provide their email address.

WHEN the email is submitted, THE system SHALL:
- Generate a secure, time-limited password reset token
- Send the reset link to the user's email
- Not reveal whether the email exists in the system (to prevent account enumeration)

WHEN the user clicks the reset link, THE system SHALL:
- Validate the reset token is valid and not expired
- Allow the user to set a new password
- Invalidate the reset token after use
- Invalidate all existing user sessions for security

### Session Management

**Step 5: Active Session Management**

WHILE a user is authenticated, THE system SHALL maintain their session through JWT tokens.

THE system SHALL automatically expire sessions based on token expiration (access tokens expire after 15-30 minutes).

WHEN a session expires, THE system SHALL require the user to refresh their token using the refresh token or re-authenticate.

**Step 6: Logout**

WHEN the user wants to log out, THE system SHALL:
- Invalidate the current refresh token
- Clear the user's authentication state
- Confirm successful logout

### Account Deletion

**Step 7: Deleting Account**

WHERE account deletion is supported, THE system SHALL allow users to delete their own accounts.

WHEN a user requests account deletion, THE system SHALL:
- Require authentication to confirm user identity
- Warn about permanent data loss

IF the user confirms account deletion, THEN THE system SHALL:
- Delete the user account
- Delete all associated todo items permanently
- Invalidate all user sessions
- Prevent future login with those credentials
- Optionally send confirmation email to the user's email address

## Admin Monitoring Workflow

### Scenario Context

System administrators need to monitor system health, view usage statistics, and support users when issues arise. This workflow describes administrative oversight without violating user privacy.

### Admin Authentication

**Step 1: Admin Login**

WHEN an administrator wants to access administrative functions, THE system SHALL require admin authentication.

THE admin SHALL provide their admin credentials (email and password).

WHEN admin authentication succeeds, THE system SHALL:
- Validate the user has admin role
- Create an admin session with elevated permissions
- Provide access to administrative functions

### System Monitoring

**Step 2: Viewing System Statistics**

WHEN an admin accesses the monitoring dashboard, THE system SHALL display aggregate statistics:
- Total number of registered users
- Total number of active users (users who logged in recently)
- Total number of todo items across all users
- System health metrics
- Recent activity overview

THE system SHALL display statistics in aggregate form without exposing individual user data unnecessarily.

**Step 3: User Account Overview**

WHEN an admin needs to view user accounts, THE system SHALL provide a user list showing:
- User email addresses
- Account creation dates
- Account status (active, suspended, deleted)
- Last login date
- Number of todos per user

THE system SHALL support searching for specific user accounts by email.

### User Support

**Step 4: Viewing User Data for Support**

WHEN an admin needs to investigate a user issue, THE system SHALL allow viewing a specific user's:
- Account information
- Todo list
- Account activity history

WHERE privacy regulations apply, THE admin SHALL only access user data for legitimate support purposes.

**Step 5: Account Management Actions**

WHEN an admin needs to manage user accounts, THE system SHALL support:
- Suspending user accounts (temporarily disabling access)
- Reactivating suspended accounts
- Viewing user activity logs

IF an admin suspends a user account, THEN THE system SHALL:
- Prevent the user from logging in
- Invalidate all active sessions for that user
- Preserve all user data
- Maintain a record of the suspension action

IF an admin reactivates a suspended account, THEN THE system SHALL:
- Restore normal account access
- Allow the user to log in again

### System Configuration

**Step 6: Managing System Settings**

WHERE system configuration is needed, THE admin SHALL be able to:
- View system configuration settings
- Monitor system performance and health
- Access system logs for troubleshooting

**Step 7: Audit and Compliance**

WHEN admins need to review system usage for compliance, THE system SHALL provide:
- Audit logs of administrative actions
- User account creation and deletion logs
- Authentication attempt logs
- Records of significant system events

THE system SHALL record all admin actions with:
- Admin user identifier
- Action performed
- Timestamp
- Affected user or resource (if applicable)

### Admin Workflow Error Scenarios

**Authentication Errors**

IF admin credentials are invalid, THEN THE system SHALL deny access to administrative functions.

IF a non-admin user attempts to access admin functions, THEN THE system SHALL deny access with authorization error.

**Support Action Errors**

IF an admin attempts to suspend an already suspended account, THEN THE system SHALL inform the admin of the current account status.

IF an admin attempts to access a deleted user account, THEN THE system SHALL inform the admin that the account no longer exists.

## Workflow Integration and Business Rules

### Cross-Workflow Business Rules

**User Data Isolation**

THE system SHALL ensure users can only access their own todo items across all workflows.

THE system SHALL prevent users from viewing, modifying, or deleting todos belonging to other users.

**Authentication Requirements**

THE system SHALL require valid authentication for all todo management operations.

WHEN a session expires during any workflow, THE system SHALL require re-authentication before allowing continued access.

**Data Validation Consistency**

THE system SHALL apply consistent validation rules across all workflows:
- Todo title requirements remain the same whether creating or updating
- Email validation rules remain consistent in registration and profile updates
- Password requirements apply equally to registration, password change, and password reset

### Workflow Performance Expectations

**Response Time**

WHEN users perform common operations (viewing todos, creating todos, marking complete), THE system SHALL respond instantly (within 500 milliseconds).

WHEN users authenticate or perform account management operations, THE system SHALL respond within 2 seconds.

**Concurrent Operations**

THE system SHALL support multiple users performing workflows simultaneously without interference or data conflicts.

THE system SHALL ensure that if a user has multiple sessions, changes in one session are reflected when the other session refreshes.

### Workflow Error Recovery

**General Error Handling**

IF any workflow step fails due to a system error, THEN THE system SHALL:
- Preserve user data when possible
- Provide a clear error message
- Allow the user to retry the operation
- Log the error for administrator review

**Network Interruption Handling**

IF a network interruption occurs during a workflow, THEN THE system SHALL:
- Maintain data consistency (no partial updates)
- Allow the user to retry when connectivity is restored
- Preserve session if the interruption is brief

**Data Conflict Resolution**

IF a user attempts to modify a todo that was recently deleted, THEN THE system SHALL inform the user that the todo no longer exists.

IF concurrent modifications occur (multiple sessions), THE system SHALL apply the most recent modification and maintain data consistency.

## Summary

These workflows represent the complete user journeys through the Todo list application, from initial registration to daily task management and administrative oversight. Backend developers should use these workflows to understand:

- The complete business context for each operation
- The expected user experience and system behavior
- The business rules that govern each interaction
- The error scenarios that must be handled
- The performance expectations for each workflow

All technical implementation decisions (database structure, API design, architecture) are at the developer's discretion, provided they fulfill these business workflow requirements and deliver the described user experience.