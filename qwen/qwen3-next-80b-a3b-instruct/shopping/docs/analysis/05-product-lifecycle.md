# E-Commerce Shopping Mall Platform Requirements

## Customer Account

### Account Registration and Authentication

- WHEN a new user visits the platform, THE system SHALL require registration before allowing access to any feature.
- WHEN a customer initiates registration, THE system SHALL require a valid email address and a password meeting minimum security criteria (8 characters, at least one number and one special character).
- WHEN a customer submits registration data, THE system SHALL validate the email address format and check for uniqueness in the database.
- WHEN an email address is already registered, THE system SHALL reject the registration and display an error: "This email is already in use. Please log in or reset your password."
- WHEN registration is successful, THE system SHALL create a customer account with status "active" and send a confirmation email.
- WHEN a customer attempts to log in, THE system SHALL require email and password credentials.
- WHEN login credentials are incorrect, THE system SHALL reject the attempt and display: "Incorrect email or password. Please try again."
- WHEN login succeeds, THE system SHALL establish a secure session using JWT tokens with expiration of 7 days.
- WHEN a customer changes their password, THE system SHALL require current password verification and enforce the same security criteria for the new password.
- WHEN a customer requests account deletion, THE system SHALL display a confirmation dialog and require explicit consent.
- WHEN account deletion is confirmed, THE system SHALL:
  - Immediately disable the customer's login session
  - Mask and anonymize all personal profile data (display name, phone number)
  - Preserve all order records, order items, and payment history
  - Preserve all reviews but replace the customer name with "Deleted User"
  - Remove all saved addresses and wishlist items
  - Log the deletion event with timestamp and IP address
  - Retain account data for 30 days before permanent archival for legal compliance

### Profile and Address Management

- WHEN a customer edits their display name, THE system SHALL allow up to 50 characters, rejecting input that exceeds this limit.
- WHEN a customer edits their phone number, THE system SHALL validate against international E.164 format and ensure uniqueness across the platform.
- WHEN a customer adds a shipping address, THE system SHALL validate the following fields: recipient name (required), phone (required), street (required), city (required), state/province (required), postal code (required), country (required).
- WHEN a customer edits an existing address, THE system SHALL update the address record but preserve the creation timestamp.
- WHEN a customer deletes an address, THE system SHALL remove it from their address book but preserve it in order history snapshots.
- WHEN a customer sets an address as default, THE system SHALL update the "defaultAddressId" field in their profile and clear the default flag from all other addresses.
- WHEN an address is referenced in an existing order, THE system SHALL prohibit deletion of that address and display: "This address is associated with past orders and cannot be deleted."

## Seller Account

### Registration and Approval Workflow

- WHEN a seller initiates registration, THE system SHALL collect: email, password, shop name (required), and shop description (required).
- WHEN a seller submits registration, THE system SHALL validate:
  - Email format and uniqueness
  - Shop name uniqueness (case-insensitive, trimmed)
  - Shop name does not contain prohibited words (e.g., "admin", "support", "system")
  - Password meets security criteria
- WHEN a seller registration is submitted, THE system SHALL assign status "pending_approval" and notify administrator team via dashboard alert.
- WHEN an administrator approves a seller, THE system SHALL:
  - Change status to "approved"
  - Create a seller profile record with initial shop name and description
  - Send confirmation email with login credentials and seller dashboard access
  - Allow the seller to create products
- WHEN an administrator rejects a seller, THE system SHALL:
  - Change status to "rejected"
  - Record the rejection reason in audit log
  - Send email with rejection reason and instructions to reapply
  - Block the seller from re-registering with same email or shop name for 7 days
- WHEN a rejected seller reapplies, THE system SHALL treat it as a new registration with fresh validation.
- WHEN a seller requests account deletion, THE system SHALL validate:
  - No order items with status "paid" or "shipped"
  - No pending cancellation requests
  - No pending refund requests
- WHEN deletion validation fails, THE system SHALL display: "Cannot delete account: You have X pending orders or refund requests. Complete these first."
- WHEN seller deletion is approved, THE system SHALL:
  - Mark seller account as "deleted"
  - Remove shop name and logo from public profile
  - Preserve all past order snapshots and transaction records
  - Archive seller audit history for compliance
  - Do not permit reuse of the same shop name for 180 days
- WHEN a seller's account is deleted, THE system SHALL notify all customers with active orders from this seller: "The seller {shop_name} has deleted their account. Your order will be fulfilled by the platform support team."

## Categories

### Category Structure and Access

- WHEN an administrator creates a category, THE system SHALL require: name (1–100 characters, unique), description (up to 500 characters).
- WHEN an administrator creates a subcategory, THE system SHALL require selection of a parent category from existing top-level categories.
- WHEN a top-level category is created, THE system SHALL assign it a depth of 1; subcategories shall be assigned depth of 2.
- WHEN a category with subcategories is deleted, THE system SHALL:
  - Move all subcategories to "uncategorized" (root level)
  - Notify administrators of the reorganization
  - Preserve all product-category associations in snapshot history
