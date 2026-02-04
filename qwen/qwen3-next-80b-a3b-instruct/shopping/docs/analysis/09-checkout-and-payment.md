# E-Commerce Shopping Mall Platform: Comprehensive Requirements Specification

## Introduction

The E-Commerce Shopping Mall Platform is a multi-vendor marketplace where customers and sellers interact through a structured, auditable, and secure environment. The platform enforces absolute traceability of all business-critical transactions through a comprehensive snapshot principle, ensuring the integrity of financial records and dispute resolution capabilities. Unlike traditional e-commerce platforms, this system prioritizes immutable historical accuracy over dynamic data manipulation, making it suitable for enterprise applications with strict compliance requirements.

The platform is designed for a multi-actor ecosystem: customers, sellers, administrators, and super administrators. Each actor has clearly defined permissions and responsibilities that govern their interactions with products, orders, inventory, and personal data. The architecture eliminates guest access entirely, requiring all users to authenticate before engaging with any feature, which enables personalized commerce, secure transactions, and legal compliance.

## Customer Account

### Account Registration

WHEN a new user attempts to register on the platform, THE system SHALL require the following mandatory fields:
- Email address (must be a valid, unique, RFC 5322-compliant email format)
- Password (minimum 12 characters, must contain at least one uppercase letter, one lowercase letter, one digit, and one special character)

WHEN the registration form is submitted, THE system SHALL:
- Validate email format using a standard email regex pattern
- Check if the email is already registered as either customer or seller
- Hash the password using bcrypt algorithms with a salt cost of 12
- Generate a unique internal customer ID (UUID v4)
- Set account status to "active"
- Send a verification email containing a one-time-use token with 24-hour expiration

IF the email address is already registered in the system, THEN THE system SHALL return a specific error code: "EMAIL_ALREADY_REGISTERED" with message: "This email address is already associated with an existing account. Please log in or contact support."

WHEN the user clicks the verification link, THE system SHALL:
- Confirm the token's validity and expiration
- Mark the account as verified
- Log the verification timestamp and originating IP address
- Update the account status to "active"

IF the verification token is expired or invalid, THEN THE system SHALL display a message: "Your verification link has expired. Please request a new verification email."

### Customer Authentication Flow

WHEN a customer attempts to log in, THE system SHALL validate:
- The email address exists and is verified
- The provided password matches the stored bcrypt hash
- The account is not suspended or banned
- The account has not exceeded 5 consecutive failed login attempts within the last 15 minutes

IF authentication fails due to invalid credentials, THEN THE system SHALL return a generic error message: "Invalid email or password" and increment the failed login counter.

IF an account exceeds 5 consecutive failed login attempts within 15 minutes, THEN THE system SHALL:
- Temporarily lock the account for 30 minutes
- Send an email notification to the customer: "Your account has been temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password."
- Log the lock event with IP address and timestamp

WHEN authentication succeeds, THE system SHALL generate a JSON Web Token (JWT) with the following payload:
- customerId: (string, UUID v4)
- role: "customer"
- email: (verified email address)
- iat: issued at timestamp (seconds since Unix epoch)
- exp: expiration timestamp (15 minutes from iat)
- scope: "read:profile, read:orders, write:cart, write:wishlist"

THE system SHALL enforce:
- Access token expiration: 15 minutes
- Refresh token expiration: 7 days
- Refresh tokens stored in encrypted database with revocation capability
- Immediate invalidation of all JWT tokens upon password change

### Password Management

WHEN a customer requests to change their password, THE system SHALL:
- Require the current password to be provided and validated against the stored hash
- Enforce password complexity: minimum 12 characters, must contain uppercase, lowercase, digit, and special character
- Ensure the new password differs from the current password
- Hash the new password using bcrypt with cost 12
- Update the password hash in the database
- Record the password change timestamp
- Invalidate ALL existing JWT tokens and refresh tokens
- Log the change with actor ID and IP address

WHEN a customer requests a password reset, THE system SHALL:
- Accept a password reset request with the customer's email address
- Verify the email is associated with a verified account
- Generate a cryptographically secure reset token (UUID v4)
- Issue a reset token with 1-hour expiration
- Send an email containing a reset link with the token
- Allow the reset only through the verified link
- When the reset link is used:
  - Validate token expiration
  - Accept new password meeting complexity requirements
  - Hash and store the new password
  - Invalidate the reset token
  - Invalidate ALL existing JWT and refresh tokens
  - Log reset action with admin/automated actor ID

IF a customer attempts to use a reset link that has expired, THEN THE system SHALL return: "This reset link has expired. Please request a new password reset."

WHEN a user attempts to set a password known to be compromised (verified against HaveIBeenPwned API), THEN THE system SHALL reject the password change with message: "This password has been compromised in a data breach. Please choose a stronger, unique password."

### Account Deletion

WHEN a customer requests account deletion, THE system SHALL:
- Verify the account belongs to the authenticated user
- Require explicit confirmation via a checkbox labeled: "I understand that my profile, addresses, wishlist, and cart will be permanently deleted. My order history and reviews will be preserved but shown as 'Deleted User'."
- Begin a 7-day reversible deletion grace period

DURING the grace period, THE system SHALL:
- Display a visible banner on all user dashboards: "Your account is scheduled for deletion in 7 days. You can cancel this request at any time."
- Disable all account modification operations (password change, profile edit, address changes)
- Prevent any new transactions (ordering, wishlist additions)
- Allow cancellation of deletion via "Cancel Deletion" button

AFTER the 7-day grace period expires, THE system SHALL:
- Permanently erase all personally identifiable information:
  - Email address
  - Password hash
  - Display name
  - Phone number
  - Shipping addresses
  - Wishlist entries
  - Cart contents
- Preserve the following data permanently:
  - All order records
  - All order item snapshots (product details, variants, prices, seller profile)
  - All reviews submitted by the customer (displayed as "Deleted User")
  - All address records for shipping history and legal compliance
  - All refund and cancellation request snapshots
- Invalidate and permanently delete all authentication credentials
- Make the customer ID unreusable for future registrations

IF a customer attempts to re-register with a previously deleted email address, THEN THE system SHALL:
- Treat it as a completely new account
- Assign a new customer ID
- Ignore any historical data from the deleted account
- Allow normal registration flow

### Customer Profile Management

THE customer profile SHALL contain the following editable fields:
- Display name (alphanumeric, spaces, hyphens, underscores only; maximum 100 characters)
- Phone number (international format: +[country code][number]; maximum 15 digits)

WHEN a customer updates their display name or phone number, THE system SHALL:
- Validate the new values according to length and format constraints
- If display name is empty, reject with error: "Display name cannot be empty"
- If phone number is invalid format, reject with error: "Phone number must be in international format (e.g., +1234567890)"
- Store the updated values in the customer profile
- Record the change timestamp
- Update the display name in all relevant contexts (cart, wishlist, reviews)
- Do NOT generate snapshots for these changes as they are non-critical for order integrity

IF a customer provides an invalid phone number format (contains alphabetic characters, invalid + prefix, too long), THEN THE system SHALL return error code: "INVALID_PHONE_FORMAT" with message: "Phone number must be in international format with '+[country code]' prefix and contain only digits."

### Address Management

THE system SHALL allow each customer to maintain multiple shipping addresses with the following mandatory fields:
- Recipient name (required, 1-100 characters)
- Phone number (required, international format: +[country code][number], max 15 digits)
- Street address (required, 1-255 characters)
- City (required, 1-100 characters)
- State/Province (required, 1-100 characters)
- Postal code (required, country-appropriate format)
- Country (required, ISO 3166-1 Alpha-2 code, e.g., "US", "JP", "KR")
- Default indicator (boolean, exactly one address per customer can be marked default)

WHEN a customer adds a new address, THE system SHALL:
- Validate all required fields against constraints
- Ensure postal code matches country's format (e.g., 5 digits for US, 6 alphanumeric for CA)
- Store the address with a unique address ID and creation timestamp
- Do NOT automatically set it as default
- Record creation timestamp and source (web, mobile)

WHEN a customer updates an existing address, THE system SHALL:
- Validate the updated fields
- Record the change timestamp
- Create an address snapshot capturing:
  - All previous values (before change)
  - New values
  - Timestamp of change
  - Actor ID (customer)
  - IP address
- Apply the updated values to the live address

