## Order Tracking and Shipping Status Update Requirements

### Order Status Life Cycle

The order tracking system must represent a clear, sequential progression of fulfillment states from order creation to final delivery. Each status must be mutually exclusive and follow a strict linear order.

The system SHALL have exactly five (5) order statuses in the following fixed sequence:

1. "Pending" - Initial state immediately after order creation. Customer has completed checkout but payment has not yet been confirmed.
2. "Confirmed" - State after successful payment processing. Order is now officially authorized for fulfillment.
3. "Shipped" - State when seller has physically dispatched the package, and a valid tracking number has been provided.
4. "Out for Delivery" - State when the package has been accepted by the external carrier and is in transit to the customer's delivery address.
5. "Delivered" - Final state when the package has been successfully delivered to the customer, as confirmed by carrier and/or customer signature.

THE system SHALL NOT allow order status transitions to skip intermediate states. For example, an order cannot transition directly from "Pending" to "Delivered".

WHEN an order is created, THE system SHALL automatically set its status to "Pending".

WHEN payment is successfully processed, THE system SHALL transition the order status from "Pending" to "Confirmed".

WHEN a seller provides a tracking number and marks an order as shipped, THE system SHALL transition the status from "Confirmed" to "Shipped".

WHEN the carrier system indicates the package has entered delivery routing (real-time carrier update), THE system SHALL transition the status from "Shipped" to "Out for Delivery".

WHEN the carrier system indicates delivery completion (signed receipt or GPS confirmation), THE system SHALL transition the status from "Out for Delivery" to "Delivered".

THE system SHALL NOT allow any status transitions backward. Once an order reaches "Delivered", it cannot be reverted to any previous state.

### Status Transitions

All status transitions SHALL be initiated by authorized actors based on defined role permissions:

- "Pending" → "Confirmed": Automatically triggered by successful payment processing
- "Confirmed" → "Shipped": Initiated by seller via order management interface
- "Shipped" → "Out for Delivery": Automatically triggered by external carrier API integration
- "Out for Delivery" → "Delivered": Automatically triggered by external carrier API integration

WHEN a seller attempts to set an order status to "Shipped", THE system SHALL require the seller to provide a valid tracking number in the format "[A-Z]{2}[0-9]{9}[A-Z]{2}" (e.g., "AB123456789CD")

IF the seller attempts to transition an order status without providing a tracking number, THEN THE system SHALL reject the transition and return an error with code "TRACKING_NUMBER_REQUIRED".

IF the tracking number provided by the seller does not match the required format, THEN THE system SHALL reject the transition and return an error with code "INVALID_TRACKING_FORMAT".

WHILE an order is in "Pending" status, THE system SHALL NOT allow the seller to view or update shipping information.

WHILE an order is in "Delivered" status, THE system SHALL NOT allow any further status updates.

### Seller Responsibilities

THE seller SHALL have the exclusive right to update the order status from "Confirmed" to "Shipped".

WHEN a seller updates an order status to "Shipped", THE system SHALL require the following mandatory information:

- Valid tracking number (format: "[A-Z]{2}[0-9]{9}[A-Z]{2}")
- Actual shipping date (ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.sssZ")
- Carrier name (e.g., "DHL", "FedEx", "USPS", "UPS", "local courier")
- Carrier service type (e.g., "Standard", "Express", "Overnight", "Economy")

THE seller SHALL NOT be able to update shipping information for orders with status "Pending", "Out for Delivery", or "Delivered".

THE seller SHALL be able to see all order tracking information for orders they have fulfilled, including tracking number, carrier name, service type, and estimated delivery date.

THE system SHALL log every seller-initiated status update event, including:
- Seller ID
- Timestamp of update
- Previous status
- New status
- Update method (manual vs automated)

### Customer Visibility

WHEN an order is in "Confirmed" status, THE system SHALL display the message "Your order has been confirmed and is being prepared for shipment." to the customer.

WHEN an order transitions to "Shipped", THE system SHALL display the tracking number, carrier name, and expected delivery date (calculated from carrier service type and destination).

WHEN an order transitions to "Out for Delivery", THE system SHALL display the message "Your package is currently out for delivery and should arrive today." along with the carrier tracking link.

WHEN an order transitions to "Delivered", THE system SHALL display the message "Your order has been successfully delivered." with the delivery date and time, and the option to request a return.

THE customer SHALL be able to see the complete order status history in chronological order, including status change timestamps.

THE system SHALL NOT display tracking information to customers for orders in "Pending" status.

### Shipping Information Requirements

WHEN an order transitions to "Shipped" status, THE system SHALL require the following mandatory shipping information to be stored:

- Tracking number (mandatory, 13-character alphanumeric format)
- Carrier name (mandatory, string from pre-approved list: "DHL", "FedEx", "USPS", "UPS", "local courier")
- Carrier service type (mandatory, string from: "Standard", "Express", "Overnight", "Economy")
- Shipment date (mandatory, ISO 8601 datetime format)
- Estimated delivery date (mandatory, ISO 8601 datetime format derived from carrier service type, origin, and destination)
- Actual delivery date (optional, populated later by carrier integration)

THE system SHALL automatically calculate the estimated delivery date based on the following rules:

- If carrier service type is "Standard": Estimated delivery = shipment date + 3 business days
- If carrier service type is "Express": Estimated delivery = shipment date + 1 business day
- If carrier service type is "Overnight": Estimated delivery = shipment date + 1 calendar day
- If carrier service type is "Economy": Estimated delivery = shipment date + 5 business days

THE estimated delivery date SHALL be recalculated whenever: the shipping date is changed, the carrier service type is changed, or the destination address changes (before shipment).

### Notification Triggers

WHEN the order status changes from "Pending" to "Confirmed", THE system SHALL send an email notification and in-app notification to the customer with subject: "Your order #{{order.id}} has been confirmed."

WHEN the order status changes from "Confirmed" to "Shipped", THE system SHALL send an email notification and in-app notification to the customer with subject: "Your order #{{order.id}} has been shipped. Tracking number: {{trackingNumber}}."

WHEN the order status changes from "Shipped" to "Out for Delivery", THE system SHALL send an in-app notification to the customer with headline: "Out for delivery today!" and body: "Your package is on its way and should arrive today."

WHEN the order status changes from "Out for Delivery" to "Delivered", THE system SHALL send an email notification and in-app notification to the customer with subject: "Order #{{order.id}} has been delivered!"

WHEN an order remains in "Shipped" status for more than 72 hours, THE system SHALL notify the seller with a warning: "Your order {{order.id}} has been in 'Shipped' status for more than 72 hours. Please verify carrier update status."

### Delay Handling

WHILE an order status is "Shipped" or "Out for Delivery", THE system SHALL monitor the time since last status change.

IF an order remains in "Shipped" status for more than 48 hours without progressing to "Out for Delivery", THEN THE system SHALL automatically flag the order as "Delayed" and send an email notification to both customer and seller with subject: "Your order #{{order.id}} is delayed. Expected update from carrier."

IF an order remains in "Out for Delivery" status for more than 48 hours without progressing to "Delivered", THEN THE system SHALL automatically flag the order as "Delayed" and send an email notification to both customer and seller with subject: "Your order #{{order.id}} is delayed. Expected delivery not confirmed."

WHEN an order is flagged as "Delayed", THE system SHALL:

- Display "Processing Delay" banner to the customer
- Enable "Contact Support" button on order details page
- Notify the admin team via internal dashboard

### Lost Package Protocol

WHEN an order remains in "Shipped" status for more than 7 business days, THE system SHALL classify the package as "Lost in Transit" and automatically:

- Initiate refund process for the full order value to original payment method
- Send email notification to customer: "We're sorry, your order #{{order.id}} appears to be lost in transit. We have initiated a full refund."
- Send email notification to seller: "Order #{{order.id}} was classified as lost in transit after 7 business days. Full refund processed."
- Flag seller account for review by admin
- Log event in system audit trail with code "LOST_PACKAGE_7DAYS"

WHEN an order remains in "Out for Delivery" status for more than 5 business days, THE system SHALL classify the package as "Lost in Transit" and initiate same refund and notification sequence.

WHEN the customer manually reports a package as "not received" (via support ticket or in-app form) while status is "Delivered", THE system SHALL:

- Initiate dispute workflow
- Notify seller with "Customer claims not received" alert
- Wait 3 business days for seller to provide delivery confirmation before refunding
- If seller cannot provide proof after 3 days, automatically issue full refund
- Send customer notification: "We're investigating your claim that order #{{order.id}} was not received. We will contact you with our findings within 3 business days."

THE system SHALL NOT automatically refund a "Delivered" status order based only on customer claim - seller must have opportunity to provide carrier proof of delivery.



> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*