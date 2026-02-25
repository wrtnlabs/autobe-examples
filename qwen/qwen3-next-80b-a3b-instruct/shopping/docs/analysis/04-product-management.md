# E-Commerce Shopping Mall Platform Requirements Specification

## Customer Account

WHEN a customer attempts to register, THE system SHALL require email address and password, with validation for email format and password strength (minimum 8 characters, containing at least one number and one special character).

WHEN a customer attempts to log in, THE system SHALL validate email and password credentials against stored hash, then issue a JWT access token with 30-minute expiration and a refresh token with 30-day expiration.

WHEN a customer changes their password, THE system SHALL require the current password for authentication and generate a new JWT token.

WHEN a customer deletes their account, THE system SHALL:
- Immediately invalidate all active sessions
- Delete the customer's profile data (display name, phone number, and all addresses)
- Preserve all order history, snapshots, and review content for legal and audit purposes
- Display "deleted user" in place of their display name on all reviews and order histories
- Not delete the customer's user ID or account records for referential integrity

WHERE a customer's account is deleted, THE system SHALL preserve their order items, reviews, and associated snapshots indefinitely.

## Customer Profile

WHEN a customer edits their display name, THE system SHALL update the display name field in their profile and propagate the change to all future reviews and order histories.

WHEN a customer edits their phone number, THE system SHALL:
- Validate the format using country-specific patterns
- Normalize to E.164 international format
- Update the phone number field in their profile
- Not create a snapshot, as profile changes are not subject to the immutable snapshot principle
- Log the change timestamp and user ID for audit purposes

WHERE a customer's display name or phone number has been modified, THE system SHALL maintain historical records only for audit, not for business logic.

## Address Management

WHEN a customer adds a new shipping address, THE system SHALL require all of the following fields:
- Recipient name (minimum 2 characters, maximum 100)
- Phone number (E.164 format validation)
- Street address (minimum 5 characters, maximum 255)
- City (minimum 2 characters, maximum 100)
- State/province (minimum 2 characters, maximum 100)
- Postal code (valid for selected country)
- Country (ISO 3166-1 alpha-2 code)

WHEN a customer edits an existing address, THE system SHALL:
- Preserve the original address data in an address snapshot
- Update the current address with the new values
- Maintain the original address record for historical reference
- Update the modified timestamp and record the actor ID

WHEN a customer deletes an address, THE system SHALL:
- Mark the address as inactive in the active address list
- Preserve the address data in an immutable address snapshot
- Prevent deletion of the default address if it is the only remaining address
- Automatically reassign the default flag to the first active address if the default is deleted

WHEN a customer sets an address as default, THE system SHALL:
- Update the default flag on the selected address to true
- Set the previous default address's default flag to false
- Save timestamps for address updates
- Preserve all previous default assignments in audit logs

WHERE a customer's default address is deleted, THE system SHALL:
- Automatically select the first active address as the new default
- Notify the customer of the automatic change

## Seller Account

WHEN a seller attempts to register, THE system SHALL:
- Require email address and password with the same validation as customer registration
- Set the registration status to "pending"
- Record the registration timestamp
- Send an automated confirmation email

WHEN a seller attempts to log in, THE system SHALL:
- Validate email and password credentials against the stored hash
- Confirm account status is either "approved" or, if pending, deny login with "account under review" message
- Issue a JWT access token with 30-minute expiration and refresh token with 30-day expiration
- Log successful logins and failed attempts

WHEN a seller changes their password, THE system SHALL:
- Require current password for authentication
- Apply the same validation rules as customer password changes
- Generate a new JWT access and refresh token

WHEN an administrator approves a seller registration, THE system SHALL:
- Update the seller's account status to "approved"
- Send confirmation email
- Enable product listing functionality

WHEN an administrator rejects a seller registration, THE system SHALL:
- Update the seller's account status to "rejected"
- Record the rejection reason provided by the administrator
- Send an email notification to the seller with the rejection reason
- Allow the seller to resubmit a new registration request

WHEN a seller attempts to delete their account, THE system SHALL:
- Validate that they have no order items with status "paid" or "shipped"
- Validate that they have no pending cancellation requests
- Validate that they have no pending refund requests
- If any condition fails, reject the deletion with specific error message
- If all conditions pass, delete the seller profile (shop name, description, logo)
- Preserve all seller snapshots, order history, and product snapshots
- Preserve the seller's shop name in past order histories
- Set the seller account status to "deleted"