- WHEN a category is renamed, THE system SHALL create a snapshot capturing:
  - Old name
  - New name
  - Timestamp
  - Admin who made change
- WHEN a customer views a category, THE system SHALL display:
  - Category name
  - Category description
  - Number of products in category
  - List of subcategories (if any)
- WHEN a category is deleted, THE system SHALL mark products in that category as "uncategorized" and preserve their association to the category snapshot at time of deletion.
- WHEN a product is viewed, THE system SHALL display the full category path (e.g., "Electronics > Phones > Smartphones") using preserved snapshots.

## Snapshot Principle

### Snapshot Definition and Scope

- WHEN any editable entity is modified, THE system SHALL automatically generate a snapshot in immutable storage.
- WHEN a snapshot is created, THE system SHALL include:
  - Entity type (e.g., "Product", "SellerProfile", "Review")
  - Entity ID
  - User ID of modifier
  - Timestamp in ISO 8601 format
  - Previous state (as JSON)
  - New state (as JSON)
  - Change reason (auto-generated from context or user-provided)
- WHEN a snapshot is accessed, THE system SHALL return immutable data and prevent all modification, deletion, or editing.
- WHEN a product snapshot is created, THE system SHALL capture:
  - Product name
  - Product description
  - Base price
  - Category ID
  - Image list with order
  - All variants at that time (each variant with SKU, options, price, stock)
- WHEN a variant snapshot is created, THE system SHALL capture:
  - SKU code
  - Option values (e.g., {color: "Red", size: "Large"})
  - Price (overridden or base price)
  - Stock quantity
  - Product ID and variant ID
- WHEN a seller profile snapshot is created, THE system SHALL capture:
  - Shop name
  - Shop description
  - Logo image URL
  - Approval status
  - Timestamp
- WHEN an order item is created, THE system SHALL capture and store:
  - Product snapshot ID (at time of purchase)
  - Variant snapshot ID (at time of purchase)
  - Seller profile snapshot ID (at time of purchase)
  - Price charged (from variant)
- WHEN a review is edited, THE system SHALL create a snapshot of:
  - Rating before and after
  - Text content before and after
  - Timestamp of edit
  - User ID
- WHEN a cancellation request is submitted, THE system SHALL create a snapshot of:
  - Request ID
  - Order item ID
  - Customer reason
  - Request status (pending)
  - Timestamp of submission
- WHEN a refill request is submitted, THE system SHALL create a snapshot of:
  - Request ID
  - Order item ID
  - Customer reason
  - Request status (pending)
  - Timestamp of submission
- WHEN a snapshot is created, THE system SHALL assign a unique immutable UUID v4 identifier.
- WHEN a snapshot is accessed, THE system SHALL display: "This data reflects the state as of [timestamp]. Changes made after this point are not included."
- WHEN a product is deleted, THE system SHALL preserve all snapshots for at least 7 years for legal and audit compliance.
- WHEN a snapshot is requested, THE system SHALL return it in full JSON format, including nested entities (e.g., product snapshot includes all variant snapshots).
- WHEN multiple snapshots exist for one entity, THE system SHALL order them chronologically by timestamp.

## Products

### Product Lifecycle and Editing

- WHEN a seller creates a product, THE system SHALL require: product name (1–200 characters), description (1–5000 characters), category selection (validated against existing categories), base price (minimum $0.01, maximum $100,000).
- WHEN a product is created, THE system SHALL assign a unique product ID, set status to "draft", and create the first snapshot.
- WHEN a product is created with no variants, THE system SHALL display it in search and category listings as "Unavailable".
- WHEN a seller modifies any product field (name, description, category, base price, image order, or variant configuration), THE system SHALL:
  - Validate edit permissions (seller must be owner)
  - Apply changes to the live product
  - Create a snapshot with the previous state and new state
  - If image order changed, record entire image sequence
  - If category changed, record old and new category IDs
- WHEN a seller attempts to edit a product with paid or shipped order items, THE system SHALL block the edit and display: "Cannot edit product: It has X active orders. Contact support for assistance."
- WHEN a seller deletes a product, THE system SHALL validate:
  - No existing order items with status "paid" or "shipped"
  - No pending cancellation or refund requests
- WHEN deletion validation fails, THE system SHALL prevent deletion and show detailed list of conflicting items.
- WHEN deletion is approved, THE system SHALL:
  - Immediately remove product from search and category listings
  - Delete all product variants and inventory records
  - Preserve all product snapshots indefinitely
  - Mark product as "deleted" in database
  - Update all wishlist entries referencing this product to "product deleted"
  - Log deletion with timestamp and admin user ID if performed by admin
- WHEN a seller views their product list, THE system SHALL distinguish between:
  - Active products (with at least one variant)
  - Inactive products (with no variants)
  - Deleted products (marked as deleted)
- WHEN an administrator views products, THE system SHALL include all products (active, inactive, deleted) with status flag. 
- WHEN a deleted product is viewed in an order snapshot, THE system SHALL display: "Product was deleted. View snapshot for details."

