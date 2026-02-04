# shoppingMall Functional Requirements Specification

## Overview

The shoppingMall platform is an e-commerce marketplace that facilitates transactions between customers and sellers while enforcing strict auditability through the snapshot principle. All user interactions, data modifications, and administrative actions are recorded immutably to ensure transparency, dispute resolution, and regulatory compliance.

Access to the platform is strictly controlled. No guest browsing is permitted. All users must register and authenticate before interacting with any feature. Role-based access control governs functionality based on actor type: Customer, Seller, Administrator, or Super Administrator.

All system operations preserve historical states through snapshots, which are immutable records of data state at modification time. Snapshots are critical for dispute resolution, audit trails, and accurate order fulfillment reporting.

## Authentication and Authorization

### Customer Authentication

- WHEN a customer registers, THE system SHALL require a unique email address and password.
- WHEN a customer logs in, THE system SHALL authenticate using the registered email and password.
- WHEN a customer changes their password, THE system SHALL require current password confirmation and validate the new password meets security requirements.
- WHEN a customer deletes their account, THE system SHALL:
  - Immediately invalidate all active sessions
  - Remove all profile data (display name, phone number, addresses)
  - Preserve all order history and associated snapshots
  - Preserve all reviews, but anonymize them as "deleted user"

### Seller Authentication

- WHEN a seller registers, THE system SHALL require a unique email address and password and initiate an approval workflow.
- WHEN a seller logs in, THE system SHALL authenticate using the registered email and password.
- WHEN a seller changes their password, THE system SHALL require current password confirmation and validate the new password meets security requirements.
- WHEN a seller attempts to delete their account, THE system SHALL:
  - Verify no pending order items exist with status "paid" or "shipped"
  - Verify no pending cancellation or refund requests exist
  - If criteria are met, remove their shop profile and product listings
  - Preserve all order items, snapshots, and review records

### Administrator Authentication

- WHEN an administrator logs in, THE system SHALL require two-factor authentication.
- WHEN a super administrator logs in, THE system SHALL require two-factor authentication and log all actions with the administrator's ID.
- WHEN an administrator performs any administrative action, THE system SHALL require re-authentication for sensitive operations (e.g., bans, deletions).

## Customer Account and Profile

### Account Management

- WHEN a customer registers, THE system SHALL create a unique customer ID and record the email, hashed password, and registration timestamp.
- WHEN a customer logs in successfully, THE system SHALL establish a JWT session and issue an access token.
- WHEN a customer changes their password, THE system SHALL:
  - Validate the current password
  - Hash the new password using bcrypt
  - Invalidate all existing sessions
  - Record the password change in the audit log
- WHEN a customer deletes their account, THE system SHALL:
  - Mark the account as "deleted"
  - Remove personal identifiers: display name, phone number, and all addresses
  - Preserve all order records, snapshots, and review entries
  - Set review author field to "deleted user"

### Profile Management

- WHEN a customer edits their profile, THE system SHALL:
  - Allow updates to display name and phone number
  - Validate phone number format (valid international format)
  - Record the modification timestamp
- WHEN a customer updates their profile, THE system SHALL NOT create a snapshot (profile edits are not subject to snapshoting)

## Address Management

- WHEN a customer adds a shipping address, THE system SHALL:
  - Require recipient name, phone number, street address, city, state/province, postal code, and country
  - Assign a unique address ID
  - Allow setting the address as default
- WHEN a customer edits a shipping address, THE system SHALL:
  - Allow modification of all fields except address ID
  - Preserve the original address history
- WHEN a customer deletes a shipping address, THE system SHALL:
  - Remove the address from their list
  - If the deleted address was the default, automatically select another address as default
  - If no other addresses exist, set default to "none"
- WHEN a customer selects a default shipping address, THE system SHALL:
  - Set the selected address as default
  - Clear the default flag from all other addresses
  - Persist the change immediately

## Seller Account and Profile

### Account Management

- WHEN a seller registers, THE system SHALL:
  - Record email, password, and registration timestamp
  - Set account status to "pending_approval"
  - Notify administrators of new registration
- WHEN an administrator approves a seller account, THE system SHALL:
  - Change the seller's status to "approved"
  - Notify the seller via email
- WHEN an administrator rejects a seller account, THE system SHALL:
  - Change the seller's status to "rejected"
  - Record the rejection reason
  - Notify the seller with rejection reason