WHEN a customer deletes an address, THE system SHALL:
- Verify the address belongs to the authenticated customer
- If the address is the only one, reject with error: "You must have at least one shipping address. Please add a new address before deleting this one."
- If the address is designated as default, automatically designate the most recently added address as default
- Record deletion timestamp
- Preserve the deleted address in an address snapshot (to maintain order history integrity)

WHEN a customer sets an address as default, THE system SHALL:
- Unset the previously designated default address for that customer
- Mark the selected address as default
- Record the change timestamp
- Create an address snapshot with old and new default status
- Apply change immediately to all future checkout workflows

IF a customer attempts to set an address as default that does not belong to them, THEN THE system SHALL return error code: "ACCESS_DENIED" with message: "You do not have permission to modify this address."

WHEN a customer checks out, THE system SHALL:
- Default to the customer’s designated default shipping address
- Allow selection of any other valid address from their address book
- Lock the selected shipping address at the time of order placement (no changes permitted after order submission)
- Preserve the exact state of the shipping address in the order item snapshot

### Wishlist Functionality

THE system SHALL allow each customer to maintain a wishlist containing products they wish to purchase, at the product level (not specific variants).

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Verify the product exists and is active/sellable
- Associate the product ID with the customer's wishlist
- Store the addition timestamp
- Do not save variant specificity (wishlist operates at product level)
- Enforce a wishlist limit of 500 products per customer

IF a customer attempts to add a product that already exists in their wishlist, THEN THE system SHALL treat it as a no-op and not create a duplicate entry.

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Verify the product is in their wishlist
- Remove the product association
- Record the removal timestamp

WHEN a product is deleted by its seller, THE system SHALL automatically remove that product from ALL customers' wishlists.

WHEN a product becomes unavailable (out of stock, hidden, or unlisted), THE system SHALL still retain it in the customer's wishlist but mark it as "Unavailable" during wishlist display.

WHEN a customer views their wishlist, THE system SHALL:
- Return all products in the wishlist in reverse chronological order (newest first)
- Display each item with:
  - Product name
  - Thumbnail image (main image at time of addition)
  - Base price (at time of addition)
  - Seller name
  - Availability status
- Paginate results with 20 items per page
- Return results within 200 milliseconds under normal load

THE system SHALL NOT permit:
- Adding variants directly to wishlist
- Viewing a deleted product's wishlist entry
- Modifying wishlist entries after deletion

## Shopping Cart

### Cart Management

WHEN a customer adds a product variant to their cart, THE system SHALL:
- Verify the variant exists and is active
- Verify the variant is not out of stock (stock quantity > 0)
- Verify the variant is accessible to the customer (seller not suspended)
- Validate that the quantity requested (default: 1) is a positive integer
- If the variant is already in the cart:
  - Add the requested quantity to the existing quantity
  - Do NOT create a duplicate cart item
- If the variant is not in the cart:
  - Create a new cart item with the specified quantity
- Record the timestamp of addition

WHEN a customer changes the quantity of an item in their cart, THE system SHALL:
- Validate that the new quantity is a positive integer
- Validate that the new quantity does not exceed current stock of the variant
- Update the cart item quantity
- Recalculate subtotal
- Record the change timestamp
- If the new quantity is zero, remove the item from the cart

WHEN a customer removes an item from their cart, THE system SHALL:
- Verify the cart item exists and belongs to the customer
- Remove the cart item
- Record removal timestamp

THE system SHALL display cart items with:
- Product name
- Variant options (color, size, etc.)
- Unit price (variant price if specified, otherwise base price)
- Quantity
- Subtotal (quantity × price)
- Total cart value

WHEN an item in the cart has insufficient stock (stock < cart quantity), THE system SHALL:
- Display warning: "Only X items in stock. Proceed with caution."
- Allow checkout but prevent order processing if stock cannot satisfy order

WHEN a variant in the cart is deleted by the seller, THE system SHALL:
- Mark the cart item as "Unavailable" (not remove it automatically)
- Display warning: "This item has been removed by the seller"
- Allow customer to continue checkout, but prevent order placement unless item is removed

WHEN a variant in the cart becomes out of stock, THE system SHALL:
- Mark the cart item as "Out of Stock"
- Display warning: "This item is currently out of stock"
- Allow customer to continue checkout, but prevent order placement unless item is removed

WHEN a customer views their cart, THE system SHALL:
- Aggregate and display all items with current quantities and prices
- Recalculate total cart value
- Display all warnings for unavailable or out-of-stock items
- Include shipping cost estimator
- Display total before tax

THE system SHALL ensure:
- Cart items persist across sessions via encrypted session storage
- Cart items are removed from cart upon successful order placement
- Cart items are never synchronized across devices

## Checkout and Payment

### Checkout Initiation

WHEN a customer selects "Proceed to Checkout" from their cart, THE system SHALL validate:
- Cart is not empty
- All cart items have available stock
- At least one cart item is available

IF the cart contains no available items (all unavailable or out of stock), THEN THE system SHALL prohibit checkout initiation and display message: "Your cart contains only unavailable items. Please remove them to proceed." 

IF the cart is empty, THEN THE system SHALL prevent checkout initiation and display message: "Your cart is empty."

IF any item has been deleted by the seller since being added to cart or has insufficient stock, THE system SHALL:
- Display warning: "Some items are no longer available. Please review cart before proceeding."
- Allow checkout continuation but prevent order placement until issue is resolved

### Address Selection

WHEN a customer initiates checkout, THE system SHALL present all addresses associated with the customer's account for selection.

WHEN the customer has no saved addresses, THE system SHALL:
- Require them to create a new shipping address
- Allow them to enter recipient name, phone number, street address, city, state/province, postal code, and country
- Validate all fields against constraints
- Save the new address
- Set it as default

WHEN a customer selects an address, THE system SHALL:
- Capture and lock:
  - Recipient name
  - Phone number
  - Street address
  - City
  - State/province
  - Postal code
  - Country
- Display locked address in order review
- Prevent further modification of the address during checkout

WHEN an address is selected and the order is placed, THE system SHALL:
- Lock the shipping address permanently to the order record
- Preserve its state at the moment of purchase as immutable data in the order item snapshot

### Order Review

WHEN the customer reviews their order before payment, THE system SHALL display:
- Final list of order items with:
  - Product name
  - Variant options
  - Quantity
  - Unit price (variant price if specified, otherwise base price)
  - Subtotal
- Selected shipping address
- Total order amount (sum of subtotals)
- Estimated tax
- Total price
- Payment method

WHEN an item in the review list has been marked as unavailable since cart addition, THE system SHALL:
- Disable the "Place Order" button
- Display warning: "One or more items are no longer available for purchase. Please remove them to proceed."
- Prevent submission

IF the customer attempts to place an order with unavailable items, THE system SHALL:
- Prevent submission
- Return validation error: "Cannot proceed with checkout. Unavailable items in cart."

### Payment Processing

WHEN the customer confirms payment, THE system SHALL:
- Transmit order details (items, total, shipping) securely to the external payment gateway via HTTPS
- Send customer ID and order ID as reference tokens
- Disable all UI controls and display "Processing Payment..." message
- Start a 60-second timeout for payment gateway response

WHEN the payment gateway returns a successful response, THE system SHALL:
- Store transaction ID from gateway
- Mark payment as "confirmed"
- Immediately proceed to order creation

WHEN the payment gateway returns a failure response, THE system SHALL:
- Capture the failure code and message from gateway
- Store payment attempt with failure status
- Return customer to checkout page with specific error message

### Payment Failure Handling

IF payment fails due to insufficient funds, THE system SHALL show: "Payment declined: insufficient funds. Please use a different payment method or adjust cart total."

IF payment fails due to expired card, THE system SHALL show: "Your payment method has expired. Please update your payment details and try again."

IF payment fails due to invalid card information, THE system SHALL show: "Payment method is invalid. Please verify your card details and retry."

IF payment fails due to gateway timeout, THE system SHALL show: "Payment processing timed out. Your card has not been charged. Please retry payment or try another method."

IF payment fails due to network failure, THE system SHALL show: "Network error. Please check your connection and try again."

IF payment fails for any reason, THE system SHALL:
- NOT create an order
- NOT decrement inventory
- NOT remove items from cart
- Preserve customer's cart state and selected shipping address
- Return customer to checkout page with failure details

### Order Creation

WHEN payment is approved, THE system SHALL create a new order record with:
- Unique order ID (UUID v4)
- Customer ID
- Timestamp of order creation
- Selected shipping address (locked copy)
- Total order amount
- Payment status: "paid"
- Status: "paid" (derived from order items)

