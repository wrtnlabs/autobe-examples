# E-Commerce Shopping Mall Platform Requirements Specification

## Customer Account

WHEN a user attempts to access any feature of the shoppingMall platform, THE system SHALL require registration.

WHEN a user initiates registration, THE system SHALL collect and store the following mandatory information:
- Email address (unique, validated format)
- Password (minimum 8 characters, stored securely with bcrypt hashing)
- Registration timestamp (ISO 8601 format)
- Account activation status (default: active)

IF the provided email address already exists in the system, THEN THE system SHALL reject the registration request with a specific error message indicating the email is already registered.

WHEN registration is successful, THE system SHALL create a customer account record with a unique internal customer ID and send a welcome confirmation email.

WHEN a customer attempts to log in, THE system SHALL validate the following:
- Email address exists in the system
- Provided password matches the stored hash
- Account is not suspended or banned

IF authentication fails due to invalid credentials, THEN THE system SHALL return a generic "Invalid email or password" error message and increment a failed login counter.

IF an account exceeds 5 consecutive failed login attempts within 15 minutes, THEN THE system SHALL temporarily lock the account for 30 minutes and notify the customer via email.

WHEN authentication succeeds, THE system SHALL issue a JSON Web Token (JWT) with the following payload structure:
- customerId: unique identifier (string)
- role: "customer"
- iat: issued at timestamp (number)
- exp: expiration timestamp (number)
- email: the customer's email address

THE system SHALL enforce access token expiration of 15 minutes and refresh token expiration of 7 days for persistent sessions.

WHEN a customer requests to change their password, THE system SHALL:
- Validate the current password using the existing hash
- Require the new password to be at least 8 characters long
- Ensure the new password differs from the old password
- Re-hash the new password with bcrypt before storage
- Record the password change timestamp
- Immediately invalidate all existing JWT sessions

WHEN a customer forgets their password, THE system SHALL:
- Accept a password reset request with the customer's email address
- Generate a unique, cryptographically secure reset token with 1-hour expiration
- Send an email containing a password reset link with the token
- Allow password reset only through the verified link
- Delete the reset token after successful password change
- Invalidate all existing sessions after password change

WHEN a customer requests account deletion, THE system SHALL:
- Verify the account belongs to the authenticated user
- Require explicit confirmation from the customer
- Begin an irreversible deletion process with a 7-day grace period

DURING the grace period, THE system SHALL:
- Display a warning banner on the customer's dashboard
- Prevent any actions that modify account data
- Allow the customer to cancel the deletion request

AFTER the 7-day grace period expires, THE system SHALL permanently delete the following:
- Customer profile data (display name, phone number)
- Customer authentication credentials (email, password hash)
- Wishlist entries
- Cart contents
- Review submission privileges

The following data SHALL be preserved permanently even after account deletion:
- Order history and order items
- Order snapshots (product, variant, seller profile)
- Customer's reviews (but displayed as "Deleted User")
- Customer's address history (for legal and fulfillment records)

IF a customer attempts to re-register with a previously deleted email address, THEN THE system SHALL treat it as a completely new account and allow registration.

## Customer Profile

THE customer profile SHALL contain the following editable fields:
- Display name (up to 100 characters, alphanumeric plus spaces, special characters allowed)
- Phone number (international format: +[country code][number], max 15 digits)

WHEN a customer updates their display name or phone number, THE system SHALL:
- Validate the new values according to length and format constraints
- Store the updated values in the customer profile
- Record the change timestamp
- Do not generate snapshots for profile changes (non-critical business data)
- Update display name in all relevant context (cart, wishlist, reviews)

IF a customer provides an invalid phone number format, THEN THE system SHALL reject the update with a specific error message indicating the correct format.

## Address Management

THE system SHALL allow each customer to maintain multiple shipping addresses with the following fields:
- Recipient name (required, 1-100 characters)
- Phone number (required, international format)
- Street address (required, 1-255 characters)
- City (required, 1-100 characters)
- State/Province (required, 1-100 characters)
- Postal code (required, format varies by country)
- Country (required, ISO 3166-1 Alpha-2 code)
- Default indicator (boolean, exactly one address per customer can be default)

WHEN a customer adds a new address, THE system SHALL:
- Validate all required fields are provided
- Ensure all field lengths are within limits
- Store the address with a unique identifier and creation timestamp
- Do not automatically set it as default

WHEN a customer updates an existing address, THE system SHALL:
- Validate the new values
- Record the change timestamp
- Preserve the original address in its state at time of modification

WHEN a customer deletes an address, THE system SHALL:
- Verify the address belongs to the authenticated customer
- Permit deletion only if the address is not the default address
- IF the deleted address was the default, THEN THE system SHALL automatically set the most recently added address as default

WHEN a customer sets an address as default, THE system SHALL:
- Unset the previously designated default address for that customer
- Mark the selected address as default
- Record the change timestamp

IF a customer attempts to set an address as default that does not belong to them, THEN THE system SHALL reject the request with an access denial error.

WHEN a customer checks out, THE system SHALL:
- Default to the customer's designated default shipping address
- Allow selection of any other valid address from their address book
- Lock the selected shipping address at the time of order placement (no changes permitted after order submission)

## Seller Account

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

WHEN a seller’s status is "pending_approval", THE system SHALL display to administrators: "New seller application [Business Name]" in admin dashboard with "Review" button.

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

WHEN a seller updates their shop name, description, or logo, THE system SHALL:
- Create a snapshot of the previous profile state (shop name, description, logo, timestamp)
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

## Categories

THE system SHALL allow administrators to create categories and subcategories with the following attributes:
- Name (required)
- Description (optional)

A category may have one level of subcategory nesting only.

WHEN an administrator creates a category, THE system SHALL:
- Validate name uniqueness
- Store name and description
- Record creation timestamp
- Assign unique category ID
- Record administrator ID as creator

WHEN an administrator edits a category name or description, THE system SHALL:
- Create a category snapshot
- Record old and new values
- Preserve change history

WHEN an administrator deletes a category, THE system SHALL:
- Move all products in that category to "Uncategorized"
- Create a category snapshot for the deleted category
- Preserve all product snapshots and order items referencing the category
- Do not delete category data for audit purposes

THE system SHALL enforce that a product belongs to exactly one category.

Customers SHALL be able to browse all categories and view products within each category.

## Product Lifecycle

WHEN a seller initiates product creation, THE system SHALL require the seller to provide:
- Product name (required)
- Product description (required)
- Category selection (required, must be valid existing category)
- Base price (required, must be positive)

WHEN a seller submits product creation, THE system SHALL:
- Assign the product to the seller's account as owner
- Generate an initial product snapshot recording all provided fields and timestamps
- If the product has no variants, display it as "unavailable" in search and category listings
- If the product has at least one variant, display it as available for purchase
- While the product is in "draft" state (before publication), prevent customers from viewing or purchasing the product

WHEN a seller edits any field of a product (name, description, category, base price, images, or variant configurations), THE system SHALL automatically create a complete product snapshot.

WHEN a product snapshot is created, THE system SHALL capture ALL of the following data:
- Product ID and owner seller ID
- Product name, description, category selection, and base price
- All product images and their order
- All variants at the time of edit (SKU codes, option values, prices, and stock quantities)
- Timestamp of the edit

