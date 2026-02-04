# E-Commerce Shopping Mall Platform Requirements Specification

## Service Overview

This platform is a fully-featured e-commerce shopping mall where customers and sellers interact in a tightly regulated environment. All transactions are tracked with immutable snapshots, and all data modifications are auditable. No guest access is permitted—registration is mandatory for all interactions.

The system enforces strict consistency: inventory is managed through immutable history records, product states are preserved at the point of sale, and every action involving money or ownership change triggers a snapshot. Seller and customer accounts are under administrative oversight, with granular control over product visibility, order processing, and user privileges.

## Authentication & Access Control

### Customer Authentication

WHEN a customer attempts to register, THE system SHALL require:
- A unique, valid email address
- A password with minimum 8 characters including at least one number and one symbol

WHEN a customer registers, THE system SHALL:
- Create a new customer account
- Set account status to "active"
- Store password as a bcrypt hash
- Generate a session token for immediate login

WHEN a customer attempts to log in, THE system SHALL:
- Accept email and password
- Verify bcrypt hash match
- If valid, issue a JWT session token with 12-hour expiration
- If invalid, return: "Invalid email or password."

WHEN a customer changes password, THE system SHALL:
- Require current password verification
- Require new password to meet minimum complexity
- Invalidate all existing session tokens
- Log the password change with timestamp and IP address

WHEN a customer deletes their account, THE system SHALL:
- Mark account as "deleted"
- Remove all profile data (name, phone, addresses)
- Preserve all order histories
- Preserve all reviews but anonymize them as "deleted user"
- Invalidate all session tokens
- Retain encrypted password hash for 30 days for compliance

### Seller Authentication

WHEN a seller attempts to register, THE system SHALL require:
- A unique, valid email address
- A password meeting minimum complexity
- Business name for shop

WHEN a seller registers, THE system SHALL:
- Create account with status "pending_approval"
- Store password as bcrypt hash
- Send notification to administrators

WHEN a seller logs in, THE system SHALL:
- Accept email and password
- Verify bcrypt hash match
- If account status is "pending_approval", return: "Your seller application is under review."
- If account status is "rejected", return: "Your seller application was rejected. Reason: [reason]. You may reapply."
- If account status is "active", issue JWT token

WHEN a seller changes password, THE system SHALL follow same process as customer password change

WHEN a seller attempts to delete their account, THE system SHALL:
- Check there are no pending orders in "paid" or "shipped" status
- Check there are no pending cancellation or refund requests
- If any exist, return: "Cannot delete account. Pending orders or refund requests exist."
- If cleared, mark account as "deleted"
- Delete all products and variants
- Preserve product snapshots and order history
- Preserve shop name in historical order records

### Administrator Authentication

WHEN a user (customer or seller) submits an administrator request, THE system SHALL:
- Accept reason text
- Set status to "admin_request_pending"
- Notify super administrators

WHEN a super administrator approves an administrator request, THE system SHALL:
- Set user role to "regular_admin"
- Send confirmation email

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
- Change role to "super_admin"
- Maintain full audit log of promotion

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL:
- Change role to "regular_admin"
- Prevent self-demotion
- Log all demotions with timestamp and performing admin ID

## Customer Account and Profile

### Customer Profile

WHEN a customer creates a profile, THE system SHALL capture:
- Display name (up to 50 characters)
- Phone number (follows E.164 format)

WHEN a customer updates their profile, THE system SHALL:
- Allow modification of display name and phone number
- Validate phone number format
- Reject names with special characters except spaces, hyphens, and apostrophes
- Record update timestamp

### Address Management

WHEN a customer adds a new shipping address, THE system SHALL require:
- Recipient name
- Phone number (E.164 format)
- Street address
- City
- State or province
- Postal code
- Country (ISO 3166-1 alpha-2 code)

WHEN a customer updates an address, THE system SHALL:
- Allow modification of all fields
- Validate all required fields
- Maintain historical changes in snapshot (see Snapshot Principle)

WHEN a customer deletes an address, THE system SHALL:
- Mark address as "deleted"
- Prevent selection of deleted address for future orders
- Preserve the address in order history snapshots

WHEN a customer sets an address as default, THE system SHALL:
- Mark one address as "default"
- Unset the previous default if any
- Set default flag for the selected address
- Validate that at least one active address exists

