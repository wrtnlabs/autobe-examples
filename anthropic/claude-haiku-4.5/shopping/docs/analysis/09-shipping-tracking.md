# Shipping and Tracking System

## 1. Shipping System Overview

### 1.1 Purpose and Scope

THE shopping mall platform's shipping and tracking system provides customers with real-time visibility into their order fulfillment and delivery progress, while enabling sellers to manage shipments and coordinate with carriers. THE system manages the complete shipping lifecycle from order confirmation through final delivery, including the ability to track packages, receive notifications, and handle delivery exceptions.

### 1.2 Key Responsibilities

**Customers** SHALL:
- Receive shipment notifications when orders are shipped
- Track packages in real-time with carrier tracking numbers
- Provide delivery instructions and preferences
- View estimated delivery dates and status updates
- Arrange alternative delivery if needed

**Sellers** SHALL:
- Prepare shipments for carrier pickup within 24-48 hours
- Update shipment status and tracking numbers
- Coordinate with shipping carriers
- Manage return shipments from customers
- Provide accurate package information

**Admin** SHALL:
- Monitor shipping operations and performance metrics
- Manage carrier integrations and configurations
- Handle shipping disputes and exceptions
- Generate shipping reports and analytics
- Monitor delivery failures and exceptions

**System** SHALL:
- Validate shipping addresses and prevent invalid shipments
- Calculate shipping costs based on weight and distance
- Integrate with carrier APIs for label generation and tracking
- Update order status based on tracking information
- Send notifications to customers at key shipping milestones

### 1.3 Core Shipping Principles

WHEN an order is confirmed and payment is processed, THE system SHALL prepare the order for shipment by validating delivery information and notifying the seller.

THE shipping system SHALL support multiple shipments for a single order when the order contains items from different sellers or inventory locations.

THE system SHALL maintain immutable shipping records for audit and dispute resolution purposes.

THE system SHALL provide real-time tracking information to customers and sellers throughout the shipping process.

---

## 2. Shipping Methods and Options

### 2.1 Supported Shipping Methods

THE platform SHALL support the following shipping methods based on carrier availability and destination:

| Shipping Method | Description | Speed | Cost Model | Tracking |
|---|---|---|---|---|
| Standard Ground | Economy ground delivery to destination | 5-7 business days | Weight and distance-based | Real-time tracking |
| Express Shipping | Expedited ground delivery | 2-3 business days | Weight and distance-based, premium rate | Real-time tracking |
| Overnight Shipping | Next-business-day delivery | 1 business day | Premium rate, weight and distance | Real-time tracking |
| Same-Day Delivery | Delivery within same calendar day (local areas only) | Same day | Distance-based premium rate | Real-time tracking |
| Economy Shipping | Slowest delivery option for cost savings | 7-14 business days | Lowest rate, weight and distance-based | Basic tracking |
| Pickup at Location | Customer collects from designated location | Varies (typically 2-5 days) | Fixed pickup fee | Location tracking |

### 2.2 Shipping Method Selection

WHEN a customer proceeds to checkout, THE system SHALL display available shipping methods based on the delivery address and order specifications.

THE system SHALL automatically filter out shipping methods that are not available for the selected delivery address based on:
- Delivery address postal code and country availability
- Order total weight and combined dimensions
- Destination distance from seller's configured shipping location
- Seller's configured shipping method options
- Carrier service availability in that region
- Any seller shipping restrictions (e.g., cannot ship to certain states)

THE customer SHALL select their preferred shipping method during checkout before payment processing.

WHEN a shipping method is not available for the selected address, THE system SHALL display a clear message indicating which addresses support the customer's preferred shipping method and suggest address modification.

### 2.3 Shipping Cost Calculation