WHERE a seller's account is deleted, THE system SHALL preserve all order data, product snapshots, and seller profile snapshots associated with that seller indefinitely.

## Seller Profile

WHEN a seller updates their shop name, THE system SHALL:
- Create a seller profile snapshot with the old shop name
- Update the current shop name with the new value
- Record the timestamp and actor ID
- Preserve the snapshot for the lifetime of the platform

WHEN a seller updates their shop description, THE system SHALL:
- Create a seller profile snapshot with the old description
- Update the current description with the new value
- Record the timestamp and actor ID
- Preserve the snapshot for the lifetime of the platform

WHEN a seller updates their logo image, THE system SHALL:
- Verify the uploaded file is a valid image format (JPEG, PNG, WebP) and under 5MB
- Store the image in immutable storage with UUID filename
- Create a seller profile snapshot with the previous logo URL
- Update the current logo URL with the new image URL
- Record the timestamp and actor ID
- Preserve the snapshot for the lifetime of the platform

WHEN a customer views a seller profile, THE system SHALL:
- Display the current shop name, description, and logo
- Provide access to the complete snapshot history of the seller profile
- Display the timestamp and reason for each profile change

WHERE a seller profile is edited, THE system SHALL preserve all previous versions as immutable snapshots, with each snapshot containing:
- Shop name
- Shop description
- Logo URL
- Creation timestamp
- Last modified timestamp
- Modification timestamp
- Actor ID

## Categories

WHEN an administrator creates a category, THE system SHALL:
- Require category name (minimum 2 characters, maximum 100)
- Require category description (maximum 500 characters)
- Accept optional parent category ID for nesting
- Generate unique category ID
- Set creation timestamp
- Activate the category

WHEN an administrator edits a category, THE system SHALL:
- Allow updating of category name and description
- Record edit timestamp
- Create a category snapshot preserving the previous values
- Prevent changing the parent category if the category already contains products

WHEN an administrator deletes a category, THE system SHALL:
- Mark the category as deleted in the database
- Set all products directly assigned to this category to "uncategorized"
- Preserve the category name and history in immutable snapshot
- Allow reuse of the category name in future creations

WHEN a customer browses categories, THE system SHALL:
- Display all active categories and their subcategories in hierarchical format
- Only show categories that have at least one active product
- Show category name and description
- Prevent navigation to deleted or inactive categories

WHEN a customer views products in a category, THE system SHALL:
- Include products in all subcategories of the selected category
- Filter out deleted products
- Sort products by newest first by default

## Snapshot Principle

WHEN any immutable entity is modified, THE system SHALL create a snapshot before applying changes.

THE snapshot SHALL contain:
- The complete state of the entity at the moment of change
- Timestamp of snapshot creation
- User ID of the actor who made the change
- Action type (create, update, delete)
- Unique snapshot ID (UUID)
- Version number (incrementing integer)
- Entity reference ID

ALL snapshots SHALL be:
- Immutable and non-deletable
- Time-stamped with UTC precision
- Associated with the modifying actor
- Accessible to owners, administrators, and parties involved in transactions
- Preserved for the entire lifetime of the application

THE snapshot principle SHALL be enforced for:
- Products (name, description, category, base price, images)
- Product variants (SKU code, options, price, stock)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, seller profile at time of purchase)
- Reviews (rating, text)
- Cancellation requests (status, reason)
- Refund requests (status, reason)

WHEN any snapshot is retrieved by an authorized actor, THE system SHALL:
- Display the exact state of the entity at the time of the snapshot
- Show the before and after values side by side (if edit)
- Indicate the timestamp and actor responsible for the change
- Prevent any editing or deletion of snapshot data

## Products

WHEN a seller creates a new product, THE system SHALL require the following mandatory fields:
- Product name (minimum 3 characters, maximum 200)
- Product description (minimum 10 characters, maximum 5,000)
- Category (must be an active category or subcategory)
- Base price (positive number, maximum 2 decimal places)

WHEN a seller edits any product field (name, description, category, base price), THE system SHALL:
- Create a product snapshot containing the previous values of all product fields
- Update the product with the new values
- Preserve the old snapshot unchanged

WHEN a seller deletes their product, THE system SHALL:
- Validate that no order items exist with status "paid" or "shipped" for any variant
- Validate that no pending cancellation or refund requests exist for any variant
- If validation fails, reject deletion with specific reason
- If validation passes:
  - Mark the product as logically deleted
  - Remove from search and category listings
  - Preserve all product snapshots
  - Preserve all associated order items and snapshots
  - Prevent any further edits or sales

