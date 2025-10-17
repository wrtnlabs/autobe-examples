# Business Rules and Validation Requirements for E-Commerce Shopping Mall Platform

## Executive Summary

This Requirements Analysis Report provides a comprehensive specification of the business requirements for the E-Commerce Shopping Mall Platform. The document focuses exclusively on business logic, user interactions, and functional capabilities in natural language, removing all ambiguity for backend developers.

### Scope
The platform will support three primary user roles: buyers (customers), sellers (merchants), and admins (system managers). Key features include user registration and address management, product catalog with search, product variants with SKU, shopping cart and wishlist, order processing, payment integration, shipping tracking, product reviews, seller account management, inventory tracking, order history and cancellation/refunds, and admin oversight.

### Business Context
The platform serves as a comprehensive digital marketplace where buyers can discover and purchase products, sellers can list and manage their inventory, and administrators can oversee platform operations. Revenue will be generated through transaction fees, seller subscriptions, or advertising.

### Assumptions
- Users have basic internet access and familiarity with online shopping.
- Payment processing will integrate with third-party gateways.
- Shipping will be handled by external providers with API tracking.
- The platform will operate 24/7 with high availability.

### Success Criteria
- Buyers can complete purchases effortlessly with clear product information and secure payments.
- Sellers can effectively manage their product listings and sales analytics.
- Admins can monitor and moderate all platform activities.
- System response times remain under 2 seconds for critical operations.

## Business Rules and Validation

### Core Business Rules

- Products must have at least one variant with SKU and positive inventory.
- Orders cannot exceed inventory levels at time of purchase.
- Reviews require completed order within 30 days.
- Sellers must verify business registration before listing products.
- Refunds cannot exceed original payment amount.

### Validation Logic

THE system SHALL validate email formats using standard regex patterns.
WHEN processing payments, THE system SHALL verify card details through gateway without storing sensitive data.
IF address fields are incomplete, THEN THE system SHALL prevent order completion.
THE system SHALL enforce SKU uniqueness across sellers.
WHEN updating inventory, THE system SHALL prevent negative stock levels.

WHEN a seller submits a new product for listing, THE system SHALL validate that all required fields are provided and meet business standards.
THE system SHALL require products to have a unique title, detailed description, category assignment, and base price.
IF the product title is empty or exceeds 100 characters, THEN THE system SHALL reject the submission with the message "Product title must be between 1-100 characters."
WHEN a seller adds product variants with SKUs, THE system SHALL enforce that each SKU is unique across the entire platform (unique across all products platform-wide).

WHEN a seller modifies a product listing, THE system SHALL allow updates to title, description, categories, and pricing but SHALL NOT allow SKU number changes.
IF a price update would result in the new price being less than $0.01 or greater than $10,000, THEN THE system SHALL reject the update with "Price must be between $0.01 and $10,000."
THE system SHALL maintain a complete audit trail of all product changes, including who made changes and when.
WHEN a product has active orders, THE system SHALL prevent price changes that could affect existing order totals.

THE system SHALL allow products to be in three states: draft, active, and hidden.
WHILE a product is in draft status, THE system SHALL display it only to the seller who created it.
WHEN a product becomes active, THE system SHALL make it visible to all buyers in search results and category browsing.
IF a seller chooses to hide a product, THEN THE system SHALL remove it from public view but preserve all associated data.
THE system SHALL automatically hide products when they have zero inventory across all variants.

WHEN validating product data, THE system SHALL ensure images are required and must be in JPEG, PNG, or WEBP format under 5MB each.
THE system SHALL require at least one valid image per product and validate that URLs are accessible.
IF product description contains prohibited keywords or excessive promotion, THEN THE system SHALL flag it for admin review before activation.
THE system SHALL validate that product categories exist in the predefined category tree and prevent assignment to non-existent categories.

WHEN a buyer initiates checkout, THE system SHALL validate that the cart contains at least one item and that all items are available.
THE system SHALL calculate the order total including item prices, shipping costs, and applicable taxes.
IF the buyer's cart becomes empty during checkout or items become unavailable, THEN THE system SHALL abort the process and return to cart with appropriate error messages.
WHEN placing an order, THE system SHALL require valid shipping and billing addresses from the buyer's saved addresses.

THE system SHALL integrate with external payment gateways and SHALL NOT store sensitive payment information locally beyond transaction completion.
WHEN payment processing fails, THE system SHALL maintain the order in pending status and provide clear error messages to the buyer.
IF payment is declined due to insufficient funds, THEN THE system SHALL allow the buyer to select alternative payment methods or cancel the order.
THE system SHALL generate unique order numbers following the format "ORD-YYYYMMDD-NNNNNN" where NNNNNN is a sequential number.

