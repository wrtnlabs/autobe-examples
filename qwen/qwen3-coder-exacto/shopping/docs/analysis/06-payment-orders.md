# E-Commerce Shopping Mall Platform Requirements Specification

## 1. Introduction and Overview

### 1.1. Purpose
This document specifies the comprehensive requirements for an e-commerce shopping mall platform that facilitates buying and selling of products between customers and sellers. The platform requires user registration for all features, implements a complete snapshot system for legal compliance, and provides robust shopping, order management, and administrative capabilities.

### 1.2. Scope
The platform encompasses full e-commerce functionality including user account management, product cataloging, inventory tracking, shopping cart operations, payment processing, order fulfillment, shipping and tracking, cancellation and refund handling, review systems, seller dashboards, and administrative oversight. All data modifications are captured through an immutable snapshot system for audit and dispute resolution.

### 1.3. Definitions and Acronyms

- **Customer**: A registered user who purchases products from sellers on the platform
- **Seller**: A registered user who lists and sells products on the platform
- **Administrator**: A privileged user who manages the platform, users, and content
- **Snapshot**: An immutable record capturing the state of data before modification
- **SKU**: Stock Keeping Unit, a unique identifier for product variants
- **Variant**: A specific version of a product based on options like size, color, etc.
- **Order Item**: A purchased product variant with quantity in an order
- **Shipment**: A package sent by a seller containing one or more order items
- **Inventory Record**: A transaction recording stock quantity changes

## 2. User Account Management

### 2.1. Customer Account System

WHEN a customer accesses any feature of the platform, THE system SHALL require authentication with email and password.

WHEN a new customer registers, THE system SHALL collect email and password and create a new account with default customer permissions.

WHEN a customer logs in, THE system SHALL authenticate the user using email and password credentials.

WHEN a customer requests password change, THE system SHALL verify the current password and allow setting a new password after validation.

WHEN a customer deletes their account, THE system SHALL:
- Remove all profile information including display name and phone number
- Preserve order history and records for seller records and legal purposes
- Preserve reviews but display them as authored by "deleted user"
- Prevent the customer from accessing the platform after deletion

WHEN a customer updates their profile, THE system SHALL allow modification of display name and phone number.

### 2.2. Seller Account System

WHEN a new seller registers, THE system SHALL collect email and password and create a new account with pending approval status.

WHEN a seller logs in, THE system SHALL authenticate the user using email and password credentials.

WHEN a seller requests password change, THE system SHALL verify the current password and allow setting a new password after validation.

WHEN a seller account is created, THE system SHALL set the account status to "pending approval".

WHEN an administrator approves a seller, THE system SHALL update the account status to "approved" and grant selling permissions.

WHEN an administrator rejects a seller registration, THE system SHALL set the account status to "rejected" and record the rejection reason.

WHEN a rejected seller resubmits registration, THE system SHALL process it as a new approval request.

WHEN a seller requests account deletion, THE system SHALL:
- Verify that no pending orders exist for the seller
- Verify that no pending cancellation or refund requests exist
- If conditions are met, delete the seller's profile and products from listings
- Preserve order history, snapshots, and shop name in past orders for legal purposes

WHEN a seller updates their profile, THE system SHALL allow modification of shop name, shop description, and logo image.

WHEN a seller profile is updated, THE system SHALL create a snapshot of the previous profile state.

### 2.3. Address Management

WHEN a customer adds a shipping address, THE system SHALL store the recipient name, phone number, street address, city, state/province, postal code, and country.

WHEN a customer edits a shipping address, THE system SHALL update the specified address fields.

WHEN a customer deletes a shipping address, THE system SHALL remove the address from their collection.

WHEN a customer sets an address as default, THE system SHALL mark that address as the preferred shipping destination for new orders.

## 3. Product and Category Management

### 3.1. Category System

WHEN an administrator creates a category, THE system SHALL store the category name and description.

WHEN categories are organized, THE system SHALL support one level of nesting (parent and child categories).

WHEN customers browse products, THE system SHALL allow navigation through the category hierarchy.

WHEN customers view a category page, THE system SHALL display all products assigned to that category.

### 3.2. Product Structure

