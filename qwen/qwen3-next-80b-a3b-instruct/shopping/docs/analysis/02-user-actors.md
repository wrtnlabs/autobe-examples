# E-Commerce Shopping Mall Platform Requirements Specification

## Customer Account and Authentication

WHEN a customer attempts to register, THE system SHALL require an email address and a password with minimum 8 characters, including at least one uppercase letter, one lowercase letter, and one numeric digit.

WHEN a customer attempts to log in, THE system SHALL validate the email and password combination against the registered account and SHALL return an error if credentials are invalid.

WHEN a customer logs in successfully, THE system SHALL issue a JWT access token with 30-minute expiration and a refresh token with 30-day expiration, and SHALL set a secure HTTP-only session cookie.

WHEN a customer changes their password, THE system SHALL require authentication with the current password before allowing the update, and SHALL invalidate all active sessions upon successful update.

WHEN a customer requests account deletion, THE system SHALL:
- Immediately deactivate the account and clear all profile fields (display name, phone number, and active addresses)
- Preserve all past orders, order items, and transaction history
- Preserve all reviews with content but anonymize display: "deleted user"
- Maintain a record of deletion for compliance and audit
- Immediately revoke all active authentication tokens
- Prevent any future login to the deleted account

## Customer Profile Management

WHEN a customer updates their display name, THE system SHALL:
- Accept alphanumeric and space characters only, with a maximum length of 50 characters
- Update the display name in the customer profile
- Update the display name in all future reviews and order histories
- Preserve the previous display name in a profile audit log

WHEN a customer updates their phone number, THE system SHALL:
- Validate format against international E.164 standard
- Confirm validity via SMS-based one-time code verification
- Update the phone number in the profile
- Log the change for security and compliance
- Prevent modification if the number is already in use by another active account

## Address Management

WHEN a customer adds a shipping address, THE system SHALL require and validate:
- Recipient name (1–60 characters, required)
- Phone number (E.164 format, required)
- Street address (2–200 characters, required)
- City (2–100 characters, required)
- State/province (2–100 characters, required)
- Postal code (3–10 alphanumeric characters, required)
- Country (ISO 3166-1 alpha-2 code, required)

WHEN a customer edits an existing shipping address, THE system SHALL:
- Create an address snapshot preserving the previous values
- Allow modification of all fields except the address ID
- Record the timestamp and actor ID of the change
- Update the address in the active list if valid

WHEN a customer deletes an address, THE system SHALL:
- Mark the address as archived and inactive
- Preserve all data in an immutable snapshot
- Prevent re-use of the address ID
- Automatically update the default address if the deleted address was the default

WHEN a customer sets an address as default, THE system SHALL:
- Update the "default_address_id" flag on the selected address
- Clear the "default_address_id" flag from any previously selected address
- Record the change with timestamp and user ID
- Apply the new default to all future checkout operations

WHERE a customer has no active address and attempts checkout, THE system SHALL prompt the customer to add an address before proceeding.

## Seller Account Registration and Lifecycle

WHEN a seller registers, THE system SHALL:
- Require email and password (same criteria as customer account)
- Collect business name and tax identifier
- Place account in "pending" status for administrative review
- Store the registration record with timestamp and IP

WHEN a seller logs in, THE system SHALL:
- Authenticate through the same credentials and token mechanism as customers
- Check account status: if "rejected" or "suspended", deny access and return appropriate message
- Issue session tokens only if account status is "approved"

WHEN a seller changes their password, THE system SHALL:
- Follow identical procedure as customer password change
- Preserve session tokens upon successful update

WHEN a seller submits a new registration after rejection, THE system SHALL:
- Allow resubmission with new business documents or explanation
- Reset status to "pending" and assign new review queue position
- Preserve the rejection reason and date for reference

WHEN a seller attempts to delete their account, THE system SHALL:
- Validate that NO order items have status "paid" or "shipped"
- Validate that NO pending cancellation requests exist for any of their products
- Validate that NO pending refund requests exist for any of their products
- If validation passes:
  - Deactivate the seller account
  - Delete all shop profile information (name, description, logo)
  - Mark the seller as "deleted" in the database
  - Preserve the seller's order history, product snapshots, and review associations
  - Retain the seller ID for historical traceability in past orders
