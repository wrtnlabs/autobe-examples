# E-Commerce Shopping Mall Platform

## Customer Account

WHEN a customer registers, THE system SHALL require an email address and password.

WHEN a customer logs in, THE system SHALL authenticate using the provided email and password.

WHEN a customer changes their password, THE system SHALL verify the current password before updating to the new password.

WHEN a customer deletes their account, THE system SHALL:
- Remove all profile information (email, password, display name, phone number)
- Preserve all order records and order history
- Preserve all reviews but display the reviewer as "deleted user"

THE system SHALL NOT allow deletion of a customer account if there are pending orders with status "paid" or "shipped".

## Customer Profile

WHEN a customer accesses their profile, THE system SHALL display their display name and phone number.

WHEN a customer edits their display name, THE system SHALL validate the name does not exceed 50 characters and contains no special characters other than spaces and hyphens.

WHEN a customer edits their phone number, THE system SHALL validate the number matches international format (e.g., +821012345678).

THE system SHALL update the profile information immediately after successful validation.

## Address Management

WHEN a customer adds a shipping address, THE system SHALL require: recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer updates a shipping address, THE system SHALL preserve the previous address state in a snapshot.

WHEN a customer deletes a shipping address, THE system SHALL:
- Remove the address from the customer's address list
- Preserve the address in order snapshots for historical accuracy

WHEN a customer sets an address as default, THE system SHALL:
- Mark the selected address as default
- Remove the default flag from all other addresses
- Ensure at least one address remains if this is the only address

THE system SHALL ensure the default address is automatically selected during checkout if no other selection is made.

## Seller Account

WHEN a seller registers, THE system SHALL require an email address and password.

WHEN a seller logs in, THE system SHALL authenticate using the provided email and password.

WHEN a seller changes their password, THE system SHALL verify the current password before updating to the new password.

WHEN a seller submits a registration request, THE system SHALL set their status to "pending".

WHEN an administrator approves a seller, THE system SHALL:
- Change the seller's status to "approved"
- Send a notification to the seller
- Allow the seller to create products

WHEN an administrator rejects a seller, THE system SHALL:
- Change the seller's status to "rejected"
- Record the reason for rejection
- Send a notification with the rejection reason

WHEN a rejected seller submits a new registration request, THE system SHALL:
- Reset the status to "pending"
- Clear the previous rejection reason
- Set the new registration date

WHEN a seller deletes their account, THE system SHALL verify:
- No pending orders (status "paid" or "shipped") exist
- No pending cancellation or refund requests exist

THE system SHALL delete the following when a seller account is deleted:
- Seller profile (shop name, description, logo)
- All products owned by the seller
- All inventory records for the seller's products

THE system SHALL preserve the following when a seller account is deleted:
- Order history (including snapshots)
- Seller shop name in past orders
- All snapshots of seller profile, products, and variants

## Seller Profile

WHEN a seller edits their shop name, THE system SHALL:
- Validate that the name contains 1-100 characters
- Update the current profile
- Create and store a snapshot of the previous shop name

WHEN a seller edits their shop description, THE system SHALL:
- Allow up to 500 characters
- Update the current description
- Create and store a snapshot of the previous description

WHEN a seller updates their logo image, THE system SHALL:
- Accept only JPG, PNG, or WEBP formats
- Limit file size to 5MB
- Update the current logo
- Create and store a snapshot of the previous logo

WHEN a customer views a seller profile, THE system SHALL display the current shop name, description, and logo.

THE system SHALL allow customers to view all previous versions of a seller's profile via snapshots.

## Categories

WHEN an administrator creates a category, THE system SHALL require:
- A unique name (1-50 characters)
- A description (optional, up to 500 characters)

WHEN an administrator creates a subcategory, THE system SHALL require:
- A unique name (1-50 characters)
- A description (optional, up to 500 characters)
- Exactly one parent category

WHEN an administrator edits a category name or description, THE system SHALL:
- Allow edits if the category has no subcategories
- Preserve the previous state in a snapshot
- Update the category fields

