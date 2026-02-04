# E-Commerce Shopping Mall Platform Requirements

## Overview

This platform enables a complete e-commerce shopping mall experience with tightly integrated seller and customer workflows, inventory management with immutable history tracking, and the snapshot principle to preserve transactional state for disputes and audits. All data modifications are recorded in immutable logs, ensuring complete traceability for financial transactions and customer interactions.

## Customer Account

WHEN a new user registers for the platform, THE system SHALL require:
- A unique email address (format: valid email pattern)
- A non-empty password (minimum 8 characters)

WHEN the registration is submitted, THE system SHALL:
1. Create a customer account record
2. Store a hashed version of the password (bcrypt)
3. Set account status to "active"
4. Associate with empty profile and address collections

WHEN an existing customer attempts to log in, THE system SHALL:
1. Locate the account by email
2. Verify the provided password matches the stored hash
3. If valid, create a session token with 7-day expiration
4. Return the session token to the client

WHEN a customer requests to change their password, THE system SHALL:
1. Require authentication (current password)
2. Require new password to meet minimum 8-character requirement
3. Verify new password differs from current password
4. Update the password hash and invalidate all existing sessions

WHEN a customer requests to delete their account, THE system SHALL:
1. Mark the account as "deleted" (not physically removed)
2. Delete all profile information: display name, phone number
3. Delete all shipping addresses
4. Clear the wishlist
5. Preserve all order history, order items, and snapshots
6. Replace customer name in reviews with "deleted user"
7. Prevent any future login attempts

## Customer Profile

WHEN a customer creates their profile, THE system SHALL provide:
- Display name (optional, up to 100 characters)
- Phone number (optional, validated international format)

WHEN a customer edits their display name, THE system SHALL:
1. Accept input up to 100 characters long
2. Trim whitespace from start/end
3. Reject if empty after trimming
4. Update the profile record

WHEN a customer edits their phone number, THE system SHALL:
1. Accept input in international format (e.g., +821012345678)
2. Validate against E.164 format
3. Reject malformed formats
4. Update the profile record

## Address Management

WHEN a customer adds a shipping address, THE system SHALL require:
- Recipient name (required, 1-100 characters)
- Phone number (required, E.164 format)
- Street address (required, 1-200 characters)
- City (required, 1-100 characters)
- State/province (required, 1-100 characters)
- Postal code (required, format depends on country)
- Country (required, ISO 3166-1 alpha-2 code)

WHEN a customer edits an existing address, THE system SHALL:
1. Allow modification of any field except addressId
2. Re-validate all fields
3. Update the record with current timestamp

WHEN a customer deletes an address, THE system SHALL:
1. Mark the address as "deleted" (not physically removed)
2. Preserve the address data for order history references
3. Automatically reassign if this was the default address

WHEN a customer sets an address as default, THE system SHALL:
1. Remove the "is_default" flag from all other addresses for this customer
2. Set the "is_default" flag to true for the selected address
3. Update the customer's defaultAddressId reference

## Seller Account

WHEN a new seller registers, THE system SHALL:
1. Create a seller account record with status "pending"
2. Store email and hashed password
3. Set profile fields to empty values
4. Require administrator approval before selling

WHEN an existing seller logs in, THE system SHALL:
1. Authenticate using email and password (same as customer)
2. Verify account status is "approved"
3. If status is "pending" or "rejected", return appropriate error
4. Return a session token if authentication succeeds

WHEN a seller requests to change their password, THE system SHALL:
1. Require current password verification
2. Require new password to meet minimum 8-character requirement
3. Verify new password differs from current password
4. Update password hash and invalidate all sessions

WHEN a seller deletes their account, THE system SHALL:
1. Check if any order items have status "paid" or "shipped"
2. Check if any cancellation or refund requests are pending
3. If any exist, reject deletion with reason "Cannot delete: Pending orders or requests exist"
4. If no pending items, mark account as "deleted"
5. Delete product listings associated with the seller
6. Preserve all product snapshots, order history, and seller profile snapshots
7. Preserve seller shop name in past order references

WHEN a seller views their approval status, THE system SHALL return:
- status: "pending", "approved", or "rejected"
- if rejected: reason (text) provided by the administrator

WHEN a rejected seller submits a new registration request, THE system SHALL:
1. Create a new seller account record with status "pending"
2. Clear old rejection reason
3. Require administrator review
4. Allow unlimited re-application attempts

