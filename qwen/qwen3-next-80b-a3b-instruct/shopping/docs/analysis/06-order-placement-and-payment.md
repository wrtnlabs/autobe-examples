## Order Placement and Payment Processing

### Order Review Page

THE system SHALL display a final order review page to the customer before payment processing begins, summarizing all order details with clear visual hierarchy. THE order review page SHALL include:

- List of all items in cart with product name, variant (SKU), quantity, unit price, and total price per item
- Subtotal amount calculated as sum of all item totals
- Shipping cost based on selected address and delivery method
- Tax amount calculated per jurisdiction based on shipping address
- Total order amount displayed prominently, including all fees
- Selected shipping address with full formatted address details
- Selected payment method type and last four digits of card or wallet identifier
- Estimated delivery date based on shipping method

WHEN the customer navigates to the order review page, THE system SHALL validate:

- Each SKU in cart still exists and is active
- Each SKU has available inventory equal to or greater than the cart quantity
- Prices of all items match current master pricing in the catalog
- Shipping address is active and belongs to the authenticated customer
- Payment method is valid and not expired

IF any validation fails, THE system SHALL:

- Display specific, actionable error messages for each failed check
- Highlight affected items or fields in red
- Disable the "Place Order" button until all validations pass
- Provide direct links to resolve each issue (e.g., "Update Shipping", "Select Different Payment Method", "Refresh Stock")

WHEN all validations pass, THE system SHALL enable the "Place Order" button with clear visual distinction (e.g., green background, bold text)

### Payment Methods Supported

THE system SHALL support the following payment methods for customers:

- Credit/debit cards (Visa, Mastercard, American Express, Discover)
- Digital wallets: Apple Pay, Google Pay, PayPal
- Buy Now Pay Later (BNPL) through partner providers (Affirm, Klarna)

WHEN a customer selects a payment method, THE system SHALL:

- Display only payment methods associated with the customer’s region and currency (USD)
- Show user-friendly icons and names (e.g., "Apple Pay" not "payment_method_apple_pay")
- For credit cards, collect card number, expiration date, CVV, and postal code
- For digital wallets, initiate native wallet authentication via browser APIs
- For BNPL options, show approximate repayment schedule and eligibility requirements

IF a customer attempts to select a payment method not supported in their country, THE system SHALL:

- Gray out the option with tooltip explaining regional restrictions
- Suggest alternative methods available in their region
- Log the attempted selection for fraud analysis

WHILE a payment method is being processed, THE system SHALL:

- Disable the "Place Order" button
- Display a loading spinner with text: "Processing payment..."
- Show a progress indicator if the payment provider supports it
- Prevent duplicate submissions using client-side throttling

### Payment Gateway Integration

WHEN the customer clicks "Place Order", THE system SHALL:

- Generate a unique, cryptographically secure order ID in format "ORD-YYYYMMDD-XXXXXXXX" where XXXXXXXX is 8 hexadecimal characters
- Serialize the entire order state (items, quantities, prices, taxes, shipping)
- Encrypt all sensitive customer payment data using TLS 1.3 and AES-256 encryption
- Send the encrypted payload to the configured payment gateway (Stripe, Adyen, or equivalent)

THE payment gateway integration SHALL:

- Use webhook endpoints to receive asynchronous payment status updates
- Support PCI-DSS Level 1 compliance for all payment data handling
- Store only payment method tokens (not full card numbers or sensitive data)
- Return the exact settlement amount to the system for matching
- Allow refund processing with automated refund receipts
- Integrate with three-domain secure (3DS2) protocol for high-risk transactions

IF the payment gateway returns an error during transaction initiation, THE system SHALL:

- Log the error code and message internally (not shown to user)
- Return a user-friendly message: "We’re having trouble processing your payment. Please try again in a few moments."
- Retain the cart state and order details so the customer can retry without re-entering
- Display a "Retry Payment" button
- Provide an option: "Choose a different payment method"

### Order Confirmation

WHEN the payment gateway confirms successful payment, THE system SHALL:

- Immediately transition the order status from "Pending Payment" to "Paid"
- Generate and persist a durable order record with all data
- Issue a unique, immutable order confirmation number
- Send email and SMS confirmation to the customer immediately (within 5 seconds)
- Deduct inventory for each SKU in the order from the seller’s available stock
- Notify the associated seller(s) by email and in-app notification
- Display a confirmation screen to the customer with:
  - Order confirmation number
  - Summary of items purchased
  - Estimated delivery date
  - Customer service contact information
  - Downloadable receipt button

THE confirmation screen SHALL:

- Be non-navigable without an explicit "Continue Shopping" or "View Order" button
- Not display any financial information editable by the customer
- Show a receipt ID that perfectly matches the one in email/SMS
- Include a link to "Track Order" that defaults to the order tracking page

WHEN a customer clicks "View Order", THE system SHALL:

- Redirect them to the dedicated order details page
- Ensure they are authenticated or have valid order token
- Show all order history including timestamps and status changes
- Allow them to access the receipt as PDF for download

### Order Number Generation

THE system SHALL generate a new order number using the following rules:

- Prefix: "ORD-"
- Date portion: 8-digit UTC ISO format (YYYYMMDD)
- Random suffix: 8-character hexadecimal string (uppercase A-F, digits 0-9)
- Total length: 19 characters (excluding the dash)
- Must be globally unique for at least 10 years
- Must be non-sequential to prevent enumeration attacks

