## Order Management Workflow

### Order Status Lifecycle

The system SHALL maintain a clear, sequential order status lifecycle that tracks the journey of an order from initiation to completion. Every order SHALL begin in the 'Created' status and progress through predefined stages. The following statuses are mandatory and must be used in exactly this sequence:

- "Created" — The order has been submitted and payment is pending. Cart items are reserved but inventory is not yet decremented. This state lasts until payment is confirmed.

- "Paid" — Payment has been successfully processed and verified. At this stage, inventory for each SKU in the order SHALL be decremented immediately, and the order SHALL be assigned to the respective seller for fulfillment.

- "Awaiting Shipment" — The seller has acknowledged the order and is preparing items for dispatch. Seller SHALL have the ability to manually update this status only after confirming the order details and packaging. Shipping label generation is permitted but not required at this stage.

- "Shipped" — The seller has attached a tracking number and carrier information to the order. The system SHALL publish this tracking information to the customer's dashboard and send notification. Status shall be updated ONLY by the seller or admin.

- "Delivered" — The system SHALL automatically transition to this status when the designated delivery service reports successful delivery. If the delivery service does not provide automated tracking updates, admin SHALL have the authority to manually set this status after verifying customer confirmation.

- "Completed" — The order SHALL reach this final state 48 hours after the "Delivered" status, provided no return or refund request has been initiated. If a return or refund request is submitted in the interim, the order SHALL remain in "Delivered" and the refund process SHALL override the auto-transition.

- "Canceled" — This status may be reached at any point before "Shipped" via customer-initiated cancellation (see below) or admin override. "Canceled" orders SHALL NOT reduce inventory. Customer SHALL be instantly refunded in full.

- "Refunded" — A status that can only be reached after successful processing of a full or partial refund. SHALL not be set manually; SHALL be the result of refund approval.

No custom statuses shall be allowed. Only the system, seller, or admin SHALL be permitted to update order status — no customer-initiated status changes beyond cancellation.

### Shipping Status Updates

WHEN a seller updates the order status from "Awaiting Shipment" to "Shipped", THE system SHALL require the entry of:

- Carrier name (free text, maximum 100 characters)
- Tracking number (alphanumeric, required field)
- Estimated delivery window (optional date range)
- Actual shipping date (auto-populated as the timestamp of status change)

WHEN a shipping update is saved, THE system SHALL:

- Send an automatic notification to the customer via email and in-app push
- Update the order tracking page to display the carrier, tracking number, and estimated delivery date
- Log the update in the audit trail with the seller's user ID and timestamp

WHERE an order has multiple shipments (e.g., split fulfillment from different warehouses), THE system SHALL support multiple tracking updates. Each shipment SHALL be displayed as a separate entry on the tracking page with:

- Shipment number (e.g., “Shipment #1 of 2”)
- Carrier and tracking number for that parcel
- Expected delivery date for that parcel
- Status (Shipped, In Transit, Delivered)

WHILE an order is in “Shipped” status, THE system SHALL monitor automated tracking updates from supported carriers (via integration) and automatically update the customer-facing tracking status (In Transit, Out for Delivery, Delivered). If no automatic update arrives within 4 business days, THE system SHALL send an alert to the admin.

### Tracking Information Display

THE customer dashboard SHALL display tracking information in a persistent, always-visible section entitled "Order Tracking". The display SHALL include:

- Order ID and date
- Current status with visual indicator (color-coded)
- Carrier logo and name
- Tracking number with clickable link to carrier’s tracking site
- Estimated delivery date
- A timeline of all status changes, displayed as a vertical list with timestamps
- If multiple shipments exist, a collapsible accordion per shipment

IF the tracking number is invalid or carrier is unsupported, THE system SHALL display: "Tracking information is pending verification. Please contact seller for details." and SHALL prevent clickable links.

WHEN the order status is "Delivered" or "Completed", THE tracking timeline SHALL remain visible for 90 days after delivery. After 90 days, the tracking section SHALL be closed and archived, with only the final status still visible.

### Customer Cancellation Requests

WHEN a customer requests cancellation of an order, THE system SHALL evaluate the request based on the current status:

- IF the order status is "Created" or "Paid", THEN THE system SHALL allow cancellation and immediately initiate full refund.
- IF the order status is "Awaiting Shipment", THEN THE system SHALL permit cancellation ONLY if requested within 24 hours of order creation. If request is made after 24 hours, THE system SHALL notify the customer: "Cancellation requested. Your seller has 48 hours to approve. If unapproved, the order will proceed to shipment."
- IF the order status is "Shipped" or later, THEN THE system SHALL deny automatic cancellation and instead redirect the customer to the Return Request flow.

WHEN a cancellation is pending seller approval (in "Awaiting Shipment" after 24 hours), THE system SHALL:

- Immediately notify the seller via email and admin panel
- Place a 48-hour countdown timer visible to both seller and customer
- If seller does not approve or deny within 48 hours, THE system SHALL automatically deny the cancellation and proceed to "Shipped" status

WHEN a cancellation is approved, THE system SHALL:

- Set status to "Canceled"
- Release all reserved inventory back to the seller’s stock
- Initiate full refund through the original payment method
- Send confirmation notification to customer
- Log the cancellation request, approval, and refund in audit trail

### Refund Request and Approval Flow

WHEN a customer requests a refund for an order, the system SHALL factor the order status:

- IF the order status is "Delivered", THEN customer SHALL be allowed to request either full or partial refund (e.g., for damaged goods, missing items, wrong product).
- IF the order status is "Shipped", THEN refund request SHALL NOT be permitted. Customer SHALL be advised to wait for delivery and then initiate return.
- IF the order status is "Created", "Paid", or "Awaiting Shipment", cancellation SHALL be used instead of refund.

WHEN a refund request is submitted, THE system SHALL require:

- Reason for refund (from dropdown: "Damaged items", "Incorrect item", "Item not as described", "Didn't receive", "Changed mind")
- Order of items to refund (checkboxes, each with SKU and quantity — defaults to whole order)
- Upload option for photos (optional if reason is "Damaged items" or "Incorrect item")
- Delivery confirmation code (if "Didn’t receive" is selected)

IF the refund request is for less than the full order, THEN THE system SHALL:

- Calculate refund amount based on item price and tax
- Deduct original shipping cost if item shipped was part of free shipping promotion
- Apply restocking fee if requested by seller (if configured by admin, max 15% per item)
- Show preview of refund amount (item subtotal, shipping adjustments, fees) before submission

WHEN the refund request is submitted, THE system SHALL:

- Set order status to "Refund Requested"
- Notify seller via dashboard alert
- Place a 72-hour timer for seller response

IF the seller approves the refund:

- SET status to "Refund Approved"
- Notify admin on refund amount
- Initiate refund payment through original gateway
- SET status to "Refunded"
- Update inventory (if returning physical items, inventory remains decremented until returned)
- Send confirmation to customer

IF the seller denies the refund:

- SET status to "Refund Denied"
- Notify customer with reason given by seller
- Allow customer to escalate request to admin

IF the seller does not respond within 72 hours:

- AUTO-APPROVE refund for full amount
- SET status to "Refunded"
- Send notification to customer
- Notify admin of auto-approval

WHEN an admin overrides a seller’s decision (to approve or deny):

- Admin SHALL be able to override at any point after request submitted
- Changes SHALL be logged with admin ID and reason
- System SHALL auto-update status and trigger refund if approved

THEN THE system SHALL record all refund actions, communication, and final payment state in the order audit log with associated timestamps.

### Product Return Policy

THE system SHALL allow customer returns only for items with status "Delivered" or "Refunded".

WHEN a refund is approved and return is required, THE system SHALL:

- Generate a prepaid return shipping label (based on carrier, region, and product weight — determined by seller’s configured return policy)
- Email the label to the customer
- Display the label in the order's "Returns" section
- Provide a 14-day window from time of approval to return item

IF the customer does not initiate return within 14 days:

- THE system SHALL auto-cancel the return request
- THE order SHALL revert to "Completed" status
- NO inventory shall be restored
- NO further refund shall be issued

IF the customer sends the item back:

- Seller SHALL receive notification with return tracking number
- Seller SHALL have 10 business days to inspect the returned item
- Seller SHALL mark return as either "Received & Approved" or "Received & Rejected"

IF seller rejects return:

- THE system SHALL notify customer with reason provided by seller
- THE system SHALL reverse the refund if already paid
- THE order SHALL be set to "Refund Reversed"
- the returned item DOES NOT return to inventory

IF seller approves return:

- THE system SHALL restore inventory of returned SKUs to seller’s available stock
- THE system SHALL confirm: "Your return has been processed. The refund of [amount] has been fully credited."
- THE order SHALL be set to "Refunded & Returned"

WHERE the seller has configured a "no returns" policy on a specific SKU (admin must approve flag):

- THE system SHALL block return request for that item
- WHEN customer attempts to return, THE system SHALL display: "This item is final sale and cannot be returned. Contact seller for assistance."

The return labeling system SHALL be responsible only for generation and display:

- The responsibility of ensuring the package is sent, tracking number is entered, and item is received lies entirely with the customer
- The system SHALL NOT verify physical receipt — only that the return label was generated and claimed

All return activities SHALL be logged in audit trail:

- Return request timestamp
- Return label generation timestamp
- Return shipping scan (customer-provided or carrier-provided)
- Seller inspection and decision
- Inventory restoration or rejection event
- Final refund reversal or confirmation

Any return activity not logged shall be considered invalid.

## Business Rule Summary

- Admin ALWAYS has final authority over cancellations and refunds — overrides seller decisions
- Seller CAN update shipping details and approve/deny refund requests but cannot change order status directly past "Shipped"
- Customer may request cancellation only up to "Awaiting Shipment" with conditions
- Customer may request refund only after "Delivered"
- Refund requires three-party alignment: customer request → seller approval → system processing
- Inventory is only restored upon physical return and seller acceptance
- Every action is immutable and permanently logged in audit trail
- No custom statuses or manual status skips allowed

The system SHALL prevent any status transitions that violate this lifecycle. Any attempt to manually set an invalid status shall be blocked and logged as a security violation.