## Seller Profile

WHEN a seller creates or updates their profile, THE system SHALL require:
- Shop name (required, 1-100 characters)
- Shop description (required, 1-500 characters)
- Logo image (optional, URL reference to uploaded image)

WHEN a seller edits their shop name, description, or logo, THE system SHALL:
1. Create a snapshot record with the previous values
2. Capture timestamp of change
3. Store reference to sellerId
4. Update the active profile with new values

WHEN a customer views a seller's profile, THE system SHALL display:
- Current shop name
- Current shop description
- Current logo image
- History of profile snapshots (if requested)

## Categories

WHEN a category is created, THE system SHALL require:
- Category name (required, 1-100 characters, unique)
- Description (optional, max 500 characters)
- ParentCategoryId (optional, reference to parent category)

WHEN a category is edited, THE system SHALL:
1. Accept updates to name and description
2. Prevent changes to parent category
3. Create a snapshot of previous state

WHEN a category is deleted, THE system SHALL:
1. Mark as deleted (not physical deletion)
2. Move all products to "uncategorized" state
3. Preserve category name and description in snapshots

WHEN a product is assigned to a category, THE system SHALL:
1. Accept the category id as reference
2. Allow subcategory selection (one level of nesting)
3. Reject if category is marked as deleted

## Snapshot Principle

WHEN any editable data is modified, THE system SHALL create a snapshot:
- Record timestamp of change
- Capture previous values of all fields
- Capture new values of all fields
- Reference the actor who made the change
- Store metadata: entity type, entity ID, and change reason

SNAPSHOTS SHALL be immutable and SHALL NOT be deletable

SNAPSHOTS SHALL be accessible by:
- Entity owner
- Administrators
- Users with legitimate business need

### Product Snapshot Structure

WHEN a product is edited, THE system SHALL create a product snapshot containing:
- All product fields: name, description, base price, category, status
- Reference to sellerId
- Snapshot of each variant at time of change (product-snapshot → product-snapshot-SKU)
- All product images and their order

WHEN a product variant is edited, THE system SHALL:
1. Create a product-snapshot-SKU record
2. Capture: SKU code, option values, price, stock quantity
3. Link to the parent product-snapshot
4. Preserve historical version

WHEN a seller profile is modified, THE system SHALL:
1. Record old: shop name, description, logo, modified timestamp
2. Record new: shop name, description, logo, modified timestamp
3. Store reference to sellerId and actorId

WHEN an order item is created, THE system SHALL:
1. Capture snapshot of product at time of purchase
2. Capture snapshot of variant at time of purchase
3. Capture snapshot of seller profile at time of purchase
4. Store all snapshots linked to orderItemId

WHEN a review is created or edited, THE system SHALL:
1. Record previous rating and text
2. Record new rating and text
3. Store timestamp and actorId
4. Maintain all historical versions

WHEN a cancellation request is approved/rejected, THE system SHALL:
1. Record the state before action (pending)
2. Record the new state (approved/rejected)
3. Include the reason provided by user
4. Include the actor who made decision (seller or admin)

WHEN a refund request is approved/rejected, THE system SHALL:
1. Record the state before action (pending)
2. Record the new state (approved/rejected)
3. Include the reason provided by user
4. Include the actor who made decision (seller or admin)

## Products

WHEN a seller creates a product, THE system SHALL require:
- Name (required, 1-200 characters)
- Description (required, 1-5,000 characters)
- CategoryId (required)
- Base price (required, float > 0)
- Status: "active" or "inactive" (default: "active")

WHEN a seller edits a product, THE system SHALL:
1. Create a product snapshot with previous values
2. Update all product fields
3. Preserve all existing variants
4. Trigger inventory recomputation if base price changes

WHEN a seller deletes a product, THE system SHALL:
1. Check for order items with status "paid" or "shipped"
2. Check for pending cancellation/refund requests
3. If any exist, reject deletion
4. If no dependencies, mark product as "deleted"
5. Remove product from search and category listings
6. Preserve product snapshot for historical reference
7. Delete all variants and associated inventory records

WHEN a seller views their products, THE system SHALL:
1. Return active products only
2. Include deleted products if requested
3. Include reference to latest snapshot

WHEN an administrator views any product, THE system SHALL:
1. Return all products regardless of seller or deletion status
2. Include snapshot history
3. Include inventory history

