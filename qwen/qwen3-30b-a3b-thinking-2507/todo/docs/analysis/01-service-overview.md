# Multi-User Todo Application Requirements Specification

## User Account

WHEN a user registers with valid email and password, THE system SHALL create a new account with the provided email and password hash, storing the email as the primary identifier. IF the email format is invalid, THEN THE system SHALL reject the registration attempt with "Invalid email format" error. THE system SHALL ensure only one account exists per email address, preventing duplicate registrations.

WHEN a user attempts to log in with valid credentials, THE system SHALL authenticate the user via password comparison and issue a secure JWT token. IF the credentials are invalid, THEN THE system SHALL return a generic "Invalid credentials" message to prevent email enumeration. THE system SHALL require password change for initial login as a security measure.

WHEN a user requests password change, THE system SHALL validate the current password, then set a new password. IF the current password is incorrect, THEN THE system SHALL return "Current password is incorrect". THE system SHALL enforce password complexity requirements for new passwords.

WHEN a user requests account deletion, THE system SHALL permanently delete all their data including the account, associated todos, and all edit history. IF the user is not authenticated, THEN THE system SHALL deny the request with "Unauthorized" response.