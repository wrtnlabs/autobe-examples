# E-Commerce Shopping Mall Platform

## Customer Account

WHEN a customer signs up, THE system SHALL require an email address and password.

WHEN a customer logs in, THE system SHALL authenticate using the provided email and password.

WHEN a customer changes their password, THE system SHALL:

- Require the current password for validation
- Require the new password to meet complexity requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character)
- Hash the new password using industry-standard cryptographic hashing before storage
- Record the password change timestamp
- Invalidate all existing active sessions

WHEN a customer requests to delete their account, THE system SHALL:

- Require explicit confirmation from the customer
- Set the customer account status to "deleted" and restrict login access
- Anonymize personal profile information by:
  - Clearing the display name
  - Clearing the phone number
  - Setting email to a hashed token (e.g., "deleted_customer_{{uuid}}@shoppingmall.com")
- Preserve all order history and associated snapshots intact for legal and accounting purposes
- Preserve all reviews but display them as "Deleted User" in all product detail pages and customer order history views

WHERE a customer has attempted login with incorrect credentials five times within 10 minutes, THE system SHALL temporarily lock the account for 30 minutes and notify the user via email.

## Customer Profile

WHEN a customer edits their profile, THE system SHALL allow changes to:

- Display name (maximum 100 characters)
- Phone number (validated against E.164 international format)

WHEN a profile edit is performed, THE system SHALL:

- Record the edit timestamp
- Record the user ID responsible for the change
- Preserve previous profile data in a snapshot for audit purposes
- Maintain immutable record of all profile changes

WHERE a customer submits a display name that is empty or exceeds 100 characters, THE system SHALL reject the change with error code PROFILE_NAME_INVALID.

WHERE a customer submits a phone number that does not conform to E.164 format, THE system SHALL reject the change with error code PROFILE_PHONE_INVALID.

## Address Management

WHEN a customer adds a shipping address, THE system SHALL require:

- Recipient name (minimum 1 character)
- Phone number (E.164 format)
- Street address (minimum 5 characters)
- City (minimum 2 characters)
- State/province (minimum 2 characters)
- Postal code (valid format for selected country)
- Country (ISO 3166-1 alpha-2 code)

WHEN a customer edits a shipping address, THE system SHALL:

- Allow modification of any field except the address ID
- Create an immutable snapshot of the previous state
- Record the edit timestamp and user ID
- Preserve historical address data for order fulfillment audit trails

WHEN a customer deletes a shipping address, THE system SHALL:

- Mark the address as "deleted" without removing it from records
- Preserve all address data for past order integrity
- Prevent the deleted address from being selected for future orders
- Prevent deletion if the address is currently set as default

WHEN a customer sets an address as default, THE system SHALL:

- Set the selected address as the default for future orders
- Clear the default flag on all other addresses for that customer
- Record the timestamp of default assignment
- Preserve all historical default address assignments

WHERE a customer attempts to delete the only remaining address, THE system SHALL prevent deletion and display: "At least one shipping address must be preserved."

WHERE a customer attempts to set an already deleted address as default, THE system SHALL reject the request and display: "Cannot set deleted address as default."

## Seller Account

WHEN a seller signs up, THE system SHALL require:

- Email address
- Password
- Initial shop name
- Shop description
- Logo image

WHEN a seller logs in, THE system SHALL authenticate using the provided email and password.

WHEN a seller changes their password, THE system SHALL follow the same rules as for customer password changes.

WHEN a seller submits a registration request, THE system SHALL set their status to "pending" and notify administrators.

WHEN a seller attempts to view their approval status, THE system SHALL display:

- "Pending" — if awaiting administrator approval
- "Approved" — if approved
- "Rejected" — if rejected, along with the rejection reason

WHEN a seller's registration is rejected, THE system SHALL:

- Record the rejection reason provided by the administrator
- Notify the seller via email and in-app notification
- Allow the seller to re-register with new information

WHEN a seller requests to delete their account, THE system SHALL:

- Verify no pending orders (status: paid or shipped) exist for any of their products
- Verify no pending cancellation or refund requests exist for any of their products
- If conditions are met:
  - Set account status to "deleted"
  - Anonymize contact data (email cleared, phone cleared)
  - Delete all products and their variants (logically)
  - Preserve all product snapshots, order items, and seller profile snapshots
  - Preserve shop name in all historical order records