- If validation fails:
  - Return specific error: "Account cannot be deleted because of active orders or pending requests"

## Seller Profile Management and Snapshots

WHEN a seller updates their shop name, THE system SHALL:
- Accept 2–100 characters including alphanumeric, spaces, hyphens, and underscores
- Create a seller profile snapshot with:
  - Previous shop name
  - Previous shop description
  - Previous logo URL
  - Timestamp
  - Seller ID
- Update the active shop name
- Apply new name to all future orders and listings

WHEN a seller updates their shop description, THE system SHALL:
- Accept 0–1000 characters
- Create a seller profile snapshot with all fields before update
- Update the active description
- Preserve the previous version for dispute resolution

WHEN a seller updates their logo image, THE system SHALL:
- Validate image format: PNG, JPEG, or WebP
- Validate image size ≤ 2MB
- Generate unique filename with UUID
- Store image in immutable object storage
- Record new image URL
- Create a seller profile snapshot with the previous logo URL
- Update the active logo

WHEN a customer views a seller profile, THE system SHALL:
- Display the current profile values: shop name, description, logo
- Provide access button to view history of all seller profile snapshots
- Show each snapshot with timestamp and action: "Edited shop name", "Updated logo", etc.

WHERE a product order was made 1 year ago, and the seller has since changed their logo, THE system SHALL display the logo that was active at the time of purchase within the order detail page, not the current logo.

## Category Management

WHEN an administrator creates a category, THE system SHALL:
- Require name (1–50 characters, unique)
- Require description (0–500 characters)
- Allow optional parent category ID (for subcategories)
- Generate unique category ID
- Record creation timestamp and admin acting
- Ensure no self-referencing or circular references

WHEN an administrator edits a category, THE system SHALL:
- Allow modification of name and description
- Prevent changes to parent category if any products are assigned to this category or subcategories
- Create a category snapshot with previous values
- Update active category metadata

WHEN an administrator deletes a category, THE system SHALL:
- Mark category as inactive
- Reassign all products assigned directly to this category to "uncategorized"
- Preserve the category name and deletion record
- Prevent category with active subcategories from being deleted
- Allow re-creation with same name
- Record deletion timestamp and admin ID

WHEN a customer browses categories, THE system SHALL:
- Display all active categories and their subcategories (one level nested)
- Exclude any categories marked as inactive or deleted
- Show no more than 50 top-level categories

## Product Management

WHEN a seller creates a product, THE system SHALL:
- Require product name (3–200 characters)
- Require product description (10–5,000 characters)
- Require valid category ID (existing and active)
- Require base price (decimal > 0, up to two decimal places)
- Validate seller account is "approved" and not suspended
- Generate UUID product ID
- Set creation timestamp
- Set product state to "active"
- Link product to seller ID
- Initialize empty image list and variant list
- Create product snapshot with initial values

WHEN a seller edits a product, THE system SHALL:
- Allow modification of name, description, category, base price, and image list
- Lock product from concurrent edits
- Create product snapshot capturing previous values
- Apply new values
- Update last modified timestamp
- Record editing seller ID
- Validate that no active order items exist for any variant (if category or price is changed)

WHEN a seller attempts to delete a product, THE system SHALL:
- Query for any product variants with order items having status "paid" or "shipped"
- Query for any pending cancellation or refund requests on variants
- If any exist:
  - Return error: "Cannot delete product. Variants have active order items or pending requests."
- If none exist:
  - Set product status to "deleted"
  - Hide from all public listings and search
  - Preserve all snapshots
  - Preserve all historical order items referencing this product
  - Delete all variants and inventory records

WHEN a product is deleted, THE system SHALL:
- Prevent new purchases
- Prevent edits
- Prevent new variants
- Preserve full snapshot history
- Ensure orphaned order items (from past purchases) continue to link correctly
- Remove from category listings, search engine index, and recommendation engines