- WHEN a rejected seller resubmits registration, THE system SHALL:
  - Reset status to "pending_approval"
  - Clear previous rejection reason
  - Preserve original registration details
- WHEN a seller requests account deletion, THE system SHALL:
  - Verify no outstanding "paid" or "shipped" order items exist under their products
  - Verify no pending cancellation/refund requests exist
  - If verified, delete shop profile and remove products from listings
  - Preserve all snapshots and order records

### Profile Management

- WHEN a seller updates their shop profile (name, description, logo), THE system SHALL:
  - Record the change timestamp
  - Create a snapshot of:
    - Previous shop name
    - Previous shop description
    - Previous logo image hash
    - Timestamp of change
    - Seller ID
- WHEN a seller edits their profile, THE system SHALL NOT permit deletion of all images (at least one image must remain)
- WHEN a seller attempts to edit shop name while suspended, THE system SHALL prevent the update and show an error

## Category Management

- WHEN an administrator creates a category, THE system SHALL:
  - Assign a unique category ID
  - Record the name and description
  - Set parent_id to null for top-level categories
- WHEN an administrator creates a subcategory, THE system SHALL:
  - Assign a unique subcategory ID
  - Record name and description
  - Attach to exactly one parent category
  - Prevent nesting beyond one level (no sub-subcategories)
- WHEN an administrator edits a category or subcategory, THE system SHALL:
  - Record new name and description
  - Create a snapshot of previous values (name, description, parent_id)
  - Update related products to reflect new category name
- WHEN an administrator deletes a category, THE system SHALL:
  - Mark all products assigned to it as "uncategorized"
  - Preserve category name in product snapshots
  - Prevent deletion if the category has subcategories

## Product Lifecycle

### Product Creation

- WHEN a seller creates a product, THE system SHALL:
  - Require product name and description
  - Require selection of a category (including subcategory)
  - Require base price greater than 0
  - Assign product ID, seller ID, creation timestamp
  - Initialize variant list as empty
  - Set product status to "active"
- WHEN a seller creates a product with no variants, THE system SHALL:
  - Allow creation
  - Display product as "unavailable" in search and listings

### Product Editing

- WHEN a seller edits a product (name, description, category, base price), THE system SHALL:
  - Record new values
  - Create a product snapshot including:
    - Product ID
    - Name, description, category, base price
    - Image list (including order)
    - All variants at time of edit
    - Timestamp of change
- WHEN a seller edits product images (upload, reorder, delete), THE system SHALL:
  - Update image order
  - Include image list and order in snapshot
  - Preserve all previous image versions in snapshots
- WHEN a seller edits a product while suspended, THE system SHALL prevent all edits

### Product Deletion

- WHEN a seller requests deletion of a product, THE system SHALL:
  - Verify no order items exist with status "paid" or "shipped"
  - Verify no pending cancellation or refund requests for any variant
  - If verified, delete:
    - Product record
    - All associated variants
    - All inventory records
    - Product visibility in search and category listings
  - Preserve all snapshots and related order items
- WHEN an administrator initiates product deletion, THE system SHALL:
  - Ignore pending order status restrictions
  - Record administrator ID, timestamp, and reason for deletion
  - Create an administrative snapshot
  - Remove product from all listings
  - Preserve all snapshots, order items, and reviews

## Product Variants (SKU)

### Variant Creation

- WHEN a seller adds a variant to a product, THE system SHALL:
  - Require unique SKU code (alphanumeric, no spaces)
  - Require at least one option value (e.g., color: "Red")
  - Require stock quantity ≥ 0
  - Allow override of base price (if provided, must be ≥ 0)
  - Assign variant ID and associate with product ID
- WHEN a variant is added, THE system SHALL update product status to "available" if no variants previously existed

### Variant Editing

- WHEN a seller edits a variant (SKU, option values, price, stock), THE system SHALL:
  - Record new values
  - Create a product-snapshot-SKU record including:
    - Product ID
    - Variant ID
    - Before state: SKU, option values, price, stock quantity
    - After state: SKU, option values, price, stock quantity
    - Seller ID
    - Timestamp of change
- WHEN a variant's SKU is changed, THE system SHALL:
  - Validate new SKU is unique across all product variants
  - Preserve previous SKU in snapshot

### Variant Deletion

