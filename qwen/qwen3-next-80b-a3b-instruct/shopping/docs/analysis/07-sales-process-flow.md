## Sales Process Flow: End-to-End Transaction Workflow

This document details the complete business workflow for processing a sales transaction on the shoppingMall platform, from cart creation through order confirmation and inventory management. All steps describe business logic, state transitions, and validation rules using EARS format where applicable. This is a single-pass, production-ready specification for backend implementation.

### Cart Creation and Management

CART CREATION
- WHEN a customer adds a product to their cart, THE system SHALL store the product ID, quantity, and timestamp in a temporary cart state.
- WHEN a customer views their cart, THE system SHALL display all items with their current prices, total quantity, and subtotal.
- WHEN a customer removes an item from their cart, THE system SHALL remove the exact product ID and quantity specified.
- WHEN a customer updates the quantity of an item in their cart, THE system SHALL validate that the new quantity is greater than zero and less than or equal to the available inventory.
- WHILE a cart contains items, THE system SHALL calculate and display the running subtotal with tax applied as defined by the product's country of origin.
- IF a customer has no items in their cart, THEN THE system SHALL show an empty cart state with a prompt to continue shopping.
- WHERE cart items are modified, THE system SHALL recalculate the total in real-time without requiring page reload.

CART EXPIRATION
- WHILE a cart remains inactive for more than 24 hours, THE system SHALL automatically remove all items from the cart.
- WHEN a customer logs out, THE system SHALL preserve their cart for 30 days, then purge if no subsequent login occurs.
- IF a cart contains items that are no longer available in inventory, THEN THE system SHALL notify the customer and remove those items automatically.

### Checkout Initiation

- WHEN a customer clicks "Proceed to Checkout", THE system SHALL validate that the cart contains at least one item with a quantity greater than zero.
- IF the cart is empty, THEN THE system SHALL display error message "Your cart is empty. Add products before checking out."
- IF any item in the cart has been discontinued or flagged as unavailable by seller, THEN THE system SHALL block checkout and show message "Some items in your cart are no longer available. Please update your cart."
- WHEN checkout is initiated, THE system SHALL create an unconfirmed order draft with status "PENDING_CHECKOUT" and link it to the active cart.

### Shipping Information Entry

- WHEN a customer provides shipping information, THE system SHALL validate that the following fields are provided: first name, last name, street address, city, postal code, and country.
- WHERE customer has saved shipping addresses, THE system SHALL present them as selectable options.
- IF a postal code is provided, THE system SHALL validate it against the country’s format (e.g., 5-digit numeric for US, alphanumeric for Canada).
- IF country is "Japan", THEN THE system SHALL require the additional field "Prefecture".
- IF any required field is missing, THEN THE system SHALL highlight the field and display "This field is required."
- WHILE shipping information is being edited, THE system SHALL update the estimated delivery date based on selected shipping method and destination.

### Payment Method Selection

- WHEN a customer selects a payment method, THE system SHALL validate that at least one payment method is available.
- WHERE customer has previously saved cards, THE system SHALL display them as options with last four digits and expiry.
- IF no saved payment method exists, THE system SHALL require the customer to enter a new one.
- WHEN a new credit card is entered, THE system SHALL validate:
  - Card number (Luhn algorithm)
  - Expiry date (not expired, not more than 10 years in future)
  - CVV (3 or 4 digits, numeric only)
  - Cardholder name (minimum 2 characters, letters and spaces only)
- IF card is rejected by payment gateway during simulation, THEN THE system SHALL show "Payment method declined. Please try another card." without revealing gateway-specific error codes.
- WHERE payment method is PayPal, THE system SHALL open PayPal authentication in a secure pop-up window.

### Order Validation

- WHEN customer submits final order, THE system SHALL execute order validation including:
  - Verify all items in cart are still available in inventory
  - Confirm customer email is verified
  - Validate shipping address meets minimum formatting rules
  - Ensure total order value is greater than zero
- IF any product in cart is sold out, THEN THE system SHALL cancel order and show message: "One or more items are no longer available. Your cart has been updated."
- IF customer email is not verified, THEN THE system SHALL block order submission and show message: "Please verify your email address before placing an order."
- IF order total is zero or negative, THEN THE system SHALL show error: "Invalid order amount. Please check your cart."
- IF seller is suspended or flagged for violation, THEN THE system SHALL block the order and notify admin.

### Payment Processing

- WHEN payment processing begins, THE system SHALL:
  - Create a payment transaction record with unique ID
  - Send payment request to authorized gateway (Stripe, Apple Pay, Google Pay)
  - Lock inventory for 10 minutes to prevent overselling
- WHILE payment is pending, THE system SHALL display a spinner and message "Processing payment..."
- IF the payment is approved, THEN THE system SHALL:
  - Update order status to "PAID"
  - Record transaction ID, amount, and payment method
  - Immediately trigger inventory deduction
