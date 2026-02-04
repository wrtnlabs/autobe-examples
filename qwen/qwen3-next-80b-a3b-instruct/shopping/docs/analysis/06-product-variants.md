# E-Commerce Shopping Mall Platform Requirements

## Customer Account

WHEN a user attempts to access any feature of the platform, THE system SHALL require the user to be registered and authenticated.

WHEN a user registers as a customer, THE system SHALL require:

- A valid email address (unique across all users)
- A password (minimum 8 characters, with at least one lowercase letter, one uppercase letter, one digit, and one special character)
- Email verification via confirmation link sent to the provided email

WHEN a user logs in as a customer, THE system SHALL accept:

- Registered email address
- Correct password

THE system SHALL store hashed and salted passwords with bcrypt or equivalent secure hashing.

WHEN a customer requests to change their password, THE system SHALL require:

- Current password validation
- New password meeting the same strength requirements as registration
- Confirmation of the new password

WHEN a customer deletes their account, THE system SHALL:

- Delete the customer's profile information (email, display name, phone number)
- Retain all orders and order history associated with the customer for legal and seller record purposes
- Retain all reviews but display them with the author as "deleted user"
- Invalidate all active sessions and authentication tokens
- Remove all addresses associated with this customer
- Preserve all wishlist items associated with the customer as orphaned records (no customer reference)

## Customer Profile

WHEN a customer creates a profile, THE system SHALL initialize with:

- Display name (default: first part of email before @)
- Phone number (optional, can be added later)

WHEN a customer edits their profile, THE system SHALL allow modification of:

- Display name (up to 100 characters, alphanumeric and spaces only)
- Phone number (must follow E.164 international format)

THE system SHALL log all profile edits in a profile history table with timestamp and updated fields.

## Address Management

WHEN a customer adds a shipping address, THE system SHALL require:

- Recipient name (required, up to 100 characters)
- Phone number (required, E.164 format)
- Street address (required, up to 255 characters)
- City (required, up to 100 characters)
- State/province (required, up to 100 characters)
- Postal code (required, up to 20 characters)
- Country (required, ISO 3166-1 alpha-2 code)

WHEN a customer edits an existing address, THE system SHALL:

- Allow modification of any field except the address ID
- Create a snapshot of the previous address state

WHEN a customer deletes an address, THE system SHALL:

- Remove the address from active listings
- Preserve the address in order history snapshots
- Prevent deletion if the address is set as default

WHEN a customer sets an address as default, THE system SHALL:

- Mark the selected address as default
- Unmark any previously set default address for this customer

WHEN an order is placed, THE system SHALL:

- Capture a snapshot of the shipping address at time of order
- Freeze all address data for that order

## Seller Account

WHEN a user attempts to register as a seller, THE system SHALL require:

- A valid email address (unique across all users)
- A password meeting the same strength requirements as customer registration
- Email verification

WHEN a seller logs in, THE system SHALL authenticate using the same credentials as customer login.

WHEN a seller attempts to change their password, THE system SHALL follow the same validation rules as customer password changes.

WHEN a seller registers, THE system SHALL:

- Set their status to "pending"
- Send a notification to administrators for approval

WHEN a seller views their account status, THE system SHALL display one of:

- "pending": waiting for admin review
- "approved": granted selling privileges
- "rejected": denied registration with reason provided

WHEN a seller's registration is rejected, THE system SHALL:

- Record the rejection reason
- Allow the seller to resubmit registration after rectifying issues
- Allow viewing of the rejection reason in their dashboard

WHEN a seller attempts to delete their account, THE system SHALL verify:

- No pending order items (status: paid or shipped)
- No pending cancellation requests for any of their products
- No pending refund requests for any of their products

WHEN a seller account is successfully deleted, THE system SHALL:

- Soft-delete the seller's profile (email, password)
- Revoke all selling privileges
- Remove their shop name, description, and logo from active listings
- Preserve all order history and snapshots involving this seller (including order items and product versions)
- Preserve the seller's name in past order records
- Notify all customers who have purchased from this seller

## Seller Profile

WHEN a seller creates a profile, THE system SHALL require:

- Shop name (required, unique platform-wide, up to 100 characters)
- Shop description (required, up to 5000 characters)
- Logo image (optional)

WHEN a seller edits their shop name, description, or logo, THE system SHALL:

- Create a snapshot of the previous profile state with timestamp
- Record who made the change and when
- Preserve the snapshot forever in immutable storage