WHEN an administrator deletes a category, THE system SHALL:
- Set all associated products to "uncategorized"
- Preserve the category in a snapshot
- Prevent deletion if subcategories exist

WHEN a customer browses categories, THE system SHALL display:
- All top-level categories
- Each category's subcategories (one level deep)
- Category name and description

WHEN a customer clicks a category, THE system SHALL display all products within that category (including subcategories).

## Snapshot Principle

WHEN any editable data is modified, THE system SHALL create an immutable snapshot that records:
- Timestamp of change
- User who performed the change
- Type of entity changed
- Before state (full snapshot of all fields)
- After state (full snapshot of all fields)

SNAPSHOTS SHALL be preserved for:
- Products (name, description, category, base price, images)
- Product variants (SKU code, option values, price)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, seller profile at time of purchase)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

PRODUCT SNAPSHOTS SHALL include:
- Product fields: name, description, category, base price, images
- All variant snapshots at that moment (product-snapshot → product-snapshot-SKU)

SNAPSHOTS SHALL be immutable and non-deletable.

SNAPSHOTS SHALL be accessible to:
- Owners of the data
- Administrators for dispute resolution
- Customers for historical reference

THE system SHALL provide a version history UI to view snapshot timelines for all tracked entities.

## Products

WHEN a seller creates a product, THE system SHALL require:
- A name (1-100 characters, required)
- A description (required, 50-1000 characters)
- A category (required, must be an existing category)
- A base price (required, must be ≥ 0.01)

WHEN a product is created, THE system SHALL assign the seller as the owner.

WHEN a seller edits a product, THE system SHALL:
- Validate all fields meet requirements
- Create a snapshot of the product's previous state
- Update the product with new values
- Include all images in the snapshot

WHEN a seller deletes a product, THE system SHALL verify:
- No order items exist with status "paid" or "shipped" for any variant
- No pending cancellation or refund requests exist for any variant

WHEN a product is deleted, THE system SHALL:
- Remove the product from search results and category listings
- Delete all variants and inventory records
- Preserve all snapshots of the product and its variants

WHEN a seller views a product, THE system SHALL display the current version and allow access to all snapshots.

WHEN an administrator views any product, THE system SHALL display the current version and all snapshots.

## Product Images

WHEN a seller uploads an image, THE system SHALL:
- Accept only JPG, PNG, or WEBP formats
- Limit file size to 10MB per image
- Generate a unique filename
- Add the image to the product's image list

WHEN a seller reorders images, THE system SHALL:
- Update the display order
- Make the first image the main/thumbnail image
- Preserve the previous order in a snapshot

WHEN a seller deletes an image, THE system SHALL:
- Remove the image from the product
- Preserve the image in the product snapshot

WHEN an image changes, THE system SHALL include the change in the next product snapshot.

## Product Variants (SKU)

WHEN a seller adds a variant to a product, THE system SHALL require:
- A unique SKU code (1-50 alphanumeric characters)
- At least one option value (e.g., color: "Red", size: "Large")
- Stock quantity ≥ 0

WHEN a seller edits a variant, THE system SHALL:
- Validate the SKU code is unique across the product
- Validate option values match the product's option schema
- Create a snapshot of the previous variant state
- Update the variant fields

WHEN a seller deletes a variant, THE system SHALL verify:
- No order items exist with status "paid" or "shipped" for this variant
- No pending cancellation or refund requests exist for this variant

WHEN a product has no variants, THE system SHALL:
- Display the product as "unavailable" in search and category listings
- Prevent addition to cart

A product SHALL have at least one variant to be purchasable.

## Inventory Management

WHEN inventory is added (restock), THE system SHALL:
- Require a positive quantity
- Require a reason (e.g., "Supplier delivery", "Manual adjustment")
- Create an inventory history record with timestamp, increase, and reason