## Seller Account and Profile

### Seller Registration and Approval

WHEN a seller application is submitted, THE system SHALL:
- Set initial status to "pending_approval"
- Store shop name, shop description, and logo file reference
- Create log entry with timestamp and applicant ID

WHEN an administrator reviews a seller application, THE system SHALL:
- Display application with shop name, description, and logo
- Allow approval or rejection
- If rejection, require a reason (minimum 10 characters)
- When rejected, send detailed rejection notice
- When approved, change status to "active"
- Notify seller of status change

WHEN a rejected seller re-applies, THE system SHALL:
- Allow submission of new registration
- Create new application entry with same email
- Preserve history of prior rejections
- Reset approval status to "pending_approval"

### Seller Profile

WHEN a seller edits their profile, THE system SHALL:
- Allow update of shop name, description, and logo
- If any field is modified, create a product snapshot (see Snapshot Principle)
- Store previous version with timestamp and editor ID

WHEN a customer views a seller profile, THE system SHALL:
- Display current shop name, description, and logo
- Include last updated timestamp
- Show the version number of the profile snapshot

## Category Management

### Category Structure

WHEN a category is created, THE system SHALL require:
- Name (max 100 characters)
- Description (optional, up to 500 characters)
- Parent category (optional, for subcategories)

WHEN an administrator creates a subcategory, THE system SHALL:
- Allow nesting one level deep only
- Ensure no circular references
- Validate parent exists
- Update parent’s child-count

WHEN a category is edited, THE system SHALL:
- Allow change of name and description
- Prevent changing parent relationship if products exist
- Maintain historical category names in product snapshots

WHEN a category is deleted, THE system SHALL:
- Mark category as "deleted"
- Move all products in this category to "uncategorized"
- Preserve category name in product snapshots
- Prevent reuse of same category name for 30 days

WHEN a customer browses categories, THE system SHALL:
- Display top-level category names
- For each category, show count of subcategories
- Allow navigation to subcategories if exist
- Never show "deleted" categories

## Product Lifecycle

### Product Creation

WHEN a seller creates a product, THE system SHALL require:
- Product name (non-empty, max 200 characters)
- Product description (non-empty, min 20 characters)
- Category selection (must be active category)
- Base price (positive number, minimum $0.99)

WHEN a seller creates a product, THE system SHALL:
- Assign current timestamp
- Set product status to "active"
- Set default image to first uploaded image
- Create initial snapshot (see Snapshot Principle)

### Product Editing

WHEN a seller edits any product field (name, description, category, price), THE system SHALL:
- Create a full product snapshot
- Capture all fields including images, variants, category, and base price
- Record editor ID and timestamp
- Preserve original values in snapshot

WHEN a product is edited, THE system SHALL:
- Never alter existing snapshots
- Only update the active product record
- All customers viewing the product will see current version
- Historical views (e.g., order confirmation) will show snapshot version

### Product Deletion

WHEN a seller attempts to delete a product, THE system SHALL:
- Query for any order items with status "paid" or "shipped" linked to any variant
- Query for any pending cancellation/refund requests on any variant
- If any exist, return: "Cannot delete product. There are pending order items or requests."
- If none exist, delete:
  - All variants of the product
  - All inventory records
  - All product images
  - Product record
- Maintain all product snapshots

WHEN a product is deleted, THE system SHALL:
- Hide the product from category listings and search
- Remove from customer wishlists
- Preserve all product snapshots indefinitely
- Preserve associated order items with snapshot references

## Product Images

### Image Management

WHEN a seller uploads an image to a product, THE system SHALL:
- Accept JPG, PNG, WebP up to 5MB
- Store image at secure CDN URL
- Record metadata: upload timestamp, uploader ID, original filename
- Return image ID for reference

WHEN a seller reorders product images, THE system SHALL:
- Adjust the display_order field
- Set first image as thumbnail (display_order = 1)
- Record action in snapshot

WHEN a seller deletes an image, THE system SHALL:
- Mark image as "deleted" in database
- Remove from product's image list
- Create snapshot capturing removed image reference
- Prevent access to deleted image via product page
- Allow deleted image to remain accessible for order history snapshots