## Product Images

WHEN a seller uploads a product image, THE system SHALL:
- Validate file type: PNG, JPEG, WebP
- Validate file size ≤ 5MB
- Generate unique filename using UUID
- Store in immutable object storage with metadata
- Create image record with:
  - Image ID
  - Product ID
  - URL
  - Dimensions (width, height)
  - MimeType
  - FileSize
  - Created timestamp
  - Sort order (0-based)

WHEN a seller reorders product images, THE system SHALL:
- Accept new sequence for all images
- Verify all image IDs are valid and belong to the product
- Create product snapshot before update
- Update sort order for all affected images atomically
- Set the image with sort order 0 as the primary thumbnail

WHEN a seller deletes an image, THE system SHALL:
- Remove reference to the image from product image list
- Create product snapshot with updated image list
- Mark image as archived in storage
- Keep the stored file for snapshot integrity
- No longer reference it in live product views

WHEN a product has no images, THE system SHALL:
- Display default placeholder image in all listings
- Default image URL provided by system
- Image must be accessible and static

## Product Variants (SKU)

WHEN a seller creates a new variant for a product, THE system SHALL:
- Require unique SKU code (alphanumeric, 3–20 characters, must be unique across platform)
- Require at least one option value pair (e.g., color: "red")
- Accept optional price override (≥0, up to two decimals)
- Require stock quantity ≥0
- Validate product is active and seller owns it
- Generate unique variant ID
- Link to product ID
- Set creation timestamp
- Set last modified timestamp
- Initialize empty inventory history
- Create product-snapshot-SKV record linked to active product snapshot

WHEN a seller edits a product variant, THE system SHALL:
- Allow update of SKU code, option values, price override, stock quantity
- Validate SKU uniqueness across platform
- Validate stock quantity ≥0
- Create product-snapshot-SKV with previous values
- Update latest variant state
- Update last modified timestamp

WHEN a seller deletes a product variant, THE system SHALL:
- Validate that no order items exist with status "paid" or "shipped"
- Validate that no pending cancellation requests exist
- Validate that no pending refund requests exist
- If any exist:
  - Return error: "Cannot delete variant due to active orders or pending requests."
- If valid:
  - Mark variant as deleted
  - Create final product-snapshot-SKV
  - Remove from active product variant list
  - Preserve all snapshots
  - Free SKU code for future use after 30 days

WHEN a product has zero variants, THE system SHALL:
- Display product in search and category listings as "Unavailable"
- Prevent addition to cart
- Prevent checkout
- Allow view of product details (name, description, images)

## Inventory Management

WHEN a seller restocks a variant, THE system SHALL:
- Allow positive integer quantity change (≥1)
- Require reason text (1–100 characters)
- Create inventory history record with:
  - Variant ID
  - Change: positive quantity
  - Reason
  - Timestamp
  - Actor ID
  - Type: "restock"

WHEN a seller performs inventory adjustment (loss), THE system SHALL:
- Allow negative quantity change (≥1 reduction)
- Require reason text (1–100 characters)
- Create inventory history record with:
  - Variant ID
  - Change: negative quantity
  - Reason
  - Timestamp
  - Actor ID
  - Type: "adjustment"

WHEN an order is successfully paid, THE system SHALL:
- Decrease stock for each variant by quantity ordered
- Create negative inventory history record with:
  - Change: negative quantity
  - Reason: "order_purchase"
  - Source: Order ID
  - Timestamp
  - Actor ID: system

WHEN a cancellation is approved, THE system SHALL:
- Increase stock for deleted variant by cancelled quantity
- Create positive inventory history record with:
  - Update: positive quantity
  - Reason: "cancellation_approved"
  - Source: Order item ID
  - Timestamp
  - Actor ID: customer

WHEN a refund is approved, THE system SHALL:
- Increase stock for product variant by refunded quantity
- Create positive inventory history record with:
  - Update: positive quantity
  - Reason: "refund_approved"
  - Source: Order item ID
  - Timestamp
  - Actor ID: customer