- WHEN a seller requests deletion of a variant, THE system SHALL:
  - Verify no order items exist with status "paid" or "shipped"
  - Verify no pending cancellation or refund requests for that variant
  - If verified, delete the variant and remove from product
  - If product has no remaining variants, set product status to "unavailable"
  - Preserve all variant snapshots

### Variant Availability

- WHEN a variant's stock quantity reaches 0, THE system SHALL:
  - Set variant status to "out_of_stock"
  - Prevent addition to cart
  - Display "out of stock" label on product detail page
  - Still allow viewing variant details

## Inventory Management

### Inventory Records

- WHEN a seller restocks a variant, THE system SHALL:
  - Record positive quantity change
  - Set reason as "restock"
  - Record timestamp and seller ID
- WHEN a seller adjusts inventory (loss, damage), THE system SHALL:
  - Record negative quantity change
  - Require reason input (e.g., "damaged", "theft")
  - Record timestamp and seller ID
- WHEN an order is placed for a variant, THE system SHALL:
  - Create a negative inventory record with quantity equal to purchase amount
  - Set reason as "order_purchase"
  - Record associated order item ID
- WHEN a cancellation is approved for a variant, THE system SHALL:
  - Create a positive inventory record
  - Set reason as "cancellation_refund"
  - Record associated order item ID
- WHEN a refund is approved for a variant, THE system SHALL:
  - Create a positive inventory record
  - Set reason as "refund_request"
  - Record associated order item ID

### Stock Calculation

- THE system SHALL calculate current stock as the sum of all inventory records for a specific variant
- THE system SHALL never delete inventory records
- THE system SHALL display current stock value in real time

## Shopping Cart

### Adding to Cart

- WHEN a customer adds a variant to cart, THE system SHALL:
  - Verify variant exists and is active
  - Verify variant is not "out_of_stock"
  - If variant already exists in cart, increment quantity (do not create duplicate item)
  - Record variant ID, quantity, cart timestamp
- WHEN a customer attempts to add out-of-stock variant, THE system SHALL prevent addition and display error

### Managing Cart Items

- WHEN a customer changes quantity of a cart item, THE system SHALL:
  - Validate new quantity ≤ available stock
  - Update cart quantity
  - Recalculate subtotal
- WHEN a customer removes a cart item, THE system SHALL:
  - Delete the cart item record
  - Recalculate cart total
- WHEN a cart item's variant becomes out of stock, THE system SHALL:
  - Mark item in cart as "unavailable"
  - Prevent checkout of that item
  - Allow other items to remain in cart
- WHEN a cart item's variant is deleted, THE system SHALL:
  - Mark item as "deleted"
  - Remove from checkout eligibility
  - Allow customer to remove manually

## Checkout and Payment

### Checkout Initiation

- WHEN a customer initiates checkout, THE system SHALL:
  - Validate all cart items are available (not out_of_stock or deleted)
  - Require selection of shipping address
  - Calculate total with taxes and shipping fees
- WHEN a customer selects shipping address, THE system SHALL:
  - Lock the selected address for this order
  - Prevent address change during payment

### Order Creation

- WHEN payment succeeds, THE system SHALL:
  - Create a new order record with status "paid"
  - Create an order item for each cart item:
    - Product ID, variant ID, quantity, price at time of purchase
    - Seller ID
    - Snapshot of product
    - Snapshot of variant
    - Snapshot of seller profile (shop name, logo)
  - Remove all cart items
  - Deduct stock via inventory records
  - Send order confirmation
- WHEN payment fails, THE system SHALL:
  - Preserve cart state
  - Display payment error
  - Allow retry

## Order Structure

### Order Composition

- EACH order SHALL contain one or more order items
- EACH order item SHALL be associated with exactly one variant
- EACH order item SHALL have its own status independently of other items
- EACH order item SHALL originate from one seller
- ONE order MAY contain multiple order items from multiple sellers

### Order Status Derivation

- WHEN all order items have status "paid", THE system SHALL set order status to "paid"
- WHEN any order item has status "shipped" and none have "delivered", THE system SHALL set order status to "shipped"
- WHEN all order items have status "delivered", THE system SHALL set order status to "delivered"
- WHEN all order items have status "cancelled", THE system SHALL set order status to "cancelled"
- WHEN all order items have status "refunded", THE system SHALL set order status to "refunded"
- WHEN order items have mixed statuses (e.g., some delivered, some cancelled), THE system SHALL set order status to "partially_completed"