## Product Variants (SKU)

### Variant Creation

WHEN a seller creates a variant for a product, THE system SHALL require:
- SKU code (unique, alphanumeric, max 30 characters)
- At least one option (e.g., "color: red", "size: large")
- Stock quantity (non-negative integer, minimum 0)
- Price (optional, must be >= 0 if provided)

WHEN a variant is created, THE system SHALL:
- Validate SKU uniqueness within product
- Validate option keys and values
- Set initial stock to specified quantity
- Set variant status to "active"
- Create variant snapshot

### Variant Editing

WHEN a seller edits a variant (SKU, options, price), THE system SHALL:
- Create a full variant snapshot
- Record old and new values
- Preserve timestamp and editor ID
- Validate SKU uniqueness after update
- Do not change stock quantity

WHEN a variant price is updated, THE system SHALL:
- Update current price
- Record new price in snapshot
- Do not affect historical orders

### Variant Deletion

WHEN a seller attempts to delete a variant, THE system SHALL:
- Check for any order items in "paid" or "shipped" status for that variant
- Check for any pending cancellation or refund requests for that variant
- If any exist, return: "Cannot delete variant. There are pending orders or requests."
- If cleared, delete variant
- Preserve variant snapshot
- Delete all inventory records for this variant
- Update product's active variant count

WHEN a product has zero variants, THE system SHALL:
- Show product as "unavailable"
- Prevent addition to cart
- Block checkout
- Show "Out of stock" on product page

## Inventory Management

### Inventory Records

WHEN inventory changes, THE system SHALL:
- Create an inventory record (not snapshot)
- Record:
  - Variant ID
  - Quantity change (positive for restock, negative for sales)
  - Reason (system-generated or custom)
  - Timestamp
  - Associated entity ID (e.g., order ID, cancellation ID, seller ID)

WHEN a seller restocks inventory, THE system SHALL:
- Add positive quantity
- Require reason (e.g., "Supplier delivery")
- Record seller ID
- Validate quantity > 0

WHEN a seller adjusts inventory (loss), THE system SHALL:
- Add negative quantity
- Require reason (e.g., "Damage", "Theft")
- Record seller ID
- Validate quantity < 0

WHEN an order is placed, THE system SHALL:
- For each variant in cart:
  - Create negative inventory record with quantity = cart quantity
  - Reason: "sale"
  - Link to order ID

WHEN an order is cancelled, THE system SHALL:
- For each variant in canceled item:
  - Create positive inventory record with quantity = item quantity
  - Reason: "cancellation"

WHEN a refund is processed, THE system SHALL:
- For each variant in refunded item:
  - Create positive inventory record with quantity = item quantity
  - Reason: "refund"

### Stock Calculation

WHEN current stock for a variant is queried, THE system SHALL:
- Sum all inventory records for that variant
- Result = sum of all entries (positive and negative)
- Do not use cached values
- Always calculate dynamically from history

WHEN stock quantity reaches zero, THE system SHALL:
- Set variant status to "out_of_stock"
- Prevent addition to cart
- Show "Out of stock" badge on product page
- Block checkout
- Do not delete inventory records
- Maintain full history

WHEN stock goes above zero from zero, THE system SHALL:
- Set variant status to "in_stock"
- Allow addition to cart
- Remove "Out of stock" badge

## Product Search

### Search Functionality

WHEN a customer searches products, THE system SHALL:
- Accept search term (name contains)
- Return products from all sellers
- Exclude deleted products
- Return up to 20 results per page

WHEN a customer filters search, THE system SHALL support:
- Category: match product category
- Price range: minimum and maximum price per variant
- In-stock only: exclude variants with stock = 0

WHEN a customer sorts search results, THE system SHALL support:
- Newest first: sort by creation timestamp desc
- Price (low to high): sort by minimum variant price asc
- Price (high to low): sort by minimum variant price desc

WHEN search results are returned, THE system SHALL include:
- Product ID
- Name
- Main image URL
- Base price (or min variant price)
- Shop name
- Average rating (from non-deleted reviews)
- Total review count
- Stock status ("in_stock", "out_of_stock", "unavailable")

## Product List Page