WHEN a product snapshot is created, THE system SHALL prevent the seller from modifying the snapshot after creation.

WHEN a product snapshot is created, THE system SHALL preserve the previous version of the product unchanged.

WHEN a seller modifies product images, THE system SHALL record which images were added, removed, or reordered in the product snapshot.

WHEN a product variant is modified, THE system SHALL create a variant-level snapshot as part of the product snapshot.

WHEN a product edit results in a change to the product's availability status (e.g., adding the first variant), THE system SHALL update the product's visibility accordingly.

WHEN a seller requests deletion of a product, THE system SHALL validate that:
- No order items exist for any variant of the product with status "paid" or "shipped"
- No pending cancellation or refund requests exist for any variant of the product

IF any of the above conditions are true, THEN THE system SHALL:
- Reject the deletion request and display the number of affected order items or requests
- Block deletion request

WHEN a product deletion request is approved, THE system SHALL:
- Immediately remove the product from all customer search results and category listings
- Remove all variants associated with the product
- Remove all inventory records associated with the product's variants
- Preserve the last product snapshot and all variant snapshots
- Preserve all order items and order snapshots that reference this product
- Preserve all review records associated with the product
- Log the deletion event in the administrator audit trail
- Prohibit the seller from creating a new product with the same name or SKU codes for 30 days

While the product deletion request is pending, THE system SHALL:
- Prevent any edits to the product
- Prevent any seller from adding new variants to the product
- Prevent customers from purchasing any variant of the product

## Product Images

WHEN a seller uploads an image to a product, THE system SHALL assign a unique identifier to the image and store it in the product's image repository.

WHEN a seller uploads a new image, THE system SHALL automatically add it to the end of the product's image list.

WHEN a seller reorders images, THE system SHALL update the display order of the images in the product record.

WHEN a seller deletes an image from a product, THE system SHALL remove the image from the active image list but preserve it in the product's snapshot history.

WHEN a product snapshot is created, THE system SHALL capture the complete image list in its exact order at the time of the snapshop.

WHEN a product is viewed, THE system SHALL display its main image (first in order) as the thumbnail.

WHEN a seller edits the image list, THE system SHALL trigger a product snapshot.

WHEN a product is deleted, THE system SHALL preserve the image files in storage for 365 days before permanent deletion.

WHERE the customer views a product snapshot, THE system SHALL display images exactly as they appeared in the product at that point in time.

## Product Variants (SKUs)

WHEN a seller creates a new product, THE system SHALL require at least one variant to be defined. THE system SHALL NOT allow product creation without at least one variant.

WHEN a variant is created, THE system SHALL require:
- SKU code (unique identifier, required)
- Option values (e.g., color: "Red", size: "Large")
- Stock quantity (required, must be 0 or greater)
- Price (optional, overrides base price if provided)

THE system SHALL generate a unique SKU code for each variant. SKU codes MUST be unique across the entire platform and cannot be duplicated by any seller.

WHEN multiple options are defined for a variant, THE system SHALL store each option as a key-value pair with the option name and selected value.

WHEN a product is created with variants, THE system SHALL set the initial stock quantity to 0 for each variant.

WHILE a product has no variants, THE system SHALL display the product as "unavailable" in search results and category listings.

WHEN a seller edits an existing variant, THE system SHALL create a permanent snapshot of the variant's previous state.

WHEN a variant is edited, THE system SHALL allow changes to:
- SKU code (must remain unique platform-wide)
- Option values (e.g., changing color from "Red" to "Blue")
- Price (if provided, overrides base price)
- Stock quantity (can be adjusted)

THE system SHALL NOT allow editing of variant fields that would create a duplicate SKU code on the platform.

THE system SHALL prevent modification of option names or structure (e.g., cannot change "color" to "size"). Only the values assigned to existing option names can be changed.

WHEN a variant's price is edited, THE system SHALL preserve the original price in the snapshot.

WHEN a variant's stock quantity is edited, THE system SHALL record the change in inventory history, not in a snapshot.

WHEN a variant is edited, THE system SHALL update the current variant record with the new values and preserve the previous state in the snapshot.

WHEN a seller attempts to delete a variant, THE system SHALL check for pending order items.

IF any order item exists with status "paid" or "shipped" for the variant, THEN THE system SHALL reject deletion and return error "VARIANT_HAS_PENDING_ORDERS".

IF any pending cancellation or refund request exists for the variant, THEN THE system SHALL reject deletion and return error "VARIANT_HAS_PENDING_REQUESTS".

WHEN a variant has no associated pending order items or refund/cancellation requests, THE system SHALL allow deletion.

WHEN a variant is deleted, THE system SHALL remove the variant from active inventory and product listings.

DELETED variants SHALL NOT be reactivated or restored.

THE system SHALL preserve all snapshots of the deleted variant for audit and dispute resolution purposes.

THE system SHALL remove the variant from all customer carts and wishlists where it appears.

THE system SHALL enforce global uniqueness of SKU codes across all sellers and products.

WHEN a seller attempts to create a variant with a SKU code that exists elsewhere on the platform, THEN THE system SHALL reject the creation and return error "SKU_CODE_ALREADY_EXISTS".

WHEN a seller attempts to edit a variant to a SKU code that exists elsewhere on the platform, THEN THE system SHALL reject the edit and return error "SKU_CODE_ALREADY_EXISTS".

THE system SHALL validate SKU code uniqueness before any variant creation or edit operation.

SKU codes MUST be alphanumeric and may include hyphens, underscores, and periods. No spaces or special characters are permitted.

## Inventory Management

THE system SHALL maintain an immutable inventory history for every product variant.

WHEN any inventory change occurs (restock, adjustment, order fulfillment, cancellation, refund), THE system SHALL create a new inventory record.

EACH inventory record SHALL include:
- variantId (reference to the product variant)
- quantityChange (integer, positive for restock, negative for reduction)
- reason (string, from predefined list of reasons)
- timestamp (ISO 8601 date-time)
- actorId (reference to the user or system that triggered the change)
- sourceTransactionId (optional, reference to related order, cancellation, or refund ID)

WHILE an inventory record exists, THE system SHALL NOT allow modification, deletion, or alteration of the record.

WHEN a seller restocks a product variant, THE system SHALL allow the seller to enter:
- a positive quantity value
- a reason for restocking ("Supplier Delivery", "Returns Received", "Manual Adjustment", "Damaged Goods Replacement")

WHEN the restock action is submitted, THE system SHALL:
1. Create a new inventory record with positive quantityChange
2. Log the current time
3. Assign the seller's userId as the actorId
4. Record the selected reason
5. Automatically update the variant’s current stock level

IF the quantity value is zero or negative, THE system SHALL reject the request with error message "Restock quantity must be greater than zero."

WHEN a seller needs to adjust inventory levels due to damage, theft, or inventory count errors, THE system SHALL allow the seller to:
- Enter a negative quantity (for loss) or positive quantity (for gain)
- Select a reason from: "Damage", "Theft", "Counting Error", "Quality Issue", "Gift Item", "Other"

WHEN the adjustment is submitted, THE system SHALL:
1. Create a new inventory record with the specified quantityChange
2. Log the current time
3. Assign the seller's userId as the actorId
4. Record the selected reason
5. Automatically update the variant’s current stock level

IF the reason is "Other", THE system SHALL require the seller to provide a detailed description (required field, 10-200 characters)