- If conditions are NOT met, the system shall:
  - Return error message: "Cannot delete account. Pending orders or claims exist."

## Seller Profile

WHEN a seller edits their profile (shop name, description, or logo), THE system SHALL:

- Create a seller profile snapshot with:
  - Previous shop name
  - Previous shop description
  - Previous logo URL
  - Timestamp of change
  - Seller ID
  - Admin ID (if modified by admin)
  - Change type: "edit"
- Update the live profile with new values

WHEN a seller uploads a new logo, THE system SHALL:

- Accept image formats: JPEG, PNG, WebP
- Validate file size ≤ 5MB
- Generate unique filename using UUID
- Store image in immutable storage
- Create snapshot record of the previous logo

WHEN a customer views a seller profile, THE system SHALL:

- Display the current shop name, description, and logo
- Provide link to the seller's product listing
- Show the seller's approval status (approved, pending, rejected)

WHERE a seller's profile has been edited, THE system SHALL:

- Display current profile information to customers
- Preserve historical profile changes in snapshots for order item references
- Ensure past orders show the seller profile state as it was at time of purchase

## Categories

WHEN an administrator creates a category, THE system SHALL require:

- Name (minimum 3 characters, maximum 100 characters)
- Description (maximum 500 characters)
- Optional parent category ID (for subcategories)

WHEN an administrator creates a subcategory, THE system SHALL:

- Validate the parent category exists and is active
- Record the parent-child relationship
- Prevent nesting beyond one level (no sub-subcategories)

WHEN an administrator edits a category name or description, THE system SHALL:

- Create a category snapshot with:
  - Previous name
  - Previous description
  - Timestamp
  - Editor ID
- Update the live category data

WHEN an administrator deletes a category, THE system SHALL:

- Mark the category as "deleted" without physical deletion
- Re-assign all products in that category to "uncategorized"
- Preserve category name and history for audit purposes
- Allow future re-creation with same name

WHEN a customer browses categories, THE system SHALL:

- Display all active top-level categories
- Display all active subcategories under each parent
- Exclude any deleted or inactive categories
- Allow navigation from parent to child categories

WHERE a category has been deleted, THE system SHALL:

- Prevent creation of new subcategories under it
- Hide it from category navigation UI
- Preserve historical category data in snapshots for product history

## Snapshot Principle

WHEN any critical data field is modified (product, variant, seller profile, order item, review, cancellation request, refund request), THE system SHALL:

- Create an immutable snapshot of the ENTIRE state before applying changes
- Capture every editable field at the moment of change
- Associate the snapshot with:
  - The entity ID
  - The change timestamp (ISO 8601, Asia/Seoul timezone)
  - The actor ID (user or system)
  - A unique UUID
  - A sequential version number
- Store snapshots in write-only, immutable storage with no delete or overwrite capability
- Allow only read access by authorized parties (owner, administrator, order recipient)

### Product Snapshots

WHEN a product is created, THE system SHALL create a product snapshot with:

- Product name
- Product description
- Category ID
- Base price
- Product status = active
- Creation timestamp
- Seller ID
- All product images in order

WHEN a product is edited, THE system SHALL:

- Create a new product snapshot containing ALL current fields
- Link the new snapshot as child of the previous one
- Preserve all previous snapshots forever

WHEN a product is deleted, THE system SHALL:

- Create a final snapshot with status = "deleted"
- Preserve all historical versions
- Ensure all past order items continue to reference the correct snapshot

### Variant Snapshots (Product-Snapshot-SKV)

WHEN a variant is created, THE system SHALL create a product-snapshot-SKV with:

- SKU code
- Option values (key-value pairs for attributes)
- Price override (nullable)
- Stock quantity = 0
- Timestamp
- Associated product snapshot ID
- Seller ID

WHEN a variant is edited (SKU, options, price, or stock), THE system SHALL:

- Create a new product-snapshot-SKV record with new values
- Link to the same product snapshot
- Preserve all previous variant snapshots

