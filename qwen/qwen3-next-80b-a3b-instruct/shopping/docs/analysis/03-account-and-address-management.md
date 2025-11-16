## Account and Address Management

This document defines how users manage their personal identity, authentication credentials, and delivery information within the shopping mall platform. All functionality described here is accessed exclusively by authenticated users (customers) and is critical to the end-to-end purchasing experience.

### Registration Process

WHEN a guest attempts to access the shopping mall for the first time, THE system SHALL present a registration form requiring the following fields:

- Full name (minimum 2 characters, maximum 100 characters)
- Email address (must be a valid email format)
- Password (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, one digit, and one special character)
- Date of birth (must be at least 13 years prior to system date)

WHEN the guest submits the registration form, THE system SHALL perform immediate input validation.

IF any field fails validation, THEN THE system SHALL display specific error messages corresponding to each invalid field, without revealing which fields passed validation.

IF all fields pass validation, THEN THE system SHALL create an unverified user account with status "pending_email_verification" and generate a unique verification token.

WHEN the user submits the registration form successfully, THE system SHALL send a verification email to the provided email address containing a unique one-time-use verification link.

WHILE a user account is pending email verification, THE system SHALL prevent login and restrict access to all privileged functions except password reset requests.

### Email Verification

WHEN a user clicks the verification link sent in the registration email, THE system SHALL validate the verification token.

IF the verification token is expired (more than 24 hours old), THEN THE system SHALL display an error message "Your verification link has expired. Please request a new one." and prompt the user to request a new verification email.

IF the verification token is valid and not used, THEN THE system SHALL activate the user account, change its status to "active", store the verification timestamp, and redirect the user to the dashboard.

IF the verification token has already been used, THEN THE system SHALL display an error message "This verification link has already been used. Your account is already active." and redirect the user to the login page.

WHEN email verification is completed successfully, THE system SHALL log the event in the audit trail with user ID and timestamp.

IF a user requests a new verification email while still unverified, THE system SHALL send a new verification email with a new token and reset the expiration timer.

WHILE the user has unverified email, THE system SHALL display a persistent banner on all pages informing the user that email verification is pending.

### Password Management

WHEN a registered user attempts to log in with incorrect credentials, THE system SHALL display the error message "Incorrect email or password." without specifying which credential was incorrect.

WHEN a user fails to log in 5 times within 15 minutes, THE system SHALL temporarily lock the account for 30 minutes and notify the user via email that their account has been locked due to multiple failed login attempts.

WHEN a user requests a password reset via the "Forgot Password" link, THE system SHALL verify that the provided email address exists in the system and is verified.

WHEN the system verifies that the email exists and is verified, THE system SHALL generate a unique, time-limited (15-minute expiration) password reset token and send it via email.

WHEN a user clicks the password reset link in the email, THE system SHALL validate the token.

IF the token is invalid or expired, THEN THE system SHALL display an error message "This password reset link is invalid or has expired. Please request a new one." and redirect to the password reset request page.

IF the token is valid, THEN THE system SHALL present a password reset form allowing the user to enter a new password following the same complexity requirements as registration.

WHEN the user submits a new password through the verified reset flow, THE system SHALL validate the complexity requirements and update the password hash.

WHEN the password is successfully updated, THE system SHALL invalidate all existing active sessions for that user and log them out from all devices.

WHEN the password is successfully updated, THE system SHALL send a confirmation email to the user's verified email address stating that their password was changed successfully at [timestamp].

IF the user attempts to change their password without session authentication, THE system SHALL deny the request and redirect to the login page.

### Profile Editing

WHEN a customer is logged in, THE system SHALL allow them to edit their profile information, including:

- Full name (up to 100 characters)
- Date of birth (cannot be modified if account is less than 7 days old)
- Preferred phone number (optional, must be in E.164 format)
- Profile photo (optional, must be an image file under 5MB)

WHEN the customer submits profile edits, THE system SHALL validate all fields.

IF the date of birth is being changed to a date that would make the user under 13 years old, THEN THE system SHALL reject the change and display an error message "You must be at least 13 years old to use this service."

IF the phone number is provided but invalid (not in E.164 format), THEN THE system SHALL display an error message "Please enter a valid phone number in international format (e.g., +1234567890)."

WHEN profile edits are successfully submitted, THE system SHALL update the user record and display a success message "Your profile has been updated."

WHEN a profile photo is uploaded, THE system SHALL generate and store resized versions at 128x128px and 256x256px, preserving aspect ratio and optimizing for web delivery.

WHEN the profile photo is deleted, THE system SHALL remove all generated variants and set the profile photo URL to null.

### Shipping Address Management