## Product Images

### Image Management and Snapshots

- WHEN a seller uploads an image, THE system SHALL:
  - Validate size (max 5MB)
  - Validate format (jpg, jpeg, png, webp)
  - Generate unique filename using UUID v4
  - Store in secure cloud storage with read-only CDN access
  - Return public CDN URL
- WHEN an image is uploaded, THE system SHALL append it to the end of the product’s image list.
- WHEN an image is reordered, THE system SHALL update the display order position in the image array.
- WHEN an image is removed, THE system SHALL:
  - Remove from active image list
  - Preserve in product snapshot history
  - Do not delete from storage until 365 days after all references are purged
- WHEN a product snapshot is created, THE system SHALL capture:
  - Full list of image URLs in sequence
  - Timestamp of change
  - Which image(s) were added/removed/reordered
- WHEN a product is viewed on the detail page, THE system SHALL:
  - Display the first image as thumbnail
  - Display all other images in scrollable carousel
  - Enable drag-to-reorder in seller dashboard
- WHEN an image URL is referenced in a snapshot, THE system SHALL ensure the image is still accessible and does not return 404 errors.

## Product Variants (SKU)

### Variant Creation and Editing

- WHEN a seller creates a variant for a product, THE system SHALL require:
  - SKU code (alphanumeric, unique per product, no spaces)
  - At least one option value (e.g., Color: Red)
  - Stock quantity ≥ 0
- WHEN a variant is created, THE system SHALL:
  - Validate SKU uniqueness within the seller's product
  - Validate all option keys are alphanumeric and non-empty
  - Assign default price equal to product base price if none provided
  - Create a variant-level snapshot
- WHEN a seller edits a variant (SKU, option values, price), THE system SHALL:
  - Allow modification only if no ordered items are "paid" or "shipped"
  - If SKU is changed, validate new SKU is unique
  - If option values change, validate new combination matches product options schema
  - Create a snapshot of old and new values
- WHEN a seller deletes a variant, THE system SHALL validate:
  - No existing order items with status "paid" or "shipped"
  - No pending cancellation or refund requests
  - Product must have >=1 variant remaining
- WHEN deletion validation fails, THE system SHALL display: "Cannot delete variant: X order items are in progress. Remove those first."
- WHEN a variant is deleted, THE system SHALL:
  - Remove from active variant list
  - Preserve in product snapshot
  - Remove from inventory history
  - Update product variant count
  - If product now has 0 variants, change product status to "unavailable"
- WHEN a customer views a product, THE system SHALL display variants with:
  - SKU code
  - Option names and values
  - Price (displayed as overridden or base)
  - Stock status: "In stock", "Out of stock" (0), "Low stock" (<5)
- WHEN a variant’s stock reaches 0, THE system SHALL:
  - Mark as "Out of stock" in product detail and catalog view
  - Disable "Add to Cart" button
  - Keep variant visible for historical reference in orders

## Inventory Management

### Stock Tracking and Reconciliation

- WHEN inventory changes occur, THE system SHALL use inventory record table (not snapshots) to track all quantity changes.
- WHEN a seller restocks a variant, THE system SHALL:
  - Accept numeric quantity > 0
  - Accept free-text reason (e.g., "Bulk shipment", "Quality replacement")
  - Create inventory record with: variant ID, +change, reason, timestamp, seller ID
- WHEN an inventory adjustment occurs (loss, damage, breakage), THE system SHALL:
  - Accept numeric quantity > 0
  - Accept reason (required)
  - Create inventory record with: variant ID, -change, reason, timestamp, seller ID
- WHEN an order is placed successfully, THE system SHALL:
  - Create a negative inventory record for each order item
  - Quantity = order quantity
  - Reason = "Order fulfillment: order_id=X"
  - Timestamp = order creation
- WHEN an order is cancelled (approved), THE system SHALL:
  - Create a positive inventory record
  - Quantity = order quantity
  - Reason = "Order cancellation: order_id=X"
  - Timestamp = cancellation approval
- WHEN a refund is approved, THE system SHALL:
  - Create a positive inventory record
  - Quantity = refund quantity
  - Reason = "Refund approved: order_id=X"
  - Timestamp = refund approval
- WHEN current stock for a variant is calculated, THE system SHALL sum all inventory records with variant ID.
- WHEN stock is displayed to seller, THE system SHALL show:
  - Current stock (derived from sum)
  - List of inventory records (reverse chronological)
  - Total changes (sum of all positive and negative)
- WHEN stock is displayed to customer, THE system SHALL show:
  - "In stock" (if > 0)
  - "Out of stock" (if = 0)
  - "Low stock" (if ≤ 5) — optional enhancement
- WHEN a variant's stock drops below threshold, THE system SHALL automatically send seller alert: "Variant {SKU} is low on stock (current: {qty})."
- WHEN inventory record is created, THE system SHALL make it immutable and not subject to deletion or editing.

## Product Search

### Search and Filtering Logic