WHEN inventory is subtracted (adjustment/loss), THE system SHALL:
- Require a negative quantity
- Require a reason (e.g., "Damage", "Theft")
- Create an inventory history record with timestamp, decrease, and reason

WHEN an order is placed, THE system SHALL:
- For each purchased variant, create a negative inventory record with reason "order fulfillment"

WHEN an order is canceled or refunded, THE system SHALL:
- For each canceled/refunded variant, create a positive inventory record with reason "cancellation" or "refund"

THE system SHALL calculate current stock by summing all inventory records for each variant.

WHEN a variant's stock reaches zero, THE system SHALL:
- Display status as "out of stock"
- Prevent addition to cart

WHEN an inventory record is created, THE system SHALL preserve it with immutable timestamp, quantity change, reason, and variant reference.

SELLERS SHALL be able to view full inventory history for each variant.

## Product Search

WHEN a customer searches for products by name, THE system SHALL:
- Match partial names case-insensitively
- Return results from all sellers
- Show products regardless of seller status (except banned)

WHEN a customer filters search results, THE system SHALL support:
- Category filtering (top-level and subcategories)
- Price range filtering (min and max values)
- In-stock only filter (hide variants with stock = 0)

WHEN a customer sorts search results, THE system SHALL support:
- Newest first (by product creation date)
- Price (low to high)
- Price (high to low)

SEARCH RESULTS SHALL be paginated with 12 items per page.

## Product Listing

WHEN displaying product listings (search or category), THE system SHALL show for each product:
- Main image (thumbnail of first image)
- Product name
- Base price if single variant; price range if multiple variants
- Seller shop name
- Average rating (calculated from all non-deleted reviews)

THE system SHALL link the seller shop name to the seller's profile.

## Product Detail Page

WHEN viewing a product detail page, THE system SHALL display:
- All images in order (first image as primary)
- Product name and description
- Category path (parent and subcategory)
- Seller shop name (linked to seller profile)
- All available variants with:
  - Option values (e.g., Color: Red, Size: Large)
  - SKU code
  - Price (if overrides base price)
  - Stock status (in-stock, out-of-stock)
- Average rating and total review count
- All reviews sorted by newest first
- "Add to cart" button for each variant with stock > 0

THE system SHALL prevent "Add to cart" for out-of-stock variants.

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Store the product ID and customer ID
- Allow only one entry per product per customer

WHEN a customer views their wishlist, THE system SHALL:
- Display all products in the wishlist
- Show product name, main image, seller, and base price
- Paginate results (12 items per page)

WHEN a customer removes a product from their wishlist, THE system SHALL delete the wishlist entry.

WHEN a product is deleted by the seller, THE system SHALL:
- Automatically remove the product from all wishlists
- Preserve the wishlist record with deleted status

## Shopping Cart

WHEN a customer adds a variant to cart, THE system SHALL:
- Require selection of a specific variant
- Specify quantity ≥ 1
- Validate that variant is in stock and available

WHEN a customer adds a variant already in cart, THE system SHALL:
- Increase the quantity of that existing cart item
- NOT create a new cart line item

WHEN a customer views their cart, THE system SHALL display each item with:
- Product name
- Variant options
- Price per unit
- Quantity
- Subtotal price

WHEN a customer changes the quantity of an item, THE system SHALL:
- Validate that the new quantity ≤ available stock
- Recalculate subtotal
- Update cart

WHEN a customer removes an item from cart, THE system SHALL delete the cart item.

WHEN a customer views cart total, THE system SHALL display:
- Sum of all subtotal prices

WHEN a variant's stock drops below its cart quantity, THE system SHALL:
- Display a warning: "Only X remaining in stock"
- Allow checkout with current quantity

WHEN a variant is deleted or out of stock, THE system SHALL:
- Mark the cart item as "unavailable"
- Prevent checkout for that item
- Allow other items in cart to proceed

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL:
- Validate all cart items are available (not unavailable)
- Require the customer to select a shipping address (or use default)
- Display order summary with:
  - List of items with quantity and price
  - Selected shipping address
  - Total price