WHEN a variant is deleted, THE system SHALL:

- Capture final state before deletion
- Create a snapshot with status = "deleted"
- Preserve the variant snapshot indefinitely

### Seller Profile Snapshots

WHEN a seller profile is created, modified, rejected, approved, suspended, or unsuspended, THE system SHALL:

- Create a full profile snapshot of:
  - Shop name
  - Shop description
  - Logo URL
  - Approval status
  - Suspension status
  - Timestamp
  - Actor ID

### Order Item Snapshots

WHEN an order is placed, THE system SHALL create a snapshot for each order item containing:

- Product name (from product snapshot)
- Product description (from product snapshot)
- Category (from product snapshot)
- Base price (from product snapshot)
- Variant option values (from product-snapshot-SKV)
- Variant SKU (from product-snapshot-SKV)
- Variant price (from product-snapshot-SKV)
- Seller shop name (from seller profile snapshot)
- Seller logo (from seller profile snapshot)
- Quantity
- Item total price
- Timestamp of order

These snapshots SHALL be immutable and SHALL NEVER be updated even if the original product, variant, or seller changes.

### Review Snapshots

WHEN a review is created, THE system SHALL:

- Create a review snapshot with:
  - Rating
  - Text content
  - Customer ID
  - Product ID
  - Order ID
  - Timestamp

WHEN a review is edited, THE system SHALL:

- Create a new snapshot with updated rating or text
- Preserve the previous snapshot
- Mark the new one as current

WHEN a review is deleted, THE system SHALL:

- Create a final snapshot with status = "deleted"
- Preserve the content for audit
- Anonymize reviewer display name to "Deleted User"

### Cancellation and Refund Request Snapshots

WHEN a cancellation request is submitted, THE system SHALL create a snapshot containing:

- Order item ID
- Request timestamp
- Customer ID
- Reason (text)
- Status = "pending"
- Version = 1

WHEN a seller responds to a cancellation request, THE system SHALL create an updated snapshot:

- New status: "approved" or "rejected"
- Response timestamp
- Seller ID
- Rejection reason (if applicable)
- Parent request ID

WHEN a refund request is submitted, THE system SHALL create a snapshot containing:

- Order item ID
- Request timestamp
- Customer ID
- Reason (text)
- Status = "pending"
- Version = 1
- Delivery timestamp (for window validation)

WHEN a seller responds to a refund request, THE system SHALL create an updated snapshot:

- New status: "approved" or "rejected"
- Response timestamp
- Seller ID
- Rejection reason (if applicable)
- Parent request ID

### Snapshot Archiving and Access

ALL snapshots SHALL be stored indefinitely.

Snapshots SHALL be retrievable by:

- The owner of the entity
- Administrators
- Parties involved in disputed transactions

Snapshots SHALL be immutable and SHALL NOT be deleted under any circumstances.

Snapshots SHALL support versioning tree navigation: from current → previous → previous → ... → initial

## Products

WHEN a seller creates a product, THE system SHALL require:

- Name (minimum 3 characters, maximum 200 characters)
- Description (minimum 10 characters, maximum 5,000 characters)
- Category (must be active and not deleted)
- Base price (positive number, maximum 2 decimal places, ≥ 0.01)

WHEN a seller creates a product with no variants, THE system SHALL:

- Allow creation
- Set product status to "active"
- Display as "Unavailable" on frontend
- Permit editing later

WHEN a product is created, THE system SHALL:

- Generate a unique product ID (UUIDv7)
- Associate with seller account
- Set creation timestamp
- Create initial product snapshot

WHEN a seller edits a product, THE system SHALL:

- Require authentication as product owner
- Allow update of:
  - Name
  - Description
  - Category
  - Base price
- Prevent update of:
  - Product ID
  - Seller ID
  - Creation timestamp
- Create a new product snapshot

WHEN a seller deletes a product, THE system SHALL:

- Verify no products have order items with status "paid" or "shipped"
- Verify no pending cancellation or refund requests exist for any variant
- If violations found, return error: "Cannot delete product with active orders or claims."
- If clear, logically delete product (set deleted flag to true)
- Preserve product snapshot history

WHEN a product is deleted, THE system SHALL:

- No longer appear in search results
- No longer appear in category lists
- Be inaccessible for purchase
- Remain accessible only via its snapshot data for past orders

## Product Images

WHEN a seller uploads an image for a product, THE system SHALL:

- Accept: JPEG, PNG, WebP
- Validate: ≤ 10MB file size
- Validate: Valid image MIME type
- Generate unique filename using UUIDv7
- Store in immutable storage with read-only access key
- Record:
  - Image ID
  - Product ID
  - URL
  - File size
  - Dimensions (width, height)
  - Creation timestamp
  - Sort order (0)

WHEN a seller reorders product images, THE system SHALL:

- Update sort order for each image
- Create a product snapshot with new order
- Preserve prior order in previous snapshot

WHEN a seller deletes an image, THE system SHALL:

- Remove from image list
- Create a product snapshot without the image
- Preserve the image file in storage (never delete)
- Ensure future snapshots still reference the preserved image

WHEN a product has no images, THE system SHALL display a default placeholder (e.g., "product-placeholder.jpg")

## Product Variants (SKU)

WHEN a seller creates a variant, THE system SHALL require:

- SKU code (alphanumeric, 3-20 characters, unique across all products)
- At least one option value (e.g., color: "Red")
- Stock quantity ≥ 0
- Optional price override (≥ 0)

WHEN a product has no variants, THE system SHALL:

- Allow viewing
- Show "Unavailable" on product detail and listing pages
- Prevent addition to cart

WHEN a product has one or more variants, THE system SHALL:

- Display all active variants on product detail page
- Allow selection for cart addition
- Update stock visibility in real time

WHEN a seller edits a variant, THE system SHALL:

- Allow change to:
  - SKU code (must remain unique)
  - Option values
  - Price override
- Prevent change to:
  - Product ID
  - Variant ID
  - Creation timestamp
- Require a new product-snapshot-SKV

WHEN a seller deletes a variant, THE system SHALL:

- Verify no order items with status "paid" or "shipped"
- Verify no pending cancellation or refund requests
- If violations found, return: "Cannot delete variant with active orders or claims."
- If clear, delete variant and create final snapshot

WHEN a product has zero active variants, THE system SHALL:

- Remain visible in search
- Display as "Unavailable" on listing and detail pages
- Prevent cart addition

## Inventory Management

WHEN inventory is restocked (seller adds items), THE system SHALL:

- Create an inventory history record with:
  - Change: positive number (quantity added)
  - Reason: "restock"
  - Actor: seller ID
  - Timestamp: now
  - Variant ID
  - Before: pre-change quantity
  - After: new total

WHEN inventory is adjusted downward (loss or deduction), THE system SHALL:

- Create an inventory history record with:
  - Change: negative number (quantity removed)
  - Reason: "adjustment" or "loss"
  - Actor: seller ID
  - Timestamp: now
  - Variant ID
  - Before: pre-change quantity
  - After: new total

WHEN an order is placed, THE system SHALL create an inventory history record:

- Change: negative value equal to quantity purchased
- Reason: "order purchase"
- Actor: system
- Variant ID
- Timestamp: order confirmation time
- Reference: order item ID

WHEN a cancellation is approved, THE system SHALL:

- Create inventory history record:
  - Change: positive value = canceled quantity
  - Reason: "cancellation approval"

WHEN a refund is approved, THE system SHALL:

- Create inventory history record:
  - Change: positive value = refunded quantity
  - Reason: "refund approval"

WHEN a variant's stock reaches 0, THE system SHALL:

- Set status to "out of stock"
- Display "Out of Stock" on product page and cart
- Prevent cart addition for that variant

WHEN a variant's stock is restored to > 0, THE system SHALL:

- Set status to "in stock"
- Display available quantity
- Permit cart addition

WHEN an inventory update is attempted, THE system SHALL:

- Lock variant for atomic write
- Recalculate total immediately
- Return current total stock after update

## Product Search

WHEN a customer searches for a product, THE system SHALL:

- Search product names in full text
- Include search matches in variant option values
- Apply case-insensitive matching
- Support partial word matching ("blu" matches "blue")
- Sort results by newest first by default