WHEN an order is created, THE system SHALL create a separate order item for each cart variant, with:
- Product ID
- Product name (snapshot)
- Product description (snapshot)
- Category ID (snapshot)
- Base price (snapshot)
- Product images (snapshot)
- Variant ID
- SKU code (snapshot)
- Option values (snapshot)
- Price at time of purchase (snapshot)
- Quantity ordered
- Seller ID
- Seller profile snapshot (name, logo)
- Status: "paid"
- Order ID
- Creation timestamp

WHEN an order is created, THE system SHALL:
- Remove the items from the customer's cart
- Execute negative inventory adjustments for each variant purchased:
  - Deduct ordered quantity from current stock via inventory history record
  - Record reason: "order fulfillment"
  - Record timestamp matching order creation
- Generate and persist snapshots for:
  - Each product being ordered (name, description, category, base price, images)
  - Each variant being ordered (SKU code, option values, price override, stock quantity at time of order)
  - The seller's profile at time of purchase (shop name, description, logo)
- Assign order status as "paid"

WHILE an order item exists, THE system SHALL ensure the item-level snapshot data is immutable and cannot be modified.

WHEN a product's main image changes after purchase, THE system SHALL NOT affect the snapshot image stored with the order item.

## Order Structure

### Order Composition

An order contains one or more order items. Each order item corresponds to a purchased product variant with a specific quantity.

IF a customer buys 10 units of the same variant, THE system SHALL create a single order item with quantity 10, not 10 separate line items.

IF a customer purchases products from different sellers, EACH seller's items SHALL be recorded as separate order items under the same order.

Each order item has an independent status, allowing for:
- Different shipping schedules per item
- Individual cancellation or refund requests
- Mixed order status derivation

### Order Item Statuses

Each order item has its own status, tracked independently:
- "paid" — payment completed, waiting for seller to ship
- "shipped" — seller has shipped the item
- "delivered" — item has been delivered
- "cancelled" — item was cancelled
- "refunded" — item was refunded

Status transitions are governed by:
- System rules
- Seller actions
- Customer requests
- Administrator interventions

### Order Status Derivation

The overall order status is derived from its constituent order items:

IF all items are paid → order status: "paid"
IF any item is shipped and no items are delivered → order status: "shipped"
IF all items are delivered → order status: "delivered"
IF all items are cancelled → order status: "cancelled"
IF all items are refunded → order status: "refunded"
IF mixed statuses exist (e.g., some delivered, some cancelled) → order status: "partially completed"

THE system SHALL calculate the overall order status automatically on every status change of any order item.

THE system SHALL persist the status derivation rule as an immutable snapshot at time of calculation.

## Shipping and Tracking

### Shipment Concept

A shipment is a physical package sent by a seller. Each shipment contains multiple order items from the same seller.

IF an order contains items from three different sellers, THE system SHALL generate three separate shipments.

A seller SHALL be able to choose between:
- Shipping each item individually
- Bundling multiple items into one shipment

Each shipment can contain multiple order items, but all items within one shipment must belong to the same seller.

### Shipping Process

WHEN a seller receives an order with items in "paid" status, THE system SHALL display:
- List of seller's order items pending shipment
- Selection controls to bundle items into shipments
- Entry fields for tracking information (carrier name, tracking number)

WHEN a seller selects one or more items for shipment and enters tracking information, THE system SHALL:
- Create a shipment record with:
  - Shipment ID
  - Seller ID
  - Carrier name
  - Tracking number
  - Creation timestamp
  - List of associated order item IDs
- For each selected order item, update status from "paid" to "shipped"
- Create an order item snapshot for each item showing:
  - Previous status: "paid"
  - New status: "shipped"
  - Timestamp of change
  - Actor: seller
  - Reason: "Shipped via carrier [name] with tracking #[number]"
- Send notification to customer: "Your order is on its way! Tracking number: [number] - [carrier]"

IF an order item is already "shipped", THE system SHALL prevent it from being included in a new shipment

### Delivery Confirmation

WHEN a customer receives a shipment, THE system SHALL:
- Allow them to view tracking information for each shipment:
  - Tracking number
  - Carrier name
  - Estimated delivery date
  - Delivery history (scan events)

WHEN a customer confirms delivery of a shipment, THE system SHALL:
- Update all order items in that shipment from "shipped" to "delivered"
- Create an order item snapshot for each item showing:
  - Previous status: "shipped"
  - New status: "delivered"
  - Timestamp of confirmation
  - Actor: customer
  - Reason: "Customer confirmed delivery"

WHEN a customer does not confirm delivery within 14 days of shipping, THE system SHALL:
- Automatically change status of all items in the shipment from "shipped" to "delivered"
- Create an order item snapshot for each item showing:
  - Previous status: "shipped"
  - New status: "delivered"
  - Timestamp of automatic change
  - Actor: "system"
  - Reason: "Auto-delivery triggered after 14 days without customer confirmation"

WHEN an order item status changes to "delivered", THE system SHALL:
- Enable the customer to submit a review for the product
- Allow refund requests (within 7-day window)
- Record delivery timestamp

## Cancellation

### Cancellation Eligibility

A customer MAY request cancellation of an order item only if the item’s status is "paid" (not yet shipped).

A customer MAY NOT request cancellation if the item is:
- "shipped"
- "delivered"
- "cancelled"
- "refunded"

WHEN a customer attempts to request cancellation for an ineligible item, THE system SHALL:
- Display message: "Cancellation is not possible after shipment. Please request a refund if you have received the item."
- Prevent request submission
- Do not create a snapshot

### Cancellation Request

WHEN a customer requests cancellation for an eligible item, THE system SHALL:
- Allow entry of reason (text field, optional, up to 500 characters)
- Submit a cancellation request with:
  - Order item ID
  - Customer ID
  - Request reason
  - Status: "pending"
  - Timestamp
- Create a request state snapshot with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request reason
  - Status: "pending"
  - Timestamp of creation
  - Actor who created: customer ID
- Send notification to the seller: "Customer has requested cancellation of order item [ID]. Reason: [reason]."

### Cancellation Approval

WHEN a seller processes a cancellation request, THE system SHALL:
- Display the request reason
- Provide buttons: "Approve" and "Reject"
- Allow reason for rejection (required if rejecting)

WHEN a seller approves a cancellation request, THE system SHALL:
- Update the order item status from "paid" to "cancelled"
- Create a request state snapshot with:
  - Status: "approved"
  - Timestamp of response
  - Actor who responded: seller ID
  - Reason for approval: null
- Create an order item snapshot showing:
  - Previous status: "paid"
  - New status: "cancelled"
  - Timestamp of change
  - Actor: seller
  - Reason: "Cancellation approved by seller"
- Create a positive inventory record:
  - Variant ID
  - Change: +quantity
  - Reason: "Cancellation approved"
  - Timestamp
  - Actor: "system"
- Increase product stock
- Send notification to customer: "Your cancellation request for [product] has been approved. A refund will be processed within 5-7 business days."

WHEN a seller rejects a cancellation request, THE system SHALL:
- Update the request state snapshot with:
  - Status: "rejected"
  - Timestamp of response
  - Actor who responded: seller ID
  - Reason for rejection: provided text
- Create an order item snapshot showing:
  - Previous status: "paid"
  - New status: "paid" (unchanged)
  - Timestamp
  - Actor: seller
  - Reason: "Cancellation rejected by seller: [rejection reason]"
- Send notification to customer: "Your cancellation request has been denied. Reason: [reason]."

### Order-Level Impact

IF an order contains multiple items and all are cancelled, THE system SHALL change the overall order status to "cancelled".

IF an order contains mixed statuses after cancellation, THE system SHALL set order status to "partially completed".

## Refund

### Refund Eligibility

A customer MAY request a refund for an order item only if:
- Item status is "delivered"
- Delivery occurred within the last 7 days

A customer MAY NOT request a refund if:
- Item status is not "delivered"
- More than 7 days have passed since delivery
- Item was already cancelled or refunded

WHEN a customer requests a refund for an ineligible item, THE system SHALL:
- Display message: "Refunds can only be requested within 7 days of delivery. Your request is outside the refund window."
- Prevent request submission
- Do not create a snapshot

### Refund Request

WHEN a customer requests a refund for an eligible item, THE system SHALL:
- Allow entry of reason (text field, optional, up to 500 characters)
- Submit a refund request with:
  - Order item ID
  - Customer ID
  - Request reason
  - Status: "pending"
  - Timestamp