WHILE a product is modified, THE system SHALL:
- Lock the product during the transaction
- Apply changes atomically
- Maintain referential integrity with categories and variants

## Product Images

WHEN a seller uploads an image for a product, THE system SHALL:
- Accept only JPEG, PNG, or WebP formats
- Validate file size ≤ 10MB
- Generate unique UUID-based filename
- Store in immutable object storage
- Capture image metadata: dimensions, creation date, file size
- Record in database with:
  - Image ID (UUID)
  - Product ID
  - URL path
  - File size
  - File type
  - Width, height (pixels)
  - Creation timestamp
  - Sort order (0)

WHEN a seller reorders product images, THE system SHALL:
- Update the sort order of each image
- Create a product snapshot with the new image order
- Record the actor ID and timestamp
- Preserve the previous order in the snapshot

WHEN a seller deletes a product image, THE system SHALL:
- Remove the image reference from the active product image list
- Create a product snapshot with the updated image list
- Preserve the image file in storage (not deleted)
- Prevent the image from appearing in public views
- Record actor ID and timestamp

IF a product has no images, THE system SHALL display a default placeholder image on all listings and detail pages.

## Product Variants (SKU)

WHEN a seller creates a new product variant, THE system SHALL require:
- SKU code (alphanumeric, 3-20 characters, unique across all variants)
- At least one option value (name-value pair, non-empty strings)
- Stock quantity ≥ 0
- Optional price override (≥ 0, must be numeric with max 2 decimal places)

WHEN a seller edits an existing variant's SKU code, option values, or price, THE system SHALL:
- Create a product-snapshot-SKV record with the previous values
- Update the live variant with new values
- Record modification timestamp and actor ID
- Enforce global SKU uniqueness

WHEN a seller deletes a variant, THE system SHALL:
- Validate that no order items exist with status "paid" or "shipped" for this variant
- Validate that no pending cancellation or refund requests exist for this variant
- If validation fails, reject deletion with specific error
- If validation passes:
  - Create a product-snapshot-SKV snapshot with all values at time of deletion
  - Mark variant as deleted in active state
  - Preserve the snapshot indefinitely

IF a product has zero variants, THE system SHALL display the product in search and listings as "Unavailable" and prevent purchase.

WHEN a variant's stock reaches 0, THE system SHALL display "Out of Stock" on product detail and listing pages.

## Inventory Management

WHEN a seller restocks a variant, THE system SHALL:
- Record a positive inventory change
- Record reason for restock (text field, mandatory)
- Record timestamp and seller ID
- Update the variant's current stock (calculated as sum of all inventory records)
- Not create a snapshot—inventory changes are tracked as history events, not immutable snapshots

WHEN a seller adjusts inventory downward (loss, damage, etc.), THE system SHALL:
- Record a negative inventory change
- Record reason (text field, mandatory)
- Record timestamp and seller ID
- Update the variant's current stock
- Not create a snapshot

WHEN an order is successfully placed, THE system SHALL:
- Create a negative inventory record for each purchased variant
- Reduce the stock quantity by the purchased quantity
- Record the order ID as the reason
- Set timestamp to order creation time

WHEN an order item is cancelled or refunded, THE system SHALL:
- Create a positive inventory record for the variant
- Increase the stock quantity by the refunded quantity
- Record the cancellation/refund request ID as the reason
- Set timestamp to approval time

WHEN a seller views inventory history, THE system SHALL:
- Display all records chronologically
- Show quantity change, reason, timestamp, and associated ID (order, cancellation, refund)
- Allow filtering by date range and reason
- Calculate and display current stock as sum of all records

WHEN stock reaches 0, THE system SHALL:
- Display "Out of Stock" on product detail and listing views
- Prevent the variant from being added to shopping cart

WHEN a variant's stock is above 0, THE system SHALL:
- Display "In Stock" on product detail and listing views
- Allow the variant to be added to cart

## Product Search

WHEN a customer performs a product search, THE system SHALL:
- Search product names and variant option values for keyword matches
- Return products from all active sellers
- Sort by newest first (product creation timestamp) by default
- Apply category filters (including subcategories)
- Apply price range filters
- Apply "in-stock only" filter
- Support pagination (20 items per page)