WHEN a customer selects a shipping method, THE system SHALL calculate and display the shipping cost based on:
- Order total weight (sum of all item weights in shipment)
- Order combined dimensions (calculated from item bounding boxes)
- Delivery distance (from seller's location or warehouse to delivery address)
- Selected shipping method and speed tier
- Current carrier rates (negotiated or published rates)
- Any promotional shipping discounts applied
- Insurance or signature confirmation if selected

THE system SHALL display the calculated shipping cost to the customer before payment confirmation, allowing the customer to see the complete order total including shipping.

WHEN multiple sellers are involved in a single order, THE system SHALL calculate shipping costs separately for each seller's shipment and display the total shipping cost as the sum of all seller shipments.

THE system SHALL show breakdown of shipping costs when ordered from multiple sellers (e.g., "Standard: $5.99 + $3.99 = $9.98").

### 2.4 Carrier Integration

THE system SHALL maintain active integration with major shipping carriers including:
- FedEx (providing ground, express, and overnight services)
- UPS (providing ground, express, and overnight services)
- DHL (providing international and express services)
- USPS (providing economy and priority services)
- Local and regional carriers as applicable per geography

WHEN creating a shipment, THE system SHALL request a shipping label and tracking number from the selected carrier through their API, including:
- Shipment weight and dimensions
- Origin and destination addresses
- Selected shipping service level
- Insurance requirements (if any)
- Signature confirmation requirements (if any)

THE system SHALL store the carrier-provided tracking number, carrier service code, and label reference with the shipment record for future reference and customer communication.

IF a carrier API request fails (network error, service unavailable, validation error), THE system SHALL retry the request with exponential backoff (retry after 30 seconds, then 2 minutes, then 5 minutes).

IF carrier service is unavailable after 3 retry attempts, THE system SHALL notify the seller and admin to manually create the shipment record with carrier details entered manually.

---

## 3. Delivery Address Management

### 3.1 Address Validation

WHEN a customer selects or enters a delivery address during checkout, THE system SHALL validate the address by:
- Checking postal code format matches the selected country's standards
- Verifying address format is recognized by the carrier system
- Confirming the address falls within the seller's delivery area (if restrictions exist)
- Validating required address components are present (street, city, state, postal code, country)

THE system SHALL reject addresses that:
- Are incomplete or missing required fields (street, city, postal code, country)
- Have invalid postal code format for the specified country (e.g., invalid ZIP code for USA)
- Are not recognized as deliverable by the carrier system
- Are identified as high-risk or restricted zones by the carrier
- Fall outside the operational delivery area of available carriers for that area
- Are military or government facilities if not specifically supported

WHEN an address fails validation, THE system SHALL display a specific error message indicating exactly why the address was rejected and suggesting corrections (e.g., "Postal code format should be 5 digits for USA addresses").

THE system SHALL offer address auto-correction suggestions when the carrier provides recommended alternatives for addresses with minor errors.

### 3.2 Address Storage and Selection

WHEN a customer first completes a delivery address entry, THE system SHALL offer to save the address to their profile for future use.

WHEN a customer has multiple saved addresses in their profile, THE system SHALL display all saved addresses during checkout and allow the customer to select one or enter a new address.

THE system SHALL allow customers to label their addresses (e.g., "Home", "Work", "Parent's House", "Summer Residence") for easy identification.

WHEN a customer requests delivery to a different address than their profile default, THE system SHALL validate the new address before allowing checkout to proceed.

### 3.3 International Shipping Considerations

THE system SHALL support international shipping to countries designated as available by the platform.

WHEN a delivery address is outside the customer's country of origin, THE system SHALL:
- Validate the international address format according to destination country requirements
- Display any applicable import duties or customs fees that will be charged
- Request additional customs declaration information required by destination country
- Inform the customer of potential delays due to customs processing (typically 3-5 additional business days)
- Restrict some shipping methods that don't support international delivery

WHEN international shipping is selected, THE system SHALL provide estimated delivery timeframes that account for customs clearance delays.

THE system SHALL validate that all required customs documentation fields are completed before allowing shipment creation.

### 3.4 Delivery Restrictions and Special Cases

IF a delivery address is in a remote area, THE system SHALL display this information and any additional fees that may apply for remote area delivery surcharges.

IF a delivery address is in a restricted or high-risk area identified by the carrier, THE system SHALL restrict available shipping method options or prevent shipment entirely if no carriers service the area.

THE system SHALL support delivery to business addresses, residential addresses, and P.O. boxes based on carrier capabilities and product restrictions.

IF an item is restricted from shipping to the selected address due to regulations or carrier policy (e.g., hazardous materials, controlled substances), THE system SHALL prevent checkout and explain the restriction to the customer.

---

## 4. Shipping Status Tracking

### 4.1 Shipping Status Lifecycle

THE system SHALL define and track the following shipping statuses that an order progresses through:

| Status | Description | Who Updates | Duration | Trigger/Next Action |
|---|---|---|---|---|
| **PENDING_SHIPMENT** | Order confirmed, awaiting seller preparation | System | 0-24 hours | Seller prepares items |
| **READY_FOR_PICKUP** | Seller prepared shipment, ready for carrier | Seller | Hours | Carrier picks up |
| **PICKED_UP** | Carrier has picked up package | Carrier API | Minutes | Package at distribution center |
| **SHIPPED** | Carrier has package, label created, in network | Carrier API | Variable | In transit to destination |
| **IN_TRANSIT** | Package traveling in carrier's network | Carrier API | 1-7 days | Next sorting facility |
| **OUT_FOR_DELIVERY** | Package on final delivery vehicle | Carrier API | Hours to 1 day | Delivery attempt |
| **DELIVERY_ATTEMPTED** | Delivery attempt made but unsuccessful | Carrier API | Hours | Retry or customer action |
| **DELIVERED** | Package delivered and confirmed | Carrier API | Final | Order completed |
| **EXCEPTION** | Issue with shipment (delayed, lost, damaged) | Carrier API | Varies | Resolution/reroute |
| **RETURNED_TO_SENDER** | Package returned to seller/origin | Carrier API | Variable | Refund or reship |

### 4.2 Status Transitions and Business Rules

WHEN an order is confirmed and payment is received, THE system SHALL set the shipping status to "PENDING_SHIPMENT".

WHEN the seller confirms they have prepared the shipment and it's ready for carrier pickup, THE system SHALL update the status to "READY_FOR_PICKUP" and notify the customer.

WHEN the carrier picks up the package from the seller, THE system SHALL request a tracking number from the carrier API and update the status to "SHIPPED".

WHEN the carrier reports that the package is in their network traveling toward the destination, THE system SHALL update the status to "IN_TRANSIT".

WHEN the carrier reports that the package is loaded on the delivery vehicle, THE system SHALL update the status to "OUT_FOR_DELIVERY".

WHEN the carrier reports delivery confirmation, THE system SHALL update the status to "DELIVERED" and mark the order as complete in the order management system.

IF the carrier reports a delivery failure (address issue, customer not available, etc.), THE system SHALL set the status to "DELIVERY_ATTEMPTED" and notify the customer with failure details.

IF a customer provides return authorization, THE system SHALL transition to "RETURNED_TO_SENDER" status and create a return shipment record.

### 4.3 Multiple Shipments Per Order

IF an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller's items.

WHEN multiple shipments exist for a single order, THE system SHALL track each shipment independently with its own tracking number and status progression.

WHEN displaying order status to a customer, THE system SHALL show the status of all shipments within the order and indicate which items are included in each shipment.

THE system SHALL consider an order fully delivered only when all shipments have been delivered (or marked as exceptions if items cannot be delivered).

### 4.4 Tracking Milestones and Events

WHEN a shipment transitions between statuses, THE system SHALL record a tracking milestone with:
- Status name and numeric sequence number
- Timestamp of status change (ISO 8601 format)
- Location information (if provided by carrier - city, facility name)
- Event description in customer-friendly language
- Carrier event code (if applicable)
- Expected next action or timeframe

THE system SHALL maintain a complete timeline of all tracking events for the shipment, accessible to customers and admins.

THE tracking history SHALL be immutable - events cannot be deleted or modified after creation (audit trail requirement).

---

## 5. Status Update Notifications

### 5.1 Notification Triggers

THE system SHALL automatically send notifications to customers when the following shipping events occur:

| Event | Trigger Condition | Recipient | Channel | Timing |
|---|---|---|---|---|
| Order Confirmed | Payment processed successfully | Customer | Email + SMS (optional) | Immediately |
| Shipment Prepared | Seller marks items as prepared | Customer | Email | Immediately |
| Package Shipped | Tracking number assigned by carrier | Customer | Email + SMS (optional) | Within 5 minutes |
| In Transit | Carrier status update received | Customer | Email (optional digest) | Immediately or 24h digest |
| Out for Delivery | Carrier status update received | Customer | Email + SMS (recommended) | Immediately |
| Delivery Attempted | Delivery attempt made | Customer | SMS + Email | Immediately |
| Delivered | Carrier delivery confirmed | Customer | Email + In-app + SMS (optional) | Within 10 minutes |
| Delivery Failed | Carrier failed delivery report | Customer | SMS + Email (urgent) | Within 30 minutes |
| Returned to Sender | Package returned | Customer + Seller | Email + In-app | Immediately |

WHEN the carrier provides a tracking update, THE system SHALL immediately process the update and send a notification to the customer if the status has changed.

### 5.2 Notification Channels

THE system SHALL support the following notification channels:

- **Email**: Primary notification channel for all shipping events (always enabled)
- **SMS**: Optional SMS notifications for critical events (delivery failed, out for delivery) - customer must opt in
- **In-App**: Notification center within customer dashboard for all events
- **Web Push**: Browser push notifications if customer has enabled them (opt-in)

WHEN a shipping event occurs, THE system SHALL send notifications through:
- **Mandatory**: Email (always sent unless customer has disabled all notifications)
- **Optional**: SMS (only if customer has enabled SMS notifications)
- **Optional**: In-app and push notifications based on customer notification preferences

### 5.3 Notification Content Requirements

**Order Confirmation Notification Content:**
- Order number and order date
- List of items ordered with quantities and prices
- Delivery address for confirmation
- Estimated shipping method and cost
- Expected delivery date range
- Link to order tracking page
- Customer service contact information

**Shipment Prepared Notification Content:**
- Order number
- Items included in this shipment
- Estimated carrier pickup time (if known)
- Tracking number (once assigned by carrier)
- Link to track shipment in real-time
- Seller name and contact information

**Shipped Notification Content:**
- Order number and item details
- Tracking number (prominently displayed)
- Carrier name and logo
- Link to carrier's tracking page
- Expected delivery date range
- Delivery address confirmation
- Link to platform tracking page

**In Transit Notification Content:**
- Order number
- Tracking number
- Current package location (if provided by carrier - city/facility)
- Last update time
- Estimated delivery date
- Link to full tracking details

**Out for Delivery Notification Content:**
- Order number
- Tracking number
- Message: "Your package is out for delivery today"
- Estimated delivery window (if provided)
- Delivery address confirmation
- Carrier's customer support number
- Option to provide delivery instructions (if carrier supports)

**Delivery Confirmation Notification Content:**
- Order number
- Delivery confirmation timestamp
- Tracking number
- Delivered address confirmation
- Signature confirmation (if signed for)
- Thank you message
- Link to order details and review request
- Link to return process if customer wishes to return

**Delivery Failed Notification Content:**
- Order number
- Tracking number
- Specific failure reason (address issue, customer unavailable, etc.)
- Current package location
- Next steps for customer (retry delivery, pick up at facility, return to sender)
- Carrier contact information for specific delivery issues
- Link to request redelivery or change delivery address

### 5.4 Notification Timing and Rate Limiting

THE system SHALL send notifications immediately upon occurrence of the triggering event (within 1 minute).

FOR email notifications, THE system SHALL allow a configurable delivery delay to batch multiple updates (default: immediate, configurable up to 24 hours for digest mode).

FOR SMS notifications, THE system SHALL not send SMS between 21:00 and 08:00 in the customer's local timezone unless the customer has explicitly enabled notifications during quiet hours.

THE system SHALL implement rate limiting to prevent sending more than one notification per customer per shipment per 4-hour window for non-critical updates.

### 5.5 Notification Preferences

WHEN a customer accesses their notification settings, THE system SHALL allow them to configure:
- Which notification channels to use (email, SMS, in-app, push)
- Which events trigger notifications (all, critical only, none)
- Preferred notification frequency (immediate, daily digest, weekly digest)
- Quiet hours during which notifications are not sent
- Whether to receive SMS notifications and which phone number to use

THE system SHALL respect customer notification preferences at all times.

---

## 6. Tracking Information for Customers

### 6.1 Customer Tracking Dashboard

WHEN a customer navigates to their order or clicks on a specific order, THE system SHALL display a comprehensive tracking view including:
- Order summary with all items and quantities
- All shipments associated with the order
- Current status of each shipment
- Complete timeline of tracking events from shipment creation through delivery
- Estimated and actual delivery dates
- Carrier information and links to carrier tracking

### 6.2 Tracking Details Visibility

FOR each shipment, THE system SHALL provide customers with:

**Basic Information:**
- Tracking number (prominently displayed for easy reference)
- Carrier name and logo
- Shipping method (Standard, Express, Overnight, Same-Day, etc.)
- Order date and shipment creation date
- Items included in this specific shipment

**Current Status:**
- Current status (Pending, Shipped, In Transit, Out for Delivery, Delivered)
- Last update timestamp
- Status description in customer-friendly language
- Estimated days until delivery (calculated from expected delivery date)

**Location Information:**
- Current package location (city and state, if provided by carrier)
- Origin location (seller's shipping address or warehouse)
- Destination location (customer's delivery address)
- Map view of package journey (if carrier provides map data)
- Geographic progress indicator

**Estimated Delivery:**
- Estimated delivery date range
- Expected delivery window (e.g., "Between 2-4 PM")
- Timezone of estimated delivery
- Revised estimated delivery (if package is delayed with updated ETA)

**Event Timeline:**
- Complete history of all tracking events in reverse chronological order (newest first)
- Event timestamp for each milestone
- Event location (if available from carrier)
- Event description in customer language
- Expandable details for each event
- Linking to carrier event code for technical reference

### 6.3 Real-Time Updates

THE system SHALL poll carrier APIs every 4 hours for tracking updates and immediately process any status changes.

WHEN the carrier provides a tracking update indicating a status change, THE system SHALL update the customer's tracking page within 5 minutes.

THE customer's tracking page SHALL display the "Last Updated" timestamp so customers know when the information was last refreshed.

WHEN the customer manually refreshes the tracking page, THE system SHALL immediately request the latest status from the carrier if the last check was more than 30 minutes ago.

### 6.4 Tracking History

THE system SHALL maintain a permanent record of all tracking events for audit and dispute resolution.

WHEN a customer views their order history, THE system SHALL display all historical shipments even after delivery is confirmed.

WHEN a customer clicks on a historical shipment, THE system SHALL display the complete tracking timeline from that shipment's creation through final disposition.

### 6.5 Tracking Link and Sharing

THE system SHALL generate a unique, permanent tracking URL for each shipment that does not require authentication to access.

THE system SHALL allow customers to share the tracking URL with others (e.g., family members, recipients) so they can monitor the shipment.

THE tracking URL SHALL display the complete tracking information without revealing sensitive customer data like the full delivery address (show only last 4 digits of address for privacy).

### 6.6 Tracking Integration with Carrier

THE system SHALL provide a direct link to the carrier's tracking page so customers can view tracking information directly from the carrier if desired.

THE system SHALL store the carrier tracking URL with each shipment for this purpose.

THE system SHALL display the carrier's tracking link prominently on the tracking page.

---

## 7. Delivery Confirmation

### 7.1 Delivery Confirmation Process

WHEN the carrier delivers the package, the carrier API SHALL report delivery confirmation with timestamp and sometimes proof of delivery.

THE system SHALL automatically update the shipment status to "DELIVERED" upon receiving carrier confirmation.

THE system SHALL mark the order as delivered in the order management system, making it eligible for customer review and return requests.

WHEN a shipment is delivered, THE system SHALL send the delivery confirmation notification to the customer immediately.

### 7.2 Proof of Delivery

THE carrier may provide proof of delivery information including:
- Delivery timestamp (exact time of delivery in ISO 8601 format)
- Signature or delivery confirmation method (signature, photo, contactless delivery confirmation)
- Delivered-to information (specific location, delivery representative name, apartment/office number)
- Photographic evidence (if carrier captures this)
- Delivery location (front door, side entrance, with neighbor, etc.)

WHEN proof of delivery is available, THE system SHALL display it on the tracking page for the customer.

THE system SHALL store proof of delivery information with the shipment record for dispute resolution and customer inquiries.

### 7.3 Failed Delivery Handling

IF the carrier reports delivery failure (address issue, customer not available, incorrect address, etc.), THE system SHALL:
- Update status to "DELIVERY_ATTEMPTED"
- Record the failure reason provided by the carrier
- Notify the customer immediately with failure details
- Display next steps to the customer (retry delivery, pick-up at facility, return to sender, contact support)

WHEN delivery fails, THE carrier typically attempts redelivery automatically according to carrier policy (usually up to 3 attempts). THE system SHALL track subsequent delivery attempts.

IF redelivery attempts fail after 3 attempts (standard carrier policy), THE system SHALL:
- Update status to "RETURNED_TO_SENDER"
- Notify the customer and seller
- Initiate return process or customer contact to arrange alternative delivery

### 7.4 Delivery Instructions

BEFORE shipment is picked up by carrier, THE customer SHALL have the option to provide delivery instructions such as:
- "Leave at front door"
- "Leave in mailbox"
- "Do not leave unattended"
- "Deliver to side entrance"
- "Require signature"
- "Deliver only to recipient name"
- "Leave with neighbor - specify address"
- Custom delivery instructions (up to 200 characters)

IF delivery instructions are provided, THE system SHALL:
- Include instructions in the shipment information sent to the carrier
- Display instructions to the delivery personnel
- Store instructions with the shipment for reference
- Make instructions available on tracking page

IF a delivery fails due to inability to follow instructions, THE system SHALL contact the customer for clarification.

### 7.5 Delivery Confirmation by Customer

IN rare cases where carrier confirmation is delayed or unavailable, THE system SHALL allow a customer to manually confirm delivery within 14 days of the expected delivery date.

WHEN a customer manually confirms delivery, THE system SHALL:
- Record the confirmation timestamp and method
- Update the shipment status to "DELIVERED"
- Notify the seller that delivery has been confirmed
- Enable order review and return eligibility
- Mark order as complete

---

## 8. Return Shipping Workflow

### 8.1 Return Authorization Request

WHEN a customer wants to return an item, THE customer SHALL submit a return request through the order management system.

THE return request SHALL include:
- Which items from the order are being returned (if partial return)
- Reason for return (defective, wrong item, changed mind, not as described, etc.)
- Additional comments from the customer

WHEN a return request is submitted, THE system SHALL validate:
- Order has been delivered (status = DELIVERED)
- Return window is still open (typically 30 days from delivery date)
- Items being returned are eligible for return
- Customer account is in good standing

IF the return request is valid, THE system SHALL:
- Create a return order in the system
- Update return status to "PENDING_APPROVAL"
- Notify the seller of the return request
- Notify the customer that their request has been received
- Provide estimated timeline for return processing

IF the return request fails validation, THE system SHALL display a message explaining why the return cannot be processed (e.g., "Return window has closed").

### 8.2 Return Approval Process

WHEN a seller or admin reviews a return request, they SHALL either approve or reject it.

IF the return is approved, THE system SHALL:
- Update return status to "APPROVED"
- Generate a return shipping label
- Make the return label available to the customer for download (PDF format)
- Send email notification to customer with return label and instructions
- Provide Return Merchandise Authorization (RMA) number

IF the return is rejected, THE system SHALL:
- Update return status to "REJECTED"
- Send notification to the customer with rejection reason and appeal instructions
- Close the return request

### 8.3 Return Label Generation

WHEN a return is approved, THE system SHALL:
- Request a return shipping label from the carrier API
- Generate a label for the return destination (seller's return address or warehouse)
- Provide the label in PDF format for customer printing
- Include a return merchandise authorization (RMA) number on the label

THE return label SHALL include:
- Carrier barcode for automated sorting and tracking
- Return destination address (seller or fulfillment center)
- Return RMA number for identification
- Customer reference information (order number, name)
- Shipping method (typically prepaid return service)
- Carrier logo and service name

WHEN generating a return label, THE system SHALL validate that return shipping is supported for the customer's location and selected carrier.

### 8.4 Return Shipping Tracking

WHEN the customer ships the return using the provided label, THE carrier SHALL automatically begin tracking the package using the return label barcode.

THE system SHALL integrate with the carrier API to track return shipments the same way as forward shipments.

WHEN the return package is scanned by the carrier, THE system SHALL:
- Update the return status to "IN_TRANSIT"
- Display tracking information on the customer's order page
- Notify the customer of the return shipment status
- Display return tracking timeline

THE customer SHALL be able to track their return shipment using the RMA number or tracking number through the standard tracking interface.

### 8.5 Return Destination Receipt

WHEN the return shipment reaches the seller or warehouse, THE carrier SHALL confirm receipt with scan/delivery notification.

THE system SHALL automatically update the return status to "RECEIVED_BY_SELLER" upon carrier confirmation.

WHEN the return is received, THE system SHALL notify:
- The customer that their return was received
- The seller that they have a return to process and inspect

### 8.6 Return Processing and Inspection

WHEN the seller receives the return, THE seller SHALL inspect the items to verify they match the return request and are in acceptable condition.

THE seller SHALL then update the return status to either:
- "ACCEPTED": Items meet return criteria and will be processed for refund
- "REJECTED": Items do not meet return criteria (damaged, opened, incorrect item, etc.)

IF the return is accepted, THE system SHALL:
- Calculate refund amount (based on original purchase price, minus any restocking fees if applicable)
- Update return status to "REFUND_PROCESSING"
- Initiate refund in the payment system
- Notify the customer that refund is being processed
- Restore inventory for the returned items

IF the return is rejected, THE system SHALL:
- Update return status to "REJECTED_BY_SELLER"
- Notify the customer with reason for rejection
- Offer options to appeal or contact customer support

### 8.7 Refund Processing

WHEN a return is accepted, THE system SHALL process the refund through the original payment method within 3-5 business days.

THE refund amount SHALL be equal to the original product purchase price plus tax.

IF the original order used multiple payment methods, THE system SHALL refund to each method proportionally.

WHEN the refund is processed, THE system SHALL:
- Update return status to "REFUND_COMPLETED"
- Record the refund transaction ID
- Notify the customer that the refund has been issued
- Include expected time for refund to appear in customer's account (5-10 business days for card refunds)

### 8.8 Return Shipping Exceptions

IF the customer never ships the return within 14 days of approval, THE system SHALL:
- Send reminder notification at day 7
- Mark return as "EXPIRED" at day 14
- Inform the customer that the return opportunity has expired
- Close the return request without processing refund

IF the return shipment is lost in transit, THE system SHALL:
- Detect no delivery confirmation after 14 days
- Update return status to "LOST_IN_TRANSIT"
- Notify customer and seller
- Offer to generate a replacement return label or process refund based on customer preference

IF the carrier cannot deliver the return shipment (address issue, refused, etc.), THE return shall follow the same failed delivery process as regular shipments with automatic retry attempts.

---

## 9. Business Rules and Constraints

### 9.1 Shipping Validation Rules

THE system SHALL enforce the following validation rules when creating shipments:

**Address Validation:**
- Delivery address must be complete (street address, city, state/province, postal code, country)
- Postal code must match the country format standard
- Address must be recognized by at least one available carrier
- Address must not be flagged as restricted or high-risk by carrier systems
- Address components must pass regex validation (valid characters only)

**Item Validation:**
- All items in the shipment must have sufficient inventory reserved
- Items must not be restricted from shipping to the destination country
- Items must not exceed weight or dimension limits for selected shipping method
- Combined weight must not exceed 1000 pounds (system maximum)
- Combined dimensions must not exceed 200 cubic feet (system maximum)
- Items must not require special handling unavailable for selected shipment

**Shipment Validation:**
- Shipment total weight must match sum of item weights (within 5% tolerance for packaging)
- Shipment dimensions must be calculated from item dimensions with padding for packaging
- Total shipping cost must match carrier quote for method and destination (within 10% tolerance)
- Seller must have active seller account status
- All items in shipment must come from same seller (for same shipment)

### 9.2 Shipping Timing Requirements

WHEN an order is confirmed, THE seller SHALL prepare the shipment within 24 hours and update the status to "READY_FOR_PICKUP".

IF the seller does not update the status within 24 hours, THE system SHALL send a reminder notification to the seller at 20 hours.

IF the seller does not update the status within 48 hours, THE system SHALL automatically escalate to admin and notify the customer about the delay.

WHEN the seller marks shipment as ready, THE carrier SHALL pick up the package within 24 hours for most carriers (may vary by location and carrier).

WHEN the package is in transit, THE carrier SHALL deliver the package within the estimated timeframe for the selected shipping method (within 1 day for overnight, 2-3 days for express, 5-7 days for standard).

IF a shipment is delayed beyond the original estimated delivery date, THE system SHALL:
- Display the revised estimated delivery date if provided by carrier
- Notify the customer of the delay and new timeline
- Offer customer support options if delay exceeds 7 days beyond original estimate

### 9.3 Error Handling and Recovery

IF a carrier API request fails due to temporary unavailability, THE system SHALL retry with exponential backoff (30 seconds, 2 minutes, 5 minutes, then stop).

IF all retry attempts fail, THE system SHALL:
- Log the error with detailed information
- Notify the admin of the failed API request
- Allow manual intervention to create shipment record manually

IF a shipping label cannot be generated due to address issues, THE system SHALL:
- Reject the shipment creation
- Display specific error message about the address problem
- Offer to correct or verify the address
- Allow user to try again after correction

IF a shipment status update fails to sync with the order management system, THE system SHALL:
- Log the error for audit
- Retry the sync operation after 5 minutes
- Alert admin if sync remains failed after 3 attempts

### 9.4 Shipping Cost Adjustments

IF the actual shipping cost from the carrier differs from the quoted cost during checkout, THE system SHALL:
- Log the discrepancy
- Update the shipment cost to actual amount
- Notify admin if difference exceeds 10% of quoted price
- Adjust customer invoice if difference is more than 5% (refund or charge)

IF a shipping cost adjustment is needed due to customer error (wrong dimensions, wrong address), THE system SHALL:
- Calculate the new shipping cost
- Notify the customer with new cost
- Allow customer to proceed with new cost or modify shipment

---

## 10. System Integration Points

### 10.1 Order Processing System Integration

THE shipping system SHALL integrate with the order processing system to:
- Create shipments when orders are confirmed and paid
- Update order status based on shipment status
- Prevent order modifications after shipment is created
- Link shipment information to order records
- Calculate order fulfillment metrics based on shipping data

WHEN an order transitions from "CONFIRMED" to "SHIPPED", THE order management system SHALL reflect this status change.

WHEN an order is delivered, THE order status SHALL change to "DELIVERED" and trigger completion workflows.

### 10.2 Inventory Management Integration

THE shipping system SHALL integrate with inventory management to:
- Verify inventory availability before shipment creation
- Reserve inventory when order is confirmed
- Update inventory counts when shipment is dispatched
- Handle inventory restoration if shipment is cancelled or returned

WHEN a shipment is created, THE inventory system SHALL reduce the inventory count for the shipment items.

WHEN a return is received and approved, THE inventory system SHALL restore the inventory count.

### 10.3 Payment Processing Integration

THE shipping system SHALL integrate with the payment processing system for:
- Charging shipping costs during checkout
- Processing refunds when returns are completed
- Calculating and applying shipping-related fees or promotions

THE payment system SHALL lock shipping costs until the shipment is confirmed by the carrier.

### 10.4 Notification System Integration

THE shipping system SHALL integrate with the notification system to:
- Queue notifications for all shipping events
- Support multiple notification channels (email, SMS, in-app, push)
- Track notification delivery status
- Handle notification delivery failures and retries

WHEN a shipping status changes, THE system SHALL immediately send notifications through configured channels.

### 10.5 Customer Account Integration

THE shipping system SHALL integrate with the customer account system to:
- Access customer delivery address information
- Retrieve customer notification preferences
- Update customer's order and return history
- Verify customer identity for tracking access

THE shipping system SHALL respect customer privacy and only show address information to authorized users (customer, seller of that order, admin).

---

## 11. Summary

THE shipping and tracking system provides comprehensive management of the order fulfillment lifecycle from preparation through delivery. It enables customers to track their orders in real-time, supports multiple shipping methods and carriers, handles return shipments, and provides sellers and admins with complete visibility into shipping operations. The system enforces strict validation rules to prevent shipping errors, automatically sends notifications for all key shipping events, and maintains complete audit trails for compliance and dispute resolution.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, microservices structure, real-time systems, etc.) are at the discretion of the development team. Developers have full autonomy to choose programming languages, frameworks, deployment strategies, and integration patterns that best suit the technical architecture. This document describes WHAT the shipping system should do from a business perspective, not HOW to build it.*