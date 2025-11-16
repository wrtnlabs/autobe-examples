# Business Rules and Validation Specifications for E-commerce Shopping Mall Platform

## General Business Rules

- THE platform SHALL ensure all user actions comply with defined business rules before finalizing any process.
- THE platform SHALL validate business invariants at every transaction boundary.
- THE platform SHALL maintain complete and auditable logs for all critical actions (e.g., order placement, payment, cancellation, refund, review moderation).
- WHEN a user attempts to access or modify an entity for which they do not have proper authorization, THEN THE platform SHALL deny the request and return an explicit error detailing the lack of permission.
- WHERE a process involves financial transactions, THE platform SHALL provide precise, traceable records linking users, payments, and orders.
- THE platform SHALL treat all time-based business rules (e.g., cancellation windows, return periods) in the "Asia/Seoul" timezone by default for business logic, and present user-facing times adjusted to the user’s locale.

## Product Catalog and SKU Validation

### Product Listings
- WHEN a seller attempts to create or update a product, THE platform SHALL require the following minimum fields: product name, category, description, price, at least one image, and at least one SKU.
- IF required fields for product creation or update are missing or do not meet content rules (e.g., name length, image resolution), THEN THE platform SHALL reject the operation with a specific error message.
- WHERE conflicting product names or duplicate listings are submitted by the same seller in the same category, THE platform SHALL prevent duplication and provide actionable feedback.
- THE platform SHALL allow products to be organized into multiple categories and subcategories, maintaining category integrity rules at all times.
- THE system SHALL require that all product information submitted by sellers be free of inappropriate content, copyright violations, or misleading claims.

### SKU (Product Variant) Policies
- THE platform SHALL support SKUs with customizable attributes (e.g., color, size, option name). Sellers can define multiple variations for each product.
- WHEN a seller creates a new SKU, THE platform SHALL require the combination of attributes to be unique within the product’s set of SKUs.
- IF a duplicate SKU is detected for a product, THEN THE platform SHALL reject the addition with an error specifying the conflict.
- WHERE a SKU is disabled or out of stock, THE platform SHALL prevent that variation from being added to shopping carts or wishlists.
- THE platform SHALL require explicit inventory and price information for each SKU (variant).
- THE platform SHALL allow sellers to set individual prices, stocks, and statuses for each SKU belonging to a product.
- IF a seller attempts to set negative price or stock values for a SKU, THEN THE platform SHALL reject with an appropriate validation error.
- THE platform SHALL not allow SKU deletion if the SKU is referenced in active (not yet completed or cancelled) orders.

## Order Processing Rules

### Order Placement and Validation
- WHEN a customer attempts to place an order, THE platform SHALL validate that all selected SKUs exist, are available, and have sufficient stock for the requested quantity.
- IF one or more SKUs in an order are unavailable, out of stock, or no longer valid, THEN THE platform SHALL block the order and provide a descriptive error, listing all problematic items.
- THE system SHALL enforce per-order maximums and minimums if defined by sellers (e.g., min/max quantity allowed per product or SKU).
- THE system SHALL collect and display the final calculated amount to be paid, reflecting item totals, applied discounts, shipping costs, and taxes before the customer authorizes payment (no hidden fees).
- THE system SHALL require that the order shipping address is complete and valid according to platform rules.
- WHERE a customer’s payment fails, THE platform SHALL mark the order as unpaid/failed, give a clear error message and allow retry or selection of alternate methods.

### Payment Processing
- THE system SHALL mark an order as paid only upon confirmation of full payment from the payment gateway.
- THE system SHALL prevent duplication by disallowing payment processing for the same order more than once.
- IF a payment is confirmed but the corresponding order cannot be fulfilled due to out-of-stock or other errors, THEN THE platform SHALL initiate a full refund and notify the customer.
- WHERE a genuine error or payment discrepancy is detected, THE platform SHALL reconcile the account balances, log the case, and notify affected actors (customers/sellers/admins).

### Order Lifecycle and State Management
- THE system SHALL track all order statuses, including: pending payment, payment completed, processing, shipped, delivered, cancelled, returned, refunded.
- WHEN a customer requests cancellation or refund, THE platform SHALL validate eligibility based on order status and business policies (e.g., cancellation allowed only before shipment, refunds only for specific conditions).
- THE platform SHALL disallow cancellations/refunds for orders in final or irreversible states (e.g., already delivered and beyond the return window).
- IF an order is cancelled or refunded, THEN THE system SHALL adjust inventory counts and transaction records accordingly.
- THE platform SHALL allow both customers and sellers to view detailed order histories, including all status changes, with timestamps and reasons.

## Inventory and Stock Management

- THE platform SHALL update inventory counts in real time, reflecting all successful order placements, cancellations, and refunds.
- WHEN an order is placed, THE system SHALL deduct inventory atomically for each SKU in the order only after payment is confirmed.
- IF inventory adjustment fails (e.g., due to concurrent transactions), THEN THE platform SHALL roll back the transaction and report an error to the affected user.
- THE platform SHALL support threshold/alert rules for low inventory: WHEN a SKU’s stock drops below configurable threshold, THE system SHALL notify the seller.
- WHERE inventory is depleted, THE platform SHALL immediately update product/SKU availability and prevent further orders until stock is replenished.
- THE platform SHALL prohibit manual stock increases by sellers for returned or cancelled items until product state and quality review (if any) is resolved.
- WHEN a product or SKU is removed or disabled, THE platform SHALL ensure all related inventory is marked as unavailable and cannot be ordered.
- THE platform SHALL enable sellers and admins to audit all inventory changes, showing what actions caused each change and when.

## Review and Rating Policies

- THE platform SHALL only allow customers who have completed purchases of a product to submit reviews or ratings for that product.
- WHEN a customer attempts to submit a review, THE platform SHALL require rating selection (e.g., 1-5 stars), an optional comment (up to platform-defined maximum length), and may require a minimum wait period after delivery to prevent abuse.
- IF a review violates content policy (e.g., offensive language, spam, personal information), THEN THE platform SHALL immediately unpublish the review and flag it for admin moderation.
- WHERE repeated abuse is detected for a customer (e.g., fake reviews, review bombing, fraudulent ratings), THE platform SHALL take escalating action, from warning to restriction or ban, depending on offense severity.
- THE platform SHALL permit sellers to respond to reviews, with all seller responses clearly attributed and visible alongside customer reviews.
- THE system SHALL prevent modification or deletion of reviews after a defined window (e.g., 24 hours post-submission), except by admin intervention due to violations or technical errors.

## References to Related Documents

- For end-to-end feature requirements and use cases, see the [Functional Requirements Document](./03-functional-requirements.md).
- For user journeys and process diagrams, see the [User Flows and Journeys](./04-user-flows-and-journeys.md).
- For detailed user stories and exception cases, see the [User Scenarios and Edge Cases](./05-user-scenarios.md).

---

All business rules outlined above are to be implemented at the backend logic/service layer, ensuring that all API endpoints and system features comply strictly with these specifications. No technical schema or backend implementation details are included here; developers have autonomy over all design and architectural choices as long as the described business requirements are met strictly.