WHEN applying price range filter, THE system SHALL:
- Use variant price if available
- Use base price if no variants exist
- For products with multiple variants, use:
  - Minimum variant price as the lower bound
  - Maximum variant price as the upper bound
- Filter products where min variant price > max search price
- Filter products where max variant price < min search price

WHEN applying "in-stock only" filter, THE system SHALL:
- Only return products with at least one variant having stock > 0
- Exclude products where all variants have stock = 0
- Include products with mixed stock status (some variants in stock, some out)

WHEN sorting by price (low to high), THE system SHALL:
- Sort by lowest variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by product creation timestamp (newest first)

WHEN sorting by price (high to low), THE system SHALL:
- Sort by highest variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by product creation timestamp (newest first)

WHEN sorting by newest first, THE system SHALL:
- Sort by product creation timestamp (most recent first)
- Secondary sort by product name
- Tertiary sort by lowest variant price

WHEN a search returns results, THE system SHALL:
- Response time ≤ 1.5 seconds for 95% of queries
- Use optimized indexing on product names and variant options
- Support stemming ("shoe" matches "shoes")
- Ignore case sensitivity
- Allow partial word matching

## Product Listing

WHEN a customer views product listings (search results or category page), THE system SHALL display each product with:
- Main image (first image in list)
- Product name (current)
- Price range:
  - If variants exist: "min: $X, max: $Y"
  - If no variants: "Unavailable"
  - If single variant: display that variant's price
- Seller shop name (current)
- Average rating (rounded to one decimal place) from non-deleted reviews
- Total review count (non-deleted reviews)
- Stock status: "In Stock" if any variant stock > 0, "Out of Stock" otherwise

WHEN rendering product listings, THE system SHALL:
- Use only the current version of product name, description, category, seller shop name
- Calculate average rating from non-deleted reviews only
- Calculate stock status from current variant levels
- Exclude products with status "deleted"
- Use indexed data for fast price and rating calculations

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:
- All product images in saved order
- Current product name
- Current product description
- Current category path
- Link to seller profile with current shop name
- All available variants with:
  - SKU code
  - Option values
  - Price (variant price or base price if no override)
  - Stock status ("In Stock" or "Out of Stock")
- Average rating (rounded to one decimal place)
- Total review count
- All non-deleted reviews sorted by newest first

WHEN viewing the product detail page, THE system SHALL:
- Use current data for all fields (name, description, category, seller name)
- Show all variants regardless of stock status
- Display stock status dynamically
- Maintain exact image order
- Load reviews from non-deleted customers only

WHERE a variant's stock changes after page load, THE system SHALL update stock status in real-time without reloading page.

WHEN a customer selects a variant on the detail page for cart addition, THE system SHALL:
- Use the variant's price (not base price)
- Validate availability
- Allow quantity selection

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Store only the product ID (not variant ID)
- Record timestamp of addition
- Prevent duplicates (same product added twice)
- Associate with the customer account

WHEN a customer views their wishlist, THE system SHALL display:
- Products sorted by addition timestamp (newest first)
- Thumbnail image from first image of product
- Product name
- Price range (min/max variant prices)
- Seller shop name
- Average rating and review count
- Stock status ("In Stock" or "Out of Stock")
- Remove button for each product

WHERE a product is deleted by the seller, THE system SHALL:
- Automatically remove the product from all customers' wishlists
- Preserve no snapshots of wishlist entries
- Prevent display of deleted products in wishlist views

WHEN a customer removes a product from their wishlist, THE system SHALL:
- Delete the wishlist entry
- Preserve the removal timestamp
- Not affect other customers

## Shopping Cart

WHEN a customer adds a variant to their cart, THE system SHALL:
- Require exact variant selection
- Require quantity ≥ 1
- Validate variant exists and is not deleted
- Validate variant stock ≥ requested quantity
- If item already exists in cart, combine quantities
- Do NOT add duplicate line items

WHEN a customer views their cart, THE system SHALL display each item with:
- Product name
- Variant option values
- Price per item
- Quantity
- Subtotal (price × quantity)
- Stock status
- Quantity adjustment controls (+/-)
- Remove button

WHEN a customer changes an item's cart quantity, THE system SHALL:
- Allow 1 ≤ quantity ≤ current stock
- If quantity exceeds stock, show warning and prevent save
- Recalculate subtotal
- Recalculate cart total
- Prevent quantity = 0

WHEN a customer removes an item from cart, THE system SHALL:
- Delete that cart entry
- Recalculate cart total
- Preserve removal timestamp