## Product Images

WHEN a seller uploads an image for a product, THE system SHALL:
1. Generate a unique image ID
2. Store reference to productId
3. Store upload timestamp
4. Store original filename, MIME type, and size
5. Store URL path

WHEN a seller reorders images, THE system SHALL:
1. Accept sequence order (0 to N)
2. Update "is_primary" flag to true for image with sequence 0
3. Create product snapshot

WHEN a seller deletes an image, THE system SHALL:
1. Mark image as deleted (not physical deletion)
2. Remove reference from product
3. Create product snapshot
4. Preserve image file for potential rollback

## Product Variants (SKU)

WHEN a seller adds a variant to a product, THE system SHALL require:
- SKU code (required, unique within seller products, alphanumeric)
- Option values (required, at least one)
- Price (optional, must be ≥ 0)
- Stock quantity (required, integer ≥ 0)

WHEN a seller edits a variant, THE system SHALL:
1. Create variant snapshot (product-snapshot-SKU)
2. Update the variant fields
3. Preserve the previous state
4. Trigger inventory recomputation

WHEN a seller deletes a variant, THE system SHALL:
1. Check for order items with status "paid" or "shipped"
2. Check for pending cancellation/refund requests
3. If any exist, reject deletion
4. If no dependencies, mark variant as "deleted"
5. Remove from product listing
6. Preserve variant snapshot

WHEN a product has no variants, THE system SHALL:
1. Still appear in search and category listings
2. Display "Unavailable" status
3. Disable "Add to Cart" button

## Inventory Management

WHEN a seller restocks inventory, THE system SHALL:
1. Accept positive quantity (required)
2. Require reason from: "Supplier Delivery", "Returns Received", "Manual Adjustment", "Damaged Goods Replacement"
3. Record actorId as sellerId
4. Create inventory record with positive quantity change
5. Recalculate current stock

WHEN a seller adjusts inventory, THE system SHALL:
1. Accept positive or negative quantity (required)
2. Require reason from: "Damage", "Theft", "Counting Error", "Quality Issue", "Gift Item", "Other"
3. If reason is "Other", require 10-200 character description
4. Record actorId as sellerId
5. Create inventory record with specified change
6. Recalculate current stock

WHEN an order is placed successfully, THE system SHALL:
1. For each order item (variant + quantity):
   - Create negative inventory record: quantityChange = -itemQuantity
   - Set reason to "Order Fulfillment"
   - Set actorId to "system"
   - Set sourceTransactionId to orderId
   - Recalculate current stock

WHEN an order is cancelled after payment, THE system SHALL:
1. Create positive inventory record: quantityChange = originalItemQuantity
2. Set reason to "Cancellation Reversal"
3. Set actorId to administrator or seller who approved
4. Set sourceTransactionId to cancellationRequestId
5. Recalculate current stock

WHEN a refund is approved, THE system SHALL:
1. Create positive inventory record: quantityChange = originalItemQuantity
2. Set reason to "Refund Processing"
3. Set actorId to administrator or seller who approved
4. Set sourceTransactionId to refundRequestId
5. Recalculate current stock

WHEN current stock for a variant is calculated, THE system SHALL:
1. Sum all inventory records for that variant
2. Ignore deleted inventory records
3. Return value as read-only derived field
4. Update variant availability status: stock > 0 ? "available" : "out of stock"

WHEN a variant's current stock is ≤ 0, THE system SHALL:
1. Classify variant as "out of stock"
2. Prevent addition to cart (show error)
3. Show "Out of Stock" flag in listings and search
4. Disable "Add to Cart" button on detail page
5. Mark as unavailable in cart (but preserve item)

WHEN a variant's current stock > 0, THE system SHALL:
1. Classify as "available"
2. Display normally in search and listings
3. Enable "Add to Cart" button
4. Notify wishlist subscribers if previously out of stock

WHEN viewing inventory history, THE system SHALL display:
- Timestamp
- Type of change: restock, adjustment, order, cancellation, refund
- Quantity change
- Reason
- Actor name or "system"
- Related transaction ID (orderId, cancellationId, refundId)

## Product Search

WHEN a customer performs a product search, THE system SHALL:
1. Accept keyword in product name (case-insensitive)
2. Allow optional filters:
   - Category (any level of nesting)
   - Price range (min and max)
   - In-stock only (show variants with stock > 0)
