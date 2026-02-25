# Shopping Mall Platform Requirements Specification

## Service Overview

THE shoppingMall platform SHALL provide a marketplace where registered customers can purchase products from registered sellers. THE platform SHALL enforce mandatory account registration—no guest browsing or purchasing is permitted. ALL transactions SHALL be recorded with immutable snapshots to ensure auditability, dispute resolution, and legal compliance.

WHEN a user interacts with the system, THE system SHALL authenticate them as either a Customer, Seller, or Administrator based on their account type. THE system SHALL enforce strict permission boundaries between these actor types.

## User Actors & Authentication

### Customer Actor

撕IN A CUSTOMER registers, THE system SHALL require an email and password.

WHEN a customer logs in, THE system SHALL authenticate using email and password.

WHEN a customer changes their password, THE system SHALL validate the old password and set a new one.

WHEN a customer deletes their account, THE system SHALL:
- Delete their profile information (display name, phone number)
- Preserve all orders, order history, and associated snapshots
- Mark their reviews as "deleted user"
- Remove their cart, wishlist, and addresses

### Seller Actor

WHEN a seller registers, THE system SHALL require an email and password and set the account status to "pending".

WHEN a seller logs in, THE system SHALL authenticate using email and password.

WHEN a seller changes their password, THE system SHALL validate the old password and set a new one.

WHEN an administrator approves a seller, THE system SHALL update the seller’s account status to "approved".

WHEN an administrator rejects a seller, THE system SHALL:
- Set the account status to "rejected"
- Record the rejection reason
- Allow the seller to resubmit registration

WHEN a seller attempts to delete their account, THE system SHALL:
- Check for any pending orders with status "paid" or "shipped"
- Check for any pending cancellation or refund requests
- Block deletion if any exist
- Delete the account only if all checks pass

WHEN a seller deletes their account, THE system SHALL:
- Delete all their active products and variants
- Preserve all order history, snapshots, and transaction records
- Preserve the seller’s shop name in historical order items

### Administrator Actor

WHEN a user submits a request to become an administrator, THE system SHALL:
- Record the request with their user ID and reason
- Set status to "pending"

WHEN a super administrator approves a request, THE system SHALL:
- Promote the user to regular administrator
- Set the status to "approved"

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL:
- Update role to "super_admin"
- Record the promotion timestamp and actor

WHEN a super administrator demotes another super administrator, THE system SHALL:
- Downgrade role to "admin"
- Record the demotion timestamp and actor
- Prevent self-demotion

WHEN a seller is suspended by an administrator, THE system SHALL:
- Hide all their products from search and category listings
- Prevent new purchases of their products
- Allow processing of existing orders (shipping, responses)
- Prevent creation or modification of products

WHEN a customer is banned by an administrator, THE system SHALL:
- Prevent login
- Preserve all past order history and snapshots

WHEN a seller is banned by an administrator, THE system SHALL:
- Prevent login
- Prevent new product creation or edits
- Allow processing of existing orders
- Preserve all snapshots and order records

## Business Model

### Why This Service Exists

THE shoppingMall platform EXISTS because there is no centralized, commerce-grade marketplace that enforces strict data integrity through immutable snapshots while supporting multi-vendor operations with partial-order control.

WHEN disputes arise over product descriptions, prices, or conditions, THE system SHALL enable dispute resolution by providing complete historical snapshots.

WHEN legal compliance requires preservation of purchase history, THE system SHALL fulfill this by preserving snapshots even after deletion.

### Revenue Strategy

THE system SHALL not charge buyers directly. THE system SHALL generate revenue through:
- Seller subscription fees
- Transaction fees on successful sales
- Featured product placement
- Admin-managed advertising slots

WHEN an administrator configures a seller subscription tier, THE system SHALL apply the corresponding pricing model and authorization level.

### Growth Plan

THE system SHALL improve retention by:
- Allowing customers to track delivery status in real time
- Enabling trusted feedback through review snapshots
- Providing sellers with meaningful dashboard analytics
- Supporting automated delivery confirmation

THE system SHALL grow its seller base through:
- Streamlined approval workflow
- Transparent rejection reasoning
- Auto-suggested product categories

### Success Metrics

THE system SHALL track:
- Monthly active users
- Average order value
- Seller approval rate
- Average time to approve seller
- Percentage of orders with cancellation/refund
- Average review rating across products

WHEN any metric deteriorates beyond threshold, THE system SHALL alert administrators.

## Product Management