WHERE a variant's stock drops below cart quantity after being added, THE system SHALL:
- Display "Stock warning: Available: X, In cart: Y"
- Prevent checkout
- Not automatically reduce cart quantity

WHERE a variant is deleted by the seller after being added to cart, THE system SHALL:
- Mark the item as "Unavailable: Product no longer available"
- Prevent checkout
- Allow manual removal by customer

WHERE a variant's stock becomes 0 after being added to cart, THE system SHALL:
- Mark item as "Out of Stock"
- Display warning
- Prevent checkout

WHEN a customer proceeds to checkout, THE system SHALL:
- Only allow if all items are available (stock > 0 and not deleted)
- Hide unavailable items from checkout process
- Prevent checkout if any item is unavailable
- Allow customer to remove unavailable items and retry

WHILE managing the cart, THE system SHALL:
- Recalculate totals in real-time
- Validate stock on every change
- Maintain cart state using authenticated session

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL:
- Ensure cart contains only available items
- Require selection of one shipping address
- Display order summary with:
  - Product details, quantities, prices
  - Selected shipping address
  - Total price
- Allow cart editing before final confirmation
- Provide "Place Order" button

WHEN the customer confirms checkout, THE system SHALL preserve:
- Exact list of cart items and quantities
- Exact variant prices at time of checkout
- Exact shipping address selected
- Timestamp of confirmation
- Customer account ID
- Cart ID

WHEN payment processing succeeds, THE system SHALL:
- Create permanent order record
- Reduce inventory for each variant
- Clear the customer's cart
- Create order items with status "paid"
- Create immutable snapshots of:
  - Product (name, description, category)
  - Variant (SKU, options, price)
  - Seller profile (shop name, logo)
- Send order confirmation email
- Display success page with order number and details

WHEN payment processing fails, THE system SHALL:
- Roll back any temporary inventory reductions
- Restore the cart with original quantities
- Return error message with payment gateway error code
- Allow customer to retry payment
- Preserve failed attempt with timestamp and reason

## Order Creation

WHEN an order is created, THE system SHALL create each order item with:
- Product name from snapshot
- Product description from snapshot
- Category from snapshot
- Base price from snapshot
- SKU code from variant snapshot
- Option values from variant snapshot
- Variant price from variant snapshot
- Quantity purchased
- Total price (quantity × variant price)
- Seller shop name from seller profile snapshot
- Seller logo from seller profile snapshot
- Timestamp of purchase
- Status "paid"

WHEN an order item is created, THE system SHALL:
- Preserve exact state of product, variant, and seller at the time of purchase
- Link all snapshots to the order item
- Remove items from cart
- Create negative inventory records

## Order Structure

An order SHALL contain one or more order items.

Each order item SHALL represent:
- One product variant
- One quantity
- One unit price at time of purchase
- One seller
- One status: paid, shipped, delivered, cancelled, refunded

IF a customer purchases 3 of the same variant, THE system SHALL create one order item with quantity = 3.

IF a customer purchases items from multiple sellers, THE system SHALL create an order item for each seller's items.

Each order item SHALL have its own status, independent of other items in the order.

IF a customer purchases the same variant from different sellers, THE system SHALL create separate order items.

Order items SHALL be grouped into shipments based on seller.

## Order History

WHEN a customer views their order history, THE system SHALL:
- Display list of all orders sorted by newest first
- Show for each order: order number, date, total price, overall status
- Support pagination (10 orders per page)

WHEN a customer views full order details, THE system SHALL display:
- List of order items with:
  - Product name
  - Variant options
  - Quantity
  - Price per unit
  - Item status
- Shipping address (at time of purchase)
- List of shipments with:
  - Tracking number
  - Carrier name
  - Items included in shipment
  - Shipping timestamp
  - Delivery status

WHEN viewing any order, THE system SHALL:
- Show product, variant, and seller information from the time of purchase, not current state
- Preserve all snapshots as immutable records

## Order Status

### Order Item Status

| Status | Description |
|--------|-------------|
| Paid | Payment confirmed, waiting for seller to ship |
| Shipped | Seller has marked as shipped with tracking info |
| Delivered | Customer has confirmed delivery, or 14 days passed since shipping |
| Cancelled | Seller or administrator approved cancellation |
| Refunded | Seller or administrator approved refund |

### Order Status Logic

WHEN an order's items are only "paid", THE system SHALL set order status to "paid".

