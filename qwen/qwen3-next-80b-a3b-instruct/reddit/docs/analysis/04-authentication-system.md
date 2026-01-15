# Authentication System Requirements

## Registration Flow

WHEN a guest attempts to register for an account, THE system SHALL provide a registration form requesting email address, username, and password.

WHEN a guest submits the registration form, THE system SHALL validate:
- Email format conforms to standard email format
- Username contains only letters, numbers, underscores, and hyphens
- Username length is between 3 and 20 characters
- Password length is at least 8 characters
- Password does not contain the username or email

WHEN registration data is valid, THE system SHALL create a new user account with status "unverified".

WHEN a new account is created, THE system SHALL send a verification email to the provided email address with a unique verification token.

WHILE a user account is "unverified", THE system SHALL deny all authentication requests.

WHEN a user clicks the verification link in the email, THE system SHALL validate the verification token and change the account status to "verified".

WHEN a user registration fails validation, THE system SHALL return HTTP 400 with specific error messages for each failed validation rule.

WHEN email verification fails or expires, THE system SHALL allow users to request a new verification email.

IF a user attempts to register with an email already in use, THE system SHALL return HTTP 409 with error message "Email already registered".

IF a user attempts to register with a username already in use, THE system SHALL return HTTP 409 with error message "Username already taken".

## Login Flow

WHEN a registered user attempts to log in, THE system SHALL require email address and password.

WHEN login credentials are submitted, THE system SHALL verify the user account status is "verified".

WHEN account status is "verified", THE system SHALL verify the provided password matches the stored hash.

WHEN credentials are valid, THE system SHALL generate a JWT access token with expiration of 30 minutes and a refresh token with expiration of 7 days.

WHEN authentication is successful, THE system SHALL respond with:
- Access token
- Refresh token
- User ID
- User role
- Token expiration time

WHEN login credentials are invalid, THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS".

WHEN an unverified account attempts to log in, THE system SHALL return HTTP 403 with error code "ACCOUNT_UNVERIFIED".

WHEN a user's account is marked as "banned", THE system SHALL return HTTP 403 with error code "ACCOUNT_BANNED".

WHEN a user has exceeded 5 failed login attempts within 10 minutes, THE system SHALL temporarily lock the account for 15 minutes and return HTTP 429 with error code "LOGIN_LOCKED".

WHEN a user logs in from a new device or location, THE system SHALL record the device fingerprint and send a notification to the user's registered email.

## Session Management

WHILE a user is authenticated, THE system SHALL maintain the user session using the JWT access token in the Authorization header.

WHEN an access token expires, THE system SHALL reject requests with HTTP 401 unless a refresh token is provided.

WHEN a valid refresh token is provided, THE system SHALL generate a new access token with 30-minute expiration and return it to the client.

WHEN a refresh token expires or is invalid, THE system SHALL return HTTP 401 with error code "REFRESH_TOKEN_INVALID".

WHEN a user logs out, THE system SHALL revoke the current refresh token and remove it from the token blacklist.

WHEN a user logs out from all devices, THE system SHALL revoke all refresh tokens associated with that user account.

WHEN a user changes their password, THE system SHALL immediately revoke all existing refresh tokens for that account.

WHEN a user's account is banned or deleted, THE system SHALL immediately revoke all tokens associated with that account.

WHERE a user has multiple active sessions, THE system SHALL allow the user to view and terminate individual sessions from their profile settings.

## Password Recovery

WHEN a user requests password recovery, THE system SHALL require the user's email address.

WHEN a valid email is provided, THE system SHALL verify the account exists and is "verified".

WHEN a valid account is found, THE system SHALL generate a time-limited password reset token (expiration: 1 hour) and send it via email.

WHEN a user clicks the password reset link, THE system SHALL validate the token and display the password reset form.

WHEN a user submits a new password in the reset form, THE system SHALL validate the new password meets security requirements (minimum 8 characters, no username/username variations).

WHEN password validation passes, THE system SHALL update the password hash and immediately revoke all existing refresh tokens.

WHEN the password reset token is invalid, expired, or used, THE system SHALL show error message "Invalid or expired reset link".

WHEN a password reset request is made, THE system SHALL record the IP address and device information for security auditing.

## Authentication Tokens

WHEN authentication is successful, THE system SHALL use JWT (JSON Web Tokens) for all session management.

THE system SHALL use HS256 algorithm with a secret key rotated every 90 days for signing access and refresh tokens.

THE access token SHALL contain:
- userId: UUID
- role: "guest" | "member" | "admin"
- exp: Expiration timestamp (30 minutes from issuance)
- iat: Issued at timestamp

THE refresh token SHALL be:
- Stored as a SHA-256 hashed value in the database
- Associated with the user account and device context
- Expiry time of 7 days from issuance
- Marked as revoked when used, expired, or when user requests logout from all devices

THE system SHALL maintain a token blacklist for revoked refresh tokens with TTL of 7 days.

THE access token SHALL be stored in memory on the frontend (not in localStorage or cookies) with expiration handling.

THE refresh token SHALL be sent via HTTP-only, Secure, SameSite=Strict cookie for maximum security.

WHEN the access token is expired, THE system SHALL automatically attempt to refresh the token using the refresh token.

WHEN the refresh token fails to refresh the access token, THE system SHALL redirect the user to the login page.

## Cross-Platform Support

WHEN a user accesses the platform from a web browser, THE system SHALL use standard cookie-based authentication with HTTP-only, Secure, SameSite=Strict refresh tokens.

WHEN a user accesses the platform from a mobile application, THE system SHALL use bearer token authentication with JWT access tokens stored in secure memory.

WHEN a user accesses the platform from a third-party application, THE system SHALL support OAuth 2.0 authorization code flow with PKCE.

WHEN a user creates a new device profile (mobile app, desktop client), THE system SHALL generate a device-specific refresh token.

WHILE a user is actively using a device, THE system SHALL extend the refresh token lifetime by 7 days for that specific device.

WHEN a user revokes access from a specific device, THE system SHALL delete the device-specific refresh token and invalidate any associated access tokens.

WHERE a user enables two-factor authentication, THE system SHALL require a one-time code from authenticator app during login.

WHEN a user enables two-factor authentication, THE system SHALL generate and store recovery codes that can be used if the authenticator app is inaccessible.

THE system SHALL allow users to view a list of all active devices and revoke access from any device at any time.

WHEN a user logs in from a new location (geographically different from previous logins), THE system SHALL require additional verification through email or SMS.

THE system SHALL support single sign-on (SSO) integration with enterprise identity providers (SAML 2.0, OpenID Connect).

THE system SHALL maintain audit logs of all authentication events including:
- Login success/failure
- Password changes
- Device changes
- Token refresh events
- Account lock/unlock events
- Two-factor authentication attempts

WHEN a system-wide security incident is detected, THE system SHALL have the capability to invalidate all tokens across the platform with a single operation.