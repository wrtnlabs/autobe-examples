# Reddit-like Community Platform Requirements

## User Account System

### Registration

WHEN a user visits the registration page, THE system SHALL display fields for email address, password, and username.

WHEN a user submits valid registration data (email, password, username), THE system SHALL:

- Validate email format (RFC 5322 compliant)
- Validate password meets minimum security requirements (at least 12 characters, contains uppercase, lowercase, digit, special character)
- Validate username uniqueness (no case-sensitive duplicates)
- Create new user account with default active status
- Hash password using bcrypt algorithm with cost factor of 12
- Send email verification message to user's email address
- Generate and store JWT refresh token
- Return HTTP 201 Created with user profile summary

WHEN a user submits registration data with invalid email, THE system SHALL return HTTP 400 Bad Request with error code "REGISTER_INVALID_EMAIL".

WHEN a user submits registration data with password that doesn't meet security requirements, THE system SHALL return HTTP 400 Bad Request with error code "REGISTER_WEAK_PASSWORD".

WHEN a user submits registration data with username already in use, THE system SHALL return HTTP 409 Conflict with error code "REGISTER_USERNAME_TAKEN".

WHEN a user submits registration data that is missing required fields, THE system SHALL return HTTP 400 Bad Request with error code "REGISTER_MISSING_FIELDS".

### Login

WHEN a user visits the login page, THE system SHALL display fields for email address and password.

WHEN a user submits valid login credentials (email + password), THE system SHALL:

- Locate user account by email
- Verify password hash matches provided password
- Check account is active and not locked
- Validate user has completed email verification (if enabled)
- Generate new JWT access token (expires in 15 minutes)
- Generate new JWT refresh token (expires in 7 days)
- Store refresh token in database with user association
- Return HTTP 200 OK with access token and user profile summary

WHEN a user submits invalid email or password, THE system SHALL return HTTP 401 Unauthorized with error code "LOGIN_INVALID_CREDENTIALS".

WHEN a user submits login request with account deactivated, THE system SHALL return HTTP 403 Forbidden with error code "LOGIN_ACCOUNT_DEACTIVATED".

WHEN a user submits login request with unverified email and email verification is required, THE system SHALL return HTTP 403 Forbidden with error code "LOGIN_EMAIL_UNVERIFIED".

WHEN a user submits login request with account locked due to failed attempts, THE system SHALL return HTTP 403 Forbidden with error code "LOGIN_ACCOUNT_LOCKED".

### Password Change

WHEN an authenticated user requests to change password, THE system SHALL:

- Require current password verification
- Verify new password meets security requirements (at least 12 characters, contains uppercase, lowercase, digit, special character)
- Prevent password reuse (last 5 passwords cannot be reused)
- Hash new password using bcrypt algorithm with cost factor of 12
- Invalidate all existing refresh tokens for the user
- Log the password change in security audit trail
- Return HTTP 200 OK

WHEN an authenticated user submits new password that doesn't meet security requirements, THE system SHALL return HTTP 400 Bad Request with error code "PASSWORD_CHANGE_WEAK".

WHEN an authenticated user submits new password that matches one of their last 5 passwords, THE system SHALL return HTTP 400 Bad Request with error code "PASSWORD_CHANGE_REUSE".

WHEN an authenticated user submits incorrect current password, THE system SHALL return HTTP 401 Unauthorized with error code "PASSWORD_CHANGE_INCORRECT_CURRENT".

WHEN an authenticated user submits password change request without authentication, THE system SHALL return HTTP 401 Unauthorized with error code "PASSWORD_CHANGE_AUTH_REQUIRED".

### Account Deletion

WHEN an authenticated user requests account deletion, THE system SHALL:

- Require explicit confirmation from user
- Require re-authentication with password verification
- Begin process of complete data removal within 24 hours
- Mark account as "pending deletion" in database
- Immediately prevent further authentication for account
- Queue associated posts for anonymization (preserve metadata but remove user association)
- Queue associated comments for anonymization (preserve metadata but remove user association)
- Remove user profile data including display name, bio, avatar
- Remove all saved preferences and settings
- Send email confirmation to user with deletion timeline
- Create security audit entry with deletion timestamp and reason
- Return HTTP 202 Accepted

WHEN a user attempts to delete account without authentication, THE system SHALL return HTTP 401 Unauthorized with error code "DELETE_ACCOUNT_AUTH_REQUIRED".

WHEN a user attempts to delete account without confirmation, THE system SHALL return HTTP 400 Bad Request with error code "DELETE_ACCOUNT_NO_CONFIRMATION".

WHEN user tries to delete account during deletion grace period, THE system SHALL return HTTP 409 Conflict with error code "DELETE_ACCOUNT_PENDING".

## User Profile System

### Profile Definition

THE system SHALL maintain the following profile fields for every user:

- Display name (string, max 50 characters, optional but defaults to username if empty)
- Bio (text, max 500 characters, optional)
- Avatar (URL to image, optional, stored in object storage)
- Karma score (integer, calculated from all votes on user's content)
- Username (string, unique, immutable after creation)
- User ID (UUID, system-generated)
- Join date (ISO 8601 datetime, immutable)
- Email (hashed, immutable)
- Email verification status (boolean)
- Last active (ISO 8601 datetime)

### Profile Editing

WHEN an authenticated user edits their profile, THE system SHALL:

- Allow modification of display name, bio, and avatar
- Prevent username changes (username is immutable)
- Validate display name is 1-50 characters
- Validate bio is 0-500 characters
- Validate avatar URL if provided (must be HTTPS, valid image format)
- Validate avatar size (max 5MB)
- Store new values in user profile record
- Regenerate profile page cache
- Return HTTP 200 OK

WHEN an authenticated user attempts to change username, THE system SHALL return HTTP 400 Bad Request with error code "PROFILE_USERNAME_IMMUTABLE".

WHEN an authenticated user attempts to set display name longer than 50 characters, THE system SHALL return HTTP 400 Bad Request with error code "PROFILE_DISPLAY_NAME_TOO_LONG".

WHEN an authenticated user attempts to set bio longer than 500 characters, THE system SHALL return HTTP 400 Bad Request with error code "PROFILE_BIO_TOO_LONG".

WHEN an authenticated user attempts to set invalid avatar URL, THE system SHALL return HTTP 400 Bad Request with error code "PROFILE_INVALID_AVATAR_URL".

WHEN an authenticated user attempts to set avatar larger than 5MB, THE system SHALL return HTTP 413 Request Entity Too Large with error code "PROFILE_AVATAR_TOO_LARGE".

### Profile Viewing

WHEN any user (authenticated or unauthenticated) views another user's profile, THE system SHALL:

- Display display name, bio, and avatar
- Display total karma score
- Display account join date
- Display last active date
- Display count of posts made by user
- Display count of comments made by user
- Display "Following" status (for authenticated users viewing other users)
- Return HTTP 200 OK with profile summary

WHEN viewing profile of user whose account is pending deletion, THE system SHALL:

- Display "Account Pending Deletion" banner
- Hide all personal information except username
- Hide karma score
- Hide post and comment counts
- Return HTTP 200 OK

WHEN viewing profile of user who has been banned from the platform, THE system SHALL:

- Display "Account Suspended" banner
- Hide all personal information except username
- Hide karma score
- Hide post and comment counts
- Return HTTP 200 OK

WHEN viewing profile of user who has not verified email, THE system SHALL:

- Display "Email Not Verified" banner
- Hide karma score
- Hide post and comment counts
- Return HTTP 200 OK

## Karma System

### Karma Calculation Logic

WHEN a member upvotes a post, THE system SHALL increase the post author's karma by 1.

WHEN a member upvotes a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a member downvotes a post, THE system SHALL decrease the post author's karma by 1.

WHEN a member downvotes a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a member removes an upvote from a post, THE system SHALL decrease the post author's karma by 1.

WHEN a member removes a downvote from a post, THE system SHALL increase the post author's karma by 1.

WHEN a member removes an upvote from a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a member removes a downvote from a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a member changes their vote on a post from upvote to downvote, THE system SHALL decrease the post author's karma by 2.

WHEN a member changes their vote on a post from downvote to upvote, THE system SHALL increase the post author's karma by 2.

WHEN a member changes their vote on a comment from upvote to downvote, THE system SHALL decrease the comment author's karma by 2.

WHEN a member changes their vote on a comment from downvote to upvote, THE system SHALL increase the comment author's karma by 2.

### Karma Integrity Rules

WHILE user is authenticated, THE system SHALL allow exactly one vote per post and one vote per comment.

IF a user attempts to vote on a post they have already voted on, THEN THE system SHALL update their existing vote rather than create a new one.

IF a user attempts to vote on a comment they have already voted on, THEN THE system SHALL update their existing vote rather than create a new one.

IF user attempts to vote on their own post or comment, THEN THE system SHALL prevent the vote and return error with code "KARMA_SELF_VOTE_PROHIBITED".

WHERE post is older than 7 days, THE system SHALL limit karma changes to ±5 points total from all voters combined.

WHERE comment is older than 7 days, THE system SHALL limit karma changes to ±3 points total from all voters combined.

THE system SHALL ensure that karma score always equals: total upvotes minus total downvotes on all user's content.

THE system SHALL store and calculate karma in real-time with no caching delays greater than 500ms.

THE system SHALL maintain perfect numerical integrity between direct karma calculations and voting event histories.

### Karma Display Requirements

WHEN displaying karma scores to authenticated users, THE system SHALL show the current number as a whole integer (positive, negative, or zero).

THE