IF the quantity is zero, THE system SHALL reject the request with error message "Adjustment quantity cannot be zero."

WHEN a customer successfully completes a checkout and order is placed, THE system SHALL:

FOR EACH order item (variant + quantity):
1. Create a negative inventory record with quantityChange = -(order item quantity)
2. Set reason to "Order Fulfillment"
3. Assign system as actorId
4. Set sourceTransactionId to the orderId
5. Immediately reduce the variant's current stock level

WHEN the order fails to complete during payment processing, THE system SHALL NOT make any inventory changes.

WHEN a cancellation request for an order item is approved, THE system SHALL:
1. Create a positive inventory record with quantityChange = (original order item quantity)
2. Set reason to "Cancellation Reversal"
3. Assign the administrator's userId as actorId (or seller's userId if seller approved)
4. Set sourceTransactionId to the cancellationRequestId
5. Immediately increase the variant's current stock level

WHEN a refund request for an order item is approved, THE system SHALL:
1. Create a positive inventory record with quantityChange = (original order item quantity)
2. Set reason to "Refund Processing"
3. Assign the administrator's userId as actorId (or seller's userId if seller approved)
4. Set sourceTransactionId to the refundRequestId
5. Immediately increase the variant's current stock level

IF the cancellation/refund request is rejected, THE system SHALL make no inventory changes.

THE current stock level for each variant SHALL be calculated in real-time by summing all inventory records associated with that variant.

WHILE calculating current stock, THE system SHALL include ALL inventory records, regardless of their age or status.

THE current stock level SHALL be a read-only derived field and SHALL NOT be stored directly in the database.

WHEN a new inventory record is created, THE system SHALL recalculate the current stock for that variant immediately.

IF a variant’s current stock level is 0 or below, THE system SHALL classify the variant as "out of stock."

WHEN the variant status is "out of stock,"
THE system SHALL:
1. Prevent the variant from being added to any cart (show error: "This item is out of stock")
2. Display "Out of Stock" label in product listings and search results
3. Disable "Add to Cart" button on product detail pages
4. Mark the variant as unavailable in shopping carts (but do not auto-remove)

WHEN a variant's current stock becomes greater than 0 due to restock, cancellation, or refund, THE system SHALL automatically update the variant status to "available."

WHEN the variant status changes from "out of stock" to "available,"
THE system SHALL send a notification to customers who added it to their wishlist (if applicable).

WHILE a seller has access to their product variants, THE system SHALL allow the seller to view the full inventory history for each variant.

WHILE an administrator has access to platform-wide products, THE system SHALL allow the administrator to view the full inventory history for any variant.

WHEN viewing inventory history, THE system SHALL display:
- Date and time of each change
- Type of change (restock, adjustment, order, cancellation, refund)
- Quantity change
- Reason
- Actor (seller name or "system")
- Related transaction ID (order, cancellation, refund)

## Shopping Cart

WHEN a customer selects a specific product variant, THE system SHALL add it to their cart.

THE system SHALL require customers to select a specific variant (SKU) before adding to cart — product-level addition without variant selection is prohibited.

WHEN a customer attempts to add a variant that already exists in their cart, THE system SHALL combine the quantities rather than create a duplicate line item.

THE cart SHALL store each item with the following attributes:
- product ID
- variant ID (SKU code)
- chosen quantity
- unit price at time of addition
- variant option values (e.g., color: "Red", size: "Large")
- product name
- seller ID
- variant stock availability status

WHEN a customer modifies the quantity of an item in their cart, THE system SHALL update the quantity to the new value immediately.

THE system SHALL NOT allow a quantity to be adjusted below 1 or above 999 for any cart item.

THE system SHALL limit the total number of distinct product variants in a cart to 50 items.

WHEN a customer views their cart, THE system SHALL render:
- Each cart item as a distinct, expandable row
- Product name (link to product detail page)
- Variant option values displayed clearly (e.g., "Red, Large")
- Current unit price per variant
- Quantity selector (spin control or text field)
- Subtotal for the item (quantity × unit price)
- Seller shop name (link to seller profile)
- Current stock status indicator (in stock, low stock, out of stock)

THE system SHALL calculate and display:
- Total quantity of all items
- Total cost of all items
- Estimated delivery date (if known)
- Tax and shipping estimates (if applicable)

WHILE a customer is viewing their cart, THE system SHALL continuously validate stock levels for each variant in real time.

WHEN a variant's available stock is less than the current cart quantity, THE system SHALL display a warning:
> "Only [remaining stock] items are available. Your cart contains [cart quantity]. Adjust quantity to proceed."

IF a variant's stock drops to 0 after being added to cart, THEN THE system SHALL:
- Mark the item as "Unavailable"
- Disable the quantity control
- Display: "This item is no longer in stock. It will be removed from cart if not addressed before checkout."
- Include the item in cart summary but highlight it with visual warning

WHEN a customer selects "Remove" from a cart item, THE system SHALL:
- Immediately remove the item from the cart
- Update cart summary totals
- Persist change to storage

IF a product or its variant is deleted by the seller, THEN THE system SHALL automatically remove it from all active customer carts.

WHEN a product variant has been out of stock for more than 72 hours and the customer has not interacted with the cart, THE system SHALL automatically remove it from the cart.

THE cart SHALL be persisted for the duration of the customer's authenticated session.

WHILE a customer is inactive (no cart or page interaction) for more than 30 minutes, THE system SHALL remove all cart contents.

WHEN a customer logs back in after session expiration or device change, THE system SHALL:
- Restore cart items from their last saved state (if less than 48 hours old)
- Re-validate stock availability for each restored variant
- Apply stack warnings for items with reduced stock
- Clear items that are now unavailable (deleted product, variant, or out of stock)

THE system SHALL prevent a customer from proceeding to checkout if ANY cart item is marked as "Unavailable."

THE system SHALL NOT lock inventory at cart addition — inventory is only decremented upon successful checkout.

IF a seller changes a variant's price after it has been added to cart, THE system SHALL:
- Preserve the original price at time of cart addition for checkout
- Display a banner above cart: "[Product name] price changed to [new price]. You will be charged [original price]."

## Checkout and Payment

WHEN a customer selects "Proceed to Checkout" from their cart, THE system SHALL validate cart items for availability.

WHERE a cart item's variant has been deleted, THE system SHALL mark that item as unavailable and prevent checkout.

WHERE a cart item's variant has insufficient stock, THE system SHALL display warning notification but continue checkout, allowing the customer to adjust quantity or remove item.

WHEN the cart contains no available items, THE system SHALL prohibit checkout initiation and display "Your cart is empty or contains only unavailable items" message.

WHERE there are no items in the cart, THE system SHALL prevent checkout initiation.

WHEN a customer initiates checkout, THE system SHALL present all addresses associated with the customer's account for selection.

WHEN the customer has no saved addresses, THE system SHALL require them to create and enter a new shipping address.

WHEN the customer selects an address, THE system SHALL capture and lock the following fields: recipient name, phone number, street address, city, state/province, postal code, and country.

WHILE the checkout process is in progress, THE system SHALL prevent address modification.

WHEN an address is selected and the order is placed, THE system SHALL lock the shipping address permanently to the order record, preserving its state at the moment of purchase.