- Create a request state snapshot with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request reason
  - Status: "pending"
  - Timestamp of creation
  - Actor who created: customer ID
- Send notification to the seller: "Customer has requested refund of order item [ID]. Reason: [reason]."

### Refund Approval

WHEN a seller processes a refund request, THE system SHALL:
- Display the request reason
- Provide buttons: "Approve" and "Reject"
- Allow reason for rejection (required if rejecting)

WHEN a seller approves a refund request, THE system SHALL:
- Update the order item status from "delivered" to "refunded"
- Create a request state snapshot with:
  - Status: "approved"
  - Timestamp of response
  - Actor who responded: seller ID
  - Reason for approval: null
- Create an order item snapshot showing:
  - Previous status: "delivered"
  - New status: "refunded"
  - Timestamp of change
  - Actor: seller
  - Reason: "Refund approved by seller"
- Create a positive inventory record:
  - Variant ID
  - Change: +quantity
  - Reason: "Refund approved"
  - Timestamp
  - Actor: "system"
- Increase product stock
- Send notification to customer: "Your refund request for [product] has been approved. The amount will be credited to your original payment method within 5-7 business days."

WHEN a seller rejects a refund request, THE system SHALL:
- Update the request state snapshot with:
  - Status: "rejected"
  - Timestamp of response
  - Actor who responded: seller ID
  - Reason for rejection: provided text
- Create an order item snapshot showing:
  - Previous status: "delivered"
  - New status: "delivered" (unchanged)
  - Timestamp
  - Actor: seller
  - Reason: "Refund rejected by seller: [rejection reason]"
- Send notification to customer: "Your refund request has been denied. Reason: [reason]."

### Order-Level Impact

IF an order contains multiple items and all are refunded, THE system SHALL change the overall order status to "refunded".

IF an order contains mixed statuses after refund, THE system SHALL set order status to "partially completed".

## Reviews and Ratings

### Eligibility

A customer MAY write a review only for a product variant that:
- Was purchased by them
- Has status "delivered" (confirmed delivery)

A customer MAY NOT write a review for:
- Products not purchased
- Products with status "paid", "shipped", "cancelled", or "refunded"

WHEN a customer attempts to submit a review for an ineligible product, THE system SHALL:
- Deny submission
- Display message: "You can only write a review after your order has been delivered."
- Do not create a snapshot

### Review Creation

WHEN a customer writes a review, THE system SHALL:
- Require rating (1 to 5 stars)
- Allow optional text content (up to 2,000 characters)
- Validate rating is integer between 1 and 5
- Associate review with:
  - Product ID
  - Order item ID
  - Customer ID
  - Timestamp
- Store the initial review state

WHEN a review is submitted, THE system SHALL:
- Create a review snapshot with:
  - Review ID
  - Product ID
  - Order item ID
  - Customer ID
  - Rating (1-5)
  - Text content
  - Is deleted flag: false
  - Timestamp of creation
  - Actor who created: customer ID
- Update product's average rating:
  - Sum of all non-deleted ratings / total non-deleted reviews
- Display review on product detail page
- Send notification to the seller: "New review left on your product [product name]."

### Review Editing

WHEN a customer edits their own review, THE system SHALL:
- Allow modification of rating and/or text content
- Capture the new values
- Create a review snapshot with:
  - Review ID
  - Product ID
  - Order item ID
  - Customer ID
  - Old rating
  - New rating
  - Old text content
  - New text content
  - Is deleted flag: false
  - Timestamp of edit
  - Actor: customer ID
- Recalculate the product's average rating
- Preserve the previous version of the review
- Display only the latest version publicly

WHEN a review is edited, THE system SHALL:
- Maintain the original timestamp of creation in metadata
- Allow editing of rating from 1 to 5 stars
- Allow editing of text within 2,000 characters
- Allow unlimited edits over time

### Review Deletion

WHEN a customer deletes their own review, THE system SHALL:
- Mark the review as deleted in the live system
- Create a review snapshot with:
  - Review ID
  - Product ID
  - Order item ID
  - Customer ID
  - Rating
  - Text content
  - Is deleted flag: true
  - Timestamp of deletion
  - Actor: customer ID
- Recalculate the product’s average rating, excluding this review
- Display review as "Review deleted by customer" on product page
- Preserve full review content in snapshot for audit purposes

WHEN a review is deleted, the rating contribution is removed from the product's average, but the snapshot remains for historical accuracy and dispute resolution.

WHEN an administrator deletes a review, THE system SHALL:
- Mark review as deleted
- Create a review snapshot with:
  - Action: "deleted_by_admin"
  - Reason provided by admin
  - Timestamp
  - Actor: admin ID
- Recalculate product average
- Preserve full content

### Review Visibility

Reviews SHALL be displayed on the product detail page sorted by:
- Newest first (by creation timestamp)
- Verified purchase status (first priority)

Only reviews from customers who successfully purchased and received the product SHALL be shown.

Deleted reviews SHALL NOT appear on the product page but SHALL be visible to:
- The customer who wrote it
- The seller of the product
- Administrators

Product average rating SHALL be calculated from:
- All non-deleted reviews
- Reviews with ratings 1-5
- Only reviews where the customer's account is not deleted
- If a customer account is deleted, reviews must display as "Deleted User" but continue to contribute to the average

## Seller Account

### Seller Registration

WHEN a new seller registers, THE system SHALL collect:
- Email address (required, validated format)
- Password (required, minimum 12 characters, must contain uppercase, lowercase, digit, special character)
- Business name (required)
- Business registration document (optional upload)
- Contact phone number (optional)

WHEN the registration form is submitted, THE system SHALL:
- Validate all required fields
- Verify email format
- Check if email is already registered (customer or seller)
- Encrypt password using bcrypt
- Generate unique seller ID
- Send confirmation email to provided email address
- Set initial status to "pending_verification"

WHILE the account is "pending_verification", THE system SHALL:
- Block login attempts
- Block access to seller dashboard
- Hide shop from product listings
- Prevent product creation or editing

WHEN the email verification link is clicked, THE system SHALL:
- Set account status to "pending_approval"
- Send notification to all administrators of new pending application
- Log registration timestamp and IP address

WHEN a user attempts to register with an email already registered as a customer, THE system SHALL NOT create a duplicate account and SHALL return error message: "This email is already associated with an existing account. Please log in or contact support."

### Approval Workflow

WHEN a seller’s status is "pending_approval", THE system SHALL display to administrators:
"New seller application [Business Name]" in admin dashboard with "Review" button.

WHEN an administrator clicks "Review", THE system SHALL display:
- Business name
- Registered email
- Contact phone number
- Uploaded business documentation (if any)
- Registration date and time
- IP address at registration

WHEN an administrator approves a seller, THE system SHALL:
- Set seller status to "approved"
- Notify seller via email: "Your application has been approved. You may now list products."
- Log approval timestamp, administrator ID, and IP address
- Grant selling privileges to seller dashboard
- Make shop name visible in product listings
- Allow product creation and editing

WHEN an administrator rejects a seller, THE system SHALL:
- Set seller status to "rejected"
- Require administrator to enter a rejection reason (minimum 10 characters)
- Notify seller via email: "Your application has been denied. Reason: [reason]"
- Log rejection timestamp, administrator ID, IP address, and reason
- Block seller from login until new registration

WHEN a seller submits a new registration after rejection, THE system SHALL:
- Set status to "pending_approval" again
- Clear previous rejection reason
- Reset all previous application data
- Create new approval request
- Notify administrators of new application

WHEN an administrator attempts to approve a seller with incomplete documentation and no justification, THE system SHALL NOT allow approval and SHALL display error: "A rejection reason must be provided when denying an application."

### Status Tracking

THE system SHALL track the following statuses for each seller:
- "pending_verification" — email not yet confirmed
- "pending_approval" — waiting for admin review
- "approved" — authorized to sell
- "rejected" — application denied, no selling privileges
- "suspended" — temporarily disabled by administrator

WHEN a seller’s status is "approved", THE system SHALL:
- Allow login to seller dashboard
- Display products in category and search listings
- Allow product creation, editing, and deletion (if no pending orders)
- Allow inventory management
- Allow responses to cancellation/refund requests

WHEN a seller’s status is "suspended", THE system SHALL:
- Prevent login to seller dashboard
- Hide all products from search and category listings
- Prevent new product creation or edits
- Keep existing order items active (shipping, cancellations, refunds)
- Display "Shop Suspended" instead of shop name on product detail pages
- Retain all previous snapshots

