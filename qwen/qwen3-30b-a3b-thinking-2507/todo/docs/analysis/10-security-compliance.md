# Mult-User Todo Application Requirements Specification

## User Account Management

### Account Creation
WHEN a new user provides a valid email address and password, THE system SHALL validate the email format and require password complexity of minimum 8 characters, including special characters and mixed case letters.

WHEN a user initiates sign-up process, THE system SHALL provide clear validation feedback for email address and password requirements with immediate visual cues.

### Authentication
WHEN a user submits login credentials, THE system SHALL authenticate securely using hash-based password verification with 5000+ iteration salts.

WHEN a login attempt fails three consecutive times within 60 seconds, THE system SHALL impose a 15-second cooldown period before allowing further attempts.

### Account Modification
WHEN a user requests password change, THE system SHALL require confirmation of current password and enforce minimum 8-character new password with complexity requirements.

WHEN a password is successfully changed, THE system SHALL invalidate all active session tokens immediately and log the event for security audit purposes.

### Account Deletion
WHEN a user initiates account deletion request, THE system SHALL display warning message about permanent data deletion and require explicit confirmation.

WHEN account deletion is confirmed, THE system SHALL delete all associated user data including todos, edit history, and audit logs within 48 hours in compliance with data privacy regulations.

## User Profile Management

### Profile Creation
WHEN a user signs up, THE system SHALL require display name to be between 2-30 characters and exclude profanity or offensive content.

WHEN a user creates or edits profile, THE system SHALL validate display name against company's content policy before saving.

### Profile Access Control
THE system SHALL restrict all user profile access to the owner only with no mechanisms to view other users' profiles.

## Todo Creation

### Todo Submission
WHEN a user creates a new todo, THE system SHALL require title field (minimum 2 characters).

WHEN a user submits a todo with empty title, THE system SHALL reject submission with specific error message "Title is required and must be at least 2 characters."

### Default State
WHEN a new todo is created, THE system SHALL automatically mark it as "incomplete" with default completion status set to false.

## Todo Viewing

### List Pagination
WHEN a user views their todos, THE system SHALL display results in paginated form with 15 todos per page as default.

WHEN a user has more than 15 todos, THE system SHALL show pagination controls with page numbers and "next/previous" buttons.

### List Content
WHEN a todo is displayed in list view, THE system SHALL show title, completion status icon, start date (if set), due date (if set), and creation date.

WHEN a todo has no start or due date, THE system SHALL indicate "Not set" in the respective fields with clear visual cue.

## Todo Completion

### Toggle Operation
WHEN a user clicks on the completion toggle button, THE system SHALL toggle between completed and incomplete states with immediate visual feedback.

WHEN a completion status is changed, THE system SHALL update the status database with timestamp, user identifier, and action type for audit purposes.

## Todo Editing

### Edit History
WHEN a user edits any part of a todo, THE system SHALL automatically create an edit history log entry recorded with timestamp.

## Edit History

### Log Management
WHEN a todo is edited, THE system SHALL create a history entry recording changes to title, description, start date, and due date with current values.

WHEN view edit history, THE system SHALL display entries in descending chronological order with clear indicators of which fields were modified.

## Todo Deletion

### Soft Delete
WHEN a user deletes a todo, THE system SHALL mark it as deleted instead of permanent removal with timestamp and deletion reason.

DELETED todos SHALL no longer appear in the standard todo list but remain accessible in the trash.

## Trash Management

### Trash Access
WHEN a user requests trash view, THE system SHALL display paginated list of deleted todos with restoration and permanent deletion options.

WHEN a user restores a todo from trash, THE system SHALL move it back to the active todo list with original creation timestamp.

### Permanent Deletion
WHEN a user permanently deletes a todo from trash, THE system SHALL delete all associated data including its edit history entries within 48 hours.

## Filtering Support

### Status Filtering
WHEN a user selects 'All' filtering option, THE system SHALL show all todos regardless of completion status.

WHEN a user selects 'Only complete todos', THE system SHALL exclude all incomplete todos from view with clear indicator in filtering UI.

## Sorting Functionality

### Sorting Criteria
WHEN a user selects creation date sorting, THE system SHALL sort todos newest-first by default.

WHEN sorting by start date, THE system SHALL place todos without start dates at the end of the list with clear visual grouping.

### Date Handling
WHEN sorting by due date, THE system SHALL display todos with due dates first in chronological order, placing todos with no due date at the end of the list.

## Privacy Requirements

### Data Isolation
THE system SHALL implement strict access control policies such that each user's todos remain completely isolated from all other users.

WHEN any operation occurs within a user's context, THE system SHALL verify user ownership before processing any data access.

### Unauthorized Access Prevention
IF an attempt is made to access another user's todos, THE system SHALL deny access with appropriate error code (403 Forbidden) and log the access attempt for security review.

### Audit Trail
ALL access attempts to user data SHALL be recorded in the audit log with user ID, timestamp, IP address, and operation type for security compliance.

## Security Compliance

Aligned with security requirements from 10-security-compliance.md:

1. All personal data is handled with encryption at rest and in transit
2. User data is deleted within 48 hours of account deletion
3. Audit logs are kept for 365 days
4. Session tokens are invalidated during password changes
5. Account suspension occurs after suspicious activity detection