WHEN a customer views a seller profile, THE system SHALL display:

- Current shop name
- Current shop description
- Current logo image
- History of previous profile snapshots (as links to view historical states)

THE system SHALL enforce unique shop names across the entire platform to prevent customer confusion.

## Categories

WHEN an administrator creates a category, THE system SHALL require:

- Name (required, up to 100 characters)
- Description (required, up to 1000 characters)

WHEN an administrator creates a subcategory, THE system SHALL require:

- Name (required)
- Description (required)
- Parent category ID (exactly one level of nesting allowed)

WHEN a category is modified, THE system SHALL:

- Allow updating of name and description
- Create a snapshot of the previous state

WHEN a category is deleted, THE system SHALL:

- Set all products in that category to "uncategorized" (null category ID)
- Preserve the category name and description in product snapshots
- Prevent deletion if any subcategories exist

WHEN a customer browses categories, THE system SHALL:

- Display root categories (parent_id = null)
- Allow navigation to subcategories (one level deep)
- Show total product count per category

## Snapshot Principle

THE system SHALL implement immutable snapshots for all editable data that impacts business transactions.

WHEN any of the following entities are modified, THE system SHALL create a snapshot:

- Product
- Product variant (SKU)
- Seller profile
- Order item
- Review
- Cancellation request
- Refund request

WHEN a snapshot is created, THE system SHALL record:

- Entity type
- Entity ID
- Timestamp of change
- Fields that changed
- Before and after values
- User ID who made the change

SNAPSOTS SHALL BE IMMUTABLE and SHALL NEVER be deleted, modified, or hidden.

Access to snapshots is granted based on role:

- Owners (seller for product/seller profile, customer for review) can view their own snapshots
- Administrators can view all snapshots on the platform
- Customers can view snapshots of products, variants, and seller profiles that were associated with their purchases

### Product Snapshot Structure

WHEN a product is edited, THE system SHALL create a product snapshot containing:

- Product ID
- Name
- Description
- Category ID
- Base price
- List of image identifiers (in order)
- Timestamp of edit
- Seller ID

WHEN the product has variants, THE system SHALL also create:

- A product-snapshot-SKU entry for each variant at the time of capture
- Each product-snapshot-SKU shall contain:
  - SKU code
  - Option values (key-value pairs)
  - Price (if overridden from base price)
  - Stock quantity
  - Timestamp of variant state

This allows complete reconstruction of the product offering at any point in time.

## Products

WHEN a seller creates a product, THE system SHALL require:

- Name (required, up to 255 characters)
- Description (required, up to 10000 characters)
- Category ID (required)
- Base price (required, >= 0.01 USD)

WHEN a seller edits a product, THE system SHALL:

- Allow modification of name, description, category, and base price
- Create a new product snapshot

WHEN a seller attempts to delete a product, THE system SHALL verify:

- No order items exist with status "paid" or "shipped" for any variant of this product
- No pending cancellation or refund requests exist for any variant of this product

WHEN a product is deleted, THE system SHALL:

- Remove the product from all search results and category listings
- Delete all variants and inventory records
- Preserve all product snapshots
- Remove the product from any customer wishlists
- Leave order items referencing this product intact with their snapshots

WHEN a seller views their own products, THE system SHALL:

- Show all products they've created (active and deleted)
- Allow viewing of all snapshots

WHEN an administrator views products, THE system SHALL:

- Show all products across the platform
- Allow viewing of any product's snapshots

## Product Images

WHEN a seller uploads an image for a product, THE system SHALL:

- Store the image in a secure storage system
- Assign a unique identifier to the image
- Record the image in the product-image table with order index

WHEN a seller reorders product images, THE system SHALL:

- Update the order index of all affected images
- Create a product snapshot with the new order

WHEN a seller deletes an image, THE system SHALL:

- Remove the image from the active list
- Preserve the image reference in past product snapshots
- Maintain file storage for historical snapshots

## Product Variants (SKU)

WHEN a seller creates a product variant, THE system SHALL require:

- SKU code (required, unique across platform, alphanumeric with hyphens, underscores, periods)
- Option values (at least one, key-value pairs, e.g., {"color": "Red", "size": "Large"})
- Stock quantity (required, >= 0)
- Price (optional, overrides base price if provided)

WHEN a seller edits a variant, THE system SHALL:

- Allow modification of:
  - SKU code (must remain unique across platform)
  - Option value values (changing colors/sizes)
  - Price
  - Stock quantity (through inventory history, not snapshot)