WHEN stock quantity reaches 0, THE system SHALL:
- Display variant as "Out of stock" on product detail page
- Prevent addition to cart
- Maintain history record
- Prevent new stock addition until explicitly restocked

WHEN stock quantity increases from 0, THE system SHALL:
- Automatically change status to "In stock"
- Make variant available for cart addition

## Product Search

WHEN a customer performs a product search, THE system SHALL:
- Search product names and variant option values for case-insensitive partial matches
- Return products from approved sellers only
- Apply category filter (include subcategory products)
- Apply price range filter: minimum and maximum (use lowest and highest variant price if multiple variants)
- Apply in-stock filter: show only products with at least one variant having stock > 0
- Sort by newest first by default (product creation date)
- Return 20 results per page, paginated
- Return results in under 1.5 seconds
- Cache results for identical queries with TTL of 30 seconds

WHEN filtering by category, THE system SHALL:
- Include products in the selected category and all its subcategories
- Exclude products in other categories
- If multiple categories selected, return products matching any

WHEN filtering by price range, THE system SHALL:
- Use variant price if available
- Use base price if no variants
- For multiple variants, use min variant price for minimum filter
- For multiple variants, use max variant price for maximum filter
- Include products if any variant falls within the selected range

WHEN filtering by "In stock only", THE system SHALL:
- Return only products with at least one variant having stock > 0
- Exclude products where *all* variants have stock = 0

WHEN sorting by newest first, THE system SHALL:
- Primary: product creation timestamp DESC
- Secondary: product name ASC
- Tertiary: lowest variant price ASC

WHEN sorting by price (low to high), THE system SHALL:
- Primary: lowest variant price ASC
- Secondary: product name ASC
- Tertiary: product creation timestamp DESC

WHEN sorting by price (high to low), THE system SHALL:
- Primary: highest variant price DESC
- Secondary: product name ASC
- Tertiary: product creation timestamp DESC

## Product Listing and Search Results

WHEN a customer views search results or a category listing, THE system SHALL display each product with:

- Main image: thumbnail (image with sort order 0)
- Product name
- Price:
  - If multiple variants: price range (e.g., "$25.99 - $49.99")
  - If single variant: display that variant price
  - If no variants: display "Unavailable"
- Seller shop name (from current profile)
- Average rating (rounded to one decimal place)
- Total number of non-deleted reviews
- Stock status: "In stock" if any variant has stock > 0, otherwise "Out of stock"

WHEN calculating average rating, THE system SHALL:
- Sum all non-deleted review ratings
- Divide by count of non-deleted reviews
- Round to one decimal place
- Return "No ratings yet" if count is zero

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:

- All images in order (first as main, rest in sequence)
- Product name
- Product description
- Category path (category → subcategory)
- Seller shop name (clickable link to seller profile)
- All available variants with:
  - SKU code
  - Option values (e.g., color: red, size: large)
  - Price (variant price if set, else base price)
  - Stock status ("In stock", "Out of stock")
- Average rating and total review count
- All non-deleted reviews in descending order by timestamp, each showing:
  - Customer display name (or "deleted user" if account deleted)
  - Rating (stars)
  - Review text
  - Date created
  - Edit indicator if edited

WHEN product has no variants, THE system SHALL:
- Display "Unavailable" clearly
- Hide variant selection
- Display message: "This product is currently unavailable. We recommend similar items."

WHEN a variant is out of stock, THE system SHALL:
- Display "Out of stock" below the variant
- Disable "Add to cart" button
- Allow viewing of variant details

WHEN a customer selects a variant, THE system SHALL:
- Use the displayed variant price for cart addition
- Enforce maximum available quantity (stock limit)
- Show "Add to cart" button for in-stock variants

## Wishlist Management

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Record product ID and customer ID
- Prevent duplicates (same product in same wishlist)
- Record add timestamp

WHEN a customer views their wishlist, THE system SHALL:
- Display products sorted by addition date (newest first)
- For each item:
  - Thumbnail image
  - Product name
  - Price range (min/max variant price)
  - Seller name
  - Average rating
  - Stock status
  - Remove button