WHEN an order has at least one item in status "shipped" and none in "delivered", THE system SHALL set order status to "shipped".

WHEN all items in an order have status "delivered", THE system SHALL set order status to "delivered".

WHEN all items in an order have status "cancelled", THE system SHALL set order status to "cancelled".

WHEN all items in an order have status "refunded", THE system SHALL set order status to "refunded".

WHEN an order has mixed statuses (e.g., some delivered, some refunded), THE system SHALL set order status to "partially completed".

WHEN an order status changes, THE system SHALL update it immediately and notify customer if status changes to delivered.

## Shipping and Tracking

### Shipment Concept

A shipment SHALL be a package sent from one seller containing one or more order items from that seller's products.

Different sellers SHALL always ship separately.

A seller MAY ship individual items or bundle multiple items into one shipment.

### Shipping Process

WHEN a seller marks items for shipping, THE system SHALL:
- Allow selection of one or more order items from their products with status "paid"
- Require tracking carrier name
- Require tracking number
- Create shipment record with:
  - Shipment ID
  - Seller ID
  - Tracking info
  - Shipping timestamp
  - List of included order item IDs
- Set status of all selected order items to "shipped"
- Link shipment record to order
- Notify customer of shipment update

### Delivery Confirmation

WHEN a customer confirms delivery for a shipment, THE system SHALL:
- Set status of all order items in that shipment to "delivered"
- Record the confirmation timestamp
- Notify the seller

WHEN no customer confirmation is received, THE system SHALL:
- Automatically set status of all items in shipment to "delivered" after 14 days from shipping timestamp
- Record "automatically delivered" status with timestamp
- Notify customer and seller

WHEN delivery is confirmed (automatically or manually), THE system SHALL:
- Update order status accordingly
- Trigger potential refund eligibility (7-day window starts)

## Order Cancellation

WHERE a customer requests cancellation of an order item, THE system SHALL:
- Allow only if item status is "paid"
- Require text reason (minimum 5 characters)
- Create a cancellation request record with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request status: "pending"
  - Reason
  - Timestamp

WHERE a seller responds to a cancellation request, THE system SHALL:
- Update the cancellation request with:
  - Status: "approved" or "rejected"
  - Seller ID
  - Response timestamp
  - Optional rejection reason
- Create a cancellation request snapshot preserving previous state
- If approved:
  - Set order item status to "cancelled"
  - Restore inventory (positive record)
  - Initiate refund process
- If rejected:
  - Keep item status as "paid"
  - Send notification to customer

WHEN all items in an order are cancelled, THE system SHALL set overall order status to "cancelled".

## Refund Requests

WHERE a customer requests a refund for an item, THE system SHALL:
- Allow only if item status is "delivered"
- Allow only within 7 days of delivery confirmation
- Require text reason (minimum 5 characters)
- Create a refund request record with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request status: "pending"
  - Reason
  - Timestamp

WHERE a seller responds to a refund request, THE system SHALL:
- Update the refund request with:
  - Status: "approved" or "rejected"
  - Seller ID
  - Response timestamp
  - Optional rejection reason
- Create a refund request snapshot preserving previous state
- If approved:
  - Set order item status to "refunded"
  - Restore inventory (positive record)
  - Initiate refund payment
- If rejected:
  - Keep item status as "delivered"
  - Send notification to customer

WHEN all items in an order are refunded, THE system SHALL set overall order status to "refunded".

## Reviews and Ratings

WHEN a customer writes a review, THE system SHALL:
- Allow only if item status is "delivered"
- Allow only one review per product per order
- Require rating (1-5 stars)
- Allow optional text (maximum 2,000 characters)
- Create review with:
  - Review ID
  - Product ID
  - Order ID
  - Customer ID
  - Rating
  - Text
  - Timestamp
  - Deleted flag: false

WHEN a customer edits their review, THE system SHALL:
- Preserve the previous version as a review snapshot
- Update the current review with new text or rating
- Record editing timestamp and actor ID

WHEN a customer deletes their review, THE system SHALL:
- Set the deleted flag to true
- Preserve the original and edited versions in snapshot history
- Recalculate product average rating excluding this review

WHEN a product's average rating is calculated, THE system SHALL:
- Consider only reviews where deleted flag is false
- Calculate mean of non-deleted ratings
- Round to one decimal place
- Store calculated value in product metadata

