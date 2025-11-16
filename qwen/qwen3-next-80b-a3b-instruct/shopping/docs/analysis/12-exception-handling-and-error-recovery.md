## Exception Handling and Error Recovery Requirements

This document defines how the shoppingMall system should respond to error conditions, edge cases, and system failures from the user's perspective. The goal is to ensure resilience, maintain trust, and provide clear recovery pathways — never exposing technical details or leaving users confused.

### Authentication Failures

WHEN a user enters incorrect login credentials, THE system SHALL display a clear, user-friendly error message: "Email or password is incorrect. Please try again."

WHEN a user attempts to log in with an unverified email address, THE system SHALL return the message: "Please verify your email address before logging in. Check your inbox for the verification link."

WHEN a user fails to log in after 5 consecutive attempts within 10 minutes, THE system SHALL temporarily lock the account for 30 minutes and send a notification: "Your account has been locked due to multiple failed login attempts. It will unlock automatically in 30 minutes. If you believe this is an error, use the \"Forgot Password\" option."

WHEN a user attempts to log in from a new device or unrecognized location, THE system SHALL send an email and SMS notification: "Login alert: New device detected. If this was you, ignore this message. If not, reset your password immediately."

WHEN a user clicks on an expired or invalid password reset link, THE system SHALL show: "This password reset link has expired or is invalid. Request a new one by visiting the Forgot Password page."

### Invalid Input Handling

WHEN a user submits a registration form with an invalid email format (e.g., missing @ or domain), THE system SHALL display: "Please enter a valid email address (e.g., name@example.com)."

WHEN a user submits a password that does not meet requirements (less than 8 characters, no number, no special character), THE system SHALL show: "Password must be at least 8 characters long and include at least one number and one special character (e.g., !@#$%^&*)."

WHEN a user submits a shipping address with an empty street field but completes other fields, THE system SHALL highlight the missing field and show: "Street address is required. Please enter your full address."

WHEN a user enters a non-numeric value for product quantity in the cart (e.g., 'abc' or '--'), THE system SHALL reset the field to 1 and display: "Quantity must be a whole number. Defaulting to 1."

WHEN a user submits a review with more than 1,000 characters, THE system SHALL truncate the text to 1,000 characters and show: "Your review has been shortened to 1,000 characters."

WHEN a user attempts to change their email to one already registered by another account, THE system SHALL show: "This email is already in use. Please use a different email address."

### Payment Failures

WHEN a user attempts to pay with a declined credit card, THE system SHALL display: "Payment failed. Your card was declined. Please check your card details, try another card, or use a different payment method."

WHEN a user's digital wallet (e.g., PayPal, Apple Pay) has insufficient funds, THE system SHALL show: "Insufficient funds in your wallet. Please select a different payment method or add funds to your wallet."

WHEN a user's session expires during payment processing, THE system SHALL preserve the order cart and values, redirect to the login page, and show: "Your session has expired. Please log in again to complete your payment. Your cart items and order total have been saved."

WHEN a payment gateway returns an error code (e.g., API timeout, network failure), THE system SHALL display: "We couldn't process your payment at this time. Please wait a few moments and try again. If the problem continues, contact support."

WHEN a transaction is flagged for fraud by the payment processor, THE system SHALL display: "Your payment could not be processed due to security restrictions. Please contact our support team for assistance."

### Out-of-Stock Situations

WHEN a user tries to add a product to their cart that has 0 available units of the selected SKU, THE system SHALL display: "This item is currently out of stock. Please try again later or select another variant."

WHEN the inventory for a product in a user's cart drops below 1 before checkout is completed, THE system SHALL update the cart display with a warning: "One or more items in your cart are out of stock. Please review your cart before proceeding."

WHEN a user attempts to purchase a product that has been removed by the seller after being added to cart, THE system SHALL remove that item from the cart automatically, show a notification: "This product is no longer available and has been removed from your cart.", and recalculate the total.

WHEN a product's SKU variant is unavailable due to conflict (e.g., color/size combo sold out), THE system SHALL hide that variant from the product page and show: "This combination is currently unavailable. Please select another option."

