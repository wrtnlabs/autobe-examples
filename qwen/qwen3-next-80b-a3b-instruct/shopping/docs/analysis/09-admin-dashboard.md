## Admin Dashboard Requirements

The admin dashboard serves as the central governance interface for overseeing the entire shopping mall platform. Administrators have full authority to manage users, products, orders, and system integrity. This document defines the operational workflows, permissions, and constraints for administrative functions.

### User Management

Admins have unrestricted control over all user accounts regardless of role (customer, seller, or admin). The system SHALL support the following user management capabilities:

- WHEN an admin selects a user account, THE system SHALL display full user profile data, including registration date, email, phone, shipping addresses, last login, and active sessions.
- WHEN an admin initiates a suspension, THE system SHALL immediately revoke all active sessions and prevent further login attempts.
- WHEN an admin initiates a permanent ban, THE system SHALL permanently disable the account, retain all associated data for audit purposes, and prevent future registration using the same email or phone number.
- WHILE a user account is suspended, THE system SHALL NOT allow any actions requiring authentication (e.g., placing orders, leaving reviews, accessing cart or wishlist).
- WHILE a user account is banned, THE system SHALL NOT allow any interaction with the platform, including viewing public product listings.
- IF an admin attempts to ban or suspend their own account, THE system SHALL display an error message and prevent the action.
- IF an admin attempts to delete a user account, THE system SHALL NOT permit deletion; instead, THE system SHALL only allow suspension or banning to preserve audit trails.
- WHERE an admin selects multiple users, THE system SHALL enable bulk suspension or banning operations with confirmation step.
- WHERE a user has an active order in progress, THE system SHALL display a warning before suspending or banning that user.
- THE system SHALL maintain an immutable audit log of all admin actions performed on user accounts, including timestamp, admin ID, action type, and reason provided.

### Seller Approval Panel

Sellers are provisioned accounts that require explicit administrative approval before they can list products or receive orders.

- WHEN a new seller registers, THE system SHALL create an account in "Pending Approval" status.
- WHEN an admin accesses the seller approval panel, THE system SHALL display a list of pending sellers with their business name, contact information, documents uploaded (e.g., ID, business license), and registration date.
- WHEN an admin approves a seller, THE system SHALL change their status to "Approved", send a notification email, and grant access to seller dashboard features.
- WHEN an admin rejects a seller, THE system SHALL change their status to "Rejected", send a notification with reason, and prevent reapplication for 30 days.
- IF a seller submits multiple approval requests within 30 days of rejection, THE system SHALL block further attempts and notify the admin via email.
- WHILE a seller is pending approval, THE system SHALL NOT allow them to list products, update inventory, or view sales analytics.
- WHERE a seller's submitted documents appear fraudulent or inconsistent, THE system SHALL highlight flags for admin review (e.g., mismatched names, invalid document numbers, stock photo indicators).
- THE system SHALL support one-click re-approval for sellers previously approved and deactivated.
- THE system SHALL maintain a history of all seller approval actions, including approver, decision time, and rationale.

### Product Moderation

Admins regulate product listings to ensure compliance with platform standards and legal requirements.

- WHEN an admin opens the product moderation panel, THE system SHALL display all products with moderation status (Pending, Approved, Rejected, Flagged).
- WHEN an admin flags a product, THE system SHALL immediately remove it from public search and catalog results, notify the seller, and trigger a review queue.
- WHEN an admin approves a flagged product, THE system SHALL restore its visibility to customers.
- WHEN an admin rejects a product, THE system SHALL remove it from the catalog, notify the seller with specific violation reason (e.g., "infringes copyright", "misleading description", "prohibited item"), and log the action.
- IF a product is flagged by multiple customers and confirmed as invalid, THE system SHALL automatically escalate to admin review.
- IF a seller has three or more rejected products in a 30-day period, THE system SHALL trigger a seller audit flag for admin review.
- WHERE a product contains regulated content (e.g., pharmaceuticals, weapons, adult material), THE system SHALL require explicit admin approval before publication.
- WHERE a product listing violates local legal restrictions in the user's region, THE system SHALL hide it from users in that region and notify the seller.
- THE system SHALL maintain a log of all moderation actions, including product ID, seller ID, admin ID, timestamp, action taken, and reason provided.
- THE system SHALL allow admin to edit product titles, descriptions, categories, and images directly without requiring seller intervention, with all changes recorded in an audit trail.

### Order Override and Investigation

Admins may override seller-initiated order decisions to protect platform integrity and customer experience.