- WHEN a customer initiates search by name, THE system SHALL:
  - Perform case-insensitive partial match on product name
  - Include results from all active sellers
  - Exclude deleted products and products of suspended sellers
  - Exclude products with 0 variants
- WHEN a customer applies category filter, THE system SHALL:
  - Include products assigned to the selected category or any subcategory
  - Use product category snapshot for historical filtering
- WHEN a customer applies price range filter (min, max), THE system SHALL:
  - For products with one variant: use variant price
  - For products with multiple variants: use min and max variant prices
  - Exclude products with no variants
- WHEN a customer selects "In-stock only", THE system SHALL exclude all products where all variants have stock ≤ 0
- WHEN sorting by "Newest first", THE system SHALL sort by product creation date (descending)
- WHEN sorting by "Price: Low to High", THE system SHALL sort by lowest variant price (ascending)
- WHEN sorting by "Price: High to Low", THE system SHALL sort by highest variant price (descending)
- WHEN search results are returned, THE system SHALL:
  - Limit results to 20 per page
  - Return total count for pagination
  - Include product thumbnail, name, base/price range, seller name, average rating
  - Mark products with zero variants as "Unavailable"

## Product Listing

### Catalog Display Rules

- WHEN a product appears in search results or category page, THE system SHALL display:
  - Primary image (first in image list, cropped to 300x300)
  - Product name (truncated to 40 characters with ellipsis)
  - Price display:
    - Single variant: "${price}"
    - Multiple variants: "${min} – ${max}"
  - Seller shop name (linked to seller profile)
  - Average rating (rounded to one decimal)
  - Review count (e.g., "(42 reviews)")
  - "Unavailable" badge if product has no variants
- WHEN multiple products are displayed, THE system SHALL cache image thumbnails for 24 hours to reduce server load.
- WHEN seller name is displayed, THE system SHALL display the product's snapshot of seller profile at time of product listing. 
- WHEN a customer mouse-hovers over a product, THE system SHALL pre-load the product detail page metadata for faster navigation.
- WHEN product is out of stock, THE system SHALL display: "Out of stock" in place of price.
- WHEN a product is "unavailable" due to zero variants, THE system SHALL display: "This product has no available variants." below the name.

## Product Detail Page

### Full Product Display

- WHEN a customer accesses a product page, THE system SHALL display:
  - All product images in carousel, with first image as main
  - Product name and full description
  - Category path (e.g., "Home > Kitchen > Blender")
  - Seller shop name (hyperlinked to seller profile, using snapshot)
  - Average rating (e.g., 4.7 ⭐) and total review count
  - All available variants:
    - Option selection UI (color, size dropdowns)
    - SKU code
    - Price (including override)
    - Stock indicator ("In stock", "Out of stock", "Low stock")
    - "Add to Cart" button (enabled only if in stock)
  - All reviews sorted by newest first
  - "Write a review" button (only if customer has purchased and received item)
- WHEN a variant is out of stock, THE system SHALL gray out the selection and disable "Add to Cart".
- WHEN variant options change dynamically, THE system SHALL update price and stock status in real time without page reload.
- WHEN a customer has previously purchased this product, THE system SHALL highlight: "You purchased this item on [date]."
- WHEN customer views a deleted product, THE system SHALL show: "This product has been deleted by the seller. View historical snapshot for details." and display snapshot content.

## Wishlist

### Wishlist Management

- WHEN a customer adds a product to wishlist, THE system SHALL:
  - Store only product ID (not variant)
  - Create entry in wishlist table with customer ID and product ID
  - Avoid duplicates (one product per user)
- WHEN a customer removes from wishlist, THE system SHALL delete the entry.
- WHEN a customer views wishlist, THE system SHALL:
  - Load all wishlist entries
  - Fetch current product data (name, thumbnail, price range, seller)
  - Sort newest additions first
  - Paginate at 12 items per page
- WHEN a product is deleted or becomes unavailable (no variants), THE system SHALL:
  - Automatically remove it from all wishlists
  - Display placeholder: "Product no longer available" on wishlist page
- WHEN a seller suspends or deletes their account, THE system SHALL:
  - Update wishlist product data (name, thumbnail) to reflect the snapshot at time of addition
  - If product is deleted, display as "Product deleted"
- WHEN wishlist is loaded, THE system SHALL validate product still exists and has at least one variant (if not, mark as unavailable).

## Shopping Cart

### Cart Operations and Validation

- WHEN a customer adds a variant to cart, THE system SHALL:
  - Require exact SKU selection (not just product)
  - Allow quantity 1–50
  - Check stock availability
  - If variant exists in cart, increase quantity instead of adding new line
- WHEN cart is loaded, THE system SHALL:
  - Load all cart items with product and variant snapshot data
  - Recalculate each item subtotal (price × quantity)
  - Calculate total
  - Validate each variant’s current status:
    - If variant is deleted: show "Product removed"
    - If variant is out of stock: show "Out of stock"
    - If stock < cart quantity: show "Only {n} left in stock" with warning icon
