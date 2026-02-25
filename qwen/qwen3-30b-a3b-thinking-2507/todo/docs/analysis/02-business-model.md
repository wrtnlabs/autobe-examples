# Multi-User Todo Application Requirements Specification

## Service Prefix

The service prefix for all generated artifacts is `todoapp`.

## User Account Management

**WHEN a user signs up with email and password, THE system SHALL validate the email format and password strength (minimum 8 characters, at least one uppercase, one lowercase, one number).**

**WHEN a user attempts to log in with valid credentials, THE system SHALL create a secure JWT token stored in an HttpOnly cookie with 24-hour expiration.**

**WHEN a user changes their password, THE system SHALL immediately invalidate all active sessions except the current one.**

**WHEN a user requests account deletion, THE system SHALL permanently delete all associated todos (including trash entries) within 48 hours.**

## User Profile Management

**WHEN a user creates a profile, THE system SHALL allow display name creation with 1-30 characters using alphanumeric and space characters.**

**WHEN a user edits their display name, THE system SHALL update the profile without affecting other user data.**

**WHEN a user views another user's profile, THE system SHALL deny access with HTTP 403 and return "Account privacy enforced" error message.**

## Todo Creation Workflow

**WHEN a user creates a new todo, THE system SHALL accept title (required), description (optional), start date (optional), and due date (optional).**

**WHEN a new todo is created, THE system SHALL set incomplete state by default and log the creation timestamp.**

**WHEN a user submits a todo with invalid date format, THE system SHALL return HTTP 400 with "Invalid date format" detail.**

## Todo Viewing and Sorting

**WHEN a user requests their todo list, THE system SHALL paginate results with default of 20 items per page.**

**WHEN a user filters todos by completion status (all, complete, incomplete), THE system SHALL only return todos matching the selected status.**

**WHEN a user sorts by due date (earliest first), THE system SHALL place todos without due dates at the end of the list.**

**WHEN a user sorts by start date (earliest first), THE system SHALL place todos without start dates at the end of the list.**

## Todo Editing and History

**WHEN a user edits a todo's title, description, start date, or due date, THE system SHALL record the change in the edit history.**

**WHEN an edit history entry is created, THE system SHALL log the timestamp, changed fields, and previous values.**

**WHEN a user requests full edit history, THE system SHALL return entries sorted from newest to oldest.**

**WHEN a user makes an edit, THE system SHALL allow reverting to any previous state in the history.**

## Trash and Deletion Management

**WHEN a user deletes a todo, THE system SHALL mark it as deleted (soft delete) and hide it from normal view.**

**WHEN a user requests deleted todos, THE system SHALL show a paginated trash list of their deleted todos.**

**WHEN a user restores a todo from trash, THE system SHALL move it back to the active todo list.**

**WHEN a user permanently deletes a todo from trash, THE system SHALL remove both the todo and its edit history.**

## Privacy and Security

**WHEN a user accesses their todos, THE system SHALL enforce strict data isolation by user ID.**

**WHEN a user's session has expired, THE system SHALL automatically log the user out with HTTP 401.**

**WHEN a user requests all data, THE system SHALL generate a password-protected ZIP file containing all todos and their history.**

## Business Context Alignment

**WHEN a user completes their onboarding flow, THE system SHALL track them as a successful acquisition event for business metrics.**

**WHEN a user reaches the 100 history entry limit, THE system SHALL prompt for premium upgrade with clear value demonstration.**

**WHEN a user attempts to upgrade to premium, THE system SHALL verify credit card details and provide immediate access to premium features.**

**WHEN a user signs up through a referral link, THE system SHALL automatically credit both parties without manual intervention.**

## Implementation-Free Requirements

- All data remains strictly private to the user and their devices
- No marketing, no third-party tracking, no data sharing
- All API endpoints require authenticated requests
- Every user operation is logged for audit purposes
- Passwords are stored as secure hashes with minimum 10k iterations

## Error Handling Standards

**WHEN an invalid operation is attempted, THE system SHALL return appropriate HTTP status code (4xx/5xx) with specific error message.**

**WHEN a server error occurs, THE system SHALL log the error without exposing internal details.**

**WHEN a rate limit is exceeded, THE system SHALL return HTTP 429 with retry-after header.**