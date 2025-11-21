# Authentication Flow

This document defines the complete end-user experience for authentication within the communityBBS platform. It outlines every step a citizen, moderator, or admin encounters when registering, logging in, managing sessions, recovering passwords, or interacting with the system across multiple devices. All requirements are written in natural language to ensure developers understand the user perspective before implementing technical solutions.

## Registration Process

WHEN a new user accesses the communityBBS platform for the first time, THE system SHALL display a registration form with fields for email address and password.

WHEN a user submits a registration request, THE system SHALL validate the email address format (must contain @ and a valid domain).

WHEN the email address is already registered in the system, THE system SHALL reject the registration and display: "An account with this email already exists. Have you forgotten your password?"

WHEN the password is less than 12 characters, THE system SHALL reject the submission and display: "Password must be at least 12 characters long. Use a mix of letters, numbers, and symbols."

WHEN the password contains the user's email address as a substring, THE system SHALL reject the submission and display: "Password cannot include your email address."

WHEN the registration form passes all validations, THE system SHALL create an unverified user account with role "citizen", store the hashed password, and send a verification email containing a unique, time-limited confirmation link.

WHEN the user does not provide a username during registration, THE system SHALL automatically generate one using the first part of their email before the @ symbol (e.g., user@domain.com → username: user).

WHILE the user account is unverified, THE system SHALL prevent the user from posting, commenting, or accessing any private features.

## Login Flow

WHEN a registered user attempts to log in, THE system SHALL present a login interface with fields for email address and password.

WHEN a user submits login credentials, THE system SHALL validate the email address format and match the password against the stored hashed value.

IF the credentials are invalid, THEN THE system SHALL display: "Invalid email or password. Please try again or reset your password."

IF the user account is unverified, THEN THE system SHALL display: "Your email address has not been verified. Please check your inbox for a verification email."

IF the user account has been suspended by a moderator or admin, THEN THE system SHALL display: "Your account has been suspended. Please contact support for more information."

WHEN valid credentials are provided and the account is active, THE system SHALL issue a short-lived access JWT token with expiration set to 20 minutes, and a refresh JWT token with expiration set to 14 days.

THE JWT access token payload SHALL include: 
- userId (string type, unique identifier from database)
- role (string type: "citizen", "moderator", or "admin")
- permissions (array of strings: e.g., ["create_post", "comment", "edit_own_post", "delete_own_post"])

THE system SHALL store the refresh token in an HTTP-only, Secure cookie with SameSite=Strict.

WHEN login is successful, THE system SHALL redirect the user to their dashboard and set a client-side flag indicating they are authenticated.

WHEN a user logs in from a new device or browser, THE system SHALL trigger a notification to their registered email: "New login detected from [Device/Location]. If this was not you, revoke access at [link]."

## Session Management

WHILE a user is authenticated, THE system SHALL maintain active session state using the refresh token.

WHEN the access token expires (after 20 minutes), THE system SHALL automatically use the refresh token to obtain a new access token without requiring user interaction.

WHEN the refresh token is invalid, revoked, or expired, THE system SHALL log the user out and redirect them to the login page with message: "Your session has expired. Please log in again."

WHEN a user manually logs out, THE system SHALL delete the refresh token cookie and invalidate the refresh token server-side.

WHEN a user logs out from one device, THE system SHALL maintain active sessions on other devices unless the user specifically chooses to "Revoke access from all other devices."

WHEN any session token is revoked by an admin or the user, THE system SHALL immediately invalidate that token across all servers and notify the user: "Your account was accessed from another location. Your sessions have been terminated for security."

The user SHALL be able to view their active sessions in their account settings under "Active Logins."

In the "Active Logins" section, THE system SHALL display for each session:
- Device type (mobile, desktop, tablet)
- Browser and OS
- Geographic location (city and country)
- Last activity timestamp
- Option to revoke that session individually
- Option to revoke "All other sessions"

## Password Recovery

WHEN a user clicks "Forgot Password," THE system SHALL display a form requesting their registered email address.

WHEN a user submits their email address for password recovery, THE system SHALL verify that the email is registered.

WHEN the email is found, THE system SHALL generate a unique, time-limited password reset token with expiration set to 60 minutes.

WHEN the password reset token is generated, THE system SHALL send an email containing a secure link: https://communityBBS.example.com/reset-password?token=xxx

WHEN a user clicks the password reset link, THE system SHALL validate the token and display a form to enter a new password.

WHEN the new password fails validation (less than 12 characters, contains email, etc.), THE system SHALL reject it with the same error messages used during registration.

WHEN the new password passes validation, THE system SHALL update the password hash, invalidate all existing refresh tokens for that user, and log the user out of all active sessions.

WHEN the password reset token has expired, THE system SHALL display: "The password reset link has expired. Please request a new one."

WHEN the user attempts to use an invalid or previously used reset token, THE system SHALL display: "This reset link is no longer valid. Please request a new one."

## Security Features

THE system SHALL enforce the following security measures:
- All authentication traffic MUST occur over HTTPS
- Passwords MUST be stored using bcrypt with a work factor of 12 or higher
- All authentication tokens MUST be signed with a server-side secret key (not exposed to clients)
- The system SHALL enforce IP rate limiting: 5 failed login attempts per minute from the same IP
- After 5 consecutive failed login attempts, THE system SHALL temporarily lock the account for 15 minutes and send an alert email to the user

WHEN a user attempts to log in from an unfamiliar country or IP range, THE system SHALL require additional authentication step: email confirmation code.

WHEN a user enables two-factor authentication (not implemented yet but planned), THE system SHALL allow them to generate backup recovery codes and store them securely.

## Multi-Device Considerations

WHEN a user logs into the system from a new device, THE system SHALL treat it as a new session and issue new tokens while maintaining existing ones on other devices.

WHEN a user revokes access from a specific device in "Active Logins," THE system SHALL immediately invalidate the refresh token for that session.

WHEN a user chooses "Revoke access from all other devices," THE system SHALL invalidate ALL existing refresh tokens except the current one.

WHEN a user logs into communityBBS from a public or shared device, THE system SHALL prompt: "Are you using a public computer? Check this box to automatically log you out after 1 hour."

WHEN the "public device" checkbox is selected, THE system SHALL override the default 14-day refresh token expiration and set it to 1 hour.

WHEN a user logs out using a public device setting, THE system SHALL immediately delete the refresh token cookie and invalidate the token server-side.

WHEN a user changes their password, THE system SHALL invalidate ALL tokens across ALL devices.

WHEN a user changes their email address, THE system SHALL invalidate ALL tokens and require them to re-login and re-verify email address.

WHEN a moderator or admin suspends a user account, THE system SHALL immediately terminate all active sessions for that user.

WHEN a moderator or admin deletes a user account, THE system SHALL immediately terminate all active sessions and purge all authentication data.

WHEN any user triggers an account security audit (e.g., report a suspicious login), THE system SHALL automatically invalidate all refresh tokens and require the user to re-authenticate.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*