- IF the payment is declined, THEN THE system SHALL:
  - Update order status to "PAYMENT_FAILED"
  - Release inventory lock
  - Show message: "Payment was declined. Please try a different payment method."
- IF the payment gateway is unreachable, THEN THE system SHALL:
  - Show message: "Payment system temporarily unavailable. Please try again in a few minutes."
  - Retain order draft in "PENDING_PAYMENT" status for 60 minutes
  - Attempt retry automatically three times at 10-minute intervals

### Order Confirmation

- WHEN payment is successfully processed, THE system SHALL:
  - Generate and assign a unique order number in format "ORD-YYYYMMDD-NNNNN"
  - Set order status to "CONFIRMED"
  - Save full order details including product IDs, quantities, prices, shipping address, and payment method
  - Send order confirmation email to customer with order summary and tracking link
- THE system SHALL send order confirmation SMS to customer if mobile number is provided and opted in.
- WHEN order is confirmed, THE system SHALL send notification to the corresponding seller(s) with details of items and customer address.
- WHERE order includes products from multiple sellers, THE system SHALL split the confirmed order into separate seller-specific sub-orders.

### Inventory Deduction

- WHEN order status transitions to "PAID", THE system SHALL trigger inventory deduction.
- IF an item’s available quantity is less than requested quantity, THE system SHALL cancel the order with error "Out of stock" and return a message to the customer.
- FOR each product in the order, THE system SHALL:
  - Reduce the active inventory count by purchased quantity
  - Update last sold timestamp
  - Log inventory change with order ID, product ID, quantity, and action type "ORDER_FULFILLMENT"
- IF inventory update fails due to system error, THE system SHALL roll back payment and set order status to "INVENTORY_ERROR", then notify admin.
- WHERE multiple buyers attempt to purchase the last item simultaneously, THE system SHALL process first-come, first-served based on payment completion timestamp.

### Notification Triggers

- WHEN order is confirmed, THE system SHALL trigger the following notifications:
  - Email: Customer receives order confirmation with receipt
  - Email: Seller receives order fulfillment request
  - SMS: Customer receives tracking number if tracking service is enabled
- WHEN order status changes (e.g., shipped, delivered), THE system SHALL trigger:
  - Email: Customer receives status update
  - Email: Seller receives delivery confirmation
- WHEN a seller receives a new order, THE system SHALL trigger:
  - Push notification: If app is installed and notifications enabled
  - Webhook: To seller’s backend system if configured
- WHERE customer has enabled promotional notifications, THE system SHALL send additional messages about related products or discount offers.

### Order Status Updates

- THE system SHALL maintain the following order states with defined transitions:
  
  ```mermaid
  graph LR
    A["Draft"] --> B["Pending Checkout"]
    B --> C["Pending Payment"]
    C --> D["Paid"]
    C --> E["Payment Failed"]
    D --> F["Confirmed"]
    F --> G["Shipped"]
    G --> H["Delivered"]
    F --> I["Cancelled"]
    D --> I
    E --> J["Expired"]
    I --> K["Refunded"]
    H --> L["Completed"]
  ```

- STATE TRANSITION RULES:
  - FROM "Draft" TO "Pending Checkout": WHEN customer clicks "Proceed to Checkout"
  - FROM "Pending Checkout" TO "Pending Payment": WHEN shipping and payment information are saved
  - FROM "Pending Payment" TO "Paid": WHEN payment gateway confirms success
  - FROM "Pending Payment" TO "Payment Failed": WHEN payment gateway rejects transaction
  - FROM "Paid" TO "Confirmed": WHEN inventory deduction completes successfully
  - FROM "Confirmed" TO "Shipped": WHEN seller marks order as shipped and enters tracking number
  - FROM "Shipped" TO "Delivered": WHEN tracking data indicates delivery confirmation
  - FROM "Delivered" TO "Completed": AFTER 7 days of delivery (no returns or disputes)
  - FROM "Confirmed" TO "Cancelled": WHEN customer cancels before shipment, or system cancels due to fraud detection
  - FROM "Paid" TO "Cancelled": WHEN customer requests cancel within 5 minutes of payment, and inventory hasn't been deducted
  - FROM "Payment Failed" TO "Expired": WHEN order remains in "Payment Failed" state for more than 24 hours
  - FROM "Cancelled" TO "Refunded": WHEN payment is returned to customer, processed within 3-5 business days

- STATUS RESTRICTIONS:
  - WHERE order status is "Completed", THE system SHALL prevent any further edits, cancellations, or returns.
  - WHILE order status is "Shipped" or "Delivered", THE system SHALL not allow cancellation.
  - IF order status is "Payment Failed" or "Expired", THE system SHALL allow customer to restart checkout with new payment or remove items.
  - IF seller cancels an order, THE system SHALL set status to "Cancelled by Seller" and refund customer automatically.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*