- Prevent modification of option names (e.g., cannot change "color" to "size")
- Create a new variant snapshot

WHEN a seller attempts to delete a variant, THE system SHALL verify:

- No order items exist with status "paid" or "shipped" for this variant
- No pending cancellation or refund requests exist for this variant

WHEN a variant is deleted, THE system SHALL:

- Remove it from active product listings
- Preserve all variant snapshots
- Disassociate it from all active carts and wishlists

WHEN a product has no variants, THE system SHALL:

- Display product as "unavailable"
- Not allow adding to cart
- Not show in results when filtering "in stock"

WHEN a product has at least one variant, THE system SHALL:

- Display the product as available
- Allow cart additions and purchase

THE system SHALL enforce global uniqueness of SKU codes; no two variants across any seller may share the same code.

## Inventory Management

WHEN a seller restocks a variant, THE system SHALL:

- Create an inventory record with:
  - Quantity change: positive value
  - Reason: "restock" or custom text
  - Timestamp
  - Seller ID
  - Variant ID

WHEN a seller adjusts inventory (loss or damage), THE system SHALL:

- Create an inventory record with:
  - Quantity change: negative or positive value
  - Reason: custom text
  - Timestamp
  - Seller ID
  - Variant ID

WHEN an order is placed, THE system SHALL:

- Create a negative inventory record:
  - Quantity change: negative value equal to ordered quantity
  - Reason: "order"
  - Timestamp
  - Seller ID
  - Variant ID

WHEN a cancellation or refund is approved, THE system SHALL:

- Create a positive inventory record:
  - Quantity change: positive value equal to refunded quantity
  - Reason: "cancellation" or "refund"
  - Timestamp
  - Seller ID
  - Variant ID

THE system SHALL calculate current stock quantity for a variant as:

- SUM of all inventory records for that variant ID

WHEN a variant's calculated stock reaches 0, THE system SHALL:

- Mark the variant as "out of stock"
- Prevent addition to cart
- Display "out of stock" on product detail page
- Hide from search results with "in stock" filter applied

WHEN a variant's stock is restored from 0 to > 0, THE system SHALL immediately update its status to "in stock".

WHEN a seller views inventory history, THE system SHALL:

- Display timestamp, change amount, reason, and type (restock/adjustment/order/cancellation/refund)
- Allow filtering by date range
- Show running total

## Product Search

WHEN a customer searches products by name, THE system SHALL:

- Match against product name (case-insensitive, partial word matching)
- Return products from all sellers
- Apply pagination (24 products per page)

WHEN a customer applies filters, THE system SHALL:

- Filter products by selected category (including subcategories)
- Filter by price range (min and max value)
- Filter by in-stock status (exclude "out of stock" variants)

WHEN a customer sorts search results, THE system SHALL:

- Sort by "newest first": newest product creation date
- Sort by "price low to high": minimum variant price
- Sort by "price high to low": maximum variant price

THE system SHALL provide an organized ranking of search results that combines relevance to query, seller reputation, and match quality.

## Product Listing

WHEN displaying product listings (search results, category pages), THE system SHALL display for each product:

- Main image (first image in product image list)
- Product name
- Price range: if all variants have same price → show base price; if variants differ → show range (e.g., "$10 - $50")
- Shop name of seller
- Average rating (number of stars rounded to half-star)
- Review count (number of non-deleted reviews)

WHEN a product has no variants or all variants are out of stock, THE system SHALL:

- Display "Out of stock" indicator
- Show the product name and shop name
- Prevent clicking to purchase

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:

- All product images in order (first image as primary)
- Product name and description
- Category path (parent → child)
- Seller shop name (linked to seller profile)
- All available variants with:
  - Option values (e.g., "Red / Large")
  - Price (if different from base)
  - Stock status ("in stock", "out of stock", or "unavailable")
- Average rating and total number of reviews
- All non-deleted reviews, sorted newest first
- Add to cart button per variant

WHEN the product has no variants, THE system SHALL display:

- "This product is currently unavailable"
- "Please contact the seller if you'd like to inquire about availability"

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:

- Store a record of customer ID and product ID
- Allow up to 200 products per customer wishlist

WHEN a customer views their wishlist, THE system SHALL:

- Display product name, main image, seller name, price range
- Show if product is available (has at least one variant in stock)
- Paginate results (12 products per page)

WHEN a customer removes a product from their wishlist, THE system SHALL:

- Delete the wishlist entry

WHEN a seller deletes a product, THE system SHALL:

- Automatically remove that product from all customers' wishlists
- Preserve wishlist entry in audit log before deletion

## Shopping Cart

WHEN a customer adds a variant to their cart, THE system SHALL:

- Require selection of a specific variant (not product level)
- Require selection of quantity (>= 1)
- Validate that the variant is in stock for requested quantity
- If variant matches an existing cart item: increase quantity, do not create new line
- If variant is a new item: create a new cart item

WHEN a customer views their cart, THE system SHALL display:

- Product name
- Variant options (e.g., "Color: Red, Size: Large")
- Unit price
- Quantity
- Subtotal (unit price × quantity)
- Total cart value (sum of all subtotals)
- Shipping cost estimate (if applicable)
- Total amount due

WHEN a customer changes a cart item quantity, THE system SHALL:

- Update quantity and subtotal
- Validate stock availability
- Show warning if new quantity exceeds available stock

WHEN a customer removes an item from cart, THE system SHALL:

- Delete the cart entry immediately

WHEN a variant becomes out of stock or is deleted, THE system SHALL:

- Mark the item in cart as "unavailable"
- Show warning message: "Product out of stock or removed by seller"
- Keep item in cart so customer can decide whether to remove or wait

WHEN a customer proceeds to checkout, THE system SHALL:

- Reject checkout if any cart item is marked "unavailable"

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL require:

- At least one cart item with status "available"
- Selection of a shipping address (default or custom)

WHEN a customer reviews order summary, THE system SHALL display:

- List of items with name, variant, quantity, price, subtotal
- Shipping address
- Total amount

WHEN an order is placed, THE system SHALL:

- Lock the shipping address
- Freeze prices of items at order time
- Block further edits to cart

## Payment

WHEN a customer confirms payment, THE system SHALL:

- Direct customer to integrated payment gateway (e.g., Stripe, PayPal)
- Generate a unique order session ID
- Store payment intent in pending state

WHEN payment succeeds, THE system SHALL:

- Set order status to "paid"
- Apply inventory reductions
- Clear cart
- Create order record with snapshotted data
- Send order confirmation email

WHEN payment fails, THE system SHALL:

- Set payment result to "failed"
- Leave cart unchanged
- Present retry options for corrected payment
- Preserve order session for 15 minutes

## Order Creation

WHEN an order is successfully placed, THE system SHALL:

- Create one order record
- Create one order item for each cart item
- Create a product snapshot with product and variant details at time of purchase
- Create a seller profile snapshot with shop name and logo at time of purchase
- Deduct inventory for each purchased variant (via inventory record)
- Clear the customer's cart
- Mark order as paid
- Send notification to seller

## Order Structure

AN ORDER SHALL contain:

- One or more order items
- One shipping address
- One payment status
- One overall order status

EACH ORDER ITEM SHALL have:

- Product ID, variant ID, seller ID
- Quantity (>= 1)
- Price at time of purchase (snapshotted)
- Status: paid, shipped, delivered, cancelled, refunded

WHEN a customer buys 3 identical variants, THIS SHALL become:

- One order item with quantity: 3
- Not three separate items

WHEN an order contains items from different sellers, THE system SHALL:

- Group items by seller for shipment purposes
- Treat each group as a separate shipment

## Order History

WHEN a customer views their order history, THE system SHALL:

- Display a paginated list (10 orders per page)
- Sort by created_at descending (newest first)
- Show for each order:
  - Order ID
  - Order date
  - Total price
  - Overall status

WHEN a customer views order details, THE system SHALL:

- Show list of order items:
  - Product name
  - Variant options
  - Quantity
  - Price
  - Status
- Show shipping address
- Show list of shipments:
  - Tracking number
  - Carrier
  - Items included
  - Status (shipped/delivered)
  - Estimated delivery date

## Order Status

### Order Item Status

WHEN an order item is created, THE system SHALL set status to "paid".

WHEN a seller ships an item, THE system SHALL change status to "shipped".

WHEN a customer confirms delivery of a shipment, THE system SHALL set all items in that shipment to "delivered".

WHEN a cancellation request is approved, THE system SHALL set item status to "cancelled".

WHEN a refund request is approved, THE system SHALL set item status to "refunded".

### Order Status Derivation

THE overall order status SHALL be computed by:

- IF all items are "paid" → "paid"
- IF one or more items are "shipped" and none are "delivered" → "shipped"
- IF all items are "delivered" → "delivered"
- IF all items are "cancelled" → "cancelled"
- IF all items are "refunded" → "refunded"
- IF mixture of statuses → "partially completed"

## Shipping and Tracking

### Shipment Concept

A SHIPMENT SHALL contain:

- One or more order items from the same seller
- Carrier name (e.g., "UPS", "FedEx", "DHL")
- Tracking number
- Ship date
- Delivery date (optional, if known)

Different sellers shall always have separate shipments, even for the same customer.

A seller may bundle multiple order items into a single shipment.

### Shipping Process

WHEN a seller prepares to ship, THE system SHALL:

- Allow viewing of order items with status "paid"
- Allow selection of multiple items assigned to same seller
- Allow entry of carrier name and tracking number

WHEN a shipment is created, THE system SHALL:

- Set status of all included order items to "shipped"
- Link item IDs to shipment
- Record timestamp, carrier, tracking number

### Delivery Confirmation

WHEN a customer views a shipment, THE system SHALL display:

- Carrier
- Tracking number
- Estimated delivery date
- Link to carrier tracking page

WHEN a customer confirms delivery of a shipment, THE system SHALL:

- Set status of all items within that shipment to "delivered"
- Record timestamp of customer confirmation

WHEN no confirmation is received, THE system SHALL:

- Automatically set items to "delivered" after 14 days from the shipping date
- Send a reminder email to customer at day 10

## Order Cancellation

WHEN a customer requests cancellation, THE system SHALL require:

- Item status to be "paid"
- Reason text field (min 10 characters)

WHEN a seller receives a cancellation request, THE system SHALL:

- Show request with reason and timestamp
- Allow approval or rejection
- Create a snapshot of request status before action

WHEN a cancellation is approved, THE system SHALL:

- Set order item status to "cancelled"
- Restore inventory via positive record (reason: "cancellation")
- Trigger refund to customer
- Update order status if applicable

WHEN a cancellation is rejected, THE system SHALL:

- Set request status to "rejected"
- Update snapshot
- Notify customer of rejection reason

WHEN all items in an order are cancelled, THE system SHALL set overall order status to "cancelled".

## Refund Requests

WHEN a customer requests a refund, THE system SHALL require:

- Order item status to be "delivered"
- Date of delivery must be within 7 days (from delivery date)
- Reason text field (min 10 characters)

WHEN a seller receives a refund request, THE system SHALL:

- Show request with reason and timestamp
- Allow approval or rejection
- Create a snapshot of request state

WHEN a refund is approved, THE system SHALL:

- Set order item status to "refunded"
- Restore inventory via positive record (reason: "refund")
- Process payment reversal via gateway
- Update order status if applicable

WHEN a refund is rejected, THE system SHALL:

- Set request status to "rejected"
- Update snapshot
- Notify customer with rejection reason

WHEN all items in an order are refunded, THE system SHALL set overall order status to "refunded".

## Reviews and Ratings

WHEN a customer writes a review, THE system SHALL require:

- Item status to be "delivered"
- Rating: integer 1 to 5 (required)
- Text content (optional, up to 2000 characters)

WHEN a customer submits a review, THE system SHALL:

- Verify customer has purchased that exact product variant in a completed order
- Allow only one review per product variant per customer
- Create an immutable snapshot

WHEN a customer edits a review, THE system SHALL:

- Allow modification of rating and text
- Create a new snapshot of previous state
- Keep original review visible in historical context

WHEN a customer deletes a review, THE system SHALL:

- Mark review as hidden from display
- Preserve all snapshot data
- Recalculate product average rating based on remaining non-deleted reviews

WHEN a product displays reviews, THE system SHALL:

- Show only non-deleted reviews
- Sort by created_at descending (newest first)
- Display rating as stars (half-star if needed)

THE system SHALL calculate average rating as:

- SUM of all non-deleted review ratings / total count of non-deleted reviews

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:

- Total number of active products
- Total number of order items (for all their products)
- Number of pending cancellation requests
- Number of pending refund requests

WHEN a seller views order items, THE system SHALL:

- Show a paginated list (20 items per page)
- Filter by status: paid, shipped, delivered, cancelled, refunded
- Show product name, variant, quantity, customer, order date, status

## Administrator System

### Becoming an Administrator

WHEN a user submits a request to become an administrator, THE system SHALL require:

- User ID
- Reason text (minimum 50 characters)

