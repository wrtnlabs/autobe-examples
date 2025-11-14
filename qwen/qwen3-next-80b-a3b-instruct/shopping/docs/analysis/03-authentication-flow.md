## Authentication Flow

This document describes the complete authentication and session management workflow for the shoppingMall platform. It details the user interactions, system behaviors, and business rules governing how users register, log in, manage sessions, reset passwords, and securely logout. This is a canonical user-flow document intended for backend developers who will implement the stateful and stateless authentication systems.

### Guest to Customer Registration

When a guest visits the shoppingMall platform without an existing account, they may choose to register as a customer to access personalized features including cart persistence, order history, and wishlist management.

- WHEN a guest clicks on the ‘Register’ button on the homepage, THE system SHALL display the customer registration form.
- WHEN a guest submits the registration form with a valid email address and secure password, THE system SHALL validate both fields according to business rules.
- WHERE the email address is already registered to an existing customer account, THE system SHALL display an error message: "An account with this email already exists. Please login or use a different email."
- WHERE the password does not meet complexity requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number), THE system SHALL display an error message: "Password must be at least 8 characters long and include uppercase, lowercase, and numeric characters."
- WHEN the form passes all validation, THE system SHALL create a new customer account with status "pending_email_verification".
- WHEN a new customer account is created, THE system SHALL send a verification email to the registered email address containing a unique, time-limited verification token.
- WHERE the verification token expires without being used (after 24 hours), THE system SHALL automatically delete the pending account.
- WHEN the customer clicks the verification link in the email, THE system SHALL validate the token, update the account status to "active", and redirect the user to the homepage with a success message: "Your account has been successfully verified. Welcome to shoppingMall!"
- WHERE the verification token is invalid or tampered with, THE system SHALL display an error message: "Invalid verification link. Please request a new verification email."

### Customer Login and Session Management

Authenticating as a registered customer allows full access to personal features and transactions.

- WHEN a customer submits valid credentials (email and password) via the login form, THE system SHALL validate them against the database.
- IF the email does not exist in the system, THEN THE system SHALL return an error response with code: "AUTH_INVALID_CREDENTIALS" and message: "Incorrect email or password."
- IF the password is incorrect, THEN THE system SHALL return an error response with code: "AUTH_INVALID_CREDENTIALS" and message: "Incorrect email or password."
- IF the account status is "pending_email_verification", THEN THE system SHALL return an error response with code: "AUTH_ACCOUNT_NOT_VERIFIED" and message: "Please verify your email address before logging in."
- IF the account status is "suspended" or "banned", THEN THE system SHALL return an error response with code: "AUTH_ACCOUNT_SUSPENDED" and message: "Your account has been suspended. Please contact support."
- WHEN authentication succeeds, THE system SHALL generate a short-lived JWT access token (expiration: 20 minutes) and a longer-lived refresh token (expiration: 14 days).
- WHEN tokens are generated, THE system SHALL store the refresh token in an encrypted database table linked to the user ID, and SHALL send both tokens to the client.
- WHERE the client supports secure cookies, THE system SHALL store the access token in an httpOnly, secure, SameSite=Strict cookie and the refresh token in a similar httpOnly cookie.
- WHERE cookie storage is not available or preferred, THE system SHALL store the access token in localStorage and the refresh token in sessionStorage.
- WHILE a session is active, THE system SHALL accept requests only if they include a valid access token.
- WHEN a request includes an expired access token, THE system SHALL return HTTP 401 with code: "AUTH_TOKEN_EXPIRED", and SHALL include a refresh token in the HTTP headers if it is still valid.
- WHEN the client receives an "AUTH_TOKEN_EXPIRED" response, THE system SHALL automatically attempt to refresh the access token using the refresh token.
- IF the refresh token is invalid, expired, or revoked, THEN THE system SHALL clear all stored tokens and redirect the customer to the login page with message: "Your session has expired. Please login again."
- WHERE the user remains inactive for more than 30 minutes, THE system SHALL automatically expire the current access token.
- WHEN a customer logs out, THE system SHALL immediately invalidate the current refresh token in the database and clear all stored tokens from the client.
- WHEN logout is successful, THE system SHALL redirect the customer to the homepage and display a message: "You have been successfully logged out."

### Seller Onboarding and Verification

Sellers have distinct onboarding requirements to ensure trust and compliance on the marketplace.

- WHEN a guest chooses to become a seller, THE system SHALL present a separate seller registration form requesting additional business information: legal name, business name, tax ID, and bank account details.
- WHEN a seller submits the registration form, THE system SHALL validate the email address as per customer registration rules.
- WHEN both email and business information are validated, THE system SHALL create a seller account with status: "pending_review".
- WHILE a seller account is in "pending_review" state, THE system SHALL restrict access to product management features.
- WHEN an admin reviews and approves the seller’s application, THE system SHALL update the account status to "active" and assign the role "seller" to the user.
- WHEN an admin rejects a seller application, THE system SHALL update the account status to "rejected" and notify the seller via email explaining the reason.
- WHERE a seller account is suspended by an admin, THE system SHALL preserve all product listings but prevent new orders, modifications, or inventory updates.
- WHERE a seller renews their business credentials (e.g., tax ID expiration), THE system SHALL require re-verification and may temporarily suspend product visibility until compliance is confirmed.

