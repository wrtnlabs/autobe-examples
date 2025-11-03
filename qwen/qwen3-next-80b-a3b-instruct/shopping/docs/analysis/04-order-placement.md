## Order Placement and Payment Processing Flow

This document details the complete end-to-end user journey for placing an order and completing payment on the shoppingMall platform. It defines the business logic, decision points, state transitions, and error conditions that developers must implement to support customer checkout workflows. This document is written in business language and does not specify technical implementations such as API endpoints, database structures, or payment gateway integrations.

### Checkout Initiation

- THE customer SHALL initiate checkout when they select the "Proceed to Checkout" option from their shopping cart.
- WHEN the cart is empty, THE system SHALL prevent checkout initiation and display a notification: "Your cart is empty. Add products before checking out."
- IF the customer has no saved shipping address, THE system SHALL require them to add one before proceeding with checkout.
- WHERE the customer has previously completed a purchase, THE system SHALL display their last used shipping address as the default.

### Shipping Address Selection

- THE customer SHALL be able to select from multiple saved shipping addresses.
- WHEN the customer selects a new address, THE system SHALL allow them to enter and save a new shipping address.
- THE system SHALL require the following fields for each shipping address:
  - Full name (first and last)
  - Street address (minimum 5 characters)
  - City
  - State/Province
  - ZIP/Postal code (must validate against country format)
  - Country (from standardized ISO 3166 list)
  - Phone number (optional but recommended)
- IF the customer attempts to submit an address with a missing required field, THE system SHALL display the specific field error (e.g., "Postal code is required").
- THE system SHALL validate that the postal code matches the expected format for the selected country.
- WHILE the address form is being edited, THE system SHALL keep the previous selection active and prevent submission until all errors are resolved.
- THE system SHALL store all valid shipping addresses in the customer’s account profile.

### Payment Method Selection

- THE customer SHALL be able to select one payment method for the current order.
- THE system SHALL display all payment methods saved to the customer’s account.
- WHERE the customer has no saved payment methods, THE system SHALL display options to add a new card or use an alternative payment method.
- THE system SHALL support at least the following payment methods:
  - Credit/Debit Card (Visa, Mastercard, American Express, Discover)
  - Digital Wallet (e.g., Apple Pay, Google Pay)
  - Online Bank Transfer
- WHEN the customer selects a credit/debit card, THE system SHALL require:
  - Card number (minimum 13 digits)
  - Expiration date (MM/YY format)
  - CVV (3 or 4 digits)
  - Billing address (which shall auto-fill from their default shipping address unless they choose otherwise)
- IF the customer attempts to use an expired card, THE system SHALL prevent submission and display: "This card has expired. Please use a different payment method."
- THE system SHALL securely store payment tokens and never store raw card numbers.
- WHERE the customer chooses a digital wallet, THE system SHALL trigger the native wallet popup on supported devices.

### Order Review

- WHEN the customer has selected a shipping address and payment method, THE system SHALL display an order review summary.
- THE order review SHALL include the following components:
  - List of all items in cart with SKU, product name, variant (color/size), quantity, and unit price
  - Subtotal (sum of all item prices before tax and shipping)
  - Applicable tax amount (calculated by region and product category)
  - Shipping cost (calculated by destination postal code and selected delivery speed)
  - Total amount due (subtotals + tax + shipping)
  - Selected shipping address
  - Selected payment method (masked card number or wallet name)
  - Order summary note: "By placing this order, you agree to our Terms of Service and Privacy Policy."
- IF any item in the cart is no longer available, THE system SHALL remove it from the order, update the total, and display: "One or more items have been removed from your order as they are no longer in stock. We apologize for this inconvenience."
- THE system SHALL allow the customer to edit their shipping address or payment method directly from the review screen.
- WHERE the customer wishes to add a gift message, THE system SHALL allow them to enter up to 200 characters.

### Payment Processing

- WHEN the customer confirms the order, THE system SHALL initiate payment processing.
- THE system SHALL reserve inventory immediately upon payment initiation for 15 minutes.
- WHILE payment processing is in progress, THE system SHALL display: "Processing payment. Please do not refresh or leave this page."
- IF the payment gateway returns a transient error (e.g., timeout, network failure, 500 error), THE system SHALL automatically retry the transaction up to two more times with a 3-second delay between attempts.
- IF the payment gateway returns a permanent failure (e.g., declined card, insufficient funds, invalid CVC), THE system SHALL immediately stop processing, release the inventory reservation, and display: "Payment was not accepted. Please check your payment details and try again."
- THE system SHALL log all payment attempts and outcomes for audit and fraud detection purposes.

### Order Confirmation

- IF the payment is successfully processed, THE system SHALL generate and display an order confirmation page.
- THE confirmation page SHALL include:
  - Order ID (formatted as ORDER-YYYYMMDD-XXXX)
  - Date and time of order placement (based on Asia/Seoul timezone)
  - Summary of items, total paid, and selected shipping method
  - Estimated delivery date range
  - Shipping and billing address
  - Payment confirmation message: "Your payment has been successfully processed."
  - Link to "View Order History"
- THE system SHALL send a confirmation email to the customer’s registered email address within 1 minute of successful payment.
- THE customer SHALL be redirected to the order confirmation page only after payment success.
- WHEN the customer refreshes the confirmation page, THE system SHALL preserve the confirmation data and not re-process payment or re-reserve inventory.
- THE system SHALL save the order to the database as "Confirmed" state only after payment success.

### Payment Failure Handling

- IF payment fails during processing, THE system SHALL:
  - Release all reserved inventory immediately
  - Log the failure reason (as returned by the payment processor)
  - Allow the customer to immediately retry payment with a different method
  - Display the error message exactly as provided by the payment provider
  - Include a "Try Again" button that pre-fills their previously selected shipping address and items
- WHEN the customer has three consecutive payment failures on the same order, THE system SHALL automatically cancel the order and display: "We were unable to process your payment after multiple attempts. Your cart has been cleared. You may try again later with a different payment method."

### Pending Payment State

- WHILE payment is pending, THE system SHALL retain the order in a "Pending Payment" state.
- THE system SHALL not update inventory levels during this state.
- WHEN the pending timeout (15 minutes) expires without payment confirmation, THE system SHALL automatically:
  - Cancel the order
  - Release all reserved inventory
  - Send a notification to the customer: "Your order was automatically canceled due to timeout. Items have been returned to stock."
- WHERE the customer returns within the 15-minute window and completes payment, THE system SHALL immediately complete and confirm the order.

### Order Creation Workflow

- THE system SHALL NOT create an official order record in the database until payment has been successfully confirmed.
- IF the customer navigates away from the checkout process before confirming payment, THE system SHALL NOT create any order record, and their cart SHALL remain unchanged.
- WHERE a customer completes payment and is redirected to the confirmation page, THE system SHALL create a permanent order record in the database with the following data:
  - Order ID
  - Customer ID
  - Timestamp (Asia/Seoul timezone)
  - All item SKUs, quantities, and prices
  - Applied tax rate
  - Shipping cost and method
  - Selected payment method ID (tokenized)
  - Full shipping and billing address
  - Order status: "Confirmed"
  - Order total
  - Gift message (if provided)
- THE system SHALL send a notification to the seller of each product in the order that a new order has been placed.
- WHERE an order contains products from multiple sellers, THE system SHALL generate a separate order record for each seller, linked by the same master order ID, to enable independent order fulfillment.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*