WHEN a customer applies a filter by category, THE system SHALL:

- Match the selected category and all its subcategories
- Exclude all other categories

WHEN a customer applies a price range filter, THE system SHALL:

- Use the lowest variant price as "min"
- Use the highest variant price as "max"
- If no variants, use base price
- Filter results to include only those within range

WHEN a customer applies "In-stock only" filter, THE system SHALL:

- Include products that have at least one variant with stock > 0
- Exclude products where all variants have stock = 0

WHEN a customer sorts by "Price: Low to High", THE system SHALL:

- Sort by minimum variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by creation date (newest first)

WHEN a customer sorts by "Price: High to Low", THE system SHALL:

- Sort by maximum variant price (or base price if no variants)
- Secondary sort by product name
- Tertiary sort by creation date (newest first)

WHEN a customer sorts by "Newest First", THE system SHALL:

- Sort by product creation date (descending)
- Secondary sort by product name
- Tertiary sort by minimum variant price

## Product Listing

WHEN a customer views a product listing (search, category), THE system SHALL display:

- Thumbnail image (first image in sorted list)
- Product name
- Price range (min: $x, max: $y) if variants exist
- Base price if no variants exist or if "Unavailable"
- Seller shop name
- Average rating (1–5 stars, one decimal place)
- Review count
- Stock status: "In Stock" or "Out of Stock"

IF a product has no variants, THE system SHALL display "Unavailable" as the price and "Out of Stock" as the stock status.

WHEN a product's seller changes their shop name, THE system SHALL:

- Display current shop name in profile listings
- Preserve and display historical shop name in past listings

WHEN a category is deleted, THE system SHALL:

- Display "Uncategorized" as category name in listing
- Preserve snapshot association

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:

- All images in sorted order
- Product name and description
- Category
- Seller shop name (linked to seller profile)
- All active variants with:
  - SKU code
  - Option values
  - Price
  - Stock status
- Average rating (rounded to one decimal place)
- Total review count
- All non-deleted reviews

WHEN a variant is out of stock, THE system SHALL:

- Display "Out of Stock"
- Prevent cart addition
- Display warning message: "This item is currently out of stock."

WHEN a customer selects variant options, THE system SHALL:

- Display correct price
- Validate current stock
- Allow addition to cart if in stock

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:

- Accept only product ID (not variant ID)
- Validate the product is active and not deleted
- Store: timestamp, customer ID, product ID
- Prevent duplicate entries

WHEN a customer views their wishlist, THE system SHALL display:

- Thumbnail image
- Product name
- Price range or "Unavailable"
- Seller shop name
- Average rating
- Review count
- Stock status: "In Stock" or "Out of Stock"
- "Remove" button

WHEN a product is deleted by a seller, THE system SHALL:

- Automatically remove the product from all customers' wishlists
- No longer appear in wishlist views

WHEN a customer removes a product from their wishlist, THE system SHALL:

- Delete the wishlist entry
- Record the removal timestamp
- Preserve deletion history

## Shopping Cart

WHEN a customer adds a variant to cart, THE system SHALL:

- Require selection of a specific variant
- Validate quantity ≥ 1
- Validate current stock ≥ quantity
- Validate variant is not deleted
- Add item to cart:
  - If variant already present, sum quantities
  - Else, create new cart item

WHEN a customer changes cart quantity, THE system SHALL:

- Validate new quantity ≤ current stock
- If exceeds stock, display: "Maximum quantity available: x"
- Recalculate subtotal
- Recalculate cart total
- Prevent zero quantity

WHEN a customer removes an item from cart, THE system SHALL:

- Delete the cart item
- Recalculate cart total
- Record deletion timestamp

WHEN a variant's stock drops below cart quantity, THE system SHALL:

- Display warning: "Stock low: only x left in stock"
- Prevent checkout until quantity is reduced
- Do not auto-adjust cart

WHEN a variant is deleted, THE system SHALL:

- Mark cart item as "Unavailable"
- Display: "This variant is no longer available."
- Prevent checkout
- Allow removal

WHEN a variant becomes out of stock, THE system SHALL:

- Mark cart item as "Out of Stock"
- Display warning
- Prevent checkout