WHEN a seller creates a product, THE system SHALL require:
- Product name
- Product description
- Category assignment (can be subcategory)
- Base price

WHEN a seller modifies a product, THE system SHALL create a snapshot preserving all fields (name, description, category, base price, images) and all variant states at that moment.

WHEN a seller deletes a product, THE system SHALL:
- Verify no pending order items exist for any variant
- Verify no pending cancellation or refund requests exist
- Remove the product from search and category listings
- Delete all variants and inventory records
- Preserve snapshots for historical and legal purposes

WHEN customers browse products, THE system SHALL display name, main image, base price (or price range), seller shop name, and average rating.

WHEN a customer views a product detail page, THE system SHALL display:
- All product images with reordering capability
- Product name and full description
- Category information
- Seller profile link
- All available variants with prices and stock status
- Average rating and total review count
- All reviews for the product

### 3.3. Product Image Management

WHEN a seller uploads images for a product, THE system SHALL store all images and maintain their order with the first image designated as the main thumbnail.

WHEN a seller reorders product images, THE system SHALL update the display sequence and maintain the first image as the thumbnail.

WHEN a seller deletes product images, THE system SHALL remove them from the product.

WHEN product images are modified, THE system SHALL include these changes in the product snapshot.

### 3.4. Product Variants (SKU System)

WHEN a seller creates a product variant, THE system SHALL require:
- SKU code (unique identifier)
- Option values (e.g., color: "Red", size: "Large")
- Price (optional override of base price)
- Stock quantity (starting at 0)

WHEN a seller modifies a variant, THE system SHALL create a snapshot of the previous variant state.

WHEN a seller deletes a variant, THE system SHALL:
- Verify no pending order items exist for that variant
- Verify no pending cancellation or refund requests exist
- Remove the variant from the product listing

WHEN a product has no variants, THE system SHALL display it as "unavailable" for purchase.

WHEN a customer views a product, THE system SHALL display price range if variants have different prices.

## 4. Shopping and Order Management

### 4.1. Product Search and Filtering

WHEN a customer searches for products, THE system SHALL match the search query against product names across all sellers.

WHEN search results are displayed, THE system SHALL provide pagination controls.

WHEN a customer filters search results, THE system SHALL support filtering by:
- Category
- Price range (minimum and maximum)
- In-stock only status

WHEN a customer sorts search results, THE system SHALL provide options for:
- Newest first
- Price low to high
- Price high to low

### 4.2. Wishlist Functionality

WHEN a customer adds a product to their wishlist, THE system SHALL store the product reference.

WHEN a customer views their wishlist, THE system SHALL display all saved products with pagination.

WHEN a customer removes a product from their wishlist, THE system SHALL delete the wishlist entry.

WHEN a seller deletes a product, THE system SHALL automatically remove that product from all customer wishlists.

### 4.3. Shopping Cart Operations

WHEN a customer adds a variant to their cart, THE system SHALL allow specifying quantity and ensure the same variant combines quantities rather than creating duplicate lines.

WHEN a customer views their cart, THE system SHALL display each item with product name, variant options, price, quantity, and subtotal.

WHEN a customer modifies cart item quantity, THE system SHALL update the specified item's quantity.

WHEN a customer removes an item from their cart, THE system SHALL delete that line from the cart.

WHEN a cart is displayed, THE system SHALL show the total price of all items.

WHEN a variant's stock is insufficient for cart quantity, THE system SHALL display a warning to the customer.

WHEN a variant becomes deleted or out of stock, THE system SHALL mark it as unavailable in the cart.

### 4.4. Checkout Process

WHEN a customer initiates checkout, THE system SHALL verify no unavailable items exist in the cart.

WHEN a customer selects a shipping address for checkout, THE system SHALL allow choosing from saved addresses or using the default.

WHEN a customer reviews order summary, THE system SHALL display:
- List of items with prices
- Selected shipping address
- Total price calculation

WHEN a customer places an order, THE system SHALL prevent modification of the shipping address after order creation.

### 4.5. Payment Processing

WHEN a customer confirms order placement, THE system SHALL process payment through an external payment gateway.

WHEN a payment attempt fails, THE system SHALL prevent order creation and allow the customer to retry.

WHEN a payment succeeds, THE system SHALL create the order and proceed with fulfillment.

