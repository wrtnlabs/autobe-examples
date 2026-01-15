# Customer Registration and Profile Management Flow

This document details the complete end-to-end customer journey for registration, authentication, profile management, and address handling on the shoppingMall platform. All flows are written from the user's perspective with clear business rules, validation requirements, and error conditions defined using EARS format. This documentation serves as the single source of truth for backend developers implementing the customer registration and profile subsystem.

## Guest to Customer Conversion

The shoppingMall platform enables guests to convert into registered customers through a seamless registration process. Guests may browse products, add items to wishlist, and view public product information without authentication. To engage in transactions, guests must complete registration.

THE system SHALL enable guests to initiate conversion to registered customers through visible registration CTA buttons on key pages (homepage, product listings, cart).

WHEN a guest clicks on a registration CTA, THE system SHALL display the registration form with required fields: full name, email address, and password.

IF a guest attempts to access customer-specific features (cart, wishlist, checkout) without being authenticated, THE system SHALL redirect to registration or login page with clear messaging.

WHILE a guest remains unauthenticated, THE system SHALL not persist cart or wishlist data beyond browser session.

WHERE a user has previously attempted registration but abandoned the process, THE system SHALL NOT automatically recover partial registration data without explicit user action.

## Registration Process Flow

The registration process requires explicit user consent and validated input. All registration attempts must be traceable and logged for security.

WHEN a user submits registration form with email, name, and password, THE system SHALL validate all fields according to business rules.

WHEN email format is invalid (e.g. missing @, invalid domain), THE system SHALL display error: "Please enter a valid email address."

WHEN email address is already registered in the system, THE system SHALL display error: "An account already exists with this email address. Please login or use password reset."

WHEN password is less than 8 characters, THE system SHALL display error: "Password must be at least 8 characters long."

WHEN password contains only common words (e.g. "password", "12345678"), THE system SHALL display error: "Password cannot be a commonly used or easily guessable word."

WHEN password does not contain at least one uppercase letter, one lowercase letter, one number, and one special character, THE system SHALL display error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."

WHEN name field is empty, THE system SHALL display error: "Please enter your full name."

WHEN name field contains only whitespace or special characters, THE system SHALL display error: "Please enter a valid full name."

WHEN all registration fields pass validation, THE system SHALL create a new customer account with status "pending_email_verification".

WHEN customer account is created, THE system SHALL generate a unique, cryptographically secure verification token.

WHEN verification token is generated, THE system SHALL send an email to the registered email address with subject: "Confirm your shoppingMall account" containing a unique verification link.

WHEN verification link expires (1 hour after sending), THE system SHALL mark the verification token as expired and require user to request new verification email.

WHEN registration is rejected due to detected fraud indicators (e.g. disposable email, bot pattern), THE system SHALL block registration and display: "Registration failed due to security restrictions. Please contact support."

WHERE customer attempts to register using an email from a banned domain (e.g. mailinator.com), THE system SHALL reject registration with: "We do not accept registrations from temporary email services. Please use a personal or business email."

## Email Verification Workflow

Email verification is mandatory before customers can fully access the platform. Verification ensures account authenticity and prevents anonymous abuse.

WHEN user receives verification email, THE system SHALL provide a unique verification link in format: https://shoppingMall.com/verify?token={token}

WHEN user clicks verification link, THE system SHALL validate the token against stored records.

WHEN token is valid and not expired, THE system SHALL update user account status to "active" and clear the verification token.

WHEN token is invalid or malformed, THE system SHALL display: "This verification link is not valid. Please check your email again or request a new one."

WHEN token is expired, THE system SHALL display: "This verification link has expired. Please request a new verification email."

WHEN user requests new verification email, THE system SHALL check that account status is "pending_email_verification".

WHEN account status is not "pending_email_verification", THE system SHALL display: "Your account has already been verified. Please login."

WHEN user requests new verification email, THE system SHALL send a new verification email with fresh token and 1-hour expiration.

WHEN user successfully verifies email, THE system SHALL redirect to homepage with success message: "Your email has been verified. Welcome to shoppingMall!"

WHILE account status is "pending_email_verification", THE system SHALL restrict access to order placement, wishlist management, and shipping address editing.

IF user attempts to login while account is "pending_email_verification", THE system SHALL display: "Your email address is not yet verified. Please check your inbox for a verification email."

## Address Management Workflow

Customers may manage multiple shipping addresses for order fulfillment. Addresses must be validated and stored in standardized format.

WHEN user navigates to "My Addresses" section, THE system SHALL display list of all saved addresses with edit and delete options.

WHEN user adds new address, THE system SHALL require: first name, last name, street address, city, state/province, postal code, country, and phone number.

WHEN user attempts to save address with empty first name, THE system SHALL display: "Please enter your first name."

WHEN user attempts to save address with empty last name, THE system SHALL display: "Please enter your last name."

WHEN user attempts to save address with empty street address, THE system SHALL display: "Please enter your street address."

WHEN street address is less than 5 characters, THE system SHALL display: "Street address must be at least 5 characters long."

WHEN city is empty, THE system SHALL display: "Please enter your city."

WHEN state/province is empty, THE system SHALL display: "Please enter your state or province."

WHEN postal code is empty, THE system SHALL display: "Please enter your postal code."

WHEN postal code format is invalid for selected country (e.g. 5 digits for USA, alphanumeric for Canada), THE system SHALL display: "Please enter a valid postal code for {country}."

WHEN country is empty, THE system SHALL display: "Please select your country."

WHEN phone number is empty, THE system SHALL display: "Please enter your phone number."

WHEN phone number format is invalid for selected country, THE system SHALL display: "Please enter a valid phone number for {country}."

WHEN user submits new address with all fields valid, THE system SHALL save address and make it active.