### Product Creation

WHEN a seller creates a new product, THE system SHALL:
- Require product name (non-empty)
- Require product description (non-empty)
- Require category selection (must be valid)
- Require base price (greater than zero)
- Set initial product status to "active"
- Create an initial product snapshot

WHEN a seller uploads images, THE system SHALL:
- Accept multiple images
- Allow reordering (first image = thumbnail)
- Store URLs in ordered array
- Include image list in product snapshot

### Product Editing

WHEN a seller edits any product field (name, description, category, base price, images), THE system SHALL:
- Create a new product snapshot
- Preserve all previous field values
- Record editor ID and timestamp
- Update the current product entity
- Maintain linkage between snapshots

WHEN a seller attempts to delete a product, THE system SHALL:
- Check if any variant has order items with status "paid" or "shipped"
- Check if any variant has pending cancellation or refund requests
- Block deletion if any condition is true
- Delete the product and all variants only if ALL conditions are false
- Create a final product snapshot indicating deletion

WHEN a product is deleted, THE system SHALL:
- Remove the product from search results
- Remove the product from category listings
- Preserve all snapshots of the product and its variants
- Preserve ALL historical order items referencing the product

### Product Variants (SKU)

WHEN a seller adds a variant to a product, THE system SHALL:
- Require SKU code (unique within product)
- Require at least one option value (e.g., color, size)
- Require stock quantity (≥ 0)
- Allow optional price override
- Assign the variant to the current product snapshot
- Create a product-snapshot-SKU record

WHEN a seller edits a variant’s SKU, option values, or price, THE system SHALL:
- Create a new product-snapshot-SKU record
- Preserve original values
- Record change timestamp and actor
- Update existing variant entity

WHEN a seller deletes a variant, THE system SHALL:
- Check if the variant has any order items with status "paid" or "shipped"
- Check if the variant has pending cancellation or refund requests
- Block deletion if any condition is true
- Delete the variant only if ALL conditions are false
- Create a product-snapshot-SKU snapshot indicating deletion

WHEN a product has no variants, THE system SHALL:
- Display the product as "unavailable" in search and categories
- Prevent addition to cart
- Allow viewing of product details

WHEN a variant’s stock reaches 0, THE system SHALL:
- Display the variant as "out of stock"
- Prevent addition to cart
- Prevent checkout

## Inventory & Stock Handling

WHEN a seller restocks a variant, THE system SHALL:
- Record a positive inventory change
- Include reason (e.g., "supplier shipment")
- Record timestamp and actor
- Update current stock quantity

WHEN a seller adjusts inventory (loss, damage, etc.), THE system SHALL:
- Record a negative inventory change
- Include reason (e.g., "damaged goods")
- Record timestamp and actor
- Update current stock quantity

WHEN an order is placed successfully, THE system SHALL:
- For each order item, create a negative inventory entry with reason "order_purchase"
- Decrease current stock quantity

WHEN a cancellation is approved, THE system SHALL:
- For the corresponding variant, create a positive inventory entry with reason "cancellation_refund"
- Increase current stock quantity

WHEN a refund is approved, THE system SHALL:
- For the corresponding variant, create a positive inventory entry with reason "refund"
- Increase current stock quantity

WHEN a seller views inventory history for a variant, THE system SHALL:
- Show all inventory changes in chronological order
- Include: change amount, reason, timestamp, actor
- Calculate total current stock from all entries

WHEN a customer adds a variant to cart, THE system SHALL:
- Compare cart quantity against current stock quantity
- Show warning if stock < cart quantity
- Prevent checkout if stock < 1

## Shopping Cart & Checkout

WHEN a customer adds a variant to their cart, THE system SHALL:
- Require selection of a specific variant (SKU)
- Accept quantity input ≥ 1
- If variant already exists in cart, increase its quantity
- If variant is out of stock, block addition and show error
- If variant is deleted, prevent addition and show hidden

WHEN a customer views their cart, THE system SHALL:
- Show each item with product name, variant options, price, quantity, subtotal
- Show total price across all items
- Mark items as "unavailable" if stock is zero or product/variant deleted

WHEN a customer changes cart quantity, THE system SHALL:
- Validate new quantity against current stock
- Block if quantity > stock
- Allow decrease to minimum of 0

WHEN a customer removes an item from cart, THE system SHALL:
- Remove the variant from cart
- Recalculate totals