- Paginate results (max 10 items per page)

WHEN a product is deleted by its seller, THE system SHALL:
- Immediately remove the product from all customers’ wishlists
- Do not preserve wishlist entries for deleted products
- Do not display wishlist items for deleted products

WHEN a wishlist item is removed, THE system SHALL:
- Delete the wishlist entry
- Record removal timestamp
- Leave no trace in wishlist history

## Shopping Cart Management

WHEN a customer adds a variant to their cart, THE system SHALL:
- Require explicit selection of a variant (cannot add product)
- Validate that variant is available (not deleted)
- Validate that variant has stock > 0
- Validate quantity ≥1
- Check if variant already exists in cart:
  - If exists: increment quantity
  - If not: create new cart item
- Recalculate cart subtotal and total

WHEN a customer changes cart item quantity, THE system SHALL:
- Restrict range: minimum 1, maximum variant stock
- If quantity exceeds stock:
  - Display warning: "Only X items in stock. Quantity adjusted."
  - Automatically correct to available stock
- If quantity ≤ 0:
  - Remove the item from cart
- Recalculate subtotal and total

WHEN a customer removes an item from cart, THE system SHALL:
- Remove cart item entry
- Recalculate cart total
- Preserve deletion timestamp for audit

WHEN a variant becomes out of stock or deleted after being added to cart, THE system SHALL:
- Mark the cart item as "Unavailable"
- Display message: "Product no longer available"
- Disable checkout for this item
- Allow customer to remove item manually
- Do not auto-remove item

WHEN a customer proceeds to checkout, THE system SHALL:
- Validate all cart items have stock > 0 and are not deleted
- If any item is unavailable:
  - Disable "Checkout" button
  - Show alert: "Some items in your cart are unavailable. Please remove or adjust."
- If all items are available:
  - Allow checkout
  - Lock cart state: prevent further modification during checkout
  - Force selection of shipping address
  - Show final order summary with:
    - List of items with names, options, prices, quantities
    - Subtotal
    - Shipping address
    - Estimated delivery time
    - Total amount
- Allow customer to edit cart before final confirmation

## Checkout and Payment

WHEN a customer confirms checkout, THE system SHALL:
- Lock shipping address permanently to order
- Lock cart state: item IDs, quantities, prices
- Create temporary order draft
- Call external payment gateway with:
  - Amount (order total)
  - Customer ID
  - Currency (USD)
  - Order reference
- Accept one of two outcomes:
  - Payment success: proceed to order creation
  - Payment failure: roll back draft and return to cart with error

WHEN payment succeeds, THE system SHALL:
- Create permanent order record with unique order ID (format: ORD-YYYYMMDD-NNNN)
- Set order status to "paid"
- Set order creation timestamp
- Create order items from cart entries:
  - Each becomes one order item
  - Assign product ID, variant ID, seller ID
  - Assign quantity and unit price (snapshot price)
  - Set status to "paid"
- Create product snapshot from current active state
- Create product-snapshot-SKV snapshots for each variant
- Create seller profile snapshot with current profile (shop name, logo)
- Clear customer cart
- Send order confirmation email
- Return "Order Success" page with order number

WHEN payment fails, THE system SHALL:
- Do not create order
- Preserve cart
- Clear order draft
- Return customer to cart with payment failure message
- Log failure details with code
- Allow retry after 10 seconds

## Order Structure and Status Logic

An order contains one or more order items. Each order item represents one unique product variant, with an associated quantity.

Each order item has its own independent status:

- "paid" → payment confirmed, awaiting shipment
- "shipped" → seller has shipped this item
- "delivered" → customer has confirmed delivery
- "cancelled" → item was cancelled and stock restored
- "refunded" → item was fully refunded and stock restored

The overall order status is derived from the union of its order items as follows:

- IF all items are "paid" → order status = "paid"
- IF any item is "shipped" and no item is "delivered" → order status = "shipped"
- IF all items are "delivered" → order status = "delivered"
- IF all items are "cancelled" → order status = "cancelled"
- IF all items are "refunded" → order status = "refunded"
- IF at least one item has one status AND at least one has another → order status = "partially completed"

