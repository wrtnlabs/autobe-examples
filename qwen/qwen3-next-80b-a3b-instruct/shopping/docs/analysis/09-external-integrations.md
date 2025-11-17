## External Integrations and Dependencies

This document defines the mandatory third-party service integrations required for the shopping mall platform to operate as a complete, production-ready e-commerce system. All integrations are specified from a business perspective—what data must flow, under what conditions, and what reliability expectations must be met. Technical stack, API endpoints, or authentication tokens are intentionally omitted; these are left to the discretion of the development team.

### Payment Gateway Integration

WHEN a customer initiates checkout, THE system SHALL transmit the following payment data to the external payment gateway:

- Total order amount in USD (including tax and shipping)
- Customer's billing address (first name, last name, street, city, region, postal code, country)
- Customer's email address for receipt delivery
- Order ID as a reference from the shopping mall platform
- Payment method type (credit card or digital wallet)

IF the payment gateway declines the transaction, THEN THE system SHALL:

- Immediately notify the customer with a clear message explaining the transaction was declined
- Preserve the cart and order draft for 30 minutes to allow retry
- Log the decline reason code and message for audit and fraud analysis
- Offer the customer up to two additional attempts to complete payment with a different card or method

WHILE an order is in "pending_payment" status, THE system SHALL:

- Block inventory associated with the order items
- Send automated email reminders to the customer every 6 hours
- Automatically cancel the order and release inventory if payment is not completed within 24 hours

THE system SHALL guarantee that no payment data (card number, CVV, or full card track data) is ever stored within shopping mall infrastructure, even temporarily.

### Shipping and Logistics Integration

WHEN an order is marked as "paid" by the system, THE system SHALL automatically transmit the following fulfillment data to the shipping logistics provider:

- Seller's business name and registered shipping address
- Customer's full delivery address (first name, last name, street, city, region, postal code, country, phone)
- List of product SKUs and quantities
- Estimated package weight (derived from product weights + packaging)
- Requested shipping speed (standard, express, or overnight)
- Order ID and timestamp
- Customer's email and phone for delivery notifications

WHEN a shipping carrier updates the tracking status (e.g., "out_for_delivery", "delivered", "attempt_failed"), THE system SHALL:

- Automatically update the order's shipping status in the shopping mall database
- Trigger an in-app notification and email to the customer
- Log the carrier's tracking ID and update timestamp
- Allow customers to view real-time tracking map and estimated delivery window

IF the carrier returns an error indicating the address is invalid or undeliverable, THEN THE system SHALL:

- Notify the customer via email and in-app message with a request to verify or update their address
- Freeze further processing of the order
- Allow the customer 72 hours to correct the address
- If uncorrected within 72 hours, automatically cancel the order and initiate full refund

THE system SHALL support integration with at least five major logistics providers globally, including regional specialists in Asia, North America, and Europe, with graceful fallback behavior.

### Email and Notification Services

WHEN a user performs any action that triggers a business-critical notification, THE system SHALL forward the notification payload to the email and SMS service:

- Registration confirmation
- Password reset verification
- Order confirmation with total and estimated delivery date
- Shipping status change (e.g., "package shipped" or "out for delivery")
- Refund completed notification
- Review posted notification to seller
- System maintenance announcement
- Security alert (unusual login or device change)

WHEN an email notification is sent, THE system SHALL guarantee that:

- All emails are delivered within 5 minutes of triggering
- Emails are rendered with consistent branding and mobile-responsive layout
- All recipient email addresses are validated for correct format before submission
- Bounces are automatically logged and suppressed for recurring invalid addresses
- Marketing opt-out links are included and honored per regulatory standards

WHILE a user's email address remains unverified, THE system SHALL:

- Allow the user to browse and add items to cart
- Block order placement until email verification is completed
- Send a reminder email every 24 hours until the address is verified, with a maximum of three reminders

THE system SHALL allow users to opt out of marketing emails while maintaining transactional notifications.

### Geolocation and Address Validation

WHEN a customer enters a physical address during registration, checkout, or profile update, THE system SHALL:

- Send the address data (street, city, postal code, country) to a geolocation validation service
- Receive back standardized, canonical address representation
- Auto-fill missing or corrected fields (e.g., postal code based on street and city)
- Validate that the address exists in the official postal database

IF the address cannot be validated against the geolocation system, THEN THE system SHALL:

- Display a clear warning message: "We couldn't fully verify this address. Please confirm it's correct or try a different one."
- Allow the customer to proceed anyway, but mark the address as "unverified" in the backend
- Require customer to manually confirm all address fields before saving

The system SHALL store only the validated, canonical version of the address.

THE system SHALL ensure that no postal code, latitude, or longitude data is used to track, profile, or market to users outside the context of fulfilling orders.

### Fraud and Risk Detection Services

WHEN a user logs in, attempts to place an order, or changes a payment method, THE system SHALL submit the following risk assessment data to the fraud detection service:

- User's IP address and geolocation (approximated)
- Device fingerprint information (browser type, screen resolution, installed fonts)
- Previously used addresses and payment methods
- Order amount and product category
- Time since last login or account creation
- Behavioral patterns (typical typing speed, scrolling behavior)
- Similar orders placed from same IP or device in the past 24 hours

IF the fraud detection service returns a risk score above 85%, THEN THE system SHALL:

- Place the order in manual review status
- Notify the customer via SMS and email that additional verification is required
- Present a CAPTCHA challenge with limited retries
- Lock the account temporarily if three consecutive failed verification attempts occur
- Alert the admin dashboard with flagged transaction details

IF the fraud detection service returns a risk score below 20%, THEN THE system SHALL:

- Allow immediate order processing without any intervention
- Skip additional security steps
- Log the low-risk flag for future pattern analysis

THE system SHALL not rely solely on automation—each flagged transaction must be reviewable by an admin operator.

### Reporting and Analytics Platforms

WHEN any key business event occurs, THE system SHALL transmit anonymized, aggregated event data to the analytics platform:

- User registration timestamp
- Product view, add-to-cart, and purchase events
- Cart abandonment timestamp
- Order completion and refund events
- Seller onboarding success/failure
- Admin login and configuration change events
- Search queries and filter usage
- Session duration and page depth

THE system SHALL:

- Never transmit personally identifiable information (name, email, address) without explicit user consent
- Transmit data in batch every 15 minutes to reduce network latency impact
- Include only numeric identifiers (e.g., user_id, product_id) and event type codes
- Allow users to opt out of analytics tracking via account settings
- Include organization-wide agreed-upon metrics (KPIs) such as: conversion rate, average order value, cart abandonment rate, repeat customer rate

WHILE the analytics platform is unavailable, THE system SHALL:

- Queue events locally for up to 72 hours
- Continue normal operation without blocking user actions
- Discard queued events older than 72 hours
- Log system health warning for monitoring

THE system SHALL ensure that all analytics events are tagged with the user’s actor type (customer, seller, or admin) to enable role-based reporting.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.