WHEN an order is initially created, THE system SHALL set its status to "pending_payment".
IF payment is successful, THEN THE system SHALL update the order status to "paid" and initiate fulfillment.
WHEN fulfillment begins, THE system SHALL transition the order to "processing" status.
THE system SHALL prevent status changes that violate the business workflow (e.g., cannot go from delivered back to processing).
WHILE an order is in "cancelled" status, THE system SHALL prevent any further status changes.

WHEN a buyer requests cancellation, THE system SHALL allow it only for orders in "pending_payment," "paid," or "processing" status.
IF an order is cancelled after payment, THEN THE system SHALL initiate a full refund if no items have shipped.
THE system SHALL deny cancellation requests for orders that have entered "shipped" or "delivered" status.
WHEN issuing refunds, THE system SHALL calculate the refund amount based on the order total minus any returned items.
THE system SHALL track refund reasons including buyer request, seller cancellation, or system issues.

THE system SHALL maintain separate inventory levels for each product variant identified by SKU.
WHEN tracking inventory, THE system SHALL use integer values representing the number of available units.
THE system SHALL prevent inventory levels from going below zero through proper validation.
WHEN a buyer adds items to cart, THE system SHALL reserve inventory temporarily to prevent over-selling.

WHEN a seller updates inventory levels, THE system SHALL validate that the new level is a non-negative integer.
IF a seller attempts to set inventory below 0, THEN THE system SHALL set it to 0 and display a warning message.
THE system SHALL automatically adjust inventory when orders are placed (decrease) or cancelled (increase).
WHEN calculating available stock for display, THE system SHALL subtract reserved items from the total inventory.

THE system SHALL generate alerts when inventory falls below predetermined thresholds per SKU.
WHEN inventory reaches 10 units or less, THE system SHALL notify the seller via email or dashboard notification.
THE system SHALL prevent orders that would exceed available inventory at checkout.
IF checkout would result in negative inventory, THEN THE system SHALL show specific out-of-stock messages for affected items.

WHILE processing inventory updates, THE system SHALL ensure atomic operations to prevent race conditions between concurrent orders.
THE system SHALL maintain inventory history logs showing all changes with timestamps and reasons.
WHEN sellers import inventory data, THE system SHALL validate that all SKUs exist and that quantities are valid integers.
THE system SHALL allow negative inventory in exceptional cases (backorders) but only with explicit seller approval.

WHEN a buyer submits a product review, THE system SHALL require the buyer to have purchased the product and received it.
THE system SHALL validate reviews to ensure they contain both rating (1-5 stars) and written content.
THE system SHALL limit review length to 5000 characters and enforce proper text encoding.
WHEN submitting reviews, THE system SHALL prevent duplicate reviews from the same buyer for the same product.

THE system SHALL automatically flag reviews containing profanity or spam keywords for manual review.
IF a review receives multiple user flags for inappropriate content, THEN THE system SHALL temporarily hide it pending admin review.
WHEN admins approve reviews, THE system SHALL make them visible and update the product's average rating.
THE system SHALL allow sellers to respond to reviews but SHALL NOT let them delete or modify customer reviews.

WHEN calculating product ratings, THE system SHALL include only approved reviews in the average calculation.
THE system SHALL update product ratings in real-time when new reviews are approved.
IF a product has fewer than 5 reviews, THE system SHALL display "Limited reviews" alongside the rating.
THE system SHALL recalculate ratings periodically and cache them for performance.

WHEN detecting potential review abuse, THE system SHALL limit buyers to one review per product purchase.
THE system SHALL flag accounts that post multiple reviews per day for suspicious activity.
IF an account is flagged for review abuse, THEN THE system SHALL temporarily suspend their review privileges.
THE system SHALL provide buyers with options to report inappropriate reviews from other users.

WHEN a user applies to become a seller, THE system SHALL require business information including company name, tax ID, and contact details.
THE system SHALL validate that business emails are in proper domain format and not commonly used personal domains.
THE system SHALL perform identity verification through email confirmation and document uploads.
WHEN processing seller applications, THE system SHALL check for duplicate businesses and prevent multiple seller accounts per business.

THE system SHALL set new seller applications to "pending" status until admin review.
WHEN admins review seller applications, THE system SHALL provide a comprehensive dashboard showing business details and verification status.
IF seller information is incomplete, THEN THE system SHALL return the application with specific requirements for resubmission.
THE system SHALL notify sellers of approval or rejection within 48 hours of submission.