Examples:
- 2 items: "paid" and "delivered" → "partially completed"
- 3 items: both "delivered", one "refunded" → "partially completed"
- 4 items: 1 "shipped", 1 "delivered", 2 "paid" → "shipped"

WHEN an order item status changes, THE system SHALL:
- Record previous status
- Record new status
- Record timestamp
- Record actor ID (customer, seller, or admin)
- Store in an immutable audit trail
- Update order status accordingly

## Order History and Detail View

WHEN a customer views their order history, THE system SHALL:
- Display list sorted by creation date DESC (newest first)
- Show 10 orders per page with pagination
- Each item shows:
  - Order number
  - Date of creation
  - Total price
  - Overall order status (paid, shipped, delivered, cancelled, refunded, partially completed)
  - Link to full order details

WHEN a customer views full order details, THE system SHALL display:

- Order number and creation timestamp
- Shipping address as it existed at time of purchase (frozen)
- List of order items with:
  - Product name (from snapshot)
  - Variant option values (from snapshot)
  - Unit price at time of purchase
  - Quantity
  - Subtotal (price × quantity)
  - Individual item status
- Shipping section showing:
  - Each shipment identifier
  - Carrier name from shipment record
  - Tracking number
  - Shipment creation timestamp
  - List of order item IDs included
  - Delivery confirmation status (confirmed or auto-approved)
  - Delivery confirmation timestamp
- Order subtotal, shipping (if applicable), total
- Links to product and seller snapshots
- Button to initiate return or refund on individual items (if allowed)

WHEN a seller views their order items, THE system SHALL:
- Only show order items where they are the seller
- Allow filtering by:
  - Status (paid, shipped, delivered, cancelled, refunded)
  - Date range
  - Product name
  - Customer ID
- Display for each item:
  - Order number
  - Customer name (or "deleted user")
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Item status
  - Creation timestamp
- Provide links to product and variant snapshots

WHEN an administrator views orders, THE system SHALL:
- See ALL orders on the platform
- Search by:
  - Order number
  - Customer email or ID
  - Seller shop name
  - Date range
  - Order status
- View full details including all snapshots
- Force cancel individual item: change status to "cancelled", restore stock
- Force refund individual item: change status to "refunded", restore stock, initiate payment refund
- Override delivery confirmation (if needed)
- Access audit trails for all status changes

## Shipping and Tracking

WHEN a seller selects one or more "paid" order items to ship, THE system SHALL:
- Validate all selected items are from the same seller
- Validate all selected items are in "paid" status
- Create a new shipment record:
  - Unique shipment ID
  - List of order item IDs
  - Carrier name (required)
  - Tracking number (required, alphanumeric 8–32 characters)
  - Shipment creation timestamp
  - Seller profile snapshot (shop name, logo)
  - Customer shipping address (frozen)
- Automatically transition all included order items to "shipped" status
- Send notification to customer

WHEN a customer views shipment tracking, THE system SHALL:
- Display carrier name
- Display tracking number as clickable link (for tracking site)
- Display shipment creation timestamp
- Show list of items included
- Show status: "shipped" or "delivered"
- If delivered: show confirmation timestamp
- If not confirmed: show "Waiting for delivery confirmation" and "Auto-delivery in X days"

WHEN a customer confirms delivery of a shipment, THE system SHALL:
- Change all items in that shipment to status "delivered"
- Record:
  - Confirmation timestamp
  - Customer ID
  - Device fingerprint (if available)
  - IP address (if available)
- Send notification to seller

WHEN a shipment remains unconfirmed for 14 days, THE system SHALL:
- Auto-advance all items in shipment to "delivered" status
- Record:
  - Auto-delivery timestamp
  - Reason: "System auto-confirmed after 14-day period"
- Send notification to customer and seller
- Prevent manual reversal of auto-delivery

## Order Cancellation