3. Allow optional sorting:
   - Newest first (by product creation date)
   - Price (low to high)
   - Price (high to low)
4. Return paginated results (20 items per page)

WHEN displaying search results, THE system SHALL show for each product:
- Primary image (thumbnail)
- Product name
- Price range: "minPrice - maxPrice" if variants differ, or base price if single variant
- Seller shop name
- Average rating (if ≥1 review)
- Stock status

## Product Listing

WHEN displaying category pages, THE system SHALL follow the same output as search results.

WHEN displaying "Featured Products" or "Popular Products", THE system SHALL use the same display format.

## Product Detail Page

WHEN viewing a product detail page, THE system SHALL display:
- All product images in order
- Product name
- Product description
- Category name and path
- Seller shop name (linked to seller profile)
- Base price
- All variants with:
  - Option values (e.g., "Red, Large")
  - Price
  - Stock status ("Available" or "Out of Stock")
- Average rating and review count
- All reviews

## Wishlist

WHEN a customer adds a product to their wishlist, THE system SHALL:
1. Allow selection of a product (not variant)
2. Record customerId and productId
3. Record timestamp
4. Reject if product already in wishlist

WHEN a customer views their wishlist, THE system SHALL:
1. Return all products in wishlist
2. Include product details: name, thumbnail, seller, price range, availability
3. Paginate results (20 items per page)

WHEN a customer removes a product from their wishlist, THE system SHALL:
1. Mark the wishlist item as deleted
2. Preserve record for analytics

WHEN a product is deleted by the seller, THE system SHALL:
1. Automatically remove the product from all wishlists
2. Preserve wishlist entries as "Product deleted" indicator

## Shopping Cart

WHEN a customer adds a variant to the cart, THE system SHALL:
1. Require product variantId and quantity (≥1)
2. Validate variant is "available" (stock > 0)
3. If variant exists in cart, increment quantity
4. If not in cart, create new cart item
5. Compute subtotal: quantity × variantPrice

WHEN a customer views their cart, THE system SHALL display:
- Each item with:
  - Product name
  - Variant options
  - Unit price
  - Quantity
  - Subtotal
- Cart total (sum of all subtotals)
- Any items marked as unavailable (stock now ≤ 0)

WHEN a customer changes quantity of a cart item, THE system SHALL:
1. Accept new quantity (≥0)
2. If quantity = 0, remove the item
3. If quantity > current stock, warn "Quantity exceeds available stock"
4. Update subtotal

WHEN a customer removes a cart item, THE system SHALL:
1. Mark cart item as deleted
2. Preserve for audit

WHEN cart quantity exceeds variant stock, THE system SHALL:
1. Display warning: "Only X units available. Quantity reduced."
2. Reduce cart quantity to available stock
3. Persist the reduction

WHEN a variant becomes unavailable during a cart session, THE system SHALL:
1. Mark the cart item as "unavailable"
2. Disable checkout for that item
3. Allow user to remove or reduce quantity

## Checkout

WHEN a customer proceeds to checkout, THE system SHALL:
1. Check cart for any "unavailable" items
2. If any exist, prevent checkout with error: "Some items are unavailable. Please review your cart."
3. Require shipping address selection (default if none)
4. Show order summary:
   - List of items with price and quantity
   - Shipping address
   - Order total
   - Any applicable taxes or fees

WHEN a customer places an order successfully, THE system SHALL:
1. Lock the shipping address (cannot be changed)
2. Lock all product and variant prices (snapshot captured)
3. Lock seller profile snapshot

## Payment

WHEN a customer confirms payment, THE system SHALL:
1. Send order total to payment gateway
2. Wait for gateway response

WHEN payment succeeds, THE system SHALL:
1. Create order record
2. Create one order item per cart item
3. Create snapshot of product, variant, seller profile
4. Reduce inventory
5. Clear cart
6. Mark order status as "paid"

WHEN payment fails, THE system SHALL:
1. Return error message to customer
2. Preserve cart contents
3. Allow retry

## Order Creation

WHEN an order is created successfully, THE system SHALL:
1. Generate unique order number
2. Set creation timestamp
3. Set shipping address reference
4. Set payment status
5. Set overall order status: "paid" (initial)
6. For each cart item:
   - Create order item with:
     - productId
     - variantId
     - price (variant price at purchase)
     - quantity
     - sellerId
     - status: "paid"
   - Create product snapshot
   - Create variant snapshot
   - Create seller profile snapshot