WHEN the customer reviews the order before payment, THE system SHALL display:
- Final list of order items (product name, variant options, quantity, unit price, subtotal)
- Selected shipping address
- Total order amount (sum of subtotals plus any applicable fees)
- Payment method selected (if specified)

WHEN an item in the review list has been marked as unavailable since cart addition, THE system SHALL disable the "Place Order" button and display "One or more items are no longer available for purchase".

WHEN the user attempts to place an order with unavailable items, THE system SHALL prevent submission and display warning.

WHEN the customer confirms payment, THE system SHALL transmit order details (items, total, shipping) to the external payment gateway.

WHILE payment processing is active, THE system SHALL display "Processing Payment..." and disable UI controls.

WHEN the payment gateway returns a successful response, THE system SHALL proceed to order creation.

WHEN the payment gateway returns a failure response with code, THE system SHALL capture and store the failure reason code and message.

IF payment fails due to insufficient funds, THE system SHALL show: "Payment declined: insufficient funds. Please use a different payment method or adjust cart total."

IF payment fails due to expired card, THE system SHALL show: "Your payment method has expired. Please update your payment details and try again."

IF payment fails due to invalid card information, THE system SHALL show: "Payment method is invalid. Please verify your card details and retry."

IF payment fails due to gateway timeout, THE system SHALL show: "Payment processing timed out. Your card has not been charged. Please retry payment or try another method."

IF payment fails for any reason, THE system SHALL NOT create an order.

IF payment fails, THE system SHALL retain the cart state and return the customer to the checkout page with error details.

IF payment fails, THE system SHALL preserve the customer’s selected shipping address for reuse on retry.

WHEN payment is approved, THE system SHALL create a new order record with:
- Unique order ID
- Customer ID
- Timestamp of order creation
- Selected shipping address (locked copy)
- Total order amount
- Payment status: "paid"

WHEN an order is created, THE system SHALL create a separate order item for each cart variant, with:
- Product name (snapshot)
- Variant option values (snapshot)
- Unit price at time of purchase (snapshot)
- Quantity ordered
- Seller ID
- Seller profile snapshot (name, logo)
- Product snapshot ID
- Status: "paid"

WHEN an order is created, THE system SHALL remove the items from the customer's cart.

WHEN an order is created, THE system SHALL execute negative inventory adjustments for each variant purchased:
- Deduct ordered quantity from current stock via inventory history record
- Record reason: "order fulfillment"
- Record timestamp matching order creation

WHEN an order is created, THE system SHALL generate and persist snapshots for:
- Each product being ordered, capturing: name, description, category, base price, all images
- Each variant being ordered, capturing: SKU code, option values, override price, stock quantity at time of order
- The seller's profile at time of purchase, capturing: shop name, description, logo

WHILE an order item exists, THE system SHALL ensure the item-level snapshot data is immutable and cannot be modified.

WHEN a product's main image changes after purchase, THE system SHALL NOT affect the snapshot image stored with the order item.

## Order Structure

An order represents a collection of one or more order items purchased by a customer in a single transaction. Each order is created when a customer successfully completes checkout with a valid payment.

WHEN a customer completes checkout with successful payment, THE system SHALL create a new order record. The order SHALL contain:
- Customer identifier (linked to the customer account)
- Shipping address (exact values captured at checkout time)
- Order creation timestamp
- Total monetary value of the order at time of purchase
- List of one or more order items
- Payment method identifier
- Payment transaction identifier

WHEN an order is created, THE system SHALL preserve immutable snapshots of:
- Each product's state at the time of purchase (product name, description, category, base price)
- Each product variant's state (SKU code, option values, price)
- Each seller's profile state (shop name, shop description, logo image)

IF an order is created, THEN THE system SHALL remove the purchased items from the customer's shopping cart.

WHILE an order status is "paid", THE system SHALL allow cancellation or refund requests for individual order items.

Each order item has its own independent status that reflects its progress through the fulfillment lifecycle. The status of each order item is maintained independently of other items in the same order.

Order item statuses are:
- "paid" - payment has been successfully processed, item is awaiting shipment
- "shipped" - seller has dispatched the item with tracking information
- "delivered" - customer has confirmed delivery or 14 days have passed since shipment
- "cancelled" - cancellation request was approved and order item was cancelled
- "refunded" - refund request was approved and customer has been refunded

WHEN an order item status changes, THE system SHALL create a snapshot recording:
- Previous status value
- New status value
- Timestamp of change
- Reason provided (if applicable)
- User or system that initiated the change

WHEN a customer requests cancellation of an order item, THE system SHALL set the order item status to "paid" (if not already) and create a cancellation request record.

WHEN a customer requests refund of an order item, THE system SHALL set the order item status to "delivered" (if not already) and create a refund request record.

WHERE an order item status is "cancelled" or "refunded", THE system SHALL restore the corresponding inventory quantity via an inventory record.

The overall order status is derived dynamically based on the statuses of its constituent order items. The order status is not directly editable but is automatically calculated from the individual item states.

WHEN an order contains only items with status "paid", THE system SHALL set the order status to "paid".

WHEN an order contains one or more items with status "shipped" and no items with status "delivered", THE system SHALL set the order status to "shipped".

WHEN all items in the order have status "delivered", THE system SHALL set the order status to "delivered".

WHEN all items in the order have status "cancelled", THE system SHALL set the order status to "cancelled".

WHEN all items in the order have status "refunded", THE system SHALL set the order status to "refunded".

WHEN an order contains a mix of item statuses (e.g., some delivered, some refunded), THE system SHALL set the order status to "partially completed".

IF any item in an order has status "paid" or "shipped", THEN THE system SHALL not set the order status to "cancelled" or "refunded".

An order may contain items from multiple sellers. Each seller operates independently in fulfilling their portion of the order.

THE system SHALL support orders containing products from multiple sellers simultaneously.

THE system SHALL ensure each item in an order is associated with exactly one seller.

WHEN an order contains items from multiple sellers, THE system SHALL create separate shipment entities for each seller's items.

WHEN a seller receives a new order item, THE system SHALL display only items from that seller in their seller dashboard.

WHILE an order status is "shipped", THE system SHALL show separate tracking information for each seller's shipment.

Each order item is exclusively associated with the seller who created the product being purchased. The seller association is fixed at order creation and cannot be changed.

WHEN a product is purchased, THE system SHALL capture and preserve a snapshot of the seller's profile at that exact moment.

THE seller profile snapshot SHALL include:
- Shop name
- Shop description
- Logo image URL

WHEN an order item status changes from "paid" to "shipped", THE system SHALL associate the item with the seller's current tracking information.

WHEN an order is created, THE system SHALL record the seller's unique identifier for each order item.

WHERE a seller's shop name or logo changes after an order has been placed, THE system SHALL NOT update the seller profile snapshot stored with existing order items.

WHILE an order status is "delivered" or higher, THE system SHALL maintain the original seller profile snapshot for historical accuracy.

Customers can access their complete order history, including details of past purchases. Sellers can access order items related to their products.

WHEN a customer views their order history, THE system SHALL display:
- List of all orders sorted by newest first
- For each order: order number, date, total price, and derived order status

WHEN a customer selects an individual order to view in detail, THE system SHALL display:
- List of items with: product name, variant options, quantity, price, and individual item status
- Shipping address used at time of purchase
- Complete shipping information for each seller's shipment

