## Admin Dashboard Requirements

The admin dashboard provides centralized, high-privilege control over the entire shopping mall platform. Admins are responsible for maintaining platform integrity, enforcing policies, approving sellers, monitoring transactions, and ensuring system-wide performance. This document defines all administrative workflows in business terms, with explicit permissions and operational constraints.

### User Management

Admins have complete authority over all user accounts, including customers and sellers.

- THE admin SHALL be able to view a detailed list of all registered users, including their registration date, last login, account status, and associated roles.
- WHEN an admin selects a user account, THE system SHALL display full profile details, including all shipping addresses, order history, wishlist contents, and review history.
- THE admin SHALL be able to suspend any user account immediately, preventing the user from logging in or performing any actions on the platform.
- THE admin SHALL be able to permanently delete any user account, which shall archive all associated data while ensuring compliance with data retention policies.
- THE admin SHALL be able to manually reset a user’s password, initiating a forced password change on next login.
- IF a user account displays suspicious activity patterns (e.g., rapid account creation from same IP, bulk order placement), THEN THE system SHALL flag the account for admin review.
- WHERE an account is flagged by the system, THE admin SHALL be notified via dashboard alert and email.
- WHILE a user account is suspended, THE system SHALL reject all login attempts and prevent access to any features or data.
- WHERE an account is deleted, THE system SHALL anonymize all personally identifiable information (name, email, phone) while preserving transactional data for accounting and reporting purposes.

### Seller Approval Workflow

Sellers must be approved by an admin before they can list products or access seller tools.

- WHEN a new seller registers, THE system SHALL assign their account status to "Pending Approval" and notify the admin team via dashboard alert and email.
- THE admin SHALL be able to view the seller’s provided business information, including legal name, business registration number, contact details, and identification documents if uploaded.
- THE admin SHALL be able to approve a seller application, which shall transition the seller’s account status to "Active" and grant access to product upload and inventory management features.
- THE admin SHALL be able to reject a seller application, which shall send a notification to the seller explaining the reason for rejection and preventing further attempts for 30 days.
- IF a seller application is rejected twice, THEN THE system SHALL permanently block the associated email and phone number from registering as a seller.
- WHILE a seller’s application is pending, THE system SHALL prevent them from uploading products, viewing analytics, or receiving customer orders.
- WHERE a seller’s account is approved, THE system SHALL automatically generate a unique seller ID and display it on their dashboard.
- THE admin SHALL be able to revoke seller status at any time, which shall immediately remove all product listings and disable seller dashboard access.
- THE admin SHALL be able to view a log of all seller approval events, including who approved/rejected, when, and the reasons if provided.

### Product and Category Management

Admins maintain the integrity and structure of the entire product catalog.

- THE admin SHALL be able to create, edit, or delete product categories at any level of the category hierarchy.
- THE admin SHALL be able to assign any product to any category, overriding seller-defined categorization.
- THE admin SHALL be able to edit any product’s name, description, images, metadata, and attributes regardless of the original seller.
- WHEN a product is edited by an admin, THE system SHALL lock the product from seller edits until the admin saves changes or reopens editing rights.
- THE admin SHALL be able to remove any product from the platform entirely, making it invisible to all users and cancels any pending orders for that product.
- IF a product violates platform policies (e.g., counterfeit, prohibited content), THEN THE admin SHALL be able to flag it for removal and initiate an automated notification to the seller.
- THE admin SHALL be able to override or reset any product’s price, even if it was set by the seller.
- THE admin SHALL be able to enforce minimum or maximum pricing rules for product categories.
- WHILE a product is flagged for review, THE system SHALL hide it from public search and category views.
- WHERE a product is deleted, THE system SHALL preserve its historical data for compliance and reporting but remove it from all active inventories and catalog searches.
- THE admin SHALL be able to batch-export all product data in CSV or JSON format for external reporting.
- THE admin SHALL be able to import product data in bulk using a standardized template.

### Order Management

Admins monitor and manage the entire order lifecycle across all sellers and customers.

- THE admin SHALL be able to view a real-time dashboard of all orders, filtered by date, status, seller, customer, or product.
- WHEN an order is viewed by an admin, THE system SHALL display the full order history with product details, pricing, taxes, shipping information, payment method, and timestamps for all status changes.
- THE admin SHALL be able to manually change an order’s status at any stage (e.g., from Processing to Cancelled, or Shipped to Delivered).
- THE admin SHALL be able to override the shipping address on any order before it transitions to "Shipped" status.
- THE admin SHALL be able to cancel any order, for any reason, and initiate a full refund to the customer’s original payment method.
- WHERE an order contains items from multiple sellers, THE admin SHALL be able to view each seller’s portion of the order independently.
- IF an order exhibits signs of fraud (e.g., mismatched billing/shipping address, multiple failed payments, uncharacteristic purchasing pattern), THEN THE system SHALL notify the admin and quarantine the order for manual review.
- THE admin SHALL be able to view a customer’s entire order history, regardless of seller, and identify patterns of abuse or behavior.
- THE admin SHALL be able to generate custom reports on order volume, success rate, average order value, and cancellation rate by seller, category, or region.
- THE admin SHALL be able to force a re-sync of inventory counts for any product or seller if inconsistencies are suspected.

### Refund and Cancellation Approvals

All customer-initiated refund and cancellation requests require explicit admin approval.