WHEN a customer proceeds to checkout, THE system SHALL:

- Check all cart items have stock > 0 and are not deleted
- Hide or disable items that are unavailable
- Allow checkout only if all items are available

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL:

- Verify cart contains only available items
- Require selection of a shipping address (default if none chosen)
- Display order summary:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Subtotal
  - Shipping address
  - Total
- Allow modification of cart before confirmation
- Disable changes after "Place Order" is clicked

WHEN an order is confirmed, THE system SHALL:

- Validate final stock levels (atomic)
- Create order record
- Remove cart items
- Create order items with snapshot data
- Initiate payment

## Payment

WHEN a customer confirms payment, THE system SHALL:

- Interface with external payment gateway (PCI-DSS compliant)
- Capture payment intent
- Return response: success or failure

WHEN payment fails, THE system SHALL:

- Return detailed error code (e.g., "Insufficient funds", "Card declined")
- Preserve cart state
- Do not create order
- Allow retry

WHEN payment succeeds, THE system SHALL:

- Create permanent order record
- Clear cart
- Return success page with order number
- Send confirmation email

## Order Creation

WHEN an order is created, THE system SHALL:

- Generate order number: "ORD-YYYYMMDD-NNNN" (sequential daily counter)
- Set order creation timestamp (Asia/Seoul timezone)
- Set shipping address
- Create one order item per cart variant
- For each order item:
  - Link to product, variant, seller
  - Copy snapshot data: product name, description, price, options, SKU, shop name, logo
  - Set item status to "paid"
  - Reduce inventory
- Clear cart
- Record payment success

## Order Structure

An order SHALL contain:

- Order number
- Creation timestamp (Asia/Seoul)
- Shipping address
- Total amount
- Status (derived from item statuses)
- One or more order items

Each order item SHALL contain:

- order_id
- variant_id
- product_id
- seller_id
- quantity
- unit_price
- item_total
- status
- created_at
- updated_at
- snapshot_hash
- Product snapshot fields (name, description, category, base price, images)
- Variant snapshot fields (SKU, options, variant price)
- Seller profile snapshot fields (shop name, description, logo)

WHERE multiple sellers are involved, THE system SHALL:

- Create separate order items for each seller
- Allow independent item statuses
- Calculate total as sum of all item totals

## Order History

WHEN a customer views their order history, THE system SHALL:

- Display orders sorted by creation timestamp (newest first)
- Paginate results (10 per page)
- Display for each order:
  - Order number
  - Creation date
  - Total price
  - Overall status

WHEN a customer views full order details, THE system SHALL display:

- Order number, total, date
- Shipping address as at time of purchase
- List of order items:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Subtotal
  - Item status
- List of shipments:
  - Shipment ID
  - Carrier name
  - Tracking number
  - Items included
  - Shipment status
  - Delivery confirmation timestamp

## Order Status

### Order Item Status

WHEN an item is created, THE system SHALL set status to "paid".

WHEN a seller marks an item as shipped, THE system SHALL set status to "shipped".

WHEN a customer confirms delivery (or automatically after 14 days), THE system SHALL set status to "delivered".

WHEN a cancellation request is approved, THE system SHALL set status to "cancelled".

WHEN a refund request is approved, THE system SHALL set status to "refunded".

### Order Status

WHEN all items in an order have status "paid", THE system SHALL set order status to "paid".

WHEN any item has status "shipped" and none have "delivered", THE system SHALL set order status to "shipped".

WHEN all items have status "delivered", THE system SHALL set order status to "delivered".

WHEN all items have status "cancelled", THE system SHALL set order status to "cancelled".

WHEN all items have status "refunded", THE system SHALL set order status to "refunded".

WHEN an order has mixed statuses (e.g., one delivered, one cancelled), THE system SHALL set order status to "partially completed".

## Shipping and Tracking

### Shipment Creation

WHEN a seller ships items, THE system SHALL:

- Allow selection of multiple order items from their products
- Require entry of:
  - Carrier name
  - Tracking number
- Permit one or more items in one shipment
- Group items by seller only
- Create shipment record:
  - Shipment ID
  - List of order item IDs
  - Carrier
  - Tracking number
  - Created timestamp