WHEN requesting an order number, THE system SHALL:

- Generate the timestamp in UTC at nanosecond precision
- Generate cryptographically secure random bytes for the suffix
- Query the database to verify no duplicate exists in the last 7 days
- If a duplicate is found, regenerate the suffix and verify again (retry up to 5 times)
- If generation fails after 5 retries, return HTTP 503 with "System temporarily unavailable. Please try again later."

WHILE generating an order number, THE system SHALL:

- Lock the order-number sequence table for atomic generation
- Never expose the generation algorithm or pattern
- Never use sequential increments or time-based predictable sequences

### Payment Status Handling

THE system SHALL define the following order payment statuses:

- "Pending Payment": Order created, payment not initiated or in progress
- "Payment Processing": Payment gateway communication active
- "Paid": Payment successfully captured and settled
- "Payment Declined": Payment gateway rejected the transaction
- "Payment Failed": Gateway timeout, network error, or technical failure
- "Refunded": Full or partial amount returned to customer
- "Chargeback Initiated": Customer disputes payment and bank investigation started

WHEN a payment status changes, THE system SHALL:

- Immediately update the order status in the database
- Fire a domain event for downstream systems (inventory, shipping, notification)
- Send email and in-app notifications to customer
- Log the status change with timestamp, user ID, payment gateway reference ID, and reason code
- Audit the event in compliance logs for 10 years

WHILE payment status is "Payment Processing", THE system SHALL:

- Allow the customer to cancel the order (no refund yet)
- Not initiate shipment or inventory deduction
- Display the message: "Your payment is being processed. We’ll notify you when it’s complete."

WHEN payment status is "Payment Declined", THE system SHALL:

- Set the order status to "Payment Declined"
- Lock the order from further processing
- Send email: "Your payment was declined. Please try another payment method or contact your bank for details."
- Show customer a "Retry Payment" option
- Log the decline code from the payment gateway (e.g., "insufficient_funds", "expired_card")

WHEN payment status is "Payment Failed", THE system SHALL:

- Set the order status to "Payment Failed"
- Send email: "We couldn’t complete your payment due to a technical issue. Please try again."
- Allow customer to retry payment within 24 hours
- Automatically cancel the order if not resolved within 24 hours
- Log the error code from gateway and server-side timeout details

WHEN payment status is "Refunded", THE system SHALL:

- Set the order status to "Refunded"
- Return inventory to seller’s stock
- Notify customer via email and push: "Your refund of $X.XX has been issued. It will appear in your account within 5-10 business days."
- Record the refund reason (e.g., "customer_request", "item_unavailable")
- Freeze further processing of this order

WHEN payment status is "Chargeback Initiated", THE system SHALL:

- Set the order status to "Chargeback Initiated"
- Freeze all future processing (no restocking until resolution)
- Notify seller and admin teams via internal dashboard
- Begin evidence collection (order receipt, shipping proof, communication logs)
- Send customer notification: "Your payment has been disputed. A representative will contact you shortly."

### Partial Payments

THE system SHALL NOT support partial payments for any order.

IF a customer attempts to pay less than the total order amount, THE system SHALL:

- Reject the payment attempt with error code "partial_payment_not_allowed"
- Return full amount to customer (if any partial transfer occurred)
- Display message: "Orders must be paid in full before processing. Please pay the entire amount."
- Do not lock inventory or proceed with shipping
- Allow customer to retry with full payment

WHILE the order is pending full payment, THE system SHALL:

- Hold cart items for 15 minutes only (not in inventory)
- Keep order record in "Pending Payment" state
- Clear cart automatically if payment is not completed within 15 minutes

### Failed Payment Recovery

WHEN a payment fails, THE system SHALL provide the customer with these recovery options:

- "Retry with same method": Attempts payment with same card/wallet after 2 minutes cooldown
- "Change payment method": Opens payment method selection modal with other options
- "Contact support": Opens help chat with elevated priority tag

WHEN customer selects "Retry with same method", THE system SHALL:

- Automatically repopulate the last payment method
- Show warning: "This payment previously declined. Ensure sufficient funds and correct details."
- Enforce 120-second cooldown after each failed attempt (to prevent brute force)
- Limit retry attempts to 3 per order

IF 3 retry attempts are exhausted, THE system SHALL:

- Set order status to "Payment Failed - Max Attempts"
- Lock the order permanently
- Auto-cancel order after 30 minutes
- Send email: "We’ve tried assigning your payment 3 times and all attempts failed. Please select an alternative payment method to complete your purchase."

THE system SHALL maintain a customer payment failure history to:

- Detect abusive or fraudulent patterns (e.g., 5+ failed payments from one account)
- Trigger fraud review if 3+ failed attempts occur within 1 hour
- Temporarily disable payment methods flagged repeatedly
- Provide support agents with payment failure history upon account inquiry

WHEN a payment recovers successfully after failure, THE system SHALL:

- Display a notification: "Your payment has been successfully processed. Your order is confirmed!"
- Send order confirmation email and SMS
- Update inventory and trigger shipping workflow
- Log the recovery as "Recovery: payment succeeded after X failed attempts"


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*