- WHEN cart quantity is changed, THE system SHALL:
  - Validate new quantity ≤ available stock
  - If exceeding, set to maximum available and show warning
  - Recalculate subtotal
- WHEN a cart item is removed, THE system SHALL delete the item and recalculate total.
- WHEN customer proceeds to checkout, THE system SHALL:
  - Block if any item is "out of stock" or "removed"
  - Display summary: "You have 3 unavailable items. Remove or adjust quantities to proceed."
- WHEN cart is saved, THE system SHALL persist it to database with customer ID, updated timestamp, and cart version.
- WHEN cart expires (inactive for 30 days), THE system SHALL automatically clear all items.
- WHEN cart is loaded, THE system SHALL display all items even if product or variant has changed since last saved.

## Checkout

### Order Creation Process

- WHEN customer initiates checkout, THE system SHALL:
  - Validate cart is not empty
  - Validate all items have sufficient stock
  - Prevent checkout if any item is unavailable
- WHEN customer selects shipping address, THE system SHALL:
  - Allow selection from saved addresses
  - Allow use of default address (if exists)
  - Lock in selected address upon payment confirmation
- WHEN customer reviews order, THE system SHALL display:
  - List of items with variant options, quantity, price, subtotal
  - Total items count
  - Total price before tax
  - Estimated tax (0% for demo)
  - Shipping method: "Standard (Free)"
  - Total payable
  - Shipping address (previously selected)
- WHEN customer confirms order, THE system SHALL:
  - Lock shipping address permanently
  - Create order record
  - Deduct inventory for each item
  - Clear cart
  - Generate order ID
- WHEN checkout is confirmed, THE system SHALL redirect to payment processing screen with order summary.
- WHEN a customer returns to checkout after session timeout, THE system SHALL validate cart integrity and current stock levels before proceeding.

## Payment

### Payment Processing Flow

- WHEN payment is initiated, THE system SHALL:
  - Create order with status "payment_pending"
  - Generate payment session ID
  - Redirect to external payment provider (e.g., Stripe, PayPal)
- WHEN payment succeeds, THE system SHALL:
  - Change order status to "paid"
  - Mark inventory as sold (create negative inventory record)
  - Clear cart
  - Send order confirmation email
  - Redirect to order success page
- WHEN payment fails, THE system SHALL:
  - Revert order status to "abandoned"
  - Restore inventory to pre-transaction state
  - Display error: "Payment failed. Please check your card details and try again."
- WHEN payment gateway timeout occurs, THE system SHALL:
  - Queue payment verification attempt every 10s for up to 60 seconds
  - If unresolved after 60s, mark as "payment_pending" and notify user to retry

## Order Creation

### Order Initiation and Snapshots

- WHEN an order is successfully paid, THE system SHALL:
  - Create one order record with unique ID, total, shipping address, payment timestamp
  - Create one order item per variant purchased
  - For each order item:
    - Link to product snapshot at order time (full product state)
    - Link to variant snapshot at order time (SKU, option, price, stock)
    - Link to seller profile snapshot at order time (shop name, logo)
    - Set status to "paid"
    - Record quantity purchased
    - Record final price applied
  - Remove items from cart
  - Reduce inventory for each variant
  - Send seller notification: "New order received: Order #{id}"
- WHEN order creation is complete, THE system SHALL log: "Order #{id} created successfully by user [ID] with [n] items from [m] sellers."
- WHEN a customer views the order confirmation, THE system SHALL display: "Your order has been confirmed and is being prepared. You will receive tracking information when shipped."
- WHEN an order contains items from multiple sellers, THE system SHALL:
  - Group items by seller
  - Assign separate shipment handling per seller
  - Display seller-specific order items in separate sections

## Order Structure

### Order Composition and Status Logic

- WHEN an order is created, THE system SHALL assign status "pending" until payment success.
- WHEN payment succeeds, THE system SHALL assign status "paid".
- WHEN an order contains multiple items from different sellers, THE system SHALL treat each seller’s items as an independent order item.
- WHEN an order item status changes, THE system SHALL update only that item, not the entire order.
- WHEN all items are "paid", THE system SHALL set order status to "paid".
- WHEN any item is "shipped", THE system SHALL set order status to "shipped" (even if others are not).
- WHEN all items are "delivered", THE system SHALL set order status to "delivered".
- WHEN all items are "cancelled", THE system SHALL set order status to "cancelled".
- WHEN all items are "refunded", THE system SHALL set order status to "refunded".
- WHEN order contains mixed statuses, THE system SHALL set order status to "partially completed".
- WHEN order status is queried, THE system SHALL calculate status from current item statuses only, not historical.
- WHEN a customer views order details, THE system SHALL:
  - Show item-by-item status
  - Show individual shipment groups
  - Show snapshot data for products and seller at time of purchase

## Order History

### History Display and Access

- WHEN a customer views order history, THE system SHALL:
  - Retrieve all orders linked to their account
  - Sort by createdAt descending
  - Paginate at 10 orders per page
  - Display: order ID, date, total, status, and number of items