WHEN a customer requests cancellation of an order item with status "paid", THE system SHALL:
- Require cancellation reason (10–500 characters)
- Create cancellation request snapshot with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request timestamp
  - Status: "pending"
  - Reason text
- Temporarily freeze inventory of the variant
- Prevent the seller from shipping this item
- Send notification to seller

WHEN a seller responds to a cancellation request, THE system SHALL:
- Choose either "approve" or "reject"
- If "reject": require rejection reason (10–500 characters)
- Create response snapshot with:
  - Response ID
  - Request ID
  - Seller ID
  - Decision
  - Reason
  - Timestamp
- If approve:
  - Change order item status to "cancelled"
  - Create positive inventory record (restore stock)
  - Send refund request to payment gateway
  - Notify customer
- If reject:
  - Keep status "paid"
  - Remove inventory freeze
  - Notify customer with rejection reason
- Allow response only once

WHEN a seller does not respond within 48 hours, THE system SHALL:
- Auto-approve cancellation
- Create snapshot with decision: "auto-approved"
- Restore inventory
- Issue refund
- Notify customer and seller

## Refund Requests

WHEN a customer requests refund of an order item with status "delivered", THE system SHALL:
- Require refund reason (10–500 characters)
- Validate that delivery occurred ≤7 days ago (≤168 hours)
- Create refund request snapshot with:
  - Request ID
  - Order item ID
  - Customer ID
  - Request timestamp
  - Status: "pending"
  - Reason text
  - Delivery confirmation timestamp
- Send notification to seller

WHEN a seller responds to a refund request, THE system SHALL:
- Choose either "approve" or "reject"
- If "reject": require reason (10–500 characters)
- Create response snapshot
- If approve:
  - Change order item status to "refunded"
  - Restore stock via positive inventory record
  - Initiate refund via payment gateway
  - Notify customer
- If reject:
  - Keep status "delivered"
  - Notify customer with reason
- Allow response only once

WHEN a seller does not respond within 72 hours, THE system SHALL:
- Auto-approve refund
- Create snapshot with decision: "auto-approved"
- Restore stock
- Initiate refund
- Notify customer and seller

## Reviews and Ratings

WHEN a customer attempts to write a review, THE system SHALL:
- Validate that the product was purchased
- Validate that item status is "delivered"
- Validate that the customer has not previously reviewed this product in any order
- Allow review only if above conditions met

WHEN a customer submits a review, THE system SHALL:
- Require rating: integer 1–5
- Accept optional text: up to 1,000 characters
- Create review record with:
  - Review ID
  - Customer ID
  - Product ID
  - Order ID
  - Rating
  - Text
  - Created timestamp
- Generate review snapshot with exact values
- Recalculate product average rating and total review count

WHEN a customer edits their review, THE system SHALL:
- Allow edit only within 7 days of review creation
- Create snapshot of original review
- Update review with new values
- Update last edited timestamp
- Recalculate average rating
- If after 7 days: deny edit and return "Edit window expired"

WHEN a customer deletes their review, THE system SHALL:
- Create snapshot of original review
- Mark review status as "deleted"
- Hide from public product detail page
- Recalculate average rating using remaining non-deleted reviews
- Preserve snapshot forever

WHEN calculating average rating, THE system SHALL:
- Sum all non-deleted ratings
- Divide by count of non-deleted reviews
- Round to one decimal place
- If zero non-deleted reviews: return "No ratings yet"

WHEN a customer deletes their account, THE system SHALL:
- Mark all their reviews as "deleted" (preserve snapshots)
- Replace review author name with "deleted user" in all views

## Seller Dashboard

WHEN a seller accesses their dashboard, THE system SHALL display:

- Total products created
- Total order items sold (all statuses)
- Number of pending cancellation requests
- Number of pending refund requests
- Total revenue (sum of approved order items)
- Recent activity log

WHEN a seller views order items, THE system SHALL:
- Show only items for products they own
- Allow filtering by status (paid, shipped, delivered, cancelled, refunded)
- Date range selection
- Sort by date descending
- Export to CSV

## Administrator System

