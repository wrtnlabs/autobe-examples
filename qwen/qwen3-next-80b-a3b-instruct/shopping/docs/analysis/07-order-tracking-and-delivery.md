## Order Tracking and Delivery Flow

### Order Status Dashboard

THE system SHALL provide each authenticated customer with a dedicated Order Status Dashboard accessible from their profile menu.

WHEN a customer clicks the 'My Orders' menu item, THE system SHALL display a list of all orders associated with their account, ordered by placement date (newest first).

THE system SHALL display the following information for each order:
- Order number (unique alphanumeric identifier)
- Order placement date and time
- Total order value (currency formatted)
- Current shipping status (from defined stages)
- Estimated delivery date
- Number of items in the order
- Link to view detailed order breakdown

IF the customer has no orders, THE system SHALL display a clear message: 'You have not placed any orders yet.'

WHILE a customer has active orders, THE system SHALL refresh the order status information automatically every 10 minutes without requiring a manual page reload.

WHERE a customer has multiple orders with the same status, THE system SHALL group them visually by status group on the dashboard.

### Shipping Status Stages

THE system SHALL define exactly five (5) mandatory shipping status stages for all orders, in this exact sequence:

1. "Processing"
2. "Shipped"
3. "Out for Delivery"
4. "Delivered"
5. "Cancelled"

WHEN an order is first placed, THE system SHALL set its status to "Processing".

WHILE an order status is "Processing", THE system SHALL allow sellers to update inventory quantities and cancel the order only if payment has not been captured.

WHEN payment is successfully captured and verified by the payment gateway, THE system SHALL transition the order status from "Processing" to "Shipped".

WHEN the seller marks the order as shipped with a valid carrier tracking number, THE system SHALL transition the order status from "Shipped" to "Out for Delivery".

WHEN the delivery carrier confirms successful delivery (via API integration or driver scan), THE system SHALL transition the order status from "Out for Delivery" to "Delivered".

WHEN an order is cancelled by customer request and approved by admin, OR when payment fails after 72 hours, THE system SHALL transition the order status from any state to "Cancelled".

IF an order status is "Delivered", THE system SHALL prevent any further status changes except for exception handling (e.g., reversal in case of return).

IF an order status is "Cancelled", THE system SHALL prevent any new delivery attempts or shipping notifications.

### Estimated Delivery Dates

THE system SHALL generate an estimated delivery date for each order when it transitions to "Shipped" status.