WHEN user selects address as "default", THE system SHALL set that address as default for all future orders.

WHEN user deletes address, THE system SHALL prohibit deletion if it is the only address or if it is used in pending orders.

IF user attempts to delete address used in pending order, THE system SHALL display: "This address is associated with a pending order and cannot be deleted."

WHEN user changes default address, THE system SHALL update all future order submissions to use the new default.

WHEN user submits an order, THE system SHALL use the default address unless another address is explicitly selected.

WHEN user selects different address during checkout, THE system SHALL temporarily override the default setting for that order only.

WHILE an order is in "processing" or "shipped" status, THE system SHALL prevent modifications to the address used in that order.

## Profile Update Procedures

Customers may update non-address personal information at any time while logged in.

WHEN user accesses profile settings, THE system SHALL display: full name, email address, and password change options.

WHEN user attempts to update full name, THE system SHALL validate that the new value is not empty and contains at least two words.

WHEN new name contains invalid characters (e.g. symbols not allowed in names), THE system SHALL display: "Name can only contain letters, spaces, hyphens, and apostrophes."

WHEN user attempts to update email address, THE system SHALL require password re-authentication.

WHEN user submits new email address, THE system SHALL validate: format, uniqueness, and domain compliance.

WHEN new email address is already registered by another user, THE system SHALL display: "This email address is already in use. Please use a different email."

WHEN user changes email address, THE system SHALL immediately change the account email to "pending_verification" status.

WHEN email change is submitted, THE system SHALL send verification email to the new address with subject: "Confirm your new email address."

WHEN user verifies new email, THE system SHALL update account email permanently and deactivate old email.

WHEN user cancels email change during verification, THE system SHALL retain original email and discard new address.

WHEN user changes password, THE system SHALL require current password for authentication.

WHEN current password is incorrect, THE system SHALL display: "Your current password is incorrect. Please try again."

WHEN new password does not meet complexity requirements, THE system SHALL display: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."

WHEN new password matches previous password (in last 5 revisions), THE system SHALL display: "New password cannot be the same as your last 5 passwords."

WHEN password change is successful, THE system SHALL log out all active sessions and display: "Your password has been successfully changed. You have been logged out of all devices. Please login again."

WHEN user updates profile information, THE system SHALL record timestamp and IP address of change for audit purposes.

## Login and Session Flow

Authentication is required to access customer features. Sessions must be managed securely and automatically expire when inactive.

WHEN user navigates to login page, THE system SHALL display: email field, password field, and "Remember Me" checkbox.

WHEN user submits login credentials, THE system SHALL validate: email format, account existence, and password match.

WHEN email is not registered, THE system SHALL display: "No account exists with this email address. Please register or try another email."

WHEN password is incorrect, THE system SHALL display: "Incorrect password. Please try again."

WHEN account is locked due to multiple failed attempts (5+ in 15 minutes), THE system SHALL display: "Your account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or use password reset."

WHEN account is "pending_email_verification", THE system SHALL display: "Your email address is not yet verified. Please check your inbox for a verification email."

WHEN account is "suspended" by admin, THE system SHALL display: "Your account has been suspended. Please contact customer support for assistance."

WHEN login credentials are valid, THE system SHALL create a JWT session token with payload containing: userId, role, permissions array, and issuedAt timestamp.

WHEN user selects "Remember Me", THE system SHALL issue refresh token with 30-day expiration, stored as httpOnly cookie.

WHEN user does not select "Remember Me", THE system SHALL issue session-only JWT token without refresh token.

WHEN session expires (30 minutes of inactivity), THE system SHALL redirect to login page with message: "Your session has expired. Please login again."

WHEN user logs out, THE system SHALL invalidate JWT token and clear session cookies.

WHEN user accesses any protected route, THE system SHALL validate JWT signature and expiration.

WHEN JWT token is expired, THE system SHALL attempt to use refresh token (if present).

WHEN refresh token is valid and not expired, THE system SHALL issue new JWT token and reset session timeout.

WHEN refresh token is invalid or expired, THE system SHALL redirect to login page.

WHILE logged in, THE system SHALL persist cart data across all devices and sessions.

## Password Reset Process

Users who forget their password may reset it through a secure, token-based flow.

WHEN user clicks "Forgot Password" on login page, THE system SHALL display email input field.

WHEN user submits email for password reset, THE system SHALL verify the email is registered.

WHEN email is not registered, THE system SHALL display: "No account exists with this email address."

WHEN email is registered, THE system SHALL generate a unique, cryptographically secure reset token with 1-hour expiration.

WHEN reset token is generated, THE system SHALL send email to user with subject: "Reset your shoppingMall password" containing unique reset link.

WHEN user clicks reset link, THE system SHALL validate token and display password reset form.

WHEN token is expired, THE system SHALL display: "This reset link has expired. Please request a new password reset."

WHEN token is invalid, THE system SHALL display: "This reset link is not valid. Please request a new password reset."

WHEN user submits new password in reset form, THE system SHALL validate password complexity requirements (8+ characters, uppercase, lowercase, number, special char).

WHEN new password does not meet complexity requirements, THE system SHALL display: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."

WHEN new password matches previous password (in last 5 revisions), THE system SHALL display: "New password cannot be the same as your last 5 passwords."

WHEN password is successfully reset, THE system SHALL invalidate all existing session tokens, clear all active devices, and display: "Your password has been successfully reset. You may now login with your new password."

WHEN password reset is successful, THE system SHALL send confirmation email to user's address: "Your shoppingMall password has been changed. If you didn't request this change, please contact us immediately."

WHEN user requests multiple password resets within 10 minutes, THE system SHALL temporarily block further requests for 10 minutes with message: "You've requested too many password resets in a short time. Please wait 10 minutes before trying again."

NOTE: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.