### Admin Account Access

Admin accounts are granted elevated privileges through a controlled, non-self-service process.

- WHERE a user requests admin privileges, THE system SHALL not allow self-registration.
- WHEN an admin account is created, THE system SHALL only allow initialization by system operators via secure internal tooling.
- WHEN an admin logs in, THE system SHALL issue a JWT access token with role: "admin" and permissions array: ["manage_users", "manage_products", "manage_orders", "view_analytics", "resolve_disputes", "modify_settings"].
- WHEN an admin performs any action that modifies user data, product listings, or system configuration, THE system SHALL log the action, timestamp, admin user ID, and original state in an audit log.
- WHERE an admin’s session expires or is terminated, THE system SHALL require re-authentication with full credentials; refresh tokens are not permitted for admin accounts.
- WHEN a password reset is initiated for an admin account, THE system SHALL require multi-factor verification via registered secondary email and SMS confirmation before proceeding.

### Password Reset and Recovery

All users, regardless of actor type, have rights to recover access if credentials are forgotten.

- WHEN a user clicks "Forgot Password?" on the login page, THE system SHALL display an input field requesting the registered email address.
- WHEN a user submits a valid email address, THE system SHALL check whether any account exists with that email.
- WHERE the email matches an account, THE system SHALL generate a time-limited reset token (72 hour expiration) and send a password reset link to the email.
- WHERE the email does not match any account, THE system SHALL display a generic message: "If an account exists with this email, a reset link has been sent."
- WHEN the user clicks the password reset link, THE system SHALL validate the token and display a password reset form.
- WHEN the user submits a new password that meets complexity requirements, THE system SHALL update the user’s password hash, invalidate all existing tokens, and redirect to login with message: "Your password has been updated. You may now login with your new password."
- WHERE the reset token has expired or is invalid, THE system SHALL display message: "The password reset link has expired. Please request a new one."
- WHERE the user attempts to reuse a reset link after changing their password, THE system SHALL reject the request and terminate the session.

### Email Verification Process

Email verification is mandatory for all user registration flows to maintain platform integrity and reduce abuse.

- WHEN a new customer or seller account is created, THE system SHALL immediately send a verification email.
- THE email SHALL contain a unique, cryptographically signed URL with a 24-hour expiration.
- WHEN the user clicks the link, THE system SHALL validate the signature, timestamp, and associated user ID.
- WHERE the token is valid, THE system SHALL update the account to "active" and revoke the token.
- WHERE the token has been used or expired, THE system SHALL display message: "Your email has already been verified or the link has expired."
- WHERE the user requests to resend the verification email, THE system SHALL allow one re-send per account within 24 hours of initial registration.
- WHERE a user’s email is changed after registration, THE system SHALL immediately set the status to "pending_email_verification" and require re-verification with a new token.

### Session Expiration and Token Renewal

The system manages secure and stateful sessions to protect user data while maintaining usability.

- WHILE a user is active (tasks completed within the last 20 minutes), THE system SHALL extend the expiration of the access token with each authenticated request.
- WHEN a user’s access token expires and the refresh token is still valid, THE system SHALL automatically issue a new access token (20 minutes) without user interaction.
- WHERE user has been inactive for more than 30 minutes, THE system SHALL expire the refresh token and require re-authentication.
- IF the refresh token has expired, is invalid, or is not present, THEN THE system SHALL revoke all sessions for that user and require full login credentials.
- IF a user logs in from a new device, THE system SHALL issue a new refresh token and delete all previously issued refresh tokens for that account.
- WHEN a user changes their password, THE system SHALL immediately invalidate all active sessions and refresh tokens.
- WHEN a user reports account compromise, THE system SHALL provide a "Revoke all sessions" option that invalidates all refresh tokens and forces logout on all devices.
- WHEN a user terminates a session on one device, THE system SHALL broadcast a logout signal to all other active sessions if they are configured to support multi-device sync.

### Multi-Device Logout

To provide users with control over their account across devices and minimize security risks.

- WHEN a user selects "Sign out from all devices" in their account settings, THE system SHALL invalidate every active refresh token associated with their user ID.
- WHEN all refresh tokens are invalidated, THE system SHALL immediately terminate every active session associated with that account.
- WHEN a session is terminated remotely, THE system SHALL send a push notification (if enabled) and display a banner on the user's active device: "You have been logged out from all other devices for security reasons."
- WHERE a user logs in from a new device, THE system SHALL record it as a new device and notify the user via email or app alert with device information (current location, browser type, OS).
- WHEN a user reviews their active sessions in account settings, THE system SHALL display a list of active devices including last login time, IP address, and geographic location.
- WHERE a user terminates a session from their device list, THE system SHALL immediately invalidate the associated refresh token and end the session.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*