### 4.6. Order Creation and Management

WHEN an order is successfully placed, THE system SHALL:
- Decrease stock quantities for all purchased variants
- Remove purchased items from the customer's cart
- Create an order record with a unique identifier
- Create order items for each purchased variant with status "paid"
- Create snapshots of each purchased product, variant, and seller profile
- Notify relevant sellers of new orders

WHEN order items are created, THE system SHALL group items from the same seller within the same order.

WHEN an order item status changes, THE system SHALL recalculate the overall order status according to these rules:
- IF all items are "paid" THEN THE order status SHALL be "paid"
- IF any item is "shipped" AND no items are "delivered" THEN THE order status SHALL be "shipped"
- IF all items are "delivered" THEN THE order status SHALL be "delivered"
- IF all items are "cancelled" THEN THE order status SHALL be "cancelled"
- IF all items are "refunded" THEN THE order status SHALL be "refunded"
- IF items have mixed statuses including "delivered" and "refunded" THEN THE order status SHALL be "partially completed"

## 5. Inventory Management

### 5.1. Stock Tracking

WHEN inventory is managed, THE system SHALL track stock quantity for each variant independently.

WHEN a variant's stock is calculated, THE system SHALL sum all inventory history records.

WHEN stock quantity reaches zero, THE system SHALL mark the variant as "out of stock".

WHEN a customer attempts to add an out of stock variant to cart, THE system SHALL prevent the action.

### 5.2. Inventory History

WHEN inventory changes occur, THE system SHALL create records containing:
- Quantity change (positive for restocking, negative for orders/adjustments)
- Reason for change
- Timestamp of the transaction

WHEN a seller adds inventory, THE system SHALL record a positive quantity change with a specified reason.

WHEN a seller subtracts inventory, THE system SHALL record a negative quantity change with a specified reason.

WHEN an order is placed, THE system SHALL automatically create a negative inventory record for each purchased variant.

WHEN an order item is cancelled or refunded, THE system SHALL automatically create a positive inventory record to restore stock.

WHEN a seller views inventory history, THE system SHALL display all records for a specific variant in chronological order.

## 6. Shipping and Tracking System

### 6.1. Shipment Management

WHEN sellers prepare shipments, THE system SHALL allow grouping of order items from the same seller into individual packages.

WHEN a seller creates a shipment, THE system SHALL require:
- Selection of one or more order items to include
- Carrier name
- Tracking number

WHEN a shipment is created, THE system SHALL update all included items to "shipped" status.

### 6.2. Delivery Process

WHEN a customer views order details, THE system SHALL display tracking information for each shipment.

WHEN a customer confirms delivery of a shipment, THE system SHALL update all items in that shipment to "delivered" status.

WHEN a shipment is not confirmed by the customer within 14 days of shipping, THE system SHALL automatically update all items in that shipment to "delivered" status.

## 7. Cancellation and Refund System

### 7.1. Cancellation Requests

WHEN a customer requests cancellation for an order item, THE system SHALL require the item to have "paid" status and collect a reason text.

WHEN a seller receives a cancellation request, THE system SHALL allow approval or rejection of the request.

WHEN a cancellation request state changes, THE system SHALL create a snapshot of the request.

IF a seller approves a cancellation, THEN THE system SHALL:
- Mark the item as "cancelled"
- Process refund for that item
- Restore stock quantities through inventory records
- Update the overall order status accordingly

WHEN all items in an order are cancelled, THE system SHALL update the order status to "cancelled".

### 7.2. Refund Requests

WHEN a customer requests a refund for an order item, THE system SHALL:
- Verify the item has "delivered" status
- Verify the request is within 7 days of delivery
- Collect reason text for the request

WHEN a seller receives a refund request, THE system SHALL allow approval or rejection of the request.

WHEN a refund request state changes, THE system SHALL create a snapshot of the request.

IF a seller approves a refund, THEN THE system SHALL:
- Mark the item as "refunded"
- Process refund for that item
- Restore stock quantities through inventory records
- Update the overall order status accordingly

WHEN all items in an order are refunded, THE system SHALL update the order status to "refunded".

## 8. Reviews and Ratings System

### 8.1. Review Creation