WHERE a customer has an active account, THE system SHALL allow them to store up to 10 shipping addresses.

WHEN a customer adds a new shipping address, THE system SHALL require the following fields:

- Full name (for recipient)
- Street address (min 5 characters, max 255 characters)
- Building/apartment number (optional, max 50 characters)
- City (min 2 characters, max 100 characters)
- State/Province (min 2 characters, max 100 characters)
- Postal code (must match country-specific format)
- Country (must be selected from ISO 3166-1 alpha-2 country list)
- Phone number (optional, but if provided, must be in E.164 format)
- Address label (e.g., "Home", "Work", "Vacation") - max 50 characters

WHEN the customer selects an address label that exactly matches an existing label, THE system SHALL prevent the save and display an error message "An address with this label already exists. Please choose a different label."

WHEN the customer submits a new shipping address form with valid data, THE system SHALL validate the postal code against country-specific formats before saving.

WHEN the customer submits a new shipping address with a country other than the system-supported countries, THE system SHALL display an error message "We currently do not ship to this country. Please select from our supported shipping destinations."

WHEN a customer designates an address as "default", THE system SHALL set that address as the default for all new orders and remove the default status from any previously designated address.

WHEN a customer attempts to delete a shipping address that has been used in a past order, THE system SHALL prevent deletion and display an error message "This address cannot be deleted because it was used in a past order. You can hide it by removing the default designation."

WHEN a customer edits an existing shipping address, THE system SHALL preserve the original creation timestamp and update the last modified timestamp.

WHEN a customer selects a shipping address during checkout, THE system SHALL validate that the address is still active and has not been deleted.

### Billing Information

WHEN checkout is initiated, THE system SHALL automatically use the customer's shipping address as the default billing address.

WHERE a customer has a registered credit card on file, THE system SHALL enable the option to use a separate billing address.

WHEN a customer selects "Use different billing address", THE system SHALL display the same address form as used for shipping addresses but label it as "Billing Address".

WHEN the billing address is saved, THE system SHALL store it as an associated billing record linked to the customer and the payment method used.

WHEN a payment method (credit card) is added, THE system SHALL identify the billing address provided at that time and associate it with the payment token.

WHEN a customer changes their shipping address, THE system SHALL NOT automatically update associated billing addresses unless explicitly requested.

WHEN a customer attempts to complete a purchase with a billing address that contains invalid characters (e.g., script injection patterns), THE system SHALL sanitize all input and store only HTML-safe text.

### Session Management

WHEN a user logs in successfully, THE system SHALL generate a JWT access token valid for 20 minutes and an optional refresh token valid for 30 days.

WHEN a user accesses the application with a valid access token, THE system SHALL renew the access token's expiration to 20 minutes from the time of request.

WHEN the access token expires, THE system SHALL attempt to use the refresh token to obtain a new access token automatically.

IF the refresh token is invalid or expired, THEN THE system SHALL redirect the user to the login page.

WHEN a user logs out, THE system SHALL delete the JWT from local storage and invalidate the refresh token server-side.

WHEN a user's account is suspended or deleted, THE system SHALL immediately invalidate all associated tokens, including refresh tokens.

WHILE a user is logged in, THE system SHALL maintain their session state across browser tabs and devices using the same credentials.

WHILE a user is logged in, THE system SHALL display the user's name and profile icon in the navigation header.

WHEN a user attempts to access protected pages without a valid token, THE system SHALL redirect to the login page with a query parameter indicating the requested path.

WHEN the system detects suspicious login activity (e.g., login from a new country within 2 hours of previous login), THE system SHALL send a security alert email to the user and require two-factor authentication for future logins from that device.

WHEN two-factor authentication is required, THE system SHALL send a one-time code via SMS or authenticator app, and the user must enter the code within 5 minutes to proceed.

WHEN a user registers a new device, THE system SHALL prompt the user to confirm the device as trusted using email verification.

WHEN the user confirms a trusted device, THE system SHALL bypass 2FA prompts from that device for 30 days.

WHEN a user initiates a password change, THE system SHALL automatically revoke all active sessions and require re-login on all devices.

WHEN a user logs out from one device, THE system SHALL NOT log them out from other devices unless the user explicitly requests "Log out from all devices" from account settings.

WHEN the user selects "Log out from all devices", THE system SHALL invalidate all refresh tokens associated with the user and require reauthentication on all devices.

WHEN a customer's session expires or is manually terminated, THE system SHALL preserve their shopping cart in local storage (if guest) or server-side (if authenticated) for up to 30 days.

WHEN a customer returns after session expiration and logs in again, THE system SHALL restore their previous cart and wishlist if they have not been modified in the system.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*