## Shipping and Tracking

### Shipment Creation

- WHEN a seller selects one or more order items for shipping, THE system SHALL:
  - Group items by seller
  - Create one shipment per seller
  - Record shipment ID, carrier name, tracking number
  - Set all associated order items to status "shipped"
- WHEN a seller creates a shipment, THE system SHALL:
  - Prevent editing items within shipment
  - Freeze order item status change
  - Record shipment timestamp

### Delivery Confirmation

- WHEN a customer confirms delivery of a shipment, THE system SHALL:
  - Set all order items within that shipment to "delivered"
  - Record customer confirmation timestamp
- WHEN no delivery confirmation occurs within 14 days of shipping, THE system SHALL:
  - Automatically set all order items in shipment to "delivered"
  - Record system timestamp with reason "auto_delivery"

## Cancellation and Refund

### Cancellation Requests

- WHEN a customer requests cancellation of an order item with status "paid", THE system SHALL:
  - Require a reason (text)
  - Set item status to "cancellation_requested"
  - Notify seller
- WHEN a seller approves a cancellation request, THE system SHALL:
  - Set item status to "cancelled"
  - Create inventory record with positive quantity and reason "cancellation_approved"
  - Initiate refund
  - Record snapshot of request state before approval
- WHEN a seller rejects a cancellation request, THE system SHALL:
  - Set item status to "paid"
  - Record snapshot of request state

### Refund Requests

- WHEN a customer requests refund of an order item with status "delivered", THE system SHALL:
  - Require a reason (text)
  - Set item status to "refund_requested"
  - Restrict refund request to within 7 days of delivery
- WHEN a seller approves a refund request, THE system SHALL:
  - Set item status to "refunded"
  - Create inventory record with positive quantity and reason "refund_approved"
  - Initiate refund
  - Record snapshot of request state before approval
- WHEN a seller rejects a refund request, THE system SHALL:
  - Set item status to "delivered"
  - Record snapshot of request state

## Reviews and Ratings

### Review Creation

- WHEN a customer writes a review for a product, THE system SHALL:
  - Verify they previously purchased and received a variant of that product (order item status "delivered")
  - Require rating between 1 and 5
  - Accept optional text content
  - Record customer ID, product ID, rating, text, timestamp
- WHEN a customer writes a review for a product they have purchased multiple times, THE system SHALL only allow one review per product per customer

### Review Editing

- WHEN a customer edits their review, THE system SHALL:
  - Update rating or text content
  - Create a snapshot of previous values (rating, text, timestamp)
  - Preserve original review record

### Review Deletion

- WHEN a customer deletes their review, THE system SHALL:
  - Set review visibility to "hidden"
  - Preserve the review record and snapshot
  - Recalculate product average rating excluding the hidden review

### Rating Calculation

- THE system SHALL calculate average rating only from non-deleted reviews
- THE system SHALL update product review count and average rating in real time
- THE system SHALL never delete review records

## Snapshot Principle

### Trigger Conditions

- WHEN any of the following entities are modified, THE system SHALL create a snapshot:
  - Product (name, description, category, base price, images, variant list)
  - Product variant (SKU, option values, price, stock)
  - Seller profile (shop name, description, logo)
  - Order item (product, variant, seller profile)
  - Review (rating, text content)
  - Cancellation request (reason, status)
  - Refund request (reason, status)

### Data Captured per Entity

- PRODUCT SNAPSHOT:
  - Product ID
  - Name, description, base price
  - Category ID and name
  - Image list (order and URLs)
  - Variant list (SKU, option values, price, stock) at time of snapshot
  - Timestamp
  - Actor performing change
- VARIANT SNAPSHOT (attached to product snapshot):
  - Variant ID
  - SKU
  - Option values (e.g., {"color":"Red","size":"Large"})
  - Override price
  - Stock quantity
  - Timestamp
- SELLER PROFILE SNAPSHOT:
  - Shop name
  - Shop description
  - Logo image URL
  - Timestamp
  - Actor performing change
- REVIEW SNAPSHOT:
  - Rating
  - Text content
  - Timestamp
  - Actor performing change

### Snapshot Immutability and Access

- NO ONE SHALL be permitted to modify or delete a snapshot
- ALL snapshots SHALL be preserved permanently
- OWNERS SHALL be able to view snapshots of their own data (customer: orders, reviews; seller: products, profile)
- ADMINISTRATORS SHALL be able to view snapshots for any user or product
- SNAPSHOT records SHALL be used as evidence in dispute resolution