WHERE a customer account is deleted, THE system SHALL:
- Display "Deleted User" instead of the reviewer's display name
- Preserve all review snapshots

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:
- Total number of products listed
- Total number of order items for their products
- Number of pending cancellation requests
- Number of pending refund requests

WHEN a seller views their order items, THE system SHALL:
- Display list of all order items for their products
- Filter by status: paid, shipped, delivered, cancelled, refunded
- Show product info, customer info, quantity, price, status
- Link to order details

## Administrator System

### Administrator Role

WHEN an administrator logs in, THE system SHALL grant access to:
- All seller registration requests
- All product listings
- All order records
- All customer profiles
- All administrator requests
- All snapshots of all systems

WHEN an administrator performs any action, THE system SHALL:
- Log the actor ID and timestamp
- Record action type
- Record affected entity ID
- Create audit trail entry

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
- Update user role to "super_admin"
- Record promotion timestamp and promoter ID
- Send notification to promoted user

WHEN a super administrator demotes a super administrator to regular administrator, THE system SHALL:
- Update user role to "admin"
- Record demotion timestamp and demoter ID
- Send notification to demoted user

WHEN a super administrator attempts to demote themselves, THE system SHALL:
- Reject the request
- Return error: "Super administrators cannot demote themselves"

### Seller Management

WHEN an administrator approves a seller registration, THE system SHALL:
- Update seller status to "approved"
- Send notification to seller
- Enable product creation

WHEN an administrator rejects a seller registration, THE system SHALL:
- Update seller status to "rejected"
- Require rejection reason (minimum 10 characters)
- Send email to seller with reason
- Allow seller to resubmit registration

WHEN an administrator suspends a seller, THE system SHALL:
- Set seller status to "suspended"
- Hide all products from public listings and search
- Prevent product purchase
- Allow seller to:
  - View orders
  - Ship existing orders
  - Respond to cancellation/refund requests
- Prevent seller from:
  - Creating new products
  - Editing existing products
  - Updating shop profile
- Create snapshot of suspension with reason and timestamp

WHEN an administrator unsuspends a seller, THE system SHALL:
- Set seller status to "approved"
- Make products visible again
- Allow all seller actions
- Send notification to seller
- Create snapshot with unsuspension timestamp and actor ID

### Category Management

WHEN an administrator creates a category, THE system SHALL:
- Require name and description
- Allow parent category for nesting (one level only)
- Generate unique ID
- Record creation timestamp

WHEN an administrator edits a category, THE system SHALL:
- Allow name and description updates
- Record modification timestamp
- Create snapshot with previous values

WHEN an administrator deletes a category, THE system SHALL:
- Mark category as deleted
- Set all products under it to "uncategorized"
- Preserve category name and history
- Allow category reuse

### Product Oversight

WHEN an administrator views all products, THE system SHALL:
- Display product name, seller shop name, category, creation date, status
- Allow filtering by seller, category, status, date
- Allow sorting by any column

WHEN an administrator views product snapshots, THE system SHALL:
- Access all historical versions
- View exact product state at each snapshot
- See who edited and when
- View variant snapshots at each version

WHEN an administrator deletes a product for policy violation, THE system SHALL:
- Perform logical deletion
- Remove from search and listings
- Preserve all snapshots
- Preserve all order items
- Send notification to seller and affected customers
- Record reason and admin ID

### Order Oversight

WHEN an administrator views all orders, THE system SHALL:
- Display order number, customer, total price, date, status
- Allow filtering and sorting
- View full details including items and shipments

WHEN an administrator force-cancels an item, THE system SHALL:
- Change item status to "cancelled"
- Create cancellation snapshot
- Restore inventory
- Initiate refund
- Notify customer and seller
- Record admin ID and reason

WHEN an administrator force-refunds an item, THE system SHALL:
- Change item status to "refunded"
- Create refund snapshot
- Restore inventory
- Initiate refund payment
- Notify customer and seller
- Record admin ID and reason

WHEN an administrator force-cancels an entire order, THE system SHALL:
- Cancel all items
- Restore all inventory
- Issue full refund
- Notify all parties
- Record admin ID and reason

WHEN an administrator force-refunds an entire order, THE system SHALL:
- Refund all items
- Restore all inventory
- Initiate batch refund
- Notify all parties
- Record admin ID and reason

### User Management

WHEN an administrator views all customers, THE system SHALL:
- Display display name, email, registration date, last login, status (active/banned)
- Allow filtering and sorting