WHEN an administrator views any order, THE system SHALL display the complete snapshot data of:
- All products and variants at time of purchase
- All seller profiles at time of purchase
- All order item statuses and their change history

WHEN a seller views their order items history, THE system SHALL display:
- Only items related to their products
- Order status for their items
- Complete snapshot data of their own seller profile as it was at time of purchase

WHEN an order item has been cancelled or refunded, THE system SHALL maintain the original snapshot of the product and seller data as it existed at purchase time.

WHILE a customer's account is deleted, THE system SHALL preserve all order history and associated snapshots for legal and business continuity purposes.

## Shipping and Tracking

WHEN a seller processes one or more order items with "paid" status, THE system SHALL create a shipment.

WHILE an order contains items from multiple sellers, THE system SHALL create separate shipments for each seller.

WHEN a seller selects order items to ship, THE system SHALL allow bundling of multiple items into one shipment.

WHILE a seller is creating a shipment, THE system SHALL require all selected items to belong to the same seller.

WHEN a shipment is created, THE system SHALL require the seller to provide:
- Carrier name (required)
- Tracking number (required)

WHEN a shipment is created, THE system SHALL assign the same tracking information to ALL items within that shipment.

WHILE a shipment exists, THE system SHALL preserve the tracking information as an immutable snapshot.

IF a seller attempts to modify tracking information for a shipment that has already been created, THEN THE system SHALL disallow modification and require creation of a new shipment.

WHEN a customer receives a shipment, THE system SHALL allow the customer to confirm delivery for that shipment.

WHILE a shipment contains multiple order items, THE system SHALL treat delivery confirmation as applying to ALL items within the shipment.

WHEN a customer confirms delivery of a shipment, THE system SHALL:
- Update the status of ALL items in that shipment to "delivered"
- Record a timestamp of the customer's confirmation
- Preserve a snapshot of the delivery confirmation event

WHILE a shipment has been marked as "shipped" for 14 consecutive days AND no customer delivery confirmation has been recorded, THEN THE system SHALL automatically update the status of ALL items in that shipment to "delivered".

WHEN the auto-delivery rule triggers, THE system SHALL:
- Log the automatic status change in the order history
- Preserve a snapshot of the automatic delivery event
- Send a notification to the customer informing them that delivery was automatically confirmed

IF a customer confirms delivery after the auto-delivery has triggered, THEN THE system SHALL preserve both the auto-delivery and manual confirmation events in immutable snapshots.

WHEN a shipment is created, THE system SHALL create a direct relationship where one shipment can contain multiple order items, but each order item belongs to exactly one shipment.

WHILE a delivery status of an order item is being updated, THE system SHALL ensure the update applies ONLY to items within the associated shipment.

WHERE an order item is already associated with a shipment, THE system SHALL prevent it from being assigned to another shipment.

IF an order item is part of an existing shipment, THEN THE system SHALL prevent deletion of that shipment.

THE system SHALL enable queries to retrieve all order items associated with a specific shipment ID.

WHEN shipping details are added to a shipment, THE system SHALL create a snapshot of:
- The carrier name
- The tracking number
- The timestamp of shipment creation
- The list of order items included
- The seller ID

WHILE any shipment snapshot exists, THE system SHALL prevent deletion, modification, or alteration of its content.

WHERE a customer, seller, or administrator needs to verify shipping details, THE system SHALL allow viewing of shipment snapshots.

THE system SHALL preserve all shipment snapshots for as long as the associated order exists, regardless of subsequent transactions or account deletions.

## Cancellation and Refund Workflows

WHEN a customer requests cancellation of an order item, THE system SHALL require that the item's status is "paid".

WHILE an order item has status "paid", THE system SHALL allow the customer to submit a cancellation request.

WHEN a cancellation request is submitted, THE system SHALL capture:
- The customer's stated reason for cancellation
- The timestamp of the request
- The order item identifier
- The customer's account identifier
- The seller's account identifier

WHEN a cancellation request is submitted, THE system SHALL create a snapshot of the order item at that moment, including:
- Product name
- Variant options
- Quantity
- Price
- Seller profile (name and logo)
- Original order information

WHERE a customer has multiple cancellation requests for different items in the same order, THE system SHALL treat each request as independent.

THE system SHALL NOT allow cancellation requests for items with status "shipped", "delivered", "cancelled", or "refunded".

IF a customer attempts to submit a cancellation request for an item with invalid status, THEN THE system SHALL reject the request and display: "Cancellation is only allowed for items that have been paid but not yet shipped."

WHEN a cancellation request exists for an order item, THE system SHALL notify the seller associated with that item.

WHEN a seller receives a cancellation request, THE system SHALL allow the seller to either approve or reject the request.

WHEN a seller approves a cancellation request, THE system SHALL:
- Change the status of the order item to "cancelled"
- Create a snapshot of the cancellation request with approval status, timestamp, and seller's response
- Trigger a positive inventory adjustment equal to the quantity cancelled
- Record the reason "customer cancellation" on the inventory adjustment
- Send notification to the customer

WHEN a seller rejects a cancellation request, THE system SHALL:
- Keep the status of the order item as "paid"
- Create a snapshot of the cancellation request with rejection status, timestamp, and seller's response
- Send notification to the customer including the rejection reason

WHERE a seller does not respond to a cancellation request within 48 hours, THE system SHALL automatically approve it.

IF a seller attempts to approve a cancellation request for an item with status other than "paid", THEN THE system SHALL reject the action and log: "Cancellation approval failed - item status is not 'paid'."

THE system SHALL maintain a log of all cancellation requests and their outcomes for dispute resolution.

WHEN a customer purchases a product and the order item's status becomes "delivered", THE system SHALL allow the customer to submit a refund request within 7 days of delivery.

WHEN a refund request is submitted, THE system SHALL capture:
- The customer's stated reason for refund
- The timestamp of the request
- The order item identifier
- The customer's account identifier
- The seller's account identifier

WHEN a refund request is submitted, THE system SHALL create a snapshot of the order item at that moment, including:
- Product name
- Variant options
- Quantity
- Price
- Seller profile (name and logo)
- Original order information
- Delivery date

THE system SHALL NOT allow refund requests for items with status "paid", "shipped", "cancelled", or "refunded".

IF a customer attempts to submit a refund request more than 7 days after delivery, THEN THE system SHALL reject the request and display: "Refund requests must be submitted within 7 days of delivery."

IF a customer attempts to submit a refund request for an item already refunded or cancelled, THEN THE system SHALL reject the request and display: "This item has already been refunded or cancelled."

WHEN a refund request exists for an order item, THE system SHALL notify the seller associated with that item.

WHEN a seller receives a refund request, THE system SHALL allow the seller to either approve or reject the request.

WHEN a seller approves a refund request, THE system SHALL:
- Change the status of the order item to "refunded"
- Create a snapshot of the refund request with approval status, timestamp, and seller's response
- Trigger a positive inventory adjustment equal to the quantity refunded
- Record the reason "customer refund" on the inventory adjustment
- Initiate payment reversal through the external payment gateway
- Send notification to the customer
- If the original payment was processed by a third-party gateway, THE system SHALL create a refund transaction record with unique identifier

WHEN a seller rejects a refund request, THE system SHALL:
- Keep the status of the order item as "delivered"
- Create a snapshot of the refund request with rejection status, timestamp, and seller's response
- Send notification to the customer including the rejection reason

