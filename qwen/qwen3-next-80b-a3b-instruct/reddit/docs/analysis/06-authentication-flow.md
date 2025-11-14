## Authentication Flow Requirements

This document defines the complete end-to-end authentication and authorization system for the communityPlatform. It specifies how users register, log in, maintain sessions, manage tokens, verify identity, reset passwords, and recover accounts. All operations use JSON Web Tokens (JWT) as the sole method for maintaining authenticated state. This document provides backend developers with all business rules required to implement secure, scalable, and user-friendly authentication.

### Authentication Flow Overview

The system follows a stateless, token-based authentication model using JWT. No server-side sessions are maintained. All authentication state resides in cryptographically signed tokens issued to the client. The authentication flow includes: user registration with email verification, secure login, access and refresh token issuance, session management, logout, password reset, and account recovery. Every action is tied to a user actor type as defined in the User Actors document. All tokens are issued with strict expiration policies and revocable scope.

### Registration Process

WHEN a guest attempts to register a new account, THE system SHALL display a registration form requiring email address and password.

WHEN the guest submits the registration form, THE system SHALL validate:
- Email format is valid email address (RFC 5322)
- Password is at least 12 characters long
- Password contains at least one uppercase letter
- Password contains at least one lowercase letter
- Password contains at least one numeric digit
- Password contains at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- Email is not already registered in the system

WHEN all validation passes, THE system SHALL create a new user record with status: "unverified" and generate a unique verification token.

WHEN registration is successful, THE system SHALL send a verification email to the provided email address containing a unique, time-limited verification link.

THE system SHALL NOT create a user session upon registration.

THE system SHALL NOT allow unverified users to log in or access protected features.

WHERE email verification is required, THE system SHALL reject login attempts from unverified users with an error message: "Your email address has not been verified. Please check your inbox to complete registration."

### Login Process

WHEN a user attempts to log in, THE system SHALL require email address and password.

WHEN login credentials are submitted, THE system SHALL authenticate the user by:
- Verifying the email exists in the system with status: "verified"
- Validating the provided password matches the stored hash

IF login credentials are invalid, THEN THE system SHALL return HTTP 401 status with error code: "AUTH_INVALID_CREDENTIALS".

IF login credentials are valid, THEN THE system SHALL:
- Generate a short-lived access token (JWT)
- Generate a refresh token (JWT)
- Store the refresh token hashed in the database associated with the user ID
- Set access token as HTTP-only, secure cookie with length of 15 minutes
- Set refresh token as HTTP-only, secure cookie with length of 30 days
- Return the user's actor type in the JWT payload
- Return the user's karma score and username in the JWT payload as displayed identifiers

WHEN logged in successfully, THE system SHALL change user state to "authenticated" and allow access to all member functions.

THE system SHALL NOT allow a user to log in from a device if their account has been suspended.

### Session Management

WHILE a user is authenticated, THE system SHALL maintain session validity through the presence of a valid access token in the HTTP-only cookie.

WHEN the access token expires (after 15 minutes), THE system SHALL automatically use the refresh token to request a new access token.

WHEN the refresh token is valid and unrevoked, THE system SHALL issue a new access token with a 15-minute expiration and reset the refresh token’s idle timer.

WHEN the refresh token is invalid, expired, or reported revoked, THEN THE system SHALL terminate the session and require the user to log in again.

THE system SHALL refresh the access token with every authenticated API request, extending its 15-minute lifetime.

THE system SHALL track and validate the refresh token’s hash stored in the database on every refresh attempt.

### JWT Token Structure

THE system SHALL issue exactly two JWT tokens: access token and refresh token.