## Administrator System

### Role Hierarchy

- THE system SHALL support two grades of administrators: regular administrator and super administrator
- THE super administrator SHALL have authority to promote or demote any administrator
- THE super administrator SHALL be able to view all system logs
- THE super administrator SHALL be able to access sensitive data (user emails, payment identifiers) for audit
- THE system SHALL prohibit super administrators from demoting themselves

### Administrator Promotion

- WHEN a user submits a request to become an administrator, THE system SHALL:
  - Record request with provided reason
  - Set user status to "admin_requested"
  - Prevent further customer/seller actions
  - Notify super administrators
- WHEN a super administrator approves a request, THE system SHALL:
  - Promote user to "regular administrator"
  - Remove "admin_requested" status
  - Grant access to admin dashboard
- WHEN an administrator rejects a request, THE system SHALL:
  - Set status to "admin_rejected"
  - Record rejection reason
  - Notify user
  - Allow resubmission after 30 days

### Account Management

- WHEN an administrator suspends a seller account, THE system SHALL:
  - Hide all products from search and category listings
  - Prevent creation or editing of new products
  - Allow processing of existing orders
  - Prevent new registration
- WHEN an administrator unsuspends a seller account, THE system SHALL:
  - Restore product visibility
  - Allow product edits and creation
- WHEN an administrator bans a customer, THE system SHALL:
  - Block login
  - Hide from customer-facing UIs
  - Preserve order history, wishlist, reviews
- WHEN an administrator bans a seller, THE system SHALL:
  - Block login
  - Disable dashboard access
  - Prevent processing of new orders
  - Preserve historical data
- WHEN an administrator unbans any user, THE system SHALL:
  - Restore access to appropriate platform features
  - Revert all access restrictions

### Category Management

- WHEN an administrator creates a category or subcategory, THE system SHALL save it with unique ID
- WHEN an administrator edits a category, THE system SHALL:
  - Create snapshot of old name and description
  - Update product references
- WHEN an administrator deletes a category, THE system SHALL:
  - Mark all associated products as "uncategorized"
  - Preserve category name in product snapshots

### Product Oversight

- WHEN an administrator deletes a product, THE system SHALL:
  - Remove from search and category listings
  - Preserve all snapshots and order items
  - Record administrator ID, timestamp, reason
- WHEN a product is reported for violation, THE super administrator SHALL have authority to force-delete regardless of order status

### Order Oversight and Enforcement

- WHEN an administrator force-cancels an order item with status "paid", THE system SHALL:
  - Change state to "cancelled"
  - Create inventory record with reason "ADMIN_FORCE_CANCEL"
  - Initiate refund
  - Create administrative snapshot
- WHEN an administrator force-refunds an order item with status "delivered", THE system SHALL:
  - Change state to "refunded"
  - Create inventory record with reason "ADMIN_FORCE_REFUND"
  - Initiate refund
  - Create administrative snapshot
- WHEN an administrator overrides a pending cancellation or refund request, THE system SHALL:
  - Change state per administrator decision
  - Record snapshot of override action
  - Notify user

### User Ban/Unban Procedures

- WHEN an administrator bans a customer, THE system SHALL:
  - Prevent login
  - Hide account from all user-facing interfaces
  - Preserve order history, review records, and wishlist
- WHEN an administrator bans a seller, THE system SHALL:
  - Prevent login
  - Disable seller dashboard
  - Preserve all historical data
  - Keep shop names in past order records
- WHEN an administrator unbans any user, THE system SHALL:
  - Restore login access
  - Restore visibility and functionality

### Snapshot and Audit Compliance

- WHEN any administrator performs an action (promotion, suspension, deletion, cancellation, refund, ban, etc.), THE system SHALL:
  - Create a snapshot record
  - Record actor ID (administrator), target ID, timestamp, action type, before/after state, and reason
  - Link snapshots to affected entity (order item, product, user)
- ALL snapshots SHALL be immutable and permanently stored
- Snapshot history SHALL be accessible by super administrators for audit
- Snapshot records SHALL NOT be deleted under any circumstances
- Snapshots SHALL serve as authoritative evidence for dispute resolution

> *Developer Note: This document defines business requirements only. Technical implementation (APIs, database schemas, architectures) is delegated to downstream pipeline phases.*