7. Delete cart items

## Order Structure

WHEN an order contains multiple items, THE system SHALL:
1. Group items by seller
2. Store each item as a separate record with individual status
3. Allow independent cancellation or refund per item

WHEN an item's status changes, THE system SHALL update its own status record

WHEN an order's overall status is derived, THE system SHALL follow:
- All items paid → "paid"
- Any item shipped and no item delivered → "shipped"
- All items delivered → "delivered"
- All items cancelled → "cancelled"
- All items refunded → "refunded"
- Mixed statuses → "partially completed"

## Order History

WHEN a customer views their order list, THE system SHALL:
1. Return paginated list (20 per page)
2. Sort by newest first
3. Show for each order:
   - Order number
   - Order date
   - Total price
   - Overall status (paid, shipped, delivered, cancelled, refunded, partially completed)

WHEN a customer views an order detail, THE system SHALL display:
- All order items:
   - Product name
   - Variant options
   - Quantity
   - Unit price
   - Item status
- Shipping address
- Shipment breakdown (each shipment and its tracking info)

## Order Status

### Order Item Status

WHEN an order item is created, THE system SHALL set status to "paid"

WHEN a shipment is created for an item, THE system SHALL set status to "shipped"

WHEN customer confirms delivery for a shipment, THE system SHALL set all items in shipment to "delivered"

WHEN cancellation is approved, THE system SHALL set item status to "cancelled"

WHEN refund is approved, THE system SHALL set item status to "refunded"

WHEN item status changes, THE system SHALL create a snapshot

### Order Status

WHEN an order's overall status is calculated, THE system SHALL evaluate all its items:

- IF all items are "paid" → status = "paid"
- IF any item == "shipped" and no item == "delivered" → status = "shipped"
- IF all items == "delivered" → status = "delivered"
- IF all items == "cancelled" → status = "cancelled"
- IF all items == "refunded" → status = "refunded"
- IF items have mixed statuses → status = "partially completed"

## Shipping and Tracking

### Shipment Concept

WHEN a shipment is created, THE system SHALL:
1. Group one or more order items from the same seller
2. Require tracking information:
   - Carrier name (required)
   - Tracking number (required)
   - Estimated delivery date (optional)

WHEN different sellers have items in the same order, THE system SHALL:
1. Create separate shipments for each seller
2. Maintain independent tracking

WHEN a seller ships items, THE system SHALL:
1. Allow selection of multiple items from their products
2. Bundle items into one shipment
3. Require carrier and tracking number

### Shipping Process

WHEN a shipment is created, THE system SHALL:
1. Update status of all associated items from "paid" to "shipped"
2. Store tracking details
3. Notify customer

### Delivery Confirmation

WHEN a customer confirms delivery for a shipment, THE system SHALL:
1. Set all items in shipment to status "delivered"
2. Record confirmation timestamp
3. Record customerId for auditing

WHEN delivery is not confirmed by customer within 14 days, THE system SHALL:
1. Automatically change all items in shipment to status "delivered"
2. Record "system" as actor
3. Log "Auto-delivery triggered after 14 days"

## Order Cancellation

WHEN a customer requests cancellation for an item, THE system SHALL:
1. Accept request only if item status is "paid"
2. Require reason (1-500 characters)
3. Create cancellation request with status "pending"

WHEN a seller responds to cancellation request, THE system SHALL:
1. Accept approval or rejection
2. Create snapshot of request state before change
3. If approved:
   - Update item status to "cancelled"
   - Create positive inventory record
   - Initiate refund process
4. If rejected:
   - Update request status to "rejected"
   - Keep item status as "paid"

WHEN an item is cancelled, THE system SHALL:
1. Update current stock using positive inventory record
2. Set item status to "cancelled"
3. Preserve snapshot of cancellation request
4. Recalculate order status

WHEN all items in an order are cancelled, THE system SHALL:
1. Update order status to "cancelled"

## Refund Requests

WHEN a customer requests a refund for an item, THE system SHALL:
1. Accept request only if item status is "delivered"
2. Require reason (1-500 characters)
3. Verify request is within 7 days of delivery
4. Create refund request with status "pending"