WHEN viewing product listing (search or category view), THE system SHALL display for each product:
- Main image (thumbnail)
- Product name (truncated if > 50 characters)
- Base price or price range if multiple variants (e.g., "$10 - $25")
- Seller shop name (linked to profile)
- Average rating with star display (1 to 5 stars)
- Total review count
- Stock status indicator

WHEN a product has no variants, THE system SHALL show:
- "Unavailable" badge
- Disable "Add to Cart" button
- Show: "No variants available"

WHEN a product has out-of-stock variants but also in-stock variants, THE system SHALL:
- Show lowest in-stock variant price
- Show "In stock" indicator
- Allow purchase of available variants

## Product Detail Page

WHEN a customer views a product detail page, THE system SHALL display:
- All product images (gallery format, first image is main)
- Product name
- Product description
- Category name and link
- Seller shop name (linked to profile)
- All variants:
  - SKU code
  - Option values (e.g., "Color: Red, Size: Large")
  - Price (if overrides base price)
  - Stock status: "In stock (N)", "Out of stock", or "Unavailable"
- Average rating and review count
- List of all non-deleted reviews: rating, text, timestamp, customer name (or "deleted user")

WHEN a product is viewed, THE system SHALL:
- Show only active variants
- Never show deleted variants
- Prevent selection of out-of-stock variants
- Allow selection of only one variant at a time
- Allow "Add to Cart" only with valid variant selection

## Wishlist

### Wishlist Management

WHEN a customer adds a product to their wishlist, THE system SHALL:
- Store product ID and customer ID
- Prevent duplicate entries
- Record timestamp

WHEN a customer removes a product from wishlist, THE system SHALL:
- Delete the wishlist entry
- Do not affect product or inventory

WHEN a product is deleted by seller, THE system SHALL:
- Automatically remove the product from all customer wishlists
- Log action with deletion timestamp

WHEN a customer views wishlist, THE system SHALL:
- Show paginated list (20 per page)
- For each product:
  - Name
  - Main image
  - Base price or price range
  - Seller shop name
  - Average rating
  - "Add to Cart" button (if available)
- Show "No products in wishlist" if empty

## Shopping Cart

### Cart Operations

WHEN a customer adds a variant to cart, THE system SHALL:
- Check product exists, is active, variant is active
- Check variant stock >= quantity requested
- If variant already in cart, increase quantity (do not duplicate entry)
- If variant not in cart, create new cart item
- Record product ID, variant ID, quantity, unit price
- Calculate cart subtotal

WHEN a customer changes cart quantity, THE system SHALL:
- Validate quantity > 0 and <= available stock for that variant
- Update cart item quantity
- Recalculate subtotal
- If quantity exceeds stock, set warning: "Only X in stock. Adjust quantity."
- If quantity set to 0, remove item

WHEN a customer removes item from cart, THE system SHALL:
- Delete cart item
- Recalculate cart total

WHEN cart is displayed, THE system SHALL show:
- Each cart item with:
  - Product name
  - Variant options
  - Unit price
  - Quantity
  - Subtotal
- Cart total
- Warning if any item has stock less than quantity
- Warning if any item is out of stock
- Warning if any item has been deleted (automatically removed in backend)

WHEN cart is viewed, THE system SHALL:
- Revalidate stock status of all items
- Set flag "unavailable" if variant is deleted or out-of-stock
- Do NOT allow checkout of unavailable items

## Checkout and Payment

### Checkout Flow

WHEN a customer proceeds to checkout, THE system SHALL:
- Check cart is not empty
- Check all items are available (stock > 0, not deleted)
- Force selection of shipping address (default if only one)
- Show order summary:
  - Items with prices and quantities
  - Shipping address
  - Total price

WHEN customer confirms order, THE system SHALL:
- Lock shipping address (cannot be changed after order placement)
- Lock all variant prices (snapshot for order items)
- Lock all seller profiles (snapshot for order items)

### Payment Processing

WHEN payment is processed, THE system SHALL:
- Pass payment request to external payment gateway
- If payment SUCCEEDS:
  - Create order record
  - Create order items with snapshot data
  - Reduce inventory
  - Clear cart
  - Send confirmation email
- If payment FAILS:
  - Return error message: "Payment failed. Please check your card details and try again."
  - Do not create order
  - Do not modify inventory
  - Preserve cart content
  - Allow retry