WHEN a customer confirms the order, THE system SHALL proceed to payment.

THE system SHALL lock the shipping address upon order placement.

## Payment

WHEN a customer places an order, THE system SHALL:
- Invoke external payment gateway with order amount
- Track payment status (success/failure)

WHEN payment fails, THE system SHALL:
- Cancel the order creation
- Preserve cart content
- Show error message: "Payment failed. Please try again."
- Allow retry

WHEN payment succeeds, THE system SHALL:
- Create the order
- Remove items from cart
- Proceed to order fulfillment

## Order Creation

WHEN an order is successfully created, THE system SHALL:
- Decrease stock quantities for each purchased variant via inventory record (negative)
- Remove cart items
- Create a new order record
- For each purchased variant:
  - Create an order item with status "paid"
  - Create a snapshot of the product and variant at time of purchase
  - Create a snapshot of the seller's profile at time of purchase

## Order Structure

An order SHALL contain one or more order items.

Each order item SHALL represent:
- A purchased product variant
- A quantity
- A unique ID
- Status
- Snapshot reference
- Seller ID

IF a customer buys 3 of the same variant, THE system SHALL create one order item with quantity 3.

Order items MAY be from different sellers.

Each order item SHALL have its own status, cancellation, and refund lifecycle.

## Order History

WHEN a customer views their order history, THE system SHALL:
- Display list of all past orders
- Sort by newest first
- Paginate results (10 orders per page)

EACH ORDER IN THE LIST SHALL show:
- Order number
- Date of creation
- Total price
- Overall order status

WHEN a customer views full order details, THE system SHALL display:
- List of order items with:
  - Product name
  - Variant options
  - Quantity
  - Price
  - Item status
- Shipping address
- List of shipments with:
  - Carrier name
  - Tracking number
  - Items included
  - Delivery status

## Order Status

### Order Item Status

Order item status SHALL be one of:
- "paid": payment completed, waiting for seller to ship
- "shipped": seller has shipped the item
- "delivered": item has been delivered
- "cancelled": item was cancelled
- "refunded": item was refunded

### Order Status

The overall order status SHALL be derived from its items:

WHEN all items are paid → order status "paid"
WHEN any item is shipped and no item is delivered → order status "shipped"
WHEN all items are delivered → order status "delivered"
WHEN all items are cancelled → order status "cancelled"
WHEN all items are refunded → order status "refunded"
WHEN mixed states exist (e.g., some delivered, some refunded) → order status "partially completed"

## Shipping and Tracking

### Shipment Concept

A shipment SHALL be a package sent by a seller.

A shipment SHALL contain one or more order items from the same seller.

A shipment SHALL not contain order items from different sellers.

A seller MAY ship items individually or bundle multiple items into one shipment.

### Shipping Process

WHEN a seller prepares to ship, THE system SHALL:
- Display all of their order items with status "paid"
- Allow seller to select one or more items for inclusion in a shipment

WHEN a seller creates a shipment, THE system SHALL:
- Require carrier name (text)
- Require tracking number (text)
- Change status of all selected items to "shipped"
- Record shipment metadata (carrier, tracking number, timestamp)
- Associate shipment with all selected order items
- Preserve the shipment in a snapshot

### Delivery Confirmation

WHEN a customer views a shipment, THE system SHALL display:
- Carrier name
- Tracking number
- Delivery estimate

WHEN a customer confirms delivery of a shipment, THE system SHALL:
- Change status of all items in that shipment to "delivered"
- Record the delivery confirmation timestamp

WHEN a customer does not confirm delivery, THE system SHALL:
- Automatically change the status of items to "delivered" after 14 days of shipping

## Order Cancellation

WHEN a customer requests cancellation of an order item, THE system SHALL:
- Allow only if item status is "paid"
- Require a reason (text, 10-500 characters)
- Set the request status to "pending"
- Store the request with timestamp