WHEN a customer proceeds to checkout, THE system SHALL:
- Block checkout if any item is unavailable
- Require selection of a shipping address (default if one exists)
- Show order summary: items, total, shipping address
- Allow final review before payment

WHEN a customer places an order, THE system SHALL:
- Process payment via external gateway
- If payment fails: return to cart, show error
- If payment succeeds:
  - Create order record
  - Remove cart items
  - Create order item snapshots for each variant
  - Create inventory reduction entries
  - Set order item status to "paid"

## Order Management

### Order Structure

WHEN an order is created, THE system SHALL:
- Assign unique order number
- Link to customer ID, shipping address, timestamp
- Group by seller for each order item
- Store snapshot IDs for product, variant, and seller profile

WHEN an order contains multiple items from different sellers, THE system SHALL:
- Allow independent management of each item
- Generate separate shipments per seller
- Compute order status based on item statuses

### Order Status Logic

WHEN an order item's status changes, THE system SHALL:
- Update active record in order_items table
- Do NOT create a snapshot for status changes

WHEN an order's overall status is computed, THE system SHALL:
- If ALL items are paid → status = "paid"
- If ANY item is shipped AND none are delivered → status = "shipped"
- If ALL items are delivered → status = "delivered"
- If ALL items are cancelled → status = "cancelled"
- If ALL items are refunded → status = "refunded"
- If mixed statuses → status = "partially completed"

WHEN a customer views their order history, THE system SHALL:
- Show list paginated and sorted by newest first
- Show: order number, date, total price, overall status
- Allow drilling into full order details

WHEN a customer views full order details, THE system SHALL:
- Show list of items: product name, variant options, quantity, price, item status
- Show shipping address
- Show list of shipments with tracking info
- Show snapshot links for each product and variant

### Cancellation Requests

WHEN a customer requests cancellation for an item with status "paid", THE system SHALL:
- Allow only if item status == "paid"
- Require cancellation reason (text)
- Set request status to "pending"
- Create cancellation snapshot

WHEN the seller responds, THE system SHALL:
- Set request status to "approved" or "rejected"
- Record seller ID, response timestamp, reason (if rejected)
- Create updated cancellation snapshot

WHEN a cancellation is approved, THE system SHALL:
- Change item status to "cancelled"
- Restore inventory via positive entry with reason "cancellation_refund"
- Allow other items in order to proceed normally
- Recompute order status

WHEN a cancellation is rejected, THE system SHALL:
- Keep item status unchanged
- Notify customer of rejection
- Preserve snapshot for audit

### Refund Requests

WHEN a customer requests refund for a delivered item, THE system SHALL:
- Allow only if item status == "delivered" AND within 7 days of delivery
- Require refund reason (text)
- Set request status to "pending"
- Create refund snapshot

WHEN the seller responds, THE system SHALL:
- Set request status to "approved" or "rejected"
- Record seller ID, response timestamp, reason (if rejected)
- Create updated refund snapshot

WHEN a refund is approved, THE system SHALL:
- Change item status to "refunded"
- Restore inventory via positive entry with reason "refund"
- Allow other items in order to remain unaffected
- Recompute order status

WHEN a refund is rejected, THE system SHALL:
- Keep item status unchanged
- Notify customer of rejection
- Preserve snapshot for audit

## Shipping & Tracking

### Shipment Concept

WHEN a seller prepares to ship items, THE system SHALL:
- Allow selection of one or more "shipped"-status items from their own seller group
- Group all selected items into one shipment
- Each shipment belongs to ONE seller and contains items for ONE customer
- Shipment must span only items of same delivery address

WHEN a seller creates a shipment, THE system SHALL:
- Require carrier name
- Require tracking number
- Change all selected items to status "shipped"
- Create shipment record with: shipment ID, tracking info, timestamp, items list

WHEN a customer views a shipment, THE system SHALL:
- See carrier name and tracking number
- See list of included items
- See estimated delivery date (if provided)

WHEN a customer confirms delivery of a shipment, THE system SHALL:
- Set all items in that shipment to status "delivered"
- Record confirmation timestamp and actor

WHEN a customer does not confirm delivery, THE system SHALL:
- Automatically set all items in that shipment to "delivered" after 14 days from shipping
- Record automated confirmation

## Reviews & Ratings

WHEN a customer writes a review, THE system SHALL:
- Allow only if product was purchased
- Allow only if item status == "delivered"
- Require rating (1-5 stars)
- Allow optional text
- Require one review per product per order
- Create a review snapshot