WHERE a seller does not respond to a refund request within 48 hours, THE system SHALL automatically approve it.

IF a seller attempts to approve a refund request for an item with status other than "delivered", THEN THE system SHALL reject the action and log: "Refund approval failed - item status is not 'delivered'."

THE system SHALL maintain a log of all refund requests and their outcomes for dispute resolution.

WHEN an order item is cancelled, THE system SHALL automatically create a positive inventory record for each variant.

WHEN an order item is refunded, THE system SHALL automatically create a positive inventory record for each variant.

WHEN an inventory adjustment is created due to cancellation or refund, THE system SHALL:
- Record the quantity as a positive number (restock)
- Set the reason to "cancellation" or "refund" as appropriate
- Record the timestamp of the adjustment
- Associate the adjustment with the original order item and customer account

WHEN the inventory adjustment is processed, THE system SHALL calculate the current stock for the variant by summing all inventory records.

THE system SHALL NOT create inventory adjustments for items that are already out of stock (stock quantity = 0).

IF the inventory adjustment would result in stock greater than 10,000 units for any variant, THEN THE system SHALL flag it for administrative review.

THE system SHALL derive the overall order status from its contained order items.

WHEN all items in an order are cancelled, THE system SHALL update the overall order status to "cancelled".

WHEN all items in an order are refunded, THE system SHALL update the overall order status to "refunded".

WHEN an order contains a mix of statuses (e.g., some delivered, some refunded), THE system SHALL update the overall order status to "partially completed".

## Reviews and Ratings

WHEN a customer completes the delivery of an order item, THE system SHALL allow the customer to write a review for that product.

IF the order item status is not "delivered", THEN THE system SHALL prevent review creation and display appropriate message.

WHERE a customer has multiple order items for the same product, THE system SHALL allow only one review per product per order.

WHILE the product is still in "paid" or "shipped" status, THE system SHALL disable the review submission interface.

IF a product has been deleted by the seller, THEN THE system SHALL prevent new review creation but preserve existing reviews.

WHEN a customer initiates review creation for an eligible product, THE system SHALL display a form with:
- Star rating field (1 to 5 stars, required)
- Text content field (optional, maximum 2,000 characters)

THE system SHALL require at least one star to be selected before submission.

WHEN the customer submits the review, THE system SHALL:
- Associate the review with the specific product and order item
- Record the customer ID, review timestamp, and product ID
- Store the rating and optional text content

THE system SHALL prevent duplicate reviews for the same product within the same order.

IF the customer has already submitted a review for this product in this order, THEN THE system SHALL display "Review already submitted" and disable form submission.

WHEN a customer edits their existing review, THE system SHALL:
- Preserve the original review as a snapshot
- Record the revision timestamp and the user who made the change
- Update the display with the new rating and/or text content

THE system SHALL allow editing only if the review was created within the last 30 days.

WHERE a review is edited, THE system SHALL create a snapshot with:
- Original rating
- Original text
- Edited rating
- Edited text
- Timestamp of edit
- Customer ID

THE system SHALL not allow editing if the product has been deleted.

IF the review has been edited before, THEN THE system SHALL preserve all previous snapshots in immutable history.

WHEN a customer deletes their review, THE system SHALL:
- Mark the review as "deleted" in the active display list
- Preserve the full review data (rating, text, timestamps) in an immutable snapshot
- Change the displayed review text to "deleted user"
- Retain the rating in calculation of the product's average

THE system SHALL NOT delete the review record or its associated snapshot.

IF a review is deleted, THE system SHALL preserve the history to support audit or dispute resolution.

WHERE an administrator deletes a review, THE system SHALL create a snapshot with:
- Reason for deletion (provided by admin)
- Administrator ID
- Timestamp
- Original review content

THE system SHALL prevent deletion by customers if more than 30 days have passed since review creation.

THE system SHALL calculate the average rating of a product using all non-deleted reviews.

WHERE a review is deleted by the user, THE system SHALL retain its numeric rating in the average calculation but exclude its text from display.

IF a review is deleted by an administrator, THE system SHALL remove its numeric rating from the average calculation.

THE system SHALL calculate the average rating dynamically on every display.

THE system SHALL round the average rating to one decimal place for display.

IF no non-deleted reviews exist for the product, THE system SHALL show "No ratings yet".

THE system SHALL display the total number of non-deleted reviews alongside the average rating.

WHEN a customer views a product detail page, THE system SHALL display reviews sorted by newest first (by creation timestamp).

THE system SHALL show:
- Rating (stars)
- Review text (or "deleted user" if the review was deleted by the customer)
- Reviewer display name (or "deleted user" if review was deleted)
- Creation timestamp

WHEN a review is edited, THE system SHALL display only the latest version in the public list, but preserve the full edit history in snapshots.

THE system SHALL not display reviews for deleted products.

IF a customer attempts to view their own deleted review, THE system SHALL show their original content in a history panel accessible only to them.

WHEN a seller views the product reviews dashboard, THE system SHALL show:
- All non-deleted reviews (with customer display names)
- Deleted reviews marked as "deleted by customer"
- Admin-deleted reviews marked as "deleted by administrator"
- Total review count and average rating

THE system SHALL allow administrators to view all reviews including original content, even if deleted.

WHERE a review contains profanity or violates platform policy, THE system SHALL allow administrators to hide it from public view without deleting it, while keeping it available for auditing.

## Administrator System

WHEN any user (customer or seller) submits a request to become an administrator, THE system SHALL:
- Accept a request with a reason text
- Store request details including user ID, reason, and timestamp
- Set status to "pending"
- Send notification to super administrators

WHEN a super administrator views pending administrator requests, THE system SHALL display:
- User ID
- Request reason
- Request timestamp
- Current status
- Action buttons: "Approve" and "Reject"

WHEN a super administrator approves an administrator request, THE system SHALL:
- Create a user role snapshot:
  - old_role: "customer" or "seller"
  - new_role: "admin"
  - actor: super_admin_id
  - timestamp
  - reason: [provided in request]
- Update user role to "admin"
- Send notification to user

WHEN a super administrator rejects an administrator request, THE system SHALL:
- Create a user role snapshot:
  - old_role: "customer" or "seller"
  - new_role: "customer" or "seller"
  - actor: super_admin_id
  - timestamp
  - reason: [provided by admin]
- Send notification to user with rejection reason

There are two grades of administrators: regular administrator and super administrator.

THE system SHALL allow super administrators to promote regular administrators to super administrator.

WHEN a super administrator promotes a regular administrator, THE system SHALL:
- Create a user role snapshot:
  - old_role: "admin"
  - new_role: "super_admin"
  - actor: super_admin_id
  - timestamp
  - reason: [reason provided]
- Update user role to "super_admin"
- Send notification to user

THE system SHALL allow super administrators to demote other super administrators to regular administrator.

WHEN a super administrator demotes another super administrator, THE system SHALL:
- Create a user role snapshot:
  - old_role: "super_admin"
  - new_role: "admin"
  - actor: super_admin_id
  - timestamp
  - reason: [reason provided]
- Update user role to "admin"
- Send notification to user

THE system SHALL prevent super administrators from demoting themselves.

THE system SHALL allow administrators to view the list of pending seller approvals.