WHEN a seller’s status is "rejected" or "suspended", THE system SHALL:
- Prevent access to seller dashboard
- Prevent any product editing
- Allow viewing of existing products, inventory, and order history (read-only)

WHEN a suspended seller is unsuspended, THE system SHALL:
- Set status to "approved"
- Notify seller via email: "Your account has been reinstated. Your products are now visible."
- Make products visible again in search and category listings
- Restore full selling privileges

WHEN an administrator changes a seller’s status, THE system SHALL create a snapshot of:
- Seller’s profile (shop name, description, logo)
- Current approval status
- Timestamp of change
- Administrator ID who made change
- Reason (if provided)

### Account Deletion Conditions

WHEN a seller requests account deletion, THE system SHALL check:
- Are there any pending order items where status is "paid" or "shipped"?
- Are there any pending cancellation requests?
- Are there any pending refund requests?

IF any of the above conditions are true, THEN THE system SHALL:
- Return error message: "Account deletion is not allowed. You have pending orders/refunds/cancellations. Please resolve all outstanding issues before deleting your account."
- Block deletion request

IF none of the above conditions are true, THEN THE system SHALL:
- Set account status to "deletion_requested"
- Send confirmation email to seller with 7-day wait period
- During the 7-day period, seller SHALL be able to cancel deletion request
- After 7 days without cancellation, THE system SHALL:
  - Delete seller profile (shop name, description, logo)
  - Delete all products and variants
  - Delete all inventory records
  - Archive seller account record (keep for legal compliance)
  - Preserve all order history and associated snapshots
  - Preserve all cancellation and refund requests and their snapshots
  - Preserve all review history (reviews become "deleted seller" with no shop name)

WHEN seller account is deleted, THE system SHALL:
- Change all product listings linked to that seller to: "Seller: [Deleted Seller]"
- Preserve order records with:
  - Seller ID
  - Product name
  - Variant options
  - Quantity
  - Price at time of purchase
  - Seller profile snapshot at time of order
- Preserve order item history and shipping records
- Retain buyer contact information for delivery and dispute purposes

WHEN a seller account is deleted, THE system SHALL notify all customers who purchased from that seller: "The seller \"[Shop Name]\" has closed their store. Your order history and delivery details are preserved. For concerns, contact customer support."

## Seller Profile

### Profile Management

WHEN a seller updates their shop name, description, or logo, THE system SHALL:
- Create a snapshot of the previous profile state: shop name, description, logo
- Store the snapshot with immutable audit trail
- Apply updated values to active profile
- Do not remove or delete prior snapshots

WHEN a seller edits shop name, THE system SHALL:
- Validate against existing shop names (no duplicates)
- Enforce limits: 5–120 characters, alphanumeric with spaces, no special characters except hyphens and underscores
- Allow Unicode characters (internationalized shop names)

WHEN a seller uploads a logo image, THE system SHALL:
- Accept: JPEG, PNG, WebP formats
- Enforce size: ≤5MB
- Enforce aspect ratio: 1:1 recommended, 4:3 maximum
- Auto-resize to 512x512px for standardization
- Generate thumbnail (128x128px)
- Store original and optimized versions
- Add watermark: "[Shop Name] Official Logo" in bottom-right corner (opacity 20%)

WHEN a seller removes their logo, THE system SHALL:
- Set logo field to null
- Keep previous logo snapshot intact
- Default to placeholder image: "[Shop Name] Logo"

WHEN a customer views a seller profile, THE system SHALL display:
- Current shop name
- Current shop description
- Current logo
- Average product rating (from all non-deleted reviews)
- Total number of products
- Total number of completed orders
- Date of first product listing
- Last update timestamp (for profile)

WHEN a seller edits their profile, customers SHALL see the updated information immediately in search and product listings.

### Profile Snapshots

EVERY profile change SHALL create a seller profile snapshot containing:
- Seller ID
- Shop name at the time of change
- Shop description at the time of change
- Logo image URL at the time of change
- Timestamp of change
- Actor who made the change

SNAPSHOTS SHALL be:
- Immutable (no delete, update, or modify operations allowed)
- Accessible to seller (own history only)
- Accessible to administrators (all histories)
- Accessible to super administrators (all histories)
- Archived for legal compliance (minimum 7 years)
- Not visible to customers

THE system SHALL NOT permit:
- Deletion of any snapshot
- Alteration of any snapshot data
- External access to snapshots outside platform
- Direct database access to snapshot tables

WHEN a seller’s profile is edited, THE system SHALL:
- Prevent the update if the shop name duplicates an existing one
- Enforce a 24-hour cooldown before next profile edit
- Log every edit in audit trail
- Ensure every edit creates a new snapshot, even if only one field changes

WHEN a seller’s approval status changes, THE system SHALL:
- Create exactly one snapshot per status change
- Include all profile fields as they existed at time of change
- Link snapshot to the status transition event
- Ensure snapshot is accessible in audit report in admin panel

WHEN a seller is suspended, THE system SHALL:
- Create snapshot of profile as it exists at suspension time
- Record suspension reason and administrator
- Preserve access to all previous snapshots
- Allow unsuspension to revert visibility, but preserve suspension history

WHEN a seller account is deleted, THE system SHALL:
- Create final snapshot of profile state
- Archive all snapshots under account deletion audit trail
- Retain all snapshots for at least the period required by local financial regulations
- Ensure snapshots remain accessible to legal and compliance authorities

## Products

### Product Creation

WHEN a seller creates a product, THE system SHALL require:
- Name (required, 1-200 characters)
- Description (required, 1-10,000 characters)
- Category (required, must be a valid category or subcategory)
- Base price (required, must be >= 0.01 USD)

WHEN a product is created, THE system SHALL:
- Generate a unique product ID
- Assign seller ID
- Set status to "active"
- Create a product snapshot with:
  - Product ID
  - Seller ID
  - Name
  - Description
  - Category ID
  - Base price
  - Array of image URLs in display order
  - Timestamp of creation
  - Actor: seller ID
- Record creation timestamp and IP address

A product MUST have at least one variant to be purchasable.

### Product Editing

WHEN a seller edits a product, THE system SHALL:
- Allow editing of:
  - Name
  - Description
  - Category
  - Base price
  - Image order or removal
- Validate all field constraints
- Create a product snapshot capturing:
  - All fields as they existed before change
  - All variants and their states at time of change
  - Timestamp of change
  - Actor: seller ID
- Apply changes to live product
- Ensure every edit creates a new snapshot

WHEN a product image is reordered, THE system SHALL:
- Capture the entire image sequence before change
- Create product snapshot with old order
- Apply new order
- Create product snapshot with new order

WHEN a product image is deleted, THE system SHALL:
- Capture the image list before deletion
- Create product snapshot with old image list
- Remove image from product
- Create product snapshot with new image list

WHEN a seller edits a product and the category is moved from one to another, THE system SHALL:
- Capture the old category ID
- Capture the new category ID
- Create product snapshot with both

### Product Deletion

WHEN a seller requests product deletion, THE system SHALL check:
- Are there any pending order items with status "paid" or "shipped" for any variant?
- Are there any pending cancellation requests for any variant?
- Are there any pending refund requests for any variant?

IF any condition is true, THEN THE system SHALL:
- Return error: "Cannot delete product: pending orders/cancellations/refunds exist. Please resolve these first."
- Block deletion

IF no conditions are true, THEN THE system SHALL:
- Set product status to "deletion_requested"
- Send confirmation to seller
- After 7-day grace period, THE system SHALL:
  - Delete product from active listings
  - Delete all associated variants
  - Delete all inventory records for variants
  - Archive product record (keep for audit)
  - Purge product from search and category listings
  - Preserve all snapshots of product and variants
  - Preserve all order items referencing the product
  - Preserve all reviews for the product

WHEN a product is deleted, THE system SHALL:
- Show product as deleted in search
- Show product as unavailable in category
- Retain product snapshot history
- Retain variant snapshots
- Retain order items with historical data

### Product Visibility

A product is visible to customers if:
- Product status: "active"
- Product has at least one variant
- Product's seller status: "approved" and "not suspended"

A product is hidden if:
- Product is deleted
- Product has no variants
- Seller is suspended
- Product status is "inactive"

WHEN a product is hidden, THE system SHALL:
- Remove from search results
- Remove from category listings
- Show "Unavailable" on direct links
- Preserve all snapshot data
- Allow seller to change status if seller is active

A product with no variants SHALL be displayed with status "Unavailable" in search and category listings.

### Product Images

