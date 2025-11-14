## Order Processing Workflow

This document defines the complete end-to-end order processing and fulfillment lifecycle for the shoppingMall platform, detailing how orders are captured, communicated, fulfilled, tracked, and resolved from the perspective of customers, sellers, and the system.

### Order Capture and Confirmation

When a customer completes the checkout process and successfully submits payment, THE system SHALL immediately generate a unique order number and persist the complete order state, including all product SKUs, quantities, prices, shipping address, and payment method details.

WHEN the payment is confirmed as successful by the payment gateway, THE system SHALL transition the order status to "pending" and SHALL send a confirmation email and SMS notification to the customer containing:
- Order number
- List of items purchased with SKU identifiers
- Total amount charged
- Estimated delivery date
- Shipping address
- Contact information for support

THE system SHALL display a success page to the customer showing the order number and estimated delivery window, with a button to view order history.

WHILE an order is in "pending" status, THE system SHALL prevent the customer from modifying the order or initiating a cancellation request.

IF the payment fails after order submission, THE system SHALL retain the cart state, transition the order to "payment_failed", and SHALL display a clear error message explaining the failure and offer options to retry payment or choose another payment method.

### Seller Order Notification

WHEN an order is successfully captured and transitioned to "pending" status, THE system SHALL immediately notify the corresponding seller(s) who have products in that order through:
- Real-time dashboard alert within seller portal
- Email notification with order summary
- Push notification (if enabled in seller preferences)

THE notification SHALL include:
- Order number and timestamp
- Customer name and shipping address
- List of products with matching SKUs and quantities
- Payment method used
- Special instructions from customer (if any)
- Deadline for fulfillment (48 hours from order time)

THE system SHALL allow the seller to acknowledge receipt of the order, but acknowledgment is not required for fulfillment to proceed.

WHERE a seller has multiple SKUs in a single order, THE system SHALL group all items for that seller into a single notification and fulfillment request to reduce operational overhead.

### Fulfillment and Shipping

WHEN a seller logs into their portal and views the order, THE system SHALL display all pending orders assigned to that seller with a clear "Prepare for Shipping" button.

WHEN the seller clicks "Prepare for Shipping", THE system SHALL validate that:
- All requested SKUs are in sufficient inventory (≥ quantity requested)
- All items are marked as "available" for sale
- No items have been removed from catalog since order placement

IF any SKU in the order has insufficient inventory, THE system SHALL display an error message: "Insufficient stock for [SKU name]. Please update inventory or cancel this item." and SHALL prevent the seller from proceeding until the issue is resolved.

WHEN the seller confirms that the items are ready for shipping, THE system SHALL transition the order status to "processing" and SHALL lock the inventory for those SKUs, decrementing the available quantity by the ordered amount.

WHEN the seller has physically packed the shipment, THE system SHALL require them to initiate the "Mark as Shipped" action by:
- Entering the actual shipping carrier name (from a restricted dropdown: FedEx, UPS, DHL, USPS, Amazon Logistics, local courier)
- Entering a valid tracking number (alphanumeric, 10-30 characters)
- Confirming the ship date

WHEN the "Mark as Shipped" action is completed, THE system SHALL transition the order status to "shipped" and SHALL generate and store the tracking information in the official order log.

THE system SHALL enforce that the "Mark as Shipped" action is completed within 48 hours of order placement.

IF the seller fails to mark the order as "shipped" within 48 hours, THE system SHALL automatically:
- Transition the order status to "delayed"
- Send an automated warning email to the seller
- Notify the customer via email: "Your order is experiencing a slight delay. The seller has not yet shipped your items. We are following up with them."

### Tracking Number Assignment

THE system SHALL require all tracking numbers to be unique and match the format accepted by the selected carrier (e.g., FedEx: 12-digit number, UPS: 1ZXXXXXXXXXXXXXX)

WHERE a package contains multiple items from different sellers, THE system SHALL assign separate tracking numbers for each seller's shipment, even if shipped together by the carrier.

WHEN a tracking number is submitted, THE system SHALL validate it by:
- Checking length and character format against carrier specifications
- Ensuring no duplicate tracking number exists across all orders
- Confirming the carrier name matches a predefined list

IF the tracking number is invalid, THE system SHALL reject submission and display: "Invalid tracking number format for [carrier name]. Please enter a valid tracking number."

### Shipping Status Updates