- WHEN an admin accesses an order under investigation, THE system SHALL display full order history, payment details, seller communication logs, shipping updates, and customer service interactions.
- WHEN an admin overrides a seller's order fulfillment decision, THE system SHALL immediately notify the seller that fulfillment has been overridden and auto-assign fulfillment to a backup vendor if available, or initiate admin-managed fulfillment.
- WHEN an admin cancels an order after payment processing, THE system SHALL refund the customer automatically and update the payment gateway.
- WHEN an admin deactivates a seller's order processing privileges, THE system SHALL place all pending orders from that seller into "Admin Hold" status and notify the customer.
- WHILE an order is under admin investigation, THE system SHALL prevent the seller from shipping or updating the order status.
- WHILE an order is in "Admin Hold" status, THE system SHALL display a visual badge on the order in customer and seller dashboards.
- IF an order volume from a single seller exceeds 80% of the overall daily order count, THE system SHALL trigger an automated alert for admin review.
- IF an admin detects patterns of fraudulent order creation (e.g., high-value orders with common shipping addresses), THE system SHALL flag the associated accounts for investigation.
- THE system SHALL log all override actions, including original seller decision, admin override, timestamp, reason, and whether refund was issued.

### Refund Approval Authority

Admins have final authority over refund decisions when seller and customer disagreement persists.

- WHEN a customer requests a refund, THE system SHALL notify the seller and wait for response within 48 hours.
- IF the seller denies the refund within 48 hours, THE system SHALL escalate the request to admin review.
- WHEN an admin reviews a refund request, THE system SHALL display order details, reason given by customer, seller’s justification, delivery confirmation, product condition report, and communication history.
- WHEN an admin approves a refund, THE system SHALL initiate full or partial refund to the original payment method and notify both parties.
- WHEN an admin denies a refund request, THE system SHALL notify the customer with reason and indicate if appeal is possible.
- WHERE a product has been returned, THE system SHALL require physical return confirmation from the shipping carrier before processing refund, unless value is below $10.
- WHERE a refund request originates from a banned or suspended account, THE system SHALL require dual admin approval before processing.
- WHERE the seller is suspended or no longer active, THE system SHALL auto-process approved refund requests without seller confirmation.
- THE system SHALL maintain a refund audit trail, including customer, seller, admin, amount, payment method, reason, and outcome.

### System-Wide Analytics and Reporting

Admins must access comprehensive analytics to monitor platform health and compliance.

- WHEN an admin opens the analytics dashboard, THE system SHALL display real-time metrics: total active users, daily transactions, revenue per day, pending seller approvals, flagged products, and active refunds.
- WHILE an admin generates a report, THE system SHALL allow selection of date range, metric type, and user segment (customers, sellers, regions).
- WHEN an admin exports a report, THE system SHALL generate PDF or CSV files with the following data:
  - Daily and monthly revenue trend
  - Top 10 products by sales volume
  - Top 10 sellers by order count
  - Customer retention rate
  - Refund rate by product category
  - Seller approval success rate
  - Order fulfillment time distribution
  - Active suspension and ban counts
- WHERE an admin selects ‘financial’ report type, THE system SHALL include tax calculation summary and payment gateway fees.
- WHERE an admin selects ‘compliance’ report type, THE system SHALL include list of all rejected products, suspended sellers, and banned users.
- THE system SHALL generate monthly compliance reports automatically and send them to designated regulatory email addresses.
- THE system SHALL enable export of raw data for external audit tools.

### Suspension and Ban Procedures

Suspension and banning are administrative actions to protect platform integrity. These procedures follow strict policy and audit controls.

- WHEN an admin suspends a user, THE system SHALL immediately prevent access to private features (cart, wishlist, orders) but maintain public visibility of user reviews and ratings.
- WHEN an admin bans a user permanently, THE system SHALL hide all user-generated content (reviews, ratings, messages) from public view, but retain data for legal compliance.
- WHEN an admin suspends a seller, THE system SHALL immediately remove their products from search and catalog results, cancel pending orders, and freeze all payouts.
- WHILE a seller is suspended, THE system SHALL notify customers who were scheduled to receive products from them that fulfillment is under review.
- IF a user is suspended three times within 6 months, THE system SHALL automatically trigger permanent ban after the third incident.
- IF a seller is suspended three times within 30 days for inventory fraud, payment abuse, or customer harassment, THE system SHALL automatically deem it a permanent ban.
- IF admin action results in direct financial loss to a customer, THE system SHALL auto-initiate refund with first-level approval.
- THE system SHALL require a mandatory reason selection from a predefined list for all suspension and ban actions (e.g., "Fraudulent activity", "Violation of terms", "Customer complaints", "Legal violation").
- THE system SHALL store all suspension/ban events in an immutable log, including IP address, device fingerprint, time, admin ID, and reason.
- WHERE a user claims wrongful suspension or ban, THE system SHALL allow submission of appeal request, which shall be routed to a second-level admin for review within 24 hours.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*