WHEN an administrator bans a customer, THE system SHALL:
- Set customer status to "banned"
- Block login
- Prevent new orders
- Prevent wishlist edits
- Prevent review edits or deletions
- Preserve all past order and review data
- Record admin ID and reason

WHEN an administrator unbans a customer, THE system SHALL:
- Set customer status to "active"
- Restore login access
- Allow order creation
- Allow wishlist and review edits
- Send notification to customer

WHEN an administrator views all sellers, THE system SHALL:
- Display shop name, email, registration date, approval status (pending/approved/rejected/active/suspended/banned), last login
- Allow filtering and sorting

WHEN an administrator bans a seller, THE system SHALL:
- Set seller status to "banned"
- Block login
- Hide products
- Block product editing
- Allow processing of existing orders
- Preserve all order and snapshot data
- Record admin ID and reason

WHEN an administrator unbans a seller, THE system SHALL:
- Set seller status to "approved"
- Restore login access
- Make products visible
- Restore editing access
- Send notification to seller

### Admin Promotion

WHEN a user requests administrator access, THE system SHALL:
- Accept request with reason text (minimum 20 characters)
- Create pending request record with:
  - User ID
  - Request reason
  - Request timestamp
  - Status: "pending"

WHEN a super administrator approves an admin request, THE system SHALL:
- Set user role to "admin"
- Record approval timestamp
- Record approver ID
- Send confirmation to user

WHEN a super administrator rejects an admin request, THE system SHALL:
- Set request status to "rejected"
- Record rejection timestamp
- Record rejector ID
- Record rejection reason
- Send notification to user

## Business Model

### Why This Service Exists

This service exists to provide a trusted, transparent marketplace for multi-vendor online commerce with immutable audit trails to ensure legal compliance and dispute resolution. Customers benefit from product variety and vendor competition, while sellers gain market access without technical overhead. The mandatory snapshot principle ensures that product descriptions, prices, and seller identities are preserved exactly as they were at time of purchase, preventing fraud and enabling accurate resolution of customer-seller disputes.

### Revenue Strategy

The platform generates revenue through:
- 5% transaction fee on each completed sale
- $0.99 monthly listing fee per product (waived for premium sellers)
- $0.50/day featured product placement
- $49/month premium seller account for analytics, priority support, and boosted visibility
- Admin service fees for category creation and management

### Growth Plan

1. Launch with 500 qualified sellers in first 90 days
2. Drive traffic through social media, Google Shopping, and SEO
3. Leverage network effects to attract customers
4. Convert 20% of active sellers to premium accounts
5. Expand internationally after reaching 10,000 sellers and 100,000 monthly customers

### Success Metrics

- Monthly active customers: 50,000 by Month 6, 200,000 by Month 12
- Active sellers: 1,000 by Month 6, 5,000 by Month 12
- Average order value: $45
- Customer retention rate: 35% monthly repeat
- Gross Merchandise Volume: $10M/month by Month 12
- Seller retention rate: 80% after 6 months
- Customer satisfaction score: 4.5/5 average rating
- Snapshot count: 1,000,000 by Month 6
- Platform error rate: < 0.01% of transactions

## Performance Requirements

- Product search results load within 1.5 seconds for 95% of queries
- Product detail pages load within 2 seconds
- Cart updates complete within 500 milliseconds
- Checkout process completes within 3 seconds
- Inventory updates complete within 1 second of confirmation
- All API responses return within 2 seconds
- Snapshot creation completes within 500 milliseconds
- Search index updates within 100ms of data change
- Mobile web experience fully functional

## Error Handling

- All validation failures return HTTP 400 with structured JSON error
- All authentication failures return HTTP 401
- All authorization failures return HTTP 403
- All server errors return HTTP 500
- All errors return specific error codes and human-readable messages
- No system internals exposed in error responses
- Errors are localized to user's preferred language

## Compliance Requirements

- Complies with GDPR, CCPA, and other data privacy regulations
- All user data encrypted at rest and in transit
- Financial data handled via PCI-DSS compliant payment gateways
- All product snapshots and order histories retained for minimum 7 years
- All administrative actions logged and auditable
- User accounts fully deletable upon request (except order history)

## Non-Functional Requirements

- 99.9% system uptime
- Support for 10,000 concurrent users
- API response time ≤ 2 seconds on 95th percentile
- Order processing queue time ≤ 5 seconds
- Snapshot creation latency ≤ 1 second
- Mobile-optimized interface
- Accessible to users with disabilities

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*