WHEN a super administrator reviews an administrator request, THE system SHALL:

- View list of pending requests with user details and reason
- Approve or reject request
- Create snapshot of decision
- Notify user via email

WHEN an administrator request is approved, THE system SHALL:

- Change user role to "regular administrator"
- Grant access to administrator functions
- Log access granted with timestamp and approver ID

### Administrator Grades

THERE ARE TWO ADMINISTRATOR GRADES:

- Regular administrator
- Super administrator

WHEN a super administrator promotes a regular administrator, THE system SHALL:

- Change the user role to "super administrator"
- Grant elevated permissions
- Record the promotion with timestamp and actor ID

WHEN a super administrator demotes another super administrator, THE system SHALL:

- Change role to "regular administrator"
- Remove elevated privileges
- Record the demotion
- Require password confirmation

WHEN a super administrator attempts to demote themselves, THE system SHALL:

- Prevent action
- Display error: "Super administrators cannot demote themselves"

### Seller Management

WHEN an administrator views pending seller approvals, THE system SHALL:

- Show list of sellers with status: pending
- Include registration date, email, and reason submitted

WHEN an administrator approves a seller, THE system SHALL:

- Change seller status to "approved"
- Send confirmation email
- Allow seller to list products

WHEN an administrator rejects a seller, THE system SHALL:

- Change seller status to "rejected"
- Require entry of rejection reason (min 20 characters)
- Send rejection email with reason

WHEN a seller is suspended by an administrator, THE system SHALL:

- Hide all products from search and category listings
- Block new product creation or editing
- Allow processing of existing orders (shipping, cancellation responses)
- Prevent new transactions
- Record suspension reason and timestamp

WHEN a seller is unsuspended, THE system SHALL:

- Restore product visibility
- Re-enable product editing and creation
- Remove suspension flag
- Record unsuspension with timestamp and actor ID

### Category Management

WHEN an administrator creates a category, THE system SHALL:

- Require name and description
- Assign to parent category (optional, one nesting level)

WHEN an administrator edits a category, THE system SHALL:

- Allow update of name and description
- Create a snapshot of previous state

WHEN an administrator deletes a category, THE system SHALL:

- Set all products in category to "uncategorized" (category_id = null)
- Preserve the category name and description in product snapshots
- Block deletion if there are subcategories

### Product Oversight

WHEN an administrator views all products, THE system SHALL:

- Show products across all sellers (including suspended)
- Filter by status: active, pending deletion, deleted
- Sort by creation date, name, seller

WHEN an administrator views snapshots of any product, THE system SHALL:

- Access all historical versions
- Compare differences between states

WHEN an administrator deletes a product, THE system SHALL:

- Remove product from platform
- Preserve product snapshots
- Notify sellers and affected customers
- Record deletion reason

### Order Oversight

WHEN an administrator views all orders, THE system SHALL:

- Show full order history across all users
- Filter by date, customer, seller, status

WHEN an administrator forces-cancel an order item, THE system SHALL:

- Set item status to "cancelled"
- Restore inventory
- Process refund
- Record admin action and reason

WHEN an administrator forces-refund an order item, THE system SHALL:

- Set item status to "refunded"
- Restore inventory
- Process refund
- Record admin action and reason

WHEN an administrator forces-cancel/forces-refund an entire order, THE system SHALL:

- Apply the action to all order items
- Restore all inventory
- Process full refund
- Record action and reason

### User Management

WHEN an administrator views customer accounts, THE system SHALL:

- Show full customer list: name, email, phone, registration date, last login

WHEN an administrator bans a customer, THE system SHALL:

- Set account status to "banned"
- Immediately invalidate all active sessions
- Prevent login
- Preserve all order history
- Record ban reason and timestamp

WHEN an administrator unbans a customer, THE system SHALL:

- Change status to "active"
- Re-enable login and features
- Record unban timestamp and actor ID

WHEN an administrator views seller accounts, THE system SHALL:

- Show full seller list: shop name, status (approved/suspended/rejected), email, registration date

WHEN an administrator bans a seller, THE system SHALL:

- Set account status to "banned"
- Immediately invalidate all active sessions
- Prevent login
- Preserve all order history and product snapshots
- Record ban reason and timestamp
- Automatically suspend the seller if not already

WHEN an administrator unbans a seller, THE system SHALL:

- Change status to "approved" or "pending" based on previous state
- Re-enable login
- Restore previous suspension status
- Record unban action and timestamp