THE system SHALL allow administrators to approve or reject seller registrations.

WHEN an administrator approves a seller registration, THE system SHALL:
- Set seller status to "approved"
- Notify seller via email: "Your application has been approved. You may now list products."
- Log approval timestamp, administrator ID, and IP address

WHEN an administrator rejects a seller registration, THE system SHALL:
- Set seller status to "rejected"
- Require administrator to enter a rejection reason (minimum 10 characters)
- Notify seller via email: "Your application has been denied. Reason: [reason]"
- Log rejection timestamp, administrator ID, IP address, and reason

WHEN a seller is rejected, THE system SHALL allow the seller to submit a new registration request.

THE system SHALL allow administrators to suspend seller accounts.

WHEN a seller is suspended, THE system SHALL:
- Hide all products from search and category listings
- Prevent new purchases from the seller
- Allow existing orders to be processed (ship items, respond to cancellation/refund requests)
- Prevent the seller from creating new products or editing existing products
- Preserve all existing product snapshots, inventory history, and order items
- Display "Shop Suspended" instead of shop name on product detail pages

WHEN a seller is suspended, THE system SHALL create a seller suspension snapshot:
- seller_id
- action: "suspended"
- reason: [provided by admin]
- timestamp
- actor: admin_id

THE system SHALL allow administrators to unsuspend seller accounts.

WHEN a seller is unsuspended, THE system SHALL:
- Set seller status to "approved"
- Notify seller via email: "Your account has been reinstated. Your products are now visible."
- Make products visible again in search and category listings
- Restore full selling privileges
- Create a seller profile snapshot:
  - action: "unsuspended"
  - timestamp
  - actor: admin_id
  - reason: "Account reinstated"

THE system SHALL allow administrators to create categories and subcategories.

THE system SHALL allow administrators to edit category names and descriptions.

THE system SHALL allow administrators to delete categories.

WHEN an administrator deletes a category, THE system SHALL:
- Move any products assigned to this category to "Uncategorized"
- Create a category snapshot with the deleted category's name and description
- Preserve all product snapshots and order items referencing the category

THE system SHALL allow administrators to view all products on the platform.

THE system SHALL allow administrators to view snapshots of any product.

THE system SHALL allow administrators to delete any product (for policy violations).

WHEN an administrator deletes a product, THE system SHALL:
- Create a product snapshot
- Create product-snapshot-SKU for all variants
- Hide from search
- Preserve snapshots
- Do not delete snapshot records

THE system SHALL allow administrators to view all orders on the platform.

THE system SHALL allow administrators to force-cancel individual items or entire orders (refunds the customer, restores stock).

WHEN an administrator forces a cancellation of an order item, THE system SHALL:
- Create an order item snapshot:
  - previous_status: "paid"
  - new_status: "cancelled"
  - reason: "Admin forced cancellation: [reason]"
  - timestamp
  - actor: admin_id
- Create a positive inventory record
- Update order item status
- Update overall order status if applicable
- Notify seller and customer
- Preserve snapshot

THE system SHALL allow administrators to force-refund individual items or entire orders.

WHEN an administrator forces a refund of an order item, THE system SHALL:
- Create an order item snapshot:
  - previous_status: "delivered"
  - new_status: "refunded"
  - reason: "Admin forced refund: [reason]"
  - timestamp
  - actor: admin_id
- Create a positive inventory record
- Initiate payment reversal through the external payment gateway
- Update order item status
- Update overall order status if applicable
- Notify seller and customer
- Preserve snapshot

THE system SHALL allow administrators to view all customer accounts.

THE system SHALL allow administrators to ban customers (banned customers cannot log in).

WHEN a customer is banned, THE system SHALL:
- Create a user ban snapshot:
  - user_id
  - action: "banned"
  - reason: [provided by admin]
  - timestamp
  - actor: admin_id
- Prevent customer from logging in
- Preserve all past order items
- Preserve all snapshots associated with the customer
- Preserve all reviews
- Do not delete any data

THE system SHALL allow administrators to unban customers.

WHEN a customer is unbanned, THE system SHALL:
- Create a user ban snapshot:
  - user_id
  - action: "unbanned"
  - reason: [provided by admin]
  - timestamp
  - actor: admin_id
- Allow customer to log in
- Preserve all previous data

THE system SHALL allow administrators to view all seller accounts.

THE system SHALL allow administrators to ban sellers (banned sellers cannot log in, existing orders remain).

WHEN a seller is banned, THE system SHALL:
- Create a user ban snapshot:
  - user_id
  - action: "banned"
  - reason: [provided by admin]
  - timestamp
  - actor: admin_id
- Prevent seller from logging in
- Hide all products from search and category listings
- Prevent new purchases from the seller
- Allow existing orders to be processed (ship items, respond to cancellation/refund requests)
- Preserve all existing product snapshots, inventory history, and order items
- Do not delete any data

## Snapshot Principle

A snapshot is an immutable, point-in-time capture of the complete state of editable business data at the moment of modification. Snapshots are not backups or archives—they are legally significant business records that preserve the state of data at the exact moment it was changed. Snapshots cannot be modified, deleted, or altered after creation. Each snapshot includes metadata: timestamp, actor who made the change, and the exact state of all data fields before and after the modification.

THE system SHALL create a snapshot whenever any editable business entity is modified, edited, updated, or otherwise changed.

THE system SHALL prevent deletion of any snapshot after creation.

WHEN a snapshot is created, THE system SHALL ensure it contains a complete and consistent record of the entity's state at that moment, including all related nested entities.

WHEN a seller creates, updates, or deletes a product, THE system SHALL create a product snapshot.

WHEN a seller creates, updates, or deletes a product variant (SKU), THE system SHALL create a product-snapshot-SKU record.

WHEN a seller updates their shop name, description, or logo, THE system SHALL create a seller profile snapshot.

WHEN a customer adds, modifies, or deletes an address, THE system SHALL create an address snapshot.

WHEN a customer creates, modifies, or deletes a review, THE system SHALL create a review snapshot.

WHEN a customer submits a cancellation request or a refund request, THE system SHALL create a request state snapshot at the time of submission and at the time of seller response (approval/rejection).

WHEN a product is purchased in an order, THE system SHALL create a product snapshot and a product-snapshot-SKU snapshot for each variant in the order item.

WHEN a seller's profile is included in an order item, THE system SHALL create a seller profile snapshot at the time of order placement.

WHEN an order item's status changes from 'paid' to 'shipped', 'shipped' to 'delivered', 'paid' to 'cancelled', or 'delivered' to 'refunded', THE system SHALL create an order item snapshot containing the previous status, timestamp, and actor responsible.

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

WHEN a seller's shop name, description, or logo is modified, THE system SHALL capture:
- Seller ID
- Shop name at the time of change
- Shop description at the time of change
- Logo image URL at the time of change
- Timestamp of change
- Actor who made the change

WHEN the seller profile is referenced in an order item, THE system SHALL capture all these fields from the snapshot taken at the time of purchase.

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

WHEN a snapshot is created, THE system SHALL ensure it cannot be modified, edited, or deleted by any user, including administrators.

WHILE any snapshot exists, THE system SHALL prevent any update, delete, or overwrite operation on the snapshot record.

IF any process attempts to modify a snapshot, THE system SHALL log the attempt and reject it with error code SNAPSHOT_IMMUTABLE.