- WHEN a customer submits a refund or cancellation request, THE system SHALL place the request in "Pending Review" status and notify the admin dashboard.
- THE admin SHALL be able to view the reason provided by the customer, the order details, and any supporting information (e.g., photos of damaged goods).
- THE admin SHALL be able to approve a refund request, which shall initiate payment reversal and update the order status to "Refunded."
- THE admin SHALL be able to deny a refund request, which shall notify the customer with a reason and leave the order as completed.
- WHERE a refund is approved, THE system SHALL automatically notify the seller and adjust their settlement amount accordingly.
- THE admin SHALL be able to split a refund amount (e.g., refund only shipping or partial product value).
- IF a refund is approved for a product that has already been delivered, THEN THE system SHALL require the customer to return the item before the refund is processed, and THE admin SHALL be able to track the return.
- THE admin SHALL be able to void a cancellation request if the order has already been shipped or delivered.
- WHERE a repetitive customer submits refund requests with no valid reason, THEN THE system SHALL flag them for further supervisory review.
- THE admin SHALL be able to set global refund policies (e.g., "Refunds must be requested within 14 days of delivery") and enforce them system-wide.

### Content Moderation

Admins monitor all user-generated content to ensure quality, safety, and compliance.

- THE admin SHALL be able to view all submitted product reviews, including unapproved pending reviews.
- WHEN a review is flagged by the system (e.g., contains profanity, spam, or incomplete content), THE system SHALL notify the admin.
- THE admin SHALL be able to edit, hide, or delete any review.
- THE admin SHALL be able to unflag a review and approve it for public display.
- WHERE a seller replies to a review, THE admin SHALL be able to view all reply history and delete any abusive responses.
- IF a seller repeatedly posts inappropriate replies or attempts to manipulate reviews, THEN THE system SHALL notify the admin and recommend suspension.
- THE admin SHALL be able to remove a customer’s ability to leave reviews if they have submitted fraudulent or abusive reviews.
- THE admin SHALL be able to view all review moderation actions in an audit log, including who approved or deleted each review and when.
- THE admin SHALL be able to bulk-edit review visibility (e.g., hide all reviews for a product under investigation).
- WHERE a review contains factual inaccuracies about product features, THE admin SHALL be able to correct the review’s metadata (e.g., status, tags) without deleting its content.

### System Analytics

Admins rely on comprehensive data reporting to make strategic decisions.

- THE admin SHALL be able to view platform-wide metrics including: total users, active users (DAU/MAU), total orders, GMV (Gross Merchandise Value), refund rate, cancellation rate, and average delivery time.
- THE admin SHALL be able to segment analytics by date range (daily, weekly, monthly), region, seller, product category, or payment method.
- THE admin SHALL be able to export any analytics dashboard as PDF, CSV, or PNG image.
- THE admin SHALL be able to compare performance between sellers (e.g., who has the highest and lowest order fulfillment rate).
- THE admin SHALL be able to view real-time alerts for critical anomalies (e.g., 50% spike in failed payments, sudden drop in order volume).
- THE admin SHALL be able to view heatmaps of purchasing activity by geographic region.
- WHERE a seller’s performance falls below thresholds (e.g., order cancellation > 15%, late shipping > 10%), THEN THE system SHALL notify the admin.
- THE admin SHALL be able to generate custom reports on user acquisition cost, retention rate, and lifetime value.
- THE admin SHALL be able to integrate external analytics tools, such as Google Analytics or Mixpanel, via API.

### Platform Configuration

Admins configure platform-wide settings that affect all users and systems.

- THE admin SHALL be able to configure payment gateway settings, including which payment methods are accepted and their processing fees.
- THE admin SHALL be able to configure tax rates based on region and product category.
- THE admin SHALL be able to configure default shipping options and carriers.
- THE admin SHALL be able to set and enforce platform-wide content policies (e.g., prohibited items, review guidelines).
- THE admin SHALL be able to configure notification templates (email and SMS) for all system-triggered events.
- THE admin SHALL be able to enable or disable platform-wide features (e.g., wishlist functionality, product reviews, seller accounts).
- THE admin SHALL be able to configure automated maintenance windows for system upgrades.
- THE admin SHALL be able to configure data retention policies for logs, sessions, and backups.
- THE admin SHALL be able to set global limits: maximum shipping addresses per user, maximum wishlist items, maximum product images per listing.
- THE admin SHALL be able to manage API keys and third-party integrations.
- THE admin SHALL be able to initiate system backups and restore from previous points.
- THE admin SHALL be able to view and manage all system logs: user actions, API calls, payment events, and system errors.
- THE admin SHALL be able to purge test data or create sandbox environments for internal testing.
- THE admin SHALL be able to manage server health indicators and resource utilization alerts.

### Audit Logging

All administrative actions are permanently logged for security, compliance, and accountability.

- THE system SHALL maintain a comprehensive audit log of every admin action performed on the dashboard.
- WHEN an admin performs any action (user suspend, product delete, order status change, config update), THE system SHALL record: timestamp, admin ID, IP address, action type, object affected, and old/new values if applicable.
- THE admin SHALL be able to search the audit log by date range, admin name, action type, or affected entity.
- THE admin SHALL be able to export the audit log in encrypted format for external compliance audits.
- IF an admin attempts to delete or modify audit logs, THEN THE system SHALL block the action and trigger a security alert.
- WHERE audit logs exceed storage limits, THE system SHALL archive older logs to secure offline storage while keeping recent entries accessible.

### Summary

The admin dashboard is the central nervous system of the shopping mall platform. It empowers administrators to manage every facet of the business—from user trust and seller compliance to financial integrity and platform safety. All functions described above must be available, reliable, and auditable. Admins must be able to act quickly and confidently, with the full power of the system at their fingertips, while the system retains complete transparency of their actions. Failure to implement any of the above requirements will compromise the security, fairness, and scalability of the entire platform.




> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*