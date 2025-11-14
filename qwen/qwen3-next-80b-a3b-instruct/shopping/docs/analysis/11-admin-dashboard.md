## Admin Dashboard Requirements

### User Management

THE admin SHALL be able to suspend, deactivate, or ban any user account on the platform.
WHEN an admin suspends a user, THE system SHALL immediately revoke all active sessions and prevent re-login.
WHEN an admin deactivates a seller account, THE system SHALL preserve all existing product listings and order history but prevent new listings, edits, or order fulfillment.
WHEN an admin bans a user, THE system SHALL permanently block access and mark the account as "banned" in the database with a timestamp and admin ID.
THROUGHOUT the user management process, THE system SHALL maintain an audit log recording: the admin performing the action, the target user ID, the action type (suspend/deactivate/ban), the timestamp, and any provided reason.
IF a user has pending order disputes, THEN THE system SHALL NOT permit account deletion but SHALL allow suspension or deactivation.

### Product Moderation

WHEN a product is reported for violations (fraud, prohibited content, counterfeit goods), THE system SHALL submit it to admin review queue.
THE admin SHALL be able to edit any product's title, description, images, price, or category—even if the seller is inactive or suspended.
THE admin SHALL be able to unpublish or archive products without deleting them.
IF a product is found to violate platform policies, THEN THE system SHALL forcibly remove it from all search results, category listings, and user shops.
WHERE a product has been edited by an admin, THE system SHALL append a "Last Modified by Admin" note visible to the seller and customers.
WHILE a product is under admin review, THE system SHALL display "Under Review" status to customers and prevent purchases.

### Order Oversight

THE admin SHALL be able to override any order status, including cancellation, refund, or fulfillment.
WHEN an admin cancels an order, THE system SHALL initiate a full refund using the original payment method and notify the customer and seller.
WHEN an admin fulfills an order, THE system SHALL mark it as shipped and generate a tracking number—even if the seller has not taken action.
IF an order shows signs of fraud (multiple failed payments, mismatched addresses, high-risk payment method), THEN THE system SHALL suspend the order and trigger a manual review workflow.
THE admin SHALL be able to view all orders by status, date, seller, customer, or payment method.
WHILE an order is in "pending" or "processing" status, THE system SHALL allow admin override of shipping address and payment method.

### Inventory Monitoring

THE admin SHALL be able to view real-time inventory levels across all sellers, aggregated by SKU and product category.
WHEN any SKU's inventory drops below 5 units total across all sellers, THE system SHALL generate a platform-wide low-stock alert.
THE admin SHALL be able to export inventory reports by category, seller, or region.
WHILE inventory levels are being synced across sellers, THE system SHALL display the most recent verified stock count with a timestamp.
IF a seller's inventory is found to be inconsistently reported (e.g., shows stock when orders indicate depletion), THEN THE system SHALL flag the seller for inventory fraud review.

### Sales Analytics

THE system SHALL display a real-time sales dashboard with the following metrics:
- Total gross merchandise value (GMV) for the last 24 hours, 7 days, 30 days
- Number of orders completed per day
- Top 10 best-selling products by revenue
- Top 5-selling product categories
- Customer acquisition rate by channel
- Seller growth rate (new sellers per week)
- Average order value
- Cancellation and return rate
- Payment method distribution

WHEN the admin selects a date range, THE system SHALL recalculate all metrics based on order fulfillment dates, not creation dates.
WHERE an admin exports any report, THE system SHALL include metadata: export timestamp, admin ID, report name, and date range.

### Dispute Resolution

WHEN a customer requests a dispute resolution (refusal to receive, damaged item, wrong item), THE system SHALL notify the admin via dashboard alert.
THE admin SHALL be able to review documentation: order details, product images, shipping logs, customer and seller communication history.
IF a dispute is ruled in favor of the customer, THEN THE system SHALL automatically issue a refund and generate a return shipping label.
IF a dispute is ruled in favor of the seller, THEN THE system SHALL close the case and notify the customer that no refund will be issued.
WHERE a dispute involves high-value items (> $500), THEN THE system SHALL require two admin approvals before resolving.
WHEN a seller is found to have caused repeated valid disputes, THEN THE system SHALL automatically downgrade their seller tier or suspend their account.

### Payment Gateway Management

THE admin SHALL be able to enable, disable, or reconfigure all integrated payment gateways (credit/debit, digital wallets, bank transfer).
WHEN a payment gateway fails to process transactions for more than 30 minutes, THE system SHALL send an alert to the admin and automatically switch to backup gateway if configured.
THE admin SHALL be able to view transaction success rate per gateway, average processing time, and error codes.
IF a billing error occurs consistently with a specific payment provider, THEN THE system SHALL mark that gateway as "unreliable" and require admin approval to re-enable.
WHILE a payment gateway is disabled, THE system SHALL prevent new orders from using it but continue processing existing payments.

### Audit Logs and Reports

THE system SHALL log every admin action with the following data: timestamp (ISO 8601), admin user ID, target entity type (user/product/order/inventory), target entity ID, action performed, old value (if applicable), new value, reason provided (if any), and IP address.
THE admin SHALL be able to search audit logs by date range, actor, action type, or entity type.
WHEN generating any report (sales, inventory, audit), THE system SHALL provide it in CSV and PDF formats.
THE audit log SHALL be read-only for all users, including other admins.
IF a sensitive action is performed (user ban, deletion, payment gateway change), THEN THE system SHALL require a second admin to confirm the action before execution.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*