WHEN a seller responds to a cancellation request, THE system SHALL:
- Allow approval or rejection
- Record the seller's response and timestamp
- Create a snapshot of the cancellation request state

WHEN a cancellation request is approved, THE system SHALL:
- Change the item status to "cancelled"
- Restore stock quantity via inventory record (positive)
- Create a refund process (if payment was processed)
- Preserve the request and response in a snapshot

WHEN a cancellation request is rejected, THE system SHALL:
- Change the request status to "rejected"
- Notify the customer
- Preserve the request and response in a snapshot

WHEN all items in an order are cancelled, THE system SHALL set the order status to "cancelled".

## Refund Requests

WHEN a customer requests a refund of an order item, THE system SHALL:
- Allow only if item status is "delivered"
- Require reason (text, 10-500 characters)
- Ensure request is made within 7 days of "delivered" date
- Set the request status to "pending"
- Store the request with timestamp

WHEN a seller responds to a refund request, THE system SHALL:
- Allow approval or rejection
- Record the seller's response and timestamp
- Create a snapshot of the refund request state

WHEN a refund request is approved, THE system SHALL:
- Change the item status to "refunded"
- Restore stock quantity via inventory record (positive)
- Initiate payment refund to customer
- Preserve the request and response in a snapshot

WHEN a refund request is rejected, THE system SHALL:
- Change the request status to "rejected"
- Notify the customer
- Preserve the request and response in a snapshot

WHEN all items in an order are refunded, THE system SHALL set the order status to "refunded".

## Reviews and Ratings

WHEN a customer writes a review, THE system SHALL:
- Allow only if the item has status "delivered"
- Require rating (1-5 stars)
- Allow optional text content (up to 2000 characters)

WHEN a customer edits a review, THE system SHALL:
- Update the text and/or rating
- Create a snapshot of the previous review state

WHEN a customer deletes a review, THE system SHALL:
- Hide the review from display
- Preserve the review data and snapshot
- Recalculate the product's average rating excluding deleted reviews

WHEN a customer views a product's reviews, THE system SHALL:
- Display all non-deleted reviews
- Sort by newest first
- Show rating (stars) and text

WHEN calculating a product's average rating, THE system SHALL:
- Include only non-deleted reviews
- Calculate average of all ratings (1-5)
- Round to one decimal place

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:
- Total number of products
- Total number of order items (for their products)
- Number of pending cancellation requests
- Number of pending refund requests

WHEN a seller views their order items, THE system SHALL:
- Display all order items for their products
- Support filtering by status (paid, shipped, delivered, cancelled, refunded)
- Sort by newest first
- Paginate results (20 items per page)

## Administrator System

### Administrator Role

WHEN a user submits a request to become an administrator, THE system SHALL:
- Store the request with user ID, reason, and timestamp
- Set status to "pending"
- Notify super administrators

WHEN a super administrator reviews a request, THE system SHALL:
- Approve or reject the request
- Record approval/rejection decision and timestamp
- Notify the user
- If approved:
  - Set the user's role to "administrator"
  - Record the promotion timestamp

WHEN a super administrator promotes a regular administrator, THE system SHALL:
- Change the role to "super administrator"
- Record the promotion timestamp

WHEN a super administrator demotes a super administrator, THE system SHALL:
- Change the role to "administrator"
- Record the demotion timestamp
- Prevent demotion of themselves

### Seller Management

WHEN an administrator views pending seller approvals, THE system SHALL:
- Display all sellers with status "pending"
- Show email, shop name, registration date, and reason for registration

WHEN an administrator approves a seller, THE system SHALL:
- Change seller status to "approved"
- Send email notification
- Create a snapshot of the seller's profile

WHEN an administrator rejects a seller, THE system SHALL:
- Change seller status to "rejected"
- Require rejection reason (text)
- Send notification with reason
- Create a snapshot of the seller's profile at rejection time