WHEN a seller uploads multiple images for a product, THE system SHALL:
- Accept JPEG, PNG, WebP formats
- Max 10 images per product
- Max size: 5MB per image
- Auto-optimize to 1200x1200px for consistency
- First image becomes default thumbnail

WHEN images are reordered, THE system SHALL:
- Capture full sequence before change
- Create product snapshot with old order
- Apply new order
- Create product snapshot with new order

WHEN an image is deleted, THE system SHALL:
- Capture image list before deletion
- Create product snapshot
- Remove image
- Create product snapshot with updated list

WHEN a seller uploads an image URL from external source, THE system SHALL:
- Store the exact external URL
- Do not download or proxy
- Accept risk of broken links
- Preserve URL exactly in snapshots

## Product Variants (SKU)

### Variant Creation

A variant represents a specific combination of product options (color: red, size: large).

WHEN a seller creates a variant, THE system SHALL require:
- SKU code (required, unique within product, maximum 100 characters)
- Option values (required, at least one, as key-value pairs: e.g., [{"color":"red"}, {"size":"large"}])
- Stock quantity (required, integer >= 0)
- Price (optional; if omitted, uses product base price)

WHEN a variant is created, THE system SHALL:
- Validate SKU code unique within product
- Validate option values structure
- Validate stock >= 0
- Validate price if provided >= 0
- Record variant ID
- Associate with product ID
- Create a product-snapshot-SKU record with:
  - SKU code
  - Product ID
  - Option values
  - Price override
  - Stock quantity
  - Timestamp
  - Actor: seller ID
- Add to live variant list

A product MUST have at least one variant to be listed as available.

### Variant Editing

WHEN a seller edits a variant, THE system SHALL allow:
- SKU code (if no order items exist)
- Option values (if no order items exist)
- Price
- Stock quantity

WHEN a variant is edited, THE system SHALL:
- Create product-snapshot-SKU with:
  - Old values for SKU, options, price, stock
  - New values
  - Timestamp
  - Actor: seller ID
- Apply changes to live variant
- Ensure each edit creates a new snapshot

WHEN SKU code or option values are modified after having order items, THE system SHALL:
- Prevent edit
- Return error: "Cannot modify SKU or option values after purchase. Create new variant instead."

### Variant Deletion

WHEN a seller requests deletion of a variant, THE system SHALL check:
- Are there any pending order items with status "paid" or "shipped" for this variant?
- Are there any pending cancellation requests for this variant?
- Are there any pending refund requests for this variant?

IF any condition is true, THEN THE system SHALL:
- Return error: "Cannot delete variant: pending orders/cancellations/refunds exist."
- Block deletion

IF no conditions are true, THEN THE system SHALL:
- Delete the variant from active list
- Create a product-snapshot-SKU with:
  - Deleted status flag
  - Final state before deletion
  - Timestamp
  - Actor: seller ID
- Preserve the snapshot indefinitely
- Keep associated inventory records

A product can have zero variants after deletion, in which case it becomes unavailable.

### Inventory Management

Inventory is managed through records, not snapshots.

WHEN a seller adds inventory (restock), THE system SHALL:
- Enter quantity as positive integer
- Enter reason (required, 1-200 characters)
- Create inventory history record:
  - Variant ID
  - Change: +quantity
  - Reason
  - Timestamp
  - Actor: seller ID
- Update current stock = sum of all history records

WHEN a seller adjusts inventory (loss, damage, etc.), THE system SHALL:
- Enter quantity as negative integer
- Enter reason (required)
- Create inventory history record:
  - Variant ID
  - Change: -quantity
  - Reason
  - Timestamp
  - Actor: seller ID
- Update current stock = sum of all history records

WHEN an order is placed, THE system SHALL automatically create:
- Inventory history record:
  - Change: -quantity
  - Reason: "order fulfillment"
  - Timestamp: order creation
  - Actor: "system"

WHEN a cancellation or refund is approved, THE system SHALL automatically create:
- Inventory history record:
  - Change: +quantity
  - Reason: "cancellation approved" or "refund approved"
  - Timestamp: approval time
  - Actor: "system"

WHEN stock quantity reaches zero, THE system SHALL display variant as "out of stock".

A variant with zero or negative stock SHALL NOT be added to cart.

WHEN stock is negative, THE system SHALL:
- Allow inventory adjustment to bring to positive
- Not prevent sales
- Preserve negative value in history for audit
- Show status as "out of stock" if <= 0

Sellers can view full inventory history per variant:
- List of all records with change, reason, timestamp, actor
- Current calculated stock
- Graph of stock trends

## Product Search

### Search Functionality

Customers SHALL be able to search products by:
- Product name (free text search)
- Filtering options:
  - Category (any level)
  - Price range (minimum and maximum)
  - In-stock only (filter out variants with stock <= 0)
- Sorting options:
  - Newest first
  - Price: low to high
  - Price: high to low

WHEN searching by name, THE system SHALL:
- Use case-insensitive partial matching
- Support Unicode characters
- Return products even if seller is suspended
- Include products with "unavailable" status

WHEN filtering by category, THE system SHALL:
- Include products in selected category and all subcategories
- Use current category assignment for filtering (not snapshot)
- Return only active products with available variants

WHEN filtering by price range, THE system SHALL:
- Use live product base price or lowest variant price for filtering
- Do not use historical snapshot prices
- Return products meeting current price criteria

WHEN filtering by "In-stock only", THE system SHALL:
- Only return products where at least one variant has stock > 0
- Do not use historical snapshot stock for filtering

WHEN sorting by "Newest first", THE system SHALL:
- Sort by product creation timestamp (newest first)

WHEN sorting by "Price (low to high)", THE system SHALL:
- Sort by minimum variant price (if variants exist) or base price

WHEN sorting by "Price (high to low)", THE system SHALL:
- Sort by maximum variant price (if variants exist) or base price

Search results SHALL:
- Display thumbnail (main image of product)
- Product name
- Base price or price range (e.g., "$10 - $20")
- Seller shop name
- Average rating (based on non-deleted reviews)
- Availability status ("In Stock" or "Out of Stock")
- Pagination (20 items per page)

## Product Listing

### Product List Display

