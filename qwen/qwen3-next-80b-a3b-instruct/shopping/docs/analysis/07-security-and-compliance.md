## Security and Compliance Requirements

### Authentication Security Requirements

WHEN a user attempts to log in, THE system SHALL require valid email and password credentials.

WHEN a user submits login credentials, THE system SHALL verify them against the stored hashed password using industry-standard bcrypt with a minimum cost factor of 12.

WHEN authentication fails, THE system SHALL return a generic error message that does not disclose whether the email or password was incorrect.

WHEN a user successfully logs in, THE system SHALL generate a JWT access token with a 30-minute expiration time and a refresh token with a 30-day expiration time.

WHEN a user logs out, THE system SHALL immediately invalidate the current access token and refresh token by adding them to a short-term denylist.

WHEN a user requests password reset, THE system SHALL generate a time-bound, single-use reset token that expires after 15 minutes.

WHILE a user session is active, THE system SHALL enforce a 15-minute inactivity timeout that automatically logs the user out.

WHEN a user attempts to access a protected resource with an expired or revoked token, THE system SHALL reject the request and return HTTP 401 with no further detail.

IF a user enters incorrect password credentials five times within a 10-minute window, THE system SHALL temporarily lock the account for 30 minutes and notify the user via email.

WHEN a user changes their password, THE system SHALL verify the current password before accepting the new one.

THE system SHALL never store passwords in plaintext.

THE system SHALL never send passwords via email or any other unencrypted channel.

WHEN a user attempts to register with an email address already in use, THE system SHALL return a generic message that the email is already registered without confirming or denying account existence.

### Data Privacy and Protection

WHEN a customer submits personal information (name, address, phone, email), THE system SHALL collect only the minimum data necessary for order fulfillment.

WHEN a user requests to delete their account, THE system SHALL permanently erase all personally identifiable information (PII) associated with their account within 72 hours.

WHEN a user requests access to their personal data, THE system SHALL provide a full downloadable report of all data collected about them, including order history, reviews, addresses, and preferences, in a structured JSON format.

WHEN a user updates their personal information, THE system SHALL retain the previous value for audit purposes for a minimum of 30 days before permanent overwrite.

THE system SHALL encrypt all stored personal data at rest using AES-256 encryption.

THE system SHALL encrypt all personal data in transit using TLS 1.3 or higher.

WHERE a user has not logged in for 12 months, THE system SHALL anonymize their account data by removing all personally identifiable information except for order history necessary for legal compliance.

WHEN a seller submits documents for verification (e.g., business license), THE system SHALL store these documents securely and restrict access to admin users only.

WHEN a customer provides a credit card number in payment processing, THE system SHALL never store the full card number locally.

### Payment Security Requirements

WHEN a customer initiates a payment, THE system SHALL forward payment details exclusively to a certified third-party payment gateway and never process them directly.

WHEN a payment attempt fails, THE system SHALL display a user-friendly message without revealing technical details of the failure (e.g., insufficient funds, network timeout).

WHEN a user submits payment information, THE system SHALL use tokenization provided by the payment gateway to replace sensitive data with a non-sensitive identifier.

WHEN an order is completed, THE system SHALL retain only the last four digits of the payment method and the token for future reference, never the full card number or CVV.

WHEN a refund is processed, THE system SHALL initiate it exclusively through the original payment gateway and never manually issue a bank transfer.

IF a payment has been declined due to fraud detection, THE system SHALL notify the customer that the transaction was declined for security reasons without specifying the exact fraud rule triggered.

### User Consent and Rights

WHEN a user registers for the first time, THE system SHALL present a clear consent form that requires explicit acceptance of the terms of service, privacy policy, and marketing communications.

WHEN a user subscribes to marketing emails, THE system SHALL maintain a separate list of users who have opted in and never include those who have not.

WHEN a user withdraws consent for marketing communications, THE system SHALL immediately remove them from all promotional mailing lists and confirm the action via email.

WHEN a user requests the deletion of their personal data, THE system SHALL disable their account immediately and initiate a background process to fully purge data from all systems within 72 hours.

WHEN a user accesses their account settings, THE system SHALL provide a "Data Rights" section that clearly lists all options available to them: download data, edit data, delete account, or contact support.

IF a user is under 16 years of age, THE system SHALL require parental consent before registering and shall treat the account as a minor account with restricted data collection.

### Audit and Logging Requirements

WHEN an admin performs a sensitive action (e.g., deletes a product, blocks a user, approves a seller), THE system SHALL log the actor’s identity, timestamp, action performed, and affected resource in an immutable log.

WHEN a user changes their password, THE system SHALL log the event including the timestamp and IP address (without storing location data).

WHEN a customer fills out a product review, THE system SHALL log the submission time and associated product ID for compliance reference.

WHEN an order is canceled or refunded, THE system SHALL log the reason provided by the user and the admin who approved the change.

THE system SHALL retain audit logs for a minimum of 5 years in a write-once, read-only format.

WHEN an admin accesses the audit dashboard, THE system SHALL require multi-factor authentication.

### Regulatory Compliance Requirements

THE system SHALL comply with the General Data Protection Regulation (GDPR) for all users in the European Union.

THE system SHALL comply with the California Consumer Privacy Act (CCPA) for all users in California.

THE system SHALL comply with the Payment Card Industry Data Security Standard (PCI DSS) for all payment processing activities.

THE system SHALL not process payments for users in countries under international sanctions.

WHEN a user from the EU requests access to their data, THE system SHALL respond within 30 days.

WHEN a user from the EU requests data deletion, THE system SHALL comply within 30 days unless legal obligations require retention.

WHEN a user from California requests opt-out of data sale, THE system SHALL disable all third-party data sharing activities in response.

WHEN a legal request for user data is received, THE system SHALL require a valid subpoena or court order and shall notify the affected user unless legally prohibited.

THE system SHALL annually evaluate its compliance posture and generate an internal compliance report for review by the technical leadership.

THE system SHALL provide a link to its Privacy Policy in the website footer and in all email communication.

THE system SHALL provide a link to its Terms of Service during user registration and in the account settings menu.

THE system SHALL ensure all credentials, API keys, and secrets used for integration with external services are stored in a secure vault and never committed to source control.