WHEN a seller responds to a refund request, THE system SHALL:
1. Accept approval or rejection
2. Create snapshot of request state before change
3. If approved:
   - Update item status to "refunded"
   - Create positive inventory record
   - Initiate refund payment
4. If rejected:
   - Update request status to "rejected"
   - Keep item status as "delivered"

WHEN an item is refunded, THE system SHALL:
1. Update current stock using positive inventory record
2. Set item status to "refunded"
3. Preserve snapshot of refund request
4. Recalculate order status

WHEN all items in an order are refunded, THE system SHALL:
1. Update order status to "refunded"

## Reviews and Ratings

WHEN a customer writes a review, THE system SHALL:
1. Allow only if item status is "delivered"
2. Require rating (1-5 stars)
3. Allow optional text description (0-2000 characters)
4. Allow only one review per product per order
5. Create review record with timestamp, customerId, productId, orderId, rating, text

WHEN a customer edits their review, THE system SHALL:
1. Allow modification of rating and/or text
2. Create snapshot of previous content
3. Update review with new values

WHEN a customer deletes their review, THE system SHALL:
1. Mark review as "deleted"
2. Preserve snapshot of previous content
3. Recalculate product average rating using only non-deleted reviews

WHEN product average rating is calculated, THE system SHALL:
1. Sum all non-deleted reviews
2. Divide by total non-deleted review count
3. Round to one decimal place

## Seller Dashboard

WHEN a seller views their dashboard, THE system SHALL display:
- Total products: count of active products
- Total order items: count of all order items for their products
- Pending cancellation requests: count of pending cancellation requests
- Pending refund requests: count of pending refund requests

WHEN a seller views their order items, THE system SHALL:
1. Return items where sellerId matches
2. Include item status, product, variant, quantity, price
3. Allow filtering by status
4. Allow sorting

## Administrator System

### Becoming an Administrator

WHEN a user requests administrator access, THE system SHALL:
1. Accept request with reason (1-500 characters)
2. Set status to "pending"
3. Store reference to actor

WHEN a super administrator reviews a request, THE system SHALL:
1. Allow approval or rejection
2. Create snapshot
3. If approved:
   - Update user role to "administrator"
   - Set roleLevel to "regular"
4. If rejected:
   - Update request status to "rejected"
   - Store rejection reason

### Administrator Grades

WHEN a super administrator promotes a regular administrator, THE system SHALL:
1. Change roleLevel from "regular" to "super"
2. Log actor and timestamp
3. Create snapshot

WHEN a super administrator demotes another super administrator, THE system SHALL:
1. Change roleLevel from "super" to "regular"
2. Log actor and timestamp
3. Create snapshot
4. Prevent self-demotion

### Seller Management

WHEN an administrator reviews pending seller registrations, THE system SHALL:
1. Return list of pending sellers
2. Allow approval or rejection
3. If rejected, require reason (1-200 characters)
4. If approved, set seller status to "approved"

WHEN an administrator suspends a seller, THE system SHALL:
1. Set seller account status to "suspended"
2. Hide all products from search and category listings
3. Prevent new product creation or editing
4. Allow continuation of order fulfillment: shipping, cancellation, refund

WHEN an administrator unsuspends a seller, THE system SHALL:
1. Set seller status to "active"
2. Re-enable product visibility
3. Allow product editing and creation

### Category Management

WHEN an administrator creates a category, THE system SHALL:
1. Require name and description
2. Allow optional parentCategoryId
3. Validate uniqueness of name
4. Set status to "active"

WHEN an administrator edits a category, THE system SHALL:
1. Allow name and description updates
2. Prevent changing parent category
3. Create snapshot of previous state

WHEN an administrator deletes a category, THE system SHALL:
1. Set category status to "deleted"
2. Move all products to "uncategorized"
3. Preserve category name and description in snapshots

### Product Oversight

WHEN an administrator views all products, THE system SHALL:
1. Return all products regardless of seller
2. Include active and deleted products
3. Include product snapshot history

WHEN an administrator deletes a product, THE system SHALL:
1. Mark product as "deleted"
2. Hide from search and listings
3. Preserve all snapshots
4. Record administratorId and timestamp

### Order Oversight

WHEN an administrator views all orders, THE system SHALL:
1. Return all orders on the platform
2. Include order item details
3. Include snapshots