WHEN a seller's account is suspended, THE system SHALL:
- Hide all products from search and category listings
- Block new product creation and edits
- Allow existing order processing (shipping, cancellation, refund responses)
- Record suspension reason and timestamp
- Create a snapshot of the seller's product visibility state

WHEN a suspended seller account is unsuspended, THE system SHALL:
- Restore visibility of all products
- Allow product creation and editing
- Record unsuspension timestamp
- Create a snapshot of the seller's profile restoration

### Category Management

WHEN an administrator creates a category, THE system SHALL:
- Require name (1-50 characters, unique)
- Require description (optional, up to 500 characters)
- Assign to parent category if subcategory
- Create a snapshot of category creation

WHEN an administrator edits a category, THE system SHALL:
- Allow editing of name and description
- Require name uniqueness
- Create a snapshot of the previous state

WHEN an administrator deletes a category, THE system SHALL:
- Set all products in category to "uncategorized"
- Preserve category in snapshot
- Prevent deletion if subcategories exist

### Product Oversight

WHEN an administrator views all products, THE system SHALL:
- Display all products with name, seller, category, status, creation date
- Allow filtering by seller, category, status

WHEN an administrator views product snapshots, THE system SHALL:
- Access full snapshot history of any product
- Display before/after values with timestamp and actor

WHEN an administrator deletes a product, THE system SHALL:
- Remove from search and category listings
- Delete all variants and inventory records
- Preserve all snapshots
- Create a snapshot of the deletion action

### Order Oversight

WHEN an administrator views all orders, THE system SHALL:
- Display order number, customer, total, status, date
- Allow filtering by customer, seller, date range

WHEN an administrator forces cancellation of an order item, THE system SHALL:
- Change status to "cancelled"
- Restore stock quantity via inventory record
- Create snapshot of action and before state
- Notify customer and seller

WHEN an administrator forces refund of an order item, THE system SHALL:
- Change status to "refunded"
- Restore stock quantity via inventory record
- Initiate refund to customer
- Create snapshot of action and before state
- Notify customer and seller

WHEN an administrator forces cancellation of an entire order, THE system SHALL:
- Cancel all items individually
- Restore all stock quantities
- Set order status to "cancelled"
- Create snapshot of action

WHEN an administrator forces refund of an entire order, THE system SHALL:
- Refund all items individually
- Restore all stock quantities
- Set order status to "refunded"
- Create snapshot of action

### User Management

WHEN an administrator views all customer accounts, THE system SHALL:
- Display email, registration date, profile status, last login
- Allow filtering by ban status

WHEN an administrator bans a customer, THE system SHALL:
- Prevent login
- Record ban timestamp and reason
- Preserve all past orders, reviews, and wishlists
- Create a snapshot of account state

WHEN an administrator unbans a customer, THE system SHALL:
- Restore login access
- Record unban timestamp
- Create a snapshot of account restoration

WHEN an administrator views all seller accounts, THE system SHALL:
- Display shop name, registration status, suspend status, last activity

WHEN an administrator bans a seller, THE system SHALL:
- Prevent login
- Record ban timestamp and reason
- Preserve all order history and snapshots
- Create a snapshot of account state

WHEN an administrator unbans a seller, THE system SHALL:
- Restore login access
- Record unban timestamp
- Create a snapshot of account restoration

### Snapshot Principle Integration

WHEN any administrator action modifies:
- Seller status
- Product status
- Order status
- User ban status
- Category deletion
- Order cancellation/refund override

THE system SHALL create a snapshot of the object before modification.

SNAPSHOTS SHALL include:
- Timestamp
- Admin ID performing action
- Action type (e.g., "admin_approve_seller", "admin_delete_product")
- Before state (full JSON)
- After state (full JSON)

SNAPSHOTS SHALL be immutable and non-deletable.

SNAPSHOTS SHALL be accessible only to administrators.

THE system SHALL allow administrators to browse snapshot history for any entity they have oversight over.

THE system SHALL provide audit logs listing all administrator actions with timestamps and affected entities.