WHEN a customer is eligible to write a review, THE system SHALL verify the order item status is "delivered".

WHEN a customer submits a review, THE system SHALL require a rating (1-5 stars) and optionally accept text content.

WHEN a customer attempts to write multiple reviews for the same product in the same order, THE system SHALL prevent duplicate submissions.

### 8.2. Review Management

WHEN a customer submits a review, THE system SHALL display it on the product detail page.

WHEN reviews are displayed, THE system SHALL sort them by newest first.

WHEN a customer edits their review, THE system SHALL update the content and create a snapshot of the previous version.

WHEN a customer deletes their review, THE system SHALL mark it as deleted but preserve snapshots for audit purposes.

WHEN product ratings are calculated, THE system SHALL include all non-deleted reviews in the average rating computation.

## 9. Seller Dashboard and Analytics

### 9.1. Dashboard Overview

WHEN a seller accesses their dashboard, THE system SHALL display:
- Total number of active products
- Total number of order items
- Count of pending cancellation requests
- Count of pending refund requests

### 9.2. Order Item Management

WHEN a seller views order items, THE system SHALL display all items for their products with filtering by status.

## 10. Administrative System

### 10.1. Administrator Management

WHEN a user requests administrator privileges, THE system SHALL collect a reason text and submit it for review.

WHEN super administrators review requests, THE system SHALL allow approval or rejection of administrator requests.

WHEN a user is approved as administrator, THE system SHALL grant regular administrator permissions.

WHEN super administrators manage administrators, THE system SHALL allow:
- Promoting regular administrators to super administrator
- Demoting super administrators to regular administrator
- Preventing self-demotion by super administrators

### 10.2. Seller Management

WHEN administrators view seller registrations, THE system SHALL display pending approval requests.

WHEN administrators process seller registrations, THE system SHALL allow approval or rejection with required reason text.

WHEN a seller is rejected, THE system SHALL inform the seller and allow resubmission.

WHEN administrators suspend sellers, THE system SHALL:
- Hide seller products from search and listings
- Prevent purchase of seller products
- Allow processing of existing orders
- Prevent creation or editing of products

WHEN administrators unsuspend sellers, THE system SHALL restore product visibility and editing capabilities.

### 10.3. Category Management

WHEN administrators manage categories, THE system SHALL allow:
- Creating new categories and subcategories
- Editing category names and descriptions
- Deleting categories (which makes contained products uncategorized)

### 10.4. Product Oversight

WHEN administrators review products, THE system SHALL allow viewing all platform products.

WHEN administrators examine product history, THE system SHALL allow viewing snapshots of any product.

WHEN administrators address policy violations, THE system SHALL allow deletion of any product.

### 10.5. Order and User Oversight

WHEN administrators monitor orders, THE system SHALL allow viewing all platform orders.

WHEN administrators enforce policies, THE system SHALL allow:
- Force-cancelling individual items or entire orders
- Force-refunding individual items or entire orders

WHEN administrators manage users, THE system SHALL allow:
- Viewing all customer accounts
- Banning and unbanning customers
- Viewing all seller accounts
- Banning and unbanning sellers (while preserving existing order records)

## 11. Data Snapshots and Audit Trail

### 11.1. Snapshot Principles

WHEN editable data is modified, THE system SHALL create an immutable snapshot of the previous state.

WHEN snapshots are created, THE system SHALL record:
- Timestamp of the change
- Description of what was changed
- Complete values before and after modification

WHEN snapshots are accessed, THE system SHALL allow viewing by:
- Data owners (customers, sellers for their own data)
- Administrators for dispute resolution

WHEN attempts are made to modify or delete snapshots, THE system SHALL reject all such operations.

### 11.2. Snapshot Coverage

THE system SHALL create snapshots for modifications to:
- Products (all fields including images)
- Product variants (SKU code, option values, price)
- Seller profiles (shop name, description, logo)
- Order items (product, variant, and seller profile at time of purchase)
- Reviews (rating, text content)
- Cancellation requests (reason, status changes)
- Refund requests (reason, status changes)

WHEN product snapshots are created, THE system SHALL capture:
- All product fields (name, description, category, base price, images)
- Snapshots of all variants as they existed at that moment