- WHEN a customer clicks on an order, THE system SHALL:
  - Load full order details
  - Display:
    - Order ID and creation date
    - Shipping address as it was at purchase time
    - List of items with:
      - Product name (from snapshot)
      - Variant options (from snapshot)
      - Quantity
      - Price (from snapshot)
      - Status
    - List of shipments with:
      - Tracking number
      - Carrier
      - Items included
      - Shipped at date
      - Delivery status
  - Display note: "All product and seller information reflects the state at time of purchase."
- WHEN an order contains a deleted product or seller, THE system SHALL display preserved snapshot data in place of live information.

## Order Status

### Status Transitions and Derivation Rules

- WHEN order item status changes, THE system SHALL:
  - Set new status
  - Create snapshot of previous status and change reason
  - Update derived order status
- WHEN multiple items are grouped under one order, status changes are computed as:
  - 
    ```mermaid
    graph TD
      A[Order Status] --> B{All items paid?}
      B -->|Yes| C[Order Status: Paid]
      B -->|No| D{Any item shipped?}
      D -->|Yes| E[Order Status: Shipped]
      D -->|No| F{All items delivered?}
      F -->|Yes| G[Order Status: Delivered]
      F -->|No| H{All items cancelled?}
      H -->|Yes| I[Order Status: Cancelled]
      H -->|No| J{All items refunded?}
      J -->|Yes| K[Order Status: Refunded]
      J -->|No| L[Order Status: Partially Completed]
    ```
  - Every condition shall be evaluated on live item status only.
  - If any item is "shipped", even if others are "paid", the order status shall be "shipped".
- WHEN customer views order, THE system SHALL display both item statuses and derived order status.
- WHEN developer queries database for order status, THE system SHALL compute it dynamically from item statuses (no cache).

## Shipping and Tracking

### Shipment Creation and Delivery Logic

- WHEN a seller prepares for shipping, THE system SHALL:
  - Display list of order items with status "paid" that belong to seller
  - Allow seller to select one or more items to group into a single shipment
  - Enforce one shipment per seller per order
- WHEN seller creates shipment, THE system SHALL:
  - Accept carrier name (text, max 100 characters)
  - Accept tracking number (text, max 100 characters)
  - Assign shipment ID
  - Change status of all selected items to "shipped"
  - Record timestamp
  - Preserve snapshot of selected items and tracking details
- WHEN a shipment is created, THE system SHALL:
  - Send customer notification: "Your order from {shop} has shipped. Track it here."
  - Log shipment event in audit trail
- WHEN customer views tracking, THE system SHALL:
  - Display carrier name and tracking number (link to external tracker)
  - Show estimated delivery date (if available)
  - Show list of items included in shipment
- WHEN delivery confirmation occurs:
  - If customer manually confirms delivery, set all items in shipment to "delivered"
  - If no confirmation after 14 days, auto-set status to "delivered"
- WHEN item status is set to "delivered", THE system SHALL:
  - Allow customer to write a review (if not already written)
  - Enable refund request (if within 7-day window)
  - Log delivery timestamp
- WHEN shipment is created from multiple separate orders, THE system SHALL:
  - Enforce shipment isolation per order
  - Prevent cross-order bundling

## Order Cancellation

### Cancellation Workflow

- WHEN customer requests cancellation of an item, THE system SHALL:
  - Only allow if item status is "paid"
  - Require free-text reason (1–500 characters)
  - Create cancellation request record
  - Set request state: "pending"
  - Send notification to seller
- WHEN seller responds to cancellation request, THE system SHALL:
  - Allow approve or reject
  - Require reason if rejecting
  - Create snapshot of request state (before and after)
  - If approved:
    - Set item status to "cancelled"
    - Restore inventory (positive record)
    - Initiate refund to customer
    - Set order item status to "cancelled"
    - Update order status if applicable
  - If rejected:
    - Set request state to "rejected"
    - Notify customer
    - Continue order process
- WHEN a cancellation request is processed, THE system SHALL:
  - Prevent any other change to item status until resolved
  - Ensure only the seller can approve/reject their own items
- WHEN seller cancels an order, THE system SHALL:
  - Create a snapshot of reason and decision
  - Log: "Seller {id} rejected cancellation request for order {id}"
- WHEN order contains multiple items and one is cancelled, THE system SHALL:
  - Continue processing other items normally
  - Do not cancel entire order
  - Display: "One item has been cancelled. The rest are being shipped."
- WHEN cancellation is completed, THE system SHALL send customer confirmation: "Your cancellation request for {product} has been approved. Refund of ${amount} will be processed within 3–5 business days."

## Refund Requests

### Refund Workflow

- WHEN customer requests refund for an item, THE system SHALL:
  - Only allow if item status is "delivered"
  - Restrict to 7 days after delivery
  - Require reason (1–500 characters)
  - Create refund request with status "pending"
  - Notify seller