- Set selected items’ status to "shipped"

### Delivery Confirmation

WHEN a customer receives a shipment, THE system SHALL:

- Allow customer to confirm delivery per shipment (not per item)
- On confirmation:
  - Set all items in shipment to "delivered"
  - Record confirmation timestamp
  - Notify seller

WHEN no delivery confirmation occurs within 14 days of shipment date, THE system SHALL:

- Automatically set all items in the shipment to "delivered"
- Record system-generated confirmation timestamp
- Notify seller and customer

## Order Cancellation

WHEN a customer requests cancellation for a "paid" item, THE system SHALL:

- Require a text reason (10–500 characters)
- Create a cancellation request snapshot
- Set request status to "pending"
- Temporarily reserve stock
- Prevent seller from shipping

WHEN a seller approves a cancellation request, THE system SHALL:

- Set item status to "cancelled"
- Create a response snapshot
- Restore inventory via positive inventory record
- Record: "cancellation approved"

WHEN a seller rejects a cancellation request, THE system SHALL:

- Create a response snapshot
- Set request status to "rejected"
- Keep item status unchanged
- Allow seller to include rejection reason

WHEN a cancellation request remains unattended for 48 hours, THE system SHALL:

- Automatically approve the cancellation
- Create "auto-approved" response snapshot
- Restore inventory

## Refund Requests

WHEN a customer requests refund for a "delivered" item, THE system SHALL:

- Require a text reason (10–500 characters)
- Create a refund request snapshot
- Set request status to "pending"

WHEN a seller approves a refund request, THE system SHALL:

- Set item status to "refunded"
- Create response snapshot
- Restore inventory
- Initiate external payment refund

WHEN a seller rejects a refund request, THE system SHALL:

- Create response snapshot
- Set request status to "rejected"
- Keep item status unchanged
- Allow seller to include rejection reason

WHEN a refund request remains unattended for 72 hours, THE system SHALL:

- Automatically approve the refund
- Create "auto-approved" response snapshot
- Restore inventory
- Initiate external payment refund

## Reviews and Ratings

WHEN a customer writes a review, THE system SHALL:

- Allow only if order item status is "delivered"
- Require rating (1–5)
- Allow optional text (≤1000 characters)
- Record: customer ID, product ID, order ID, timestamp
- Create review snapshot

WHEN a customer edits a review, THE system SHALL:

- Allow only within 7 days of creation
- Create new review snapshot with updated values
- Record edit timestamp

WHEN a customer deletes a review, THE system SHALL:

- Create final review snapshot with status "deleted"
- Hide from product detail page
- Recalculate product average rating
- Preserve snapshot forever

WHEN a product's review rating changes, THE system SHALL:

- Update cached average rating (mean of non-deleted reviews)
- Update total review count
- Round to one decimal place

WHEN a product has no reviews, THE system SHALL display: "No ratings yet."

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:

- Total products
- Total order items (for their products)
- Number of pending cancellation requests
- Number of pending refund requests

WHEN a seller views their order items, THE system SHALL:

- Show items for products they own
- Filter by status
- Show:
  - Order number
  - Customer (name or "deleted user")
  - Product name
  - Quantity
  - Unit price
  - Item status
  - Creation timestamp
- Allow access to product and variant snapshots

## Administrator System

### Administrator Role

WHEN a user submits an administrator request, THE system SHALL:

- Record the request
- Include reason (10–500 characters)
- Record timestamp

WHEN a super administrator approves a request, THE system SHALL:

- Change user role to "administrator"
- Record approval timestamp
- Send confirmation to user

WHEN a super administrator promotes a regular administrator, THE system SHALL:

- Change role to "super administrator"
- Record promotion timestamp and actor
- Send notification

WHEN a super administrator demotes a super administrator, THE system SHALL:

- Change role to "administrator"
- Record demotion timestamp and actor
- Send notification

WHEN a super administrator attempts to demote themselves, THE system SHALL:

- Deny the request
- Display: "Super administrators cannot demote themselves."

### Seller Management

WHEN an administrator views pending seller applications, THE system SHALL:

- Show list of:
  - Email
  - Shop name
  - Description
  - Registration timestamp
  - Status (pending)

WHEN an administrator approves a seller, THE system SHALL:

- Set seller status to "approved"
- Notify seller
- Allow product listings

WHEN an administrator rejects a seller, THE system SHALL:

- Set seller status to "rejected"
- Record rejection reason
- Notify seller with reason
- Allow resubmission

WHEN an administrator suspends a seller, THE system SHALL:

- Set seller status to "suspended"
- Hide seller's products from search and categories
- Prevent new product creation or editing
- Allow seller to:
  - Process existing orders
  - Respond to cancellation/refund requests
- Prevent seller from:
  - Editing shop profile
  - Adding new products
- Notify seller

WHEN an administrator unsuspends a seller, THE system SHALL:

- Set seller status to "approved"
- Restore product visibility
- Allow product creation and editing
- Notify seller

### Category Management

WHEN an administrator creates a category, THE system SHALL:

- Require name and description
- Allow parent category (for subcategories)
- Prevent nesting beyond one level
- Record creation timestamp

WHEN an administrator edits a category, THE system SHALL:

- Allow changes to name and description
- Prevent changes to parent category if products are assigned
- Create category snapshot

WHEN an administrator deletes a category, THE system SHALL:

- Mark as "deleted"
- Re-assign all products to "uncategorized"
- Preserve historical category data

### Product Oversight

WHEN an administrator views all products, THE system SHALL:

- See all products, regardless of seller
- Filter by:
  - Seller
  - Category
  - Status (active, deleted, suspended)
- View all snapshots

WHEN an administrator deletes a product, THE system SHALL:

- Logically delete product
- Preserve snapshots
- Notify seller and affected customers
- Record admin ID and reason

### Order Oversight

WHEN an administrator views any order, THE system SHALL:

- See complete order history
- Filter by:
  - Customer
  - Seller
  - Date
  - Status
- View all order item snapshots
- Manually force-cancel an item (set status to "cancelled", restore inventory)
- Manually force-refund an item (set status to "refunded", restore inventory, initiate refund)

### User Management

WHEN an administrator views customer accounts, THE system SHALL:

- See:
  - Username
  - Email
  - Registration date
  - Last login
  - Account status (active, banned)

WHEN an administrator bans a customer, THE system SHALL:

- Set status to "banned"
- Prevent login
- Preserve all past orders and reviews
- Record admin and reason

WHEN an administrator unbans a customer, THE system SHALL:

- Set status to "active"
- Permit login again
- Notify customer

WHEN an administrator views seller accounts, THE system SHALL:

- See:
  - Shop name
  - Email
  - Status (pending, approved, rejected, suspended)
  - Registration date
  - Last login

WHEN an administrator bans a seller, THE system SHALL:

- Set status to "banned"
- Prevent login
- Hide products
- Prevent new or editing products
- Allow processing of existing orders
- Record admin and reason

WHEN an administrator unbans a seller, THE system SHALL:

- Set status to "approved"
- Allow login
- Restore product visibility
- Restore editing capability
- Notify seller

## Business Logic Summary

All requirements above are mandatory. The system shall behave exactly as specified for every scenario described. No assumptions allowed.

### Performance Requirements

- Product search results ≤ 1.5s
- Product detail page load ≤ 2s
- Cart update response ≤ 500ms
- Checkout completion ≤ 3s
- Inventory update ≤ 1s
- Snapshot creation ≤ 500ms
- API response time ≤ 2s

### Error Handling Standards

- All failures return appropriate HTTP status code
- All errors return structured JSON with code and human-readable message
- No system internals exposed in error messages
- All messages are localized to user’s language locale

### Compliance Requirements

- GDPR and CCPA compliant
- Encryption at rest and in transit
- PCI-DSS compliant payment gateway
- All financial records retained 7 years
- All snapshots preserved indefinitely
- All administrative actions audited

### Non-Functional Requirements

- 99.9% uptime
- Support 10,000 concurrent users
- API response time ≤ 2s (95th percentile)
- Maximum queue time for order processing < 5s
- Search index update ≤ 100ms after data change
- Mobile web experience fully functional

All requirements above define the full business specification.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*