THE access token SHALL contain:
- sub: userId (string, UUID format)
- role: actor type (string, one of: "member", "moderator", "admin")
- permissions: array of strings defining permissions (e.g., ["create_post", "vote", "comment"])
- username: string (user's displayed nickname)
- karma: number (current karma score)
- iat: Unix timestamp of issuance
- exp: Unix timestamp of expiration (15 minutes after issuance)

THE refresh token SHALL contain:
- sub: userId (string, UUID format)
- iat: Unix timestamp of issuance
- exp: Unix timestamp of expiration (30 days after issuance)
- jti: unique identifier (UUID) for revocation tracking

THE secret key for signing JWTs SHALL be stored in environment variables and never hardcoded.

THE system SHALL verify the integrity of every JWT using the assigned secret key before processing requests.

### Token Expiration Policy

THE access token SHALL expire exactly 15 minutes after issuance.

THE refresh token SHALL expire exactly 30 days after issuance.

WHILE a refresh token is used to issue a new access token, its expiration date SHALL remain unchanged.

WHEN a refresh token has been unused for 15 consecutive days, THE system SHALL automatically mark it as expired and invalidate it.

THE system SHALL NOT issue refresh tokens with expiration longer than 30 days.

THE system SHALL NOT issue access tokens with expiration longer than 15 minutes.

WHEN a token is expired, THE system SHALL Return HTTP 401 with code: "TOKEN_EXPIRED" and clear the authentication cookies.

### Refresh Token Mechanism

WHEN the access token expires, THE system SHALL automatically attempt to refresh the session if a valid refresh token is present in the HTTP-only cookie.

WHEN a refresh token request is received, THE system SHALL:
- Validate the refresh token signature
- Verify the token has not been revoked
- Confirm the user ID in the token matches a verified account
- Check the refresh token’s expiration
- Compare the stored hash of the refresh token in the database to the received token

IF all validations pass, THEN THE system SHALL:
- Issue a new access token with 15-minute expiration
- Generate a new refresh token with 30-day expiration
- Replace the old refresh token in the database with the new one
- Disregard the old refresh token
- Issue the new access and refresh tokens as HTTP-only cookies
- Return HTTP 200 with no body

IF validation fails, THEN THE system SHALL:
- Return HTTP 401 with error code: "REFRESH_TOKEN_INVALID"
- Invalidate and delete the previous refresh token from the database
- Clear all authentication cookies

THE system SHALL log all refresh token attempts for audit purposes.

### Logout and Session Revocation

WHEN a user initiates logout, THE system SHALL:
- Clear the access token and refresh token from HTTP-only cookies
- Mark the current refresh token as revoked in the database
- Delete the refresh token hash from the user’s record
- Immediately invalidate the token on the server

WHEN the system detects a user account is suspended or deleted, THE system SHALL automatically revoke all active refresh tokens associated with that user ID.

WHEN a user revokes access from all other devices, THE system SHALL:
- Delete all refresh token records for that user ID
- Generate a new global refresh token secret for the user
- Force re-authentication on all devices

THE system SHALL NOT allow logout timestamps to be modified by clients.

### Email Verification Process

WHEN a new user registers, THE system SHALL generate a unique, cryptographically secure verification token with a 24-hour expiration.

WHEN a verification email is sent, THE system SHALL include a link with the verification token as a query parameter.

WHEN the user clicks the verification link, THE system SHALL:
- Validate the token’s signature and expiration
- Confirm the token has not been used
- Update the user’s status to "verified"
- Delete the verification token from the database
- Clear any pending verification attempts for that email

IF the token is expired, THEN THE system SHALL display message: "The verification link has expired. Please request a new verification email."

IF the token is invalid or already used, THEN THE system SHALL display message: "This verification link is no longer valid. Please check your email or register again."

THE system SHALL allow users to request a new verification email any number of times.

WHEN a new verification email is requested, THE system SHALL:
- Generate a new verification token
- Send the new verification email
- Delete any previous unused verification token for that user

### Password Reset Flow

WHEN a user requests password reset by clicking "Forgot Password", THE system SHALL:
- Accept email address input
- Verify the email exists in the system and is verified
- Generate a unique, cryptographically secure reset token with 1-hour expiration
- Store the token hash in the database with user ID and timestamp
- Send an email containing a reset link with the unique token as a query parameter

WHEN the user clicks the reset link, THE system SHALL:
- Validate the token signature and expiration
- Display a password reset form

WHEN a new password is submitted, THE system SHALL:
- Validate password complexity (same rules as registration)
- Hash the new password using bcrypt
- Replace the old password hash in the database
- Delete the reset token from storage
- Invalidate all active sessions for this user
- Clear all authentication tokens from client cookies

IF the reset token is expired, THEN THE system SHALL display message: "The password reset link has expired. Please request a new reset link."

IF the reset token is invalid or already used, THEN THE system SHALL display message: "This password reset link is no longer valid. Please request a new one."

THE system SHALL allow only one active password reset token per user at a time.

THE system SHALL log all password reset request attempts to detect abuse.

### Account Suspension and Recovery

WHEN a user is flagged for severe policy violations, THE system SHALL:
- Change the user’s status to "suspended"
- Immediately revoke all refresh tokens associated with that user
- Clear all session cookies including access and refresh tokens
- Prevent login attempts using any credential for that account
- Notify the user via email that their account has been suspended with reason and appeal instructions

WHEN an admin decides to reinstate a suspended account, THE system SHALL:
- Change the user’s status from "suspended" to "verified"
- Allow new login attempts with existing credentials
- Require a password reset if the suspension was security-related
- Send an email notification to the user that their account has been restored

WHEN a user reports their own account as compromised, THE system SHALL:
- Begin an account recovery workflow
- Require primary email verification
- Require secondary identity proof (e.g., phone number, backup email)
- Force password reset
- Invalidate all refresh tokens
- Send confirmation of recovery to user’s verified email

THE system SHALL prohibit user self-suspension. Only admins or moderators may suspend an account.