WHEN displaying a list of products (search results, category page), THE system SHALL display for each product:
- Main image (thumbnail of first image in product's image sequence)
- Product name
- Price:
  - If no variants: base price
  - If variants: price range (min and max variant price)
- Seller shop name (linked to seller profile)
- Average rating (calculated from non-deleted reviews)
- Total review count
- Availability status: "In Stock" or "Out of Stock" (if any variant > 0)

All displayed data SHALL use current live values, not product snapshots.

Product snapshots SHALL NOT be used for search or filtering.

## Product Detail Page

### Detailed Product Display

WHEN a customer views a single product’s full details, THE system SHALL display:
- All product images in display order (first image as main)
- Product name and description
- Product category (link to category page)
- Seller shop name (clickable link to seller profile)
- Product base price
- All available variants with:
  - Option values (e.g., "Color: Red, Size: Large")
  - Price (variant price if override exists, else base price)
  - Stock quantity
  - Status ("In Stock" or "Out of Stock")
  - "Add to Cart" button (if In Stock)
- Average product rating (from non-deleted reviews)
- Total number of reviews
- All reviews (in reverse chronological order)
- Product history link: "View price and feature changes over time"

WHEN a category has subcategories, THE system SHALL use: "Parent Category > Subcategory" format.

WHEN a variant has price override EQUAL to base price, THE system SHALL still display the price, not omit it.

WHEN a product has no variants, THE system SHALL display:
- "This product is currently unavailable."
- "Select a variant to see price and stock information."
- "Add to Cart" button disabled

## Administrator System

### Administrator Roles

There are two grades of administrators:
- Regular Administrator
- Super Administrator

#### Admin Privileges

Regular administrators can:
- Approve/reject seller applications (with reason for rejection)
- Suspend/unsuspend seller accounts (with reason)
- View all seller profiles and history
- View all product snapshots
- View all customer accounts
- View all order history
- Ban/unban customers
- Ban/unban sellers
- Create/edit/delete categories
- Force-cancel order items (with reason)
- Force-refund order items (with reason)

Super administrators have ALL regular admin privileges PLUS:
- Promote/demote admin roles between regular and super
- Delete any account
- Access all admin audit logs
- View all system snapshots
- Modify global system settings
- Approve administrator requests

#### Administrator Promotion

WHEN a user (customer or seller) submits a request to become an administrator, THE system SHALL:
- Accept request with text reason (optional)
- Store status: "pending"
- Create an admin request snapshot:
  - user_id
  - request_reason
  - status: "pending"
  - timestamp
  - actor: user_id
- Notify super administrators of new request

WHEN a super administrator reviews the request, THE system SHALL:
- Display request details
- Allow approve/reject with optional reason
- If approved:
  - Create admin request snapshot:
    - status: "approved"
    - reason: [optional]
    - actor: super_admin_id
    - timestamp
  - Update user role to "admin"
  - Notify user: "You have been granted administrator privileges."
- If rejected:
  - Create admin request snapshot:
    - status: "rejected"
    - reason: [provided]
    - actor: super_admin_id
    - timestamp
  - Notify user: "Your administrator request has been rejected. Reason: [reason]"

WHEN a super administrator promotes a regular admin to super admin, THE system SHALL:
- Create user role snapshot:
  - old_role: "admin"
  - new_role: "super_admin"
  - actor: super_admin_id
  - timestamp
  - reason: "Promoted by super admin"
- Update user role
- Notify user

WHEN a super administrator demotes a super admin to regular admin, THE system SHALL:
- Create user role snapshot:
  - old_role: "super_admin"
  - new_role: "admin"
  - actor: super_admin_id
  - timestamp
  - reason: "Demoted by super admin"
- Update user role
- Notify user

WHEN a super administrator demotes themselves, THE system SHALL:
- Prevent action
- Return error: "Super administrators cannot demote themselves."

### Seller Management

Administrators can:
- View list of pending seller approvals
- Approve or reject seller applications with reason
- Suspend seller accounts (with reason)
- Unsuspend seller accounts
- View all seller profiles
- View all seller product history

WHEN an administrator suspends a seller account, THE system SHALL:
- Set seller status to "suspended"
- Create a seller status snapshot:
  - actor: admin_id
  - action: "suspended"
  - reason: [provided]
  - timestamp
- Hide all seller's products from search and category listings
- Prevent seller from creating, editing, or deleting products
- Allow seller to process existing orders (ship items, respond to cancellations/refunds)
- Preserve all historical data
- Display "Shop Suspended" on product detail pages

WHEN an administrator unsuspends a seller account, THE system SHALL:
- Set seller status to "approved"
- Create a seller status snapshot:
  - actor: admin_id
  - action: "unsuspended"
  - reason: [provided]
  - timestamp
- Make seller's products visible again
- Restore full selling privileges

WHEN a seller is suspended, THE system SHALL:
- Retain order items referencing seller
- Retain order item snapshots
- Retain product snapshots with seller's name at time of sale
- Allow customers to view past orders

### Category Management

Administrators can:
- Create new categories
- Create subcategories (one level of nesting only)
- Edit category name and description
- Delete categories

WHEN an administrator creates a category, THE system SHALL:
- Require name (1-100 characters)
- Require description (optional, 1-500 characters)
- Require parent category ID (null for top-level)
- Create a category snapshot:
  - name
  - description
  - parent_id
  - timestamp
  - actor: admin_id

WHEN an administrator edits a category name or description, THE system SHALL:
- Create a category snapshot with:
  - old name/description
  - new name/description
  - timestamp
  - actor: admin_id

WHEN an administrator deletes a category, THE system SHALL:
- Move all products in that category to "Uncategorized"
- Create a category snapshot:
  - action: "deleted"
  - name
  - description
  - timestamp
  - actor: admin_id
- Prevent deletion if category is referenced as a parent

### Product Oversight

Administrators can:
- View all products on the platform
- View snapshots of any product
- Delete any product (for policy violations)

WHEN an administrator deletes a product, THE system SHALL:
- Create a product snapshot with:
  - action: "deleted_by_admin"
  - reason: [provided]
  - timestamp
  - actor: admin_id
- Hide product from search and category listings
- Preserve all product and variant snapshots
- Preserve all order items and inventory records
- Do not delete snapshots

WHEN a product is deleted by admin, it will NOT be automatically available for re-listing.

### Order Oversight

Administrators can:
- View all orders on the platform
- Force-cancel individual items or entire orders (with reason)
- Force-refund individual items or entire orders (with reason)

WHEN an administrator forces the cancellation of an order item, THE system SHALL:
- Create an order item snapshot:
  - previous_status: "paid" or "shipped"
  - new_status: "cancelled"
  - actor: admin_id
  - reason: [provided]
  - timestamp
- Create a positive inventory record:
  - variant_id
  - change: +quantity
  - reason: "Admin forced cancellation"
  - timestamp
  - actor: admin_id
- Update order item status
- Notify customer and seller
- Update order status if all items cancelled

WHEN an administrator forces a refund for an order item, THE system SHALL:
- Create an order item snapshot:
  - previous_status: "delivered"
  - new_status: "refunded"
  - actor: admin_id
  - reason: [provided]
  - timestamp
- Create a positive inventory record:
  - variant_id
  - change: +quantity
  - reason: "Admin forced refund"
  - timestamp
  - actor: admin_id
- Update order item status
- Notify customer and seller
- Update order status if all items refunded

Administrators SHALL NOT be allowed to delete orders.

### User Management

Administrators can:
- View all customer accounts
- Ban/unban customers
- View all seller accounts
- Ban/unban sellers

WHEN an administrator bans a customer account, THE system SHALL:
- Create a user snapshot:
  - action: "banned"
  - reason: [provided]
  - timestamp
  - actor: admin_id
- Prevent customer from logging in
- Preserve all past order items and snapshots
- Preserve all reviews and wishlist history

WHEN an administrator unban a customer account, THE system SHALL:
- Create a user snapshot:
  - action: "unbanned"
  - timestamp
  - actor: admin_id
- Allow customer to log in
- Restore full access

WHEN an administrator bans a seller account, THE system SHALL:
- Create a user snapshot:
  - action: "banned"
  - reason: [provided]
  - timestamp
  - actor: admin_id
- Prevent seller from logging in
- Preserve all order history and snapshots
- Do not affect ongoing order processing (can still ship, respond to requests)

WHEN an administrator unban a seller account, THE system SHALL:
- Create a user snapshot:
  - action: "unbanned"
  - timestamp
  - actor: admin_id
- Allow seller to log in
- Restore full selling privileges

## Snapshot Principle

### Snapshot Definition

A snapshot is an immutable, point-in-time capture of the complete state of editable business data at the moment of modification. Snapshots are not backups or archives—they are legally significant business records that preserve the state of data at the exact moment it was changed. Snapshots cannot be modified, deleted, or altered after creation. Each snapshot includes metadata: timestamp, actor who made the change, and the exact state of all data fields before and after the modification.

THE system SHALL create a snapshot whenever any editable business entity is modified, edited, updated, or otherwise changed.

THE system SHALL prevent deletion of any snapshot after creation.

WHEN a snapshot is created, THE system SHALL ensure it contains a complete and consistent record of the entity's state at that moment, including all related nested entities.

### Trigger Conditions

WHEN a seller creates, updates, or deletes a product, THE system SHALL create a product snapshot.

WHEN a seller creates, updates, or deletes a product variant (SKU), THE system SHALL create a product-snapshot-SKU record.

WHEN a seller updates their shop name, description, or logo, THE system SHALL create a seller profile snapshot.

WHEN a customer adds, modifies, or deletes an address, THE system SHALL create an address snapshot.

WHEN a customer creates, modifies, or deletes a review, THE system SHALL create a review snapshot.

WHEN a customer submits a cancellation request or a refund request, THE system SHALL create a request state snapshot at the time of submission and at the time of seller response (approval/rejection).

WHEN a product is purchased in an order, THE system SHALL create a product snapshot and a product-snapshot-SKU snapshot for each variant in the order item.

WHEN a seller's profile is included in an order item, THE system SHALL create a seller profile snapshot at the time of order placement.

WHEN an order item's status changes from 'paid' to 'shipped', 'shipped' to 'delivered', 'paid' to 'cancelled', or 'delivered' to 'refunded', THE system SHALL create an order item snapshot containing the previous status, timestamp, and actor responsible.

### Data Captured per Entity

#### Product Snapshot

WHEN a product is edited, THE system SHALL capture the following fields in the product snapshot:
- Product ID
- Seller ID
- Name
- Description
- Category ID
- Base price
- Is active (boolean)
- Array of image URLs in display order
- Timestamp of change
- Actor who made the change

THE system SHALL capture the product's complete state at the moment of change, including:
- Exact product name, description, and category selection
- Precise base price at time of change
- Complete image sequence (all images with exact ordering)
- All associated variant states at the time of change

WHEN a product snapshot is created, THE system SHALL also create a snapshot of every variant (SKU) associated with that product at the moment of change, forming a product-snapshot → product-snapshot-SKU relationship.

Each product-snapshot-SKU shall include:
- SKU code
- Product ID
- Option values (e.g., color: "Red", size: "Large")
- Price override (if any)
- Stock quantity at time of snapshot
- Timestamp of change
- Actor who made the change

#### Seller Profile Snapshot

WHEN a seller's shop name, description, or logo is modified, THE system SHALL capture:
- Seller ID
- Shop name at the time of change
- Shop description at the time of change
- Logo image URL at the time of change
- Timestamp of change
- Actor who made the change

WHEN the seller profile is referenced in an order item, THE system SHALL capture all these fields from the snapshot taken at the time of purchase.

#### Address Snapshot

WHEN a customer updates or deletes an address, THE system SHALL capture:
- Address ID
- Customer ID
- Recipient name
- Phone number
- Street address
- City
- State/province
- Postal code
- Country
- Is default flag at time of change
- Timestamp of change
- Actor who made the change

#### Review Snapshot

WHEN a customer creates, edits, or deletes a review, THE system SHALL capture:
- Review ID
- Product ID
- Order item ID
- Customer ID
- Rating (1-5)
- Text content
- Is deleted flag
- Timestamp of change
- Actor who made the change

WHEN a review is edited, THE snapshot shall contain the previous text content and rating before the update.

WHEN a review is deleted, THE snapshot shall preserve the review content and mark the is_deleted flag as true.

#### Request State Snapshots (Cancellation and Refund)

WHEN a customer submits a cancellation request, THE system SHALL create a request snapshot with:
- Request ID
- Order item ID
- Customer ID
- Request reason
- Request status: "pending"
- Timestamp of creation
- Actor who created (customer)

WHEN a seller approves or rejects a cancellation request, THE system SHALL create another snapshot with:
- Request ID
- Order item ID
- Customer ID
- Request reason (unchanged)
- Request status: "approved" OR "rejected"
- Approval/rejection reason (admin-provided)
- Timestamp of response
- Actor who responded (seller)

WHEN a customer submits a refund request, THE system SHALL create a request snapshot with:
- Request ID
- Order item ID
- Customer ID
- Request reason
- Request status: "pending"
- Timestamp of creation
- Actor who created (customer)

WHEN a seller approves or rejects a refund request, THE system SHALL create another snapshot with:
- Request ID
- Order item ID
- Customer ID
- Request reason (unchanged)
- Request status: "approved" OR "rejected"
- Approval/rejection reason (admin-provided)
- Timestamp of response
- Actor who responded (seller)

#### Order Item Snapshots

WHEN an order item is created, THE system SHALL store snapshots of:
- Product details (name, description, category, base price)
- Product variant details (SKU, option values, price)
- Seller profile details (shop name, logo)
- Price at cart time (including any variant price override)
- Quantity purchased
- Timestamp of order creation

WHEN an order item's status changes (paid → shipped → delivered → cancelled → refunded), THE system SHALL create a snapshot containing:
- Item ID
- Previous status
- New status
- Timestamp of change
- Actor who changed status
- Reason for change (if any)

WHEN an administrator forces a cancellation or refund, THE system SHALL capture:
- Item ID
- Action: "forced_cancel" or "forced_refund"
- Reason provided by admin
- Timestamp
- Actor: admin (with admin ID)

### Snapshot Immutability

WHEN a snapshot is created, THE system SHALL ensure it cannot be modified, edited, or deleted by any user, including administrators.

WHILE any snapshot exists, THE system SHALL prevent any update, delete, or overwrite operation on the snapshot record.

IF any process attempts to modify a snapshot, THE system SHALL log the attempt and reject it with error code SNAPSHOT_IMMUTABLE.

WHERE a new version of data is created (e.g., product edited), THE system SHALL create a new snapshot without altering any existing snapshots.

Sellers, customers, and administrators SHALL NOT have the ability to delete, modify, or edit any snapshot.

### Access Control

WHEN a customer requests to view their own product snapshot history, THE system SHALL allow them to view snapshots of products they purchased.

WHEN a customer requests to view a review snapshot they created, THE system SHALL allow them to view that snapshot.

WHEN a customer requests to view a cancellation or refund request snapshot related to an order they made, THE system SHALL allow them to view that snapshot.

WHEN a seller requests to view snapshots of their own products, THE system SHALL allow them to view all snapshots of products they created.

WHEN a seller requests to view snapshots of their own seller profile changes, THE system SHALL allow them to view all versions of their profile snapshots.

WHEN a seller requests to view snapshots of cancellation or refund requests related to their order items, THE system SHALL allow them to view those snapshots.

WHEN an administrator requests to view any product snapshot, THE system SHALL grant access.

WHEN an administrator requests to view any seller profile snapshot, THE system SHALL grant access.

WHEN an administrator requests to view any review snapshot, THE system SHALL grant access.

WHEN an administrator requests to view any cancellation or refund request snapshot, THE system SHALL grant access.

WHERE a snapshot is referenced in an order item, THE system SHALL make the snapshot read-only and accessible to:
- Customer who placed the order
- Seller who owns the product
- Administrators

THE system SHALL prevent unauthorized access to snapshots by non-relevant parties.

### Implementation Note

All snapshots SHALL be stored in an indexed, append-only database with cryptographic integrity verification. No direct database writes shall be permitted on snapshot tables. All modifications must occur through the snapshot API. Snapshots may be compressed for storage efficiency.

### Use Cases

The snapshot principle ensures:
- Accurate dispute resolution
- Legal compliance for financial records
- Auditability of all business decisions
- Transparency in pricing and product description changes
- Protection against fraudulent modifications
- Historical accuracy for customer and seller reference

The system is designed such that an order placed last year can be reconstructed fully from snapshots, even if the product name, price, seller name, or variant options have changed since.

## System Constraints

### No Guest Browsing

THE system SHALL prevent any anonymous access to all features. Registration and authentication are required to browse, search, add to cart, or place orders.

### Data Preservation

ALL business-critical data related to financial transactions (orders, invoices, refunds, cancellations) SHALL be preserved indefinitely. This includes but is not limited to:
- Order records and order items
- Product and variant snapshots
- Seller profile snapshots
- Review snapshots
- Address history snapshots
- Inventory history records

Only personally identifiable information linked to customers (email, password, display name, phone, addresses) may be deleted upon explicit customer request.

### Technical Implementation

All generated code SHALL be:
- TypeScript with NestJS framework
- Prisma ORM for database
- PostgreSQL for persistent storage
- JWT for authentication
- Redis for caching and rate limiting
- AWS S3 for image storage
- External payment gateway integration (Stripe, PayPal)
- Fully typed, zero runtime errors
- Fully documented with OpenAPI schema

All data transformations SHALL happen at the application layer. No database triggers or stored procedures.

### Performance Requirements

THE system SHALL:
- Serve product search results within 500ms under 1000 requests per second
- Return customer profile data within 200ms under normal load
- Handle 5,000 concurrent checkout requests
- Process 1,000 inventory adjustments per second
- Return order history within 750ms for 100+ items
- Support 10,000+ active users concurrently

All APIs SHALL return with HTTP status code 200 on success and appropriate error codes for validation failures (400, 401, 403).

### Compliance

THE system SHALL comply with:
- GDPR: Right to erasure, data portability, transparency
- CCPA: Right to know, right to delete, right to opt-out
- PCI-DSS: Payment card industry data security standard
- SOX: Sarbanes-Oxley Act for financial audit trails

Data SHALL be stored in AWS us-east-1 region with encryption at rest and in transit.

## Conclusion

This comprehensive requirements specification provides exhaustive detail for developing a production-ready E-Commerce Shopping Mall Platform. By implementing the snapshot principle rigorously, the platform ensures absolute financial integrity, dispute-resolution capability, and compliance with global regulatory frameworks. The system is designed for enterprise-grade reliability with zero tolerance for data inconsistency.

All actors—customers, sellers, and administrators—have clearly defined permissions and workflows that operate within a fully auditable, immutable data model. The architecture is intentionally state-preserving, prioritizing truth over convenience, ensuring that every financial interaction is permanently and accurately recorded.

This specification is a complete contract between business requirements and technical implementation. No database schema or API specification details are included—they will be generated in subsequent pipeline phases. This document serves as the authoritative source of truth for all downstream development.