WHERE a new version of data is created (e.g., product edited), THE system SHALL create a new snapshot without altering any existing snapshots.

Sellers, customers, and administrators SHALL NOT have the ability to delete, modify, or edit any snapshot.

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

WHEN a customer is deleted, THE system SHALL preserve all snapshots created by or related to that customer for audit and dispute purposes.

WHEN a seller is deleted, THE system SHALL preserve all snapshots of their products and profiles.

WHEN an order is created, THE system SHALL preserve all snapshots of product states, variant states, and seller profile states as they existed at the time of the transaction.

WHEN a product is deleted, THE system SHALL preserve all historical snapshots of that product and its variants indefinitely.

WHEN a seller's account is suspended, THE system SHALL preserve all snapshots of their products and profile.

WHEN an order item's status changes, THE system SHALL preserve the snapshot of that status change indefinitely.

WHEN a customer reviews a product, THE system SHALL preserve the snapshot of the review at the time of submission.

WHEN a customer edits a review, THE system SHALL preserve the snapshot of the previous review and create a new snapshot for the edited version.

WHEN a customer deletes a review, THE system SHALL preserve the snapshot of the original review and mark it as deleted.

WHEN an administrator deletes a review, THE system SHALL preserve the snapshot of the review content and create a new snapshot for the deletion event.

WHEN a product's price is changed, THE system SHALL preserve the snapshot of the old price and create a new snapshot of the new price.

WHEN a product's images are changed, THE system SHALL preserve the snapshot of the old image sequence and create a new snapshot of the updated image sequence.

WHEN a product's category is changed, THE system SHALL preserve the snapshot of the old category assignment and create a new snapshot of the new category assignment.

WHEN a customer's address is changed, THE system SHALL preserve the snapshot of the previous address and create a new snapshot of the updated address.

WHEN the system automatically changes an order item status (e.g., auto-delivery after 14 days), THE system SHALL:
- Create an order item snapshot with:
  - previous_status: "shipped"
  - new_status: "delivered"
  - timestamp: actual time of change
  - actor: "system"
  - reason: "Auto-delivery triggered after 14 days of shipping"
- Update the live order item status
- Send customer notification
- Preserve snapshot for audit

WHEN an administrator grants administrator privileges to a user, THE system SHALL:
- Create a user role snapshot:
  - old_role: "customer" or "seller"
  - new_role: "admin" or "super_admin"
  - actor: super_admin_id
  - timestamp
  - reason: [provided]
- Update user role
- Preserve snapshot

WHEN an administrator denies an administrator request, THE system SHALL:
- Create a user role snapshot:
  - old_role: "customer" or "seller"
  - new_role: "customer" or "seller"
  - actor: admin_id
  - timestamp
  - reason: [provided]
- Preserve snapshot

WHEN a seller account is suspended, THE system SHALL:
- Create a seller suspension snapshot:
  - seller_id
  - action: "suspended"
  - reason: [provided by admin]
  - timestamp
  - actor: admin_id
- Preserve snapshot

WHEN a seller account is unsuspended, THE system SHALL:
- Create a seller unsuspension snapshot:
  - seller_id
  - action: "unsuspended"
  - reason: [provided by admin]
  - timestamp
  - actor: admin_id
- Preserve snapshot

WHEN a product is deleted, THE system SHALL:
- Create a product deletion snapshot:
  - product_id
  - action: "deleted"
  - actor: "seller" or "admin"
  - timestamp
  - reason: [provided]
- Preserve snapshot

WHEN an order item is cancelled, THE system SHALL:
- Create a cancellation request snapshot:
  - request_id
  - item_id
  - customer_id
  - seller_id
  - request_status: "approved"
  - approval_reason: [provided by seller]
  - timestamp
  - actor: "seller"
- Preserve snapshot

WHEN an order item is refunded, THE system SHALL:
- Create a refund request snapshot:
  - request_id
  - item_id
  - customer_id
  - seller_id
  - request_status: "approved"
  - approval_reason: [provided by seller]
  - timestamp
  - actor: "seller"
- Preserve snapshot

WHEN an order item is force-cancelled by administrator, THE system SHALL:
- Create an admin force-cancel snapshot:
  - item_id
  - action: "forced_cancel"
  - reason: [provided by admin]
  - timestamp
  - actor: "admin"
- Preserve snapshot

WHEN an order item is force-refunded by administrator, THE system SHALL:
- Create an admin force-refund snapshot:
  - item_id
  - action: "forced_refund"
  - reason: [provided by admin]
  - timestamp
  - actor: "admin"
- Preserve snapshot

WHEN a customer is banned, THE system SHALL:
- Create a customer ban snapshot:
  - user_id
  - action: "banned"
  - reason: [provided by admin]
  - timestamp
  - actor: "admin"
- Preserve snapshot

WHEN a customer is unbanned, THE system SHALL:
- Create a customer unban snapshot:
  - user_id
  - action: "unbanned"
  - reason: [provided by admin]
  - timestamp
  - actor: "admin"
- Preserve snapshot

WHEN a seller is banned, THE system SHALL:
- Create a seller ban snapshot:
  - user_id
  - action: "banned"
  - reason: [provided by admin]
  - timestamp
  - actor: "admin"
- Preserve snapshot

WHEN a seller is deleted, THE system SHALL:
- Create a seller deletion snapshot:
  - user_id
  - action: "deleted"
  - timestamp
  - actor: "seller"
- Preserve snapshot

WHEN an administrator makes any change to any entity that creates a snapshot, THE system SHALL:
- Record the administrator's ID as the actor
- Record the timestamp
- Record the exact change
- Preserve the snapshot indefinitely

WHEN the system automatically performs any change that creates a snapshot, THE system SHALL:
- Record "system" as the actor
- Record the timestamp
- Record the reason for automatic change
- Preserve the snapshot indefinitely

WHEN a snapshot is requested for viewing, THE system SHALL:
- Return the exact snapshot content as it was created
- Include metadata (timestamp, actor, change description)
- Do not modify, redact, or alter any part of the snapshot
- Ensure the snapshot remains completely unchanged from creation

## Business Model Alignment

THIS e-commerce shopping mall platform supports its business model by:
- Enforcing universal registration to enable personalized commerce
- Preserving order history for legal compliance and dispute resolution
- Enabling targeted marketing through customer profiles
- Supporting seller-customer trust via verified accounts
- Allowing customer retention despite account lifecycle changes

THE shoppingMall platform generates revenue through:
- Seller transaction fees (8% of each sale)
- Premium seller plans (featured listings, advanced analytics)
- Payment processing surcharges
- Advertising on product category pages

Key success metrics:
- Customer registration conversion rate (goal: 85%)
- Customer retention rate (goal: 65% after 90 days)
- Average number of addresses per customer (goal: 1.8+)
- Wishlist-to-purchase conversion rate (goal: 35%)
- Account deletion rate (target: <0.5% monthly)
- Seller approval turnaround time (target: <48 hours)
- Seller retention rate (goal: >85% after 12 months)
- Average order value (goal: >$50)
- Customer satisfaction (CSAT): >4.5/5 stars

The ultimate success metric is not revenue or user count—but **verified transaction integrity**. When a buyer can say with certainty, "I know exactly what I bought and the seller knows exactly what they sold," the platform has succeeded.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.