THE system SHALL automatically update the order status based on tracking data received from the carrier API, when available, using these standardized state transitions:

- "shipped" → "in_transit" (when carrier scans item for transport)
- "in_transit" → "out_for_delivery" (when carrier scans item for final delivery)
- "out_for_delivery" → "delivered" (when carrier scans item as delivered and records signature)

SHAL NOT allow manual status changes from "delivered" to any previous state.

WHEN the system receives a notification that a shipment has been "delivered", THE system SHALL:
- Transition the order status to "delivered"
- Send a delivery confirmation email to customer
- Display "Delivered" badge on the order history page
- Trigger a 14-day review eligibility window for the customer

WHEN a carrier returns status that a package is "undeliverable", THE system SHALL:
- Transition the order status to "return_requested"
- Notify customer immediately via email and app alert
- Initiate return process with seller

THE system SHALL update shipping status at minimum every 24 hours during transit.

WHILE the order is in "in_transit" status, THE system SHALL make available to the customer an interactive map showing the last known location and estimated delivery window if the carrier API provides real-time tracking data.

### Delivery Confirmation

THE system SHALL consider an order "completed" only when its status is "delivered".

WHEN an order reaches "delivered" status, THE system SHALL:
- Automatically release the seller's hold on payment (minus platform fee)
- Unlock the product review submission interface for the customer
- Begin 14-day return/refund eligibility period
- Archive the order in the customer's order history

WHERE the customer does not confirm delivery within 7 days after "delivered" status, THE system SHALL automatically assume delivery was successful and transition to "completed" state without customer input.

THE system SHALL allow the customer to manually report "item not received" even after "delivered" status if the tracking shows unexpected location or behavior.

### Delayed or Lost Package Handling

IF an order remains in "shipped" or "in_transit" status for more than 48 hours past the estimated delivery date, THE system SHALL automatically:
- Transition status to "delayed"
- Send automated notification to customer: "Your package is running behind schedule. We are investigating."
- Send automated notification to seller: "Your order #[number] is delayed. Please confirm shipping details or contact carrier."

IF carrier tracking status shows package as "lost" for more than 72 hours after being marked as "shipped", THE system SHALL:
- Transition status to "lost"
- Notify seller and customer
- Offer customer two options: "Request Full Refund" or "Wait for Carrier Investigation"
- Freeze seller funds until resolution
- Log incident for platform audit

IF customer chooses "Request Full Refund", THE system SHALL:
- Immediately initiate refund to original payment method
- Transition status to "cancelled"
- Notify seller that refund has been processed
- Remove the order from seller's active sales metrics

IF customer chooses "Wait for Carrier Investigation" and the package is recovered within 14 days, THE system SHALL:
- Transition status back to "delivered"
- Re-enable review submission
- Release seller payment

IF the package is confirmed lost by the carrier after 14 days, THE system SHALL:
- Initiate full refund to customer
- Transition status to "lost_and_refunded"
- Charge seller for the cost of the lost goods (configurable per marketplace policy)
- Notify seller of financial responsibility

### Order History Access

WHILE a customer is logged in, THE system SHALL display a complete, searchable, and filterable history of ALL orders associated with their account, visible in the "Order History" section.

THE order history SHALL include:
- Order number
- Date placed
- Total amount
- Status badge (pending, processing, shipped, delivered, cancelled, returned, lost)
- List of product thumbnails and names
- Shipping address
- Tracking number and link (if available)
- Estimated delivery date
- Actions: "Track", "Request Refund", "Write Review", "Download Invoice"

THE system SHALL allow customers to:
- Search by order number, product name, or date range
- Filter by status (e.g., show only delivered or cancelled orders)
- Sort by date (newest first) or total amount
- Download a PDF invoice of any completed order

IF an order is cancelled or returned, THE system SHALL still preserve the entire order record in history with status tag, including reason for cancellation and refund amount.

THE system SHALL store order history permanently, even after user account deletion, for legal and auditing requirements.

WHEN viewing a specific order, THE system SHALL display a time-stamped timeline showing status changes and any events (e.g., "Seller marked as shipped on 11/07/2025 09:15 UTC", "Carrier scanned item in transit on 11/08/2025 14:22 UTC").

WHEN a customer shares a link to their order history, THE system SHALL deny access if not authenticated.

WHILE the customer's session is active, THE system SHALL not require re-authentication to view order history.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*