## Order Creation

WHEN an order is successfully placed, THE system SHALL:
- Create order record with:
  - Order number (unique, format: ORD-2026-0001)
  - Customer ID
  - Shipping address
  - Timestamp
  - Total amount
  - Payment status: "paid"

WHEN order items are created, THE system SHALL:
- For each cart item:
  - Create order item
  - Reference product ID, variant ID
  - Store product snapshot: name, description, category, images, base price
  - Store variant snapshot: SKU, options, price
  - Store seller profile snapshot: shop name, logo
  - Set status to "paid"
  - Set quantity
  - Record unit price (as snapshot)

WHEN order items are created, THE system SHALL:
- Remove items from cart
- Reduce inventory for each variant (negative record)
- Set order status to "paid"

## Order Structure

### Order Composition

WHEN an order contains multiple items, THE system SHALL:
- Group items by seller
- Allow multiple sellers per order
- Maintain individual status per item

WHEN an order item is created, THE system SHALL:
- Have unique identifier
- Reference parent order
- Store snapshot of product
- Store snapshot of variant
- Store snapshot of seller profile
- Track status independently

### Order Item Statuses

- "paid": payment completed, awaiting shipping
- "shipped": seller has shipped item
- "delivered": delivery confirmed by customer
- "cancelled": cancellation approved
- "refunded": refund approved

### Order Status Derivation

WHEN order status is determined, THE system SHALL:
- Check all items:
  - If all items are "paid" → order status: "paid"
  - If any item is "shipped" and none "delivered" → order status: "shipped"
  - If all items are "delivered" → order status: "delivered"
  - If all items are "cancelled" → order status: "cancelled"
  - If all items are "refunded" → order status: "refunded"
  - Otherwise → order status: "partially completed"

## Order History

### Customer Order List

WHEN a customer views their order list, THE system SHALL:
- Show sorted by newest first
- Paginated (20 per page)
- Display for each order:
  - Order number
  - Date
  - Total price
  - Overall status
- Link to full order details

### Full Order Details

WHEN a customer views full order details, THE system SHALL display:
- Order number, date, total
- Shipping address
- List of order items:
  - Product name
  - Variant options
  - Quantity
  - Unit price
  - Item status
  - Seller shop name (linked)
- List of shipments:
  - Shipment ID
  - Tracking number
  - Carrier
  - List of items included
  - Status: "not_shipped", "shipped", "delivered"
  - Delivery confirmation timestamp

## Shipping and Tracking

### Shipment Creation

WHEN a seller prepares to ship items, THE system SHALL:
- View order items for their products with status "paid"
- Select one or more items to ship
- Enter: carrier name, tracking number
- Create shipment record
- Set all selected items' status to "shipped"
- Record timestamp, seller ID
- Link shipment to order

### Delivery Confirmation

WHEN a customer confirms delivery, THE system SHALL:
- Select shipment to confirm
- Confirm delivery for all items in that shipment
- Update all items' status to "delivered"
- Record confirmation timestamp
- Notify seller

WHEN delivery is not confirmed, THE system SHALL:
- Automatically set status to "delivered" if 14 days have passed since shipment date
- Log automated delivery confirmation

## Order Cancellation

### Cancellation Request

WHEN a customer requests cancellation, THE system SHALL:
- Only allow if status is "paid"
- Require reason (min 10 characters)
- Record timestamp, customer ID, item ID
- Create cancellation request snapshot
- Send notification to seller

### Cancellation Approval

WHEN a seller approves a cancellation request, THE system SHALL:
- Change item status to "cancelled"
- Create snapshot of approval
- Send notification to customer
- Add positive inventory record: reason = "cancellation"
- Recalculate order status

WHEN a seller rejects a cancellation request, THE system SHALL:
- Leave status as "paid"
- Create snapshot with rejection reason
- Send notification to customer

WHEN no response within 48 hours, THE system SHALL:
- Automatically approve cancellation
- Create snapshot with automated approval flag
- Trigger inventory restock
- Notify customer

## Refund Requests

### Refund Request

WHEN a customer requests refund, THE system SHALL:
- Only allow if status is "delivered"
- Only allow within 7 days of delivery
- Require reason (min 10 characters)
- Record timestamp, customer ID, item ID
- Create refund request snapshot
- Send notification to seller