### Inventory Conflicts

WHILE two users attempt to purchase the last unit of a SKU simultaneously, THE system SHALL process only the first valid request that reaches the validation stage and deny the second with: "This item sold out while you were checking out. Please try another variant or item."

WHILE inventory is being updated by a seller, THE system SHALL display all inventory states as they existed at the time the user loaded the page — no intermediate updates should be visible.

WHEN an inventory update fails due to a system error, THE system SHALL revert the item’s visible inventory to the previously confirmed state and log the error for administrator review — no user-facing message is required unless the error affects their immediate action.

### Session Expiration

WHILE a user navigates through checkout, and their session expires before completing payment, THE system SHALL redirect to the login screen and show: "Your session has expired. Please log in again to complete your order. Your cart and saved shipping address have been preserved."

WHEN a guest user’s session expires after 7 days of inactivity, THE system SHALL clear the guest cart and show: "Your shopping cart has been cleared due to inactivity. Sign in to save your items for future visits."

WHEN a registered user’s session expires after 30 days of inactivity, THE system SHALL clear their cart and show: "Welcome back! Your cart has been temporarily cleared due to inactivity. Your saved addresses and wishlist remain intact."

WHEN a user performs an action requiring authentication after session expiration (e.g., adding to wishlist), THE system SHALL show: "You must be logged in to save favorites. Please log in to continue."

### Network Failures

WHEN a user experiences a network timeout during product search, THE system SHALL display: "Unable to reach the server. Please check your connection and try again."

WHEN a user attempts to submit a product review during network failure, THE system SHALL save the draft locally in browser storage and show: "Your review couldn’t be sent due to a network issue. It has been saved locally. Try again when you’re connected."

WHEN a user refreshes the page during a partially loaded product page due to network interruption, THE system SHALL reload from server and preserve intermediate state if possible — if not, display a general message: "Something went wrong. Please reload the page."

WHEN a user attempts to upload a product image and the upload fails (connection lost, file too large), THE system SHALL display: "Upload failed. Please check your connection and ensure the file is under 10MB in size and in JPG, PNG, or GIF format."

### System Errors

WHEN a core system failure occurs (e.g., database outage, payment service unresponsive), THE system SHALL display a generic, reassuring message on all public pages: "We're experiencing temporary technical difficulties. Our team is working to fix the issue. Thank you for your patience."

WHEN an internal server error (HTTP 500) occurs during any user action, THE system SHALL NOT reveal any technical stack information, stack trace, or system status codes. Instead, it SHALL show: "An unexpected error occurred. Our team has been alerted and is resolving the issue. Please try again later."

IF an audit log entry fails to record a user action due to storage failure, THE system SHALL still complete the user-facing operation if possible (e.g., allow checkout to complete), and log the event for backend recovery — the user SHALL be unaware of this failure.

WHEN a scheduled background job (e.g., daily inventory sync, review moderation) fails, THE system SHALL notify admin via internal dashboard — no external user-facing message is required.

WHEN a scheduled email or SMS notification fails to send (e.g., due to third-party service outage), THE system SHALL queue the message for retry with exponential backoff. The user SHALL NOT receive a notification about the delivery failure.

### General Recovery Instructions for All Errors

IF any error occurs, THE system SHALL provide one clear path for recovery — never multiple conflicting options.

IF recovery requires user action (e.g., retry, log in, check email), THE system SHALL guide the user to exactly one next step.

IF no recovery path is available, THE system SHALL clearly state: "We're unable to complete this action. Please contact support for assistance."

WHEN an error occurs, THE system SHALL not clear the user’s current form or data unless security or integrity demands it — preserve as much state as possible.

ALL error messages SHALL be written in plain, empathetic language, avoiding technical terms like '404', '500', 'timeout', 'authentication', 'SKU', or 'database'.

ALL errors shall be logged with timestamp, user ID (if authenticated), IP address, user agent, and error context — but never exposed to users.

ALL error recovery flows SHALL be tested with real-world scenarios including mobile network drops, intermittent Wi-Fi, and slow connections.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.