WHEN a customer edits a review, THE system SHALL:
- Allow edit only of text or rating
- Create a new review snapshot
- Record editor ID and edit timestamp
- Preserve original snapshot

WHEN a customer deletes a review, THE system SHALL:
- Create a final review snapshot indicating deletion
- Preserve all prior snapshots
- Recalculate product’s average rating excluding deleted reviews
- Display review as "deleted user" if original customer account is deleted

WHEN a product’s average rating is computed, THE system SHALL:
- Include only reviews that are NOT deleted
- Exclude potential spam or fraudulent ratings (if flagged)
- Update displayed value on product detail page

## Administrator System

### Seller Management

WHEN an administrator views pending seller applications, THE system SHALL:
- Show list with: email, shop name, registration date, status, reason

WHEN an administrator approves a seller, THE system SHALL:
- Update seller profile status to "approved"
- Create seller profile snapshot
- Notify seller

WHEN an administrator rejects a seller, THE system SHALL:
- Update seller profile status to "rejected"
- Record rejection reason
- Create seller profile snapshot
- Notify seller
- Allow resubmission

WHEN an administrator suspends a seller, THE system SHALL:
- Update seller profile status to "suspended"
- Create seller profile snapshot
- Hide all products from public view
- Prevent new product creation or edits
- Allow processing of current orders

WHEN an administrator unsuspends a seller, THE system SHALL:
- Update seller profile status to "approved"
- Create seller profile snapshot
- Restore product visibility

### Category Management

WHEN an administrator creates a category, THE system SHALL:
- Require name and description
- Allow optional parent category ID (for subcategories)
- Ensure parent category exists
- Create category record

WHEN an administrator edits a category, THE system SHALL:
- Allow edit of name and description
- Allow change of parent category only if no products are currently assigned
- Create a category snapshot if metadata is modified

WHEN an administrator deletes a category, THE system SHALL:
- Move all products in that category to "uncategorized"
- Preserve category history in database
- Display "uncategorized" in product listings

### Product Oversight

WHEN an administrator views all products, THE system SHALL:
- Show: product name, seller, category, status, variants, creation date

WHEN an administrator views product snapshots, THE system SHALL:
- Access any product’s full history
- View before/after comparison
- Export snapshot data

WHEN an administrator deletes a product, THE system SHALL:
- Force-delete the product even if order items exist
- Create final product snapshot
- Preserve all order item snapshots
- Notify customer and seller if applicable

### Order Oversight

WHEN an administrator views all orders, THE system SHALL:
- Show: order number, customer, total, status, date, items

WHEN an administrator forces a cancellation, THE system SHALL:
- Change item status to "cancelled"
- Restore inventory via positive entry
- Create order item snapshot if not present
- Notify customer and seller

WHEN an administrator forces a refund, THE system SHALL:
- Change item status to "refunded"
- Restore inventory via positive entry
- Create order item snapshot if not present
- Notify customer and seller

### User Management

WHEN an administrator bans a customer, THE system SHALL:
- Prevent login
- Preserve all order history and snapshots
- Maintain visibility of past interactions

WHEN an administrator unbbans a customer, THE system SHALL:
- Restore login capability
- Preserve all historical data

WHEN an administrator bans a seller, THE system SHALL:
- Prevent login
- Block new product uploads
- Preserve all order history and snapshots
- Allow completion of existing orders

WHEN an administrator unbans a seller, THE system SHALL:
- Restore login capability
- Restore product editing and upload rights
- Preserve all historical data

## Snapshot Principle Implementation

WHEN a change occurs to any tracked entity (product, variant, seller profile, review, cancellation, refund), THE system SHALL:
- Record the change as an immutable snapshot
- Store all field values from before and after
- Include timestamp, actor ID, and entity ID
- Never delete or modify any snapshot

WHEN a customer views their past order, THE system SHALL:
- Display product name, description, price as they were at time of purchase
- Display variant options as they were at time of purchase
- Display seller shop name and logo as they were at time of purchase
- Display review text and rating as they were at time of rating

WHEN a seller or administrator views a snapshot, THE system SHALL:
- Show original and modified values side-by-side
- Show version tree relationships between snapshots
- Show who made each change

THE system SHALL ensure that ALL snapshot records are strictly append-only and immutable.

THE system SHALL guarantee that even if a product, seller, or review is deleted, its snapshots remain accessible to administrators and parties with legitimate historical interest.

→ The snapshot principle ensures that shoppingMall remains a trustworthy, audit-ready, and legally compliant marketplace.