### Refund Approval

WHEN a seller approves a refund request, THE system SHALL:
- Change item status to "refunded"
- Create snapshot with approval details
- Trigger positive inventory record: reason = "refund"
- Initiate payment reversal
- Send notification to customer

WHEN a seller rejects a refund request, THE system SHALL:
- Leave status as "delivered"
- Create snapshot with rejection reason
- Send notification to customer

WHEN no response within 48 hours, THE system SHALL:
- Automatically approve refund
- Create snapshot with automated approval flag
- Trigger inventory restock
- Initiate payment reversal
- Notify customer

## Reviews and Ratings

### Review Submission

WHEN a customer writes a review, THE system SHALL:
- Allow only if item status is "delivered"
- Allow only one review per product per order
- Require rating (1-5 stars)
- Allow optional text (max 1000 characters)
- Record timestamp, customer ID, product ID, order ID
- Link review to order item

### Review Editing

WHEN a customer edits their review, THE system SHALL:
- Allow modification of rating and/or text
- Create snapshot of original review state
- Maintain original timestamp of first submission
- Update edited_at timestamp

### Review Deletion

WHEN a customer deletes their review, THE system SHALL:
- Mark review as "deleted"
- Hide from public display
- Preserve original record (including rating, text, timestamp)
- Recalculate product's average rating (excluding deleted reviews)
- Log deletion with timestamp and customer ID

### Rating Calculation

WHEN product's average rating is calculated, THE system SHALL:
- Sum all non-deleted reviews
- Divide by count of non-deleted reviews
- Round to one decimal place
- Return 0 if no reviews
- Include count of non-deleted reviews in display

### Review Display

WHEN reviews are displayed on product detail page, THE system SHALL:
- Sort by newest first
- Show rating and text
- Show reviewer name (or "deleted user" if review deleted)
- Show date posted
- Show "review edited" flag if edited
- Never show deleted reviews

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:
- Total number of active products
- Total number of order items for their products
- Number of pending cancellation requests
- Number of pending refund requests

WHEN a seller views order items, THE system SHALL:
- Show list filtered by status (
  - All
  - Paid
  - Shipped
  - Delivered
  - Cancelled
  - Refunded
)
- Include: order number, customer, variant, quantity, status, date
- Paginated (50 per page)

## Administrator System

### Administrator Roles

- **Regular Administrator**: Can manage sellers, categories, products, orders, users
- **Super Administrator**: Can grant or revoke administrator privileges, and perform all actions of regular administrator
- Super administrators CANNOT demote themselves

### Seller Management

WHEN an administrator views pending seller approvals, THE system SHALL:
- Show list with: seller email, shop name, application timestamp, status
- Allow "approve" or "reject" with reason

WHEN a seller is suspended, THE system SHALL:
- Hide all products from search and category listings
- Block new product creation or editing
- Block new variant modification
- Allow processing of existing orders (ship, respond to cancellation/refund)
- Keep seller account active for login

WHEN a seller is unsuspended, THE system SHALL:
- Restore product visibility
- Allow product and variant edits
- Remove suspension flag

### Category Management

WHEN an administrator creates a category, THE system SHALL:
- Allow name and description
- Allow selection of parent category (for subcategories)
- Prevent duplicate category names
- Validate parent is active

WHEN an administrator edits a category, THE system SHALL:
- Allow name and description change
- Prevent changing parent category if products exist
- Prevent deletion of category if products exist

WHEN an administrator deletes a category, THE system SHALL:
- Move all products to "uncategorized"
- Preserve category record as "deleted"
- Maintain category name in product snapshots

### Product Oversight

WHEN an administrator views products, THE system SHALL:
- View ALL products on platform
- View ALL snapshots of any product
- Search by product name, seller, category

WHEN an administrator deletes a product, THE system SHALL:
- Delete product record
- Delete all variants
- Delete all inventory records
- Preserve all snapshots
- Remove from searches and catalogs
- Log deletion with admin ID and timestamp

### Order Oversight

WHEN an administrator views orders, THE system SHALL:
- View ALL orders on the platform
- View ALL order items
- View ALL order snapshots
- Search by customer, seller, order number, status