WHEN an order transitions to "Shipped", THE system SHALL calculate the estimated delivery date using the following logic:
- Base delivery window: 3 business days
- Additional delay: +1 business day for each 50km beyond the city center (as defined by the seller's store location)
- Weekend exemption: Delivery dates shall exclude Saturdays and Sundays
- Holiday exemption: Delivery dates shall exclude recognized public holidays in the shipping destination

THE system SHALL display the calculated estimated delivery date on the Order Status Dashboard and order detail page.

WHEN the estimated delivery date is updated due to carrier delays or route changes, THE system SHALL immediately update the displayed estimate and trigger a notification to the customer.

IF the actual delivery occurs before the estimated date, THE system SHALL update the status to "Delivered" and keep the original estimated date for reference.

### Carrier Tracking Integration

THE system SHALL support integration with third-party delivery carriers (e.g., FedEx, UPS, DHL, local couriers).

WHEN a seller assigns a tracking number to an order during the "Shipped" stage, THE system SHALL validate the tracking number format according to the carrier's API specifications before storing.

WHEN an order status is "Shipped" or "Out for Delivery", THE system SHALL periodically (every 30 minutes) query the carrier's API using the stored tracking number to fetch real-time location and status updates.

THE system SHALL display a clickable 'Track Package' button on the Order Status Dashboard and order detail page for orders with carrier tracking information.

WHEN a user clicks 'Track Package', THE system SHALL open an embedded map view or redirect to the carrier's official tracking page.

IF the carrier API returns an error or invalid tracking number, THE system SHALL display: 'Tracking information not available at this time. Please try again later.'

### Delivery Notification

THE system SHALL send delivery status notifications to the customer via both email and SMS.

WHEN an order status changes to "Shipped", THE system SHALL send notification: "Your order SHIPPED! Tracking number: [NUMBER]. Estimated delivery: [DATE]."

WHEN an order status changes to "Out for Delivery", THE system SHALL send notification: "Your order is OUT FOR DELIVERY today! Please ensure someone is available to receive it."

WHEN an order status changes to "Delivered", THE system SHALL send notification: "Your order has been DELIVERED! Thank you for shopping with us."

WHEN an order status changes to "Cancelled", THE system SHALL send notification: "Your order has been CANCELLED. A refund will be processed within 5 business days."

WHILE the customer has active notifications pending, THE system SHALL mark unread notifications in the user profile with a red badge indicator.

IF a customer's email or phone number is invalid, THE system SHALL log the failure and attempt resending up to 3 times over 24 hours.

### Delivery Attempt Management

THE system SHALL manage failed delivery attempts for orders marked as "Out for Delivery".

WHEN a carrier reports a failed delivery attempt, THE system SHALL update the order status to "Delivery Attempt Failed" (temporary internal status).

THE system SHALL record the reason for failed delivery (e.g., "No one home", "Incorrect address", "Package too large") provided by the carrier.

IF the carrier reports two (2) consecutive failed delivery attempts, THE system SHALL automatically transition the order status to "Returned to Sender" and notify the customer: "We attempted to deliver your order but were unable to do so after multiple attempts. The package has been returned to the seller. A refund will be processed within 5 business days."

WHEN the carrier reports a third attempt successfully delivered, THE system SHALL override any previous failed attempts and transition status to "Delivered".

### Change Delivery Address

THE system SHALL allow customers to change their delivery address for orders in "Processing" status only.

WHEN a customer initiates a delivery address change request, THE system SHALL require confirmation of the new address from their saved address book.

IF the order status is not "Processing", THE system SHALL reject the address change request and display: "You cannot change your delivery address after the order has been shipped."

WHEN the address change is approved, THE system SHALL send a confirmation email to the customer and notify the seller of the updated address.

WHEN the order transitions to "Shipped", THE system SHALL lock the delivery address and prevent any future changes.

WHERE the customer has no saved address, THE system SHALL prompt them to enter a new address on the spot when attempting to change delivery information.

### Schedule Redelivery

THE system SHALL allow customers to schedule a redelivery for orders with status "Delivery Attempt Failed" (or "Returned to Sender").

WHEN a customer has a "Delivery Attempt Failed" order, THE system SHALL display a button: "Schedule Redelivery".

WHEN the customer clicks "Schedule Redelivery", THE system SHALL show a calendar interface to select a preferred delivery date (within the next 7 days).

THE system SHALL restrict redelivery selections to business days (Monday–Friday) and exclude public holidays.

WHEN the customer selects a date, THE system SHALL confirm the new delivery date, update the estimated delivery date field, and notify the carrier.

IF the selected date is unavailable due to carrier capacity constraints, THE system SHALL display: "We cannot schedule delivery on this date. Please select another day." and suggest three available alternatives.

WHEN redelivery is confirmed, THE system SHALL change the order status back to "Out for Delivery" and reset the delivery attempt counter to zero.

WHERE the customer does not schedule redelivery within 7 days of the first failed attempt, THE system SHALL auto-initiate a return-to-seller process and notify the customer.


```mermaid
graph LR
  A["Order Placed"] --> B["Processing"]
  B --> C{"Payment Captured?"}
  C -->|Yes| D["Shipped"]
  C -->|No| E["Cancelled"]
  D --> F["Carrier Tracking Number Entered"]
  F --> G["Out for Delivery"]
  G --> H{"Delivery Successful?"}
  H -->|Yes| I["Delivered"]
  H -->|No| J["Delivery Attempt Failed"]
  J --> K{"2 Failed Attempts?"}
  K -->|Yes| L["Returned to Sender"]
  K -->|No| M["Wait for 3rd Attempt"]
  M --> G
  I --> N["Delivery Confirmed"]
  L --> O["Refund Initiated"]
  D --> P{"Allowed to Change Address?"}
  P -->|Yes" (Processing)| Q["Address Updated"]
  P -->|No" (Shipped)| R["Address Locked"]
  J --> S{"Redelivery Requested?"}
  S -->|Yes| T["Schedule Redelivery"]
  T --> G
  S -->|No| U["Wait 7 Days"]
  U --> L
  B --> V["Cancel Request"]
  V --> W["Admin Approved?"]
  W -->|Yes| E
  W -->|No| B
```

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.