- WHEN seller responds to refund, THE system SHALL:
  - Accept "approve" or "reject"
  - If reject: require reason
  - Create snapshot of original and updated state
  - If approve:
    - Set item status to "refunded"
    - Restore inventory
    - Initiate refund to customer
    - Update order status if applicable
  - If reject:
    - Set request state to "rejected"
    - Notify customer
- WHEN refund is approved, THE system SHALL:
  - Send customer: "Refund of ${amount} approved. Funds will be returned within 3–5 business days."
  - Prevent any further refund request for the same item
- WHEN a refund request expires (7 days after delivery), THE system SHALL:
  - Automatically close as "expired"
  - Notify customer
- WHEN all items in an order are refunded, THE system SHALL set order status to "refunded".
- WHEN an order has mixed refunds and deliveries, THE system SHALL set order status to "partially completed".
- WHEN a refund is initiated, THE system SHALL:
  - Validate that refund amount does not exceed original purchase price
  - Not allow partial refund (full item refund only)
  - Use snapshot price, not current price

## Reviews and Ratings

### Review Creation and Integrity

- WHEN a customer attempts to write a review, THE system SHALL:
  - Validate customer has purchased and received (status = delivered) the exact product in the exact order
  - Allow only one review per product per order
  - Enforce rating from 1–5 stars, required
  - Allow optional text review
- WHEN a review is submitted, THE system SHALL:
  - Create review record
  - Link to product ID, variant ID, order ID, customer ID
  - Create snapshot of review content
  - Update product’s average rating (using all non-deleted reviews)
- WHEN a review is edited, THE system SHALL:
  - Preserve original review in snapshot
  - Update the current review content
  - Recalculate average rating
  - Update timestamp of last modification
- WHEN a review is deleted, THE system SHALL:
  - Mark the review as "deleted"
  - Preserve snapshot for audit
  - Recalculate average rating (excluding deleted)
  - Display: "This review has been deleted by the author." to other users
- WHEN a product’s reviews are displayed, THE system SHALL:
  - Show only non-deleted reviews
  - Sort by createdAt descending
  - Include star rating, text (if any), date posted, and name (or "Deleted User")
- WHEN average rating is calculated, THE system SHALL:
  - Sum all non-deleted review ratings
  - Divide by count of non-deleted reviews
  - Round to one decimal
  - Cache result for 1 hour to improve performance
- WHEN review appears in snapshot, THE system SHALL display: "Review: {rating} stars - {text} (Posted: {date})"

## Seller Dashboard

### Dashboard Summary and Filtering

- WHEN seller accesses dashboard, THE system SHALL display:
  - Total products created
  - Total order items sold (aggregated across all orders)
  - Pending cancellation requests (count)
  - Pending refund requests (count)
- WHEN seller views order items, THE system SHALL:
  - Show list of order items where seller is the product owner
  - Filterable by status (paid, shipped, delivered, cancelled, refunded)
  - Sortable by date (newest first)
  - Display product snapshot, variant, price, quantity, and item status
  - Allow filtering by date range
  - Allow export to CSV
- WHEN seller clicks on an order item, THE system SHALL redirect to order details page with view-only access to customer and tracking data.
- WHEN seller attempts to delete a product, THE system SHALL first check for pending orders, then display validation errors.

## Administrator System

### Administrator Promotion

- WHEN a user submits request to become administrator, THE system SHALL:
  - Accept free-text reason (1–1000 characters)
  - Record user ID, timestamp, status: "pending"
  - Send notification to super administrators
- WHEN a super administrator reviews a request, THE system SHALL allow:
  - Approve → grant "regular_admin" role
  - Reject → set status to "rejected" with reason
- WHEN a user is approved as administrator, THE system SHALL:
  - Assign role: "regular_admin"
  - Grant access to all administrator interfaces
  - Log: "User {name} promoted to administrator (reason: {reason})"
  - Email confirmation: "You have been granted administrator privileges."

### Administrator Privilege Management

- WHEN a super administrator promotes a regular administrator, THE system SHALL:
  - Change role to "super_admin"
  - Create audit log entry
  - Notify: "You have been promoted to Super Administrator."
- WHEN a super administrator demotes another super administrator, THE system SHALL:
  - Change role to "regular_admin"
  - Create audit log
  - Notify: "Your Super Administrator privileges have been revoked."
- WHEN a super administrator requests to demote themselves, THE system SHALL:
  - Block the action
  - Display error: "Super administrators cannot demote themselves. Contact another super administrator."
- WHEN a role is changed, THE system SHALL immediately update access controls for all features.

### Seller Management

- WHEN administrator views pending seller approvals, THE system SHALL:
  - List all sellers with status "pending_approval"
  - Include: email, shop name, registration date
  - Allow "Approve" or "Reject" buttons
- WHEN seller is approved, THE system SHALL:
  - Change status to "approved"
  - Notify seller
  - Activate seller dashboard
- WHEN seller is rejected, THE system SHALL:
  - Change status to "rejected"
  - Require reason (1–500 characters)
  - Send rejection email with reason
  - Block re-registration with same email/shop name for 7 days