WHEN an administrator force-cancels an order item, THE system SHALL:
- Change status to "cancelled"
- Record reason: "admin cancelled"
- Create inventory restock record: reason "admin cancellation"
- Notify customer and seller

WHEN an administrator force-refunds an order item, THE system SHALL:
- Change status to "refunded"
- Record reason: "admin refunded"
- Create inventory restock record: reason "admin refund"
- Initiate payment reversal
- Notify customer and seller

### User Management

WHEN an administrator bans a customer, THE system SHALL:
- Set status to "banned"
- Invalidate all session tokens
- Block login attempts
- Preserve order history and reviews
- Log ban action with timestamp and reason

WHEN an administrator unbans a customer, THE system SHALL:
- Set status to "active"
- Allow login
- Log unban action

WHEN an administrator bans a seller, THE system SHALL:
- Set status to "banned"
- Invalidate all session tokens
- Block login attempts
- Hide all products from public listings
- Preserve all product snapshots and order history
- Prevent new product creation
- Allow processing of existing orders
- Log ban action with timestamp and reason

WHEN an administrator unbans a seller, THE system SHALL:
- Set status to "active"
- Allow login
- Restore product visibility
- Log unban action

## Snapshot Principle

### Snapshot Definition

A snapshot is a complete, immutable record of an entity's state at the exact moment a change occurs. Snapshots are preserved for auditability, dispute resolution, and maintaining historical contract integrity.

### Trigger Conditions

A snapshot SHALL be created when any of these editable entities are modified:

- Product: Any change to name, description, category, base price, or images
- Product Variant: Any change to SKU, option values, price
- Seller Profile: Any change to shop name, description, logo
- Order Item: When created (captures product, variant, seller profile at time of purchase)
- Review: Any edit to rating or text
- Cancellation Request: On approval or rejection
- Refund Request: On approval or rejection

### Data Captured in Snapshots

#### Product Snapshot
- Product ID
- Name
- Description
- Category ID
- Base price
- Image list (URL, order, metadata)
- Creation timestamp
- Editor ID

#### Product Variant Snapshot
- Variant ID
- SKU code
- Option values (object: key-value pairs)
- Price (if overrides base price)
- Product ID
- Creation timestamp
- Editor ID

#### Seller Profile Snapshot
- Seller ID
- Shop name
- Shop description
- Logo URL
- Last modified timestamp
- Editor ID

#### Order Item Snapshot
- Product snapshot reference
- Variant snapshot reference
- Seller profile snapshot reference
- Quantity
- Unit price (at time of purchase)
- Order ID
- Timestamp of order creation

#### Review Snapshot
- Review ID
- Rating
- Text
- Product ID
- Customer ID
- Original timestamp
- Edited timestamp (if edited)
- Editor ID
- Is deleted flag

#### Cancellation Request Snapshot
- Request ID
- Order item ID
- Reason for cancellation
- Customer ID
- Seller ID
- Status (pending, approved, rejected)
- Timestamp of request
- Timestamp of decision
- Decision maker ID
- Reason for decision (if rejected)

#### Refund Request Snapshot
- Request ID
- Order item ID
- Reason for refund
- Customer ID
- Seller ID
- Status (pending, approved, rejected)
- Timestamp of request
- Timestamp of decision
- Decision maker ID
- Reason for decision (if rejected)

### Snapshot Immutability

- Snapshots SHALL NOT be editable
- Snapshots SHALL NOT be deletable
- Snapshots SHALL always be accessible to:
  - The entity owner (customer for their reviews, seller for their products)
  - Administrators
  - System for historical order display

### Access Control

- Customers can view their own snapshots (reviews, orders)
- Sellers can view their own product and profile snapshots
- Administrators can view ALL snapshots
- Snapshots SHALL NOT be exposed via public endpoints unless explicitly tied to an entity the user owns

### Use Cases

- Dispute resolution: Show original product name/price at time of purchase
- Chargeback handling: Prove variant options and seller name were disclosed
- Returns: Validate what was ordered versus what was delivered
- Review editing: Show original review before edit
- Legal compliance: Prove historical product state for consumer protection
- Auditing: Trace changes to product or seller profile over time

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