WHEN a user requests administrator access, THE system SHALL:
- Accept application with reason
- Store request: user ID, reason, timestamp
- Set status: "pending"
- Place in queue for super admin review

WHEN a super administrator approves an admin request, THE system SHALL:
- Change status to "approved"
- Assign role: "regular administrator"
- Send notification
- Record approver ID and timestamp

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
- Change role to "super administrator"
- Record in audit trail
- Send notification
- Prevent self-demotion

WHEN a super administrator demotes another super administrator, THE system SHALL:
- Change role to "regular administrator"
- Record in audit trail
- Send notification
- Prevent demotion of self

WHEN a regular administrator rejects a seller registration, THE system SHALL:
- Set status to "rejected"
- Record rejection reason (required)
- Notify seller
- Allow seller to reapply

WHEN a regular administrator suspends a seller, THE system SHALL:
- Set seller status to "suspended"
- Hide all seller products from search and category views
- Prevent any new product creation or editing
- Allow existing order fulfillment (shipping, responses)
- Send notification to seller
- Create seller profile snapshot

WHEN a regular administrator unsuspends a seller, THE system SHALL:
- Set status to "approved"
- Make products visible again
- Allow product creation/editing
- Send notification

WHEN a regular administrator deletes a product, THE system SHALL:
- Remove product from public view
- Mark as deleted
- Preserve all orders, snapshots, variants
- Record admin action and reason
- Notify seller

WHEN a regular administrator force-cancels an order item, THE system SHALL:
- Change item status to "cancelled"
- Restore stock via inventory record
- Initiate refund
- Record admin ID and reason
- Send notification to customer and seller

WHEN a regular administrator force-refunds an order item, THE system SHALL:
- Change item status to "refunded"
- Restore stock
- Initiate refund
- Record admin ID and reason
- Send notification

WHEN a regular administrator bans a customer, THE system SHALL:
- Set customer status to "banned"
- Prevent login
- Preserve all order history, reviews, wishlists
- Record ban reason and admin ID

WHEN a regular administrator unbans a customer, THE system SHALL:
- Set customer status to "active"
- Restore login access
- Allow orders, wishlist updates
- Record unbanning action and admin ID

WHEN a super administrator manages admins, THE system SHALL:
- Prevent admin from demoting themselves
- Allow demotion of other super admins
- Log all role changes
- Notify affected users

WHEN a category is deleted by admin, THE system SHALL:
- Reassign products to "uncategorized"
- Preserve category name and deletion record
- Prevent re-use of category ID if used in historical records

All administrative actions create immutable snapshots.

## Snapshot Principle Compliance

The system SHALL create immutable snapshots for:

- Products (all fields: name, description, category, base price, image list)
- Product variants (SKU, option values, price, stock at time of change)
- Seller profiles (shop name, description, logo)
- Order items (product name, variant options, price, seller name/logo at time of purchase)
- Reviews (rating, text, timestamp)
- Cancellation requests (status, reason, timestamp, response)
- Refund requests (status, reason, timestamp, response)

All snapshots SHALL:

- Be immutable
- Be timestamped
- Be uniquely identified (UUID)
- Be versioned (incrementing integer)
- Link to creator ID
- Be retained permanently
- Be inaccessible from public APIs
- Be accessible only to:
  - Entity owner
  - Administrators
  - Parties involved in a transaction
  - System audit tools

All previous states are preserved in case of disputes, audits, or legal compliance requirements.

## Performance and Compliance

- Product search response time: ≤1.5 seconds for 95% of queries
- Order detail page load: ≤2 seconds
- Cart update: ≤500 milliseconds
- Snapshot creation: ≤500 milliseconds
- All API calls return within 2 seconds
- All inventory changes are atomic
- All data is stored encrypted at rest and in transit
- All transactions adhere to PCI-DSS standards
- All snapshots are preserved for minimum 7 years
- All system logs are retained for audit for minimum 2 years
- System uptime: 99.9% SLA
- System must support 10,000 concurrent users

> *This document defines business requirements only. All technical architecture, API design, database schema, and implementation decisions are left to the development team.*