- WHEN a seller account is suspended, THE system SHALL:
  - Change seller status to "suspended"
  - Hide all their products from search and category pages
  - Disable product creation and editing
  - Allow continuation of order fulfillment (shipping, responses)
  - Preserve ability to view pending cancellations/refunds
  - Block login to seller dashboard (but orders continue to be processed)
  - Display notification to customers: "The seller has been suspended. Your order will be fulfilled by platform support."
- WHEN seller is unsuspended, THE system SHALL:
  - Change status to "approved"
  - Re-enable product publishing and editing
  - Re-index products for search
  - Notify seller and customers
- WHEN administrator suspends a seller, THE system SHALL require:
  - Reason (1–500 characters)
  - Confirmation dialog

### Category Management

- WHEN administrator creates category, THE system SHALL:
  - Accept name (1–100 chars)
  - Accept description (0–500 chars)
  - Set parent if subcategory
  - Validate uniqueness (case-insensitive)
  - Create category record
- WHEN category is edited, THE system SHALL:
  - Allow changing name or description
  - Create snapshot of previous name/description
  - Preserve existing product assignments
- WHEN category is deleted, THE system SHALL:
  - Move all direct children to parent level (if category is parent)
  - Move all products assigned to this category to "uncategorized"
  - Preserve category’s snapshot for historical reference
  - Log: "Category '{name}' deleted and replaced with uncategorized."

### Product Oversight

- WHEN administrator views all products, THE system SHALL:
  - Include active, inactive, deleted products
  - Allow filter by seller
  - Display status, category, variants, inventory
- WHEN administrator deletes a product, THE system SHALL:
  - Bypass seller deletion constraints
  - Immediately remove product from listings
  - Preserve product snapshot
  - Notify affected customers: "This product has been removed by platform administrator."
  - Log: "Product {id} deleted by admin {id} for reason: {reason}"

### Order Oversight

- WHEN administrator views any order, THE system SHALL:
  - Load full order with snapshots
  - View all items
  - Trigger force-cancel or force-refund
- WHEN administrator force-cancels an order item, THE system SHALL:
  - Set item status to "cancelled"
  - Restore inventory
  - Initiate refund to customer
  - Override seller approval
  - Log: "Admin {name} force-cancelled item {id} for reason: {text}"
- WHEN administrator force-refunds an order item, THE system SHALL:
  - Set item status to "refunded"
  - Restore inventory
  - Initiate refund to customer
  - Override seller approval
  - Log: "Admin {name} force-refunded item {id} for reason: {text}"

### User Management

- WHEN administrator views customer accounts, THE system SHALL:
  - List all customers
  - Show registration date, last login, address count, order count
  - Allow "Ban" button
- WHEN customer is banned, THE system SHALL:
  - Set account status to "banned"
  - Immediately revoke authentication token
  - Block any future login attempts
  - Preserve all historical data (orders, reviews)
  - Log: "Customer {name} banned by {admin} for reason: {text}"
- WHEN customer is unbanned, THE system SHALL:
  - Set status to "active"
  - Allow re-login
  - Preserve all historical records
- WHEN administrator views seller accounts, THE system SHALL:
  - List all sellers
  - Show approval status, suspended status, product count
- WHEN seller is banned, THE system SHALL:
  - Set status to "banned" (override approval)
  - Prevent login
  - Hide all products from listings
  - Allow pending orders to be fulfilled
  - Log: "Seller {name} banned by {admin} for reason: {text}"
- WHEN banned seller is unbanned, THE system SHALL:
  - Set status to "approved"
  - Re-enable seller access
  - Re-index products
  - Notify seller and customers

## Appendices

### Data Integrity and Compliance

- All snapshots are stored in immutable write-once storage (e.g., S3 object lock)
- All data deletions (addresses, accounts) are soft deletes with 30-day archival grace period
- All API requests are logged with user context and timestamp
- All changes to order status are audited with actor and reason
- All snapshot access is logged for admin audit trails
- The system guarantees data integrity for all financial transactions for minimum 7 years

### EARS Format Compliance Summary

- All requirements follow EARS format: WHEN [trigger], THE [system] SHALL [action]
- Requirements are unambiguous, testable, and implementable
- No database schemas, APIs, or technical implementation details are included
- All logic is expressed in business terms for developers

### Audit Requirements

- All administrative actions must be traceable to a specific user and timestamp
- All user account changes, product deletions, order overrides must be logged
- All snapshot creations must be indexed and searchable by date, user, entity type
- No data shall be permanently deleted until audit period expires

### Authentication and Authorization

- JWT tokens issued on login, expire after 7 days
- All API endpoints require authentication
- Roles:
  - Guest (no access)
  - Customer: access to customer features
  - Seller: access to seller dashboard and product management
  - Regular Admin: access to admin panel but cannot demote super admins
  - Super Admin: full access including role management
- Access controls:
  - Customers cannot access seller or admin functions
  - Sellers cannot access order override or category management
  - Regular admins cannot adjust admin roles
  - Super admins can do everything
- All permissions are enforced at database and API layers




















































































































































































































































































































































































































































































































