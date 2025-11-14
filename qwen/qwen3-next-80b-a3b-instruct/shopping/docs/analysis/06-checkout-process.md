## Checkout and Payment Processing Flow

### Introduction

The checkout and payment processing workflow is the critical transactional pathway through which customers finalize purchases on the shopping mall platform. This document defines the complete business process and functional requirements for transitioning from a populated shopping cart to a confirmed, paid order. All components must work in coordination with the cart, product catalog, shipping, and user accounts systems.

Every step must preserve user state, prevent data loss, and provide clear feedback. The system must not allow order submission unless all validation rules pass, and must recover gracefully from payment failures without requiring customers to re-add items to cart.

### Cart Review and Confirmation

WHEN a customer initiates the checkout process, THE system SHALL display a consolidated view of all items in their cart with the following details for each product:

- Product name and image
- Selected SKU attributes (color, size, etc.)
- Unit price at time of addition
- Quantity
- Total price per line item

WHEN a product in the cart has been removed from inventory by another customer since being added, THE system SHALL highlight it with a warning indicator and SHALL disable the "Proceed to Checkout" button until the cart is updated.

WHEN the price of a product in the cart has changed since the item was added, THE system SHALL display the original price (locked at cart addition) and SHALL show a hint indicating "Price locked at time of cart addition."

WHERE a customer has more than 30 items in their cart, THE system SHALL display a warning: "Your cart contains many items. Consider splitting into multiple orders."

### Shipping Address Selection

WHEN a customer proceeds past the cart review, THE system SHALL require them to select a shipping address from their saved addresses or add a new one.

THE system SHALL display all saved addresses for the authenticated customer with labels: "Home," "Work," "Other," or custom names provided during creation.

WHEN no shipping addresses are saved, THE system SHALL require the customer to add at least one address before proceeding.

WHERE a customer selects "Use different billing address," THE system SHALL display a separate form for billing information, pre-filled with the shipping address data unless modified.

THE system SHALL validate all address fields for required content: recipient name, street address, city, postal code, and country. Any missing field SHALL prevent submission.

### Payment Method Addition

WHEN a customer reaches the payment section, THE system SHALL allow the addition and selection of at least three payment methods:

1. Credit or debit card (with card number, expiry, CVV, and cardholder name)
2. Digital wallet (e.g., PayPal, Apple Pay, Google Pay)
3. Bank transfer (with account number and routing information)

THE system SHALL not accept any other payment methods not explicitly listed above.

WHEN a customer selects a saved payment method, THE system SHALL mask sensitive data (e.g., "**** **** **** 1234") and SHALL display only the last four digits.

WHEN a customer adds a new card, THE system SHALL validate the card number with Luhn algorithm and SHALL validate the expiry date against current date.

THE system SHALL require the CVV to be 3 or 4 digits (depending on card type) and SHALL not store it.

### Tax and Shipping Calculation

WHEN a shipping address is selected, THE system SHALL immediately calculate and display:

- Estimated shipping cost based on address region, weight of items, and selected delivery speed
- Estimated sales tax based on the shipping address jurisdiction (state/country)
- Total order value (sum of cart items + shipping + tax)

THE system SHALL NOT calculate tax or shipping until a valid shipping address is submitted.

WHERE the customer changes the shipping address after calculation, THE system SHALL recalculate tax and shipping automatically within 1 second.

WHERE any item is removed from cart after tax/shipping calculation, THE system SHALL recalculate total value dynamically.

THE system SHALL display the breakdown clearly:

```
Subtotal: $XXX.XX
Shipping: $XX.XX
Tax: $XX.XX
Total: $XXX.XX
```

### Order Review and Submit

WHEN the customer reviews their order summary, THE system SHALL require them to check two boxes before enabling the "Place Order" button:

1. "I confirm the shipping address is correct."
2. "I agree to the Terms of Service and Privacy Policy."

THE "Place Order" button SHALL remain disabled until both checkboxes are selected.

WHEN the customer clicks the "Place Order" button, THE system SHALL:

1. Verify every cart item is still available
2. Verify items have not been price-changed outside tolerance (price must not be more than 5% higher than cart-added price)
3. Verify total funds are available on the selected payment method
4. Verify the payment method is not expired or declined on file
5. Then proceed to payment processing

IF any verification fails, THEN THE system SHALL display a specific error message and return the customer to the appropriate step (e.g., "Product price changed. Please review cart." or "Payment method declined. Please try another."), without losing cart state or address information.

### Payment Gateway Integration

WHEN the order is submitted for payment, THE system SHALL initiate one of the supported payment gateway integrations (e.g., Stripe, Adyen, PayPal) using the selected payment method and encrypted customer data.

THE system SHALL NOT allow direct entry of sensitive payment data by the frontend. All payment details SHALL be securely transmitted via gateway SDK or tokenization.

THE system SHALL support both synchronous (redirect) and asynchronous (webhook) payment response protocols based on the gateway’s capability.

WHERE a payment gateway is temporarily unavailable, THE system SHALL display: "Payment service temporarily unavailable. Please try again in a few minutes or select another payment method." and SHALL provide a "Try again" button.

### Payment Success Flow

WHEN the payment gateway responds with a success status, THE system SHALL:

1. Immediately confirm the order in the database with status "confirmed"
2. Generate and store a unique order ID in format "ORD-YYYYMMDD-NNNN" where NNNN is a numeric sequence
3. Send an order confirmation email to the customer within 30 seconds
4. Send a fulfillment notification (including order ID, items, and shipping address) to the responsible seller(s)
5. Clear the customer’s shopping cart
6. Redirect the user to an order confirmation page

ON the order confirmation page, THE system SHALL display:

- "Order Confirmed!"
- Order ID: "ORD-20251112-0034"
- Estimated delivery date based on shipping method
- Itemized list with prices
- Shipping address
- Payment method used (masked)
- Customer service contact link

THE system SHALL provide a "Download Receipt" button that generates a PDF.

### Payment Failure Recovery

WHEN the payment gateway returns a failure response (e.g., insufficient funds, expired card, fraud decline), THEN THE system SHALL:

1. State the order as "payment_failed" in the system
2. Preserve the cart items and shipping address in their current state
3. Redirect the customer to a payment failure page
4. Display the error message provided by the payment gateway (e.g., "Insufficient funds" or "Card declined") in plain language
5. Show a clearly labeled "Retry Payment" button with the same payment method pre-selected
6. Show a "Choose Alternative Payment Method" button
7. Allow customer to proceed directly from this screen without re-entering shipping or cart data

WHEN a customer selects "Retry Payment," THE system SHALL re-initiate the transaction without requiring re-entry of cart or address details.

WHEN a customer selects "Choose Alternative Payment Method," THE system SHALL return them to the payment method selection screen with cart and address preserved.

### Order Confirmation Display

WHEN the order is successfully confirmed, THE system SHALL prevent duplicate submissions by:

- Disabling the "Place Order" button for 10 seconds
- Purging the session's cart state upon successful redirect
- Setting a "pending_order" flag in local storage until server response is received

WHERE a customer refreshes the confirmation page, THE system SHALL attempt to re-fetch the order status from the server. If the order is confirmed, it SHALL redisplay the confirmation screen. If not, it SHALL redirect to cart.

THE system SHALL support returning to the confirmation page later via "Order History," where the order details are persisted with immutable snapshots of item prices, shipping details, and payment method at time of order.

ALL error messages shown to customers SHALL be human-readable, non-technical, and include guidance on next steps (e.g., "Try another card," "Contact your bank," "Call customer support").

THE system SHALL NEVER display underlying error codes, gateway errors, or technical stack traces to the end user under any circumstances.