THE system SHALL monitor seller performance metrics including order fulfillment rates and customer ratings.
WHEN seller performance drops below 90% fulfillment rate, THE system SHALL issue warnings and may restrict new listings.
THE system SHALL automatically suspend sellers with chronic issues but provide appeal processes.
WHEN sellers appeal suspensions, THE system SHALL allow them to provide evidence and reinstate accounts if justified.

THE system SHALL allow approved sellers to update business information but require admin re-verification for major changes.
WHEN sellers deactivate their accounts, THE system SHALL hide all their products but maintain order fulfillment obligations.
THE system SHALL terminate seller accounts after 6 months of inactivity with prior written notice.
WHILE seller accounts are suspended, THE system SHALL prevent new listings while maintaining existing orders.

WHEN admins review flagged products, THE system SHALL provide tools to approve, reject, or request modifications.
THE system SHALL maintain detailed logs of all admin actions with reasons and timestamps.
WHEN removing products for policy violations, THE system SHALL notify sellers with specific violation details.
THE system SHALL implement graduated penalties for repeated violations, from warnings to permanent bans.

WHEN admins intervene in orders, THE system SHALL allow status modifications with mandatory reason logging.
THE system SHALL notify buyers and sellers when admins modify orders or approve refunds.
WHEN processing admin refunds, THE system SHALL bypass normal cancellation time limits if justified.
THE system SHALL prevent admins from modifying completed orders older than 90 days.

THE system SHALL provide comprehensive dashboards showing platform health, sales metrics, and user activity.
WHEN system issues are detected, THE system SHALL alert admins immediately with actionable details.
WHEN suspicious patterns are detected, THE system SHALL automatically flag accounts for manual review.

WHEN granting admin permissions, THE system SHALL follow principle of least privilege with granular role assignments.
THE system SHALL log all admin login attempts and actions for security monitoring.
IF admin accounts show suspicious activity, THEN THE system SHALL temporarily lock them pending investigation.

## Error Handling and Recovery

### Registration Errors
IF email already exists during registration, THEN THE system SHALL notify user and suggest password recovery.
WHEN password reset is requested, THE system SHALL send secure reset link expiring in 30 minutes.
IF verification email fails to send, THEN THE system SHALL retry up to 3 times and log for admin review.

### Payment Failures
IF payment gateway rejects transaction, THEN THE system SHALL display specific reason and suggest alternatives.
WHEN payment timeout occurs, THEN THE system SHALL cancel reservation and allow retry.
IF billing address mismatch, THEN THE system SHALL prompt correction before retry.

### Inventory Issues
WHEN checking out with out-of-stock items, THEN THE system SHALL remove items from cart and notify buyer.
IF inventory inconsistency detected, THEN THE system SHALL prioritize safety and prevent overselling.

### Shipping Errors
WHEN tracking integration fails, THEN THE system SHALL display last known status with manual update option.
IF order is lost in transit, THEN THE system SHALL offer replacement or full refund.

### Authentication Failures
IF JWT token expires, THEN THE system SHALL redirect to login with session preservation.
WHEN account is locked due to failed attempts, THEN THE system SHALL unlock after 30 minutes or email verification.

### Recovery Flows
THE system SHALL provide "Retry" options for all recoverable errors.
WHEN system errors occur, THE system SHALL save user progress and allow continuation.

## Non-Functional Requirements

### Performance
THE system SHALL respond to all user actions within 2 seconds under normal load.
WHEN search queries are executed, THE system SHALL return results within 1 second for common searches.
THE system SHALL handle concurrent users (up to 10,000) without degradation.
WHILE processing payments, THE system SHALL complete transactions within 5 seconds.
WHILE processing inventory updates, THE system SHALL complete within 2 seconds.

### Security Considerations
THE system SHALL encrypt all sensitive data at rest and in transit.
WHEN storing payment information, THE system SHALL comply with PCI DSS standards.
THE system SHALL implement rate limiting on authentication endpoints.

### Internationalization
THE system SHALL support multiple languages and currencies.
WHEN deploying to new markets, THE system SHALL support regional payment methods.

## Conclusion

These business rules form the foundation for platform operations, ensuring consistent, fair, and reliable service for all users. The rules focus on preventing errors, maintaining data integrity, and providing clear processes for normal operations and exceptions.

Key principles across all rules:

1. User-First Approach: All rules prioritize clear user experience and communication.
2. Data Integrity: Complex validation ensures system reliability and prevents inconsistencies.
3. Exception Handling: Every rule includes handling for edge cases and error conditions.
4. Audit Transparency: Comprehensive logging supports accountability and troubleshooting.
5. Scalability Considerations: Rules account for high-volume operations and concurrent users.

Backend developers should implement these rules using appropriate technical patterns while maintaining the business intent described in natural language. Any implementation questions or clarifications should reference the core features document for additional context.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*