WHEN an administrator forces a cancellation of an item, THE system SHALL:
1. Override seller decision
2. Change item status to "cancelled"
3. Create positive inventory record
4. Initiate refund
5. Record administratorId and reason

WHEN an administrator forces a refund of an item, THE system SHALL:
1. Override seller decision
2. Change item status to "refunded"
3. Create positive inventory record
4. Initiate refund
5. Record administratorId and reason

### User Management

WHEN an administrator views customer accounts, THE system SHALL:
1. Return all customers
2. Include account status (active, deleted, banned)
3. Include last login timestamp

WHEN an administrator bans a customer, THE system SHALL:
1. Set account status to "banned"
2. Prevent future login attempts
3. Preserve order history

WHEN an administrator unbans a customer, THE system SHALL:
1. Set account status to "active"
2. Restore login capability

WHEN an administrator views seller accounts, THE system SHALL:
1. Return all sellers
2. Include status (pending, approved, rejected, suspended, deleted)

WHEN an administrator bans a seller, THE system SHALL:
1. Set account status to "banned"
2. Prevent future login
3. Preserve order history
4. Keep product snapshots and order references

## Diagram: Platform Order Flow

```mermaid
graph LR
    A[Customer Adds Variant to Cart] --> B[Checkout]
    B --> C{Payment Successful?}
    C -->|Yes| D[Create Order Record]
    C -->|No| E[Show Payment Error]
    D --> F[Create Order Item for Each Variant]
    F --> G[Create Product Snapshot]
    G --> H[Create Variant Snapshot]
    H --> I[Create Seller Profile Snapshot]
    I --> J[Reduce Inventory]
    J --> K[Clear Cart]
    K --> L[Set Order Status to Paid]
    L --> M[Seller Processes Shipment]
    M --> N[Create Shipment]
    N --> O[Set Item Status to Shipped]
    O --> P{Customer Confirms Delivery?}
    P -->|Yes| Q[Set Item Status to Delivered]
    P -->|No| R[Wait 14 Days]
    R --> Q
    Q --> S[Update Order Status if All Items Delivered]
    Q --> T[Customer Requests Cancellation (if Paid)]
    T --> U[Seller Approves/Rejects]
    U -->|Approved| V[Set Status to Cancelled]
    V --> W[Create Positive Inventory Record]
    W --> X[Initiate Refund]
    U -->|Rejected| Y[Keep Status as Paid]
    Q --> Z[Customer Requests Refund (within 7 days of delivered)]
    Z --> AA[Seller Approves/Rejects]
    AA -->|Approved| AB[Set Status to Refunded]
    AB --> AC[Create Positive Inventory Record]
    AC --> AD[Initiate Refund]
    AA -->|Rejected| AE[Keep Status as Delivered]
    AD --> AF[Update Order Status if All Items Refunded]
    Q --> AG[Customer Writes Review]
    AG --> AH[Create Review Record]
    AH --> AI[Recalculate Average Rating]
```

## Key Relationships Summary

- One customer has many orders
- One order has many order items from multiple sellers
- One order item belongs to one product variant
- One product has many variants
- One variant has many inventory records
- Each inventory record is created by restock, adjustment, order, cancellation, or refund
- One product has many images
- One seller has many products
- Seller profile has snapshots
- Product has snapshots
- Variant has snapshots
- Order item has snapshots of product, variant, and seller profile
- Each review has a snapshot of edits
- Each cancellation/refund request has a snapshot
- Administrator can override seller decisions
- Category hierarchy: one-level nesting only
- All snapshots are immutable
- All inventory changes are immutable records
- Product listing shows average rating from non-deleted reviews

## Constraints Compliance

- ✅ All modifications trigger snapshots (product, variant, seller, review, request)
- ✅ Inventory tracked via history records (not snapshots)
- ✅ Each inventory change has a reason and actor
- ✅ Stock calculated from sum of records
- ✅ Out-of-stock blocks cart additions
- ✅ Seller deletion only permitted without pending orders
- ✅ Product deletion only permitted without pending order items
- ✅ Review only permitted after delivery
- ✅ Refund only permitted within 7 days of delivery
- ✅ Cancellation only permitted before shipment
- ✅ Categories limited to one-level nesting
- ✅ No guest browsing—registration mandatory
- ✅ No direct inventory manipulation—only through defined workflows
- ✅ All snapshots are immutable and permanently preserved

**Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.**